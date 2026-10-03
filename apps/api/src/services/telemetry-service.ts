import type { AppConfig } from "../config/env";
import { logger } from "../lib/logger";
import { serializeDocument } from "../lib/serialize";
import { Command } from "../models/Command";
import { Device } from "../models/Device";
import { Telemetry } from "../models/Telemetry";
import type { AlarmService } from "./alarm-service";
import type { CommandService } from "./command-service";
import { parseJsonPayload } from "./mqtt-contract";
import type { RealtimeNotifier } from "./notifier";
import { classifySoilMoisture } from "./rules";
import { calculateMovingAverage } from "./smoothing";
import { normalizeTelemetry } from "./telemetry-validation";

export class TelemetryService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly alarmService: AlarmService,
    private readonly commandService: CommandService,
    private readonly notifier: RealtimeNotifier
  ) {}

  async handleTelemetry(deviceId: string, rawPayload: Buffer): Promise<void> {
    const payload = parseJsonPayload(rawPayload);
    if (payload === null) {
      logger.warn("Invalid MQTT telemetry JSON", { deviceId });
      return;
    }

    const normalized = normalizeTelemetry(payload);
    const device = await Device.findOne({ deviceId });
    if (!device) {
      logger.warn("Ignoring telemetry from unknown device", { deviceId });
      return;
    }

    let smoothedSoilMoisturePct: number | null = null;
    if (normalized.soilMoisturePct !== null) {
      const previous = await Telemetry.find({
        deviceId,
        soilMoisturePct: { $ne: null }
      })
        .sort({ timestamp: -1 })
        .limit(this.appConfig.telemetrySmoothingWindow - 1)
        .lean();
      const samples = previous
        .map((entry) => entry.soilMoisturePct)
        .filter((value): value is number => typeof value === "number")
        .reverse();
      smoothedSoilMoisturePct = calculateMovingAverage(
        samples,
        normalized.soilMoisturePct,
        this.appConfig.telemetrySmoothingWindow
      );
    }

    const environment = classifySoilMoisture(smoothedSoilMoisturePct, this.appConfig.thresholds);
    const telemetry = await Telemetry.create({
      deviceId,
      assetId: device.assetId,
      timestamp: normalized.timestamp,
      receivedAt: normalized.receivedAt,
      sequence: normalized.sequence ?? null,
      temperatureC: normalized.temperatureC,
      airHumidityPct: normalized.airHumidityPct,
      soilRaw: normalized.soilRaw,
      soilMoisturePct: normalized.soilMoisturePct,
      smoothedSoilMoisturePct,
      valid: normalized.valid,
      invalidFields: normalized.invalidFields
    });

    const previousEnvironment = device.currentState.environment;
    const priorTelemetry = device.currentState.lastTelemetry ?? {};
    device.status = "ONLINE";
    device.lastSeen = normalized.receivedAt;
    device.currentState.lastTelemetry = {
      temperatureC: normalized.temperatureC ?? priorTelemetry.temperatureC,
      airHumidityPct: normalized.airHumidityPct ?? priorTelemetry.airHumidityPct,
      soilMoisturePct: normalized.soilMoisturePct ?? priorTelemetry.soilMoisturePct,
      timestamp: normalized.timestamp
    };
    if (environment !== "INVALID") {
      device.currentState.environment = environment;
    } else {
      device.currentState.environment = "INVALID";
    }
    await device.save();

    await Promise.all([
      this.alarmService.sync({
        deviceId,
        assetId: device.assetId,
        type: "LOW_SOIL_MOISTURE",
        severity: "CRITICAL",
        message: "Soil moisture is below the critical threshold.",
        latestValue: smoothedSoilMoisturePct ?? "invalid",
        active: environment === "CRITICAL"
      }),
      this.alarmService.sync({
        deviceId,
        assetId: device.assetId,
        type: "HIGH_TEMPERATURE",
        severity: "WARNING",
        message: "Air temperature is above the configured warning threshold.",
        latestValue: normalized.temperatureC ?? "invalid",
        active: normalized.temperatureC !== null && normalized.temperatureC >= this.appConfig.highTemperatureC
      }),
      this.alarmService.sync({
        deviceId,
        assetId: device.assetId,
        type: "INVALID_SENSOR_DATA",
        severity: "WARNING",
        message: "One or more sensor values are invalid.",
        latestValue: normalized.invalidFields,
        active: normalized.invalidFields.length > 0
      }),
      this.alarmService.sync({
        deviceId,
        assetId: device.assetId,
        type: "DEVICE_OFFLINE",
        severity: "WARNING",
        message: "ESP32 has not reported telemetry within the configured timeout.",
        active: false
      })
    ]);

    this.notifier.emitToDevice(deviceId, "telemetry:update", {
      deviceId,
      telemetry: serializeDocument(telemetry.toObject()),
      state: serializeDocument(device.toObject())
    });
    this.notifier.emitToDevice(deviceId, "device:status", serializeDocument(device.toObject()));

    if (environment !== "INVALID" && previousEnvironment !== environment) {
      try {
        await this.commandService.sendRuleAlertLevel(deviceId, environment);
      } catch (error) {
        logger.warn("Unable to synchronize environment LED state", {
          deviceId,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    await this.applyAutoSimulation(
      deviceId,
      previousEnvironment,
      environment,
      normalized.soilMoisturePct !== null,
      device.currentState.mode
    );
  }

  private async applyAutoSimulation(
    deviceId: string,
    previousEnvironment: "NORMAL" | "WARNING" | "CRITICAL" | "INVALID",
    environment: "NORMAL" | "WARNING" | "CRITICAL" | "INVALID",
    soilIsValid: boolean,
    mode: "AUTO" | "MANUAL"
  ): Promise<void> {
    if (mode !== "AUTO") {
      return;
    }

    const device = await Device.findOne({ deviceId });
    if (!device || device.status !== "ONLINE") {
      return;
    }

    try {
      if (
        soilIsValid &&
        environment === "CRITICAL" &&
        previousEnvironment !== "CRITICAL" &&
        !device.currentState.irrigationSimulationActive
      ) {
        const pending = await Command.exists({
          deviceId,
          type: "START_IRRIGATION_SIMULATION",
          status: "PENDING"
        });
        if (!pending) {
          await this.commandService.dispatch({
            deviceId,
            type: "START_IRRIGATION_SIMULATION",
            source: "AUTO"
          });
        }
      }

      if ((!soilIsValid || environment !== "CRITICAL") && device.currentState.irrigationSimulationActive) {
        const pending = await Command.exists({
          deviceId,
          type: "STOP_IRRIGATION_SIMULATION",
          status: "PENDING"
        });
        if (!pending) {
          await this.commandService.dispatch({
            deviceId,
            type: "STOP_IRRIGATION_SIMULATION",
            source: "AUTO"
          });
        }
      }
    } catch (error) {
      logger.warn("AUTO simulation command was not dispatched", {
        deviceId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}
