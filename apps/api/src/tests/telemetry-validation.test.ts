import { describe, expect, it } from "vitest";

import { normalizeTelemetry } from "../services/telemetry-validation";

describe("normalizeTelemetry", () => {
  const receivedAt = new Date("2026-10-02T08:00:00.000Z");

  it("normalizes a complete valid telemetry payload", () => {
    const timestamp = Date.parse("2026-10-02T07:59:55.000Z");

    expect(
      normalizeTelemetry(
        {
          timestamp,
          sequence: 12,
          temperatureC: 29.4,
          airHumidityPct: 73,
          soilRaw: 1845,
          soilMoisturePct: 46.5
        },
        receivedAt
      )
    ).toEqual({
      timestamp: new Date(timestamp),
      receivedAt,
      sequence: 12,
      temperatureC: 29.4,
      airHumidityPct: 73,
      soilRaw: 1845,
      soilMoisturePct: 46.5,
      invalidFields: [],
      valid: true
    });
  });

  it("accepts the documented short field aliases", () => {
    const telemetry = normalizeTelemetry(
      {
        temperature: 26,
        airHumidity: 61,
        soilMoisture: 52
      },
      receivedAt
    );

    expect(telemetry).toMatchObject({
      temperatureC: 26,
      airHumidityPct: 61,
      soilMoisturePct: 52,
      valid: true
    });
    expect(telemetry.timestamp).toEqual(receivedAt);
  });

  it("marks out-of-range and malformed readings invalid without accepting unsafe values", () => {
    const telemetry = normalizeTelemetry(
      {
        temperatureC: 61,
        airHumidityPct: -1,
        soilMoisturePct: "dry",
        soilRaw: Number.NaN
      },
      receivedAt
    );

    expect(telemetry).toMatchObject({
      temperatureC: null,
      airHumidityPct: null,
      soilMoisturePct: null,
      soilRaw: null,
      valid: false
    });
    expect(telemetry.invalidFields).toEqual(["temperatureC", "airHumidityPct", "soilMoisturePct", "soilRaw"]);
  });

  it("rejects a non-object payload and keeps a trustworthy receipt timestamp", () => {
    expect(normalizeTelemetry("not-json-object", receivedAt)).toEqual({
      timestamp: receivedAt,
      receivedAt,
      temperatureC: null,
      airHumidityPct: null,
      soilRaw: null,
      soilMoisturePct: null,
      invalidFields: ["payload"],
      valid: false
    });
  });
});
