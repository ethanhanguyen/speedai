import type { EntityManager } from './Entity.js';
import type { EntityId } from './types.js';

/**
 * Base class for all ECS systems.
 * Systems operate on entities matching their required component types.
 */
export abstract class System {
  readonly name: string;
  readonly requiredComponents: string[];
  priority: number;
  enabled: boolean = true;

  protected entities!: EntityManager;

  constructor(name: string, requiredComponents: string[] = [], priority = 0) {
    this.name = name;
    this.requiredComponents = requiredComponents;
    this.priority = priority;
  }

  /** Called once when the system is added to the engine. */
  init(entities: EntityManager): void {
    this.entities = entities;
  }

  /** Called every fixed timestep. */
  abstract update(dt: number): void;

  /** Query matching entities. */
  protected query(): EntityId[] {
    return this.entities.query(...this.requiredComponents);
  }

  /** Optional cleanup. */
  dispose(): void {
    // Override in subclasses
  }
}
