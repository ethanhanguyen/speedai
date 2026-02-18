# @speedai/asset-viewer

Standalone dev tool for browsing and previewing game assets — sprites, sprite sheets, frame sequences, and composite assemblies. Runs independently of the game engine.

---

## Prerequisites

- Node.js 20+
- Asset packs located at `/Users/hoang/Downloads/craftpix/` (see [Changing asset paths](#changing-asset-paths))

---

## Quick start

From the **repo root**, run both commands:

```bash
# 1. Scan asset directories and generate the manifest (run once, or after adding new assets)
npm run build:manifest -w packages/asset-viewer

# 2. Start the dev server
npm run dev -w packages/asset-viewer
```

Open **http://localhost:5180** in your browser.

---

## All commands

| Command | What it does |
|---------|-------------|
| `npm run build:manifest -w packages/asset-viewer` | Scans all configured asset directories and writes `public/manifest.json` |
| `npm run dev -w packages/asset-viewer` | Starts the Vite dev server on port 5180 |
| `npm run build -w packages/asset-viewer` | Produces a static build in `dist/` |
| `npm run typecheck -w packages/asset-viewer` | TypeScript type check (no emit) |

---

## Using the viewer

```
┌─────────────┬──────────────────────────────┬───────────────┐
│ Asset tree  │       Preview canvas         │  Properties   │
│             │                              │               │
│ [search…]   │  (checkerboard background)   │ Type: seq.    │
│             │                              │ Frame: 3 / 9  │
│ ▼ Pack 1    │   [asset renders here]       │ Size: 550×550 │
│   ▶ Hulls   │                              │ FPS: 10       │
│   ▶ Weapons ├──────────────────────────────│               │
│   ▶ Effects │ ⏮  ▶  ⏭  ━━●━━━━  0/9  fps 10│               │
└─────────────┴──────────────────────────────┴───────────────┘
```

**Left panel — Asset browser**
- Expand packs and folders by clicking their label
- Type in the search box to filter asset names live

**Center panel — Preview**
- Scroll wheel to zoom in/out
- Animated assets (sequences, sprite sheets) loop automatically when playing

**Bottom bar — Animation controls**
- ⏮ / ⏭ step one frame backward/forward (also pauses)
- ▶ / ⏸ play or pause the animation
- Drag the scrubber to jump to any frame
- Edit the `fps` field to change playback speed

**Right panel — Properties**
- Shows dimensions, frame count, current frame, scale, and tags for the selected asset

---

## Adding new asset directories

Open [`scripts/manifest.sources.ts`](scripts/manifest.sources.ts) and add one entry to `ASSET_SOURCES`:

```typescript
{
  id: 'my-pack',
  label: 'My New Pack',
  root: '/absolute/path/to/assets',
  tags: ['my-pack'],
  includeFiles: /\.png$/i,
  excludeFiles: /\.(txt|psd)$/i,
  // Optional: skip subdirectories by name pattern
  // excludeDirs: /^SomeFolderToSkip$/,
},
```

Then re-run:

```bash
npm run build:manifest -w packages/asset-viewer
```

Nothing else needs to change. The browser, renderers, and property panel all update from the manifest automatically.

---

## Changing asset paths

If your craftpix assets are in a different location:

1. Update the `root` values in [`scripts/manifest.sources.ts`](scripts/manifest.sources.ts)
2. Update the `CRAFTPIX_ROOT` constant in [`vite.config.ts`](vite.config.ts) to match the new parent directory
3. Re-run `build:manifest`

---

## Implementation phases

See [`PHASES.md`](PHASES.md) for the full phase breakdown and completion checklist.

---

## Architecture

```
scripts/
  manifest.sources.ts   ← only file to edit when adding asset directories
  manifest.types.ts     ← AssetSourceConfig type
  build-manifest.ts     ← Node scanner: FS walk → type detection → manifest.json

src/
  manifest/
    types.ts            ← Asset union type, AssetFolder, Manifest
    constants.ts        ← All numeric thresholds and detection patterns
    urls.ts             ← toDevUrl(): FS path → Vite /@fs/ URL
  renderers/
    Renderer.ts         ← Common interface
    SpriteRenderer.ts   ← Single PNG
    SheetRenderer.ts    ← Horizontal strip (fixed frame width)
    SequenceRenderer.ts ← Numbered-file sequence
    CompositeRenderer.ts← Multi-layer assembly with per-layer rotation
    factory.ts          ← createRenderer(asset) — exhaustive switch
  ui/
    styles.ts           ← All color and layout constants
    AssetTree.ts        ← Left panel: collapsible tree with live search
    PreviewCanvas.ts    ← Center: checkerboard canvas, zoom, rAF loop
    AnimationBar.ts     ← Play/pause, scrubber, fps input
    PropertyPanel.ts    ← Right panel: metadata display
  state.ts              ← Typed ViewerState store with event emitter
  main.ts               ← Bootstrap
```
