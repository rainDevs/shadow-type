// Arena lobby as stepped views:
// 1. Select Mode → 2. Enter Arena (name + Find/Create/Join) → 3. Join by code.
// No net connection here — connection happens in ArenaBattleScreen
// once hero is picked, so heroId is known at handshake time.

import { useState } from 'react';
import { MODES, MODE_IDS } from '../data/modes.js';
import { Embers } from './Embers.jsx';

export function ArenaLobby({ initialMode, initialName, onStart, onBack }) {
  const [name, setName] = useState(initialName ?? '');
  const [modeId, setModeId] = useState(initialMode && MODES[initialMode] ? initialMode : null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState(initialMode && MODES[initialMode] ? 'enter' : 'mode');

  const cleanName = name.trim().slice(0, 12) || 'SHADOW';
  const pickMode = (id) => {
    setModeId(id);
    setStep('enter');
  };

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>Arena — PVP</h2>

        {step === 'mode' && (
          <>
            <p className="lede">Select Mode:</p>
            <div className="diff-list" role="radiogroup" aria-label="Arena mode">
              {MODE_IDS.map((id) => {
                const m = MODES[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={modeId === id}
                    className={`diff-card ${id} ${modeId === id ? 'selected' : ''}`}
                    onClick={() => pickMode(id)}
                  >
                    <span className="diff-name">{m.label}</span>
                    <span className="diff-desc">{m.description}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="back-link" onClick={onBack}>
              ← Back
            </button>
          </>
        )}

        {step === 'enter' && (
          <>
            <p className="lede">Enter Arena:</p>
            <label className="score-form" htmlFor="arena-name">
              <span style={{ display: 'block', marginBottom: 8 }}>Enter Typer name:</span>
              <span className="score-form-row">
                <input
                  id="arena-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 12))}
                  maxLength={12}
                  autoComplete="off"
                  placeholder="SHADOW"
                />
              </span>
            </label>
            <div className="btn-col">
              <button
                type="button"
                className="menu-btn primary"
                onClick={() => onStart({ action: 'queue', modeId, name: cleanName })}
              >
                Find Match
              </button>
              <button
                type="button"
                className="menu-btn"
                onClick={() => onStart({ action: 'create', modeId, name: cleanName })}
              >
                Create Room
              </button>
              <button
                type="button"
                className="menu-btn"
                onClick={() => setStep('join')}
              >
                Join Room
              </button>
            </div>
            <button type="button" className="back-link" onClick={() => setStep('mode')}>
              ← Back
            </button>
          </>
        )}

        {step === 'join' && (
          <>
            <p className="lede">Enter Arena:</p>
            <label className="score-form" htmlFor="arena-name-join">
              <span style={{ display: 'block', marginBottom: 8 }}>Enter Typer name:</span>
              <span className="score-form-row">
                <input
                  id="arena-name-join"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 12))}
                  maxLength={12}
                  autoComplete="off"
                  placeholder="SHADOW"
                />
              </span>
            </label>
            <form
              className="score-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) onStart({ action: 'join', modeId, name: cleanName, code: code.trim().toUpperCase() });
              }}
            >
              <label htmlFor="arena-code">Enter Room Code</label>
              <span className="score-form-row">
                <input
                  id="arena-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                  maxLength={4}
                  autoComplete="off"
                  placeholder="AB12"
                />
                <button type="submit" className="menu-btn primary" disabled={!code.trim()}>
                  Join
                </button>
              </span>
            </form>
            <button type="button" className="back-link" onClick={() => setStep('enter')}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
