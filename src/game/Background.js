// Dark fighting-arena background (PLAN.md section 33):
// gradient sky, glowing moon, distant structures, floor, drifting fog.

import { Container, Graphics } from 'pixi.js';

export function buildBackground(width, height, groundY) {
  const root = new Container();

  // Sky gradient (stacked bands).
  const sky = new Graphics();
  const bands = 24;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const r = Math.round(6 + t * 14);
    const g = Math.round(6 + t * 10);
    const b = Math.round(18 + t * 26);
    sky.rect(0, (height * 0.62 * i) / bands, width, height * 0.62 / bands + 1);
    sky.fill({ color: (r << 16) | (g << 8) | b });
  }
  root.addChild(sky);

  // Moon + halo.
  const moonX = width * 0.5;
  const moonY = height * 0.2;
  const halo = new Graphics();
  halo.circle(moonX, moonY, 120);
  halo.fill({ color: 0x8b7bd8, alpha: 0.12 });
  halo.circle(moonX, moonY, 80);
  halo.fill({ color: 0xb9aef2, alpha: 0.12 });
  root.addChild(halo);
  const moon = new Graphics();
  moon.circle(moonX, moonY, 52);
  moon.fill({ color: 0xe6e1ff });
  // Craters.
  moon.circle(moonX - 16, moonY - 8, 9);
  moon.circle(moonX + 12, moonY + 14, 6);
  moon.circle(moonX + 20, moonY - 18, 5);
  moon.fill({ color: 0xc9c2ea });
  root.addChild(moon);

  // Distant structures (pagoda silhouettes).
  const city = new Graphics();
  const silhouettes = [
    { x: 60, w: 70, h: 150 },
    { x: 170, w: 46, h: 210 },
    { x: 1050, w: 60, h: 180 },
    { x: 1150, w: 44, h: 230 },
  ];
  for (const s of silhouettes) {
    const top = groundY - s.h;
    city.rect(s.x, top, s.w, s.h);
    city.fill({ color: 0x0d0d1a });
    // Tiered roofs.
    for (let tier = 0; tier < 3; tier++) {
      const ry = top + tier * (s.h / 3.4);
      city.moveTo(s.x - 12, ry);
      city.lineTo(s.x + s.w + 12, ry);
      city.lineTo(s.x + s.w - 6, ry - 12);
      city.lineTo(s.x + 6, ry - 12);
      city.closePath();
      city.fill({ color: 0x0d0d1a });
    }
  }
  // Dead trees.
  const trees = [300, 950];
  for (const tx of trees) {
    city.moveTo(tx, groundY);
    city.lineTo(tx, groundY - 120);
    city.stroke({ color: 0x0d0d1a, width: 8 });
    city.moveTo(tx, groundY - 80);
    city.lineTo(tx - 30, groundY - 130);
    city.stroke({ color: 0x0d0d1a, width: 5 });
    city.moveTo(tx, groundY - 95);
    city.lineTo(tx + 28, groundY - 150);
    city.stroke({ color: 0x0d0d1a, width: 5 });
  }
  root.addChild(city);

  // Arena floor.
  const floor = new Graphics();
  floor.rect(0, groundY, width, height - groundY);
  floor.fill({ color: 0x11111d });
  // Floor sheen + center line.
  floor.rect(0, groundY, width, 3);
  floor.fill({ color: 0x3b3b5e, alpha: 0.8 });
  floor.moveTo(width / 2, groundY + 12);
  floor.lineTo(width / 2, height - 20);
  floor.stroke({ color: 0x4c1d95, width: 2, alpha: 0.5 });
  // Floor reflection streaks under fighters.
  for (const fx of [width * 0.3, width * 0.7]) {
    floor.ellipse(fx, groundY + 26, 90, 10);
    floor.fill({ color: 0x2a2a4a, alpha: 0.5 });
  }
  root.addChild(floor);

  // Fog banks (animated by PixiGame).
  const fog = [];
  for (let i = 0; i < 5; i++) {
    const f = new Graphics();
    f.ellipse(0, 0, 220, 26);
    f.fill({ color: 0x5b5b8a, alpha: 0.1 });
    f.position.set(Math.random() * width, groundY - 20 - Math.random() * 120);
    f.userData = { speed: 8 + Math.random() * 14 };
    root.addChild(f);
    fog.push(f);
  }

  return { root, fog };
}
