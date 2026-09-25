// Pixel Titan battlefield: everything snapped to a 4px grid — banded amber
// sky, blocky stepped sun, chunky spires and pagoda, brick ground with
// glowing vents. Mist bars animate via PixiGame.

import { Container, Graphics } from 'pixi.js';

export const EMBER_VENTS = [200, 640, 1080];

// Snap to the pixel grid.
const snap = (v) => Math.round(v / 4) * 4;

export function buildBackground(width, height, groundY) {
  const root = new Container();

  // Banded amber sky (8px bands).
  const sky = new Graphics();
  const top = [247, 214, 150];
  const bottom = [150, 84, 44];
  const bandH = 8;
  const skyH = snap(height * 0.72);
  for (let y = 0; y < skyH; y += bandH) {
    const t = y / skyH;
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    sky.rect(0, y, width, bandH);
    sky.fill({ color: (r << 16) | (g << 8) | b });
  }
  root.addChild(sky);

  // Blocky stepped sun (concentric offset squares).
  const sun = new Graphics();
  const scx = snap(width * 0.52);
  const scy = snap(height * 0.4);
  const steps = [
    { half: 150, color: 0xffd98a, alpha: 0.16 },
    { half: 118, color: 0xffc46b, alpha: 0.22 },
    { half: 88, color: 0xffb45e, alpha: 0.35 },
    { half: 60, color: 0xffe3ae, alpha: 0.95 },
  ];
  for (const s of steps) {
    sun.rect(scx - s.half, scy - s.half, s.half * 2, s.half * 2);
    sun.fill({ color: s.color, alpha: s.alpha });
  }
  // Square sun rays.
  for (const [rx, ry, rw, rh] of [
    [scx - 190, scy - 12, 380, 24],
    [scx - 12, scy - 190, 24, 380],
  ]) {
    sun.rect(rx, ry, rw, rh);
    sun.fill({ color: 0xffd98a, alpha: 0.14 });
  }
  root.addChild(sun);

  // Square ember orbs.
  const orbs = new Graphics();
  const orbSpots = [
    { x: 70, y: 300, r: 16 },
    { x: 120, y: 360, r: 11 },
    { x: 45, y: 420, r: 13 },
    { x: 150, y: 250, r: 8 },
    { x: 950, y: 200, r: 9 },
    { x: 1150, y: 330, r: 12 },
  ];
  for (const o of orbSpots) {
    const ox = snap(o.x);
    const oy = snap(o.y);
    const r = snap(o.r);
    orbs.rect(ox - r * 2, oy - r * 2, r * 4, r * 4);
    orbs.fill({ color: 0xff9a3c, alpha: 0.18 });
    orbs.rect(ox - r, oy - r, r * 2, r * 2);
    orbs.fill({ color: 0xffb45e });
    orbs.rect(ox - r / 2, oy - r / 2, r, r);
    orbs.fill({ color: 0xffe3ae });
  }
  root.addChild(orbs);

  // Chunky rock spires (stepped stacks).
  const rocks = new Graphics();
  const spires = [
    { x: 1120, w: 96, h: 260 },
    { x: 1210, w: 64, h: 190 },
    { x: 60, w: 72, h: 170 },
  ];
  for (const s of spires) {
    const stepsCount = 5;
    for (let i = 0; i < stepsCount; i++) {
      const t = i / stepsCount;
      const w = snap(s.w * (1 - t * 0.75));
      const sh = snap(s.h / stepsCount);
      const y = snap(groundY - (i + 1) * sh);
      rocks.rect(snap(s.x) - w / 2, y, w, sh);
      rocks.fill({ color: 0x241a12 });
    }
  }
  root.addChild(rocks);

  // Chunky pagoda silhouette.
  const pagoda = new Graphics();
  const px = snap(880);
  const pBase = snap(groundY - 20);
  for (let tier = 0; tier < 4; tier++) {
    const tw = snap(130 - tier * 22);
    const th = 32;
    const ty = pBase - (tier + 1) * (th + 8);
    pagoda.rect(px - tw / 2 + 14, ty, tw - 28, th);
    pagoda.fill({ color: 0x2c2016 });
    // Flared stepped roof.
    pagoda.rect(px - tw / 2 - 16, ty - 12, tw + 32, 12);
    pagoda.fill({ color: 0x1c140d });
    // Lit window.
    pagoda.rect(px - 8, ty + 8, 16, 14);
    pagoda.fill({ color: 0xffc46b, alpha: 0.8 });
  }
  root.addChild(pagoda);

  // Brick ground with glowing angular vents.
  const ground = new Graphics();
  ground.rect(0, groundY, width, height - groundY);
  ground.fill({ color: 0x120d09 });
  // Brick courses.
  for (let by = groundY + 10; by < height; by += 16) {
    const offset = (by / 16) % 2 === 0 ? 0 : 32;
    for (let bx = offset; bx < width; bx += 64) {
      ground.rect(bx, by, 60, 3);
      ground.fill({ color: 0x241a12 });
    }
  }
  ground.rect(0, groundY, width, 4);
  ground.fill({ color: 0xff9a3c, alpha: 0.55 });
  for (const vx of EMBER_VENTS) {
    const x = snap(vx);
    ground.moveTo(x - 36, groundY + 28);
    ground.lineTo(x - 8, groundY + 12);
    ground.lineTo(x + 12, groundY + 24);
    ground.lineTo(x + 36, groundY + 10);
    ground.stroke({ color: 0xff7a1e, width: 4, alpha: 0.9 });
    ground.rect(x - 20, groundY + 8, 40, 24);
    ground.fill({ color: 0xff9a3c, alpha: 0.12 });
  }
  root.addChild(ground);

  // Stepped mist bars (animated by PixiGame).
  const fog = [];
  for (let i = 0; i < 6; i++) {
    const f = new Graphics();
    const fw = 240;
    f.rect(-fw / 2, -8, fw, 16);
    f.fill({ color: 0xffd98a, alpha: 0.1 });
    f.rect(-fw / 2 + 24, -14, fw - 48, 28);
    f.fill({ color: 0xffd98a, alpha: 0.08 });
    f.position.set(Math.random() * width, groundY - 220 + Math.random() * 220);
    f.userData = { speed: 10 + Math.random() * 16, width: fw };
    root.addChild(f);
    fog.push(f);
  }

  return { root, fog };
}
