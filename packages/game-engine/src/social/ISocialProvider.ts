// ─── Score Entry ───

export interface ScoreEntry {
  metricType: 'points' | 'time' | 'moves' | 'distance' | 'accuracy' | 'custom';
  value: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
  replayData?: string;
}

// ─── Leaderboard ───

export interface LeaderboardFilter {
  type?: 'all_time' | 'weekly' | 'daily' | 'friends';
  limit?: number;
  offset?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  score: ScoreEntry;
}

export interface LeaderboardResult {
  leaderboardId: string;
  entries: LeaderboardEntry[];
  total: number;
  userEntry?: LeaderboardEntry;
}

// ─── Achievements ───

export type AchievementCondition =
  | { type: 'score_gte'; value: number }
  | { type: 'games_played'; value: number }
  | { type: 'streak_days'; value: number }
  | { type: 'level_completed'; level: number }
  | { type: 'custom'; key: string; value: number };

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward?: Reward;
  hidden?: boolean;
}

export interface Achievement extends AchievementConfig {
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
}

// ─── Challenges ───

export type ChallengeGoal =
  | { type: 'score_total'; target: number }
  | { type: 'games_count'; target: number }
  | { type: 'perfect_count'; target: number }
  | { type: 'streak'; target: number }
  | { type: 'community_total'; target: number };

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly' | 'seasonal' | 'community';
  name: string;
  description: string;
  goal: ChallengeGoal;
  rewards: Reward[];
  startTime: number;
  endTime: number;
  participants?: number;
  progress?: number;
}

// ─── Rewards ───

export interface Reward {
  type: 'currency' | 'xp' | 'cosmetic' | 'unlock' | 'badge' | 'boost';
  id: string;
  amount?: number;
}

// ─── Social ───

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  level?: number;
  xp?: number;
  stats?: Record<string, number>;
}

export interface ShareableResult {
  type: 'score' | 'achievement' | 'challenge' | 'replay';
  gameId: string;
  data: {
    title: string;
    description: string;
    image?: string;
    replayUrl?: string;
    challengeUrl?: string;
  };
  platforms: ('link' | 'twitter' | 'facebook' | 'clipboard')[];
}

export interface ShareLink {
  url: string;
  platform: string;
}

// ─── Provider Interface ───

export interface ISocialProvider {
  // Leaderboards
  submitScore(leaderboardId: string, entry: ScoreEntry): Promise<void>;
  getLeaderboard(id: string, filter: LeaderboardFilter): Promise<LeaderboardResult>;

  // Achievements
  unlockAchievement(userId: string, achievementId: string): Promise<void>;
  getAchievements(userId: string): Promise<Achievement[]>;

  // Challenges
  getChallenges(): Promise<Challenge[]>;
  joinChallenge(challengeId: string): Promise<void>;
  submitChallengeProgress(challengeId: string, progress: number): Promise<void>;

  // Social
  getProfile(userId: string): Promise<UserProfile>;
  getFriends(userId: string): Promise<UserProfile[]>;
  shareResult(result: ShareableResult): Promise<ShareLink>;
}
