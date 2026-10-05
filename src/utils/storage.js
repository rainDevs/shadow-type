// LocalStorage helpers (PLAN.md section 46).
// All access is wrapped so the game survives private mode / disabled storage.

export const STORAGE_KEYS = {
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

export const DEFAULT_SETTINGS = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  reducedMotion: false,
  hero: 'hero-1',
  mode: 'medium',
  difficulty: 'medium',
};
