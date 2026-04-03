/**
 * Generate floor tiles programmatically using Sharp.
 * AI-generated tiles create plaid/artifact patterns at 32x32 —
 * programmatic generation produces clean, seamless pixel-art floors.
 *
 * Usage: tsx scripts/generate-floor-tiles.ts
 * Output: assets/processed/tiles/tile-floor-*.png + reassembled tileset
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extrudeTileset } from './image-processing.js';

const TILE = 32;
const CH = 4; // RGBA

// ---------------------------------------------------------------------------
// Palette (from master-palette.json — hardcoded to avoid parse overhead)
// ---------------------------------------------------------------------------

interface RGB { readonly r: number; readonly g: number; readonly b: number }

const P = {
  floorWoodLight: { r: 0xC1, g: 0x9A, b: 0x6B },
  floorWoodDark:  { r: 0x8B, g: 0x69, b: 0x14 },
  woodBrown:      { r: 0x8B, g: 0x45, b: 0x13 },
  darkWood:       { r: 0x5C, g: 0x3A, b: 0x21 },
  carpetRed:      { r: 0xC4, g: 0x1E, b: 0x3A },
  darkRed:        { r: 0x8B, g: 0x1A, b: 0x1A },
  warmTan:        { r: 0xD4, g: 0xC4, b: 0xA8 },
  depthTan:       { r: 0xC4, g: 0xA8, b: 0x82 },
  tileWhite:      { r: 0xE8, g: 0xE0, b: 0xD0 },
  tileBlue:       { r: 0x5B, g: 0x7F, b: 0xA5 },
} as const satisfies Record<string, RGB>;

// ---------------------------------------------------------------------------
// Buffer helpers
// ---------------------------------------------------------------------------

function create(): Uint8Array {
  return new Uint8Array(TILE * TILE * CH);
}

function set(buf: Uint8Array, x: number, y: number, c: RGB): void {
  if (x < 0 || x >= TILE || y < 0 || y >= TILE) return;
  const i = (y * TILE + x) * CH;
  buf[i] = c.r;
  buf[i + 1] = c.g;
  buf[i + 2] = c.b;
  buf[i + 3] = 255;
}

function fill(buf: Uint8Array, c: RGB): void {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      set(buf, x, y, c);
}

/** Deterministic hash — tiles perfectly since it only depends on (x, y) */
function hash(x: number, y: number): number {
  return ((x * 2654435761) ^ (y * 2246822519)) >>> 0;
}

// ---------------------------------------------------------------------------
// Tile generators
// ---------------------------------------------------------------------------

/**
 * Horizontal wood planks. 4 planks (7px each) with 1px seam lines.
 * Seams at y=7,15,23,31 — seamless vertical tiling (7px gap wraps perfectly).
 * Partial horizontal grain streaks within each plank.
 */
function woodHorizontal(): Uint8Array {
  const buf = create();
  fill(buf, P.floorWoodLight);

  // Grain streaks: broken horizontal lines within each plank
  const grainRows = [3, 5, 10, 12, 18, 20, 26, 28];
  for (const gy of grainRows) {
    for (let x = 0; x < TILE; x++) {
      if (hash(x, gy) % 3 !== 0) set(buf, x, gy, P.floorWoodDark);
    }
  }

  // Seam lines (drawn last — always on top of grain)
  const seams = [7, 15, 23, 31];
  for (const sy of seams) {
    for (let x = 0; x < TILE; x++) {
      set(buf, x, sy, P.darkWood);
    }
  }

  return buf;
}

/**
 * Vertical wood planks. Same structure as horizontal, rotated 90 degrees.
 * Seams at x=7,15,23,31.
 */
function woodVertical(): Uint8Array {
  const buf = create();
  fill(buf, P.floorWoodLight);

  // Grain streaks: broken vertical lines
  const grainCols = [3, 5, 10, 12, 18, 20, 26, 28];
  for (const gx of grainCols) {
    for (let y = 0; y < TILE; y++) {
      if (hash(gx, y) % 3 !== 0) set(buf, gx, y, P.floorWoodDark);
    }
  }

  // Seam lines
  const seams = [7, 15, 23, 31];
  for (const sx of seams) {
    for (let y = 0; y < TILE; y++) {
      set(buf, sx, y, P.darkWood);
    }
  }

  return buf;
}

/**
 * Parquet / basketweave pattern. 8x8 blocks alternate grain direction.
 * Two wood tones create the visual contrast.
 */
function woodParquet(): Uint8Array {
  const buf = create();

  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      const vertical = (bx + by) % 2 === 0;
      const base = vertical ? P.woodBrown : P.floorWoodLight;
      const grain = vertical ? P.floorWoodDark : P.darkWood;

      for (let dy = 0; dy < 8; dy++) {
        for (let dx = 0; dx < 8; dx++) {
          const x = bx * 8 + dx;
          const y = by * 8 + dy;
          set(buf, x, y, base);

          // Directional grain lines every 3px
          if (vertical && dx % 3 === 1) set(buf, x, y, grain);
          if (!vertical && dy % 3 === 1) set(buf, x, y, grain);
        }
      }
    }
  }

  return buf;
}

/**
 * Red carpet. Solid carpet-red with scattered dark-red fiber texture.
 */
function carpetRed(): Uint8Array {
  const buf = create();
  fill(buf, P.carpetRed);

  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (hash(x, y) % 7 === 0) set(buf, x, y, P.darkRed);

  return buf;
}

/**
 * Neutral carpet. Solid warm-tan with scattered depth-tan fiber texture.
 */
function carpetNeutral(): Uint8Array {
  const buf = create();
  fill(buf, P.warmTan);

  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (hash(x, y) % 7 === 0) set(buf, x, y, P.depthTan);

  return buf;
}

/**
 * Kitchen checkerboard. 4x4px squares alternating white and blue.
 * 8 squares across = 32px, tiles seamlessly in both directions.
 */
function kitchen(): Uint8Array {
  const buf = create();

  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const white = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      set(buf, x, y, white ? P.tileWhite : P.tileBlue);
    }

  return buf;
}

/**
 * Bathroom offset tiles. 4x4px tiles with 1px grout lines, brick-offset
 * every other row. Every 3rd tile is blue accent.
 */
function bathroom(): Uint8Array {
  const buf = create();
  const cell = 5; // 4px tile + 1px grout

  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const row = Math.floor(y / cell);
      const offset = (row % 2 === 0) ? 0 : 2;
      const lx = (x + offset) % cell;
      const ly = y % cell;

      if (lx === cell - 1 || ly === cell - 1) {
        // Grout
        set(buf, x, y, P.darkWood);
      } else {
        // Tile — every 3rd is blue accent
        const tx = Math.floor((x + offset) / cell);
        const ty = Math.floor(y / cell);
        const blue = (tx + ty) % 3 === 0;
        set(buf, x, y, blue ? P.tileBlue : P.tileWhite);
      }
    }

  return buf;
}

// ---------------------------------------------------------------------------
// Tileset assembly (mirrors process-assets.ts assembleTileset)
// ---------------------------------------------------------------------------

async function assembleTileset(tilesDir: string, outputDir: string): Promise<void> {
  const tileFiles = fs.readdirSync(tilesDir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  if (tileFiles.length === 0) {
    console.error('No tile PNGs found in', tilesDir);
    process.exit(1);
  }

  const cols = 8;
  const rows = Math.ceil(tileFiles.length / cols);
  const atlasW = cols * TILE;
  const atlasH = rows * TILE;

  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let i = 0; i < tileFiles.length; i++) {
    composites.push({
      input: fs.readFileSync(path.join(tilesDir, tileFiles[i]!)),
      left: (i % cols) * TILE,
      top: Math.floor(i / cols) * TILE,
    });
  }

  const tilesetBuf = await sharp({
    create: { width: atlasW, height: atlasH, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 255 } },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  fs.mkdirSync(outputDir, { recursive: true });

  const plainPath = path.join(outputDir, 'interior.png');
  fs.writeFileSync(plainPath, tilesetBuf);
  console.log(`  Tileset: ${plainPath} (${atlasW}x${atlasH}, ${tileFiles.length} tiles)`);

  const extrudedPath = path.join(outputDir, 'interior-extruded.png');
  extrudeTileset(plainPath, TILE, TILE, extrudedPath);
  console.log(`  Extruded: ${extrudedPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const TILES: readonly { id: string; gen: () => Uint8Array }[] = [
  { id: 'tile-floor-wood-01',       gen: woodHorizontal },
  { id: 'tile-floor-wood-02',       gen: woodVertical },
  { id: 'tile-floor-wood-03',       gen: woodParquet },
  { id: 'tile-floor-carpet-red',    gen: carpetRed },
  { id: 'tile-floor-carpet-neutral', gen: carpetNeutral },
  { id: 'tile-floor-kitchen',       gen: kitchen },
  { id: 'tile-floor-bathroom',      gen: bathroom },
];

async function main(): Promise<void> {
  const ROOT = path.resolve(import.meta.dirname, '..');
  const tilesDir = path.join(ROOT, 'assets', 'processed', 'tiles');
  const tilesetDir = path.join(ROOT, 'public', 'assets', 'tilesets');

  fs.mkdirSync(tilesDir, { recursive: true });
  console.log('Generating programmatic floor tiles...\n');

  for (const { id, gen } of TILES) {
    const pixels = gen();
    const png = await sharp(Buffer.from(pixels.buffer), {
      raw: { width: TILE, height: TILE, channels: CH },
    })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    fs.writeFileSync(path.join(tilesDir, `${id}.png`), png);
    console.log(`  ${id}.png (${png.length} bytes)`);
  }

  console.log('\nReassembling tileset...');
  await assembleTileset(tilesDir, tilesetDir);
  console.log('\nDone.');
}

main().catch((e: unknown) => {
  console.error('Error:', e);
  process.exit(1);
});
