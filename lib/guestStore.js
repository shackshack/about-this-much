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

export function clearGuestData() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
}

export function hasGuestData() {
  return !!getGuestProfile() || getGuestLogs().length > 0;
}
