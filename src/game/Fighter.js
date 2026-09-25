// Samurai shadow fighters built from PixiJS primitives.
// No external assets; only buildBody() needs to change for sprite sheets.

import { Container, Graphics } from 'pixi.js';

const BODY = 0x0a0a13;
const BODY_EDGE = 0x2a2a44;
const GOLD = 0xd9b36c;

export class Fighter {
  constructor({ side, accent }) {
    this.side = side; // 'player' | 'cpu'
    this.accent = accent;
    this.dir = side === 'player' ? 1 : -1; // facing direction
    this.root = new Container();
    this.idlePhase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.auraPulse = 0;
    this.defeated = false;
    this.buildBody();
  }

  buildBody() {
    const A = this.accent;

    // Ground aura.
    this.aura = new Graphics();
    this.aura.ellipse(0, 64, 46, 12);
    this.aura.fill({ color: A, alpha: 0.28 });
    this.root.addChild(this.aura);

    const g = new Graphics();

    // --- Hakama (skirt trousers) ---
    g.moveTo(-27, 62);
    g.lineTo(27, 62);
    g.lineTo(16, 2);
    g.lineTo(-16, 2);
    g.closePath();
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });
    // Pleats.
    for (const px of [-9, 0, 9]) {
      g.moveTo(px, 58);
      g.lineTo(px * 0.7, 6);
      g.stroke({ color: A, width: 1.2, alpha: 0.4 });
    }

    // --- Do (cuirass) with lacing ---
    g.roundRect(-21, -38, 42, 42, 6);
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });
    for (let i = 0; i < 4; i++) {
      const ly = -30 + i * 9;
      g.moveTo(-19, ly);
      g.lineTo(19, ly);
      g.stroke({ color: A, width: 1.4, alpha: 0.4 });
    }
    // Chest mon (clan crest).
    g.circle(0, -17, 6);
    g.stroke({ color: GOLD, width: 2, alpha: 0.9 });

    // --- Sode (shoulder guards) ---
    g.moveTo(-19, -36);
    g.lineTo(-45, -28);
    g.lineTo(-41, -6);
    g.lineTo(-17, -10);
    g.closePath();
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });
    g.moveTo(19, -36);
    g.lineTo(38, -30);
    g.lineTo(35, -12);
    g.lineTo(17, -12);
    g.closePath();
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });

    // --- Sashimono (back banner) ---
    g.moveTo(-13, -30);
    g.lineTo(-13, -96);
    g.stroke({ color: 0x1a1a2a, width: 3 });
    g.rect(-37, -96, 26, 32);
    g.fill({ color: A, alpha: 0.22 });
    g.stroke({ color: A, width: 1.5, alpha: 0.7 });
    g.circle(-24, -80, 6);
    g.stroke({ color: A, width: 2, alpha: 0.9 });

    // --- Arms ---
    g.moveTo(-10, -28);
    g.lineTo(-36, -12);
    g.stroke({ color: BODY_EDGE, width: 9, cap: 'round' });

    // --- Katana: handle, tsuba guard, glowing blade ---
    g.moveTo(12, -30);
    g.lineTo(40, -48);
    g.stroke({ color: 0x14141f, width: 7, cap: 'round' });
    g.circle(40, -48, 7);
    g.fill({ color: 0x14141f });
    g.stroke({ color: GOLD, width: 2, alpha: 0.9 });
    // Blade glow (layered strokes).
    g.moveTo(44, -51);
    g.lineTo(98, -90);
    g.stroke({ color: A, width: 10, alpha: 0.22, cap: 'round' });
    g.moveTo(44, -51);
    g.lineTo(98, -90);
    g.stroke({ color: A, width: 4, alpha: 0.9, cap: 'round' });

    // --- Menpo (mask) + head ---
    g.circle(0, -52, 13);
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });
    // Mask grill lines.
    g.moveTo(-8, -48);
    g.lineTo(8, -48);
    g.stroke({ color: BODY_EDGE, width: 1.5 });
    g.moveTo(-8, -44);
    g.lineTo(8, -44);
    g.stroke({ color: BODY_EDGE, width: 1.5 });

    // --- Kabuto (helmet bowl + crest + horns) ---
    g.circle(0, -60, 14);
    g.fill({ color: BODY });
    g.stroke({ color: GOLD, width: 2, alpha: 0.8 });
    // Maedate (forehead crest).
    g.circle(0, -66, 3.5);
    g.fill({ color: GOLD });
    // Kuwagata horns.
    g.moveTo(-8, -70);
    g.quadraticCurveTo(-22, -84, -30, -98);
    g.stroke({ color: GOLD, width: 3, cap: 'round' });
    g.moveTo(8, -70);
    g.quadraticCurveTo(22, -84, 30, -98);
    g.stroke({ color: GOLD, width: 3, cap: 'round' });
    // Shikoro (neck guard plates).
    for (let i = 0; i < 3; i++) {
      g.moveTo(-12 + i * 2, -48 + i * 4);
      g.lineTo(12 - i * 2, -48 + i * 4);
      g.stroke({ color: BODY_EDGE, width: 2.5 });
    }

    this.body = g;
    this.root.addChild(g);

    // Glowing eyes through the mask.
    this.eyes = new Graphics();
    this.eyes.circle(-5.5, -54, 2.8);
    this.eyes.circle(5.5, -54, 2.8);
    this.eyes.fill({ color: A, alpha: 1 });
    this.root.addChild(this.eyes);
    this.eyeGlow = new Graphics();
    this.eyeGlow.circle(-5.5, -54, 5.5);
    this.eyeGlow.circle(5.5, -54, 5.5);
    this.eyeGlow.fill({ color: A, alpha: 0.3 });
    this.root.addChild(this.eyeGlow);

    // White hit-flash overlay (hidden until hit).
    this.flash = new Graphics();
    this.flash.circle(0, -20, 70);
    this.flash.fill({ color: 0xffffff, alpha: 0 });
    this.root.addChild(this.flash);

    this.root.scale.x = this.dir;
  }

  setBasePosition(x, y) {
    this.homeX = x;
    this.baseY = y;
    this.root.position.set(x, y);
  }

  // Subtle breathing / hover (called every frame).
  update(time, paused) {
    if (paused || this.defeated) return;
    const t = time * 0.002 + this.idlePhase;
    this.root.y = this.baseY + Math.sin(t) * 6;
    this.body.rotation = Math.sin(t * 0.8) * 0.02;
    const pulse = 0.22 + Math.abs(Math.sin(t * 1.4)) * 0.14;
    this.aura.alpha = pulse + this.auraPulse;
    this.eyeGlow.alpha = 0.25 + Math.abs(Math.sin(t * 2.2)) * 0.2;
  }

  showFlash(strength = 0.85) {
    this.flash.alpha = strength;
  }

  fadeFlash(amount) {
    this.flash.alpha = Math.max(0, this.flash.alpha - amount);
  }

  playDefeat() {
    this.defeated = true;
    this.root.rotation = 0.45 * this.dir;
    this.root.alpha = 0.45;
    this.root.y = this.baseY + 26;
  }

  playVictoryPose() {
    this.root.y = this.baseY - 34;
    this.auraPulse = 0.35;
  }

  reset() {
    this.defeated = false;
    this.auraPulse = 0;
    this.root.rotation = 0;
    this.root.alpha = 1;
    this.flash.alpha = 0;
    this.root.position.set(this.homeX, this.baseY);
  }
}
