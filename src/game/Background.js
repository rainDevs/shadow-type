// Forest arena backdrop (Eder Muniz "Free Pixel Art Forest", see
// Free Pixel Art Forest/license.txt). All 12 parallax layers composited
// bottom-aligned so the grass line lands on the fighters' ground.
// Ambient fireflies drift up from the undergrowth.

import { Assets, Container, Sprite } from 'pixi.js';

export const EMBER_VENTS = [300, 640, 980];
export const EMBER_COLOR = 0xb8e62e; // firefly green

const LAYERS = [
  'Layer_0000_9.png',
  'Layer_0001_8.png',
  'Layer_0002_7.png',
  'Layer_0003_6.png',
  'Layer_0004_Lights.png',
  'Layer_0005_5.png',
  'Layer_0006_4.png',
  'Layer_0007_Lights.png',
  'Layer_0008_3.png',
  'Layer_0009_2.png',
  'Layer_0010_1.png',
  'Layer_0011_0.png',
];

export async function buildBackground(width, height, groundY) {
  const root = new Container();
  const base = import.meta.env.BASE_URL || '/';
  const scale = width / 928; // cover width, crop sky, anchor ground
  for (const file of LAYERS) {
    const texture = await Assets.load(`${base}images/forest/${file}`);
    texture.source.scaleMode = 'nearest';
    const sprite = new Sprite(texture);
    sprite.scale.set(scale);
    sprite.position.set(0, height - 793 * scale);
    root.addChild(sprite);
  }
  void groundY;
  return { root, fog: [] };
}
