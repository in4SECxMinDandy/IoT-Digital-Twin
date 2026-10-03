import { describe, expect, test } from "vitest";
import { classifySoilStatus, environmentToSoilStatus, type SoilThresholds } from "./soil-status";

describe("soil-status", () => {
  const thresholds: SoilThresholds = { warningMinPct: 40, normalMinPct: 60 };

  describe("classifySoilStatus", () => {
    test("offline device returns OFFLINE regardless of reading", () => {
      expect(classifySoilStatus(70, "OFFLINE", thresholds)).toBe("OFFLINE");
      expect(classifySoilStatus(null, "OFFLINE", thresholds)).toBe("OFFLINE");
    });

    test("null or undefined moisture returns INVALID when online", () => {
      expect(classifySoilStatus(null, "ONLINE", thresholds)).toBe("INVALID");
      expect(classifySoilStatus(undefined, "ONLINE", thresholds)).toBe("INVALID");
    });

    test("NaN moisture returns INVALID", () => {
      expect(classifySoilStatus(NaN, "ONLINE", thresholds)).toBe("INVALID");
    });

    test("moisture >= 60% returns NORMAL", () => {
      expect(classifySoilStatus(60, "ONLINE", thresholds)).toBe("NORMAL");
      expect(classifySoilStatus(75, "ONLINE", thresholds)).toBe("NORMAL");
    });

    test("moisture 40-59% returns WARNING", () => {
      expect(classifySoilStatus(40, "ONLINE", thresholds)).toBe("WARNING");
      expect(classifySoilStatus(55, "ONLINE", thresholds)).toBe("WARNING");
    });

    test("moisture < 40% returns CRITICAL", () => {
      expect(classifySoilStatus(30, "ONLINE", thresholds)).toBe("CRITICAL");
      expect(classifySoilStatus(0, "ONLINE", thresholds)).toBe("CRITICAL");
    });
  });

  describe("environmentToSoilStatus", () => {
    test("offline device returns OFFLINE", () => {
      expect(environmentToSoilStatus("NORMAL", "OFFLINE")).toBe("OFFLINE");
      expect(environmentToSoilStatus("INVALID", "OFFLINE")).toBe("OFFLINE");
    });

    test("INVALID environment returns INVALID", () => {
      expect(environmentToSoilStatus("INVALID", "ONLINE")).toBe("INVALID");
    });

    test("other environments pass through", () => {
      expect(environmentToSoilStatus("NORMAL", "ONLINE")).toBe("NORMAL");
      expect(environmentToSoilStatus("WARNING", "ONLINE")).toBe("WARNING");
      expect(environmentToSoilStatus("CRITICAL", "ONLINE")).toBe("CRITICAL");
    });
  });
});
