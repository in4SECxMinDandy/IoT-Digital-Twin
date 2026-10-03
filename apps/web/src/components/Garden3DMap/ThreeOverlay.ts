/**
 * Three.js custom layer for MapLibre: renders ESP32_01 pin overlay.
 * Synchronized with MapLibre camera and projection matrix.
 */

import * as THREE from "three";
import type { Device } from "../../types";
import type { SoilThresholds } from "../../lib/garden-layout";
import { classifySoilStatus, SOIL_STATUS_COLORS, type SoilStatus } from "../../lib/gis/soil-status";
import { enuToWgs84, wgs84ToEnu, type ENU, type SiteConfig } from "../../lib/gis/coordinates";

interface PinMesh {
  group: THREE.Group;
  cylinder: THREE.Mesh;
  top: THREE.Mesh;
  pulseRing: THREE.Mesh | null;
  material: THREE.MeshStandardMaterial;
  topMaterial: THREE.MeshStandardMaterial;
  ringMaterial: THREE.MeshBasicMaterial | null;
}

export interface ThreeOverlayCallbacks {
  onPinHover: (hovered: boolean, screenX: number, screenY: number) => void;
  onPinClick: () => void;
}

/**
 * Three.js overlay that renders ESP32_01 sensor pin on MapLibre map.
 */
export class ThreeOverlay {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private pinMesh: PinMesh | null = null;
  private currentStatus: SoilStatus = "OFFLINE";
  private irrigationActive = false;
  private pulsePhase = 0;

  private mapCenter: [number, number];
  private siteConfig: SiteConfig;
  private espOffset: ENU;
  private callbacks: ThreeOverlayCallbacks;
  private containerWidth = 0;
  private containerHeight = 0;

  constructor(
    mapCenter: [number, number],
    siteConfig: SiteConfig,
    espOffset: ENU,
    callbacks: ThreeOverlayCallbacks
  ) {
    this.mapCenter = mapCenter;
    this.siteConfig = siteConfig;
    this.espOffset = espOffset;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);

    // Renderer will be assigned by MapLibre's render callback
    this.renderer = null as unknown as THREE.WebGLRenderer;
  }

  /**
   * Called by MapLibre when layer is added. Initialize Three.js context.
   */
  onAdd(map: unknown, gl: WebGLRenderingContext): void {
    // Wrap MapLibre's WebGL context for Three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: (gl as unknown as { canvas: HTMLCanvasElement }).canvas,
      context: gl,
      antialias: true
    });
    this.renderer.autoClear = false;

    // Lighting for PBR materials
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    this.scene.add(sun);

    this.createPinMesh();
  }

  private createPinMesh(): void {
    const group = new THREE.Group();

    // Enhanced cylinder body (0.18m diameter, 0.85m height) - more visible
    const cylinderGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.85, 20);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.35,
      metalness: 0.3,
      emissive: 0x475569,
      emissiveIntensity: 0.15
    });
    const cylinder = new THREE.Mesh(cylinderGeom, cylinderMat);
    cylinder.position.y = 0.425; // Half height above ground
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    group.add(cylinder);

    // Enhanced top sphere (sensor head) - slightly larger and more detailed
    const topGeom = new THREE.SphereGeometry(0.12, 24, 24);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0x94a3b8,
      emissiveIntensity: 0
    });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = 0.925; // Top of cylinder + sphere radius
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Enhanced pulse ring (for irrigation simulation)
    let pulseRing: THREE.Mesh | null = null;
    let ringMaterial: THREE.MeshBasicMaterial | null = null;
    const ringGeom = new THREE.RingGeometry(0.22, 0.28, 48);
    ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    pulseRing = new THREE.Mesh(ringGeom, ringMaterial);
    pulseRing.rotation.x = -Math.PI / 2; // Lay flat on ground
    pulseRing.position.y = 0.02;
    group.add(pulseRing);

    // Hitbox for raycasting (larger than visual for easier clicking)
    const hitGeom = new THREE.CylinderGeometry(0.18, 0.18, 1.1, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitGeom, hitMat);
    hitbox.position.y = 0.55;
    hitbox.userData.pickable = true;
    group.add(hitbox);

    this.pinMesh = {
      group,
      cylinder,
      top,
      pulseRing,
      material: cylinderMat,
      topMaterial: topMat,
      ringMaterial
    };

    this.scene.add(group);
    this.updatePinPosition();
  }

  private updatePinPosition(): void {
    if (!this.pinMesh) return;

    // Convert ESP32 offset to WGS84
    const espWgs84 = enuToWgs84(this.espOffset, this.siteConfig);

    // Convert to Mercator Web coordinates (MapLibre's coordinate system)
    const mercator = this.latLngToMercator(espWgs84.lat, espWgs84.lng);

    // Position in Three.js world space (scale by Earth radius approximation)
    const scale = 6378137; // Mercator scale
    this.pinMesh.group.position.set(
      mercator.x * scale,
      espWgs84.alt ?? this.espOffset.up,
      -mercator.y * scale // Flip Y for Three.js coordinates
    );
  }

  private latLngToMercator(lat: number, lng: number): { x: number; y: number } {
    const x = lng / 360 + 0.5;
    const y = 0.5 - (0.25 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / Math.PI;
    return { x, y };
  }

  /**
   * Update pin appearance based on device state.
   * Uses backend-reported environment (smoothed over 5 samples), not raw telemetry.
   */
  updateDevice(device: Device | null, thresholds: SoilThresholds): void {
    if (!this.pinMesh) return;

    if (!device) {
      this.currentStatus = "OFFLINE";
      this.irrigationActive = false;
      this.applyPinColor();
      return;
    }

    // Use backend-smoothed environment status, NOT raw soilMoisturePct
    this.currentStatus = device.currentState.environment;

    // Use ACKed reportedState, never HTTP 202
    this.irrigationActive = device.currentState.irrigationSimulationActive;

    this.applyPinColor();
  }

  private applyPinColor(): void {
    if (!this.pinMesh) return;

    const colorHex = SOIL_STATUS_COLORS[this.currentStatus];
    const color = new THREE.Color(colorHex);

    this.pinMesh.material.color.copy(color);
    this.pinMesh.topMaterial.color.copy(color);

    // Emissive glow for non-offline states
    if (this.currentStatus === "OFFLINE") {
      this.pinMesh.topMaterial.emissiveIntensity = 0;
      // Apply hatched pattern via opacity animation (Phase 2b can add actual shader)
      this.pinMesh.material.opacity = 0.6;
      this.pinMesh.material.transparent = true;
    } else {
      this.pinMesh.topMaterial.emissive.copy(color);
      this.pinMesh.topMaterial.emissiveIntensity = 0.3;
      this.pinMesh.material.opacity = 1.0;
      this.pinMesh.material.transparent = false;
    }
  }

  /**
   * Called every frame by MapLibre.
   */
  render(gl: WebGLRenderingContext, matrix: number[], prefersReducedMotion = false): void {
    if (!this.pinMesh) return;

    // Update pulse ring animation (respect prefers-reduced-motion)
    if (this.irrigationActive && this.pinMesh.pulseRing && this.pinMesh.ringMaterial && !prefersReducedMotion) {
      this.pulsePhase += 0.05;
      const pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5; // 0 to 1
      this.pinMesh.ringMaterial.opacity = pulse * 0.6;
      const scale = 1 + pulse * 0.3;
      this.pinMesh.pulseRing.scale.set(scale, scale, 1);
    } else if (this.pinMesh.ringMaterial) {
      this.pinMesh.ringMaterial.opacity = 0;
    }

    // Sync Three.js camera with MapLibre
    this.camera.projectionMatrix.fromArray(matrix);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle pointer move for hover detection.
   */
  onPointerMove(x: number, y: number, width: number, height: number): void {
    if (!this.pinMesh) return;

    this.containerWidth = width;
    this.containerHeight = height;

    // Normalize to -1 to 1
    this.pointer.x = (x / width) * 2 - 1;
    this.pointer.y = -(y / height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    const hit = intersects.find((i) => i.object.userData.pickable);
    if (hit) {
      this.callbacks.onPinHover(true, x, y);
    } else {
      this.callbacks.onPinHover(false, 0, 0);
    }
  }

  /**
   * Handle click.
   */
  onClick(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    const hit = intersects.find((i) => i.object.userData.pickable);
    if (hit) {
      this.callbacks.onPinClick();
    }
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.pinMesh) {
      this.pinMesh.material.dispose();
      this.pinMesh.topMaterial.dispose();
      this.pinMesh.ringMaterial?.dispose();
      this.pinMesh.cylinder.geometry.dispose();
      this.pinMesh.top.geometry.dispose();
      this.pinMesh.pulseRing?.geometry.dispose();
      this.scene.remove(this.pinMesh.group);
      this.pinMesh = null;
    }
  }
}
