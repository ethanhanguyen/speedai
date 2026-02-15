import { EventEmitter } from '../core/EventEmitter.js';
import type { ISocialProvider, Challenge } from './ISocialProvider.js';

export class ChallengeManager extends EventEmitter {
  private provider: ISocialProvider;
  private active: Map<string, Challenge> = new Map();

  constructor(provider: ISocialProvider) {
    super();
    this.provider = provider;
  }

  async loadChallenges(): Promise<Challenge[]> {
    const challenges = await this.provider.getChallenges();
    for (const c of challenges) {
      this.active.set(c.id, c);
    }
    return challenges;
  }

  async join(challengeId: string): Promise<void> {
    await this.provider.joinChallenge(challengeId);
    this.emit('joined', challengeId);
  }

  async updateProgress(challengeId: string, progress: number): Promise<void> {
    const challenge = this.active.get(challengeId);
    if (!challenge) return;

    challenge.progress = (challenge.progress ?? 0) + progress;
    await this.provider.submitChallengeProgress(challengeId, challenge.progress);
    this.emit('progress', challengeId, challenge.progress);

    // Check completion
    const target = this.getTarget(challenge);
    if (target > 0 && challenge.progress >= target) {
      this.emit('complete', challengeId, challenge);
    }
  }

  getChallenge(id: string): Challenge | undefined {
    return this.active.get(id);
  }

  getActiveChallenges(): Challenge[] {
    const now = Date.now();
    return [...this.active.values()].filter(c => c.endTime > now);
  }

  private getTarget(challenge: Challenge): number {
    return challenge.goal.target;
  }
}
