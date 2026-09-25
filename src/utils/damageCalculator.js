// Timed-turn damage calculation.
// Damage scales 1–15 from accuracy-adjusted WPM:
//   damage = round(adjustedWPM × windowMinutes)
// i.e. every 5 accurate characters of throughput deals ~1 damage.

export const WINDOW_DAMAGE_MIN = 1;
export const WINDOW_DAMAGE_MAX = 15;

export function calculateWindowDamage({ wpm, turnSeconds }) {
  // wpm arrives already accuracy-adjusted, so no multiplier here.
  const minutes = Math.max(1, turnSeconds) / 60;
  const damage = Math.round(Math.max(0, wpm) * minutes);
  return {
    damage: Math.min(WINDOW_DAMAGE_MAX, Math.max(WINDOW_DAMAGE_MIN, damage)),
  };
}
