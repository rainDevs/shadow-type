// Shadow fighter built from PixiJS primitives (PLAN.md section 6).
// No external assets; the class API makes future sprite-sheet swaps easy:
// only buildBody() needs to change, states stay the same.

import { Container, Graphics } from 'pixi.js';

const BODY = 0x0a0a13;
const BODY_EDGE = 0x2a2a44;

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
    const g = new Graphics();
    const A = this.accent;

    // Ground aura.
    this.aura = new Graphics();
    this.aura.ellipse(0, 64, 46, 12);
    this.aura.fill({ color: A, alpha: 0.28 });
    this.root.addChild(this.aura);

    // Cloak (flowing silhouette).
    g.moveTo(-30, 62);
    g.lineTo(30, 62);
    g.lineTo(20, -30);
    g.lineTo(10, -66);
    g.lineTo(-10, -66);
    g.lineTo(-20, -30);
    g.closePath();
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });

    // Accent energy seam down the cloak.
    g.moveTo(0, 58);
    g.lineTo(0, -58);
    g.stroke({ color: A, width: 2, alpha: 0.85 });

    // Head.
    g.circle(0, -82, 15);
    g.fill({ color: BODY });
    g.stroke({ color: BODY_EDGE, width: 2 });

    // Hood spikes.
    g.moveTo(-13, -88);
    g.lineTo(-26, -104);
    g.lineTo(-10, -96);
    g.closePath();
    g.fill({ color: BODY });
    g.moveTo(13, -88);
    g.lineTo(26, -104);
    g.lineTo(10, -96);
    g.closePath();
    g.fill({ color: BODY });

    // Rear arm + sword (energy blade).
    g.moveTo(10, -40);
    g.lineTo(44 * this.dir, -58);
    g.stroke({ color: BODY_EDGE, width: 9, cap: 'round' });
    // Blade glow (layered strokes).
    g.moveTo(44 * this.dir, -58);
    g.lineTo(96 * this.dir, -92);
    g.stroke({ color: A, width: 9, alpha: 0.25, cap: 'round' });
    g.moveTo(44 * this.dir, -58);
    g.lineTo(96 * this.dir, -92);
    g.stroke({ color: A, width: 4, alpha: 0.9, cap: 'round' });
    // Front arm.
    g.moveTo(-8, -36);
    g.lineTo(-34 * this.dir, -20);
    g.stroke({ color: BODY_EDGE, width: 9, cap: 'round' });

    this.body = g;
    this.root.addChild(g);

    // Glowing eyes.
    this.eyes = new Graphics();
    this.eyes.circle(-6, -84, 3.2);
    this.eyes.circle(6, -84, 3.2);
    this.eyes.fill({ color: A, alpha: 1 });
    this.root.addChild(this.eyes);
    this.eyeGlow = new Graphics();
    this.eyeGlow.circle(-6, -84, 6);
    this.eyeGlow.circle(6, -84, 6);
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
