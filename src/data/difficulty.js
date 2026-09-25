// Difficulty configuration (PLAN.md sections 13, 40).
// Times are in milliseconds.
export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'EASY',
    description: 'Short words. Slower enemy attacks. Recommended for beginners.',
    cpuAttackMin: 8000,
    cpuAttackMax: 12000,
    cpuDamageMin: 4,
    cpuDamageMax: 7,
    challengeType: 'word',
  },
  normal: {
    id: 'normal',
    label: 'NORMAL',
    description: 'Short sentences. A balanced fight for trained typists.',
    cpuAttackMin: 5000,
    cpuAttackMax: 9000,
    cpuDamageMin: 6,
    cpuDamageMax: 10,
    challengeType: 'sentence',
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    description: 'Long sentences with punctuation. Relentless enemy.',
    cpuAttackMin: 3000,
    cpuAttackMax: 7000,
    cpuDamageMin: 8,
    cpuDamageMax: 14,
    challengeType: 'hard_sentence',
  },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
