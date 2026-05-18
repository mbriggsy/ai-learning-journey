/**
 * Capture BURNED's HOW-TO-PLAY page as a full-page screenshot for the
 * Phase 0 spike (and, with a URL swap, Phase 3 Unit 3.1 production).
 *
 * Phase 0 Unit 0.5(d) integration point — Playwright must scroll-step
 * through the page so every `[data-reveal]` element resolves through
 * `useScrollReveal()`'s GSAP ScrollTrigger transition to `opacity: 1`
 * BEFORE the fullPage screenshot fires. UMB's `capture-htp-scroll.ts`
 * established the 200px-step-then-80ms-wait pattern; this script reuses
 * it against BURNED.
 *
 * Output path: `<burned-root>/public/trailer/htp-fullpage.png`. This is
 * BURNED's public dir (resolves via Remotion's `setPublicDir('../../public')`
 * + ADR #15's `trailer/` subdirectory). The Phase 0 plan §Files line
 * 2128 references `videos/trailer/public/htp-fullpage.png` — that path
 * is unreachable to `staticFile()` because Remotion ships exactly ONE
 * public dir at a time (ADR #15). Output location corrected here so
 * the spike render can actually find the asset; divergence documented
 * in `videos/trailer/sample-eval/spike/spike-results.md`.
 *
 * Phase 3 Unit 3.1 promotes this script to production by swapping
 * HTP_URL to the deploy URL once partykit → CF Workers migration
 * lands. The 200/80 cadence stays.
 *
 * Usage:
 *   1. Start Vite dev server in a separate terminal: `pnpm dev` from
 *      burned project root.
 *   2. From `videos/trailer/`: `pnpm capture:htp`.
 */
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'

const HTP_URL = 'http://localhost:5173/howtoplay.html'
const VIEWPORT = { width: 1920, height: 1080 } as const

// Resolve from script dir → up two levels → burned root → public/trailer.
// This survives any invocation cwd (matches the path-resolution discipline
// established in check-tts-readiness.ts per commit 4d6aac64).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = resolve(SCRIPT_DIR, '..', '..', '..', 'public', 'trailer', 'htp-fullpage.png')

async function preflight(): Promise<void> {
  try {
    const r = await fetch(HTP_URL, { method: 'HEAD' })
    if (!r.ok) {
      throw new Error(`HEAD ${HTP_URL} returned ${r.status}`)
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error(
      [
        'Preflight failed — BURNED Vite dev server is not running at',
        `  ${HTP_URL}`,
        '',
        'Open a separate terminal and run `pnpm dev` from the burned',
        `project root, then re-run this script. Detail: ${detail}`,
      ].join('\n'),
    )
    process.exit(2)
  }
}

async function main(): Promise<void> {
  await preflight()

  console.log('Launching headless Chromium...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: VIEWPORT })

  console.log(`Navigating to ${HTP_URL}...`)
  await page.goto(HTP_URL, { waitUntil: 'networkidle' })

  console.log('Waiting for hero / scroll-reveal mount...')
  await page.waitForTimeout(1500)

  const scrollHeight = Number(await page.evaluate(() => document.documentElement.scrollHeight))
  console.log(`Page scrollHeight = ${scrollHeight}px`)

  // Scroll-step loop — 200px increments, 80ms dwell, so every
  // useScrollReveal()-mounted [data-reveal] element passes the
  // `start: 'top 85%'` trigger and tweens to opacity 1.
  console.log('Scroll-stepping to fire every ScrollTrigger reveal...')
  const STEP_PX = 200
  const DWELL_MS = 80
  for (let y = 0; y < scrollHeight; y += STEP_PX) {
    await page.evaluate((py) => window.scrollTo(0, py), y)
    await page.waitForTimeout(DWELL_MS)
  }
  // Bottom flush
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(500)

  // Verify all reveal elements actually transitioned. This catches the
  // useScrollReveal-incompatible fail path the plan calls out at line
  // 2300 (synthesized-scroll-vs-real-ScrollTrigger compatibility).
  const unrevealed = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    return els
      .filter((el) => {
        const op = parseFloat(getComputedStyle(el).opacity)
        return Number.isFinite(op) && op < 0.95
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: el.className.toString().slice(0, 64),
        opacity: getComputedStyle(el).opacity,
      }))
  })
  if (unrevealed.length > 0) {
    console.warn(
      `[WARN] ${unrevealed.length} [data-reveal] element(s) did not reach opacity ≥ 0.95:`,
    )
    for (const u of unrevealed.slice(0, 8)) {
      console.warn(`  - <${u.tag}.${u.cls}> opacity=${u.opacity}`)
    }
  } else {
    console.log('All [data-reveal] elements at opacity ≥ 0.95 — ScrollTrigger compat OK')
  }

  // Reset to top for the capture (full-page screenshot doesn't need this
  // for correctness, but it makes the screenshot's top section look
  // identical to a first-load view).
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)

  console.log(`Capturing full-page screenshot → ${OUTPUT_FILE}`)
  await page.screenshot({ path: OUTPUT_FILE, fullPage: true, type: 'png' })

  const s = await stat(OUTPUT_FILE)
  console.log(
    `Saved: ${OUTPUT_FILE} (${(s.size / 1024 / 1024).toFixed(2)} MB, ${s.size.toLocaleString()} bytes)`,
  )
  console.log(
    `Phase 3 cascade-distance reference: ${scrollHeight - VIEWPORT.height}px (full scroll minus viewport)`,
  )

  await browser.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
