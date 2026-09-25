// Ancient Japan fighting ground: night sky, glowing moon, Mt Fuji,
// vermillion torii gate, five-tier pagoda, sakura trees, stone lanterns,
// wooden fence and a stone courtyard. Fog banks animate via PixiGame.

import { Container, Graphics } from 'pixi.js';

const SILHOUETTE = 0x0c0c1a;
const VERMILION = 0xb8322a;
const BLOSSOM = 0x4a2b4a;
const BLOSSOM_DOT = 0xe08bb8;
const GOLD_COLOR = 0xd9b36c;

export function buildBackground(width, height, groundY) {
  const root = new Container();

  // Night sky gradient (stacked bands).
  const sky = new Graphics();
  const bands = 26;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const r = Math.round(5 + t * 16);
    const g = Math.round(5 + t * 10);
    const b = Math.round(20 + t * 28);
    sky.rect(0, (height * 0.66 * i) / bands, width, (height * 0.66) / bands + 1);
    sky.fill({ color: (r << 16) | (g << 8) | b });
  }
  root.addChild(sky);

  // Stars.
  const stars = new Graphics();
  for (let i = 0; i < 90; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.45;
    const s = Math.random() < 0.2 ? 2 : 1;
    stars.rect(sx, sy, s, s);
    stars.fill({ color: 0xcfd4ff, alpha: 0.25 + Math.random() * 0.5 });
  }
  root.addChild(stars);

  // Moon + halo.
  const moonX = width * 0.72;
  const moonY = height * 0.18;
  const halo = new Graphics();
  halo.circle(moonX, moonY, 120);
  halo.fill({ color: 0x8b7bd8, alpha: 0.1 });
  halo.circle(moonX, moonY, 78);
  halo.fill({ color: 0xb9aef2, alpha: 0.12 });
  root.addChild(halo);
  const moon = new Graphics();
  moon.circle(moonX, moonY, 50);
  moon.fill({ color: 0xe9e4ff });
  moon.circle(moonX - 15, moonY - 8, 8);
  moon.circle(moonX + 11, moonY + 13, 6);
  moon.circle(moonX + 19, moonY - 17, 4.5);
  moon.fill({ color: 0xc9c2ea });
  root.addChild(moon);

  // Mt Fuji silhouette with snow cap.
  const fuji = new Graphics();
  const fBase = groundY - 40;
  fuji.moveTo(60, fBase);
  fuji.lineTo(330, height * 0.16);
  fuji.lineTo(430, height * 0.16);
  fuji.lineTo(700, fBase);
  fuji.closePath();
  fuji.fill({ color: 0x101024 });
  // Snow cap.
  fuji.moveTo(308, height * 0.16);
  fuji.lineTo(452, height * 0.16);
  fuji.lineTo(420, height * 0.16 + 34);
  fuji.lineTo(392, height * 0.16 + 22);
  fuji.lineTo(366, height * 0.16 + 34);
  fuji.lineTo(338, height * 0.16 + 22);
  fuji.closePath();
  fuji.fill({ color: 0x8f8fb8, alpha: 0.85 });
  root.addChild(fuji);

  // Five-tier pagoda (right side).
  const pagoda = new Graphics();
  const px = 1050;
  const pBase = groundY - 30;
  const tiers = 5;
  for (let tier = 0; tier < tiers; tier++) {
    const tw = 120 - tier * 18;
    const th = 34;
    const ty = pBase - (tier + 1) * (th + 6);
    // Body.
    pagoda.rect(px - tw / 2 + 12, ty, tw - 24, th);
    pagoda.fill({ color: SILHOUETTE });
    // Roof (flared).
    pagoda.moveTo(px - tw / 2 - 14, ty);
    pagoda.lineTo(px + tw / 2 + 14, ty);
    pagoda.lineTo(px + tw / 2 - 10, ty - 14);
    pagoda.lineTo(px - tw / 2 + 10, ty - 14);
    pagoda.closePath();
    pagoda.fill({ color: SILHOUETTE });
    // Warm lit windows.
    pagoda.rect(px - 8, ty + 10, 16, 14);
    pagoda.fill({ color: 0xffc46b, alpha: 0.75 });
  }
  // Spire.
  pagoda.moveTo(px, pBase - tiers * 40 - 14);
  pagoda.lineTo(px, pBase - tiers * 40 - 70);
  pagoda.stroke({ color: SILHOUETTE, width: 6 });
  pagoda.circle(px, pBase - tiers * 40 - 72, 5);
  pagoda.fill({ color: GOLD_COLOR });
  root.addChild(pagoda);

  // Vermillion torii gate (left-center).
  const torii = new Graphics();
  const tx = 300;
  const tBase = groundY - 24;
  const tTop = tBase - 190;
  // Pillars (slight inward lean).
  torii.moveTo(tx - 62, tBase);
  torii.lineTo(tx - 48, tTop + 26);
  torii.stroke({ color: VERMILION, width: 13 });
  torii.moveTo(tx + 62, tBase);
  torii.lineTo(tx + 48, tTop + 26);
  torii.stroke({ color: VERMILION, width: 13 });
  // Top lintel (shimaki) with upward curve illusion.
  torii.moveTo(tx - 100, tTop + 18);
  torii.lineTo(tx + 100, tTop + 18);
  torii.stroke({ color: VERMILION, width: 16 });
  torii.moveTo(tx - 92, tTop);
  torii.lineTo(tx + 92, tTop);
  torii.stroke({ color: 0x7c1f18, width: 20 });
  // Second lintel (nuki).
  torii.moveTo(tx - 66, tTop + 52);
  torii.lineTo(tx + 66, tTop + 52);
  torii.stroke({ color: VERMILION, width: 9 });
  // Center plaque.
  torii.rect(tx - 10, tTop + 22, 20, 26);
  torii.fill({ color: 0x7c1f18 });
  root.addChild(torii);

  // Sakura trees (blossom canopies + petal dots).
  const sakuraSpots = [
    { x: 120, y: groundY - 150, r: 70 },
    { x: 880, y: groundY - 170, r: 84 },
  ];
  const trees = new Graphics();
  for (const s of sakuraSpots) {
    // Trunk + branches.
    trees.moveTo(s.x, groundY - 20);
    trees.lineTo(s.x + 6, s.y + 40);
    trees.stroke({ color: SILHOUETTE, width: 12 });
    trees.moveTo(s.x + 6, s.y + 70);
    trees.lineTo(s.x - 34, s.y + 10);
    trees.stroke({ color: SILHOUETTE, width: 6 });
    trees.moveTo(s.x + 6, s.y + 70);
    trees.lineTo(s.x + 42, s.y + 16);
    trees.stroke({ color: SILHOUETTE, width: 6 });
    // Canopy blobs.
    for (const [ox, oy, or] of [[0, 0, 1], [-44, 18, 0.7], [46, 20, 0.72], [-8, -34, 0.75], [30, -22, 0.6]]) {
      trees.circle(s.x + ox, s.y + oy, s.r * or);
      trees.fill({ color: BLOSSOM });
    }
  }
  root.addChild(trees);
  const blossoms = new Graphics();
  for (const s of sakuraSpots) {
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * s.r * 1.05;
      blossoms.circle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.75, 2.2);
      blossoms.fill({ color: BLOSSOM_DOT, alpha: 0.35 + Math.random() * 0.5 });
    }
  }
  root.addChild(blossoms);

  // Stone lanterns (tōrō) with warm glowing windows.
  const lanterns = new Graphics();
  for (const lx of [490, 790]) {
    const lb = groundY - 14;
    lanterns.rect(lx - 14, lb - 8, 28, 8); // base
    lanterns.fill({ color: 0x23232e });
    lanterns.rect(lx - 7, lb - 34, 14, 26); // shaft
    lanterns.fill({ color: 0x23232e });
    lanterns.rect(lx - 16, lb - 56, 32, 22); // light box
    lanterns.fill({ color: 0x23232e });
    lanterns.rect(lx - 8, lb - 51, 16, 12); // glowing window
    lanterns.fill({ color: 0xffc46b, alpha: 0.9 });
    lanterns.moveTo(lx - 20, lb - 56);
    lanterns.lineTo(lx + 20, lb - 56);
    lanterns.lineTo(lx + 14, lb - 66);
    lanterns.lineTo(lx - 14, lb - 66);
    lanterns.closePath(); // roof
    lanterns.fill({ color: 0x23232e });
    // Glow halo.
    lanterns.circle(lx, lb - 45, 22);
    lanterns.fill({ color: 0xffc46b, alpha: 0.12 });
  }
  root.addChild(lanterns);

  // Wooden fence across the mid-ground.
  const fence = new Graphics();
  const fTop = groundY - 66;
  for (let fx = 0; fx <= width; fx += 64) {
    fence.rect(fx, fTop, 7, 52);
    fence.fill({ color: SILHOUETTE });
  }
  fence.rect(0, fTop + 6, width, 6);
  fence.fill({ color: SILHOUETTE });
  fence.rect(0, fTop + 30, width, 6);
  fence.fill({ color: SILHOUETTE });
  root.addChild(fence);

  // Stone courtyard floor with slab seams.
  const floor = new Graphics();
  floor.rect(0, groundY, width, height - groundY);
  floor.fill({ color: 0x12121f });
  floor.rect(0, groundY, width, 3);
  floor.fill({ color: 0x3d3d60, alpha: 0.9 });
  for (let sx = 40; sx < width; sx += 120) {
    floor.moveTo(sx, groundY + 4);
    floor.lineTo(sx - 24, height);
    floor.stroke({ color: 0x2a2a44, width: 2, alpha: 0.7 });
  }
  floor.moveTo(width / 2, groundY + 12);
  floor.lineTo(width / 2, height - 16);
  floor.stroke({ color: 0x4c1d95, width: 2, alpha: 0.5 });
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
