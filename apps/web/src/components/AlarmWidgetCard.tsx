import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Alarm } from "../types";

interface AlarmWidgetCardProps {
  alarms: Alarm[];
  onOpenAlarms: () => void;
}

export function AlarmWidgetCard({ alarms, onOpenAlarms }: AlarmWidgetCardProps) {
  const openAlarms = alarms.filter((a) => a.status === "OPEN");
  const count = openAlarms.length;

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onOpenAlarms}>
      <div className="card__header">
        <div className="card__title">
          <AlertTriangle className="card__title-icon" style={{ color: count > 0 ? 'var(--color-alert)' : 'var(--color-text-secondary)' }} />
          Cảnh báo
        </div>
        <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <div className="card__body">
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: 'var(--space-2)'
        }}>
          <span style={{
            fontSize: '32px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: count > 0 ? 'var(--color-alert)' : 'var(--color-text-secondary)'
          }}>
            {count}
          </span>
          <span style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)'
          }}>
            cảnh báo đang mở
          </span>
        </div>
        {openAlarms.length > 0 && (
          <div style={{
            fontSize: '13px',
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-subtle)'
          }}>
            {openAlarms[0].message}
          </div>
        )}
      </div>
    </div>
  );
}
