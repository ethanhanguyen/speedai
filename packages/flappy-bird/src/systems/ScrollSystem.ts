import {
  System,
  type PositionComponent,
  type VelocityComponent,
  type EntityId,
} from '@speedai/game-engine';
import type { BirdComponent } from '../components/Bird.js';

const SCROLL_SPEED = -120;
const GROUND_WRAP_X = -168;
const GROUND_RESET_X = 504;
const PIPE_DESPAWN_X = -52;

export class ScrollSystem extends System {
  private groundEntities: Set<EntityId> = new Set();

  constructor() {
    super('Scroll', ['Tag', 'Position', 'Velocity'], 5);
  }

  update(_dt: number): void {
    // Check if bird is dead - stop scrolling if so
    const birdEntities = this.entities.query('Bird');
    let shouldScroll = true;
    for (const id of birdEntities) {
      const bird = this.entities.getComponent<BirdComponent>(id, 'Bird');
      if (bird?.isDead) {
        shouldScroll = false;
        break;
      }
    }

    const entities = this.query();

    for (const id of entities) {
      const tags = this.entities.getComponent<Set<string>>(id, 'Tag');
      if (!tags?.has('scroll')) continue;

      const position = this.entities.getComponent<PositionComponent>(id, 'Position');
      const velocity = this.entities.getComponent<VelocityComponent>(id, 'Velocity');

      if (!position || !velocity) continue;

      // Set scroll velocity
      velocity.vx = shouldScroll ? SCROLL_SPEED : 0;

      // Ground wrapping
      if (tags.has('ground')) {
        this.groundEntities.add(id);
        if (position.x < GROUND_WRAP_X) {
          position.x = GROUND_RESET_X;
        }
      }

      // Pipe despawning (both top and bottom pipes have 'obstacle' tag)
      if (tags.has('obstacle') && position.x < PIPE_DESPAWN_X) {
        this.entities.destroy(id);
      }
    }
  }
}
