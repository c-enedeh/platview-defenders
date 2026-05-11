import { formatScore, formatTime } from './score.js';

/* ── Timer display ── */
export function updateTimerDisplay(remaining, urgent) {
  const el = document.getElementById('hud-timer');
  if (!el) return;
  el.textContent = formatTime(remaining);
  el.classList.toggle('urgent', urgent);
}

/* ── Move counter ── */
export function updateMoveCounter(moves) {
  const el = document.getElementById('hud-moves');
  if (el) el.textContent = moves;
}

/* ── Breach meter ── */
export function updateBreachMeter(pct) {
  const fill  = document.getElementById('breach-fill');
  const label = document.getElementById('breach-pct');
  const bar   = document.querySelector('.breach-bar-wrapper');
  if (!fill || !label) return;

  const clamped = Math.min(100, Math.max(0, pct));
  fill.style.width = `${clamped}%`;

  const color =
    clamped < 50 ? 'var(--breach-safe)'   :
    clamped < 75 ? 'var(--breach-warn)'   : 'var(--breach-danger)';
  fill.style.backgroundColor = color;

  label.textContent = `${Math.round(clamped)}%`;

  if (bar) bar.setAttribute('aria-valuenow', Math.round(clamped));

  if (clamped >= 100) triggerBreachFlash();
}

/* ── Count-up animation ── */
const activeRafs = new Set();

export function countUpScore(targetEl, finalValue, durationMs = 1500) {
  if (!targetEl) return;
  const start = performance.now();

  function step(now) {
    const t     = Math.min((now - start) / durationMs, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    targetEl.textContent = formatScore(Math.round(eased * finalValue));
    if (t < 1) {
      const id = requestAnimationFrame(step);
      activeRafs.add(id);
    } else {
      targetEl.textContent = formatScore(finalValue);
    }
  }

  const id = requestAnimationFrame(step);
  activeRafs.add(id);
}

export function cancelAllCountUps() {
  activeRafs.forEach(id => cancelAnimationFrame(id));
  activeRafs.clear();
}

/* ── Breach flash ── */
export function triggerBreachFlash() {
  const existing = document.querySelector('.breach-flash-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'breach-flash-overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
}

/* ── Toast ── */
export function showToast(message, type = 'info', durationMs = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(10px)';
    setTimeout(() => toast.remove(), 320);
  }, durationMs);
}

/* ── Hint count update ── */
export function updateHintCount(n) {
  const el = document.getElementById('hint-count');
  if (el) el.textContent = `×${n}`;
  const btn = document.getElementById('btn-hint');
  if (btn) btn.disabled = n <= 0;
}

/* ── Submit button state ── */
export function enableSubmit(enabled) {
  const btn = document.getElementById('btn-submit-score');
  if (btn) btn.disabled = !enabled;
}

/* ── Glitch-in animation restart ── */
export function playGlitchIn(screenId) {
  const el = document.getElementById(`screen-${screenId}`);
  if (!el) return;
  el.classList.remove('screen-enter');
  void el.offsetWidth; // force reflow
  el.classList.add('screen-enter');
}
