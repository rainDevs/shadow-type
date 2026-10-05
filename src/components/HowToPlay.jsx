export function HowToPlay({ onBack }) {
  return (
    <div className="st-root">
      <div className="panel">
        <h2>How to Play</h2>
        <p className="lede">Type fast. Strike hard. Survive.</p>
        <ul className="howto-list">
          <li>
            Two ways to fight: <strong>Training</strong> duels the computer
            (mode → difficulty → fighter), <strong>Arena</strong> duels a real
            rival online (mode → name → room → fighter).
          </li>
          <li>
            Pick a typing window: <strong>BLITZ</strong> 15 seconds,{' '}
            <strong>RAPID</strong> 30 seconds, <strong>MARATHON</strong> 60
            seconds. A flowing river of words appears; type straight through
            it like Monkeytype. The text extends on its own, so never stop.
          </li>
          <li>
            Correct characters glow cyan, mistakes burn red. <strong>Mistakes never block
            you</strong> — just keep flowing. Backspace fixes errors but costs time.
          </li>
          <li>
            When time expires, your fighter strikes. <strong>Damage (2–24) scales with your
            turn's adjusted WPM</strong> — climb the tiers from LEARNING to COMPETITIVE
            for bigger hits.
          </li>
          <li>
            In Training the enemy answers with a quick strike of its own. In
            Arena both fighters type the same passage at once, then strike one
            after the other — highest damage first. Empty the other health bar
            first.
          </li>
          <li>
            Tap (or click) the text if you lose focus. <span className="kbd">ESC</span> or the
            ☰ button pauses Training, or asks to forfeit in the Arena (quitting hands your
            rival the win). Copy/paste is disabled in the arena.
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
