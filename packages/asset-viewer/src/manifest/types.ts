// Phase 1 — Manifest System

export type AssetType = 'sprite' | 'sheet' | 'sequence' | 'composite';

export interface SpriteAsset {
  readonly type: 'sprite';
  readonly id: string;
  readonly label: string;
  /** Absolute filesystem path. Convert to a Vite URL via toDevUrl(). */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly tags: readonly string[];
}

export interface SheetAsset {
  readonly type: 'sheet';
  readonly id: string;
  readonly label: string;
  readonly src: string;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly tags: readonly string[];
}

export interface SequenceAsset {
  readonly type: 'sequence';
  readonly id: string;
  readonly label: string;
  /** Ordered absolute filesystem paths, one per frame. */
  readonly frames: readonly string[];
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly fps: number;
  readonly tags: readonly string[];
}

export interface CompositeLayer {
  readonly id: string;
  readonly label: string;
  readonly src: string;
  readonly zIndex: number;
  /** Rotation pivot, normalized 0–1 (0.5 = center). */
  readonly pivotX: number;
  readonly pivotY: number;
  /** Pixel offset from composite canvas center. */
  readonly offsetX: number;
  readonly offsetY: number;
  readonly rotatable: boolean;
}

export interface CompositeAsset {
  readonly type: 'composite';
  readonly id: string;
  readonly label: string;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly layers: readonly CompositeLayer[];
  readonly tags: readonly string[];
}

export type Asset = SpriteAsset | SheetAsset | SequenceAsset | CompositeAsset;

export interface AssetFolder {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly string[];
  readonly items: readonly (AssetFolder | Asset)[];
}

export interface Manifest {
  readonly version: number;
  readonly generatedAt: string;
  /** Human-readable labels of all scanned sources. */
  readonly sources: readonly string[];
  readonly folders: readonly AssetFolder[];
}
