import type { Asset, Device } from "../types";

/**
 * Mirrors SOIL_WARNING_MIN_PCT / SOIL_NORMAL_MIN_PCT in apps/api/.env, which the
 * backend feeds into classifySoilMoisture(). Used only for chart reference lines:
 * a plant's live status always comes from device.currentState.environment so the
 * UI can never disagree with the rule the backend already applied.
 */
export const DEFAULT_SOIL_THRESHOLDS: SoilThresholds = { warningMinPct: 40, normalMinPct: 60 };

export interface SoilThresholds {
  warningMinPct: number;
  normalMinPct: number;
}

export interface GardenDimensions {
  width: number;
  length: number;
  unit: "m";
}

export interface GardenPosition {
  x: number;
  y: number;
  z: number;
}

export interface PlantLayout {
  plantId: string;
  plantName: string;
  /** Garden-local metres. Never latitude/longitude — the hardware has no GPS. */
  position: GardenPosition;
  deviceIds: string[];
  thresholds: SoilThresholds;
}

export interface GardenBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GardenLayout {
  gardenId: string;
  gardenName: string;
  /** null when the backend carries no real dimensions for this garden. */
  dimensions: GardenDimensions | null;
  /**
   * true when plant positions were generated for display because the backend has
   * none. The scene must badge these layouts instead of implying a measured plot.
   */
  visualizationOnly: boolean;
  plants: PlantLayout[];
  bounds: GardenBounds;
}

/** Cell size, in garden-local metres, used when positions have to be generated. */
const LAYOUT_CELL_M = 1;

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readThresholds(attributes: Record<string, unknown>): SoilThresholds {
  const warningMinPct = toFiniteNumber(attributes.warningMinPct);
  const normalMinPct = toFiniteNumber(attributes.normalMinPct);
  return {
    warningMinPct: warningMinPct ?? DEFAULT_SOIL_THRESHOLDS.warningMinPct,
    normalMinPct: normalMinPct ?? DEFAULT_SOIL_THRESHOLDS.normalMinPct
  };
}

function readDimensions(attributes: Record<string, unknown>): GardenDimensions | null {
  const raw = attributes.dimensions;
  if (!isRecord(raw)) return null;
  const width = toFiniteNumber(raw.width);
  const length = toFiniteNumber(raw.length);
  if (width === null || length === null || width <= 0 || length <= 0) return null;
  return { width, length, unit: "m" };
}

/**
 * Configured positions use the garden's own frame: `x` and `y` are metres across
 * the plot and `z` is height above the soil (0 = sitting on the ground). That is
 * the shape the layout spec documents, so it is mapped onto three.js here, where
 * the ground plane is (x, z) and +y is up.
 */
function readPosition(attributes: Record<string, unknown>): GardenPosition | null {
  const raw = attributes.position;
  if (!isRecord(raw)) return null;
  const x = toFiniteNumber(raw.x);
  const depth = toFiniteNumber(raw.y);
  if (x === null || depth === null) return null;
  return { x, y: Math.max(0, toFiniteNumber(raw.z) ?? 0), z: depth };
}

/**
 * Generated stand-in positions for plants the backend has no coordinates for.
 * A centred grid on a 1 m cell — deliberately not a guess at the real spacing.
 */
function generatedPosition(index: number, count: number): GardenPosition {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: (column - (columns - 1) / 2) * LAYOUT_CELL_M,
    y: 0,
    z: (row - (rows - 1) / 2) * LAYOUT_CELL_M
  };
}

function boundsFor(plants: PlantLayout[], dimensions: GardenDimensions | null): GardenBounds {
  if (dimensions) {
    return {
      minX: -dimensions.width / 2,
      maxX: dimensions.width / 2,
      minZ: -dimensions.length / 2,
      maxZ: dimensions.length / 2
    };
  }
  const pad = LAYOUT_CELL_M;
  if (plants.length === 0) return { minX: -pad, maxX: pad, minZ: -pad, maxZ: pad };
  const tight = plants.reduce<GardenBounds>(
    (bounds, plant) => ({
      minX: Math.min(bounds.minX, plant.position.x),
      maxX: Math.max(bounds.maxX, plant.position.x),
      minZ: Math.min(bounds.minZ, plant.position.z),
      maxZ: Math.max(bounds.maxZ, plant.position.z)
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  );
  return {
    minX: tight.minX - pad,
    maxX: tight.maxX + pad,
    minZ: tight.minZ - pad,
    maxZ: tight.maxZ + pad
  };
}

function gardenOfPlant(assets: Asset[], plant: Asset): Asset | null {
  if (!plant.parentAssetId) return null;
  return assets.find((asset) => asset.id === plant.parentAssetId && asset.type === "garden") ?? null;
}

/**
 * Resolves the Garden -> Plant -> Device hierarchy the backend already seeds into
 * a layout the 3D scene can draw. Nothing here invents telemetry: values that are
 * not in the API come back null (dimensions) or flagged (visualizationOnly).
 */
export function resolveGardenLayout(
  assets: Asset[],
  devices: Device[],
  preferredGardenId?: string | null
): GardenLayout | null {
  const gardens = assets.filter((asset) => asset.type === "garden");
  if (gardens.length === 0) return null;

  const garden =
    gardens.find((asset) => asset.id === preferredGardenId) ??
    gardens.find((asset) =>
      devices.some((device) => {
        const plant = assets.find((candidate) => candidate.id === device.assetId);
        return plant ? gardenOfPlant(assets, plant)?.id === asset.id : false;
      })
    ) ??
    gardens[0];

  const plantAssets = assets
    .filter((asset) => asset.type === "plant" && asset.parentAssetId === garden.id)
    .sort((left, right) => left.name.localeCompare(right.name));

  const dimensions = readDimensions(garden.attributes);

  let generatedAny = false;
  const plants = plantAssets.map((plant, index): PlantLayout => {
    const configured = readPosition(plant.attributes);
    if (!configured) generatedAny = true;
    return {
      plantId: plant.id,
      plantName: plant.name,
      position: configured ?? generatedPosition(index, plantAssets.length),
      deviceIds: devices.filter((device) => device.assetId === plant.id).map((device) => device.deviceId),
      thresholds: readThresholds(plant.attributes)
    };
  });

  return {
    gardenId: garden.id,
    gardenName: garden.name,
    dimensions,
    // A real plot size with generated plant positions is still not a measured layout.
    visualizationOnly: generatedAny || dimensions === null,
    plants,
    bounds: boundsFor(plants, dimensions)
  };
}
