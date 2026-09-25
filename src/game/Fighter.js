// Ninja fighters: dark navy uniforms with faction trim (cyan player,
// red CPU), skin faces/hands, masked heads, wrap bands and steel katanas.
// No external assets; joints below define the shared mirror-match stance.

import { Container, Graphics } from 'pixi.js';

const UNIFORM = 0x232733;
const UNIFORM_EDGE = 0x3a415c;
const SKIN = 0xe8b98a;
const SKIN_SHADE = 0xc99868;
const STEEL = 0x9aa3b8;
const STEEL_EDGE = 0xd7deee;

// Overall fighter scale (arena is 1280×720).
const SCALE = 1.35;

// Shared stance joints [x, y], feet near y=+58, facing right
// (CPU mirrored via scale.x).
const STANCE = {
  hips: [0, 0],
  chest: [2, -56],
  neck: [3, -66],
  head: [4, -78],
  rearHip: [-4, 0],
  rearKnee: [-20, 30],
  rearFoot: [-30, 58],
  frontHip: [4, 0],
  frontKnee: [20, 30],
  frontFoot: [32, 58],
  shoulder: [2, -50],
  rearElbow: [-12, -32],
  rearHand: [-16, -18],
  frontElbow: [20, -66],
  frontHand: [34, -84],
  bladeBase: [34, -84],
  bladeTip: [62, -114],
};

export class Fighter {
  constructor({ side, accent }) {
    this.side = side; // 'player' | 'cpu'
    this.accent = accent;
    this.dir = side === 'player' ? 1 : -1;
    this.root = new Container();
    this.idlePhase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.auraPulse = 0;
    this.defeated = false;
    this.buildBody();
  }

  limb(g, x1, y1, x2, y2, w, color = UNIFORM) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke({ color, width: w, cap: 'round' });
    g.circle(x1, y1, w * 0.42);
    g.fill({ color });
  }

  // Diagonal wrap bands across a limb segment.
  wraps(g, x1, y1, x2, y2, count, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      g.moveTo(cx - nx * 8, cy - ny * 8);
      g.lineTo(cx + nx * 8, cy + ny * 8);
      g.stroke({ color, width: 2.4 });
    }
  }

  buildBody() {
    const A = this.accent;
    const P = STANCE;
    const g = new Graphics();

    // Ground shadow + faction glow.
    this.aura = new Graphics();
    this.aura.ellipse(0, 62, 48, 10);
    this.aura.fill({ color: 0x000000, alpha: 0.45 });
    this.auraGlow = new Graphics();
    this.auraGlow.ellipse(0, 62, 56, 13);
    this.auraGlow.fill({ color: A, alpha: 0.22 });
    this.root.addChild(this.auraGlow);
    this.root.addChild(this.aura);

    // Legs (uniform) + tabi boots.
    this.limb(g, P.rearHip[0], P.rearHip[1], P.rearKnee[0], P.rearKnee[1], 16);
    this.limb(g, P.rearKnee[0], P.rearKnee[1], P.rearFoot[0], P.rearFoot[1] - 4, 12);
    this.limb(g, P.frontHip[0], P.frontHip[1], P.frontKnee[0], P.frontKnee[1], 16);
    this.limb(g, P.frontKnee[0], P.frontKnee[1], P.frontFoot[0], P.frontFoot[1] - 4, 12);
    // Shin wraps (trim).
    this.wraps(g, P.rearKnee[0], P.rearKnee[1], P.rearFoot[0], P.rearFoot[1] - 4, 3, A);
    this.wraps(g, P.frontKnee[0], P.frontKnee[1], P.frontFoot[0], P.frontFoot[1] - 4, 3, A);
    // Tabi boots.
    for (const f of [P.rearFoot, P.frontFoot]) {
      g.moveTo(f[0] - 9, f[1]);
      g.lineTo(f[0] + 9, f[1]);
      g.stroke({ color: 0x101018, width: 7, cap: 'round' });
      g.moveTo(f[0] - 9, f[1] + 2);
      g.lineTo(f[0] + 9, f[1] + 2);
      g.stroke({ color: A, width: 1.6, alpha: 0.8 });
    }

    // Torso jacket.
    this.limb(g, P.hips[0], P.hips[1], P.chest[0], P.chest[1], 25);
    // Shoulder line.
    this.limb(g, P.chest[0] - 13, P.chest[1] + 5, P.chest[0] + 13, P.chest[1] + 5, 13);
    // Chest V straps (trim).
    g.moveTo(P.chest[0] - 11, P.chest[1] + 2);
    g.lineTo(P.chest[0] + 1, P.chest[1] + 24);
    g.stroke({ color: A, width: 3 });
    g.moveTo(P.chest[0] + 11, P.chest[1] + 2);
    g.lineTo(P.chest[0] - 1, P.chest[1] + 24);
    g.stroke({ color: A, width: 3 });
    // Obi belt + hanging flap.
    g.rect(P.hips[0] - 14, P.hips[1] - 12, 28, 9);
    g.fill({ color: UNIFORM_EDGE });
    g.stroke({ color: A, width: 1.6 });
    g.moveTo(P.hips[0] - 5, P.hips[1] - 3);
    g.lineTo(P.hips[0] + 5, P.hips[1] - 3);
    g.lineTo(P.hips[0] + 3, P.hips[1] + 22);
    g.lineTo(P.hips[0] - 3, P.hips[1] + 22);
    g.closePath();
    g.fill({ color: UNIFORM });
    g.stroke({ color: A, width: 1.4, alpha: 0.85 });

    // Arms (sleeves) + forearm wraps.
    this.limb(g, P.shoulder[0], P.shoulder[1], P.rearElbow[0], P.rearElbow[1], 12);
    this.limb(g, P.rearElbow[0], P.rearElbow[1], P.rearHand[0], P.rearHand[1], 9);
    this.limb(g, P.shoulder[0], P.shoulder[1], P.frontElbow[0], P.frontElbow[1], 12);
    this.limb(g, P.frontElbow[0], P.frontElbow[1], P.frontHand[0], P.frontHand[1], 9);
    this.wraps(g, P.rearElbow[0], P.rearElbow[1], P.rearHand[0], P.rearHand[1], 2, A);
    this.wraps(g, P.frontElbow[0], P.frontElbow[1], P.frontHand[0], P.frontHand[1], 2, A);
    // Skin fists.
    g.circle(P.rearHand[0], P.rearHand[1], 6);
    g.fill({ color: SKIN });
    g.circle(P.frontHand[0], P.frontHand[1], 6.5);
    g.fill({ color: SKIN });

    // Katana: dark handle, guard, steel blade with faction edge.
    g.moveTo(P.frontHand[0] - 4, P.frontHand[1] + 8);
    g.lineTo(P.frontHand[0] + 2, P.frontHand[1] - 2);
    g.stroke({ color: 0x14141f, width: 7, cap: 'round' });
    g.circle(P.bladeBase[0], P.bladeBase[1], 5);
    g.fill({ color: 0x14141f });
    g.moveTo(P.bladeBase[0], P.bladeBase[1]);
    g.lineTo(P.bladeTip[0], P.bladeTip[1]);
    g.stroke({ color: STEEL, width: 6, cap: 'round' });
    g.moveTo(P.bladeBase[0], P.bladeBase[1]);
    g.lineTo(P.bladeTip[0], P.bladeTip[1]);
    g.stroke({ color: A, width: 1.8, alpha: 0.9, cap: 'round' });
    g.circle(P.bladeTip[0], P.bladeTip[1], 1.6);
    g.fill({ color: STEEL_EDGE });

    // Neck + hood.
    this.limb(g, P.neck[0], P.neck[1] + 6, P.neck[0], P.neck[1] - 2, 10);
    g.circle(P.head[0], P.head[1], 11);
    g.fill({ color: UNIFORM_EDGE });
    // Face opening (skin) with mask band + eyes.
    g.circle(P.head[0] + 2, P.head[1] + 1, 6.5);
    g.fill({ color: SKIN });
    g.rect(P.head[0] - 5, P.head[1] + 1, 14, 7);
    g.fill({ color: UNIFORM });
    g.circle(P.head[0], P.head[1] - 1.5, 1.7);
    g.fill({ color: 0x101018 });
    g.circle(P.head[0] + 5.5, P.head[1] - 1.5, 1.7);
    g.fill({ color: 0x101018 });
    // Face shading.
    g.arc(P.head[0] + 2, P.head[1] + 1, 6.5, 0.4, Math.PI - 0.4);
    g.stroke({ color: SKIN_SHADE, width: 1.6 });

    // Headband (trim) + flowing tails.
    g.moveTo(P.head[0] - 10, P.head[1] - 6);
    g.lineTo(P.head[0] + 11, P.head[1] - 6);
    g.stroke({ color: A, width: 3.5 });
    const bx = P.head[0] - 10;
    const by = P.head[1] - 6;
    g.moveTo(bx, by);
    g.lineTo(bx - 24, by + 7);
    g.lineTo(bx - 5, by + 11);
    g.closePath();
    g.fill({ color: A, alpha: 0.9 });
    g.moveTo(bx, by + 3);
    g.lineTo(bx - 17, by + 18);
    g.lineTo(bx - 2, by + 17);
    g.closePath();
    g.fill({ color: A, alpha: 0.7 });

    // Faint faction rim light along the back.
    g.moveTo(P.head[0] - 10, P.head[1] - 10);
    g.quadraticCurveTo(P.chest[0] - 15, P.chest[1] + 10, P.hips[0] - 13, P.hips[1] + 4);
    g.stroke({ color: A, width: 1.6, alpha: 0.4 });

    this.body = g;
    this.root.addChild(g);

    // White hit-flash overlay (hidden until hit).
    this.flash = new Graphics();
    this.flash.circle(0, -20, 70);
    this.flash.fill({ color: 0xffffff, alpha: 0 });
    this.root.addChild(this.flash);

    this.root.scale.set(this.dir * SCALE, SCALE);
  }

  setBasePosition(x, y) {
    this.homeX = x;
    this.baseY = y;
    this.root.position.set(x, y);
  }

  // Idle: hover breath + slight rock (called every frame).
  update(time, paused) {
    if (paused || this.defeated) return;
    const t = time * 0.002 + this.idlePhase;
    this.root.y = this.baseY + Math.sin(t) * 5;
    this.body.rotation = Math.sin(t * 0.8) * 0.018;
    this.auraGlow.alpha = 0.16 + Math.abs(Math.sin(t * 1.4)) * 0.12 + this.auraPulse;
  }

  showFlash(strength = 0.85) {
    this.flash.alpha = strength;
  }

  fadeFlash(amount) {
    this.flash.alpha = Math.max(0, this.flash.alpha - amount);
  }

  playDefeat() {
    this.defeated = true;
    this.root.rotation = 0.5 * this.dir;
    this.root.alpha = 0.4;
    this.root.y = this.baseY + 30;
  }

  playVictoryPose() {
    this.root.y = this.baseY - 30;
    this.auraPulse = 0.2;
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
