import { Activity, Cpu, Droplets, Thermometer, Wind } from "lucide-react";
import type { Device } from "../../types";
import "./digital-twin.css";

interface SystemOverviewProps {
  devices: Device[];
}

function calculateSystemHealth(devices: Device[]): number {
  if (devices.length === 0) return 0;
  const onlineCount = devices.filter(d => d.status === "ONLINE").length;
  return Math.round((onlineCount / devices.length) * 100);
}

function getAverageMetric(devices: Device[], key: "soilMoisturePct" | "temperatureC" | "airHumidityPct"): number | null {
  const values = devices
    .filter(d => d.status === "ONLINE")
    .map(d => d.currentState.lastTelemetry?.[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function SystemOverview({ devices }: SystemOverviewProps) {
  const systemHealth = calculateSystemHealth(devices);
  const avgSoil = getAverageMetric(devices, "soilMoisturePct");
  const avgTemp = getAverageMetric(devices, "temperatureC");
  const avgHumidity = getAverageMetric(devices, "airHumidityPct");

  const onlineDevices = devices.filter(d => d.status === "ONLINE").length;
  const totalDevices = devices.length;

  return (
    <div className="dt-system-overview">
      <div className="dt-system-overview__header">
        <div className="dt-system-overview__title-row">
          <div className="dt-system-overview__icon">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="dt-system-overview__title">SYSTEM STATUS</h3>
            <p className="dt-system-overview__subtitle">Real-time digital twin monitoring</p>
          </div>
        </div>
        <div className="dt-live-badge">
          <span className="dt-live-dot" />
          LIVE
        </div>
      </div>

      <div className="dt-system-overview__body">
        {/* System Health Ring */}
        <div className="dt-health-ring">
          <svg className="dt-health-ring__svg" viewBox="0 0 120 120">
            <circle
              className="dt-health-ring__track"
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgba(56, 189, 248, 0.1)"
              strokeWidth="8"
            />
            <circle
              className="dt-health-ring__progress"
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#healthGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${systemHealth * 3.27} 327`}
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="dt-health-ring__content">
            <div className="dt-health-ring__value">{systemHealth}%</div>
            <div className="dt-health-ring__label">Health</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="dt-metrics-grid">
          <div className="dt-metric-card">
            <div className="dt-metric-card__icon dt-metric-card__icon--devices">
              <Cpu size={18} />
            </div>
            <div className="dt-metric-card__content">
              <div className="dt-metric-card__value">{onlineDevices}/{totalDevices}</div>
              <div className="dt-metric-card__label">Devices Online</div>
            </div>
          </div>

          <div className="dt-metric-card">
            <div className="dt-metric-card__icon dt-metric-card__icon--soil">
              <Droplets size={18} />
            </div>
            <div className="dt-metric-card__content">
              <div className="dt-metric-card__value">
                {avgSoil !== null ? `${avgSoil}%` : "—"}
              </div>
              <div className="dt-metric-card__label">Avg Soil Moisture</div>
            </div>
          </div>

          <div className="dt-metric-card">
            <div className="dt-metric-card__icon dt-metric-card__icon--temp">
              <Thermometer size={18} />
            </div>
            <div className="dt-metric-card__content">
              <div className="dt-metric-card__value">
                {avgTemp !== null ? `${avgTemp}°C` : "—"}
              </div>
              <div className="dt-metric-card__label">Avg Temperature</div>
            </div>
          </div>

          <div className="dt-metric-card">
            <div className="dt-metric-card__icon dt-metric-card__icon--humidity">
              <Wind size={18} />
            </div>
            <div className="dt-metric-card__content">
              <div className="dt-metric-card__value">
                {avgHumidity !== null ? `${avgHumidity}%` : "—"}
              </div>
              <div className="dt-metric-card__label">Avg Air Humidity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="dt-system-overview__footer">
        <div className="dt-status-indicator">
          <span className="dt-status-indicator__dot dt-status-indicator__dot--success" />
          <span className="dt-status-indicator__text">All Systems Operational</span>
        </div>
        <div className="dt-timestamp">
          Last sync: {new Date().toLocaleTimeString('vi-VN')}
        </div>
      </div>
    </div>
  );
}
