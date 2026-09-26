# SHADOW TYPE — Type. Strike. Survive.

A browser-based arcade typing fighting game. You duel a computer-controlled
fighter by typing: every timed turn, your typing skill becomes combat damage.

Built with React + Vite + PixiJS. No backend — high scores and settings persist
in LocalStorage.

## Play

```bash
npm install
npm run dev
```

Pick your hero, pick a time mode (**15 SECS / 30 SECS / 60 SECS**), pick a
difficulty (**EASY / MEDIUM / HARD**), then type the flowing word river
Monkeytype-style and empty the enemy's 100 HP before it empties yours.
`ESC` pauses.

Your CPU opponent is a random hero from the two you didn't pick.

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
damage = round(Adjusted WPM / 4), clamped to 1–20
```

Because the WPM is already accuracy-adjusted, accuracy counts exactly once —
there is no second multiplier that would square the penalty. Examples:

| Turn | Adjusted WPM | Damage |
| ---- | ------------ | ------ |
| Idle | 0            | 1      |
| Novice (~20) | 20  | 5      |
| Decent (~43) | 43  | 11     |
| Strong (~55) | 55  | 14     |
| Elite (80+)  | 80+ | 20 (cap) |

Rate-based (not window-length-based), so longer modes grant no free damage:
every WPM point counts on every mode.

**CPU damage** is a fixed range per difficulty (Easy 5–10, Medium 10–15,
Hard 15–20), rolled per strike — the only randomness in combat.

**Score** — 10 points per correct character as words complete, plus a window
bonus from accuracy, words finished and damage dealt
(`src/utils/scoreCalculator.js`).

## Tech

- **PixiJS** owns the arena: CraftPix hero sprite fighters (idle, run,
  two run-attacks gated on damage ≥ 10, hurt, death, looped victory),
  procedural pixel backdrop, sword-slash arcs, particles, screen shake,
  damage numbers, celebration sparkles.
- **React** owns everything else: hero/mode/difficulty select, countdown and
  end banners, HUD, typing engine, game state, pause, results, settings,
  high scores.
- The bridge is one small API (`src/game/PixiGame.js`): `playerAttack()`,
  `cpuAttack()`, `victory()`, `defeat()`, `reset()`, `setPaused()`,
  `destroy()`. Game logic never lives in Pixi code.
- Sound is 100% synthesized Web Audio — countdown ticks, keystrokes,
  attacks, hits, jingles and generative battle music, zero audio files
  (`src/utils/audioManager.js`).

## Project layout

```text
src/
  components/   menus, selectors, HUD, typing panel, pause, results
  game/         PixiGame, Fighter (sprites), Background, particles
  data/         heroes, modes, difficulty, word pools
  hooks/        useTypingGame (combat state machine), useLocalStorage
  utils/        damage/score/WPM math, audio, storage, random
public/
  sprites/      hero sprite strips served to the arena + menus
```

## Credits

- Hero sprites: tiny pixel heroes (CraftPix free pack, see
  `tiny-pixel-hero-sprites-with-melee-attacks/license.txt`)
- Arena backdrop: procedural pixel art (no third-party assets)
