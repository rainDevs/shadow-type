// Mode configuration: typing window length.
// Mode controls turnSeconds only. Words always come from the central
// 1000-word bank; difficulty controls CPU damage.

export const MODES = {
  short: {
    id: 'short',
    label: 'BLITZ',
    description: '15-second turns. Fast rounds.',
    turnSeconds: 15,
  },
  medium: {
    id: 'medium',
    label: 'RAPID',
    description: '30-second turns. Balanced fight.',
    turnSeconds: 30,
  },
  long: {
    id: 'long',
    label: 'MARATHON',
    description: '60-second turns. Endurance.',
    turnSeconds: 60,
  },
};

export const MODE_IDS = Object.keys(MODES);
