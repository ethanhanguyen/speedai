import { EventEmitter } from '../core/EventEmitter.js';
import type { ISocialProvider, UserProfile } from './ISocialProvider.js';

export class ProfileManager extends EventEmitter {
  private provider: ISocialProvider;
  private profileCache: Map<string, UserProfile> = new Map();

  constructor(provider: ISocialProvider) {
    super();
    this.provider = provider;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const cached = this.profileCache.get(userId);
    if (cached) return cached;

    const profile = await this.provider.getProfile(userId);
    this.profileCache.set(userId, profile);
    return profile;
  }

  async getFriends(userId: string): Promise<UserProfile[]> {
    return this.provider.getFriends(userId);
  }

  invalidateCache(userId?: string): void {
    if (userId) {
      this.profileCache.delete(userId);
    } else {
      this.profileCache.clear();
    }
  }
}
