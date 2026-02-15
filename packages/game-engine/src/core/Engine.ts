import { EntityManager } from './Entity.js';
import { System } from './System.js';
import { EventEmitter } from './EventEmitter.js';
import type {
  EngineConfig,
  IRenderer,
  IPhysicsEngine,
  ISoundManager,
  IInputManager,
  IScene,
  DebugConfig,
  ErrorHandler,
} from './types.js';

export type EngineState = 'stopped' | 'running' | 'paused';

class DefaultErrorHandler implements ErrorHandler {
  handle(error: Error): void {
    console.error('[Engine]', error);
  }
  isFatal(_error: Error): boolean {
    return false;
  }
  async report(_error: Error): Promise<void> {
    // no-op
  }
}

function resolveCanvas(target: HTMLCanvasElement | string): HTMLCanvasElement {
  if (typeof target === 'string') {
    const el = document.querySelector<HTMLCanvasElement>(target);
    if (!el) throw new Error(`Canvas element not found: ${target}`);
    return el;
  }
  return target;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

export class Engine extends EventEmitter {
  // ─── Public state ───
  readonly entities: EntityManager;
  state: EngineState = 'stopped';
  timeScale: number = 1;

  // ─── Adapters ───
  renderer!: IRenderer;
  physics: IPhysicsEngine | null = null;
  sound: ISoundManager | null = null;
  input: IInputManager | null = null;

  // ─── Systems ───
  private _systems: System[] = [];

  // ─── Scene ───
  private currentScene: IScene | null = null;

  // ─── Loop ───
  private readonly fixedDt: number;
  private readonly maxFrameTime: number = 250;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private rafId: number = 0;

  // ─── Config ───
  private readonly canvas: HTMLCanvasElement;
  readonly debugConfig: DebugConfig | null;
  private readonly pauseOnBlur: boolean;
  private readonly errorHandler: ErrorHandler;

  // ─── Debug stats ───
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  currentFPS: number = 0;

  constructor(config: EngineConfig) {
    super();
    this.canvas = resolveCanvas(config.canvas);
    this.entities = new EntityManager(config.maxEntities ?? 10_000);
    this.fixedDt = 1000 / (config.targetFPS ?? 60);
    this.pauseOnBlur = config.pauseOnBlur ?? true;
    this.errorHandler = config.errorHandler ?? new DefaultErrorHandler();

    // Debug
    if (config.debug === true) {
      this.debugConfig = {
        showFPS: true,
        showEntityCount: true,
        showPhysicsDebug: false,
        showHitboxes: false,
        logEvents: false,
        inspector: false,
      };
    } else if (config.debug && typeof config.debug === 'object') {
      this.debugConfig = config.debug;
    } else {
      this.debugConfig = null;
    }

    // Adapters
    if (config.renderer) {
      this.renderer = config.renderer;
      this.renderer.init(this.canvas);
    }
    if (config.physics) this.physics = config.physics;
    if (config.sound) this.sound = config.sound;
    if (config.input) this.input = config.input;

    // Resize
    if (config.autoResize !== false) {
      const w = config.width ?? this.canvas.width;
      const h = config.height ?? this.canvas.height;
      this.renderer?.resize(w, h);

      window.addEventListener(
        'resize',
        debounce(() => {
          this.renderer?.resize(window.innerWidth, window.innerHeight);
          this.emit('resize', { width: window.innerWidth, height: window.innerHeight });
        }, 100),
      );
    }

    // Visibility
    if (this.pauseOnBlur) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.onBackground();
        } else {
          this.onForeground();
        }
      });
    }

    // Save on exit
    window.addEventListener('beforeunload', () => {
      this.emit('beforeunload');
    });

    // Global error boundary
    window.onerror = (_msg, _src, _line, _col, err) => {
      this.handleError(err ?? new Error(String(_msg)));
      return true;
    };
    window.onunhandledrejection = (e) => {
      this.handleError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
    };
  }

  // ─── Systems ───

  addSystem(system: System): this {
    system.init(this.entities);
    this._systems.push(system);
    this._systems.sort((a, b) => a.priority - b.priority);
    return this;
  }

  removeSystem(name: string): this {
    const idx = this._systems.findIndex(s => s.name === name);
    if (idx !== -1) {
      this._systems[idx].dispose();
      this._systems.splice(idx, 1);
    }
    return this;
  }

  getSystem<T extends System>(name: string): T | undefined {
    return this._systems.find(s => s.name === name) as T | undefined;
  }

  get systems(): readonly System[] {
    return this._systems;
  }

  // ─── Scene ───

  setScene(scene: IScene): void {
    if (this.currentScene) {
      this.currentScene.destroy?.();
    }
    this.currentScene = scene;
    scene.init?.();
    this.emit('sceneChange', scene);
  }

  get scene(): IScene | null {
    return this.currentScene;
  }

  // ─── Lifecycle ───

  start(): void {
    if (this.state === 'running') return;
    this.state = 'running';
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.input?.enable();
    this.loop();
    this.emit('start');
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    cancelAnimationFrame(this.rafId);
    this.sound?.pause();
    this.emit('pause');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.sound?.resume();
    this.loop();
    this.emit('resume');
  }

  stop(): void {
    if (this.state === 'stopped') return;
    this.state = 'stopped';
    cancelAnimationFrame(this.rafId);
    this.input?.disable();
    this.emit('stop');
  }

  /** Advance exactly one fixed step (useful for debugging). */
  stepOnce(): void {
    this.fixedUpdate(this.fixedDt / 1000);
    this.render(1);
  }

  dispose(): void {
    this.stop();
    this._systems.forEach(s => s.dispose());
    this._systems.length = 0;
    this.currentScene?.destroy?.();
    this.currentScene = null;
    this.renderer?.dispose();
    this.physics?.dispose();
    this.sound?.dispose();
    this.input?.disable();
    this.entities.clear();
    this.clear(); // EventEmitter.clear()
  }

  // ─── Game Loop (Fixed Timestep) ───

  private loop = (): void => {
    if (this.state !== 'running') return;

    try {
      const now = performance.now();
      const frameTime = Math.min(now - this.lastTime, this.maxFrameTime);
      this.lastTime = now;
      this.accumulator += frameTime * this.timeScale;

      // Fixed timestep for physics/logic (deterministic)
      while (this.accumulator >= this.fixedDt) {
        this.fixedUpdate(this.fixedDt / 1000);
        this.accumulator -= this.fixedDt;
      }

      // Variable timestep for rendering (smooth interpolation)
      const alpha = this.accumulator / this.fixedDt;
      this.render(alpha);

      // FPS tracking
      this.frameCount++;
      this.fpsTimer += frameTime;
      if (this.fpsTimer >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.fpsTimer -= 1000;
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number): void {
    this.input?.update();
    this.physics?.step(dt);
    for (const system of this._systems) {
      if (system.enabled) {
        system.update(dt);
      }
    }
    this.currentScene?.update?.(dt);
    this.emit('update', dt);
  }

  private render(alpha: number): void {
    if (this.currentScene) {
      this.renderer?.render(this.currentScene, alpha);
    }
    this.currentScene?.render?.(alpha);
    this.emit('render', alpha);
  }

  // ─── Visibility ───

  private onBackground(): void {
    if (this.state === 'running') {
      this.pause();
    }
  }

  private onForeground(): void {
    this.sound?.resume();
    this.emit('foreground');
  }

  // ─── Errors ───

  private handleError(error: Error): void {
    this.errorHandler.handle(error);
    if (this.errorHandler.isFatal(error)) {
      this.pause();
      this.emit('fatalError', error);
    }
  }
}
