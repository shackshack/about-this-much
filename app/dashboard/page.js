"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getGuestProfile, getGuestLogs } from "../../lib/guestStore";
import MetricRing from "../../components/MetricRing";
import LogModal from "../../components/LogModal";
import SaveProgressBanner from "../../components/SaveProgressBanner";

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

  const movementDaysThisWeek = new Set(
    weekLogs.filter((l) => l.tracker === "movement" && l.movement_tier !== "none").map((l) => l.log_date)
  ).size;

  const mealLogsThisWeek = weekLogs.filter((l) => l.tracker === "meal_source");
  const homeCookedPct = mealLogsThisWeek.length
    ? Math.round((mealLogsThisWeek.filter((l) => l.meal_source === "home_cooked").length / mealLogsThisWeek.length) * 100)
    : null;

  return (
    <div className="container">
      <h2 style={{ color: "var(--atm-purple)" }}>Today</h2>

      {!userId && <SaveProgressBanner />}

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1rem" }}>
        <button onClick={() => setActiveTracker("water")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Water" value={water} target={profile.water_target_oz} unit="oz" color="#00CFFF" icon="💧" />
        </button>
        <button onClick={() => setActiveTracker("sugar")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Sugar" value={sugar} target={profile.sugar_target_g} unit="g" color="#FF4F81" icon="🍬" />
        </button>
        <button onClick={() => setActiveTracker("fiber")} style={{ border: "none", background: "none" }}>
          <MetricRing label="Fiber" value={fiber} target={profile.fiber_target_g} unit="g" color="#FFC300" icon="🌾" />
        </button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>Protein today</p>
        <p style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>{Math.round(protein)}g</p>
        <button className="btn-secondary" style={{ marginTop: "8px" }} onClick={() => setActiveTracker("protein")}>+ Log protein</button>
      </div>

      <button className="card" style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "none" }} onClick={() => setActiveTracker("movement")}>
        <p style={{ fontWeight: 600, margin: 0 }}>Movement</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          Active {movementDaysThisWeek} day{movementDaysThisWeek === 1 ? "" : "s"} this week — tap to log today
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
