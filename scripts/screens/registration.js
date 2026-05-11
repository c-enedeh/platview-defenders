import { getCodename, setCodename, getUserId, setUserId } from '../storage.js';
import { navigateTo } from '../router.js';
import { showToast, showGlobalLoading, hideGlobalLoading } from '../ui.js';
import { getOrCreateUser } from '../supabase.js';

const CODENAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

let submitHandler = null;

export function onEnter() {
  const form     = document.getElementById('reg-form');
  const input    = document.getElementById('input-codename');
  const errorEl  = document.getElementById('reg-error');
  const returnEl = document.getElementById('reg-returning');
  const btn      = document.getElementById('btn-access');

  // Returning user — already has a session
  const existing   = getCodename();
  const existingId = getUserId();
  if (existing && existingId) {
    input.value = existing;
    returnEl.textContent = `⬡ Welcome back, ${existing}! Press Access to continue.`;
    returnEl.classList.remove('hidden');
  } else {
    returnEl.classList.add('hidden');
  }

  errorEl.classList.add('hidden');
  btn.textContent      = 'ACCESS CHALLENGE ▶';
  btn.style.background = '';
  btn.style.color      = '';
  btn.disabled         = false;

  if (submitHandler) form.removeEventListener('submit', submitHandler);

  submitHandler = async (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!validate(raw, errorEl)) return;

    btn.textContent = '⬡ CONNECTING…';
    btn.disabled    = true;
    errorEl.classList.add('hidden');
    showGlobalLoading('CONNECTING TO PLATVIEW…');

    try {
      const user = await getOrCreateUser(raw);
      setCodename(user.codename);
      setUserId(user.id);

      const isNew = !existing || existing !== raw;
      hideGlobalLoading();
      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = 'ACCESS CHALLENGE ▶';
        navigateTo(isNew ? 'tutorial' : 'lobby');
      }, 350);
    } catch (err) {
      console.error('[Registration]', err);
      hideGlobalLoading();
      btn.textContent = 'ACCESS CHALLENGE ▶';
      btn.disabled    = false;
      showValidationError(errorEl, 'Could not connect to server. Check your connection and try again.');
    }
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
