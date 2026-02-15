import type { ISoundManager, MusicOptions, SfxOptions } from '../../core/types.js';

/**
 * Sound manager backed by Howler.js (peer dependency).
 * Gracefully no-ops if Howler is not available.
 */
export class HowlerAdapter implements ISoundManager {
  private musicVolume: number = 1;
  private sfxVolume: number = 1;
  private currentMusic: { key: string; howl: unknown } | null = null;
  private sounds: Map<string, unknown> = new Map();
  private Howl: (new (options: Record<string, unknown>) => HowlInstance) | null = null;

  constructor() {
    try {
      // Dynamic import check — Howler must be available globally or via import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const howler = (globalThis as Record<string, unknown>)['Howl'];
      if (howler) {
        this.Howl = howler as typeof this.Howl;
      }
    } catch {
      // Howler not available
    }
  }

  /** Register a sound by key. Call before playMusic/playSfx. */
  register(key: string, src: string | string[], options?: { loop?: boolean; volume?: number }): void {
    if (!this.Howl) return;
    const howl = new this.Howl({
      src: Array.isArray(src) ? src : [src],
      loop: options?.loop ?? false,
      volume: options?.volume ?? 1,
    });
    this.sounds.set(key, howl);
  }

  playMusic(key: string, options?: MusicOptions): void {
    const howl = this.sounds.get(key) as HowlInstance | undefined;
    if (!howl) return;

    // Stop current music
    if (this.currentMusic) {
      (this.currentMusic.howl as HowlInstance).stop();
    }

    howl.loop(options?.loop ?? true);
    howl.volume((options?.volume ?? 1) * this.musicVolume);
    howl.play();
    this.currentMusic = { key, howl };
  }

  playSfx(key: string, options?: SfxOptions): void {
    const howl = this.sounds.get(key) as HowlInstance | undefined;
    if (!howl) return;

    howl.volume((options?.volume ?? 1) * this.sfxVolume);
    if (options?.pitch) howl.rate(options.pitch);
    howl.play();
  }

  setVolume(type: 'music' | 'sfx', volume: number): void {
    if (type === 'music') {
      this.musicVolume = volume;
      if (this.currentMusic) {
        (this.currentMusic.howl as HowlInstance).volume(volume);
      }
    } else {
      this.sfxVolume = volume;
    }
  }

  pause(): void {
    if (this.currentMusic) {
      (this.currentMusic.howl as HowlInstance).pause();
    }
  }

  resume(): void {
    if (this.currentMusic) {
      (this.currentMusic.howl as HowlInstance).play();
    }
  }

  dispose(): void {
    for (const howl of this.sounds.values()) {
      (howl as HowlInstance).unload();
    }
    this.sounds.clear();
    this.currentMusic = null;
  }
}

/** Minimal Howler interface for typing without importing the lib. */
interface HowlInstance {
  play(): number;
  pause(): void;
  stop(): void;
  volume(v?: number): number;
  loop(v?: boolean): boolean;
  rate(v?: number): number;
  unload(): void;
}
