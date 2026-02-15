import type { EntityId, ComponentData } from './types.js';

/**
 * Entity manager using a sparse set for O(1) operations.
 * Entities are plain numeric IDs; components are stored externally in typed maps.
 */
export class EntityManager {
  private nextId: EntityId = 0;
  private alive: Set<EntityId> = new Set();
  private recycled: EntityId[] = [];
  private components: Map<string, Map<EntityId, ComponentData>> = new Map();
  private readonly maxEntities: number;

  constructor(maxEntities: number = 10_000) {
    this.maxEntities = maxEntities;
  }

  create(): EntityId {
    if (this.alive.size >= this.maxEntities) {
      throw new Error(`Entity limit reached (${this.maxEntities})`);
    }
    const id = this.recycled.pop() ?? this.nextId++;
    this.alive.add(id);
    return id;
  }

  destroy(id: EntityId): void {
    if (!this.alive.has(id)) return;
    // Remove all components
    for (const store of this.components.values()) {
      store.delete(id);
    }
    this.alive.delete(id);
    this.recycled.push(id);
  }

  isAlive(id: EntityId): boolean {
    return this.alive.has(id);
  }

  addComponent<T extends ComponentData>(id: EntityId, type: string, data: T): void {
    if (!this.alive.has(id)) return;
    let store = this.components.get(type);
    if (!store) {
      store = new Map();
      this.components.set(type, store);
    }
    store.set(id, data);
  }

  removeComponent(id: EntityId, type: string): void {
    this.components.get(type)?.delete(id);
  }

  getComponent<T extends ComponentData>(id: EntityId, type: string): T | undefined {
    return this.components.get(type)?.get(id) as T | undefined;
  }

  hasComponent(id: EntityId, type: string): boolean {
    return this.components.get(type)?.has(id) ?? false;
  }

  /** Query entities that have ALL specified component types. */
  query(...types: string[]): EntityId[] {
    if (types.length === 0) return [...this.alive];

    const stores = types.map(t => this.components.get(t));
    if (stores.some(s => !s)) return [];

    // Start with the smallest store for efficiency
    const sortedStores = stores
      .filter((s): s is Map<EntityId, ComponentData> => !!s)
      .sort((a, b) => a.size - b.size);

    const result: EntityId[] = [];
    const smallest = sortedStores[0];
    const rest = sortedStores.slice(1);

    for (const id of smallest.keys()) {
      if (this.alive.has(id) && rest.every(s => s.has(id))) {
        result.push(id);
      }
    }
    return result;
  }

  get count(): number {
    return this.alive.size;
  }

  getAllAlive(): ReadonlySet<EntityId> {
    return this.alive;
  }

  clear(): void {
    this.alive.clear();
    this.recycled.length = 0;
    this.components.clear();
    this.nextId = 0;
  }
}
