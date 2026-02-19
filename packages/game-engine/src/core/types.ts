// ─── Primitives ───

export type EntityId = number;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Component Types ───

export interface ComponentData {
  [key: string]: unknown;
}

export interface PositionComponent {
  x: number;
  y: number;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
}

export interface SpriteComponent {
  key: string;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  anchorX: number;
  anchorY: number;
  visible: boolean;
  dirty: boolean;
  zIndex: number;
  textureId: number;
}

export interface HealthComponent {
  current: number;
  max: number;
}

export interface PhysicsBodyComponent {
  bodyId: string;
  isStatic: boolean;
  isSensor: boolean;
  restitution: number;
  friction: number;
  density: number;
  collisionGroup: number;
  collisionMask: number;
}

// ─── Adapter Interfaces ───

export interface IRenderer {
  init(canvas: HTMLCanvasElement): void;
  render(scene: IScene, alpha: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
  batch(sprites: SpriteComponent[]): void;
  setDirty(entityId: EntityId): void;
  readonly drawCalls: number;
}

export interface BodyConfig {
  isStatic?: boolean;
  isSensor?: boolean;
  restitution?: number;
  friction?: number;
  density?: number;
  collisionGroup?: number;
  collisionMask?: number;
  shape?: 'rect' | 'circle' | { type: 'polygon'; vertices: Vec2[] };
  width?: number;
  height?: number;
  radius?: number;
}

export interface CollisionEvent {
  entityA: EntityId;
  entityB: EntityId;
  normal: Vec2;
  depth: number;
}

export type CollisionCallback = (event: CollisionEvent) => void;

export interface IPhysicsEngine {
  step(dt: number): void;
  addBody(entityId: EntityId, config: BodyConfig, position: Vec2): void;
  removeBody(entityId: EntityId): void;
  onCollision(callback: CollisionCallback): void;
  queryRect(rect: Rect): EntityId[];
  queryRadius(center: Vec2, radius: number): EntityId[];
  setPosition(entityId: EntityId, position: Vec2): void;
  getPosition(entityId: EntityId): Vec2 | null;
  setVelocity(entityId: EntityId, velocity: Vec2): void;
  getVelocity(entityId: EntityId): Vec2 | null;
  dispose(): void;
}

export interface MusicOptions {
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
}

export interface SfxOptions {
  volume?: number;
  pitch?: number;
  pan?: number;
}

export interface ISoundManager {
  playMusic(key: string, options?: MusicOptions): void;
  playSfx(key: string, options?: SfxOptions): void;
  setVolume(type: 'music' | 'sfx', volume: number): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

export type GestureType = 'tap' | 'swipe' | 'pinch' | 'longpress';

export interface GestureEvent {
  type: GestureType;
  x: number;
  y: number;
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export type GestureCallback = (event: GestureEvent) => void;

export interface IInputManager {
  isPressed(key: string): boolean;
  isJustPressed(key: string): boolean;
  getPointer(): { x: number; y: number; down: boolean };
  onGesture(type: GestureType, callback: GestureCallback): void;
  offGesture(type: GestureType, callback: GestureCallback): void;
  enable(): void;
  disable(): void;
  update(): void;
}

// ─── Scene Interface ───

export interface IScene {
  readonly name: string;
  readonly entities: ReadonlySet<EntityId>;
  init?(): void;
  update?(dt: number): void;
  render?(alpha: number): void;
  destroy?(): void;
  pause?(): void;
  resume?(): void;
}

// ─── Poolable ───

export interface Poolable {
  reset(): void;
  onRelease(): void;
  dispose(): void;
}

// ─── Error Handling ───

export interface ErrorHandler {
  handle(error: Error): void;
  isFatal(error: Error): boolean;
  report(error: Error): Promise<void>;
}

// ─── Debug ───

export interface DebugConfig {
  showFPS: boolean;
  showEntityCount: boolean;
  showPhysicsDebug: boolean;
  showHitboxes: boolean;
  logEvents: boolean;
  inspector: boolean;
}

// ─── Engine Config ───

export interface EngineConfig {
  canvas: HTMLCanvasElement | string;
  width?: number;
  height?: number;
  pixelRatio?: number;

  renderer?: IRenderer;
  physics?: IPhysicsEngine | null;
  sound?: ISoundManager | null;
  input?: IInputManager | null;

  targetFPS?: number;
  fixedTimestep?: number;
  maxFrameSkip?: number;
  renderInterpolation?: boolean;

  maxEntities?: number;

  debug?: boolean | DebugConfig;
  pauseOnBlur?: boolean;
  autoResize?: boolean;

  errorHandler?: ErrorHandler;
}

// ─── Events ───

export type EventCallback = (...args: unknown[]) => void;
