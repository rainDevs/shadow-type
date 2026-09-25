// Battle HUD: health bars, live stats, CPU attack countdown (PLAN.md section 42).
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

export function BattleHUD({ playerHp, cpuHp, wpm, accuracy, combo, score, countdown }) {
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
            COMBO <strong>x{combo}</strong>
          </span>
          <span>
            SCORE <strong>{score.toLocaleString()}</strong>
          </span>
        </div>
        {countdown != null && (
          <div className={`hud-countdown ${countdown <= 1 ? 'imminent' : ''}`} aria-live="polite">
            ENEMY ATTACK {countdown.toFixed(1)}s
          </div>
        )}
      </div>
      <HealthBar side="cpu" hp={cpuHp} />
    </div>
  );
}
