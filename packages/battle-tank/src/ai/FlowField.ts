import type { GridModel } from '@speedai/game-engine';
import type { TileCell } from '../tilemap/types.js';
import { OBJECT_DEFS } from '../tilemap/TileRegistry.js';
import { FLOW_FIELD_CONFIG } from '../config/AIConfig.js';

interface FlowVector {
  dx: number;
  dy: number;
}

/**
 * Dijkstra-based flow field: precomputes a direction vector per tile
 * pointing toward the goal (player position). AI entities sample this
 * to navigate around obstacles.
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

  compute(tilemap: GridModel<TileCell>, goalR: number, goalC: number): void {
    this.lastGoalR = goalR;
    this.lastGoalC = goalC;
    this.directions.clear();

    // Dijkstra BFS from goal
    const dist = new Map<string, number>();
    const queue: Array<{ r: number; c: number }> = [];

    const goalKey = this.key(goalR, goalC);
    dist.set(goalKey, 0);
    queue.push({ r: goalR, c: goalC });

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curDist = dist.get(this.key(cur.r, cur.c))!;

      // 4-directional neighbors
      const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of offsets) {
        const nr = cur.r + dr;
        const nc = cur.c + dc;
        if (!tilemap.isValid(nr, nc)) continue;

        const nKey = this.key(nr, nc);
        if (dist.has(nKey)) continue;

        const cell = tilemap.get(nr, nc);
        if (!cell || !OBJECT_DEFS[cell.object].walkable) continue;

        dist.set(nKey, curDist + 1);
        queue.push({ r: nr, c: nc });
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

      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
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
