// Hero-sprite fighters: tiny pixel heroes (CraftPix) as Pixi AnimatedSprites.
// Strips are horizontal 42x42 cells. RunAttack1 = heavy (>=10 dmg),
// RunAttack2 = light (<10 dmg).

import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Texture } from 'pixi.js';
import { FRAME_H, FRAME_W, HERO_SCALE, HERO_SHEETS, HEROES } from '../data/heroes.js';

// Ground-anchored impact height in world px (fighter is 42*4.5 = 189px tall).
const HIT_OFFSET = 116;

const FACTION_TINT = { player: 0xffffff, cpu: 0xffffff };

// heroId -> { stateKey: Texture[] }
const textureCache = {};

function heroKey(heroId) {
  return HEROES[heroId] ? heroId : 'hero-1';
}

function heroFolder(heroId) {
  return HEROES[heroKey(heroId)].folder;
}

function sliceStrip(base, frames) {
  const out = [];
  for (let i = 0; i < frames; i++) {
    out.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }),
    );
  }
  return out;
}

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
  // Load one hero's strips. Keep old no-arg shape working (defaults hero-1).
  static async loadHero(heroId = 'hero-1') {
    const key = heroKey(heroId);
    if (textureCache[key]) return textureCache[key];
    const folder = heroFolder(key);
    const states = {};
    for (const [stateKey, meta] of Object.entries(HERO_SHEETS)) {
      const url = `/sprites/hero-${folder}-${meta.file}.png`;
      const base = await Assets.load(url);
      if (base?.source) {
        try {
          base.source.scaleMode = 'nearest';
        } catch {
          /* crisp pixels are best-effort */
        }
      }
      states[stateKey] = sliceStrip(base, meta.frames);
    }
    textureCache[key] = states;
    return states;
  }

  static async loadSheets(heroId) {
    // Called as loadSheets() historically; now accepts the player hero.
    // PixiGame loads both fighters explicitly, so this stays a thin alias.
    return Fighter.loadHero(heroId ?? 'hero-1');
  }

  constructor({ side, accent, heroId }) {
    const key = heroKey(heroId);
    if (!textureCache[key]) throw new Error(`Fighter.loadHero(${key}) must run first`);
    this.side = side;
    this.dir = side === 'player' ? 1 : -1;
    this.accent = accent;
    this.heroId = key;
    this.textures = textureCache[key];
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
    const meta = HERO_SHEETS[key];
    // Manual tick (autoUpdate=false) so pause + defeat freeze correctly.
    const sprite = new AnimatedSprite(this.textures[key], false);
    sprite.animationSpeed = meta.fps / 60;
    sprite.loop = meta.loop;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(HERO_SCALE * this.dir, HERO_SCALE);
    sprite.position.set(0, 0);
    sprite.visible = false;
    return sprite;
  }

  buildBody() {
    this.aura = new Graphics();
    this.aura.ellipse(0, 8, 90, 23);
    this.aura.fill({ color: 0x000000, alpha: 0.5 });
    this.aura.ellipse(0, 8, 90, 23);
    this.aura.stroke({ color: this.accent, width: 2, alpha: 0.5 });
    this.auraGlow = new Graphics();
    this.auraGlow.ellipse(0, 8, 110, 30);
    this.auraGlow.fill({ color: this.accent, alpha: 0.16 });
    this.root.addChild(this.auraGlow);
    this.root.addChild(this.aura);

    this.body = new Container();
    this.root.addChild(this.body);

    this.clips = {
      idle: this.makeClip('idle'),
      dash: this.makeClip('dash'),
      attackHigh: this.makeClip('attackHigh'),
      attackLow: this.makeClip('attackLow'),
      hit: this.makeClip('hit'),
      dead: this.makeClip('dead'),
      victory: this.makeClip('victory'),
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

  playDash() {
    if (this.defeated) return;
    this.showClip('dash');
  }

  playAttack(damage) {
    if (this.defeated) return;
    const key = (damage ?? 10) >= 10 ? 'attackHigh' : 'attackLow';
    this.showClip(key);
    this.current.onComplete = () => {
      if (!this.defeated && this.currentKey() !== 'idle') this.showClip('idle');
    };
  }

  playHit() {
    if (this.defeated) return;
    this.showClip('hit');
    this.current.onComplete = () => {
      if (!this.defeated && this.currentKey() !== 'idle') this.showClip('idle');
    };
  }

  currentKey() {
    return Object.keys(this.clips).find((k) => this.clips[k] === this.current);
  }

  // Mid-torso impact point in world space.
  hitPoint() {
    return { x: this.root.x, y: this.root.y - HIT_OFFSET };
  }

  setBasePosition(x, y) {
    this.homeX = x;
    this.baseY = y;
    this.root.position.set(x, y);
  }

  // Idle: hover breath (called every frame; ticker advances sprites).
  // Pause freezes everything; defeat freezes motion but lets the dead clip play.
  update(time, paused, ticker) {
    if (!paused && ticker && this.current) {
      this.current.update(ticker);
    }
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
    this.showClip('dead'); // loop:false holds the fallen frame
    this.root.rotation = 0;
  }

  playVictoryPose() {
    this.showClip('victory'); // JumpAttack, looped
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
