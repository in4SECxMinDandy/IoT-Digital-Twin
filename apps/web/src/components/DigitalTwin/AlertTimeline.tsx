import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Alarm } from "../../types";
import "./digital-twin.css";

interface AlertTimelineProps {
  alarms: Alarm[];
  onViewDetails: (alarm: Alarm) => void;
}

function getAlarmIcon(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return <XCircle size={18} />;
    case "WARNING":
      return <AlertTriangle size={18} />;
    default:
      return <CheckCircle size={18} />;
  }
}

function getAlarmClass(severity: string, status: string) {
  if (status === "RESOLVED") return "dt-alert-card--resolved";

  switch (severity) {
    case "CRITICAL":
      return "dt-alert-card--critical";
    case "WARNING":
      return "dt-alert-card--warning";
    default:
      return "dt-alert-card--info";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AlertTimeline({ alarms, onViewDetails }: AlertTimelineProps) {
  const activeAlarms = alarms.filter(a => a.status === "ACTIVE");
  const recentAlarms = alarms.slice(0, 5);

  return (
    <div className="dt-alert-timeline">
      <div className="dt-alert-timeline__header">
        <div className="dt-alert-timeline__title-row">
          <div className="dt-alert-timeline__icon">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="dt-alert-timeline__title">ALERT TIMELINE</h3>
            <p className="dt-alert-timeline__subtitle">
              {activeAlarms.length} active {activeAlarms.length === 1 ? 'alert' : 'alerts'}
            </p>
          </div>
        </div>
        {activeAlarms.length > 0 && (
          <div className="dt-alert-badge dt-alert-badge--active">
            {activeAlarms.length} ACTIVE
          </div>
        )}
      </div>

      <div className="dt-alert-timeline__body">
        {recentAlarms.length === 0 ? (
          <div className="dt-alert-timeline__empty">
            <CheckCircle size={48} />
            <p>No recent alerts</p>
            <span>All systems operating normally</span>
          </div>
        ) : (
          <div className="dt-alert-timeline__list">
            {recentAlarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`dt-alert-card ${getAlarmClass(alarm.severity, alarm.status)}`}
                onClick={() => onViewDetails(alarm)}
              >
                <div className="dt-alert-card__icon">
                  {getAlarmIcon(alarm.severity)}
                </div>
                <div className="dt-alert-card__content">
                  <div className="dt-alert-card__header">
                    <span className="dt-alert-card__title">{alarm.title}</span>
                    <span className="dt-alert-card__severity">{alarm.severity}</span>
                  </div>
                  <p className="dt-alert-card__message">{alarm.message}</p>
                  <div className="dt-alert-card__footer">
                    <span className="dt-alert-card__device">{alarm.deviceId}</span>
                    <span className="dt-alert-card__timestamp">
                      <Clock size={12} />
                      {formatTimestamp(alarm.createdAt)}
                    </span>
                  </div>
                </div>
                {alarm.status === "ACTIVE" && (
                  <div className="dt-alert-card__pulse" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {alarms.length > 5 && (
        <div className="dt-alert-timeline__footer">
          <button className="dt-button dt-button--ghost">
            View All Alerts ({alarms.length})
          </button>
        </div>
      )}
    </div>
  );
}
