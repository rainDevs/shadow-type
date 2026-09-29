// Deterministic passage for PVP: both clients derive identical text
// from (seed, windowId) so no passage payload is needed on the wire.
// Must stay in sync with server/arena-server.js expectations (seed only).

import { WORD_BANK } from '../data/words.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPassage(seed, windowId, count = 100) {
  const rand = mulberry32((Number(seed) || 0) + Number(windowId || 0) * 2654435761);
  const pool = WORD_BANK.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  const used = new Set();
  for (const w of pool) {
    if (out.length >= count) break;
    if (out.length > 0 && out[out.length - 1] === w) continue;
    if (used.has(w) && out.length < count) {
      // allow reuse only after exhausting uniques (bank is 1000+, count 100)
      continue;
    }
    used.add(w);
    out.push(w);
  }
  while (out.length < count) out.push(pool[Math.floor(rand() * pool.length)]);
  return out.join(' ');
}

export function arenaServerUrl() {
  const fromEnv = import.meta?.env?.VITE_ARENA_URL;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.hostname}:8787`;
}
