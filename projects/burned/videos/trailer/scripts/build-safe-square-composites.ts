/**
 * Phase 3 Unit 3.7 Step 4 + 4b — safe-square + cross-family composite
 * proofs.
 *
 * Two passes, one script:
 *
 *   1. **Per-family safe-square composites** — each text-bearing asset
 *      family rendered inside a 1920×1080 frame with a 1080×1080 red-
 *      dashed center overlay. Briggsy verifies critical text lands
 *      INSIDE the central zone (mobile-crop survival per X 1:1 in-feed
 *      preview crop).
 *
 *   2. **Cross-family scene composites** — two Phase-4-approximation
 *      composites at intended scene scale, surfacing cross-family
 *      cohesion conflicts (light direction, ink texture, color temp)
 *      BEFORE Phase 4 commits to layout. Per plan §Step 4b + emil-
 *      design-eng cohesion rubric.
 *
 * **file:// origin gotcha** (verified Unit 3.6 + encoded in inventory):
 * `page.setContent()` makes the document URL `about:blank`, so file://
 * image refs (relative OR absolute) hit cross-origin and silently fail
 * with naturalWidth=0. Fix: write the composite HTML to a temp file
 * UNDER `BURNED_ROOT/public/trailer/`, navigate via `pathToFileURL`,
 * cleanup in `finally`. visual-manifest.test.ts canary catches temp-
 * file leaks.
 *
 * **waitForFunction signature** (verified Unit 3.6): `(fn, arg,
 * options)`. Pass `null` as `arg` so the timeout options land in the
 * third slot.
 *
 * Path resolution: `fileURLToPath(import.meta.url) + resolve(...)`
 * (cwd-independent, insight #057 convention).
 *
 * Outputs:
 *   videos/trailer/sample-eval/visual-asset-prep/safe-square-composites/
 *     ├── per-family-<slug>.png              (Step 4 — N files)
 *     ├── cross-family-s02-frame-300.png      (Step 4b)
 *     └── cross-family-s04-frame-1950.png     (Step 4b)
 *
 * Run from BURNED repo root:
 *   pnpm exec tsx videos/trailer/scripts/build-safe-square-composites.ts
 *   # or single-composite iteration:
 *   pnpm exec tsx videos/trailer/scripts/build-safe-square-composites.ts cross-family-s04-frame-1950
 */
import { chromium, type Page } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, relative } from 'node:path'
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TRAILER_ROOT = resolve(HERE, '..')
const BURNED_ROOT = resolve(TRAILER_ROOT, '../..')
const OUT_DIR = resolve(
  TRAILER_ROOT,
  'sample-eval/visual-asset-prep/safe-square-composites',
)

interface PerFamilyComposite {
  readonly kind: 'per-family'
  readonly name: string
  /** Asset paths relative to BURNED_ROOT (e.g., 'public/trailer/...'). */
  readonly assets: ReadonlyArray<string>
  /** Display dimensions of the asset wrap. */
  readonly width: number
  readonly height: number
  /** Optional CSS transform applied to the wrap (e.g., 'rotate(-8deg)'). */
  readonly wrapTransform?: string
  /** Optional background override (default cream paper). */
  readonly background?: string
}

interface CrossFamilyComposite {
  readonly kind: 'cross-family'
  readonly name: string
  /** Asset paths relative to BURNED_ROOT used in the scene. */
  readonly assets: ReadonlyArray<string>
  /** Renderer: takes a (assetAbsPath → file-url-relative-to-temp) map, returns inner HTML for the stage. */
  readonly innerHtml: (rel: (p: string) => string) => string
  /** Frame background (cross-family scenes usually need a specific BG). */
  readonly background: string
}

type Composite = PerFamilyComposite | CrossFamilyComposite

// ─── Per-family roster ────────────────────────────────────────
// Picked: every text-bearing or position-critical Path B asset.
// ticker-2 (1920×40 axis-aligned strip) is deliberately included so
// the safe-square overlay verifies the ticker's center-aligned text
// lands inside the central crop band.

const COMPOSITES: ReadonlyArray<Composite> = [
  // ── R15 chrome ──
  {
    kind: 'per-family',
    name: 'per-family-r15-stamp-1-pendleton',
    assets: [
      'public/trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg',
      'public/trailer/r15-chrome/stamp-1-operation-pendleton-text.svg',
    ],
    width: 720,
    height: 216,
    wrapTransform: 'rotate(-8deg)',
  },
  {
    kind: 'per-family',
    name: 'per-family-r15-ticker-2-method-repeatable',
    assets: [
      'public/trailer/r15-chrome/ticker-2-method-repeatable-frame.svg',
      'public/trailer/r15-chrome/ticker-2-method-repeatable-text.svg',
    ],
    width: 1600,
    height: 33,
  },
  {
    kind: 'per-family',
    name: 'per-family-r15-stamp-3-asset-delivered',
    assets: [
      'public/trailer/r15-chrome/stamp-3-asset-delivered-frame.svg',
      'public/trailer/r15-chrome/stamp-3-asset-delivered-text.svg',
    ],
    width: 960,
    height: 224,
    wrapTransform: 'rotate(-3deg)',
  },
  {
    kind: 'per-family',
    name: 'per-family-r15-subhead-4-field-ready',
    assets: [
      'public/trailer/r15-chrome/subhead-4-field-ready-frame.svg',
      'public/trailer/r15-chrome/subhead-4-field-ready-text.svg',
    ],
    width: 800,
    height: 60,
  },

  // ── Briefing-room ──
  {
    kind: 'per-family',
    name: 'per-family-briefing-folder-closed',
    assets: ['public/trailer/briefing-room/dossier-folder-closed.svg'],
    width: 540,
    height: 702,
  },
  {
    kind: 'per-family',
    name: 'per-family-briefing-folder-open',
    assets: ['public/trailer/briefing-room/dossier-folder-open.svg'],
    width: 540,
    height: 702,
  },
  {
    kind: 'per-family',
    name: 'per-family-briefing-depth-plane',
    assets: ['public/trailer/briefing-room/depth-plane.svg'],
    width: 540,
    height: 144,
    background: '#3a2a18', // mahogany — the depth-plane sits on the desk
  },

  // ── Title-sequence ──
  {
    kind: 'per-family',
    name: 'per-family-title-operative-card-frame',
    assets: ['public/trailer/title-sequence/operative-card-frame.svg'],
    width: 560,
    height: 700,
    background: '#1a1812', // charcoal — cold-open background
  },
  {
    kind: 'per-family',
    name: 'per-family-title-burned-logo',
    assets: ['public/trailer/title-sequence/burned-logo.svg'],
    width: 1000,
    height: 250,
  },

  // ── Cross-family scenes (Step 4b) ──
  {
    kind: 'cross-family',
    name: 'cross-family-s02-frame-300',
    background: '#1a1812',
    // Venetian-blinds INTENTIONALLY excluded from this composite per
    // 2026-05-22 Briggsy review — multiply blend over the cream
    // blotter + dossier read as flat horizontal stripes, not as
    // "sun-through-blinds" set-dressing. The SVG stays in the
    // manifest because Phase 4 may use it scoped differently (smaller
    // area, lighter opacity, or only over the dark mahogany margins
    // outside the blotter). Surface this as a Phase 4 decision in
    // PHASE-3-EXIT.md.
    assets: [
      'public/assets/arena/mahogany-horizontal.png',
      'public/assets/arena/blotter.png',
      'public/trailer/briefing-room/dossier-folder-closed.svg',
      'public/trailer/briefing-room/depth-plane.svg',
      'public/assets/howtoplay/pendleton-crest.png',
      'public/trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg',
      'public/trailer/r15-chrome/stamp-1-operation-pendleton-text.svg',
    ],
    innerHtml: (rel) => `
      <!-- BG: mahogany desk, full-bleed -->
      <img src="${rel('public/assets/arena/mahogany-horizontal.png')}"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />

      <!-- Blotter — the cream paper surface the dossier + stamp land ON.
           Without this Phase 4 anchor, the ochre stamp dies on warm-brown
           mahogany. -->
      <img src="${rel('public/assets/arena/blotter.png')}"
           style="position:absolute;left:140px;top:100px;width:1640px;height:880px;
                  object-fit:cover;
                  filter:drop-shadow(0 24px 40px rgba(0,0,0,0.45));" />

      <!-- R15 #1 classification stamp ON the blotter, upper-left, -8° -->
      <div style="position:absolute;left:260px;top:240px;width:560px;height:168px;
                  transform-origin:center;transform:rotate(-8deg);opacity:0.94;">
        <img src="${rel('public/trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg')}"
             style="position:absolute;inset:0;width:100%;height:100%" />
        <img src="${rel('public/trailer/r15-chrome/stamp-1-operation-pendleton-text.svg')}"
             style="position:absolute;inset:0;width:100%;height:100%" />
      </div>

      <!-- Hero: dossier-folder-closed centered on the blotter, slight tilt -->
      <img src="${rel('public/trailer/briefing-room/dossier-folder-closed.svg')}"
           style="position:absolute;left:780px;top:160px;width:520px;height:676px;
                  transform-origin:center;transform:rotate(-1.2deg);
                  filter:drop-shadow(0 22px 32px rgba(15,8,4,0.62));" />

      <!-- Depth-plane brass nameplate lower-right ON the mahogany desk -->
      <div style="position:absolute;left:1380px;top:870px;width:480px;height:128px;
                  transform-origin:center;transform:rotate(-0.6deg);
                  filter:drop-shadow(0 10px 18px rgba(0,0,0,0.62));">
        <img src="${rel('public/trailer/briefing-room/depth-plane.svg')}"
             style="position:absolute;inset:0;width:100%;height:100%" />
      </div>

      <!-- Pendleton crest watermark upper-right corner -->
      <img src="${rel('public/assets/howtoplay/pendleton-crest.png')}"
           style="position:absolute;right:88px;top:64px;width:160px;height:auto;opacity:0.68;" />

      <!-- Subtle vignette to pull eye toward the dossier center -->
      <div style="position:absolute;inset:0;pointer-events:none;
                  background:radial-gradient(ellipse 70% 60% at 50% 48%,
                    rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%);"></div>
    `,
  },
  {
    kind: 'cross-family',
    name: 'cross-family-s04-frame-1950',
    background: '#1a1812',
    assets: [
      'public/trailer/htp-fullpage.png',
      'public/assets/cards/dash-barlowe.webp',
      'public/assets/cards/vera-khan.webp',
      'public/assets/cards/sable-ashworth.webp',
      'public/assets/cards/janet-broadside.webp',
      'public/assets/cards/neal-proctor.webp',
      'public/assets/cards/agent-x.webp',
      'public/trailer/r15-chrome/stamp-3-asset-delivered-frame.svg',
      'public/trailer/r15-chrome/stamp-3-asset-delivered-text.svg',
    ],
    innerHtml: (rel) => {
      // Cascade halo column geometry — sourced from cascade-halo-column.json.
      // Keeping inline here lets the script run without ES-module JSON-import
      // headaches in TSX. Geometry stays in sync via Phase 1 lock.
      const haloCards = [
        { file: 'dash-barlowe.webp',    yCenter: 192 },
        { file: 'vera-khan.webp',       yCenter: 367 },
        { file: 'sable-ashworth.webp',  yCenter: 542 },
        { file: 'janet-broadside.webp', yCenter: 717 },
        { file: 'neal-proctor.webp',    yCenter: 892 },
        { file: 'agent-x.webp',         yCenter: 928 },
      ]
      const HALO_CARD_W = 240
      const HALO_CARD_H = 145
      const HALO_X_CENTER = 1720

      const halo = haloCards
        .map(({ file, yCenter }) => {
          const left = HALO_X_CENTER - HALO_CARD_W / 2
          const top = yCenter - HALO_CARD_H / 2
          return `<img src="${rel(`public/assets/cards/${file}`)}"
                       style="position:absolute;left:${left}px;top:${top}px;
                              width:${HALO_CARD_W}px;height:${HALO_CARD_H}px;
                              object-fit:cover;opacity:0.40;
                              border:1px solid rgba(190,46,39,0.35);" />`
        })
        .join('\n')

      // 4 decayed stat captions (left side-band) — NOT Phase 3 assets,
      // just placeholders for Phase 4 React text. Approximates the
      // "captions decay to 30% as stamp lands" Phase 1 beat.
      const captions = [
        'OPERATIONAL PLANNING',
        'OPERATIVE  —  NAME REDACTED',
        'BURNED PROTOCOL ACTIVE',
        'CASE 02 · MAYFAIR — COMPLETE',
      ]
      const captionHtml = captions
        .map(
          (text, i) => `
            <div style="position:absolute;left:80px;top:${220 + i * 96}px;
                        opacity:0.30;font-family:'JetBrains Mono','IBM Plex Mono',monospace;
                        font-size:18px;letter-spacing:0.18em;color:#f6ebce;
                        padding:6px 14px;background:rgba(26,24,18,0.42);
                        border-left:2px solid rgba(190,46,39,0.55);">
              // ${text}
            </div>`,
        )
        .join('\n')

      return `
        <!-- HTP fullpage hero deep-scroll position, reduced to 32% so the
             payoff stamp dominates (it's the trailer's R3 truth-collision
             beat, NOT a "scroll snapshot with stamp overlay") -->
        <img src="${rel('public/trailer/htp-fullpage.png')}"
             style="position:absolute;left:0;top:-7800px;width:100%;height:auto;opacity:0.32;" />

        <!-- Vignette behind the stamp position — Phase 4 will likely
             apply a radial mask here so the stamp lands on visible dark
             ground, not on cream HTP page chrome. -->
        <div style="position:absolute;inset:0;pointer-events:none;
                    background:radial-gradient(ellipse 38% 32% at 50% 48%,
                      rgba(26,24,18,0.78) 0%, rgba(26,24,18,0.48) 55%, rgba(26,24,18,0) 100%);"></div>

        ${captionHtml}

        ${halo}

        <!-- R15 #3 PAYOFF stamp dead-center, -3° rotation, full weight.
             Drop-shadow gives it a hand-stamped depth on the darkened
             vignette beneath. -->
        <div style="position:absolute;left:480px;top:400px;width:960px;height:224px;
                    transform-origin:center;transform:rotate(-3deg);
                    filter:drop-shadow(0 14px 26px rgba(0,0,0,0.62))
                           drop-shadow(0 2px 6px rgba(190,46,39,0.32));">
          <img src="${rel('public/trailer/r15-chrome/stamp-3-asset-delivered-frame.svg')}"
               style="position:absolute;inset:0;width:100%;height:100%" />
          <img src="${rel('public/trailer/r15-chrome/stamp-3-asset-delivered-text.svg')}"
               style="position:absolute;inset:0;width:100%;height:100%" />
        </div>
      `
    },
  },
] as const

function fileUrlRelTo(tempHtmlAbs: string, assetAbs: string): string {
  return relative(dirname(tempHtmlAbs), assetAbs).replace(/\\/g, '/')
}

async function captureComposite(
  page: Page,
  comp: Composite,
  tempHtmlAbs: string,
): Promise<void> {
  // Preflight: assert every source asset exists before composing —
  // silent blank images would invalidate the cohesion review.
  for (const a of comp.assets) {
    const abs = resolve(BURNED_ROOT, a)
    if (!existsSync(abs)) {
      throw new Error(`[${comp.name}] missing input: ${abs}`)
    }
  }

  const rel = (p: string): string => fileUrlRelTo(tempHtmlAbs, resolve(BURNED_ROOT, p))

  let stageHtml: string
  if (comp.kind === 'per-family') {
    const stack = comp.assets
      .map(
        (a) => `<img src="${rel(a)}" style="position:absolute;inset:0;width:100%;height:100%" />`,
      )
      .join('')
    const wrapTransformPart = comp.wrapTransform ? ` ${comp.wrapTransform}` : ''
    stageHtml = `
      <div class="safe-square"></div>
      <div class="asset-wrap" style="width:${comp.width}px;height:${comp.height}px;
                                     transform:translate(-50%, -50%)${wrapTransformPart};">
        ${stack}
      </div>
    `
  } else {
    stageHtml = `
      <div class="safe-square" style="opacity:0.5"></div>
      ${comp.innerHtml(rel)}
    `
  }

  const bg = comp.background ?? '#f6ebce'

  writeFileSync(
    tempHtmlAbs,
    `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  html, body { margin: 0; background: ${bg}; height: 100vh;
               font-family: 'Clash Display', 'JetBrains Mono', system-ui, sans-serif; }
  .frame { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
  .safe-square {
    position: absolute; left: 420px; top: 0; width: 1080px; height: 1080px;
    border: 2px dashed rgba(190, 46, 39, 0.95); box-sizing: border-box;
    pointer-events: none; z-index: 999;
  }
  .asset-wrap { position: absolute; left: 50%; top: 50%; }
</style></head><body>
  <div class="frame">
    ${stageHtml}
  </div>
</body></html>`,
  )

  await page.goto(pathToFileURL(tempHtmlAbs).href, { waitUntil: 'load' })

  const expectedImgs = comp.assets.length + (comp.kind === 'per-family' ? 0 : 0)
  try {
    await page.waitForFunction(
      (expected: number) => {
        const imgs = Array.from(document.querySelectorAll('img'))
        // Tolerate the per-family stack having multiple imgs from the
        // same source (frame + text). All must complete with non-zero
        // natural width.
        return (
          imgs.length >= expected && imgs.every((img) => img.complete && img.naturalWidth > 0)
        )
      },
      expectedImgs,
      { timeout: 15_000 },
    )
  } catch (e) {
    const state = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.src.length > 100 ? img.src.slice(-100) : img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      })),
    )
    console.error(`[${comp.name}] image-load timeout; state:`, JSON.stringify(state, null, 2))
    throw e
  }

  const outPath = resolve(OUT_DIR, `${comp.name}.png`)
  await page.screenshot({ path: outPath, fullPage: false, clip: { x: 0, y: 0, width: 1920, height: 1080 } })
  console.log(`[composite] OK → ${outPath}`)
}

async function main(): Promise<void> {
  const argFilter = process.argv[2]
  const toRender = argFilter
    ? COMPOSITES.filter((c) => c.name === argFilter)
    : COMPOSITES
  if (toRender.length === 0) {
    console.error(
      `[composite] no composite matches "${argFilter}". Known names:\n  ` +
        COMPOSITES.map((c) => c.name).join('\n  '),
    )
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  // Temp HTML lives under public/trailer/ so file:// asset references
  // resolve same-origin. visual-manifest.test.ts canary asserts the
  // temp file is absent after the run (catches leaks if this script
  // crashes between writeFile and unlink).
  const TEMP_HTML = resolve(BURNED_ROOT, 'public/trailer/__safe-square-temp.html')

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    for (const comp of toRender) {
      await captureComposite(page, comp, TEMP_HTML)
    }
  } finally {
    await browser.close()
    try {
      if (existsSync(TEMP_HTML)) unlinkSync(TEMP_HTML)
    } catch {
      /* best-effort cleanup */
    }
  }
  console.log(`[composite] DONE — ${toRender.length} composite(s) at ${OUT_DIR}`)
}

main().catch((err: unknown) => {
  console.error('[composite] FAILED:', err)
  process.exit(1)
})
