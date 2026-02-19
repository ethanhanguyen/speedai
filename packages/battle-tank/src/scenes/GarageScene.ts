import { Scene, Button } from '@speedai/game-engine';
import type { AssetManager, UnifiedInput, SceneManager } from '@speedai/game-engine';
import type { LoadoutParts, RadarStats } from '../config/PartRegistry.js';
import {
  DEFAULT_LOADOUT,
  HULL_REGISTRY, ENGINE_REGISTRY, TRACK_REGISTRY, ARMOR_REGISTRY,
  GUN_PARTS,
  assembleLoadout, computeRadarStats, computeTotalWeight, computePWRatio,
} from '../config/PartRegistry.js';
import type { WeaponDef } from '../config/WeaponConfig.js';
import type { ArmorKitId } from '../config/ArmorConfig.js';
import {
  GARAGE_LAYOUT, GARAGE_STYLE,
  SLOT_CATEGORIES, SLOT_LABELS,
  FLAVOR_TEXT,
} from '../config/GarageConfig.js';
import type { SlotCategory } from '../config/GarageConfig.js';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';
import { drawRadarChart } from '../garage/RadarChart.js';
import { drawWeightBar } from '../garage/WeightBar.js';
import { drawCompareStrip } from '../garage/CompareStrip.js';
import { drawTankPreview } from '../garage/TankPreview.js';
import {
  getActiveLoadout, setActiveLoadout,
  saveLoadout, loadLoadout,
} from '../systems/LoadoutSystem.js';
import type { SlotIndex } from '../systems/LoadoutSystem.js';

const CW = ENGINE_CONFIG.canvas.width;
const CH = ENGINE_CONFIG.canvas.height;

// ---------------------------------------------------------------------------
// Part item list helpers
// ---------------------------------------------------------------------------

interface PartItem {
  id: string;
  name: string;
  spriteKey: string; // '' for abstract parts (engines)
}

function getPartItems(category: SlotCategory): PartItem[] {
  switch (category) {
    case 'hull':
      return Object.values(HULL_REGISTRY).map(h => ({ id: h.id, name: h.name, spriteKey: h.spriteKey }));
    case 'engine':
      return Object.values(ENGINE_REGISTRY).map(e => ({ id: e.id, name: e.name, spriteKey: '' }));
    case 'track':
      return Object.values(TRACK_REGISTRY).map(t => ({ id: t.id, name: t.name, spriteKey: t.spriteKey }));
    case 'gun':
      return GUN_PARTS.map(g => ({ id: g.id, name: g.name, spriteKey: g.turret.spriteKey }));
    case 'armor':
      return Object.values(ARMOR_REGISTRY).map(a => ({ id: a.id, name: a.name, spriteKey: '' }));
  }
}

function getSelectedId(parts: LoadoutParts, category: SlotCategory): string {
  switch (category) {
    case 'hull': return parts.hullId;
    case 'engine': return parts.engineId;
    case 'track': return parts.trackId;
    case 'gun': return parts.gunId;
    case 'armor': return parts.armorId;
  }
}

function setPartId(parts: LoadoutParts, category: SlotCategory, id: string): LoadoutParts {
  const next = { ...parts };
  switch (category) {
    case 'hull': next.hullId = id; break;
    case 'engine': next.engineId = id; break;
    case 'track': next.trackId = id; break;
    case 'gun': next.gunId = id; break;
    case 'armor': next.armorId = id as ArmorKitId; break;
  }
  return next;
}

// ---------------------------------------------------------------------------
// GarageScene
// ---------------------------------------------------------------------------

export class GarageScene extends Scene {
  private parts: LoadoutParts = { ...DEFAULT_LOADOUT };
  private activeCategory: SlotCategory = 'hull';
  private previewAngle = 0;
  private elapsed = 0;
  private hoveredPartId: string | null = null;
  private hoveredStats: RadarStats | null = null;
  private scrollOffset = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartScroll = 0;
  private previewDragging = false;
  private previewDragStartAngle = 0;
  private previewDragStartX = 0;

  private deployBtn!: Button;
  private backBtn!: Button;
  private slotBtns: Button[] = [];
  private loadoutBtns: Button[] = [];
  private wasPointerDown = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: AssetManager,
    private input: UnifiedInput,
    private sceneManager: SceneManager,
  ) {
    super('Garage');
  }

  init(): void {
    this.parts = { ...getActiveLoadout() };
    this.activeCategory = 'hull';
    this.previewAngle = 0;
    this.elapsed = 0;
    this.hoveredPartId = null;
    this.hoveredStats = null;
    this.scrollOffset = 0;
    this.wasPointerDown = false;
    this.dragging = false;
    this.previewDragging = false;

    // Deploy button
    const dl = GARAGE_LAYOUT.deploy;
    this.deployBtn = new Button({
      x: dl.x, y: dl.y, width: dl.width, height: dl.height,
      label: 'DEPLOY', font: GARAGE_STYLE.buttonFont,
      textColor: '#fff', backgroundColor: GARAGE_STYLE.accentColor,
      hoverColor: '#5b8', pressedColor: '#396', borderRadius: 6,
    });
    this.deployBtn.on('click', () => {
      setActiveLoadout(this.parts);
      this.sceneManager.switchTo('Gameplay');
    });

    // Back button
    const bl = GARAGE_LAYOUT.back;
    this.backBtn = new Button({
      x: bl.x, y: bl.y, width: bl.width, height: bl.height,
      label: 'BACK', font: GARAGE_STYLE.buttonFont,
      textColor: '#fff', backgroundColor: '#555',
      hoverColor: '#666', pressedColor: '#444', borderRadius: 6,
    });
    this.backBtn.on('click', () => {
      this.sceneManager.switchTo('Menu');
    });

    // Slot category tab buttons
    this.slotBtns = SLOT_CATEGORIES.map((cat, i) => {
      const st = GARAGE_LAYOUT.slotTabs;
      const btn = new Button({
        x: st.x, y: st.y + i * (st.height + st.gap),
        width: st.width, height: st.height,
        label: SLOT_LABELS[cat], font: GARAGE_STYLE.categoryFont,
        textColor: '#fff', backgroundColor: 'rgba(255,255,255,0.08)',
        hoverColor: 'rgba(255,255,255,0.14)', pressedColor: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
      });
      btn.on('click', () => {
        this.activeCategory = cat;
        this.scrollOffset = 0;
        this.hoveredPartId = null;
        this.hoveredStats = null;
      });
      return btn;
    });

    // Loadout save/load buttons (3 slots)
    const ll = GARAGE_LAYOUT.loadoutSlots;
    this.loadoutBtns = [0, 1, 2].map((slot) => {
      const btn = new Button({
        x: ll.x + slot * (ll.width + ll.gap), y: ll.y,
        width: ll.width, height: ll.height,
        label: `SLOT ${slot + 1}`, font: GARAGE_STYLE.cardFont,
        textColor: '#fff', backgroundColor: 'rgba(255,255,255,0.08)',
        hoverColor: 'rgba(255,255,255,0.14)', pressedColor: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
      });
      btn.on('click', () => this.handleLoadoutSlot(slot as SlotIndex));
      return btn;
    });
  }

  private async handleLoadoutSlot(slot: SlotIndex): Promise<void> {
    // Shift = save, otherwise load
    if (this.input.isPressed('ShiftLeft') || this.input.isPressed('ShiftRight')) {
      await saveLoadout(slot, this.parts);
    } else {
      const loaded = await loadLoadout(slot);
      if (loaded) {
        this.parts = loaded;
        this.hoveredPartId = null;
        this.hoveredStats = null;
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    const pointer = this.input.getPointer();
    const allButtons = [...this.slotBtns, this.deployBtn, this.backBtn, ...this.loadoutBtns];

    for (const btn of allButtons) btn.onPointerMove(pointer.x, pointer.y);

    if (pointer.down && !this.wasPointerDown) {
      for (const btn of allButtons) btn.onPointerDown(pointer.x, pointer.y);

      // Check if pointer is in card strip area for drag-scroll
      const sl = GARAGE_LAYOUT.slots;
      if (pointer.y >= sl.y && pointer.y <= sl.y + sl.height && pointer.x > GARAGE_LAYOUT.slotTabs.x + GARAGE_LAYOUT.slotTabs.width) {
        // Check for card click
        const cardClicked = this.getCardAtPointer(pointer.x, pointer.y);
        if (cardClicked) {
          this.parts = setPartId(this.parts, this.activeCategory, cardClicked);
          this.hoveredPartId = null;
          this.hoveredStats = null;
        } else {
          this.dragging = true;
          this.dragStartX = pointer.x;
          this.dragStartScroll = this.scrollOffset;
        }
      }

      // Preview area drag-to-rotate
      const pr = GARAGE_LAYOUT.preview;
      const pdx = pointer.x - pr.cx;
      const pdy = pointer.y - pr.cy;
      if (pdx * pdx + pdy * pdy < pr.radius * pr.radius) {
        this.previewDragging = true;
        this.previewDragStartX = pointer.x;
        this.previewDragStartAngle = this.previewAngle;
      }
    }

    if (!pointer.down && this.wasPointerDown) {
      for (const btn of allButtons) btn.onPointerUp(pointer.x, pointer.y);
      this.dragging = false;
      this.previewDragging = false;
    }

    // Drag updates
    if (this.dragging) {
      this.scrollOffset = this.dragStartScroll + (this.dragStartX - pointer.x);
    }
    if (this.previewDragging) {
      const rotationSensitivity = Math.PI / 100;
      this.previewAngle = this.previewDragStartAngle + (pointer.x - this.previewDragStartX) * rotationSensitivity;
    }

    // Card hover (for compare strip)
    if (!this.dragging) {
      const sl = GARAGE_LAYOUT.slots;
      if (pointer.y >= sl.y && pointer.y <= sl.y + sl.height) {
        const hovId = this.getCardAtPointer(pointer.x, pointer.y);
        if (hovId && hovId !== getSelectedId(this.parts, this.activeCategory)) {
          this.hoveredPartId = hovId;
          const previewParts = setPartId(this.parts, this.activeCategory, hovId);
          this.hoveredStats = computeRadarStats(previewParts);
        } else {
          this.hoveredPartId = null;
          this.hoveredStats = null;
        }
      } else {
        this.hoveredPartId = null;
        this.hoveredStats = null;
      }
    }

    this.wasPointerDown = pointer.down;

    // Slow auto-rotate when not dragging
    if (!this.previewDragging) {
      this.previewAngle += dt * 0.15;
    }
  }

  private getCardAtPointer(px: number, py: number): string | null {
    const sl = GARAGE_LAYOUT.slots;
    const items = getPartItems(this.activeCategory);
    const startX = GARAGE_LAYOUT.slotTabs.x + GARAGE_LAYOUT.slotTabs.width + sl.scrollPadding - this.scrollOffset;

    for (let i = 0; i < items.length; i++) {
      const cx = startX + i * (sl.cardWidth + sl.gap);
      if (px >= cx && px <= cx + sl.cardWidth && py >= sl.y && py <= sl.y + sl.cardHeight) {
        return items[i].id;
      }
    }
    return null;
  }

  render(_alpha: number): void {
    const ctx = this.canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = GARAGE_STYLE.bgColor;
    ctx.fillRect(0, 0, CW, CH);

    // Title
    ctx.save();
    ctx.font = GARAGE_STYLE.titleFont;
    ctx.fillStyle = GARAGE_STYLE.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('GARAGE', CW / 2, 10);
    ctx.restore();

    // Tank preview
    const pr = GARAGE_LAYOUT.preview;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pr.cx, pr.cy, pr.radius, 0, Math.PI * 2);
    ctx.strokeStyle = GARAGE_STYLE.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    drawTankPreview(ctx, this.assets, this.parts, pr.cx, pr.cy, this.previewAngle, 1.4);

    // Radar chart
    const currentStats = computeRadarStats(this.parts);
    const rl = GARAGE_LAYOUT.radar;
    drawRadarChart(ctx, rl.cx, rl.cy, rl.radius, currentStats, this.hoveredStats ?? undefined);

    // Weight bar
    const totalWeight = computeTotalWeight(this.parts);
    const pwRatio = computePWRatio(this.parts);
    drawWeightBar(ctx, totalWeight, pwRatio, this.elapsed);

    // Compare strip (only when hovering a different part)
    if (this.hoveredPartId && this.hoveredStats) {
      drawCompareStrip(ctx, currentStats, this.hoveredStats, this.hoveredPartId);
    }

    // Slot category tabs
    for (let i = 0; i < this.slotBtns.length; i++) {
      this.slotBtns[i].draw(ctx);
      // Active indicator
      if (SLOT_CATEGORIES[i] === this.activeCategory) {
        const btn = this.slotBtns[i];
        ctx.save();
        ctx.strokeStyle = GARAGE_STYLE.accentColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x - 1, btn.y - 1, btn.width + 2, btn.height + 2);
        ctx.restore();
      }
    }

    // Part card strip
    this.drawCardStrip(ctx);

    // Loadout slot buttons
    for (const btn of this.loadoutBtns) btn.draw(ctx);
    ctx.save();
    ctx.font = GARAGE_STYLE.cardFont;
    ctx.fillStyle = GARAGE_STYLE.dimTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Click=Load  Shift+Click=Save', GARAGE_LAYOUT.loadoutSlots.x, GARAGE_LAYOUT.loadoutSlots.y + 32);
    ctx.restore();

    // Deploy + Back buttons
    this.deployBtn.draw(ctx);
    this.backBtn.draw(ctx);
  }

  private drawCardStrip(ctx: CanvasRenderingContext2D): void {
    const sl = GARAGE_LAYOUT.slots;
    const items = getPartItems(this.activeCategory);
    const selectedId = getSelectedId(this.parts, this.activeCategory);
    const startX = GARAGE_LAYOUT.slotTabs.x + GARAGE_LAYOUT.slotTabs.width + sl.scrollPadding - this.scrollOffset;
    const cs = GARAGE_STYLE.card;

    // Clip region
    ctx.save();
    const clipX = GARAGE_LAYOUT.slotTabs.x + GARAGE_LAYOUT.slotTabs.width + 4;
    ctx.beginPath();
    ctx.rect(clipX, sl.y - 2, CW - clipX - 4, sl.height + 4);
    ctx.clip();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cx = startX + i * (sl.cardWidth + sl.gap);
      const cy = sl.y;
      const isSelected = item.id === selectedId;
      const isHovered = item.id === this.hoveredPartId;

      // Card background
      ctx.fillStyle = cs.bgColor;
      ctx.fillRect(cx, cy, sl.cardWidth, sl.cardHeight);

      // Border
      if (isSelected) {
        ctx.strokeStyle = cs.selectedBorder;
        ctx.lineWidth = cs.borderWidth;
      } else if (isHovered) {
        ctx.strokeStyle = cs.hoverBorder;
        ctx.lineWidth = cs.borderWidth;
      } else {
        ctx.strokeStyle = GARAGE_STYLE.panelBorder;
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(cx, cy, sl.cardWidth, sl.cardHeight);

      // Sprite thumbnail (if available)
      if (item.spriteKey) {
        const img = this.assets.getImage(item.spriteKey);
        if (img) {
          const thumbSize = sl.cardWidth - 12;
          const imgX = cx + (sl.cardWidth - thumbSize) / 2;
          const imgY = cy + 2;
          ctx.drawImage(img, imgX, imgY, thumbSize, thumbSize);
        }
      } else {
        // No sprite — draw name centered
        ctx.save();
        ctx.font = GARAGE_STYLE.cardFont;
        ctx.fillStyle = GARAGE_STYLE.dimTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name.split(' ')[0], cx + sl.cardWidth / 2, cy + sl.cardHeight / 2 - 6);
        ctx.restore();
      }

      // Name label at bottom
      ctx.save();
      ctx.font = GARAGE_STYLE.cardFont;
      ctx.fillStyle = isSelected ? GARAGE_STYLE.accentColor : GARAGE_STYLE.dimTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(item.name, cx + sl.cardWidth / 2, cy + sl.cardHeight - 2);
      ctx.restore();
    }

    ctx.restore(); // un-clip
  }
}
