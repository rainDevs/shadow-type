import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu.jsx';
import { DifficultySelector } from './components/DifficultySelector.jsx';
import { HowToPlay } from './components/HowToPlay.jsx';
import { Settings } from './components/Settings.jsx';
import { HighScores } from './components/HighScores.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './utils/storage.js';
import { audio } from './utils/audioManager.js';

// PixiJS is heavy — split it into its own chunk loaded only for battle.
const BattleScreen = lazy(() =>
  import('./components/BattleScreen.jsx').then((m) => ({ default: m.BattleScreen })),
);

// Screens: menu | difficulty | howto | settings | scores | battle
function App() {
  const [screen, setScreen] = useState('menu');
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const [difficulty, setDifficulty] = useState(settings.difficulty ?? 'normal');

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

  const startBattle = useCallback(
    (difficultyId) => {
      audio.unlock();
      audio.playClick();
      setDifficulty(difficultyId);
      setSettings((prev) => ({ ...prev, difficulty: difficultyId }));
      setScreen('battle');
    },
    [setSettings],
  );

  return (
    <>
      {screen === 'menu' && <MainMenu onNavigate={navigate} />}
      {screen === 'difficulty' && (
        <DifficultySelector initial={difficulty} onStart={startBattle} onBack={() => navigate('menu')} />
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
          <BattleScreen difficulty={difficulty} settings={settings} onExit={() => navigate('menu')} />
        </Suspense>
      )}
    </>
  );
}

export default App;
