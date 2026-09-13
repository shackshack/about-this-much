"use client";
import { useMemo, useState } from "react";
import trackers from "../data/trackers.json";

// Flattens every item across sugar/fiber/protein into one searchable list.
function buildIndex() {
  const index = [];
  for (const trackerName of ["fiber", "sugar", "protein"]) {
    const data = trackers[trackerName];
    for (const category of Object.keys(data)) {
      for (const it of data[category]) {
        index.push({ tracker: trackerName, category, item: it });
      }
    }
  }
  return index;
}

const INDEX = buildIndex();

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return INDEX.filter((entry) => entry.item.item.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div style={{ marginBottom: "1rem", position: "relative" }}>
      <input
        type="text"
        placeholder="Search any food, e.g. cauliflower"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "14px" }}
      />
      {results.length > 0 && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, padding: "8px" }}>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(r);
                setQuery("");
              }}
              className="btn-secondary"
              style={{ width: "100%", textAlign: "left", marginBottom: "6px", border: "none" }}
            >
              {r.item.item} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>— {r.tracker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
