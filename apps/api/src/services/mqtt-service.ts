import mqtt, { type MqttClient } from "mqtt";

import type { AppConfig } from "../config/env";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { MqttCommandPayload } from "./mqtt-contract";
import { topicFor } from "./mqtt-contract";

export interface MqttHandlers {
  onTelemetry: (deviceId: string, payload: Buffer) => Promise<void>;
  onState: (deviceId: string, payload: Buffer) => Promise<void>;
  onAck: (deviceId: string, payload: Buffer) => Promise<void>;
}

export class MqttService {
  private client: MqttClient | null = null;
  private connected = false;
  private handlers: MqttHandlers | null = null;

  constructor(private readonly appConfig: AppConfig) {}

  get isConnected(): boolean {
    return this.connected;
  }

  setHandlers(handlers: MqttHandlers): void {
    this.handlers = handlers;
  }

  start(): void {
    if (this.client) {
      return;
    }

    this.client = mqtt.connect(this.appConfig.mqttUrl, {
      username: this.appConfig.mqttUsername,
      password: this.appConfig.mqttPassword,
      reconnectPeriod: 5_000,
      clean: true
    });

    this.client.on("connect", () => {
      this.connected = true;
      logger.info("MQTT connected", { url: this.appConfig.mqttUrl });
      this.client?.subscribe(["iot/+/telemetry", "iot/+/state", "iot/+/ack"], { qos: 1 }, (error) => {
        if (error) {
          logger.error("MQTT subscription failed", { error: error.message });
        }
      });
    });

    this.client.on("reconnect", () => logger.info("MQTT reconnecting"));
    this.client.on("offline", () => {
      this.connected = false;
      logger.warn("MQTT offline");
    });
    this.client.on("close", () => {
      this.connected = false;
      logger.warn("MQTT disconnected");
    });
    this.client.on("error", (error) => logger.error("MQTT error", { error: error.message }));
    this.client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload);
    });
  }

  async publishCommand(deviceId: string, payload: MqttCommandPayload): Promise<void> {
    if (!this.client || !this.connected) {
      throw new AppError("MQTT broker is unavailable", 503);
    }

    await new Promise<void>((resolve, reject) => {
      this.client?.publish(topicFor(deviceId, "command"), JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  stop(): void {
    this.client?.end(true);
    this.client = null;
    this.connected = false;
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const match = /^iot\/([^/]+)\/(telemetry|state|ack)$/.exec(topic);
    if (!match || !this.handlers) {
      return;
    }

    const [, deviceId, channel] = match;
    if (!deviceId) {
      return;
    }

    try {
      if (channel === "telemetry") await this.handlers.onTelemetry(deviceId, payload);
      if (channel === "state") await this.handlers.onState(deviceId, payload);
      if (channel === "ack") await this.handlers.onAck(deviceId, payload);
    } catch (error) {
      logger.error("MQTT message processing failed", {
        topic,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}
