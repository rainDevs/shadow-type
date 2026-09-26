// Playable heroes from tiny-pixel-hero-sprites-with-melee-attacks (CraftPix).
// Each strip is horizontal 42x42 cells, indexed PNG with tRNS transparency.

export const FRAME_W = 42;
export const FRAME_H = 42;
// World scale: 42px cell -> ~189px tall fighter, fits GROUND_Y arena.
export const HERO_SCALE = 4.5;

export const HEROES = {
  'hero-1': {
    id: 'hero-1',
    folder: '1',
    name: 'PINK BLADE',
    description: 'Pink fighter, purple mane. Balanced striker.',
  },
  'hero-2': {
    id: 'hero-2',
    folder: '2',
    name: 'EMBER FANG',
    description: 'White fighter, orange mane. Swift striker.',
  },
  'hero-3': {
    id: 'hero-3',
    folder: '3',
    name: 'TIDE CLAW',
    description: 'Blue fighter, red mane. Heavy striker.',
  },
};

export const HERO_IDS = Object.keys(HEROES);

// Shared sprite palette (measured from the PLTE chunks):
// ink #04193f, steel #94a0ba, skin #e59b6a, paper #fcfefe, black #000000.
export const SHARED = {
  ink: '#04193f',
  steel: '#94a0ba',
  skin: '#e59b6a',
  paper: '#fcfefe',
  black: '#000000',
};

// Per-hero theme tokens sampled from the sprite sheets.
// primary = body/armor, light = highlight/glow, deep = mane/shadow.
export const HERO_THEME = {
  'hero-1': {
    primary: '#d840fb',
    light: '#f489f6',
    deep: '#780bf7',
    accent: 0xd840fb,
    glow: 0xf489f6,
  },
  'hero-2': {
    primary: '#fc5003',
    light: '#fda216',
    deep: '#5e2c29',
    accent: 0xfc5003,
    glow: 0xfda216,
  },
  'hero-3': {
    primary: '#0696db',
    light: '#0feffb',
    deep: '#03396b',
    strike: '#e7333b',
    accent: 0x0696db,
    glow: 0x0feffb,
  },
};

export function heroTheme(heroId) {
  return HERO_THEME[heroId] ?? HERO_THEME['hero-1'];
}

export function heroAccent(heroId) {
  return heroTheme(heroId).accent;
}

export function heroGlow(heroId) {
  return heroTheme(heroId).glow;
}

// Sprite file + frame count per combat state.
// RunAttack1 = heavy (>=10 dmg), RunAttack2 = light (<10 dmg).
export const HERO_SHEETS = {
  idle: { file: 'Idle', frames: 4, fps: 8, loop: true },
  dash: { file: 'Run', frames: 6, fps: 14, loop: true },
  attackHigh: { file: 'RunAttack1', frames: 6, fps: 18, loop: false },
  attackLow: { file: 'RunAttack2', frames: 6, fps: 18, loop: false },
  hit: { file: 'Hurt', frames: 4, fps: 14, loop: false },
  dead: { file: 'Death', frames: 8, fps: 10, loop: false },
  victory: { file: 'JumpAttack', frames: 6, fps: 12, loop: true },
};

export function heroSpriteUrl(heroId, stateKey) {
  const hero = HEROES[heroId] ?? HEROES['hero-1'];
  const sheet = HERO_SHEETS[stateKey] ?? HERO_SHEETS.idle;
  return `/sprites/hero-${hero.folder}-${sheet.file}.png`;
}

export function pickCpuHero(playerHeroId) {
  const rest = HERO_IDS.filter((id) => id !== playerHeroId);
  return rest[Math.floor(Math.random() * rest.length)] ?? 'hero-2';
}
