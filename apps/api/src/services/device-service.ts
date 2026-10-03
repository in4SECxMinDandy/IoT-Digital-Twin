import type { AppConfig } from "../config/env";
import { logger } from "../lib/logger";
import { serializeDocument } from "../lib/serialize";
import { Device } from "../models/Device";
import { parseJsonPayload, parseReportedState } from "./mqtt-contract";
import type { AlarmService } from "./alarm-service";
import type { RealtimeNotifier } from "./notifier";

export class DeviceService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly alarmService: AlarmService,
    private readonly notifier: RealtimeNotifier
  ) {}

  async handleReportedState(deviceId: string, rawPayload: Buffer): Promise<void> {
    const parsedJson = parseJsonPayload(rawPayload);
    const state = parsedJson ? parseReportedState(parsedJson) : null;
    if (!state) {
      logger.warn("Invalid device state payload", { deviceId });
      return;
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      logger.warn("Ignoring state from unknown device", { deviceId });
      return;
    }

    const now = new Date();
    device.status = state.online === false ? "OFFLINE" : "ONLINE";
    if (state.online !== false) device.lastSeen = now;
    if (state.mode) device.currentState.mode = state.mode;
    if (state.alertLevel) device.currentState.alertLevel = state.alertLevel;
    if (typeof state.irrigationSimulationActive === "boolean") {
      device.currentState.irrigationSimulationActive = state.irrigationSimulationActive;
    }
    if (state.greenPattern) device.currentState.greenPattern = state.greenPattern;
    device.currentState.reportedAt = state.reportedAt ?? now;
    await device.save();

    await this.alarmService.sync({
      deviceId,
      assetId: device.assetId,
      type: "DEVICE_OFFLINE",
      severity: "WARNING",
      message: "ESP32 has not reported telemetry within the configured timeout.",
      active: device.status === "OFFLINE"
    });
    this.notifier.emitToDevice(deviceId, "device:status", serializeDocument(device.toObject()));
  }

  async markOfflineDevices(): Promise<void> {
    const cutoff = new Date(Date.now() - this.appConfig.deviceOfflineTimeoutMs);
    const staleDevices = await Device.find({ status: "ONLINE", lastSeen: { $lt: cutoff } });

    for (const device of staleDevices) {
      device.status = "OFFLINE";
      await device.save();
      await this.alarmService.sync({
        deviceId: device.deviceId,
        assetId: device.assetId,
        type: "DEVICE_OFFLINE",
        severity: "WARNING",
        message: "ESP32 telemetry timed out.",
        active: true
      });
      this.notifier.emitToDevice(device.deviceId, "device:status", serializeDocument(device.toObject()));
      logger.warn("Device marked offline", { deviceId: device.deviceId });
    }
  }
}
