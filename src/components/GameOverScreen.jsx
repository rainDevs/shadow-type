// Shared game-over screen (PLAN.md sections 17, 18, 45).

import { useState } from 'react';

export function GameOverScreen({ results, onSubmitScore, onRematch, onMenu }) {
  const [name, setName] = useState('');
  const [rank, setRank] = useState(null);
  const won = results.won;

  const submit = (e) => {
    e.preventDefault();
    const r = onSubmitScore(name.trim() || 'SHADOW');
    setRank(r);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={won ? 'Victory' : 'Defeat'}>
      <div className={`panel result ${won ? 'won' : 'lost'}`}>
        <h2 className="result-title">{won ? 'Victory' : 'Defeat'}</h2>
        <p className="lede">{won ? 'The shadow has been defeated.' : 'The shadow has fallen.'}</p>
        <dl className="result-grid">
          <div>
            <dt>Final score</dt>
            <dd>{results.score.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Avg WPM</dt>
            <dd>{Math.round(results.avgWpm)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{Math.round(results.accuracy)}%</dd>
          </div>
          <div>
            <dt>Turns</dt>
            <dd>{results.turns}</dd>
          </div>
          <div>
            <dt>Damage dealt</dt>
            <dd>{results.totalDamage}</dd>
          </div>
          <div>
            <dt>Critical hits</dt>
            <dd>{results.crits}</dd>
          </div>
        </dl>
        {results.qualifies && rank == null && (
          <form className="score-form" onSubmit={submit}>
            <label htmlFor="score-name">New high score — enter your name</label>
            <span className="score-form-row">
              <input
                id="score-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 12))}
                maxLength={12}
                autoComplete="off"
                placeholder="SHADOW"
                autoFocus
              />
              <button type="submit" className="menu-btn primary">
                Save
              </button>
            </span>
          </form>
        )}
        {rank != null && (
          <p className="rank-line" aria-live="polite">
            {rank >= 0 ? `Ranked #${rank + 1} in the hall of legends!` : 'Score saved.'}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onRematch}>
            {won ? 'Rematch' : 'Try Again'}
          </button>
          <button type="button" className="menu-btn" onClick={onMenu}>
            Main Menu
          </button>
        </div>
        <p className="hint-line">
          <span className="kbd">ENTER</span> rematch
        </p>
      </div>
    </div>
  );
}
