import type { BallColor, SpecialType } from '../components/BallData.js';

/**
 * Sprite atlas frame mapping.
 * Maps game states to atlas frame keys (no hardcoded values).
 */

// ── Ball sprites ──

const BALL_FRAMES: Record<BallColor, string> = {
  red: 'red_ball',
  blue: 'blue_ball',
  green: 'green_ball',
  yellow: 'yellow_ball',
  purple: 'purple_ball',
  orange: 'orange_ball',
};

const BALL_CRACKED_FRAMES: Record<BallColor, string[]> = {
  red: ['red_ball_cracked_1', 'red_ball_cracked_2'],
  blue: ['blue_ball_cracked_1', 'blue_ball_cracked_2'],
  green: ['green_ball_cracked_1', 'green_ball_cracked_2'],
  yellow: ['yellow_ball_cracked_1', 'yellow_ball_cracked_2'],
  purple: ['purple_ball_cracked_1', 'purple_ball_cracked_2'],
  orange: ['orange_ball_cracked_1', 'orange_ball_cracked_2'],
};

// ── Special ball sprites (3 frames each) ──

const SPECIAL_FRAMES: Record<Exclude<SpecialType, 'none'>, string[]> = {
  striped_h: ['special_ball_h_1', 'special_ball_h_2', 'special_ball_h_3'],
  striped_v: ['special_ball_v_1', 'special_ball_v_2', 'special_ball_v_3'],
  bomb: ['special_ball_bomb_1', 'special_ball_bomb_2', 'special_ball_bomb_3'],
  rainbow: ['special_ball_rainbow_1', 'special_ball_rainbow_2', 'special_ball_rainbow_3'],
};

const SPECIAL_FRAME_COUNT = 3;
const SPECIAL_FPS = 4; // 4 frames per second

// ── Obstacle sprites (indexed by remaining HP) ──

const OBSTACLE_FRAMES: Record<string, string[]> = {
  ice: ['ice_cracked_2', 'ice'], // [0 HP (destroyed), 1 HP (intact)]
  stone: ['stone_cracked_2', 'stone_cracked_1', 'stone'], // [0 HP, 1 HP, 2 HP]
};

// ── UI element sprites ──

const UI_FRAMES = {
  cell: 'cell',
  heart: 'heart',
  ring: 'ring',
  star: 'star',
};

// ── Destroy animation config ──

const DESTROY_ANIMATION_DURATION = 0.3; // seconds
const DESTROY_ANIMATION_FPS = 6;

// ── Export API ──

export const SpriteConfig = {
  /** Get ball sprite frame key */
  getBallFrame(color: BallColor): string {
    return BALL_FRAMES[color];
  },

  /** Get ball cracked frames for destroy animation */
  getBallCrackedFrames(color: BallColor): string[] {
    return BALL_CRACKED_FRAMES[color];
  },

  /** Get special ball frame key (animated) */
  getSpecialFrame(special: Exclude<SpecialType, 'none'>, frameIndex: number): string {
    const frames = SPECIAL_FRAMES[special];
    return frames[frameIndex % frames.length];
  },

  /** Get special ball frame count */
  getSpecialFrameCount(): number {
    return SPECIAL_FRAME_COUNT;
  },

  /** Get special ball animation FPS */
  getSpecialFPS(): number {
    return SPECIAL_FPS;
  },

  /** Get obstacle sprite frame key based on remaining HP */
  getObstacleFrame(type: string, currentHp: number): string {
    const frames = OBSTACLE_FRAMES[type];
    if (!frames) return '';
    // Clamp to valid range
    const index = Math.max(0, Math.min(currentHp, frames.length - 1));
    return frames[index];
  },

  /** Get obstacle destroy frame (0 HP) */
  getObstacleDestroyFrame(type: string): string {
    const frames = OBSTACLE_FRAMES[type];
    return frames?.[0] ?? '';
  },

  /** Get UI element sprite frame key */
  getUIFrame(element: 'cell' | 'heart' | 'ring' | 'star'): string {
    return UI_FRAMES[element];
  },

  /** Destroy animation duration in seconds */
  getDestroyDuration(): number {
    return DESTROY_ANIMATION_DURATION;
  },

  /** Destroy animation FPS */
  getDestroyFPS(): number {
    return DESTROY_ANIMATION_FPS;
  },
};
