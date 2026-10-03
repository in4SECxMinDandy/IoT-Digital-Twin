import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { SoilThresholds } from "../lib/garden-layout";
import type { Telemetry } from "../types";

interface StatisticsChartProps {
  telemetry: Telemetry[];
  limit: 50 | 200 | 1000;
  thresholds: SoilThresholds;
  onLimitChange?: (limit: 50 | 200 | 1000) => void;
}

function axisLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * History for the selected device, straight from GET /api/devices/:id/telemetry.
 * There is no placeholder series: an empty window says so instead of drawing a
 * sample curve, and null samples stay as gaps rather than being interpolated.
 */
export function StatisticsChart({ telemetry, limit, thresholds, onLimitChange }: StatisticsChartProps) {
  const chartData = telemetry.map((sample) => ({
    label: axisLabel(sample.timestamp),
    moisture: sample.soilMoisturePct,
    airHumidity: sample.airHumidityPct
  }));

  return (
    <div className="card statistics-card" id="statistics-card">
      <div className="statistics-card__header">
        <div>
          <h3 className="card-title">Thống kê</h3>
          <p className="card-subtitle">
            {telemetry.length > 0
              ? `${telemetry.length} mẫu đã tải · tối đa ${limit}`
              : "Chưa có mẫu nào được tải"}
          </p>
        </div>
        {onLimitChange && (
          <select
            className="select-limit"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as 50 | 200 | 1000)}
            title="Số mẫu hiển thị"
          >
            <option value={50}>50 mẫu</option>
            <option value={200}>200 mẫu</option>
            <option value={1000}>1000 mẫu</option>
          </select>
        )}
      </div>

      <div className="statistics-chart-wrap">
        {telemetry.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tick={{ fill: "#64748b", fontSize: 11 }}
                minTickGap={44}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                domain={[0, 100]}
                unit="%"
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === "number" ? `${value.toFixed(1)}%` : "—",
                  name === "moisture" ? "Độ ẩm đất" : "Độ ẩm không khí"
                ]}
                labelFormatter={(label) => `Thời gian: ${label}`}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
              />

              {/* The two thresholds the backend actually classifies with. */}
              <ReferenceLine
                y={thresholds.normalMinPct}
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: `NORMAL ≥ ${thresholds.normalMinPct}%`, fill: "#047857", fontSize: 10, position: "insideTopRight" }}
              />
              <ReferenceLine
                y={thresholds.warningMinPct}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: `CRITICAL < ${thresholds.warningMinPct}%`, fill: "#b45309", fontSize: 10, position: "insideBottomRight" }}
              />

              <Line
                type="monotone"
                dataKey="moisture"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
                name="moisture"
              />
              <Line
                type="monotone"
                dataKey="airHumidity"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
                name="airHumidity"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="statistics-chart-empty">
            Chưa có telemetry cho thiết bị đang chọn. Bật simulator hoặc kiểm tra kết nối MQTT để có dữ liệu.
          </p>
        )}
      </div>

      <div className="chart-legend-row">
        <span className="legend-indicator">
          <span className="legend-line legend-line--blue" />
          <span className="legend-text">Độ ẩm đất</span>
        </span>
        <span className="legend-indicator">
          <span className="legend-line legend-line--green" />
          <span className="legend-text">Độ ẩm không khí</span>
        </span>
      </div>
    </div>
  );
}
