"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { setGuestProfile } from "../../lib/guestStore";

const TARGETS = {
  women: { water: 73, sugar: 25, fiber: 25, protein: 60 },
  men: { water: 100, sugar: 36, fiber: 38, protein: 75 },
};

export default function Onboarding() {
  const router = useRouter();
  const [group, setGroup] = useState("women");
  const [showBreakfast, setShowBreakfast] = useState(false);
  const [breakfast, setBreakfast] = useState("08:00");
  const [lunch, setLunch] = useState("12:30");
  const [dinner, setDinner] = useState("18:30");
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const t = TARGETS[group];
    const profile = {
      target_group: group,
      breakfast_time: showBreakfast ? breakfast : null,
      lunch_time: lunch,
      dinner_time: dinner,
      water_target_oz: t.water,
      sugar_target_g: t.sugar,
      fiber_target_g: t.fiber,
      protein_target_g: t.protein,
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("profiles").insert({ id: session.user.id, ...profile });
    } else {
      setGuestProfile(profile);
    }
    router.replace("/dashboard");
  };

  const t = TARGETS[group];

  return (
    <div className="container">
      <h1 style={{ color: "var(--atm-purple)", fontSize: "24px", margin: "0 0 2px" }}>About This Much</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "0 0 20px", fontWeight: 600 }}>Healthy Habits</p>
      <h2>Let's set your starting point</h2>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "-8px", marginBottom: "1rem" }}>
        No account needed to start — you can save your progress later if you want to.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>Which guideline fits you?</p>
        <div style={{ display: "flex", gap: "10px" }}>
          {["women", "men"].map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={g === group ? "btn-primary" : "btn-secondary"}
              style={{ flex: 1, textTransform: "capitalize" }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>Your daily starting targets</p>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "10px" }}>
          These are adjustable guideline-based starting points, not personal calculations.
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
          <span>💧 Water: {t.water}oz</span>
          <span>🍬 Sugar: {t.sugar}g</span>
          <span>🌾 Fiber: {t.fiber}g</span>
        </div>
        <div style={{ fontSize: "15px", marginTop: "6px" }}>🍗 Protein: {t.protein}g</div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>When do you usually eat?</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
          Used to time a single gentle reminder each day, not multiple interruptions.
        </p>
        {[
          ["Lunch", lunch, setLunch],
          ["Dinner", dinner, setDinner],
        ].map(([label, value, setter]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "14px" }}>{label}</label>
            <input type="time" value={value} onChange={(e) => setter(e.target.value)} />
          </div>
        ))}

        {showBreakfast ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "14px" }}>Breakfast</label>
            <input type="time" value={breakfast} onChange={(e) => setBreakfast(e.target.value)} />
          </div>
        ) : (
          <button className="btn-secondary" style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => setShowBreakfast(true)}>
            + Add breakfast reminder
          </button>
        )}
      </div>

      <button className="btn-primary" style={{ width: "100%" }} disabled={saving} onClick={finish}>
        {saving ? "Saving..." : "Start tracking"}
      </button>
    </div>
  );
}
