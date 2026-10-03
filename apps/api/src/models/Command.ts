import { Schema, model, type InferSchemaType } from "mongoose";

const commandSchema = new Schema(
  {
    commandId: { type: String, required: true, unique: true, immutable: true },
    deviceId: { type: String, required: true, index: true },
    channel: { type: String, required: true, enum: ["SIMULATION", "MODE", "ALERT"] },
    type: {
      type: String,
      required: true,
      enum: [
        "START_IRRIGATION_SIMULATION",
        "STOP_IRRIGATION_SIMULATION",
        "SET_MODE",
        "SET_ALERT_LEVEL"
      ]
    },
    value: { type: String, default: null },
    source: { type: String, required: true, enum: ["MANUAL", "AUTO", "RULE"] },
    status: { type: String, required: true, enum: ["PENDING", "EXECUTED", "FAILED", "TIMEOUT"] },
    error: { type: String, default: null },
    reportedState: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    acknowledgedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: false }
);

commandSchema.index({ deviceId: 1, createdAt: -1 });
commandSchema.index(
  { deviceId: 1, channel: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" }, name: "one_pending_command_per_channel" }
);

export type CommandDocument = InferSchemaType<typeof commandSchema>;
export const Command = model<CommandDocument>("Command", commandSchema);
