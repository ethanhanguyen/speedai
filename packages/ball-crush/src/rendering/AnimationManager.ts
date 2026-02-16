import type { TweenSystem } from '@speedai/game-engine';
import type { EntityId } from '@speedai/game-engine';
import { Easing } from '@speedai/game-engine';
import { LayoutConfig } from '../config/LayoutConfig.js';
import { AnimationConfig } from '../config/AnimationConfig.js';
import type { SpecialType } from '../components/BallData.js';

export interface SwapAnim {
  entity1: EntityId;
  entity2: EntityId;
  done: boolean;
}

export interface ClearAnim {
  entityId: EntityId;
  done: boolean;
}

export interface FallAnim {
  entityId: EntityId;
  targetY: number;
  done: boolean;
}

export type AnimCallback = () => void;

/**
 * Manages swap tweens, pop/clear anims, gravity fall + bounce.
 * Coordinates with the state machine by signaling when all anims complete.
 */
export class AnimationManager {
  private tweenSystem: TweenSystem;
  private gravity: number;
  private pendingCount = 0;
  private onAllComplete: AnimCallback | null = null;

  constructor(tweenSystem: TweenSystem, gravity: number) {
    this.tweenSystem = tweenSystem;
    this.gravity = gravity;
  }

  get isAnimating(): boolean {
    return this.pendingCount > 0;
  }

  /** Called when all current animations complete. */
  whenDone(cb: AnimCallback): void {
    if (this.pendingCount === 0) {
      cb();
    } else {
      this.onAllComplete = cb;
    }
  }

  private trackStart(): void {
    this.pendingCount++;
  }

  private trackEnd(): void {
    this.pendingCount--;
    if (this.pendingCount <= 0) {
      this.pendingCount = 0;
      const cb = this.onAllComplete;
      this.onAllComplete = null;
      cb?.();
    }
  }

  /** Animate swapping two entities' positions. */
  animateSwap(
    e1: EntityId, x1: number, y1: number,
    e2: EntityId, x2: number, y2: number,
    duration: number = AnimationConfig.swap.duration,
  ): void {
    this.trackStart();
    this.trackStart();

    this.tweenSystem.tweenEntity(e1, 'Position', {
      target: { x: x2, y: y2 },
      from: { x: x1, y: y1 },
      duration,
      onComplete: () => this.trackEnd(),
    });

    this.tweenSystem.tweenEntity(e2, 'Position', {
      target: { x: x1, y: y1 },
      from: { x: x2, y: y2 },
      duration,
      onComplete: () => this.trackEnd(),
    });
  }

  /** Animate breaking: wobble then scale down + fade out. */
  animateClear(entityId: EntityId, delay: number = 0): void {
    this.trackStart();

    // Quick wobble/shake before breaking
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: 1.2, scaleY: 0.8 },
      from: { scaleX: 1, scaleY: 1 },
      duration: AnimationConfig.clear.wobbleDuration,
      delay,
      onComplete: () => {
        // Break apart - scale down and fade
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: 0, scaleY: 0, alpha: 0 },
          from: { scaleX: 1.2, scaleY: 0.8, alpha: 1 },
          duration: AnimationConfig.clear.shrinkDuration,
          easing: Easing.easeInQuad,
          onComplete: () => this.trackEnd(),
        });
      },
    });
  }

  /** Animate ball being sucked toward a target position while shrinking. */
  animateSuckToward(entityId: EntityId, fromX: number, fromY: number, toX: number, toY: number, delay: number = 0): void {
    this.trackStart();

    // Quick wobble before sucking
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: 1.15, scaleY: 0.85 },
      from: { scaleX: 1, scaleY: 1 },
      duration: AnimationConfig.suck.wobbleDuration,
      delay,
      onComplete: () => {
        const suckDuration = AnimationConfig.suck.duration;

        // Move toward target
        this.tweenSystem.tweenEntity(entityId, 'Position', {
          target: { x: toX, y: toY },
          from: { x: fromX, y: fromY },
          duration: suckDuration,
          easing: Easing.easeInQuad,
        });

        // Scale down and fade simultaneously
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: 0, scaleY: 0, alpha: 0 },
          from: { scaleX: 1.15, scaleY: 0.85, alpha: 1 },
          duration: suckDuration,
          easing: Easing.easeInQuad,
          onComplete: () => this.trackEnd(),
        });
      },
    });
  }

  /** Animate special ball pop-in appearance with anticipation. */
  animatePopIn(entityId: EntityId, delay: number = 0): void {
    this.trackStart();

    // Pop in with overshoot
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: AnimationConfig.popIn.overshootScale, scaleY: AnimationConfig.popIn.overshootScale, alpha: 1 },
      from: { scaleX: 0, scaleY: 0, alpha: 0 },
      duration: AnimationConfig.popIn.overshootDuration,
      easing: Easing.easeOutBack,
      delay,
      onComplete: () => {
        // Settle back to normal size
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: 1, scaleY: 1 },
          from: { scaleX: AnimationConfig.popIn.overshootScale, scaleY: AnimationConfig.popIn.overshootScale },
          duration: AnimationConfig.popIn.settleDuration,
          easing: Easing.easeOutQuad,
          onComplete: () => this.trackEnd(),
        });
      },
    });
  }

  /**
   * Animate special ball formation (from match).
   * Three phases: converge (energy gathering) → charge (scale pulse) → burst (dramatic entrance).
   */
  animateSpecialFormation(entityId: EntityId, delay: number = 0): void {
    this.trackStart();

    const cfg = AnimationConfig.formation;

    // Phase 1: Converge pause (balls have been sucked, energy is gathering)
    // Phase 2: Charge (scale pulse showing energy buildup)
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: cfg.chargeScaleMax, scaleY: cfg.chargeScaleMax, alpha: 1 },
      from: { scaleX: cfg.chargeScaleMin, scaleY: cfg.chargeScaleMin, alpha: 0 },
      duration: cfg.chargeDuration,
      delay: delay + cfg.convergePause,
      easing: Easing.easeOutQuad,
      onComplete: () => {
        // Phase 3: Burst (explosive entrance with overshoot)
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.burstOvershoot, scaleY: cfg.burstOvershoot },
          from: { scaleX: cfg.chargeScaleMax, scaleY: cfg.chargeScaleMax },
          duration: cfg.burstDuration * 0.6,
          easing: Easing.easeOutBack,
          onComplete: () => {
            // Settle to normal size
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: 1, scaleY: 1 },
              from: { scaleX: cfg.burstOvershoot, scaleY: cfg.burstOvershoot },
              duration: cfg.burstDuration * 0.4,
              easing: Easing.easeOutQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
      },
    });
  }

  /** Animate a ball falling to a new Y position with bounce. */
  animateFall(entityId: EntityId, fromY: number, toY: number, delay: number = 0): void {
    this.trackStart();
    // Calculate physics-based duration: t = sqrt(2 * distance / gravity)
    const distance = Math.abs(toY - fromY);
    const duration = Math.sqrt(2 * distance / this.gravity);
    const clampedDuration = Math.max(AnimationConfig.fall.minDuration, Math.min(AnimationConfig.fall.maxDuration, duration));
    const bounceDuration = clampedDuration * AnimationConfig.fall.bounceRatio;
    const bounceHeight = LayoutConfig.grid.cellSize * AnimationConfig.fall.bounceHeightMultiplier;

    // Fall down with acceleration
    this.tweenSystem.tweenEntity(entityId, 'Position', {
      target: { y: toY },
      from: { y: fromY },
      duration: clampedDuration,
      easing: Easing.easeInQuad,
      delay,
      onComplete: () => {
        // Bounce up
        this.tweenSystem.tweenEntity(entityId, 'Position', {
          target: { y: toY - bounceHeight },
          from: { y: toY },
          duration: bounceDuration * 0.5,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            // Settle back down
            this.tweenSystem.tweenEntity(entityId, 'Position', {
              target: { y: toY },
              from: { y: toY - bounceHeight },
              duration: bounceDuration * 0.5,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
      },
    });
  }

  /** Animate a new ball dropping in from above. */
  animateRefill(entityId: EntityId, targetY: number, _col: number, delay: number = 0): void {
    this.trackStart();

    // New balls start much higher off-screen for dramatic fall effect
    const fromY = targetY + AnimationConfig.refill.spawnOffsetY;

    // Calculate physics-based duration with faster fall
    const distance = Math.abs(targetY - fromY);
    const duration = Math.sqrt(2 * distance / this.gravity) * AnimationConfig.refill.speedMultiplier;
    const clampedDuration = Math.max(AnimationConfig.fall.minDuration, Math.min(AnimationConfig.fall.maxDuration, duration));
    const bounceDuration = clampedDuration * AnimationConfig.fall.bounceRatio;
    const bounceHeight = LayoutConfig.grid.cellSize * AnimationConfig.fall.bounceHeightMultiplier;

    // Fall down with acceleration
    this.tweenSystem.tweenEntity(entityId, 'Position', {
      target: { y: targetY },
      duration: clampedDuration,
      easing: Easing.easeInQuad,
      delay,
      onComplete: () => {
        // Bounce up
        this.tweenSystem.tweenEntity(entityId, 'Position', {
          target: { y: targetY - bounceHeight },
          duration: bounceDuration * 0.5,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            // Settle back down
            this.tweenSystem.tweenEntity(entityId, 'Position', {
              target: { y: targetY },
              duration: bounceDuration * 0.5,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
      },
    });
  }

  /** Animate level entrance: balls cascade in from above with stagger. */
  animateEntrance(entityId: EntityId, targetY: number, column: number, row: number): void {
    this.trackStart();

    // Calculate staggered delay: column first, then row within column
    const columnDelay = column * AnimationConfig.entrance.columnDelayIncrement;
    const rowDelay = row * AnimationConfig.entrance.ballDropDelayIncrement;
    const totalDelay = columnDelay + rowDelay;

    // Use same physics as refill for consistency
    const fromY = targetY + AnimationConfig.refill.spawnOffsetY;
    const distance = Math.abs(targetY - fromY);
    const duration = Math.sqrt(2 * distance / this.gravity) * AnimationConfig.refill.speedMultiplier;
    const clampedDuration = Math.max(AnimationConfig.fall.minDuration, Math.min(AnimationConfig.fall.maxDuration, duration));
    const bounceDuration = clampedDuration * AnimationConfig.fall.bounceRatio;
    const bounceHeight = LayoutConfig.grid.cellSize * AnimationConfig.fall.bounceHeightMultiplier;

    // Fall down with acceleration
    this.tweenSystem.tweenEntity(entityId, 'Position', {
      target: { y: targetY },
      duration: clampedDuration,
      easing: Easing.easeInQuad,
      delay: totalDelay,
      onComplete: () => {
        // Bounce up
        this.tweenSystem.tweenEntity(entityId, 'Position', {
          target: { y: targetY - bounceHeight },
          duration: bounceDuration * 0.5,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            // Settle back down
            this.tweenSystem.tweenEntity(entityId, 'Position', {
              target: { y: targetY },
              duration: bounceDuration * 0.5,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
      },
    });
  }

  /** Animate selected ball pulse (scale oscillation). */
  animatePulse(entityId: EntityId, intensity: number = 1.0): void {
    const scale = 1 + (AnimationConfig.pulse.scale - 1) * intensity;
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: scale, scaleY: scale },
      from: { scaleX: 1, scaleY: 1 },
      duration: AnimationConfig.pulse.duration,
      yoyo: true,
      repeat: -1,
    });
  }

  stopPulse(entityId: EntityId): void {
    this.tweenSystem.cancelEntity(entityId);
    // Reset scale
    this.tweenSystem.tweenEntity(entityId, 'Sprite', {
      target: { scaleX: 1, scaleY: 1 },
      duration: AnimationConfig.popIn.settleDuration,
    });
  }

  /**
   * Animate the special ball's intro effect, then shrink it away.
   * Calls onIntroComplete after the intro phase (before shrink) so the next wave can start.
   */
  animateSpecialIntro(entityId: EntityId, specialType: SpecialType, onIntroComplete?: () => void): void {
    this.trackStart();

    switch (specialType) {
      case 'striped_h': {
        const cfg = AnimationConfig.specialIntro.striped_h;
        // Anticipation squash
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.anticipationScale.x, scaleY: cfg.anticipationScale.y },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.anticipationDuration,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            // Explosive stretch
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: cfg.stretchScale.x, scaleY: cfg.stretchScale.y },
              duration: cfg.stretchDuration,
              easing: Easing.easeOutBack,
              onComplete: () => {
                onIntroComplete?.();
                this.tweenSystem.tweenEntity(entityId, 'Sprite', {
                  target: { scaleX: 0, scaleY: 0, alpha: 0 },
                  duration: cfg.fadeoutDuration,
                  easing: Easing.easeInQuad,
                  onComplete: () => this.trackEnd(),
                });
              },
            });
          },
        });
        break;
      }

      case 'striped_v': {
        const cfg = AnimationConfig.specialIntro.striped_v;
        // Anticipation squash
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.anticipationScale.x, scaleY: cfg.anticipationScale.y },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.anticipationDuration,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            // Explosive stretch
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: cfg.stretchScale.x, scaleY: cfg.stretchScale.y },
              duration: cfg.stretchDuration,
              easing: Easing.easeOutBack,
              onComplete: () => {
                onIntroComplete?.();
                this.tweenSystem.tweenEntity(entityId, 'Sprite', {
                  target: { scaleX: 0, scaleY: 0, alpha: 0 },
                  duration: cfg.fadeoutDuration,
                  easing: Easing.easeInQuad,
                  onComplete: () => this.trackEnd(),
                });
              },
            });
          },
        });
        break;
      }

      case 'bomb': {
        const cfg = AnimationConfig.specialIntro.bomb;
        // Quick squash
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.squashScale, scaleY: cfg.squashScale },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.squashDuration,
          easing: Easing.easeInQuad,
          onComplete: () => {
            // Big explosion
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: cfg.explosionScale, scaleY: cfg.explosionScale },
              duration: cfg.explosionDuration,
              easing: Easing.easeOutBack,
              onComplete: () => {
                onIntroComplete?.();
                this.tweenSystem.tweenEntity(entityId, 'Sprite', {
                  target: { scaleX: 0, scaleY: 0, alpha: 0 },
                  duration: cfg.fadeoutDuration,
                  easing: Easing.easeInQuad,
                  onComplete: () => this.trackEnd(),
                });
              },
            });
          },
        });
        break;
      }

      case 'rainbow': {
        const cfg = AnimationConfig.specialIntro.rainbow;
        // Pulsing glow effect
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.pulseScale, scaleY: cfg.pulseScale, alpha: cfg.pulseAlpha },
          from: { scaleX: 1, scaleY: 1, alpha: 1 },
          duration: cfg.pulseDuration,
          easing: Easing.easeOutQuad,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: cfg.expandScale, scaleY: cfg.expandScale, alpha: 1 },
              duration: cfg.expandDuration,
              easing: Easing.easeOutQuad,
              onComplete: () => {
                onIntroComplete?.();
                this.tweenSystem.tweenEntity(entityId, 'Sprite', {
                  target: { scaleX: 0, scaleY: 0, alpha: 0 },
                  duration: cfg.fadeoutDuration,
                  easing: Easing.easeInQuad,
                  onComplete: () => this.trackEnd(),
                });
              },
            });
          },
        });
        break;
      }

      default:
        onIntroComplete?.();
        this.trackEnd();
        break;
    }
  }

  /**
   * Animate an affected ball's destruction with type-specific visuals.
   * Delay is based on distance from the source special.
   */
  animateSpecialDestroy(
    entityId: EntityId,
    specialType: SpecialType,
    sourceR: number, sourceC: number,
    targetR: number, targetC: number,
  ): void {
    this.trackStart();

    switch (specialType) {
      case 'striped_h': {
        const cfg = AnimationConfig.specialDestroy.striped_h;
        // Squash horizontally, minimal delay for rapid propagation
        const dist = Math.abs(targetC - sourceC);
        const delay = dist * cfg.delayPerCell;
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.squashScale.x, scaleY: cfg.squashScale.y },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.squashDuration,
          delay,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: 0, scaleY: 0, alpha: 0 },
              duration: cfg.shrinkDuration,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
        break;
      }

      case 'striped_v': {
        const cfg = AnimationConfig.specialDestroy.striped_v;
        // Squash vertically, minimal delay for rapid propagation
        const dist = Math.abs(targetR - sourceR);
        const delay = dist * cfg.delayPerCell;
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.squashScale.x, scaleY: cfg.squashScale.y },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.squashDuration,
          delay,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: 0, scaleY: 0, alpha: 0 },
              duration: cfg.shrinkDuration,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
        break;
      }

      case 'bomb': {
        const cfg = AnimationConfig.specialDestroy.bomb;
        // Scale up then shrink, minimal delay for rapid explosion
        const dr = targetR - sourceR;
        const dc = targetC - sourceC;
        const dist = Math.sqrt(dr * dr + dc * dc);
        const delay = dist * cfg.delayPerCell;

        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.expandScale, scaleY: cfg.expandScale },
          from: { scaleX: 1, scaleY: 1 },
          duration: cfg.expandDuration,
          delay,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: 0, scaleY: 0, alpha: 0 },
              duration: cfg.shrinkDuration,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
        break;
      }

      case 'rainbow': {
        const cfg = AnimationConfig.specialDestroy.rainbow;
        // Flash bright then shrink, very small delay for near-simultaneous feel
        const delay = Math.random() * cfg.randomDelayMax;
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: cfg.flash1Scale, scaleY: cfg.flash1Scale, alpha: cfg.flash1Alpha },
          from: { scaleX: 1, scaleY: 1, alpha: 1 },
          duration: cfg.flash1Duration,
          delay,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: cfg.flash2Scale, scaleY: cfg.flash2Scale, alpha: 1 },
              duration: cfg.flash2Duration,
              onComplete: () => {
                this.tweenSystem.tweenEntity(entityId, 'Sprite', {
                  target: { scaleX: 0, scaleY: 0, alpha: 0 },
                  duration: cfg.shrinkDuration,
                  easing: Easing.easeInQuad,
                  onComplete: () => this.trackEnd(),
                });
              },
            });
          },
        });
        break;
      }

      default: {
        // Fallback: generic wobble + shrink
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: 1.2, scaleY: 0.8 },
          from: { scaleX: 1, scaleY: 1 },
          duration: AnimationConfig.clear.wobbleDuration,
          onComplete: () => {
            this.tweenSystem.tweenEntity(entityId, 'Sprite', {
              target: { scaleX: 0, scaleY: 0, alpha: 0 },
              from: { scaleX: 1.2, scaleY: 0.8, alpha: 1 },
              duration: AnimationConfig.clear.shrinkDuration,
              easing: Easing.easeInQuad,
              onComplete: () => this.trackEnd(),
            });
          },
        });
        break;
      }
    }
  }

  /**
   * Animate board shuffle (B7): shrink → scatter → reshuffle → reform.
   * @param entities Array of {entityId, fromPos, toPos}
   * @param onReshuffle Called after scatter, before reform (grid.reshuffle() should happen here)
   */
  animateShuffle(
    entities: { entityId: EntityId; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[],
    onReshuffle: () => void,
  ): void {
    if (entities.length === 0) {
      onReshuffle();
      return;
    }

    const cfg = AnimationConfig.shuffle;
    const canvasWidth = 430;
    const canvasHeight = 750;

    // Phase 1: Shrink all balls
    for (const { entityId } of entities) {
      this.trackStart();
      this.tweenSystem.tweenEntity(entityId, 'Sprite', {
        target: { scaleX: cfg.shrinkScale, scaleY: cfg.shrinkScale },
        from: { scaleX: 1, scaleY: 1 },
        duration: cfg.shrinkDuration / 1000,
        easing: Easing.easeInQuad,
        onComplete: () => this.trackEnd(),
      });
    }

    // Phase 2: Scatter to random positions (after shrink completes)
    for (const { entityId, fromPos } of entities) {
      this.trackStart();
      const randomX = Math.random() * canvasWidth;
      const randomY = Math.random() * canvasHeight;

      this.tweenSystem.tweenEntity(entityId, 'Position', {
        target: { x: randomX, y: randomY },
        from: { x: fromPos.x, y: fromPos.y },
        duration: cfg.scatterDuration / 1000,
        delay: cfg.shrinkDuration / 1000,
        easing: Easing.easeInOutQuad,
        onComplete: () => this.trackEnd(),
      });
    }

    // Phase 3: Reshuffle (after scatter completes)
    const reshuffleDelay = (cfg.shrinkDuration + cfg.scatterDuration) / 1000;
    setTimeout(() => {
      onReshuffle();

      // Phase 4: Reform at new positions
      entities.forEach(({ entityId, toPos }, index) => {
        this.trackStart();
        const stagger = (index % 9) * (cfg.reformDelay / 1000);

        // Move to new position
        this.tweenSystem.tweenEntity(entityId, 'Position', {
          target: { x: toPos.x, y: toPos.y },
          duration: 0.001, // Instant reposition
          delay: stagger,
        });

        // Grow back to normal size
        this.tweenSystem.tweenEntity(entityId, 'Sprite', {
          target: { scaleX: 1, scaleY: 1 },
          from: { scaleX: cfg.shrinkScale, scaleY: cfg.shrinkScale },
          duration: cfg.reformDuration / 1000,
          delay: stagger,
          easing: Easing.easeOutBack,
          onComplete: () => this.trackEnd(),
        });
      });
    }, reshuffleDelay * 1000);
  }

  /** Cancel all animations. */
  cancelAll(): void {
    this.tweenSystem.cancelAll();
    this.pendingCount = 0;
    this.onAllComplete = null;
  }
}
