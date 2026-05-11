export function calculateScore({ timeRemaining, timeLimit, breachPct, moves }) {
  const baseScore     = 10000;
  const speedBonus    = Math.max(0, Math.floor((timeRemaining / timeLimit) * 3000));
  const accuracyBonus = Math.max(0, 2000 - (Math.round(breachPct) * 20));
  const moveBonus     = Math.max(0, 1000 - (moves * 10));
  const totalScore    = baseScore + speedBonus + accuracyBonus + moveBonus;
  return { totalScore, baseScore, speedBonus, accuracyBonus, moveBonus };
}

export function formatScore(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
