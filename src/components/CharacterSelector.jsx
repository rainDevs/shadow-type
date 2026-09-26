import { useState } from 'react';
import { HEROES, HERO_IDS, heroSpriteUrl, heroTheme } from '../data/heroes.js';
import { Embers } from './Embers.jsx';

export function CharacterSelector({ initial, onSelect, onBack }) {
  const [selected, setSelected] = useState(
    initial && HEROES[initial] ? initial : HERO_IDS[0],
  );

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>Choose Your Fighter</h2>
        <p className="lede">Three heroes. Same moves, different claws.</p>
        <div className="hero-list" role="radiogroup" aria-label="Hero">
          {HERO_IDS.map((id) => {
            const h = HEROES[id];
            const t = heroTheme(id);
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected === id}
                className={`hero-card ${selected === id ? 'selected' : ''}`}
                style={{ '--hero': t.light, '--hero-deep': t.deep }}
                onClick={() => setSelected(id)}
              >
                <img
                  src={heroSpriteUrl(id, 'idle')}
                  alt={`${h.name} idle preview`}
                  className="hero-preview"
                  draggable={false}
                />
                <span className="hero-text">
                  <span className="diff-name">{h.name}</span>
                  <span className="diff-desc">{h.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={() => onSelect(selected)}>
            Continue
          </button>
        </div>
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to menu
        </button>
      </div>
    </div>
  );
}
