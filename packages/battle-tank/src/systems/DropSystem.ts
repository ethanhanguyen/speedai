import type { EntityManager, EventBus, AssetManager } from '@speedai/game-engine';
import { FrameAnimator } from '@speedai/game-engine';
import { TANK_PARTS } from '../tank/TankParts.js';
import {
  DROP_TABLES, DROP_PHYSICS, ITEM_DISPLAY,
  type DropItemType, type DropSource, type BonusDropEntry,
} from '../config/DropConfig.js';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import type { BuffSystem } from './BuffSystem.js';

interface DroppedItem {
  type: DropItemType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTime: number;
}

/**
 * Owns all world drops: coins, buffs, debuffs, instant pickups.
 * Listens to tile:destroyed + entity:killed, rolls weighted DROP_TABLES, spawns items.
 * Handles magnet pull (modified by BuffSystem), TTL despawn, proximity pickup.
 * Fires 'item:picked' { itemType, x, y } on collect.
 */
export class DropSystem {
  private items: DroppedItem[] = [];
  private _coinsCollected = 0;
  private elapsed = 0;

  get coinsCollected(): number { return this._coinsCollected; }

  constructor(
    private assets: AssetManager,
    private eventBus: EventBus,
    private buffSystem: BuffSystem,
  ) {
    eventBus.on('tile:destroyed', (event: unknown) => {
      const e = event as { data?: { x: number; y: number } };
      const d = (e.data ?? e) as { x: number; y: number };
      if (!d) return;
      this.spawnFromTable('tile', d.x, d.y);
    });

    eventBus.on('entity:killed', (event: unknown) => {
      const e = event as { data?: { x: number; y: number; tags: string[]; role?: string; armorKit?: string } };
      const d = (e.data ?? e) as { x: number; y: number; tags: string[]; role?: string; armorKit?: string };
      if (!d?.tags?.includes('enemy')) return;

      const source = resolveDropSource(d.role, d.armorKit);
      this.spawnFromTable(source, d.x, d.y);
    });
  }

  private spawnFromTable(source: DropSource, cx: number, cy: number): void {
    const table = DROP_TABLES[source];
    if (!table) return;

    for (let i = 0; i < table.coins; i++) {
      this.spawnItem('coin', cx, cy);
    }

    if (table.bonusPool.length > 0 && Math.random() < table.bonusChance) {
      const picked = weightedPick(table.bonusPool);
      if (picked) this.spawnItem(picked.itemType, cx, cy);
    }
  }

  private spawnItem(type: DropItemType, cx: number, cy: number): void {
    const angle = Math.random() * Math.PI * 2;
    const r = DROP_PHYSICS.scatter * (0.3 + 0.7 * Math.random());
    this.items.push({
      type,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
      spawnTime: this.elapsed,
    });
  }

  update(em: EntityManager, dt: number): void {
    this.elapsed += dt;
    if (this.items.length === 0) return;

    // Locate player
    let playerX = -1;
    let playerY = -1;
    for (const id of em.query('Position', TANK_PARTS, 'Tag')) {
      const tags = em.getComponent(id, 'Tag') as Set<string> | undefined;
      if (!tags?.has('player')) continue;
      const pos = em.getComponent(id, 'Position') as { x: number; y: number } | undefined;
      if (pos) { playerX = pos.x; playerY = pos.y; }
      break;
    }

    const magnetMod = this.buffSystem.getModifier('magnetRadius');
    const magnetRadius = DROP_PHYSICS.magnetRadius * magnetMod;
    const { magnetSpeed, maxSpeed, friction, pickupRadius, ttl } = DROP_PHYSICS;
    const pickupSq = pickupRadius * pickupRadius;
    const magnetSq = magnetRadius * magnetRadius;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (this.elapsed - item.spawnTime >= ttl) {
        this.items.splice(i, 1);
        continue;
      }

      if (playerX < 0) continue;

      const dx = playerX - item.x;
      const dy = playerY - item.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= pickupSq) {
        this.items.splice(i, 1);
        if (item.type === 'coin') this._coinsCollected++;
        this.eventBus.fire('item:picked', {
          itemType: item.type,
          x: item.x,
          y: item.y,
        });
        continue;
      }

      if (distSq <= magnetSq) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        item.vx += nx * magnetSpeed * dt;
        item.vy += ny * magnetSpeed * dt;
        const speed = Math.sqrt(item.vx * item.vx + item.vy * item.vy);
        if (speed > maxSpeed) {
          item.vx = (item.vx / speed) * maxSpeed;
          item.vy = (item.vy / speed) * maxSpeed;
        }
      } else {
        item.vx *= friction;
        item.vy *= friction;
      }

      item.x += item.vx * dt;
      item.y += item.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const item of this.items) {
      if (item.type === 'coin') {
        this.drawCoin(ctx, item);
      } else {
        this.drawIcon(ctx, item);
      }
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, item: DroppedItem): void {
    const cfg = COMBAT_CONFIG.coin;
    const age = this.elapsed - item.spawnTime;
    const scale = spawnScale(age);
    const size = cfg.displaySize * scale;
    const half = size / 2;
    const frameIndex = FrameAnimator.getLoopingFrame(age, cfg.spriteKeys.length, cfg.animFps);
    const img = this.assets.getImage(cfg.spriteKeys[frameIndex]);
    if (img) {
      ctx.drawImage(img, item.x - half, item.y - half, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(item.x, item.y, half, 0, Math.PI * 2);
      ctx.fillStyle = ITEM_DISPLAY.coin.color;
      ctx.fill();
    }
  }

  private drawIcon(ctx: CanvasRenderingContext2D, item: DroppedItem): void {
    const display = ITEM_DISPLAY[item.type];
    const age = this.elapsed - item.spawnTime;

    let scale = spawnScale(age);
    if (display.pulseAmplitude > 0) {
      scale += display.pulseAmplitude * Math.sin(age * DROP_PHYSICS.pulseSpeed);
    }

    const size = display.size * scale;
    const half = size / 2;
    const bob = Math.sin(this.elapsed * DROP_PHYSICS.bobSpeed + item.spawnTime) * DROP_PHYSICS.bobAmplitude;

    const img = display.spriteKey ? this.assets.getImage(display.spriteKey) : undefined;
    if (img) {
      ctx.drawImage(img, item.x - half, item.y - half + bob, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, half, 0, Math.PI * 2);
      ctx.fillStyle = display.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  reset(): void {
    this.items.length = 0;
    this._coinsCollected = 0;
    this.elapsed = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveDropSource(role: string | undefined, armorKit: string | undefined): DropSource {
  if (armorKit && armorKit !== 'none') {
    if (role === 'grunt')   return 'heavy_grunt';
    if (role === 'sniper')  return 'armored_sniper';
    if (role === 'rusher')  return 'cage_rusher';
  }
  switch (role) {
    case 'grunt':   return 'grunt';
    case 'flanker': return 'flanker';
    case 'sniper':  return 'sniper';
    case 'rusher':  return 'rusher';
    default:        return 'grunt';
  }
}

function weightedPick(pool: BonusDropEntry[]): BonusDropEntry | undefined {
  let total = 0;
  for (const entry of pool) total += entry.weight;
  if (total <= 0) return undefined;

  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1];
}

/** Ease-out scale-in: 0→1 over spawnAnimDurationS. */
function spawnScale(age: number): number {
  if (age >= DROP_PHYSICS.spawnAnimDurationS) return 1;
  const t = age / DROP_PHYSICS.spawnAnimDurationS;
  return 1 - (1 - t) * (1 - t);
}
