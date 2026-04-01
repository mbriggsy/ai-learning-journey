import { packAsync } from 'free-tex-packer-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');
const PROCESSED_DIR = path.join(ROOT, 'assets', 'processed');
const SPRITES_OUTPUT = path.join(ROOT, 'public', 'assets', 'sprites');
const UI_OUTPUT = path.join(ROOT, 'public', 'assets', 'ui');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectPngs(dir: string): { path: string; contents: Buffer }[] {
  if (!fs.existsSync(dir)) return [];

  const files: { path: string; contents: Buffer }[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.png')) continue;
    files.push({
      path: entry,
      contents: fs.readFileSync(path.join(dir, entry)),
    });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------------------------
// Pack a single atlas
// ---------------------------------------------------------------------------

async function packAtlas(
  name: string,
  inputFiles: { path: string; contents: Buffer }[],
  outputDir: string,
  maxWidth: number = 512,
  maxHeight: number = 512,
): Promise<void> {
  if (inputFiles.length === 0) {
    console.log(`  ${name}: no input files, skipping`);
    return;
  }

  console.log(`  ${name}: packing ${inputFiles.length} frames...`);

  const result = await packAsync(inputFiles, {
    textureName: name,
    width: maxWidth,
    height: maxHeight,
    powerOfTwo: true,
    padding: 1,
    allowRotation: false,
    allowTrim: false,
    detectIdentical: true,
    removeFileExtension: false,
    prependFolderName: false,
    exporter: 'Phaser3' as never, // free-tex-packer-core enum typing
    textureFormat: 'png' as never,
  });

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of result) {
    const outPath = path.join(outputDir, file.name);
    fs.writeFileSync(outPath, file.buffer);
    console.log(`    -> ${file.name} (${(file.buffer.length / 1024).toFixed(1)} KB)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Packing texture atlases...\n');

  // Characters atlas: all character frames + flashlight overlays
  const characterFiles = collectPngs(path.join(PROCESSED_DIR, 'characters'));
  await packAtlas('characters', characterFiles, SPRITES_OUTPUT, 512, 512);

  // UI atlas: all UI sprites
  const uiFiles = collectPngs(path.join(PROCESSED_DIR, 'ui'));
  await packAtlas('ui', uiFiles, UI_OUTPUT, 256, 256);

  // Furniture: pack into character atlas (they're game objects, not tilesets)
  const furnitureFiles = collectPngs(path.join(PROCESSED_DIR, 'furniture'));
  if (furnitureFiles.length > 0) {
    // Combine characters + furniture into one atlas for simplicity
    const allSpriteFiles = [...characterFiles, ...furnitureFiles];
    console.log('\n  Combined sprites atlas (characters + furniture):');
    await packAtlas('characters', allSpriteFiles, SPRITES_OUTPUT, 1024, 1024);
  }

  // Tileset is assembled by process-assets.ts (grid layout, not free-packed)
  // It stays as a standard tilemap image, not an atlas.

  console.log('\n--- Atlas Packing Complete ---');

  // Verify outputs
  const expectedFiles = [
    path.join(SPRITES_OUTPUT, 'characters.png'),
    path.join(SPRITES_OUTPUT, 'characters.json'),
  ];
  for (const f of expectedFiles) {
    if (fs.existsSync(f)) {
      console.log(`  OK: ${path.relative(ROOT, f)}`);
    } else {
      console.warn(`  MISSING: ${path.relative(ROOT, f)}`);
    }
  }
}

main().catch((e: unknown) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
