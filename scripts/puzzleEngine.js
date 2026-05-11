/* ── Tile factory ── */
export function makeTile(domain, label, abbr, index) {
  return { id: `tile-${index}`, domain, label, abbr, index };
}

/* ── Render board (called ONCE on setup) ── */
export function renderBoard(boardEl, tiles, onTileClick, interactive = true) {
  const cols = Math.sqrt(tiles.length);
  boardEl.setAttribute('data-cols', cols);
  boardEl.style.setProperty('--board-cols', cols);
  boardEl.innerHTML = '';

  tiles.forEach((tile, pos) => {
    const el = document.createElement('div');
    el.className   = 'tile';
    el.id          = tile.id;
    el.dataset.pos = pos;
    el.dataset.domain = tile.domain;
    el.setAttribute('role', 'gridcell');
    el.setAttribute('aria-label', tile.label);
    el.innerHTML = `<span class="tile__abbr">${tile.abbr}</span><span class="tile__label">${tile.label}</span>`;
    if (interactive) {
      el.addEventListener('click', () => onTileClick(pos));
    } else {
      el.setAttribute('aria-disabled', 'true');
    }
    boardEl.appendChild(el);
  });
}

/* ── FLIP swap animation ── */
export function flipSwap(boardEl, posA, posB, tiles, afterSwap) {
  const elA = boardEl.children[posA];
  const elB = boardEl.children[posB];
  if (!elA || !elB) return;

  const rA = elA.getBoundingClientRect();
  const rB = elB.getBoundingClientRect();
  const dx = rA.left - rB.left;
  const dy = rA.top  - rB.top;

  elA.style.transition = 'transform 200ms ease';
  elB.style.transition = 'transform 200ms ease';
  elA.style.transform  = `translate(${-dx}px, ${-dy}px)`;
  elB.style.transform  = `translate(${dx}px,  ${dy}px)`;

  setTimeout(() => {
    // Perform actual data swap
    [tiles[posA], tiles[posB]] = [tiles[posB], tiles[posA]];

    // Re-render silently (DOM rebuild after transition to sync state)
    const savedOnClick = elA.__clickHandler; // if needed
    elA.style.transition = 'none';
    elB.style.transition = 'none';
    elA.style.transform  = '';
    elB.style.transform  = '';

    // Update DOM positions by re-stamping the inner content and data attrs
    const tileA = tiles[posA];
    const tileB = tiles[posB];

    elA.dataset.domain = tileA.domain;
    elA.id             = tileA.id;
    elA.setAttribute('aria-label', tileA.label);
    elA.innerHTML = `<span class="tile__abbr">${tileA.abbr}</span><span class="tile__label">${tileA.label}</span>`;

    elB.dataset.domain = tileB.domain;
    elB.id             = tileB.id;
    elB.setAttribute('aria-label', tileB.label);
    elB.innerHTML = `<span class="tile__abbr">${tileB.abbr}</span><span class="tile__label">${tileB.label}</span>`;

    if (afterSwap) afterSwap();
  }, 210);
}

/* ── Highlight correct positions ── */
export function highlightCorrect(boardEl, tiles, solvedTiles) {
  tiles.forEach((tile, pos) => {
    const el = boardEl.children[pos];
    if (!el) return;
    const correct = tile.domain === solvedTiles[pos].domain;
    el.classList.toggle('correct', correct);
  });
}

/* ── Scramble a solved tile array ── */
export function scrambleTiles(tiles, swaps) {
  const arr = [...tiles];
  let prev = -1;
  for (let s = 0; s < swaps; s++) {
    let a = Math.floor(Math.random() * arr.length);
    let b = Math.floor(Math.random() * arr.length);
    // Avoid same-index and consecutive same swap
    let tries = 0;
    while ((a === b || (a === prev && b === prev)) && tries < 20) {
      b = Math.floor(Math.random() * arr.length);
      tries++;
    }
    [arr[a], arr[b]] = [arr[b], arr[a]];
    prev = a;
  }
  // If accidentally solved (very rare), do one more forced swap
  if (arr.every((t, i) => t.id === tiles[i].id)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

/* ── Check solved (domain alignment) ── */
export function isSolvedAlignment(currentTiles, solvedTiles) {
  return currentTiles.every((t, i) => t.domain === solvedTiles[i].domain);
}
