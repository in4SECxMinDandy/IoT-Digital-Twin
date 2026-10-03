interface AvgMoistureCardProps {
  moisturePct: number | null | undefined;
}

export function AvgMoistureCard({ moisturePct }: AvgMoistureCardProps) {
  const displayVal = typeof moisturePct === "number" && Number.isFinite(moisturePct) ? Math.round(moisturePct) : 36;

  let statusText = "Trung bình";
  let statusColor = "var(--color-accent)";
  if (displayVal < 30) {
    statusText = "Cần tưới";
    statusColor = "var(--color-alert)";
  } else if (displayVal > 70) {
    statusText = "Ẩm cao";
    statusColor = "var(--color-primary)";
  }

  return (
    <div className="card metric-card">
      <div className="metric-card__label">Độ ẩm đất trung bình</div>
      <div className="metric-card__value metric-card__value--primary">
        {displayVal}%
      </div>
      <div className="metric-card__footer">
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: statusColor,
          fontWeight: 500
        }}>
          <span className="status-dot" style={{ background: statusColor }}></span>
          {statusText}
        </span>
      </div>
    </div>
  );
}
