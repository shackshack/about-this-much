"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getGuestProfile, getGuestLogs, deleteGuestLog } from "../../lib/guestStore";
import MetricRing from "../../components/MetricRing";
import LogModal from "../../components/LogModal";
import SaveProgressBanner from "../../components/SaveProgressBanner";
import SettingsPanel from "../../components/SettingsPanel";
import Timeline, { getLast7Dates } from "../../components/Timeline";
import DaySnapshot from "../../components/DaySnapshot";
import trackers from "../../data/trackers.json";

const RING_ROW_STYLE = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem", alignItems: "start" };

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rangeLogs, setRangeLogs] = useState([]); // last 7 days, all trackers
  const [activeTracker, setActiveTracker] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTodayList, setShowTodayList] = useState(false);
  const [viewingDate, setViewingDate] = useState(null); // set when a past dot is tapped

  const todayStr = new Date().toISOString().slice(0, 10);
  const earliestStr = getLast7Dates()[0];

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      setUserId(session.user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!p) { router.replace("/onboarding"); return; }
      setProfile(p);

      const { data: logs } = await supabase.from("logs").select("*").eq("user_id", session.user.id).gte("log_date", earliestStr);
      setRangeLogs(logs || []);
    } else {
      const p = getGuestProfile();
      if (!p) { router.replace("/onboarding"); return; }
      setProfile(p);

      const allLogs = getGuestLogs();
      setRangeLogs(allLogs.filter((l) => l.log_date >= earliestStr));
    }
  };

  useEffect(() => { load(); }, []);

  const deleteEntry = async (log) => {
    if (userId) {
      await supabase.from("logs").delete().eq("id", log.id);
    } else {
      deleteGuestLog(log.id);
    }
    load();
  };

  if (!profile) return null;

  const todayLogs = rangeLogs.filter((l) => l.log_date === todayStr);
  const loggedDates = new Set(rangeLogs.map((l) => l.log_date));

  const sum = (field) => todayLogs.reduce((a, l) => a + (l[field] || 0), 0);
  const water = sum("water_oz");
  const sugar = sum("sugar_g");
  const fiber = sum("fiber_g");
  const protein = sum("protein_g");

  const todayMovementLog = todayLogs.find((l) => l.tracker === "movement");
  const todayTier = todayMovementLog
    ? trackers.movement.tiers.find((t) => t.value === todayMovementLog.movement_tier)
    : null;
  const movementFill = todayTier ? todayTier.fillFraction : 0;
  const movementDoubleCredit = todayTier?.doubleCredit;

  // Rolling 7-day window, not calendar week — matches the timeline exactly.
  const movementDaysThisWindow = new Set(
    rangeLogs.filter((l) => l.tracker === "movement" && l.movement_tier !== "none").map((l) => l.log_date)
  ).size;

  const strengthDaysThisWindow = new Set(
    rangeLogs.filter((l) => l.tracker === "strength").map((l) => l.log_date)
  ).size;

  const todayMealLog = todayLogs.find((l) => l.tracker === "meal_source");
  const mealLogsThisWindow = rangeLogs.filter((l) => l.tracker === "meal_source");
  const homeCookedPct = mealLogsThisWindow.length
    ? Math.round((mealLogsThisWindow.filter((l) => l.meal_source === "home_cooked").length / mealLogsThisWindow.length) * 100)
    : null;

  const describeLog = (l) => {
    if (l.tracker === "movement") return `Movement: ${l.movement_tier}`;
    if (l.tracker === "meal_source") return `Meal: ${l.meal_source === "home_cooked" ? "Home cooked" : "Eaten out"}`;
    if (l.tracker === "strength") return "Strength session";
    return `${l.tracker}: ${l.item_name || "custom"}${l.quantity && l.quantity !== 1 ? ` x${l.quantity}` : ""}`;
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: "var(--atm-purple)", margin: 0 }}>Today</h2>
        <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
      </div>

      <Timeline loggedDates={loggedDates} todayStr={todayStr} onSelectDay={setViewingDate} />

      {!userId && <SaveProgressBanner />}

      {/* Row 1 — building up: fiber, protein, water */}
      <div className="card" style={RING_ROW_STYLE}>
        <button onClick={() => setActiveTracker("fiber")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Fiber" value={fiber} target={profile.fiber_target_g} unit="g" baseColor="#FFC300" icon="🌾" direction="goal" />
        </button>
        <button onClick={() => setActiveTracker("protein")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Protein" value={protein} target={profile.protein_target_g || 46} unit="g" baseColor="#6A0DAD" icon="🍗" direction="goal" />
        </button>
        <button onClick={() => setActiveTracker("water")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Water" value={water} target={profile.water_target_oz} unit="oz" baseColor="#00CFFF" icon="💧" direction="goal" />
        </button>
      </div>

      {/* Row 2 — behavior and limits: sugar (bottom-left), movement, strength */}
      <div className="card" style={RING_ROW_STYLE}>
        <button onClick={() => setActiveTracker("sugar")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Sugar" value={sugar} target={profile.sugar_target_g} unit="g" baseColor="#FF4F81" icon="🍬" direction="limit" />
        </button>

        <button onClick={() => setActiveTracker("movement")} style={{ border: "none", background: "none", textAlign: "center", minHeight: "108px" }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#eee" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke="#639922" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - movementFill)}
              transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
            <text x="32" y="37" textAnchor="middle" fontSize="18">🏃</text>
          </svg>
          <p style={{ fontSize: "12px", fontWeight: 600, margin: "4px 0 0" }}>
            {todayTier ? todayTier.label : "Not logged"} {movementDoubleCredit && <span style={{ color: "var(--atm-purple)" }}>2x</span>}
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Movement</p>
        </button>

        <button onClick={() => setActiveTracker("strength")} style={{ border: "none", background: "none", textAlign: "center", minHeight: "108px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "4px", height: "40px", alignItems: "center", fontSize: "26px" }}>
            {Array.from({ length: trackers.strength.weeklyTarget }).map((_, i) => (
              <span key={i} style={{ opacity: i < strengthDaysThisWindow ? 1 : 0.25 }}>🏋️</span>
            ))}
            {strengthDaysThisWindow > trackers.strength.weeklyTarget && (
              <span style={{ fontSize: "12px", color: "var(--atm-purple)", fontWeight: 600 }}>
                +{strengthDaysThisWindow - trackers.strength.weeklyTarget}
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", fontWeight: 600, margin: "4px 0 0" }}>
            {Math.min(strengthDaysThisWindow, trackers.strength.weeklyTarget)}/{trackers.strength.weeklyTarget} in last 7 days
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Strength</p>
        </button>
      </div>

      <button className="card" style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "none" }} onClick={() => setActiveTracker("movement")}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          Active {movementDaysThisWindow} day{movementDaysThisWindow === 1 ? "" : "s"} in the last 7 toward your 150 min goal
        </p>
      </button>

      <button className="card" style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "none" }} onClick={() => setActiveTracker("meal_source")}>
        <p style={{ fontWeight: 600, margin: 0 }}>
          Home cooked vs eaten out
          {todayMealLog && (
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--atm-purple)" }}>
              Today: {todayMealLog.meal_source === "home_cooked" ? "Home cooked" : "Eaten out"}
            </span>
          )}
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {homeCookedPct === null ? "No data yet in the last 7 days" : `${homeCookedPct}% home cooked over the last 7 days`} — tap to log today
        </p>
      </button>

      <button className="card" style={{ width: "100%", textAlign: "left", border: "none" }} onClick={() => setShowTodayList((s) => !s)}>
        <p style={{ fontWeight: 600, margin: 0 }}>{showTodayList ? "Hide" : "Show"} today's entries ({todayLogs.length})</p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>Made a mistake? Remove any entry here.</p>
      </button>

      {showTodayList && (
        <div style={{ marginTop: "8px" }}>
          {todayLogs.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Nothing logged yet today.</p>}
          {todayLogs.map((l) => (
            <div key={l.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", padding: "8px 12px" }}>
              <span style={{ fontSize: "13px" }}>{describeLog(l)}</span>
              <button onClick={() => deleteEntry(l)} className="btn-secondary" style={{ padding: "2px 10px", fontSize: "12px" }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {activeTracker && (
        <LogModal
          tracker={activeTracker}
          userId={userId}
          onClose={() => setActiveTracker(null)}
          onLogged={load}
        />
      )}

      {showSettings && (
        <SettingsPanel
          userId={userId}
          profile={profile}
          onClose={() => setShowSettings(false)}
          onUpdated={load}
        />
      )}

      {viewingDate && (
        <DaySnapshot
          dateStr={viewingDate}
          logs={rangeLogs.filter((l) => l.log_date === viewingDate)}
          profile={profile}
          onClose={() => setViewingDate(null)}
        />
      )}
    </div>
  );
}
