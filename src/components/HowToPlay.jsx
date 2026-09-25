import { Embers } from './Embers.jsx';

export function HowToPlay({ onBack }) {
  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>How to Play</h2>
        <p className="lede">Type fast. Strike hard. Survive.</p>
        <ul className="howto-list">
          <li>
            Fights run in <strong>timed turns</strong> — 15s on Easy, 30s on Normal, 60s on Hard.
            When your turn starts, type as many words as you can before time runs out.
          </li>
          <li>
            Correct characters glow cyan, mistakes burn red. <strong>Mistakes never block
            you</strong>, but each one lowers accuracy and weakens the coming strike.
            Backspace to fix errors — it costs time but restores accuracy.
          </li>
          <li>
            When time expires, your fighter strikes. <strong>Damage scales with your turn's
            WPM and accuracy</strong> — more words, cleaner typing, bigger hits.
          </li>
          <li>
            <strong>97%+ accuracy lands CRITICAL hits</strong> for 1.5× damage.
          </li>
          <li>
            Then the enemy answers with a quick strike of its own. Reduce it to{' '}
            <strong>0 HP</strong> before it reduces you.
          </li>
          <li>
            <span className="kbd">ESC</span> pauses the fight. Copy/paste is disabled in the arena.
          </li>
        </ul>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onBack} autoFocus>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
