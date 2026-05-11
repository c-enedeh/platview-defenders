import { updateMoveCounter, updateHintCount, enableSubmit, showToast, updateBreachMeter } from '../ui.js';

const THREATS = [
  { label:'Ransomware',    abbr:'RANSOM', urgency:3 },
  { label:'DDoS Attack',   abbr:'DDoS',  urgency:3 },
  { label:'Phishing',      abbr:'PHISH', urgency:1 },
  { label:'SQL Injection', abbr:'SQLi',  urgency:2 },
  { label:'MITM',          abbr:'MITM',  urgency:2 },
  { label:'Zero-Day',      abbr:'0-DAY', urgency:3 },
  { label:'Malware',       abbr:'MLWR',  urgency:2 },
  { label:'Data Exfil',    abbr:'EXFIL', urgency:3 },
  { label:'Brute Force',   abbr:'BRUTE', urgency:1 },
  { label:'Insider',       abbr:'INSD',  urgency:2 },
];

export const LEVELS = [
  { level:1,  name:'First Alert',        maxThreats:3, spawnMs:4000, breachRate:0.4, killTarget:8,  timeLimit:90  },
  { level:2,  name:'Escalation',         maxThreats:3, spawnMs:3500, breachRate:0.6, killTarget:10, timeLimit:90  },
  { level:3,  name:'Multi-Vector',       maxThreats:4, spawnMs:3000, breachRate:0.8, killTarget:12, timeLimit:90  },
  { level:4,  name:'Advanced Threat',    maxThreats:4, spawnMs:2500, breachRate:1.0, killTarget:14, timeLimit:90  },
  { level:5,  name:'Persistent Attack',  maxThreats:5, spawnMs:2500, breachRate:1.2, killTarget:16, timeLimit:90  },
  { level:6,  name:'Coordinated Strike', maxThreats:5, spawnMs:2000, breachRate:1.5, killTarget:18, timeLimit:90  },
  { level:7,  name:'APT Campaign',       maxThreats:6, spawnMs:2000, breachRate:1.8, killTarget:20, timeLimit:90  },
  { level:8,  name:'Critical Breach',    maxThreats:6, spawnMs:1500, breachRate:2.0, killTarget:22, timeLimit:90  },
  { level:9,  name:'Nation-State',       maxThreats:7, spawnMs:1500, breachRate:2.5, killTarget:25, timeLimit:90  },
  { level:10, name:'Red Zone',           maxThreats:8, spawnMs:1000, breachRate:3.0, killTarget:30, timeLimit:90  },
];

export function getLevelData(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

export function getObjective(levelData) {
  return `Neutralize ${levelData.killTarget} threats. Click threat tiles before the breach hits 100%.`;
}

let spawnInterval  = null;
let breachInterval = null;

export function cleanup() {
  clearInterval(spawnInterval);
  clearInterval(breachInterval);
  spawnInterval  = null;
  breachInterval = null;
}

export function generatePuzzle(level) {
  const ld = getLevelData(level);
  return {
    levelData: ld,
    activeThreats: [],  // { id, threat, pos, el }
    killed: 0,
    moves: 0,
    hintCount: 3,
    breachPct: 0,
    nextId: 0,
    // Grid is 4×4 = 16 cells; track occupied positions
    gridSize: 16,
    occupied: new Set(),
  };
}

export function initBoard(state, boardEl, onBreachChange, onKill, onGameOver) {
  cleanup();

  boardEl.classList.remove('puzzle-board');
  boardEl.classList.add('incident-board');
  boardEl.innerHTML = '';

  // Create 16 empty cell slots
  for (let i = 0; i < state.gridSize; i++) {
    const cell = document.createElement('div');
    cell.className   = 'tile-slot';
    cell.dataset.pos = i;
    cell.style.cssText = `width:110px;height:96px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.06);`;
    boardEl.appendChild(cell);
  }

  // Override board layout for 4 cols
  boardEl.style.gridTemplateColumns = 'repeat(4, 1fr)';

  // Start spawning threats
  spawnInterval = setInterval(() => {
    if (state.activeThreats.length < state.levelData.maxThreats) {
      spawnThreat(state, boardEl, onBreachChange, onKill, onGameOver);
    }
  }, state.levelData.spawnMs);

  // Spawn first threat immediately
  spawnThreat(state, boardEl, onBreachChange, onKill, onGameOver);

  // Breach fill: runs every 500ms based on active threats
  breachInterval = setInterval(() => {
    if (state.activeThreats.length === 0) return;
    const totalUrgency = state.activeThreats.reduce((s, t) => s + t.urgency, 0);
    state.breachPct += (state.levelData.breachRate * totalUrgency) / 2;
    state.breachPct  = Math.min(100, state.breachPct);
    onBreachChange(state.breachPct);
    if (state.breachPct >= 100) {
      cleanup();
      onGameOver();
    }
  }, 500);
}

function spawnThreat(state, boardEl, onBreachChange, onKill, onGameOver) {
  // Find a free slot
  const free = [];
  for (let i = 0; i < state.gridSize; i++) {
    if (!state.occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return;

  const pos      = free[Math.floor(Math.random() * free.length)];
  const template = THREATS[Math.floor(Math.random() * THREATS.length)];
  const id       = state.nextId++;

  state.occupied.add(pos);

  const cell = boardEl.children[pos];
  if (!cell) return;

  const el = document.createElement('div');
  el.className = 'tile threat-active';
  el.id = `ir-${id}`;
  el.dataset.domain = 'threat';
  el.innerHTML = `<span class="tile__abbr">${template.abbr}</span><span class="tile__label">${template.label}</span>`;
  el.style.cssText = 'width:100%;height:100%;cursor:pointer;animation:none;';

  // Urgency border glow intensity
  if (template.urgency === 3) {
    el.style.borderColor = 'var(--red)';
    el.style.boxShadow   = 'var(--glow-red)';
  } else if (template.urgency === 2) {
    el.style.borderColor = 'var(--amber)';
  }

  const entry = { id, threat: template, pos, el, urgency: template.urgency };
  state.activeThreats.push(entry);

  el.addEventListener('click', () => {
    neutralizeThreat(state, boardEl, id, onKill, onGameOver);
  });

  cell.innerHTML = '';
  cell.appendChild(el);
}

function neutralizeThreat(state, boardEl, id, onKill, onGameOver) {
  const idx = state.activeThreats.findIndex(t => t.id === id);
  if (idx === -1) return;

  const entry = state.activeThreats[idx];
  state.activeThreats.splice(idx, 1);
  state.occupied.delete(entry.pos);
  state.moves++;
  state.killed++;
  updateMoveCounter(state.moves);

  const cell = boardEl.children[entry.pos];
  if (cell) {
    const el = cell.querySelector('.tile');
    if (el) {
      el.classList.remove('threat-active');
      el.classList.add('correct');
      el.style.boxShadow = 'var(--glow-green)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity    = '0';
        el.style.transform  = 'scale(0.8)';
        setTimeout(() => { cell.innerHTML = ''; }, 350);
      }, 250);
    }
  }

  onKill(state.killed, state.levelData.killTarget);

  if (state.killed >= state.levelData.killTarget) {
    cleanup();
    enableSubmit(true);
    onGameOver('solved');
  }
}

export function useHint(state, boardEl) {
  if (state.hintCount <= 0 || state.activeThreats.length === 0) return;
  state.hintCount--;
  updateHintCount(state.hintCount);

  // Flash the highest-urgency active threat
  const topThreat = [...state.activeThreats].sort((a,b) => b.urgency - a.urgency)[0];
  const cell = boardEl.children[topThreat.pos];
  const el   = cell?.querySelector('.tile');
  if (el) {
    el.style.outline   = '3px solid var(--amber)';
    el.style.boxShadow = 'var(--glow-amber)';
    setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 1800);
  }
}
