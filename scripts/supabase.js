import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Find an existing user by codename, or create a new one.
// Returns { id, codename, created_at }
export async function getOrCreateUser(codename) {
  const { data: existing, error: findErr } = await supabase
    .from('users')
    .select('id, codename, created_at')
    .eq('codename', codename)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: newUser, error: createErr } = await supabase
    .from('users')
    .insert({ codename })
    .select('id, codename, created_at')
    .single();

  if (createErr) throw createErr;
  return newUser;
}

// Fetch the most recent game history entries for a user.
// Returns camelCase entries compatible with the existing lobby renderer.
export async function getHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('game_history')
    .select('mode, level, total_score, base_score, speed_bonus, accuracy_bonus, move_bonus, breach_pct, moves, time_remaining, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map(row => ({
    mode:          row.mode,
    level:         row.level,
    totalScore:    row.total_score,
    baseScore:     row.base_score,
    speedBonus:    row.speed_bonus,
    accuracyBonus: row.accuracy_bonus,
    moveBonus:     row.move_bonus,
    breachPct:     row.breach_pct,
    moves:         row.moves,
    timeRemaining: row.time_remaining,
    date:          new Date(row.played_at).getTime(),
  }));
}

// Save a completed game result: inserts a history row and upserts the
// personal best if this score beats the current record.
// Returns { isNewPB: boolean }
export async function saveResult(userId, entry) {
  const { error: histErr } = await supabase.from('game_history').insert({
    user_id:        userId,
    mode:           entry.mode,
    level:          entry.level,
    total_score:    entry.totalScore,
    base_score:     entry.baseScore,
    speed_bonus:    entry.speedBonus,
    accuracy_bonus: entry.accuracyBonus,
    move_bonus:     entry.moveBonus,
    breach_pct:     entry.breachPct,
    moves:          entry.moves,
    time_remaining: entry.timeRemaining,
  });
  if (histErr) console.error('[DB] history insert:', histErr.message);

  if (!entry.totalScore || entry.totalScore <= 0) return { isNewPB: false };

  const { data: currentPB } = await supabase
    .from('personal_bests')
    .select('best_score')
    .eq('user_id', userId)
    .eq('mode', entry.mode)
    .maybeSingle();

  const isNewPB = !currentPB || entry.totalScore > currentPB.best_score;
  if (isNewPB) {
    const { error: pbErr } = await supabase.from('personal_bests').upsert({
      user_id:    userId,
      mode:       entry.mode,
      best_score: entry.totalScore,
      level:      entry.level,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,mode' });
    if (pbErr) console.error('[DB] PB upsert:', pbErr.message);
  }

  return { isNewPB };
}

// Fetch personal bests for all four modes at once.
// Returns { domain, threat, incident, rubiks } — each is { score, level } or absent.
export async function getPersonalBests(userId) {
  const { data, error } = await supabase
    .from('personal_bests')
    .select('mode, best_score, level')
    .eq('user_id', userId);

  if (error || !data) return {};

  return data.reduce((acc, row) => {
    acc[row.mode] = { score: row.best_score, level: row.level };
    return acc;
  }, {});
}

// Fetch global leaderboard for a given mode, ordered by best score descending.
// Returns [{ rank, codename, bestScore, level, updatedAt }]
export async function getLeaderboard(mode, limit = 25) {
  const { data, error } = await supabase
    .from('personal_bests')
    .select('best_score, level, updated_at, users(codename)')
    .eq('mode', mode)
    .order('best_score', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row, i) => ({
    rank:      i + 1,
    codename:  row.users?.codename ?? '—',
    bestScore: row.best_score,
    level:     row.level,
    updatedAt: row.updated_at,
  }));
}

// Returns the single highest score across all modes, or null.
export async function getOverallBest(userId) {
  const { data, error } = await supabase
    .from('personal_bests')
    .select('best_score')
    .eq('user_id', userId)
    .order('best_score', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.best_score;
}
