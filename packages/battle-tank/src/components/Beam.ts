export const BEAM = 'Beam';

export interface BeamHit {
  x: number;
  y: number;
  targetId?: number; // entity id if hit a tank
}

/** Short-lived beam entity for laser hitscan. No Position/Velocity — drawn directly. */
export interface BeamComponent {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hits: BeamHit[];
  elapsed: number;     // seconds since spawn
  maxDuration: number; // seconds — derived from behavior.persistMs
  layerCount: number;  // concentric line layers (3 for laser)
  ownerId: number;
}
