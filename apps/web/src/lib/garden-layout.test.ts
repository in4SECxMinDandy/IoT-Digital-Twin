import { describe, expect, it } from "vitest";

import type { Asset, Device } from "../types";
import { DEFAULT_SOIL_THRESHOLDS, resolveGardenLayout } from "./garden-layout";

// Shape mirrors apps/api/src/services/seed-service.ts as it arrives over /api/assets.
const garden: Asset = {
  id: "garden-1",
  name: "Garden_01",
  type: "garden",
  parentAssetId: null,
  attributes: { location: "Student demo bench" }
};

const plant: Asset = {
  id: "plant-1",
  name: "Plant_01",
  type: "plant",
  parentAssetId: "garden-1",
  attributes: { warningMinPct: 40, normalMinPct: 60 }
};

const device: Device = {
  id: "device-1",
  deviceId: "esp32_01",
  name: "ESP32_01",
  type: "ESP32-WROOM-32S",
  assetId: "plant-1",
  attributes: { sensors: ["DHT11", "LM393"] },
  status: "OFFLINE",
  lastSeen: null,
  currentState: {
    mode: "AUTO",
    environment: "NORMAL",
    alertLevel: "NORMAL",
    irrigationSimulationActive: false,
    greenPattern: "OFF"
  }
};

describe("resolveGardenLayout", () => {
  it("resolves the seeded Garden_01 -> Plant_01 -> ESP32_01 hierarchy", () => {
    const layout = resolveGardenLayout([garden, plant], [device]);

    expect(layout?.gardenName).toBe("Garden_01");
    expect(layout?.plants).toHaveLength(1);
    expect(layout?.plants[0].plantName).toBe("Plant_01");
    expect(layout?.plants[0].deviceIds).toEqual(["esp32_01"]);
  });

  it("takes soil thresholds from the plant asset rather than hardcoding them", () => {
    const layout = resolveGardenLayout([garden, plant], [device]);
    expect(layout?.plants[0].thresholds).toEqual({ warningMinPct: 40, normalMinPct: 60 });
  });

  it("falls back to the backend default thresholds when a plant carries none", () => {
    const bare: Asset = { ...plant, attributes: {} };
    const layout = resolveGardenLayout([garden, bare], [device]);
    expect(layout?.plants[0].thresholds).toEqual(DEFAULT_SOIL_THRESHOLDS);
  });

  it("flags the layout as visualization-only while the backend reports no dimensions", () => {
    const layout = resolveGardenLayout([garden, plant], [device]);

    // The current API seeds neither dimensions nor positions, so the scene must
    // badge the layout instead of implying a measured plot.
    expect(layout?.dimensions).toBeNull();
    expect(layout?.visualizationOnly).toBe(true);
  });

  it("uses configured dimensions and positions when the backend supplies them", () => {
    const measuredGarden: Asset = { ...garden, attributes: { dimensions: { width: 3, length: 2, unit: "m" } } };
    const placedPlant: Asset = { ...plant, attributes: { ...plant.attributes, position: { x: 1.2, y: 0.8, z: 0 } } };

    const layout = resolveGardenLayout([measuredGarden, placedPlant], [device]);

    expect(layout?.dimensions).toEqual({ width: 3, length: 2, unit: "m" });
    expect(layout?.visualizationOnly).toBe(false);
    // Garden frame (x, y across the plot) maps onto the three.js ground plane (x, z).
    expect(layout?.plants[0].position).toEqual({ x: 1.2, y: 0, z: 0.8 });
    expect(layout?.bounds).toEqual({ minX: -1.5, maxX: 1.5, minZ: -1, maxZ: 1 });
  });

  it("ignores malformed dimensions instead of drawing a NaN-sized plot", () => {
    const broken: Asset = { ...garden, attributes: { dimensions: { width: "3", length: null } } };
    const layout = resolveGardenLayout([broken, plant], [device]);

    expect(layout?.dimensions).toBeNull();
    expect(layout?.visualizationOnly).toBe(true);
    expect(Number.isFinite(layout?.bounds.maxX ?? NaN)).toBe(true);
  });

  it("stays visualization-only when only some plants are placed", () => {
    const placed: Asset = { ...plant, attributes: { position: { x: 1, y: 1 } } };
    const unplaced: Asset = { ...plant, id: "plant-2", name: "Plant_02", attributes: {} };

    const layout = resolveGardenLayout([garden, placed, unplaced], [device]);

    expect(layout?.visualizationOnly).toBe(true);
    expect(layout?.plants.map((entry) => entry.plantName)).toEqual(["Plant_01", "Plant_02"]);
  });

  it("gives generated plants distinct, centred positions so Plant_N does not stack", () => {
    const plants: Asset[] = [1, 2, 3, 4].map((index) => ({
      ...plant,
      id: `plant-${index}`,
      name: `Plant_0${index}`,
      attributes: {}
    }));

    const layout = resolveGardenLayout([garden, ...plants], [device]);
    const positions = layout?.plants.map((entry) => `${entry.position.x},${entry.position.z}`) ?? [];

    expect(new Set(positions).size).toBe(4);
    expect(layout?.plants.every((entry) => Number.isFinite(entry.position.x))).toBe(true);
    // A 2x2 grid on 1 m cells centred on the origin.
    expect(layout?.bounds).toEqual({ minX: -1.5, maxX: 1.5, minZ: -1.5, maxZ: 1.5 });
  });

  it("returns null when the backend has no garden asset to draw", () => {
    expect(resolveGardenLayout([plant], [device])).toBeNull();
    expect(resolveGardenLayout([], [])).toBeNull();
  });
});
