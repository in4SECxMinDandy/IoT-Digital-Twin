import type { DeviceMode, DeviceStatus, EnvironmentStatus } from "../../types";

/**
 * Palette for the 3D garden. Every value is either a material found on the real
 * bench (soil, foliage, FR4, a stamped metal RF shield) or one of the dashboard's
 * existing semantic status tokens — nothing here is a decorative accent.
 */
export const GARDEN_COLORS = {
  ground: 0xcfd3ca,
  soilEdge: 0x6b5138,
  soilDry: 0xb39272,
  soilWet: 0x3d2b1d,
  stem: 0x5a7f3c,
  leaf: 0x4e7d3a,
  leafLit: 0x6f9c46,
  pcb: 0x23272b,
  shield: 0xc8ccd1,
  cable: 0x2f3438,
  probeMetal: 0x9aa1a8
} as const;

/** Status colours reuse the dashboard's semantic tokens so 3D and cards agree. */
export const STATUS_COLORS: Record<EnvironmentStatus, number> = {
  NORMAL: 0x10b981,
  WARNING: 0xf59e0b,
  CRITICAL: 0xef4444,
  INVALID: 0x94a3b8
};

export const SELECT_COLOR = 0x1b4332;

/** Visualisation radius of the soil patch one LM393 probe reads. Not a measured value. */
export const SOIL_PATCH_RADIUS_M = 0.28;

export const PLANT_HEIGHT_M = 0.34;

export interface PlantVisualState {
  soilMoisturePct: number | null;
  temperatureC: number | null;
  airHumidityPct: number | null;
  environment: EnvironmentStatus;
  deviceStatus: DeviceStatus;
  mode: DeviceMode;
  irrigationSimulationActive: boolean;
  greenPattern: "OFF" | "SOLID" | "BLINK";
  updatedAt: string | null;
  selected: boolean;
}

export type GardenLayerKey = "plants" | "devices" | "sensorValues" | "soilVisualization";

export type GardenLayers = Record<GardenLayerKey, boolean>;

export const DEFAULT_LAYERS: GardenLayers = {
  plants: true,
  devices: true,
  sensorValues: true,
  soilVisualization: true
};

export type GardenViewMode = "perspective" | "top";

export type HoverTarget =
  | { kind: "plant" | "device" | "soil"; id: string; screenX: number; screenY: number }
  | null;
