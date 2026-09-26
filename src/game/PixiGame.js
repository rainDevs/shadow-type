// PixiGame: owns the entire PixiJS rendering lifecycle (PLAN.md section 26).
// React mounts it into a div and talks to it only through this API:
//   playerAttack({ damage }) -> Promise (resolves when done)
//   cpuAttack({ damage })              -> Promise
//   victory() / defeat() / reset()
//   setPaused(bool)
//   destroy()
// Combat/state logic lives in React — never in here.

import { Application, Container, Graphics, Text } from 'pixi.js';
import { Fighter } from './Fighter.js';
import { heroAccent, heroGlow } from '../data/heroes.js';
import { ParticleManager } from './ParticleManager.js';
import { buildBackground, EMBER_VENTS, EMBER_COLOR } from './Background.js';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
// Top edge of the pixel ground slab (matches Background.js).
const GROUND_Y = 633;
const PLAYER_HOME = { x: 300, y: GROUND_Y };
const CPU_HOME = { x: 980, y: GROUND_Y };
// Center distance at contact: 42px bodies at 4.5x read as touching.
const TOUCH_GAP = 125;

// Pixel sparkles drifting down: hero light tones.
const SPARKLES = [0xf489f6, 0xfda216, 0x0feffb];

export class PixiGame {
  constructor({ reducedMotion = false, playerHero = 'hero-1', cpuHero = 'hero-2' } = {}) {
    this.reducedMotion = reducedMotion;
    this.playerHero = playerHero;
    this.cpuHero = cpuHero;
    this.app = null;
    this.destroyed = false;
    this.paused = false;
    this.busy = false;
    this.tweens = [];
    this.elapsed = 0;
    this.ambientTimer = 0;
    this.sparkleTimer = 200;
    this.sparkleColor = 0;
    this.emberTimer = 0;
    this.winFx = null;
    this.playerAccent = heroAccent(playerHero);
    this.cpuAccent = heroAccent(cpuHero);
    this.playerGlow = heroGlow(playerHero);
    this.cpuGlow = heroGlow(cpuHero);
  }

  async init(container) {
    this.app = new Application();
    await this.app.init({
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.app.canvas.classList.add('arena-canvas');
    container.appendChild(this.app.canvas);

    // Hero sprite sheets must load before fighters are built.
    await Fighter.loadHero(this.playerHero);
    if (this.cpuHero !== this.playerHero) await Fighter.loadHero(this.cpuHero);
    if (this.destroyed) return;

    // world shakes; everything visual lives inside it.
    this.world = new Container();
    this.app.stage.addChild(this.world);

    const bg = await buildBackground(ARENA_WIDTH, ARENA_HEIGHT, GROUND_Y);
    this.world.addChild(bg.root);
    this.fog = bg.fog;

    this.player = new Fighter({ side: 'player', accent: this.playerGlow, heroId: this.playerHero });
    this.player.setBasePosition(PLAYER_HOME.x, PLAYER_HOME.y);
    this.world.addChild(this.player.root);

    this.cpu = new Fighter({ side: 'cpu', accent: this.cpuGlow, heroId: this.cpuHero });
    this.cpu.setBasePosition(CPU_HOME.x, CPU_HOME.y);
    this.world.addChild(this.cpu.root);

    this.particles = new ParticleManager();
    this.world.addChild(this.particles.root);

    this.fxLayer = new Container();
    this.world.addChild(this.fxLayer);

    this.app.ticker.add((ticker) => this.tick(ticker));
  }

  // --- main loop -----------------------------------------------------------
  tick(ticker) {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    this.elapsed += ticker.deltaMS;

    // Tweens (drive all scripted animation; freeze automatically on pause
    // because the ticker stops).
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.elapsed += ticker.deltaMS;
      const k = Math.min(1, tw.elapsed / tw.duration);
      tw.update(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.resolve();
      }
    }

    this.player.update(this.elapsed, this.paused, ticker);
    this.cpu.update(this.elapsed, this.paused, ticker);
    this.player.fadeFlash(dt * 4);
    this.cpu.fadeFlash(dt * 4);

    // Fog drift.
    for (const f of this.fog) {
      f.x += f.userData.speed * dt;
      if (f.x - 220 > ARENA_WIDTH) f.x = -220;
    }

    // Ambient motes in each hero's glow color.
    this.ambientTimer -= ticker.deltaMS;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 350;
      const playerSide = Math.random() < 0.5;
      this.particles.ambient(
        playerSide ? PLAYER_HOME.x : CPU_HOME.x,
        GROUND_Y - 60 - Math.random() * 160,
        playerSide ? this.playerGlow : this.cpuGlow,
      );
    }

    // Drifting pixel sparkles in rotating hero light tones.
    this.sparkleTimer -= ticker.deltaMS;
    if (this.sparkleTimer <= 0) {
      this.sparkleTimer = 550;
      const color = SPARKLES[this.sparkleColor % SPARKLES.length];
      this.sparkleColor += 1;
      this.particles.petal(Math.random() * ARENA_WIDTH, -12 - Math.random() * 120, color);
    }

    // Warm grit rising from the ground slab.
    this.emberTimer -= ticker.deltaMS;
    if (this.emberTimer <= 0) {
      this.emberTimer = 220;
      const vx = EMBER_VENTS[Math.floor(Math.random() * EMBER_VENTS.length)];
      this.particles.ambient(vx + (Math.random() - 0.5) * 50, GROUND_Y + 10, EMBER_COLOR);
    }

    // Winner celebration sparkles (set on victory/defeat, cleared on reset).
    if (this.winFx && !this.paused) {
      this.winFx.t -= ticker.deltaMS;
      if (this.winFx.t <= 0) {
        this.winFx.t = 350;
        const fx = this.winFx;
        const wx = fx.fighter.root.x + (Math.random() - 0.5) * 90;
        const wy = fx.fighter.root.y - 116 + (Math.random() - 0.5) * 60;
        this.particles.burst(wx, wy, {
          color: fx.color,
          count: 8,
          speed: 170,
          size: 3,
          life: 0.7,
          gravity: -60,
        });
      }
    }

    this.particles.update(dt);
  }

  tween(duration, update) {
    return new Promise((resolve) => {
      this.tweens.push({ elapsed: 0, duration, update, resolve });
    });
  }

  wait(ms) {
    return this.tween(ms, () => {});
  }

  // --- effects ---------------------------------------------------------------
  shake(strength = 10) {
    if (this.reducedMotion || strength <= 0) return Promise.resolve();
    const duration = 220;
    return this.tween(duration, (k) => {
      const decay = 1 - k;
      this.world.position.set(
        (Math.random() - 0.5) * 2 * strength * decay,
        (Math.random() - 0.5) * 2 * strength * decay,
      );
      if (k >= 1) this.world.position.set(0, 0);
    });
  }

  // Refined sword slash: a tapered crescent that draws on along its travel,
  // white-hot core inside a hero-color blade with a soft glow, plus a spark
  // riding the leading tip. Each side has explicit angles (no mirrored
  // negative scale): player sweeps down the right side, CPU down the left.
  slash(x, y, color, big = false, dir = 1) {
    const g = new Graphics();
    const r = big ? 78 : 58;
    // Player (dir +1, strikes right): start upper-left, sweep clockwise down
    // the right side. CPU (dir -1, strikes left): start upper-right, sweep
    // counterclockwise down the left side.
    const S = dir >= 0 ? -Math.PI * 0.75 : Math.PI * 1.75;
    const E = dir >= 0 ? Math.PI * 0.2 : Math.PI * 0.8;
    const CCW = dir < 0;
    const SEGS = 10;
    const glowW = big ? 13 : 9;
    const bladeW = big ? 7 : 5;
    g.position.set(x, y);
    this.fxLayer.addChild(g);
    const duration = this.reducedMotion ? 60 : big ? 180 : 150;
    const easeOut = (t) => 1 - (1 - t) * (1 - t);
    const lerpAngle = (t) => S + (E - S) * t;
    return this.tween(duration, (k) => {
      // Sweep draws on over the first 45%, then holds while fading.
      const sweep = easeOut(Math.min(1, k / 0.45));
      const end = lerpAngle(sweep);
      const fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
      g.clear();
      g.alpha = Math.max(0, fade);
      // Tapered blade: wide lingering tail -> narrow bright tip.
      for (let i = 0; i < SEGS; i++) {
        const t0 = i / SEGS;
        if (t0 >= sweep || sweep <= 0) continue;
        const t1 = Math.min((i + 1) / SEGS, sweep);
        const a0 = lerpAngle(t0);
        const a1 = lerpAngle(t1);
        const taper = 1 - 0.7 * (i / (SEGS - 1));
        g.arc(0, 0, r, a0, a1, CCW);
        g.stroke({ color, width: glowW * taper, alpha: 0.28, cap: 'round' });
        g.arc(0, 0, r, a0, a1, CCW);
        g.stroke({ color, width: bladeW * taper, alpha: 0.95, cap: 'round' });
        g.arc(0, 0, r * 0.9, a0, a1, CCW);
        g.stroke({ color: 0xffffff, width: 2, alpha: 0.85, cap: 'round' });
      }
      // Spark riding the leading tip.
      const tx = Math.cos(end) * r;
      const ty = Math.sin(end) * r;
      g.circle(tx, ty, big ? 4 : 3);
      g.fill({ color: 0xffffff, alpha: 0.95 });
      g.circle(tx, ty, big ? 7 : 5);
      g.fill({ color, alpha: 0.35 });
      // Subtle settle toward the travel direction.
      const s = 1 + k * 0.05;
      g.scale.set(s, s);
      g.rotation = dir * -0.08 * (1 - k);
      if (k >= 1) {
        this.fxLayer.removeChild(g);
        g.destroy();
      }
    });
  }

  damageText(x, y, text, color, big = false) {
    const t = new Text({
      text,
      style: {
        fontFamily: "'Press Start 2P', ui-monospace, Menlo, Consolas, monospace",
        fontWeight: '700',
        letterSpacing: 1,
        fontSize: big ? 20 : 15,
        fill: color,
        stroke: { color: 0x000000, width: 5 },
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.fxLayer.addChild(t);
    const duration = 750;
    const fallthrough = this.tween(duration, (k) => {
      t.position.y = y - k * 70;
      t.alpha = 1 - k * k;
      if (k >= 1) {
        this.fxLayer.removeChild(t);
        t.destroy();
      }
    });
    return fallthrough;
  }

  impact(x, y, color, big = false) {
    this.particles.burst(x, y, {
      color,
      count: big ? 60 : 30,
      speed: big ? 460 : 320,
      size: big ? 5 : 4,
    });
    this.particles.burst(x, y, { color: 0xffffff, count: 10, speed: 200, size: 3, life: 0.4 });
  }

  // --- combat sequences --------------------------------------------------------
  // Attackers close the full gap and touch the defender (centers ~TOUCH_GAP
  // apart: the 42px bodies at 3.5x scale read as contact), strike with an
  // impact burst + shake, then return home.
  async playerAttack({ damage }) {
    if (!this.app || this.destroyed || this.busy) return;
    this.busy = true;
    try {
      const step = this.reducedMotion ? 0.4 : 1;
      const fromX = this.player.root.x;
      const touchX = this.cpu.root.x - TOUCH_GAP;
      this.player.playDash();
      // Close in until touching the defender.
      await this.tween(220 * step, (k) => {
        this.player.root.x = fromX + (touchX - fromX) * k;
      });
      // Strike on contact: sword slash, impact burst, shake, damage number, knockback.
      this.player.playAttack(damage);
      const target = this.cpu.hitPoint();
      const cx = this.cpu.root.x;
      const big = (damage ?? 0) >= 10;
      this.slash(target.x, target.y, this.playerGlow, big, 1);
      this.impact(target.x, target.y, this.playerGlow, false);
      this.shake(8);
      this.cpu.playHit();
      this.damageText(cx, target.y - 70, `-${damage}`, 0xffffff, false);
      await this.tween(140 * step, (k) => {
        this.cpu.root.x = cx + k * 26;
      });
      // Recover.
      await this.tween(200 * step, (k) => {
        this.cpu.root.x = cx + 26 * (1 - k);
        this.player.root.x = touchX + (fromX - touchX) * k;
      });
      this.cpu.root.x = CPU_HOME.x;
      this.player.root.x = fromX;
    } finally {
      this.busy = false;
    }
  }

  async cpuAttack({ damage }) {
    if (!this.app || this.destroyed || this.busy) return;
    this.busy = true;
    try {
      const step = this.reducedMotion ? 0.4 : 1;
      const fromX = this.cpu.root.x;
      const touchX = this.player.root.x + TOUCH_GAP;
      this.cpu.playDash();
      await this.tween(220 * step, (k) => {
        this.cpu.root.x = fromX + (touchX - fromX) * k;
      });
      this.cpu.playAttack(damage);
      const target = this.player.hitPoint();
      const px = this.player.root.x;
      const big = (damage ?? 0) >= 10;
      this.slash(target.x, target.y, this.cpuGlow, big, -1);
      this.impact(target.x, target.y, this.cpuGlow, false);
      this.shake(8);
      this.player.playHit();
      this.damageText(px, target.y - 70, `-${damage}`, 0xffffff, false);
      await this.tween(140 * step, (k) => {
        this.player.root.x = px - k * 26;
      });
      await this.tween(200 * step, (k) => {
        this.player.root.x = px - 26 * (1 - k);
        this.cpu.root.x = touchX + (fromX - touchX) * k;
      });
      this.player.root.x = PLAYER_HOME.x;
      this.cpu.root.x = fromX;
    } finally {
      this.busy = false;
    }
  }

  victory() {
    this.cpu.playDefeat();
    this.player.playVictoryPose();
    this.winFx = { fighter: this.player, color: this.playerGlow, t: 0 };
    const target = this.cpu.hitPoint();
    this.impact(this.cpu.root.x, target.y, this.playerGlow, true);
    this.shake(12);
  }

  defeat() {
    this.player.playDefeat();
    this.cpu.playVictoryPose();
    this.winFx = { fighter: this.cpu, color: this.cpuGlow, t: 0 };
    const target = this.player.hitPoint();
    this.impact(this.player.root.x, target.y, this.cpuGlow, true);
    this.shake(12);
  }

  reset() {
    this.tweens.length = 0;
    this.winFx = null;
    this.world.position.set(0, 0);
    this.particles.clear();
    this.player.reset();
    this.cpu.reset();
    this.busy = false;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.app) return;
    if (paused) this.app.ticker.stop();
    else this.app.ticker.start();
  }

  destroy() {
    this.destroyed = true;
    this.tweens.length = 0;
    if (this.app) {
      try {
        this.app.ticker.stop();
        this.app.destroy(true, { children: true, texture: true });
      } catch {
        /* already destroyed */
      }
      this.app = null;
    }
  }
}
