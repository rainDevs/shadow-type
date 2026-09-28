// Difficulty configuration: CPU damage only.
// Mode (15/30/60 SECS) controls turn length + word pool.
// Both fighters start at 100 HP on every difficulty.

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'EASY',
    description: 'Enemy strikes 6–12 damage. Forgiving.',
    maxHp: 100,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 6,
    cpuDamageMax: 12,
  },
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    description: 'Enemy strikes 13–18 damage. Balanced.',
    maxHp: 100,
    cpuTelegraphMs: 2300,
    cpuDamageMin: 13,
    cpuDamageMax: 18,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    description: 'Enemy strikes 19–24 damage. Relentless.',
    maxHp: 100,
    cpuTelegraphMs: 2000,
    cpuDamageMin: 19,
    cpuDamageMax: 24,
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
