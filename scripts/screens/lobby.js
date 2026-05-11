import { getCodename, getUserId, logout } from '../storage.js';
import { navigateTo } from '../router.js';
import { formatScore } from '../score.js';
import { getHistory, getPersonalBests, getOverallBest } from '../supabase.js';
import { init as initLeaderboard, openLeaderboard } from '../leaderboard.js';
import { showGlobalLoading, hideGlobalLoading } from '../ui.js';

const MODE_LABELS = { domain: 'Domain Align', threat: 'Threat Match', incident: 'Incident Resp.', rubiks: 'Cube Realign' };

let clickHandlers = [];

let _lobbyHideTimer = null;
let _lobbyShowUI    = null;

export function onEnter() {
  const codename = getCodename() || 'OPERATOR';
  document.getElementById('lobby-codename').textContent = `⬡ ${codename}`;

  initLeaderboard();
  bindModeButtons();
  bindRulesModal();
  bindLeaderboardButton();
  bindTrainingButton();
  bindLogoutButton();

  // Glitch-reveal animation for featured card
  const featuredCard = document.querySelector('.mode-card[data-mode="rubiks"]');
  if (featuredCard) {
    featuredCard.classList.remove('card-glitch-in');
    void featuredCard.offsetWidth;
    featuredCard.classList.add('card-glitch-in');
  }

  // Load data from Supabase asynchronously — UI shows placeholders instantly
  loadLobbyData();

  // Auto-hide header after inactivity
  const _headerEl = document.querySelector('.lobby-header');
  function _lobbyHideUI() { _headerEl?.classList.add('header-hidden'); }
  _lobbyShowUI = function () {
    _headerEl?.classList.remove('header-hidden');
    clearTimeout(_lobbyHideTimer);
    _lobbyHideTimer = setTimeout(_lobbyHideUI, 4000);
  };
  _lobbyShowUI();
  document.addEventListener('mousemove',  _lobbyShowUI);
  document.addEventListener('touchstart', _lobbyShowUI, { passive: true });
  document.addEventListener('keydown',    _lobbyShowUI);
}

export function onExit() {
  clickHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
  clickHandlers = [];

  clearTimeout(_lobbyHideTimer);
  if (_lobbyShowUI) {
    document.removeEventListener('mousemove',  _lobbyShowUI);
    document.removeEventListener('touchstart', _lobbyShowUI);
    document.removeEventListener('keydown',    _lobbyShowUI);
    _lobbyShowUI = null;
  }
  document.querySelector('.lobby-header')?.classList.remove('header-hidden');
}

async function loadLobbyData() {
  const userId = getUserId();
  if (!userId) return;

  showGlobalLoading('FETCHING MISSION DATA…');
  try {
    const [pbs, history, overallBest] = await Promise.all([
      getPersonalBests(userId),
      getHistory(userId, 10),
      getOverallBest(userId),
    ]);
    renderPersonalBests(pbs);
    renderHistory(history);
    renderOverallBest(overallBest);
  } finally {
    hideGlobalLoading();
  }
}

function getTargetScreen(mode) {
  return mode === 'rubiks' ? 'rubiks' : 'arena';
}

function bindModeButtons() {
  document.querySelectorAll('.btn-mode-start').forEach(btn => {
    const fn = (e) => {
      e.stopPropagation();
      navigateTo(getTargetScreen(btn.dataset.mode), { mode: btn.dataset.mode, level: 1 });
    };
    btn.addEventListener('click', fn);
    clickHandlers.push({ el: btn, fn });
  });

  document.querySelectorAll('.mode-card').forEach(card => {
    const fn = (e) => {
      if (e.target.closest('.btn-mode-start')) return;
      navigateTo(getTargetScreen(card.dataset.mode), { mode: card.dataset.mode, level: 1 });
    };
    card.addEventListener('click', fn);
    clickHandlers.push({ el: card, fn });
  });
}

function bindLeaderboardButton() {
  const btn = document.getElementById('btn-leaderboard');
  if (!btn) return;
  const fn = () => openLeaderboard();
  btn.addEventListener('click', fn);
  clickHandlers.push({ el: btn, fn });
}

function bindTrainingButton() {
  const btn = document.getElementById('btn-training');
  if (!btn) return;
  const fn = () => navigateTo('tutorial');
  btn.addEventListener('click', fn);
  clickHandlers.push({ el: btn, fn });
}

function bindLogoutButton() {
  const btn = document.getElementById('btn-logout');
  if (!btn) return;
  const fn = () => {
    logout();
    navigateTo('registration');
  };
  btn.addEventListener('click', fn);
  clickHandlers.push({ el: btn, fn });
}

function bindRulesModal() {
  const openFn    = () => document.getElementById('modal-rules').classList.remove('hidden');
  const closeFn   = () => document.getElementById('modal-rules').classList.add('hidden');
  const overlayFn = (e) => { if (e.target === e.currentTarget) closeFn(); };

  document.getElementById('btn-rules').addEventListener('click', openFn);
  document.getElementById('modal-rules-close').addEventListener('click', closeFn);
  document.getElementById('modal-rules').addEventListener('click', overlayFn);

  clickHandlers.push(
    { el: document.getElementById('btn-rules'),         fn: openFn    },
    { el: document.getElementById('modal-rules-close'), fn: closeFn   },
    { el: document.getElementById('modal-rules'),       fn: overlayFn },
  );
}

function renderPersonalBests(pbs) {
  document.querySelectorAll('[data-pb]').forEach(el => {
    const pb = pbs[el.dataset.pb];
    el.textContent = pb ? formatScore(pb.score) : '—';
  });
}

function renderOverallBest(bestScore) {
  const el = document.getElementById('pb-score');
  if (el) el.textContent = bestScore != null ? formatScore(bestScore) : '—';
}

function renderHistory(history) {
  const tbody   = document.getElementById('history-tbody');
  const emptyEl = document.getElementById('history-empty');
  const table   = document.getElementById('history-table');

  if (!history.length) {
    table.style.display = 'none';
    emptyEl.classList.remove('hidden');
    return;
  }

  table.style.display = '';
  emptyEl.classList.add('hidden');
  tbody.innerHTML = '';

  history.forEach(entry => {
    const breach      = Math.round(entry.breachPct || 0);
    const breachClass = breach < 50 ? 'breach-ok' : breach < 75 ? 'breach-warn' : 'breach-danger';
    const date        = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tr          = document.createElement('tr');
    tr.innerHTML = `
      <td>${MODE_LABELS[entry.mode] || entry.mode}</td>
      <td>Lv ${entry.level}</td>
      <td class="score-cell">${formatScore(entry.totalScore)}</td>
      <td class="${breachClass}">${breach}%</td>
      <td>${date}</td>
    `;
    tbody.appendChild(tr);
  });
}
