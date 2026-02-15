import {
  System,
  type PositionComponent,
  type VelocityComponent,
} from '@speedai/game-engine';

export class VelocityIntegrationSystem extends System {
  constructor() {
    super('VelocityIntegration', ['Position', 'Velocity'], 20);
  }

  update(dt: number): void {
    const entities = this.query();

    for (const id of entities) {
      const position = this.entities.getComponent<PositionComponent>(id, 'Position');
      const velocity = this.entities.getComponent<VelocityComponent>(id, 'Velocity');

      if (!position || !velocity) continue;

      position.x += velocity.vx * dt;
      position.y += velocity.vy * dt;
    }
  }
}
