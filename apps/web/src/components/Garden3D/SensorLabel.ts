import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import type { EnvironmentStatus } from "../../types";
import { PLANT_HEIGHT_M } from "./scene-types";

export interface SensorLabel {
  object: CSS2DObject;
  setValue(soilMoisturePct: number | null, environment: EnvironmentStatus): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * The soil-moisture readout floating beside its own plant. A live update writes
 * textContent on an existing DOM node — no texture re-bake, no scene rebuild.
 */
export function createSensorLabel(plantName: string): SensorLabel {
  const element = document.createElement("div");
  element.className = "g3d-label";

  const dot = document.createElement("span");
  dot.className = "g3d-label__dot";
  dot.dataset.status = "INVALID";

  const value = document.createElement("span");
  value.className = "g3d-label__value";
  value.textContent = "—";

  const name = document.createElement("span");
  name.className = "g3d-label__name";
  name.textContent = plantName;

  element.append(dot, value, name);

  const object = new CSS2DObject(element);
  object.position.set(0, PLANT_HEIGHT_M + 0.13, 0);
  // Anchor the bottom edge of the pill to the 3D point so it sits above the plant.
  object.center.set(0.5, 1);

  return {
    object,
    setValue(soilMoisturePct, environment) {
      const next =
        typeof soilMoisturePct === "number" && Number.isFinite(soilMoisturePct)
          ? `${soilMoisturePct.toFixed(1)}%`
          : "—";
      if (value.textContent !== next) value.textContent = next;
      if (dot.dataset.status !== environment) dot.dataset.status = environment;
    },
    setVisible(visible) {
      object.visible = visible;
      element.style.display = visible ? "" : "none";
    },
    dispose() {
      element.remove();
    }
  };
}
