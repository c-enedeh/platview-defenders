import { navigateTo } from '../router.js';
import { saveSession, addHistoryEntry, updatePersonalBest } from '../storage.js';
import { createTimer } from '../timer.js';
import { calculateScore } from '../score.js';
import { updateTimerDisplay, updateBreachMeter, updateMoveCounter, updateHintCount, enableSubmit, showToast } from '../ui.js';


import * as domainAlignment  from '../modes/domainAlignment.js';
import * as threatMatching   from '../modes/threatMatching.js';
import * as incidentResponse from '../modes/incidentResponse.js';

const MODE_MODULES = { domain: domainAlignment, threat: threatMatching, incident: incidentResponse };
const MODE_LABELS  = { domain: 'DOMAIN ALIGNMENT', threat: 'THREAT MATCHING', incident: 'INCIDENT RESPONSE' };

let timer       = null;
let state       = null;
let currentMode = null;
let currentLevel = 1;
let breachPct   = 0;
let solved      = false;

let clickHandlers = [];

let _uiHideTimer = null;
let _showUI      = null;

export function onEnter({ mode, level }) {
  currentMode  = mode;
  currentLevel = level;
  breachPct    = 0;
  solved       = false;

  saveSession({ mode, level });

  const mod      = MODE_MODULES[mode];
  const levelData = mod.getLevelData(level);

  // HUD
  document.getElementById('hud-level').textContent = `LEVEL ${String(level).padStart(2,'0')}`;
  document.getElementById('hud-mode').textContent  = MODE_LABELS[mode];
  document.getElementById('puzzle-title').textContent     = levelData.name;
  document.getElementById('puzzle-objective').textContent = mod.getObjective(levelData);

  // Reset UI state
  updateMoveCounter(0);
  updateBreachMeter(0);
  updateTimerDisplay(levelData.timeLimit, false);
  enableSubmit(false);
  updateHintCount(3);

  // Show/hide target board (only for domain alignment)
  const targetWrapper = document.getElementById('target-wrapper');
  if (targetWrapper) targetWrapper.style.display = mode === 'domain' ? '' : 'none';

  // Generate puzzle state
  state = mod.generatePuzzle(level);

  // Init board
  const boardEl  = document.getElementById('puzzle-board');
  const targetEl = document.getElementById('target-board');

  if (mode === 'domain') {
    domainAlignment.initBoard(state, boardEl, targetEl, (result) => {
      if (result === 'solved') handleSolved();
    });
  } else if (mode === 'threat') {
    threatMatching.initBoard(state, boardEl, (result, breach) => {
      if (result === 'solved') handleSolved();
      if (result === 'breach') {
        breachPct = breach;
        updateBreachMeter(breachPct);
        if (breachPct >= 100) handleBreachFull();
      }
    });
  } else if (mode === 'incident') {
    incidentResponse.initBoard(
      state, boardEl,
      (pct) => { breachPct = pct; updateBreachMeter(pct); },
      (killed, target) => { showToast(`${killed}/${target} threats neutralized`, 'info'); },
      (result) => {
        if (result === 'solved') handleSolved();
        else handleBreachFull();
      }
    );
  }

  // Timer
  timer = createTimer({
    timeLimit:  levelData.timeLimit,
    onTick:     ({ remaining, urgent }) => updateTimerDisplay(remaining, urgent),
    onExpire:   () => {
      if (!solved) {
        if (mode === 'incident' && breachPct < 100) handleSolved(); // survival win
        else handleTimeExpired();
      }
    },
  });
  timer.start();

  // Bind controls
  bindControls(mode, levelData);

  // Auto-hide HUD + footer after inactivity
  const _hudEl    = document.querySelector('.arena-hud');
  const _footerEl = document.querySelector('.arena-footer');
  function _hideUI() {
    _hudEl?.classList.add('hud-hidden');
    _footerEl?.classList.add('footer-hidden');
  }
  _showUI = function () {
    _hudEl?.classList.remove('hud-hidden');
    _footerEl?.classList.remove('footer-hidden');
    clearTimeout(_uiHideTimer);
    _uiHideTimer = setTimeout(_hideUI, 4000);
  };
  _showUI();
  document.addEventListener('mousemove',  _showUI);
  document.addEventListener('touchstart', _showUI, { passive: true });
  document.addEventListener('keydown',    _showUI);
}

export function onExit() {
  timer?.stop();
  timer = null;
  if (currentMode === 'incident') incidentResponse.cleanup();
  clickHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
  clickHandlers = [];
  document.getElementById('arena-overlay')?.classList.add('hidden');

  clearTimeout(_uiHideTimer);
  if (_showUI) {
    document.removeEventListener('mousemove',  _showUI);
    document.removeEventListener('touchstart', _showUI);
    document.removeEventListener('keydown',    _showUI);
    _showUI = null;
  }
  document.querySelector('.arena-hud')?.classList.remove('hud-hidden');
  document.querySelector('.arena-footer')?.classList.remove('footer-hidden');
}

function bindControls(mode, levelData) {
  const addHandler = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
    clickHandlers.push({ el, fn });
  };

  addHandler('btn-restart', () => {
    onExit();
    onEnter({ mode: currentMode, level: currentLevel });
  });

  addHandler('btn-exit-arena', () => navigateTo('lobby'));

  addHandler('btn-hint', () => {
    const mod = MODE_MODULES[currentMode];
    if (mod.useHint) {
      mod.useHint(state, document.getElementById('puzzle-board'));
    }
  });

  addHandler('btn-submit-score', () => {
    if (solved) finalize();
  });
}

function handleSolved() {
  solved = true;
  timer?.stop();
  if (currentMode === 'incident') incidentResponse.cleanup();
  enableSubmit(true); // fallback for keyboard/a11y users
  showArenaOverlay('victory');
}

function handleTimeExpired() {
  solved = false;
  if (currentMode === 'incident') incidentResponse.cleanup();
  showArenaOverlay('defeat', 'time');
}

function handleBreachFull() {
  solved = false;
  timer?.stop();
  if (currentMode === 'incident') incidentResponse.cleanup();
  showArenaOverlay('defeat', 'breach');
}

function showArenaOverlay(type, reason = '') {
  const overlay = document.getElementById('arena-overlay');
  const iconEl  = document.getElementById('aro-icon');
  const titleEl = document.getElementById('aro-title');
  const subEl   = document.getElementById('aro-subtitle');
  const actEl   = document.getElementById('aro-actions');
  if (!overlay) return;

  // Force animation replay by cloning
  overlay.classList.remove('hidden');

  if (type === 'victory') {
    iconEl.textContent  = '✓';
    iconEl.className    = 'aro-icon victory';
    titleEl.textContent = 'VICTORY';
    titleEl.className   = 'aro-title victory';
    subEl.textContent   = 'Puzzle solved — check your score breakdown';
    actEl.innerHTML     = `<button class="btn btn-primary btn-lg" id="aro-breakdown">→ SEE BREAKDOWN</button>`;
  } else {
    const isBreachFail  = reason === 'breach';
    iconEl.textContent  = '✕';
    iconEl.className    = 'aro-icon defeat';
    titleEl.textContent = isBreachFail ? 'BREACH DETECTED' : 'TIME EXPIRED';
    titleEl.className   = 'aro-title defeat';
    subEl.textContent   = isBreachFail
      ? 'Security perimeter compromised — mission failed'
      : 'Time ran out before the puzzle could be solved';
    actEl.innerHTML = `
      <button class="btn btn-ghost btn-md" id="aro-retry">↺ RETRY LEVEL</button>
      <button class="btn btn-danger btn-md" id="aro-exit">✕ EXIT TO RESULT</button>
    `;
  }

  requestAnimationFrame(() => {
    const breakdownBtn = document.getElementById('aro-breakdown');
    if (breakdownBtn) {
      const fn = () => { overlay.classList.add('hidden'); finalize(); };
      breakdownBtn.addEventListener('click', fn);
      clickHandlers.push({ el: breakdownBtn, fn });
    }
    const retryBtn = document.getElementById('aro-retry');
    if (retryBtn) {
      const fn = () => {
        overlay.classList.add('hidden');
        onExit();
        onEnter({ mode: currentMode, level: currentLevel });
      };
      retryBtn.addEventListener('click', fn);
      clickHandlers.push({ el: retryBtn, fn });
    }
    const exitBtn = document.getElementById('aro-exit');
    if (exitBtn) {
      const fn = () => { overlay.classList.add('hidden'); navigateToResult(false); };
      exitBtn.addEventListener('click', fn);
      clickHandlers.push({ el: exitBtn, fn });
    }
  });
}

function finalize() {
  const mod       = MODE_MODULES[currentMode];
  const levelData = mod.getLevelData(currentLevel);
  const moves     = state.moves;
  const remaining = timer?.getRemaining() ?? 0;

  const scores = calculateScore({
    timeRemaining: remaining,
    timeLimit:     levelData.timeLimit,
    breachPct,
    moves,
  });

  addHistoryEntry({
    mode:  currentMode,
    level: currentLevel,
    ...scores,
    breachPct,
    moves,
    timeRemaining: remaining,
  });

  const isNewPB = updatePersonalBest(currentMode, scores.totalScore, currentLevel);

  navigateTo('result', {
    scores,
    mode:        currentMode,
    level:       currentLevel,
    timeRemaining: remaining,
    moves,
    breachPct,
    isNewPB,
    success:     true,
  });
}

function navigateToResult(success) {
  const mod       = MODE_MODULES[currentMode];
  const levelData = mod.getLevelData(currentLevel);
  const moves     = state?.moves ?? 0;

  const scores = calculateScore({
    timeRemaining: 0,
    timeLimit:     levelData.timeLimit,
    breachPct,
    moves,
  });

  if (!success) scores.totalScore = 0; // failed run scores 0

  addHistoryEntry({
    mode:  currentMode,
    level: currentLevel,
    ...scores,
    breachPct,
    moves,
    timeRemaining: 0,
  });

  navigateTo('result', {
    scores,
    mode:    currentMode,
    level:   currentLevel,
    moves,
    breachPct,
    isNewPB: false,
    success,
  });
}
