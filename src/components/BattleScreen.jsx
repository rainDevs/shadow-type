// BattleScreen: PixiJS arena + HUD + typing combat (PLAN.md section 5).
// Game logic lives in useTypingGame; PixiGame only plays animations.

import { useEffect, useRef, useState } from 'react';
import { PixiGame } from '../game/PixiGame.js';
import { useTypingGame } from '../hooks/useTypingGame.js';
import { HEROES } from '../data/heroes.js';
import { BattleHUD, TurnTimer } from './BattleHUD.jsx';
import { TypingChallenge } from './TypingChallenge.jsx';
import { PauseMenu } from './PauseMenu.jsx';
import { VictoryScreen } from './VictoryScreen.jsx';
import { DefeatScreen } from './DefeatScreen.jsx';

export function BattleScreen({
  heroId,
  cpuHeroId,
  modeId,
  mode,
  difficulty,
  difficultyId,
  settings,
  onExit,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [rendererFailed, setRendererFailed] = useState(false);

  const playerHero = HEROES[heroId] ? heroId : 'hero-1';
  const enemyHero = HEROES[cpuHeroId] ? cpuHeroId : 'hero-2';
  const resolvedMode = modeId ?? mode ?? 'medium';
  const resolvedDifficulty = difficultyId ?? difficulty ?? 'medium';

  const game = useTypingGame({
    modeId: resolvedMode,
    difficultyId: resolvedDifficulty,
    pixiRef: gameRef,
  });
  const { status, results } = game;

  // End-of-fight banner: Victory!/Defeat! over the death animation, with
  // "click anywhere to continue" appearing after a beat (CSS-delayed).
  // Clicks/keys only continue once the beat has passed (ref timestamp).
  const announceAtRef = useRef(0);
  useEffect(() => {
    if (status === 'announce') announceAtRef.current = Date.now();
  }, [status]);
  const canContinue = () => Date.now() - announceAtRef.current >= 1400;

  useEffect(() => {
    let cancelled = false;
    const pixi = new PixiGame({
      reducedMotion: settings.reducedMotion,
      playerHero,
      cpuHero: enemyHero,
    });
    gameRef.current = pixi;
    pixi
      .init(containerRef.current)
      .then(() => {
        if (cancelled) pixi.destroy();
      })
      .catch(() => {
        if (!cancelled) setRendererFailed(true);
      });
    return () => {
      cancelled = true;
      pixi.destroy();
      gameRef.current = null;
    };
  }, [enemyHero, playerHero, settings.reducedMotion]);

  // Keyboard: ESC pauses/resumes, ENTER continues past the end banner,
  // ENTER rematches on game-over screens.
  // Hidden tab auto-pauses so timers don't run while the player is away.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (status === 'playing' || status === 'paused') {
          e.preventDefault();
          game.togglePause();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (status === 'announce') {
          if (canContinue() && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
            e.preventDefault();
            game.acknowledgeEnd();
          }
        } else if ((status === 'won' || status === 'lost') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          game.restart();
        }
      }
    };
    const onVisibility = () => {
      if (document.hidden && status === 'playing') game.pause();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  const over = status === 'won' || status === 'lost';
  const typingHidden = over || status === 'announce';

  return (
    <div className="battle-root">
      <div className="arena-wrap">
        <div ref={containerRef} className="arena-mount" aria-label="Combat arena" />
        <div className="hud-overlay">
          <BattleHUD
            playerHp={game.playerHp}
            cpuHp={game.cpuHp}
            maxHp={game.maxHp}
            wpm={game.wpm}
            accuracy={game.accuracy}
            score={game.score}
            wordsDone={game.wordsDone}
            playerName={HEROES[playerHero]?.name ?? 'PLAYER'}
            cpuName={HEROES[enemyHero]?.name ?? 'CPU'}
            playerHeroId={playerHero}
            cpuHeroId={enemyHero}
          />
        </div>
        {rendererFailed && (
          <div className="arena-fallback" role="alert">
            <p>Could not start the arena renderer.</p>
            <p>Combat continues with reduced visuals.</p>
          </div>
        )}
        {game.feedback && (
          <div key={game.feedback.id} className={`combat-feedback ${game.feedback.kind}`} aria-live="polite">
            {game.feedback.text}
          </div>
        )}
        {status === 'countdown' && (
          <div className="countdown-overlay" aria-live="polite" aria-label={game.countdown}>
            <span
              key={game.countdown}
              className={`countdown-num ${game.countdown === 'Type!' ? 'go' : ''}`}
            >
              {game.countdown}
            </span>
          </div>
        )}
        {status === 'announce' && results && (
          <div
            className="announce-overlay"
            onClick={() => {
              if (canContinue()) game.acknowledgeEnd();
            }}
            aria-live="polite"
          >
            <span className={`announce-title ${results.won ? 'won' : 'lost'}`}>
              {results.won ? 'Victory!' : 'Defeat!'}
            </span>
            <span className="announce-hint">click anywhere to continue</span>
          </div>
        )}
      </div>
      {!typingHidden && (
        <>
          <TurnTimer turn={game.turn} timeLeft={game.timeLeft} turnTotal={game.turnTotal} />
          <TypingChallenge
            challenge={game.challenge}
            typed={game.typed}
            disabled={status !== 'playing' || game.turn !== 'player' || game.locked}
            onType={game.typeText}
            wordsDone={game.wordsDone}
            enemyTurn={game.turn !== 'player'}
            locked={game.locked}
          />
        </>
      )}
      {over && results &&
        (results.won ? (
          <VictoryScreen results={results} onSubmitScore={game.submitScore} onRematch={game.restart} onMenu={onExit} />
        ) : (
          <DefeatScreen results={results} onSubmitScore={game.submitScore} onRematch={game.restart} onMenu={onExit} />
        ))}
      {status === 'paused' && (
        <PauseMenu onResume={game.resume} onRestart={game.restart} onMenu={onExit} />
      )}
    </div>
  );
}
