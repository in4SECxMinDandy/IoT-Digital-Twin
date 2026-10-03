interface StatusPillProps {
  label: string;
  tone: "normal" | "warning" | "critical" | "invalid" | "online" | "offline" | "pending" | "neutral";
}

export function StatusPill({ label, tone }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}
