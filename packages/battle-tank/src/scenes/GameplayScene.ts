import { Scene } from '@speedai/game-engine';
import type { AssetManager, CameraSystem, UnifiedInput, GridModel } from '@speedai/game-engine';
import type { TileCell, MapData } from '../tilemap/types.js';
import { parseTilemap } from '../tilemap/TilemapLoader.js';
import { drawTilemap } from '../tilemap/TilemapRenderer.js';
import { createTank } from '../tank/TankAssembler.js';
import { drawTanks } from '../tank/TankRenderer.js';
import { updateTankMovement } from '../systems/TankMovementSystem.js';
import { resolveCollisionsAndMove } from '../systems/TileCollisionSystem.js';
import { SURVIVAL_01 } from '../maps/survival_01.js';
import { MAP_CONFIG } from '../config/MapConfig.js';
import { PLAYER_TANK } from '../config/TankConfig.js';

export class GameplayScene extends Scene {
  private tilemap!: GridModel<TileCell>;
  private mapMeta!: MapData;
  private playerId: number = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: AssetManager,
    private camera: CameraSystem,
    private input: UnifiedInput,
  ) {
    super('Gameplay');
  }

  init(): void {
    // Parse tilemap
    const { grid, meta } = parseTilemap(SURVIVAL_01, MAP_CONFIG.tileSize);
    this.tilemap = grid;
    this.mapMeta = meta;

    // Configure camera bounds to map size
    const worldW = meta.cols * MAP_CONFIG.tileSize;
    const worldH = meta.rows * MAP_CONFIG.tileSize;
    // CameraSystem exposes x/y but bounds are set via constructor config;
    // we'll manually set worldWidth/worldHeight if accessible, or rely on clamp
    (this.camera as any).worldWidth = worldW;
    (this.camera as any).worldHeight = worldH;

    // Spawn player at first spawn point (center of tile)
    const spawn = meta.spawnPoints[0] ?? { r: 1, c: 1 };
    const spawnX = (spawn.c + 0.5) * MAP_CONFIG.tileSize;
    const spawnY = (spawn.r + 0.5) * MAP_CONFIG.tileSize;

    this.playerId = createTank(this.entityManager, spawnX, spawnY, PLAYER_TANK, ['tank', 'player']);

    // Camera follows player
    this.camera.follow(this.playerId);
    this.camera.moveTo(spawnX, spawnY);
  }

  update(dt: number): void {
    // 1. Input → velocity + angles
    updateTankMovement(this.entityManager, this.input, this.camera, dt);

    // 2. Collision resolution + position integration
    resolveCollisionsAndMove(this.entityManager, this.tilemap, dt);

    // 3. Camera follow
    this.camera.update(dt);
  }

  render(_alpha: number): void {
    const ctx = this.canvas.getContext('2d')!;
    const cam = this.camera.getTransform();

    // Apply camera transform (world space)
    ctx.save();
    ctx.translate(Math.round(cam.x), Math.round(cam.y));
    ctx.scale(cam.zoom, cam.zoom);

    // Tilemap
    drawTilemap(ctx, this.tilemap, this.camera, this.assets);

    // Tanks
    drawTanks(ctx, this.entityManager, this.assets);

    ctx.restore();

    // HUD (screen space) — Phase 2+
  }

  destroy(): void {
    if (this.playerId >= 0) {
      this.entityManager.destroy(this.playerId);
    }
    super.destroy();
  }
}
