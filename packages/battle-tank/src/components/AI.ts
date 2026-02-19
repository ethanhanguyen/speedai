export const AI_STATE = 'AIState';

export enum AIState {
  IDLE = 'idle',
  CHASE = 'chase',
  ENGAGE = 'engage',
}

export type AIRole = 'grunt' | 'flanker' | 'sniper' | 'rusher';

export interface AIComponent {
  state: AIState;
  role: AIRole;
  reactionTimer: number;      // countdown before first shot in ENGAGE
  retargetTimer: number;      // countdown to next turret angle update
  fireRange: number;          // px — CHASE→ENGAGE threshold (resolved from profile)
  preferredRange: number;     // px — ideal engage distance (resolved from profile)
  accuracy: number;           // 0–1 (resolved)
  maxSpread: number;          // radians (resolved)
  engageSpeedFraction: number; // 0–1 — fraction of maxForwardSpeed in ENGAGE
  engageStrafeRate: number;   // rad/s — orbit speed around player
  chaseOffsetAngle: number;   // radians — flanking approach offset
  fireOnMove: boolean;        // can fire during CHASE
  strafeSign: 1 | -1;        // orbit direction (randomized at spawn)
  // Squad formation — infantry maintain offset relative to assigned tank lead
  squadLeadId?: number;       // entity ID of squad lead tank; undefined = no squad
  formationDx: number;        // local-space offset: +x = right of lead (rotated by lead hullAngle)
  formationDy: number;        // local-space offset: +y = forward of lead
}
