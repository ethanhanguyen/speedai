#!/usr/bin/env node
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, '../public/sprites');
const OUTPUT_DIR = path.join(__dirname, '../public');
const ATLAS_SIZE = 2048;
const PADDING = 2;

async function packAtlas() {
  console.log('📦 Packing sprite atlas...');

  // Read all PNG files
  const files = fs.readdirSync(SPRITES_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} sprites`);

  // Load all images and get their dimensions
  const sprites = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(SPRITES_DIR, file);
      const metadata = await sharp(filePath).metadata();
      return {
        name: file.replace('.png', ''),
        path: filePath,
        width: metadata.width,
        height: metadata.height,
        buffer: await sharp(filePath).toBuffer(),
      };
    })
  );

  // Sort by height (descending) for better packing
  sprites.sort((a, b) => b.height - a.height);

  // Simple bin packing algorithm (shelf packing)
  const frames = {};
  let currentX = PADDING;
  let currentY = PADDING;
  let rowHeight = 0;

  for (const sprite of sprites) {
    // Check if we need to move to next row
    if (currentX + sprite.width + PADDING > ATLAS_SIZE) {
      currentX = PADDING;
      currentY += rowHeight + PADDING;
      rowHeight = 0;
    }

    // Check if we exceed atlas height
    if (currentY + sprite.height + PADDING > ATLAS_SIZE) {
      throw new Error(`Atlas size ${ATLAS_SIZE}x${ATLAS_SIZE} is too small!`);
    }

    // Record frame position
    frames[sprite.name] = {
      frame: {
        x: currentX,
        y: currentY,
        w: sprite.width,
        h: sprite.height,
      },
    };

    // Update position
    currentX += sprite.width + PADDING;
    rowHeight = Math.max(rowHeight, sprite.height);
  }

  console.log(`Atlas packed: ${currentX}x${currentY + rowHeight}`);

  // Create composite image
  const composites = sprites.map((sprite) => ({
    input: sprite.buffer,
    left: frames[sprite.name].frame.x,
    top: frames[sprite.name].frame.y,
  }));

  // Generate atlas PNG
  const atlasPath = path.join(OUTPUT_DIR, 'atlas.png');
  await sharp({
    create: {
      width: ATLAS_SIZE,
      height: ATLAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(atlasPath);

  console.log(`✓ Atlas image: ${atlasPath}`);

  // Generate atlas JSON
  const atlasData = {
    frames,
    meta: {
      image: 'atlas.png',
      size: { w: ATLAS_SIZE, h: ATLAS_SIZE },
      scale: 1,
    },
  };

  const jsonPath = path.join(OUTPUT_DIR, 'atlas.json');
  fs.writeFileSync(jsonPath, JSON.stringify(atlasData, null, 2));
  console.log(`✓ Atlas JSON: ${jsonPath}`);

  console.log('✨ Atlas generation complete!');
}

packAtlas().catch((err) => {
  console.error('Error packing atlas:', err);
  process.exit(1);
});
