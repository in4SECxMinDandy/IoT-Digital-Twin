import { Play, Square } from "lucide-react";

import type { CommandStatus, Device, DeviceMode } from "../types";
import { StatusPill } from "./StatusPill";

interface SimulationControlsProps {
  device: Device;
  submitting: boolean;
  sending: boolean;
  onSetMode: (mode: DeviceMode) => void;
  onSimulation: (active: boolean) => void;
}

function commandTone(status?: CommandStatus | null): "pending" | "normal" | "critical" | "neutral" {
  if (status === "PENDING") return "pending";
  if (status === "EXECUTED") return "normal";
  if (status === "FAILED" || status === "TIMEOUT") return "critical";
  return "neutral";
}

export function SimulationControls({ device, submitting, sending, onSetMode, onSimulation }: SimulationControlsProps) {
  const mode = device.currentState.mode;
  const lastCommand = device.currentState.lastCommand;
  const isOffline = device.status === "OFFLINE";
  const isManual = mode === "MANUAL";

  return (
    <section className="panel control-panel" aria-labelledby="control-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LED actuator</p>
          <h2 id="control-title">Irrigation simulation</h2>
        </div>
        <StatusPill
          label={isOffline ? "UNKNOWN" : device.currentState.irrigationSimulationActive ? "ACTIVE" : "OFF"}
          tone={!isOffline && device.currentState.irrigationSimulationActive ? "normal" : "neutral"}
        />
      </div>
      <div className="segmented-control" aria-label="Control mode">
        <button
          className={mode === "AUTO" ? "segmented-control__selected" : ""}
          onClick={() => onSetMode("AUTO")}
          disabled={submitting || isOffline || mode === "AUTO"}
        >
          AUTO
        </button>
        <button
          className={mode === "MANUAL" ? "segmented-control__selected" : ""}
          onClick={() => onSetMode("MANUAL")}
          disabled={submitting || isOffline || mode === "MANUAL"}
        >
          MANUAL
        </button>
      </div>
      <div className="control-actions">
        <button
          className="button button--primary"
          onClick={() => onSimulation(true)}
          disabled={submitting || isOffline || !isManual || device.currentState.irrigationSimulationActive}
        >
          <Play size={17} aria-hidden="true" />
          Start simulation
        </button>
        <button
          className="button button--secondary"
          onClick={() => onSimulation(false)}
          disabled={submitting || isOffline || !isManual || !device.currentState.irrigationSimulationActive}
        >
          <Square size={17} aria-hidden="true" />
          Stop simulation
        </button>
      </div>
      <div className="command-state" aria-live="polite">
        <span>Last command</span>
        <StatusPill label={sending ? "SENDING" : lastCommand?.status ?? "NONE"} tone={sending ? "pending" : commandTone(lastCommand?.status)} />
      </div>
    </section>
  );
}
