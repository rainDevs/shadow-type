import { Embers } from './Embers.jsx';

export function MainMenu({ onNavigate }) {
  return (
    <div className="st-root">
      <Embers />
      <h1 className="st-title">
        SHADOW <span className="accent">TYPE</span>
      </h1>
      <p className="st-subtitle">Type. Strike. Survive.</p>
      <nav className="st-menu" aria-label="Main menu">
        <button type="button" className="menu-btn primary" onClick={() => onNavigate('difficulty')} autoFocus>
          Start Fight
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
      <p className="st-footer">Every keystroke is an attack</p>
    </div>
  );
}
