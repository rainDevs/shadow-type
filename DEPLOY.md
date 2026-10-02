# Deploying Shadow Type (Student Guide)

This guide takes the game from your laptop to the real internet. No
experience needed — just follow the steps in order and check the little
✅ after each one.

## What are we deploying, and where?

The game has **two parts** that live on **two free websites**:

1. **The game itself** (buttons, fighters, typing) → goes on **Vercel**.
   Think of Vercel as a shelf that shows your game to the world.
2. **The Arena server** (the referee that connects two players) →
   goes on **Render**. The game needs a referee that stays awake and
   remembers both players, and Vercel can't do that job — Render can.

Our live addresses (yours will look the same once you finish):

- Game: `https://shadowtype.fun/` (custom domain on Hostinger DNS; the
  `*.vercel.app` URL still works as a fallback)
- Server: `wss://shadow-type.onrender.com`

## Before you start (accounts + code)

1. Make sure your code is saved and uploaded to GitHub:
   - Open a terminal in the project folder.
   - Run `git status` — it should say "nothing to commit, working
     tree clean". If not, run `git add -A`, then
     `git commit -m "describe your change"`, then `git push`.
   - ✅ The GitHub page for `rainDevs/shadow-type`, branch `main`,
     shows your newest commit.
2. Create a free account on **vercel.com** and connect your GitHub
   when it asks (click "Authorize" — this lets Vercel read your code).
3. Create a free account on **dashboard.render.com** and connect
   your GitHub the same way.

## Part 1 — Put the server (referee) on Render (do this first)

1. Go to **dashboard.render.com** and click **New + → Web Service**.
   (Shortcut: **New → Blueprint** — the file `render.yaml` in the
   project fills in the settings below for you.)
2. Pick the `rainDevs/shadow-type` repository and click Connect.
3. Fill in the settings exactly like this:
   - **Name:** `shadow-type`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/arena-server.js`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/healthz`
4. Click **Create Web Service**. Now wait a few minutes — you will see
   building messages, then status **Live** in green.
   - ✅ It says **Live**.
5. Test it: open `https://shadow-type.onrender.com/healthz` in your
   browser (use your own service name if different). You should see
   the plain word `ok`. That's the server saying "I'm awake!".
   - ✅ You see `ok`.
6. Write down your server address: `wss://shadow-type.onrender.com`.
   (It starts with `wss` — the secure version of `ws`, like `https`
   is to `http`. No port number at the end.)

> A free Render server falls asleep after ~15 minutes with no players
> (this saves money). The first person to open the Arena wakes it up,
> which takes about 30–60 seconds. During that time the game shows
> **Waiting for Opponent...** and tries again by itself — just wait.

## Part 2 — Put the game on Vercel

1. Go to **vercel.com** and click **Add New → Project → Import**,
   then choose `rainDevs/shadow-type`.
2. Check these three things (Vercel usually guesses right):
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (the top of the project)
   - **Project Name:** `shadow-type` (same as the GitHub repo, so
     nothing gets confusing later)
3. Environment variable (tells the game where its server lives):
   - If your server address is exactly `wss://shadow-type.onrender.com`,
     **skip this step** — the game already uses it by default.
   - If your server has a different address, open
     **Environment Variables** and add `VITE_ARENA_URL` with your
     `wss://...` address.
4. Click **Deploy** and wait for the confetti (status **Ready**).
5. Open the link and hard-refresh (`Ctrl+Shift+R` on Windows) so your
   browser doesn't show an old saved copy. The main menu should show
   **Arena (PVP)** and **Training (vs CPU)**.
   - ✅ You see both buttons. Play one Training fight against the
     computer to prove the game works.
   - ✅ The custom domain is `https://shadowtype.fun/`
     (apex + `www` both point at Vercel; see "Custom domain" below).

### Custom domain (Hostinger DNS → Vercel)

Our domain `shadowtype.fun` stays registered at Hostinger; only the
traffic moves to Vercel:

1. **Vercel → project → Settings → Domains**: add `shadowtype.fun`,
   then add `www.shadowtype.fun`. Copy the exact records Vercel shows
   (usually `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com`).
2. **Hostinger hPanel → Domains → DNS Zone Editor** (keep Hostinger
   nameservers): delete the default parking `A` record(s) for `@`,
   then add Vercel's records. There must be exactly one `@` A record.
3. Wait for propagation; both URLs must show **Valid Configuration**
   in Vercel. Set the apex as primary so `www` redirects to it.

Gotcha we hit: the apex showed Hostinger's parking page while `www`
worked — a leftover parking `A` record on `@`. Delete it and wait.

## Part 3 — Play a real online match (the fun test)

1. Wake the server first: open `.../healthz` and make sure you see `ok`.
2. Open the game link on **two** browsers (or your phone + laptop).
3. On both, tap **Arena (PVP)** → type a name → pick the same mode →
   **Find Match** → pick a fighter.
4. Both screens should start the same fight at the same time.
   - ✅ Typing on one screen hurts the other fighter. You did it —
     real internet multiplayer!

## Running it on your own laptop (practice / coding)

You don't need the internet to code. Open **two** terminals:

```bash
# terminal 1 — the referee (server)
npm run arena-server
# terminal 2 — the game (frontend)
npm run dev
```

Then open `http://localhost:5173` in your browser. To test against
the live server instead of your own, run:

```bash
VITE_ARENA_URL=wss://shadow-type.onrender.com npm run dev
```

## If something goes wrong

Read the row that matches what you see:

| What you see | What it means, in plain words → what to do |
| ------------ | ------------------------------------------ |
| The site shows an old menu, or a page saying "Initial commit" | Vercel is showing a *different* project. Go to **Project → Settings → Git** and check **Connected Git Repository** is `rainDevs/shadow-type`, branch `main`. If not, reconnect it (or import the repo as a new project) and redeploy. Compare the deployment's commit code with `git log` on your laptop — they must match. |
| New menu works, but Arena never finds a match | The server is asleep or the game looks in the wrong place. First open `/healthz` — if it loads slowly then says `ok`, just wait a minute and try again. If the address differs, check `VITE_ARENA_URL` in **Vercel → Settings → Environment Variables**, then **Deployments → Redeploy** (changing settings alone does nothing until you redeploy, because the address is baked in during the build). |
| Stuck on "Waiting for Opponent..." | Either the server is still waking up (~60s), or nobody else is queuing. Open the game in a second browser and queue the **same mode** — modes only pair with themselves. |
| `room-not-found` or `room-full` | The 4-letter room code is wrong, expired, or already has 2 players. Go back and **Create Room** again for a fresh code. |
| Errors in the browser console about `ws:` / mixed content | The page is secure (`https:`) so the server address must be secure too (`wss:`). Change `ws://` to `wss://`. |
| Vercel build fails but it works on your laptop | Open that deployment's **Build Logs** and read the red lines — it's usually a missing setting, not broken code. On your laptop, `npm run lint` and `npm run build` should both finish cleanly before you push. |
