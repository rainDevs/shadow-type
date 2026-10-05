// Audio manager (PLAN.md section 23).
// All sounds are synthesized with the Web Audio API: zero audio files,
// zero extra dependencies. Safe when audio is unavailable.

class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicMode = null;
    this.keyStreak = 0;
    this.lastKeyAt = 0;
    this.settings = { musicVolume: 0.5, sfxVolume: 0.7, muted: false };
  }

  // Must be called from a user gesture at least once.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      this.ctx = new Ctor();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applySettings();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  applySettings() {
    if (!this.ctx) return;
    const muted = this.settings.muted;
    this.musicGain.gain.value = muted ? 0 : this.settings.musicVolume * 0.5;
    this.sfxGain.gain.value = muted ? 0 : this.settings.sfxVolume;
  }

  get ready() {
    return !!this.ctx;
  }

  now() {
    return this.ctx.currentTime;
  }

  // Generic enveloped oscillator blip. `out` reroutes to the music bus.
  blip({ freq = 440, freqEnd = null, type = 'sine', duration = 0.12, volume = 0.5, delay = 0, out = null }) {
    if (!this.ctx) return;
    try {
      const t0 = this.now() + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(out || this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch {
      /* ignore */
    }
  }

  // Filtered noise burst (hits, slashes, hats). `out` reroutes to music bus.
  noise({ duration = 0.2, volume = 0.5, filterFreq = 1200, type = 'lowpass', delay = 0, out = null }) {
    if (!this.ctx) return;
    try {
      const t0 = this.now() + delay;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out || this.sfxGain);
      src.start(t0);
    } catch {
      /* ignore */
    }
  }

  playClick() {
    this.blip({ freq: 660, freqEnd: 880, type: 'triangle', duration: 0.07, volume: 0.3 });
  }

  playKey() {
    // Pitch ladder: steady typing climbs a pentatonic run; errors reset it.
    const t = this.ctx ? this.now() : 0;
    this.keyStreak = t - this.lastKeyAt < 0.9 ? Math.min(this.keyStreak + 1, 14) : 0;
    this.lastKeyAt = t;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
    const semis = scale[this.keyStreak] ?? 24;
    this.blip({ freq: 523.25 * Math.pow(2, semis / 12), type: 'triangle', duration: 0.05, volume: 0.2 });
  }

  playError() {
    this.keyStreak = 0;
    this.blip({ freq: 180, freqEnd: 120, type: 'sawtooth', duration: 0.15, volume: 0.3 });
  }

  playAttack(big = false) {
    if (big) {
      // Heavy: metallic clash (detuned squares) + low thump.
      this.noise({ duration: 0.3, volume: 0.5, filterFreq: 900 });
      this.blip({ freq: 620, type: 'square', duration: 0.22, volume: 0.16 });
      this.blip({ freq: 655, type: 'square', duration: 0.22, volume: 0.16 });
      this.blip({ freq: 160, freqEnd: 55, type: 'sine', duration: 0.28, volume: 0.5 });
    } else {
      // Light: airy whoosh + quick slash bite.
      this.noise({ duration: 0.22, volume: 0.4, filterFreq: 3500, type: 'highpass' });
      this.blip({ freq: 300, freqEnd: 900, type: 'sawtooth', duration: 0.16, volume: 0.22 });
    }
  }

  playHit(big = false) {
    if (big) {
      this.noise({ duration: 0.25, volume: 0.65, filterFreq: 420 });
      this.blip({ freq: 130, freqEnd: 50, type: 'square', duration: 0.25, volume: 0.4 });
    } else {
      this.noise({ duration: 0.2, volume: 0.6, filterFreq: 500 });
      this.blip({ freq: 150, freqEnd: 60, type: 'square', duration: 0.2, volume: 0.35 });
    }
  }

  playWarning() {
    this.blip({ freq: 520, type: 'square', duration: 0.09, volume: 0.25 });
    this.blip({ freq: 780, type: 'square', duration: 0.12, volume: 0.25, delay: 0.11 });
  }

  playVictory() {
    // Major lift with octave + third harmony tail.
    [523, 659, 784, 1047].forEach((freq, i) =>
      this.blip({ freq, type: 'triangle', duration: 0.35, volume: 0.32, delay: i * 0.13 }),
    );
    [659, 880, 1319].forEach((freq, i) =>
      this.blip({ freq, type: 'sine', duration: 0.5, volume: 0.2, delay: 0.52 + i * 0.13 }),
    );
  }

  playDefeat() {
    // Falling minor line with a low root tolling underneath.
    [392, 330, 262, 196].forEach((freq, i) =>
      this.blip({ freq, type: 'triangle', duration: 0.4, volume: 0.32, delay: i * 0.17 }),
    );
    [98, 98].forEach((freq, i) =>
      this.blip({ freq, type: 'sine', duration: 0.7, volume: 0.3, delay: 0.68 + i * 0.4 }),
    );
  }

  // --- Background music: two synthesized tracks, no audio files ---
  // battle (training): brooding Am-F-G-Em drone + sparse arp + light pulse.
  // arena (PVP): faster Em drone + driving four-on-the-floor drums.
  static TRACKS = {
    battle: {
      bar: 2.0,
      progression: [
        [110.0, 130.81, 164.81], // Am
        [87.31, 110.0, 146.83], // F
        [98.0, 123.47, 146.83], // G/D
        [82.41, 110.0, 138.59], // Em
      ],
      arp: [440, 523.25, 659.25, 587.33, 392, 523.25, 440, 329.63],
      arpAt: [0.5],
      kickAt: [0, 1.0],
      snareAt: [],
      hatEvery: 0.5,
      hatVol: 0.06,
      droneVol: 0.05,
      filterFreq: 320,
    },
    arena: {
      bar: 1.6,
      progression: [
        [82.41, 98.0, 123.47], // Em
        [82.41, 98.0, 123.47], // Em
        [87.31, 110.0, 130.81], // F
        [123.47, 155.56, 92.5], // B (major V tension)
      ],
      arp: [329.63, 392, 493.88, 622.25, 659.25, 622.25, 493.88, 392],
      arpAt: [0.3, 1.0],
      kickAt: [0, 0.4, 0.8, 1.2],
      snareAt: [0.4, 1.2],
      hatEvery: 0.2,
      hatVol: 0.09,
      droneVol: 0.055,
      filterFreq: 420,
    },
  };

  kick(delay = 0) {
    if (!this.ctx) return;
    this.blip({ freq: 150, freqEnd: 45, type: 'sine', duration: 0.14, volume: 0.5, delay, out: this.musicGain });
  }

  hat(delay = 0, volume = 0.07) {
    if (!this.ctx) return;
    this.noise({ duration: 0.04, volume, filterFreq: 7000, type: 'highpass', delay, out: this.musicGain });
  }

  snare(delay = 0) {
    if (!this.ctx) return;
    this.noise({ duration: 0.11, volume: 0.28, filterFreq: 1800, type: 'bandpass', delay, out: this.musicGain });
  }

  startMusic(mode = 'battle') {
    const track = AudioManager.TRACKS[mode] ?? AudioManager.TRACKS.battle;
    if (this.ctx && this.musicTimer && this.musicMode === mode) return;
    this.stopMusic();
    if (!this.ctx) {
      this.musicMode = mode;
      return;
    }
    this.musicMode = mode;
    this.musicStep = 0;
    const BAR = track.bar;
    const playBar = () => {
      if (!this.ctx) return;
      try {
        const chord = track.progression[this.musicStep % track.progression.length];
        const t0 = this.now() + 0.05;
        // Drone pad.
        chord.forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq / 2;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = track.filterFreq;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.linearRampToValueAtTime(track.droneVol, t0 + 0.4);
          gain.gain.linearRampToValueAtTime(0.0001, t0 + BAR);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);
          osc.start(t0);
          osc.stop(t0 + BAR + 0.05);
        });
        // Arp notes.
        track.arpAt.forEach((at, i) => {
          const note = track.arp[(this.musicStep * track.arpAt.length + i) % track.arp.length];
          this.blip({ freq: note, type: 'sine', duration: 0.5, volume: 0.08, delay: 0.05 + at, out: this.musicGain });
        });
        // Drums.
        track.kickAt.forEach((at) => this.kick(0.05 + at));
        track.snareAt.forEach((at) => this.snare(0.05 + at));
        for (let at = 0; at < BAR - 0.05; at += track.hatEvery) this.hat(0.05 + at, track.hatVol);
      } catch {
        /* ignore */
      }
      this.musicStep += 1;
    };
    playBar();
    this.musicTimer = setInterval(playBar, BAR * 1000);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicMode = null;
  }
}

export const audio = new AudioManager();
