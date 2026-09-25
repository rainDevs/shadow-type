// Timed-turn damage calculation (rate-based).
// Damage scales 1–20 from accuracy-adjusted WPM:
//   damage = round(adjusted WPM / 4)
// A rate, not a throughput total, so every WPM point counts on every mode
// and longer windows grant no free damage.

export const WINDOW_DAMAGE_MIN = 1;
export const WINDOW_DAMAGE_MAX = 20;
const DAMAGE_DIVISOR = 4;

export function calculateWindowDamage({ wpm }) {
  // wpm arrives already accuracy-adjusted, so no multiplier here.
  const damage = Math.round(Math.max(0, wpm) / DAMAGE_DIVISOR);
  return {
    damage: Math.min(WINDOW_DAMAGE_MAX, Math.max(WINDOW_DAMAGE_MIN, damage)),
  };
}
