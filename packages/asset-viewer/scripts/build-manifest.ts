// Phase 1 — Manifest System
// Run via: npm run build:manifest   (uses tsx)

import { readdirSync, statSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { ASSET_SOURCES } from './manifest.sources.js';
import type { AssetSourceConfig } from './manifest.types.js';
import type { Asset, AssetFolder, Manifest } from '../src/manifest/types.js';
import {
  MANIFEST_VERSION,
  DEFAULT_ANIMATION_FPS,
  PADDED_SEQUENCE_RE,
  SIMPLE_SEQUENCE_RE,
  SEQUENCE_MIN_FRAMES,
  SPRITE_SHEET_NAMES,
  SOLDIER_FRAME_PX,
} from '../src/manifest/constants.js';

// ---- PNG header reader (zero external deps) -----------------

function readPngSize(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  // PNG spec: 8-byte signature, then IHDR chunk.
  // IHDR layout: 4 len | 4 type | 4 width | 4 height | ...
  // Width at bytes 16–19, Height at bytes 20–23 (big-endian uint32).
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

// ---- ID generation ------------------------------------------

function makeId(...parts: string[]): string {
  return parts
    .map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .join('/');
}

// ---- Sequence detection -------------------------------------

interface FileEntry { name: string; path: string }
interface SequenceGroup { key: string; files: FileEntry[] }

function detectSequences(files: FileEntry[]): {
  groups: SequenceGroup[];
  remaining: FileEntry[];
} {
  const paddedMap = new Map<string, FileEntry[]>();
  const simpleMap = new Map<string, FileEntry[]>();
  const consumed = new Set<string>();

  // Pass 1: zero-padded indices (_000, _001, ...)
  for (const file of files) {
    const m = file.name.match(PADDED_SEQUENCE_RE);
    if (m) {
      const key = m[1];
      if (!paddedMap.has(key)) paddedMap.set(key, []);
      paddedMap.get(key)!.push(file);
    }
  }

  const groups: SequenceGroup[] = [];

  for (const [key, group] of paddedMap) {
    if (group.length < SEQUENCE_MIN_FRAMES) continue;
    group.sort((a, b) => {
      const ai = parseInt(a.name.match(PADDED_SEQUENCE_RE)![2], 10);
      const bi = parseInt(b.name.match(PADDED_SEQUENCE_RE)![2], 10);
      return ai - bi;
    });
    groups.push({ key, files: group });
    group.forEach(f => consumed.add(f.path));
  }

  // Pass 2: simple incrementing numbers (e.g. Explosion_1.png ... Explosion_10.png)
  const after1 = files.filter(f => !consumed.has(f.path));
  for (const file of after1) {
    const m = file.name.match(SIMPLE_SEQUENCE_RE);
    if (m) {
      const key = m[1];
      if (!simpleMap.has(key)) simpleMap.set(key, []);
      simpleMap.get(key)!.push(file);
    }
  }

  for (const [key, group] of simpleMap) {
    if (group.length < SEQUENCE_MIN_FRAMES) continue;
    group.sort((a, b) => {
      const ai = parseInt(a.name.match(SIMPLE_SEQUENCE_RE)![2], 10);
      const bi = parseInt(b.name.match(SIMPLE_SEQUENCE_RE)![2], 10);
      return ai - bi;
    });
    groups.push({ key, files: group });
    group.forEach(f => consumed.add(f.path));
  }

  return { groups, remaining: files.filter(f => !consumed.has(f.path)) };
}

// ---- Asset classification -----------------------------------

function classifyFile(file: FileEntry, parentId: string, sourceTags: readonly string[]): Asset {
  const nameNoExt = basename(file.name, extname(file.name));

  if (SPRITE_SHEET_NAMES.has(nameNoExt)) {
    const { width, height } = readPngSize(file.path);
    const frameCount = Math.round(width / SOLDIER_FRAME_PX);
    return {
      type: 'sheet',
      id: makeId(parentId, nameNoExt),
      label: nameNoExt,
      src: file.path,
      sheetWidth: width,
      sheetHeight: height,
      frameWidth: SOLDIER_FRAME_PX,
      frameHeight: SOLDIER_FRAME_PX,
      frameCount,
      fps: DEFAULT_ANIMATION_FPS,
      tags: [...sourceTags],
    };
  }

  const { width, height } = readPngSize(file.path);
  return {
    type: 'sprite',
    id: makeId(parentId, nameNoExt),
    label: nameNoExt,
    src: file.path,
    width,
    height,
    tags: [...sourceTags],
  };
}

function classifySequence(group: SequenceGroup, parentId: string, sourceTags: readonly string[]): Asset {
  const { width, height } = readPngSize(group.files[0].path);
  return {
    type: 'sequence',
    id: makeId(parentId, group.key),
    label: group.key,
    frames: group.files.map(f => f.path),
    frameWidth: width,
    frameHeight: height,
    fps: DEFAULT_ANIMATION_FPS,
    tags: [...sourceTags],
  };
}

// ---- Directory walker ---------------------------------------

function walkDir(
  dirPath: string,
  config: AssetSourceConfig,
  folderId: string,
  folderLabel: string,
): AssetFolder {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: FileEntry[] = [];
  const subFolders: AssetFolder[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (config.excludeDirs?.test(entry.name)) continue;
      const subId = makeId(folderId, entry.name);
      subFolders.push(walkDir(fullPath, config, subId, entry.name));
    } else if (entry.isFile()) {
      if (!config.includeFiles.test(entry.name)) continue;
      if (config.excludeFiles.test(entry.name)) continue;
      files.push({ name: entry.name, path: fullPath });
    }
  }

  const { groups, remaining } = detectSequences(files);
  const items: (AssetFolder | Asset)[] = [];

  for (const group of groups) {
    items.push(classifySequence(group, folderId, config.tags));
  }
  for (const file of remaining) {
    items.push(classifyFile(file, folderId, config.tags));
  }
  items.push(...subFolders);

  return { id: folderId, label: folderLabel, tags: [...config.tags], items };
}

// ---- Asset counter ------------------------------------------

function countAssets(folder: AssetFolder): number {
  return folder.items.reduce<number>((sum, item) => {
    return sum + ('items' in item ? countAssets(item as AssetFolder) : 1);
  }, 0);
}

// ---- Entry point --------------------------------------------

function buildManifest(): void {
  const folders: AssetFolder[] = [];

  for (const source of ASSET_SOURCES) {
    process.stdout.write(`Scanning ${source.label}...\n`);
    const folder = walkDir(source.root, source, source.id, source.label);
    const count = countAssets(folder);
    process.stdout.write(`  → ${count} assets discovered\n`);
    folders.push(folder);
  }

  const manifest: Manifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    sources: ASSET_SOURCES.map(s => s.label),
    folders,
  };

  const thisDir = fileURLToPath(new URL('.', import.meta.url));
  const outDir = join(thisDir, '..', 'public');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  process.stdout.write(`\nManifest written → ${outPath}\n`);
}

buildManifest();
