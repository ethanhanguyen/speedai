import { Scene } from './Scene.js';
import type { EntityManager } from '../core/Entity.js';
import { EventEmitter } from '../core/EventEmitter.js';

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down';

export interface TransitionConfig {
  type: TransitionType;
  duration: number;
}

/**
 * Manages scene stack and transitions.
 */
export class SceneManager extends EventEmitter {
  private scenes: Map<string, Scene> = new Map();
  private stack: Scene[] = [];
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    super();
    this.entityManager = entityManager;
  }

  /** Register a scene for later use. */
  register(scene: Scene): this {
    scene.bind(this.entityManager);
    this.scenes.set(scene.name, scene);
    return this;
  }

  /** Get a registered scene by name. */
  get(name: string): Scene | undefined {
    return this.scenes.get(name);
  }

  /** Switch to a scene, destroying the current one. */
  switchTo(name: string, _transition?: TransitionConfig): Scene {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene not found: ${name}`);

    // Destroy current scene
    const current = this.current;
    if (current) {
      current.destroy();
      const idx = this.stack.indexOf(current);
      if (idx !== -1) this.stack.splice(idx, 1);
    }

    scene.init();
    this.stack.push(scene);
    this.emit('switch', name, scene);
    return scene;
  }

  /** Push a scene on top (e.g. pause overlay). */
  push(name: string): Scene {
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene not found: ${name}`);

    // Pause current
    this.current?.pause();

    scene.init();
    this.stack.push(scene);
    this.emit('push', name, scene);
    return scene;
  }

  /** Pop the top scene, resuming the one below. */
  pop(): Scene | undefined {
    const popped = this.stack.pop();
    if (popped) {
      popped.destroy();
      this.emit('pop', popped.name);
    }
    this.current?.resume();
    return popped;
  }

  get current(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get depth(): number {
    return this.stack.length;
  }

  dispose(): void {
    for (const scene of this.stack) {
      scene.destroy();
    }
    this.stack.length = 0;
    this.scenes.clear();
    this.clear();
  }
}
