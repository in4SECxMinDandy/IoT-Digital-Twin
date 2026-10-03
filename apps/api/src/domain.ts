export const ENVIRONMENT_STATUSES = ["NORMAL", "WARNING", "CRITICAL", "INVALID"] as const;
export type EnvironmentStatus = (typeof ENVIRONMENT_STATUSES)[number];

export const DEVICE_STATUSES = ["ONLINE", "OFFLINE"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_MODES = ["AUTO", "MANUAL"] as const;
export type DeviceMode = (typeof DEVICE_MODES)[number];

export const COMMAND_TYPES = [
  "START_IRRIGATION_SIMULATION",
  "STOP_IRRIGATION_SIMULATION",
  "SET_MODE",
  "SET_ALERT_LEVEL"
] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export const COMMAND_STATUSES = ["PENDING", "EXECUTED", "FAILED", "TIMEOUT"] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];

export const COMMAND_CHANNELS = ["SIMULATION", "MODE", "ALERT"] as const;
export type CommandChannel = (typeof COMMAND_CHANNELS)[number];

export const COMMAND_SOURCES = ["MANUAL", "AUTO", "RULE"] as const;
export type CommandSource = (typeof COMMAND_SOURCES)[number];

export const ALARM_TYPES = [
  "LOW_SOIL_MOISTURE",
  "HIGH_TEMPERATURE",
  "DEVICE_OFFLINE",
  "INVALID_SENSOR_DATA"
] as const;
export type AlarmType = (typeof ALARM_TYPES)[number];

export const ALARM_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type AlarmSeverity = (typeof ALARM_SEVERITIES)[number];

export interface ReportedDeviceState {
  online?: boolean;
  mode?: DeviceMode;
  alertLevel?: Exclude<EnvironmentStatus, "INVALID">;
  irrigationSimulationActive?: boolean;
  greenPattern?: "OFF" | "SOLID" | "BLINK";
  reportedAt?: Date;
}

export interface LastTelemetry {
  temperatureC?: number;
  airHumidityPct?: number;
  soilMoisturePct?: number;
  timestamp?: Date;
}

export interface RuleThresholds {
  warningMinPct: number;
  normalMinPct: number;
}
