export function getLast7Dates() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates; // oldest first, today last
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function Timeline({ loggedDates, todayStr, onSelectDay }) {
  const dates = getLast7Dates();

  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 4px" }}>
      {dates.map((dateStr) => {
        const isToday = dateStr === todayStr;
        const hasEntries = loggedDates.has(dateStr);
        const dow = new Date(dateStr + "T00:00:00").getDay();
        return (
          <button
            key={dateStr}
            onClick={() => !isToday && onSelectDay(dateStr)}
            style={{ background: "none", border: "none", textAlign: "center", padding: 0, cursor: isToday ? "default" : "pointer" }}
          >
            <div
              style={{
                width: isToday ? "14px" : "10px",
                height: isToday ? "14px" : "10px",
                borderRadius: "50%",
                margin: "0 auto 4px",
                background: hasEntries ? "var(--atm-purple)" : "transparent",
                border: hasEntries ? "none" : "2px solid #ccc",
              }}
            />
            <span style={{ fontSize: "10px", color: isToday ? "var(--atm-purple)" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>
              {DAY_LETTERS[dow]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
