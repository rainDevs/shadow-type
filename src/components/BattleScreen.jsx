// BattleScreen: PixiJS arena + HUD + typing combat (PLAN.md section 5).
// Game logic lives in useTypingGame; PixiGame only plays animations.

import { useEffect, useRef, useState } from 'react';
import { PixiGame } from '../game/PixiGame.js';
import { useTypingGame } from '../hooks/useTypingGame.js';
import { BattleHUD, TurnTimer } from './BattleHUD.jsx';
import { TypingChallenge } from './TypingChallenge.jsx';
import { PauseMenu } from './PauseMenu.jsx';
import { VictoryScreen } from './VictoryScreen.jsx';
import { DefeatScreen } from './DefeatScreen.jsx';

export function BattleScreen({ difficulty, settings, onExit }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [rendererFailed, setRendererFailed] = useState(false);

  const game = useTypingGame({ difficultyId: difficulty, pixiRef: gameRef });
  const { status, results } = game;

  useEffect(() => {
    let cancelled = false;
    const pixi = new PixiGame({ reducedMotion: settings.reducedMotion });
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
  }, [settings.reducedMotion]);

  // Keyboard: ESC pauses/resumes, ENTER rematches on game-over screens.
  // Hidden tab auto-pauses so timers don't run while the player is away.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (status === 'playing' || status === 'paused') {
          e.preventDefault();
          game.togglePause();
        }
      } else if (e.key === 'Enter') {
        if ((status === 'won' || status === 'lost') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
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

  return (
    <div className="battle-root">
      <BattleHUD
        playerHp={game.playerHp}
        cpuHp={game.cpuHp}
        maxHp={game.maxHp}
        wpm={game.wpm}
        accuracy={game.accuracy}
        score={game.score}
        wordsDone={game.wordsDone}
      />
      <div className="arena-wrap">
        <div ref={containerRef} className="arena-mount" aria-label="Combat arena" />
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
      </div>
      {!over && (
        <>
          <TurnTimer turn={game.turn} timeLeft={game.timeLeft} turnTotal={game.turnTotal} />
          <TypingChallenge
            challenge={game.challenge}
            typed={game.typed}
            disabled={status !== 'playing' || game.turn !== 'player'}
            onType={game.typeText}
            wordsDone={game.wordsDone}
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
