# Deploying Shadow Type

Two moving parts, two hosts:

| Part | Host | What it runs |
| ---- | ---- | ------------ |
| Game frontend (Vite static) | Vercel | Menus, Training vs CPU, Arena PVP client |
| Arena WS backend (Node) | Render | `server/arena-server.js` — rooms, matchmaking, HP authority |

Vercel **cannot** host the backend (no persistent WebSocket servers on
serverless). Render **can**. Keep them separate.

Live instances:

- Frontend: `https://shadow-type-arena.vercel.app/`
- Backend: `wss://shadow-type-arena.onrender.com`

## 0. Prerequisites

- Code on GitHub: `rainDevs/shadow-type`, branch `main`, up to date
  (`git status` clean, `git log origin/main` matches local).
- A Vercel account with the GitHub integration installed.
- A Render account with the GitHub integration installed.

## 1. Backend first — Render

1. Go to **dashboard.render.com → New + → Web Service** (or **New →
   Blueprint** — `render.yaml` in the repo pre-fills everything below).
2. Connect the `rainDevs/shadow-type` repository.
3. Settings:
   - **Name:** `shadow-type-arena`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/arena-server.js`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/healthz`
4. Click **Create Web Service** and wait for status **Live**.
5. Verify: open `https://<your-service>.onrender.com/healthz` in a
   browser — expect plain text `ok`.
6. Your WebSocket URL is `wss://<your-service>.onrender.com`
   (note `wss`, no port).

> Free-tier sleep: Render spins the service down after ~15 min idle.
> The first Arena tap after sleep takes ~30–60s while it wakes; the
> game shows **Waiting for Opponent...** and retries automatically.

## 2. Frontend — Vercel

1. Go to **vercel.com → Add New → Project → Import**
   `rainDevs/shadow-type`.
   - Framework Preset: **Vite** (auto-detected; `vercel.json` pins
     Build `npm run build`, Output `dist/`).
   - Root Directory: `./` (repo root).
2. **Environment Variables** — add before the first deploy if you run
   your own backend:
   - `VITE_ARENA_URL` = `wss://<your-service>.onrender.com`
   - (Skip it and the game defaults to the live backend above;
     `localhost` dev builds still target `ws://<host>:8787`.)
3. Click **Deploy**. Vite `VITE_*` vars bake in at **build time**, so
   any later env change needs **Deployments → Redeploy**.
4. Verify production: hard-refresh and confirm the menu shows
   **Arena (PVP)** + **Training (vs CPU)** — the old **Start Fight**
   button is gone. Play a Training bout, then an Arena bout on two
   browsers.

## 3. Local development (mirrors production)

```bash
# terminal 1 — backend
npm run arena-server            # :8787 (PORT / ARENA_PORT overrides)

# terminal 2 — frontend
npm run dev                     # http://localhost:5173
```

To point local frontend at the live backend instead:

```bash
VITE_ARENA_URL=wss://shadow-type-arena.onrender.com npm run dev
```

## 4. Troubleshooting

| Symptom | Cause → Fix |
| ------- | ----------- |
| Vercel site shows old menu / "Initial commit" content | Project is connected to the wrong repo. **Project → Settings → Git → Connected Git Repository** must be `rainDevs/shadow-type`, branch `main`. Reconnect or re-import, then redeploy. Confirm the deployment's commit hash matches `git log origin/main`. |
| Vercel shows the new menu but Arena never pairs | Backend asleep or `VITE_ARENA_URL` wrong. Check `/healthz` on Render; check the value in **Vercel → Settings → Environment Variables**, then **Redeploy** (env needs a rebuild). |
| Arena stuck on "Waiting for Opponent..." | Normal while Render wakes (~60s) or when no second player is queuing. Open a second browser to pair. Same-mode queues only pair together. |
| `room-not-found` / `room-full` | Wrong/expired 4-letter code, or the room already has 2 players. Create a fresh room. |
| Mixed-content / WS errors in console | Page is `https:` but WS URL is `ws:` — must be `wss:`. |
| Build fails on Vercel, works locally | Open the deployment's **Build Logs**; usually a missing env var or a Node version difference. Repo builds clean with `npm run lint` + `npm run build`. |
