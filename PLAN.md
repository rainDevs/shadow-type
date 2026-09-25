# Shadow Fighting Typing Master

Build a complete browser-based typing game called **“Shadow Type”**.

## 1. Game Concept

**Shadow Type** is a typing-master game combined with a 2D shadow fighting game.

The player controls a **shadow fighter** on the left side of the arena, while a **computer-controlled shadow fighter** stands on the right.

Both fighters start with:

- Player Health: **100%**
- Computer Health: **100%**

The player attacks the computer by correctly typing the words/sentences displayed on screen.

### Core Gameplay Loop

1. A timed turn begins and words stream endlessly.
2. The player types as many words as possible before time expires.
3. The game evaluates:
   - Correct characters
   - Incorrect characters
   - Typing speed
   - Accuracy
   - Words completed
   - Score
4. The player's turn performance determines the strike damage.
5. The computer answers with a quick strike after a short telegraph.
6. Both health bars decrease as attacks land.
7. The fight continues until one fighter reaches **0% HP**.
8. Display a dramatic **Victory** or **Defeat** screen.
9. Allow the player to restart immediately.

The game should feel like a **fast-paced arcade typing battle**, not a traditional typing-test website.

---

# 2. Technology Stack

Use:

- **React**
- **Vite**
- **JavaScript**
- **PixiJS**
- HTML5
- CSS
- Browser LocalStorage

Recommended:

```text
React + Vite
PixiJS
JavaScript
CSS
LocalStorage
```

Do NOT use a large game engine.

PixiJS should be responsible for:

- Game arena
- Characters
- Animations
- Attack effects
- Hit effects
- Background
- Particles
- Health bars if appropriate
- Screen shake
- Combat effects

React should be responsible for:

- Main menu
- Game configuration
- Typing input
- Score information
- Game state
- Pause menu
- Results screen
- Settings
- High scores

Keep React and PixiJS properly separated.

---

# 3. Visual Direction

Use a **dark cyberpunk/shadow-fighting aesthetic**.

The visual style should feel like:

- Shadow warriors
- Dark arena
- Neon accents
- Atmospheric lighting
- Smoke
- Energy effects
- Fast combat
- Arcade fighting game

Avoid making it look like a generic typing website.

### Color Direction

Primary background:

- Near-black
- Dark charcoal
- Deep purple/blue

Player:

- Cool blue/cyan energy

Computer:

- Red/orange energy

Text:

- White/light gray

Important UI:

- Neon-style highlights

Use restrained glow effects rather than excessive gradients.

---

# 4. Main Menu

Create a polished main menu.

Title:

# SHADOW TYPE

Subtitle:

**“Type. Strike. Survive.”**

Menu buttons:

- Start Fight
- How to Play
- Settings
- High Scores

Optional:

- Practice Mode

The main menu should have subtle animated background effects.

For example:

- Floating particles
- Moving shadows
- Atmospheric fog
- Slowly moving light
- Silhouettes of the fighters

---

# 5. Main Battle Screen

The battle screen is the primary gameplay interface.

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│ PLAYER                         ROUND              CPU       │
│ ████████████████ 100%                           100% █████ │
│                                                            │
│                                                            │
│        PLAYER SHADOW              CPU SHADOW               │
│             ⚔                         ⚔                   │
│                                                            │
│                                                            │
│                 COMBAT ARENA                               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    TYPE THIS:                              │
│                                                            │
│              The shadows never sleep                      │
│                                                            │
│                    [typing input]                          │
│                                                            │
│       WPM: 72       ACCURACY: 96%       WORDS: 12          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

The exact layout can be improved aesthetically.

---

# 6. Fighters

Create two stylized shadow fighters.

## Player Fighter

Position:

- Left side

Visual:

- Dark humanoid silhouette
- Cyan/blue energy
- Glowing eyes
- Subtle idle animation

## Computer Fighter

Position:

- Right side

Visual:

- Dark humanoid silhouette
- Red/orange energy
- Glowing eyes
- Subtle idle animation

Do not require external character assets initially.

Create the characters using PixiJS primitives, shapes, sprites, particles, or simple generated SVG/texture assets.

The architecture should make it easy to replace them with sprite sheets later.

---

# 7. Fighter Animation States

Each fighter should support:

```text
idle
attack
hit
hurt
victory
defeat
```

### Idle

Small breathing/hovering animation.

### Player Attack

When the player completes a typing challenge:

1. Player fighter charges energy.
2. Player lunges/attacks.
3. Projectile/slash travels toward CPU.
4. CPU is hit.
5. Damage number appears.
6. CPU health decreases.
7. Screen briefly shakes.
8. Return to idle.

### CPU Attack

When the computer attacks:

1. CPU charges.
2. CPU attacks.
3. Player receives hit effect.
4. Damage number appears.
5. Player health decreases.
6. Screen shake.
7. Return to idle.

### Hit

Use:

- Flash
- Knockback
- Particle burst
- Energy explosion
- Small screen shake

---

# 8. Typing System

Typing is the primary combat mechanic. Combat runs in **timed turns**
(Monkeytype-style): Easy turns last 15 seconds, Normal 30 seconds, Hard 60
seconds. During a player turn, an endless stream of words appears — finishing
one word instantly serves the next. When time expires, the fighter strikes and
damage is computed from the turn's WPM and accuracy.

Display a continuous flowing passage of words from the difficulty pool
(Monkeytype-style). The passage extends itself so the player never runs out
of text mid-turn.

Examples (pool words):

```text
shadow
warrior
thunder
precision
midnight
```

## Difficulty

### Easy

Short words, 15-second turns.

```text
ash fog hit run dark fight
```

### Normal

Medium words, 30-second turns.

```text
shadow warrior thunder silence
```

### Hard

Long, tricky words, 60-second turns.

```text
darkness precision lightning battlefield
```

---

# 9. Typing Input Behavior

The typing input should feel responsive and game-like.

Display a continuous flowing passage. A block caret marks the current
position; typing advances it on every key (correct or not), Backspace pulls
it back.

As the user types:

- Correct characters become highlighted.
- Incorrect characters are visibly marked.
- The caret shows the current position.
- Remaining text is muted.
- Completed words bank score (10 per correct character).

Recommended behavior:

```text
Correct → character turns cyan/green
Incorrect → character turns red
Current → block caret
Remaining → muted
```

When the turn timer expires:

```text
ATTACK!
```

The player's fighter strikes with damage from the turn's adjusted WPM.
Mistakes never block typing — they lower accuracy and therefore damage.
Backspacing to fix errors costs time (lower WPM) but restores accuracy.

---

# 10. Typing Metrics

Track:

### WPM

Adjusted WPM, leaderboard-style:

```text
Gross WPM = (characters typed / 5) / elapsed minutes
Adjusted WPM = Gross WPM × (Accuracy % / 100)
```

### Accuracy

```text
accuracy =
correct characters /
total characters typed
× 100
```

### Words Completed

Count every finished word in the turn. Words are the score tally and feed the
window damage scaling.

Incorrect typing lowers accuracy and therefore weakens the coming strike.
Speed alone does not dominate accuracy.

---

# 11. Damage System

Damage scales 1–20 from the turn's accuracy-adjusted WPM (a rate, so window
length grants no free damage):

```text
damage =
round(adjusted WPM / 4)
```

clamped to minimum 1, maximum 20. There are no critical hits and no
randomness — only typing skill. Every WPM point counts on every mode.

A player typing:

```text
70 WPM
98% accuracy
```

over a full window should deal significantly more damage than:

```text
25 WPM
75% accuracy
```

Display the calculated damage after each successful attack.

Example:

```text
+274  -11 DMG
```

---

# 12. (Removed — no critical hits)

Damage comes only from adjusted WPM. There is no crit system.

---

# 13. Computer AI

The computer should not simply attack randomly.

Create a simple difficulty-based AI.

The computer answers each player turn with a quick strike after a short
telegraph (no full mirrored window — no dead air).

## Easy

```text
telegraph: ~2.5 seconds
damage: 6–10
```

## Normal

```text
telegraph: ~2.5 seconds
damage: 10–16
```

## Hard

```text
telegraph: ~2 seconds
damage: 14–22
```

The AI should create pressure without making the game impossible.

The CPU attack should be visually synchronized with the attack timer.

---

# 14. Combat Timing

Avoid situations where both fighters continuously attack simultaneously.

Use a simple turn state machine:

```text
PLAYER_TURN (timed typing window)
→ PLAYER_ATTACK
→ CPU_TURN (short telegraph)
→ CPU_ATTACK
→ PLAYER_TURN
```

Pause freezes the active turn timer and resumes it exactly.

---

# 15. Health System

Both fighters start at:

```text
100 HP
```

Health bars should update smoothly.

Example:

```text
PLAYER
████████████████████ 100%

CPU
████████████████████ 100%
```

When damaged:

```text
PLAYER
████████████░░░░░░░░ 62%
```

Animate health reduction instead of instantly changing the bar.

Display percentage.

---

# 16. Round System

For the initial version, use:

```text
ONE FIGHT
```

A match ends when:

```text
playerHP <= 0
```

or

```text
cpuHP <= 0
```

Future architecture should support:

```text
Best of 3
Best of 5
Tournament
```

---

# 17. Victory

When CPU reaches 0 HP:

Freeze combat.

Play:

- CPU defeat animation
- Player victory animation
- Slow particles
- Screen effect

Display:

```text
VICTORY

SHADOW DEFEATED

WPM       78
ACCURACY  97%
TURNS     6
DAMAGE    146

[ REMATCH ]
[ MAIN MENU ]
```

---

# 18. Defeat

When player reaches 0 HP:

Display:

```text
DEFEAT

THE SHADOW HAS FALLEN

WPM       64
ACCURACY  91%
TURNS     4
DAMAGE    83

[ TRY AGAIN ]
[ MAIN MENU ]
```

---

# 19. Score System

Create a score system based on:

- Characters typed
- WPM
- Accuracy
- Words completed
- Damage

Example:

```text
Score =
charScore (10 per correct character)
+ windowAccuracyBonus
+ damageScore
```

Display live score during battle.

At the end of the match show:

```text
FINAL SCORE: 8,420
```

Store high scores in LocalStorage.

---

# 20. High Score Screen

Create a High Scores screen.

Display:

```text
SHADOW TYPE — HIGH SCORES

#   SCORE    WPM    ACCURACY
1   9820     91     99%
2   8740     82     97%
3   8210     78     96%
...
```

Store locally using:

```javascript
localStorage
```

No backend is required.

Allow the player to enter a name after completing a high score.

---

# 21. Difficulty Selection

Before starting a fight:

```text
SELECT TIME LIMIT

[ 15 SECS ]
[ 30 SECS ]
[ 60 SECS ]
```

Show a short description.

Example:

```text
EASY
Slower enemy attacks.
Recommended for beginners.
```

---

# 22. Pause System

Allow:

```text
ESC
```

to pause.

Pause overlay:

```text
GAME PAUSED

[ RESUME ]
[ RESTART ]
[ SETTINGS ]
[ MAIN MENU ]
```

When paused:

- Stop PixiJS animations
- Stop timers
- Stop CPU attack countdown
- Stop typing timer

Resume everything correctly.

---

# 23. Sound Architecture

Implement an audio manager.

Support:

- Background music
- Typing sounds
- Attack sounds
- Hit sounds
- Victory sound
- Defeat sound
- UI click sound

Do not require actual audio files for the first prototype.

Create placeholders/interfaces so audio assets can easily be added later.

Provide:

```text
Music Volume
SFX Volume
Mute
```

Persist settings using LocalStorage.

---

# 24. React Architecture

Use a clean component structure.

Recommended:

```text
src/
├── components/
│   ├── MainMenu.jsx
│   ├── BattleScreen.jsx
│   ├── HealthBar.jsx
│   ├── TypingChallenge.jsx
│   ├── BattleHUD.jsx
│   ├── ScorePanel.jsx
│   ├── PauseMenu.jsx
│   ├── VictoryScreen.jsx
│   ├── DefeatScreen.jsx
│   ├── DifficultySelector.jsx
│   ├── HighScores.jsx
│   └── Settings.jsx
│
├── game/
│   ├── PixiGame.js
│   ├── Fighter.js
│   ├── PlayerFighter.js
│   ├── CPUFighter.js
│   ├── CombatManager.js
│   ├── ParticleManager.js
│   └── AnimationManager.js
│
├── data/
│   ├── typingWords.js
│   ├── typingSentences.js
│   └── difficulty.js
│
├── hooks/
│   ├── useTypingGame.js
│   ├── useGameTimer.js
│   └── useLocalStorage.js
│
├── utils/
│   ├── damageCalculator.js
│   ├── scoreCalculator.js
│   ├── typingMetrics.js
│   └── random.js
│
├── App.jsx
├── main.jsx
└── index.css
```

If TypeScript is used:

```text
.ts
.tsx
```

should be preferred.

---

# 25. Game State

Maintain a clear game state model.

Example:

```javascript
{
  status: "playing",

  difficulty: "normal",

  player: {
    hp: 100,
    maxHp: 100,
    score: 0,
    wpm: 0,
    accuracy: 100
  },

  cpu: {
    hp: 100,
    maxHp: 100
  },

  currentChallenge: "...",
  currentWord: "...",
  wordsCompletedThisTurn: 0,

  typing: {
    typedText: "",
    correctCharacters: 0,
    incorrectCharacters: 0,
    startedAt: null
  },

  combat: {
    state: "typing",
    lastAttack: null
  }
}
```

Keep game state centralized.

Avoid unnecessary duplicated state.

---

# 26. PixiJS Integration

Create a dedicated PixiJS game container.

React should mount PixiJS into:

```text
<div id="game-container">
```

PixiJS should own the rendering lifecycle.

React should communicate with PixiJS through a clean API.

For example:

```javascript
pixiGame.playerAttack(damage)
pixiGame.cpuAttack(damage)
pixiGame.playerHit()
pixiGame.cpuHit()
pixiGame.reset()
```

Do not put the entire game logic inside React rendering.

---

# 27. Responsive Design

The game should work on:

- Desktop
- Laptop
- Tablet

Primary target:

```text
1280 × 720
```

Also support:

```text
1920 × 1080
1366 × 768
1024 × 768
```

The battle arena should scale proportionally.

The typing interface must remain usable at smaller screen sizes.

---

# 28. Keyboard Controls

The game is primarily keyboard-based.

Support:

```text
Typing → letters/numbers/punctuation
ESC → Pause
ENTER → confirm/restart where appropriate
```

Do not require mouse interaction during active combat except for menus.

Automatically focus the typing input when a new challenge begins.

---

# 29. Anti-Cheating / Input Rules

For the normal game:

- Disable copy/paste into the typing field.
- Do not allow pasting the challenge.
- Track actual keyboard input.
- Ignore unsupported shortcuts.
- Prevent accidental browser actions where practical.

Do not attempt invasive browser restrictions.

The goal is to maintain the integrity of the typing challenge.

---

# 30. Accessibility

Include:

- High contrast text
- Visible focus states
- Keyboard navigation
- Reduced-motion setting
- Clear error indication
- Do not rely solely on color to communicate typing errors

Settings:

```text
Reduced Motion: ON/OFF
Sound: ON/OFF
```

---

# 31. Game Feel

This is extremely important.

The game should feel responsive.

When the player finishes typing:

```text
TYPE COMPLETE
↓
SHORT DELAY
↓
PLAYER ATTACK
↓
IMPACT
↓
DAMAGE NUMBER
↓
HEALTH REDUCTION
↓
NEXT CHALLENGE
```

Use very short animation timings.

Target:

```text
typing completion → attack
≈ 150–300ms
```

Avoid long cinematic interruptions that slow down the typing gameplay.

---

# 32. Effects

Implement lightweight PixiJS effects:

### Player Attack

- Cyan slash
- Energy trail
- Particle burst

### CPU Attack

- Red slash
- Dark energy projectile
- Particle burst

### Hit

- White flash
- Knockback
- Screen shake
- Impact particles

### Low Health

When health reaches below 25%:

- Health bar pulses
- Character energy becomes more intense
- Optional warning effect

---

# 33. Background

Create a dark fighting arena.

Possible elements:

```text
dark floor
large moon/light source
fog
particles
distant structures
shadow silhouettes
energy particles
```

The background should have subtle movement.

Do not make the background visually compete with the typing challenge.

---

# 34. No Backend

The initial game should be completely client-side.

Do NOT implement:

- PHP
- MySQL
- API
- Authentication
- Server
- Cloud database

Use:

```text
React
Vite
PixiJS
LocalStorage
```

The game must run locally with:

```bash
npm install
npm run dev
```

---

# 35. Package Requirements

Use only necessary dependencies.

Core:

```bash
npm install react pixi.js
```

Avoid installing unnecessary UI frameworks.

CSS can be written using normal CSS.

If additional dependencies are used, explain why they are necessary.

---

# 36. Code Quality Requirements

Follow:

- KISS
- DRY
- Single Responsibility
- Reusable components
- Clear naming
- Small modules
- Minimal abstraction
- No unnecessary architecture

The project should be understandable by a junior-to-intermediate React developer.

Do not over-engineer the game.

Avoid:

- Huge components
- Global variables
- Hardcoded duplicated values
- Deeply nested state
- Unnecessary state management libraries

---

# 37. Error Handling

Handle:

- PixiJS initialization failure
- Audio unavailable
- LocalStorage unavailable
- Window resizing
- Game restart
- Rapid repeated input
- Component unmounting
- PixiJS cleanup

Destroy the PixiJS application correctly when the BattleScreen unmounts.

Prevent memory leaks.

---

# 38. Game Balance

The game should be playable.

A normal player should be able to defeat the CPU with:

```text
60–80 WPM
90%+ accuracy
```

A highly skilled typist should be able to defeat the CPU significantly faster.

Incorrect typing should matter.

Speed alone should not dominate accuracy.

The intended gameplay relationship is:

```text
Typing Accuracy
       +
Typing Speed (words per window)
       +
Words completed
       ↓
   Damage
       ↓
Enemy HP
```

---

# 39. Timed Word Datasets

Create endless word pools, one per difficulty:

### Easy Words (short, 60)

### Normal Words (medium, 60+)

### Hard Words (long/tricky, 55+)

Words stream one at a time during a turn window; finishing a word instantly
serves the next.

---

# 40. Difficulty Scaling

Structure the difficulty system so future levels can be added.

Example:

```javascript
const difficulties = {
  easy: {
    turnSeconds: 15,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 6,
    cpuDamageMax: 10,
    wordPool: "easy"
  },

  normal: {
    turnSeconds: 30,
    cpuTelegraphMs: 2500,
    cpuDamageMin: 10,
    cpuDamageMax: 16,
    wordPool: "normal"
  },

  hard: {
    turnSeconds: 60,
    cpuTelegraphMs: 2000,
    cpuDamageMin: 14,
    cpuDamageMax: 22,
    wordPool: "hard"
  }
};
```

---

# 41. UI Requirements

Use a consistent visual system.

Buttons should have:

- Hover state
- Pressed state
- Disabled state
- Keyboard focus state

Cards/panels should use subtle:

- Shadows
- Borders
- Glow
- Transparency

Do not overload the interface with decorative elements.

The **typing challenge must always remain the primary focus**.

---

# 42. Battle HUD

Display:

```text
PLAYER                              CPU

100%                                100%
████████████████                    ████████████████

WPM: 74                             ENEMY

ACCURACY: 96%

WORDS: 12

SCORE: 4,820
```

Also display the turn timer:

```text
YOUR TURN
████████░░ 12s
```

On the CPU turn:

```text
ENEMY TURN
███░░░░░░░ 1.8s
```

This gives the player strategic awareness.

---

# 43. Attack Countdown

The CPU should telegraph attacks.

Example:

```text
ENEMY ATTACK
2.8s
```

As the timer approaches zero:

```text
3
2
1
ATTACK!
```

This creates pressure while the player is typing.

---

# 44. Combat Feedback

Every successful typing challenge should provide immediate feedback.

Example:

```text
+420 SCORE

82 WPM
97% ACCURACY

+12 DAMAGE
```

For errors:

```text
MISS
```

Keep feedback visible only briefly.

---

# 45. Game Over Scoring

At the end of the match calculate:

```text
Final Score
Average WPM (per turn)
Average Accuracy
Turns Played
Total Damage
Words Completed
```

Display them in a polished results screen.

---

# 46. LocalStorage

Store:

```text
shadowType.highScores
shadowType.settings
```

Example:

```javascript
localStorage.setItem(
  "shadowType.highScores",
  JSON.stringify(scores)
);
```

Keep storage logic inside reusable utilities.

---

# 47. Implementation Order

Build the project in this order:

### Phase 1

Set up:

```text
React
Vite
PixiJS
```

Create main menu.

### Phase 2

Create PixiJS battle arena.

### Phase 3

Create two shadow fighters.

### Phase 4

Implement:

```text
100 HP
health bars
```

### Phase 5

Implement typing engine.

### Phase 6

Connect typing completion to player attack.

### Phase 7

Implement damage calculation.

### Phase 8

Implement CPU attacks.

### Phase 9

Implement victory/defeat.

### Phase 10

Add score and statistics.

### Phase 11

Add difficulty.

### Phase 12

Add high scores.

### Phase 13

Add sound architecture.

### Phase 14

Polish animations and effects.

### Phase 15

Responsive and performance testing.

---

# 48. Important Development Rule

Do not build a static mockup.

The final result must be a **fully playable typing fighting game**.

The following interaction must work end-to-end:

```text
START FIGHT
     ↓
Select difficulty
     ↓
Battle begins
     ↓
Typing challenge appears
     ↓
Player types
     ↓
Typing metrics calculated
     ↓
Damage calculated
     ↓
Player attacks
     ↓
CPU loses HP
     ↓
CPU attacks periodically
     ↓
Player loses HP
     ↓
Continue fighting
     ↓
One fighter reaches 0 HP
     ↓
Victory / Defeat
     ↓
Results
     ↓
Rematch / Main Menu
```

---

# 49. Final Acceptance Criteria

The implementation is complete only when:

- React/Vite project runs successfully.
- PixiJS initializes correctly.
- Main menu works.
- Difficulty selection works.
- Battle arena renders.
- Two shadow fighters are visible.
- Both fighters start at 100 HP.
- Typing challenge works.
- Correct typing is tracked.
- Incorrect typing is tracked.
- WPM is calculated.
- Accuracy is calculated.
- Words-completed tally works.
- Damage is calculated from typing performance.
- Player attacks visually.
- CPU takes damage.
- CPU attacks automatically.
- Player takes damage.
- Health bars animate.
- Victory state works.
- Defeat state works.
- Score is calculated.
- Results screen works.
- Rematch works.
- Main menu works.
- High scores persist using LocalStorage.
- Settings persist using LocalStorage.
- Pause works.
- PixiJS cleans up correctly.
- No obvious memory leaks.
- Game is responsive.
- Game can be played entirely with the keyboard during combat.

## Final Goal

The finished application should feel like:

**A polished arcade typing game where typing skill becomes physical combat power.**

The player should feel that:

> **Every correct keystroke is an attack.**  
> **Every mistake weakens the fighter.**  
> **Speed builds momentum.**  
> **Accuracy creates power.**  
> **Typing wins the fight.**

Build the application completely rather than stopping after creating the UI.