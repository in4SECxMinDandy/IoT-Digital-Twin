import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  isDatabaseConnected: vi.fn(() => false)
}));

vi.mock("../lib/database", () => ({
  isDatabaseConnected: database.isDatabaseConnected
}));

import { createApp } from "../app";
import type { AppConfig } from "../config/env";
import type { CommandService } from "../services/command-service";
import type { MqttService } from "../services/mqtt-service";

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

describe("GET /api/health", () => {
  beforeEach(() => {
    database.isDatabaseConnected.mockReset().mockReturnValue(false);
  });

  it("returns service unavailable when MongoDB is disconnected", async () => {
    const app = createApp({
      config: appConfig,
      commandService: {} as CommandService,
      mqttService: { isConnected: false } as MqttService
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      data: { databaseConnected: false, mqttConnected: false }
    });
    expect(response.body.data.mongooseReadyState).toEqual(expect.any(Number));
  });

  it("returns service unavailable when MongoDB is connected but MQTT is disconnected", async () => {
    database.isDatabaseConnected.mockReturnValue(true);
    const app = createApp({
      config: appConfig,
      commandService: {} as CommandService,
      mqttService: { isConnected: false } as MqttService
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      data: { databaseConnected: true, mqttConnected: false }
    });
  });

  it("returns healthy only when both MongoDB and MQTT are connected", async () => {
    database.isDatabaseConnected.mockReturnValue(true);
    const app = createApp({
      config: appConfig,
      commandService: {} as CommandService,
      mqttService: { isConnected: true } as MqttService
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { databaseConnected: true, mqttConnected: true }
    });
  });
});
