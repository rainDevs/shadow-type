import { Embers } from './Embers.jsx';

export function Settings({ settings, onChange, onBack }) {
  const update = (patch) => onChange({ ...settings, ...patch });

  return (
    <div className="st-root">
      <Embers count={14} />
      <div className="panel">
        <h2>Settings</h2>
        <p className="lede">Saved automatically to this browser.</p>
        <div className="settings-grid">
          <div className="setting-row">
            <label htmlFor="set-music">Music volume</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="set-music"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => update({ musicVolume: Number(e.target.value) })}
              />
              <span className="setting-value">{Math.round(settings.musicVolume * 100)}%</span>
            </span>
          </div>
          <div className="setting-row">
            <label htmlFor="set-sfx">Sound effects</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="set-sfx"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
              />
              <span className="setting-value">{Math.round(settings.sfxVolume * 100)}%</span>
            </span>
          </div>
          <div className="setting-row">
            <label htmlFor="set-muted">Mute all audio</label>
            <input
              id="set-muted"
              type="checkbox"
              checked={settings.muted}
              onChange={(e) => update({ muted: e.target.checked })}
            />
          </div>
          <div className="setting-row">
            <label htmlFor="set-motion">Reduced motion</label>
            <input
              id="set-motion"
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.checked })}
            />
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="menu-btn primary" onClick={onBack} autoFocus>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
