import * as THREE from "three";

import type { GardenBounds } from "../../lib/garden-layout";
import { GARDEN_COLORS } from "./scene-types";

const BED_DEPTH_M = 0.12;

export interface Ground {
  group: THREE.Group;
  resize(bounds: GardenBounds): void;
  dispose(): void;
}

/**
 * The planting bed and the surface it sits on. Sized from the garden bounds, so a
 * bed drawn at 3 m x 2 m really is 3 m x 2 m in scene units (1 unit = 1 metre).
 */
export function createGround(bounds: GardenBounds): Ground {
  const group = new THREE.Group();
  group.name = "ground";

  const soilTop = new THREE.MeshStandardMaterial({
    color: GARDEN_COLORS.soilEdge,
    roughness: 0.96,
    metalness: 0
  });
  const soilSide = new THREE.MeshStandardMaterial({
    color: GARDEN_COLORS.soilEdge,
    roughness: 0.9,
    metalness: 0
  });
  const surroundMaterial = new THREE.MeshStandardMaterial({
    color: GARDEN_COLORS.ground,
    roughness: 0.95,
    metalness: 0
  });

  // BoxGeometry takes materials in +x, -x, +y, -y, +z, -z order.
  const bedMaterials = [soilSide, soilSide, soilTop, soilSide, soilSide, soilSide];
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bedMaterials);
  bed.name = "bed";
  bed.castShadow = true;
  bed.receiveShadow = true;
  bed.position.y = -BED_DEPTH_M / 2;
  group.add(bed);

  const surround = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), surroundMaterial);
  surround.name = "surround";
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -BED_DEPTH_M;
  surround.receiveShadow = true;
  group.add(surround);

  function resize(next: GardenBounds): void {
    const width = Math.max(0.2, next.maxX - next.minX);
    const length = Math.max(0.2, next.maxZ - next.minZ);
    const centreX = (next.minX + next.maxX) / 2;
    const centreZ = (next.minZ + next.maxZ) / 2;

    bed.geometry.dispose();
    bed.geometry = new THREE.BoxGeometry(width, BED_DEPTH_M, length);
    bed.position.set(centreX, -BED_DEPTH_M / 2, centreZ);

    const span = Math.max(width, length) * 6;
    surround.geometry.dispose();
    surround.geometry = new THREE.PlaneGeometry(span, span);
    surround.position.set(centreX, -BED_DEPTH_M, centreZ);
  }

  resize(bounds);

  return {
    group,
    resize,
    dispose() {
      bed.geometry.dispose();
      surround.geometry.dispose();
      soilTop.dispose();
      soilSide.dispose();
      surroundMaterial.dispose();
    }
  };
}
