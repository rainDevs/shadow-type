import { useState } from 'react';
import { MODES, MODE_IDS } from '../data/modes.js';
import { Embers } from './Embers.jsx';

export function ModeSelector({ initial, onSelect, onBack }) {
  const [selected, setSelected] = useState(
    initial && MODES[initial] ? initial : 'medium',
  );

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>Select Mode</h2>
        <p className="lede">Turn length sets the typing window.</p>
        <div className="diff-list" role="radiogroup" aria-label="Mode">
          {MODE_IDS.map((id) => {
            const m = MODES[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected === id}
                className={`diff-card ${selected === id ? 'selected' : ''}`}
                onClick={() => setSelected(id)}
              >
                <span className="diff-name">{m.label}</span>
                <span className="diff-desc">{m.description}</span>
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
          ← Back
        </button>
      </div>
    </div>
  );
}
