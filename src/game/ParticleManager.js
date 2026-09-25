// Lightweight particle pool (PLAN.md sections 32-33).
// Circles with velocity, gravity and fade — no textures needed.

import { Container, Graphics } from 'pixi.js';

const MAX_PARTICLES = 400;

export class ParticleManager {
  constructor() {
    this.root = new Container();
    this.particles = [];
    this.pool = [];
  }

  burst(x, y, { color = 0x22d3ee, count = 24, speed = 320, life = 0.6, size = 4, gravity = 500 } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const p = this.pool.pop() ?? this.createParticle();
      const angle = Math.random() * Math.PI * 2;
      const vel = speed * (0.35 + Math.random() * 0.85);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * vel;
      p.vy = Math.sin(angle) * vel - speed * 0.35;
      p.life = life * (0.6 + Math.random() * 0.7);
      p.age = 0;
      p.gravity = gravity;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      p.g.clear();
      p.g.circle(0, 0, p.size);
      p.g.fill({ color, alpha: 1 });
      p.g.visible = true;
      this.root.addChild(p.g);
      this.particles.push(p);
    }
  }

  // Slow ambient motes drifting upward.
  ambient(x, y, color) {
    if (this.particles.length >= MAX_PARTICLES) return;
    const p = this.pool.pop() ?? this.createParticle();
    p.x = x + (Math.random() - 0.5) * 60;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 24;
    p.vy = -(14 + Math.random() * 26);
    p.life = 2.5 + Math.random() * 2;
    p.age = 0;
    p.gravity = -8;
    p.size = 1.5 + Math.random() * 2;
    p.color = color;
    p.g.clear();
    p.g.circle(0, 0, p.size);
    p.g.fill({ color, alpha: 0.7 });
    p.g.visible = true;
    this.root.addChild(p.g);
    this.particles.push(p);
  }

  createParticle() {
    return { g: new Graphics(), x: 0, y: 0, vx: 0, vy: 0, life: 1, age: 0, gravity: 0, size: 3, color: 0xffffff };
  }

  update(dt) {
    // dt in seconds.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.g.visible = false;
        this.root.removeChild(p.g);
        this.particles.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.g.position.set(p.x, p.y);
      p.g.alpha = 1 - p.age / p.life;
    }
  }

  clear() {
    for (const p of this.particles) {
      p.g.visible = false;
      this.root.removeChild(p.g);
      this.pool.push(p);
    }
    this.particles.length = 0;
  }
}
