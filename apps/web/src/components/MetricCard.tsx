import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  valid: boolean;
}

export function MetricCard({ icon: Icon, label, value, unit, valid }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="metric-card__value">
          {valid ? value : "N/A"}
          {valid && <span>{unit}</span>}
        </p>
      </div>
    </article>
  );
}
