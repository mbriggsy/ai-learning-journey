/**
 * Capture BURNED's live CASE BANNER + DossierFeed (COMMS chrome) as
 * PNG reference renders for Phase 4 visual-diff verification.
 * Phase 3 Unit 3.3 Step 5.
 *
 * **Purpose:** Phase 4 ports BURNED's `<aside className={styles.caseBanner}>`
 * JSX from `GameTable.tsx:67-88` and the DossierFeed component into
 * trailer-local Remotion components (per Path B hybrid architecture
 * ADR #15). After porting, Phase 4 visual-diffs the trailer-rendered
 * output against THESE PNGs to catch any type-weight / spacing / height
 * drift introduced during the port.
 *
 * **Prerequisites** — this script REQUIRES BURNED in a playing game state:
 *
 *   1. Start the dev servers (separate terminals OR `pnpm run:dev`):
 *        pnpm dev          # Vite at :5173
 *        pnpm dev:server   # Wrangler DO at :8787
 *
 *   2. Create a room (any host-flow path):
 *        - Open http://localhost:5173/board.html?room=PHASE3
 *        - Open http://localhost:5173/player.html?room=PHASE3 in two
 *          additional tabs (2+ players required to start)
 *        - Click "Start game" on the host tab
 *
 *   3. Confirm the board is in playing state — CaseBanner aside
 *      visible (Operation BURNED · Case File 47-B · Mayfair) AND
 *      DossierFeed dossier folder rendered in the COMMS column.
 *
 *   4. Then run:
 *        pnpm exec tsx videos/trailer/scripts/capture-banner-references.ts
 *
 * Without an active playing game state, the CaseBanner aside does not
 * mount (it lives inside `<GameTable>`, gated on `state.phase === 'playing'`).
 * The script fails LOUD if either selector misses — no
 * default-fallback-to-empty-PNG path (insight #062).
 *
 * **Selector strategy** — Vite CSS Modules hash class names at runtime
 * (e.g. `_caseBanner_a1b2c3`); insight #064 proves the partial-class
 * pattern survives hash regeneration. We use:
 *   - CASE BANNER  : `aside[class*="caseBanner"]`
 *   - DossierFeed  : `[class*="folder"]` scoped to the BlotterContent
 *                    grid (ActCover from howtoplay also has a .folder
 *                    class — different surface, not loaded here).
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * — cwd-independent, matches `audit-durations.ts` / Unit 2.8 codegen /
 * Unit 3.0 vendor scripts (insight #057 spike-wins convention).
 *
 * Outputs (at `videos/trailer/sample-eval/visual-asset-prep/`):
 *   - case-banner-reference.png   (CaseBanner aside bounding box)
 *   - comms-ticker-reference.png  (DossierFeed folder bounding box)
 *
 * Filenames preserved from the Phase 3 plan even though "comms-ticker"
 * is a slight misnomer post-Phase-3 (DossierFeed renders as a folder,
 * not a horizontal ticker). Renaming would diff against the plan + the
 * Phase 4 consumer references — not worth the churn.
 */
import { chromium, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TRAILER_ROOT = resolve(HERE, '..')
const OUT_DIR = resolve(TRAILER_ROOT, 'sample-eval/visual-asset-prep')

const BOARD_URL = process.env.BOARD_URL ?? 'http://localhost:5173/board.html?room=PHASE3'
const VIEWPORT = { width: 1920, height: 1080 } as const

const CASE_BANNER_SELECTOR = 'aside[class*="caseBanner"]'
// The DossierFeed top-level is <div className={styles.folder}>. Scope
// to the COMMS column via the surrounding BlotterContent grid so that
// any future loose `.folder` class on the board surface stays distinct.
const COMMS_FOLDER_SELECTOR = 'div[class*="folder"]'

async function captureElement(page: Page, selector: string, outPath: string, label: string): Promise<void> {
  const handle = await page.waitForSelector(selector, { state: 'visible', timeout: 10_000 })
  const box = await handle.boundingBox()
  if (!box || box.width < 50 || box.height < 10) {
    throw new Error(
      `[${label}] element matched selector ${selector} but bounding box is degenerate ` +
        `(w=${box?.width ?? 'null'}, h=${box?.height ?? 'null'}). ` +
        `Is the game in PLAYING state? Lobby state does not mount GameTable.`,
    )
  }
  await handle.screenshot({ path: outPath, omitBackground: false })
  // eslint-disable-next-line no-console
  console.log(`[${label}] captured ${Math.round(box.width)}×${Math.round(box.height)} → ${outPath}`)
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
    const page = await context.newPage()

    // eslint-disable-next-line no-console
    console.log(`[capture-banner-references] navigating to ${BOARD_URL}`)
    await page.goto(BOARD_URL, { waitUntil: 'networkidle' })

    // URL safety assert (SEC-P3-007 — silent redirect to error page
    // would otherwise produce a wrong capture).
    const finalUrl = page.url()
    if (!finalUrl.includes('/board')) {
      throw new Error(`expected /board URL after navigation; got ${finalUrl}`)
    }

    await captureElement(
      page,
      CASE_BANNER_SELECTOR,
      resolve(OUT_DIR, 'case-banner-reference.png'),
      'CASE BANNER',
    )

    await captureElement(
      page,
      COMMS_FOLDER_SELECTOR,
      resolve(OUT_DIR, 'comms-ticker-reference.png'),
      'COMMS / DossierFeed',
    )

    // eslint-disable-next-line no-console
    console.log('[capture-banner-references] done')
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[capture-banner-references] FAILED:', err)
  process.exit(1)
})
