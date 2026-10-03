// Tiny-hero arena backdrop: deep-ink sky with steel star pixels, a cratered
// moon, drifting blocky clouds, and a pixel ground slab the 42px fighters
// stand on. All squares and flat fills — no soft gradients — so the canvas
// matches the sprite art style.

import { Container, Graphics } from 'pixi.js';

// Sprite palette.
const INK = 0x04193f;
const INK_LIGHT = 0x0a2050;
const RIDGE = 0x071233;
const STEEL = 0x94a0ba;
const SKIN = 0xe59b6a;
const PAPER = 0xfcfefe;

export const EMBER_VENTS = [300, 640, 980];
export const EMBER_COLOR = 0xe59b6a; // shared skin tone rising from the ground

export const MOON = { x: 1050, y: 250, r: 55 };

function hashRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// One blocky cloud: clustered rects, dark body with a moonlit top edge.
function makeCloud(rand, w) {
  const g = new Graphics();
  const h = 22 + Math.floor(rand() * 3) * 8;
  // Body slabs.
  g.rect(0, 10, w, h);
  g.fill({ color: INK_LIGHT, alpha: 0.92 });
  g.rect(10, 0, w - 26, 14);
  g.fill({ color: INK_LIGHT, alpha: 0.92 });
  g.rect(24, -8, Math.floor(w * 0.4), 12);
  g.fill({ color: INK_LIGHT, alpha: 0.92 });
  // Moonlit top edges.
  g.rect(0, 10, w, 3);
  g.fill({ color: STEEL, alpha: 0.5 });
  g.rect(10, 0, w - 26, 3);
  g.fill({ color: STEEL, alpha: 0.45 });
  g.rect(24, -8, Math.floor(w * 0.4), 3);
  g.fill({ color: PAPER, alpha: 0.35 });
  return { g, w: w + 8, h: h + 18 };
}

export async function buildBackground(width, height, groundY, opts = {}) {
  const root = new Container();
  const rand = hashRand(1337);
  const mobile = opts.mobile ?? false;
  // Mobile: fewer one-time rects to cut fill-rate and overdraw.
  const starCount = mobile ? 60 : 110;
  const gritCount = mobile ? 100 : 220;
  const laneCount = mobile ? 3 : 5;

  // Sky: flat ink with slightly lighter top band (blocky, 8px steps).
  const sky = new Graphics();
  sky.rect(0, 0, width, groundY);
  sky.fill({ color: INK });
  sky.rect(0, 0, width, 96);
  sky.fill({ color: INK_LIGHT, alpha: 0.55 });
  root.addChild(sky);

  // Star pixels in steel/paper/pink, denser near the top.
  const stars = new Graphics();
  for (let i = 0; i < starCount; i++) {
    const x = Math.floor(rand() * (width / 4)) * 4;
    const y = Math.floor(rand() * ((groundY - 140) / 4)) * 4;
    const s = rand() < 0.85 ? 2 : 3;
    const c = rand() < 0.6 ? STEEL : rand() < 0.5 ? PAPER : 0xf489f6;
    stars.rect(x, y, s, s);
    stars.fill({ color: c, alpha: 0.18 + rand() * 0.3 });
  }
  root.addChild(stars);

  // Moon: soft glow, pale body, steel craters.
  // Mobile skips the two large translucent glow discs (overdraw).
  const moon = new Graphics();
  if (!mobile) {
    moon.circle(MOON.x, MOON.y, MOON.r + 26);
    moon.fill({ color: PAPER, alpha: 0.1 });
    moon.circle(MOON.x, MOON.y, MOON.r + 10);
    moon.fill({ color: PAPER, alpha: 0.1 });
  }
  moon.circle(MOON.x, MOON.y, MOON.r);
  moon.fill({ color: PAPER });
  moon.circle(MOON.x - 18, MOON.y - 12, 12);
  moon.fill({ color: STEEL, alpha: 0.55 });
  moon.circle(MOON.x + 14, MOON.y + 8, 9);
  moon.fill({ color: STEEL, alpha: 0.5 });
  moon.circle(MOON.x + 2, MOON.y - 24, 6);
  moon.fill({ color: STEEL, alpha: 0.45 });
  moon.circle(MOON.x - 4, MOON.y + 22, 7);
  moon.fill({ color: SKIN, alpha: 0.3 });
  root.addChild(moon);

  // Drifting clouds (animated by PixiGame).
  const clouds = [];
  const lanes = [210, 260, 320, 380, 290].slice(0, laneCount);
  for (let i = 0; i < lanes.length; i++) {
    const w = 110 + Math.floor(rand() * 5) * 22;
    const { g, w: full } = makeCloud(rand, w);
    g.position.set(rand() * width, lanes[i] + (rand() - 0.5) * 30);
    root.addChild(g);
    clouds.push(Object.assign(g, {
      userData: { speed: 6 + rand() * 12, w: full },
    }));
  }

  // Distant city skyline: blocky towers with lit pixel windows.
  const ridge = new Graphics();
  ridge.rect(0, groundY - 64, width, 64);
  ridge.fill({ color: RIDGE, alpha: 0.9 });
  const windows = new Graphics();
  const beacons = new Graphics();
  const LIT = [0xfda216, 0xfda216, 0xfcfefe, 0x0feffb];
  const litP = mobile ? 0.3 : 0.45;
  const winStepX = mobile ? 14 : 10;
  const winStepY = mobile ? 14 : 12;
  let bx = 0;
  while (bx < width) {
    const bw = 48 + Math.floor(rand() * 4) * 16;
    const bh = 64 + Math.floor(rand() * 5) * 16;
    ridge.rect(bx, groundY - bh, bw, bh);
    ridge.fill({ color: RIDGE, alpha: 0.9 });
    // Rooftop lip catching moonlight.
    ridge.rect(bx, groundY - bh, bw, 3);
    ridge.fill({ color: STEEL, alpha: 0.25 });
    // Lit windows grid; most stay dark (silhouette shows through).
    for (let wy = groundY - bh + 10; wy < groundY - 14; wy += winStepY) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += winStepX) {
        if (rand() < litP) {
          const c = LIT[Math.floor(rand() * LIT.length)];
          windows.rect(wx, wy, 4, 5);
          windows.fill({ color: c, alpha: 0.18 + rand() * 0.25 });
        }
      }
    }
    // Red aircraft-warning beacon on the tallest towers.
    if (bh >= 112) {
      beacons.rect(bx + Math.floor(bw / 2) - 1, groundY - bh - 8, 3, 3);
      beacons.fill({ color: 0xe7333b, alpha: 0.65 });
      beacons.rect(bx + Math.floor(bw / 2) - 1, groundY - bh - 5, 1, 5);
      beacons.fill({ color: STEEL, alpha: 0.5 });
    }
    bx += bw;
  }
  root.addChild(ridge);
  root.addChild(windows);
  root.addChild(beacons);

  // Ground slab the fighters stand on.
  const slabH = height - groundY;
  const ground = new Graphics();
  ground.rect(0, groundY, width, slabH);
  ground.fill({ color: 0x0a1030 });
  ground.rect(0, groundY, width, 4);
  ground.fill({ color: STEEL });
  ground.rect(0, groundY + 4, width, 2);
  ground.fill({ color: PAPER, alpha: 0.25 });
  root.addChild(ground);

  // Ground speckles: steel + skin pixel grit.
  const grit = new Graphics();
  for (let i = 0; i < gritCount; i++) {
    const x = Math.floor(rand() * (width / 4)) * 4;
    const y = groundY + 10 + Math.floor(rand() * ((slabH - 14) / 4)) * 4;
    const c = rand() < 0.7 ? STEEL : SKIN;
    grit.rect(x, y, 3, 3);
    grit.fill({ color: c, alpha: 0.16 + rand() * 0.25 });
  }
  root.addChild(grit);

  return { root, fog: [], clouds };
}
