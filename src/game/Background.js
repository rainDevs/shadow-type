// Golden Titan battlefield: amber gradient sky, giant flame swirls, floating
// ember orbs, dark rock spires, glowing ground vents and a blackened ground
// strip. Fog banks + ember orbs animate via PixiGame.

import { Container, Graphics } from 'pixi.js';

export const EMBER_VENTS = [200, 640, 1080];

export function buildBackground(width, height, groundY) {
  const root = new Container();

  // Amber sky gradient (stacked bands).
  const sky = new Graphics();
  const bands = 26;
  const top = [247, 214, 150];
  const bottom = [150, 84, 44];
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    sky.rect(0, (height * 0.72 * i) / bands, width, (height * 0.72) / bands + 1);
    sky.fill({ color: (r << 16) | (g << 8) | b });
  }
  root.addChild(sky);

  // Giant flame swirls (layered translucent arcs).
  const flames = new Graphics();
  const swirls = [
    { x: width * 0.52, y: height * 0.42, r: 260, w: 46, a: 0.16 },
    { x: width * 0.52, y: height * 0.42, r: 190, w: 34, a: 0.2 },
    { x: width * 0.52, y: height * 0.42, r: 130, w: 24, a: 0.24 },
    { x: width * 0.2, y: height * 0.55, r: 150, w: 30, a: 0.12 },
    { x: width * 0.85, y: height * 0.5, r: 170, w: 32, a: 0.12 },
  ];
  for (const s of swirls) {
    flames.arc(s.x, s.y, s.r, -Math.PI * 0.85, Math.PI * 0.45);
    flames.stroke({ color: 0xffd98a, width: s.w, alpha: s.a, cap: 'round' });
    flames.arc(s.x, s.y, s.r * 0.86, -Math.PI * 0.7, Math.PI * 0.35);
    flames.stroke({ color: 0xff9a3c, width: s.w * 0.55, alpha: s.a + 0.06, cap: 'round' });
  }
  root.addChild(flames);

  // Floating ember orbs (left cluster + strays).
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
    orbs.circle(o.x, o.y, o.r * 2.2);
    orbs.fill({ color: 0xff9a3c, alpha: 0.18 });
    orbs.circle(o.x, o.y, o.r);
    orbs.fill({ color: 0xffb45e });
    orbs.circle(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.45);
    orbs.fill({ color: 0xffe3ae });
  }
  root.addChild(orbs);

  // Dark rock spires (right side + far left).
  const rocks = new Graphics();
  const spires = [
    { x: 1120, w: 90, h: 260 },
    { x: 1210, w: 60, h: 190 },
    { x: 60, w: 70, h: 170 },
  ];
  for (const s of spires) {
    rocks.moveTo(s.x - s.w / 2, groundY);
    rocks.lineTo(s.x - s.w * 0.2, groundY - s.h);
    rocks.lineTo(s.x + s.w * 0.25, groundY - s.h * 0.72);
    rocks.lineTo(s.x + s.w / 2, groundY);
    rocks.closePath();
    rocks.fill({ color: 0x241a12 });
  }
  root.addChild(rocks);

  // Scorched ground strip with glowing ember vents.
  const ground = new Graphics();
  ground.rect(0, groundY, width, height - groundY);
  ground.fill({ color: 0x120d09 });
  ground.rect(0, groundY, width, 3);
  ground.fill({ color: 0xff9a3c, alpha: 0.55 });
  for (const vx of EMBER_VENTS) {
    // Crack.
    ground.moveTo(vx - 34, groundY + 26);
    ground.lineTo(vx - 8, groundY + 12);
    ground.lineTo(vx + 12, groundY + 22);
    ground.lineTo(vx + 36, groundY + 10);
    ground.stroke({ color: 0xff7a1e, width: 3, alpha: 0.9 });
    ground.circle(vx, groundY + 16, 26);
    ground.fill({ color: 0xff9a3c, alpha: 0.14 });
  }
  root.addChild(ground);

  // Warm haze banks (animated by PixiGame).
  const fog = [];
  for (let i = 0; i < 6; i++) {
    const f = new Graphics();
    f.ellipse(0, 0, 240, 30);
    f.fill({ color: 0xffd98a, alpha: 0.14 });
    f.position.set(Math.random() * width, groundY - 220 + Math.random() * 220);
    f.userData = { speed: 10 + Math.random() * 16 };
    root.addChild(f);
    fog.push(f);
  }

  return { root, fog };
}
