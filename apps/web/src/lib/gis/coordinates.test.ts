import { describe, expect, test } from "vitest";
import { clampToZone, enuToWgs84, wgs84ToEnu, type SiteConfig } from "./coordinates";

describe("coordinates", () => {
  const site: SiteConfig = {
    centerLat: 10.762622,
    centerLng: 106.682284,
    groundElevationM: 5,
    northOffsetDeg: 0
  };

  describe("wgs84ToEnu", () => {
    test("origin returns zero", () => {
      const enu = wgs84ToEnu({ lat: site.centerLat, lng: site.centerLng }, site);
      expect(enu.east).toBeCloseTo(0, 2);
      expect(enu.north).toBeCloseTo(0, 2);
      expect(enu.up).toBe(0);
    });

    test("converts point 10m east, 15m north", () => {
      const target = {
        lat: site.centerLat + (15 / 6378137) * (180 / Math.PI),
        lng: site.centerLng + (10 / (6378137 * Math.cos(site.centerLat * (Math.PI / 180)))) * (180 / Math.PI)
      };
      const enu = wgs84ToEnu(target, site);
      expect(enu.east).toBeCloseTo(10, 1);
      expect(enu.north).toBeCloseTo(15, 1);
    });

    test("altitude above ground becomes up", () => {
      const enu = wgs84ToEnu({ lat: site.centerLat, lng: site.centerLng, alt: 10 }, site);
      expect(enu.up).toBe(5);
    });
  });

  describe("enuToWgs84", () => {
    test("round-trip preserves coordinates", () => {
      const original = { lat: 10.763, lng: 106.683, alt: 8 };
      const enu = wgs84ToEnu(original, site);
      const back = enuToWgs84(enu, site);
      expect(back.lat).toBeCloseTo(original.lat, 5);
      expect(back.lng).toBeCloseTo(original.lng, 5);
      expect(back.alt).toBeCloseTo(original.alt, 1);
    });
  });

  describe("clampToZone", () => {
    const bounds = { minEast: -7.5, maxEast: 7.5, minNorth: -10, maxNorth: 10 };

    test("point inside stays unchanged", () => {
      const enu = { east: 2, north: 3, up: 1 };
      const clamped = clampToZone(enu, bounds);
      expect(clamped).toEqual(enu);
    });

    test("point outside is clamped to boundary", () => {
      const enu = { east: 20, north: -15, up: 2 };
      const clamped = clampToZone(enu, bounds);
      expect(clamped.east).toBe(7.5);
      expect(clamped.north).toBe(-10);
      expect(clamped.up).toBe(2);
    });

    test("negative up is clamped to zero", () => {
      const enu = { east: 0, north: 0, up: -5 };
      const clamped = clampToZone(enu, bounds);
      expect(clamped.up).toBe(0);
    });

    test("padding extends bounds", () => {
      const enu = { east: 9, north: 11, up: 1 };
      const clamped = clampToZone(enu, bounds, 2);
      expect(clamped.east).toBe(9);
      expect(clamped.north).toBe(11);
    });
  });
});
