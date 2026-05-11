import { playGlitchIn } from './ui.js';

const handlers = {};
let current = null;

export function registerScreen(name, { onEnter, onExit }) {
  handlers[name] = { onEnter, onExit };
}

export function navigateTo(name, params = {}) {
  if (current && handlers[current]?.onExit) {
    try { handlers[current].onExit(); } catch (e) { console.error('onExit error', e); }
  }

  document.body.dataset.screen = name;
  current = name;

  playGlitchIn(name);

  if (handlers[name]?.onEnter) {
    try { handlers[name].onEnter(params); } catch (e) { console.error('onEnter error', e); }
  }
}

export function getCurrent() { return current; }
