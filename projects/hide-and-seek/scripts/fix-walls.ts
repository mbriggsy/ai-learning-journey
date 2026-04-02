import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'assets', 'raw', 'tiles');
const PROC_DIR = path.join(ROOT, 'assets', 'processed', 'tiles');

const DARK_BROWN = { r: 0x5C, g: 0x3A, b: 0x21 };
const OUTLINE = { r: 0x00, g: 0x00, b: 0x00 };

async function solidTile(name: string, fill: { r: number; g: number; b: number }): Promise<void> {
  const size = 32;
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const isEdge = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      const c = isEdge ? OUTLINE : fill;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  const buf = await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Write to both raw and processed
  fs.writeFileSync(path.join(RAW_DIR, name), buf);
  fs.writeFileSync(path.join(PROC_DIR, name), buf);
  console.log(`  ${name}: ${buf.length} bytes`);
}

async function main(): Promise<void> {
  console.log('Generating solid wall tiles...');
  await solidTile('tile-wall-horizontal.png', DARK_BROWN);
  await solidTile('tile-wall-vertical.png', DARK_BROWN);
  await solidTile('tile-wall-corner.png', DARK_BROWN);
  await solidTile('tile-wall-tjunction.png', DARK_BROWN);
  console.log('Done.');
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
