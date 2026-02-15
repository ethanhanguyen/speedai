import { EventEmitter } from '../core/EventEmitter.js';
import type {
  ISocialProvider,
  ScoreEntry,
  LeaderboardFilter,
  LeaderboardResult,
} from './ISocialProvider.js';

export class LeaderboardManager extends EventEmitter {
  private provider: ISocialProvider;
  private cache: Map<string, { result: LeaderboardResult; cachedAt: number }> = new Map();
  private cacheTTL: number;

  constructor(provider: ISocialProvider, cacheTTL = 60_000) {
    super();
    this.provider = provider;
    this.cacheTTL = cacheTTL;
  }

  async submit(leaderboardId: string, entry: ScoreEntry): Promise<void> {
    await this.provider.submitScore(leaderboardId, entry);
    // Invalidate cache
    this.cache.delete(leaderboardId);
    this.emit('scoreSubmitted', leaderboardId, entry);
  }

  async get(leaderboardId: string, filter?: LeaderboardFilter): Promise<LeaderboardResult> {
    const cacheKey = leaderboardId;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.cacheTTL) {
      return cached.result;
    }

    const result = await this.provider.getLeaderboard(leaderboardId, filter ?? {});
    this.cache.set(cacheKey, { result, cachedAt: Date.now() });
    return result;
  }

  invalidateCache(leaderboardId?: string): void {
    if (leaderboardId) {
      this.cache.delete(leaderboardId);
    } else {
      this.cache.clear();
    }
  }
}
