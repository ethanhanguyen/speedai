import {
  Scene,
  ComponentFactory,
  type EntityId,
  type VelocityComponent,
  type PositionComponent,
} from '@speedai/game-engine';
import type { BirdComponent } from '../components/Bird.js';
import { createBirdComponent } from '../components/Bird.js';
import type { PipeSpawnerSystem } from '../systems/PipeSpawnerSystem.js';

export class GameplayScene extends Scene {
  private birdId!: EntityId;
  private score = 0;
  private passedPipes = new Set<EntityId>();
  private pipeSpawner!: PipeSpawnerSystem;
  private isGameOver = false;
  private wasPointerDown = false;
  private gameOverTimer = 0;

  constructor(pipeSpawner: PipeSpawnerSystem) {
    super('Gameplay');
    this.pipeSpawner = pipeSpawner;
  }

  init(): void {
    this.score = 0;
    this.passedPipes.clear();
    this.isGameOver = false;
    this.wasPointerDown = false;
    this.gameOverTimer = 0;

    // Clean up ALL entities from previous game to ensure clean slate
    const allEntities = this.entityManager.query();
    for (const id of allEntities) {
      this.entityManager.destroy(id);
    }

    // Background
    const bg = this.createEntity();
    this.entityManager.addComponent(bg, 'Position', ComponentFactory.position(187.5, 333.5));
    this.entityManager.addComponent(bg, 'Sprite', ComponentFactory.sprite('bg', 375, 667));

    // Ground tiles
    const ground1 = this.createEntity();
    this.entityManager.addComponent(ground1, 'Position', ComponentFactory.position(168, 611));
    this.entityManager.addComponent(ground1, 'Velocity', ComponentFactory.velocity(0, 0));
    this.entityManager.addComponent(ground1, 'Sprite', ComponentFactory.sprite('ground', 336, 112));
    this.entityManager.addComponent(ground1, 'Tag', new Set(['ground', 'scroll']));

    const ground2 = this.createEntity();
    this.entityManager.addComponent(ground2, 'Position', ComponentFactory.position(168 + 336, 611));
    this.entityManager.addComponent(ground2, 'Velocity', ComponentFactory.velocity(0, 0));
    this.entityManager.addComponent(ground2, 'Sprite', ComponentFactory.sprite('ground', 336, 112));
    this.entityManager.addComponent(ground2, 'Tag', new Set(['ground', 'scroll']));

    // Bird
    this.birdId = this.createEntity();
    this.entityManager.addComponent(this.birdId, 'Position', ComponentFactory.position(100, 333));
    this.entityManager.addComponent(this.birdId, 'Velocity', ComponentFactory.velocity(0, 0));
    this.entityManager.addComponent(this.birdId, 'Sprite', ComponentFactory.sprite('bird', 34, 24));
    this.entityManager.addComponent(this.birdId, 'Bird', createBirdComponent());
    this.entityManager.addComponent(this.birdId, 'Tag', new Set(['player']));

    // Start pipe spawning
    this.pipeSpawner.start();
  }

  update(dt: number): void {
    const bird = this.entityManager.getComponent<BirdComponent>(this.birdId, 'Bird');
    if (!bird) return;

    // Handle game over transition
    if (bird.isDead) {
      this.gameOverTimer += dt;
      if (this.gameOverTimer >= 0.5) {
        this.emit('gameOver', this.score);
        this.emit('changeScene', 'GameOver');
      }
      return;
    }

    // Handle input (flap)
    const engine = (globalThis as any).gameEngine;
    const pointerDown = engine?.input?.getPointer().down ?? false;
    const pointerJustPressed = pointerDown && !this.wasPointerDown;
    this.wasPointerDown = pointerDown;

    if (engine?.input?.isJustPressed(' ') || pointerJustPressed) {
      const velocity = this.entityManager.getComponent<VelocityComponent>(this.birdId, 'Velocity');
      if (velocity) {
        velocity.vy = bird.flapVelocity;
      }
    }

    // Score tracking
    this.updateScore();

    // Collision detection (manual AABB)
    this.checkCollisions();
  }

  render(_alpha: number): void {
    const canvas = document.querySelector('#game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    // Draw score
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeText(`${this.score}`, 187.5, 50);
    ctx.fillText(`${this.score}`, 187.5, 50);
    ctx.restore();
  }

  private updateScore(): void {
    const birdPos = this.entityManager.getComponent<PositionComponent>(this.birdId, 'Position');
    if (!birdPos) return;

    // Purge destroyed entity IDs so recycled IDs aren't wrongly skipped
    for (const id of this.passedPipes) {
      if (!this.entityManager.isAlive(id)) {
        this.passedPipes.delete(id);
      }
    }

    const allEntities = this.entityManager.query('Tag', 'Position');
    for (const id of allEntities) {
      const tags = this.entityManager.getComponent<Set<string>>(id, 'Tag');
      if (!tags?.has('pipe')) continue;
      if (this.passedPipes.has(id)) continue;

      const pipePos = this.entityManager.getComponent<PositionComponent>(id, 'Position');
      if (pipePos && birdPos.x > pipePos.x + 26) {
        this.passedPipes.add(id);
        this.score++;
        break;
      }
    }
  }

  private checkCollisions(): void {
    const birdPos = this.entityManager.getComponent<PositionComponent>(this.birdId, 'Position');
    const bird = this.entityManager.getComponent<BirdComponent>(this.birdId, 'Bird');
    if (!birdPos || !bird) return;

    // Simple AABB collision
    const birdRect = { x: birdPos.x - 17, y: birdPos.y - 12, w: 34, h: 24 };

    const allEntities = this.entityManager.query('Tag', 'Position', 'Sprite');
    for (const id of allEntities) {
      const tags = this.entityManager.getComponent<Set<string>>(id, 'Tag');
      if (!tags?.has('obstacle')) continue;

      const pos = this.entityManager.getComponent<PositionComponent>(id, 'Position');
      const sprite = this.entityManager.getComponent<{ width: number; height: number }>(id, 'Sprite');
      if (!pos || !sprite) continue;

      const obstacleRect = {
        x: pos.x - sprite.width / 2,
        y: pos.y - sprite.height / 2,
        w: sprite.width,
        h: sprite.height,
      };

      if (this.aabbOverlap(birdRect, obstacleRect)) {
        this.handleCollision();
        return;
      }
    }

    // Check ground collision by Y position (bird bottom at y+12 hits ground top at 555)
    if (birdPos.y > 543) {
      this.handleCollision();
    }
  }

  private aabbOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private handleCollision(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const bird = this.entityManager.getComponent<BirdComponent>(this.birdId, 'Bird');
    const velocity = this.entityManager.getComponent<VelocityComponent>(this.birdId, 'Velocity');

    if (bird) {
      bird.isDead = true;
    }

    if (velocity) {
      velocity.vx = 0;
      velocity.vy = 0;
    }

    this.pipeSpawner.stop();
  }

  destroy(): void {
    this.pipeSpawner.stop();
    // Only destroy entities, don't clear event listeners (scene is reused)
    this.destroyAllEntities();
  }
}
