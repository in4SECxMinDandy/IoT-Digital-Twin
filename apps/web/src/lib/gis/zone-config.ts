/**
 * Zone_Pergola configuration for the 3D satellite map.
 *
 * IMPORTANT: Replace [PLACEHOLDER] values with real survey data before deployment.
 * While placeholders remain, a banner "Tọa độ minh họa" is shown to users.
 */

import type { SiteConfig } from "./coordinates";

export interface ZoneConfig {
  id: string;
  name: string;
  site: SiteConfig;
  /** WGS84 GeoJSON polygon boundary, ~15 x 20 m */
  boundaryGeoJson: {
    type: "Polygon";
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
  /** Local ENU bounds derived from boundary */
  bounds: {
    minEast: number;
    maxEast: number;
    minNorth: number;
    maxNorth: number;
  };
  /** ESP32_01 position in local ENU metres from zone origin */
  esp32Offset: {
    east: number;
    north: number;
    up: number;
  };
}

/**
 * Check if any configuration value is a placeholder.
 */
export function hasPlaceholders(config: ZoneConfig): boolean {
  return (
    config.site.centerLat === 0 ||
    config.site.centerLng === 0 ||
    config.boundaryGeoJson.coordinates[0].length === 0 ||
    config.esp32Offset.east === 999 // Sentinel value
  );
}

/**
 * Zone_Pergola: modern-minimalist pergola courtyard containing Plant_01 and ESP32_01.
 *
 * Tọa độ mẫu: Quận 7, TP.HCM (khu vực có nhiều vườn)
 * Thay đổi bằng GPS thực tế của bạn sau khi survey.
 */
export const ZONE_PERGOLA: ZoneConfig = {
  id: "zone_pergola",
  name: "Zone_Pergola",
  site: {
    centerLat: 10.762622,  // Tọa độ mẫu: Quận 7, TP.HCM
    centerLng: 106.682284,
    groundElevationM: 5,   // Độ cao trung bình khu vực TP.HCM
    northOffsetDeg: 0      // Không xoay
  },
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [[
      // Rectangle ~15m × 20m, định hướng Bắc-Nam
      [106.682215, 10.762532],  // SW corner (góc tây nam)
      [106.682353, 10.762532],  // SE corner (góc đông nam)
      [106.682353, 10.762712],  // NE corner (góc đông bắc)
      [106.682215, 10.762712],  // NW corner (góc tây bắc)
      [106.682215, 10.762532]   // Close polygon
    ]]
  },
  bounds: {
    // Bounds ~15m east/west, ~20m north/south từ tâm
    minEast: -7.5,
    maxEast: 7.5,
    minNorth: -10,
    maxNorth: 10
  },
  esp32Offset: {
    // ESP32_01 trong bồn cây, cách tâm zone 2.5m về đông, 3m về nam
    east: 2.5,
    north: -3.0,
    up: 0.8  // Cọc cảm biến cao 80cm
  }
};

/**
 * Imagery provider configuration.
 * API key must come from environment variable, never committed.
 */
export interface ImageryConfig {
  provider: "maptiler" | "mapbox" | "custom";
  styleUrl: string;
  attribution: string;
}

export const IMAGERY_CONFIG: ImageryConfig = {
  provider: "maptiler", // Free tier: 100k tile loads/month
  styleUrl: "", // [PLACEHOLDER] Set via env var VITE_MAP_STYLE_URL
  attribution: "© MapTiler © OpenStreetMap contributors"
};
