// Lightweight local storage for people using the app without an account.
// Mirrors the shape of the Supabase tables closely enough that migrating
// a guest's data into a real account later is a straightforward copy.

const PROFILE_KEY = "atm_guest_profile";
const LOGS_KEY = "atm_guest_logs";

export function getGuestProfile() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setGuestProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getGuestLogs() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addGuestLog(log, dateStr) {
  const logs = getGuestLogs();
  const day = dateStr || new Date().toISOString().slice(0, 10);
  const entry = {
    ...log,
    id: crypto.randomUUID(),
    logged_at: new Date().toISOString(), // real time this was actually entered
    log_date: day, // which day it counts toward (can be backdated)
  };
  logs.push(entry);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return entry;
}

// For "one answer per day" trackers (movement, meal_source): replace that day's entry
// instead of stacking a new one. Tapping the same value again removes it (undo).
export function upsertGuestDailyLog(tracker, fields, matchField, dateStr) {
  const logs = getGuestLogs();
  const day = dateStr || new Date().toISOString().slice(0, 10);
  const idx = logs.findIndex((l) => l.tracker === tracker && l.log_date === day);

  if (idx !== -1) {
    const isSameValue = logs[idx][matchField] === fields[matchField];
    if (isSameValue) {
      logs.splice(idx, 1); // tapping the same value again clears it
    } else {
      logs[idx] = { ...logs[idx], ...fields, logged_at: new Date().toISOString() };
    }
  } else {
    logs.push({
      ...fields, tracker,
      id: crypto.randomUUID(),
      logged_at: new Date().toISOString(),
      log_date: day,
    });
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function deleteGuestLog(id) {
  const logs = getGuestLogs().filter((l) => l.id !== id);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function clearAllGuestLogs() {
  localStorage.setItem(LOGS_KEY, JSON.stringify([]));
}

export function clearGuestData() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
}

export function hasGuestData() {
  return !!getGuestProfile() || getGuestLogs().length > 0;
}
