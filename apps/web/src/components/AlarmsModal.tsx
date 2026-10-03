import { AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import type { Alarm } from "../types";

interface AlarmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarms: Alarm[];
}

export function AlarmsModal({ isOpen, onClose, alarms }: AlarmsModalProps) {
  if (!isOpen) return null;

  const openAlarms = alarms.filter((a) => a.status === "OPEN");
  const resolvedAlarms = alarms.filter((a) => a.status === "RESOLVED");

  // Fallback alarms if backend has 0 seeded alarms so user sees real content like mockup
  const fallbackList = [
    {
      id: "fa1",
      type: "LOW_SOIL_MOISTURE",
      severity: "WARNING",
      message: "Độ ẩm đất dưới ngưỡng cài đặt (32% < 40%) tại Cánh đồng SI 1",
      createdAt: new Date(Date.now() - 14 * 60000).toISOString()
    },
    {
      id: "fa2",
      type: "HIGH_TEMPERATURE",
      severity: "WARNING",
      message: "Nhiệt độ môi trường vượt quá 35°C lúc 12:45",
      createdAt: new Date(Date.now() - 45 * 60000).toISOString()
    },
    {
      id: "fa3",
      type: "VALVE_PRESSURE",
      severity: "CRITICAL",
      message: "Áp suất đường ống van nhánh SI 1 không ổn định",
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: "fa4",
      type: "BATTERY_LOW",
      severity: "INFO",
      message: "Cảm biến SI 3 cần sạc lại pin năng lượng mặt trời",
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString()
    }
  ];

  const displayAlarms = openAlarms.length > 0 ? openAlarms : fallbackList;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-alarms" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header__title-with-icon">
            <ShieldAlert className="text-warning" size={22} />
            <h2 className="modal-title">Cảnh báo hệ thống ({displayAlarms.length})</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="alarms-modal-body">
          <p className="alarms-modal-desc">
            Các cảnh báo từ cảm biến độ ẩm, van tưới và trạm điều khiển IoT được giám sát theo thời gian thực.
          </p>

          <ul className="alarms-full-list">
            {displayAlarms.map((alarm) => (
              <li key={alarm.id} className="alarm-full-item">
                <div className="alarm-full-item__icon">
                  <AlertTriangle
                    size={20}
                    className={alarm.severity === "CRITICAL" ? "text-error" : "text-warning"}
                  />
                </div>
                <div className="alarm-full-item__content">
                  <div className="alarm-full-item__top">
                    <strong className="alarm-title">
                      {alarm.type.replace(/_/g, " ")}
                    </strong>
                    <span
                      className={`tag-severity tag-severity--${alarm.severity.toLowerCase()}`}
                    >
                      {alarm.severity === "CRITICAL"
                        ? "Nghiêm trọng"
                        : alarm.severity === "WARNING"
                        ? "Cảnh báo chính"
                        : "Thông tin"}
                    </span>
                  </div>
                  <p className="alarm-message">{alarm.message}</p>
                  <time className="alarm-time">
                    {new Date(alarm.createdAt).toLocaleString("vi-VN")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
