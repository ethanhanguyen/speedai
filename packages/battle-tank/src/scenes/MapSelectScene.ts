import { Scene } from '@speedai/game-engine';
import type { UnifiedInput, SceneManager } from '@speedai/game-engine';
import { Button } from '@speedai/game-engine';
import { ENGINE_CONFIG } from '../config/EngineConfig.js';
import { MAP_REGISTRY, getSelectedMapId, setSelectedMapId } from '../config/MapRegistry.js';
import type { MapEntry } from '../config/MapRegistry.js';
import { MAP_SELECT_CONFIG } from '../config/MapSelectConfig.js';
import { CHAR_MAP } from '../tilemap/TileRegistry.js';
import { ObjectId } from '../tilemap/types.js';

const CW = ENGINE_CONFIG.canvas.width;
const CH = ENGINE_CONFIG.canvas.height;
const CFG = MAP_SELECT_CONFIG;

// ---------------------------------------------------------------------------
// Thumbnail rendering
// ---------------------------------------------------------------------------

function buildThumbnail(ascii: string): HTMLCanvasElement {
  const lines = ascii.split('\n');
  const rows = lines.length;
  const cols = lines[0]?.length ?? 0;
  const cellPx = CFG.thumbnail.cellPx;
  const oc = document.createElement('canvas');
  oc.width = cols * cellPx;
  oc.height = rows * cellPx;
  const octx = oc.getContext('2d')!;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c] ?? '.';
      const cell = CHAR_MAP[ch];
      if (!cell) continue;

      // Ground color
      const tileColor = CFG.tileColors[cell.ground];
      octx.fillStyle = tileColor;
      octx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);

      // Object overlay (if any)
      if (cell.object !== ObjectId.NONE) {
        const objColor = CFG.objectColors[cell.object];
        if (objColor) {
          octx.fillStyle = objColor;
          octx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
        }
      }

      // Spawn dots
      if (ch === 'P') {
        octx.fillStyle = CFG.spawnColors.player;
        octx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      } else if (ch === 'S') {
        octx.fillStyle = CFG.spawnColors.enemy;
        octx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
      }
    }
  }

  return oc;
}

// ---------------------------------------------------------------------------
// Card layout helpers
// ---------------------------------------------------------------------------

function cardX(index: number, totalCards: number): number {
  const totalW = totalCards * CFG.card.width + (totalCards - 1) * CFG.card.gap;
  return (CW - totalW) / 2 + index * (CFG.card.width + CFG.card.gap);
}

const CARD_Y = (CH - CFG.card.height) / 2 - 30;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class MapSelectScene extends Scene {
  private thumbnails: HTMLCanvasElement[] = [];
  private backBtn!: Button;
  private deployBtn!: Button;
  private hoveredIndex = -1;
  private wasPointerDown = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private input: UnifiedInput,
    private sceneManager: SceneManager,
  ) {
    super('MapSelect');
  }

  init(): void {
    // Pre-render thumbnails once per init
    this.thumbnails = MAP_REGISTRY.map(entry => buildThumbnail(entry.ascii));

    const btnW = 140;
    const btnH = 42;
    const btnGap = 20;
    const totalBtnW = btnW * 2 + btnGap;
    const btnStartX = (CW - totalBtnW) / 2;
    const btnY = CARD_Y + CFG.card.height + 36;

    this.backBtn = new Button({
      x: btnStartX,
      y: btnY,
      width: btnW,
      height: btnH,
      label: 'BACK',
      font: 'bold 16px monospace',
      backgroundColor: '#444',
      hoverColor: '#555',
      pressedColor: '#333',
      borderRadius: 6,
    });
    this.backBtn.on('click', () => {
      this.sceneManager.switchTo('Garage');
    });

    this.deployBtn = new Button({
      x: btnStartX + btnW + btnGap,
      y: btnY,
      width: btnW,
      height: btnH,
      label: 'DEPLOY',
      font: 'bold 16px monospace',
      backgroundColor: '#4a7',
      hoverColor: '#5b8',
      pressedColor: '#396',
      borderRadius: 6,
    });
    this.deployBtn.on('click', () => {
      this.sceneManager.switchTo('Gameplay');
    });

    this.wasPointerDown = false;
    this.hoveredIndex = -1;
  }

  update(_dt: number): void {
    const pointer = this.input.getPointer();
    const mx = pointer.x, my = pointer.y;

    // Determine hovered card
    this.hoveredIndex = -1;
    for (let i = 0; i < MAP_REGISTRY.length; i++) {
      const x = cardX(i, MAP_REGISTRY.length);
      if (mx >= x && mx <= x + CFG.card.width && my >= CARD_Y && my <= CARD_Y + CFG.card.height) {
        this.hoveredIndex = i;
      }
    }

    this.backBtn.onPointerMove(mx, my);
    this.deployBtn.onPointerMove(mx, my);

    if (pointer.down && !this.wasPointerDown) {
      // Card click — select map
      if (this.hoveredIndex >= 0) {
        setSelectedMapId(MAP_REGISTRY[this.hoveredIndex].id);
      }
      this.backBtn.onPointerDown(mx, my);
      this.deployBtn.onPointerDown(mx, my);
    }
    if (!pointer.down && this.wasPointerDown) {
      this.backBtn.onPointerUp(mx, my);
      this.deployBtn.onPointerUp(mx, my);
    }
    this.wasPointerDown = pointer.down;
  }

  render(_alpha: number): void {
    const ctx = this.canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = CFG.colors.bg;
    ctx.fillRect(0, 0, CW, CH);

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = CFG.colors.title;
    ctx.fillText('SELECT MAP', CW / 2, CARD_Y - 42);
    ctx.restore();

    // Cards
    for (let i = 0; i < MAP_REGISTRY.length; i++) {
      this.drawCard(ctx, i, MAP_REGISTRY[i]);
    }

    this.backBtn.draw(ctx);
    this.deployBtn.draw(ctx);
  }

  private drawCard(ctx: CanvasRenderingContext2D, index: number, entry: MapEntry): void {
    const x = cardX(index, MAP_REGISTRY.length);
    const y = CARD_Y;
    const w = CFG.card.width;
    const h = CFG.card.height;
    const r = CFG.card.borderRadius;
    const isSelected = entry.id === getSelectedMapId();
    const isHovered  = index === this.hoveredIndex;

    // Card background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = isSelected ? CFG.colors.cardSelected : (isHovered ? CFG.colors.cardHover : CFG.colors.cardBg);
    ctx.fill();
    ctx.strokeStyle = isSelected ? CFG.colors.selectedBorder : CFG.colors.defaultBorder;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Thumbnail
    const thumb = this.thumbnails[index];
    if (thumb) {
      const tx = x + CFG.card.paddingX;
      const ty = y + CFG.card.paddingY;
      const tw = w - CFG.card.paddingX * 2;
      const th = CFG.card.thumbnailHeight;
      ctx.drawImage(thumb, tx, ty, tw, th);
      // Thumbnail border
      ctx.strokeStyle = '#444466';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
    }

    // Map label
    const labelY = y + CFG.card.paddingY + CFG.card.thumbnailHeight + 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = CFG.colors.mapLabel;
    ctx.fillText(entry.label, x + w / 2, labelY);

    // Description
    ctx.font = '12px monospace';
    ctx.fillStyle = CFG.colors.description;
    ctx.fillText(entry.description, x + w / 2, labelY + 22);

    // Selected indicator
    if (isSelected) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = CFG.colors.selectedBorder;
      ctx.fillText('▶ SELECTED', x + w / 2, labelY + 44);
    }

    ctx.restore();
  }
}
