/**
 * Feature flag: controls whether Garden3DMap replaces the old satellite card.
 * Set via environment variable VITE_ENABLE_3D_MAP=true
 */

export const ENABLE_3D_MAP = import.meta.env.VITE_ENABLE_3D_MAP === "true";

/**
 * Check if WebGL is available in the current browser.
 */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return gl instanceof WebGLRenderingContext;
  } catch {
    return false;
  }
}

/**
 * Check if all required configuration is present for 3D map.
 */
export function canEnable3DMap(): boolean {
  const hasApiKey = Boolean(import.meta.env.VITE_MAPTILER_KEY);
  const hasWebGL = isWebGLAvailable();
  return ENABLE_3D_MAP && hasApiKey && hasWebGL;
}
