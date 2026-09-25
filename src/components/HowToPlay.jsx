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
            A typing challenge appears. <strong>Type it out</strong> — correct characters glow
            cyan, mistakes burn red. <strong>Mistakes never block your attack</strong>, but each
            one lowers accuracy, resets your combo, and weakens the strike.
          </li>
          <li>
            Finish a challenge to unleash an attack. <strong>Faster, more accurate typing with a
            higher combo deals more damage</strong> (up to 25 per strike).
          </li>
          <li>
            <strong>95%+ accuracy with a 5+ combo can land CRITICAL hits</strong> for 1.5× damage.
          </li>
          <li>
            The enemy strikes back on its own timer — watch the <strong>attack countdown</strong> and
            keep typing through the pain. Your challenge is never taken away.
          </li>
          <li>
            Reduce the enemy to <strong>0 HP</strong> before it reduces you. Mistakes reset your
            combo, so accuracy is power.
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
