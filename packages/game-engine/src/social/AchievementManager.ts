import { EventEmitter } from '../core/EventEmitter.js';
import type {
  ISocialProvider,
  AchievementConfig,
  AchievementCondition,
  Achievement,
} from './ISocialProvider.js';

export interface UserStats {
  score: number;
  gamesPlayed: number;
  streakDays: number;
  levelCompleted: number;
  custom: Record<string, number>;
}

export class AchievementManager extends EventEmitter {
  private provider: ISocialProvider;
  private configs: AchievementConfig[];
  private unlocked: Set<string> = new Set();
  private userId: string = '';

  constructor(provider: ISocialProvider, configs: AchievementConfig[]) {
    super();
    this.provider = provider;
    this.configs = configs;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  /** Load previously unlocked achievements from the provider. */
  async load(): Promise<void> {
    if (!this.userId) return;
    const achievements = await this.provider.getAchievements(this.userId);
    for (const a of achievements) {
      if (a.unlocked) {
        this.unlocked.add(a.id);
      }
    }
  }

  /** Check all achievements against current stats. Returns newly unlocked ones. */
  async check(stats: UserStats): Promise<Achievement[]> {
    const newlyUnlocked: Achievement[] = [];

    for (const config of this.configs) {
      if (this.unlocked.has(config.id)) continue;

      if (this.evaluateCondition(config.condition, stats)) {
        this.unlocked.add(config.id);
        const achievement: Achievement = { ...config, unlocked: true, unlockedAt: Date.now() };
        newlyUnlocked.push(achievement);

        if (this.userId) {
          await this.provider.unlockAchievement(this.userId, config.id).catch(() => {});
        }

        this.emit('unlock', achievement);
      }
    }

    return newlyUnlocked;
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  getAll(): (AchievementConfig & { unlocked: boolean })[] {
    return this.configs
      .filter(c => !c.hidden || this.unlocked.has(c.id))
      .map(c => ({ ...c, unlocked: this.unlocked.has(c.id) }));
  }

  private evaluateCondition(condition: AchievementCondition, stats: UserStats): boolean {
    switch (condition.type) {
      case 'score_gte':
        return stats.score >= condition.value;
      case 'games_played':
        return stats.gamesPlayed >= condition.value;
      case 'streak_days':
        return stats.streakDays >= condition.value;
      case 'level_completed':
        return stats.levelCompleted >= condition.level;
      case 'custom':
        return (stats.custom[condition.key] ?? 0) >= condition.value;
    }
  }
}
