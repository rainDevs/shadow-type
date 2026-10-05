// Shared game-over screen: final score + stats, then next match or menu.

export function GameOverScreen({ results, onRematch, onMenu }) {
  const won = results.won;

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
            <dt>Words typed</dt>
            <dd>{results.words}</dd>
          </div>
        </dl>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onRematch}>
            {won ? 'Next Match' : 'Try Again'}
          </button>
          <button type="button" className="menu-btn" onClick={onMenu}>
            Main Menu
          </button>
        </div>
        <p className="hint-line">
          <span className="kbd">ENTER</span> next match
        </p>
      </div>
    </div>
  );
}
