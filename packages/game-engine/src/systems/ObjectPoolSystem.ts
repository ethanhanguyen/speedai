import { System } from '../core/System.js';
import type { EntityId, ComponentData } from '../core/types.js';

export interface PoolConfig {
  name: string;
  maxSize: number;
  /** Component templates to add when acquiring from pool. */
  components: { type: string; data: () => ComponentData }[];
}

interface Pool {
  name: string;
  maxSize: number;
  active: Set<EntityId>;
  inactive: EntityId[];
  components: { type: string; data: () => ComponentData }[];
}

/**
 * Entity recycling via named pools. Zero-allocation in the game loop.
 */
export class ObjectPoolSystem extends System {
  private pools: Map<string, Pool> = new Map();

  constructor() {
    super('ObjectPoolSystem', [], 50);
  }

  /** Register a named pool. */
  registerPool(config: PoolConfig): void {
    this.pools.set(config.name, {
      name: config.name,
      maxSize: config.maxSize,
      active: new Set(),
      inactive: [],
      components: config.components,
    });
  }

  /** Preallocate entities into the pool. */
  preallocate(poolName: string, count: number): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;
    for (let i = 0; i < count; i++) {
      if (pool.inactive.length + pool.active.size >= pool.maxSize) break;
      const id = this.entities.create();
      pool.inactive.push(id);
    }
  }

  /** Get an entity from the pool. Returns null if pool is full. */
  acquire(poolName: string): EntityId | null {
    const pool = this.pools.get(poolName);
    if (!pool) return null;
    if (pool.active.size >= pool.maxSize) return null;

    let id: EntityId;
    if (pool.inactive.length > 0) {
      id = pool.inactive.pop()!;
    } else {
      id = this.entities.create();
    }

    // Attach template components
    for (const comp of pool.components) {
      this.entities.addComponent(id, comp.type, comp.data());
    }

    pool.active.add(id);
    return id;
  }

  /** Return an entity to the pool for reuse. */
  release(poolName: string, id: EntityId): void {
    const pool = this.pools.get(poolName);
    if (!pool || !pool.active.has(id)) return;

    pool.active.delete(id);

    // Strip all components
    for (const comp of pool.components) {
      this.entities.removeComponent(id, comp.type);
    }

    pool.inactive.push(id);
  }

  /** Release all active entities in a pool. */
  releaseAll(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;
    for (const id of pool.active) {
      for (const comp of pool.components) {
        this.entities.removeComponent(id, comp.type);
      }
      pool.inactive.push(id);
    }
    pool.active.clear();
  }

  getActiveCount(poolName: string): number {
    return this.pools.get(poolName)?.active.size ?? 0;
  }

  getInactiveCount(poolName: string): number {
    return this.pools.get(poolName)?.inactive.length ?? 0;
  }

  update(_dt: number): void {
    // Pool management is on-demand, no per-frame work needed
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      for (const id of pool.active) {
        this.entities.destroy(id);
      }
      for (const id of pool.inactive) {
        this.entities.destroy(id);
      }
    }
    this.pools.clear();
  }
}
