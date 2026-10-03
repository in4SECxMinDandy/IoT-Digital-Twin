/**
 * MapLibre GL + Three.js custom layer implementation.
 * Provides satellite/terrain base imagery with 3D overlay capability.
 */

import * as maplibregl from "maplibre-gl";
import type { CustomLayerInterface, Map as MapLibreMap, MapEventType } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapProvider, MapProviderConfig } from "./map-provider";

export class MapLibreProvider implements MapProvider {
  private map: MapLibreMap | null = null;
  private container: HTMLElement | null = null;
  private config: MapProviderConfig;

  constructor(config: MapProviderConfig) {
    this.config = config;
  }

  async initialize(container: HTMLElement, center: [number, number], zoom: number): Promise<void> {
    this.container = container;

    const styleUrl = this.config.styleUrl || this.getDefaultStyleUrl();

    this.map = new maplibregl.Map({
      container,
      style: styleUrl,
      center,
      zoom,
      pitch: 45,
      bearing: 0,
      maxPitch: 85,
      minPitch: 10,
      maxZoom: this.config.maxZoom ?? 20,
      minZoom: this.config.minZoom ?? 16,
      maxBounds: this.config.maxBounds,
      attributionControl: { compact: false }
    });

    return new Promise((resolve, reject) => {
      this.map!.on("load", () => resolve());
      this.map!.on("error", (e) => reject(e.error));
    });
  }

  private getDefaultStyleUrl(): string {
    // Maptiler satellite style (requires API key in URL)
    const apiKey = this.config.apiKey || import.meta.env.VITE_MAPTILER_KEY || "";
    if (!apiKey) {
      console.warn("No Maptiler API key found. Map tiles may not load.");
    }
    return `https://api.maptiler.com/maps/satellite/style.json?key=${apiKey}`;
  }

  addThreeLayer(layerId: string, render: (gl: WebGLRenderingContext, matrix: number[]) => void): void {
    if (!this.map) return;

    const customLayer: CustomLayerInterface = {
      id: layerId,
      type: "custom",
      renderingMode: "3d",
      onAdd: (map, gl) => {
        // Three.js initialization happens in the render callback
      },
      render: (gl, matrix) => {
        // matrix is CustomRenderMethodInput in maplibre v6; extract projectionMatrix
        const projMatrix = Array.isArray(matrix) ? matrix : (matrix as { projectionMatrix?: number[] }).projectionMatrix ?? [];
        render(gl as WebGLRenderingContext, projMatrix);
      }
    };

    this.map.addLayer(customLayer);
  }

  async getElevation(lng: number, lat: number): Promise<number | null> {
    // MapLibre doesn't natively expose terrain elevation query
    // For terrain-clamping, we'd need:
    // 1. Terrain RGB tiles (Mapbox or Maptiler) parsed manually
    // 2. Or fall back to external elevation API (e.g., Open-Elevation)
    // For now, return site ground elevation as approximation
    console.warn("Terrain elevation query not implemented; using ground elevation");
    return null;
  }

  setCamera(center: [number, number], zoom: number, pitch = 45, bearing = 0): void {
    if (!this.map) return;
    this.map.jumpTo({ center, zoom, pitch, bearing });
  }

  flyTo(center: [number, number], zoom: number, pitch = 45, bearing = 0, duration = 900): void {
    if (!this.map) return;
    this.map.flyTo({ center, zoom, pitch, bearing, duration, essential: true });
  }

  on(event: string, handler: (e: unknown) => void): void {
    if (!this.map) return;
    this.map.on(event as keyof MapEventType, handler as never);
  }

  off(event: string, handler: (e: unknown) => void): void {
    if (!this.map) return;
    this.map.off(event as keyof MapEventType, handler as never);
  }

  dispose(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.container = null;
  }
}
