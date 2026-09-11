"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getGuestProfile, getGuestLogs } from "../../lib/guestStore";
import MetricRing from "../../components/MetricRing";
import LogModal from "../../components/LogModal";
import SaveProgressBanner from "../../components/SaveProgressBanner";
import trackers from "../../data/trackers.json";

const startOfWeekISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null); // null = guest
  const [profile, setProfile] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [weekLogs, setWeekLogs] = useState([]);
  const [activeTracker, setActiveTracker] = useState(null);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      setUserId(session.user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (!p) { router.replace("/onboarding"); return; }
      setProfile(p);

      const today = new Date().toISOString().slice(0, 10);
      const { data: tLogs } = await supabase.from("logs").select("*").eq("user_id", session.user.id).eq("log_date", today);
      setTodayLogs(tLogs || []);
      const { data: wLogs } = await supabase.from("logs").select("*").eq("user_id", session.user.id).gte("logged_at", startOfWeekISO());
      setWeekLogs(wLogs || []);
    } else {
      const p = getGuestProfile();
      if (!p) { router.replace("/onboarding"); return; }
      setProfile(p);

      const allLogs = getGuestLogs();
      const today = new Date().toISOString().slice(0, 10);
      setTodayLogs(allLogs.filter((l) => l.log_date === today));
      const weekStart = startOfWeekISO();
      setWeekLogs(allLogs.filter((l) => l.logged_at >= weekStart));
    }
  };

  useEffect(() => { load(); }, []);

  if (!profile) return null;

  const sum = (field) => todayLogs.reduce((a, l) => a + (l[field] || 0), 0);
  const water = sum("water_oz");
  const sugar = sum("sugar_g");
  const fiber = sum("fiber_g");
  const protein = sum("protein_g");

  // Movement: today's ring fill comes from the tier's fillFraction, out of a "full day" of 1.0
  const todayMovementLog = todayLogs.find((l) => l.tracker === "movement");
  const todayTier = todayMovementLog
    ? trackers.movement.tiers.find((t) => t.value === todayMovementLog.movement_tier)
    : null;
  const movementFill = todayTier ? todayTier.fillFraction : 0;
  const movementDoubleCredit = todayTier?.doubleCredit;

  const movementDaysThisWeek = new Set(
    weekLogs.filter((l) => l.tracker === "movement" && l.movement_tier !== "none").map((l) => l.log_date)
  ).size;

  // Strength: simple weekly counter, not a daily ring
  const strengthDaysThisWeek = new Set(
    weekLogs.filter((l) => l.tracker === "strength").map((l) => l.log_date)
  ).size;

  const mealLogsThisWeek = weekLogs.filter((l) => l.tracker === "meal_source");
  const homeCookedPct = mealLogsThisWeek.length
    ? Math.round((mealLogsThisWeek.filter((l) => l.meal_source === "home_cooked").length / mealLogsThisWeek.length) * 100)
    : null;

  return (
    <div className="container">
      <h2 style={{ color: "var(--atm-purple)" }}>Today</h2>

      {!userId && <SaveProgressBanner />}

      {/* Row 1 — building up: fiber, protein, water */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem" }}>
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
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem" }}>
        <button onClick={() => setActiveTracker("sugar")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Sugar" value={sugar} target={profile.sugar_target_g} unit="g" baseColor="#FF4F81" icon="🍬" direction="limit" />
        </button>

        <button onClick={() => setActiveTracker("movement")} style={{ border: "none", background: "none", textAlign: "center" }}>
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

        <button onClick={() => setActiveTracker("strength")} style={{ border: "none", background: "none", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "4px", height: "40px", alignItems: "center" }}>
            {Array.from({ length: trackers.strength.weeklyTarget }).map((_, i) => (
              <i
                key={i}
                className="ti ti-barbell"
                style={{ fontSize: "22px", color: i < strengthDaysThisWeek ? "#6A0DAD" : "#ddd" }}
                aria-hidden="true"
              />
            ))}
            {strengthDaysThisWeek > trackers.strength.weeklyTarget && (
              <span style={{ fontSize: "12px", color: "var(--atm-purple)", fontWeight: 600 }}>
                +{strengthDaysThisWeek - trackers.strength.weeklyTarget}
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", fontWeight: 600, margin: "4px 0 0" }}>
            {Math.min(strengthDaysThisWeek, trackers.strength.weeklyTarget)}/{trackers.strength.weeklyTarget} this week
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Strength</p>
        </button>
      </div>

      <button className="card" style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "none" }} onClick={() => setActiveTracker("movement")}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          Active {movementDaysThisWeek} day{movementDaysThisWeek === 1 ? "" : "s"} this week toward your 150 min goal
        </p>
      </button>

      <button className="card" style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "none" }} onClick={() => setActiveTracker("meal_source")}>
        <p style={{ fontWeight: 600, margin: 0 }}>Home cooked vs eaten out</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          {homeCookedPct === null ? "No data yet this week" : `${homeCookedPct}% home cooked this week`} — tap to log today
        </p>
      </button>

      {activeTracker && (
        <LogModal
          tracker={activeTracker}
          userId={userId}
          onClose={() => setActiveTracker(null)}
          onLogged={load}
        />
      )}
    </div>
  );
}
