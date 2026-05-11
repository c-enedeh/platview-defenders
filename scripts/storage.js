const KEYS = {
  CODENAME: 'pvd:codename',
  USER_ID:  'pvd:userid',
  SESSION:  'pvd:session',
};

// ── sessionStorage helpers (ephemeral login) ──
function safeSessionGet(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

// ── Codename — session-scoped ──
export function getCodename() {
  return safeSessionGet(KEYS.CODENAME, null);
}

export function setCodename(name) {
  safeSessionSet(KEYS.CODENAME, name);
}

// ── Supabase user ID — session-scoped ──
export function getUserId() {
  return safeSessionGet(KEYS.USER_ID, null);
}

export function setUserId(id) {
  safeSessionSet(KEYS.USER_ID, id);
}

// ── localStorage helpers (theme only) ──
function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

export { safeGet };

// ── Arena session — session-scoped ──
export function saveSession(data) {
  safeSessionSet(KEYS.SESSION, data);
}

export function loadSession() {
  return safeSessionGet(KEYS.SESSION, null);
}

export function clearSession() {
  sessionStorage.removeItem(KEYS.SESSION);
}

// ── Logout — clears session without touching any persistent data ──
export function logout() {
  sessionStorage.removeItem(KEYS.CODENAME);
  sessionStorage.removeItem(KEYS.USER_ID);
  sessionStorage.removeItem(KEYS.SESSION);
}
