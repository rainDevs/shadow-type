// Tiny-hero arena backdrop: deep-ink sky with steel star pixels and a
// pixel ground slab the 42px fighters stand on. All squares — no soft
// gradients — so the canvas matches the sprite art style.

import { Container, Graphics } from 'pixi.js';

// Sprite palette.
const INK = 0x04193f;
const INK_LIGHT = 0x0a2050;
const STEEL = 0x94a0ba;
const SKIN = 0xe59b6a;
const PAPER = 0xfcfefe;
const PINK = 0xf489f6;

export const EMBER_VENTS = [300, 640, 980];
export const EMBER_COLOR = 0xe59b6a; // shared skin tone rising from the ground

function hashRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export async function buildBackground(width, height, groundY) {
  const root = new Container();
  const rand = hashRand(1337);

  // Sky: flat ink with slightly lighter top band (blocky, 8px steps).
  const sky = new Graphics();
  sky.rect(0, 0, width, groundY);
  sky.fill({ color: INK });
  sky.rect(0, 0, width, 96);
  sky.fill({ color: INK_LIGHT, alpha: 0.55 });
  root.addChild(sky);

  // Star pixels in steel/paper/pink, denser near the top.
  const stars = new Graphics();
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rand() * (width / 4)) * 4;
    const y = Math.floor(rand() * ((groundY - 140) / 4)) * 4;
    const s = rand() < 0.85 ? 2 : 3;
    const c = rand() < 0.6 ? STEEL : rand() < 0.5 ? PAPER : PINK;
    stars.rect(x, y, s, s);
    stars.fill({ color: c, alpha: 0.18 + rand() * 0.3 });
  }
  root.addChild(stars);

  // Distant blocky ridge (dark silhouette two tones).
  const ridge = new Graphics();
  ridge.rect(0, groundY - 64, width, 64);
  ridge.fill({ color: 0x071233, alpha: 0.9 });
  for (let x = 0; x < width; x += 32) {
    const h = 8 + Math.floor(rand() * 5) * 8;
    ridge.rect(x, groundY - 64 - h, 32, h);
    ridge.fill({ color: 0x071233, alpha: 0.9 });
  }
  root.addChild(ridge);

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
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rand() * (width / 4)) * 4;
    const y = groundY + 10 + Math.floor(rand() * ((slabH - 14) / 4)) * 4;
    const c = rand() < 0.7 ? STEEL : SKIN;
    grit.rect(x, y, 3, 3);
    grit.fill({ color: c, alpha: 0.16 + rand() * 0.25 });
  }
  root.addChild(grit);

  return { root, fog: [] };
}
