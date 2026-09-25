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

  // Generic enveloped oscillator blip.
  blip({ freq = 440, freqEnd = null, type = 'sine', duration = 0.12, volume = 0.5, delay = 0 }) {
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
      gain.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch {
      /* ignore */
    }
  }

  // Filtered noise burst (hits, slashes).
  noise({ duration = 0.2, volume = 0.5, filterFreq = 1200, type = 'lowpass', delay = 0 }) {
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
      gain.connect(this.sfxGain);
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

  playAttack() {
    this.noise({ duration: 0.25, volume: 0.5, filterFreq: 3500, type: 'highpass' });
    this.blip({ freq: 300, freqEnd: 900, type: 'sawtooth', duration: 0.18, volume: 0.25 });
  }

  playHit() {
    this.noise({ duration: 0.2, volume: 0.6, filterFreq: 500 });
    this.blip({ freq: 150, freqEnd: 60, type: 'square', duration: 0.2, volume: 0.35 });
  }

  playVictory() {
    [523, 659, 784, 1047].forEach((freq, i) =>
      this.blip({ freq, type: 'triangle', duration: 0.35, volume: 0.35, delay: i * 0.14 }),
    );
  }

  playDefeat() {
    [392, 330, 262, 196].forEach((freq, i) =>
      this.blip({ freq, type: 'triangle', duration: 0.4, volume: 0.35, delay: i * 0.18 }),
    );
  }

  // --- Background music: dark pulsing drone + slow minor arpeggio ---
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // A-minor-ish drone progression, one chord per bar.
    const progression = [
      [110.0, 130.81, 164.81], // Am
      [87.31, 110.0, 146.83], // F
      [98.0, 123.47, 146.83], // G/D
      [82.41, 110.0, 138.59], // Em
    ];
    this.musicStep = 0;
    const BAR = 2.0;
    const playBar = () => {
      if (!this.ctx) return;
      try {
        const chord = progression[this.musicStep % progression.length];
        const t0 = this.now() + 0.05;
        // Drone pad.
        chord.forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq / 2;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 320;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.linearRampToValueAtTime(0.05, t0 + 0.4);
          gain.gain.linearRampToValueAtTime(0.0001, t0 + BAR);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain);
          osc.start(t0);
          osc.stop(t0 + BAR + 0.05);
        });
        // Sparse high arp note.
        const arpNotes = [440, 523.25, 659.25, 587.33, 392, 523.25, 440, 329.63];
        const note = arpNotes[this.musicStep % arpNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = note;
        gain.gain.setValueAtTime(0.0001, t0 + 0.5);
        gain.gain.linearRampToValueAtTime(0.08, t0 + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t0 + 0.5);
        osc.stop(t0 + BAR);
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
  }
}

export const audio = new AudioManager();
