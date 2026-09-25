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
            Fights run in <strong>timed turns</strong> — pick 15, 30, or 60
            seconds per turn. A flowing river of words appears; type straight
            through it like Monkeytype.
            The text extends on its own, so never stop.
          </li>
          <li>
            Correct characters glow cyan, mistakes burn red. <strong>Mistakes never block
            you</strong> — just keep flowing. Backspace fixes errors but costs time.
          </li>
          <li>
            When time expires, your fighter strikes. <strong>Damage (1–15) scales with your
            turn's adjusted WPM</strong> — more accurate throughput, bigger hits.
          </li>
          <li>
            Then the enemy answers with a quick strike of its own. Empty its health bar
            before it empties yours.
          </li>
          <li>
            Click the text if you lose focus. <span className="kbd">ESC</span> pauses the
            fight. Copy/paste is disabled in the arena.
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
