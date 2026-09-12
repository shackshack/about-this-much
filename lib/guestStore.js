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

export function addGuestLog(log) {
  const logs = getGuestLogs();
  const entry = {
    ...log,
    id: crypto.randomUUID(),
    logged_at: new Date().toISOString(),
    log_date: new Date().toISOString().slice(0, 10),
  };
  logs.push(entry);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return entry;
}

// For "one answer per day" trackers (movement, meal_source): replace today's entry
// instead of stacking a new one. Tapping the same value again removes it (undo).
export function upsertGuestDailyLog(tracker, fields, matchField) {
  const logs = getGuestLogs();
  const today = new Date().toISOString().slice(0, 10);
  const idx = logs.findIndex((l) => l.tracker === tracker && l.log_date === today);

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
      log_date: today,
    });
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function deleteGuestLog(id) {
  const logs = getGuestLogs().filter((l) => l.id !== id);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// For trackers where only one entry per day makes sense (movement tier, meal source) —
// removes any existing entry for that tracker/day before adding the new one, instead of stacking.
export function replaceGuestDailyLog(tracker, log) {
  const today = new Date().toISOString().slice(0, 10);
  const logs = getGuestLogs().filter((l) => !(l.tracker === tracker && l.log_date === today));
  const entry = {
    ...log,
    tracker,
    id: crypto.randomUUID(),
    logged_at: new Date().toISOString(),
    log_date: today,
  };
  logs.push(entry);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  return entry;
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
