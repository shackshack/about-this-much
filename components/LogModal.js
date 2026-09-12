"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { addGuestLog, upsertGuestDailyLog, deleteGuestLog, getGuestLogs } from "../lib/guestStore";
import trackers from "../data/trackers.json";

const QUANTITIES = [1, 2, 3];

// userId is null for guests — everything writes to local storage instead.
// targetDate lets this modal log for "today" (default) or a specific past date (backdating yesterday).
export default function LogModal({ tracker, userId, onClose, onLogged, targetDate }) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  const [category, setCategory] = useState(null);
  const [item, setItem] = useState(null);
  const [customGrams, setCustomGrams] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [savedQuickAdds, setSavedQuickAdds] = useState([]);
  const [mealTodayValue, setMealTodayValue] = useState(null);
  const [dayEntries, setDayEntries] = useState([]);
  const [expandedContainer, setExpandedContainer] = useState(null); // water: which container's partial-amount picker is open

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
    if (tracker !== "meal_source") return;
    if (userId) {
      supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", tracker).eq("log_date", dateStr).maybeSingle()
        .then(({ data }) => setMealTodayValue(data));
    } else {
      setMealTodayValue(getGuestLogs().find((l) => l.tracker === tracker && l.log_date === dateStr) || null);
    }
  }, [tracker, userId, dateStr]);

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
  };

  const undoOne = (matchFn) => {
    const matches = dayEntries.filter(matchFn);
    if (matches.length === 0) return;
    const mostRecent = matches.reduce((a, b) => (a.logged_at > b.logged_at ? a : b));
    removeEntry(mostRecent);
  };

  const upsertMealSource = async (fields) => {
    if (userId) {
      const { data: existing } = await supabase.from("logs").select("*").eq("user_id", userId).eq("tracker", "meal_source").eq("log_date", dateStr).maybeSingle();
      if (existing) {
        if (existing.meal_source === fields.meal_source) {
          await supabase.from("logs").delete().eq("id", existing.id);
        } else {
          await supabase.from("logs").update(fields).eq("id", existing.id);
        }
      } else {
        await supabase.from("logs").insert({ user_id: userId, tracker: "meal_source", log_date: dateStr, ...fields });
      }
    } else {
      upsertGuestDailyLog("meal_source", fields, "meal_source", dateStr);
    }
    onLogged();
    onClose();
  };

  const DayEntriesList = ({ describe }) =>
    dayEntries.length > 0 && (
      <div style={{ marginBottom: "12px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 4px" }}>Logged so far today:</p>
        {dayEntries.map((l) => (
          <div key={l.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px" }}>{describe(l)}</span>
            <button onClick={() => removeEntry(l)} className="btn-secondary" style={{ padding: "2px 8px", fontSize: "11px" }}>Remove</button>
          </div>
        ))}
      </div>
    );

  // ---- WATER: tap a container = log it full, immediately. Partial amount is an optional expand. ----
  if (tracker === "water") {
    return (
      <Sheet onClose={onClose} title="Log water">
        <List>
          {trackers.water.containers.map((c) => {
            const isExpanded = expandedContainer === c.label;
            return (
              <div key={c.label}>
                <TapButton
                  count={dayEntries.filter((l) => l.item_name === c.label && l.quantity === 1).length}
                  onTap={() => logEntry({ category: "container", item_name: c.label, unit: `${c.oz}oz`, quantity: 1, water_oz: c.oz })}
                  onUndo={() => undoOne((l) => l.item_name === c.label && l.quantity === 1)}
                >
                  {c.label} <span style={{ color: "var(--text-muted)" }}>({c.oz}oz)</span>
                </TapButton>
                <button
                  onClick={() => setExpandedContainer(isExpanded ? null : c.label)}
                  style={{ background: "none", border: "none", padding: "0 0 10px 4px", fontSize: "11px", color: "var(--text-muted)", textDecoration: "underline" }}
                >
                  Not full? Log a partial amount
                </button>
                {isExpanded && (
                  <div style={{ paddingLeft: "8px", marginBottom: "8px" }}>
                    <List>
                      {trackers.water.fractions.filter((f) => f !== 1).map((f) => (
                        <TapButton
                          key={f}
                          count={dayEntries.filter((l) => l.item_name === c.label && l.quantity === f).length}
                          onTap={() => logEntry({ category: "container", item_name: c.label, unit: `${c.oz}oz`, quantity: f, water_oz: Math.round(c.oz * f * 10) / 10 })}
                          onUndo={() => undoOne((l) => l.item_name === c.label && l.quantity === f)}
                        >
                          {f * 100}% <span style={{ color: "var(--text-muted)" }}>({Math.round(c.oz * f)}oz)</span>
                        </TapButton>
                      ))}
                    </List>
                  </div>
                )}
              </div>
            );
          })}
        </List>
      </Sheet>
    );
  }

  // ---- MOVEMENT (additive — log as many sessions as actually happened) ----
  if (tracker === "movement") {
    return (
      <Sheet onClose={onClose} title="Log movement">
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Log each session — a light walk this morning and a moderate one later both count.</p>
        <List>
          {trackers.movement.tiers.filter((t) => t.value !== "none").map((t) => {
            const matchFn = (l) => l.movement_tier === t.value;
            const count = dayEntries.filter(matchFn).length;
            return (
              <TapButton key={t.value} count={count} onTap={() => logEntry({ movement_tier: t.value })} onUndo={() => undoOne(matchFn)}>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {t.label} {t.doubleCredit && <span style={{ fontSize: "11px", color: "var(--atm-purple)" }}>2x credit</span>}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>{t.description}</p>
              </TapButton>
            );
          })}
        </List>
      </Sheet>
    );
  }

  // ---- STRENGTH: one log per day, plain toggle — more sessions isn't the goal, consistency is. ----
  if (tracker === "strength") {
    const logged = dayEntries.length > 0;
    return (
      <Sheet onClose={onClose} title="Log a strength session">
        <button
          className="card"
          style={{ width: "100%", textAlign: "left", border: logged ? "2px solid var(--atm-purple)" : "0.5px solid var(--border)" }}
          onClick={() => (logged ? removeEntry(dayEntries[0]) : logEntry({ item_name: "Strength session" }))}
        >
          <p style={{ fontWeight: 600, margin: 0 }}>{logged ? "Logged ✓ — tap to undo" : "Log a strength session for this day"}</p>
        </button>
      </Sheet>
    );
  }

  // ---- MEAL SOURCE (one answer per day — a genuine single daily choice) ----
  if (tracker === "meal_source") {
    return (
      <Sheet onClose={onClose} title="This day, mostly...">
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap your current selection again to clear it.</p>
        <List>
          {trackers.meal_source.options.map((o) => {
            const isSelected = mealTodayValue?.meal_source === o.value;
            return (
              <button
                key={o.value}
                onClick={() => upsertMealSource({ meal_source: o.value })}
                className="btn-secondary"
                style={{ textAlign: "left", border: isSelected ? "2px solid var(--atm-purple)" : "0.5px solid var(--border)" }}
              >
                {o.label} {isSelected && "✓"}
              </button>
            );
          })}
        </List>
      </Sheet>
    );
  }

  // ---- SUGAR / FIBER / PROTEIN (category > item > quantity) ----
  const data = trackers[tracker];
  const categories = Object.keys(data);

  const buildRow = (it, qty) => {
    const row = { category, item_name: it.item, unit: it.unit, quantity: qty };
    if (tracker === "sugar") {
      row.sugar_g = Math.round(it.g * qty * 10) / 10;
      if (it.fiberG) row.fiber_g = Math.round(it.fiberG * qty * 10) / 10;
      if (it.oz) row.water_oz = Math.round(it.oz * qty * 10) / 10;
    }
    if (tracker === "fiber") {
      row.fiber_g = Math.round(it.g * qty * 10) / 10;
      if (it.proteinG) row.protein_g = Math.round(it.proteinG * qty * 10) / 10;
    }
    if (tracker === "protein") {
      row.protein_g = Math.round(it.g * qty * 10) / 10;
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
      {savedQuickAdds.length > 0 && !category && (
        <>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>Your saved items</p>
          <List>
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
          </List>
        </>
      )}

      {!category ? (
        <>
          <DayEntriesList describe={describeItemLog} />
          <p style={{ fontWeight: 600, margin: "12px 0 8px" }}>Categories</p>
          <List>
            {categories.map((c) => (
              <OptionBtn key={c} onClick={() => setCategory(c)}>{c}</OptionBtn>
            ))}
          </List>
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
          <List>
            {data[category].map((it) => (
              <OptionBtn key={it.item} onClick={() => setItem(it)}>{it.item}</OptionBtn>
            ))}
          </List>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontWeight: 600, margin: 0 }}>{item.item} — how many?</p>
            <button className="btn-secondary" style={{ padding: "2px 10px", fontSize: "12px" }} onClick={() => setItem(null)}>Back</button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Tap again to add another.</p>
          <List>
            {QUANTITIES.map((q) => {
              const matchFn = (l) => l.item_name === item.item && l.quantity === q;
              const count = dayEntries.filter(matchFn).length;
              return (
                <TapButton key={q} count={count} onTap={() => logEntry(buildRow(item, q))} onUndo={() => undoOne(matchFn)}>
                  <span style={{ fontWeight: 700, fontSize: "16px" }}>{q}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>{item.unit} each</span>
                </TapButton>
              );
            })}
          </List>
        </>
      )}
    </Sheet>
  );
}

function Sheet({ title, children, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "1.25rem", width: "100%", maxWidth: "440px", maxHeight: "80vh", overflowY: "auto" }}
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

// Always a single vertical list, top to bottom — no 2-column wrapping that reads inconsistently.
function List({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{children}</div>;
}

function OptionBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="btn-secondary" style={{ textAlign: "left", width: "100%" }}>
      {children}
    </button>
  );
}

// Main button logs a new entry and shows a purple outline once count > 0, with a small "−"
// next to it that undoes just the most recent instance of that specific option.
function TapButton({ count, onTap, onUndo, children }) {
  const logged = count > 0;
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: "6px" }}>
      <button
        onClick={onTap}
        className="card"
        style={{ flex: 1, textAlign: "left", border: logged ? "2px solid var(--atm-purple)" : "0.5px solid var(--border)" }}
      >
        {children}
        {logged && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--atm-purple)", fontWeight: 700 }}>×{count}</span>}
      </button>
      {logged && (
        <button onClick={onUndo} className="btn-secondary" style={{ padding: "0 14px", fontSize: "16px", lineHeight: 1, fontWeight: 700 }} aria-label="Undo one">
          −
        </button>
      )}
    </div>
  );
}
