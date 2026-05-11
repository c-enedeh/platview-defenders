import { registerScreen, navigateTo } from './router.js';
import * as tutorial     from './screens/tutorial.js';
import * as registration from './screens/registration.js';
import * as lobby        from './screens/lobby.js';
import * as arena        from './screens/arena.js';
import * as result       from './screens/result.js';
import * as rubiks       from './screens/rubiks.js';
import { getCodename }       from './storage.js';
import { initTheme, toggleTheme } from './theme.js';

// Apply saved theme before first paint and wire global toggle
initTheme();
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

registerScreen('tutorial',     tutorial);
registerScreen('registration', registration);
registerScreen('lobby',        lobby);
registerScreen('arena',        arena);
registerScreen('result',       result);
registerScreen('rubiks',       rubiks);

// Returning users (same tab session) → lobby; new users → registration
const startScreen = getCodename() ? 'lobby' : 'registration';
navigateTo(startScreen);
