import { AlertTriangle, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts";

import { formatReading, formatRelativeTime, formatTimestamp, formatWithUnit } from "../lib/format";
import type { SoilThresholds } from "../lib/garden-layout";
import type { Alarm, Telemetry } from "../types";
import type { SensorDisplayItem } from "./SensorsTable";

interface SensorDetailModalProps {
  sensor: SensorDisplayItem | null;
  isOpen: boolean;
  /** History for the currently selected device, straight from the telemetry API. */
  telemetry: Telemetry[];
  telemetryDeviceId: string | null;
  thresholds: SoilThresholds;
  alarms: Alarm[];
  onClose: () => void;
}

const CHART_POINTS = 60;

function chartLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
}

export function SensorDetailModal({
  sensor,
  isOpen,
  telemetry,
  telemetryDeviceId,
  thresholds,
  alarms,
  onClose
}: SensorDetailModalProps) {
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);

  if (!isOpen || !sensor) return null;

  // The chart can only describe the device whose history is loaded. Showing another
  // board's curve under this sensor's name would be a lie, so it is gated on a match.
  const historyMatches = Boolean(sensor.deviceId) && telemetryDeviceId === sensor.deviceId;
  const samples = historyMatches ? telemetry.slice(-CHART_POINTS) : [];
  const latest = samples.at(-1);
  const openAlarms = alarms.filter((alarm) => alarm.status === "OPEN");

  // A row with no deviceId is not backed by a real device in the API, so the figure
  // carried on that row is a placeholder and must not be shown as a reading.
  const backedByDevice = Boolean(sensor.deviceId);
  const soilMoisturePct = latest?.soilMoisturePct ?? (backedByDevice ? sensor.moisturePct : null);

  const chartData = samples.map((sample) => ({
    time: chartLabel(sample.timestamp),
    moisture: sample.soilMoisturePct,
    temperature: sample.temperatureC
  }));

  return (
    <div className="modal-backdrop modal-backdrop--transparent" onClick={onClose}>
      <div className="modal-container modal-sensor-detail" onClick={(e) => e.stopPropagation()}>
        <div className="sensor-modal-header">
          <div className="sensor-modal-header__title">
            <h3 className="sensor-name">{sensor.name}</h3>
            <span className="sensor-crop-tag">{sensor.cropType}</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Đóng" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {!backedByDevice && (
          <p className="sensor-modal-note">
            Dòng này không gắn với thiết bị nào có thật trong API, nên không có số đo để hiển thị.
          </p>
        )}

        <div className="sensor-metrics-list">
          <div className="sensor-metric-row">
            <span className="metric-label">Độ ẩm đất (LM393)</span>
            <span className="metric-val font-bold text-primary">
              {soilMoisturePct === null ? "—" : formatWithUnit(soilMoisturePct, "%")}
            </span>
          </div>

          <div className="sensor-metric-row">
            <span className="metric-label">Nhiệt độ (DHT11)</span>
            <span className="metric-val">{formatWithUnit(latest?.temperatureC, "°C")}</span>
          </div>

          <div className="sensor-metric-row">
            <span className="metric-label">Độ ẩm không khí (DHT11)</span>
            <span className="metric-val">{formatWithUnit(latest?.airHumidityPct, "%", 0)}</span>
          </div>

          <div className="sensor-metric-row">
            <span className="metric-label">Trạng thái</span>
            <span className={`metric-val ${sensor.status === "On" ? "status-val-active" : "text-muted"}`}>
              <span className="active-dot" /> {sensor.status === "On" ? "Hoạt động" : "Tạm ngắt"}
            </span>
          </div>

          <div className="sensor-metric-row">
            <span className="metric-label">Cập nhật lần cuối</span>
            <span className="metric-val text-muted">{formatRelativeTime(latest?.timestamp)}</span>
          </div>
        </div>

        <div className="view-details-toggle">
          <button
            type="button"
            className="toggle-link-btn"
            onClick={() => setShowExtendedDetails(!showExtendedDetails)}
          >
            <span>{showExtendedDetails ? "Thu gọn chi tiết" : "Xem chi tiết mẫu"}</span>
            {showExtendedDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showExtendedDetails && (
          <div className="extended-details-box">
            <div className="ext-row">
              <span>Giá trị thô (soilRaw):</span>
              <strong>{latest?.soilRaw != null ? latest.soilRaw : "—"}</strong>
            </div>
            <div className="ext-row">
              <span>Đã làm mượt:</span>
              <strong>{formatWithUnit(latest?.smoothedSoilMoisturePct, "%")}</strong>
            </div>
            <div className="ext-row">
              <span>Mẫu hợp lệ:</span>
              <strong className={latest?.valid ? "text-success" : "text-error"}>
                {latest ? (latest.valid ? "Có" : `Không · ${latest.invalidFields.join(", ") || "không rõ trường"}`) : "—"}
              </strong>
            </div>
            <div className="ext-row">
              <span>Thời điểm nhận:</span>
              <strong>{formatTimestamp(latest?.receivedAt)}</strong>
            </div>
          </div>
        )}

        <div className="sensor-alarms-summary">
          <div className="alarm-summary-row">
            <span className="alarm-label">Cảnh báo đang mở</span>
            {openAlarms.length === 0 ? (
              <span className="alarm-val text-muted">Không có cảnh báo</span>
            ) : (
              <span className="alarm-pill-badge">
                <AlertTriangle size={11} aria-hidden="true" /> {openAlarms.length} cảnh báo
              </span>
            )}
          </div>
          {openAlarms[0] && (
            <div className="alarm-summary-row">
              <span className="alarm-label">Gần nhất</span>
              <span className="alarm-val text-muted">{openAlarms[0].message}</span>
            </div>
          )}
        </div>

        <div className="sensor-mini-chart-section">
          <div className="mini-chart-header">
            <Clock size={13} className="text-muted" />
            <span>
              {samples.length > 0 ? `${samples.length} mẫu gần nhất` : "Lịch sử telemetry"}
            </span>
          </div>

          <div className="mini-chart-wrapper">
            {samples.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -26, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} minTickGap={28} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <ReferenceLine y={thresholds.normalMinPct} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
                  <ReferenceLine y={thresholds.warningMinPct} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
                  {/* Gaps stay gaps: an invalid sample is not interpolated into a value. */}
                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="sensor-chart-empty">
                {historyMatches
                  ? "Chưa có mẫu telemetry nào cho thiết bị này."
                  : "Chọn thiết bị này trong bảng cảm biến để tải lịch sử của nó."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
