import { Ruler } from "lucide-react";

import type { GardenDimensions } from "../../lib/garden-layout";
import type { EnvironmentStatus } from "../../types";

export interface PlantSummary {
  plantId: string;
  plantName: string;
  deviceId: string | null;
  deviceName: string | null;
  online: boolean;
  environment: EnvironmentStatus;
}

interface GardenStatusBarProps {
  gardenName: string;
  dimensions: GardenDimensions | null;
  visualizationOnly: boolean;
  plants: PlantSummary[];
  selectedPlantId: string | null;
  onSelectPlant(plantId: string): void;
}

const TONE: Record<EnvironmentStatus, string> = {
  NORMAL: "normal",
  WARNING: "warning",
  CRITICAL: "critical",
  INVALID: "invalid"
};

const LABEL: Record<EnvironmentStatus, string> = {
  NORMAL: "NORMAL",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
  INVALID: "KHÔNG RÕ"
};

/**
 * Bottom read-out for the garden. The plot size line only ever shows a real
 * configured dimension — when the backend has none it says the layout is
 * illustrative instead of printing an invented area.
 */
export function GardenStatusBar({
  gardenName,
  dimensions,
  visualizationOnly,
  plants,
  selectedPlantId,
  onSelectPlant
}: GardenStatusBarProps) {
  // Nothing is selected until the user picks a plant, so no chip claims to be active;
  // the device read-out still falls back to the first plant so the bar is never blank.
  const selected = selectedPlantId ? plants.find((plant) => plant.plantId === selectedPlantId) ?? null : null;
  const displayed = selected ?? plants[0] ?? null;

  return (
    <div className="g3d-statusbar">
      <div className="g3d-statusbar__group">
        <span className="g3d-statusbar__garden">{gardenName}</span>
        {dimensions ? (
          <span className="g3d-statusbar__size">
            <Ruler size={11} aria-hidden="true" />
            {dimensions.width} m × {dimensions.length} m
          </span>
        ) : (
          <span className="g3d-statusbar__size g3d-statusbar__size--unset">chưa có kích thước thật</span>
        )}
        {visualizationOnly && <span className="g3d-badge-illustrative">Bố trí minh hoạ</span>}
      </div>

      <div className="g3d-statusbar__group g3d-statusbar__group--plants">
        <span className="g3d-statusbar__label">Cây</span>
        <div className="g3d-chips" role="group" aria-label="Chọn cây">
          {plants.map((plant) => (
            <button
              key={plant.plantId}
              type="button"
              className={`g3d-chip ${plant.plantId === selected?.plantId ? "g3d-chip--active" : ""}`}
              onClick={() => onSelectPlant(plant.plantId)}
              aria-pressed={plant.plantId === selected?.plantId}
              title={`Xem ${plant.plantName}`}
            >
              <span className={`g3d-chip__dot g3d-chip__dot--${plant.online ? TONE[plant.environment] : "invalid"}`} />
              {plant.plantName}
            </button>
          ))}
        </div>
      </div>

      <div className="g3d-statusbar__group">
        <span className="g3d-statusbar__label">Thiết bị</span>
        <span className="g3d-statusbar__value">{displayed?.deviceName ?? displayed?.deviceId ?? "—"}</span>
        {displayed ? (
          <>
            <span className={`g3d-led ${displayed.online ? "g3d-led--online" : "g3d-led--offline"}`} aria-hidden="true" />
            <span className="g3d-statusbar__value">{displayed.online ? "ONLINE" : "OFFLINE"}</span>
            <span className="g3d-statusbar__label">Môi trường</span>
            <span className={`g3d-statusbar__value g3d-statusbar__value--${displayed.online ? TONE[displayed.environment] : "invalid"}`}>
              {displayed.online ? LABEL[displayed.environment] : "KHÔNG RÕ"}
            </span>
          </>
        ) : (
          <span className="g3d-statusbar__value">—</span>
        )}
      </div>
    </div>
  );
}
