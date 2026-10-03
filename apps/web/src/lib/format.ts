const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Reads a sensor value for display. A missing reading renders as an em dash
 * rather than a plausible-looking number: the graph shows what the device
 * reported, and "no value" is a real state worth seeing.
 */
export function formatReading(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** Reading plus its unit, or a bare em dash — never "— °C". */
export function formatWithUnit(value: number | null | undefined, unit: string, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)} ${unit}`;
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "—";
  return new Date(time).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "chưa có dữ liệu";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "chưa có dữ liệu";

  const elapsed = now - time;
  if (elapsed < 0) return "vừa xong";
  if (elapsed < MINUTE_MS) return "vừa xong";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} phút trước`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} giờ trước`;
  return `${Math.floor(elapsed / DAY_MS)} ngày trước`;
}
