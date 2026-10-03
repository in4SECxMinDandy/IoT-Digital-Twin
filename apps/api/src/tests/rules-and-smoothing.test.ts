import { describe, expect, it } from "vitest";

import { classifySoilMoisture } from "../services/rules";
import { calculateMovingAverage } from "../services/smoothing";

const thresholds = { warningMinPct: 40, normalMinPct: 60 };

describe("calculateMovingAverage", () => {
  it("uses the current reading and at most windowSize - 1 prior readings", () => {
    expect(calculateMovingAverage([40, 50], 70, 3)).toBeCloseTo(160 / 3);
    expect(calculateMovingAverage([10, 20, 30], 40, 2)).toBe(25);
  });

  it("uses only the current reading when the window size is one", () => {
    expect(calculateMovingAverage([10, 20], 55, 1)).toBe(55);
  });
});

describe("classifySoilMoisture", () => {
  it("uses inclusive boundaries for normal and warning states", () => {
    expect(classifySoilMoisture(60, thresholds)).toBe("NORMAL");
    expect(classifySoilMoisture(40, thresholds)).toBe("WARNING");
    expect(classifySoilMoisture(39.9, thresholds)).toBe("CRITICAL");
  });

  it("marks missing or non-finite soil data as invalid", () => {
    expect(classifySoilMoisture(null, thresholds)).toBe("INVALID");
    expect(classifySoilMoisture(Number.NaN, thresholds)).toBe("INVALID");
  });
});
