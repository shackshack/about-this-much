"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { addGuestLog, upsertGuestDailyLog } from "../lib/guestStore";
import trackers from "../data/trackers.json";

const MULTIPLIERS = [1, 2, 3];

// userId is null for guests — in that case everything writes to local storage instead.
export default function LogModal({ tracker, userId, onClose, onLogged }) {
  const [category, setCategory] = useState(null);
  const [item, setItem] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [fraction, setFraction] = useState(1);
  const [customGrams, setCustomGrams] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [savedQuickAdds, setSavedQuickAdds] = useState([]);
  const [todayValue, setTodayValue] = useState(null); // for one-per-day trackers (movement, meal_source)

  useEffect(() => {
    if (!userId) return; // saved quick-adds are an account feature for now
    supabase
      .from("saved_quick_adds")
      .select("*")
      .eq("user_id", userId)
      .eq("tracker", tracker)
      .then(({ data }) => setSavedQuickAdds(data || []));
  }, [tracker, userId]);

  // Load today's existing value for one-per-day trackers, so the current pick is highlighted.
  useEffect(() => {
    if (tracker !== "movement" && tracker !== "meal_source") return;
    const loadToday = async () => {
      const today = new Date().toISOString().slice(0, 10);
      if (userId) {
        const { data } = await supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", today).maybeSingle();
        setTodayValue(data);
      } else {
        const { getGuestLogs } = await import("../lib/guestStore");
        const logs = getGuestLogs();
        setTodayValue(logs.find((l) => l.tracker === tracker && l.log_date === today) || null);
      }
    };
    loadToday();
  }, [tracker, userId]);

  const insertLog = async (row) => {
    if (userId) {
      await supabase.from("logs").insert({ user_id: userId, tracker, ...row });
    } else {
      addGuestLog({ tracker, ...row });
    }
    onLogged();
    onClose();
  };

  // For movement/meal_source: replace today's entry, or clear it if tapping the same value again.
  const upsertDaily = async (fields, matchField) => {
    if (userId) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", today).maybeSingle();
      if (existing) {
        if (existing[matchField] === fields[matchField]) {
          await supabase.from("logs").delete().eq("id", existing.id);
        } else {
          await supabase.from("logs").update(fields).eq("id", existing.id);
        }
      } else {
        await supabase.from("logs").insert({ user_id: userId, tracker, ...fields });
      }
    } else {
      upsertGuestDailyLog(tracker, fields, matchField);
    }
    onLogged();
    onClose();
  };

  // ---- WATER ----
  if (tracker === "water") {
    return (
      <Sheet onClose={onClose} title="Log water">
        {!category ? (
          <Grid>
            {trackers.water.containers.map((c) => (
              <OptionBtn key={c.label} onClick={() => setCategory(c)}>
                {c.label} <span style={{ color: "var(--text-muted)" }}>({c.oz}oz)</span>
              </OptionBtn>
            ))}
          </Grid>
        ) : (
          <>
            <p style={{ fontWeight: 600, marginBottom: "10px" }}>{category.label}, how much?</p>
            <Grid>
              {trackers.water.fractions.map((f) => (
                <OptionBtn
                  key={f}
                  onClick={() =>
                    insertLog({
                      category: "container",
                      item_name: category.label,
                      unit: `${category.oz}oz`,
                      quantity: f,
                      water_oz: Math.round(category.oz * f * 10) / 10,
                    })
                  }
                >
                  {f === 1 ? "Full" : `${f * 100}%`}
                </OptionBtn>
              ))}
            </Grid>
          </>
        )}
      </Sheet>
    );
  }

  // ---- MOVEMENT ----
  if (tracker === "movement") {
    return (
      <Sheet onClose={onClose} title="Log today's movement">
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap your current selection again to clear it.</p>
        {trackers.movement.tiers.map((t) => {
          const isSelected = todayValue?.movement_tier === t.value;
          return (
            <button
              key={t.value}
              className="card"
              style={{ width: "100%", textAlign: "left", marginBottom: "8px", border: isSelected ? "2px solid var(--atm-purple)" : "0.5px solid var(--border)" }}
              onClick={() => upsertDaily({ movement_tier: t.value }, "movement_tier")}
            >
              <p style={{ fontWeight: 600, margin: 0 }}>
                {t.label} {t.doubleCredit && <span style={{ fontSize: "11px", color: "var(--atm-purple)" }}>2x credit</span>}
                {isSelected && <span style={{ float: "right", color: "var(--atm-purple)" }}>✓</span>}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>{t.description}</p>
            </button>
          );
        })}
      </Sheet>
    );
  }

  // ---- STRENGTH (separate weekly counter, not a daily ring) ----
  if (tracker === "strength") {
    return (
      <Sheet onClose={onClose} title="Log a strength session">
        <button
          className="btn-primary"
          style={{ width: "100%" }}
          onClick={() => insertLog({ item_name: "Strength session" })}
        >
          Log today's strength session
        </button>
      </Sheet>
    );
  }

  // ---- MEAL SOURCE ----
  if (tracker === "meal_source") {
    return (
      <Sheet onClose={onClose} title="Today, mostly...">
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap your current selection again to clear it.</p>
        <Grid>
          {trackers.meal_source.options.map((o) => {
            const isSelected = todayValue?.meal_source === o.value;
            return (
              <button
                key={o.value}
                onClick={() => upsertDaily({ meal_source: o.value }, "meal_source")}
                className="btn-secondary"
                style={{ textAlign: "left", border: isSelected ? "2px solid var(--atm-purple)" : "0.5px solid var(--border)" }}
              >
                {o.label} {isSelected && "✓"}
              </button>
            );
          })}
        </Grid>
      </Sheet>
    );
  }

  // ---- SUGAR / FIBER / PROTEIN (category > item > multiplier) ----
  const data = trackers[tracker];
  const categories = Object.keys(data);

  const logItem = (it) => {
    const row = { category: category, item_name: it.item, unit: it.unit, quantity: multiplier };
    if (tracker === "sugar") {
      row.sugar_g = Math.round(it.g * multiplier * 10) / 10;
      if (it.fiberG) row.fiber_g = Math.round(it.fiberG * multiplier * 10) / 10;
      if (it.oz) row.water_oz = Math.round(it.oz * multiplier * 10) / 10;
    }
    if (tracker === "fiber") {
      const g = it.skinToggle ? it.g : it.g; // skin-on default, matches spec
      row.fiber_g = Math.round(g * multiplier * 10) / 10;
      if (it.proteinG) row.protein_g = Math.round(it.proteinG * multiplier * 10) / 10;
    }
    if (tracker === "protein") {
      row.protein_g = Math.round(it.g * multiplier * 10) / 10;
    }
    insertLog(row);
  };

  const saveQuickAdd = async () => {
    if (!saveLabel || !customGrams) return;
    const val = parseFloat(customGrams);
    const row = { user_id: userId, tracker, label: saveLabel };
    row[`${tracker}_g`] = val;
    await supabase.from("saved_quick_adds").insert(row);
    setSaveLabel("");
    setCustomGrams("");
  };

  return (
    <Sheet onClose={onClose} title={`Log ${tracker}`}>
      {savedQuickAdds.length > 0 && !category && (
        <>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>Your saved items</p>
          <Grid>
            {savedQuickAdds.map((q) => (
              <OptionBtn
                key={q.id}
                onClick={() => {
                  const row = { category: "custom", item_name: q.label, quantity: 1 };
                  row[`${tracker}_g`] = q[`${tracker}_g`];
                  insertLog(row);
                }}
              >
                {q.label}
              </OptionBtn>
            ))}
          </Grid>
        </>
      )}

      {!category ? (
        <>
          <p style={{ fontWeight: 600, margin: "12px 0 8px" }}>Categories</p>
          <Grid>
            {categories.map((c) => (
              <OptionBtn key={c} onClick={() => setCategory(c)}>{c}</OptionBtn>
            ))}
          </Grid>
          <p style={{ fontWeight: 600, margin: "16px 0 8px" }}>Know the exact number?</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              type="number" placeholder="grams" value={customGrams}
              onChange={(e) => setCustomGrams(e.target.value)}
              style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid var(--border)" }}
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (!customGrams) return;
                const row = { category: "custom", item_name: "Custom entry", quantity: 1 };
                row[`${tracker}_g`] = parseFloat(customGrams);
                insertLog(row);
              }}
            >
              Log
            </button>
          </div>
          {userId && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="Save as (e.g. 'my protein bar')" value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid var(--border)" }}
              />
              <button className="btn-secondary" onClick={saveQuickAdd}>Save</button>
            </div>
          )}
        </>
      ) : !item ? (
        <>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>{category}</p>
          <Grid>
            {data[category].map((it) => (
              <OptionBtn key={it.item} onClick={() => setItem(it)}>{it.item}</OptionBtn>
            ))}
          </Grid>
        </>
      ) : (
        <>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>{item.item} — how much?</p>
          <Grid>
            {MULTIPLIERS.map((m) => (
              <OptionBtn key={m} onClick={() => { setMultiplier(m); logItem(item); }}>
                {m}x {item.unit}
              </OptionBtn>
            ))}
          </Grid>
        </>
      )}
    </Sheet>
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "1.25rem", width: "100%", maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "4px 12px" }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Grid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>{children}</div>;
}

function OptionBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="btn-secondary" style={{ textAlign: "left" }}>
      {children}
    </button>
  );
}
