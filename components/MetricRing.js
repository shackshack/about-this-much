export default function MetricRing({ label, value, target, unit, color, icon }) {
  const pct = Math.min(value / target, 1);
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - pct);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#eee" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="26" fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" fontSize="18">{icon}</text>
      </svg>
      <p style={{ fontSize: "12px", fontWeight: 600, margin: "4px 0 0" }}>
        {Math.round(value * 10) / 10}/{target}{unit}
      </p>
      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{label}</p>
    </div>
  );
}
