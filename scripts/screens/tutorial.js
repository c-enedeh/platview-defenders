import { navigateTo } from '../router.js';

/* ═══════════════════════════════════════════
   TIP DATA  — plain English, beginner-friendly
════════════════════════════════════════════ */
const TIPS = [
  {
    category: 'WELCOME',
    icon: '🛡',
    title: 'Welcome, NinjaCISO',
    body: `This challenge puts you in the shoes of a cybersecurity professional.
<strong>No prior experience needed</strong> — every puzzle teaches you a real concept used by security teams worldwide.
Work through the tips below, then hit <strong>Enter Challenge</strong> to begin.`,
    tags: ['Beginner Friendly', 'Interactive', '3 Game Modes', '10 Levels Each'],
    accent: '#00C6FF',
  },
  {
    category: 'DOMAIN SPOTLIGHT',
    icon: '🔐',
    title: 'Identity & Access Management',
    body: `<strong>IAM</strong> controls <em>who</em> can access <em>what</em>.
Think of it as the security guard at a club — they check IDs and decide who gets in.
<strong>MFA</strong> (Multi-Factor Authentication) makes you prove your identity in two ways — like a password <em>plus</em> a phone code.
<strong>SSO</strong> (Single Sign-On) lets you log in once and access multiple systems — like using Google to sign into apps.`,
    tags: ['MFA', 'SSO', 'RBAC', 'Zero Trust', 'Least Privilege'],
    accent: '#1A4FC4',
  },
  {
    category: 'DOMAIN SPOTLIGHT',
    icon: '☁',
    title: 'Cloud & Network Security',
    body: `<strong>Cloud Security</strong> protects data stored online — think AWS, Google Cloud, or Azure.
A <strong>WAF</strong> (Web Application Firewall) blocks bad traffic before it hits your website.
<strong>Network Security</strong> monitors the roads data travels on. A <strong>Firewall</strong> is like a checkpoint that decides what traffic is allowed in or out. A <strong>VPN</strong> creates an encrypted tunnel so nobody can spy on your connection.`,
    tags: ['WAF', 'VPC', 'Firewall', 'VPN', 'IPS'],
    accent: '#0F8FD8',
  },
  {
    category: 'DOMAIN SPOTLIGHT',
    icon: '📡',
    title: 'SOC, Endpoint & Data Security',
    body: `A <strong>SOC</strong> (Security Operations Centre) is a team that watches for cyber attacks 24/7. They use a <strong>SIEM</strong> to collect logs from every system, and an <strong>IDS</strong> to detect intrusions automatically.
<strong>Endpoint Security</strong> protects individual devices — your laptop, phone, and servers — with tools like <strong>EDR</strong> (threat detection) and antivirus.
<strong>Data Protection</strong> uses <strong>encryption</strong> to scramble sensitive files so only authorised people can read them.`,
    tags: ['SIEM', 'IDS', 'SOAR', 'EDR', 'Encryption', 'DLP'],
    accent: '#0DAF82',
  },
  {
    category: 'HOW TO PLAY',
    icon: '🧩',
    title: 'Domain Alignment Mode',
    body: `The board is scrambled! Your goal: sort each <strong>row</strong> so every tile in that row belongs to the same security domain.
<strong>Click any tile</strong> to select it — it will glow white.
<strong>Click a second tile</strong> to swap their positions.
The correct target arrangement is shown on the right side of the screen. Use the <strong>Hint button (×3)</strong> to highlight a misplaced tile.
Click <strong>👁 Preview How to Play</strong> below to watch a live demo!`,
    tags: ['Click to Select', 'Click to Swap', 'Match the Target', 'Hint ×3'],
    accent: '#00C6FF',
  },
  {
    category: 'SCORING',
    icon: '⚡',
    title: 'Breach Meter & Your Score',
    body: `Wrong moves fill the red <strong>Breach Meter</strong> — if it hits <strong>100%</strong>, the mission fails and you score zero.
Your final score has three bonuses:<br>
🏎 <strong>Speed Bonus</strong> — finish with time left on the clock.<br>
🎯 <strong>Accuracy Bonus</strong> — keep the breach meter low.<br>
♟ <strong>Move Efficiency</strong> — solve the puzzle in fewer swaps.<br>
Beat your <strong>Personal Best</strong> to earn a trophy!`,
    tags: ['Speed Bonus', 'Accuracy Bonus', 'Move Efficiency', 'Personal Best'],
    accent: '#FFB020',
  },
];

/* ═══════════════════════════════════════════
   DEMO TILE DATA — per mode
════════════════════════════════════════════ */

// Domain Alignment — 3×2 grid, swap [0]↔[3] to solve
const DEMO_DOMAIN_TILES = [
  { domain:'iam', abbr:'IAM', label:'Identity' },
  { domain:'soc', abbr:'SOC', label:'SOC'      },
  { domain:'soc', abbr:'SOC', label:'SOC'      },
  { domain:'soc', abbr:'SOC', label:'SOC'      },
  { domain:'iam', abbr:'IAM', label:'Identity' },
  { domain:'iam', abbr:'IAM', label:'Identity' },
];

// Threat Matching — 2×2 grid: Phishing→Awareness, Ransomware→Backup
const DEMO_THREAT_TILES = [
  { domain:'threat',  abbr:'PHISH',  label:'Phishing'   },
  { domain:'control', abbr:'AWARE',  label:'Awareness'  },
  { domain:'threat',  abbr:'RANSOM', label:'Ransomware' },
  { domain:'control', abbr:'BACKUP', label:'Backup & DR'},
];

// Incident Response — 2×2 grid, all active threats
const DEMO_INCIDENT_TILES = [
  { domain:'threat', abbr:'DDoS',  label:'DDoS Attack' },
  { domain:'threat', abbr:'PHISH', label:'Phishing'    },
  { domain:'threat', abbr:'APT',   label:'APT Attack'  },
  { domain:'threat', abbr:'RANSOM',label:'Ransomware'  },
];

/* ═══════════════════════════════════════════
   MODULE STATE
════════════════════════════════════════════ */
let currentSlide    = 0;
let currentDemoMode = 'domain';
let demoRunning     = false;
let demoGen         = 0;
let clickHandlers   = [];
let keyHandler      = null;

/* ═══════════════════════════════════════════
   SCREEN LIFECYCLE
════════════════════════════════════════════ */
export function onEnter() {
  currentSlide    = 0;
  currentDemoMode = 'domain';
  buildSlides();
  buildDots();
  goToSlide(0, false);
  bindButtons();
  bindKeyboard();
}

export function onExit() {
  stopDemo();
  clickHandlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
  clickHandlers = [];
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
}

/* ═══════════════════════════════════════════
   SLIDE CAROUSEL
════════════════════════════════════════════ */
function buildSlides() {
  const track = document.getElementById('tut-track');
  if (!track) return;
  track.innerHTML = '';

  TIPS.forEach(tip => {
    const slide = document.createElement('div');
    slide.className = 'tut-slide';
    slide.style.setProperty('--slide-accent', tip.accent);
    slide.innerHTML = `
      <span class="tut-slide__category">${tip.category}</span>
      <span class="tut-slide__icon" aria-hidden="true">${tip.icon}</span>
      <h2 class="tut-slide__title">${tip.title}</h2>
      <p class="tut-slide__body">${tip.body.replace(/\n/g, ' ')}</p>
      <div class="tut-slide__tags">
        ${tip.tags.map(t => `<span class="tut-tag">${t}</span>`).join('')}
      </div>
    `;
    track.appendChild(slide);
  });
}

function buildDots() {
  const dotsEl = document.getElementById('tut-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  TIPS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'tut-dot';
    dot.setAttribute('aria-label', `Tip ${i + 1}`);
    const fn = () => goToSlide(i);
    dot.addEventListener('click', fn);
    clickHandlers.push({ el: dot, fn });
    dotsEl.appendChild(dot);
  });
}

function goToSlide(index, animate = true) {
  currentSlide = Math.max(0, Math.min(TIPS.length - 1, index));

  const track = document.getElementById('tut-track');
  if (track) {
    track.style.transition = animate ? 'transform 0.44s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    track.style.transform  = `translateX(-${currentSlide * 100}%)`;
  }

  document.querySelectorAll('.tut-dot').forEach((d, i) =>
    d.classList.toggle('active', i === currentSlide)
  );

  const counter = document.getElementById('tut-step-counter');
  if (counter) counter.textContent = `${String(currentSlide + 1).padStart(2,'0')} / ${String(TIPS.length).padStart(2,'0')}`;

  const prev = document.getElementById('tut-prev');
  const next = document.getElementById('tut-next');
  if (prev) prev.disabled = currentSlide === 0;
  if (next) next.disabled = currentSlide === TIPS.length - 1;
}

function bindKeyboard() {
  keyHandler = (e) => {
    if (e.key === 'ArrowLeft')  goToSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
    if (e.key === 'Enter' && currentSlide === TIPS.length - 1) navigateTo('lobby');
  };
  document.addEventListener('keydown', keyHandler);
}

/* ═══════════════════════════════════════════
   BUTTON WIRING
════════════════════════════════════════════ */
function bindButtons() {
  const add = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
    clickHandlers.push({ el, fn });
  };

  add('tut-prev',         () => goToSlide(currentSlide - 1));
  add('tut-next',         () => goToSlide(currentSlide + 1));
  add('btn-tut-skip',     () => navigateTo('lobby'));
  add('btn-tut-enter',    () => navigateTo('lobby'));
  add('btn-preview-demo', openDemo);
  add('close-demo-modal', closeDemo);

  const overlay = document.getElementById('modal-demo');
  if (overlay) {
    const fn = (e) => { if (e.target === overlay) closeDemo(); };
    overlay.addEventListener('click', fn);
    clickHandlers.push({ el: overlay, fn });
  }

  bindDemoTabs();
}

function bindDemoTabs() {
  document.querySelectorAll('.demo-tab').forEach(tab => {
    const fn = () => {
      currentDemoMode = tab.dataset.demoMode;
      document.querySelectorAll('.demo-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      stopDemo();
      hideDemoBreach();
      requestAnimationFrame(() => requestAnimationFrame(() => startDemo()));
    };
    tab.addEventListener('click', fn);
    clickHandlers.push({ el: tab, fn });
  });
}

/* ═══════════════════════════════════════════
   DEMO MODAL
════════════════════════════════════════════ */
function openDemo() {
  currentDemoMode = 'domain';
  document.querySelectorAll('.demo-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
    t.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  });
  document.getElementById('modal-demo')?.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => startDemo()));
}

function closeDemo() {
  stopDemo();
  hideDemoBreach();
  document.getElementById('modal-demo')?.classList.add('hidden');
}

/* ═══════════════════════════════════════════
   DEMO ANIMATION INFRASTRUCTURE
════════════════════════════════════════════ */
function demoWait(ms) {
  const gen = demoGen;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (demoGen === gen) resolve();
      else reject(new DOMException('Demo cancelled', 'AbortError'));
    }, ms);
  });
}

function stopDemo() {
  demoRunning = false;
  demoGen++;
}

function buildDemoBoard(tiles, cols = 3) {
  const board = document.getElementById('demo-board');
  if (!board) return;
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  tiles.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tile';
    el.id = `demo-t${i}`;
    el.dataset.domain = t.domain;
    el.innerHTML = `<span class="tile__abbr">${t.abbr}</span><span class="tile__label">${t.label}</span>`;
    board.appendChild(el);
  });
}

function tileCenter(pos) {
  const stage = document.getElementById('demo-stage');
  const board = document.getElementById('demo-board');
  const tile  = board?.children[pos];
  if (!tile || !stage) return { x: 0, y: 0 };
  const sr = stage.getBoundingClientRect();
  const tr = tile.getBoundingClientRect();
  return {
    x: tr.left - sr.left + tr.width  / 2,
    y: tr.top  - sr.top  + tr.height / 2,
  };
}

function setCursor(x, y) {
  const c = document.getElementById('demo-cursor');
  if (c) { c.style.left = `${x}px`; c.style.top = `${y}px`; }
}

function setLabel(step, hint = '') {
  const sl = document.getElementById('demo-step-label');
  const hl = document.getElementById('demo-hint');
  if (sl) {
    sl.textContent = step;
    sl.className = 'demo-step-label' + (step.includes('✓') || step.includes('SOLVED') || step.includes('CLEARED') || step.includes('SURVIVED') ? ' solved' : '');
  }
  if (hl) hl.textContent = hint;
}

function setProgress(pct) {
  const fill = document.getElementById('demo-progress-fill');
  if (fill) fill.style.width = `${pct}%`;
}

async function clickAt(pos) {
  const { x, y } = tileCenter(pos);
  setCursor(x, y);
  await demoWait(580);
  const cursor = document.getElementById('demo-cursor');
  cursor?.classList.add('clicking');
  await demoWait(130);
  cursor?.classList.remove('clicking');
}

// ── Breach bar helpers (incident mode) ──
function setDemoBreach(pct) {
  const fill  = document.getElementById('demo-breach-fill');
  const pctEl = document.getElementById('demo-breach-pct');
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.style.backgroundColor =
      pct < 50 ? 'var(--breach-safe)' :
      pct < 75 ? 'var(--breach-warn)' : 'var(--breach-danger)';
  }
  if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
}

function showDemoBreach() {
  document.getElementById('demo-breach-row')?.classList.remove('hidden');
}

function hideDemoBreach() {
  document.getElementById('demo-breach-row')?.classList.add('hidden');
  setDemoBreach(0);
}

async function animateDemoBreach(from, to, durationMs) {
  const STEPS = 20;
  const stepMs = durationMs / STEPS;
  const inc = (to - from) / STEPS;
  let cur = from;
  for (let i = 0; i < STEPS; i++) {
    cur += inc;
    setDemoBreach(Math.max(0, Math.round(cur)));
    await demoWait(stepMs);
  }
}

/* ═══════════════════════════════════════════
   DEMO DISPATCHER
════════════════════════════════════════════ */
async function startDemo() {
  if (demoRunning) stopDemo();
  demoRunning = true;
  const gen = demoGen;

  try {
    while (demoGen === gen) {
      if      (currentDemoMode === 'threat')   await runThreatDemo();
      else if (currentDemoMode === 'incident') await runIncidentDemo();
      else                                      await runDomainDemo();
    }
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
}

/* ═══════════════════════════════════════════
   DOMAIN ALIGNMENT DEMO
════════════════════════════════════════════ */
async function runDomainDemo() {
  buildDemoBoard([...DEMO_DOMAIN_TILES], 3);
  setProgress(0);
  const stage = document.getElementById('demo-stage');
  if (stage) setCursor(stage.offsetWidth / 2, stage.offsetHeight / 2);

  setLabel('DEMO: WATCH HOW TILES SWAP', 'The board is scrambled — rows need sorting');
  await demoWait(900);

  setLabel('STEP 1 — CLICK TO SELECT A TILE', 'Move your cursor over a tile to select it');
  setProgress(15);
  const { x: x0, y: y0 } = tileCenter(0);
  setCursor(x0, y0);
  await demoWait(700);

  await clickAt(0);
  document.getElementById('demo-t0')?.classList.add('selected');
  setLabel('TILE SELECTED ✦', 'Glowing border = this tile is ready to swap');
  setProgress(35);
  await demoWait(850);

  setLabel('STEP 2 — CLICK ANOTHER TILE TO SWAP', 'Pick the tile you want to swap with');
  setProgress(55);
  await demoWait(500);

  await clickAt(3);
  document.getElementById('demo-t0')?.classList.remove('selected');
  setProgress(70);

  await swapDemoTiles(0, 3);
  await demoWait(300);

  setLabel('ROW ALIGNED ✓', 'Each row now shares the same domain — SOC and IAM');
  setProgress(85);
  const board = document.getElementById('demo-board');
  if (board) Array.from(board.children).forEach(el => el.classList.add('correct'));
  await demoWait(600);

  if (stage) setCursor(stage.offsetWidth / 2, stage.offsetHeight / 2);
  setLabel('PUZZLE SOLVED! ✓  — Now you try it 🎉', 'Click tiles to swap, solve every row');
  setProgress(100);
  await demoWait(2600);

  if (board) Array.from(board.children).forEach(el => el.classList.remove('correct'));
  await demoWait(400);
}

async function swapDemoTiles(posA, posB) {
  const a = document.getElementById(`demo-t${posA}`);
  const b = document.getElementById(`demo-t${posB}`);
  if (!a || !b) return;

  a.style.opacity = '0.35';
  b.style.opacity = '0.35';
  await demoWait(160);

  const tmpDomain  = a.dataset.domain;
  const tmpHtml    = a.innerHTML;
  a.dataset.domain = b.dataset.domain;
  a.innerHTML      = b.innerHTML;
  b.dataset.domain = tmpDomain;
  b.innerHTML      = tmpHtml;

  a.style.opacity = '1';
  b.style.opacity = '1';

  a.style.transition = 'border-color 0.2s, box-shadow 0.2s';
  b.style.transition = 'border-color 0.2s, box-shadow 0.2s';
  a.style.borderColor = 'var(--cyan)'; a.style.boxShadow = 'var(--glow-cyan)';
  b.style.borderColor = 'var(--cyan)'; b.style.boxShadow = 'var(--glow-cyan)';
  await demoWait(350);
  a.style.borderColor = ''; a.style.boxShadow = '';
  b.style.borderColor = ''; b.style.boxShadow = '';
}

/* ═══════════════════════════════════════════
   THREAT MATCHING DEMO
════════════════════════════════════════════ */
async function runThreatDemo() {
  buildDemoBoard([...DEMO_THREAT_TILES], 2);
  setProgress(0);
  const stage = document.getElementById('demo-stage');
  if (stage) setCursor(stage.offsetWidth / 2, stage.offsetHeight / 2);

  setLabel('THREAT MATCHING — PAIR EACH THREAT WITH ITS CONTROL', 'Find the matching security control for each red threat tile');
  await demoWait(950);

  // ── Pair 1: Phishing (t0) → Awareness (t1) ──
  setLabel('STEP 1 — SELECT A THREAT TILE', 'Click the red threat you want to match');
  setProgress(12);
  await clickAt(0);
  document.getElementById('demo-t0')?.classList.add('selected');
  setLabel('PHISHING SELECTED ✦', 'Now click the matching security control');
  setProgress(28);
  await demoWait(750);

  setLabel('STEP 2 — CLICK THE MATCHING CONTROL', 'Security Awareness training counters Phishing attacks');
  await clickAt(1);
  document.getElementById('demo-t0')?.classList.remove('selected');
  await matchPairDemoAnim(0, 1);
  setLabel('MATCH! ✓  PHISHING → AWARENESS TRAINING', 'Correct — the threat is neutralized!');
  setProgress(55);
  await demoWait(950);

  // ── Pair 2: Ransomware (t2) → Backup (t3) ──
  setLabel('STEP 3 — CLEAR THE NEXT THREAT', 'Select the Ransomware threat tile');
  setProgress(65);
  await clickAt(2);
  document.getElementById('demo-t2')?.classList.add('selected');
  await demoWait(600);

  await clickAt(3);
  document.getElementById('demo-t2')?.classList.remove('selected');
  await matchPairDemoAnim(2, 3);
  setLabel('MATCH! ✓  RANSOMWARE → BACKUP & RECOVERY', 'Board cleared — all threats paired!');
  setProgress(90);
  await demoWait(800);

  setLabel('BOARD CLEARED ✓ — ALL THREATS MATCHED 🎉', 'Lower breach = higher Accuracy Bonus in your score');
  setProgress(100);
  await demoWait(2500);
  setProgress(0);
  await demoWait(400);
}

async function matchPairDemoAnim(posA, posB) {
  const a = document.getElementById(`demo-t${posA}`);
  const b = document.getElementById(`demo-t${posB}`);
  if (!a || !b) return;
  a.classList.add('correct');
  b.classList.add('correct');
  await demoWait(380);
  a.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  b.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  a.style.opacity   = '0'; a.style.transform = 'scale(0.82)';
  b.style.opacity   = '0'; b.style.transform = 'scale(0.82)';
  await demoWait(380);
}

/* ═══════════════════════════════════════════
   INCIDENT RESPONSE DEMO
════════════════════════════════════════════ */
async function runIncidentDemo() {
  buildDemoBoard([...DEMO_INCIDENT_TILES], 2);
  // Mark all tiles as active threats (pulsing red)
  for (let i = 0; i < 4; i++) {
    document.getElementById(`demo-t${i}`)?.classList.add('threat-active');
  }
  setProgress(0);
  showDemoBreach();
  setDemoBreach(0);

  const stage = document.getElementById('demo-stage');
  if (stage) setCursor(stage.offsetWidth / 2, stage.offsetHeight / 2);

  setLabel('INCIDENT RESPONSE — NEUTRALIZE THREATS BEFORE 100% BREACH', 'Threats fill the breach meter every second — click to remove them');
  await demoWait(950);

  // Breach rises while player reacts
  setLabel('⚠ THREATS ACTIVE — BREACH IS FILLING!', 'Act fast or the mission fails at 100%');
  setProgress(10);
  await animateDemoBreach(0, 20, 1200);

  // Neutralize DDoS (t0)
  setLabel('STEP 1 — CLICK A THREAT TO NEUTRALIZE IT', 'Click the DDoS tile to remove it');
  await clickAt(0);
  await neutralizeTileDemo(0);
  setLabel('DDOS NEUTRALIZED ✓', 'Threat removed — breach growth slows');
  setProgress(38);
  await demoWait(450);

  await animateDemoBreach(20, 34, 900);

  // Neutralize Phishing (t1)
  setLabel('KEEP GOING — MORE THREATS ACTIVE', 'Each neutralized tile slows the breach rate');
  await clickAt(1);
  await neutralizeTileDemo(1);
  setLabel('PHISHING NEUTRALIZED ✓', 'Stay focused!');
  setProgress(60);
  await demoWait(400);

  await animateDemoBreach(34, 48, 750);

  // Neutralize APT (t2)
  await clickAt(2);
  await neutralizeTileDemo(2);
  setLabel('APT NEUTRALIZED ✓', 'Almost clear!');
  setProgress(78);
  await demoWait(350);

  await animateDemoBreach(48, 58, 600);

  // Neutralize Ransomware (t3)
  await clickAt(3);
  await neutralizeTileDemo(3);
  setProgress(92);
  await demoWait(300);

  setLabel('ALL THREATS CLEARED! ✓  — SURVIVED AT 58% BREACH 🎉', 'Lower breach = better Accuracy Bonus');
  setProgress(100);
  await demoWait(2500);

  hideDemoBreach();
  setProgress(0);
  await demoWait(400);
}

async function neutralizeTileDemo(pos) {
  const el = document.getElementById(`demo-t${pos}`);
  if (!el) return;
  el.classList.remove('threat-active');
  el.classList.add('correct');
  await demoWait(220);
  el.style.transition = 'opacity 0.32s ease, transform 0.32s ease';
  el.style.opacity    = '0';
  el.style.transform  = 'scale(0.78)';
  await demoWait(340);
}
