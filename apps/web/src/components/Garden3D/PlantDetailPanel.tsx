import type { ReactNode } from "react";
import { CircuitBoard, Clock, Cpu, Droplets, Thermometer, X } from "lucide-react";

import { formatReading, formatRelativeTime, formatTimestamp, formatWithUnit } from "../../lib/format";
import type { PlantLayout } from "../../lib/garden-layout";
import type { Device, EnvironmentStatus } from "../../types";
import type { PlantVisualState } from "./scene-types";

type Tone = "normal" | "warning" | "critical" | "invalid" | "online" | "offline";

const ENVIRONMENT_TONE: Record<EnvironmentStatus, Tone> = {
  NORMAL: "normal",
  WARNING: "warning",
  CRITICAL: "critical",
  INVALID: "invalid"
};

const ENVIRONMENT_LABEL: Record<EnvironmentStatus, string> = {
  NORMAL: "NORMAL",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
  INVALID: "KHÔNG RÕ"
};

function Pill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`g3d-pill g3d-pill--${tone}`}>{label}</span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="g3d-detail__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

interface PlantDetailPanelProps {
  plant: PlantLayout;
  device: Device | null;
  state: PlantVisualState;
  onClose(): void;
  onViewHistory(): void;
}

/**
 * Readings are grouped under the physical sensor that produced them, so the panel
 * states where each number came from instead of presenting one undifferentiated
 * list of values.
 */
export function PlantDetailPanel({ plant, device, state, onClose, onViewHistory }: PlantDetailPanelProps) {
  const online = state.deviceStatus === "ONLINE";
  const environment = online ? state.environment : "INVALID";

  return (
    <aside className="g3d-panel" aria-labelledby="g3d-plant-title">
      <header className="g3d-panel__header">
        <div className="g3d-panel__titles">
          <h3 id="g3d-plant-title" className="g3d-panel__title">{plant.plantName}</h3>
          <p className="g3d-panel__subtitle">
            {device ? `${device.name} · ${device.deviceId}` : "Chưa gắn thiết bị"}
          </p>
        </div>
        <button type="button" className="g3d-icon-btn" onClick={onClose} aria-label="Đóng bảng chi tiết" title="Đóng">
          <X size={16} />
        </button>
      </header>

      {!device ? (
        <p className="g3d-panel__empty">
          Chưa có thiết bị nào được gắn vào {plant.plantName}. Gắn một ESP32 để cây này có số liệu.
        </p>
      ) : (
        <>
          <div className="g3d-panel__status-row">
            <Pill label={online ? "ONLINE" : "OFFLINE"} tone={online ? "online" : "offline"} />
            <Pill label={ENVIRONMENT_LABEL[environment]} tone={ENVIRONMENT_TONE[environment]} />
          </div>

          {!online && (
            <p className="g3d-panel__note">
              Thiết bị ngoại tuyến. Các số liệu dưới đây là lần báo cuối cùng, không phải giá trị hiện tại.
            </p>
          )}

          <section className="g3d-detail">
            <h4 className="g3d-detail__sensor">
              <Thermometer size={13} aria-hidden="true" /> DHT11
            </h4>
            <dl className="g3d-detail__list">
              <Row label="Nhiệt độ">
                <span className="g3d-value">{formatWithUnit(state.temperatureC, "°C")}</span>
              </Row>
              <Row label="Độ ẩm không khí">
                <span className="g3d-value">{formatWithUnit(state.airHumidityPct, "%", 0)}</span>
              </Row>
            </dl>
          </section>

          <section className="g3d-detail">
            <h4 className="g3d-detail__sensor">
              <Droplets size={13} aria-hidden="true" /> LM393
            </h4>
            <dl className="g3d-detail__list">
              <Row label="Độ ẩm đất">
                <span className="g3d-value g3d-value--strong">{formatWithUnit(state.soilMoisturePct, "%")}</span>
              </Row>
              <Row label="Ngưỡng của cây">
                <span className="g3d-value g3d-value--quiet">
                  WARNING &lt; {plant.thresholds.normalMinPct}% · CRITICAL &lt; {plant.thresholds.warningMinPct}%
                </span>
              </Row>
            </dl>
          </section>

          <section className="g3d-detail">
            <dl className="g3d-detail__list">
              <Row label="Cập nhật">
                <span className="g3d-value g3d-value--quiet">
                  <Clock size={12} aria-hidden="true" /> {formatRelativeTime(state.updatedAt)}
                </span>
              </Row>
              <Row label="Thời điểm">
                <span className="g3d-value g3d-value--quiet">{formatTimestamp(state.updatedAt)}</span>
              </Row>
            </dl>
          </section>

          <button type="button" className="g3d-panel__action" onClick={onViewHistory}>
            Xem biểu đồ lịch sử của {device.deviceId}
          </button>
        </>
      )}
    </aside>
  );
}

interface DeviceDetailPanelProps {
  device: Device;
  onClose(): void;
}

function attributeNumber(attributes: Record<string, unknown>, key: string): number | null {
  const value = attributes[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function DeviceDetailPanel({ device, onClose }: DeviceDetailPanelProps) {
  const attributes = device.attributes as {
    firmwareVersion?: string;
    sensors?: string[];
    sampleIntervalSeconds?: number;
  };
  const state = device.currentState;
  const online = device.status === "ONLINE";
  const simulated = state.irrigationSimulationActive;

  return (
    <aside className="g3d-panel" aria-labelledby="g3d-device-title">
      <header className="g3d-panel__header">
        <div className="g3d-panel__titles">
          <h3 id="g3d-device-title" className="g3d-panel__title">{device.name}</h3>
          <p className="g3d-panel__subtitle">
            <Cpu size={12} aria-hidden="true" /> {device.type} · {device.deviceId}
          </p>
        </div>
        <button type="button" className="g3d-icon-btn" onClick={onClose} aria-label="Đóng bảng chi tiết" title="Đóng">
          <X size={16} />
        </button>
      </header>

      <div className="g3d-panel__status-row">
        <Pill label={online ? "ONLINE" : "OFFLINE"} tone={online ? "online" : "offline"} />
        <Pill label={ENVIRONMENT_LABEL[state.environment]} tone={ENVIRONMENT_TONE[state.environment]} />
      </div>

      <section className="g3d-detail">
        <dl className="g3d-detail__list">
          <Row label="Last Seen">
            <span className="g3d-value g3d-value--quiet">
              {formatTimestamp(device.lastSeen)} · {formatRelativeTime(device.lastSeen)}
            </span>
          </Row>
          <Row label="Mode">
            <span className="g3d-value">{state.mode}</span>
          </Row>
          <Row label="Environment">
            <span className="g3d-value">{ENVIRONMENT_LABEL[state.environment]}</span>
          </Row>
          <Row label="Mô phỏng tưới">
            {simulated ? (
              <span className="g3d-value g3d-value--strong">
                <CircuitBoard size={12} aria-hidden="true" /> Đang hoạt động
              </span>
            ) : (
              <span className="g3d-value g3d-value--quiet">Tắt</span>
            )}
          </Row>
          <Row label="LED xanh">
            <span className="g3d-value g3d-value--quiet">{state.greenPattern}</span>
          </Row>
        </dl>
      </section>

      <p className="g3d-panel__note">
        Mô phỏng tưới bằng LED. Hệ thống này không có máy bơm, van hay cảm biến lưu lượng.
      </p>

      <section className="g3d-detail">
        <h4 className="g3d-detail__sensor">
          <CircuitBoard size={13} aria-hidden="true" /> Thiết bị
        </h4>
        <dl className="g3d-detail__list">
          <Row label="Firmware">
            <span className="g3d-value g3d-value--quiet">{attributes.firmwareVersion || "chưa báo về"}</span>
          </Row>
          <Row label="Cảm biến">
            <span className="g3d-value g3d-value--quiet">{attributes.sensors?.join(", ") || "—"}</span>
          </Row>
          <Row label="Chu kỳ lấy mẫu">
            <span className="g3d-value g3d-value--quiet">
              {attributes.sampleIntervalSeconds != null ? `${attributes.sampleIntervalSeconds} s` : "—"}
            </span>
          </Row>
          <Row label="Hiệu chuẩn đất">
            <span className="g3d-value g3d-value--quiet">
              {formatReading(attributeNumber(device.attributes, "dryRaw"), 0)} khô /{" "}
              {formatReading(attributeNumber(device.attributes, "wetRaw"), 0)} ướt
            </span>
          </Row>
        </dl>
      </section>
    </aside>
  );
}
