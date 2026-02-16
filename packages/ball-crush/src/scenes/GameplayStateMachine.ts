import type { Grid } from '../grid/Grid.js';
import { detectMatches, type Match } from '../grid/MatchDetector.js';
import { resolveSpecialChain, resolveComboChain, type SpecialWave } from '../grid/SpecialResolver.js';
import type { BallColor, SpecialType } from '../components/BallData.js';
import type { AnimationManager } from '../rendering/AnimationManager.js';
import type { BallGenerator } from '../grid/BallGenerator.js';
import type { SpecialEffectRenderer } from '../rendering/SpecialEffectRenderer.js';
import type { EntityManager, EventBus, ObjectiveTracker } from '@speedai/game-engine';
import { GameplayConfig } from '../config/GameplayConfig.js';
import { VisualConfig } from '../config/VisualConfig.js';
import { AnimationConfig } from '../config/AnimationConfig.js';
import { COLOR_HEX } from '../components/BallData.js';
import { ROWS, COLS, CELL_SIZE, CELL_GAP, BOARD_Y, BALL_SPAWN_OFFSET } from '../grid/Grid.js';
import { getCellTypeDef } from '../config/CellTypes.js';

export type GameState = 'ENTRANCE' | 'IDLE' | 'SWAPPING' | 'MATCH_CHECK' | 'CLEARING' | 'FALLING' | 'REFILLING' | 'RECHECK';

export interface StateMachineContext {
  grid: Grid;
  entityMap: (number | null)[][];
  entityManager: EntityManager;
  animManager: AnimationManager;
  ballGenerator: BallGenerator;
  specialFx: SpecialEffectRenderer;
  eventBus: EventBus;
  levelConfig: { colors: BallColor[]; targetScore: number };
  columnHistory: BallColor[][];
  objectiveTracker: ObjectiveTracker;
  time: number;
  spawnBallEntity: (r: number, c: number, color: BallColor, special: SpecialType, spawnY?: number) => number;
  destroyEntity: (eid: number) => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
  onReshuffle: () => void;
}

export class GameplayStateMachine {
  state: GameState = 'IDLE';
  cascadeMultiplier = 1;
  cascadeCount = 0;
  swapFrom: { r: number; c: number } | null = null;
  swapTo: { r: number; c: number } | null = null;

  score = 0;
  movesLeft = 0;

  processState(ctx: StateMachineContext): void {
    switch (this.state) {
      case 'ENTRANCE':
      case 'SWAPPING':
      case 'CLEARING':
      case 'FALLING':
      case 'REFILLING':
        break;
      case 'IDLE':
        break;
      case 'MATCH_CHECK':
        this.checkMatches(ctx);
        break;
      case 'RECHECK':
        this.cascadeMultiplier += GameplayConfig.cascade.multiplierIncrement;
        this.cascadeCount++;
        if (this.cascadeCount >= GameplayConfig.cascade.toastThreshold) {
          ctx.eventBus.fire('cascade', {
            count: this.cascadeCount,
            message: `${this.cascadeCount}x Cascade!`,
            duration: GameplayConfig.cascade.toastDuration,
          });
        }
        this.state = 'MATCH_CHECK';
        break;
    }
  }

  startSwap(r1: number, c1: number, r2: number, c2: number, ctx: StateMachineContext): void {
    this.state = 'SWAPPING';
    this.swapFrom = { r: r1, c: c1 };
    this.swapTo = { r: r2, c: c2 };

    const e1 = ctx.entityMap[r1][c1];
    const e2 = ctx.entityMap[r2][c2];
    if (e1 === null || e2 === null) {
      this.state = 'IDLE';
      return;
    }

    const pos1 = ctx.grid.gridToScreen(r1, c1);
    const pos2 = ctx.grid.gridToScreen(r2, c2);

    ctx.grid.swap(r1, c1, r2, c2);
    this.swapEntityMap(r1, c1, r2, c2, ctx.entityMap);
    this.updateBallData(r1, c1, ctx);
    this.updateBallData(r2, c2, ctx);

    const cell1 = ctx.grid.getCell(r1, c1);
    const cell2 = ctx.grid.getCell(r2, c2);

    const special1 = cell1?.special !== 'none';
    const special2 = cell2?.special !== 'none';

    if (special1 && special2) {
      const wasLastMove = this.movesLeft === 1;
      this.handleSpecialCombo(r1, c1, r2, c2, ctx);
      this.movesLeft--;
      this.cascadeMultiplier = 1;
      this.cascadeCount = 0;

      // Dramatic pause on last move (B5)
      if (wasLastMove) {
        setTimeout(() => {
          this.state = 'MATCH_CHECK';
        }, VisualConfig.lastMove.dramaticPauseDuration);
        this.state = 'SWAPPING'; // Hold in SWAPPING state during pause
      }
      return;
    }

    if (special1 || special2) {
      ctx.animManager.animateSwap(e1, pos1.x, pos1.y, e2, pos2.x, pos2.y);
      ctx.animManager.whenDone(() => {
        const wasLastMove = this.movesLeft === 1;
        this.handleSpecialActivation(r1, c1, r2, c2, ctx);
        this.movesLeft--;
        this.cascadeMultiplier = 1;
        this.cascadeCount = 0;

        // Dramatic pause on last move (B5)
        if (wasLastMove) {
          setTimeout(() => {
            this.state = 'MATCH_CHECK';
          }, VisualConfig.lastMove.dramaticPauseDuration);
        } else {
          this.state = 'MATCH_CHECK';
        }
      });
      return;
    }

    ctx.animManager.animateSwap(e1, pos1.x, pos1.y, e2, pos2.x, pos2.y);
    ctx.animManager.whenDone(() => {
      const matches = detectMatches(ctx.grid.cells);
      if (matches.length === 0) {
        ctx.grid.swap(r1, c1, r2, c2);
        this.swapEntityMap(r1, c1, r2, c2, ctx.entityMap);
        this.updateBallData(r1, c1, ctx);
        this.updateBallData(r2, c2, ctx);
        ctx.animManager.animateSwap(e1, pos2.x, pos2.y, e2, pos1.x, pos1.y);
        ctx.animManager.whenDone(() => {
          this.state = 'IDLE';
        });
      } else {
        const wasLastMove = this.movesLeft === 1;
        this.movesLeft--;
        this.cascadeMultiplier = 1;
        this.cascadeCount = 0;

        // Dramatic pause on last move (B5)
        if (wasLastMove) {
          setTimeout(() => {
            this.state = 'MATCH_CHECK';
          }, VisualConfig.lastMove.dramaticPauseDuration);
        } else {
          this.state = 'MATCH_CHECK';
        }
      }
    });
  }

  private swapEntityMap(r1: number, c1: number, r2: number, c2: number, entityMap: (number | null)[][]): void {
    const temp = entityMap[r1][c1];
    entityMap[r1][c1] = entityMap[r2][c2];
    entityMap[r2][c2] = temp;
  }

  private updateBallData(r: number, c: number, ctx: StateMachineContext): void {
    const eid = ctx.entityMap[r][c];
    if (eid === null) return;
    const bd = ctx.entityManager.getComponent(eid, 'BallData') as { gridRow: number; gridCol: number } | undefined;
    if (bd) {
      bd.gridRow = r;
      bd.gridCol = c;
    }
  }

  private checkMatches(ctx: StateMachineContext): void {
    const matches = detectMatches(ctx.grid.cells);
    if (matches.length === 0) {
      this.onCascadeEnd(ctx);
      return;
    }

    this.state = 'CLEARING';
    this.processMatches(matches, ctx);
  }

  private processMatches(matches: Match[], ctx: StateMachineContext): void {
    const toClear = new Set<string>();
    const specialsToCreate: { r: number; c: number; type: SpecialType; color: BallColor }[] = [];

    for (const match of matches) {
      const points = match.positions.length * GameplayConfig.score.baseMatchPoints * this.cascadeMultiplier;
      this.score += points;

      // Track objectives
      ctx.objectiveTracker.increment('score', points);
      ctx.objectiveTracker.increment(`collect_${match.color}`, match.positions.length);

      // Fire match event for floating score popup
      ctx.eventBus.fire('match_scored', {
        positions: match.positions,
        color: match.color,
        points,
        multiplier: this.cascadeMultiplier,
      });

      for (const pos of match.positions) {
        const key = `${pos.r},${pos.c}`;
        if (!toClear.has(key)) {
          toClear.add(key);
        }
      }

      if (match.specialToCreate !== 'none' && match.specialPos) {
        specialsToCreate.push({
          r: match.specialPos.r,
          c: match.specialPos.c,
          type: match.specialToCreate,
          color: match.color,
        });
      }
    }

    if (toClear.size >= 6) {
      ctx.eventBus.fire('match', {
        clearCount: toClear.size,
        shakeIntensity: VisualConfig.shake.match.intensity,
        shakeDuration: VisualConfig.shake.match.duration,
        flashColor: toClear.size >= 10 ? VisualConfig.flash.match.color : undefined,
        flashDuration: toClear.size >= 10 ? VisualConfig.flash.match.duration : undefined,
      });
    }

    const specialPositions = new Set<string>();
    for (const sp of specialsToCreate) {
      specialPositions.add(`${sp.r},${sp.c}`);
    }

    let delay = 0;
    for (const key of toClear) {
      const [r, c] = key.split(',').map(Number);
      const eid = ctx.entityMap[r][c];

      if (eid !== null) {
        const pos = ctx.grid.gridToScreen(r, c);
        const cell = ctx.grid.getCell(r, c);

        const specialMatch = specialsToCreate.find(sp =>
          matches.some(m => m.specialPos?.r === sp.r && m.specialPos?.c === sp.c &&
                           m.positions.some(p => p.r === r && p.c === c))
        );

        if (specialMatch && !specialPositions.has(key)) {
          const targetPos = ctx.grid.gridToScreen(specialMatch.r, specialMatch.c);
          ctx.eventBus.fire('ball_suck', {
            x: pos.x,
            y: pos.y,
            particleCount: VisualConfig.particles.suck.count,
            particleSpeed: VisualConfig.particles.suck.speed,
            particleLifetime: VisualConfig.particles.suck.lifetime,
            particleSize: VisualConfig.particles.suck.size,
            colors: cell?.color ? [COLOR_HEX[cell.color]] : undefined,
          });
          ctx.animManager.animateSuckToward(eid, pos.x, pos.y, targetPos.x, targetPos.y, delay);
        } else if (!specialPositions.has(key)) {
          ctx.eventBus.fire('ball_clear', {
            x: pos.x,
            y: pos.y,
            particleCount: VisualConfig.particles.match.count,
            particleSpeed: VisualConfig.particles.match.speed,
            particleLifetime: VisualConfig.particles.match.lifetime,
            particleSize: VisualConfig.particles.match.size,
            colors: cell?.color ? [COLOR_HEX[cell.color]] : undefined,
          });
          if (cell?.color) {
            ctx.animManager.animateClear(eid, cell.color, ctx.time, delay);
          }
        }
        delay += AnimationConfig.clear.delayIncrement;
      }
    }

    const clearDuration = AnimationConfig.clear.wobbleDuration + AnimationConfig.clear.shrinkDuration;
    const specialStartDelay = delay + clearDuration + AnimationConfig.formation.startDelay;

    let specialDelay = specialStartDelay;
    for (const sp of specialsToCreate) {
      const oldEid = ctx.entityMap[sp.r][sp.c];
      if (oldEid !== null) {
        ctx.destroyEntity(oldEid);
      }

      const eid = ctx.spawnBallEntity(sp.r, sp.c, sp.color, sp.type);
      const cell = { color: sp.color, special: sp.type, entityId: eid };
      ctx.grid.setCell(sp.r, sp.c, cell);
      ctx.entityMap[sp.r][sp.c] = eid;

      ctx.animManager.animateSpecialFormation(eid, specialDelay);
      specialDelay += AnimationConfig.formation.delayIncrement;
    }

    ctx.animManager.whenDone(() => {
      for (const key of toClear) {
        if (!specialPositions.has(key)) {
          const [r, c] = key.split(',').map(Number);
          const eid = ctx.entityMap[r][c];
          if (eid !== null) {
            ctx.destroyEntity(eid);
            ctx.entityMap[r][c] = null;
          }
          ctx.grid.setCell(r, c, null);
        }
      }

      // Damage obstacles adjacent to cleared cells
      this.damageAdjacentObstacles(toClear, ctx);

      // Check win condition before refill
      if (ctx.objectiveTracker.allComplete()) {
        ctx.onLevelComplete();
        return;
      }

      this.state = 'FALLING';
      this.applyGravityAndRefill(ctx);
    });
  }

  private handleSpecialActivation(r1: number, c1: number, r2: number, c2: number, ctx: StateMachineContext): void {
    const cell1 = ctx.grid.getCell(r1, c1);
    const cell2 = ctx.grid.getCell(r2, c2);

    const specialR = cell1?.special !== 'none' ? r1 : r2;
    const specialC = cell1?.special !== 'none' ? c1 : c2;
    const normalR = cell1?.special !== 'none' ? r2 : r1;
    const normalC = cell1?.special !== 'none' ? c2 : c1;

    const alreadyCleared = new Set<string>();

    const normalCell = ctx.grid.getCell(normalR, normalC);
    const targetColor = normalCell?.color || undefined;

    const { waves, allToClear } = resolveSpecialChain(
      ctx.grid.cells,
      [{ r: specialR, c: specialC, targetColor }],
      alreadyCleared,
    );

    const normalKey = `${normalR},${normalC}`;
    allToClear.delete(normalKey); // Keep normal ball on board

    const points = allToClear.size * GameplayConfig.score.specialActivationPoints * this.cascadeMultiplier;
    this.score += points;
    ctx.objectiveTracker.increment('score', points);

    // Track special activation for objectives
    const specialCell = ctx.grid.getCell(specialR, specialC);
    if (specialCell?.special && specialCell.special !== 'none') {
      ctx.objectiveTracker.increment(`special_${specialCell.special}`);
    }

    this.state = 'CLEARING';
    ctx.eventBus.fire('special', {
      clearCount: allToClear.size,
      shakeIntensity: VisualConfig.shake.special.intensity,
      shakeDuration: VisualConfig.shake.special.duration,
      flashColor: VisualConfig.flash.special.color,
      flashDuration: VisualConfig.flash.special.duration,
    });

    this.playSpecialWaves(waves, allToClear, ctx, normalKey);
  }

  private handleSpecialCombo(r1: number, c1: number, r2: number, c2: number, ctx: StateMachineContext): void {
    const { waves, allToClear } = resolveComboChain(ctx.grid.cells, r1, c1, r2, c2);

    const points = allToClear.size * GameplayConfig.score.specialActivationPoints * this.cascadeMultiplier;
    this.score += points;
    ctx.objectiveTracker.increment('score', points);

    // Track both specials for objectives
    const cell1 = ctx.grid.getCell(r1, c1);
    const cell2 = ctx.grid.getCell(r2, c2);
    if (cell1?.special && cell1.special !== 'none') ctx.objectiveTracker.increment(`special_${cell1.special}`);
    if (cell2?.special && cell2.special !== 'none') ctx.objectiveTracker.increment(`special_${cell2.special}`);

    this.state = 'CLEARING';
    ctx.eventBus.fire('combo', {
      clearCount: allToClear.size,
      shakeIntensity: VisualConfig.shake.combo.intensity,
      shakeDuration: VisualConfig.shake.combo.duration,
      flashColor: VisualConfig.flash.combo.color,
      flashDuration: VisualConfig.flash.combo.duration,
    });

    this.playSpecialWaves(waves, allToClear, ctx);
  }

  private playSpecialWaves(waves: SpecialWave[], allToClear: Set<string>, ctx: StateMachineContext, skipKey?: string): void {
    const playWave = (index: number): void => {
      if (index >= waves.length) {
        ctx.animManager.whenDone(() => {
          // Damage obstacles hit by specials, remove surviving ones from clear set
          this.damageObstaclesFromSpecial(allToClear, ctx);

          for (const key of allToClear) {
            const [r, c] = key.split(',').map(Number);
            const eid = ctx.entityMap[r][c];
            if (eid !== null) {
              ctx.destroyEntity(eid);
              ctx.entityMap[r][c] = null;
            }
            ctx.grid.setCell(r, c, null);
          }

          // Also damage obstacles adjacent to all special-cleared cells
          this.damageAdjacentObstacles(allToClear, ctx);

          // Check win condition before refill
          if (ctx.objectiveTracker.allComplete()) {
            ctx.onLevelComplete();
            return;
          }

          this.state = 'FALLING';
          this.applyGravityAndRefill(ctx);
        });
        return;
      }

      const wave = waves[index];
      let introsPending = wave.activations.length;

      if (introsPending === 0) {
        playWave(index + 1);
        return;
      }

      for (const activation of wave.activations) {
        const specialEid = ctx.entityMap[activation.r]?.[activation.c];
        const specialPos = ctx.grid.gridToScreen(activation.r, activation.c);

        this.addSpecialOverlay(activation.type, specialPos.x, specialPos.y, activation, ctx);

        if (specialEid !== null && specialEid !== undefined) {
          ctx.animManager.animateSpecialIntro(specialEid, activation.type, () => {
            this.fireAffectedCellAnims(activation, ctx, skipKey);

            introsPending--;
            if (introsPending === 0) {
              playWave(index + 1);
            }
          });
        } else {
          this.fireAffectedCellAnims(activation, ctx, skipKey);
          introsPending--;
          if (introsPending === 0) {
            playWave(index + 1);
          }
        }
      }
    };

    playWave(0);
  }

  private addSpecialOverlay(
    type: SpecialType,
    x: number, y: number,
    activation: { affectedCells: { r: number; c: number }[] },
    ctx: StateMachineContext,
  ): void {
    const boardWidth = COLS * (CELL_SIZE + CELL_GAP);
    const boardHeight = ROWS * (CELL_SIZE + CELL_GAP);

    switch (type) {
      case 'striped_h':
        ctx.specialFx.addHBeam(x, y, boardWidth, '#e0e0e0');
        break;
      case 'striped_v':
        ctx.specialFx.addVBeam(x, y, boardHeight, '#e0e0e0');
        break;
      case 'bomb':
        ctx.specialFx.addRing(x, y, CELL_SIZE * 1.8, '#ff6b35');
        break;
      case 'rainbow': {
        const targets = activation.affectedCells.map(c => ctx.grid.gridToScreen(c.r, c.c));
        ctx.specialFx.addColorBurst(x, y, targets, '#f1c40f');
        break;
      }
    }
  }

  private fireAffectedCellAnims(
    activation: { type: SpecialType; r: number; c: number; affectedCells: { r: number; c: number }[] },
    ctx: StateMachineContext,
    skipKey?: string,
  ): void {
    for (const cell of activation.affectedCells) {
      const key = `${cell.r},${cell.c}`;
      if (skipKey && key === skipKey) continue;
      if (cell.r === activation.r && cell.c === activation.c) continue;

      const eid = ctx.entityMap[cell.r]?.[cell.c];
      if (eid !== null && eid !== undefined) {
        const pos = ctx.grid.gridToScreen(cell.r, cell.c);
        ctx.eventBus.fire('special_destroy', {
          x: pos.x,
          y: pos.y,
          particleCount: VisualConfig.particles.special.count,
          particleSpeed: VisualConfig.particles.special.speed,
          particleLifetime: VisualConfig.particles.special.lifetime,
          particleSize: VisualConfig.particles.special.size,
        });
        ctx.animManager.animateSpecialDestroy(
          eid, activation.type,
          activation.r, activation.c,
          cell.r, cell.c,
        );
      }
    }
  }

  private applyGravityAndRefill(ctx: StateMachineContext): void {
    let anyMovement = false;

    for (let c = 0; c < COLS; c++) {
      const columnDelay = c * 0.02;

      // Compact cells downward, respecting immovable obstacles
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const cell = ctx.grid.getCell(r, c);
        if (!cell) continue;

        // Immovable obstacles stay in place — reset write position above them
        if (cell.obstacle) {
          const def = getCellTypeDef(cell.obstacle.type);
          if (def?.immovable) {
            writeRow = r - 1;
            continue;
          }
        }

        if (r !== writeRow) {
          ctx.grid.setCell(writeRow, c, cell);
          ctx.grid.setCell(r, c, null);

          const eid = ctx.entityMap[r][c];
          ctx.entityMap[writeRow][c] = eid;
          ctx.entityMap[r][c] = null;

          if (eid !== null) {
            const fromPos = ctx.grid.gridToScreen(r, c);
            const toPos = ctx.grid.gridToScreen(writeRow, c);
            const bd = ctx.entityManager.getComponent(eid, 'BallData') as any;
            if (bd) { bd.gridRow = writeRow; bd.gridCol = c; }
            ctx.animManager.animateFall(eid, fromPos.y, toPos.y, columnDelay);
          }
          anyMovement = true;
        }
        writeRow--;
      }

      // Refill empty non-obstacle cells
      const SPAWN_HEIGHT = BOARD_Y + BALL_SPAWN_OFFSET;
      let ballDropIndex = 0;

      for (let r = 0; r < ROWS; r++) {
        const existing = ctx.grid.getCell(r, c);
        // Skip cells that have content or are solid obstacles
        if (existing) continue;

        const special: SpecialType = 'none';

        const columnColors: (BallColor | null)[] = [];
        for (let checkR = 0; checkR < ROWS; checkR++) {
          columnColors.push(ctx.grid.getCell(checkR, c)?.color || null);
        }

        const color = ctx.ballGenerator.generateForRefill(
          c,
          ctx.levelConfig.colors,
          ctx.columnHistory,
          this.cascadeCount,
          columnColors,
        );

        if (!ctx.columnHistory[c]) ctx.columnHistory[c] = [];
        ctx.columnHistory[c].push(color);
        if (ctx.columnHistory[c].length > 3) {
          ctx.columnHistory[c].shift();
        }

        const cell = { color, special, entityId: -1 };
        ctx.grid.setCell(r, c, cell);

        const targetPos = ctx.grid.gridToScreen(r, c);
        const eid = ctx.spawnBallEntity(r, c, color, special, SPAWN_HEIGHT);
        cell.entityId = eid;
        ctx.entityMap[r][c] = eid;

        const dropDelay = columnDelay + (ballDropIndex * 0.08);
        ctx.animManager.animateRefill(eid, targetPos.y, c, dropDelay);
        ballDropIndex++;
        anyMovement = true;
      }
    }

    if (anyMovement) {
      ctx.animManager.whenDone(() => {
        this.state = 'RECHECK';
      });
    } else {
      this.onCascadeEnd(ctx);
    }
  }

  /** Damage obstacles adjacent to cleared positions (from normal matches). */
  private damageAdjacentObstacles(clearedPositions: Set<string>, ctx: StateMachineContext): void {
    const checked = new Set<string>();
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const key of clearedPositions) {
      const [cr, cc] = key.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const nKey = `${nr},${nc}`;
        if (checked.has(nKey) || clearedPositions.has(nKey)) continue;
        checked.add(nKey);

        this.applyObstacleDamage(nr, nc, 'adjacentMatch', ctx);
      }
    }
  }

  /** Damage obstacles in cells directly hit by specials. Removes surviving obstacles from the clear set. */
  private damageObstaclesFromSpecial(toClear: Set<string>, ctx: StateMachineContext): void {
    const toRemoveFromClear: string[] = [];

    for (const key of toClear) {
      const [r, c] = key.split(',').map(Number);
      const cell = ctx.grid.getCell(r, c);
      if (!cell?.obstacle) continue;

      const survived = this.applyObstacleDamage(r, c, 'specialHit', ctx);
      if (survived) {
        toRemoveFromClear.push(key);
      }
    }

    for (const key of toRemoveFromClear) {
      toClear.delete(key);
    }
  }

  /**
   * Apply damage to an obstacle at (r,c). Returns true if obstacle survived.
   */
  private applyObstacleDamage(
    r: number, c: number,
    damageType: 'adjacentMatch' | 'specialHit',
    ctx: StateMachineContext,
  ): boolean {
    const cell = ctx.grid.getCell(r, c);
    if (!cell?.obstacle) return false;

    const def = getCellTypeDef(cell.obstacle.type);
    if (!def) return false;

    const damage = damageType === 'adjacentMatch' ? def.damage.adjacentMatch : def.damage.specialHit;
    if (damage <= 0) return true;

    cell.obstacle.hp -= damage;
    const pos = ctx.grid.gridToScreen(r, c);

    if (cell.obstacle.hp <= 0) {
      // Obstacle destroyed — track for objectives
      ctx.objectiveTracker.increment(`obstacle_${cell.obstacle.type}`);

      const fx = def.effects.destroy;
      ctx.eventBus.fire('obstacle_destroyed', {
        x: pos.x, y: pos.y,
        obstacleType: cell.obstacle.type,
        shakeIntensity: fx.shakeIntensity,
        shakeDuration: fx.shakeDuration,
        ...fx.particles,
      });

      delete cell.obstacle;

      if (!def.containsBall) {
        // Solid obstacle — remove cell entirely
        const eid = ctx.entityMap[r][c];
        if (eid !== null) {
          ctx.destroyEntity(eid);
          ctx.entityMap[r][c] = null;
        }
        ctx.grid.setCell(r, c, null);
      }
      // containsBall: obstacle removed, ball is now free — no further action
      return false;
    } else {
      // Obstacle hit but survived
      const fx = def.effects.hit;
      ctx.eventBus.fire('obstacle_hit', {
        x: pos.x, y: pos.y,
        obstacleType: cell.obstacle.type,
        remainingHp: cell.obstacle.hp,
        shakeIntensity: fx.shakeIntensity,
        shakeDuration: fx.shakeDuration,
        ...fx.particles,
      });
      return true;
    }
  }

  private onCascadeEnd(ctx: StateMachineContext): void {
    // Fire cascade end event to reset visual effects
    ctx.eventBus.fire('cascade_end', {});

    if (!ctx.grid.hasValidMoves(ctx.levelConfig.colors)) {
      ctx.eventBus.fire('reshuffle', { message: 'Reshuffling...', duration: 1.5 });

      // Collect entities with their current positions (B7)
      const entities: { entityId: number; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[] = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const eid = ctx.entityMap[r][c];
          if (eid !== null) {
            const pos = ctx.grid.gridToScreen(r, c);
            entities.push({ entityId: eid, fromPos: { x: pos.x, y: pos.y }, toPos: { x: pos.x, y: pos.y } });
          }
        }
      }

      // Shuffle the grid data
      ctx.grid.reshuffle(ctx.levelConfig.colors);

      // Update toPos with new positions after shuffle
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = ctx.grid.getCell(r, c);
          if (cell && cell.entityId !== null) {
            const ent = entities.find(e => e.entityId === cell.entityId);
            if (ent) {
              const newPos = ctx.grid.gridToScreen(r, c);
              ent.toPos = { x: newPos.x, y: newPos.y };
            }
          }
        }
      }

      // Animate shuffle (B7)
      ctx.animManager.animateShuffle(entities, () => {
        ctx.onReshuffle();
      });

      // Hold in RECHECK state during shuffle animation
      this.state = 'RECHECK';
      ctx.animManager.whenDone(() => {
        this.state = 'IDLE';
      });
      return;
    }

    if (ctx.objectiveTracker.allComplete()) {
      ctx.onLevelComplete();
      return;
    }

    if (this.movesLeft <= 0) {
      ctx.onGameOver();
      return;
    }

    this.state = 'IDLE';
  }
}
