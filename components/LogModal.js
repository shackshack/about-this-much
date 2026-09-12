"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { addGuestLog, upsertGuestDailyLog, deleteGuestLog, getGuestLogs } from "../lib/guestStore";
import trackers from "../data/trackers.json";

const SIZES = [
  { label: "Small", scalar: 0.7 },
  { label: "Typical", scalar: 1 },
  { label: "Large", scalar: 1.3 },
];
const QUANTITIES = [1, 2, 3];

const isSizeVariant = (unit) => /\b(small|medium|large)\b/i.test(unit || "");

// userId is null for guests — in that case everything writes to local storage instead.
// targetDate lets this same modal log for "today" (default) or a specific past date
// (used when backdating within the 24-hour-after edit window).
export default function LogModal({ tracker, userId, onClose, onLogged, targetDate }) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  const [category, setCategory] = useState(null);
  const [item, setItem] = useState(null);
  const [customGrams, setCustomGrams] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [savedQuickAdds, setSavedQuickAdds] = useState([]);
  const [todayValue, setTodayValue] = useState(null); // for one-per-day trackers (movement, meal_source)
  const [dayEntries, setDayEntries] = useState([]); // this tracker's entries for dateStr, for inline remove

  const refreshDayEntries = async () => {
    if (userId) {
      const { data } = await supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", dateStr);
      setDayEntries(data || []);
    } else {
      setDayEntries(getGuestLogs().filter((l) => l.tracker === tracker && l.log_date === dateStr));
    }
  };

  useEffect(() => {
    if (!userId) return;
    supabase.from("saved_quick_adds").select("*").eq("user_id", userId).eq("tracker", tracker)
      .then(({ data }) => setSavedQuickAdds(data || []));
  }, [tracker, userId]);

  useEffect(() => { refreshDayEntries(); }, [tracker, userId, dateStr]);

  useEffect(() => {
    if (tracker !== "movement" && tracker !== "meal_source") return;
    if (userId) {
      supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", dateStr).maybeSingle()
        .then(({ data }) => setTodayValue(data));
    } else {
      setTodayValue(getGuestLogs().find((l) => l.tracker === tracker && l.log_date === dateStr) || null);
    }
  }, [tracker, userId, dateStr]);

  // Logs an entry and KEEPS the modal open, so tapping the same item again stacks another one.
  const logEntry = async (row) => {
    if (userId) {
      await supabase.from("logs").insert({ user_id: userId, tracker, log_date: dateStr, ...row });
    } else {
      addGuestLog({ tracker, ...row }, dateStr);
    }
    onLogged();
    refreshDayEntries();
  };

  const removeEntry = async (log) => {
    if (userId) {
      await supabase.from("logs").delete().eq("id", log.id);
    } else {
      deleteGuestLog(log.id);
    }
    onLogged();
    refreshDayEntries();
    if (tracker === "movement" || tracker === "meal_source") setTodayValue(null);
  };

  // For movement/meal_source: replace this day's entry, or clear it if tapping the same value again.
  const upsertDaily = async (fields, matchField) => {
    if (userId) {
      const { data: existing } = await supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", dateStr).maybeSingle();
      if (existing) {
        if (existing[matchField] === fields[matchField]) {
          await supabase.from("logs").delete().eq("id", existing.id);
        } else {
          await supabase.from("logs").update(fields).eq("id", existing.id);
        }
      } else {
        await supabase.from("logs").insert({ user_id: userId, tracker, log_date: dateStr, ...fields });
      }
    } else {
      upsertGuestDailyLog(tracker, fields, matchField, dateStr);
    }
    onLogged();
    onClose();
  };

  const DayEntriesList = ({ describe }) =>
    dayEntries.length > 0 && (
      <div style={{ marginBottom: "12px" }}>
        {dayEntries.map((l) => (
          <div key={l.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px" }}>{describe(l)}</span>
            <button onClick={() => removeEntry(l)} className="btn-secondary" style={{ padding: "2px 8px", fontSize: "11px" }}>Remove</button>
          </div>
        ))}
      </div>
    );

  // ---- WATER ----
  if (tracker === "water") {
    return (
      <Sheet onClose={onClose} title="Log water">
        <DayEntriesList describe={(l) => `${l.item_name}${l.quantity !== 1 ? ` (${Math.round(l.quantity * 100)}%)` : ""} — ${l.water_oz}oz`} />
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
                  onClick={() => {
                    logEntry({
                      category: "container", item_name: category.label, unit: `${category.oz}oz`,
                      quantity: f, water_oz: Math.round(category.oz * f * 10) / 10,
                    });
                    setCategory(null);
                  }}
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
      <Sheet onClose={onClose} title="Log movement">
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
        <DayEntriesList describe={() => "Strength session"} />
        <button className="btn-primary" style={{ width: "100%" }} onClick={() => logEntry({ item_name: "Strength session" })}>
          Log a strength session for this day
        </button>
      </Sheet>
    );
  }

  // ---- MEAL SOURCE ----
  if (tracker === "meal_source") {
    return (
      <Sheet onClose={onClose} title="This day, mostly...">
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

  // ---- SUGAR / FIBER / PROTEIN (category > item > size or quantity) ----
  const data = trackers[tracker];
  const categories = Object.keys(data);

  const buildRow = (it, scalar) => {
    const row = { category, item_name: it.item, unit: it.unit, quantity: scalar };
    if (tracker === "sugar") {
      row.sugar_g = Math.round(it.g * scalar * 10) / 10;
      if (it.fiberG) row.fiber_g = Math.round(it.fiberG * scalar * 10) / 10;
      if (it.oz) row.water_oz = Math.round(it.oz * scalar * 10) / 10;
    }
    if (tracker === "fiber") {
      row.fiber_g = Math.round(it.g * scalar * 10) / 10;
      if (it.proteinG) row.protein_g = Math.round(it.proteinG * scalar * 10) / 10;
    }
    if (tracker === "protein") {
      row.protein_g = Math.round(it.g * scalar * 10) / 10;
    }
    return row;
  };

  const describeItemLog = (l) => {
    const grams = l.sugar_g || l.fiber_g || l.protein_g;
    return `${l.item_name}${grams ? ` — ${grams}g` : ""}`;
  };

  const saveQuickAdd = async () => {
    if (!saveLabel || !customGrams) return;
    const val = parseFloat(customGrams);
    const row = { user_id: userId, tracker, label: saveLabel };
    row[`${tracker}_g`] = val;
    await supabase.from("saved_quick_adds").insert(row);
    setSaveLabel(""); setCustomGrams("");
  };

  return (
    <Sheet onClose={onClose} title={`Log ${tracker}`}>
      <DayEntriesList describe={describeItemLog} />

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
                  logEntry(row);
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
                logEntry(row);
                setCustomGrams("");
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{category}</p>
            <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: "12px" }} onClick={() => setCategory(null)}>Back</button>
          </div>
          <Grid>
            {data[category].map((it) => (
              <OptionBtn key={it.item} onClick={() => setItem(it)}>{it.item}</OptionBtn>
            ))}
          </Grid>
        </>
      ) : isSizeVariant(item.unit) ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{item.item} — what size?</p>
            <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: "12px" }} onClick={() => setItem(null)}>Back</button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap again to add another.</p>
          <Grid>
            {SIZES.map((s) => (
              <OptionBtn key={s.label} onClick={() => logEntry(buildRow(item, s.scalar))}>
                {s.label}
              </OptionBtn>
            ))}
          </Grid>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{item.item} — how much?</p>
            <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: "12px" }} onClick={() => setItem(null)}>Back</button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap again to add another.</p>
          <Grid>
            {QUANTITIES.map((q) => (
              <OptionBtn key={q} onClick={() => logEntry(buildRow(item, q))}>
                <span style={{ fontWeight: 700 }}>{q}</span>{" "}
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>× {item.unit}</span>
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
