// Sprite fighters (Ozzbit male hero, see male_hero_free/LICENSE.txt).
// AnimatedSprite clips per state; factions differ by tint + aura.
// Same class API as before, so combat code is untouched.

import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Texture } from 'pixi.js';

const FRAME = 128;
const SPRITE_SCALE = 3.6;

const SHEETS = {
  idle: { file: 'male_hero-idle.png', frames: 10, fps: 10, loop: true },
  atk1: { file: 'male_hero-combo_1.png', frames: 3, fps: 16, loop: false },
  atk2: { file: 'male_hero-combo_1_end.png', frames: 4, fps: 16, loop: false },
  fall: { file: 'male_hero-fall.png', frames: 4, fps: 10, loop: false },
  fallLoop: { file: 'male_hero-fall_loop.png', frames: 3, fps: 8, loop: true },
  jump: { file: 'male_hero-jump.png', frames: 6, fps: 12, loop: false },
};

// Player full color; CPU darkened steel so the mirror match reads.
const FACTION_TINT = { player: 0xffffff, cpu: 0x8f96ac };

let sheetCache = null;

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return (c[0] << 16) | (c[1] << 8) | c[2];
}

export class Fighter {
  // Load + slice every sheet once (Pixi caches the base textures).
  static async loadSheets() {
    if (sheetCache) return sheetCache;
    const base = import.meta.env.BASE_URL || '/';
    sheetCache = {};
    for (const [key, sheet] of Object.entries(SHEETS)) {
      const texture = await Assets.load(`${base}sprites/${sheet.file}`);
      texture.source.scaleMode = 'nearest';
      const frames = [];
      for (let i = 0; i < sheet.frames; i++) {
        frames.push(
          new Texture({ source: texture.source, frame: new Rectangle(i * FRAME, 0, FRAME, FRAME) }),
        );
      }
      sheetCache[key] = frames;
    }
    return sheetCache;
  }

  constructor({ side, accent }) {
    if (!sheetCache) throw new Error('Fighter.loadSheets() must run first');
    this.side = side;
    this.dir = side === 'player' ? 1 : -1;
    this.accent = accent;
    this.factionTint = FACTION_TINT[side];
    this.root = new Container();
    this.idlePhase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.auraPulse = 0;
    this.defeated = false;
    this.flash = 0;
    this.buildBody();
  }

  makeClip(key) {
    const sheet = SHEETS[key];
    const sprite = new AnimatedSprite(sheetCache[key]);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(this.dir * SPRITE_SCALE, SPRITE_SCALE);
    sprite.animationSpeed = sheet.fps / 60;
    sprite.loop = sheet.loop;
    sprite.tint = this.factionTint;
    sprite.visible = false;
    sprite.autoUpdate = false; // advanced manually so pause freezes fighters
    return sprite;
  }

  buildBody() {
    // Ground shadow + faction glow (feet at local y=0).
    this.aura = new Graphics();
    this.aura.ellipse(0, 4, 52, 10);
    this.aura.fill({ color: 0x000000, alpha: 0.45 });
    this.auraGlow = new Graphics();
    this.auraGlow.ellipse(0, 4, 62, 13);
    this.auraGlow.fill({ color: this.accent, alpha: 0.22 });
    this.root.addChild(this.auraGlow);
    this.root.addChild(this.aura);

    this.body = new Container();
    this.root.addChild(this.body);

    this.clips = {
      idle: this.makeClip('idle'),
      atk1: this.makeClip('atk1'),
      atk2: this.makeClip('atk2'),
      fall: this.makeClip('fall'),
      fallLoop: this.makeClip('fallLoop'),
      jump: this.makeClip('jump'),
    };
    for (const clip of Object.values(this.clips)) this.body.addChild(clip);
    this.current = null;
    this.showClip('idle');
    this.clips.idle.play();
  }

  showClip(key) {
    if (this.current) {
      this.current.visible = false;
      this.current.stop();
      this.current.onComplete = null;
    }
    this.current = this.clips[key];
    this.current.visible = true;
    this.current.gotoAndPlay(0);
    this.applyTint();
  }

  applyTint() {
    const tint = this.flash > 0 ? mixHex(this.factionTint, 0xffffff, Math.min(1, this.flash)) : this.factionTint;
    for (const clip of Object.values(this.clips)) clip.tint = tint;
  }

  playAttack() {
    if (this.defeated) return;
    this.showClip('atk1');
    this.current.onComplete = () => {
      if (this.defeated) return;
      this.showClip('atk2');
      this.current.onComplete = () => {
        if (!this.defeated && this.currentKey() !== 'idle') this.showClip('idle');
      };
    };
  }

  currentKey() {
    return Object.keys(this.clips).find((k) => this.clips[k] === this.current);
  }

  // Mid-torso impact point in world space.
  hitPoint() {
    return { x: this.root.x, y: this.root.y - 160 };
  }

  setBasePosition(x, y) {
    this.homeX = x;
    this.baseY = y;
    this.root.position.set(x, y);
  }

  // Idle: hover breath (called every frame; ticker advances sprites).
  // Pause freezes everything; defeat freezes motion but lets the fall clip play.
  update(time, paused, ticker) {
    if (!paused && ticker && this.current) this.current.update(ticker);
    if (paused || this.defeated) return;
    const t = time * 0.002 + this.idlePhase;
    this.root.y = this.baseY + Math.sin(t) * 4;
    this.auraGlow.alpha = 0.16 + Math.abs(Math.sin(t * 1.4)) * 0.12 + this.auraPulse;
  }

  showFlash(strength = 1) {
    this.flash = strength;
    this.applyTint();
  }

  fadeFlash(amount) {
    if (this.flash <= 0) return;
    this.flash = Math.max(0, this.flash - amount);
    this.applyTint();
  }

  playDefeat() {
    this.defeated = true;
    this.showClip('fall');
    this.current.onComplete = () => {
      if (this.defeated) this.showClip('fallLoop');
    };
    this.root.rotation = 0.12 * this.dir;
  }

  playVictoryPose() {
    this.showClip('jump');
    this.current.onComplete = () => {
      if (!this.defeated) this.showClip('idle');
    };
    this.root.y = this.baseY - 26;
    this.auraPulse = 0.2;
  }

  reset() {
    this.defeated = false;
    this.auraPulse = 0;
    this.flash = 0;
    this.root.rotation = 0;
    this.root.alpha = 1;
    this.showClip('idle');
    this.root.position.set(this.homeX, this.baseY);
  }
}
