import {
  Scene,
  ComponentFactory,
  ProgressBar,
  ScreenShake,
  Flash,
  ParticleBurst,
  Toast,
  EventBus,
  SlowMotion,
  ObjectiveTracker,
  type EntityId,
  type TweenSystem,
  type AtlasData,
} from '@speedai/game-engine';
import { Grid, ROWS, COLS, BOARD_Y, CELL_SIZE, BALL_SPAWN_OFFSET } from '../grid/Grid.js';
import { getLevelConfig, type LevelDef } from '../grid/LevelConfig.js';
import { getCellTypeDef } from '../config/CellTypes.js';
import { BallRenderer } from '../rendering/BallRenderer.js';
import { AnimationManager } from '../rendering/AnimationManager.js';
import { SpecialEffectRenderer } from '../rendering/SpecialEffectRenderer.js';
import { FloatingTextManager } from '../rendering/FloatingText.js';
import { BallGenerator } from '../grid/BallGenerator.js';
import type { BallColor, SpecialType } from '../components/BallData.js';
import { GameplayInputHandler } from './GameplayInputHandler.js';
import { GameplayStateMachine, type StateMachineContext } from './GameplayStateMachine.js';
import { GameplayRenderer, type RenderContext } from './GameplayRenderer.js';
import { HintConfig } from '../config/HintConfig.js';
import { GameplayConfig } from '../config/GameplayConfig.js';

export class GameplayScene extends Scene {
  private grid = new Grid();
  private ballRenderer = new BallRenderer();
  private animManager!: AnimationManager;
  private tweenSystem!: TweenSystem;
  private ballGenerator = new BallGenerator();
  private specialFx = new SpecialEffectRenderer();
  private floatingText = new FloatingTextManager();

  // Modules
  private inputHandler = new GameplayInputHandler();
  private stateMachine = new GameplayStateMachine();
  private renderer = new GameplayRenderer();

  // Level & scoring
  private level = 1;
  private levelConfig!: LevelDef;
  private totalScore = 0;
  private objectiveTracker = new ObjectiveTracker();

  // UI components
  private progressBar!: ProgressBar;
  private shake = new ScreenShake();
  private flash = new Flash();
  private particles = new ParticleBurst();
  private toast = new Toast({ font: 'bold 20px Arial', position: 'top' });
  private slowMo = new SlowMotion();
  private eventBus = new EventBus();
  private comboGlowIntensity = 0;

  // Column history for smart ball generation
  private columnHistory: BallColor[][] = [];

  // Entity map: grid position → entity ID
  private entityMap: (EntityId | null)[][] = [];

  // Hint system
  private idleTimer = 0;
  private hintCells: { r1: number; c1: number; r2: number; c2: number } | null = null;
  private hintLevel: 'none' | 'subtle' | 'strong' = 'none';

  // Time tracking (for B5, B6 animations)
  private time = 0;

  // Game end state
  private gameEnded = false;

  constructor(tweenSystem: TweenSystem, atlas: AtlasData | null = null) {
    super('Gameplay');
    this.tweenSystem = tweenSystem;
    this.ballRenderer.setAtlas(atlas);
  }

  setLevel(level: number): void {
    this.level = level;
  }

  setTotalScore(score: number): void {
    this.totalScore = score;
  }

  init(): void {
    this.animManager = new AnimationManager(this.tweenSystem, 800);
    this.gameEnded = false;

    // Clean slate
    const allEntities = this.entityManager.query();
    for (const id of allEntities) {
      this.entityManager.destroy(id);
    }

    // Level config
    this.levelConfig = getLevelConfig(this.level);
    this.stateMachine.score = 0;
    this.stateMachine.movesLeft = this.levelConfig.moves;
    this.stateMachine.cascadeMultiplier = 1;
    this.stateMachine.cascadeCount = 0;
    this.stateMachine.state = 'ENTRANCE';

    // Init objectives
    this.objectiveTracker.clear();
    if (this.levelConfig.objectives && this.levelConfig.objectives.length > 0) {
      for (const obj of this.levelConfig.objectives) {
        let id: string;
        switch (obj.type) {
          case 'collect_color': id = `collect_${obj.color}`; break;
          case 'activate_special': id = `special_${obj.specialType}`; break;
          case 'clear_obstacle': id = `obstacle_${obj.obstacleType}`; break;
          case 'score': id = 'score'; break;
        }
        this.objectiveTracker.add({ id, target: obj.target });
      }
    } else {
      // Default: score objective for backward compat
      this.objectiveTracker.add({ id: 'score', target: this.levelConfig.targetScore });
    }

    // Init grid — place obstacles before filling with balls
    this.grid.clear();
    if (this.levelConfig.obstacles) {
      this.grid.initObstacles(this.levelConfig.obstacles);
    }
    this.grid.fillRandom(this.levelConfig.colors);

    // Init entity map
    this.entityMap = [];
    for (let r = 0; r < ROWS; r++) {
      this.entityMap[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.entityMap[r][c] = null;
      }
    }

    // Init column history
    this.columnHistory = Array.from({ length: COLS }, () => []);

    // Spawn ball entities with entrance animation
    this.spawnAllBallsWithEntrance();

    // Progress bar
    this.progressBar = new ProgressBar({
      x: 15,
      y: 170,
      width: 400,
      height: 16,
      fillColor: '#2ecc71',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderColor: 'rgba(255,255,255,0.3)',
      borderWidth: 1,
      borderRadius: 8,
    });

    // Event subscriptions
    this.eventBus.on('match', (e) => {
      const data = (e as any).data;
      if (data.shakeIntensity && data.shakeDuration) {
        this.shake.trigger(data.shakeIntensity, data.shakeDuration);
      }
      if (data.flashColor && data.flashDuration) {
        this.flash.trigger(data.flashColor, data.flashDuration);
      }
    });

    this.eventBus.on('cascade', (e) => {
      const data = (e as any).data as { count: number; message: string; duration: number };
      this.toast.show(data.message, data.duration);

      // Combo escalation effects
      const cfg = GameplayConfig.combo;
      if (data.count === 2) {
        this.shake.trigger(cfg.shake2x.intensity, cfg.shake2x.duration);
      } else if (data.count === 3) {
        this.shake.trigger(cfg.shake3x.intensity, cfg.shake3x.duration);
        this.flash.trigger('#fff', 0.15);
      } else if (data.count >= 5) {
        this.shake.trigger(cfg.shake5x.intensity, cfg.shake5x.duration);
        this.slowMo.trigger(cfg.slowMoScale, cfg.slowMoDuration);
        this.particles.emit({
          x: 215,
          y: 400,
          count: 30,
          speed: 200,
          lifetime: 0.8,
          size: 4,
        });
        this.toast.show(cfg.toast5x, 1.5);
      }

      // Update combo glow intensity
      this.comboGlowIntensity = Math.min(cfg.glowMaxIntensity, data.count / cfg.glowDivisor);
    });

    this.eventBus.on('special', (e) => {
      const data = (e as any).data;
      this.shake.trigger(data.shakeIntensity, data.shakeDuration);
      this.flash.trigger(data.flashColor, data.flashDuration);
    });

    this.eventBus.on('combo', (e) => {
      const data = (e as any).data;
      this.shake.trigger(data.shakeIntensity, data.shakeDuration);
      this.flash.trigger(data.flashColor, data.flashDuration);
    });

    this.eventBus.on('special_destroy', (e) => {
      const data = (e as any).data;
      this.particles.emit({
        x: data.x,
        y: data.y,
        count: data.particleCount,
        speed: data.particleSpeed,
        lifetime: data.particleLifetime,
        size: data.particleSize,
      });
    });

    this.eventBus.on('ball_suck', (e) => {
      const data = (e as any).data;
      this.particles.emit({
        x: data.x,
        y: data.y,
        count: data.particleCount,
        speed: data.particleSpeed,
        lifetime: data.particleLifetime,
        size: data.particleSize,
        colors: data.colors,
      });
    });

    this.eventBus.on('ball_clear', (e) => {
      const data = (e as any).data;
      this.particles.emit({
        x: data.x,
        y: data.y,
        count: data.particleCount,
        speed: data.particleSpeed,
        lifetime: data.particleLifetime,
        size: data.particleSize,
        colors: data.colors,
      });
    });

    this.eventBus.on('reshuffle', (e) => {
      const data = (e as any).data;
      this.toast.show(data.message, data.duration);
    });

    this.eventBus.on('match_scored', (e) => {
      const data = (e as any).data as { positions: { r: number; c: number }[]; color: BallColor; points: number; multiplier: number };
      // Calculate centroid of match positions
      let sumX = 0;
      let sumY = 0;
      for (const pos of data.positions) {
        const screenPos = this.grid.gridToScreen(pos.r, pos.c);
        sumX += screenPos.x;
        sumY += screenPos.y;
      }
      const centroidX = sumX / data.positions.length;
      const centroidY = sumY / data.positions.length;

      // Spawn floating score text
      this.floatingText.spawn(`+${data.points}`, centroidX, centroidY, data.color, data.multiplier);
    });

    this.eventBus.on('cascade_end', () => {
      // Reset combo glow when cascade ends
      this.comboGlowIntensity = 0;
    });

    this.eventBus.on('obstacle_hit', (e) => {
      const data = (e as any).data;
      if (data.shakeIntensity && data.shakeDuration) {
        this.shake.trigger(data.shakeIntensity, data.shakeDuration);
      }
      this.particles.emit({
        x: data.x,
        y: data.y,
        count: data.count,
        speed: data.speed,
        lifetime: data.lifetime,
        size: data.size,
        colors: data.colors,
      });
    });

    this.eventBus.on('obstacle_destroyed', (e) => {
      const data = (e as any).data;
      if (data.shakeIntensity && data.shakeDuration) {
        this.shake.trigger(data.shakeIntensity, data.shakeDuration);
      }
      this.particles.emit({
        x: data.x,
        y: data.y,
        count: data.count,
        speed: data.speed,
        lifetime: data.lifetime,
        size: data.size,
        colors: data.colors,
      });
    });
  }

  /** Check if cell is a solid obstacle (no ball entity needed). */
  private isSolidObstacle(r: number, c: number): boolean {
    const cell = this.grid.getCell(r, c);
    if (!cell?.obstacle) return false;
    const def = getCellTypeDef(cell.obstacle.type);
    return def ? !def.containsBall : false;
  }

  private spawnAllBalls(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.isSolidObstacle(r, c)) continue;
        const cell = this.grid.getCell(r, c);
        if (cell && cell.color) {
          const eid = this.spawnBallEntity(r, c, cell.color, cell.special);
          cell.entityId = eid;
          this.entityMap[r][c] = eid;
        }
      }
    }
  }

  private spawnAllBallsWithEntrance(): void {
    const SPAWN_HEIGHT = BOARD_Y + BALL_SPAWN_OFFSET;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.isSolidObstacle(r, c)) continue;
        const cell = this.grid.getCell(r, c);
        if (cell && cell.color) {
          const eid = this.spawnBallEntity(r, c, cell.color, cell.special, SPAWN_HEIGHT);
          cell.entityId = eid;
          this.entityMap[r][c] = eid;

          const targetPos = this.grid.gridToScreen(r, c);
          this.animManager.animateEntrance(eid, targetPos.y, c, r);
        }
      }
    }

    this.animManager.whenDone(() => {
      this.stateMachine.state = 'IDLE';
    });
  }

  private spawnBallEntity = (r: number, c: number, color: BallColor, special: SpecialType, startY?: number): EntityId => {
    const pos = this.grid.gridToScreen(r, c);
    const actualY = startY !== undefined ? startY : pos.y;
    const eid = this.createEntity();
    this.entityManager.addComponent(eid, 'Position', ComponentFactory.position(pos.x, actualY) as any);
    this.entityManager.addComponent(eid, 'Sprite', {
      ...ComponentFactory.sprite('ball', CELL_SIZE, CELL_SIZE),
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
    } as any);
    this.entityManager.addComponent(eid, 'BallData', { color, special, gridRow: r, gridCol: c } as any);
    return eid;
  };

  update(dt: number): void {
    this.time += dt;
    this.inputHandler.selectionTime += dt;
    this.shake.update(dt);
    this.flash.update(dt);
    this.particles.update(dt);
    if (!this.gameEnded) {
      this.toast.update(dt);
      this.specialFx.update(dt);
      this.floatingText.update(dt);
    }
    this.slowMo.update(dt);

    // Apply slow motion to engine time scale
    const engine = (globalThis as any).gameEngine;
    if (engine) {
      engine.timeScale = this.slowMo.scale;
    }

    // Handle input in IDLE state
    if (this.stateMachine.state === 'IDLE') {
      const engine = (globalThis as any).gameEngine;
      const action = this.inputHandler.handleInput(engine?.input, this.grid, this.entityMap, this.animManager);

      if (action.type !== 'none') {
        this.clearHint();
        this.idleTimer = 0;
      }

      if (action.type === 'swap') {
        this.stateMachine.startSwap(action.r1, action.c1, action.r2, action.c2, this.buildContext());
      }

      // Hint system
      this.idleTimer += dt;
      this.updateHint();
    } else {
      // Clear hint when not in IDLE state
      if (this.hintLevel !== 'none') {
        this.clearHint();
      }
    }

    // Process state machine
    this.stateMachine.processState(this.buildContext());
  }

  private updateHint(): void {
    const prevLevel = this.hintLevel;

    if (this.idleTimer >= HintConfig.idleStrongSeconds) {
      this.hintLevel = 'strong';
    } else if (this.idleTimer >= HintConfig.idleSubtleSeconds) {
      this.hintLevel = 'subtle';
    } else {
      this.hintLevel = 'none';
    }

    // Only update hint if level changed
    if (prevLevel !== this.hintLevel) {
      if (this.hintLevel === 'none') {
        this.clearHint();
      } else {
        this.showHint();
      }
    }
  }

  private showHint(): void {
    // Find a valid move if we don't have one
    if (!this.hintCells) {
      this.hintCells = this.grid.findValidMove();
      if (!this.hintCells) return; // No valid moves
    }

    const { r1, c1, r2, c2 } = this.hintCells;
    const e1 = this.entityMap[r1][c1];
    const e2 = this.entityMap[r2][c2];

    const intensity = this.hintLevel === 'subtle' ? HintConfig.pulseSubtle : HintConfig.pulseStrong;

    if (e1 !== null) {
      this.animManager.stopPulse(e1);
      this.animManager.animatePulse(e1, intensity);
    }
    if (e2 !== null) {
      this.animManager.stopPulse(e2);
      this.animManager.animatePulse(e2, intensity);
    }
  }

  private clearHint(): void {
    if (this.hintCells) {
      const { r1, c1, r2, c2 } = this.hintCells;
      const e1 = this.entityMap[r1][c1];
      const e2 = this.entityMap[r2][c2];
      if (e1 !== null) this.animManager.stopPulse(e1);
      if (e2 !== null) this.animManager.stopPulse(e2);
      this.hintCells = null;
    }
    this.hintLevel = 'none';
    this.idleTimer = 0;
  }

  private buildContext(): StateMachineContext {
    return {
      grid: this.grid,
      entityMap: this.entityMap,
      entityManager: this.entityManager,
      animManager: this.animManager,
      ballGenerator: this.ballGenerator,
      specialFx: this.specialFx,
      eventBus: this.eventBus,
      levelConfig: this.levelConfig,
      columnHistory: this.columnHistory,
      objectiveTracker: this.objectiveTracker,
      time: this.time,
      spawnBallEntity: this.spawnBallEntity,
      destroyEntity: (eid: number) => this.destroyEntity(eid),
      onLevelComplete: () => {
        this.gameEnded = true;
        this.emit('levelComplete', this.stateMachine.score + this.totalScore, this.level, this.stateMachine.movesLeft);
      },
      onGameOver: () => {
        this.gameEnded = true;
        this.emit('gameOver', this.stateMachine.score + this.totalScore, this.level);
      },
      onReshuffle: () => {
        this.rebuildAllEntities();
      },
    };
  }

  private rebuildAllEntities(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const eid = this.entityMap[r][c];
        if (eid !== null) {
          this.destroyEntity(eid);
          this.entityMap[r][c] = null;
        }
      }
    }
    this.spawnAllBalls();
  }

  render(_alpha: number): void {
    const canvas = document.querySelector('#game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    const renderContext: RenderContext = {
      grid: this.grid,
      entityMap: this.entityMap,
      entityManager: this.entityManager,
      animManager: this.animManager,
      ballRenderer: this.ballRenderer,
      specialFx: this.specialFx,
      floatingText: this.floatingText,
      particles: this.particles,
      shake: this.shake,
      flash: this.flash,
      toast: this.toast,
      progressBar: this.progressBar,
      level: this.level,
      score: this.stateMachine.score,
      totalScore: this.totalScore,
      movesLeft: this.stateMachine.movesLeft,
      targetScore: this.levelConfig.targetScore,
      state: this.stateMachine.state,
      selectedCell: this.inputHandler.getSelectedCell(),
      selectionTime: this.inputHandler.selectionTime,
      hintCells: this.hintCells,
      hintLevel: this.hintLevel,
      comboGlowIntensity: this.comboGlowIntensity,
      time: this.time,
      objectives: this.objectiveTracker.getAll(),
      showObjectivesPanel: !!(this.levelConfig.objectives && this.levelConfig.objectives.length > 0),
      gameEnded: this.gameEnded,
    };

    this.renderer.render(ctx, canvas, renderContext);
  }

  destroy(): void {
    this.animManager?.cancelAll();
    this.destroyAllEntities();
  }

  protected destroyAllEntities(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const eid = this.entityMap[r][c];
        if (eid !== null) {
          this.destroyEntity(eid);
          this.entityMap[r][c] = null;
        }
      }
    }
  }
}
