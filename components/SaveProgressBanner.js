"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SaveProgressBanner({ startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // Stash the newsletter choice so it can be applied to the profile
    // once the account actually exists (after the magic-link confirms).
    localStorage.setItem("atm_pending_newsletter_optin", newsletter ? "1" : "0");
    await supabase.auth.signInWithOtp({ email });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="card" style={{ marginBottom: "1rem", background: "#F3EEFB" }}>
        <p style={{ margin: 0, fontSize: "14px" }}>Check your email for a link to finish saving your progress.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className="card"
        style={{ width: "100%", textAlign: "left", marginBottom: "1rem", border: "1px solid var(--atm-purple)" }}
        onClick={() => setOpen(true)}
      >
        <p style={{ margin: 0, fontWeight: 600, color: "var(--atm-purple)" }}>Save your progress so it's never lost</p>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>Free, takes 10 seconds</p>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}>
      <input
        type="email" required placeholder="you@email.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: "10px", borderRadius: "10px", border: "1px solid var(--border)" }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
        <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
        Keep me posted on new features
      </label>
      <button type="submit" className="btn-primary">Send sign-in link</button>
    </form>
  );
}
