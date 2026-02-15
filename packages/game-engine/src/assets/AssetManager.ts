import { EventEmitter } from '../core/EventEmitter.js';

export type AssetType = 'image' | 'audio' | 'json' | 'atlas';

export interface AssetEntry {
  key: string;
  type: AssetType;
  src: string;
}

export interface ImageProcessOptions {
  /** Target display width in CSS pixels. Image will be downscaled to this * devicePixelRatio. */
  maxWidth?: number;
  /** Target display height in CSS pixels. Image will be downscaled to this * devicePixelRatio. */
  maxHeight?: number;
  /** Color-key background removal. Pixels matching the color (within tolerance) become transparent. */
  removeBg?: {
    color?: [number, number, number]; // default [255, 255, 255]
    tolerance?: number;               // default 30
  };
}

export interface AtlasData {
  image: CanvasImageSource;
  frames: Map<string, { x: number; y: number; width: number; height: number }>;
}

export class AssetManager extends EventEmitter {
  private images: Map<string, CanvasImageSource> = new Map();
  private audio: Map<string, ArrayBuffer> = new Map();
  private json: Map<string, unknown> = new Map();
  private atlases: Map<string, AtlasData> = new Map();

  private loaded: number = 0;
  private total: number = 0;

  get progress(): number {
    return this.total === 0 ? 1 : this.loaded / this.total;
  }

  async loadAll(assets: AssetEntry[]): Promise<void> {
    this.loaded = 0;
    this.total = assets.length;
    this.emit('start', this.total);

    const promises = assets.map(async (entry) => {
      try {
        switch (entry.type) {
          case 'image':
            await this.loadImage(entry.key, entry.src);
            break;
          case 'audio':
            await this.loadAudio(entry.key, entry.src);
            break;
          case 'json':
            await this.loadJSON(entry.key, entry.src);
            break;
          case 'atlas':
            await this.loadAtlas(entry.key, entry.src);
            break;
        }
      } catch (err) {
        this.emit('error', entry.key, err);
      }
      this.loaded++;
      this.emit('progress', this.loaded, this.total);
    });

    await Promise.all(promises);
    this.emit('complete');
  }

  async loadImage(key: string, src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  async loadAudio(key: string, src: string): Promise<ArrayBuffer> {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to load audio: ${src}`);
    const buffer = await res.arrayBuffer();
    this.audio.set(key, buffer);
    return buffer;
  }

  async loadJSON<T = unknown>(key: string, src: string): Promise<T> {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to load JSON: ${src}`);
    const data = await res.json();
    this.json.set(key, data);
    return data as T;
  }

  async loadAtlas(key: string, jsonSrc: string): Promise<AtlasData> {
    const res = await fetch(jsonSrc);
    if (!res.ok) throw new Error(`Failed to load atlas: ${jsonSrc}`);
    const data = await res.json();

    // Resolve image path relative to JSON path
    const basePath = jsonSrc.substring(0, jsonSrc.lastIndexOf('/') + 1);
    const imageSrc = basePath + data.meta.image;

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load atlas image: ${imageSrc}`));
      img.src = imageSrc;
    });

    const frames = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const [frameName, frameData] of Object.entries(data.frames)) {
      const f = (frameData as { frame: { x: number; y: number; w: number; h: number } }).frame;
      frames.set(frameName, { x: f.x, y: f.y, width: f.w, height: f.h });
    }

    const atlas: AtlasData = { image, frames };
    this.atlases.set(key, atlas);
    return atlas;
  }

  getImage(key: string): CanvasImageSource | undefined {
    return this.images.get(key);
  }

  /**
   * Process a loaded image: remove background color and/or downscale to target size.
   * Uses createImageBitmap() for GPU-accelerated resize. Call after loadImage().
   * Order: background removal first (on full-res for edge quality), then downscale.
   */
  async processImage(key: string, opts: ImageProcessOptions): Promise<void> {
    const img = this.images.get(key);
    if (!img) return;

    // Source to process — may be replaced after bg removal
    let source: CanvasImageSource = img;

    // Step 1: Background removal via color-keying
    if (opts.removeBg) {
      const bgColor = opts.removeBg.color ?? [255, 255, 255];
      const tolerance = opts.removeBg.tolerance ?? 30;
      const tolSq = tolerance * tolerance;

      // Need actual pixel dimensions from the source
      const sw = (img as HTMLImageElement).naturalWidth
        ?? (img as ImageBitmap).width
        ?? (img as HTMLCanvasElement).width;
      const sh = (img as HTMLImageElement).naturalHeight
        ?? (img as ImageBitmap).height
        ?? (img as HTMLCanvasElement).height;

      const offscreen = document.createElement('canvas');
      offscreen.width = sw;
      offscreen.height = sh;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - bgColor[0];
        const dg = data[i + 1] - bgColor[1];
        const db = data[i + 2] - bgColor[2];
        if (dr * dr + dg * dg + db * db <= tolSq) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      source = offscreen;
    }

    // Step 2: Downscale via createImageBitmap (GPU-accelerated)
    if (opts.maxWidth != null && opts.maxHeight != null) {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const tw = Math.ceil(opts.maxWidth * dpr);
      const th = Math.ceil(opts.maxHeight * dpr);

      // Get source dimensions to check if resize is needed
      const sw = (source as HTMLImageElement).naturalWidth
        ?? (source as ImageBitmap).width
        ?? (source as HTMLCanvasElement).width;
      const sh = (source as HTMLImageElement).naturalHeight
        ?? (source as ImageBitmap).height
        ?? (source as HTMLCanvasElement).height;

      if (sw > tw || sh > th) {
        source = await createImageBitmap(source, {
          resizeWidth: tw,
          resizeHeight: th,
          resizeQuality: 'high',
        });
      }
    } else if (opts.removeBg && !opts.maxWidth && !opts.maxHeight) {
      // Background was removed but no resize — convert canvas to ImageBitmap for perf
      source = await createImageBitmap(source);
    }

    this.images.set(key, source);
  }

  getAudio(key: string): ArrayBuffer | undefined {
    return this.audio.get(key);
  }

  getJSON<T = unknown>(key: string): T | undefined {
    return this.json.get(key) as T | undefined;
  }

  getAtlas(key: string): AtlasData | undefined {
    return this.atlases.get(key);
  }

  dispose(): void {
    this.images.clear();
    this.audio.clear();
    this.json.clear();
    this.atlases.clear();
    this.clear();
  }
}
