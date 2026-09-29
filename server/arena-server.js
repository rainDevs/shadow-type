// Shadow Type Arena server (PVP, option B live).
// Run: npm run arena-server  (PORT default 8787)
// Protocol is JSON lines over WebSocket, see messages below.
// Authoritative for rooms, windows, HP. Damage re-derived server-side
// from reported wpm with sanity caps so clients can't invent numbers.

/* global process */
import http from 'node:http';
import { WebSocketServer } from 'ws';

// Render injects PORT; local dev can use ARENA_PORT. Binds 0.0.0.0.
const PORT = Number(process.env.PORT ?? process.env.ARENA_PORT ?? 8787);
const MAX_HP = 100;
const TURN_GRACE_MS = 2500;
const COUNTDOWN_MS = 3200;

const MODES = {
  short: { turnSeconds: 15 },
  medium: { turnSeconds: 30 },
  long: { turnSeconds: 60 },
};

const DAMAGE_MIN = 2;
const DAMAGE_MAX = 24;

function damageForWpm(wpm) {
  const w = Math.max(0, Math.min(250, Number(wpm) || 0));
  return Math.min(DAMAGE_MAX, Math.max(DAMAGE_MIN, Math.round(w / 3.5)));
}

function makeCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(426, { 'content-type': 'text/plain' });
  res.end('arena websocket only');
});

const wss = new WebSocketServer({ server });
server.listen(PORT, () => console.log(`[arena] listening on :${PORT}`));

// clientId -> { ws, name, heroId, modeId }
const clients = new Map();
// roomId -> room
const rooms = new Map();
// code -> roomId
const byCode = new Map();
// modeId -> [clientId] waiting
const queues = new Map();

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function roomPublic(room) {
  return {
    roomId: room.id,
    code: room.code,
    modeId: room.modeId,
    seed: room.seed,
    hp: [...room.hp],
    windowId: room.windowId,
  };
}

function closeRoom(room, reason) {
  for (const p of room.players) {
    const c = clients.get(p.clientId);
    if (c && c.ws.readyState === 1 && reason === 'peer-left') {
      send(c.ws, { t: 'peer-left', roomId: room.id });
    }
    if (c) c.roomId = null;
  }
  rooms.delete(room.id);
  if (room.code) byCode.delete(room.code);
  if (room.timers) {
    clearTimeout(room.timers.window);
    clearTimeout(room.timers.grace);
  }
}

function startWindow(room) {
  room.windowId += 1;
  const turnSeconds = MODES[room.modeId]?.turnSeconds ?? 30;
  room.turns[room.windowId] = {};
  const endsAt = Date.now() + turnSeconds * 1000;
  room.endsAt = endsAt;
  for (const p of room.players) {
    const c = clients.get(p.clientId);
    if (c) send(c.ws, { t: 'window', roomId: room.id, windowId: room.windowId, endsAt, turnSeconds });
  }
  clearTimeout(room.timers.window);
  clearTimeout(room.timers.grace);
  room.timers.window = setTimeout(() => {
    // grace period for turn reports to arrive
    room.timers.grace = setTimeout(() => resolveWindow(room), TURN_GRACE_MS);
  }, turnSeconds * 1000);
}

function resolveWindow(room) {
  if (room.over) return;
  const reports = room.turns[room.windowId] ?? {};
  const dmgs = [0, 0];
  const summary = [{}, {}];
  for (let i = 0; i < 2; i++) {
    const r = reports[i];
    if (!r) {
      dmgs[i] = 0;
      continue;
    }
    const total = Math.max(0, Math.min(2000, Number(r.total) || 0));
    const correct = Math.max(0, Math.min(total, Number(r.correct) || 0));
    const words = Math.max(0, Math.min(400, Number(r.words) || 0));
    const wpmRaw = Math.max(0, Math.min(250, Number(r.wpm) || 0));
    if (total === 0) {
      dmgs[i] = 0;
    } else {
      dmgs[i] = damageForWpm(wpmRaw);
    }
    summary[i] = { wpm: Math.round(wpmRaw), acc: total ? Math.round((correct / total) * 100) : 0, words, damage: dmgs[i] };
    room.score[i] += Math.max(0, Math.min(5000, Number(r.scoreGain) || 0));
  }
  room.hp[0] = Math.max(0, room.hp[0] - dmgs[1]);
  room.hp[1] = Math.max(0, room.hp[1] - dmgs[0]);
  for (const p of room.players) {
    const c = clients.get(p.clientId);
    if (c) {
      send(c.ws, {
        t: 'hp',
        roomId: room.id,
        windowId: room.windowId,
        hp: [...room.hp],
        dmg: [...dmgs],
        summary,
        score: [...room.score],
      });
    }
  }
  const [a, b] = room.hp;
  if (a <= 0 || b <= 0) {
    room.over = true;
    let winner = -1;
    if (a > 0 && b <= 0) winner = 0;
    else if (b > 0 && a <= 0) winner = 1;
    else if (a <= 0 && b <= 0) winner = a === b ? -1 : a > b ? 0 : 1;
    for (const p of room.players) {
      const c = clients.get(p.clientId);
      if (c) send(c.ws, { t: 'end', roomId: room.id, winner, hp: [...room.hp], score: [...room.score] });
    }
    // keep room briefly for rematch, then cleanup
    setTimeout(() => {
      if (rooms.has(room.id)) closeRoom(room);
    }, 30000);
    return;
  }
  // next window shortly
  setTimeout(() => {
    if (!room.over && rooms.has(room.id)) startWindow(room);
  }, 900);
}

function createRoom(hostClient, { modeId, code }) {
  const id = makeId('room');
  const room = {
    id,
    code: code ?? makeCode(),
    modeId: MODES[modeId] ? modeId : 'medium',
    seed: Math.floor(Math.random() * 2 ** 31),
    players: [{ clientId: hostClient.id, idx: 0 }],
    hp: [MAX_HP, MAX_HP],
    score: [0, 0],
    windowId: 0,
    turns: {},
    timers: {},
    over: false,
    createdAt: Date.now(),
  };
  // avoid code collision
  while (byCode.has(room.code)) room.code = makeCode();
  rooms.set(id, room);
  byCode.set(room.code, id);
  hostClient.roomId = id;
  return room;
}

function joinRoom(client, room) {
  if (room.players.length >= 2) return false;
  room.players.push({ clientId: client.id, idx: 1 });
  client.roomId = room.id;
  return true;
}

function beginMatch(room) {
  const [p0, p1] = room.players;
  const c0 = clients.get(p0.clientId);
  const c1 = clients.get(p1.clientId);
  const startsAt = Date.now() + COUNTDOWN_MS;
  for (const [idx, c] of [[0, c0], [1, c1]]) {
    if (!c) continue;
    const opp = idx === 0 ? c1 : c0;
    send(c.ws, {
      t: 'matched',
      roomId: room.id,
      code: room.code,
      seed: room.seed,
      modeId: room.modeId,
      startsAt,
      you: idx,
      opponent: opp ? { name: opp.name ?? 'RIVAL', heroId: opp.heroId ?? 'hero-2' } : null,
      hp: [...room.hp],
    });
  }
  setTimeout(() => {
    if (rooms.has(room.id) && !room.over) startWindow(room);
  }, COUNTDOWN_MS);
}

function dequeue(clientId) {
  for (const [, arr] of queues) {
    const i = arr.indexOf(clientId);
    if (i >= 0) arr.splice(i, 1);
  }
}

wss.on('connection', (ws) => {
  const id = makeId('c');
  const client = { id, ws, name: 'RIVAL', heroId: 'hero-1', modeId: 'medium', roomId: null };
  clients.set(id, client);
  send(ws, { t: 'welcome', clientId: id });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return send(ws, { t: 'error', message: 'bad-json' });
    }
    const t = msg.t;
    if (t === 'hello') {
      client.name = String(msg.name ?? 'RIVAL').slice(0, 12) || 'RIVAL';
      client.heroId = String(msg.heroId ?? 'hero-1');
      client.modeId = MODES[msg.modeId] ? msg.modeId : 'medium';
      return;
    }
    if (t === 'ping') return send(ws, { t: 'pong', at: msg.at ?? null, now: Date.now() });
    if (t === 'queue') {
      client.name = String(msg.name ?? client.name).slice(0, 12) || 'RIVAL';
      client.heroId = String(msg.heroId ?? client.heroId);
      const modeId = MODES[msg.modeId] ? msg.modeId : 'medium';
      client.modeId = modeId;
      dequeue(id);
      // leave old room if any
      if (client.roomId && rooms.has(client.roomId)) {
        const old = rooms.get(client.roomId);
        closeRoom(old, 'peer-left');
      }
      const q = queues.get(modeId) ?? [];
      const waitingId = q.find((cid) => cid !== id && clients.has(cid));
      if (waitingId) {
        queues.set(modeId, q.filter((cid) => cid !== waitingId && cid !== id));
        const host = clients.get(waitingId);
        const room = createRoom(host, { modeId });
        joinRoom(client, room);
        beginMatch(room);
      } else {
        q.push(id);
        queues.set(modeId, q);
        send(ws, { t: 'queued', modeId });
      }
      return;
    }
    if (t === 'leave-queue') {
      dequeue(id);
      return send(ws, { t: 'left-queue' });
    }
    if (t === 'create') {
      client.name = String(msg.name ?? client.name).slice(0, 12) || 'RIVAL';
      client.heroId = String(msg.heroId ?? client.heroId);
      const modeId = MODES[msg.modeId] ? msg.modeId : 'medium';
      dequeue(id);
      const room = createRoom(client, { modeId });
      return send(ws, { t: 'room-created', ...roomPublic(room) });
    }
    if (t === 'join') {
      client.name = String(msg.name ?? client.name).slice(0, 12) || 'RIVAL';
      client.heroId = String(msg.heroId ?? client.heroId);
      const code = String(msg.code ?? '').toUpperCase().trim();
      const roomId = byCode.get(code);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room) return send(ws, { t: 'error', message: 'room-not-found' });
      if (room.players.length >= 2) return send(ws, { t: 'error', message: 'room-full' });
      if (room.over) return send(ws, { t: 'error', message: 'room-closed' });
      dequeue(id);
      joinRoom(client, room);
      beginMatch(room);
      return;
    }
    if (t === 'forfeit') {
      const room = rooms.get(msg.roomId);
      if (!room || room.over) return;
      const idx = room.players.findIndex((p) => p.clientId === id);
      if (idx < 0) return;
      // Leaver takes the defeat, rival takes the win (sent as a normal
      // `end` so the opponent gets the Victory screen, not peer-left).
      room.over = true;
      const winner = 1 - idx;
      for (const p of room.players) {
        const c = clients.get(p.clientId);
        if (c) send(c.ws, { t: 'end', roomId: room.id, winner, hp: [...room.hp], score: [...room.score], byForfeit: true });
      }
      setTimeout(() => {
        if (rooms.has(room.id)) closeRoom(room);
      }, 30000);
      return;
    }
    if (t === 'turn') {
      const room = rooms.get(msg.roomId);
      if (!room || room.over) return;
      const idx = room.players.findIndex((p) => p.clientId === id);
      if (idx < 0) return;
      if (msg.windowId !== room.windowId) return;
      const bucket = room.turns[room.windowId] ?? {};
      if (bucket[idx]) return; // first report wins
      bucket[idx] = {
        correct: msg.correct,
        total: msg.total,
        wpm: msg.wpm,
        words: msg.words,
        scoreGain: msg.scoreGain,
      };
      room.turns[room.windowId] = bucket;
      // early resolve when both reported
      if (bucket[0] && bucket[1]) {
        clearTimeout(room.timers.window);
        clearTimeout(room.timers.grace);
        resolveWindow(room);
      }
      return;
    }
  });

  ws.on('close', () => {
    dequeue(id);
    const roomId = client.roomId;
    clients.delete(id);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // if waiting for second player, just close; if mid-match, notify peer
      if (room.players.length < 2 || room.over) {
        closeRoom(room);
      } else {
        room.over = true;
        closeRoom(room, 'peer-left');
      }
    }
  });
});
