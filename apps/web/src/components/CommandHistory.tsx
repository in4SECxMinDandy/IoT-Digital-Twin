import { useState } from "react";
import { ClipboardList } from "lucide-react";

import type { Command } from "../types";
import { StatusPill } from "./StatusPill";

interface CommandHistoryProps {
  commands: Command[];
}

function commandLabel(command: Command): string {
  if (command.type === "START_IRRIGATION_SIMULATION") return "Start simulation";
  if (command.type === "STOP_IRRIGATION_SIMULATION") return "Stop simulation";
  if (command.type === "SET_MODE") return `Set mode to ${command.value ?? "unknown"}`;
  return `Set LED alert to ${command.value ?? "unknown"}`;
}

function commandTone(status: Command["status"]): "pending" | "normal" | "critical" {
  if (status === "PENDING") return "pending";
  return status === "EXECUTED" ? "normal" : "critical";
}

export function CommandHistory({ commands }: CommandHistoryProps) {
  const [view, setView] = useState<"SIMULATION" | "ALL">("SIMULATION");
  const visibleCommands = view === "SIMULATION"
    ? commands.filter((command) => command.type === "START_IRRIGATION_SIMULATION" || command.type === "STOP_IRRIGATION_SIMULATION")
    : commands;

  return (
    <section className="panel command-history-panel" aria-labelledby="command-history-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Command audit</p>
          <h2 id="command-history-title">Simulation activity</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </div>
      <div className="panel-tabs" role="group" aria-label="Command history view">
        <button type="button" className={view === "SIMULATION" ? "panel-tabs__active" : ""} onClick={() => setView("SIMULATION")}>Simulation</button>
        <button type="button" className={view === "ALL" ? "panel-tabs__active" : ""} onClick={() => setView("ALL")}>All commands</button>
      </div>
      {visibleCommands.length === 0 ? (
        <div className="empty-state empty-state--compact">No commands recorded in the latest 50.</div>
      ) : (
        <ol className="command-history-list">
          {visibleCommands.map((command) => (
            <li key={command.commandId}>
              <div>
                <strong>{commandLabel(command)}</strong>
                <p>{command.source} · <time dateTime={command.createdAt}>{new Date(command.createdAt).toLocaleString()}</time></p>
                {command.error && <p className="command-history-list__error">{command.error}</p>}
              </div>
              <StatusPill label={command.status} tone={commandTone(command.status)} />
            </li>
          ))}
        </ol>
      )}
      <p className="history-caption">Commands record LED simulation only; they do not measure water delivered.</p>
    </section>
  );
}
