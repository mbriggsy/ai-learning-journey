Good. Now I have full context. Let me produce the synthesis document.

---

## 1. Strike Team Roster

```
STRIKE TEAM ROSTER
═══════════════════

Tier 1: Core Agents
  ✓ 01 The Surgeon          1 issue
  ✓ 02 The Architect        3 issues
  ✗ 03 The Profiler         NOT ACTIVATED
  ✓ 04 The Saboteur         8 issues
  ✓ 05 The Sentinel         3 issues
  ✓ 06 The Skeptic          6 issues
  ✓ 07 The Accountant       3 issues
  ✓ 08 The Oracle           3 issues
  ✓ 09 The Simplifier       4 issues
  ✓ 10 The Researcher       2 issues

Tier 2: Specialists
  ✓ 12 The Timekeeper       4 issues
  ○ 11 The Guardian         NOT ACTIVATED
  ○ 13                      NOT ACTIVATED
  ○ 14                      NOT ACTIVATED
  ✓ 15 The Deployer         4 issues

Tier 3: Governance
  ○ 24 The Magistrate       NOT ACTIVATED (complexity < maximum)

Total: 12 agents ran | 41 findings | 24 accepted | 9 rejected | 8 merged
Review gaps: Performance review (Agent 03) not activated — acceptable for build tooling scripts
```

---

## 2. Findings

| # | Severity | Finding | Fix | Found By | Resolution |
|---|----------|---------|-----|----------|------------|
| 1 | 🔴 CRITICAL | **Windows path separators produce 404s in browser.** `path.join()` uses `\` on Windows. Generated manifest paths like `assets\sprites\car.png` will 404 in the browser. | Use `path.posix.join()` or normalize with `.split(path.sep).join('/')` for all paths written to the manifest. Define a `toUrl` helper. | Agent 04 #1 | ACCEPTED |
| 2 | 🔴 CRITICAL | **No compilation test for generated manifest.** AC requires "compiles without TypeScript errors" but no test runs `tsc`. String-matching `as const` doesn't prove compilation. | Add a test that writes generated manifest to a temp file and runs `npx tsc --noEmit --strict` on it, asserting exit code 0. | Agent 06 #1 | ACCEPTED |
| 3 | 🔴 HIGH | **`sharp().metadata()` returns `width?: number | undefined`.** Assigning directly to non-optional `width: number` fails in strict TypeScript. | Add narrowing guards after `.metadata()`: throw if `!meta.width || !meta.height`, include filename in error message. | Agent 01 #1, Agent 04 #7 | MERGED (Agents 01, 04) |
| 4 | 🔴 HIGH | **Recursive scan of `public/assets/` will hit root-level files (`model.onnx`, `vecnorm_stats.json`) with no category mapping.** | Scan only named subdirectories independently, not `public/assets/` recursively. | Agent 04 #2 | ACCEPTED |
| 5 | 🔴 HIGH | **Missing directory (`ENOENT`) throws differently from empty directory.** `fs.readdir()` on non-existent path throws, not returns `[]`. | Wrap directory reads in try/catch: treat `ENOENT` as empty, re-throw other errors. | Agent 04 #3, Agent 15 #4 | MERGED (Agents 04, 15) |
| 6 | 🔴 HIGH | **Shelf-packing tested only with uniform-size sprites.** Algorithm correctness for mixed heights is never exercised. | Add test with 4+ sprites of varying dimensions. Assert each frame within atlas bounds. | Agent 06 #2 | ACCEPTED |
| 7 | 🔴 HIGH | **Error cases (sprite > 4096, overflow) defined but untested.** | Add two tests: oversized sprite throws, overflow throws. | Agent 06 #3 | ACCEPTED |
| 8 | 🟡 MEDIUM | **`SpriteEntry` conflates input metadata with output coordinates.** `x, y` are meaningless at load time. | Split into `SpriteMetadata { filename, width, height }` and `PackedSprite extends SpriteMetadata { x, y }`. | Agent 04 #6, Agent 09 #3, Agent 10 #2 | MERGED (Agents 04, 09, 10) |
| 9 | 🟡 MEDIUM | **Non-deterministic sort produces spurious git diffs.** No tiebreaker for equal-height sprites or manifest key ordering. | Sort sprites secondarily by filename ascending. Sort manifest entries alphabetically by key. | Agent 04 #4, Agent 04 #5, Agent 07 #2 | MERGED (Agents 04, 07) |
| 10 | 🟡 MEDIUM | **Code injection via crafted filenames in manifest.** A file with `'` in its name breaks generated TypeScript string literals. | Validate filenames against `/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/` before use. Skip non-matching files with a warning. | Agent 05 #1, Agent 05 #2 | MERGED (Agents 05) |
| 11 | 🟡 MEDIUM | **Atlas output directory needs self-healing `mkdirSync`.** Cross-plan dependency on Plan 1 creating `public/assets/atlas/`. | Add `fs.mkdirSync(outputDir, { recursive: true })` at start of `buildAtlas()`. | Agent 02 #2 | ACCEPTED |
| 12 | 🟡 MEDIUM | **`src/assets/` must be documented as a pure data module.** No imports from `src/engine/`, `src/renderer/`, or `src/ai/`. | Add header comment to generated file stating the constraint. | Agent 02 #1 | ACCEPTED |
| 13 | 🟡 MEDIUM | **Manifest path convention mismatch.** Existing code uses leading-slash paths (`'/assets/model.onnx'`). Plan generates no-leading-slash paths. | Keep paths WITHOUT leading slash. Vite serves `public/` at root — `'assets/foo.png'` resolves correctly and is more portable than `'/assets/foo.png'`. Existing v02 code paths are in frozen engine files that won't consume this manifest. | Agent 08 #1 | ACCEPTED with modification — see Strike Team Notes |
| 14 | 🟡 MEDIUM | **No composite `build-assets` script enforces runtime ordering.** Process → atlas → manifest must run sequentially, but no script chains them. | Add `"build-assets": "npx tsx tools/process-assets.ts && npx tsx tools/build-atlas.ts && npx tsx tools/generate-manifest.ts"` to `package.json`. | Agent 08 #3, Agent 12 #2, Agent 15 #1 | MERGED (Agents 08, 12, 15) |
| 15 | 🟡 MEDIUM | **Atlas builder should clean output dir before writing** to prevent stale entries from deleted sprites. | `fs.rmSync(outputDir, { recursive: true, force: true })` then `fs.mkdirSync(outputDir, { recursive: true })` at start of `buildAtlas()`. | Agent 15 #2 | ACCEPTED (supersedes #11 — clean + recreate) |
| 16 | 🟡 MEDIUM | **Manifest write is not atomic — Vite HMR may read mid-write.** | Write to `manifest.ts.tmp`, then `fs.renameSync` to final path. | Agent 12 #3 | ACCEPTED |
| 17 | 🟡 MEDIUM | **Atlas output write is not atomic — crash between PNG and JSON leaves orphaned files.** | Write both to `.tmp` names, then rename both. | Agent 12 #1 | ACCEPTED |
| 18 | 🟡 MEDIUM | **No test isolation with temp directories.** Tests writing to disk need `mkdtempSync` and cleanup. | Each test uses `fs.mkdtempSync()` in `beforeEach`, `fs.rmSync()` in `afterEach`. | Agent 06 #5 | ACCEPTED |
| 19 | 🟡 MEDIUM | **Atlas JSON `meta.scale` should be number `1` not string `"1"`.** | Use `"scale": 1` (number). | Agent 10 #1 | ACCEPTED |
| 20 | 🟡 MEDIUM | **JSON test checks structure but not value correctness.** Frame dimensions should match input sprite dimensions. | Extend assertions: verify `frame.w`/`frame.h` match input, verify positions are non-negative and within bounds. | Agent 06 #4 | ACCEPTED |
| 21 | 🟡 MEDIUM | **Manifest structure deviates from ADR-02 nested example.** Plan uses flat keys. | Accept flat keys — document as intentional deviation. Auto-generation from filenames doesn't naturally produce nested structure. | Agent 07 #1 | ACCEPTED (flat keys, documented) |
| 22 | 🟢 LOW | **Script invocation inconsistency.** Plan uses bare `tsx`, existing scripts don't use it. | Use `npx tsx` for consistency since `tsx` is not yet a devDependency. | Agent 07 #3 | ACCEPTED |
| 23 | 🟢 LOW | **Type alias exports in manifest not verified by tests.** | The tsc compilation test (Finding #2) covers this if the test file imports them. Sufficient. | Agent 06 #6 | ACCEPTED (covered by Finding #2) |
| 24 | 🟢 LOW | **CI manifest staleness check.** | Add `"manifest:check"` script. Good practice, low cost. | Agent 15 #3 | ACCEPTED |

```
Findings requiring gate escalation: None
```

---

## 3. Implementation Specification

### Plan 5 — Strengthened Implementation Specification

**Wave:** 2
**Commit Message:** `feat(phase1): implement texture atlas builder and typed asset manifest generator`

**Prerequisites from Plan 1 (already completed):**
- `sharp` and `@types/sharp` are installed as devDependencies
- `tsx` is installed as a devDependency
- `vitest` is installed as a devDependency
- Directory structure exists: `public/assets/{sprites,textures,tracks,audio,atlas}`
- `package.json` has scripts (see below for exact definitions)
- `src/assets/` directory exists

**If Plan 1 is incomplete:** Both tools self-heal missing directories via `fs.mkdirSync({ recursive: true })` and handle `ENOENT` gracefully. The tools will still function, producing empty/minimal output.

---

#### File Targets

| File | Action | Purpose |
|------|--------|---------|
| `tools/build-atlas.ts` | CREATE | Texture atlas builder |
| `tools/generate-manifest.ts` | CREATE | Typed asset manifest generator |
| `src/assets/manifest.ts` | OVERWRITE | Auto-generated typed manifest (replaces any placeholder) |
| `tests/tools/build-atlas.test.ts` | CREATE | Atlas builder tests |
| `tests/tools/generate-manifest.test.ts` | CREATE | Manifest generator tests |
| `package.json` | MODIFY | Add/update scripts |

---

#### package.json Script Updates

Add or update these scripts in `package.json`:

```json
{
  "scripts": {
    "build-atlas": "npx tsx tools/build-atlas.ts",
    "manifest": "npx tsx tools/generate-manifest.ts",
    "build-assets": "npx tsx tools/process-assets.ts && npx tsx tools/build-atlas.ts && npx tsx tools/generate-manifest.ts",
    "manifest:check": "npx tsx tools/generate-manifest.ts && git diff --exit-code src/assets/manifest.ts",
    "test": "vitest run"
  }
}
```

Note: `build-assets` chains the three tools sequentially. `process-assets.ts` is from Plan 4 — if it doesn't exist yet, the chain fails early with a clear error. Keep existing scripts (`dev`, `build`, `preview`) unchanged.

---

#### Tool 1: Texture Atlas Builder (`tools/build-atlas.ts`)

**Purpose:** Pack multiple PNG files from `public/assets/sprites/` into a single texture atlas PNG + PixiJS-compatible JSON descriptor.

**Output:**
- `public/assets/atlas/sprites.png` — packed atlas image
- `public/assets/atlas/sprites.json` — PixiJS TexturePacker-format JSON descriptor

##### Type Definitions

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

/** Metadata loaded from a source sprite file */
interface SpriteMetadata {
  filename: string;  // e.g. "car-player-red.png"
  width: number;
  height: number;
}

/** Sprite with assigned atlas coordinates after packing */
interface PackedSprite extends SpriteMetadata {
  x: number;  // x position in atlas
  y: number;  // y position in atlas
}
```

##### Filename Validation

All filenames entering the pipeline MUST be validated:

```typescript
const VALID_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function validateFilename(filename: string): boolean {
  const stem = path.parse(filename).name;
  return VALID_FILENAME.test(stem);
}
```

Files failing validation: log a warning to stderr and skip the file. Do NOT include them in the atlas.

##### Function: `loadSpriteMetadata`

```typescript
async function loadSpriteMetadata(inputDir: string): Promise<SpriteMetadata[]>
```

1. Try `fs.readdirSync(inputDir)`. If `ENOENT`, return empty array. Re-throw other errors.
2. Filter to `.png` files only.
3. Validate each filename with `VALID_FILENAME`. Skip and warn on invalid.
4. For each valid PNG:
   - `const meta = await sharp(path.join(inputDir, filename)).metadata();`
   - If `!meta.width || !meta.height`: throw `Error: Failed to read dimensions for ${filename} — file may be corrupt`
   - Push `{ filename, width: meta.width, height: meta.height }`
5. Return the array.

##### Function: `packSprites`

```typescript
function packSprites(sprites: SpriteMetadata[]): { packed: PackedSprite[], atlasWidth: number, atlasHeight: number }
```

**Shelf-packing algorithm:**

1. If `sprites.length === 0`: return `{ packed: [], atlasWidth: 0, atlasHeight: 0 }`.
2. Check each sprite: if any sprite has `width > 4096 || height > 4096`, throw `Error: Sprite ${filename} (${width}x${height}) exceeds maximum atlas dimension of 4096`.
3. Sort by height descending, then by filename ascending (tiebreaker for determinism):
   ```typescript
   sprites.sort((a, b) => b.height - a.height || a.filename.localeCompare(b.filename));
   ```
4. Pack using shelf algorithm:
   - `shelfY = 0`, `shelfHeight = 0`, `cursorX = 0`
   - Initial atlas width estimate: `atlasWidth = 256` (will be expanded)
   - For each sprite:
     - If `cursorX + sprite.width > atlasWidth`: start new shelf (`shelfY += shelfHeight`, `shelfHeight = 0`, `cursorX = 0`)
     - If still doesn't fit: double `atlasWidth` and retry from scratch (restart loop)
     - Place sprite: `x = cursorX`, `y = shelfY`
     - `cursorX += sprite.width`
     - `shelfHeight = Math.max(shelfHeight, sprite.height)`
5. Compute final `totalHeight = shelfY + shelfHeight`.
6. Round both dimensions up to next power of 2:
   ```typescript
   function nextPow2(n: number): number {
     let p = 1;
     while (p < n) p *= 2;
     return p;
   }
   ```
7. If `atlasWidth > 4096 || atlasHeight > 4096`: throw `Error: Sprites do not fit within 4096x4096 atlas`.
8. Return `{ packed, atlasWidth, atlasHeight }`.

##### Function: `buildAtlas`

```typescript
async function buildAtlas(inputDir: string, outputDir: string): Promise<void>
```

1. Load sprites: `const sprites = await loadSpriteMetadata(inputDir);`
2. If `sprites.length === 0`: print `"No sprites to pack in ${inputDir}"`, return (exit 0).
3. Pack: `const { packed, atlasWidth, atlasHeight } = packSprites(sprites);`
4. **Clean and create output directory:**
   ```typescript
   fs.rmSync(outputDir, { recursive: true, force: true });
   fs.mkdirSync(outputDir, { recursive: true });
   ```
5. **Build atlas PNG** using Sharp:
   ```typescript
   const compositeInputs = packed.map(sprite => ({
     input: path.join(inputDir, sprite.filename),
     left: sprite.x,
     top: sprite.y,
   }));

   const atlasBuffer = await sharp({
     create: {
       width: atlasWidth,
       height: atlasHeight,
       channels: 4,
       background: { r: 0, g: 0, b: 0, alpha: 0 },
     },
   })
     .composite(compositeInputs)
     .png()
     .toBuffer();
   ```
6. **Build atlas JSON** as a native JavaScript object (never string-concatenate filenames into JSON):
   ```typescript
   const frames: Record<string, object> = {};
   for (const sprite of packed) {
     frames[sprite.filename] = {
       frame: { x: sprite.x, y: sprite.y, w: sprite.width, h: sprite.height },
       rotated: false,
       trimmed: false,
       spriteSourceSize: { x: 0, y: 0, w: sprite.width, h: sprite.height },
       sourceSize: { w: sprite.width, h: sprite.height },
     };
   }

   const atlasJson = {
     frames,
     meta: {
       app: 'top-down-racer-asset-pipeline',
       version: '1.0',
       image: 'sprites.png',
       format: 'RGBA8888',
       size: { w: atlasWidth, h: atlasHeight },
       scale: 1,  // NUMBER, not string
     },
   };
   ```
7. **Atomic write** — write to temp files, then rename:
   ```typescript
   const pngPath = path.join(outputDir, 'sprites.png');
   const jsonPath = path.join(outputDir, 'sprites.json');
   const pngTmp = pngPath + '.tmp';
   const jsonTmp = jsonPath + '.tmp';

   fs.writeFileSync(pngTmp, atlasBuffer);
   fs.writeFileSync(jsonTmp, JSON.stringify(atlasJson, null, 2));
   fs.renameSync(pngTmp, pngPath);
   fs.renameSync(jsonTmp, jsonPath);
   ```
8. Print summary: `"Atlas built: ${packed.length} sprites → ${atlasWidth}x${atlasHeight} (${pngPath})"`

##### Function: `main`

```typescript
async function main(): Promise<void> {
  const inputDir = path.resolve('public/assets/sprites');
  const outputDir = path.resolve('public/assets/atlas');
  await buildAtlas(inputDir, outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

#### Tool 2: Asset Manifest Generator (`tools/generate-manifest.ts`)

**Purpose:** Scan `public/assets/` subdirectories and generate a fully typed TypeScript manifest at `src/assets/manifest.ts`.

##### Imports and Constants

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';

const VALID_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

/** Convert OS path to URL-safe forward-slash path */
function toUrl(p: string): string {
  return p.split(path.sep).join('/');
}
```

##### Category Configuration

Scan **only** these named subdirectories. Do NOT recursively scan `public/assets/` from root.

```typescript
const CATEGORIES = [
  { name: 'cars',     dir: 'sprites',  extensions: ['.png'] },
  { name: 'tracks',   dir: 'tracks',   extensions: ['.png'] },
  { name: 'textures', dir: 'textures', extensions: ['.png'] },
  { name: 'audio',    dir: 'audio',    extensions: ['.wav'] },
  { name: 'atlas',    dir: 'atlas',    extensions: ['.json'] },
] as const;
```

##### Function: `scanAssetDir`

```typescript
async function scanAssetDir(
  baseDir: string,
  subdir: string,
  extensions: readonly string[]
): Promise<{ key: string; path: string }[]>
```

1. `const fullDir = path.join(baseDir, subdir);`
2. Try `fs.readdirSync(fullDir)`. If `ENOENT`, return `[]`. Re-throw other errors.
3. Filter entries:
   - Must have an extension in `extensions`
   - `fs.lstatSync(path.join(fullDir, entry)).isFile()` — skip symlinks and directories
   - Filename stem must match `VALID_FILENAME` — skip and warn on invalid
4. For each valid file:
   - `key = path.parse(filename).name` (strip extension)
   - `urlPath = toUrl(path.join('assets', subdir, filename))` — relative to `public/`, forward slashes
5. **Sort entries alphabetically by key** for deterministic output.
6. Return sorted entries.

##### Function: `generateManifestSource`

```typescript
function generateManifestSource(
  categories: Record<string, { key: string; path: string }[]>
): string
```

Build the TypeScript source as a string. Key rules:
- Use single quotes for string values
- Keys use single quotes (for kebab-case keys like `'car-player-red'`)
- Include `as const` assertion
- Export `AssetManifest` type alias
- Do NOT export per-category type aliases (deferred to consuming phase)

**Output format:**

```typescript
/**
 * Typed asset manifest — auto-generated by tools/generate-manifest.ts
 * DO NOT EDIT MANUALLY. Run \`pnpm run manifest\` to regenerate.
 *
 * This is a pure data module. It MUST NOT import from src/engine/,
 * src/renderer/, or src/ai/. Downstream code imports from this module.
 */
export const ASSETS = {
  cars: {
    'car-player-red': 'assets/sprites/car-player-red.png',
    'car-player-blue': 'assets/sprites/car-player-blue.png',
  },
  tracks: {},
  textures: {},
  audio: {},
  atlas: {
    'sprites': 'assets/atlas/sprites.json',
  },
} as const;

export type AssetManifest = typeof ASSETS;
```

**Implementation detail:** Build the object structure in code, then serialize to TypeScript string. Do NOT concatenate user-controlled filenames into raw TypeScript strings — build the key-value pairs safely:

```typescript
function escapeKey(key: string): string {
  // Since we validate filenames against VALID_FILENAME (alphanumeric, dash, underscore),
  // no special characters are possible. Still, quote all keys for consistency.
  return `'${key}'`;
}
```

Generate each category block by iterating over sorted entries:

```typescript
function formatCategory(entries: { key: string; path: string }[]): string {
  if (entries.length === 0) return '{}';
  const lines = entries.map(e => `    ${escapeKey(e.key)}: '${e.path}',`);
  return `{\n${lines.join('\n')}\n  }`;
}
```

##### Function: `main`

```typescript
async function main(): Promise<void> {
  const publicDir = path.resolve('public/assets');
  const outputPath = path.resolve('src/assets/manifest.ts');

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Scan each category independently
  const results: Record<string, { key: string; path: string }[]> = {};
  for (const cat of CATEGORIES) {
    results[cat.name] = await scanAssetDir(publicDir, cat.dir, cat.extensions);
  }

  // Generate TypeScript source
  const source = generateManifestSource(results);

  // Atomic write: temp file then rename
  const tmpPath = outputPath + '.tmp';
  fs.writeFileSync(tmpPath, source, 'utf-8');
  fs.renameSync(tmpPath, outputPath);

  // Summary
  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Manifest generated: ${total} assets → ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

##### Manifest Deviation from ADR-02

The ADR-02 spec shows a nested manifest (`ASSETS.cars.player.red`). This implementation uses a flat structure (`ASSETS.cars['car-player-red']`). This is an intentional deviation — flat keys are the natural output of auto-generation from filenames. Phase 2 renderer code should reference assets using the flat key pattern.

---

#### Tests: `tests/tools/build-atlas.test.ts`

**Test isolation:** Every test creates a temp directory via `fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-test-'))` in `beforeEach` and cleans up with `fs.rmSync(tmpDir, { recursive: true, force: true })` in `afterEach`.

**Helper:** Create test PNGs using Sharp:

```typescript
async function createTestPng(dir: string, name: string, width: number, height: number): Promise<void> {
  const buffer = await sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
  }).png().toBuffer();
  fs.writeFileSync(path.join(dir, name), buffer);
}
```

##### Test 1: Pack two uniform sprites — happy path

1. Create `inputDir` and `outputDir` subdirectories in temp.
2. Create two 64×64 test PNGs.
3. Call `buildAtlas(inputDir, outputDir)`.
4. Assert `sprites.png` exists in output.
5. Assert `sprites.json` exists in output.
6. Read atlas PNG metadata with Sharp: verify dimensions are powers of 2 and >= 128×64.
7. Parse atlas JSON: verify `frames` has exactly 2 entries, `meta` exists.

##### Test 2: Pack mixed-size sprites — algorithm correctness

1. Create 4 PNGs with varying dimensions: 128×64, 64×128, 32×32, 96×48.
2. Call `buildAtlas(inputDir, outputDir)`.
3. Parse output JSON.
4. For each frame in `frames`:
   - `frame.w` and `frame.h` match the input sprite's actual dimensions
   - `sourceSize.w === frame.w` and `sourceSize.h === frame.h`
   - `frame.x >= 0 && frame.y >= 0`
   - `frame.x + frame.w <= meta.size.w` (within atlas bounds)
   - `frame.y + frame.h <= meta.size.h` (within atlas bounds)
5. Verify no two frames overlap (full 2D bounding box intersection check).

##### Test 3: Atlas JSON format correctness

1. Create one 64×64 PNG, build atlas.
2. Parse JSON. Verify structure:
   - `frames[filename]` has keys: `frame`, `rotated`, `trimmed`, `spriteSourceSize`, `sourceSize`
   - `meta` has keys: `app`, `version`, `image`, `format`, `size`, `scale`
   - `meta.scale` is `1` (number, not string)
   - `meta.image` is `'sprites.png'`
   - `meta.format` is `'RGBA8888'`
3. Verify frame values are correct (not all zeros).

##### Test 4: Empty directory — graceful handling

1. Create empty `inputDir`.
2. Call `buildAtlas(inputDir, outputDir)`.
3. Assert no `sprites.png` or `sprites.json` in output (function returns early, doesn't write empty atlas).
4. Assert no error thrown.

##### Test 5: Atlas dimensions are powers of 2

1. Create three 100×100 PNGs (non-power-of-2 inputs).
2. Build atlas.
3. Read output PNG metadata.
4. Assert both width and height are powers of 2: `(n & (n - 1)) === 0 && n > 0`.

##### Test 6: Oversized sprite throws

1. Mock or create a sprite entry with dimensions 4097×4097.
2. Call `packSprites([{ filename: 'huge.png', width: 4097, height: 4097 }])`.
3. Assert it throws with an error message containing "exceeds maximum".

##### Test 7: Overflow throws

1. Create enough sprite entries to exceed 4096×4096 (e.g., 64 sprites of 512×512 = need 16384×2048 or similar).
2. Call `packSprites(entries)`.
3. Assert it throws with an error message about not fitting.

**Total: 7 tests.**

---

#### Tests: `tests/tools/generate-manifest.test.ts`

**Test isolation:** Same pattern — `fs.mkdtempSync` in `beforeEach`, `fs.rmSync` in `afterEach`.

##### Test 1: Basic scan — happy path

1. Create temp directory structure: `sprites/car-player-red.png`, `sprites/car-ai-white.png`, `atlas/sprites.json`.
2. Run `scanAssetDir` for each.
3. Assert correct keys (`'car-player-red'`, `'car-ai-white'`) and paths (`'assets/sprites/car-player-red.png'`).
4. Assert paths use forward slashes (no backslashes).
5. Assert entries are sorted alphabetically by key.

##### Test 2: Generated TypeScript compiles

1. Create temp asset structure with a few test files.
2. Generate manifest source string.
3. Write to a temp `.ts` file.
4. Run `execSync('npx tsc --noEmit --strict <tempfile>')`.
5. Assert exit code 0 (compilation succeeds).
6. Assert the source contains `as const` and `export const ASSETS`.
7. Assert the source contains `export type AssetManifest`.

##### Test 3: Empty assets — valid TypeScript

1. Run manifest generation with no asset files present (empty/missing directories).
2. Assert output contains all category names with empty objects: `cars: {}`.
3. Write to temp file and run `tsc --noEmit --strict` — assert it compiles.

##### Test 4: Key derivation

1. Create files: `car-player-red.png`, `asphalt-dry.png`, `engine-idle.wav`.
2. Scan each category.
3. Assert keys are: `'car-player-red'`, `'asphalt-dry'`, `'engine-idle'` (extension stripped, kebab-case preserved).

##### Test 5: Path format — forward slashes, relative to public/

1. Scan a category with test files.
2. Assert all paths start with `'assets/'`.
3. Assert no path contains `\\`.
4. Assert no path contains a leading `/`.

##### Test 6: Invalid filename skipped

1. Create files including one with invalid characters (e.g., `bad file!.png`).
2. Run scan.
3. Assert the invalid file is not in results.
4. Assert valid files are still present.

**Total: 6 tests.**

---

#### Acceptance Criteria

- [ ] `tools/build-atlas.ts` packs multiple PNGs into a single atlas PNG + PixiJS-compatible JSON — `Satisfies: R-007`
- [ ] Atlas JSON follows TexturePacker format with correct `frames` structure and `meta` with `scale: 1` (number) — `Satisfies: R-007, R-012`
- [ ] Atlas PNG dimensions are powers of 2 — `Satisfies: R-007`
- [ ] Atlas packing is deterministic: same inputs always produce identical output (sorted by height then filename) — `Satisfies: R-007`
- [ ] Atlas writes are atomic (temp file + rename) — prevents orphaned/partial output
- [ ] Atlas builder handles `ENOENT` (missing directory) gracefully — returns early
- [ ] Atlas builder validates filenames against allowlist regex — rejects unsafe names
- [ ] Atlas builder validates Sharp metadata is non-undefined before use
- [ ] `tools/generate-manifest.ts` scans named subdirectories only (not recursive from root) — `Satisfies: R-002`
- [ ] Generated manifest uses `as const` assertion and exports `AssetManifest` type — `Satisfies: R-002`
- [ ] Generated manifest has zero magic strings — all paths derived from files on disk — `Satisfies: R-002`
- [ ] Generated manifest uses forward-slash paths on all platforms — `Satisfies: R-002`
- [ ] Generated manifest entries are sorted alphabetically for deterministic output — `Satisfies: R-002`
- [ ] Manifest write is atomic (temp file + rename) — safe with Vite HMR
- [ ] Manifest generator validates filenames against allowlist regex — `Satisfies: R-002`
- [ ] Manifest generator handles `ENOENT` (missing directories) gracefully
- [ ] Running `pnpm run manifest` overwrites `src/assets/manifest.ts` with fresh output — `Satisfies: R-002`
- [ ] Generated manifest compiles without TypeScript errors (`tsc --noEmit --strict`) — `Satisfies: R-002`
- [ ] `src/assets/manifest.ts` header documents it as a pure data module with no cross-boundary imports
- [ ] All 7 atlas builder tests pass — `Satisfies: R-005`
- [ ] All 6 manifest generator tests pass — `Satisfies: R-005`
- [ ] `pnpm test` passes with zero failures — `Satisfies: R-005`
- [ ] `package.json` has `build-assets` composite script enforcing process → atlas → manifest order
- [ ] `package.json` has `manifest:check` script for CI staleness detection

#### Dependencies

- **Depends on:** Plan 1 (directory structure, Sharp + tsx + vitest dependencies, package.json scripts). Tools self-heal missing directories.
- **Needed by:** Phase 2 (renderer consumes manifest and atlas)

#### Locked Decisions

- PixiJS-compatible TexturePacker JSON format for atlas (ADR-02, R-012)
- Typed manifest with `as const` — zero magic strings (ADR-02)
- Flat manifest keys (intentional deviation from ADR-02 nested example)
- Sharp for image processing (ADR-02, R-011)
- Manifest lives at `src/assets/manifest.ts` (ADR-02)
- Atlas output at `public/assets/atlas/` (spec)
- `src/assets/` is a pure data module — zero imports from engine/renderer/ai

---

## 4. Strike Team Notes

### Rejected Findings

| Finding | Agent | Reason for Rejection |
|---------|-------|---------------------|
| Over-engineering: collapse atlas builder to 2 functions | Agent 09 #1 | The function split into `loadSpriteMetadata`, `packSprites`, `buildAtlas` is justified by testability — tests #6 and #7 call `packSprites` directly without needing real PNG files. This is not over-engineering; it's test-driven design for a packing algorithm. |
| Over-engineering: drop per-category type aliases | Agent 09 #2 | ACCEPTED — only `AssetManifest` type alias is generated. Per-category aliases deferred to consuming phase. |
| Over-engineering: reduce to 3 tests per tool | Agent 09 #4 | Rejected. The additional tests (mixed-size sprites, error cases, compilation check) catch real bugs that the happy path wouldn't. The spec AC explicitly requires test coverage. 7+6 tests is not excessive for two tools with algorithmic logic. |
| Symlink following in asset scan | Agent 05 #3 | Partially accepted — using `lstatSync().isFile()` to skip non-files (including symlinks). Full symlink defense is overkill for a local build tool. |
| File descriptor limits under parallel tests | Agent 12 #4 | Noted but not actioned. With 7 tests and small test PNGs, this is not a risk. If flaky failures appear, add `describe.sequential()`. |
| Manifest categories are hardcoded to 5 types | Agent 08 #2 | Not actionable in this plan. When Phase 4 needs new categories, modifying the generator is trivial. Documented in the CATEGORIES array with a comment. |
| Over-engineering: both `cars` and `atlas` manifest entries | Agent 02 #3 | Noted. Both exist because they serve different purposes: `cars` maps individual sprites (useful for non-atlas loading during development), `atlas` maps the packed atlas JSON (production loading). Phase 2 decides which to use. |

### Resolved Conflicts

**Agent 08 #1 (leading slash) vs. existing convention:** Agent 08 recommended prefixing paths with `/` to match existing v02 code. However, the existing paths (`'/assets/model.onnx'`) are in frozen engine/AI files that won't consume this manifest. Vite serves `public/` as the site root, so `'assets/foo.png'` resolves correctly from any page. Leading slashes are fragile if the app is ever deployed to a subpath with a `base` config in Vite. Decision: **no leading slash** — more portable, and consumers of this manifest are all new Phase 2+ code.

**Agent 09 #1 (collapse functions) vs. Agent 06 #2,#3 (testability):** Agent 09 wanted fewer functions; Agent 06's tests require calling `packSprites` directly (without real PNGs). Testability wins — keeping the function split.

### Review Gaps

- **Agent 03 (The Profiler)** was not activated. No performance review was conducted. For build-time CLI tools processing <20 sprite files, this is not concerning. Sharp handles image composition efficiently. No performance optimization needed.

### Notes for Future Plans

- The `build-assets` composite script references `tools/process-assets.ts` from Plan 4. If Plan 4 names the script differently, update the composite script.
- Phase 2 should consume manifest paths via `import { ASSETS } from '@assets/manifest'` using the existing `@assets` path alias in tsconfig.json and vite.config.ts.
- The manifest's flat key structure means Phase 2 code references assets as `ASSETS.cars['car-player-red']`, not `ASSETS.cars.player.red`. Plan accordingly.