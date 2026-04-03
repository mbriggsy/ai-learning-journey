import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASSET_PROMPTS } from './asset-prompts.js';
import {
  getImageInfo,
  countColors,
  countSemiTransparent,
  opaquePercentage,
  countOffPaletteColors,
  loadPaletteColors,
} from './image-processing.js';
import type { AssetDefinition, QualityCheckResult, QualityCheckSeverity, ValidationReport } from './types.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');
const PROCESSED_DIR = path.join(ROOT, 'assets', 'processed');
const PALETTE_PATH = path.join(ROOT, 'assets', 'palette', 'master-palette.json');

// ---------------------------------------------------------------------------
// Check runner
// ---------------------------------------------------------------------------

function check(
  assetId: string,
  name: string,
  severity: QualityCheckSeverity,
  passed: boolean,
  expected: string,
  actual: string,
): QualityCheckResult {
  return { assetId, check: name, severity, passed, expected, actual };
}

async function validateAsset(
  asset: AssetDefinition,
  paletteColors: readonly { r: number; g: number; b: number }[],
): Promise<QualityCheckResult[]> {
  const results: QualityCheckResult[] = [];

  // Find processed file(s)
  const pp = asset.postProcess;
  const assetDir = path.join(PROCESSED_DIR, asset.category);

  if (pp.kind === 'sprite-multi') {
    // Multi-tile: validate each slice
    const cols = Math.floor(asset.targetWidth / pp.sliceWidth);
    const rows = Math.floor(asset.targetHeight / pp.sliceHeight);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sliceName = `${asset.id}-r${r}c${c}.png`;
        const slicePath = path.join(assetDir, sliceName);
        if (!fs.existsSync(slicePath)) {
          results.push(check(asset.id, `file-exists (${sliceName})`, 'CRITICAL', false, 'exists', 'missing'));
          continue;
        }
        const buf = fs.readFileSync(slicePath);
        const sliceResults = await validateSingleFile(asset.id, buf, pp.sliceWidth, pp.sliceHeight, asset, paletteColors);
        results.push(...sliceResults);
      }
    }
    return results;
  }

  // Single file
  const filePath = path.join(assetDir, `${asset.id}.png`);
  if (!fs.existsSync(filePath)) {
    results.push(check(asset.id, 'file-exists', 'CRITICAL', false, 'exists', 'missing'));
    return results;
  }

  const buf = fs.readFileSync(filePath);
  return validateSingleFile(asset.id, buf, asset.targetWidth, asset.targetHeight, asset, paletteColors);
}

async function validateSingleFile(
  assetId: string,
  buffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
  asset: AssetDefinition,
  paletteColors: readonly { r: number; g: number; b: number }[],
): Promise<QualityCheckResult[]> {
  const results: QualityCheckResult[] = [];

  const info = await getImageInfo(buffer);

  // CRITICAL: Dimensions
  results.push(check(assetId, 'dimensions',
    'CRITICAL',
    info.width === expectedWidth && info.height === expectedHeight,
    `${expectedWidth}x${expectedHeight}`,
    `${info.width}x${info.height}`,
  ));

  // CRITICAL: Color mode (RGBA)
  results.push(check(assetId, 'color-mode',
    'CRITICAL',
    info.channels === 4,
    'RGBA (4 channels)',
    `${info.channels} channels`,
  ));

  // CRITICAL: Transparency check
  if (asset.opaque) {
    // Floor tiles must be fully opaque
    const pct = await opaquePercentage(buffer);
    results.push(check(assetId, 'opaque-check',
      'CRITICAL',
      pct === 100,
      '100% opaque (floor tile)',
      `${pct.toFixed(1)}% opaque`,
    ));
  } else if (asset.chromaKey) {
    // Sprites must have SOME transparency
    const pct = await opaquePercentage(buffer);
    results.push(check(assetId, 'transparency-check',
      'CRITICAL',
      pct < 100,
      '<100% opaque (sprite with transparency)',
      `${pct.toFixed(1)}% opaque`,
    ));
  }

  // CRITICAL: Off-palette colors
  const offPalette = await countOffPaletteColors(buffer, paletteColors);
  results.push(check(assetId, 'off-palette-colors',
    'CRITICAL',
    offPalette === 0,
    '0 off-palette colors',
    `${offPalette} off-palette colors`,
  ));

  // CRITICAL: Minimum opaque area (not blank)
  const pct = await opaquePercentage(buffer);
  results.push(check(assetId, 'minimum-opaque-area',
    'CRITICAL',
    pct > 5,
    '>5% opaque pixels',
    `${pct.toFixed(1)}% opaque`,
  ));

  // CRITICAL: PNG validity (if we got here, sharp could read it)
  results.push(check(assetId, 'png-validity', 'CRITICAL', true, 'valid PNG', 'valid PNG'));

  // WARNING: Semi-transparent pixels
  const semiTrans = await countSemiTransparent(buffer);
  results.push(check(assetId, 'semi-transparent-pixels',
    'WARNING',
    semiTrans === 0,
    '0 semi-transparent pixels',
    `${semiTrans} semi-transparent pixels`,
  ));

  // WARNING: File size
  const maxSize = 10 * 1024; // 10KB per 32x32 sprite
  results.push(check(assetId, 'file-size',
    'WARNING',
    info.size <= maxSize,
    `<=${(maxSize / 1024).toFixed(0)}KB`,
    `${(info.size / 1024).toFixed(1)}KB`,
  ));

  // WARNING: Color count
  const colorCount = await countColors(buffer);
  results.push(check(assetId, 'color-count',
    'WARNING',
    colorCount <= paletteColors.length,
    `<=${paletteColors.length} colors`,
    `${colorCount} colors`,
  ));

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Loading master palette...');
  const paletteColors = loadPaletteColors(PALETTE_PATH);
  console.log(`  ${paletteColors.length} colors loaded\n`);

  const allResults: QualityCheckResult[] = [];
  let criticalFailures = 0;
  let warnings = 0;
  let assetsChecked = 0;

  for (const asset of ASSET_PROMPTS) {
    const results = await validateAsset(asset, paletteColors);
    allResults.push(...results);
    assetsChecked++;

    const assetCritical = results.filter((r) => !r.passed && r.severity === 'CRITICAL');
    const assetWarnings = results.filter((r) => !r.passed && r.severity === 'WARNING');

    if (assetCritical.length > 0) {
      console.log(`FAIL  ${asset.id}:`);
      for (const r of assetCritical) {
        console.log(`  CRITICAL: ${r.check} — expected ${r.expected}, got ${r.actual}`);
        criticalFailures++;
      }
    }
    if (assetWarnings.length > 0) {
      if (assetCritical.length === 0) process.stdout.write(`WARN  ${asset.id}:`);
      for (const r of assetWarnings) {
        console.log(`  WARNING: ${r.check} — expected ${r.expected}, got ${r.actual}`);
        warnings++;
      }
    }
    if (assetCritical.length === 0 && assetWarnings.length === 0) {
      console.log(`OK    ${asset.id}`);
    }
  }

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalAssets: assetsChecked,
    passed: assetsChecked - allResults.filter((r) => !r.passed && r.severity === 'CRITICAL').length,
    criticalFailures,
    warnings,
    results: allResults,
  };

  // Save report
  const reportPath = path.join(ROOT, 'assets', 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n--- Validation Complete ---');
  console.log(`Assets checked: ${assetsChecked}`);
  console.log(`Critical failures: ${criticalFailures}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`Report: ${reportPath}`);

  if (criticalFailures > 0) {
    console.error('\nPipeline HALTED: critical failures found.');
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
