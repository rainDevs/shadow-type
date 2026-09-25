// Battle HUD: health bars, live stats, turn indicator + window timer.
// Pure React — Pixi owns only the arena canvas below it.

function HealthBar({ side, hp, maxHp }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const low = pct <= 25;
  const name = side === 'player' ? 'KAGE' : 'ONI';
  const glyph = side === 'player' ? '影' : '鬼';
  return (
    <div className={`hud-fighter ${side}`}>
      <div className="hud-id">
        <span className="hud-portrait" aria-hidden="true">{glyph}</span>
        <div className="hud-namehp">
          <div className="hud-name">{name}</div>
          <div className={`health-track ${low ? 'low' : ''}`} role="progressbar" aria-valuenow={Math.round(hp)} aria-valuemin="0" aria-valuemax={maxHp} aria-label={`${name} health`}>
            <div className="health-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="health-pct">{Math.round(hp)}/{maxHp}</div>
        </div>
      </div>
    </div>
  );
}

export function BattleHUD({ playerHp, cpuHp, maxHp, wpm, accuracy, score, wordsDone, onPause }) {
  return (
    <div className="battle-hud">
      <HealthBar side="player" hp={playerHp} maxHp={maxHp} />
      <div className="hud-center">
        <div className="hud-stats">
          <span>
            WPM <strong>{Math.round(wpm)}</strong>
          </span>
          <span>
            ACC <strong>{Math.round(accuracy)}%</strong>
          </span>
          <span>
            WORDS <strong>{wordsDone}</strong>
          </span>
          <span>
            SCORE <strong>{score.toLocaleString()}</strong>
          </span>
        </div>
        <button type="button" className="pause-btn" onClick={onPause} aria-label="Pause game">
          ❚❚
        </button>
      </div>
      <HealthBar side="cpu" hp={cpuHp} maxHp={maxHp} />
    </div>
  );
}

// Turn countdown, rendered directly above the typing card.
export function TurnTimer({ turn, timeLeft, turnTotal }) {
  const isPlayer = turn === 'player';
  const frac = Math.max(0, Math.min(1, timeLeft / Math.max(turnTotal, 0.001)));
  return (
    <div className="turn-timer">
      <div className={`turn-banner ${isPlayer ? 'player-turn' : 'cpu-turn'}`} aria-live="polite">
        {isPlayer ? `YOUR TURN — ${Math.ceil(timeLeft)}s` : `ENEMY TURN — ${timeLeft.toFixed(1)}s`}
      </div>
      <div className="turn-track" aria-hidden="true">
        <div className={`turn-fill ${isPlayer ? '' : 'enemy'}`} style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  );
}
