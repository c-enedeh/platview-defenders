const KEYS = {
  CODENAME: 'pvd:codename',
  HISTORY:  'pvd:history',
  SESSION:  'pvd:session',
  PB:       'pvd:pb:', // + mode suffix
};

// ── localStorage helpers (persistent data) ──
function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently skip */ }
}

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

// ── Codename — session-scoped (cleared on tab close / logout) ──
export function getCodename() {
  return safeSessionGet(KEYS.CODENAME, null);
}

export function setCodename(name) {
  safeSessionSet(KEYS.CODENAME, name);
}

// ── History — persistent across sessions ──
export function getHistory() {
  return safeGet(KEYS.HISTORY, []);
}

export function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift({ ...entry, date: Date.now() });
  if (history.length > 50) history.length = 50;
  safeSet(KEYS.HISTORY, history);
}

// ── Personal Best — persistent across sessions ──
export function getPersonalBest(mode) {
  return safeGet(KEYS.PB + mode, null);
}

export function updatePersonalBest(mode, score, level) {
  const current = getPersonalBest(mode);
  if (!current || score > current.score) {
    safeSet(KEYS.PB + mode, { score, level });
    return true; // new PB
  }
  return false;
}

export function getOverallBest() {
  let best = null;
  for (const mode of ['domain', 'threat', 'incident', 'rubiks']) {
    const pb = getPersonalBest(mode);
    if (pb && (!best || pb.score > best.score)) best = pb;
  }
  return best;
}

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

// ── Logout — clears session without touching history or PB ──
export function logout() {
  sessionStorage.removeItem(KEYS.CODENAME);
  sessionStorage.removeItem(KEYS.SESSION);
}
