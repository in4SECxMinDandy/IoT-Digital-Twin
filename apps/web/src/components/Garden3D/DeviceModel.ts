import * as THREE from "three";

import type { DeviceStatus } from "../../types";
import { GARDEN_COLORS, STATUS_COLORS } from "./scene-types";

/** Matches GREEN_BLINK_INTERVAL_MS in firmware/include/config.h. */
const GREEN_BLINK_INTERVAL_MS = 500;

const LED_ON_INTENSITY = 1.5;

export interface LedState {
  deviceStatus: DeviceStatus;
  alertLevel: "NORMAL" | "WARNING" | "CRITICAL";
  greenPattern: "OFF" | "SOLID" | "BLINK";
}

export interface DeviceShared {
  boardGeometry: THREE.BoxGeometry;
  shieldGeometry: THREE.BoxGeometry;
  portGeometry: THREE.BoxGeometry;
  pinRowGeometry: THREE.BoxGeometry;
  ledGeometry: THREE.CylinderGeometry;
  hitGeometry: THREE.BoxGeometry;
  boardMaterial: THREE.MeshStandardMaterial;
  shieldMaterial: THREE.MeshStandardMaterial;
  portMaterial: THREE.MeshStandardMaterial;
  pinMaterial: THREE.MeshStandardMaterial;
  hitMaterial: THREE.MeshBasicMaterial;
}

export interface DeviceModel {
  group: THREE.Group;
  hitTarget: THREE.Object3D;
  setLedState(state: LedState): void;
  tick(nowMs: number): void;
  dispose(): void;
}

export function createDeviceShared(): DeviceShared {
  return {
    boardGeometry: new THREE.BoxGeometry(0.16, 0.01, 0.085),
    shieldGeometry: new THREE.BoxGeometry(0.062, 0.014, 0.048),
    portGeometry: new THREE.BoxGeometry(0.016, 0.009, 0.022),
    pinRowGeometry: new THREE.BoxGeometry(0.13, 0.006, 0.008),
    ledGeometry: new THREE.CylinderGeometry(0.0055, 0.0055, 0.005, 12),
    hitGeometry: new THREE.BoxGeometry(0.19, 0.07, 0.12),
    boardMaterial: new THREE.MeshStandardMaterial({ color: GARDEN_COLORS.pcb, roughness: 0.55, metalness: 0.18 }),
    shieldMaterial: new THREE.MeshStandardMaterial({ color: GARDEN_COLORS.shield, roughness: 0.32, metalness: 0.88 }),
    portMaterial: new THREE.MeshStandardMaterial({ color: 0xa8aeb5, roughness: 0.4, metalness: 0.8 }),
    pinMaterial: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.45, metalness: 0.75 }),
    hitMaterial: new THREE.MeshBasicMaterial({ visible: false })
  };
}

export function disposeDeviceShared(shared: DeviceShared): void {
  shared.boardGeometry.dispose();
  shared.shieldGeometry.dispose();
  shared.portGeometry.dispose();
  shared.pinRowGeometry.dispose();
  shared.ledGeometry.dispose();
  shared.hitGeometry.dispose();
  shared.boardMaterial.dispose();
  shared.shieldMaterial.dispose();
  shared.portMaterial.dispose();
  shared.pinMaterial.dispose();
  shared.hitMaterial.dispose();
}

interface Led {
  material: THREE.MeshStandardMaterial;
  litColor: THREE.Color;
  offColor: THREE.Color;
  apply(on: boolean): void;
}

function createLed(colorHex: number, shared: DeviceShared): { mesh: THREE.Mesh; led: Led } {
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.1 });
  const litColor = new THREE.Color(colorHex);
  const offColor = new THREE.Color(colorHex).multiplyScalar(0.16);
  const mesh = new THREE.Mesh(shared.ledGeometry, material);
  mesh.castShadow = false;

  return {
    mesh,
    led: {
      material,
      litColor,
      offColor,
      apply(on: boolean) {
        material.color.copy(on ? litColor : offColor);
        material.emissive.copy(on ? litColor : offColor);
        material.emissiveIntensity = on ? LED_ON_INTENSITY : 0;
      }
    }
  };
}

/**
 * An ESP32-WROOM-32S board with its three status LEDs. LED behaviour mirrors
 * updateLedOutputs() in firmware/src/main.cpp: everything is dark while the board
 * is offline, green comes from the pattern the device actually reports, and
 * yellow/red follow the reported alert level independently.
 */
export function createDeviceModel(deviceId: string, shared: DeviceShared): DeviceModel {
  const group = new THREE.Group();
  group.name = `device:${deviceId}`;

  const board = new THREE.Mesh(shared.boardGeometry, shared.boardMaterial);
  board.position.y = 0.005;
  board.castShadow = true;
  board.receiveShadow = true;
  group.add(board);

  const shield = new THREE.Mesh(shared.shieldGeometry, shared.shieldMaterial);
  shield.position.set(-0.042, 0.017, 0);
  shield.castShadow = true;
  group.add(shield);

  const port = new THREE.Mesh(shared.portGeometry, shared.portMaterial);
  port.position.set(0.082, 0.014, 0);
  group.add(port);

  [-0.036, 0.036].forEach((offsetZ) => {
    const pinRow = new THREE.Mesh(shared.pinRowGeometry, shared.pinMaterial);
    pinRow.position.set(0.005, 0.002, offsetZ);
    group.add(pinRow);
  });

  const green = createLed(STATUS_COLORS.NORMAL, shared);
  const yellow = createLed(STATUS_COLORS.WARNING, shared);
  const red = createLed(STATUS_COLORS.CRITICAL, shared);
  [green, yellow, red].forEach(({ mesh }, index) => {
    mesh.position.set(0.048 - index * 0.017, 0.0125, -0.026);
    group.add(mesh);
  });

  const hitTarget = new THREE.Mesh(shared.hitGeometry, shared.hitMaterial);
  hitTarget.position.y = 0.03;
  hitTarget.userData.pick = { kind: "device", id: deviceId };
  group.add(hitTarget);

  let state: LedState = { deviceStatus: "OFFLINE", alertLevel: "NORMAL", greenPattern: "OFF" };
  let greenWantsBlink = false;
  const ownMaterials = [green.led.material, yellow.led.material, red.led.material];

  function applyLeds(greenOn: boolean): void {
    const online = state.deviceStatus === "ONLINE";
    green.led.apply(online && greenOn);
    yellow.led.apply(online && state.alertLevel === "WARNING");
    red.led.apply(online && state.alertLevel === "CRITICAL");
  }

  applyLeds(false);

  return {
    group,
    hitTarget,
    setLedState(next: LedState) {
      state = next;
      greenWantsBlink = next.greenPattern === "BLINK";
      applyLeds(greenWantsBlink ? true : next.greenPattern === "SOLID");
    },
    tick(nowMs: number) {
      if (!greenWantsBlink) return;
      applyLeds(Math.floor(nowMs / GREEN_BLINK_INTERVAL_MS) % 2 === 0);
    },
    dispose() {
      ownMaterials.forEach((material) => material.dispose());
    }
  };
}

export interface Cable {
  mesh: THREE.Mesh;
  route(start: THREE.Vector3, end: THREE.Vector3): void;
  dispose(): void;
}

/** Sensor lead from the board down to the soil probe, so the wiring reads visibly. */
export function createCable(): Cable {
  const material = new THREE.MeshStandardMaterial({ color: GARDEN_COLORS.cable, roughness: 0.8, metalness: 0.05 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.castShadow = true;

  return {
    mesh,
    route(start, end) {
      const mid = start.clone().lerp(end, 0.5);
      mid.y = Math.max(start.y, end.y) + start.distanceTo(end) * 0.22;
      const curve = new THREE.CatmullRomCurve3([start.clone(), mid, end.clone()]);
      mesh.geometry.dispose();
      mesh.geometry = new THREE.TubeGeometry(curve, 18, 0.0035, 5, false);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    }
  };
}
