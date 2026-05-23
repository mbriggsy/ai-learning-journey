/**
 * Generate operative-card-composite-proof.png — static-HTML composite
 * verifying the operative-card-frame.svg template composites readably
 * with an actual card portrait at cold-open canvas ratio (frame fills
 * ~1/3 of 1920×1080 → ~640×800 card region).
 * Phase 3 Unit 3.6 Step 5.
 *
 * **Why this proof exists:** Briggsy reviews to verify name-plate text
 * is READABLE at the cold-open canvas ratio. 1/3-canvas size means the
 * 58px Clash Display name overlay renders ~19px at full trailer
 * display. If the readability fails, Phase 4 elevates cold-open card
 * scale OR widens the frame.
 *
 * **DOC-REVIEW fix (design F05 + feasibility f6 + adversarial F4):**
 * Pre-deepening starter used `page.setContent()` with relative
 * `<img src="../../../public/...">` paths — `setContent` makes the
 * page URL `about:blank`, so relative paths silently 404 and the
 * captured PNG shows broken-image placeholders. Fix: convert asset
 * paths to `file://` absolute URLs via `pathToFileURL`. Asset-exists
 * preflight asserts before composite to guard the "silent blank PNG"
 * failure mode.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * — cwd-independent, matches the Phase 2 / Unit 3.0 vendor scripts
 * convention (insight #057 spike-wins).
 *
 * Outputs:
 *   videos/trailer/sample-eval/visual-asset-prep/operative-card-composite-proof.png
 *
 * Run from BURNED repo root:
 *   pnpm exec tsx videos/trailer/scripts/build-operative-card-composite-proof.ts
 *   # or:
 *   pnpm composite:operative-card
 */
import { chromium } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, relative } from 'node:path'
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TRAILER_ROOT = resolve(HERE, '..')
const BURNED_ROOT = resolve(TRAILER_ROOT, '../..')
const OUT_DIR = resolve(TRAILER_ROOT, 'sample-eval/visual-asset-prep')
const OUT_PATH = resolve(OUT_DIR, 'operative-card-composite-proof.png')

function fileUrl(relFromBurnedRoot: string): string {
  return pathToFileURL(resolve(BURNED_ROOT, relFromBurnedRoot)).href
}

async function main(): Promise<void> {
  // Preflight: assert source assets exist (insight #062 — default-
  // fallback paths producing structurally-valid-looking output mask
  // the bug).
  const frameSvgRel = 'public/trailer/title-sequence/operative-card-frame.svg'
  const portraitRel = 'public/assets/cards/dash-barlowe.webp'
  for (const [label, rel] of [['frame.svg', frameSvgRel], ['portrait.webp', portraitRel]] as const) {
    const abs = resolve(BURNED_ROOT, rel)
    if (!existsSync(abs)) {
      console.error(`[composite-proof] missing ${label}: ${abs}`)
      process.exit(1)
    }
  }

  mkdirSync(OUT_DIR, { recursive: true })

  // Write the composite HTML to a temp file co-located with the assets'
  // ROOT. Why not setContent + file:// URLs? Headless Chromium treats
  // setContent's origin as about:blank, which blocks cross-origin
  // file:// loads — images "complete" but with naturalWidth=0 (the
  // exact failure mode the doc-review fix above tried to guard against
  // but didn't fully — relative paths AND absolute file:// URLs both
  // hit the same about:blank cross-origin block; only same-origin
  // file:// navigation works).
  //
  // Solution: write the HTML to disk under BURNED_ROOT so file://
  // relative paths land in the same origin. Cleaned up in finally.
  const TEMP_HTML = resolve(BURNED_ROOT, 'public/trailer/__composite-proof-temp.html')
  const frameRelFromTemp = relative(dirname(TEMP_HTML), resolve(BURNED_ROOT, frameSvgRel)).replace(/\\/g, '/')
  const portraitRelFromTemp = relative(dirname(TEMP_HTML), resolve(BURNED_ROOT, portraitRel)).replace(/\\/g, '/')

  writeFileSync(
    TEMP_HTML,
    `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  html, body { margin: 0; background: #1a1812; height: 100vh; font-family: 'Clash Display', 'Clash Display Fallback', system-ui, sans-serif; }
  .stage { width: 1920px; height: 1080px; position: relative; }
  .card { position: absolute; left: 640px; top: 140px; width: 640px; height: 800px; }
  .frame, .portrait { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .portrait { padding: 80px 80px 144px; object-fit: cover; box-sizing: border-box; }
  .name {
    position: absolute; left: 32px; right: 32px; bottom: 32px; height: 96px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 58px; color: #f6ebce; letter-spacing: -1px;
    text-shadow: 0 2px 0 rgba(21, 7, 10, 0.32);
  }
</style></head><body>
  <div class="stage">
    <div class="card">
      <img class="frame" src="${frameRelFromTemp}" />
      <img class="portrait" src="${portraitRelFromTemp}" />
      <div class="name">DASH BARLOWE</div>
    </div>
  </div>
</body></html>`,
  )

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    await page.goto(pathToFileURL(TEMP_HTML).href, { waitUntil: 'load' })

    // Wait for BOTH images to load — replaces wall-clock sleep that
    // would produce unverified captures.
    // Playwright signature: waitForFunction(fn, arg, options). Pass
    // `null` as arg so the options-bag lands in the third slot.
    try {
      await page.waitForFunction(
        () => {
          const imgs = Array.from(document.querySelectorAll('img'))
          return imgs.length === 2 && imgs.every((img) => img.complete && img.naturalWidth > 0)
        },
        null,
        { timeout: 10_000 },
      )
    } catch (e) {
      const state = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map((img) => ({
          src: img.src.length > 80 ? img.src.slice(0, 80) + '...' : img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        }))
      })
      console.error('[composite-proof] image-load timeout; state:', JSON.stringify(state, null, 2))
      throw e
    }

    await page.screenshot({ path: OUT_PATH, fullPage: false })

    // eslint-disable-next-line no-console
    console.log(`[composite-proof] OK → ${OUT_PATH}`)
  } finally {
    await browser.close()
    // Clean up the temp HTML file so it doesn't leak into the
    // BURNED public/ tree. Wrap in try so cleanup failures don't
    // mask the real error.
    try {
      if (existsSync(TEMP_HTML)) unlinkSync(TEMP_HTML)
    } catch {
      /* best-effort cleanup */
    }
  }
}

main().catch((err: unknown) => {
  console.error('[composite-proof] FAILED:', err)
  process.exit(1)
})
