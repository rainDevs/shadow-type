// Pause overlay (PLAN.md section 22).

export function PauseMenu({ onResume, onRestart, onMenu }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game paused">
      <div className="panel">
        <h2>Paused</h2>
        <p className="lede">The shadows wait.</p>
        <div className="st-menu" style={{ width: '100%' }}>
          <button type="button" className="menu-btn primary" onClick={onResume} autoFocus>
            Resume
          </button>
          <button type="button" className="menu-btn" onClick={onRestart}>
            Restart
          </button>
          <button type="button" className="menu-btn danger" onClick={onMenu}>
            Main Menu
          </button>
        </div>
        <p className="hint-line">
          <span className="kbd">ESC</span> resume
        </p>
      </div>
    </div>
  );
}
