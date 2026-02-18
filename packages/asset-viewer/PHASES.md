# Asset Viewer — Implementation Phases

Independent dev tool for browsing and previewing game assets.
Run with: `npm run dev -w packages/asset-viewer`

---

## Phase 1 — Manifest System
**Gate: `npm run build:manifest` scans all configured directories and writes `public/manifest.json` with zero errors.**

- [x] `src/manifest/types.ts` — Asset union type, AssetFolder, Manifest
- [x] `src/manifest/constants.ts` — All numeric thresholds and detection patterns
- [x] `src/manifest/urls.ts` — `toDevUrl()` converts FS paths to Vite `/@fs/` URLs
- [x] `scripts/manifest.types.ts` — AssetSourceConfig interface
- [x] `scripts/manifest.sources.ts` — **Edit this file to add new asset directories**
- [x] `scripts/build-manifest.ts` — Node scanner: walks FS → detects types → writes JSON

**To add a new asset directory:**
1. Open `scripts/manifest.sources.ts`
2. Add one entry to the `ASSET_SOURCES` array
3. Run `npm run build:manifest`
4. Done — nothing else changes

---

## Phase 2 — Renderers
**Gate: Each renderer loads its asset and draws correctly to an HTML canvas at any frame index and scale.**

- [x] `src/renderers/Renderer.ts` — `Renderer` interface, `LoadState` type, `DrawOptions`
- [x] `src/renderers/SpriteRenderer.ts` — Single static PNG
- [x] `src/renderers/SheetRenderer.ts` — Horizontal strip (fixed frame size)
- [x] `src/renderers/SequenceRenderer.ts` — Numbered-file sequence (loads all frames)
- [x] `src/renderers/CompositeRenderer.ts` — Multi-layer assembly with per-layer rotation
- [x] `src/renderers/factory.ts` — `createRenderer(asset)` exhaustive switch, TS-enforced

---

## Phase 3 — Preview Canvas + Controls
**Gate: Selecting any asset shows it centered on a checkerboard canvas. Animated assets play at the configured FPS. Play/pause, frame scrub, and FPS input all work.**

- [x] `src/ui/styles.ts` — All UI color and layout constants
- [x] `src/state.ts` — Typed `ViewerState` store with typed event emitter
- [x] `src/ui/PreviewCanvas.ts` — Canvas with checkerboard, zoom (scroll wheel), rAF loop
- [x] `src/ui/AnimationBar.ts` — ⏮ ▶/⏸ ⏭, scrubber, frame counter, fps input
- [x] `src/main.ts` — Bootstrap: mounts all panels, fetches manifest

---

## Phase 4 — Asset Browser
**Gate: Left panel shows all assets grouped by pack in a collapsible tree. Typing in the search box filters rows live. Clicking any row loads it in the preview.**

- [x] `src/ui/AssetTree.ts` — Collapsible folder tree with per-row type icons and live filter

---

## Phase 5 — Property Panel
**Gate: Right panel shows full metadata for the selected asset — dimensions, frame info, tags, current scale. Composite assets list their layers.**

- [x] `src/ui/PropertyPanel.ts` — Metadata table, live frame/scale readout, composite layer list

---

## Future (not yet scheduled)

- [ ] Thumbnail strip — show all frames as a filmstrip below the main preview
- [ ] Color variant switcher — swap hull/weapon Pack 1 color (A/B/C/D) without re-selecting
- [ ] Composite editor — interactive rotation sliders per layer (for tank assembly preview)
- [ ] Export reference — copy asset ID or manifest path to clipboard
- [ ] Keyboard shortcuts — J/K for prev/next frame, Space for play/pause
