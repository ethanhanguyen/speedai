import type { EntityId, IScene } from '../core/types.js';
import type { EntityManager } from '../core/Entity.js';
import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Base Scene class with entity tracking and lifecycle hooks.
 */
export abstract class Scene extends EventEmitter implements IScene {
  readonly name: string;
  private _entities: Set<EntityId> = new Set();
  protected entityManager!: EntityManager;

  constructor(name: string) {
    super();
    this.name = name;
  }

  get entities(): ReadonlySet<EntityId> {
    return this._entities;
  }

  /** Called by SceneManager to inject the entity manager. */
  bind(entityManager: EntityManager): void {
    this.entityManager = entityManager;
  }

  /** Create an entity owned by this scene. */
  protected createEntity(): EntityId {
    const id = this.entityManager.create();
    this._entities.add(id);
    return id;
  }

  /** Destroy an entity owned by this scene. */
  protected destroyEntity(id: EntityId): void {
    this.entityManager.destroy(id);
    this._entities.delete(id);
  }

  /** Destroy all entities owned by this scene. */
  protected destroyAllEntities(): void {
    for (const id of this._entities) {
      this.entityManager.destroy(id);
    }
    this._entities.clear();
  }

  // ─── Lifecycle (override in subclasses) ───

  init(): void {}
  update(_dt: number): void {}
  render(_alpha: number): void {}
  pause(): void {}
  resume(): void {}

  destroy(): void {
    this.destroyAllEntities();
    this.clear(); // EventEmitter.clear()
  }
}
