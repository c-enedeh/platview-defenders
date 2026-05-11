import { createRubiksScene, getLevelData, getObjective, hintMoveToLabel } from '../modes/rubiksCube.js';
import { createTimer } from '../timer.js';
import { calculateScore, formatTime } from '../score.js';
import { getUserId } from '../storage.js';
import { saveResult } from '../supabase.js';
import { navigateTo } from '../router.js';

let scene         = null;
let timer         = null;
let currentLevel  = 1;
let levelData     = null;
let breachPct     = 0;
let solved        = false;
let active        = false;

const clickHandlers = [];

/* ── HUD hover-reveal ── */
let hudEl        = null;
let hudHideTimer = null;
let hudForceShow = false;

function showHUD(force = false) {
  hudEl?.classList.add('hud-visible');
  if (!force) {
    clearTimeout(hudHideTimer);
    hudHideTimer = setTimeout(hideHUD, 2500);
  }
}
function hideHUD() {
  if (hudForceShow) return;
  hudEl?.classList.remove('hud-visible');
}
function onHudZoneEnter() { clearTimeout(hudHideTimer); showHUD(); }
function onHudZoneLeave() { hudHideTimer = setTimeout(hideHUD, 1200); }
function onHudMouseMove()  { showHUD(); }

/* ── Hint overlay ── */
let hintOverlayTimer = null;

function showHintOverlay(move) {
  const overlay  = document.getElementById('rubiks-hint-overlay');
  const arrowEl  = document.getElementById('rubiks-hint-arrow');
  const textEl   = document.getElementById('rubiks-hint-text');
  if (!overlay || !move) return;

  const { arrow, text } = hintMoveToLabel(move);
  arrowEl.textContent = arrow;
  textEl.textContent  = text;

  /* Re-trigger CSS animation by forcing reflow */
  overlay.classList.add('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('hidden');

  clearTimeout(hintOverlayTimer);
  hintOverlayTimer = setTimeout(() => overlay.classList.add('hidden'), 4000);
}

function hideHintOverlay() {
  clearTimeout(hintOverlayTimer);
  document.getElementById('rubiks-hint-overlay')?.classList.add('hidden');
  scene?.clearHintHighlight();
}

/* ── Loading overlay helpers ── */
function showLoading(text = 'INITIALIZING 3D ENGINE…') {
  const el  = document.getElementById('rubiks-loading');
  const sub = document.getElementById('rubiks-loading-sub');
  if (el) el.classList.remove('hidden', 'fade-out');
  if (sub) sub.textContent = text;
}
function hideLoading() {
  const fill = document.querySelector('.rubiks-loading-fill');
  if (fill) fill.style.width = '100%';
  const el = document.getElementById('rubiks-loading');
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => el?.classList.add('hidden'), 420);
}

/* ══════════════════════════════════════════
   LIFECYCLE
══════════════════════════════════════════ */
export function onEnter({ level = 1 } = {}) {
  active       = true;
  currentLevel = level;
  levelData    = getLevelData(level);
  breachPct    = 0;
  solved       = false;

  hudEl = document.getElementById('rubiks-hud');
  const screen = document.getElementById('screen-rubiks');

  /* HUD content */
  const levelChip = document.getElementById('rubiks-level-chip');
  if (levelChip) levelChip.textContent = `LEVEL ${String(level).padStart(2, '0')}`;

  const objEl = document.getElementById('rubiks-objective');
  if (objEl) { objEl.textContent = getObjective(levelData); objEl.classList.add('visible'); }

  updateTimerDisplay(levelData.timeLimit, false);
  updateBreachBar(0);

  /* Hint button — only levels 1-3 */
  const hintBtn = document.getElementById('btn-rubiks-hint');
  if (hintBtn) hintBtn.classList.toggle('hidden', level > 3);

  /* Help drawer hint note — only levels 1-3 */
  const hintNote = document.getElementById('rubiks-help-hint-note');
  if (hintNote) hintNote.classList.toggle('hidden', level > 3);

  /* Ensure HUD trigger div exists */
  let trigger = screen?.querySelector('.rubiks-hud-trigger');
  if (!trigger && screen) {
    trigger = document.createElement('div');
    trigger.className = 'rubiks-hud-trigger';
    screen.appendChild(trigger);
  }

  /* HUD reveal events */
  if (trigger) {
    trigger.addEventListener('mouseenter', onHudZoneEnter);
    trigger.addEventListener('mouseleave', onHudZoneLeave);
    clickHandlers.push({ el: trigger, fn: onHudZoneEnter, evt: 'mouseenter' });
    clickHandlers.push({ el: trigger, fn: onHudZoneLeave, evt: 'mouseleave' });
  }
  hudEl?.addEventListener('mouseenter', onHudZoneEnter);
  hudEl?.addEventListener('mouseleave', onHudZoneLeave);
  screen?.addEventListener('mousemove', onHudMouseMove);

  /* Force-show HUD for first 3 s */
  hudForceShow = true;
  showHUD(true);
  setTimeout(() => { if (active) { hudForceShow = false; hideHUD(); } }, 3000);

  /* Buttons wired now (hint button wired after scene ready) */
  bindClick('btn-rubiks-exit', () => navigateTo('lobby'));
  bindClick('btn-rubiks-help', () => {
    document.getElementById('rubiks-help-drawer')?.classList.toggle('open');
  });

  renderMovesCounter(0);
  renderFaceDots(0);
  showLoading('INITIALIZING 3D ENGINE…');

  /* ── Defer scene creation until browser has laid out the screen ── */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!active) return;

      const canvas = document.getElementById('rubiks-canvas');
      if (!canvas) return;

      try {
        scene = createRubiksScene(canvas, {
          levelData,
          onSolved: (movesMade) => {
            if (!active) return;
            solved = true;
            timer?.stop();
            hideHintOverlay();
            handleSolved(timer?.getRemaining() ?? 0, movesMade);
          },
          onMove: (movesMade) => {
            if (!active) return;
            renderMovesCounter(movesMade);
            /* After player makes any move, dismiss the current hint overlay */
            hideHintOverlay();
          },
        });
      } catch (err) {
        console.error('[Rubiks] Scene creation failed:', err);
        const sub = document.getElementById('rubiks-loading-sub');
        if (sub) sub.textContent = 'FAILED TO LOAD 3D ENGINE — PLEASE REFRESH';
        return;
      }

      hideLoading();
      renderMovesCounter(0);

      /* Wire hint button now that scene is ready */
      if (level <= 3) {
        bindClick('btn-rubiks-hint', () => {
          const hint = scene?.getNextHint();
          if (!hint) {
            showHintOverlay(null); // no more hints
            return;
          }
          scene.activateHintHighlight();
          showHintOverlay(hint);
          /* Auto-show HUD so user sees the hint button feedback */
          showHUD();
        });
      }

      /* Timer */
      timer = createTimer({
        timeLimit: levelData.timeLimit,
        onTick: ({ remaining, urgent }) => {
          if (!active) return;
          updateTimerDisplay(remaining, urgent);
          const pct = ((levelData.timeLimit - remaining) / levelData.timeLimit) * 100;
          breachPct = pct;
          updateBreachBar(pct);
        },
        onExpire: () => {
          if (!active || solved) return;
          handleTimeExpired();
        },
      });
      timer.start();
    });
  });
}

export function onExit() {
  active = false;

  clearTimeout(hudHideTimer);
  clearTimeout(hintOverlayTimer);

  timer?.stop();
  timer = null;

  scene?.clearHintHighlight();
  scene?.dispose();
  scene = null;

  hudEl?.classList.remove('hud-visible');
  hudForceShow = false;

  /* Remove event listeners */
  const screen  = document.getElementById('screen-rubiks');
  const trigger = screen?.querySelector('.rubiks-hud-trigger');
  screen?.removeEventListener('mousemove', onHudMouseMove);
  hudEl?.removeEventListener('mouseenter', onHudZoneEnter);
  hudEl?.removeEventListener('mouseleave', onHudZoneLeave);
  trigger?.removeEventListener('mouseenter', onHudZoneEnter);
  trigger?.removeEventListener('mouseleave', onHudZoneLeave);

  clickHandlers.forEach(({ el, fn, evt }) => el?.removeEventListener(evt ?? 'click', fn));
  clickHandlers.length = 0;

  /* Reset UI state */
  document.getElementById('rubiks-overlay')?.classList.add('hidden');
  document.getElementById('rubiks-hint-overlay')?.classList.add('hidden');
  document.getElementById('rubiks-help-drawer')?.classList.remove('open');
  document.getElementById('rubiks-objective')?.classList.remove('visible');

  const loadEl = document.getElementById('rubiks-loading');
  if (loadEl) {
    loadEl.classList.remove('fade-out', 'hidden');
    const fill = loadEl.querySelector('.rubiks-loading-fill');
    if (fill) fill.style.width = '';
  }

  document.getElementById('rubiks-moves-ctr')?.remove();
  document.getElementById('rubiks-face-dots')?.remove();
}

/* ══════════════════════════════════════════
   DISPLAY HELPERS
══════════════════════════════════════════ */
function updateTimerDisplay(remaining, urgent) {
  const el = document.getElementById('rubiks-timer');
  if (!el) return;
  el.textContent = formatTime(remaining);
  el.classList.toggle('urgent', !!urgent);
}

function updateBreachBar(pct) {
  const fill = document.getElementById('rubiks-breach-fill');
  if (!fill) return;
  fill.style.width = `${Math.min(pct, 100)}%`;
  fill.style.backgroundColor =
    pct < 50 ? 'var(--breach-safe)' :
    pct < 75 ? 'var(--breach-warn)' :
               'var(--breach-danger)';
  const bar = fill.closest('[role="progressbar"]');
  if (bar) bar.setAttribute('aria-valuenow', Math.round(pct));
}

function renderMovesCounter(moves) {
  let el = document.getElementById('rubiks-moves-ctr');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rubiks-moves-ctr';
    el.className = 'rubiks-moves-counter';
    document.getElementById('screen-rubiks')?.appendChild(el);
  }
  el.innerHTML = `MOVES <strong>${moves}</strong>`;
}

function renderFaceDots(solvedCount) {
  let el = document.getElementById('rubiks-face-dots');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rubiks-face-dots';
    el.className = 'rubiks-faces-indicator';
    document.getElementById('screen-rubiks')?.appendChild(el);
  }
  el.innerHTML = Array.from({ length: 6 }, (_, i) =>
    `<div class="rubiks-face-dot${i < solvedCount ? ' solved' : ''}"></div>`
  ).join('');
}

/* ══════════════════════════════════════════
   OUTCOME HANDLERS
══════════════════════════════════════════ */
async function handleSolved(remaining, moves) {
  const scores = calculateScore({ timeRemaining: remaining, timeLimit: levelData.timeLimit, breachPct, moves });
  const entry  = { mode: 'rubiks', level: currentLevel, ...scores, breachPct, moves, timeRemaining: remaining };
  const { isNewPB } = await saveResult(getUserId(), entry).catch(err => {
    console.error('[Rubiks] saveResult:', err);
    return { isNewPB: false };
  });
  showRubiksOverlay('victory', { scores, remaining, moves, isNewPB });
}

function handleTimeExpired() {
  const moves  = scene?.getMoves() ?? 0;
  const scores = calculateScore({ timeRemaining: 0, timeLimit: levelData.timeLimit, breachPct: 100, moves });
  const entry  = { mode: 'rubiks', level: currentLevel, ...scores, breachPct: 100, moves, timeRemaining: 0 };
  saveResult(getUserId(), entry).catch(err => console.error('[Rubiks] saveResult (expired):', err));
  showRubiksOverlay('defeat', { scores, remaining: 0, moves, isNewPB: false });
}

function showRubiksOverlay(type, { scores, remaining, moves, isNewPB }) {
  const overlay    = document.getElementById('rubiks-overlay');
  const iconEl     = document.getElementById('rubiks-aro-icon');
  const titleEl    = document.getElementById('rubiks-aro-title');
  const subtitleEl = document.getElementById('rubiks-aro-subtitle');
  const actionsEl  = document.getElementById('rubiks-aro-actions');
  if (!overlay) return;

  const isVictory = type === 'victory';
  iconEl.textContent  = isVictory ? '⬡' : '✕';
  iconEl.className    = `aro-icon ${isVictory ? 'victory' : 'defeat'}`;
  titleEl.textContent = isVictory ? 'CUBE SOLVED' : 'TIME EXPIRED';
  titleEl.className   = `aro-title ${isVictory ? 'victory' : 'defeat'}`;
  subtitleEl.textContent = isVictory
    ? `Solved in ${moves} move${moves !== 1 ? 's' : ''} — ${formatTime(remaining)} remaining`
    : 'The cube remains unsolved. Try again.';

  actionsEl.innerHTML = '';

  if (isVictory) {
    actionsEl.appendChild(makeBtn('→ SEE BREAKDOWN', 'btn btn-primary btn-md', () => {
      overlay.classList.add('hidden');
      navigateTo('result', { mode: 'rubiks', level: currentLevel, scores, timeRemaining: remaining, moves, breachPct, isNewPB, success: true });
    }));
  } else {
    actionsEl.appendChild(makeBtn('↺ RETRY LEVEL', 'btn btn-ghost btn-md', () => {
      overlay.classList.add('hidden');
      onExit();
      onEnter({ level: currentLevel });
    }));
    actionsEl.appendChild(makeBtn('✕ EXIT TO RESULT', 'btn btn-danger btn-sm', () => {
      overlay.classList.add('hidden');
      navigateTo('result', { mode: 'rubiks', level: currentLevel, scores, timeRemaining: 0, moves, breachPct: 100, isNewPB: false, success: false });
    }));
  }

  overlay.classList.remove('hidden');
}

/* ── Helpers ── */
function bindClick(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', fn);
  clickHandlers.push({ el, fn, evt: 'click' });
}

function makeBtn(text, className, fn) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', fn);
  clickHandlers.push({ el: btn, fn, evt: 'click' });
  return btn;
}
