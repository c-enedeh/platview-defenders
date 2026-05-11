// Reads .env and writes scripts/config.js — run once before opening the app.
// Usage: npm run setup
import { readFileSync, writeFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

writeFileSync('scripts/config.js',
`export const SUPABASE_URL      = '${SUPABASE_URL}';\nexport const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';\n`
);
console.log('✓  scripts/config.js generated from .env');
