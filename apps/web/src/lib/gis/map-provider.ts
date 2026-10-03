/**
 * MapProvider interface: abstraction for different map/imagery providers.
 * Allows switching between MapLibre, Cesium, or custom tile sources.
 */

export interface MapProvider {
  /** Initialize the map container and load base imagery */
  initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void>;

  /** Add a custom Three.js layer for 3D overlays */
  addThreeLayer(layerId: string, render: (gl: WebGLRenderingContext, matrix: number[]) => void): void;

  /** Get terrain elevation at a given WGS84 coordinate (for ground-clamping) */
  getElevation(lng: number, lat: number): Promise<number | null>;

  /** Set camera position and orientation */
  setCamera(center: [number, number], zoom: number, pitch?: number, bearing?: number): void;

  /** Animate camera to target position */
  flyTo(center: [number, number], zoom: number, pitch?: number, bearing?: number, duration?: number): void;

  /** Clean up resources */
  dispose(): void;

  /** Register event handlers */
  on(event: string, handler: (e: unknown) => void): void;
  off(event: string, handler: (e: unknown) => void): void;
}

export interface MapProviderConfig {
  styleUrl: string;
  apiKey?: string;
  attribution: string;
  maxBounds?: [[number, number], [number, number]]; // [[west, south], [east, north]]
  maxZoom?: number;
  minZoom?: number;
}
