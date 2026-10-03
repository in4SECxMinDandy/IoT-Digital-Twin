import { z } from "zod";

import {
  COMMAND_TYPES,
  DEVICE_MODES,
  ENVIRONMENT_STATUSES,
  type CommandType,
  type DeviceMode,
  type EnvironmentStatus,
  type ReportedDeviceState
} from "../domain";

const commandSchema = z.object({
  commandId: z.string().min(1).max(100),
  type: z.enum(COMMAND_TYPES),
  value: z.string().max(40).optional(),
  source: z.enum(["MANUAL", "AUTO", "RULE"]).optional()
});

const reportedStateSchema = z.object({
  online: z.boolean().optional(),
  mode: z.enum(DEVICE_MODES).optional(),
  alertLevel: z.enum(["NORMAL", "WARNING", "CRITICAL"]).optional(),
  irrigationSimulationActive: z.boolean().optional(),
  greenPattern: z.enum(["OFF", "SOLID", "BLINK"]).optional(),
  reportedAt: z.number().finite().positive().optional()
});

const stateSchema = reportedStateSchema.extend({
  online: z.boolean(),
  uptimeMs: z.number().finite().nonnegative().optional()
});

const ackSchema = z.object({
  commandId: z.string().min(1).max(100),
  success: z.boolean(),
  status: z.enum(["EXECUTED", "FAILED"]).optional(),
  state: z.string().max(40).optional(),
  reason: z.string().max(300).optional(),
  reportedState: reportedStateSchema.optional()
});

export interface MqttCommandPayload {
  commandId: string;
  type: CommandType;
  value?: string;
  source: "MANUAL" | "AUTO" | "RULE";
}

export interface MqttAckPayload {
  commandId: string;
  success: boolean;
  status?: "EXECUTED" | "FAILED";
  state?: string;
  reason?: string;
  reportedState?: ReportedDeviceState;
}

export function topicFor(deviceId: string, channel: "telemetry" | "state" | "command" | "ack"): string {
  return `iot/${deviceId}/${channel}`;
}

export function parseJsonPayload(payload: Buffer): unknown | null {
  try {
    return JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
}

function mapReportedState(value: z.infer<typeof reportedStateSchema>): ReportedDeviceState {
  return {
    online: value.online,
    mode: value.mode as DeviceMode | undefined,
    alertLevel: value.alertLevel as Exclude<EnvironmentStatus, "INVALID"> | undefined,
    irrigationSimulationActive: value.irrigationSimulationActive,
    greenPattern: value.greenPattern,
    reportedAt: value.reportedAt ? new Date(value.reportedAt) : undefined
  };
}

export function parseReportedState(payload: unknown): ReportedDeviceState | null {
  const parsed = stateSchema.safeParse(payload);
  return parsed.success ? mapReportedState(parsed.data) : null;
}

export function parseAckPayload(payload: unknown): MqttAckPayload | null {
  const parsed = ackSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }

  return {
    commandId: parsed.data.commandId,
    success: parsed.data.success,
    status: parsed.data.status,
    state: parsed.data.state,
    reason: parsed.data.reason,
    reportedState: parsed.data.reportedState ? mapReportedState(parsed.data.reportedState) : undefined
  };
}

export function parseCommandPayload(payload: unknown): MqttCommandPayload | null {
  const parsed = commandSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }

  return {
    commandId: parsed.data.commandId,
    type: parsed.data.type,
    value: parsed.data.value,
    source: parsed.data.source ?? "MANUAL"
  };
}
