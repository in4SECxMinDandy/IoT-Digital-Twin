import { useState } from "react";
import { BellRing, CircleCheck, TriangleAlert } from "lucide-react";

import type { Alarm } from "../types";
import { StatusPill } from "./StatusPill";

interface AlarmListProps {
  alarms: Alarm[];
}

function alarmTone(severity: Alarm["severity"]): "normal" | "warning" | "critical" {
  if (severity === "CRITICAL") return "critical";
  if (severity === "WARNING") return "warning";
  return "normal";
}

export function AlarmList({ alarms }: AlarmListProps) {
  const [view, setView] = useState<"OPEN" | "RESOLVED">("OPEN");
  const openAlarms = alarms.filter((alarm) => alarm.status === "OPEN");
  const resolvedAlarms = alarms.filter((alarm) => alarm.status === "RESOLVED");
  const visibleAlarms = view === "OPEN" ? openAlarms : resolvedAlarms;
  return (
    <section className="panel alarm-panel" aria-labelledby="alarm-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Active events</p>
          <h2 id="alarm-title">Alarms</h2>
        </div>
        <BellRing size={20} aria-hidden="true" />
      </div>
      <div className="panel-tabs" role="group" aria-label="Alarm history view">
        <button type="button" className={view === "OPEN" ? "panel-tabs__active" : ""} onClick={() => setView("OPEN")}>Open ({openAlarms.length})</button>
        <button type="button" className={view === "RESOLVED" ? "panel-tabs__active" : ""} onClick={() => setView("RESOLVED")}>Resolved ({resolvedAlarms.length})</button>
      </div>
      {visibleAlarms.length === 0 ? (
        <div className="empty-state empty-state--compact">{view === "OPEN" ? "No active alarms." : "No resolved alarms yet."}</div>
      ) : (
        <ul className="alarm-list">
          {visibleAlarms.map((alarm) => (
            <li key={alarm.id}>
              {view === "OPEN" ? <TriangleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
              <div>
                <strong>{alarm.type.replaceAll("_", " ")}</strong>
                <p>{alarm.message}</p>
                <time dateTime={view === "RESOLVED" ? alarm.resolvedAt ?? alarm.createdAt : alarm.createdAt}>
                  {new Date(view === "RESOLVED" ? alarm.resolvedAt ?? alarm.createdAt : alarm.createdAt).toLocaleString()}
                </time>
              </div>
              <StatusPill label={view === "RESOLVED" ? "RESOLVED" : alarm.severity} tone={view === "RESOLVED" ? "neutral" : alarmTone(alarm.severity)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
