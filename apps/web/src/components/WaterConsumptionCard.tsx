interface WaterConsumptionCardProps {
  volumeLiters?: number;
  temperatureC?: number | null;
  humidityPct?: number | null;
}

export function WaterConsumptionCard({
  volumeLiters = 600,
  temperatureC,
  humidityPct
}: WaterConsumptionCardProps) {
  return (
    <div className="card metric-card">
      <div className="metric-card__label">Lượng nước hôm nay</div>
      <div className="metric-card__value metric-card__value--accent">
        {volumeLiters}
        <span style={{ fontSize: '20px', fontWeight: 500, marginLeft: '4px' }}>lít</span>
      </div>
      <div className="metric-card__footer">
        {typeof temperatureC === "number" && (
          <span>{temperatureC.toFixed(1)}°C</span>
        )}
        {typeof temperatureC === "number" && typeof humidityPct === "number" && (
          <span style={{ margin: '0 6px' }}>•</span>
        )}
        {typeof humidityPct === "number" && (
          <span>{humidityPct.toFixed(0)}% RH</span>
        )}
      </div>
    </div>
  );
}
