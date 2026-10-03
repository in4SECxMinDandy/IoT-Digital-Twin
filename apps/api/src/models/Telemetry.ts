import { Schema, model, type InferSchemaType } from "mongoose";

const telemetrySchema = new Schema(
  {
    deviceId: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true },
    sequence: { type: Number, default: null },
    temperatureC: { type: Number, default: null },
    airHumidityPct: { type: Number, default: null },
    soilRaw: { type: Number, default: null },
    soilMoisturePct: { type: Number, default: null },
    smoothedSoilMoisturePct: { type: Number, default: null },
    valid: { type: Boolean, required: true },
    invalidFields: { type: [String], default: [] }
  },
  { timestamps: false }
);

telemetrySchema.index({ deviceId: 1, timestamp: -1 });

export type TelemetryDocument = InferSchemaType<typeof telemetrySchema>;
export const Telemetry = model<TelemetryDocument>("Telemetry", telemetrySchema);
