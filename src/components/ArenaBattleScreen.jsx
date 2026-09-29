// ArenaBattleScreen: PVP simultaneous windows over WS.
// Stays on "Waiting for Opponent..." until the server pairs a rival.
// Pixi inits once the rival is known so both fighters use true heroes.

import { useEffect, useRef, useState } from 'react';
import { PixiGame } from '../game/PixiGame.js';
import { useNetGame } from '../net/useNetGame.js';
import { HEROES, pickCpuHero } from '../data/heroes.js';
import { BattleHUD } from './BattleHUD.jsx';
import { TypingChallenge } from './TypingChallenge.jsx';

function ArenaTimer({ timeLeft, turnTotal, windowId }) {
  const frac = Math.max(0, Math.min(1, timeLeft / Math.max(turnTotal, 0.001)));
  return (
    <div className="turn-timer">
      <div className="turn-banner player-turn" aria-live="polite">
        {`ARENA WINDOW ${windowId} — ${Math.ceil(timeLeft)}s`}
      </div>
      <div className="turn-track" aria-hidden="true">
        <div className="turn-fill" style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  );
}

function ArenaResult({ game, onRematch, onMenu }) {
  const r = game.results;
  const title = r?.draw ? 'Draw' : r?.won ? 'Victory!' : 'Defeat!';
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`panel result ${r?.won && !r?.draw ? 'won' : 'lost'}`}>
        <h2 className="result-title">{title}</h2>
        <p className="lede">
          {r?.draw ? 'Both shadows fell together.' : r?.won ? 'Rival defeated.' : `Lost to ${game.opponent?.name ?? 'rival'}.`}
        </p>
        <dl className="result-grid">
          <div>
            <dt>Avg WPM</dt>
            <dd>{Math.round(r?.avgWpm ?? 0)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{Math.round(r?.accuracy ?? 0)}%</dd>
          </div>
          <div>
            <dt>Windows</dt>
            <dd>{r?.turns ?? 0}</dd>
          </div>
          <div>
            <dt>Damage</dt>
            <dd>{r?.totalDamage ?? 0}</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{r?.words ?? 0}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{(r?.score ?? 0).toLocaleString()}</dd>
          </div>
        </dl>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onRematch} autoFocus>
            Rematch
          </button>
          <button type="button" className="menu-btn" onClick={onMenu}>
            Main Menu
          </button>
        </div>
        {game.roomCode && <p className="hint-line">Room {game.roomCode}</p>}
      </div>
    </div>
  );
}

export function ArenaBattleScreen({
  heroId,
  modeId,
  playerName,
  action,
  code,
  settings,
  onRematch,
  onExit,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [rendererFailed, setRendererFailed] = useState(false);
  const myHero = HEROES[heroId] ? heroId : 'hero-1';

  const game = useNetGame({
    modeId,
    heroId: myHero,
    name: playerName,
    action,
    code,
    pixiRef: gameRef,
  });
  const { status, results } = game;
  const oppHero = game.opponent?.heroId && HEROES[game.opponent.heroId] ? game.opponent.heroId : pickCpuHero(myHero);
  const ready = status !== 'connecting' && (game.opponent || status === 'waiting' || status === 'error');

  const announceAtRef = useRef(0);
  useEffect(() => {
    if (status === 'announce') announceAtRef.current = Date.now();
  }, [status]);
  const canContinue = () => Date.now() - announceAtRef.current >= 1400;

  // Init Pixi once rival known (or waiting with fallback so arena is visible).
  useEffect(() => {
    if (!ready && status !== 'waiting') return;
    let cancelled = false;
    const pixi = new PixiGame({
      reducedMotion: settings.reducedMotion,
      playerHero: myHero,
      cpuHero: oppHero,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, myHero, settings.reducedMotion]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        game.leave();
        onExit();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (status === 'announce' && canContinue() && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          game.acknowledgeEnd();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const over = status === 'won' || status === 'lost' || status === 'draw';
  const showTyping = status === 'playing';
  const waiting = status === 'connecting' || status === 'waiting' || status === 'countdown';

  return (
    <div className="battle-root">
      <div className="arena-wrap">
        <div ref={containerRef} className="arena-mount" aria-label="PVP arena" />
        <div className="hud-overlay">
          <BattleHUD
            playerHp={game.hpMe}
            cpuHp={game.hpOpp}
            maxHp={game.maxHp}
            wpm={game.wpm}
            accuracy={game.accuracy}
            score={game.score}
            wordsDone={game.wordsDone}
            playerName={playerName ?? 'YOU'}
            cpuName={game.opponent?.name ?? 'RIVAL'}
            playerHeroId={myHero}
            cpuHeroId={oppHero}
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
        {(status === 'connecting' || status === 'waiting') && (
          <div className="countdown-overlay" aria-live="polite">
            <div style={{ textAlign: 'center' }}>
              <div className="countdown-num" style={{ fontSize: 'clamp(28px,6vw,54px)' }}>
                Waiting for Opponent...
              </div>
              {game.roomCode && <p className="announce-hint" style={{ opacity: 1 }}>Room {game.roomCode} — share the code</p>}
            </div>
          </div>
        )}
        {status === 'countdown' && (
          <div className="countdown-overlay" aria-live="polite" aria-label={game.countdown}>
            <div style={{ textAlign: 'center' }}>
              <span
                key={game.countdown}
                className={`countdown-num ${game.countdown === 'Match Found!' || game.countdown === 'Type!' ? 'go' : ''}`}
              >
                {game.countdown || 'Get ready'}
              </span>
              {game.countdown === 'Match Found!' && game.opponent && (
                <p className="announce-hint" style={{ opacity: 1 }}>vs {game.opponent.name}</p>
              )}
            </div>
          </div>
        )}
        {status === 'announce' && results && (
          <div className="announce-overlay" onClick={() => canContinue() && game.acknowledgeEnd()} aria-live="polite">
            <span className={`announce-title ${results.won && !results.draw ? 'won' : 'lost'}`}>
              {results.draw ? 'Draw!' : results.won ? 'Victory!' : 'Defeat!'}
            </span>
            <span className="announce-hint">click anywhere to continue</span>
          </div>
        )}
        {status === 'peer-left' && (
          <div className="overlay" role="dialog" aria-modal="true" aria-label="Rival left">
            <div className="panel">
              <h2>Rival disconnected</h2>
              <p className="lede">Your opponent left the arena.</p>
              <div className="btn-row">
                <button type="button" className="menu-btn primary" onClick={onRematch} autoFocus>Find new match</button>
                <button type="button" className="menu-btn" onClick={onExit}>Main Menu</button>
              </div>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="overlay" role="dialog" aria-modal="true" aria-label="Arena error">
            <div className="panel">
              <h2>Arena error</h2>
              <p className="lede">{game.error ?? 'Could not join.'}</p>
              <div className="btn-row">
                <button type="button" className="menu-btn primary" onClick={onExit} autoFocus>Back</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showTyping && (
        <>
          <ArenaTimer timeLeft={game.timeLeft} turnTotal={game.turnTotal} windowId={game.windowId} />
          <div className="hud-stats" style={{ justifyContent: 'center', marginBottom: 4 }}>
            <span>FOE WPM <strong>{Math.round(game.oppWpm ?? 0)}</strong></span>
          </div>
          <TypingChallenge
            challenge={game.challenge}
            typed={game.typed}
            disabled={game.locked}
            onType={game.typeText}
            wordsDone={game.wordsDone}
            enemyTurn={false}
            locked={game.locked}
          />
        </>
      )}
      {!showTyping && waiting && (
        <div className="turn-timer">
          <div className="turn-banner player-turn">ARENA — {modeId?.toUpperCase?.() ?? ''}</div>
        </div>
      )}
      {over && results && <ArenaResult game={game} onRematch={onRematch} onMenu={onExit} />}
    </div>
  );
}

export default ArenaBattleScreen;
