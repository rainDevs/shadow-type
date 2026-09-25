// Misty ink-wash arena (Shadow Fight style): pale gradient sky, huge pale
// moon, layered pagoda-rooftop silhouettes in atmospheric perspective and a
// dark foreground hill. Fog banks animate via PixiGame.

import { Container, Graphics } from 'pixi.js';

export function buildBackground(width, height, groundY) {
  const root = new Container();

  // Pale sky gradient (stacked bands, light at the horizon).
  const sky = new Graphics();
  const bands = 26;
  const top = [196, 204, 224];
  const bottom = [138, 146, 172];
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    sky.rect(0, (height * 0.72 * i) / bands, width, (height * 0.72) / bands + 1);
    sky.fill({ color: (r << 16) | (g << 8) | b });
  }
  root.addChild(sky);

  // Huge pale moon, slightly left of center.
  const moonX = width * 0.42;
  const moonY = height * 0.3;
  const halo = new Graphics();
  halo.circle(moonX, moonY, 170);
  halo.fill({ color: 0xffffff, alpha: 0.25 });
  halo.circle(moonX, moonY, 120);
  halo.fill({ color: 0xffffff, alpha: 0.3 });
  root.addChild(halo);
  const moon = new Graphics();
  moon.circle(moonX, moonY, 95);
  moon.fill({ color: 0xf2f4fa });
  root.addChild(moon);

  // Faint Mt Fuji in the mist.
  const fuji = new Graphics();
  const fBase = groundY - 130;
  fuji.moveTo(820, fBase);
  fuji.lineTo(1020, height * 0.22);
  fuji.lineTo(1090, height * 0.22);
  fuji.lineTo(1290, fBase);
  fuji.closePath();
  fuji.fill({ color: 0x9aa0b8, alpha: 0.55 });
  root.addChild(fuji);

  // Pagoda rooftop layers, far → near.
  const layers = [
    { color: 0x8f96ae, alpha: 0.75, y: groundY - 190, scale: 0.7, seed: 3 },
    { color: 0x596078, alpha: 0.9, y: groundY - 120, scale: 0.9, seed: 7 },
    { color: 0x2c3145, alpha: 1, y: groundY - 60, scale: 1.15, seed: 12 },
  ];
  for (const layer of layers) {
    const g = new Graphics();
    let x = -40;
    let n = 0;
    while (x < width + 40) {
      const w = (120 + ((n * 53 + layer.seed * 29) % 90)) * layer.scale;
      const h = (60 + ((n * 37 + layer.seed * 17) % 70)) * layer.scale;
      // Hall body.
      g.rect(x + w * 0.18, layer.y - h, w * 0.64, h);
      g.fill({ color: layer.color, alpha: layer.alpha });
      // Stacked flared roofs.
      const roofs = 2 + ((n + layer.seed) % 2);
      for (let r = 0; r < roofs; r++) {
        const ry = layer.y - h + (r * h) / roofs;
        const rw = w * (0.72 + (0.28 * r) / roofs);
        g.moveTo(x + (w - rw) / 2 - 14 * layer.scale, ry);
        g.lineTo(x + (w + rw) / 2 + 14 * layer.scale, ry);
        g.lineTo(x + (w + rw) / 2 - 6 * layer.scale, ry - 16 * layer.scale);
        g.lineTo(x + (w - rw) / 2 + 6 * layer.scale, ry - 16 * layer.scale);
        g.closePath();
        g.fill({ color: layer.color, alpha: layer.alpha });
      }
      x += w * 0.82;
      n += 1;
    }
    root.addChild(g);
  }

  // Dark pines at both edges.
  const pines = new Graphics();
  for (const px of [36, 1244]) {
    pines.rect(px - 5, groundY - 240, 10, 240);
    pines.fill({ color: 0x141824 });
    for (let t = 0; t < 5; t++) {
      const ty = groundY - 240 + t * 44;
      const tw = 66 - t * 7;
      pines.moveTo(px - tw / 2, ty);
      pines.lineTo(px + tw / 2, ty);
      pines.lineTo(px, ty - 52);
      pines.closePath();
      pines.fill({ color: 0x141824 });
    }
  }
  root.addChild(pines);

  // Foreground hill (near-black) with grass tufts. Crest meets the fighters' feet.
  const hillY = groundY;
  const hill = new Graphics();
  hill.moveTo(0, hillY + 40);
  hill.lineTo(0, hillY);
  for (let hx = 0; hx <= width; hx += 32) {
    hill.lineTo(hx + 16, hillY - 8 - ((hx * 7) % 14));
    hill.lineTo(hx + 32, hillY);
  }
  hill.lineTo(width, hillY + 40);
  hill.closePath();
  hill.fill({ color: 0x0b0e16 });
  root.addChild(hill);

  // Stone courtyard strip below the hill crest.
  const floor = new Graphics();
  floor.rect(0, hillY + 2, width, height - hillY);
  floor.fill({ color: 0x141824 });
  floor.rect(0, hillY + 2, width, 2);
  floor.fill({ color: 0x8b93b0, alpha: 0.5 });
  root.addChild(floor);

  // White mist banks (animated by PixiGame).
  const fog = [];
  for (let i = 0; i < 6; i++) {
    const f = new Graphics();
    f.ellipse(0, 0, 240, 30);
    f.fill({ color: 0xffffff, alpha: 0.16 });
    f.position.set(Math.random() * width, groundY - 200 + Math.random() * 220);
    f.userData = { speed: 10 + Math.random() * 16 };
    root.addChild(f);
    fog.push(f);
  }

  return { root, fog };
}
