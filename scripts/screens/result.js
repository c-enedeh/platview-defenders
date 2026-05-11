import { navigateTo } from '../router.js';
import { countUpScore, cancelAllCountUps } from '../ui.js';
import { formatScore, formatTime } from '../score.js';

let currentParams = null;
let clickHandlers = [];

export function onEnter(params) {
  currentParams = params;
  const { scores, mode, level, timeRemaining, moves, breachPct, isNewPB, success } = params;

  // Status
  const iconEl  = document.getElementById('status-icon');
  const titleEl = document.getElementById('status-title');
  if (success) {
    iconEl.textContent = '✓';
    iconEl.classList.remove('failure');
    titleEl.textContent = 'MISSION COMPLETE';
  } else {
    iconEl.textContent = '✕';
    iconEl.classList.add('failure');
    titleEl.textContent = 'BREACH FAILURE';
  }

  // Stats
  document.getElementById('rs-time').textContent   = formatTime(timeRemaining ?? 0);
  document.getElementById('rs-moves').textContent  = moves ?? '—';
  document.getElementById('rs-breach').textContent = `${Math.round(breachPct ?? 0)}%`;

  // Score breakdown
  document.getElementById('bonus-base').textContent     = `+${formatScore(scores.baseScore)}`;
  document.getElementById('bonus-speed').textContent    = `+${formatScore(scores.speedBonus)}`;
  document.getElementById('bonus-accuracy').textContent = `+${formatScore(scores.accuracyBonus)}`;
  document.getElementById('bonus-moves').textContent    = `+${formatScore(scores.moveBonus)}`;
  document.getElementById('breakdown-total').textContent = formatScore(scores.totalScore);

  // Count-up main score
  const scoreEl = document.getElementById('result-score');
  scoreEl.textContent = '0';
  setTimeout(() => countUpScore(scoreEl, scores.totalScore, 1400), 200);

  // Personal best notice
  const pbEl = document.getElementById('pb-notice');
  if (isNewPB && success) {
    pbEl.classList.remove('hidden');
  } else {
    pbEl.classList.add('hidden');
  }

  // Next level button — disable at level 10
  const nextBtn = document.getElementById('btn-next-level');
  if (nextBtn) nextBtn.disabled = level >= 10;

  bindButtons(mode, level);
}

export function onExit() {
  cancelAllCountUps();
  clickHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
  clickHandlers = [];
}

function bindButtons(mode, level) {
  const addHandler = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
    clickHandlers.push({ el, fn });
  };

  const targetScreen = mode === 'rubiks' ? 'rubiks' : 'arena';
  addHandler('btn-retry',      () => navigateTo(targetScreen, { mode, level }));
  addHandler('btn-next-level', () => navigateTo(targetScreen, { mode, level: level + 1 }));
  addHandler('btn-lobby',      () => navigateTo('lobby'));
}
