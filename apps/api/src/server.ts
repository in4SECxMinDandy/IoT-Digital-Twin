import { createServer } from "node:http";

import { createApp } from "./app";
import { config } from "./config/env";
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from "./lib/database";
import { logger } from "./lib/logger";
import { createSocketServer } from "./realtime";
import { AlarmService } from "./services/alarm-service";
import { CommandService } from "./services/command-service";
import { DeviceService } from "./services/device-service";
import { MqttService } from "./services/mqtt-service";
import { SocketNotifier } from "./services/notifier";
import { ensureDemoTwin } from "./services/seed-service";
import { TelemetryService } from "./services/telemetry-service";

async function start(): Promise<void> {
  const httpServer = createServer();
  const io = createSocketServer(httpServer, config);
  const notifier = new SocketNotifier(io);
  const mqttService = new MqttService(config);
  const alarmService = new AlarmService(notifier);
  const commandService = new CommandService(config, mqttService, notifier);
  const deviceService = new DeviceService(config, alarmService, notifier);
  const telemetryService = new TelemetryService(config, alarmService, commandService, notifier);

  mqttService.setHandlers({
    onTelemetry: (deviceId, payload) => telemetryService.handleTelemetry(deviceId, payload),
    onState: (deviceId, payload) => deviceService.handleReportedState(deviceId, payload),
    onAck: (deviceId, payload) => commandService.handleAck(deviceId, payload)
  });

  const app = createApp({ config, commandService, mqttService });
  httpServer.on("request", app);
  httpServer.listen(config.port, () => logger.info("API listening", { port: config.port }));

  async function reconnectDatabase(): Promise<void> {
    if (isDatabaseConnected()) {
      mqttService.start();
      return;
    }
    if (await connectDatabase(config.mongoUri)) {
      await ensureDemoTwin();
      mqttService.start();
    }
  }

  await reconnectDatabase();
  const deviceTimer = setInterval(() => {
    void deviceService.markOfflineDevices().catch((error) => {
      logger.error("Device status scan failed", { error: error instanceof Error ? error.message : "Unknown error" });
    });
  }, 5_000);
  const commandTimer = setInterval(() => {
    void commandService.expirePendingCommands().catch((error) => {
      logger.error("Command timeout scan failed", { error: error instanceof Error ? error.message : "Unknown error" });
    });
  }, 1_000);
  const databaseTimer = setInterval(() => void reconnectDatabase(), 10_000);

  async function shutdown(signal: string): Promise<void> {
    logger.info("Shutting down", { signal });
    clearInterval(deviceTimer);
    clearInterval(commandTimer);
    clearInterval(databaseTimer);
    mqttService.stop();
    io.close();
    httpServer.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start();
