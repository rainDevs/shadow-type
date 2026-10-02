import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MainMenu } from './components/MainMenu.jsx';
import { CharacterSelector } from './components/CharacterSelector.jsx';
import { ModeSelector } from './components/ModeSelector.jsx';
import { DifficultySelector } from './components/DifficultySelector.jsx';
import { ArenaLobby } from './components/ArenaLobby.jsx';
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
const ArenaBattleScreen = lazy(() =>
  import('./components/ArenaBattleScreen.jsx').then((m) => ({ default: m.ArenaBattleScreen ?? m.default })),
);

// Screens: menu | mode | difficulty | hero | battle | arena-lobby | arena-hero | arena-battle | howto | settings | scores
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
  const [arenaHeroId, setArenaHeroId] = useState(null);
  const [arenaCfg, setArenaCfg] = useState(null);
  const [arenaKey, setArenaKey] = useState(0);
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

  const chooseMode = useCallback((id) => {
    audio.unlock();
    audio.playClick();
    const clean = MODES[id] ? id : 'medium';
    setModeId(clean);
    setSettings((prev) => ({ ...prev, mode: clean }));
    setScreen('difficulty');
  }, [setSettings]);

  const chooseDifficulty = useCallback(
    (difficultyId) => {
      audio.unlock();
      audio.playClick();
      const clean = migrateDifficulty(difficultyId);
      setDifficulty(clean);
      setSettings((prev) => ({ ...prev, difficulty: clean }));
      setScreen('hero');
    },
    [setSettings],
  );

  const startBattle = useCallback(
    (id) => {
      audio.unlock();
      audio.playClick();
      const clean = HEROES[id] ? id : 'hero-1';
      setHeroId(clean);
      setSettings((prev) => ({ ...prev, hero: clean }));
      // CPU is a random hero from the 2 the player did not pick.
      setCpuHeroId(pickCpuHero(clean));
      setScreen('battle');
    },
    [setSettings],
  );

  const startArenaLobby = useCallback((cfg) => {
    audio.unlock();
    audio.playClick();
    const clean = {
      action: cfg.action === 'create' || cfg.action === 'join' ? cfg.action : 'queue',
      modeId: MODES[cfg.modeId] ? cfg.modeId : 'medium',
      name: String(cfg.name ?? 'SHADOW').slice(0, 12) || 'SHADOW',
      code: cfg.code ? String(cfg.code).toUpperCase().slice(0, 4) : null,
    };
    setArenaCfg(clean);
    setArenaHeroId(null);
    setScreen('arena-hero');
  }, []);

  const startArenaBattle = useCallback(
    (id) => {
      audio.unlock();
      audio.playClick();
      const clean = HEROES[id] ? id : 'hero-1';
      setArenaHeroId(clean);
      setArenaKey((k) => k + 1);
      setScreen('arena-battle');
    },
    [],
  );

  const rematchArena = useCallback(() => {
    audio.unlock();
    audio.playClick();
    // Fresh WS + fresh room: always re-queue to avoid stale codes.
    setArenaCfg((prev) => (prev ? { ...prev, action: 'queue', code: null } : prev));
    setArenaKey((k) => k + 1);
    setScreen('arena-battle');
  }, []);

  return (
    <>
      {screen === 'menu' && <MainMenu onNavigate={navigate} />}
      {screen === 'mode' && (
        <ModeSelector
          initial={modeId}
          onSelect={chooseMode}
          onBack={() => navigate('menu')}
        />
      )}
      {screen === 'difficulty' && (
        <DifficultySelector initial={difficulty} onStart={chooseDifficulty} onBack={() => navigate('mode')} />
      )}
      {screen === 'hero' && (
        <CharacterSelector
          onSelect={startBattle}
          onBack={() => navigate('difficulty')}
        />
      )}
      {screen === 'arena-lobby' && (
        <ArenaLobby
          initialMode={arenaCfg?.modeId ?? null}
          initialName={arenaCfg?.name ?? ''}
          onStart={startArenaLobby}
          onBack={() => navigate('menu')}
        />
      )}
      {screen === 'arena-hero' && arenaCfg && (
        <CharacterSelector
          onSelect={startArenaBattle}
          onBack={() => navigate('arena-lobby')}
        />
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
      {screen === 'arena-battle' && arenaCfg && arenaHeroId && (
        <Suspense
          fallback={
            <div className="st-root">
              <p className="st-subtitle">Entering the PVP arena…</p>
            </div>
          }
        >
          <ArenaBattleScreen
            key={arenaKey}
            heroId={arenaHeroId}
            modeId={arenaCfg.modeId}
            playerName={arenaCfg.name}
            action={arenaCfg.action}
            code={arenaCfg.code}
            settings={settings}
            onRematch={rematchArena}
            onExit={() => navigate('menu')}
          />
        </Suspense>
      )}
      <Analytics />
    </>
  );
}

export default App;
