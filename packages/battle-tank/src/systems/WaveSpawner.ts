import type { EntityManager, ComponentData, EventBus } from '@speedai/game-engine';
import { createTank } from '../tank/TankAssembler.js';
import { WAVE_TABLE, WAVE_CONFIG } from '../config/WaveConfig.js';
import type { WaveEnemy } from '../config/WaveConfig.js';
import { AI_STATE, AIState } from '../components/AI.js';
import type { AIComponent, AIRole } from '../components/AI.js';
import type { DifficultyLevel } from '../config/AIConfig.js';
import { resolveAIProfile } from '../ai/resolveAIProfile.js';
import type { TankDef } from '../config/TankConfig.js';
import type { WaveState } from '../config/GameStateTypes.js';

interface SpawnPoint { r: number; c: number }

interface SpawnQueueItem { tankDef: TankDef; role: AIRole }

/**
 * Manages wave lifecycle: pre-wave countdown → staggered spawning → active combat → clear.
 */
export class WaveSpawner {
  private _state: WaveState = 'idle';
  private _waveIndex = 0;
  private timer = 0;
  private spawnedCount = 0;
  private spawnQueue: SpawnQueueItem[] = [];
  private _aliveCount = 0;
  private spawnPointIndex = 0;
  private tileSize: number;
  private enemySpawns: SpawnPoint[];
  private em: EntityManager;
  private eventBus: EventBus;
  private difficulty: DifficultyLevel;

  get state(): WaveState { return this._state; }
  get waveNumber(): number { return this._waveIndex + 1; }
  get aliveCount(): number { return this._aliveCount; }

  constructor(
    em: EntityManager,
    eventBus: EventBus,
    enemySpawns: SpawnPoint[],
    tileSize: number,
    difficulty: DifficultyLevel = 'normal',
  ) {
    this.em = em;
    this.eventBus = eventBus;
    this.enemySpawns = enemySpawns;
    this.tileSize = tileSize;
    this.difficulty = difficulty;

    eventBus.on('entity:killed', (event: unknown) => {
      const e = event as { data?: { tags: string[] } };
      const d = (e.data ?? e) as { tags: string[] };
      if (!d?.tags?.includes('enemy')) return;
      this._aliveCount = Math.max(0, this._aliveCount - 1);
    });
  }

  start(): void {
    this._waveIndex = 0;
    this.beginPreWave();
  }

  private beginPreWave(): void {
    this._state = 'pre_wave';
    this.timer = WAVE_CONFIG.interWaveDelay;
    this.eventBus.fire('wave:starting', {
      waveNumber: this.waveNumber,
      countdown: this.timer,
    });
  }

  private buildSpawnQueue(enemies: WaveEnemy[]): void {
    this.spawnQueue = [];
    for (const enemy of enemies) {
      for (let i = 0; i < enemy.count; i++) {
        this.spawnQueue.push({ tankDef: enemy.tankDef, role: enemy.role });
      }
    }
    // Fisher-Yates shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  update(dt: number, playerX: number, playerY: number): void {
    switch (this._state) {
      case 'pre_wave':
        this.timer -= dt;
        if (this.timer <= 0) {
          this._state = 'spawning';
          this.spawnedCount = 0;
          this._aliveCount = 0;
          this.timer = 0;
          const wave = WAVE_TABLE[this._waveIndex];
          if (wave) this.buildSpawnQueue(wave.enemies);
        }
        break;

      case 'spawning': {
        const wave = WAVE_TABLE[this._waveIndex];
        if (!wave || this.spawnQueue.length === 0) { this._state = 'complete'; return; }

        this.timer -= dt;
        if (this.timer <= 0 && this.spawnedCount < this.spawnQueue.length) {
          this.spawnNext(playerX, playerY);
          this.spawnedCount++;
          this.timer = wave.spawnDelay;
        }

        if (this.spawnedCount >= this.spawnQueue.length) {
          this._state = 'active';
          this.eventBus.fire('wave:active', { waveNumber: this.waveNumber });
        }
        break;
      }

      case 'active':
        if (this._aliveCount <= 0) {
          this.eventBus.fire('wave:clear', { waveNumber: this.waveNumber });
          this._waveIndex++;
          if (this._waveIndex < WAVE_TABLE.length) {
            this.beginPreWave();
          } else {
            this._state = 'complete';
            this.eventBus.fire('game:won', {});
          }
        }
        break;
    }
  }

  private spawnNext(playerX: number, playerY: number): void {
    const item = this.spawnQueue[this.spawnedCount];
    if (!item) return;

    const sp = this.enemySpawns[this.spawnPointIndex % this.enemySpawns.length];
    this.spawnPointIndex++;

    const centerX = sp.c * this.tileSize + this.tileSize / 2;
    const centerY = sp.r * this.tileSize + this.tileSize / 2;
    const jitter  = this.tileSize * WAVE_CONFIG.spawnJitterFraction;
    const x = centerX + (Math.random() * 2 - 1) * jitter;
    const y = centerY + (Math.random() * 2 - 1) * jitter;

    const id = createTank(this.em, x, y, item.tankDef, ['tank', 'enemy']);
    this.attachAI(id, item.role);
    this._aliveCount++;
  }

  private attachAI(id: number, role: AIRole): void {
    const profile = resolveAIProfile(role, this.difficulty, this._waveIndex);
    const aiComp: AIComponent = {
      state: AIState.IDLE,
      role,
      reactionTimer: profile.reactionTime,
      retargetTimer: 0,
      fireRange: profile.fireRange,
      preferredRange: profile.preferredRange,
      accuracy: profile.accuracy,
      maxSpread: profile.maxSpread,
      engageSpeedFraction: profile.engageSpeedFraction,
      engageStrafeRate: profile.engageStrafeRate,
      chaseOffsetAngle: profile.chaseOffsetAngle,
      fireOnMove: profile.fireOnMove,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      squadLeadId: undefined,
      formationDx: 0,
      formationDy: 0,
    };
    this.em.addComponent(id, AI_STATE, aiComp as unknown as ComponentData);
  }
}
