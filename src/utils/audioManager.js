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

  get musicPlaying() {
    return !!this.musicTimer;
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
    this.blip({ freq: 520 + Math.random() * 120, type: 'triangle', duration: 0.05, volume: 0.22 });
  }

  playError() {
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
    this.blip({ freq: 660, type: 'square', duration: 0.15, volume: 0.25 });
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

  // --- Background music: chiptune tracks, still zero audio files ---
  // Square-wave lead + triangle bassline + noise drums (NES-style voices).
  // battle (training): brooding Am-F-G-Em at 2s bars. arena (PVP): faster
  // Em loop with driving four-on-the-floor drums.
  static TRACKS = {
    menu: {
      bar: 2.0,
      progression: [
        [130.81, 164.81, 196.0], // C
        [98.0, 123.47, 146.83], // G
        [110.0, 130.81, 164.81], // Am
        [87.31, 110.0, 174.61], // F
      ],
      arp: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 523.25],
      arpAt: [0.25, 1.0],
      kickAt: [0, 1.0],
      snareAt: [],
      hatEvery: 0.5,
      hatVol: 0.05,
      bassVol: 0.14,
      leadVol: 0.06,
      bassSteps: 4,
      bassPattern: [0, 1, 2, 1],
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
      bassVol: 0.18,
      leadVol: 0.07,
      bassSteps: 8,
      bassPattern: [0, 0, 2, 0, 1, 0, 2, 1],
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

  startMusic(mode = 'arena') {
    const track = AudioManager.TRACKS[mode] ?? AudioManager.TRACKS.arena;
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
        // Chiptune bassline: triangle notes pumping root/fifth/third.
        const steps = track.bassSteps ?? 8;
        const stepDur = BAR / steps;
        const pattern = track.bassPattern ?? [0, 0, 2, 0, 1, 0, 2, 1];
        for (let i = 0; i < steps; i++) {
          const freq = chord[pattern[i] % chord.length];
          this.blip({ freq, type: 'triangle', duration: stepDur * 0.9, volume: track.bassVol, delay: 0.05 + i * stepDur, out: this.musicGain });
        }
        // Square-wave lead arp.
        track.arpAt.forEach((at, i) => {
          const note = track.arp[(this.musicStep * track.arpAt.length + i) % track.arp.length];
          this.blip({ freq: note, type: 'square', duration: 0.18, volume: track.leadVol, delay: 0.05 + at, out: this.musicGain });
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
