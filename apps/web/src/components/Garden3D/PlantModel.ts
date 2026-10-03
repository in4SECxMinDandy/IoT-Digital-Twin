import * as THREE from "three";

import type { EnvironmentStatus } from "../../types";
import { GARDEN_COLORS, PLANT_HEIGHT_M, SELECT_COLOR, STATUS_COLORS } from "./scene-types";

/** Geometry and materials shared by every plant, so N plants cost one allocation. */
export interface PlantShared {
  stemGeometry: THREE.CylinderGeometry;
  leafGeometry: THREE.SphereGeometry;
  statusRingGeometry: THREE.RingGeometry;
  selectRingGeometry: THREE.RingGeometry;
  hitGeometry: THREE.CylinderGeometry;
  stemMaterial: THREE.MeshStandardMaterial;
  leafMaterials: THREE.MeshStandardMaterial[];
  hitMaterial: THREE.MeshBasicMaterial;
}

export interface PlantModel {
  group: THREE.Group;
  hitTarget: THREE.Object3D;
  setStatus(environment: EnvironmentStatus, selected: boolean): void;
  dispose(): void;
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic xorshift so a plant keeps its shape across telemetry updates. */
function seededRandom(seed: number): () => number {
  let state = seed === 0 ? 0x9e3779b9 : seed;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

const LEAF_COUNT = 12;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function createPlantShared(): PlantShared {
  return {
    stemGeometry: new THREE.CylinderGeometry(0.012, 0.022, PLANT_HEIGHT_M, 8),
    leafGeometry: new THREE.SphereGeometry(1, 14, 10),
    statusRingGeometry: new THREE.RingGeometry(0.155, 0.19, 48),
    selectRingGeometry: new THREE.RingGeometry(0.2, 0.212, 48),
    hitGeometry: new THREE.CylinderGeometry(0.15, 0.15, PLANT_HEIGHT_M + 0.06, 8),
    stemMaterial: new THREE.MeshStandardMaterial({
      color: GARDEN_COLORS.stem,
      roughness: 0.75,
      metalness: 0,
      emissive: GARDEN_COLORS.stem,
      emissiveIntensity: 0.08
    }),
    leafMaterials: [GARDEN_COLORS.leaf, GARDEN_COLORS.leafLit].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0,
          flatShading: false,
          emissive: color,
          emissiveIntensity: 0.12
        })
    ),
    // material.visible = false keeps the mesh out of the render pass while still
    // raycastable, which object.visible = false would not guarantee.
    hitMaterial: new THREE.MeshBasicMaterial({ visible: false })
  };
}

export function disposePlantShared(shared: PlantShared): void {
  shared.stemGeometry.dispose();
  shared.leafGeometry.dispose();
  shared.statusRingGeometry.dispose();
  shared.selectRingGeometry.dispose();
  shared.hitGeometry.dispose();
  shared.stemMaterial.dispose();
  shared.leafMaterials.forEach((material) => material.dispose());
  shared.hitMaterial.dispose();
}

/**
 * A procedural plant stand-in. There is no scanned model of the real plant, so
 * the shape is illustrative and the card says so — it is never presented as the
 * actual species or size of what is growing.
 */
export function createPlantModel(plantId: string, shared: PlantShared): PlantModel {
  const group = new THREE.Group();
  group.name = `plant:${plantId}`;

  const random = seededRandom(hashText(plantId));

  // Enhanced stem with natural taper and slight curve
  const stem = new THREE.Mesh(shared.stemGeometry, shared.stemMaterial);
  stem.position.y = PLANT_HEIGHT_M / 2;
  const stemCurve = (random() - 0.5) * 0.15;
  stem.rotation.set(
    (random() - 0.5) * 0.08,  // slight forward/back tilt
    random() * Math.PI * 2,    // random rotation
    stemCurve                  // side curve
  );
  stem.castShadow = true;
  stem.receiveShadow = true;
  group.add(stem);

  const ownMaterials: THREE.Material[] = [];

  for (let index = 0; index < LEAF_COUNT; index += 1) {
    const t = index / (LEAF_COUNT - 1);
    const angle = index * GOLDEN_ANGLE + random() * 0.6;
    const reach = 0.06 + t * 0.095 + random() * 0.025;
    const leaf = new THREE.Mesh(shared.leafGeometry, shared.leafMaterials[index % shared.leafMaterials.length]);

    // Enhanced leaf shape: more natural blade proportions
    const leafScale = 0.09 + random() * 0.025;
    leaf.scale.set(
      leafScale,           // length
      0.012,               // thickness
      leafScale * 0.42     // width
    );

    const heightPos = PLANT_HEIGHT_M * (0.38 + t * 0.58);
    leaf.position.set(
      Math.cos(angle) * reach,
      heightPos,
      Math.sin(angle) * reach
    );

    // Natural leaf orientation
    const tilt = 0.35 + random() * 0.6;
    leaf.rotation.set(
      (random() - 0.5) * 0.3,  // slight x variation
      -angle,                   // face outward
      tilt                      // upward angle
    );

    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
  }

  const statusRingMaterial = new THREE.MeshBasicMaterial({
    color: STATUS_COLORS.NORMAL,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  ownMaterials.push(statusRingMaterial);

  const statusRing = new THREE.Mesh(shared.statusRingGeometry, statusRingMaterial);
  statusRing.rotation.x = -Math.PI / 2;
  statusRing.position.y = 0.004;
  group.add(statusRing);

  const selectRingMaterial = new THREE.MeshBasicMaterial({
    color: SELECT_COLOR,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  ownMaterials.push(selectRingMaterial);

  const selectRing = new THREE.Mesh(shared.selectRingGeometry, selectRingMaterial);
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.position.y = 0.005;
  selectRing.visible = false;
  group.add(selectRing);

  const hitTarget = new THREE.Mesh(shared.hitGeometry, shared.hitMaterial);
  hitTarget.position.y = (PLANT_HEIGHT_M + 0.06) / 2;
  hitTarget.userData.pick = { kind: "plant", id: plantId };
  group.add(hitTarget);

  return {
    group,
    hitTarget,
    setStatus(environment, selected) {
      statusRingMaterial.color.setHex(STATUS_COLORS[environment] ?? STATUS_COLORS.INVALID);
      // An offline device has no fresh reading, so its ring goes neutral rather
      // than holding the last colour it happened to have.
      statusRingMaterial.opacity = environment === "INVALID" ? 0.4 : 0.92;
      selectRing.visible = selected;
    },
    dispose() {
      ownMaterials.forEach((material) => material.dispose());
    }
  };
}
