import { Embers } from './Embers.jsx';

export function MainMenu({ onNavigate }) {
  return (
    <div className="st-root">
      <Embers />
      <img src="/logo.svg" alt="Shadow Type crest: a dagger stabbed into the S and T keys" className="st-logo" draggable={false} />
      <h1 className="st-title">
        SHADOW <span className="accent">TYPE</span>
      </h1>
      <p className="st-subtitle">Type. Strike. Survive.</p>
      <nav className="st-menu" aria-label="Main menu">
        <button type="button" className="menu-btn primary" onClick={() => onNavigate('arena-lobby')} autoFocus>
          Arena (PVP)
        </button>
        <button type="button" className="menu-btn" onClick={() => onNavigate('mode')}>
          Training (vs CPU)
        </button>
        <button type="button" className="menu-btn" onClick={() => onNavigate('howto')}>
          How to Play
        </button>
        <button type="button" className="menu-btn" onClick={() => onNavigate('settings')}>
          Settings
        </button>
        <button type="button" className="menu-btn" onClick={() => onNavigate('scores')}>
          High Scores
        </button>
      </nav>
      <p className="st-footer">developed by: _rainDevs</p>
    </div>
  );
}
