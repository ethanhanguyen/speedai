interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface ParticleBurstConfig {
  x: number;
  y: number;
  count?: number;
  speed?: number;
  spread?: number;
  lifetime?: number;
  size?: number;
  sizeDecay?: number;
  colors?: string[];
  gravity?: number;
}

/**
 * One-shot particle burst effect (explosion, collect, etc).
 */
export class ParticleBurst {
  private particles: Particle[] = [];
  private pool: Particle[] = [];

  get isActive(): boolean {
    return this.particles.length > 0;
  }

  emit(config: ParticleBurstConfig): void {
    const count = config.count ?? 20;
    const speed = config.speed ?? 200;
    const spread = config.spread ?? Math.PI * 2;
    const lifetime = config.lifetime ?? 0.5;
    const size = config.size ?? 4;
    const colors = config.colors ?? ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D'];

    const baseAngle = -Math.PI / 2; // upward default

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const p = this.acquireParticle();
      p.x = config.x;
      p.y = config.y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = lifetime;
      p.maxLife = lifetime;
      p.size = size * (0.5 + Math.random() * 0.5);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      this.particles.push(p);
    }
  }

  update(dt: number, gravity = 400): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.pool.push(...this.particles);
    this.particles.length = 0;
  }

  private acquireParticle(): Particle {
    return this.pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '', alpha: 1 };
  }
}
