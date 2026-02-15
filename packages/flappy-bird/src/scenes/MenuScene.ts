import { Scene, ComponentFactory, Button } from '@speedai/game-engine';

export class MenuScene extends Scene {
  private playButton!: Button;
  private wasPointerDown = false;

  constructor() {
    super('Menu');
  }

  init(): void {
    // Background
    const bg = this.createEntity();
    this.entityManager.addComponent(bg, 'Position', ComponentFactory.position(187.5, 333.5));
    this.entityManager.addComponent(bg, 'Sprite', ComponentFactory.sprite('bg', 375, 667));

    // Ground (scrolling)
    const ground1 = this.createEntity();
    this.entityManager.addComponent(ground1, 'Position', ComponentFactory.position(168, 611));
    this.entityManager.addComponent(ground1, 'Velocity', ComponentFactory.velocity(-120, 0));
    this.entityManager.addComponent(ground1, 'Sprite', ComponentFactory.sprite('ground', 336, 112));
    this.entityManager.addComponent(ground1, 'Tag', new Set(['ground', 'scroll']));

    const ground2 = this.createEntity();
    this.entityManager.addComponent(ground2, 'Position', ComponentFactory.position(168 + 336, 611));
    this.entityManager.addComponent(ground2, 'Velocity', ComponentFactory.velocity(-120, 0));
    this.entityManager.addComponent(ground2, 'Sprite', ComponentFactory.sprite('ground', 336, 112));
    this.entityManager.addComponent(ground2, 'Tag', new Set(['ground', 'scroll']));

    // Play button
    this.playButton = new Button({
      x: 187.5 - 60, // Center the button (x - width/2)
      y: 400,
      width: 120,
      height: 50,
      label: 'Play',
      font: 'bold 24px Arial',
      backgroundColor: '#4CAF50',
      hoverColor: '#45a049',
      textColor: '#ffffff',
    });

    // Handle button click
    this.playButton.on('click', () => this.emit('changeScene', 'Gameplay'));

    // Title text (render manually)
    this.on('render', (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('Flappy Bird', 187.5, 200);
      ctx.fillText('Flappy Bird', 187.5, 200);
      ctx.restore();
    });
  }

  update(dt: number): void {
    // Handle input for button
    const engine = (globalThis as any).gameEngine;
    if (engine?.input) {
      const pointer = engine.input.getPointer();
      this.playButton.onPointerMove(pointer.x, pointer.y);

      // Track pointer down/up
      if (pointer.down && !this.wasPointerDown) {
        this.playButton.onPointerDown(pointer.x, pointer.y);
      }
      if (!pointer.down && this.wasPointerDown) {
        this.playButton.onPointerUp(pointer.x, pointer.y);
      }
      this.wasPointerDown = pointer.down;
    }
  }

  render(alpha: number): void {
    const canvas = document.querySelector('#game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    this.playButton.draw(ctx);
    this.emit('render', ctx);
  }

  destroy(): void {
    this.playButton.clear();
    // Only destroy entities, don't clear event listeners (scene is reused)
    this.destroyAllEntities();
  }
}
