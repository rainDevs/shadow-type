import { useEffect } from 'react';
import { Keycaps } from './Keycaps.jsx';
import { audio } from '../utils/audioManager.js';

export function MainMenu({ onNavigate }) {
  useEffect(() => {
    audio.startMusic('menu');
  }, []);
  return (
    <div className="st-root">
      <Keycaps count={28} />
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
          About
        </button>
      </nav>
      <p className="st-footer">developed by: _rainDevs</p>
    </div>
  );
}
