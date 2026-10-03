import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import mongoose from "mongoose";

import type { AppConfig } from "./config/env";
import { AppError } from "./lib/errors";
import { logger } from "./lib/logger";
import { createApiRouter } from "./routes/api";
import type { CommandService } from "./services/command-service";
import type { MqttService } from "./services/mqtt-service";
import { isDatabaseConnected } from "./lib/database";

interface AppDependencies {
  config: AppConfig;
  commandService: CommandService;
  mqttService: MqttService;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: dependencies.config.corsOrigins }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_request, response) => {
    const databaseConnected = isDatabaseConnected();
    const mqttConnected = dependencies.mqttService.isConnected;
    const healthy = databaseConnected && mqttConnected;
    response.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        databaseConnected,
        mqttConnected,
        mongooseReadyState: mongoose.connection.readyState
      }
    });
  });

  app.use("/api", createApiRouter(dependencies.commandService));

  app.use((_request, _response, next) => next(new AppError("Route not found", 404)));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        success: false,
        error: error.message,
        ...(error.details ? { details: error.details } : {})
      });
      return;
    }

    if (error instanceof mongoose.Error) {
      logger.error("Database request failed", { error: error.message });
      response.status(503).json({ success: false, error: "Database is unavailable" });
      return;
    }

    logger.error("Unhandled API error", { error: error instanceof Error ? error.message : "Unknown error" });
    response.status(500).json({ success: false, error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
