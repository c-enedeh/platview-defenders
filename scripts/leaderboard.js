import { getCodename } from './storage.js';
import { getLeaderboard } from './supabase.js';
import { formatScore } from './score.js';

const BADGE_CLASS = {
  1: 'lb-badge-gold',
  2: 'lb-badge-silver',
  3: 'lb-badge-bronze',
  4: 'lb-badge-cyan',
  5: 'lb-badge-green',
};

const BAR_COLOR = {
  1: '#FFD700',
  2: '#C0C0C8',
  3: '#CD7F32',
  4: 'var(--cyan)',
  5: 'var(--neon-green)',
};

const MODE_ACCENT = {
  domain:   'var(--cyan)',
  threat:   'var(--neon-green)',
  incident: 'var(--red)',
  rubiks:   'var(--purple)',
};

let currentMode = 'domain';
const handlers  = [];

function modal()   { return document.getElementById('modal-leaderboard'); }
function loading() { return document.getElementById('lb-loading'); }
function empty()   { return document.getElementById('lb-empty'); }
function content() { return document.getElementById('lb-content'); }

export function init() {
  const m = modal();
  if (!m) return;

  // Close button
  addHandler('lb-close', 'click', closeLeaderboard);

  // Overlay background click
  m.addEventListener('click', (e) => { if (e.target === m) closeLeaderboard(); });

  // Mode tabs
  m.querySelectorAll('.lb-tab').forEach(tab => {
    const fn = () => loadMode(tab.dataset.lbMode);
    tab.addEventListener('click', fn);
    handlers.push({ el: tab, fn, evt: 'click' });
  });
}

export function openLeaderboard() {
  modal().classList.remove('hidden');
  loadMode('domain');
}

export function closeLeaderboard() {
  modal().classList.add('hidden');
}

async function loadMode(mode) {
  currentMode = mode;

  // Active tab + accent colour
  const accent = MODE_ACCENT[mode] || 'var(--cyan)';
  modal().querySelectorAll('.lb-tab').forEach(tab => {
    const isActive = tab.dataset.lbMode === mode;
    tab.classList.toggle('active', isActive);
    tab.style.setProperty('--tab-accent', isActive ? accent : 'transparent');
  });

  // Show loading state
  loading().classList.remove('hidden');
  empty().classList.add('hidden');
  content().classList.add('hidden');

  const data       = await getLeaderboard(mode, 25);
  const myCodename = getCodename();

  loading().classList.add('hidden');

  if (!data.length) {
    empty().classList.remove('hidden');
    return;
  }

  renderTable(data, myCodename);
  renderChart(data, myCodename, mode);
  content().classList.remove('hidden');
}

function renderTable(data, myCodename) {
  const tbody = document.getElementById('lb-tbody');
  tbody.innerHTML = '';

  data.forEach(entry => {
    const isMe = entry.codename === myCodename;
    const tr   = document.createElement('tr');
    if (isMe) tr.classList.add('lb-me');

    // Rank cell — badge for top 5, plain number otherwise
    let rankCell;
    if (entry.rank <= 5) {
      rankCell = `<img src="assets/TOP${entry.rank}.svg" class="lb-badge ${BADGE_CLASS[entry.rank]}" alt="Rank ${entry.rank}" width="28" height="28">`;
    } else {
      rankCell = `<span class="lb-rank-num">#${entry.rank}</span>`;
    }

    const nameCell  = isMe
      ? `<span class="lb-me-label">ME</span>`
      : `<span class="lb-codename">${entry.codename}</span>`;

    const date = entry.updatedAt
      ? new Date(entry.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';

    tr.innerHTML = `
      <td class="lb-rank-cell">${rankCell}</td>
      <td class="lb-name-cell">${nameCell}</td>
      <td class="lb-score-cell">${formatScore(entry.bestScore)}</td>
      <td class="lb-level-cell">Lv ${entry.level}</td>
      <td class="lb-date-cell">${date}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderChart(data, myCodename, mode) {
  const chartEl  = document.getElementById('lb-chart');
  const top10    = data.slice(0, 10);
  const maxScore = top10[0]?.bestScore || 1;
  const accent   = MODE_ACCENT[mode] || 'var(--cyan)';

  chartEl.innerHTML = top10.map(entry => {
    const isMe  = entry.codename === myCodename;
    const pct   = Math.max(2, (entry.bestScore / maxScore) * 100);
    const color = isMe ? 'var(--cyan)' : (BAR_COLOR[entry.rank] || 'var(--muted-fg)');
    const glow  = isMe ? 'var(--glow-cyan)' : (entry.rank <= 5 ? `0 0 8px ${color}` : 'none');
    const label = isMe ? 'ME' : entry.codename;

    return `
      <div class="lb-bar-row${isMe ? ' lb-me' : ''}">
        <span class="lb-bar-name">${label}</span>
        <div class="lb-bar-track">
          <div class="lb-bar-fill" style="width:${pct}%;background:${color};box-shadow:${glow}"></div>
        </div>
        <span class="lb-bar-score">${formatScore(entry.bestScore)}</span>
      </div>
    `;
  }).join('');
}

function addHandler(id, evt, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(evt, fn);
  handlers.push({ el, fn, evt });
}
