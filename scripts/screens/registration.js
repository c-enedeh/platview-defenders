import { getCodename, setCodename } from '../storage.js';
import { navigateTo } from '../router.js';
import { showToast } from '../ui.js';

const CODENAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

let submitHandler = null;

export function onEnter() {
  const form     = document.getElementById('reg-form');
  const input    = document.getElementById('input-codename');
  const errorEl  = document.getElementById('reg-error');
  const returnEl = document.getElementById('reg-returning');
  const btn      = document.getElementById('btn-access');

  // Check for returning user
  const existing = getCodename();
  if (existing) {
    input.value = existing;
    returnEl.textContent = `⬡ Welcome back, ${existing}! Press Access to continue.`;
    returnEl.classList.remove('hidden');
  } else {
    returnEl.classList.add('hidden');
  }

  errorEl.classList.add('hidden');
  btn.textContent   = 'ACCESS CHALLENGE ▶';
  btn.style.background = '';

  // Clean up old listener before attaching
  if (submitHandler) form.removeEventListener('submit', submitHandler);

  submitHandler = (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!validate(raw, errorEl)) return;

    setCodename(raw);
    btn.textContent       = '✓ IDENTITY CONFIRMED';
    btn.style.background  = 'var(--neon-green)';
    btn.style.color       = '#000';
    btn.disabled          = true;

    setTimeout(() => {
      btn.disabled    = false;
      btn.style.color = '';
      // First-time users see the tutorial; returning users go straight to lobby
      const isNew = !existing;
      navigateTo(isNew ? 'tutorial' : 'lobby');
    }, 650);
  };

  form.addEventListener('submit', submitHandler);
}

export function onExit() {
  const form = document.getElementById('reg-form');
  if (submitHandler) {
    form?.removeEventListener('submit', submitHandler);
    submitHandler = null;
  }
}

function validate(raw, errorEl) {
  if (!raw) {
    return showValidationError(errorEl, 'Codename cannot be empty.');
  }
  if (!CODENAME_RE.test(raw)) {
    return showValidationError(errorEl, 'Codename must be 3–16 chars: letters, numbers, underscore only.');
  }
  errorEl.classList.add('hidden');
  return true;
}

function showValidationError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  el.animate(
    [{ transform:'translateX(-4px)' }, { transform:'translateX(4px)' },
     { transform:'translateX(-2px)' }, { transform:'translateX(0)' }],
    { duration: 240, easing: 'ease' }
  );
  return false;
}
