import type { EnvironmentStatus, RuleThresholds } from "../domain";

export function classifySoilMoisture(
  soilMoisturePct: number | null,
  thresholds: RuleThresholds
): EnvironmentStatus {
  if (soilMoisturePct === null || !Number.isFinite(soilMoisturePct)) {
    return "INVALID";
  }

  if (soilMoisturePct >= thresholds.normalMinPct) {
    return "NORMAL";
  }

  if (soilMoisturePct >= thresholds.warningMinPct) {
    return "WARNING";
  }

  return "CRITICAL";
}
