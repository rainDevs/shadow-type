export function About({ onBack }) {
  return (
    <div className="st-root">
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
          <li>
            <strong>Scoring:</strong> speed is measured Monkeytype-style — gross WPM
            (keystrokes ÷ 5 per minute) scaled by accuracy. Damage equals that rate ÷ 3.5
            (2–24 per window), so clean speed hits hardest.
          </li>
        </ul>
        <table className="scores-table" aria-label="Adjusted WPM to damage table">
          <thead>
            <tr>
              <th>Adj. WPM</th>
              <th>Damage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0–20</td>
              <td>2–6</td>
            </tr>
            <tr>
              <td>20–35</td>
              <td>6–10</td>
            </tr>
            <tr>
              <td>35–50</td>
              <td>10–14</td>
            </tr>
            <tr>
              <td>50–70</td>
              <td>14–20</td>
            </tr>
            <tr>
              <td>70–90</td>
              <td>20–24</td>
            </tr>
            <tr>
              <td>90+</td>
              <td>24</td>
            </tr>
          </tbody>
        </table>
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
