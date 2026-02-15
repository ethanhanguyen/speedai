import {
  System,
  ComponentFactory,
  type EntityId,
} from '@speedai/game-engine';

const SPAWN_INTERVAL = 1.5;
const SPAWN_X = 425;
const GAP = 150;
const MIN_Y_OFFSET = -100;
const MAX_Y_OFFSET = 100;
const PIPE_WIDTH = 52;
const PIPE_HEIGHT = 320;
const BASE_Y = 333;

export class PipeSpawnerSystem extends System {
  private timer = 0;
  private isActive = false;

  constructor() {
    super('PipeSpawner', [], 0);
  }

  start(): void {
    this.isActive = true;
    this.timer = 0;
  }

  stop(): void {
    this.isActive = false;
  }

  update(dt: number): void {
    if (!this.isActive) return;

    this.timer += dt;

    if (this.timer >= SPAWN_INTERVAL) {
      this.timer -= SPAWN_INTERVAL;
      this.spawnPipePair();
    }
  }

  private spawnPipePair(): void {
    const yOffset = MIN_Y_OFFSET + Math.random() * (MAX_Y_OFFSET - MIN_Y_OFFSET);
    const gapCenter = BASE_Y + yOffset;

    // Top pipe
    const topPipe = this.entities.create();
    this.entities.addComponent(topPipe, 'Position', ComponentFactory.position(SPAWN_X, gapCenter - GAP / 2 - PIPE_HEIGHT / 2));
    this.entities.addComponent(topPipe, 'Velocity', ComponentFactory.velocity(0, 0));
    this.entities.addComponent(topPipe, 'Sprite', ComponentFactory.sprite('pipe', PIPE_WIDTH, PIPE_HEIGHT));
    this.entities.addComponent(topPipe, 'Tag', new Set(['pipe', 'scroll', 'obstacle']));

    // Bottom pipe
    const bottomPipe = this.entities.create();
    this.entities.addComponent(bottomPipe, 'Position', ComponentFactory.position(SPAWN_X, gapCenter + GAP / 2 + PIPE_HEIGHT / 2));
    this.entities.addComponent(bottomPipe, 'Velocity', ComponentFactory.velocity(0, 0));
    const bottomSprite = ComponentFactory.sprite('pipe', PIPE_WIDTH, PIPE_HEIGHT);
    bottomSprite.scaleY = -1; // Flip vertically
    this.entities.addComponent(bottomPipe, 'Sprite', bottomSprite);
    this.entities.addComponent(bottomPipe, 'Tag', new Set(['scroll', 'obstacle']));
  }
}
