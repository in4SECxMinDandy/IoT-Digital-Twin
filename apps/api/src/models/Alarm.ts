import { Schema, model, type InferSchemaType } from "mongoose";

const alarmSchema = new Schema(
  {
    deviceId: { type: String, required: true },
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    type: {
      type: String,
      required: true,
      enum: ["LOW_SOIL_MOISTURE", "HIGH_TEMPERATURE", "DEVICE_OFFLINE", "INVALID_SENSOR_DATA"]
    },
    severity: { type: String, required: true, enum: ["INFO", "WARNING", "CRITICAL"] },
    message: { type: String, required: true },
    latestValue: { type: Schema.Types.Mixed, default: null },
    status: { type: String, required: true, enum: ["OPEN", "RESOLVED"], default: "OPEN" },
    createdAt: { type: Date, required: true, default: Date.now },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

alarmSchema.index({ deviceId: 1, status: 1, createdAt: -1 });

export type AlarmDocument = InferSchemaType<typeof alarmSchema>;
export const Alarm = model<AlarmDocument>("Alarm", alarmSchema);
