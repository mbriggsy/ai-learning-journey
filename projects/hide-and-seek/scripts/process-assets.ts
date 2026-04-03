import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASSET_PROMPTS } from './asset-prompts.js';
import {
  downscalePixelArt,
  chromaKey,
  cleanAlpha,
  stripEdgeBorder,
  enforcePalette,
  loadPaletteColors,
  extrudeTileset,
  sliceMultiTile,
} from './image-processing.js';
import type { AssetDefinition } from './types.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'assets', 'raw');
const PROCESSED_DIR = path.join(ROOT, 'assets', 'processed');
const PALETTE_PATH = path.join(ROOT, 'assets', 'palette', 'master-palette.json');
const TILESET_OUTPUT_DIR = path.join(ROOT, 'public', 'assets', 'tilesets');

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

function assertPathUnder(filePath: string, allowedDir: string): void {
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(allowedDir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    throw new Error(`Path jail violation: ${resolved} is not under ${resolvedDir}`);
  }
}

// ---------------------------------------------------------------------------
// Processing pipeline for a single asset
// ---------------------------------------------------------------------------

async function processAsset(
  asset: AssetDefinition,
  paletteColors: readonly { r: number; g: number; b: number }[],
): Promise<{ id: string; ok: boolean; error?: string }> {
  const rawPath = path.join(RAW_DIR, asset.category, `${asset.id}.png`);

  if (!fs.existsSync(rawPath)) {
    return { id: asset.id, ok: false, error: `Raw file not found: ${rawPath}` };
  }

  try {
    let buffer: Buffer<ArrayBuffer> = fs.readFileSync(rawPath) as Buffer<ArrayBuffer>;

    // Step 1: Two-stage downscale
    buffer = await downscalePixelArt(buffer, asset.targetWidth, asset.targetHeight) as Buffer<ArrayBuffer>;

    // Step 2: Chroma-key — hardcode magenta bg instead of auto-detecting
    // from corners. Imagen sometimes renders dark borders/frames that confuse
    // corner-based detection, leaving the magenta background intact.
    // Tolerance 120 catches hot-pink variants (distance ~110 from pure magenta).
    if (asset.chromaKey) {
      buffer = await chromaKey(buffer, { r: 255, g: 0, b: 255 }, 120) as Buffer<ArrayBuffer>;
    }

    // Step 3: Binary alpha cleanup (sprites/furniture only)
    if (asset.chromaKey) {
      buffer = await cleanAlpha(buffer) as Buffer<ArrayBuffer>;
    }

    // Step 3b: Strip edge border artifacts (Imagen 4 decorative frames)
    // Only for sprites that had chroma-key — tiles should keep edge pixels.
    if (asset.chromaKey) {
      buffer = await stripEdgeBorder(buffer, asset.targetWidth, asset.targetHeight) as Buffer<ArrayBuffer>;
    }

    // Step 4: Palette enforcement (LAST step before save)
    buffer = await enforcePalette(buffer, paletteColors) as Buffer<ArrayBuffer>;

    // Step 5: Save processed output
    const pp = asset.postProcess;

    if (pp.kind === 'sprite-multi') {
      // Multi-tile: slice into individual tiles
      const slices = await sliceMultiTile(buffer, pp.sliceWidth, pp.sliceHeight, asset.id);
      const outDir = path.join(PROCESSED_DIR, asset.category);
      fs.mkdirSync(outDir, { recursive: true });

      for (const slice of slices) {
        const outPath = path.join(outDir, slice.name);
        assertPathUnder(outPath, PROCESSED_DIR);
        fs.writeFileSync(outPath, slice.buffer);
      }
    } else {
      // Single tile/sprite
      const outDir = path.join(PROCESSED_DIR, asset.category);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${asset.id}.png`);
      assertPathUnder(outPath, PROCESSED_DIR);
      fs.writeFileSync(outPath, buffer);
    }

    return { id: asset.id, ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: asset.id, ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Tileset assembly + extrusion
// ---------------------------------------------------------------------------

async function assembleTileset(): Promise<void> {
  const tilesDir = path.join(PROCESSED_DIR, 'tiles');
  if (!fs.existsSync(tilesDir)) {
    console.warn('No processed tiles directory found. Skipping tileset assembly.');
    return;
  }

  const tileFiles = fs.readdirSync(tilesDir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  if (tileFiles.length === 0) {
    console.warn('No tile PNGs found. Skipping tileset assembly.');
    return;
  }

  console.log(`\nAssembling tileset from ${tileFiles.length} tiles...`);

  // Arrange tiles in a grid (8 columns)
  const sharp = (await import('sharp')).default;
  const cols = 8;
  const rows = Math.ceil(tileFiles.length / cols);
  const tileWidth = 32;
  const tileHeight = 32;
  const atlasWidth = cols * tileWidth;
  const atlasHeight = rows * tileHeight;

  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let i = 0; i < tileFiles.length; i++) {
    const tileBuffer = fs.readFileSync(path.join(tilesDir, tileFiles[i]!));
    const col = i % cols;
    const row = Math.floor(i / cols);
    composites.push({
      input: tileBuffer,
      left: col * tileWidth,
      top: row * tileHeight,
    });
  }

  const tilesetBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4 as const,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  // Save non-extruded version (for Tiled editing)
  const nonExtrudedPath = path.join(TILESET_OUTPUT_DIR, 'interior.png');
  fs.mkdirSync(TILESET_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(nonExtrudedPath, tilesetBuffer);
  console.log(`  Non-extruded tileset: ${nonExtrudedPath} (${atlasWidth}x${atlasHeight})`);

  // Save extruded version (for Phaser runtime)
  const extrudedPath = path.join(TILESET_OUTPUT_DIR, 'interior-extruded.png');
  try {
    extrudeTileset(nonExtrudedPath, tileWidth, tileHeight, extrudedPath);
    console.log(`  Extruded tileset: ${extrudedPath}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  Tile extrusion failed: ${msg}`);
    console.error('  Falling back to non-extruded tileset.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Loading master palette...');
  const paletteColors = loadPaletteColors(PALETTE_PATH);
  console.log(`  ${paletteColors.length} colors loaded\n`);

  // Process all assets
  let succeeded = 0;
  let failed = 0;
  const failures: { id: string; error: string }[] = [];

  for (let i = 0; i < ASSET_PROMPTS.length; i++) {
    const asset = ASSET_PROMPTS[i]!;
    process.stdout.write(`[${i + 1}/${ASSET_PROMPTS.length}] Processing ${asset.id}...`);

    const result = await processAsset(asset, paletteColors);
    if (result.ok) {
      console.log(' OK');
      succeeded++;
    } else {
      console.log(` FAILED: ${result.error}`);
      failed++;
      failures.push({ id: result.id, error: result.error ?? 'unknown' });
    }
  }

  // Assemble tileset from processed tiles
  await assembleTileset();

  // Summary
  console.log('\n--- Processing Complete ---');
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\nFailed assets:');
    for (const f of failures) {
      console.log(`  - ${f.id}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
