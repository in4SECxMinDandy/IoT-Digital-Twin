import "dotenv/config";

import { z } from "zod";

const optionalString = z.string().optional().transform((value) => value?.trim() || undefined);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/iot_twin"),
    MQTT_URL: z.string().url().default("mqtt://localhost:1883"),
    MQTT_USERNAME: optionalString,
    MQTT_PASSWORD: optionalString,
    CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:8080"),
    DEVICE_OFFLINE_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    TELEMETRY_SMOOTHING_WINDOW: z.coerce.number().int().min(1).max(20).default(5),
    SOIL_WARNING_MIN_PCT: z.coerce.number().min(0).max(100).default(40),
    SOIL_NORMAL_MIN_PCT: z.coerce.number().min(0).max(100).default(60),
    HIGH_TEMPERATURE_C: z.coerce.number().min(0).max(60).default(45)
  })
  .superRefine((value, context) => {
    if (value.SOIL_NORMAL_MIN_PCT <= value.SOIL_WARNING_MIN_PCT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SOIL_NORMAL_MIN_PCT must be greater than SOIL_WARNING_MIN_PCT",
        path: ["SOIL_NORMAL_MIN_PCT"]
      });
    }
  });

const parsed = environmentSchema.parse(process.env);

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  mongoUri: parsed.MONGODB_URI,
  mqttUrl: parsed.MQTT_URL,
  mqttUsername: parsed.MQTT_USERNAME,
  mqttPassword: parsed.MQTT_PASSWORD,
  corsOrigins: parsed.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
  deviceOfflineTimeoutMs: parsed.DEVICE_OFFLINE_TIMEOUT_MS,
  commandTimeoutMs: parsed.COMMAND_TIMEOUT_MS,
  telemetrySmoothingWindow: parsed.TELEMETRY_SMOOTHING_WINDOW,
  thresholds: {
    warningMinPct: parsed.SOIL_WARNING_MIN_PCT,
    normalMinPct: parsed.SOIL_NORMAL_MIN_PCT
  },
  highTemperatureC: parsed.HIGH_TEMPERATURE_C
};

export type AppConfig = typeof config;
