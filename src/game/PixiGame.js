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
import { ParticleManager } from './ParticleManager.js';
import { buildBackground, EMBER_VENTS } from './Background.js';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
const GROUND_Y = 560;
const PLAYER_HOME = { x: 390, y: GROUND_Y };
const CPU_HOME = { x: 890, y: GROUND_Y };

const CYAN = 0x22d3ee;
const RED = 0xff5252;

export class PixiGame {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.app = null;
    this.destroyed = false;
    this.paused = false;
    this.busy = false;
    this.tweens = [];
    this.elapsed = 0;
    this.ambientTimer = 0;
    this.petalTimer = 200;
    this.emberTimer = 0;
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

    // Sprite sheets must load before fighters are built.
    await Fighter.loadSheets();
    if (this.destroyed) return;

    // world shakes; everything visual lives inside it.
    this.world = new Container();
    this.app.stage.addChild(this.world);

    const bg = buildBackground(ARENA_WIDTH, ARENA_HEIGHT, GROUND_Y);
    this.world.addChild(bg.root);
    this.fog = bg.fog;

    this.player = new Fighter({ side: 'player', accent: CYAN });
    this.player.setBasePosition(PLAYER_HOME.x, PLAYER_HOME.y);
    this.world.addChild(this.player.root);

    this.cpu = new Fighter({ side: 'cpu', accent: RED });
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

    this.player.update(this.elapsed, this.paused, dt);
    this.cpu.update(this.elapsed, this.paused, dt);
    this.player.fadeFlash(dt * 4);
    this.cpu.fadeFlash(dt * 4);

    // Fog drift.
    for (const f of this.fog) {
      f.x += f.userData.speed * dt;
      if (f.x - 220 > ARENA_WIDTH) f.x = -220;
    }

    // Ambient motes.
    this.ambientTimer -= ticker.deltaMS;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 350;
      const cyan = Math.random() < 0.5;
      this.particles.ambient(
        cyan ? PLAYER_HOME.x : CPU_HOME.x,
        GROUND_Y - 60 - Math.random() * 160,
        cyan ? CYAN : RED,
      );
    }

    // Drifting sakura petals.
    this.petalTimer -= ticker.deltaMS;
    if (this.petalTimer <= 0) {
      this.petalTimer = 550;
      this.particles.petal(Math.random() * ARENA_WIDTH, -12 - Math.random() * 120);
    }

    // Embers rising from the ground vents.
    this.emberTimer -= ticker.deltaMS;
    if (this.emberTimer <= 0) {
      this.emberTimer = 220;
      const vx = EMBER_VENTS[Math.floor(Math.random() * EMBER_VENTS.length)];
      this.particles.ambient(vx + (Math.random() - 0.5) * 50, GROUND_Y + 10, 0xff9a3c);
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

  slash(x, y, color, big = false) {
    const g = new Graphics();
    const r = big ? 90 : 60;
    g.arc(x, y, r, -Math.PI * 0.7, Math.PI * 0.15);
    g.stroke({ color, width: big ? 14 : 9, alpha: 0.95, cap: 'round' });
    g.arc(x, y, r * 0.8, -Math.PI * 0.7, Math.PI * 0.15);
    g.stroke({ color: 0xffffff, width: 3, alpha: 0.8, cap: 'round' });
    this.fxLayer.addChild(g);
    const duration = this.reducedMotion ? 60 : 200;
    return this.tween(duration, (k) => {
      g.alpha = 1 - k;
      const s = 1 + k * (big ? 0.5 : 0.3);
      g.scale.set(s, s);
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
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: big ? 52 : 38,
        fontWeight: 'bold',
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
  async playerAttack({ damage }) {
    if (!this.app || this.destroyed || this.busy) return;
    this.busy = true;
    try {
      const step = this.reducedMotion ? 0.4 : 1;
      const fromX = this.player.root.x;
      this.player.playAttack();
      // Lunge.
      await this.tween(130 * step, (k) => {
        this.player.root.x = fromX + k * 130;
      });
      // Slash + impact on CPU.
      const target = this.cpu.hitPoint();
      const cx = this.cpu.root.x;
      this.slash(cx - 30, target.y, CYAN, false);
      this.impact(cx, target.y, CYAN, false);
      this.cpu.showFlash(1);
      this.damageText(cx, target.y - 70, `-${damage}`, 0xffffff, false);
      const knock = this.tween(140 * step, (k) => {
        this.cpu.root.x = cx + k * 26;
      });
      const shakeP = this.shake(8);
      await Promise.all([knock, shakeP]);
      // Recover.
      await this.tween(170 * step, (k) => {
        this.cpu.root.x = cx + 26 * (1 - k);
        this.player.root.x = fromX + 130 * (1 - k);
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
      this.cpu.playAttack();
      await this.tween(130 * step, (k) => {
        this.cpu.root.x = fromX - k * 130;
      });
      const target = this.player.hitPoint();
      const px = this.player.root.x;
      this.slash(px + 30, target.y, RED, false);
      this.impact(px, target.y, RED, false);
      this.player.showFlash(1);
      this.damageText(px, target.y - 70, `-${damage}`, 0xffffff, false);
      const knock = this.tween(140 * step, (k) => {
        this.player.root.x = px - k * 26;
      });
      const shakeP = this.shake(8);
      await Promise.all([knock, shakeP]);
      await this.tween(170 * step, (k) => {
        this.player.root.x = px - 26 * (1 - k);
        this.cpu.root.x = fromX - 130 * (1 - k);
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
    const target = this.cpu.hitPoint();
    this.impact(this.cpu.root.x, target.y, RED, true);
    this.shake(12);
  }

  defeat() {
    this.player.playDefeat();
    this.cpu.playVictoryPose();
    const target = this.player.hitPoint();
    this.impact(this.player.root.x, target.y, CYAN, true);
    this.shake(12);
  }

  reset() {
    this.tweens.length = 0;
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
