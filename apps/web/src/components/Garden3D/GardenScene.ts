import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

import type { GardenLayout, PlantLayout } from "../../lib/garden-layout";
import { createCable, createDeviceModel, createDeviceShared, disposeDeviceShared, type Cable, type DeviceModel, type DeviceShared, type LedState } from "./DeviceModel";
import { createGround, type Ground } from "./Ground";
import { createPlantModel, createPlantShared, disposePlantShared, type PlantModel, type PlantShared } from "./PlantModel";
import { createSensorLabel, type SensorLabel } from "./SensorLabel";
import { createSoilSensorIndicator, type SoilSensorIndicator } from "./SoilSensorIndicator";
import {
  DEFAULT_LAYERS,
  PLANT_HEIGHT_M,
  SOIL_PATCH_RADIUS_M,
  type GardenLayers,
  type GardenViewMode,
  type HoverTarget,
  type PlantVisualState
} from "./scene-types";

export interface GardenSceneCallbacks {
  onSelectPlant(plantId: string): void;
  onSelectDevice(deviceId: string): void;
  onHover(target: HoverTarget): void;
}

interface PlantNode {
  layout: PlantLayout;
  model: PlantModel;
  soil: SoilSensorIndicator;
  label: SensorLabel;
}

interface DeviceNode {
  plantId: string;
  model: DeviceModel;
  cable: Cable;
}

/** Camera pitch for the default and HOME views. The brief asks for 40-55 degrees. */
const HOME_PITCH_DEG = 48;
const HOME_AZIMUTH_DEG = 34;
const CAMERA_TWEEN_MS = 900;
const CLICK_DRAG_TOLERANCE_PX = 5;
const TARGET_CLAMP_PAD_M = 0.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Owns the WebGL scene for one garden. Rebuilding geometry happens only when the
 * set of plants or devices changes; a telemetry update mutates a colour, an LED
 * or a label's textContent, so the scene is never torn down while data streams in.
 */
export class GardenScene {
  private readonly container: HTMLElement;
  private readonly callbacks: GardenSceneCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly sun: THREE.DirectionalLight;

  private readonly plantShared: PlantShared = createPlantShared();
  private readonly deviceShared: DeviceShared = createDeviceShared();
  private readonly plantNodes = new Map<string, PlantNode>();
  private readonly deviceNodes = new Map<string, DeviceNode>();
  private readonly plantStates = new Map<string, PlantVisualState>();
  private readonly labels = new THREE.Group();
  private readonly pickables: THREE.Object3D[] = [];

  private ground: Ground;
  private layout: GardenLayout;
  private layers: GardenLayers = { ...DEFAULT_LAYERS };
  private viewMode: GardenViewMode = "perspective";
  private selectedPlantId: string | null = null;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerInside = false;
  private hoverDirty = false;
  private hovered: HoverTarget = null;
  private hoverScreen = { x: 0, y: 0 };
  private pressX = 0;
  private pressY = 0;

  private tween: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null = null;
  private readonly reducedMotion: boolean;
  private raf = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, layout: GardenLayout, callbacks: GardenSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.layout = layout;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const { width, height } = this.measure();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in three r186; PCF plus a larger map is the soft option.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.inset = "0";
    this.labelRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(this.labelRenderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xf4f7f5, 0x8d9180, 1.05));
    this.sun = new THREE.DirectionalLight(0xfff5e6, 2.35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const fill = new THREE.DirectionalLight(0xdfe9f2, 0.5);
    fill.position.set(-3, 2.4, -2.6);
    this.scene.add(fill);

    this.camera = new THREE.PerspectiveCamera(45, width / Math.max(1, height), 0.05, 200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.screenSpacePanning = false;
    this.controls.minPolarAngle = 0.04;
    // Stop just above the horizon so the camera can never drop under the soil.
    this.controls.maxPolarAngle = Math.PI * 0.495;

    this.ground = createGround(layout.bounds);
    this.scene.add(this.ground.group);
    this.scene.add(this.labels);

    this.applyLayout(layout);
    this.frameShadowCamera();
    this.jumpTo(this.homePose());

    this.bindPointerEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    window.addEventListener("resize", this.handleResize);

    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------------------------------------------------------- layout

  setLayout(layout: GardenLayout): void {
    if (this.disposed) return;
    this.layout = layout;
    this.applyLayout(layout);
    this.frameShadowCamera();
  }

  private applyLayout(layout: GardenLayout): void {
    this.ground.resize(layout.bounds);

    const nextPlantIds = new Set(layout.plants.map((plant) => plant.plantId));
    for (const [plantId, node] of [...this.plantNodes]) {
      if (nextPlantIds.has(plantId)) continue;
      this.removePlantNode(plantId, node);
    }

    for (const plant of layout.plants) {
      const existing = this.plantNodes.get(plant.plantId);
      const node = existing ?? this.createPlantNode(plant);
      node.layout = plant;
      node.model.group.position.set(plant.position.x, plant.position.y, plant.position.z);
      node.soil.group.position.set(plant.position.x, plant.position.y, plant.position.z);
      node.label.object.position.set(plant.position.x, plant.position.y + PLANT_HEIGHT_M + 0.13, plant.position.z);
      this.plantNodes.set(plant.plantId, node);
      node.model.setStatus(this.statusFor(plant.plantId), plant.plantId === this.selectedPlantId);
    }

    this.reconcileDevices(layout);
    this.applyLayerVisibility();
    this.updateControlLimits();
  }

  private createPlantNode(layout: PlantLayout): PlantNode {
    const model = createPlantModel(layout.plantId, this.plantShared);
    const soil = createSoilSensorIndicator(layout.plantId);
    const label = createSensorLabel(layout.plantName);

    this.scene.add(model.group);
    this.scene.add(soil.group);
    this.labels.add(label.object);
    this.pickables.push(model.hitTarget, soil.hitTarget);

    return { layout, model, soil, label };
  }

  private removePlantNode(plantId: string, node: PlantNode): void {
    for (const [deviceId, deviceNode] of [...this.deviceNodes]) {
      if (deviceNode.plantId !== plantId) continue;
      this.removeDeviceNode(deviceId, deviceNode);
    }
    this.dropPickable(node.model.hitTarget);
    this.dropPickable(node.soil.hitTarget);
    this.scene.remove(node.model.group);
    this.scene.remove(node.soil.group);
    this.labels.remove(node.label.object);
    node.model.dispose();
    node.soil.dispose();
    node.label.dispose();
    this.plantNodes.delete(plantId);
    this.plantStates.delete(plantId);
    if (this.selectedPlantId === plantId) this.selectedPlantId = null;
  }

  private reconcileDevices(layout: GardenLayout): void {
    const wanted = new Map<string, { plantId: string; index: number; count: number }>();
    for (const plant of layout.plants) {
      plant.deviceIds.forEach((deviceId, index) => {
        wanted.set(deviceId, { plantId: plant.plantId, index, count: plant.deviceIds.length });
      });
    }

    for (const [deviceId, node] of [...this.deviceNodes]) {
      if (wanted.has(deviceId)) continue;
      this.removeDeviceNode(deviceId, node);
    }

    for (const [deviceId, placement] of wanted) {
      const plant = this.plantNodes.get(placement.plantId);
      if (!plant) continue;

      let node = this.deviceNodes.get(deviceId);
      if (!node) {
        node = { plantId: placement.plantId, model: createDeviceModel(deviceId, this.deviceShared), cable: createCable() };
        this.scene.add(node.model.group);
        this.scene.add(node.cable.mesh);
        this.pickables.push(node.model.hitTarget);
        this.deviceNodes.set(deviceId, node);
      }
      node.plantId = placement.plantId;

      // The board sits beside the plant, clear of the probe it is wired to.
      const offsetZ = 0.17 + placement.index * 0.11;
      node.model.group.position.set(plant.layout.position.x + 0.26, plant.layout.position.y, plant.layout.position.z + offsetZ);
      node.model.group.rotation.y = -0.4 + placement.index * 0.25;

      const probeWorld = plant.soil.probe.getWorldPosition(new THREE.Vector3());
      node.cable.route(
        new THREE.Vector3(node.model.group.position.x - 0.06, node.model.group.position.y + 0.012, node.model.group.position.z),
        new THREE.Vector3(probeWorld.x, probeWorld.y + 0.045, probeWorld.z)
      );
    }
  }

  private removeDeviceNode(deviceId: string, node: DeviceNode): void {
    this.dropPickable(node.model.hitTarget);
    this.scene.remove(node.model.group);
    this.scene.remove(node.cable.mesh);
    node.model.dispose();
    node.cable.dispose();
    this.deviceNodes.delete(deviceId);
  }

  private dropPickable(target: THREE.Object3D): void {
    const index = this.pickables.indexOf(target);
    if (index !== -1) this.pickables.splice(index, 1);
  }

  // -------------------------------------------------------------- updates

  /** Cheap per-plant refresh: colours, LEDs and label text. No geometry touched. */
  updatePlant(plantId: string, state: PlantVisualState): void {
    if (this.disposed) return;
    this.plantStates.set(plantId, state);

    const node = this.plantNodes.get(plantId);
    if (!node) return;

    const offline = state.deviceStatus !== "ONLINE";
    node.model.setStatus(this.ringStatus(state), plantId === this.selectedPlantId);
    // An offline board still has a real last reading. Keep showing it and let the
    // neutral ring carry the staleness, rather than hiding data the API has.
    node.soil.setMoisture(state.soilMoisturePct);
    node.label.setValue(state.soilMoisturePct, this.ringStatus(state));

    for (const deviceNode of this.deviceNodes.values()) {
      if (deviceNode.plantId !== plantId) continue;
      deviceNode.model.setLedState({
        deviceStatus: state.deviceStatus,
        alertLevel: state.environment === "INVALID" ? "NORMAL" : state.environment,
        greenPattern: offline ? "OFF" : state.greenPattern
      });
    }
  }

  /** An offline device has no fresh reading, so its ring goes neutral rather than
   *  holding the last colour it happened to have. */
  private ringStatus(state: PlantVisualState): PlantVisualState["environment"] {
    return state.deviceStatus === "ONLINE" ? state.environment : "INVALID";
  }

  setSelectedPlant(plantId: string | null): void {
    if (this.disposed) return;
    this.selectedPlantId = plantId;
    for (const [id, node] of this.plantNodes) {
      node.model.setStatus(this.statusFor(id), id === plantId);
    }
  }

  private statusFor(plantId: string): PlantVisualState["environment"] {
    const state = this.plantStates.get(plantId);
    return state ? this.ringStatus(state) : "INVALID";
  }

  setLayers(layers: GardenLayers): void {
    if (this.disposed) return;
    this.layers = { ...layers };
    this.applyLayerVisibility();
  }

  private applyLayerVisibility(): void {
    for (const node of this.plantNodes.values()) {
      node.model.group.visible = this.layers.plants;
      node.soil.group.visible = this.layers.soilVisualization;
      node.label.setVisible(this.layers.sensorValues && this.layers.plants);
    }
    for (const node of this.deviceNodes.values()) {
      node.model.group.visible = this.layers.devices;
      node.cable.mesh.visible = this.layers.devices && this.layers.soilVisualization;
    }
    this.labels.visible = this.layers.sensorValues;
  }

  // --------------------------------------------------------------- camera

  setViewMode(mode: GardenViewMode): void {
    if (this.disposed) return;
    this.viewMode = mode;
    this.flyTo(this.homePose());
  }

  resetView(): void {
    if (this.disposed) return;
    this.viewMode = "perspective";
    this.selectedPlantId = null;
    for (const [id, node] of this.plantNodes) node.model.setStatus(this.statusFor(id), false);
    this.flyTo(this.homePose());
  }

  zoomBy(factor: number): void {
    if (this.disposed) return;
    this.tween = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(length);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** Gentle move toward one plant, keeping the rest of the bed in frame. */
  focusPlant(plantId: string): void {
    if (this.disposed) return;
    const node = this.plantNodes.get(plantId);
    if (!node) return;

    const target = new THREE.Vector3(node.layout.position.x, node.layout.position.y + PLANT_HEIGHT_M * 0.45, node.layout.position.z);
    const current = this.camera.position.distanceTo(this.controls.target);
    const distance = clamp(current * 0.55, this.controls.minDistance * 1.15, 2.1);

    const offset = this.camera.position.clone().sub(this.controls.target);
    const azimuth = Math.atan2(offset.x, offset.z);
    const pitch = THREE.MathUtils.degToRad(44);

    this.flyTo({
      target,
      position: new THREE.Vector3(
        target.x + distance * Math.cos(pitch) * Math.sin(azimuth),
        target.y + distance * Math.sin(pitch),
        target.z + distance * Math.cos(pitch) * Math.cos(azimuth)
      )
    });
  }

  private fitDistance(): number {
    const { bounds } = this.layout;
    const halfSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2;
    // Enclose the bed plus the height of what grows on it.
    const radius = Math.max(halfSpan, PLANT_HEIGHT_M + SOIL_PATCH_RADIUS_M) * 1.3;
    const fovRadians = THREE.MathUtils.degToRad(this.camera.fov);
    const vertical = radius / Math.sin(fovRadians / 2);
    const horizontal = radius / Math.sin((fovRadians * Math.max(0.4, this.camera.aspect)) / 2);
    return Math.max(vertical, horizontal) * 1.05;
  }

  private homePose(): { target: THREE.Vector3; position: THREE.Vector3 } {
    const { bounds } = this.layout;
    const target = new THREE.Vector3(
      (bounds.minX + bounds.maxX) / 2,
      PLANT_HEIGHT_M * 0.35,
      (bounds.minZ + bounds.maxZ) / 2
    );
    const distance = this.fitDistance();
    const pitch = THREE.MathUtils.degToRad(this.viewMode === "top" ? 89 : HOME_PITCH_DEG);
    const azimuth = THREE.MathUtils.degToRad(this.viewMode === "top" ? 0 : HOME_AZIMUTH_DEG);
    return {
      target,
      position: new THREE.Vector3(
        target.x + distance * Math.cos(pitch) * Math.sin(azimuth),
        target.y + distance * Math.sin(pitch),
        // A hair off the vertical axis keeps OrbitControls from gimbal-locking in TOP view.
        target.z + distance * Math.cos(pitch) * Math.cos(azimuth) + (this.viewMode === "top" ? distance * 0.001 : 0)
      )
    };
  }

  private flyTo(pose: { target: THREE.Vector3; position: THREE.Vector3 }): void {
    if (this.disposed) return;
    if (this.reducedMotion) {
      this.jumpTo(pose);
      return;
    }
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: pose.position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: pose.target.clone(),
      start: performance.now(),
      duration: CAMERA_TWEEN_MS
    };
  }

  private jumpTo(pose: { target: THREE.Vector3; position: THREE.Vector3 }): void {
    this.tween = null;
    this.controls.target.copy(pose.target);
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.updateControlLimits();
    this.controls.update();
  }

  private updateControlLimits(): void {
    const { bounds } = this.layout;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    this.controls.minDistance = Math.max(0.45, span * 0.18);
    this.controls.maxDistance = Math.max(3, span * 3.4);
  }

  private clampTarget(): void {
    const { bounds } = this.layout;
    const target = this.controls.target;
    target.x = clamp(target.x, bounds.minX - TARGET_CLAMP_PAD_M, bounds.maxX + TARGET_CLAMP_PAD_M);
    target.z = clamp(target.z, bounds.minZ - TARGET_CLAMP_PAD_M, bounds.maxZ + TARGET_CLAMP_PAD_M);
    target.y = clamp(target.y, 0, PLANT_HEIGHT_M * 3);
  }

  private frameShadowCamera(): void {
    const { bounds } = this.layout;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 1.6 + 1;
    const centreX = (bounds.minX + bounds.maxX) / 2;
    const centreZ = (bounds.minZ + bounds.maxZ) / 2;

    this.sun.position.set(centreX + span * 0.62, span * 1.1, centreZ + span * 0.48);
    this.sun.target.position.set(centreX, 0, centreZ);
    this.sun.target.updateMatrixWorld();

    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -span;
    shadowCamera.right = span;
    shadowCamera.top = span;
    shadowCamera.bottom = -span;
    shadowCamera.near = 0.1;
    shadowCamera.far = span * 4;
    shadowCamera.updateProjectionMatrix();
  }

  // -------------------------------------------------------------- picking

  private bindPointerEvents(): void {
    const element = this.renderer.domElement;
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerleave", this.onPointerLeave);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pressX = event.clientX;
    this.pressY = event.clientY;
    // A touch tap fires no pointermove first, so the pick ray has to be set here too.
    this.trackPointer(event);
  };

  private trackPointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.hoverScreen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.trackPointer(event);
    this.pointerInside = true;
    this.hoverDirty = true;
  };

  private onPointerLeave = (): void => {
    this.pointerInside = false;
    this.setHover(null);
  };

  private onPointerUp = (event: PointerEvent): void => {
    const dragged = Math.hypot(event.clientX - this.pressX, event.clientY - this.pressY);
    if (dragged > CLICK_DRAG_TOLERANCE_PX) return;

    this.trackPointer(event);
    const hit = this.pick();
    if (!hit) return;
    if (hit.kind === "plant") this.callbacks.onSelectPlant(hit.id);
    else if (hit.kind === "device") this.callbacks.onSelectDevice(hit.id);
    else this.callbacks.onSelectPlant(hit.id);
  };

  private pick(): { kind: "plant" | "device" | "soil"; id: string } | null {
    const visible = this.pickables.filter((target) => this.isPickableVisible(target));
    if (visible.length === 0) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(visible, false);
    const pick = hits[0]?.object.userData.pick as { kind: "plant" | "device" | "soil"; id: string } | undefined;
    return pick ?? null;
  }

  private isPickableVisible(target: THREE.Object3D): boolean {
    const pick = target.userData.pick as { kind: string } | undefined;
    if (pick?.kind === "plant") return this.layers.plants;
    if (pick?.kind === "device") return this.layers.devices;
    return this.layers.soilVisualization;
  }

  private updateHover(): void {
    if (!this.pointerInside) {
      this.setHover(null);
      return;
    }
    const hit = this.pick();
    if (!hit) {
      this.setHover(null);
      return;
    }
    this.setHover({ kind: hit.kind, id: hit.id, screenX: this.hoverScreen.x, screenY: this.hoverScreen.y });
  }

  private setHover(next: HoverTarget): void {
    const changed = JSON.stringify(next) !== JSON.stringify(this.hovered);
    this.hovered = next;
    this.renderer.domElement.style.cursor = next ? "pointer" : "";
    if (changed) this.callbacks.onHover(next);
  }

  // ---------------------------------------------------------------- frame

  private handleResize = (): void => {
    if (this.disposed) return;
    const { width, height } = this.measure();
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  };

  private measure(): { width: number; height: number } {
    return { width: this.container.clientWidth || 1, height: this.container.clientHeight || 1 };
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    // A backgrounded tab has no reason to keep drawing a WebGL frame.
    if (document.hidden) return;

    const now = performance.now();
    if (this.tween) {
      const progress = clamp((now - this.tween.start) / this.tween.duration, 0, 1);
      const eased = easeInOutCubic(progress);
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      if (progress >= 1) this.tween = null;
    }

    this.controls.update();
    this.clampTarget();

    for (const node of this.deviceNodes.values()) node.model.tick(now);
    if (this.hoverDirty) {
      this.hoverDirty = false;
      this.updateHover();
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  // -------------------------------------------------------------- teardown

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.handleResize);

    const element = this.renderer.domElement;
    element.removeEventListener("pointerdown", this.onPointerDown);
    element.removeEventListener("pointerup", this.onPointerUp);
    element.removeEventListener("pointermove", this.onPointerMove);
    element.removeEventListener("pointerleave", this.onPointerLeave);

    for (const node of this.plantNodes.values()) {
      node.model.dispose();
      node.soil.dispose();
      node.label.dispose();
    }
    for (const node of this.deviceNodes.values()) {
      node.model.dispose();
      node.cable.dispose();
    }
    this.plantNodes.clear();
    this.deviceNodes.clear();
    this.pickables.length = 0;

    this.ground.dispose();
    disposePlantShared(this.plantShared);
    disposeDeviceShared(this.deviceShared);
    this.controls.dispose();
    this.renderer.dispose();

    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
