import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { FLOW_FIELD_CONFIG } from '../config/AIConfig.js';
import type { TerrainCosts } from '../config/PartRegistry.js';

interface FlowVector {
  dx: number;
  dy: number;
}

// ---------------------------------------------------------------------------
// Inline binary min-heap (avoids allocating a class per compute)
// ---------------------------------------------------------------------------

interface HeapEntry { cost: number; r: number; c: number }

function heapPush(heap: HeapEntry[], entry: HeapEntry): void {
  heap.push(entry);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].cost <= heap[i].cost) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop(heap: HeapEntry[]): HeapEntry | undefined {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0 && last) {
    heap[0] = last;
    let i = 0;
    const len = heap.length;
    for (;;) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < len && heap[l].cost < heap[smallest].cost) smallest = l;
      if (r < len && heap[r].cost < heap[smallest].cost) smallest = r;
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

// ---------------------------------------------------------------------------
// FlowField — Dijkstra with optional terrain costs
// ---------------------------------------------------------------------------

const OFFSETS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * Dijkstra-based flow field: precomputes a direction vector per tile
 * pointing toward the goal (player position). AI entities sample this
 * to navigate around obstacles.
 *
 * When terrainCosts are provided, edge weights use cost = 1 / terrainCost
 * (lower terrain multiplier → higher traversal cost). Without terrain costs,
 * uniform cost 1.0 is used (equivalent to BFS).
 */
export class FlowField {
  private directions: Map<string, FlowVector> = new Map();
  private lastGoalR = -1;
  private lastGoalC = -1;

  private key(r: number, c: number): string {
    return `${r},${c}`;
  }

  needsRecompute(playerR: number, playerC: number): boolean {
    const dr = Math.abs(playerR - this.lastGoalR);
    const dc = Math.abs(playerC - this.lastGoalC);
    return dr >= FLOW_FIELD_CONFIG.recomputeThreshold
        || dc >= FLOW_FIELD_CONFIG.recomputeThreshold;
  }

  /**
   * Compute flow field using weighted Dijkstra.
   * @param terrainCosts Optional per-TileId speed multipliers.
   *   Edge cost = 1 / multiplier (so mud at 0.6 → cost 1.67).
   *   Omit for uniform-cost BFS behavior.
   */
  compute(tilemap: GridModel<TileCell>, goalR: number, goalC: number, terrainCosts?: TerrainCosts): void {
    this.lastGoalR = goalR;
    this.lastGoalC = goalC;
    this.directions.clear();

    const dist = new Map<string, number>();
    const heap: HeapEntry[] = [];

    const goalKey = this.key(goalR, goalC);
    dist.set(goalKey, 0);
    heapPush(heap, { cost: 0, r: goalR, c: goalC });

    while (heap.length > 0) {
      const cur = heapPop(heap)!;
      const curKey = this.key(cur.r, cur.c);
      const curDist = dist.get(curKey)!;

      // Skip stale entries
      if (cur.cost > curDist) continue;

      for (const [dr, dc] of OFFSETS) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (!tilemap.isValid(nr, nc)) continue;

        const cell = tilemap.get(nr, nc);
        if (!cell || !OBJECT_DEFS[cell.object].walkable) continue;

        // Edge cost: inverse of terrain speed multiplier
        const terrainMult = terrainCosts ? (terrainCosts[cell.ground] ?? 1.0) : 1.0;
        const edgeCost = terrainMult > 0 ? 1.0 / terrainMult : 100; // near-impassable if 0

        const newDist = curDist + edgeCost;
        const nKey = this.key(nr, nc);
        const existing = dist.get(nKey);

        if (existing === undefined || newDist < existing) {
          dist.set(nKey, newDist);
          heapPush(heap, { cost: newDist, r: nr, c: nc });
        }
      }
    }

    // For each reachable tile, compute direction toward lower-cost neighbor
    for (const [key, myDist] of dist) {
      if (myDist === 0) continue; // goal tile — no direction needed

      const [rStr, cStr] = key.split(',');
      const r = parseInt(rStr);
      const c = parseInt(cStr);

      let bestR = r;
      let bestC = c;
      let bestDist = myDist;

      for (const [dr, dc] of OFFSETS) {
        const nr = r + dr;
        const nc = c + dc;
        const nd = dist.get(this.key(nr, nc));
        if (nd !== undefined && nd < bestDist) {
          bestDist = nd;
          bestR = nr;
          bestC = nc;
        }
      }

      const ddx = bestC - c;
      const ddy = bestR - r;
      const len = Math.sqrt(ddx * ddx + ddy * ddy);
      if (len > 0) {
        this.directions.set(key, { dx: ddx / len, dy: ddy / len });
      }
    }
  }

  getDirection(r: number, c: number): FlowVector | null {
    return this.directions.get(this.key(r, c)) ?? null;
  }
}
