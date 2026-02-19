import type { EntityManager, EventBus, HealthComponent } from '@speedai/game-engine';
import { ARMOR_TABLE, ARMOR_KIT_DEFS } from '../config/ArmorConfig.js';
import { ARMOR_KIT } from '../components/ArmorKit.js';
import type { ArmorKitComponent } from '../components/ArmorKit.js';
import { AI_STATE } from '../components/AI.js';
import type { AIComponent } from '../components/AI.js';
import type { WeaponDef } from '../config/WeaponConfig.js';
import type { BuffSystem } from '../systems/BuffSystem.js';
import { TANK_PARTS } from '../tank/TankParts.js';
import type { TankPartsComponent } from '../tank/TankParts.js';
import { INFANTRY_PARTS } from '../components/InfantryParts.js';
import type { InfantryPartsComponent } from '../components/InfantryParts.js';

const DEG_TO_RAD = Math.PI / 180;

/** Wrap angle to [-PI, PI]. */
function wrapAngle(a: number): number {
  while (a >  Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Listens to 'projectile:hit:entity' and 'splash:entity:hit'.
 * Applies armor multiplier + buff modifiers, deducts HP, applies knockback.
 * Fires 'entity:damaged' or 'entity:killed'.
 */
export function initEntityDamageListeners(
  em: EntityManager,
  eventBus: EventBus,
  playerId?: number,
  buffSystem?: BuffSystem,
): void {
  eventBus.on('projectile:hit:entity', (event: unknown) => {
    const e = event as { data?: HitData };
    const d: HitData = (e.data ?? e) as HitData;
    if (!d || d.targetId === undefined) return;

    const health = em.getComponent(d.targetId, 'Health') as HealthComponent | undefined;
    if (!health) return;

    const armor   = em.getComponent(d.targetId, ARMOR_KIT) as ArmorKitComponent | undefined;
    const kitId   = armor?.kitId ?? 'none';
    const dmgType = d.weaponDef?.damageType ?? 'kinetic';
    const kitDef  = ARMOR_KIT_DEFS[kitId];

    // --- Zone + angle-of-incidence (Phase 5.4) ---
    let zoneMult = 1.0;
    const tankPos     = em.getComponent(d.targetId, 'Position') as { x: number; y: number } | undefined;
    const tankParts   = em.getComponent(d.targetId, TANK_PARTS) as TankPartsComponent | undefined;
    const infParts    = em.getComponent(d.targetId, INFANTRY_PARTS) as InfantryPartsComponent | undefined;
    const hullAngle   = tankParts?.hullAngle ?? infParts?.facingAngle ?? 0;

    if (tankPos && d.shotVx !== undefined && d.shotVy !== undefined) {
      // Outward normal: direction from tank center to hit point (atan2 convention)
      const outwardNormal = Math.atan2(d.y - tankPos.y, d.x - tankPos.x);

      // Zone: angular distance from hull forward to hit-point normal.
      // Hull forward in screen atan2 = hullAngle - PI/2 (0=up convention → -PI/2 in atan2).
      const frontDiff = Math.abs(wrapAngle(outwardNormal - (hullAngle - Math.PI / 2)));
      const zone = frontDiff < kitDef.zones.frontArcDeg * DEG_TO_RAD ? 'front'
                 : frontDiff > Math.PI - kitDef.zones.rearArcDeg * DEG_TO_RAD ? 'rear'
                 : 'side';
      zoneMult = zone === 'front' ? kitDef.zones.frontMult
               : zone === 'rear'  ? kitDef.zones.rearMult
               : kitDef.zones.sideMult;

      // Incidence angle: 0=head-on (perpendicular to armor), PI/2=glancing.
      // Inward normal = outwardNormal + PI; projectile matches inward normal when head-on.
      const projAngle = Math.atan2(d.shotVy, d.shotVx);
      let incidenceRad = Math.abs(wrapAngle(projAngle - (outwardNormal + Math.PI)));

      // AP (kinetic) rounds partially self-orient on contact → reduce incidence
      if (dmgType === 'kinetic') {
        incidenceRad = Math.max(0, incidenceRad - kitDef.deflection.normalizationDeg * DEG_TO_RAD);
      }

      // Ricochet: kinetic glancing blow below overmatch threshold → zero damage
      if (
        dmgType === 'kinetic' &&
        d.damage < kitDef.deflection.overmatchDamage &&
        incidenceRad > kitDef.deflection.ricochetAngleDeg * DEG_TO_RAD
      ) {
        eventBus.fire('projectile:deflected', { x: d.x, y: d.y });
        return;
      }
    }

    let eff = Math.round(d.damage * ARMOR_TABLE[kitId][dmgType] * zoneMult);

    // Buff modifiers: outgoing damage (attacker=player) + incoming damage (target=player)
    if (buffSystem) {
      if (d.ownerId !== undefined && d.ownerId === playerId) {
        eff = Math.round(eff * buffSystem.getModifier('damage'));
      }
      if (d.targetId === playerId) {
        eff = Math.round(eff * buffSystem.getModifier('incomingDamage'));
      }
    }

    health.current = Math.max(0, health.current - eff);

    // Universal stagger impulse
    if (d.weaponDef && d.shotVx !== undefined && d.shotVy !== undefined) {
      const vel = em.getComponent(d.targetId, 'Velocity') as { vx: number; vy: number } | undefined;
      if (vel) {
        const spd = Math.hypot(d.shotVx, d.shotVy);
        if (spd > 0) {
          const nx = d.shotVx / spd;
          const ny = d.shotVy / spd;
          vel.vx += nx * d.weaponDef.hitStaggerPx;
          vel.vy += ny * d.weaponDef.hitStaggerPx;
          if (d.weaponDef.behavior.kind === 'ballistic') {
            const kb = (d.weaponDef.behavior as { kind: 'ballistic'; knockbackPx?: number }).knockbackPx ?? 0;
            vel.vx += nx * kb;
            vel.vy += ny * kb;
          }
        }
      }
    }

    resolveHP(em, eventBus, d.targetId, eff, d.x, d.y, d.weaponDef);
  });

  // Splash / bomb detonation radius hits
  eventBus.on('splash:entity:hit', (event: unknown) => {
    const e = event as { data?: SplashHitData };
    const d: SplashHitData = (e.data ?? e) as SplashHitData;
    if (!d || d.targetId === undefined) return;

    const health = em.getComponent(d.targetId, 'Health') as HealthComponent | undefined;
    if (!health) return;

    const armor = em.getComponent(d.targetId, ARMOR_KIT) as ArmorKitComponent | undefined;
    const kitId = armor?.kitId ?? 'none';
    let eff     = Math.round(d.damage * ARMOR_TABLE[kitId]['explosive'] * d.falloffMultiplier);

    // Buff modifier: incoming damage for player target
    if (buffSystem && d.targetId === playerId) {
      eff = Math.round(eff * buffSystem.getModifier('incomingDamage'));
    }

    health.current = Math.max(0, health.current - eff);

    // Splash stagger: push target away from blast center
    if (d.splashCenterX !== undefined && d.splashCenterY !== undefined && d.weaponDef) {
      const vel = em.getComponent(d.targetId, 'Velocity') as { vx: number; vy: number } | undefined;
      const pos = em.getComponent(d.targetId, 'Position') as { x: number; y: number } | undefined;
      if (vel && pos) {
        const dx = pos.x - d.splashCenterX;
        const dy = pos.y - d.splashCenterY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const scale = d.weaponDef.hitStaggerPx * d.falloffMultiplier;
          vel.vx += (dx / dist) * scale;
          vel.vy += (dy / dist) * scale;
        }
      }
    }

    resolveHP(em, eventBus, d.targetId, eff, d.x, d.y, d.weaponDef);
  });
}

function resolveHP(
  em: EntityManager,
  eventBus: EventBus,
  entityId: number,
  damage: number,
  x: number, y: number,
  weaponDef?: import('../config/WeaponConfig.js').WeaponDef,
): void {
  const health = em.getComponent(entityId, 'Health') as HealthComponent | undefined;
  if (!health) return;

  const pos = em.getComponent(entityId, 'Position') as { x: number; y: number } | undefined;
  const ex  = pos?.x ?? x;
  const ey  = pos?.y ?? y;

  if (health.current <= 0) {
    const tags   = em.getComponent(entityId, 'Tag')    as Set<string> | undefined;
    const ai     = em.getComponent(entityId, AI_STATE) as unknown as AIComponent | undefined;
    const armor  = em.getComponent(entityId, ARMOR_KIT) as ArmorKitComponent | undefined;
    eventBus.fire('entity:killed', {
      entityId,
      x: ex, y: ey,
      tags:     tags ? Array.from(tags) : [],
      role:     ai?.role,
      armorKit: armor?.kitId,
    });
    em.destroy(entityId);
  } else {
    eventBus.fire('entity:damaged', {
      entityId,
      x: ex, y: ey,
      remaining: health.current,
      damage,
      weaponDef,
    });
  }
}

interface HitData {
  projectileId: number;
  targetId: number;
  ownerId?: number;
  x: number;
  y: number;
  damage: number;
  weaponDef?: WeaponDef;
  shotVx?: number;
  shotVy?: number;
}

interface SplashHitData {
  targetId: number;
  x: number;
  y: number;
  damage: number;
  falloffMultiplier: number;
  splashCenterX?: number;
  splashCenterY?: number;
  weaponDef?: import('../config/WeaponConfig.js').WeaponDef;
}
