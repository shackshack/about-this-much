// direction: "goal" (more is good, e.g. water/fiber/protein/movement) -> shifts toward green as it climbs
//            "limit" (less is good, e.g. sugar) -> stays neutral until near/over 100%, then shifts red
export default function MetricRing({ label, value, target, unit, baseColor, icon, direction = "goal" }) {
  const pct = Math.min(value / target, 1);
  const overPct = Math.max(value / target - 1, 0); // how far past 100%, for "limit" metrics
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - pct);

  let numberColor = "var(--text)";

  if (direction === "goal") {
    if (pct > 0.5) {
      const t = (pct - 0.5) / 0.5;
      numberColor = mixColor("#1c1c1e", "#1a9e5c", t);
    }
  } else {
    const dangerT = Math.max(pct - 0.7, 0) / 0.3 + overPct;
    numberColor = mixColor("#1c1c1e", "#c0392b", Math.min(dangerT, 1));
  }

  const overAmount = Math.round((value - target) * 10) / 10;
  const isOver = overAmount > 0;

  return (
    <div style={{ textAlign: "center", minHeight: "108px" }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#eee" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="26" fill="none"
          stroke={baseColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        <text x="32" y="37" textAnchor="middle" fontSize="18">{icon}</text>
      </svg>
      <p style={{
        fontSize: "12px", fontWeight: 600, margin: "4px 0 0",
        color: numberColor, transition: "color 0.3s ease"
      }}>
        {Math.round(value * 10) / 10}/{target}{unit}
      </p>
      {isOver && (
        <p style={{ fontSize: "10px", fontWeight: 700, margin: "1px 0 0", color: direction === "goal" ? "#1a9e5c" : "#c0392b" }}>
          {direction === "goal" ? `+${overAmount}${unit}` : `+${overAmount}${unit} over`}
        </p>
      )}
      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{label}</p>
    </div>
  );
}

function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
