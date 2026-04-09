/**
 * Process all BURNED art assets: resize + WebP conversion via sharp.
 * Run: npx tsx scripts/process-assets.ts
 *
 * Input:
 *   - temp/cards/*.png        (11 action/utility card illustrations, 1:1)
 *   - public/assets/roster/*.png  (6 operative portraits, 3:4)
 *
 * Output:
 *   - public/assets/cards/*.webp  (all 17 card types, sized for card UI)
 *
 * Operative portraits get cropped to 1:1 center square to match card illustration zone.
 * All output is 256x256 WebP at q80 — crisp on phone retina, tiny file size.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';

const CARD_DIR = resolve('temp/cards');
const ROSTER_DIR = resolve('public/assets/roster');
const OUTPUT_DIR = resolve('public/assets/cards');
const SIZE = 256;
const WEBP_QUALITY = 80;

// Map roster filenames to card type slugs
const ROSTER_TO_TYPE: Record<string, string> = {
  'dash-barlowe': 'dash-barlowe',
  'vera-khan': 'vera-khan',
  'sable-ashworth': 'sable-ashworth',
  'janet-broadside': 'janet-broadside',
  'neal-proctor': 'neal-proctor',
  'agent-x': 'agent-x',
};

interface ProcessResult {
  file: string;
  source: string;
  inputKB: number;
  outputKB: number;
  status: string;
}

async function processImage(
  inputPath: string,
  outputName: string,
  isPortrait: boolean,
): Promise<ProcessResult> {
  const outputPath = resolve(OUTPUT_DIR, `${outputName}.webp`);

  let pipeline = sharp(inputPath);

  if (isPortrait) {
    // 3:4 portrait → center-crop to square before resize
    const meta = await sharp(inputPath).metadata();
    const w = meta.width!;
    const h = meta.height!;
    const cropSize = Math.min(w, h);
    pipeline = pipeline.extract({
      left: Math.floor((w - cropSize) / 2),
      top: Math.floor((h - cropSize) / 4), // bias toward face (upper quarter)
      width: cropSize,
      height: cropSize,
    });
  }

  const buffer = await pipeline
    .resize(SIZE, SIZE, { fit: 'cover', kernel: 'lanczos3' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, buffer);

  const { statSync } = await import('node:fs');
  const inputSize = statSync(inputPath).size;

  return {
    file: `${outputName}.webp`,
    source: isPortrait ? 'roster' : 'cards',
    inputKB: Math.round(inputSize / 1024),
    outputKB: Math.round(buffer.length / 1024),
    status: 'OK',
  };
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`\n=== BURNED — Asset Processing ===`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Size: ${SIZE}x${SIZE} WebP @ q${WEBP_QUALITY}\n`);

  const results: ProcessResult[] = [];

  // Process action/utility card illustrations (1:1, no crop needed)
  const cardFiles = (await readdir(CARD_DIR)).filter((f) => f.endsWith('.png'));
  for (const file of cardFiles) {
    const name = basename(file, extname(file));
    console.log(`Processing card: ${name}...`);
    const result = await processImage(resolve(CARD_DIR, file), name, false);
    results.push(result);
    console.log(`  ${result.inputKB}KB → ${result.outputKB}KB`);
  }

  // Process roster portraits (3:4 → crop to 1:1 → resize)
  for (const [filename, cardType] of Object.entries(ROSTER_TO_TYPE)) {
    const inputPath = resolve(ROSTER_DIR, `${filename}.png`);
    console.log(`Processing roster: ${filename}...`);
    const result = await processImage(inputPath, cardType, true);
    results.push(result);
    console.log(`  ${result.inputKB}KB → ${result.outputKB}KB`);
  }

  console.log('\n=== Results ===');
  console.table(results);

  const totalInputKB = results.reduce((s, r) => s + r.inputKB, 0);
  const totalOutputKB = results.reduce((s, r) => s + r.outputKB, 0);
  console.log(`\nTotal: ${totalInputKB}KB → ${totalOutputKB}KB (${Math.round((1 - totalOutputKB / totalInputKB) * 100)}% reduction)`);
  console.log(`${results.length} assets processed.`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
