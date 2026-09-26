import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu.jsx';
import { CharacterSelector } from './components/CharacterSelector.jsx';
import { ModeSelector } from './components/ModeSelector.jsx';
import { DifficultySelector } from './components/DifficultySelector.jsx';
import { HowToPlay } from './components/HowToPlay.jsx';
import { Settings } from './components/Settings.jsx';
import { HighScores } from './components/HighScores.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './utils/storage.js';
import { HEROES } from './data/heroes.js';
import { MODES } from './data/modes.js';
import { DIFFICULTIES } from './data/difficulty.js';
import { pickCpuHero } from './data/heroes.js';
import { audio } from './utils/audioManager.js';

// PixiJS is heavy — split it into its own chunk loaded only for battle.
const BattleScreen = lazy(() =>
  import('./components/BattleScreen.jsx').then((m) => ({ default: m.BattleScreen })),
);

// Screens: menu | hero | mode | difficulty | howto | settings | scores | battle
function normalize(id, table, fallback) {
  return table[id] ? id : fallback;
}

// Legacy settings stored difficulty 'normal' before the mode/difficulty split.
function migrateDifficulty(d) {
  if (d === 'normal') return 'medium';
  return DIFFICULTIES[d] ? d : 'medium';
}

function App() {
  const [screen, setScreen] = useState('menu');
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const [heroId, setHeroId] = useState(() =>
    normalize(settings.hero, HEROES, 'hero-1'),
  );
  const [modeId, setModeId] = useState(() =>
    normalize(settings.mode, MODES, 'medium'),
  );
  const [difficulty, setDifficulty] = useState(() =>
    migrateDifficulty(settings.difficulty),
  );
  const [cpuHeroId, setCpuHeroId] = useState(() => pickCpuHero('hero-1'));

  // Push settings into the audio engine whenever they change.
  useEffect(() => {
    audio.setSettings(settings);
  }, [settings]);

  // Expose the reduced-motion preference to CSS so all DOM animation
  // (embers, feedback banners, pulses) honors the in-game setting,
  // not just the OS-level media query.
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  }, [settings.reducedMotion]);

  const navigate = useCallback((next) => {
    audio.unlock();
    audio.playClick();
    setScreen(next);
  }, []);

  const chooseHero = useCallback((id) => {
    audio.unlock();
    audio.playClick();
    const clean = HEROES[id] ? id : 'hero-1';
    setHeroId(clean);
    setSettings((prev) => ({ ...prev, hero: clean }));
    setScreen('mode');
  }, [setSettings]);

  const chooseMode = useCallback((id) => {
    audio.unlock();
    audio.playClick();
    const clean = MODES[id] ? id : 'medium';
    setModeId(clean);
    setSettings((prev) => ({ ...prev, mode: clean }));
    setScreen('difficulty');
  }, [setSettings]);

  const startBattle = useCallback(
    (difficultyId) => {
      audio.unlock();
      audio.playClick();
      const clean = migrateDifficulty(difficultyId);
      setDifficulty(clean);
      setSettings((prev) => ({ ...prev, difficulty: clean }));
      // CPU is a random hero from the 2 the player did not pick.
      setCpuHeroId(pickCpuHero(heroId));
      setScreen('battle');
    },
    [heroId, setSettings],
  );

  return (
    <>
      {screen === 'menu' && <MainMenu onNavigate={navigate} />}
      {screen === 'hero' && (
        <CharacterSelector
          initial={heroId}
          onSelect={chooseHero}
          onBack={() => navigate('menu')}
        />
      )}
      {screen === 'mode' && (
        <ModeSelector
          initial={modeId}
          onSelect={chooseMode}
          onBack={() => navigate('hero')}
        />
      )}
      {screen === 'difficulty' && (
        <DifficultySelector initial={difficulty} onStart={startBattle} onBack={() => navigate('mode')} />
      )}
      {screen === 'howto' && <HowToPlay onBack={() => navigate('menu')} />}
      {screen === 'settings' && (
        <Settings settings={settings} onChange={setSettings} onBack={() => navigate('menu')} />
      )}
      {screen === 'scores' && <HighScores onBack={() => navigate('menu')} />}
      {screen === 'battle' && (
        <Suspense
          fallback={
            <div className="st-root">
              <p className="st-subtitle">Entering the arena…</p>
            </div>
          }
        >
          <BattleScreen
            heroId={heroId}
            cpuHeroId={cpuHeroId}
            modeId={modeId}
            difficulty={difficulty}
            settings={settings}
            onExit={() => navigate('menu')}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
