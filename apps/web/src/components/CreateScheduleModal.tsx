import { useState } from "react";
import { Calendar, Clock, X } from "lucide-react";
import type { IrrigationSchedule } from "../types";

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (schedule: IrrigationSchedule) => void;
}

export function CreateScheduleModal({ isOpen, onClose, onCreate }: CreateScheduleModalProps) {
  const [name, setName] = useState("Mỗi Thứ Hai");
  const [startDate, setStartDate] = useState("09/11/2022");
  const [startTime, setStartTime] = useState("00:00");
  const [stopCondition, setStopCondition] = useState<"duration" | "volume">("duration");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [volumeLiters, setVolumeLiters] = useState(500);
  const [repeatEnabled, setRepeatEnabled] = useState(true);
  const [repeatFrequency, setRepeatFrequency] = useState("Hàng tuần");
  const [selectedDays, setSelectedDays] = useState<string[]>(["T2"]);

  if (!isOpen) return null;

  const daysList = [
    { key: "CN", label: "CN" },
    { key: "T2", label: "T2" },
    { key: "T3", label: "T3" },
    { key: "T4", label: "T4" },
    { key: "T5", label: "T5" },
    { key: "T6", label: "T6" },
    { key: "T7", label: "T7" }
  ];

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: IrrigationSchedule = {
      id: `sch_${Date.now()}`,
      name: name || "Lịch tưới mới",
      startDate,
      startTime,
      repeat: repeatEnabled ? repeatFrequency : "Không lặp",
      repeatDays: selectedDays,
      repeatEnabled,
      endDate: "1 Jan 2030",
      stopCondition,
      durationMinutes: stopCondition === "duration" ? durationMinutes : undefined,
      volumeLiters: stopCondition === "volume" ? volumeLiters : undefined
    };
    onCreate(newSchedule);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-create-schedule" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Tạo lịch tưới</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Tên lịch tưới */}
          <div className="form-group">
            <label className="form-label" htmlFor="sch-name">
              Tên *
            </label>
            <input
              id="sch-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Bắt đầu: Ngày và Giờ */}
          <div className="form-section-title">Bắt đầu</div>
          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Ngày *</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  required
                />
                <Calendar size={18} className="input-icon-right text-muted" />
              </div>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Giờ *</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="HH:mm"
                  required
                />
                <Clock size={18} className="input-icon-right text-muted" />
              </div>
            </div>
          </div>

          {/* Điều kiện dừng tưới */}
          <div className="form-group">
            <label className="form-label">Điều kiện dừng tưới</label>
            <div className="segmented-tabs">
              <button
                type="button"
                className={`segmented-tab ${stopCondition === "volume" ? "segmented-tab--active" : ""}`}
                onClick={() => setStopCondition("volume")}
              >
                Khối lượng
              </button>
              <button
                type="button"
                className={`segmented-tab ${stopCondition === "duration" ? "segmented-tab--active" : ""}`}
                onClick={() => setStopCondition("duration")}
              >
                Thời lượng
              </button>
            </div>
          </div>

          {/* Giá trị dừng theo điều kiện */}
          {stopCondition === "duration" ? (
            <div className="form-group">
              <span className="form-sub-label">Dừng tưới sau thời gian được chỉ định</span>
              <label className="form-label" htmlFor="duration-input">
                Thời lượng, phút *
              </label>
              <input
                id="duration-input"
                type="number"
                min={1}
                max={1440}
                className="form-input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <span className="form-sub-label">Dừng tưới sau khi đạt thể tích nước</span>
              <label className="form-label" htmlFor="volume-input">
                Khối lượng, lít *
              </label>
              <input
                id="volume-input"
                type="number"
                min={10}
                max={50000}
                className="form-input"
                value={volumeLiters}
                onChange={(e) => setVolumeLiters(Number(e.target.value))}
                required
              />
            </div>
          )}

          {/* Lặp lại */}
          <div className="form-group form-group--toggle">
            <button
              type="button"
              role="switch"
              aria-checked={repeatEnabled}
              className={`toggle-switch ${repeatEnabled ? "toggle-switch--active" : ""}`}
              onClick={() => setRepeatEnabled(!repeatEnabled)}
            >
              <span className="toggle-switch__thumb" />
            </button>
            <span className="toggle-label">Lặp lại</span>
          </div>

          {repeatEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">Tần suất *</label>
                <select
                  className="form-select"
                  value={repeatFrequency}
                  onChange={(e) => setRepeatFrequency(e.target.value)}
                >
                  <option value="Hàng ngày">Hàng ngày</option>
                  <option value="Hàng tuần">Hàng tuần</option>
                  <option value="Hàng tháng">Hàng tháng</option>
                </select>
              </div>

              {repeatFrequency === "Hàng tuần" && (
                <div className="form-group">
                  <span className="form-label">Lặp lại vào:</span>
                  <div className="days-picker-row">
                    {daysList.map((d) => {
                      const isSelected = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          className={`day-circle-btn ${isSelected ? "day-circle-btn--active" : ""}`}
                          onClick={() => toggleDay(d.key)}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn--primary">
              Tạo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
