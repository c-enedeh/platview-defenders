import { makeTile, renderBoard, flipSwap, highlightCorrect, scrambleTiles, isSolvedAlignment } from '../puzzleEngine.js';
import { updateMoveCounter, updateHintCount, enableSubmit, showToast } from '../ui.js';

const DOMAIN_META = {
  iam:      { abbr: 'IAM',  labels: ['SSO', 'MFA', 'RBAC'],  name: 'Identity & Access' },
  cloud:    { abbr: 'CLD',  labels: ['WAF', 'VPC', 'S3'],    name: 'Cloud Security'    },
  soc:      { abbr: 'SOC',  labels: ['SIEM', 'IDS', 'SOAR'], name: 'SOC Monitoring'    },
  network:  { abbr: 'NET',  labels: ['FW',  'VPN', 'IPS'],   name: 'Network Security'  },
  endpoint: { abbr: 'EPT',  labels: ['EDR', 'AV',  'DLP'],   name: 'Endpoint Security' },
  data:     { abbr: 'DPT',  labels: ['DLP', 'HSM', 'PKI'],   name: 'Data Protection'   },
};

export const LEVELS = [
  { level:1,  name:'Basic Defense Grid',     domains:['iam','cloud','soc'],                             cols:3, swaps:4,  timeLimit:180 },
  { level:2,  name:'Network Order',          domains:['network','cloud','iam'],                         cols:3, swaps:6,  timeLimit:150 },
  { level:3,  name:'SOC Setup',              domains:['soc','iam','endpoint'],                          cols:3, swaps:8,  timeLimit:150 },
  { level:4,  name:'Endpoint Lockdown',      domains:['endpoint','network','data'],                     cols:3, swaps:10, timeLimit:120 },
  { level:5,  name:'Cloud Shield',           domains:['cloud','soc','data'],                            cols:3, swaps:12, timeLimit:120 },
  { level:6,  name:'Identity Wall',          domains:['iam','network','soc'],                           cols:3, swaps:14, timeLimit:100 },
  { level:7,  name:'Data Vault',             domains:['data','endpoint','cloud'],                       cols:3, swaps:16, timeLimit:100 },
  { level:8,  name:'Compliance Layer',       domains:['iam','data','network'],                          cols:3, swaps:18, timeLimit:90  },
  { level:9,  name:'Full Security Stack',    domains:['iam','cloud','soc','network','endpoint','data'], cols:6, swaps:22, timeLimit:90  },
  { level:10, name:'Platview Master Grid',   domains:['iam','cloud','soc','network','endpoint','data'], cols:6, swaps:30, timeLimit:60  },
];

export function getLevelData(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

export function getObjective(levelData) {
  return `Align all tiles so each row belongs to one cybersecurity domain.`;
}

/* ── Build solved and scrambled tile arrays ── */
export function generatePuzzle(level) {
  const ld = getLevelData(level);
  const solved = [];
  ld.domains.forEach(domain => {
    const meta   = DOMAIN_META[domain];
    const labels = meta.labels;
    for (let i = 0; i < ld.cols; i++) {
      solved.push(makeTile(domain, labels[i % labels.length], meta.abbr, solved.length));
    }
  });

  const scrambled = scrambleTiles(solved, ld.swaps);

  return {
    levelData: ld,
    solved,
    current: scrambled,
    moves: 0,
    hintCount: 3,
    selectedPos: null,
  };
}

/* ── Render both boards ── */
export function initBoard(state, boardEl, targetEl, onSwapDone) {
  renderBoard(boardEl, state.current, pos => handleClick(state, boardEl, targetEl, pos, onSwapDone), true);
  renderBoard(targetEl, state.solved, () => {}, false);
}

/* ── Click handler ── */
function handleClick(state, boardEl, targetEl, pos, onSwapDone) {
  if (state.selectedPos === null) {
    state.selectedPos = pos;
    boardEl.children[pos]?.classList.add('selected');
  } else if (state.selectedPos === pos) {
    boardEl.children[pos]?.classList.remove('selected');
    state.selectedPos = null;
  } else {
    const from = state.selectedPos;
    boardEl.children[from]?.classList.remove('selected');
    state.selectedPos = null;
    state.moves++;
    updateMoveCounter(state.moves);

    flipSwap(boardEl, from, pos, state.current, () => {
      highlightCorrect(boardEl, state.current, state.solved);
      if (isSolvedAlignment(state.current, state.solved)) {
        markAllCorrect(boardEl);
        enableSubmit(true);
        if (onSwapDone) onSwapDone('solved');
      } else {
        if (onSwapDone) onSwapDone('move');
      }
    });
  }
}

function markAllCorrect(boardEl) {
  Array.from(boardEl.children).forEach(el => {
    el.classList.add('correct');
    el.style.pointerEvents = 'none';
  });
}

/* ── Hint: highlight one misplaced tile ── */
export function useHint(state, boardEl) {
  if (state.hintCount <= 0) return;
  state.hintCount--;
  updateHintCount(state.hintCount);

  // Find the first position that isn't correct
  for (let i = 0; i < state.current.length; i++) {
    if (state.current[i].domain !== state.solved[i].domain) {
      const el = boardEl.children[i];
      if (el) {
        el.style.outline = '3px solid var(--amber)';
        el.style.boxShadow = 'var(--glow-amber)';
        setTimeout(() => {
          el.style.outline = '';
          el.style.boxShadow = '';
        }, 2000);
      }
      break;
    }
  }
}
