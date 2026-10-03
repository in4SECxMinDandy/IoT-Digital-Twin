import * as THREE from "three";

import { GARDEN_COLORS, SOIL_PATCH_RADIUS_M } from "./scene-types";

export interface SoilSensorIndicator {
  group: THREE.Group;
  hitTarget: THREE.Object3D;
  probe: THREE.Object3D;
  setMoisture(soilMoisturePct: number | null): void;
  dispose(): void;
}

const DRY = new THREE.Color(GARDEN_COLORS.soilDry);
const WET = new THREE.Color(GARDEN_COLORS.soilWet);
const NO_READING = new THREE.Color(0x9a9187);

const PROBE_BOARD_COLOR = 0x2b4c6f;

function circlePoints(radius: number, segments = 64): THREE.BufferGeometry {
  const points: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
}

/**
 * The patch of soil one LM393 probe actually reads. Darker means wetter, driven
 * straight by soilMoisturePct. The dashed footprint marks the extent of that one
 * probe — deliberately not the whole bed, because the bench has a single sensor.
 */
export function createSoilSensorIndicator(plantId: string): SoilSensorIndicator {
  const group = new THREE.Group();
  group.name = `soil:${plantId}`;

  const patchMaterial = new THREE.MeshStandardMaterial({
    color: NO_READING.clone(),
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.55
  });
  const patch = new THREE.Mesh(new THREE.CircleGeometry(SOIL_PATCH_RADIUS_M, 48), patchMaterial);
  patch.rotation.x = -Math.PI / 2;
  patch.position.y = 0.002;
  patch.receiveShadow = true;
  group.add(patch);

  const footprintMaterial = new THREE.LineDashedMaterial({
    color: 0xf8fafc,
    dashSize: 0.028,
    gapSize: 0.02,
    transparent: true,
    opacity: 0.55
  });
  const footprintGeometry = circlePoints(SOIL_PATCH_RADIUS_M);
  const footprint = new THREE.Line(footprintGeometry, footprintMaterial);
  footprint.computeLineDistances();
  footprint.position.y = 0.006;
  group.add(footprint);

  // The probe itself: a small board with two exposed contacts, pushed into the soil.
  const probe = new THREE.Group();
  const boardMaterial = new THREE.MeshStandardMaterial({ color: PROBE_BOARD_COLOR, roughness: 0.6, metalness: 0.1 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.078, 0.004), boardMaterial);
  board.position.y = 0.012;
  board.castShadow = true;
  probe.add(board);

  const contactMaterial = new THREE.MeshStandardMaterial({
    color: GARDEN_COLORS.probeMetal,
    roughness: 0.35,
    metalness: 0.85
  });
  const contactGeometry = new THREE.BoxGeometry(0.007, 0.05, 0.0015);
  [-0.009, 0.009].forEach((offsetX) => {
    const contact = new THREE.Mesh(contactGeometry, contactMaterial);
    contact.position.set(offsetX, -0.004, 0.0026);
    probe.add(contact);
  });
  probe.position.set(0.1, 0, 0.06);
  probe.rotation.y = -0.5;
  group.add(probe);

  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hitTarget = new THREE.Mesh(new THREE.CylinderGeometry(SOIL_PATCH_RADIUS_M, SOIL_PATCH_RADIUS_M, 0.06, 20), hitMaterial);
  hitTarget.position.y = 0.03;
  hitTarget.userData.pick = { kind: "soil", id: plantId };
  group.add(hitTarget);

  return {
    group,
    hitTarget,
    probe,
    setMoisture(soilMoisturePct) {
      if (typeof soilMoisturePct !== "number" || !Number.isFinite(soilMoisturePct)) {
        // No reading is its own state: pale and washed out, not a plausible brown.
        patchMaterial.color.copy(NO_READING);
        patchMaterial.roughness = 1;
        patchMaterial.opacity = 0.4;
        return;
      }
      const wetness = THREE.MathUtils.clamp(soilMoisturePct / 100, 0, 1);
      patchMaterial.color.copy(DRY).lerp(WET, wetness);
      patchMaterial.roughness = 1 - 0.35 * wetness;
      patchMaterial.opacity = 0.82 + 0.14 * wetness;
    },
    dispose() {
      patch.geometry.dispose();
      patchMaterial.dispose();
      footprintGeometry.dispose();
      footprintMaterial.dispose();
      board.geometry.dispose();
      boardMaterial.dispose();
      contactGeometry.dispose();
      contactMaterial.dispose();
      hitTarget.geometry.dispose();
      hitMaterial.dispose();
    }
  };
}
