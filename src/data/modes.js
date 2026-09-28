// Mode configuration: typing window length (Monkeytype-style).
// Mode controls turnSeconds only. Words always come from the central
// 1000-word bank; difficulty controls CPU damage.
// Labels stay 15/30/60 SECS per spec.

export const MODES = {
  short: {
    id: 'short',
    label: '15 SECS',
    description: '15-second turns. Fast rounds.',
    turnSeconds: 15,
  },
  medium: {
    id: 'medium',
    label: '30 SECS',
    description: '30-second turns. Balanced fight.',
    turnSeconds: 30,
  },
  long: {
    id: 'long',
    label: '60 SECS',
    description: '60-second turns. Marathon.',
    turnSeconds: 60,
  },
};

export const MODE_IDS = Object.keys(MODES);
