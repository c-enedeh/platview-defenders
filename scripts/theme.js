const KEY = 'pvd:theme';

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const theme = saved || 'dark';
  document.documentElement.dataset.theme = theme;
  _syncIcon(theme);
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(KEY, next);
  _syncIcon(next);
}

function _syncIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
}
