// Mode configuration: typing window length (Monkeytype-style).
// Mode controls turnSeconds + word pool. Difficulty controls CPU damage.
// Labels stay 15/30/60 SECS per spec.

export const MODES = {
  short: {
    id: 'short',
    label: '15 SECS',
    description: '15-second turns with short words. Fast rounds.',
    turnSeconds: 15,
    wordPool: 'easy',
  },
  medium: {
    id: 'medium',
    label: '30 SECS',
    description: '30-second turns with medium words. Balanced fight.',
    turnSeconds: 30,
    wordPool: 'normal',
  },
  long: {
    id: 'long',
    label: '60 SECS',
    description: '60-second turns with long, tricky words. Marathon.',
    turnSeconds: 60,
    wordPool: 'hard',
  },
};

export const MODE_IDS = Object.keys(MODES);
