import { Embers } from './Embers.jsx';

export function About({ onBack }) {
  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>About</h2>
        <p className="lede">Type fast, strike hard, survive.</p>
        <ul className="howto-list">
          <li>
            <strong>Shadow Type</strong> is an arcade typing fighting game. Every word you type
            lands a blow on your rival — speed and accuracy decide the fight.
          </li>
          <li>
            <strong>Training (vs CPU):</strong> hone your typing against the computer across
            timed windows.
          </li>
          <li>
            <strong>Arena (PVP):</strong> face a live rival online. Both players type the same
            passage — the faster typer strikes first.
          </li>
        </ul>
        <p className="st-footer">developed by: _rainDevs</p>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onBack} autoFocus>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
