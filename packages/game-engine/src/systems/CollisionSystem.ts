import { System } from '../core/System.js';
import { EventEmitter } from '../core/EventEmitter.js';
import type { EntityId, Rect } from '../core/types.js';
import { ComponentType } from '../core/Component.js';

export interface CollisionPair {
  a: EntityId;
  b: EntityId;
}

/**
 * Simple AABB collision detection between positioned+sized entities.
 * Supports collision layers (groups) and emits events.
 * For physics-based collision use the physics adapter instead.
 */
export class CollisionSystem extends System {
  readonly events = new EventEmitter();

  /** Active collisions from last frame. Used to detect enter/exit. */
  private activePairs: Set<string> = new Set();

  constructor() {
    super('CollisionSystem', [ComponentType.Position], 250);
  }

  update(_dt: number): void {
    const ids = this.query();
    const newPairs = new Set<string>();

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];

        if (this.checkOverlap(a, b)) {
          const key = pairKey(a, b);
          newPairs.add(key);

          if (!this.activePairs.has(key)) {
            this.events.emit('collisionEnter', { a, b });
          }
          this.events.emit('collision', { a, b });
        }
      }
    }

    // Detect exits
    for (const key of this.activePairs) {
      if (!newPairs.has(key)) {
        const [a, b] = key.split(':').map(Number);
        this.events.emit('collisionExit', { a, b });
      }
    }

    this.activePairs = newPairs;
  }

  /** Check if two entities are currently overlapping. */
  checkOverlap(a: EntityId, b: EntityId): boolean {
    const posA = this.entities.getComponent<{ x: number; y: number }>(a, ComponentType.Position);
    const posB = this.entities.getComponent<{ x: number; y: number }>(b, ComponentType.Position);
    if (!posA || !posB) return false;

    const sprA = this.entities.getComponent<{ width: number; height: number; anchorX: number; anchorY: number }>(a, ComponentType.Sprite);
    const sprB = this.entities.getComponent<{ width: number; height: number; anchorX: number; anchorY: number }>(b, ComponentType.Sprite);

    const wA = sprA?.width ?? 0;
    const hA = sprA?.height ?? 0;
    const wB = sprB?.width ?? 0;
    const hB = sprB?.height ?? 0;
    const axA = sprA?.anchorX ?? 0.5;
    const ayA = sprA?.anchorY ?? 0.5;
    const axB = sprB?.anchorX ?? 0.5;
    const ayB = sprB?.anchorY ?? 0.5;

    const rectA: Rect = { x: posA.x - wA * axA, y: posA.y - hA * ayA, width: wA, height: hA };
    const rectB: Rect = { x: posB.x - wB * axB, y: posB.y - hB * ayB, width: wB, height: hB };

    return aabbOverlap(rectA, rectB);
  }

  dispose(): void {
    this.activePairs.clear();
    this.events.clear();
  }
}

function pairKey(a: EntityId, b: EntityId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function aabbOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
