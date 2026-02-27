/** Shape types for particle rendering. */
export type ParticleShape = 'circle' | 'square' | 'streak' | 'sprite';

/** How sprite particles orient themselves. */
export type SpriteRotationMode = 'none' | 'velocity' | 'random';

/** Emission area shape. */
export type EmitShape = 'point' | 'circle' | 'rect';

/** Blend mode for particle compositing. */
export type ParticleBlendMode = 'source-over' | 'lighter';

/**
 * Configuration for a continuous particle emitter.
 * All visual/behavioral parameters are config-driven.
 */
export interface ParticleEmitterConfig {
  // ── Emission ──
  /** Particles emitted per second. */
  rate: number;
  /** Shape of the emission area. */
  emitShape?: EmitShape;
  /** Radius for 'circle' emitShape (px). */
  emitRadius?: number;
  /** Width for 'rect' emitShape (px). */
  emitWidth?: number;
  /** Height for 'rect' emitShape (px). */
  emitHeight?: number;

  // ── Motion ──
  /** Base particle speed (px/sec). */
  speed: number;
  /** Angular spread from direction (radians). Full circle = PI*2. */
  spread: number;
  /** Base emission direction (radians). Default -PI/2 (upward). */
  direction?: number;
  /** Gravity applied to vy (px/sec²). Positive = downward. */
  gravity?: number;
  /** Random velocity perturbation per frame (px/sec). Organic drift. */
  turbulence?: number;
  /** Velocity damping per frame (0–1). 1 = no friction, 0.9 = heavy drag. */
  damping?: number;

  // ── Appearance ──
  /** Particle render shape. */
  shape?: ParticleShape;
  /** Base particle size (px). */
  size: number;
  /** Size multiplier over lifetime: [startMult, endMult]. */
  sizeOverLife?: [number, number];
  /** Colors to interpolate through over particle lifetime. */
  colorOverLife: string[];
  /** Canvas composite operation. 'lighter' = additive blending. */
  blendMode?: ParticleBlendMode;
  /** Alpha over lifetime: [startAlpha, endAlpha]. */
  alphaOverLife?: [number, number];

  // ── Sprite mode (shape='sprite') ──
  /** Asset keys to randomly pick from per particle. */
  spriteKeys?: string[];
  /** How sprite orients: 'velocity' = face movement, 'random' = random angle at spawn. */
  spriteRotation?: SpriteRotationMode;

  // ── Lifetime ──
  /** Base particle lifetime (seconds). */
  lifetime: number;
  /** Random ± variance added to lifetime (seconds). */
  lifetimeVariance?: number;
}

// ── Internal particle struct ──

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  /** Index into colorOverLife for interpolation (0–1 maps to array). */
  colorT: number;
  spriteKey: string;
  rotationAngle: number;
}

// ── Default values ──

const DEFAULT_DIRECTION = -Math.PI / 2; // upward
const DEFAULT_GRAVITY = 0;
const DEFAULT_DAMPING = 1;
const DEFAULT_TURBULENCE = 0;
const DEFAULT_ALPHA_START = 1;
const DEFAULT_ALPHA_END = 0;
const DEFAULT_SIZE_START = 1;
const DEFAULT_SIZE_END = 1;
const TWO_PI = Math.PI * 2;

/**
 * Continuous particle emitter — fires particles at a steady rate.
 * Companion to ParticleBurst (one-shot). Reusable across any game.
 *
 * Supports: circles, squares, streaks, sprites.
 * Features: color interpolation, size-over-life, additive blending,
 *           turbulence, damping, area emission, sprite rotation modes.
 */
export class ParticleEmitter {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private config: ParticleEmitterConfig | null = null;
  private accumulator = 0;
  private running = false;
  private posX = 0;
  private posY = 0;

  /** Image resolver — set externally so emitter stays engine-agnostic. */
  private imageResolver: ((key: string) => HTMLImageElement | undefined) | null = null;

  get isActive(): boolean {
    return this.running || this.particles.length > 0;
  }

  get particleCount(): number {
    return this.particles.length;
  }

  /**
   * Provide an image lookup for sprite-mode particles.
   * Typically: `(key) => assetManager.getImage(key)`
   */
  setImageResolver(resolver: (key: string) => HTMLImageElement | undefined): void {
    this.imageResolver = resolver;
  }

  /** Start continuous emission at position (x, y). */
  start(config: ParticleEmitterConfig, x = 0, y = 0): void {
    this.config = config;
    this.posX = x;
    this.posY = y;
    this.accumulator = 0;
    this.running = true;
  }

  /** Stop emitting. Existing particles finish their lifetime. */
  stop(): void {
    this.running = false;
  }

  /** Move emitter origin. */
  moveTo(x: number, y: number): void {
    this.posX = x;
    this.posY = y;
  }

  /** Advance simulation. */
  update(dt: number): void {
    const cfg = this.config;
    if (!cfg) return;

    // ── Emit new particles ──
    if (this.running) {
      this.accumulator += dt;
      const interval = 1 / cfg.rate;
      while (this.accumulator >= interval) {
        this.accumulator -= interval;
        this.emitOne(cfg);
      }
    }

    // ── Update existing ──
    const gravity = cfg.gravity ?? DEFAULT_GRAVITY;
    const damping = cfg.damping ?? DEFAULT_DAMPING;
    const turbulence = cfg.turbulence ?? DEFAULT_TURBULENCE;
    const [alphaStart, alphaEnd] = cfg.alphaOverLife ?? [DEFAULT_ALPHA_START, DEFAULT_ALPHA_END];
    const [sizeStart, sizeEnd] = cfg.sizeOverLife ?? [DEFAULT_SIZE_START, DEFAULT_SIZE_END];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Turbulence
      if (turbulence > 0) {
        p.vx += (Math.random() - 0.5) * turbulence * dt;
        p.vy += (Math.random() - 0.5) * turbulence * dt;
      }

      // Gravity + damping
      p.vy += gravity * dt;
      p.vx *= damping;
      p.vy *= damping;

      // Position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Life
      p.life -= dt;
      const t = 1 - Math.max(0, p.life / p.maxLife); // 0 at birth → 1 at death
      p.colorT = t;
      p.alpha = alphaStart + (alphaEnd - alphaStart) * t;
      p.size = cfg.size * (sizeStart + (sizeEnd - sizeStart) * t);

      // Streak rotation tracks velocity
      if (cfg.shape === 'streak' || (cfg.shape === 'sprite' && cfg.spriteRotation === 'velocity')) {
        p.rotationAngle = Math.atan2(p.vy, p.vx);
      }

      // Remove dead
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        this.pool.push(p);
      }
    }
  }

  /** Render all live particles. */
  draw(ctx: CanvasRenderingContext2D): void {
    const cfg = this.config;
    if (!cfg || this.particles.length === 0) return;

    const colors = cfg.colorOverLife;
    const colorCount = colors.length;
    const blendMode = cfg.blendMode ?? 'source-over';
    const shape = cfg.shape ?? 'circle';
    const prevComposite = ctx.globalCompositeOperation;

    ctx.globalCompositeOperation = blendMode;

    for (const p of this.particles) {
      const color = this.interpolateColor(colors, colorCount, p.colorT);

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (shape === 'sprite') {
        this.drawSprite(ctx, p);
      } else if (shape === 'streak') {
        this.drawStreak(ctx, p, color);
      } else if (shape === 'square') {
        ctx.fillStyle = color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotationAngle);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        // circle (default)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size / 2), 0, TWO_PI);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalCompositeOperation = prevComposite;
  }

  /** Remove all particles and stop. */
  clear(): void {
    this.pool.push(...this.particles);
    this.particles.length = 0;
    this.running = false;
    this.accumulator = 0;
  }

  // ── Private ──

  private emitOne(cfg: ParticleEmitterConfig): void {
    const p = this.acquireParticle();
    const direction = cfg.direction ?? DEFAULT_DIRECTION;

    // Emission position (area shape)
    const [ox, oy] = this.emitOffset(cfg);
    p.x = this.posX + ox;
    p.y = this.posY + oy;

    // Velocity
    const angle = direction + (Math.random() - 0.5) * cfg.spread;
    const spd = cfg.speed * (0.5 + Math.random() * 0.5);
    p.vx = Math.cos(angle) * spd;
    p.vy = Math.sin(angle) * spd;

    // Lifetime
    const variance = cfg.lifetimeVariance ?? 0;
    p.maxLife = cfg.lifetime + (Math.random() - 0.5) * 2 * variance;
    p.life = p.maxLife;

    // Appearance
    const [sizeStart] = cfg.sizeOverLife ?? [DEFAULT_SIZE_START, DEFAULT_SIZE_END];
    p.size = cfg.size * sizeStart;
    p.alpha = (cfg.alphaOverLife ?? [DEFAULT_ALPHA_START, DEFAULT_ALPHA_END])[0];
    p.colorT = 0;

    // Sprite
    if (cfg.shape === 'sprite' && cfg.spriteKeys && cfg.spriteKeys.length > 0) {
      p.spriteKey = cfg.spriteKeys[Math.floor(Math.random() * cfg.spriteKeys.length)];
    } else {
      p.spriteKey = '';
    }

    // Rotation
    if (cfg.spriteRotation === 'random' || cfg.shape === 'square') {
      p.rotationAngle = Math.random() * TWO_PI;
    } else if (cfg.spriteRotation === 'velocity' || cfg.shape === 'streak') {
      p.rotationAngle = Math.atan2(p.vy, p.vx);
    } else {
      p.rotationAngle = 0;
    }

    this.particles.push(p);
  }

  private emitOffset(cfg: ParticleEmitterConfig): [number, number] {
    const emitShape = cfg.emitShape ?? 'point';
    if (emitShape === 'circle') {
      const r = (cfg.emitRadius ?? 0) * Math.sqrt(Math.random());
      const a = Math.random() * TWO_PI;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }
    if (emitShape === 'rect') {
      const hw = (cfg.emitWidth ?? 0) / 2;
      const hh = (cfg.emitHeight ?? 0) / 2;
      return [(Math.random() - 0.5) * 2 * hw, (Math.random() - 0.5) * 2 * hh];
    }
    return [0, 0];
  }

  private drawStreak(ctx: CanvasRenderingContext2D, p: Particle, color: string): void {
    const len = Math.max(1, p.size * 2);
    const dx = Math.cos(p.rotationAngle) * len / 2;
    const dy = Math.sin(p.rotationAngle) * len / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, p.size / 3);
    ctx.beginPath();
    ctx.moveTo(p.x - dx, p.y - dy);
    ctx.lineTo(p.x + dx, p.y + dy);
    ctx.stroke();
  }

  private drawSprite(ctx: CanvasRenderingContext2D, p: Particle): void {
    if (!this.imageResolver || !p.spriteKey) {
      // Fallback to circle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size / 2), 0, TWO_PI);
      ctx.fill();
      return;
    }
    const img = this.imageResolver(p.spriteKey);
    if (!img) return;

    ctx.translate(p.x, p.y);
    if (p.rotationAngle !== 0) ctx.rotate(p.rotationAngle);
    ctx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
  }

  /** Interpolate through color array by t (0–1). */
  private interpolateColor(colors: string[], count: number, t: number): string {
    if (count <= 1) return colors[0];
    const idx = Math.min(t, 0.999) * (count - 1);
    return colors[Math.round(idx)];
  }

  private acquireParticle(): Particle {
    return this.pool.pop() ?? {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 0, size: 0,
      alpha: 1, colorT: 0,
      spriteKey: '', rotationAngle: 0,
    };
  }
}
