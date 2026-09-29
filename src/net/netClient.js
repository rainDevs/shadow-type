// Minimal browser WebSocket client for Arena PVP.
// Resolves to a connected socket or throws; caller handles mock fallback.

export function arenaUrl() {
  const fromEnv = import.meta?.env?.VITE_ARENA_URL;
  if (fromEnv) return fromEnv;
  if (typeof location !== 'undefined' && location.hostname) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.hostname}:8787`;
  }
  return 'ws://localhost:8787';
}

export function connectArena({ timeoutMs = 4000 } = {}) {
  const url = arenaUrl();
  return new Promise((resolve, reject) => {
    let done = false;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(e);
      return;
    }
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(new Error('arena-timeout'));
      }
    }, timeoutMs);
    ws.addEventListener(
      'open',
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(ws);
      },
      { once: true },
    );
    ws.addEventListener(
      'error',
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(new Error('arena-unreachable'));
      },
      { once: true },
    );
  });
}

export function sendJson(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
