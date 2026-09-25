// Battle HUD: health bars, live stats, turn indicator + window timer.
// Pure React — Pixi owns only the arena canvas below it.

function HealthBar({ side, hp }) {
  const pct = Math.max(0, Math.min(100, hp));
  const low = pct <= 25;
  return (
    <div className={`hud-fighter ${side}`}>
      <div className="hud-name">{side === 'player' ? 'PLAYER' : 'CPU'}</div>
      <div className={`health-track ${low ? 'low' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100" aria-label={`${side} health`}>
        <div className="health-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="health-pct">{Math.round(pct)}%</div>
    </div>
  );
}

export function BattleHUD({ playerHp, cpuHp, wpm, accuracy, score, turn, timeLeft, turnSeconds, wordsDone }) {
  const isPlayer = turn === 'player';
  const total = isPlayer ? turnSeconds : Math.max(timeLeft, 0.001);
  const frac = isPlayer ? Math.max(0, Math.min(1, timeLeft / turnSeconds)) : Math.max(0, Math.min(1, timeLeft / total));
  return (
    <div className="battle-hud">
      <HealthBar side="player" hp={playerHp} />
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
        <div className={`turn-banner ${isPlayer ? 'player-turn' : 'cpu-turn'}`} aria-live="polite">
          {isPlayer ? `YOUR TURN — ${Math.ceil(timeLeft)}s` : `ENEMY TURN — ${timeLeft.toFixed(1)}s`}
        </div>
        <div className="turn-track" aria-hidden="true">
          <div className={`turn-fill ${isPlayer ? '' : 'enemy'}`} style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      <HealthBar side="cpu" hp={cpuHp} />
    </div>
  );
}
