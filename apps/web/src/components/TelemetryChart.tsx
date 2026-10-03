import { Activity } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { Telemetry } from "../types";

interface TelemetryChartProps {
  telemetry: Telemetry[];
  limit: 50 | 200 | 1000;
  onLimitChange: (limit: 50 | 200 | 1000) => void;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TelemetryChart({ telemetry, limit, onLimitChange }: TelemetryChartProps) {
  const chartData = telemetry.map((entry) => ({
    timestamp: entry.timestamp,
    temperature: entry.temperatureC,
    humidity: entry.airHumidityPct,
    soil: entry.smoothedSoilMoisturePct ?? entry.soilMoisturePct
  }));

  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">History</p>
          <h2 id="chart-title">Telemetry trend</h2>
        </div>
        <label className="history-limit">
          <span>Readings</span>
          <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value) as 50 | 200 | 1000)}>
            <option value={50}>50</option>
            <option value={200}>200</option>
            <option value={1000}>1000</option>
          </select>
        </label>
      </div>
      {chartData.length === 0 ? (
        <div className="empty-state">No telemetry has been recorded for this device.</div>
      ) : (
        <div className="chart-wrap" aria-label="Temperature, air humidity, and soil moisture history">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <XAxis dataKey="timestamp" tickFormatter={formatTime} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleString()} />
              <Line type="monotone" dataKey="temperature" stroke="#d65f36" strokeWidth={2} dot={false} name="Temperature C" />
              <Line type="monotone" dataKey="humidity" stroke="#3285a8" strokeWidth={2} dot={false} name="Air humidity %" />
              <Line type="monotone" dataKey="soil" stroke="#2f835e" strokeWidth={2} dot={false} name="Soil moisture %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-dot legend-dot--temperature" />Temperature</span>
        <span><i className="legend-dot legend-dot--humidity" />Air humidity</span>
        <span><i className="legend-dot legend-dot--soil" />Soil moisture</span>
      </div>
      <p className="history-caption">Showing {telemetry.length} latest readings for this device.</p>
    </section>
  );
}
