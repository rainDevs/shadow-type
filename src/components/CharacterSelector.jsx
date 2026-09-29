import { useEffect, useState } from 'react';
import { HEROES, HERO_IDS, heroSpriteUrl, heroTheme } from '../data/heroes.js';
import { Embers } from './Embers.jsx';

export function CharacterSelector({ onSelect, onBack }) {
  const [selected, setSelected] = useState(null);

  // Preload JumpAttack strips so selecting a card swaps instantly.
  useEffect(() => {
    for (const id of HERO_IDS) {
      const img = new Image();
      img.src = heroSpriteUrl(id, 'victory');
    }
  }, []);

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
            const isSelected = selected === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`hero-card ${isSelected ? 'selected' : ''}`}
                style={{ '--hero': t.light, '--hero-deep': t.deep }}
                onClick={() => setSelected(id)}
              >
                <img
                  key={isSelected ? 'victory' : 'idle'}
                  src={heroSpriteUrl(id, isSelected ? 'victory' : 'idle')}
                  alt={isSelected ? `${h.name} jumping attack preview` : `${h.name} idle preview`}
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
          <button
            type="button"
            className="menu-btn primary"
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
          >
            Enter the Arena
          </button>
        </div>
        <button type="button" className="back-link" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}
