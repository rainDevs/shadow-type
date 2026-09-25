// Ink-silhouette fighters (Shadow Fight style): solid black dynamic poses
// with a neon blade edge. No external assets; poses are joint data so new
// stances only need new coordinates.

import { Container, Graphics } from 'pixi.js';

const INK = 0x060609;

// Player: lunging punch stance. CPU: low guard with raised blade.
// Joints are [x, y] in body space, feet near y=+58, facing right
// (CPU is mirrored via scale.x).
const POSES = {
  player: {
    hips: [0, 0],
    chest: [9, -54],
    neck: [11, -64],
    head: [13, -77],
    headR: 11,
    knot: [4, -89],
    rearHip: [-5, 0],
    rearKnee: [-26, 28],
    rearFoot: [-40, 58],
    frontHip: [5, 0],
    frontKnee: [28, 30],
    frontFoot: [44, 58],
    shoulder: [9, -48],
    rearElbow: [-13, -30],
    rearHand: [-5, -46],
    frontElbow: [31, -54],
    frontHand: [54, -47],
    bladeFrom: [54, -47],
    bladeTo: [100, -72],
    bladeW: 6,
    serrated: true,
    tails: true,
  },
  cpu: {
    hips: [-2, 6],
    chest: [0, -44],
    neck: [1, -54],
    head: [3, -66],
    headR: 11,
    knot: [-6, -78],
    rearHip: [-6, 6],
    rearKnee: [-28, 34],
    rearFoot: [-38, 58],
    frontHip: [2, 6],
    frontKnee: [24, 38],
    frontFoot: [30, 58],
    shoulder: [0, -38],
    rearElbow: [-18, -22],
    rearHand: [-8, -38],
    frontElbow: [16, -52],
    frontHand: [12, -70],
    bladeFrom: [12, -70],
    bladeTo: [40, -108],
    bladeW: 13,
    serrated: false,
    tails: true,
  },
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

  limb(g, x1, y1, x2, y2, w) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke({ color: INK, width: w, cap: 'round' });
    // Fatten joints so limbs read as one silhouette.
    g.circle(x1, y1, w * 0.42);
    g.fill({ color: INK });
  }

  // Serrated blade polygon: zigzag teeth along one edge.
  serratedBlade(g, x1, y1, x2, y2, teeth, w) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    g.moveTo(x1 + (nx * w) / 2, y1 + (ny * w) / 2);
    for (let i = 1; i <= teeth; i++) {
      const t = i / teeth;
      const off = i % 2 === 0 ? w / 2 : w / 2 + 5;
      g.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
    }
    g.lineTo(x2 - (nx * w) / 2, y2 - (ny * w) / 2);
    g.closePath();
    g.fill({ color: INK });
  }

  buildBody() {
    const A = this.accent;
    const P = POSES[this.side];
    const g = new Graphics();

    // Ground shadow with a faint faction glow.
    this.aura = new Graphics();
    this.aura.ellipse(0, 62, 48, 10);
    this.aura.fill({ color: 0x000000, alpha: 0.45 });
    this.auraGlow = new Graphics();
    this.auraGlow.ellipse(0, 62, 56, 13);
    this.auraGlow.fill({ color: this.accent, alpha: 0.22 });
    this.root.addChild(this.auraGlow);
    this.root.addChild(this.aura);

    // Legs (thighs thicker than shins).
    this.limb(g, P.rearHip[0], P.rearHip[1], P.rearKnee[0], P.rearKnee[1], 17);
    this.limb(g, P.rearKnee[0], P.rearKnee[1], P.rearFoot[0], P.rearFoot[1], 12);
    this.limb(g, P.frontHip[0], P.frontHip[1], P.frontKnee[0], P.frontKnee[1], 17);
    this.limb(g, P.frontKnee[0], P.frontKnee[1], P.frontFoot[0], P.frontFoot[1], 12);
    // Feet (straw sandals hint).
    g.moveTo(P.rearFoot[0] - 8, P.rearFoot[1]);
    g.lineTo(P.rearFoot[0] + 8, P.rearFoot[1]);
    g.stroke({ color: INK, width: 6, cap: 'round' });
    g.moveTo(P.frontFoot[0] - 8, P.frontFoot[1]);
    g.lineTo(P.frontFoot[0] + 8, P.frontFoot[1]);
    g.stroke({ color: INK, width: 6, cap: 'round' });

    // Torso: hips to chest, broad shoulders.
    this.limb(g, P.hips[0], P.hips[1], P.chest[0], P.chest[1], 26);
    this.limb(g, P.chest[0] - 12, P.chest[1] + 4, P.chest[0] + 12, P.chest[1] + 4, 14);
    // Belt (obi) knot.
    g.circle(P.hips[0] - 2, P.hips[1] - 2, 5);
    g.fill({ color: INK });

    // Arms.
    this.limb(g, P.shoulder[0], P.shoulder[1], P.rearElbow[0], P.rearElbow[1], 12);
    this.limb(g, P.rearElbow[0], P.rearElbow[1], P.rearHand[0], P.rearHand[1], 9);
    this.limb(g, P.shoulder[0], P.shoulder[1], P.frontElbow[0], P.frontElbow[1], 12);
    this.limb(g, P.frontElbow[0], P.frontElbow[1], P.frontHand[0], P.frontHand[1], 9);
    // Fists.
    g.circle(P.rearHand[0], P.rearHand[1], 6);
    g.fill({ color: INK });
    g.circle(P.frontHand[0], P.frontHand[1], 6);
    g.fill({ color: INK });

    // Katana: black blade with a neon edge. Player wields a serrated
    // katana, CPU a heavy cleaver.
    if (P.serrated) {
      this.serratedBlade(g, P.bladeFrom[0], P.bladeFrom[1], P.bladeTo[0], P.bladeTo[1], 6, P.bladeW);
    } else {
      g.moveTo(P.bladeFrom[0], P.bladeFrom[1]);
      g.lineTo(P.bladeTo[0], P.bladeTo[1]);
      g.stroke({ color: INK, width: P.bladeW, cap: 'round' });
    }
    g.moveTo(P.bladeFrom[0], P.bladeFrom[1]);
    g.lineTo(P.bladeTo[0], P.bladeTo[1]);
    g.stroke({ color: A, width: 2, alpha: 0.85, cap: 'round' });
    // Tsuba guard.
    g.circle(P.bladeFrom[0], P.bladeFrom[1], 5);
    g.fill({ color: INK });

    // Neck + head + topknot.
    this.limb(g, P.neck[0], P.neck[1] + 6, P.neck[0], P.neck[1] - 2, 10);
    g.circle(P.head[0], P.head[1], P.headR);
    g.fill({ color: INK });
    g.circle(P.knot[0], P.knot[1], 4.5);
    g.fill({ color: INK });

    // Hachimaki headband + flowing tails.
    g.moveTo(P.head[0] - P.headR, P.head[1] - 3);
    g.lineTo(P.head[0] + P.headR, P.head[1] - 3);
    g.stroke({ color: INK, width: 4 });
    if (P.tails) {
      const bx = P.head[0] - P.headR - 2;
      const by = P.head[1] - 3;
      g.moveTo(bx, by);
      g.lineTo(bx - 22, by + 6);
      g.lineTo(bx - 4, by + 10);
      g.closePath();
      g.fill({ color: INK });
      g.moveTo(bx, by + 2);
      g.lineTo(bx - 16, by + 16);
      g.lineTo(bx - 2, by + 16);
      g.closePath();
      g.fill({ color: INK });
    }

    // Neon rim light along the back silhouette.
    g.moveTo(P.head[0] - P.headR + 1, P.head[1] - 6);
    g.quadraticCurveTo(P.chest[0] - 15, P.chest[1] + 10, P.hips[0] - 12, P.hips[1] + 6);
    g.stroke({ color: A, width: 2, alpha: 0.55 });

    this.body = g;
    this.root.addChild(g);

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
