// Difficulty configuration: timed turns (Monkeytype-style).
// Each player turn lasts turnSeconds; the CPU answers with a quick strike.
// Both fighters start at 100 HP on every difficulty.

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: '15 SECS',
    description: '15-second turns with short words. A forgiving enemy.',
    turnSeconds: 15,
    maxHp: 100,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 6,
    cpuDamageMax: 10,
    wordPool: 'easy',
  },
  normal: {
    id: 'normal',
    label: '30 SECS',
    description: '30-second turns with medium words. A balanced fight.',
    turnSeconds: 30,
    maxHp: 100,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 8,
    cpuDamageMax: 12,
    wordPool: 'normal',
  },
  hard: {
    id: 'hard',
    label: '60 SECS',
    description: '60-second turns with long, tricky words. Relentless enemy.',
    turnSeconds: 60,
    maxHp: 100,
    cpuTelegraphMs: 2000,
    cpuDamageMin: 8,
    cpuDamageMax: 14,
    wordPool: 'hard',
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
