import { updateMoveCounter, updateHintCount, enableSubmit, showToast } from '../ui.js';

const ALL_PAIRS = [
  { threat:'Phishing',        control:'Email Filter',     abbr_t:'PHISH', abbr_c:'E-FILT' },
  { threat:'SQL Injection',   control:'Input Valid.',     abbr_t:'SQLi',  abbr_c:'VALID'  },
  { threat:'DDoS',            control:'Rate Limiting',    abbr_t:'DDoS',  abbr_c:'RLIMIT' },
  { threat:'Ransomware',      control:'Backup Policy',    abbr_t:'RANSOM',abbr_c:'BKUP'   },
  { threat:'Insider Threat',  control:'UEBA',             abbr_t:'INSD',  abbr_c:'UEBA'   },
  { threat:'Zero-Day',        control:'Patch Mgmt',       abbr_t:'0-DAY', abbr_c:'PATCH'  },
  { threat:'MITM',            control:'TLS Cert',         abbr_t:'MITM',  abbr_c:'TLS'    },
  { threat:'Brute Force',     control:'Lockout Policy',   abbr_t:'BRUTE', abbr_c:'LOCKOUT'},
];

export const LEVELS = [
  { level:1,  name:'Phishing Alert',        pairCount:4,  timeLimit:120 },
  { level:2,  name:'Malware Outbreak',      pairCount:4,  timeLimit:110 },
  { level:3,  name:'Data Breach Drill',     pairCount:5,  timeLimit:105 },
  { level:4,  name:'Insider Risk',          pairCount:5,  timeLimit:100 },
  { level:5,  name:'Zero Day Response',     pairCount:6,  timeLimit:95  },
  { level:6,  name:'Advanced Threats',      pairCount:6,  timeLimit:90  },
  { level:7,  name:'Network Assault',       pairCount:7,  timeLimit:85  },
  { level:8,  name:'APT Simulation',        pairCount:7,  timeLimit:80  },
  { level:9,  name:'Full Spectrum',         pairCount:8,  timeLimit:75  },
  { level:10, name:'Red Team Exercise',     pairCount:8,  timeLimit:60  },
];

export function getLevelData(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

export function getObjective() {
  return 'Click a threat tile, then click its matching defence control.';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePuzzle(level) {
  const ld    = getLevelData(level);
  const pairs = shuffle(ALL_PAIRS).slice(0, ld.pairCount);

  // Build flat tile list: [threat, control, threat, control, ...]
  const tiles = [];
  pairs.forEach((pair, i) => {
    tiles.push({ id: `t-${i}`, domain: 'threat',  label: pair.threat,   abbr: pair.abbr_t, pairId: i });
    tiles.push({ id: `c-${i}`, domain: 'control', label: pair.control,  abbr: pair.abbr_c, pairId: i });
  });

  return {
    levelData: ld,
    tiles: shuffle(tiles),
    matchedCount: 0,
    totalPairs: pairs.length,
    moves: 0,
    hintCount: 3,
    selectedThreat: null,
    breachPct: 0,
  };
}

export function initBoard(state, boardEl, onResult) {
  boardEl.classList.remove('puzzle-board');
  boardEl.classList.add('threat-board');
  boardEl.innerHTML = '';

  state.tiles.forEach((tile, pos) => {
    const el = buildTileEl(tile, pos);
    el.addEventListener('click', () => handleClick(state, boardEl, pos, onResult));
    boardEl.appendChild(el);
  });
}

function buildTileEl(tile, pos) {
  const el = document.createElement('div');
  el.className   = 'tile';
  el.id          = tile.id;
  el.dataset.pos = pos;
  el.dataset.domain = tile.domain;
  el.setAttribute('role', 'gridcell');
  el.setAttribute('aria-label', tile.label);
  el.innerHTML = `<span class="tile__abbr">${tile.abbr}</span><span class="tile__label">${tile.label}</span>`;
  return el;
}

function handleClick(state, boardEl, pos, onResult) {
  const tile = state.tiles[pos];
  if (!tile || tile.matched) return;

  if (state.selectedThreat === null) {
    // Must select a threat first
    if (tile.domain !== 'threat') {
      showToast('Select a THREAT tile first', 'warn');
      const el = boardEl.children[pos];
      el?.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:200});
      return;
    }
    state.selectedThreat = pos;
    boardEl.children[pos]?.classList.add('selected');
  } else {
    const threatPos = state.selectedThreat;
    const threat    = state.tiles[threatPos];
    boardEl.children[threatPos]?.classList.remove('selected');
    state.selectedThreat = null;

    if (pos === threatPos) return; // deselect

    state.moves++;
    updateMoveCounter(state.moves);

    if (tile.domain === 'control' && tile.pairId === threat.pairId) {
      // Correct match
      matchPair(state, boardEl, threatPos, pos);
      if (state.matchedCount >= state.totalPairs) {
        enableSubmit(true);
        onResult('solved');
      } else {
        onResult('move');
      }
    } else {
      // Wrong match
      wrongMatch(state, boardEl, threatPos, pos, onResult);
    }
  }
}

function matchPair(state, boardEl, posA, posB) {
  state.tiles[posA].matched = true;
  state.tiles[posB].matched = true;
  state.matchedCount++;

  [posA, posB].forEach(p => {
    const el = boardEl.children[p];
    if (el) {
      el.classList.add('correct');
      setTimeout(() => el.classList.add('matched'), 300);
    }
  });
}

function wrongMatch(state, boardEl, posA, posB, onResult) {
  state.breachPct = Math.min(100, state.breachPct + 10);

  [posA, posB].forEach(p => {
    const el = boardEl.children[p];
    el?.classList.add('wrong');
    setTimeout(() => el?.classList.remove('wrong'), 600);
  });

  onResult('breach', state.breachPct);
}

export function useHint(state, boardEl) {
  if (state.hintCount <= 0) return;
  state.hintCount--;
  updateHintCount(state.hintCount);

  // Highlight the first unmatched threat and its control
  for (const tile of state.tiles) {
    if (!tile.matched && tile.domain === 'threat') {
      const pos = state.tiles.indexOf(tile);
      const el  = boardEl.children[pos];
      if (el) {
        el.style.outline    = '3px solid var(--amber)';
        el.style.boxShadow  = 'var(--glow-amber)';
        setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 2000);
      }
      break;
    }
  }
}
