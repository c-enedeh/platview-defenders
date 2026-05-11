import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ══════════════════════════════════════════
   DOMAIN META
══════════════════════════════════════════ */
const DOMAIN_META = [
  { key: 'iam',      abbr: 'IAM',   color: 0x1A4FC4 },
  { key: 'cloud',    abbr: 'CLOUD', color: 0x0F8FD8 },
  { key: 'soc',      abbr: 'SOC',   color: 0x0DAF82 },
  { key: 'network',  abbr: 'NET',   color: 0x6B3FA0 },
  { key: 'endpoint', abbr: 'ENDPT', color: 0xC44B1A },
  { key: 'data',     abbr: 'DATA',  color: 0xB8A000 },
];

const FACE_NORMALS = [
  new THREE.Vector3( 1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3( 0, 1, 0),
  new THREE.Vector3( 0,-1, 0),
  new THREE.Vector3( 0, 0, 1),
  new THREE.Vector3( 0, 0,-1),
];

/* ══════════════════════════════════════════
   LEVEL DATA
══════════════════════════════════════════ */
const LEVELS = [
  { name: 'Surface Scan',       scrambleMoves:  5, timeLimit: 300 },
  { name: 'Network Probe',      scrambleMoves:  7, timeLimit: 280 },
  { name: 'Lateral Move',       scrambleMoves: 10, timeLimit: 260 },
  { name: 'Privilege Escalate', scrambleMoves: 12, timeLimit: 240 },
  { name: 'Persistence Layer',  scrambleMoves: 15, timeLimit: 210 },
  { name: 'C2 Channel',         scrambleMoves: 18, timeLimit: 180 },
  { name: 'Data Exfil',         scrambleMoves: 20, timeLimit: 160 },
  { name: 'Ransomware Prep',    scrambleMoves: 22, timeLimit: 140 },
  { name: 'Zero Day',           scrambleMoves: 25, timeLimit: 120 },
  { name: 'Full Compromise',    scrambleMoves: 30, timeLimit:  90 },
];

export function getLevelData(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
}

export function getObjective(levelData) {
  return `REALIGN ALL 6 FACES — ${levelData.name.toUpperCase()}`;
}

/* ══════════════════════════════════════════
   HINT LABEL HELPER (exported for UI)
══════════════════════════════════════════ */
export function hintMoveToLabel(move) {
  const layerNames = {
    x: { '-1': 'LEFT', '0': 'CENTER', '1': 'RIGHT' },
    y: { '-1': 'BOTTOM', '0': 'MIDDLE', '1': 'TOP' },
    z: { '-1': 'BACK', '0': 'CENTER', '1': 'FRONT' },
  };
  const typeNames = { x: 'COLUMN', y: 'ROW', z: 'LAYER' };
  const arrows = {
    x: { '1': '↑', '-1': '↓' },
    y: { '1': '→', '-1': '←' },
    z: { '1': '↺', '-1': '↻' },
  };
  const layer = layerNames[move.axis][String(move.layer)] ?? 'CENTER';
  const arrow = arrows[move.axis][String(move.dir)] ?? '→';
  const type  = typeNames[move.axis];
  return { arrow, text: `SWIPE ${arrow} ON THE ${layer} ${type}` };
}

/* ══════════════════════════════════════════
   STICKER TEXTURE CACHE
══════════════════════════════════════════ */
function makeStickerTexture(domainIndex) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const meta = DOMAIN_META[domainIndex];
  const hex = '#' + meta.color.toString(16).padStart(6, '0');

  const r = 14;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0); ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r); ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size); ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0); ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r); ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size); ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.abbr, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const _texCache = new Map();
function getStickerTexture(domainIndex) {
  if (!_texCache.has(domainIndex)) _texCache.set(domainIndex, makeStickerTexture(domainIndex));
  return _texCache.get(domainIndex);
}

/* ══════════════════════════════════════════
   SCRAMBLE HELPERS
══════════════════════════════════════════ */
function randomMoves(count) {
  const axes = ['x', 'y', 'z'], layers = [-1, 0, 1], dirs = [1, -1];
  const moves = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    let m;
    do {
      m = { axis: axes[Math.floor(Math.random() * 3)], layer: layers[Math.floor(Math.random() * 3)], dir: dirs[Math.floor(Math.random() * 2)] };
    } while (prev && m.axis === prev.axis && m.layer === prev.layer);
    moves.push(m);
    prev = m;
  }
  return moves;
}

/* ══════════════════════════════════════════
   MAIN EXPORT: createRubiksScene
══════════════════════════════════════════ */
export function createRubiksScene(canvas, { levelData, onSolved, onMove }) {
  /* ── Renderer ── */
  const w = window.innerWidth;
  const h = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x0a0d14, 1);
  renderer.shadowMap.enabled = false;

  /* ── Scene ── */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0d14, 0.042);

  /* ── Camera ── */
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(4.5, 3.5, 5);
  camera.lookAt(0, 0, 0);

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
  keyLight.position.set(6, 10, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6688ff, 0.2);
  fillLight.position.set(-5, -5, -5);
  scene.add(fillLight);

  /* Animated glow point lights for atmosphere */
  const glowCyan = new THREE.PointLight(0x00C6FF, 2.8, 14);
  glowCyan.position.set(-4, 3, 3);
  scene.add(glowCyan);

  const glowPurple = new THREE.PointLight(0x7B47FF, 2.2, 14);
  glowPurple.position.set(4, -3, -3);
  scene.add(glowPurple);

  const glowGreen = new THREE.PointLight(0x00FF8C, 1.2, 10);
  glowGreen.position.set(0, -5, 4);
  scene.add(glowGreen);

  /* ── Floating particle field ── */
  const PARTICLE_COUNT = 80;
  const pPositions  = new Float32Array(PARTICLE_COUNT * 3);
  const pVelocities = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPositions[i * 3]     = (Math.random() - 0.5) * 16;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    pVelocities[i * 3]     = (Math.random() - 0.5) * 0.005;
    pVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
    pVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x00C6FF, size: 0.045, transparent: true, opacity: 0.5, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ── OrbitControls ── */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 10;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;

  /* ══════════════════════════════════════════
     CUBIE CONSTRUCTION
  ══════════════════════════════════════════ */
  const CUBIE_SIZE = 0.95;
  const GAP = 0.05;
  const STEP = CUBIE_SIZE + GAP;

  const innerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const cubies   = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const mats = [];
        for (let f = 0; f < 6; f++) {
          const axisIdx   = Math.floor(f / 2);
          const sign      = (f % 2 === 0) ? 1 : -1;
          const cubieComp = [x, y, z][axisIdx];
          if (cubieComp === sign) {
            mats.push(new THREE.MeshStandardMaterial({ map: getStickerTexture(f), roughness: 0.35, metalness: 0.15 }));
          } else {
            mats.push(innerMat);
          }
        }
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE), mats);
        mesh.position.set(x * STEP, y * STEP, z * STEP);
        scene.add(mesh);
        cubies.push({ mesh, pos: { x, y, z } });
      }
    }
  }

  /* ══════════════════════════════════════════
     SHARED TEMPORARIES  +  MOVE TRACKING
  ══════════════════════════════════════════ */
  let moveCount = 0;
  const _quatTmp = new THREE.Quaternion();
  const _axisTmp = new THREE.Vector3();

  /* ══════════════════════════════════════════
     SCRAMBLE  (instant, no animation)
  ══════════════════════════════════════════ */
  const scrambleMoveList = randomMoves(levelData.scrambleMoves);
  scrambleMoveList.forEach(m => applyMoveInstant(m));

  /* ══════════════════════════════════════════
     HINT SYSTEM
     Solve sequence = scramble reversed with flipped dirs.
     hintStep advances after every player move.
  ══════════════════════════════════════════ */
  const solveSequence = [...scrambleMoveList].reverse().map(m => ({ ...m, dir: -m.dir }));
  let hintStep = 0;
  let hintSlice = []; // cubies currently highlighted

  function getNextHint() {
    if (hintStep >= solveSequence.length) return null;
    return solveSequence[hintStep];
  }

  function activateHintHighlight() {
    clearHintHighlight();
    const move = getNextHint();
    if (!move) return;
    hintSlice = cubies.filter(c => Math.round(c.pos[move.axis]) === move.layer);
  }

  function clearHintHighlight() {
    hintSlice.forEach(c => {
      c.mesh.material.forEach(m => { if (m !== innerMat) m.emissiveIntensity = 0; });
    });
    hintSlice = [];
  }

  /* ══════════════════════════════════════════
     WIN CHECK
  ══════════════════════════════════════════ */
  function checkWin() {
    for (let fi = 0; fi < 6; fi++) {
      const worldNormal = FACE_NORMALS[fi].clone();
      const domains = [];
      for (const c of cubies) {
        const localNormal = worldNormal.clone().applyQuaternion(c.mesh.quaternion.clone().invert());
        let bestF = 0, bestDot = -Infinity;
        for (let lf = 0; lf < 6; lf++) {
          const dot = localNormal.dot(FACE_NORMALS[lf]);
          if (dot > bestDot) { bestDot = dot; bestF = lf; }
        }
        if (bestDot < 0.7) continue;
        const mat = c.mesh.material[bestF];
        if (mat === innerMat) continue;
        const d = getDomainFromMat(mat);
        if (d === -1) continue;
        domains.push(d);
      }
      if (domains.length < 9) return false;
      if (new Set(domains).size > 1) return false;
    }
    return true;
  }

  function getDomainFromMat(mat) {
    if (!mat || !mat.map) return -1;
    for (let d = 0; d < DOMAIN_META.length; d++) {
      if (getStickerTexture(d) === mat.map) return d;
    }
    return -1;
  }

  /* ══════════════════════════════════════════
     INSTANT MOVE (used by scramble)
  ══════════════════════════════════════════ */
  function applyMoveInstant({ axis, layer, dir }) {
    const angle = dir * Math.PI / 2;
    _axisTmp.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    _quatTmp.setFromAxisAngle(_axisTmp, angle);
    const slice = cubies.filter(c => Math.round(c.pos[axis]) === layer);
    for (const c of slice) {
      const p = new THREE.Vector3(c.pos.x * STEP, c.pos.y * STEP, c.pos.z * STEP);
      p.applyQuaternion(_quatTmp);
      c.mesh.position.copy(p);
      c.mesh.quaternion.premultiply(_quatTmp);
      const lp = new THREE.Vector3(c.pos.x, c.pos.y, c.pos.z);
      lp.applyQuaternion(_quatTmp);
      c.pos.x = Math.round(lp.x);
      c.pos.y = Math.round(lp.y);
      c.pos.z = Math.round(lp.z);
    }
  }

  /* ══════════════════════════════════════════
     ANIMATED MOVE (player interaction)
  ══════════════════════════════════════════ */
  let isTweening = false;

  function applyMoveAnimated({ axis, layer, dir }, callback) {
    if (isTweening) return;
    isTweening = true;
    moveCount++;

    const targetAngle = dir * Math.PI / 2;
    const axisVec = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    const slice   = cubies.filter(c => Math.round(c.pos[axis]) === layer);

    const pivot = new THREE.Group();
    scene.add(pivot);
    slice.forEach(c => pivot.attach(c.mesh));

    const duration = 220;
    const start    = performance.now();

    function tick(now) {
      const t     = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      pivot.rotation[axis] = targetAngle * eased;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        pivot.rotation[axis] = targetAngle;
        const sliceQ = new THREE.Quaternion().setFromAxisAngle(axisVec, targetAngle);
        slice.forEach(c => {
          scene.attach(c.mesh);
          c.mesh.position.x = Math.round(c.mesh.position.x / STEP) * STEP;
          c.mesh.position.y = Math.round(c.mesh.position.y / STEP) * STEP;
          c.mesh.position.z = Math.round(c.mesh.position.z / STEP) * STEP;
          const lp = new THREE.Vector3(c.pos.x, c.pos.y, c.pos.z);
          lp.applyQuaternion(sliceQ);
          c.pos.x = Math.round(lp.x);
          c.pos.y = Math.round(lp.y);
          c.pos.z = Math.round(lp.z);
        });
        scene.remove(pivot);

        // Advance hint step after every player move
        clearHintHighlight();
        hintStep = Math.min(hintStep + 1, solveSequence.length);

        isTweening = false;
        onMove && onMove(moveCount);
        callback && callback();
      }
    }
    requestAnimationFrame(tick);
  }

  /* ══════════════════════════════════════════
     INTERACTION — DRAG TO TWIST SLICE
  ══════════════════════════════════════════ */
  const raycaster = new THREE.Raycaster();
  const ndcMouse  = new THREE.Vector2();
  let dragState   = null;
  const meshes    = cubies.map(c => c.mesh);

  function getNDC(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: ((cx - rect.left) / rect.width) * 2 - 1, y: -((cy - rect.top) / rect.height) * 2 + 1, cx, cy };
  }

  function onPointerDown(e) {
    if (isTweening) return;
    const { x, y, cx, cy } = getNDC(e);
    ndcMouse.set(x, y);
    raycaster.setFromCamera(ndcMouse, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    e.preventDefault();
    e.stopPropagation();
    controls.enabled = false;
    const hit      = hits[0];
    const hitCubie = cubies.find(c => c.mesh === hit.object);
    dragState = {
      startX: cx, startY: cy,
      faceNormal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize(),
      hitPos: hitCubie.pos,
      locked: false,
    };
  }

  function onPointerMove(e) {
    if (!dragState || dragState.locked || isTweening) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = cx - dragState.startX;
    const dy = cy - dragState.startY;
    if (Math.sqrt(dx * dx + dy * dy) < 5) return;

    const camRight = new THREE.Vector3();
    const camUp    = new THREE.Vector3();
    camera.matrixWorld.extractBasis(camRight, camUp, new THREE.Vector3());
    const worldDrag  = camRight.clone().multiplyScalar(dx).addScaledVector(camUp, -dy).normalize();
    const fn         = dragState.faceNormal;
    const dragOnFace = worldDrag.clone().addScaledVector(fn, -worldDrag.dot(fn)).normalize();
    const rotAxis    = new THREE.Vector3().crossVectors(fn, dragOnFace).normalize();

    const absX = Math.abs(rotAxis.x), absY = Math.abs(rotAxis.y), absZ = Math.abs(rotAxis.z);
    let move;
    if (absX >= absY && absX >= absZ) {
      move = { axis: 'x', layer: dragState.hitPos.x, dir: rotAxis.x > 0 ? 1 : -1 };
    } else if (absY >= absX && absY >= absZ) {
      move = { axis: 'y', layer: dragState.hitPos.y, dir: rotAxis.y > 0 ? 1 : -1 };
    } else {
      move = { axis: 'z', layer: dragState.hitPos.z, dir: rotAxis.z > 0 ? 1 : -1 };
    }

    dragState.locked = true;
    applyMoveAnimated(move, () => {
      controls.enabled = true;
      if (checkWin()) onSolved(moveCount);
    });
    dragState = null;
  }

  function onPointerUp() {
    if (dragState) { controls.enabled = true; dragState = null; }
  }

  canvas.addEventListener('mousedown',  onPointerDown, { passive: false });
  canvas.addEventListener('mousemove',  onPointerMove, { passive: true });
  canvas.addEventListener('mouseup',    onPointerUp,   { passive: true });
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove',  onPointerMove, { passive: true });
  canvas.addEventListener('touchend',   onPointerUp,   { passive: true });

  /* ══════════════════════════════════════════
     RESIZE HANDLER
  ══════════════════════════════════════════ */
  function onResize() {
    const rw = window.innerWidth, rh = window.innerHeight;
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh, false);
  }
  window.addEventListener('resize', onResize);

  /* ══════════════════════════════════════════
     RENDER LOOP  —  lights + particles animate here
  ══════════════════════════════════════════ */
  let rafId = null;
  let disposed = false;

  function renderLoop() {
    if (disposed) return;
    rafId = requestAnimationFrame(renderLoop);
    const t = performance.now() / 1000;

    /* Orbiting glow lights */
    glowCyan.intensity    = 2.2 + 1.2 * Math.sin(t * 0.65);
    glowCyan.position.x   = -5 * Math.cos(t * 0.18);
    glowCyan.position.z   =  5 * Math.sin(t * 0.18);

    glowPurple.intensity  = 1.8 + 0.9 * Math.sin(t * 0.52 + 2.1);
    glowPurple.position.x =  5 * Math.cos(t * 0.13 + 1.2);
    glowPurple.position.z = -5 * Math.sin(t * 0.13 + 1.2);

    glowGreen.intensity   = 0.9 + 0.5 * Math.sin(t * 0.8 + 4.2);

    /* Drift particles */
    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i]     += pVelocities[i];
      pos[i + 1] += pVelocities[i + 1];
      pos[i + 2] += pVelocities[i + 2];
      if (pos[i]     >  8) pos[i]     = -8;
      if (pos[i]     < -8) pos[i]     =  8;
      if (pos[i + 1] >  8) pos[i + 1] = -8;
      if (pos[i + 1] < -8) pos[i + 1] =  8;
      if (pos[i + 2] >  8) pos[i + 2] = -8;
      if (pos[i + 2] < -8) pos[i + 2] =  8;
    }
    pGeo.attributes.position.needsUpdate = true;

    /* Hint slice pulse */
    if (hintSlice.length) {
      const pulse = 0.22 + 0.22 * Math.sin(t * 5.5);
      hintSlice.forEach(c => {
        c.mesh.material.forEach(m => {
          if (m !== innerMat) {
            m.emissive.setHex(0xffffff);
            m.emissiveIntensity = pulse;
          }
        });
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }
  renderLoop();

  /* ══════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════ */
  return {
    getMoves:             () => moveCount,
    getNextHint,
    activateHintHighlight,
    clearHintHighlight,
    dispose() {
      disposed = true;
      clearHintHighlight();
      if (rafId) cancelAnimationFrame(rafId);
      canvas.removeEventListener('mousedown',  onPointerDown);
      canvas.removeEventListener('mousemove',  onPointerMove);
      canvas.removeEventListener('mouseup',    onPointerUp);
      canvas.removeEventListener('touchstart', onPointerDown);
      canvas.removeEventListener('touchmove',  onPointerMove);
      canvas.removeEventListener('touchend',   onPointerUp);
      window.removeEventListener('resize',     onResize);
      controls.dispose();
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      _texCache.forEach(t => t.dispose());
      _texCache.clear();
    },
  };
}
