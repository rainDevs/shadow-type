# SHADOW TYPE — Type. Strike. Survive.

A browser-based arcade typing fighting game. You duel a computer-controlled
fighter by typing: every timed turn, your typing skill becomes combat damage.

Built with React + Vite + PixiJS. Training (vs CPU) is fully client-side —
high scores and settings persist in LocalStorage. Arena PVP needs the
bundled WebSocket server (`server/arena-server.js`).

## Play

```bash
npm install
npm run dev
```

Training: pick a time mode (**BLITZ / RAPID / MARATHON**), pick a
difficulty (**EASY / MEDIUM / HARD**), pick your fighter, then type the
flowing word river Monkeytype-style and empty the enemy's 100 HP before
it empties yours. `ESC` pauses.

Your CPU opponent is a random hero from the two you didn't pick.

## Arena (PVP)

Live backend: `wss://shadow-type-arena.onrender.com` (free tier — wakes
~30–60s on first use; the arena shows **Waiting for Opponent...** until
the server answers and pairs you).

```bash
npm run arena-server        # :8787 locally (PORT / ARENA_PORT to override)
# optional: VITE_ARENA_URL=ws://host:8787 npm run dev
```

Deploy your own: Render → Web Service (or Blueprint via `render.yaml`),
Build `npm install`, Start `node server/arena-server.js`, Health Check
`/healthz` — then set `VITE_ARENA_URL=wss://<your-service>.onrender.com`
in Vercel and redeploy.

Main menu → **Arena (PVP)** → name + mode → Find Match / Create / Join
by 4-letter code → pick fighter → simultaneous typing windows on an
identical seeded passage. Damage uses the same WPM formula, resolved
server-side. Until a rival joins, the arena shows **Waiting for
Opponent...** and keeps retrying. `ESC` forfeits and leaves.

## How a fight works

1. **Countdown** — `3 · 2 · 1 · Type!` over the arena. The opening passage is
   already visible so you can get ready; input unlocks on `Type!`.
2. **Your turn** — a continuous passage streams for the whole window
   (15 / 30 / 60 seconds depending on mode). Finish a word and the next
   words keep flowing; the text extends itself.
3. **Time expires** — the panel locks, a short beat plays, then your fighter
   closes in, touches the enemy, and strikes with damage from that turn's
   stats. Heavy hits (10+) use the big slash, light hits the quick slash.
4. **Enemy turn** — after a short telegraph the CPU dashes in and strikes
   back for difficulty-scaled damage.
5. Repeat until someone hits **0 HP**: the loser plays its death animation
   under a **Victory! / Defeat!** banner while the winner loops its triumph
   animation with sparkles — **click anywhere to continue** to results,
   high-score entry, rematch or menu.

Mistakes never block you: wrong keys burn red, cost accuracy, and reset
nothing but your momentum — Backspace fixes cost time (lower WPM) but restore
accuracy.

## Damage logic

Damage is deterministic: same typing, same damage. No crits.

**Step 1 — measure the turn** (`src/hooks/useTypingGame.js`)

- `typedChars` — characters typed in the window
- `correctChars` — characters matching the target text
- `accuracy = correctChars / typedChars × 100` (0 when nothing typed)

**Step 2 — adjusted WPM** (`src/utils/typingMetrics.js`)

```text
Gross WPM    = (typedChars / 5) / (turnSeconds / 60)
Adjusted WPM = Gross WPM × (accuracy / 100)
```

This is the modern leaderboard formula: accuracy scales WPM down by your
exact hit rate. A 60 gross WPM at 80% accuracy counts as 48.

**Step 3 — damage** (`src/utils/damageCalculator.js`)

```text
damage = round(Adjusted WPM / 3.5), clamped to 2–24
```

Because the WPM is already accuracy-adjusted, accuracy counts exactly once —
there is no second multiplier that would square the penalty. Bands follow the
standard skill benchmarks:

| Tier | Adjusted WPM | Damage |
| ---- | ------------ | ------ |
| Learning | < 20      | 2–5    |
| Beginner | 20–35     | 6–10   |
| Average | 35–50      | 10–14  |
| Productive | 50–70   | 14–20  |
| High Speed | 70–90   | 20–24  |
| Competitive | 90+     | 24 (cap) |

Rate-based (not window-length-based), so longer modes grant no free damage:
every WPM point counts on every mode.

**CPU damage** is a fixed range per difficulty (Easy 6–12, Medium 13–18,
Hard 19–24), rolled per strike — the only randomness in combat.

**Score** — 10 points per correct character as words complete, plus a window
bonus from accuracy, words finished and damage dealt
(`src/utils/scoreCalculator.js`).

## Tech

- **PixiJS** owns the arena: CraftPix hero sprite fighters (idle, run,
  two run-attacks gated on damage ≥ 10, hurt, death, looped victory),
  procedural pixel backdrop, sword-slash arcs, particles, screen shake,
  damage numbers, celebration sparkles.
- **React** owns everything else: training hero/mode/difficulty select,
  arena lobby + PVP battle, countdown and end banners, HUD, typing engine,
  game state, pause, results, settings, high scores.
- The bridge is one small API (`src/game/PixiGame.js`): `playerAttack()`,
  `cpuAttack()` (+ PVP aliases `leftAttack()`/`rightAttack()`/`win(side)`),
  `victory()`, `defeat()`, `reset()`, `setPaused()`, `destroy()`.
  Game logic never lives in Pixi code.
- Sound is 100% synthesized Web Audio — countdown ticks, keystrokes,
  attacks, hits, jingles and generative battle music, zero audio files
  (`src/utils/audioManager.js`).

## Project layout

```text
src/
  components/   menus, selectors, arena lobby/PVP battle, HUD, typing panel, pause, results
  game/         PixiGame, Fighter (sprites), Background, particles
  data/         heroes, modes, difficulty, word bank
  hooks/        useTypingGame (training state machine), useLocalStorage
  net/          Arena WS client, simultaneous-window hook, seeded passages
  utils/        damage/score/WPM math, audio, storage, random
server/
  arena-server.js   authoritative PVP rooms (queue / create / join)
public/
  sprites/      hero sprite strips served to the arena + menus
```

## Credits

- Hero sprites: tiny pixel heroes (CraftPix free pack, see
  `tiny-pixel-hero-sprites-with-melee-attacks/license.txt`)
- Arena backdrop: procedural pixel art (no third-party assets)
