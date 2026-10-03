import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  findCommand: vi.fn(),
  findDevice: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock("../models/Command", () => ({
  Command: { findOne: dependencies.findCommand }
}));

vi.mock("../models/Device", () => ({
  Device: { findOne: dependencies.findDevice }
}));

vi.mock("../lib/logger", () => ({
  logger: dependencies.logger
}));

import type { AppConfig } from "../config/env";
import { CommandService } from "../services/command-service";
import type { MqttService } from "../services/mqtt-service";
import type { RealtimeNotifier } from "../services/notifier";

const appConfig: AppConfig = {
  nodeEnv: "test",
  port: 4000,
  mongoUri: "mongodb://localhost:27017/test",
  mqttUrl: "mqtt://localhost:1883",
  mqttUsername: undefined,
  mqttPassword: undefined,
  corsOrigins: ["http://localhost:5173"],
  deviceOfflineTimeoutMs: 20_000,
  commandTimeoutMs: 10_000,
  telemetrySmoothingWindow: 5,
  thresholds: { warningMinPct: 40, normalMinPct: 60 },
  highTemperatureC: 45
};

function createPendingCommand() {
  return {
    commandId: "command-123",
    deviceId: "ESP32_01",
    status: "PENDING",
    error: null as string | null,
    reportedState: null as unknown,
    acknowledgedAt: null as Date | null,
    completedAt: null as Date | null,
    save: vi.fn(async () => undefined),
    toObject() {
      return {
        commandId: this.commandId,
        deviceId: this.deviceId,
        status: this.status,
        error: this.error,
        reportedState: this.reportedState,
        acknowledgedAt: this.acknowledgedAt,
        completedAt: this.completedAt
      };
    }
  };
}

function createDevice() {
  return {
    deviceId: "ESP32_01",
    currentState: {
      mode: "MANUAL",
      alertLevel: "NORMAL",
      irrigationSimulationActive: false,
      greenPattern: "OFF",
      reportedAt: null as Date | null,
      lastCommand: {}
    },
    save: vi.fn(async () => undefined),
    toObject() {
      return { deviceId: this.deviceId, currentState: this.currentState };
    }
  };
}

describe("CommandService.handleAck", () => {
  const notifier: RealtimeNotifier & { emitToDevice: ReturnType<typeof vi.fn> } = {
    emitToDevice: vi.fn()
  };

  beforeEach(() => {
    dependencies.findCommand.mockReset();
    dependencies.findDevice.mockReset();
    dependencies.logger.info.mockReset();
    dependencies.logger.warn.mockReset();
    notifier.emitToDevice.mockReset();
  });

  it("marks a pending command executed only after a valid ESP32 ACK and publishes confirmed state", async () => {
    const command = createPendingCommand();
    const device = createDevice();
    dependencies.findCommand.mockResolvedValue(command);
    dependencies.findDevice.mockResolvedValue(device);
    const service = new CommandService(appConfig, {} as MqttService, notifier);

    await service.handleAck(
      "ESP32_01",
      Buffer.from(
        JSON.stringify({
          commandId: "command-123",
          success: true,
          status: "EXECUTED",
          reportedState: {
            online: true,
            mode: "AUTO",
            alertLevel: "CRITICAL",
            irrigationSimulationActive: true,
            greenPattern: "BLINK",
            reportedAt: Date.parse("2026-10-02T08:00:00.000Z")
          }
        })
      )
    );

    expect(command.status).toBe("EXECUTED");
    expect(command.error).toBeNull();
    expect(command.save).toHaveBeenCalledOnce();
    expect(device.currentState).toMatchObject({
      mode: "AUTO",
      alertLevel: "CRITICAL",
      irrigationSimulationActive: true,
      greenPattern: "BLINK",
      lastCommand: { commandId: "command-123", status: "EXECUTED" }
    });
    expect(device.save).toHaveBeenCalledOnce();
    expect(notifier.emitToDevice).toHaveBeenCalledWith(
      "ESP32_01",
      "command:update",
      expect.objectContaining({ commandId: "command-123", status: "EXECUTED" })
    );
    expect(notifier.emitToDevice).toHaveBeenCalledWith(
      "ESP32_01",
      "device:status",
      expect.objectContaining({ deviceId: "ESP32_01" })
    );
  });

  it("ignores a duplicate ACK for a command that is already terminal", async () => {
    const command = createPendingCommand();
    command.status = "EXECUTED";
    dependencies.findCommand.mockResolvedValue(command);
    const service = new CommandService(appConfig, {} as MqttService, notifier);

    await service.handleAck("ESP32_01", Buffer.from(JSON.stringify({ commandId: "command-123", success: true })));

    expect(command.save).not.toHaveBeenCalled();
    expect(dependencies.findDevice).not.toHaveBeenCalled();
    expect(notifier.emitToDevice).not.toHaveBeenCalled();
    expect(dependencies.logger.info).toHaveBeenCalledWith(
      "Ignoring duplicate or late acknowledgement",
      expect.objectContaining({ deviceId: "ESP32_01", commandId: "command-123" })
    );
  });

  it("ignores an ACK for an unknown command", async () => {
    dependencies.findCommand.mockResolvedValue(null);
    const service = new CommandService(appConfig, {} as MqttService, notifier);

    await service.handleAck("ESP32_01", Buffer.from(JSON.stringify({ commandId: "unknown", success: true })));

    expect(dependencies.findDevice).not.toHaveBeenCalled();
    expect(notifier.emitToDevice).not.toHaveBeenCalled();
    expect(dependencies.logger.warn).toHaveBeenCalledWith(
      "Unknown MQTT acknowledgement",
      { deviceId: "ESP32_01", commandId: "unknown" }
    );
  });
});
