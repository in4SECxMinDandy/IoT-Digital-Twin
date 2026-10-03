import { AlertTriangle, CircleCheck, CircleX, Radio } from "lucide-react";

import type { Device, EnvironmentStatus } from "../types";
import { StatusPill } from "./StatusPill";

const statusMeta: Record<EnvironmentStatus, { label: string; tone: "normal" | "warning" | "critical" | "invalid" }> = {
  NORMAL: { label: "NORMAL", tone: "normal" },
  WARNING: { label: "WARNING", tone: "warning" },
  CRITICAL: { label: "CRITICAL", tone: "critical" },
  INVALID: { label: "INVALID", tone: "invalid" }
};

interface StatusPanelProps {
  device: Device;
}

export function StatusPanel({ device }: StatusPanelProps) {
  const isOffline = device.status === "OFFLINE";
  const environment = statusMeta[device.currentState.environment];
  const Icon =
    device.currentState.environment === "NORMAL"
      ? CircleCheck
      : device.currentState.environment === "INVALID"
        ? CircleX
        : AlertTriangle;

  return (
    <section className="panel status-panel" aria-labelledby="status-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{isOffline ? "Last reported condition" : "Current condition"}</p>
          <h2 id="status-title">Environment status</h2>
        </div>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="status-panel__main">
        <StatusPill label={isOffline ? `${environment.label} · STALE` : environment.label} tone={isOffline ? "neutral" : environment.tone} />
        <p>
          {isOffline && "Device offline; live sensor and LED state are unknown."}
          {!isOffline && <>
          {device.currentState.environment === "NORMAL" && "Soil moisture is within the configured normal range."}
          {device.currentState.environment === "WARNING" && "Soil moisture is below the normal range."}
          {device.currentState.environment === "CRITICAL" && "Soil moisture is below the critical threshold."}
          {device.currentState.environment === "INVALID" && "A valid soil moisture value is not available."}
          </>}
        </p>
      </div>
      <dl className="led-state" aria-label={isOffline ? "LED state unknown" : "Reported LED state"}>
        <div>
          <dt><i className={`led led--green led--${isOffline ? "off" : device.currentState.greenPattern.toLowerCase()}`} />Green</dt>
          <dd>
            {isOffline ? "Unknown" : device.currentState.greenPattern === "BLINK"
              ? "Simulation"
              : device.currentState.greenPattern === "SOLID"
                ? "Normal"
                : "Off"}
          </dd>
        </div>
        <div>
          <dt><i className={`led led--yellow led--${!isOffline && device.currentState.alertLevel === "WARNING" ? "on" : "off"}`} />Yellow</dt>
          <dd>{isOffline ? "Unknown" : device.currentState.alertLevel === "WARNING" ? "Warning" : "Off"}</dd>
        </div>
        <div>
          <dt><i className={`led led--red led--${!isOffline && device.currentState.alertLevel === "CRITICAL" ? "on" : "off"}`} />Red</dt>
          <dd>{isOffline ? "Unknown" : device.currentState.alertLevel === "CRITICAL" ? "Critical" : "Off"}</dd>
        </div>
      </dl>
      <div className="reported-line">
        <Radio size={16} aria-hidden="true" />
        <span>Reported {device.currentState.reportedAt ? new Date(device.currentState.reportedAt).toLocaleTimeString() : "not yet"}</span>
      </div>
    </section>
  );
}
