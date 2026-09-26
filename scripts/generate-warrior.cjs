// Procedural chibi Warrior sprite generator (original art, no attribution needed).
// Draws a 64x64 pixel rig per frame, upscales 2x into 128x128 cells, and packs
// horizontal strips into public/sprites/warrior-<state>.png.
// Run: node scripts/generate-warrior.js  (or npm run gen:warrior)
// Re-running overwrites the PNGs; Fighter.js CROP/anchor constants come from
// the UNION bbox printed at the end (hardcoded there by hand).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GRID = 64;
const SCALE = 2;
const CELL = GRID * SCALE; // 128 — matches Fighter.js FRAME stride
const FEET_Y = 52; // sole row (internal coords); identical in every standing frame
const CORE_X = 28; // body-core x (internal); stance center used for the anchor

// Palette
const P = {
  outline: [11, 13, 18],
  armorDeep: [20, 23, 31],
  armorDark: [32, 36, 47],
  armorMid: [47, 54, 68],
  armorLight: [66, 75, 94],
  steel: [138, 147, 166],
  steelBright: [205, 213, 228],
  leather: [74, 50, 32],
  leatherDark: [46, 32, 19],
  violet: [75, 63, 163],
  violetMid: [58, 48, 132],
  violetDark: [42, 34, 102],
  violetLight: [109, 92, 255],
  face: [242, 232, 213],
  faceShade: [201, 168, 127],
  cyan: [84, 240, 255],
  cyanDim: [30, 143, 163],
  rim: [190, 245, 255],
  hair: [30, 28, 38],
  hairHi: [74, 70, 92],
  hairShade: [18, 16, 24],
  skin: [255, 213, 172],
  skinShade: [228, 158, 118],
  blush: [244, 140, 140],
  gold: [178, 134, 54],
  goldLight: [235, 193, 102],
  goldDark: [120, 86, 34],
  grip: [98, 66, 42],
  gripDark: [64, 42, 26],
  pupil: [22, 24, 38],
  mantle: [26, 24, 40],
  mantleHi: [48, 44, 78],
  white: [255, 255, 255],
  boot: [20, 22, 28],
  dust: [200, 200, 210],
  mouth: [40, 20, 24],
};

// --- pixel buffer -----------------------------------------------------------
function makeBuf() {
  return new Uint8ClampedArray(GRID * GRID * 4); // transparent by default
}

function set(buf, x, y, c, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
  const i = (y * GRID + x) * 4;
  if (a >= 255 || buf[i + 3] === 0) {
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = a;
    return;
  }
  // source-over composite over existing pixel
  const sa = a / 255;
  const da = buf[i + 3] / 255;
  const out = sa + da * (1 - sa);
  buf[i] = Math.round((c[0] * sa + buf[i] * da * (1 - sa)) / out);
  buf[i + 1] = Math.round((c[1] * sa + buf[i + 1] * da * (1 - sa)) / out);
  buf[i + 2] = Math.round((c[2] * sa + buf[i + 2] * da * (1 - sa)) / out);
  buf[i + 3] = Math.round(out * 255);
}

function rect(buf, x, y, w, h, c, a = 255) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(buf, x + i, y + j, c, a);
}

// Part with a 1px dark outline: paint outline slab first, then the fill.
function part(buf, x, y, w, h, c, a = 255) {
  rect(buf, x - 1, y - 1, w + 2, h + 2, P.outline);
  rect(buf, x, y, w, h, c, a);
}

function hline(buf, x0, x1, y, c, a = 255) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(buf, x, y, c, a);
}

function vline(buf, x, y0, y1, c, a = 255) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) set(buf, x, y, c, a);
}

function disc(buf, cx, cy, r, c, a = 255) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) set(buf, cx + x, cy + y, c, a);
}

function line(buf, x0, y0, x1, y1, c, w = 1, a = 255) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const r = Math.floor(w / 2);
  for (;;) {
    if (w <= 1) set(buf, x0, y0, c, a);
    else disc(buf, x0, y0, r, c, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function ellipse(buf, cx, cy, rx, ry, c, a = 255) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) set(buf, cx + x, cy + y, c, a);
}

// Checkerboard dither between two colors for gradient texture.
function dither(buf, x, y, w, h, cA, cB, a = 255) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) set(buf, x + i, y + j, (i + j) % 2 === 0 ? cA : cB, a);
}

// Thin shockwave ring.
function ring(buf, cx, cy, r, c, a = 150) {
  for (let k = 0; k < 48; k++) {
    const t = (k / 48) * Math.PI * 2;
    set(buf, cx + Math.cos(t) * r, cy + Math.sin(t) * r, c, a);
  }
}

// White hit-flash over all opaque pixels.
function flash(buf, f) {
  if (f <= 0) return;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    buf[i] = Math.round(buf[i] + (255 - buf[i]) * f);
    buf[i + 1] = Math.round(buf[i + 1] + (255 - buf[i + 1]) * f);
    buf[i + 2] = Math.round(buf[i + 2] + (255 - buf[i + 2]) * f);
  }
}

// --- reusable fx ------------------------------------------------------------
function glowPlus(buf, x, y, c = P.cyan, a = 120) {
  set(buf, x + 1, y, c, a);
  set(buf, x - 1, y, c, a);
  set(buf, x, y + 1, c, a);
  set(buf, x, y - 1, c, a);
}

function impactStar(buf, cx, cy, r) {
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    line(buf, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, P.white, 1, 235);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    line(buf, cx, cy, cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), P.cyan, 1, 170);
  }
  disc(buf, cx, cy, 3, P.cyan);
  disc(buf, cx, cy, 1, P.white);
  set(buf, cx, cy, P.white);
  glowPlus(buf, cx, cy);
  ring(buf, cx, cy, r + 2, P.white, 130);
}

function dustPuff(buf, x, y, big = false) {
  const r = big ? 2 : 1;
  disc(buf, x - 2, y, r, P.dust, 140);
  disc(buf, x + 2, y - 1, r, P.dust, 140);
  disc(buf, x, y - 1, 1, P.white, 120);
}

function speedLines(buf, rows) {
  for (const [y, x0, x1] of rows) {
    hline(buf, x0, x1, y, P.white, 110);
    hline(buf, x0 + 1, x1, y + 1, P.cyan, 90);
  }
}

function arcTrail(buf, pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    line(buf, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.cyan, 5, 140);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    line(buf, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.cyan, 3, 170);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    line(buf, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.white, 1, 200);
  }
}

// --- body parts (painted back-to-front; dx/dy shift upper-body groups) -------
// Short shoulder mantle (the reference bares the head; cloth stays minimal).
function paintMantle(buf, phase = 0, style = 'hang') {
  const top = 28;
  const bot = 38;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    let lx, rx;
    if (style === 'stream') {
      lx = 8 - Math.round(t * 3);
      rx = 20 - Math.round(t * 1);
    } else {
      lx = 13 + Math.round(Math.sin(phase * 0.9 + t * 3) * 1.5 - t * 2);
      rx = 21 - Math.round(t * 2);
    }
    const wave = style === 'stream' ? 0 : Math.round(Math.sin(phase * 0.9 + t * 4));
    for (let x = lx; x <= rx; x++) {
      if (y >= bot && (x + wave) % 2 === 0) continue; // worn hem
      set(buf, x + wave, y, P.mantle);
    }
    if (y > top && y < bot) {
      set(buf, lx + 2 + wave, y, P.mantleHi, 255); // fold ridge
      set(buf, lx + wave, y, P.goldDark, 220); // dark gold hem edge
    }
  }
  part(buf, 16, 26, 4, 3, P.gold); // clasp
  set(buf, 18, 27, P.goldLight);
}

function paintLegs(buf, pose = 'stance', dx = 0) {
  if (pose === 'lying') return; // drawn by the lying painter
  const runLift = pose === 'runA' ? { back: 0, front: -3 } : pose === 'runB' ? { back: -3, front: 0 } : { back: 0, front: 0 };
  if (pose === 'kneel') {
    // folded: boots stay planted, torso sinks over the thighs
    part(buf, 17 + dx, 48, 9, 4, P.boot);
    part(buf, 29 + dx, 48, 9, 4, P.boot);
    rect(buf, 35 + dx, 50, 3, 2, P.steel);
    rect(buf, 23 + dx, 50, 2, 2, P.steel);
    return;
  }
  // back leg
  const bb = runLift.back;
  part(buf, 19 + dx, 38 + bb, 6, 7, P.armorMid);
  dither(buf, 19 + dx, 42 + bb, 6, 3, P.armorMid, P.armorDark); // worn shading
  hline(buf, 19 + dx, 24 + dx, 41 + bb, P.leather);
  part(buf, 21 + dx, 43 + bb, 3, 2, P.steel); // knee guard
  hline(buf, 21 + dx, 23 + dx, 44 + bb, P.goldDark);
  part(buf, 19 + dx, 45 + bb, 5, 4, P.armorDark);
  part(buf, 17 + dx, 49 + bb, 9, 3, P.boot);
  rect(buf, 24 + dx, 49 + bb, 2, 3, P.steel);
  // front leg
  const fb = runLift.front;
  part(buf, 30 + dx, 38 + fb, 6, 7, P.armorMid);
  dither(buf, 30 + dx, 42 + fb, 6, 3, P.armorMid, P.armorDark);
  hline(buf, 30 + dx, 35 + dx, 41 + fb, P.leather);
  part(buf, 31 + dx, 43 + fb, 3, 2, P.steelBright); // lit knee guard
  hline(buf, 31 + dx, 33 + dx, 44 + fb, P.gold);
  part(buf, 30 + dx, 45 + fb, 6, 4, P.armorDark);
  vline(buf, 34 + dx, 45 + fb, 48 + fb, P.steel); // greave highlight
  part(buf, 29 + dx, 49 + fb, 9, 3, P.boot);
  rect(buf, 36 + dx, 49 + fb, 2, 3, P.steelBright);
  set(buf, 37 + dx, 50 + fb, P.rim, 200); // toe rim light
}

function paintTorso(buf, dx = 0, dy = 0, glow = 1) {
  part(buf, 19 + dx, 27 + dy, 19, 12, P.armorDark); // x19-37: broader chest
  rect(buf, 19 + dx, 27 + dy, 3, 12, P.armorDeep); // deep shade on the back edge
  dither(buf, 22 + dx, 33 + dy, 13, 4, P.armorDark, P.armorDeep); // lower fade
  rect(buf, 21 + dx, 29 + dy, 7, 6, P.armorMid); // back pec plate
  rect(buf, 29 + dx, 29 + dy, 7, 6, P.armorLight); // front pec plate, lit
  dither(buf, 21 + dx, 33 + dy, 7, 2, P.armorMid, P.armorDark);
  vline(buf, 28 + dx, 29 + dy, 34 + dy, P.steel); // center ridge
  hline(buf, 21 + dx, 35 + dx, 27 + dy, P.gold); // gold collar trim
  hline(buf, 21 + dx, 35 + dx, 29 + dy, P.steelBright); // collar shine
  hline(buf, 22 + dx, 36 + dx, 36 + dy, P.armorLight); // ab plate edge
  hline(buf, 22 + dx, 36 + dx, 37 + dy, P.goldDark); // gold waist trim
  // gold chest knot ornament (reference brooch)
  rect(buf, 29 + dx, 30 + dy, 5, 3, P.gold);
  rect(buf, 29 + dx, 30 + dy, 5, 1, P.goldLight);
  set(buf, 31 + dx, 32 + dy, P.goldDark);
  vline(buf, 37 + dx, 28 + dy, 37 + dy, P.steelBright); // front rim
  vline(buf, 38 + dx, 30 + dy, 36 + dy, P.rim, 160); // cyan rim light
  // brown belt, big gold buckle, hanging faulds
  part(buf, 18 + dx, 38 + dy, 21, 4, P.leatherDark);
  vline(buf, 21 + dx, 38 + dy, 41 + dy, P.leather);
  vline(buf, 25 + dx, 38 + dy, 41 + dy, P.leather);
  vline(buf, 35 + dx, 38 + dy, 41 + dy, P.leather);
  part(buf, 28 + dx, 38 + dy, 8, 4, P.gold);
  rect(buf, 28 + dx, 38 + dy, 8, 1, P.goldLight);
  rect(buf, 31 + dx, 39 + dy, 2, 2, P.cyan); // energy stud in the buckle
  glowPlus(buf, 32 + dx, 40 + dy, P.cyan, 70 + Math.round(60 * glow));
  rect(buf, 20 + dx, 42 + dy, 5, 6, P.leather); // fauld strips
  rect(buf, 26 + dx, 42 + dy, 5, 7, P.leatherDark);
  rect(buf, 32 + dx, 42 + dy, 5, 6, P.leather);
  hline(buf, 20 + dx, 24 + dy, 47 + dy, P.gold);
  hline(buf, 26 + dx, 30 + dy, 48 + dy, P.gold);
  hline(buf, 32 + dx, 36 + dy, 47 + dy, P.gold);
}

function paintShoulders(buf, dx = 0, dy = 0) {
  // back pauldron: three staggered plates
  part(buf, 12 + dx, 23 + dy, 12, 4, P.armorMid);
  hline(buf, 12 + dx, 23 + dx, 23 + dy, P.steelBright);
  part(buf, 13 + dx, 27 + dy, 11, 4, P.armorDark);
  dither(buf, 13 + dx, 29 + dy, 11, 2, P.armorDark, P.armorDeep);
  part(buf, 14 + dx, 31 + dy, 9, 3, P.armorDeep);
  hline(buf, 14 + dx, 22 + dx, 33 + dy, P.gold); // trim
  set(buf, 17 + dx, 24 + dy, P.goldLight);
  // front pauldron: massive, faces the enemy
  part(buf, 28 + dx, 23 + dy, 15, 5, P.armorLight);
  hline(buf, 28 + dx, 42 + dx, 23 + dy, P.steelBright);
  vline(buf, 42 + dx, 23 + dy, 27 + dy, P.rim, 180); // rim light
  part(buf, 29 + dx, 28 + dy, 14, 4, P.armorMid);
  dither(buf, 29 + dx, 30 + dy, 14, 2, P.armorMid, P.armorDark);
  part(buf, 30 + dx, 32 + dy, 12, 3, P.armorDark);
  hline(buf, 30 + dx, 41 + dx, 34 + dy, P.gold); // trim
  hline(buf, 30 + dx, 41 + dx, 34 + dy, P.goldLight, 120);
  part(buf, 33 + dx, 24 + dy, 4, 4, P.steel); // rivet plate
  rect(buf, 34 + dx, 25 + dy, 2, 2, P.gold);
  set(buf, 34 + dx, 25 + dy, P.goldLight);
}

function paintArms(buf, dx = 0, dy = 0, fistX = 40, fistY = 37) {
  part(buf, 15 + dx, 32 + dy, 5, 7, P.armorDark); // back arm
  dither(buf, 15 + dx, 36 + dy, 5, 3, P.armorDark, P.armorDeep);
  part(buf, 15 + dx, 39 + dy, 6, 4, P.leatherDark); // back glove
  part(buf, 30 + dx, 32 + dy, 6, 5, P.armorMid); // front upper arm
  hline(buf, 30 + dx, 35 + dx, 32 + dy, P.armorLight);
  line(buf, 33 + dx, 36 + dy, fistX, fistY, P.armorDark, 3); // forearm to grip
  part(buf, fistX - 3, fistY - 3, 6, 6, P.leatherDark); // heavy gloved fist
  hline(buf, fistX - 3, fistX + 2, fistY - 3, P.steel); // knuckles
  hline(buf, fistX - 3, fistX + 2, fistY + 2, P.goldDark); // wrist band
  set(buf, fistX + 2, fistY + 2, P.rim, 160);
}

function paintHead(buf, dx = 0, dy = 0, glow = 1) {
  // hair back mass + top volume (bare head like the reference, no helmet)
  part(buf, 16 + dx, 5 + dy, 25, 12, P.hair);
  part(buf, 18 + dx, 2 + dy, 20, 5, P.hair);
  dither(buf, 18 + dx, 3 + dy, 12, 4, P.hair, P.hairHi); // sheen, upper left
  set(buf, 20 + dx, 3 + dy, P.hairHi);
  set(buf, 22 + dx, 4 + dy, P.hairHi);
  // ahoge cowlick
  line(buf, 32 + dx, 2 + dy, 35 + dx, 0 + dy, P.hair, 1);
  set(buf, 35 + dx, 0 + dy, P.hair);
  // face: big rounded peachy opening
  part(buf, 20 + dx, 13 + dy, 17, 13, P.skin);
  dither(buf, 20 + dx, 23 + dy, 17, 3, P.skin, P.skinShade); // jaw shade
  vline(buf, 36 + dx, 14 + dy, 25 + dy, P.skinShade);
  vline(buf, 37 + dx, 16 + dy, 23 + dy, P.rim, 140); // face rim light
  // jagged bangs over the forehead
  for (let x = 18; x <= 39; x++) {
    const depth = 12 + ((x * 7 + 3) % 5);
    for (let y = 8; y <= depth; y++) {
      if (x >= 20 && x <= 36 && y >= 13) continue; // keep the face window
      set(buf, x + dx, y + dy, P.hair);
    }
  }
  // side locks framing the face
  rect(buf, 15 + dx, 16 + dy, 4, 9, P.hair);
  rect(buf, 38 + dx, 16 + dy, 3, 8, P.hair);
  set(buf, 16 + dx, 17 + dy, P.hairHi);
  // ear poking out in front of the near-side lock
  part(buf, 13 + dx, 18 + dy, 4, 5, P.skin);
  set(buf, 14 + dx, 20 + dy, P.skinShade);
  // bold brows, angled with determination
  rect(buf, 23 + dx, 15 + dy, 6, 2, P.hair);
  rect(buf, 31 + dx, 15 + dy, 6, 2, P.hair);
  set(buf, 28 + dx, 16 + dy, P.hair);
  set(buf, 31 + dx, 16 + dy, P.hair);
  // big anime eyes
  paintEye(buf, 23 + dx, 17 + dy, glow);
  paintEye(buf, 31 + dx, 17 + dy, glow);
  // blush + tiny mouth
  set(buf, 25 + dx, 23 + dy, P.blush, 170);
  set(buf, 35 + dx, 23 + dy, P.blush, 170);
  hline(buf, 31 + dx, 33 + dy, 24 + dy, P.mouth);
  set(buf, 30 + dx, 24 + dy, P.mouth);
  part(buf, 27 + dx, 26 + dy, 6, 2, P.skinShade); // neck shadow
}

// One anime eye: white sclera, large dark pupil, double sparkle.
function paintEye(buf, x, y, glow) {
  rect(buf, x, y, 5, 6, P.white);
  rect(buf, x + 1, y + 1, 3, 5, P.pupil);
  rect(buf, x + 1, y + 4, 3, 2, P.pupil);
  set(buf, x + 1, y + 1, P.white); // sparkle
  set(buf, x + 2, y + 2, P.white);
  set(buf, x + 1, y + 1, P.cyan, 130); // faint energy glint
  hline(buf, x - 1, x + 5, y, P.hair); // upper lash
  set(buf, x - 1, y + 1, P.hair);
  set(buf, x + 5, y + 1, P.hair);
  hline(buf, x, x + 4, y + 6, P.skinShade); // lower lid
  if (glow > 0) glowPlus(buf, x + 2, y + 2, P.white, 60 + Math.round(50 * glow));
}

// Heavy fantasy sword. Grip at (gx,gy), blade tip at (tx,ty).
function paintSword(buf, gx, gy, tx, ty, opts = {}) {
  const { edgeGlow = false, trailFrom = null } = opts;
  if (trailFrom) {
    line(buf, trailFrom[0], trailFrom[1], gx, gy, P.cyanDim, 4, 120);
  }
  line(buf, gx, gy, tx, ty, P.steel, 5); // long silver blade, fullered
  line(buf, gx, gy - 1, tx, ty - 1, P.steelBright, 2, 230); // bright spine
  line(buf, gx, gy, tx, ty, P.armorMid, 1, 200); // dark fuller groove
  line(buf, gx, gy + 2, tx, ty + 2, P.cyan, 1, edgeGlow ? 235 : 140); // energy edge
  // gold rune etched near the guard (quarter along the blade)
  const rx = Math.round(gx + (tx - gx) * 0.25);
  const ry = Math.round(gy + (ty - gy) * 0.25);
  set(buf, rx, ry, P.gold);
  set(buf, rx, ry + 1, P.goldLight);
  disc(buf, tx, ty, 3, P.steelBright); // point
  disc(buf, tx, ty, 1, P.white);
  glowPlus(buf, tx, ty, P.cyan, edgeGlow ? 170 : 90);
  part(buf, gx - 4, gy - 2, 9, 2, P.steel); // slim straight crossguard
  set(buf, gx - 4, gy - 2, P.steelBright);
  set(buf, gx + 4, gy - 2, P.steelBright);
  set(buf, gx - 4, gy - 1, P.goldDark); // guard tips bound in brass
  set(buf, gx + 4, gy - 1, P.goldDark);
  rect(buf, gx - 1, gy + 1, 3, 5, P.grip); // brown leather grip
  hline(buf, gx - 1, gx + 1, gy + 2, P.gripDark); // wrap
  hline(buf, gx - 1, gx + 1, gy + 4, P.gripDark);
  disc(buf, gx, gy + 7, 2, P.steelBright); // round pommel
  set(buf, gx, gy + 7, P.white);
}

// Full standing rig. p: {legPose, upperDX, upperDY, headDX, headDY, fist,
// sword:[gx,gy,tx,ty] + sword opts, capePhase, capeStyle, glow, arc, star,
// dust:[...], lines, flash}
function paintStanding(buf, p = {}) {
  const {
    legPose = 'stance',
    upperDX = 0,
    upperDY = 0,
    headDX = 0,
    headDY = 0,
    fist = [40, 37],
    sword = [40, 37, 56, 17],
    swordOpts = {},
    capePhase = 0,
    capeStyle = 'hang',
    glow = 1,
    arc = null,
    star = null,
    starR = 6,
    dust = [],
    lines = null,
    flashF = 0,
  } = p;
  paintMantle(buf, capePhase, capeStyle);
  if (lines) speedLines(buf, lines);
  paintLegs(buf, legPose);
  const udx = upperDX;
  const udy = upperDY;
  paintTorso(buf, udx, udy, glow);
  paintShoulders(buf, udx, udy);
  paintArms(buf, udx, udy, fist[0] + udx * 0, fist[1]);
  paintHead(buf, udx + headDX, udy + headDY, glow);
  if (arc) arcTrail(buf, arc);
  paintSword(buf, sword[0], sword[1], sword[2], sword[3], swordOpts);
  if (star) impactStar(buf, star[0], star[1], starR);
  for (const d of dust) dustPuff(buf, d[0], d[1], d[2]);
  if (flashF) flash(buf, flashF);
}

// Fallen rig: body flat on the ground, sword dropped beside it.
function paintLying(buf, settle = 0) {
  paintMantle(buf, 2, 'hang');
  // torso flat
  part(buf, 17, 44, 15, 6, P.armorDark);
  rect(buf, 17, 44, 4, 6, P.armorDeep);
  rect(buf, 21, 45, 6, 4, P.armorMid);
  rect(buf, 28, 45, 4, 4, P.armorLight);
  dither(buf, 21, 47, 11, 3, P.armorMid, P.armorDark);
  hline(buf, 17, 31, 49, P.gold);
  vline(buf, 31, 44, 49, P.rim, 150);
  rect(buf, 27, 45, 3, 3, P.gold); // dim surviving buckle
  set(buf, 28, 46, P.goldLight);
  // head resting left, face up: splayed hair, dazed anime eyes
  part(buf, 6, 40, 13, 10, P.hair);
  set(buf, 5, 44, P.hair);
  set(buf, 6, 47, P.hair);
  part(buf, 9, 43, 7, 6, P.skin);
  dither(buf, 9, 47, 7, 2, P.skin, P.skinShade);
  rect(buf, 10, 44, 2, 2, P.white); // dazed half-lidded eyes
  rect(buf, 13, 44, 2, 2, P.white);
  rect(buf, 10, 45, 2, 1, P.pupil);
  rect(buf, 13, 45, 2, 1, P.pupil);
  hline(buf, 10, 11, 44, P.hair);
  hline(buf, 13, 14, 44, P.hair);
  // legs stretched right
  part(buf, 32, 45, 6, 5, P.armorMid);
  part(buf, 31, 43, 4, 3, P.steel); // knee
  part(buf, 38, 46, 8, 4, P.boot);
  rect(buf, 44, 46, 2, 4, P.steelBright);
  // dropped heavy sword flat on the ground
  paintSword(buf, 46, 50, 58, 48, {});
  // fading energy wisps rise less and less as it settles
  const wisps = settle > 0 ? 1 : 3;
  for (let i = 0; i < wisps; i++) {
    set(buf, 20 + i * 6, 41 - i, P.cyan, 150 - settle * 60 - i * 20);
    set(buf, 24 + i * 5, 39 - i * 2, P.cyanDim, 120 - settle * 40);
  }
  dustPuff(buf, 12, 50, true);
  dustPuff(buf, 40, 50, true);
  if (settle > 0) dustPuff(buf, 26, 50, false);
}

// --- animation frame tables -------------------------------------------------
const IDLE_N = 8;
const DASH_N = 6;
const ATTACK_N = 9;
const HIT_N = 5;
const DEAD_N = 7;

function idleFrame(i) {
  const buf = makeBuf();
  const udy = i >= 2 && i <= 4 ? -1 : 0; // inhale lift
  paintStanding(buf, {
    upperDY: udy,
    capePhase: i,
    glow: 0.6 + (i % 2) * 0.4,
    sword: [40, 37 + udy, 47 + (i % 2), 50],
    fist: [40, 37],
  });
  if (i === 5) {
    // blink: lids shut over both eyes
    for (const ex of [23, 31]) {
      rect(buf, ex, 17 + udy, 5, 6, P.skin);
      hline(buf, ex, ex + 4, 20 + udy, P.hair);
    }
  }
  return buf;
}

function dashFrame(i) {
  const buf = makeBuf();
  const alt = i % 2 === 0;
  paintStanding(buf, {
    legPose: alt ? 'runA' : 'runB',
    upperDX: 4,
    upperDY: alt ? 0 : -1,
    headDX: 2,
    headDY: 1, // ducked into the sprint
    fist: [37, 38],
    sword: [37, 38, 20, 32], // blade trails behind
    swordOpts: { trailFrom: [30, 35] },
    capePhase: i * 2,
    capeStyle: 'stream',
    glow: 1,
    lines: [
      [20, 0, 16 + (i % 3) * 2],
      [30, 0, 18 + ((i + 1) % 3) * 2],
      [40, 1, 17 + ((i + 2) % 3) * 2],
      [35, 4, 12 + (i % 2) * 3],
    ],
    dust: [[alt ? 22 : 32, 50, true], [alt ? 32 : 22, 50, false]],
  });
  return buf;
}

function attackFrame(i) {
  const buf = makeBuf();
  // grip/tip, lean, crouch, arc, star per beat of the swing
  const table = [
    { lean: -2, crouch: 3, tip: [44, 12], arc: null, star: null, edge: false }, // deep prepare
    { lean: -3, crouch: 2, tip: [40, 9], arc: null, star: null, edge: false }, // full pull-back
    { lean: 1, crouch: 0, tip: [57, 20], arc: [[44, 12], [51, 14], [57, 20]], star: null, edge: true },
    { lean: 3, crouch: 0, tip: [57, 31], arc: [[44, 12], [53, 17], [58, 24], [57, 31]], star: null, edge: true },
    { lean: 4, crouch: 1, tip: [55, 42], arc: [[53, 17], [59, 28], [57, 38]], star: [55, 40], edge: true }, // impact
    { lean: 2, crouch: 1, tip: [50, 46], arc: null, star: null, edge: false }, // follow-through
    { lean: 1, crouch: 1, tip: [46, 40], arc: null, star: null, edge: false },
    { lean: 0, crouch: 0, tip: [44, 32], arc: null, star: null, edge: false },
    { lean: 0, crouch: 0, tip: [47, 50], arc: null, star: null, edge: false }, // stance (clean idle hand-off)
  ];
  const t = table[i];
  const grip = [40 + t.lean, 37 + t.crouch];
  const stepFwd = i >= 3 && i <= 5 ? 3 : 0; // front foot plants forward mid-swing
  if (stepFwd) {
    // redraw front boot forward: cover default by painting stance legs first then boot over
  }
  const p = {
    upperDX: t.lean,
    upperDY: t.crouch,
    fist: grip,
    sword: [grip[0], grip[1], t.tip[0] + t.lean, t.tip[1]],
    swordOpts: { edgeGlow: t.edge },
    capePhase: i + 3,
    glow: 1,
    arc: t.arc,
    star: t.star,
    starR: 7,
    dust: i === 4 ? [[52, 50, true], [30, 50, false]] : i === 0 ? [[24, 50, false]] : [],
  };
  paintStanding(buf, p);
  if (stepFwd) {
    part(buf, 32, 49, 9, 3, P.boot);
    rect(buf, 39, 49, 2, 3, P.steelBright);
  }
  return buf;
}

function hitFrame(i) {
  const buf = makeBuf();
  const table = [
    { lean: -3, head: -1, flashF: 0.7, star: [28, 32], tip: [48, 12] },
    { lean: -5, head: -2, flashF: 0.35, star: [26, 32], tip: [50, 14] },
    { lean: -2, head: -1, flashF: 0, star: null, tip: [52, 24] },
    { lean: -1, head: 0, flashF: 0, star: null, tip: [54, 20] },
    { lean: 0, head: 0, flashF: 0, star: null, tip: [47, 50] }, // stance (clean idle hand-off)
  ];
  const t = table[i];
  paintStanding(buf, {
    upperDX: t.lean,
    headDX: t.head,
    headDY: i < 2 ? -1 : 0,
    glow: i < 2 ? 0.2 : 1, // eyes dim at impact, then flare back
    fist: [40 + t.lean, 36 + (i < 2 ? -2 : 0)],
    sword: [40 + t.lean, 36 + (i < 2 ? -2 : 0), t.tip[0] + t.lean, t.tip[1]],
    capePhase: 6 - i,
    star: t.star,
    starR: 5,
    dust: i === 0 ? [[24, 50, true]] : [],
    flashF: t.flashF,
  });
  return buf;
}

function deadFrame(i) {
  const buf = makeBuf();
  if (i === 0) {
    paintStanding(buf, {
      upperDX: -2,
      fist: [38, 35],
      sword: [38, 35, 48, 14],
      capePhase: 5,
      glow: 0.3,
      star: [28, 32],
      starR: 5,
      dust: [[24, 50, true]],
      flashF: 0.5,
    });
  } else if (i === 1) {
    paintStanding(buf, {
      upperDX: -5,
      headDX: -2,
      headDY: -1,
      glow: 0.2,
      fist: [35, 31],
      sword: [35, 31, 43, 9],
      capePhase: 4,
      dust: [[19, 50, true], [30, 50, false]],
    });
  } else if (i === 2) {
    paintStanding(buf, {
      legPose: 'kneel',
      upperDX: -4,
      upperDY: 6,
      headDX: -1,
      headDY: 5,
      glow: 0.2,
      fist: [34, 41],
      sword: [34, 41, 47, 27],
      capePhase: 3,
      dust: [[21, 50, true]],
    });
  } else if (i === 3) {
    paintStanding(buf, {
      legPose: 'kneel',
      upperDX: -7,
      upperDY: 10,
      headDX: -3,
      headDY: 10,
      glow: 0.1,
      fist: [31, 45],
      sword: [31, 45, 49, 35],
      capePhase: 2,
      dust: [[17, 50, true], [34, 50, true]],
    });
  } else if (i === 4) {
    // crumple: torso sunk, head bowed, sword slipping from the hand
    paintStanding(buf, {
      legPose: 'kneel',
      upperDX: -2,
      upperDY: 11,
      headDX: -2,
      headDY: 15,
      glow: 0.1,
      fist: [34, 48],
      sword: [34, 48, 54, 50],
      capePhase: 1,
      dust: [[16, 50, true], [38, 50, true]],
    });
  } else {
    paintLying(buf, i === 6 ? 1 : 0);
  }
  return buf;
}

// --- PNG writer (8-bit RGBA, no dependencies) --------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(b) {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const td = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ];
  return Buffer.concat(parts);
}

// --- compose strips ----------------------------------------------------------
function blitUpscaled(strip, buf, frameIndex) {
  const ox = frameIndex * CELL;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const si = (y * GRID + x) * 4;
      const a = buf[si + 3];
      if (a === 0) continue;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const di = ((y * SCALE + dy) * strip.width + (ox + x * SCALE + dx)) * 4;
          strip.data[di] = buf[si];
          strip.data[di + 1] = buf[si + 1];
          strip.data[di + 2] = buf[si + 2];
          strip.data[di + 3] = a;
        }
      }
    }
  }
}

function frameBBox(buf) {
  let x0 = GRID;
  let y0 = GRID;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (buf[(y * GRID + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

function main() {
  const outDir = path.join(__dirname, '..', 'public', 'sprites');
  fs.mkdirSync(outDir, { recursive: true });

  const sheets = [
    { name: 'idle', n: IDLE_N, fn: idleFrame },
    { name: 'dash', n: DASH_N, fn: dashFrame },
    { name: 'attack', n: ATTACK_N, fn: attackFrame },
    { name: 'hit', n: HIT_N, fn: hitFrame },
    { name: 'dead', n: DEAD_N, fn: deadFrame },
  ];

  // union bbox in final 128-cell coords
  let ux0 = CELL;
  let uy0 = CELL;
  let ux1 = -1;
  let uy1 = -1;

  for (const s of sheets) {
    const width = s.n * CELL;
    const strip = { width, data: Buffer.alloc(width * CELL * 4) };
    for (let f = 0; f < s.n; f++) {
      const buf = s.fn(f);
      const bb = frameBBox(buf);
      if (bb.x1 < 0) throw new Error(`${s.name} frame ${f} is empty`);
      const fx0 = bb.x0 * SCALE;
      const fy0 = bb.y0 * SCALE;
      const fx1 = bb.x1 * SCALE + (SCALE - 1);
      const fy1 = bb.y1 * SCALE + (SCALE - 1);
      if (fx0 < ux0) ux0 = fx0;
      if (fy0 < uy0) uy0 = fy0;
      if (fx1 > ux1) ux1 = fx1;
      if (fy1 > uy1) uy1 = fy1;
      blitUpscaled(strip, buf, f);
    }
    const png = encodePNG(width, CELL, strip.data);
    const file = path.join(outDir, `warrior-${s.name}.png`);
    fs.writeFileSync(file, png);
    console.log(`wrote ${file} ${width}x${CELL} (${png.length}B)`);
  }

  // pad + clamp to the cell (thin bottom pad so feet sit near the crop base)
  const PAD = 2;
  const PAD_BOTTOM = 1;
  ux0 = Math.max(0, ux0 - PAD);
  uy0 = Math.max(0, uy0 - PAD);
  ux1 = Math.min(CELL - 1, ux1 + PAD);
  uy1 = Math.min(CELL - 1, uy1 + PAD_BOTTOM);
  // Clamp the base to the soles: ground dust may dip lower, but the stance
  // must sit on the crop bottom so the anchor (y=1) plants feet on the ground.
  const feetBottom = FEET_Y * SCALE + 1;
  if (uy1 > feetBottom + 2) uy1 = feetBottom + 2;
  const uw = ux1 - ux0 + 1;
  const uh = uy1 - uy0 + 1;
  const stanceCX = CORE_X * SCALE + 0.5; // center of the 2px core column
  const anchorX = (stanceCX - ux0) / uw;
  const feetY = FEET_Y * SCALE + 1; // bottom sole row (final coords)
  const torsoY = 32 * SCALE + 1; // chest gem center row (final coords)
  console.log(`UNION x:${ux0} y:${uy0} w:${uw} h:${uh}`);
  console.log(`CROP = { x: ${ux0}, y: ${uy0}, w: ${uw}, h: ${uh} }`);
  console.log(`BODY_ANCHOR_X = ${anchorX.toFixed(4)}  (stance center ${stanceCX})`);
  console.log(`feet bottom=${feetY} (crop bottom=${uy1 + 1}); torso row=${torsoY}`);
  for (const sc of [3, 3.5, 4, 5]) {
    console.log(`scale ${sc}: on-screen ${Math.round(uw * sc)}x${Math.round(uh * sc)}, torso offset ${Math.round((feetY - torsoY) * sc)}`);
  }
}

main();
