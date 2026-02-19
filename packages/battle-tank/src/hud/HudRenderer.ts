import type { AssetManager } from '@speedai/game-engine';
import { ProgressBar } from '@speedai/game-engine';
import { COMBAT_CONFIG } from '../config/CombatConfig.js';
import { BUFF_HUD } from '../config/BuffConfig.js';
import type { GameHUDState } from '../config/GameStateTypes.js';

const HP_BAR_CONFIG = {
  x: 16,
  y: 16,
  width: 160,
  height: 16,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: '#222',
  backgroundColor: '#333',
};

const WAVE_BANNER_DURATION = 2.0;  // seconds
const WAVE_BANNER_FADE = 0.5;      // seconds of fade in/out

/**
 * Screen-space HUD: HP bar, wave indicator, kill count, coin count, wave banner,
 * active buff/debuff icons with screen vignette + expiry blink.
 */
export class HudRenderer {
  private hpBar: ProgressBar;
  private bannerTimer = 0;
  private bannerWave = 0;
  private elapsed = 0;

  constructor(private assets?: AssetManager) {
    this.hpBar = new ProgressBar(HP_BAR_CONFIG);
  }

  /** Trigger wave banner display. */
  showWaveBanner(waveNumber: number): void {
    this.bannerWave = waveNumber;
    this.bannerTimer = WAVE_BANNER_DURATION;
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }
  }

  /** Draw HUD elements. ctx must be in screen space (no camera transform). */
  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, state: GameHUDState): void {
    // Screen-edge vignette for active buff/debuff state
    if (state.activeEffects && state.activeEffects.length > 0) {
      this.drawVignette(ctx, canvasWidth, canvasHeight, state.activeEffects);
    }

    // Laser overheat vignette (cyan edge glow when heat is high)
    if (state.heatRatio !== undefined && state.heatRatio > 0.6) {
      this.drawLaserVignette(ctx, canvasWidth, canvasHeight, state.heatRatio);
    }

    // HP bar
    const ratio = state.hp.max > 0 ? state.hp.current / state.hp.max : 0;
    this.hpBar.value = ratio;
    this.hpBar.fillColor = getHPColor(ratio);
    this.hpBar.draw(ctx);

    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';

    const textX = HP_BAR_CONFIG.x;
    let textY = HP_BAR_CONFIG.y + HP_BAR_CONFIG.height + 14;

    ctx.fillText(`HP ${state.hp.current}/${state.hp.max}`, textX, textY);
    textY += 16;
    ctx.fillText(`\u25cf ${state.coins}`, textX, textY);
    textY += 16;
    ctx.fillText(`\u2620 ${state.kills}`, textX, textY);

    // Weapon name
    if (state.weaponName) {
      textY += 16;
      ctx.fillStyle = '#adf';
      ctx.fillText(`\u25ba ${state.weaponName}`, textX, textY);
    }

    // Bomb type
    if (state.activeBombType) {
      textY += 14;
      ctx.fillStyle = '#fa8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`B: ${state.activeBombType}`, textX, textY);
    }

    // Wave indicator — top center
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ddd';
    ctx.fillText(`WAVE ${state.wave}`, canvasWidth / 2, 24);

    ctx.restore();

    // Laser heat bar
    if (state.heatRatio !== undefined && state.heatRatio > COMBAT_CONFIG.laserHeatBar.showThreshold) {
      this.drawLaserHeatBar(ctx, state.heatRatio);
    }

    // Railgun charge bar
    if (state.chargeRatio !== undefined) {
      const cfg   = COMBAT_CONFIG.chargeBar;
      const ratio = state.chargeRatio;
      const ready = ratio >= 1;

      ctx.save();
      ctx.fillStyle = cfg.emptyColor;
      ctx.fillRect(cfg.x, cfg.y, cfg.width, cfg.height);
      ctx.fillStyle = ready ? cfg.readyColor : cfg.fillColor;
      ctx.fillRect(cfg.x, cfg.y, cfg.width * Math.min(ratio, 1), cfg.height);
      ctx.strokeStyle = cfg.borderColor;
      ctx.lineWidth = cfg.borderWidth;
      ctx.strokeRect(cfg.x, cfg.y, cfg.width, cfg.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ready ? 'CHARGED' : 'CHARGING', cfg.x + 4, cfg.y + cfg.height - 2);
      ctx.restore();
    }

    // Active effects icons — top-right, right-to-left
    if (state.activeEffects && state.activeEffects.length > 0) {
      const { iconSize, iconGap, y: ey, rightMargin,
              cooldownOverlay, buffBorder, debuffBorder, borderWidth,
              expiryBlinkThreshold, blinkHz } = BUFF_HUD;
      let ex = canvasWidth - rightMargin - iconSize;

      for (let i = state.activeEffects.length - 1; i >= 0; i--) {
        const eff = state.activeEffects[i];
        const progress = eff.remainingS / eff.durationS;

        // Blink icon alpha when near expiry
        const nearExpiry = progress < expiryBlinkThreshold;
        const iconAlpha = nearExpiry
          ? 0.4 + 0.6 * (Math.sin(this.elapsed * blinkHz * Math.PI * 2) * 0.5 + 0.5)
          : 1;

        ctx.save();
        ctx.globalAlpha = iconAlpha;

        const img = this.assets?.getImage(eff.iconKey);
        if (img) {
          ctx.drawImage(img, ex, ey, iconSize, iconSize);
        } else {
          ctx.fillStyle = eff.polarity === 'buff' ? '#44ff44' : '#ff4444';
          ctx.fillRect(ex, ey, iconSize, iconSize);
        }

        // Radial cooldown overlay (pie-sweep from top, clockwise = elapsed)
        if (progress < 1) {
          ctx.fillStyle = cooldownOverlay;
          ctx.beginPath();
          const cx = ex + iconSize / 2;
          const cy = ey + iconSize / 2;
          const r = iconSize / 2;
          ctx.moveTo(cx, cy);
          const startAngle = -Math.PI / 2;
          ctx.arc(cx, cy, r, startAngle, startAngle + (1 - progress) * Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        }

        // Polarity border
        ctx.globalAlpha = iconAlpha;
        ctx.strokeStyle = eff.polarity === 'buff' ? buffBorder : debuffBorder;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(ex, ey, iconSize, iconSize);

        ctx.restore();
        ex -= iconSize + iconGap;
      }
    }

    // Wave banner overlay
    if (this.bannerTimer > 0) {
      const fadeIn = WAVE_BANNER_DURATION - this.bannerTimer < WAVE_BANNER_FADE
        ? (WAVE_BANNER_DURATION - this.bannerTimer) / WAVE_BANNER_FADE
        : 1;
      const fadeOut = this.bannerTimer < WAVE_BANNER_FADE
        ? this.bannerTimer / WAVE_BANNER_FADE
        : 1;
      const alpha = Math.min(fadeIn, fadeOut);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`WAVE ${this.bannerWave}`, canvasWidth / 2, 120);
      ctx.restore();
    }
  }

  /**
   * Draw a screen-edge gradient vignette tinted by active effect polarity.
   * Green for buffs, red for debuffs. Both can be visible simultaneously.
   */
  private drawVignette(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    effects: readonly { polarity: 'buff' | 'debuff' }[],
  ): void {
    const hasBuff   = effects.some(e => e.polarity === 'buff');
    const hasDebuff = effects.some(e => e.polarity === 'debuff');
    const cx = w / 2;
    const cy = h / 2;
    const innerR = Math.min(w, h) * 0.35;
    const outerR = Math.max(w, h) * 0.72;

    const drawLayer = (color: string): void => {
      const grd = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, color);
      ctx.save();
      ctx.globalAlpha = BUFF_HUD.vignetteAlpha;
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    if (hasBuff)   drawLayer(BUFF_HUD.vignetteBuffColor);
    if (hasDebuff) drawLayer(BUFF_HUD.vignetteDebuffColor);
  }

  /**
   * Heat bar: cyan → orange gradient fill, flashes red on overheat.
   * Drawn below the weapon name label.
   */
  private drawLaserHeatBar(ctx: CanvasRenderingContext2D, heatRatio: number): void {
    const hcfg = COMBAT_CONFIG.laserHeatBar;
    const isOverheat = heatRatio >= 1;
    const fillW = hcfg.width * Math.min(heatRatio, 1);

    ctx.save();

    // Background
    ctx.fillStyle = hcfg.emptyColor;
    ctx.fillRect(hcfg.x, hcfg.y, hcfg.width, hcfg.height);

    // Fill — gradient from cool to hot, flashes on overheat
    if (isOverheat) {
      const flash = Math.sin(this.elapsed * hcfg.overheatFlashHz * Math.PI * 2) > 0;
      ctx.fillStyle = flash ? hcfg.overheatColor : '#ff8800';
    } else {
      const grad = ctx.createLinearGradient(hcfg.x, 0, hcfg.x + hcfg.width, 0);
      grad.addColorStop(0, hcfg.coolColor);
      grad.addColorStop(1, hcfg.hotColor);
      // Clip to filled portion
      ctx.save();
      ctx.beginPath();
      ctx.rect(hcfg.x, hcfg.y, fillW, hcfg.height);
      ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(hcfg.x, hcfg.y, hcfg.width, hcfg.height);
      ctx.restore();
    }

    if (isOverheat) {
      ctx.fillRect(hcfg.x, hcfg.y, fillW, hcfg.height);
    }

    // Border
    ctx.strokeStyle = hcfg.borderColor;
    ctx.lineWidth   = hcfg.borderWidth;
    ctx.strokeRect(hcfg.x, hcfg.y, hcfg.width, hcfg.height);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isOverheat ? 'OVERHEAT' : 'HEAT', hcfg.x + 4, hcfg.y + hcfg.height - 1);

    ctx.restore();
  }

  /**
   * Subtle cyan edge glow when laser heat is above 60%.
   * Intensity ramps from 0% at heat=0.6 to max at heat=1.0.
   */
  private drawLaserVignette(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    heatRatio: number,
  ): void {
    const maxAlpha = COMBAT_CONFIG.laserBeam.overheatVignetteMaxAlpha;
    const t = Math.max(0, (heatRatio - 0.6) / 0.4);
    const alpha = t * maxAlpha;
    const cx = w / 2;
    const cy = h / 2;
    const grd = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, `rgba(0,150,255,${alpha.toFixed(2)})`);
    ctx.save();
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function getHPColor(ratio: number): string {
  if (ratio > COMBAT_CONFIG.damageStates.cracked) return '#4a4';
  if (ratio > COMBAT_CONFIG.damageStates.smoking) return '#cc4';
  return '#c44';
}
