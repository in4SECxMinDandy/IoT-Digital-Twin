import { Power } from "lucide-react";
import type { Device } from "../types";

interface IrrigationStatusCardProps {
  device: Device | null;
  submitting: boolean;
  onToggleIrrigation: (active: boolean) => void;
}

export function IrrigationStatusCard({
  device,
  submitting,
  onToggleIrrigation
}: IrrigationStatusCardProps) {
  const isOnline = device?.status === "ONLINE";
  const isActive = Boolean(device?.currentState.irrigationSimulationActive);
  const isManual = device?.currentState.mode === "MANUAL";
  const disabled = submitting || !isOnline;

  const handleToggle = () => {
    if (disabled) return;
    onToggleIrrigation(!isActive);
  };

  return (
    <div className="card metric-card">
      <div className="metric-card__label">Trạng thái tưới</div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: 'var(--space-3)'
      }}>
        <div className={`status-badge ${isActive ? 'status-badge--on' : 'status-badge--off'}`}>
          <span className="status-dot"></span>
          {isActive ? 'Đang tưới' : 'Tắt'}
        </div>

        <button
          type="button"
          className={`btn ${isActive ? 'btn--secondary' : 'btn--primary'}`}
          onClick={handleToggle}
          disabled={disabled}
          style={{ marginLeft: 'auto' }}
        >
          <Power size={16} />
          {isActive ? 'Tắt' : 'Bật'}
        </button>
      </div>

      <div className="metric-card__footer">
        {isOnline
          ? isManual
            ? "Thủ công"
            : "Tự động"
          : "Ngoại tuyến"}
      </div>
    </div>
  );
}
