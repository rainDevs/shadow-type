// Timed-turn damage calculation.
// Deterministic: damage comes from window typing performance.
// In a fixed window, words completed already encodes speed, so damage
// scales with throughput (WPM x window length) and accuracy.

export const WINDOW_DAMAGE_MIN = 5;
export const WINDOW_DAMAGE_MAX = 40;
export const CRITICAL_MULTIPLIER = 1.5;
export const CRITICAL_ACCURACY = 97;

export function calculateWindowDamage({ wpm, accuracy, turnSeconds }) {
  const safeAcc = Math.min(100, Math.max(0, accuracy)) / 100;
  const minutes = Math.max(1, turnSeconds) / 60;
  let damage = Math.max(0, wpm) * safeAcc * minutes * 2;
  const critical = isCriticalHit({ accuracy });
  if (critical) damage *= CRITICAL_MULTIPLIER;
  damage = Math.round(damage);
  return {
    damage: Math.min(WINDOW_DAMAGE_MAX, Math.max(WINDOW_DAMAGE_MIN, damage)),
    critical,
  };
}

export function isCriticalHit({ accuracy }) {
  return accuracy >= CRITICAL_ACCURACY;
}
