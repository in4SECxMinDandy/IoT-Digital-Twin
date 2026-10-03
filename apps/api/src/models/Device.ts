import { Schema, model, type InferSchemaType } from "mongoose";

const lastTelemetrySchema = new Schema(
  {
    temperatureC: { type: Number, default: null },
    airHumidityPct: { type: Number, default: null },
    soilMoisturePct: { type: Number, default: null },
    timestamp: { type: Date, default: null }
  },
  { _id: false }
);

const lastCommandSchema = new Schema(
  {
    commandId: { type: String, default: null },
    status: { type: String, default: null },
    updatedAt: { type: Date, default: null }
  },
  { _id: false }
);

const currentStateSchema = new Schema(
  {
    mode: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
    environment: {
      type: String,
      enum: ["NORMAL", "WARNING", "CRITICAL", "INVALID"],
      default: "INVALID"
    },
    alertLevel: { type: String, enum: ["NORMAL", "WARNING", "CRITICAL"], default: "NORMAL" },
    irrigationSimulationActive: { type: Boolean, default: false },
    greenPattern: { type: String, enum: ["OFF", "SOLID", "BLINK"], default: "OFF" },
    reportedAt: { type: Date, default: null },
    lastCommand: { type: lastCommandSchema, default: () => ({}) },
    lastTelemetry: { type: lastTelemetrySchema, default: () => ({}) }
  },
  { _id: false }
);

const deviceSchema = new Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true, immutable: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, default: "ESP32-WROOM-32S" },
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    attributes: {
      type: Schema.Types.Mixed,
      default: {
        firmwareVersion: "unreported",
        sensors: ["DHT11", "LM393"],
        sampleIntervalSeconds: 5
      }
    },
    status: { type: String, enum: ["ONLINE", "OFFLINE"], default: "OFFLINE" },
    lastSeen: { type: Date, default: null },
    currentState: { type: currentStateSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export type DeviceDocument = InferSchemaType<typeof deviceSchema>;
export const Device = model<DeviceDocument>("Device", deviceSchema);
