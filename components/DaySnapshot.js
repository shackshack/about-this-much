"use client";
import { useState } from "react";
import MetricRing from "./MetricRing";
import LogModal from "./LogModal";
import trackers from "../data/trackers.json";

export default function DaySnapshot({ dateStr, logs, profile, userId, onClose, editable, onLogged }) {
  const [activeTracker, setActiveTracker] = useState(null);

  const sum = (field) => logs.reduce((a, l) => a + (l[field] || 0), 0);

  const movementLog = logs.find((l) => l.tracker === "movement");
  const tier = movementLog ? trackers.movement.tiers.find((t) => t.value === movementLog.movement_tier) : null;
  const strengthLog = logs.find((l) => l.tracker === "strength");
  const mealLog = logs.find((l) => l.tracker === "meal_source");

  const label = new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const wrap = (tracker, children) =>
    editable ? (
      <button onClick={() => setActiveTracker(tracker)} style={{ border: "none", background: "none", textAlign: "center", padding: 0 }}>
        {children}
      </button>
    ) : (
      <div>{children}</div>
    );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 55 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "1.25rem", width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <h3 style={{ margin: 0 }}>{label}</h3>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "4px 12px" }}>Close</button>
        </div>
        <p style={{ fontSize: "12px", color: editable ? "var(--atm-purple)" : "var(--text-muted)", marginBottom: "12px" }}>
          {editable ? "Still within your 24-hour edit window — tap any metric to add or adjust." : "Past days are locked — this is a look back, not editable."}
        </p>

        {logs.length === 0 && !editable ? (
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Nothing was logged this day.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem" }}>
              {wrap("fiber", <MetricRing label="Fiber" value={sum("fiber_g")} target={profile.fiber_target_g} unit="g" baseColor="#FFC300" icon="🌾" direction="goal" />)}
              {wrap("protein", <MetricRing label="Protein" value={sum("protein_g")} target={profile.protein_target_g || 46} unit="g" baseColor="#6A0DAD" icon="🍗" direction="goal" />)}
              {wrap("water", <MetricRing label="Water" value={sum("water_oz")} target={profile.water_target_oz} unit="oz" baseColor="#00CFFF" icon="💧" direction="goal" />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem" }}>
              {wrap("sugar", <MetricRing label="Sugar" value={sum("sugar_g")} target={profile.sugar_target_g} unit="g" baseColor="#FF4F81" icon="🍬" direction="limit" />)}
              {wrap("movement", (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "26px", margin: "0 0 4px" }}>🏃</p>
                  <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>{tier ? tier.label : "Not logged"}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Movement</p>
                </div>
              ))}
              {wrap("strength", (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "26px", margin: "0 0 4px", opacity: strengthLog ? 1 : 0.25 }}>🏋️</p>
                  <p style={{ fontSize: "12px", fontWeight: 600, margin: 0 }}>{strengthLog ? "Logged" : "Not logged"}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Strength</p>
                </div>
              ))}
            </div>
            {wrap("meal_source", (
              <div className="card">
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {mealLog ? (mealLog.meal_source === "home_cooked" ? "Mostly home cooked" : "Mostly eaten out") : "Not logged"}
                </p>
              </div>
            ))}
          </>
        )}

        {activeTracker && (
          <LogModal
            tracker={activeTracker}
            userId={userId}
            targetDate={dateStr}
            onClose={() => setActiveTracker(null)}
            onLogged={onLogged}
          />
        )}
      </div>
    </div>
  );
}
