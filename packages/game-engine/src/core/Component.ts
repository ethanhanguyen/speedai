import type {
  PositionComponent,
  VelocityComponent,
  SpriteComponent,
  PhysicsBodyComponent,
} from './types.js';

/** Component type name constants. */
export const ComponentType = {
  Position: 'Position',
  Velocity: 'Velocity',
  Sprite: 'Sprite',
  PhysicsBody: 'PhysicsBody',
  Tween: 'Tween',
  Score: 'Score',
  Health: 'Health',
  Timer: 'Timer',
  Sound: 'Sound',
  Tag: 'Tag',
} as const;

/** Factory functions that create default component data. Zero-alloc friendly. */
export const ComponentFactory = {
  position(x = 0, y = 0): PositionComponent {
    return { x, y };
  },

  velocity(vx = 0, vy = 0): VelocityComponent {
    return { vx, vy };
  },

  sprite(key: string, width = 0, height = 0): SpriteComponent {
    return {
      key,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      alpha: 1,
      anchorX: 0.5,
      anchorY: 0.5,
      visible: true,
      dirty: true,
      zIndex: 0,
      textureId: 0,
    };
  },

  physicsBody(isStatic = false): PhysicsBodyComponent {
    return {
      bodyId: '',
      isStatic,
      isSensor: false,
      restitution: 0.3,
      friction: 0.1,
      density: 1,
      collisionGroup: 0,
      collisionMask: 0xFFFFFFFF,
    };
  },
};

/**
 * ComponentPool: reuse component objects to avoid GC pressure.
 */
export class ComponentPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, prealloc = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prealloc; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    const item = this.pool.pop() ?? this.factory();
    this.reset(item);
    return item;
  }

  release(item: T): void {
    this.pool.push(item);
  }

  get size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool.length = 0;
  }
}
