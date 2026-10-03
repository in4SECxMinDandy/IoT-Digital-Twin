import { z } from "zod";

export interface NormalizedTelemetry {
  timestamp: Date;
  receivedAt: Date;
  sequence?: number;
  temperatureC: number | null;
  airHumidityPct: number | null;
  soilRaw: number | null;
  soilMoisturePct: number | null;
  invalidFields: string[];
  valid: boolean;
}

const rawTelemetrySchema = z
  .object({
    timestamp: z.unknown().optional(),
    sequence: z.unknown().optional(),
    temperature: z.unknown().optional(),
    temperatureC: z.unknown().optional(),
    airHumidity: z.unknown().optional(),
    airHumidityPct: z.unknown().optional(),
    soilRaw: z.unknown().optional(),
    soilMoisture: z.unknown().optional(),
    soilMoisturePct: z.unknown().optional()
  })
  .passthrough();

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined) {
      return source[key];
    }
  }

  return undefined;
}

function inRange(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }

  return value;
}

function integerAtLeastZero(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export function normalizeTelemetry(payload: unknown, receivedAt = new Date()): NormalizedTelemetry {
  const parsed = rawTelemetrySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      timestamp: receivedAt,
      receivedAt,
      temperatureC: null,
      airHumidityPct: null,
      soilRaw: null,
      soilMoisturePct: null,
      invalidFields: ["payload"],
      valid: false
    };
  }

  const source = parsed.data;
  const invalidFields: string[] = [];
  const temperature = inRange(pick(source, ["temperatureC", "temperature"]), 0, 60);
  const airHumidity = inRange(pick(source, ["airHumidityPct", "airHumidity"]), 0, 100);
  const soilMoisture = inRange(pick(source, ["soilMoisturePct", "soilMoisture"]), 0, 100);
  const soilRawValue = pick(source, ["soilRaw"]);
  const soilRaw = typeof soilRawValue === "number" && Number.isFinite(soilRawValue) ? soilRawValue : null;

  if (temperature === null) invalidFields.push("temperatureC");
  if (airHumidity === null) invalidFields.push("airHumidityPct");
  if (soilMoisture === null) invalidFields.push("soilMoisturePct");
  if (soilRawValue !== undefined && soilRaw === null) invalidFields.push("soilRaw");

  const timestampValue = pick(source, ["timestamp"]);
  const timestamp =
    typeof timestampValue === "number" && Number.isFinite(timestampValue) && timestampValue > 0
      ? new Date(timestampValue)
      : receivedAt;

  return {
    timestamp,
    receivedAt,
    sequence: integerAtLeastZero(pick(source, ["sequence"])),
    temperatureC: temperature,
    airHumidityPct: airHumidity,
    soilRaw,
    soilMoisturePct: soilMoisture,
    invalidFields,
    valid: invalidFields.length === 0
  };
}
