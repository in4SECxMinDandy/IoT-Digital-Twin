import type { Alarm, ApiEnvelope, AssetPayload, Command, Device, Telemetry } from "../types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? "The request could not be completed.");
  }
  return body.data;
}

export const api = {
  getAssets: () => request<AssetPayload>("/api/assets"),
  getDevices: () => request<Device[]>("/api/devices"),
  getDevice: (deviceId: string) => request<Device>(`/api/devices/${encodeURIComponent(deviceId)}`),
  getTelemetry: (deviceId: string, limit = 200) => request<Telemetry[]>(`/api/devices/${encodeURIComponent(deviceId)}/telemetry?limit=${limit}`),
  getAlarms: (deviceId: string) => request<Alarm[]>(`/api/devices/${encodeURIComponent(deviceId)}/alarms`),
  getCommands: (deviceId: string) => request<Command[]>(`/api/devices/${encodeURIComponent(deviceId)}/commands?limit=50`),
  sendCommand: (deviceId: string, type: Command["type"], value?: string) =>
    request<Command>(`/api/devices/${encodeURIComponent(deviceId)}/commands`, {
      method: "POST",
      body: JSON.stringify({ type, ...(value ? { value } : {}) })
    })
};

export function getSocketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL ?? window.location.origin;
}
