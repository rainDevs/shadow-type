import { loadHighScores } from '../utils/storage.js';
import { Embers } from './Embers.jsx';

export function HighScores({ onBack }) {
  const scores = loadHighScores();

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>High Scores</h2>
        <p className="lede">Local legends of the arena.</p>
        {scores.length === 0 ? (
          <p className="scores-empty">No battles fought yet. Enter the arena.</p>
        ) : (
          <table className="scores-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Score</th>
                <th>WPM</th>
                <th>Acc</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={`${s.date}-${i}`}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.score.toLocaleString()}</td>
                  <td>{s.wpm}</td>
                  <td>{Math.round(s.accuracy)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onBack} autoFocus>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
