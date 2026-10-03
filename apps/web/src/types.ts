export type DeviceStatus = "ONLINE" | "OFFLINE";
export type EnvironmentStatus = "NORMAL" | "WARNING" | "CRITICAL" | "INVALID";
export type DeviceMode = "AUTO" | "MANUAL";
export type CommandStatus = "PENDING" | "EXECUTED" | "FAILED" | "TIMEOUT";
export type CommandType =
  | "START_IRRIGATION_SIMULATION"
  | "STOP_IRRIGATION_SIMULATION"
  | "SET_MODE"
  | "SET_ALERT_LEVEL";

export interface Asset {
  id: string;
  name: string;
  type: "garden" | "plant";
  parentAssetId: string | null;
  attributes: Record<string, unknown>;
}

export interface LastTelemetry {
  temperatureC?: number | null;
  airHumidityPct?: number | null;
  soilMoisturePct?: number | null;
  timestamp?: string | null;
}

export interface ReportedState {
  mode: DeviceMode;
  environment: EnvironmentStatus;
  alertLevel: Exclude<EnvironmentStatus, "INVALID">;
  irrigationSimulationActive: boolean;
  greenPattern: "OFF" | "SOLID" | "BLINK";
  reportedAt?: string | null;
  lastCommand?: {
    commandId?: string | null;
    status?: CommandStatus | null;
    updatedAt?: string | null;
  };
  lastTelemetry?: LastTelemetry;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: string;
  assetId: string;
  attributes: Record<string, unknown>;
  status: DeviceStatus;
  lastSeen?: string | null;
  currentState: ReportedState;
}

export interface Telemetry {
  id: string;
  deviceId: string;
  assetId: string;
  timestamp: string;
  receivedAt: string;
  sequence?: number | null;
  temperatureC: number | null;
  airHumidityPct: number | null;
  soilRaw: number | null;
  soilMoisturePct: number | null;
  smoothedSoilMoisturePct: number | null;
  valid: boolean;
  invalidFields: string[];
}

export interface Alarm {
  id: string;
  deviceId: string;
  assetId: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  latestValue?: string | number | string[] | null;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string | null;
}

export interface Command {
  id: string;
  commandId: string;
  deviceId: string;
  type: CommandType;
  value?: string | null;
  source: "MANUAL" | "AUTO" | "RULE";
  status: CommandStatus;
  error?: string | null;
  reportedState?: Partial<ReportedState> | null;
  createdAt: string;
  expiresAt: string;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface AssetPayload {
  assets: Asset[];
  devices: Device[];
}

export interface IrrigationSchedule {
  id: string;
  name: string;
  startDate: string;
  startTime: string;
  repeat: string;
  repeatDays?: string[];
  repeatEnabled: boolean;
  endDate: string;
  stopCondition: "duration" | "volume";
  durationMinutes?: number;
  volumeLiters?: number;
}

export interface IrrigationTask {
  id: string;
  startDay: string;
  startTime: string;
  endRule: string;
  duration: string;
  volume: string;
  progressPct: number;
}

