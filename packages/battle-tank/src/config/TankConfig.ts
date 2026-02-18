export interface TankDef {
  hull: { spriteKey: string; width: number; height: number };
  tracks: { spriteKey: string; width: number; height: number; spacing: number };
  turret: { spriteKey: string; width: number; height: number; pivotY: number };
  movement: {
    maxForwardSpeed: number;  // px/s
    maxReverseSpeed: number;  // px/s
    acceleration: number;     // px/s^2
    deceleration: number;     // px/s^2 (friction when no input)
    turnRate: number;         // rad/s
  };
  collisionRadius: number;    // px from center
}

/**
 * Hull_01 + Track_1 + Gun_01 — light starter tank.
 *
 * Source sprites: Hull 256x256, Track 42x246, Gun 94x212.
 * Display scale: 56/256 ≈ 0.219 (hull fits inside 64px tile with margin).
 */
export const PLAYER_TANK: TankDef = {
  hull: { spriteKey: 'hull-01', width: 56, height: 56 },
  tracks: { spriteKey: 'track-1a', width: 9, height: 54, spacing: 22 },
  turret: { spriteKey: 'gun-01', width: 20, height: 46, pivotY: 0.8 },
  movement: {
    maxForwardSpeed: 150,
    maxReverseSpeed: 75,
    acceleration: 300,
    deceleration: 200,
    turnRate: Math.PI, // 180 deg/s
  },
  collisionRadius: 22,
};
