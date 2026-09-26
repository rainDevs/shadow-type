import { useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_IDS } from '../data/difficulty.js';
import { Embers } from './Embers.jsx';

export function DifficultySelector({ initial, onStart, onBack }) {
  const fallback = DIFFICULTIES[initial] ? initial : 'medium';
  const [selected, setSelected] = useState(fallback);

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>Select Difficulty</h2>
        <p className="lede">Enemy strike power. Your typing is your defense.</p>
        <div className="diff-list" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTY_IDS.map((id) => {
            const d = DIFFICULTIES[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected === id}
                className={`diff-card ${id} ${selected === id ? 'selected' : ''}`}
                onClick={() => setSelected(id)}
              >
                <span className="diff-name">{d.label}</span>
                <span className="diff-desc">{d.description}</span>
              </button>
            );
          })}
        </div>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={() => onStart(selected)}>
            Enter the Arena
          </button>
        </div>
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to menu
        </button>
      </div>
    </div>
  );
}
