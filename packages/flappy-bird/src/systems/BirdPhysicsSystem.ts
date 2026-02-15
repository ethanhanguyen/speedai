import { System, type VelocityComponent, type SpriteComponent } from '@speedai/game-engine';
import type { BirdComponent } from '../components/Bird.js';

const GRAVITY = 980;
const MIN_ROTATION = -30 * (Math.PI / 180);
const MAX_ROTATION = 90 * (Math.PI / 180);

export class BirdPhysicsSystem extends System {
  constructor() {
    super('BirdPhysics', ['Bird', 'Velocity', 'Sprite'], 10);
  }

  update(dt: number): void {
    const entities = this.query();

    for (const id of entities) {
      const bird = this.entities.getComponent<BirdComponent>(id, 'Bird');
      const velocity = this.entities.getComponent<VelocityComponent>(id, 'Velocity');
      const sprite = this.entities.getComponent<SpriteComponent>(id, 'Sprite');

      if (!bird || !velocity || !sprite) continue;
      if (bird.isDead) continue;

      // Apply gravity
      velocity.vy += GRAVITY * dt;

      // Update rotation based on velocity
      const targetRotation = velocity.vy > 0
        ? Math.min(MAX_ROTATION, velocity.vy * 0.002)
        : MIN_ROTATION;

      sprite.rotation += (targetRotation - sprite.rotation) * bird.rotationSpeed * dt;
      sprite.rotation = Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, sprite.rotation));
    }
  }
}
