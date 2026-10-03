/**
 * WGS84 ↔ Local ENU (East-North-Up) coordinate transforms for Zone_Pergola.
 * ENU origin is the zone center; all positions in metres.
 */

export interface WGS84 {
  lat: number;
  lng: number;
  alt?: number; // metres above WGS84 ellipsoid
}

export interface ENU {
  east: number;
  north: number;
  up: number;
}

export interface SiteConfig {
  centerLat: number;
  centerLng: number;
  groundElevationM: number;
  northOffsetDeg: number; // Rotation: 0 = grid north = true north; +angle = grid rotated CW from true north
}

const EARTH_RADIUS_M = 6378137; // WGS84 equatorial radius

/**
 * Convert WGS84 to local ENU metres. Flat-earth approximation valid for ~100 m zones.
 */
export function wgs84ToEnu(point: WGS84, site: SiteConfig): ENU {
  const dLat = (point.lat - site.centerLat) * (Math.PI / 180);
  const dLng = (point.lng - site.centerLng) * (Math.PI / 180);
  const latRad = site.centerLat * (Math.PI / 180);

  const north = dLat * EARTH_RADIUS_M;
  const east = dLng * EARTH_RADIUS_M * Math.cos(latRad);
  const up = (point.alt ?? site.groundElevationM) - site.groundElevationM;

  // Apply north rotation if grid is rotated relative to true north
  if (site.northOffsetDeg !== 0) {
    const theta = -site.northOffsetDeg * (Math.PI / 180); // Negative because positive offset means grid CW
    const rotEast = east * Math.cos(theta) - north * Math.sin(theta);
    const rotNorth = east * Math.sin(theta) + north * Math.cos(theta);
    return { east: rotEast, north: rotNorth, up };
  }

  return { east, north, up };
}

/**
 * Convert local ENU metres to WGS84.
 */
export function enuToWgs84(enu: ENU, site: SiteConfig): WGS84 {
  let { east, north } = enu;

  // Reverse north rotation
  if (site.northOffsetDeg !== 0) {
    const theta = site.northOffsetDeg * (Math.PI / 180);
    const origEast = east * Math.cos(theta) - north * Math.sin(theta);
    const origNorth = east * Math.sin(theta) + north * Math.cos(theta);
    east = origEast;
    north = origNorth;
  }

  const latRad = site.centerLat * (Math.PI / 180);
  const dLat = north / EARTH_RADIUS_M;
  const dLng = east / (EARTH_RADIUS_M * Math.cos(latRad));

  return {
    lat: site.centerLat + dLat * (180 / Math.PI),
    lng: site.centerLng + dLng * (180 / Math.PI),
    alt: site.groundElevationM + enu.up
  };
}

/**
 * Clamp a point to stay within a rectangular zone plus padding.
 */
export function clampToZone(
  enu: ENU,
  bounds: { minEast: number; maxEast: number; minNorth: number; maxNorth: number },
  padding = 0
): ENU {
  return {
    east: Math.max(bounds.minEast - padding, Math.min(bounds.maxEast + padding, enu.east)),
    north: Math.max(bounds.minNorth - padding, Math.min(bounds.maxNorth + padding, enu.north)),
    up: Math.max(0, enu.up) // Never below ground
  };
}
