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

export function loadSettings() {
  const stored = loadJSON(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export function saveSettings(settings) {
  return saveJSON(STORAGE_KEYS.SETTINGS, settings);
}
