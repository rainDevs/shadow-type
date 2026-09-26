// LocalStorage helpers (PLAN.md section 46).
// All access is wrapped so the game survives private mode / disabled storage.

export const STORAGE_KEYS = {
  HIGH_SCORES: 'shadowType.highScores',
  SETTINGS: 'shadowType.settings',
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const MAX_HIGH_SCORES = 10;

export function loadHighScores() {
  const scores = loadJSON(STORAGE_KEYS.HIGH_SCORES, []);
  return Array.isArray(scores) ? scores.slice(0, MAX_HIGH_SCORES) : [];
}

// Insert a score, keep the list sorted desc and capped. Returns the rank
// (0-based) or -1 when the score did not make the table.
export function addHighScore(entry) {
  const scores = loadHighScores();
  const record = {
    name: String(entry.name ?? 'SHADOW').slice(0, 12) || 'SHADOW',
    score: Number(entry.score) || 0,
    wpm: Math.round(Number(entry.wpm) || 0),
    accuracy: Number(entry.accuracy) || 0,
    difficulty: entry.difficulty ?? 'medium',
    date: Date.now(),
  };
  scores.push(record);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_HIGH_SCORES);
  saveJSON(STORAGE_KEYS.HIGH_SCORES, trimmed);
  return trimmed.indexOf(record);
}

export function qualifiesForHighScores(score) {
  if (score <= 0) return false;
  const scores = loadHighScores();
  return scores.length < MAX_HIGH_SCORES || score > scores[scores.length - 1].score;
}

export const DEFAULT_SETTINGS = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  reducedMotion: false,
  hero: 'hero-1',
  mode: 'medium',
  difficulty: 'medium',
};

export function loadSettings() {
  const stored = loadJSON(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export function saveSettings(settings) {
  return saveJSON(STORAGE_KEYS.SETTINGS, settings);
}
