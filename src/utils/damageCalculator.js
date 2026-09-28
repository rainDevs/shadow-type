// Timed-turn damage calculation (rate-based).
// Damage scales 2–24 from accuracy-adjusted WPM:
//   damage = round(adjusted WPM / 3.5)
// A rate, not a throughput total, so every WPM point counts on every mode
// and longer windows grant no free damage. Bands follow the standard
// adjusted-WPM skill benchmarks: each tier owns a clean damage range.

export const WINDOW_DAMAGE_MIN = 2;
export const WINDOW_DAMAGE_MAX = 24;
const DAMAGE_DIVISOR = 3.5;

export const WPM_TIERS = [
  { id: 'learning', label: 'LEARNING', min: 0, max: 20 },
  { id: 'beginner', label: 'BEGINNER', min: 20, max: 35 },
  { id: 'average', label: 'AVERAGE', min: 35, max: 50 },
  { id: 'productive', label: 'PRODUCTIVE', min: 50, max: 70 },
  { id: 'high', label: 'HIGH SPEED', min: 70, max: 90 },
  { id: 'competitive', label: 'COMPETITIVE', min: 90, max: Infinity },
];

export function tierForWpm(wpm) {
  const w = Math.max(0, wpm);
  return WPM_TIERS.find((t) => w < t.max) ?? WPM_TIERS[WPM_TIERS.length - 1];
}

export function calculateWindowDamage({ wpm }) {
  // wpm arrives already accuracy-adjusted, so no multiplier here.
  const damage = Math.round(Math.max(0, wpm) / DAMAGE_DIVISOR);
  return {
    damage: Math.min(WINDOW_DAMAGE_MAX, Math.max(WINDOW_DAMAGE_MIN, damage)),
  };
}
