import type { DeviceStatus, EnvironmentStatus } from "../../types";

export type SoilStatus = "NORMAL" | "WARNING" | "CRITICAL" | "INVALID" | "OFFLINE";

export interface SoilThresholds {
  warningMinPct: number; // e.g. 40
  normalMinPct: number; // e.g. 60
}

/**
 * Classify soil moisture into colour status, matching backend classifySoilMoisture.
 * OFFLINE when device is offline; INVALID when reading is missing/uncalibrated.
 */
export function classifySoilStatus(
  soilMoisturePct: number | null | undefined,
  deviceStatus: DeviceStatus,
  thresholds: SoilThresholds
): SoilStatus {
  if (deviceStatus === "OFFLINE") return "OFFLINE";
  if (soilMoisturePct == null || !Number.isFinite(soilMoisturePct)) return "INVALID";
  if (soilMoisturePct >= thresholds.normalMinPct) return "NORMAL";
  if (soilMoisturePct >= thresholds.warningMinPct) return "WARNING";
  return "CRITICAL";
}

/**
 * Map environment status to soil status (used when backend pre-computed the classification).
 */
export function environmentToSoilStatus(
  env: EnvironmentStatus,
  deviceStatus: DeviceStatus
): SoilStatus {
  if (deviceStatus === "OFFLINE") return "OFFLINE";
  if (env === "INVALID") return "INVALID";
  return env; // NORMAL | WARNING | CRITICAL
}

export const SOIL_STATUS_COLORS: Record<SoilStatus, string> = {
  NORMAL: "#10b981",
  WARNING: "#f59e0b",
  CRITICAL: "#ef4444",
  INVALID: "#94a3b8",
  OFFLINE: "#64748b"
};

export const SOIL_STATUS_LABELS: Record<SoilStatus, string> = {
  NORMAL: "Bình thường",
  WARNING: "Cảnh báo",
  CRITICAL: "Nguy cấp",
  INVALID: "Không hợp lệ",
  OFFLINE: "Mất kết nối"
};
