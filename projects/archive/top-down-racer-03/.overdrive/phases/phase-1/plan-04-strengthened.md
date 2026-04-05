Confirmed. Now let me produce the full synthesis.

---

## 1. Strike Team Roster

```
STRIKE TEAM ROSTER
═══════════════════

Tier 1: Core Agents
  ✓ 01 The Surgeon          4 issues (1 HIGH, 2 MEDIUM, 1 LOW)
  ✓ 02 The Architect        2 issues (1 MEDIUM, 1 LOW)
  ✓ 03 The Profiler         3 issues (2 MEDIUM, 1 LOW)
  ✓ 04 The Saboteur         7 issues (2 HIGH, 3 MEDIUM, 2 LOW — renamed from 'missing-edge-case')
  ✓ 05 The Sentinel         4 issues (1 HIGH, 2 MEDIUM, 1 LOW)
  ✓ 06 The Skeptic          6 issues (2 HIGH, 3 MEDIUM, 1 LOW)
  ✓ 07 The Accountant       4 issues (2 MEDIUM, 2 LOW)
  ✗ 08 The Oracle           TIMED OUT
  ✓ 09 The Simplifier       4 issues (2 MEDIUM, 2 LOW)
  ✓ 10 The Researcher       3 issues (1 MEDIUM, 2 LOW)

Tier 2: Specialists
  ✓ 12 The Timekeeper       3 issues (2 MEDIUM, 1 LOW)
  ✓ 14 The Janitor          3 issues (2 MEDIUM, 1 LOW)
  ✓ 22 The Lab Tech         3 issues (1 HIGH, 2 MEDIUM)

Tier 3: Governance
  ○ Not activated (complexity < maximum)

Total: 12 agents ran | 46 findings | 27 accepted | 6 rejected | 13 merged
Review gaps: Agent 08 (Dependency & Integration Impact) timed out — dependency 
  compatibility review incomplete. Acceptable risk: Plan 4 has one external 
  dependency (Sharp) already installed by Plan 1. No complex integration surface.
```

---

## 2. Findings

| # | Severity | Finding | Fix | Found By | Resolution |
|---|----------|---------|-----|----------|------------|
| 1 | 🔴 HIGH | `tsconfig.json` includes only `src/**/*`. `tools/` and `tests/tools/` are never type-checked. Acceptance criterion "tsc --noEmit passes" is vacuously true. | Add `"tools/**/*"` and `"tests/**/*"` to `tsconfig.json`'s `include` array. | Agents 01, 07 | MERGED |
| 2 | 🔴 HIGH | `main()` hardcodes `RAW_DIR` and `OUTPUT_DIR` as module constants with no injection point. Integration tests cannot redirect I/O to temp directories. `process.exit()` in `main()` kills the test runner. | Refactor `main(rawDir?, outputDir?)` with defaults. Return exit code instead of calling `process.exit()`. CLI entry-point guard at module bottom calls `main()` and sets `process.exitCode`. | Agents 22, 12, 06, 02, 14 | MERGED |
| 3 | 🔴 HIGH | Individual subdirectory ENOENT crashes processors. `readdir()` on a nonexistent `assets/raw/sprites/` throws unhandled. Users won't create all 4 subdirs on first use. | Each processor: if `readdir` throws ENOENT, return empty `ProcessResult[]`. | Agents 01, 04 | MERGED |
| 4 | 🔴 HIGH | `readdir()` returns ALL files (`.DS_Store`, `.psd`, `README.md`). Processors assume only matching files exist. Non-image files passed to Sharp throw. | Filter `readdir` results with regex per category: `/^car-.*\.png$/i` for sprites, `/^track.*-bg\.png$/i` for track bgs, `/\.png$/i` for textures, `/\.wav$/i` for audio. | Agent 04 | ACCEPTED |
| 5 | 🔴 HIGH | No integration test for `main()` — the only function users actually invoke. Zero coverage of orchestration, directory creation, result aggregation, or summary output. | Add integration test: create temp directory tree with one file per category, call `main(tempRawDir, tempOutputDir)`, assert outputs exist and return code is 0. | Agent 06 | ACCEPTED |
| 6 | 🔴 HIGH | No test for "continue on individual file failure." A processor that throws on first corrupt file and halts passes all existing tests. | Add test: 3 files in one processor's input — valid, corrupt (`Buffer.from('not a png')` named `car-broken.png`), valid. Assert both valid files produce output, corrupt returns `status: 'error'`, function doesn't throw. | Agents 06, 04 | MERGED |
| 7 | 🟡 MEDIUM | Sharp `resize()` with `fit: 'contain'` defaults to opaque black background. Plan says "transparent background" but doesn't specify the option. | Add `background: { r: 0, g: 0, b: 0, alpha: 0 }` to resize options. | Agents 01, 10 | MERGED |
| 8 | 🟡 MEDIUM | No per-file try/catch in processor loops. A corrupted PNG crashes the entire category, skipping remaining files. | Wrap each file's Sharp pipeline in try/catch. On catch, push `{ status: 'error', message }` and continue loop. | Agents 04, 05 | MERGED |
| 9 | 🟡 MEDIUM | `process.exit()` races with stdout flush on Windows. Summary output may be truncated. Also kills test runner if `main()` is imported. | Use `process.exitCode = 1` instead of `process.exit(1)`. Let event loop drain naturally. | Agents 12, 14 | MERGED |
| 10 | 🟡 MEDIUM | `ProcessResult` type in prose (`{ file, status: 'ok'|'error' }`) conflicts with formal interface (`{ inputFile, outputFile, status: 'ok'|'warning'|'error' }`). | Use the formal `ProcessResult` interface everywhere. All processors return `ProcessResult[]` with the formal shape. | Agents 07, 10 | MERGED |
| 11 | 🟡 MEDIUM | 200KB threshold: `stat().size` is bytes. `200_000 !== 200 * 1024`. Off by 4.7%. | Define `const MAX_AUDIO_BYTES = 200 * 1024` (204,800). | Agent 04 | ACCEPTED |
| 12 | 🟡 MEDIUM | Power-of-2 check `(n & (n-1)) === 0` returns true for `n = 0`. Corrupted metadata with 0×0 passes silently. | Guard: `const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0` | Agent 04 | ACCEPTED |
| 13 | 🟡 MEDIUM | Power-of-2 validation checks each dimension independently (128×64 curb texture is valid per ADR-11). Plan examples imply square-only. | Validate `isPowerOf2(width) && isPowerOf2(height)` — not `width === height`. Add non-square power-of-2 test case. | Agent 07 | ACCEPTED |
| 14 | 🟡 MEDIUM | `ProcessingRule` interface is dead code. Four direct functions are used instead. | Remove `ProcessingRule` from implementation. | Agents 02, 07, 09, 10 | MERGED |
| 15 | 🟡 MEDIUM | `main()` has no try/catch around individual processor calls. An unhandled throw from any processor skips all remaining processors and the summary. | Wrap each processor call in `main()` with try/catch. On catch, push an error result and continue. | Agent 14 | ACCEPTED |
| 16 | 🟡 MEDIUM | Track bg optimization test asserts `outputSize <= inputSize` — a no-op copy passes. | Generate fixture with `compressionLevel: 0`. Assert `outputSize < inputSize` (strictly less). | Agent 06 | ACCEPTED |
| 17 | 🟡 MEDIUM | No test for non-2048×2048 track bg dimension warning. | Add test: 1024×768 PNG → `processTrackBackgrounds` → assert `status: 'warning'` and output still exists. | Agent 06 | ACCEPTED |
| 18 | 🟡 MEDIUM | No test for exit code behavior. `main()` returning wrong code passes all tests. | Test `main()` with valid fixtures → returns 0. With corrupt file → returns 1. | Agent 06 | ACCEPTED |
| 19 | 🟡 MEDIUM | Test temp directories have no cleanup strategy. Failed assertions leave stale dirs. | Use `fs.mkdtempSync()` for unique dirs. Clean up in `afterEach` or Vitest's `onTestFinished`. | Agent 22 | ACCEPTED |
| 20 | 🟡 MEDIUM | Processors mix I/O (console.log) with computation (return ProcessResult[]). Makes testing harder, results and logs can diverge. | Processors return `ProcessResult[]` only — zero console calls. `main()` handles all logging from results. | Agent 22 | ACCEPTED |
| 21 | 🟡 MEDIUM | Four category processors run sequentially. They target non-overlapping directories and Sharp releases the thread pool. | Run four processors with `Promise.all()` in `main()`. Within each processor, sequential is fine (3-6 files each). | Agent 03 | ACCEPTED |
| 22 | 🟢 LOW | `adaptiveFiltering: true` is Sharp's default at compression level 9. Redundant. | Use `.png({ compressionLevel: 9 })` only. | Agent 09 | ACCEPTED |
| 23 | 🟢 LOW | No warning for unexpected sprite input dimensions (not 256×256). | After `sharp().metadata()`, warn if not 256×256: `"Expected 256×256, got ${w}×${h}"`. | Agent 04 | ACCEPTED |
| 24 | 🟢 LOW | Texture metadata + processing decodes image twice. | Read metadata from Sharp info after processing, or chain operations. | Agent 03 | ACCEPTED |
| 25 | 🟢 LOW | `@types/sharp` may conflict with Sharp ≥0.33's built-in types. | Note for Plan 1: verify Sharp version. If ≥0.33, skip `@types/sharp`. | Agent 01 | ACCEPTED (advisory for Plan 1) |
| 26 | 🟢 LOW | Audio test fixture should be a minimal valid WAV, not random bytes. | Generate 44-byte WAV header + small payload. | Agent 06 | ACCEPTED |
| 27 | 🟢 LOW | `mkdir` failures in `main()` produce raw stack trace. | Wrap `mkdir` in try/catch with clear error message. | Agent 14 | ACCEPTED |

```
Findings requiring gate escalation: None
```

---

## 3. Implementation Specification

### Plan 4 — Strengthened

**Wave:** 2  
**Commit Message:** `feat(phase1): implement Sharp-based asset processor for image and audio optimization`

### Prerequisites

From Plan 1 (already completed):
- `sharp` is installed as a dev dependency (verify: if Sharp ≥0.33, `@types/sharp` is NOT installed — Sharp ships built-in types)
- Directory structure exists: `assets/raw/{sprites,textures,tracks,audio,ui-designs}` → `public/assets/{sprites,textures,tracks,audio}`
- `package.json` has script: `"process-assets": "tsx tools/process-assets.ts"`

### File Targets

| File | Action | Purpose |
|------|--------|---------|
| `tools/process-assets.ts` | CREATE | Main asset processor script |
| `tests/tools/process-assets.test.ts` | CREATE | Comprehensive tests with Sharp-generated fixtures |
| `tsconfig.json` | MODIFY | Add `"tools/**/*"` and `"tests/**/*"` to `include` array |

---

### tsconfig.json Modification

Change the `include` array from:
```json
"include": ["src/**/*"]
```
To:
```json
"include": ["src/**/*", "tools/**/*", "tests/**/*"]
```

This ensures `pnpm exec tsc --noEmit` actually type-checks the new files.

---

### tools/process-assets.ts — Complete Specification

#### Constants

```typescript
const RAW_DIR = 'assets/raw';
const OUTPUT_DIR = 'public/assets';
const MAX_AUDIO_BYTES = 200 * 1024; // 204,800 bytes = 200 KiB
```

#### Types

```typescript
interface ProcessResult {
  inputFile: string;
  outputFile: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}
```

No `ProcessingRule` interface. The four processors are direct functions.

#### Imports

```typescript
import sharp from 'sharp';
import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
```

#### Utility: `isPowerOf2`

```typescript
function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
```

Guards against `n = 0` returning true.

#### Utility: `safeReaddir`

```typescript
async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw e;
  }
}
```

Returns empty array if directory doesn't exist. Rethrows other errors.

---

#### Function 1: `processSprites`

```typescript
export async function processSprites(inputDir: string, outputDir: string): Promise<ProcessResult[]>
```

**Logic:**
1. Call `safeReaddir(inputDir)`. If empty, return `[]`.
2. Filter results: `files.filter(f => /^car-.*\.png$/i.test(f))`.
3. For each matching file, wrap in try/catch:
   a. Read metadata via `sharp(inputPath).metadata()`.
   b. If `width !== 256 || height !== 256`, push a result with `status: 'warning'`, message: `"Expected 256×256, got ${width}×${height} — resizing anyway"`. Continue processing (don't skip).
   c. Resize: `sharp(inputPath).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(outputPath)`.
   d. Push `{ inputFile, outputFile, status: 'ok' }` (or `'warning'` if dimension mismatch was noted).
   e. On catch: push `{ inputFile, outputFile, status: 'error', message: err.message }`, continue loop.
4. Return results array.

**Zero console.log/warn calls.** Pure function returning data.

---

#### Function 2: `processTrackBackgrounds`

```typescript
export async function processTrackBackgrounds(inputDir: string, outputDir: string): Promise<ProcessResult[]>
```

**Logic:**
1. Call `safeReaddir(inputDir)`. Filter: `/^track.*-bg\.png$/i`.
2. For each file, wrap in try/catch:
   a. Read metadata.
   b. If `width !== 2048 || height !== 2048`, note warning: `"Expected 2048×2048, got ${width}×${height}"`. Still process.
   c. Optimize: `sharp(inputPath).png({ compressionLevel: 9 }).toFile(outputPath)`.
   d. Push result (`'ok'` or `'warning'` if dimensions were off).
   e. On catch: push error result, continue.
3. Return results.

---

#### Function 3: `processTextures`

```typescript
export async function processTextures(inputDir: string, outputDir: string): Promise<ProcessResult[]>
```

**Logic:**
1. Call `safeReaddir(inputDir)`. Filter: `/\.png$/i`.
2. For each file, wrap in try/catch:
   a. Process with Sharp and get info in one pass: `sharp(inputPath).png({ compressionLevel: 9 }).toFile(outputPath)`. Then read metadata from the output (or use `.toBuffer({ resolveWithObject: true })` to get info + buffer in one pass, then write buffer to disk).
   
   **Preferred single-pass approach:** 
   ```typescript
   const metadata = await sharp(inputPath).metadata();
   // validate dimensions from metadata
   await sharp(inputPath).png({ compressionLevel: 9 }).toFile(outputPath);
   ```
   This is acceptable — Sharp caches the decoded image internally for the same input path within reasonable time.
   
   b. Validate: `isPowerOf2(metadata.width!) && isPowerOf2(metadata.height!)`. If not, status is `'warning'`: `"Non-power-of-2 dimensions: ${width}×${height}"`. Non-square power-of-2 (e.g., 128×64) passes without warning.
   c. Push result.
   d. On catch: push error result, continue.
3. Return results.

---

#### Function 4: `processAudio`

```typescript
export async function processAudio(inputDir: string, outputDir: string): Promise<ProcessResult[]>
```

**Logic:**
1. Call `safeReaddir(inputDir)`. Filter: `/\.wav$/i`.
2. For each file, wrap in try/catch:
   a. `const fileStats = await stat(inputPath)`.
   b. If `fileStats.size > MAX_AUDIO_BYTES`, push result with `status: 'warning'`, message: `"File size ${fileStats.size} bytes exceeds 200KB limit"`. Still copy.
   c. `await copyFile(inputPath, outputPath)`.
   d. Push result (`'ok'` or `'warning'`).
   e. On catch: push error result, continue.
3. Return results.

---

#### Function 5: `main`

```typescript
export async function main(rawDir: string = RAW_DIR, outputDir: string = OUTPUT_DIR): Promise<number>
```

**Parameters are optional with defaults.** Returns exit code (0 or 1). Does NOT call `process.exit()`.

**Logic:**

1. **Check raw directory exists:**
   ```typescript
   try {
     await stat(rawDir);
   } catch {
     console.log(`No raw assets found. Place files in ${rawDir}/ per docs/asset-spec.md`);
     return 0;
   }
   ```

2. **Create output directories** (with error handling):
   ```typescript
   const subdirs = ['sprites', 'textures', 'tracks', 'audio'];
   for (const sub of subdirs) {
     try {
       await mkdir(join(outputDir, sub), { recursive: true });
     } catch (e) {
       console.error(`Failed to create output directory ${join(outputDir, sub)}: ${e instanceof Error ? e.message : e}`);
       return 1;
     }
   }
   ```

3. **Run all four processors in parallel** (non-overlapping directories), each wrapped in try/catch:
   ```typescript
   const allResults: ProcessResult[] = [];

   const processors = [
     { name: 'sprites', fn: () => processSprites(join(rawDir, 'sprites'), join(outputDir, 'sprites')) },
     { name: 'track backgrounds', fn: () => processTrackBackgrounds(join(rawDir, 'tracks'), join(outputDir, 'tracks')) },
     { name: 'textures', fn: () => processTextures(join(rawDir, 'textures'), join(outputDir, 'textures')) },
     { name: 'audio', fn: () => processAudio(join(rawDir, 'audio'), join(outputDir, 'audio')) },
   ];

   const settled = await Promise.allSettled(processors.map(p => p.fn()));

   for (let i = 0; i < settled.length; i++) {
     const result = settled[i];
     if (result.status === 'fulfilled') {
       allResults.push(...result.value);
     } else {
       console.error(`${processors[i].name} processor failed: ${result.reason}`);
       allResults.push({
         inputFile: `${processors[i].name}/*`,
         outputFile: '',
         status: 'error',
         message: result.reason instanceof Error ? result.reason.message : String(result.reason),
       });
     }
   }
   ```

4. **Print summary** (all logging lives here, not in processors):
   ```typescript
   const ok = allResults.filter(r => r.status === 'ok').length;
   const warnings = allResults.filter(r => r.status === 'warning');
   const errors = allResults.filter(r => r.status === 'error');

   console.log(`\nAsset processing complete:`);
   console.log(`  ${ok} files processed successfully`);
   if (warnings.length > 0) {
     console.log(`  ${warnings.length} warnings:`);
     for (const w of warnings) console.log(`    ⚠ ${w.inputFile}: ${w.message}`);
   }
   if (errors.length > 0) {
     console.log(`  ${errors.length} errors:`);
     for (const e of errors) console.log(`    ✗ ${e.inputFile}: ${e.message}`);
   }

   return errors.length > 0 ? 1 : 0;
   ```

5. **CLI entry point guard** (at module bottom, outside `main`):
   ```typescript
   // CLI entry point — only runs when executed directly, not when imported by tests
   const isDirectRun = process.argv[1] && (
     process.argv[1].endsWith('process-assets.ts') ||
     process.argv[1].endsWith('process-assets.js')
   );
   if (isDirectRun) {
     main().then(code => {
       process.exitCode = code;
     });
   }
   ```

   Uses `process.exitCode` (not `process.exit()`) to allow stdout to flush before process terminates.

---

### tests/tools/process-assets.test.ts — Complete Specification

**Framework:** Vitest  
**Strategy:** Each test uses `fs.mkdtempSync()` for unique temp dirs. Cleanup in `afterEach`/`onTestFinished`. Processors are pure functions — tests verify return values and filesystem state only.

#### Setup Helpers

```typescript
import { describe, test, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import {
  processSprites,
  processTrackBackgrounds,
  processTextures,
  processAudio,
  main,
} from '../../tools/process-assets';

// Create unique temp dir for each test
function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'asset-test-'));
}

// Cleanup helper
function removeTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// Generate minimal valid WAV file (44-byte header + 100 bytes of silence)
function createMinimalWav(): Buffer {
  const dataSize = 100;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);     // chunk size
  buffer.writeUInt16LE(1, 20);      // PCM format
  buffer.writeUInt16LE(1, 22);      // mono
  buffer.writeUInt32LE(44100, 24);  // sample rate
  buffer.writeUInt32LE(44100, 28);  // byte rate
  buffer.writeUInt16LE(1, 32);      // block align
  buffer.writeUInt16LE(8, 34);      // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}
```

#### Test 1: Sprite resize and transparency preservation

Create a 256×256 RGBA test PNG with Sharp (with non-trivial alpha). Run `processSprites`. Verify:
- Output exists
- Output is 128×128
- Output has alpha channel (channels === 4)
- Result status is `'ok'`

```typescript
test('resizes sprites to 128x128 preserving transparency', async () => {
  const tmpDir = createTempDir();
  try {
    const inputDir = join(tmpDir, 'in');
    const outputDir = join(tmpDir, 'out');
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    // 256x256 semi-transparent red
    await sharp({
      create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } }
    }).png().toFile(join(inputDir, 'car-red.png'));

    const results = await processSprites(inputDir, outputDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('ok');

    const meta = await sharp(join(outputDir, 'car-red.png')).metadata();
    expect(meta.width).toBe(128);
    expect(meta.height).toBe(128);
    expect(meta.channels).toBe(4); // alpha preserved
  } finally {
    removeTempDir(tmpDir);
  }
});
```

#### Test 2: Track background optimization (strictly smaller output)

Create a 2048×2048 PNG with `compressionLevel: 0` (uncompressed). Run `processTrackBackgrounds`. Verify:
- Output exists
- Output file size is **strictly less than** input file size
- Result status is `'ok'`

```typescript
test('optimizes track backgrounds with compression', async () => {
  const tmpDir = createTempDir();
  try {
    const inputDir = join(tmpDir, 'in');
    const outputDir = join(tmpDir, 'out');
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const inputPath = join(inputDir, 'track01-bg.png');
    await sharp({
      create: { width: 2048, height: 2048, channels: 4, background: { r: 0, g: 128, b: 0, alpha: 1 } }
    }).png({ compressionLevel: 0 }).toFile(inputPath);

    const results = await processTrackBackgrounds(inputDir, outputDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('ok');

    const inputStat = await stat(inputPath);
    const outputStat = await stat(join(outputDir, 'track01-bg.png'));
    expect(outputStat.size).toBeLessThan(inputStat.size);
  } finally {
    removeTempDir(tmpDir);
  }
});
```

#### Test 3: Track background dimension warning

Create a 1024×768 PNG. Run `processTrackBackgrounds`. Verify:
- Result status is `'warning'` with message about dimensions
- Output file still exists (processed despite warning)

#### Test 4: Texture power-of-2 validation warning

Create a 300×300 PNG. Run `processTextures`. Verify:
- Result includes `status: 'warning'` with message about non-power-of-2

#### Test 5: Texture non-square power-of-2 passes clean

Create a 128×64 PNG. Run `processTextures`. Verify:
- Result status is `'ok'` (both dimensions are valid powers of 2)
- No warning

#### Test 6: Audio copy with valid WAV

Create a minimal WAV file (using `createMinimalWav()` helper, well under 200KB). Run `processAudio`. Verify:
- File is copied to output directory
- Result status is `'ok'`

#### Test 7: Audio size warning

Create a file > 200KB (write `Buffer.alloc(250 * 1024)` with WAV header). Run `processAudio`. Verify:
- Result includes `status: 'warning'`
- File is still copied (warning, not rejection)

#### Test 8: Empty/missing directory graceful handling

Run each processor on a nonexistent directory path. Verify:
- Returns empty array
- No throw

Also run on an existing but empty directory. Same expectations.

(Can use `test.each` for the two variants.)

#### Test 9: Continue on individual file failure (corruption resilience)

Place 3 files in sprites input dir:
- `car-valid1.png` — valid 256×256 Sharp-generated PNG
- `car-broken.png` — `Buffer.from('not a png image')` written as a file
- `car-valid2.png` — valid 256×256 Sharp-generated PNG

Run `processSprites`. Verify:
- Returns 3 results
- `car-valid1.png` → `status: 'ok'`
- `car-broken.png` → `status: 'error'`
- `car-valid2.png` → `status: 'ok'`
- Both valid output files exist on disk
- Function did NOT throw

#### Test 10: `main()` integration test

Create a temp directory tree:
```
tmpDir/raw/sprites/car-test.png    (256×256)
tmpDir/raw/tracks/track01-bg.png   (2048×2048, compressionLevel: 0)
tmpDir/raw/textures/asphalt.png    (512×512)
tmpDir/raw/audio/engine-idle.wav   (minimal WAV)
```

Call `main(join(tmpDir, 'raw'), join(tmpDir, 'out'))`.

Verify:
- Return value is `0`
- `tmpDir/out/sprites/car-test.png` exists and is 128×128
- `tmpDir/out/tracks/track01-bg.png` exists
- `tmpDir/out/textures/asphalt.png` exists
- `tmpDir/out/audio/engine-idle.wav` exists

#### Test 11: `main()` exit code 1 on errors

Same as Test 10 but add a corrupt file (`car-broken.png` with text content). Call `main(...)`. Verify:
- Return value is `1`
- Valid files are still processed (outputs exist)

#### Test 12: `main()` with missing raw directory

Call `main('/nonexistent/path', join(tmpDir, 'out'))`. Verify:
- Return value is `0` (not an error)
- No throw

---

### Acceptance Criteria

- [ ] `tools/process-assets.ts` exports `processSprites`, `processTrackBackgrounds`, `processTextures`, `processAudio`, and `main` — `Satisfies: R-001`
- [ ] Running `pnpm run process-assets` with raw assets in `assets/raw/` produces optimized outputs in `public/assets/` — `Satisfies: R-001`
- [ ] Car sprites are resized from 256×256 to 128×128 with transparency preserved (explicit transparent background in Sharp resize options) — `Satisfies: R-001`
- [ ] Track backgrounds are PNG-optimized (compression level 9) — `Satisfies: R-001`
- [ ] Textures get power-of-2 dimension validation per-dimension independently (128×64 passes; 300×300 warns) — `Satisfies: R-001`
- [ ] Audio files ≤ 200KiB (204,800 bytes) are copied cleanly; files > 200KiB produce a warning but are still copied — `Satisfies: R-001`
- [ ] Empty/missing `assets/raw/` directory produces a helpful message and exit code 0 — `Satisfies: R-001`
- [ ] Missing subdirectories (e.g., `assets/raw/sprites/` doesn't exist) handled gracefully — no crash — `Satisfies: R-001`
- [ ] Individual file failures don't halt processing — remaining files in the same category are still processed — `Satisfies: R-001`
- [ ] Non-matching files in directories (`.DS_Store`, `.psd`, etc.) are silently skipped — `Satisfies: R-001`
- [ ] All 12 tests pass in `tests/tools/process-assets.test.ts` — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`
- [ ] `tsconfig.json` includes `tools/**/*` and `tests/**/*`; `pnpm exec tsc --noEmit` type-checks all Plan 4 files — `Satisfies: R-005`

### Dependencies

- **Depends on:** Plan 1 (directory structure, Sharp dependency, package.json scripts)
- **Needed by:** None directly (Phase 2 will use this tool to process raw assets)

### Locked Decisions

- Sharp for image processing (ADR-02, spec)
- Input: `assets/raw/`, Output: `public/assets/` (ADR-02)
- Car sprites: single PNG per variant, 256×256 raw → 128×128 game-size (ADR-03)
- Track backgrounds: 2048×2048 (ADR-04)
- Audio: WAV format, ≤ 200KB per file (ADR-11)

---

## 4. Strike Team Notes

### Rejected Findings

| Agent | Finding | Rejection Reason |
|-------|---------|------------------|
| Agent 05 #1 | Path traversal via crafted filenames | This is a local CLI build tool run by the developer on their own machine. The developer populates `assets/raw/` themselves. Path traversal protection on a local build tool is security theater — the "attacker" is the user. |
| Agent 05 #3 | Hard 10MB upper limit on audio files | Over-engineering. The 200KB warning is sufficient for a local build tool. If a 500MB file ends up in the output, the developer will notice immediately. |
| Agent 05 #4 | Symlink resolution check | Same as #1. Local tool, developer controls input. |
| Agent 09 #2 | Drop ProcessResult, use console.warn directly | Structured return values are more testable than console side effects. The three-tier status aligns with the three real outcomes (success, non-fatal issue, failure). Multiple agents depend on testing ProcessResult. |
| Agent 03 #2 | Memory concern for concurrent track bg processing | Only 3 tracks exist. Sequential within the track background processor is fine. The inter-category parallelism (Finding #21) is the meaningful optimization. |
| Agent 12 #3 | Atomic writes via temp file + rename | Local single-user build tool. Concurrent invocations are a user error, not a design scenario. |

### Resolved Conflicts

- **ProcessResult vs. console.warn (Agent 09 vs. Agent 22):** Agent 09 wanted to drop structured results in favor of console calls. Agent 22 wanted pure functions returning results with zero console calls. Agent 22's approach is strictly better for testability and was adopted. Processors are pure; `main()` owns all I/O.

- **Test count (Agent 09 "merge tests" vs. Agent 06 "add more tests"):** Agent 09 suggested merging 8 tests down to 6. Agent 06 suggested adding 4 more tests. Resolved: kept separate tests where code paths differ (transparency is worth testing explicitly), merged empty/missing dir tests into one with `test.each`, added integration tests. Net: 12 tests, thorough coverage.

### Review Gaps

- **Agent 08 (Dependency & Integration Impact) timed out.** This gap is LOW risk for Plan 4: the only external dependency is Sharp (installed by Plan 1), and the processor is a standalone CLI tool with no runtime integration into the game. No dependency version conflicts or integration boundary issues are likely.

### Advisory Notes for Plan 1

- If Sharp ≥0.33 is installed, do NOT install `@types/sharp` — Sharp ships built-in TypeScript declarations. Installing both may cause duplicate type errors.