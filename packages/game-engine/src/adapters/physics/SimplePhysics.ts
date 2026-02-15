import type {
  IPhysicsEngine,
  EntityId,
  BodyConfig,
  Vec2,
  Rect,
  CollisionCallback,
  CollisionEvent,
} from '../../core/types.js';

interface Body {
  entityId: EntityId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius: number;
  isStatic: boolean;
  isSensor: boolean;
  restitution: number;
  friction: number;
  shape: 'rect' | 'circle';
  collisionGroup: number;
  collisionMask: number;
}

/**
 * Lightweight AABB physics engine — no external dependencies.
 * Suitable for simple games that don't need full rigid-body simulation.
 */
export class SimplePhysics implements IPhysicsEngine {
  private bodies: Map<EntityId, Body> = new Map();
  private collisionCallbacks: CollisionCallback[] = [];
  gravity: Vec2 = { x: 0, y: 0 };

  step(dt: number): void {
    // Apply gravity and integrate velocity
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      body.vx += this.gravity.x * dt;
      body.vy += this.gravity.y * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }

    // Broad-phase: check all pairs (fine for <500 bodies)
    const bodyList = [...this.bodies.values()];
    for (let i = 0; i < bodyList.length; i++) {
      for (let j = i + 1; j < bodyList.length; j++) {
        const a = bodyList[i];
        const b = bodyList[j];
        if ((a.collisionMask & (1 << b.collisionGroup)) === 0) continue;
        if ((b.collisionMask & (1 << a.collisionGroup)) === 0) continue;

        const collision = this.checkCollision(a, b);
        if (collision) {
          // Resolve only if neither is a sensor
          if (!a.isSensor && !b.isSensor) {
            this.resolve(a, b, collision);
          }
          // Notify
          const event: CollisionEvent = {
            entityA: a.entityId,
            entityB: b.entityId,
            normal: collision.normal,
            depth: collision.depth,
          };
          for (const cb of this.collisionCallbacks) {
            cb(event);
          }
        }
      }
    }
  }

  addBody(entityId: EntityId, config: BodyConfig, position: Vec2): void {
    const body: Body = {
      entityId,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      width: config.width ?? 0,
      height: config.height ?? 0,
      radius: config.radius ?? 0,
      isStatic: config.isStatic ?? false,
      isSensor: config.isSensor ?? false,
      restitution: config.restitution ?? 0.3,
      friction: config.friction ?? 0.1,
      shape: config.shape === 'circle' ? 'circle' : 'rect',
      collisionGroup: config.collisionGroup ?? 0,
      collisionMask: config.collisionMask ?? 0xFFFFFFFF,
    };
    this.bodies.set(entityId, body);
  }

  removeBody(entityId: EntityId): void {
    this.bodies.delete(entityId);
  }

  onCollision(callback: CollisionCallback): void {
    this.collisionCallbacks.push(callback);
  }

  queryRect(rect: Rect): EntityId[] {
    const result: EntityId[] = [];
    for (const body of this.bodies.values()) {
      if (this.bodyIntersectsRect(body, rect)) {
        result.push(body.entityId);
      }
    }
    return result;
  }

  queryRadius(center: Vec2, radius: number): EntityId[] {
    const r2 = radius * radius;
    const result: EntityId[] = [];
    for (const body of this.bodies.values()) {
      const dx = body.x - center.x;
      const dy = body.y - center.y;
      if (dx * dx + dy * dy <= r2) {
        result.push(body.entityId);
      }
    }
    return result;
  }

  setPosition(entityId: EntityId, position: Vec2): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.x = position.x;
      body.y = position.y;
    }
  }

  getPosition(entityId: EntityId): Vec2 | null {
    const body = this.bodies.get(entityId);
    return body ? { x: body.x, y: body.y } : null;
  }

  setVelocity(entityId: EntityId, velocity: Vec2): void {
    const body = this.bodies.get(entityId);
    if (body) {
      body.vx = velocity.x;
      body.vy = velocity.y;
    }
  }

  getVelocity(entityId: EntityId): Vec2 | null {
    const body = this.bodies.get(entityId);
    return body ? { x: body.vx, y: body.vy } : null;
  }

  dispose(): void {
    this.bodies.clear();
    this.collisionCallbacks.length = 0;
  }

  // ─── Collision Detection ───

  private checkCollision(a: Body, b: Body): { normal: Vec2; depth: number } | null {
    if (a.shape === 'rect' && b.shape === 'rect') {
      return this.aabbVsAabb(a, b);
    }
    if (a.shape === 'circle' && b.shape === 'circle') {
      return this.circleVsCircle(a, b);
    }
    // Mixed: treat both as AABB for simplicity
    return this.aabbVsAabb(a, b);
  }

  private aabbVsAabb(a: Body, b: Body): { normal: Vec2; depth: number } | null {
    const hw_a = a.width / 2, hh_a = a.height / 2;
    const hw_b = b.width / 2, hh_b = b.height / 2;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const overlapX = hw_a + hw_b - Math.abs(dx);
    const overlapY = hh_a + hh_b - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) return null;

    if (overlapX < overlapY) {
      return { normal: { x: dx > 0 ? 1 : -1, y: 0 }, depth: overlapX };
    } else {
      return { normal: { x: 0, y: dy > 0 ? 1 : -1 }, depth: overlapY };
    }
  }

  private circleVsCircle(a: Body, b: Body): { normal: Vec2; depth: number } | null {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist2 = dx * dx + dy * dy;
    const minDist = a.radius + b.radius;

    if (dist2 >= minDist * minDist) return null;

    const dist = Math.sqrt(dist2);
    if (dist === 0) return { normal: { x: 1, y: 0 }, depth: minDist };

    return {
      normal: { x: dx / dist, y: dy / dist },
      depth: minDist - dist,
    };
  }

  private resolve(a: Body, b: Body, collision: { normal: Vec2; depth: number }): void {
    const { normal, depth } = collision;

    // Separate bodies
    if (a.isStatic) {
      b.x += normal.x * depth;
      b.y += normal.y * depth;
    } else if (b.isStatic) {
      a.x -= normal.x * depth;
      a.y -= normal.y * depth;
    } else {
      a.x -= normal.x * depth * 0.5;
      a.y -= normal.y * depth * 0.5;
      b.x += normal.x * depth * 0.5;
      b.y += normal.y * depth * 0.5;
    }

    // Velocity response
    const relVx = b.vx - a.vx;
    const relVy = b.vy - a.vy;
    const dot = relVx * normal.x + relVy * normal.y;
    if (dot > 0) return; // Already separating

    const restitution = Math.min(a.restitution, b.restitution);
    const j = -(1 + restitution) * dot;

    if (!a.isStatic) {
      a.vx -= j * normal.x * 0.5;
      a.vy -= j * normal.y * 0.5;
    }
    if (!b.isStatic) {
      b.vx += j * normal.x * 0.5;
      b.vy += j * normal.y * 0.5;
    }
  }

  private bodyIntersectsRect(body: Body, rect: Rect): boolean {
    if (body.shape === 'circle') {
      const cx = Math.max(rect.x, Math.min(body.x, rect.x + rect.width));
      const cy = Math.max(rect.y, Math.min(body.y, rect.y + rect.height));
      const dx = body.x - cx;
      const dy = body.y - cy;
      return dx * dx + dy * dy <= body.radius * body.radius;
    }
    const hw = body.width / 2, hh = body.height / 2;
    return !(
      body.x + hw < rect.x ||
      body.x - hw > rect.x + rect.width ||
      body.y + hh < rect.y ||
      body.y - hh > rect.y + rect.height
    );
  }
}
