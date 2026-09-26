// Difficulty configuration: CPU damage only.
// Mode (15/30/60 SECS) controls turn length + word pool.
// Both fighters start at 100 HP on every difficulty.

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'EASY',
    description: 'Enemy strikes 5–10 damage. Forgiving.',
    maxHp: 100,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 5,
    cpuDamageMax: 10,
  },
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    description: 'Enemy strikes 10–15 damage. Balanced.',
    maxHp: 100,
    cpuTelegraphMs: 2300,
    cpuDamageMin: 10,
    cpuDamageMax: 15,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    description: 'Enemy strikes 15–20 damage. Relentless.',
    maxHp: 100,
    cpuTelegraphMs: 2000,
    cpuDamageMin: 15,
    cpuDamageMax: 20,
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
