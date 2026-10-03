import { randomUUID } from "node:crypto";

import type { AppConfig } from "../config/env";
import type { CommandChannel, CommandSource, CommandType, DeviceMode, EnvironmentStatus } from "../domain";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { serializeDocument } from "../lib/serialize";
import { Command } from "../models/Command";
import { Device } from "../models/Device";
import { commandStatusFromAck, isCommandExpired } from "./command-lifecycle";
import { parseAckPayload, parseJsonPayload, type MqttCommandPayload } from "./mqtt-contract";
import type { MqttService } from "./mqtt-service";
import type { RealtimeNotifier } from "./notifier";

export interface DispatchCommandInput {
  deviceId: string;
  type: CommandType;
  value?: string;
  source: CommandSource;
}

function channelForCommand(type: CommandType): CommandChannel {
  if (type === "START_IRRIGATION_SIMULATION" || type === "STOP_IRRIGATION_SIMULATION") {
    return "SIMULATION";
  }

  return type === "SET_MODE" ? "MODE" : "ALERT";
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export class CommandService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly mqtt: MqttService,
    private readonly notifier: RealtimeNotifier
  ) {}

  async dispatch(input: DispatchCommandInput) {
    const device = await Device.findOne({ deviceId: input.deviceId });
    if (!device) {
      throw new AppError("Device not found", 404);
    }

    if (device.status !== "ONLINE") {
      throw new AppError("Device is offline", 409);
    }

    const isSimulationCommand =
      input.type === "START_IRRIGATION_SIMULATION" || input.type === "STOP_IRRIGATION_SIMULATION";
    if (input.source === "MANUAL" && isSimulationCommand && device.currentState.mode !== "MANUAL") {
      throw new AppError("Switch the device to MANUAL mode before controlling the simulation", 409);
    }

    const now = new Date();
    let command;
    try {
      command = await Command.create({
        commandId: randomUUID(),
        deviceId: input.deviceId,
        channel: channelForCommand(input.type),
        type: input.type,
        value: input.value ?? null,
        source: input.source,
        status: "PENDING",
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.appConfig.commandTimeoutMs)
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("A command for this control channel is already pending", 409);
      }
      throw error;
    }

    device.currentState.lastCommand = {
      commandId: command.commandId,
      status: "PENDING",
      updatedAt: now
    };
    await device.save();
    this.notifier.emitToDevice(input.deviceId, "command:update", serializeDocument(command.toObject()));

    const mqttPayload: MqttCommandPayload = {
      commandId: command.commandId,
      type: input.type,
      ...(input.value ? { value: input.value } : {}),
      source: input.source
    };

    try {
      await this.mqtt.publishCommand(input.deviceId, mqttPayload);
      logger.info("Command sent", { deviceId: input.deviceId, commandId: command.commandId, type: input.type });
      return command;
    } catch (error) {
      command.status = "FAILED";
      command.error = error instanceof Error ? error.message : "MQTT publish failed";
      command.completedAt = new Date();
      await command.save();
      device.currentState.lastCommand = {
        commandId: command.commandId,
        status: "FAILED",
        updatedAt: command.completedAt
      };
      await device.save();
      this.notifier.emitToDevice(input.deviceId, "command:update", serializeDocument(command.toObject()));
      throw new AppError(command.error, 503);
    }
  }

  async sendRuleAlertLevel(deviceId: string, level: Exclude<EnvironmentStatus, "INVALID">): Promise<void> {
    await this.dispatch({ deviceId, type: "SET_ALERT_LEVEL", value: level, source: "RULE" });
  }

  async setAutoMode(deviceId: string, mode: DeviceMode): Promise<void> {
    await this.dispatch({ deviceId, type: "SET_MODE", value: mode, source: "MANUAL" });
  }

  async handleAck(deviceId: string, rawPayload: Buffer): Promise<void> {
    const parsedJson = parseJsonPayload(rawPayload);
    const ack = parsedJson ? parseAckPayload(parsedJson) : null;
    if (!ack) {
      logger.warn("Invalid MQTT acknowledgement", { deviceId });
      return;
    }

    const command = await Command.findOne({ commandId: ack.commandId, deviceId });
    if (!command) {
      logger.warn("Unknown MQTT acknowledgement", { deviceId, commandId: ack.commandId });
      return;
    }

    if (command.status !== "PENDING") {
      logger.info("Ignoring duplicate or late acknowledgement", { deviceId, commandId: ack.commandId });
      return;
    }

    const now = new Date();
    command.status = commandStatusFromAck(ack.success);
    command.error = ack.success ? null : ack.reason ?? "ESP32 rejected command";
    command.reportedState = ack.reportedState ?? null;
    command.acknowledgedAt = now;
    command.completedAt = now;
    await command.save();

    const device = await Device.findOne({ deviceId });
    let shouldStopAutoSimulation = false;
    if (device) {
      device.currentState.lastCommand = {
        commandId: command.commandId,
        status: command.status,
        updatedAt: now
      };
      if (ack.reportedState?.mode) device.currentState.mode = ack.reportedState.mode;
      if (ack.reportedState?.alertLevel) device.currentState.alertLevel = ack.reportedState.alertLevel;
      if (typeof ack.reportedState?.irrigationSimulationActive === "boolean") {
        device.currentState.irrigationSimulationActive = ack.reportedState.irrigationSimulationActive;
      }
      if (ack.reportedState?.greenPattern) device.currentState.greenPattern = ack.reportedState.greenPattern;
      device.currentState.reportedAt = ack.reportedState?.reportedAt ?? now;
      shouldStopAutoSimulation =
        ack.success &&
        device.currentState.mode === "AUTO" &&
        device.currentState.environment !== "CRITICAL" &&
        device.currentState.irrigationSimulationActive &&
        (command.type === "START_IRRIGATION_SIMULATION" || command.type === "SET_MODE");
      await device.save();
      this.notifier.emitToDevice(deviceId, "device:status", serializeDocument(device.toObject()));
    }

    this.notifier.emitToDevice(deviceId, "command:update", serializeDocument(command.toObject()));
    logger.info("Command acknowledgement received", {
      deviceId,
      commandId: command.commandId,
      status: command.status
    });

    if (shouldStopAutoSimulation) {
      try {
        await this.dispatch({ deviceId, type: "STOP_IRRIGATION_SIMULATION", source: "AUTO" });
      } catch (error) {
        logger.warn("Unable to stop a stale AUTO simulation", {
          deviceId,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  async expirePendingCommands(): Promise<void> {
    const pending = await Command.find({ status: "PENDING" });
    const now = new Date();

    for (const command of pending) {
      if (!isCommandExpired(command.expiresAt, now)) {
        continue;
      }

      command.status = "TIMEOUT";
      command.error = "ESP32 acknowledgement timed out";
      command.completedAt = now;
      await command.save();

      const device = await Device.findOne({ deviceId: command.deviceId });
      if (device) {
        device.currentState.lastCommand = {
          commandId: command.commandId,
          status: "TIMEOUT",
          updatedAt: now
        };
        await device.save();
      }

      this.notifier.emitToDevice(command.deviceId, "command:update", serializeDocument(command.toObject()));
      logger.warn("Command timed out", { deviceId: command.deviceId, commandId: command.commandId });
    }
  }
}
