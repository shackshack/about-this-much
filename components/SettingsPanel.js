"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getGuestProfile, setGuestProfile, clearGuestData } from "../lib/guestStore";

const TARGETS = {
  women: { water: 73, sugar: 25, fiber: 25, protein: 46 },
  men: { water: 100, sugar: 36, fiber: 38, protein: 56 },
};

export default function SettingsPanel({ userId, profile, onClose, onUpdated }) {
  const [group, setGroup] = useState(profile.target_group);
  const [breakfast, setBreakfast] = useState(profile.breakfast_time || "08:00");
  const [lunch, setLunch] = useState(profile.lunch_time || "12:30");
  const [dinner, setDinner] = useState(profile.dinner_time || "18:30");

  const save = async () => {
    const t = TARGETS[group];
    const updates = {
      target_group: group,
      breakfast_time: breakfast, lunch_time: lunch, dinner_time: dinner,
      water_target_oz: t.water, sugar_target_g: t.sugar, fiber_target_g: t.fiber, protein_target_g: t.protein,
    };
    if (userId) {
      await supabase.from("profiles").update(updates).eq("id", userId);
    } else {
      setGuestProfile({ ...getGuestProfile(), ...updates });
    }
    onUpdated();
    onClose();
  };

  const resetData = async () => {
    if (!confirm("This clears all your logged entries. Your targets stay the same. Continue?")) return;
    if (userId) {
      await supabase.from("logs").delete().eq("user_id", userId);
    } else {
      // keep profile, clear logs only
      localStorage.setItem("atm_guest_logs", "[]");
    }
    onUpdated();
    onClose();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 60 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "1.25rem", width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>Settings</h3>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "4px 12px" }}>Close</button>
        </div>

        {!userId && (
          <div className="card" style={{ marginBottom: "1rem", background: "#F3EEFB" }}>
            <p style={{ margin: 0, fontSize: "13px" }}>
              You're using this without an account. Changes here save to this device only —
              save your progress (from the dashboard) to keep settings synced everywhere.
            </p>
          </div>
        )}

        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>Guideline group</p>
          <div style={{ display: "flex", gap: "10px" }}>
            {["women", "men"].map((g) => (
              <button key={g} onClick={() => setGroup(g)} className={g === group ? "btn-primary" : "btn-secondary"} style={{ flex: 1, textTransform: "capitalize" }}>
                {g}
              </button>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>Changing this resets your water/sugar/fiber/protein targets to that group's defaults.</p>
        </div>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>Meal times</p>
          {[["Breakfast", breakfast, setBreakfast], ["Lunch", lunch, setLunch], ["Dinner", dinner, setDinner]].map(([label, value, setter]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "14px" }}>{label}</label>
              <input type="time" value={value} onChange={(e) => setter(e.target.value)} />
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ width: "100%", marginBottom: "1rem" }} onClick={save}>Save changes</button>

        <button className="btn-secondary" style={{ width: "100%", marginBottom: "8px", color: "var(--atm-red)" }} onClick={resetData}>
          Reset all logged data
        </button>

        {userId && (
          <button className="btn-secondary" style={{ width: "100%" }} onClick={signOut}>Sign out</button>
        )}
      </div>
    </div>
  );
}
