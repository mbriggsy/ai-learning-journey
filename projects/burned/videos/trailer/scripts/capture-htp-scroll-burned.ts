/**
 * Capture BURNED's HOW-TO-PLAY page as a full-page screenshot for the
 * trailer's Phase 4 Remotion composite (Phase 3 Unit 3.1).
 *
 * Plays headless Chromium against the deployed HTP route, scrolls
 * through to fire every `useScrollReveal()` ScrollTrigger threshold,
 * waits for ALL `[data-reveal]` elements to settle at opacity=1 +
 * identity-transform (positive-completion gate, NOT a timer), then
 * captures `public/trailer/htp-fullpage.png` at DPR=1 (Phase 6
 * Remotion render adds `--scale=2` for output-side crispness).
 *
 * **Production-gate upgrade from Phase 0 spike** (per Phase 3 Unit
 * 3.1 plan):
 *  - `HTP_URL` env-overridable; default = production Pages URL.
 *  - URL safety assert post-`page.goto` (SEC-P3-007 — silent redirect
 *    to a 404 / maintenance page would otherwise produce a wrong
 *    capture).
 *  - `waitForSelector('[data-reveal]')` replaces the spike's fixed
 *    1500ms timeout.
 *  - Reveal-count ≥8 assert (presence-companion to the opacity gate
 *    per insight #027 — an empty selector would otherwise pass
 *    `every()` vacuously).
 *  - Positive-completion gate via `page.waitForFunction` until ALL
 *    reveals at opacity=1 + transform=none|identity. Replaces the
 *    spike's WARN-but-proceed (insight #062 — default-fallback paths
 *    that produce structurally-valid-looking output mask the bug).
 *  - `ScrollTrigger.progress(1)` fallback ONLY when running against
 *    localhost OR with explicit `ALLOW_ST_FALLBACK=1`. Production
 *    captures fail loud rather than force-complete into a
 *    wrong-looking state.
 *  - `scrollHeight` re-read every 5 scroll steps — reveal animations
 *    expand layout as they trigger; the initial-scrollHeight loop
 *    bound would exit before the last DossierPage's
 *    `start: 'top 85%'` threshold fired.
 *
 * Path resolution uses `fileURLToPath(import.meta.url) + resolve(...)`
 * (cwd-independent — matches `audit-durations.ts`, Unit 2.8 codegen,
 * and Unit 3.0 vendor scripts per insight #057 spike-wins on
 * convention).
 *
 * Usage:
 *   # Default (production):
 *   pnpm capture:htp
 *
 *   # Localhost (requires `pnpm dev` in another terminal):
 *   HTP_URL=http://localhost:5173/howtoplay.html pnpm capture:htp
 *
 *   # Force-complete ScrollTrigger against production (escape hatch):
 *   ALLOW_ST_FALLBACK=1 pnpm capture:htp
 */
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'

const HTP_URL = process.env.HTP_URL ?? 'https://burned-cxa.pages.dev/howtoplay'
const ALLOW_ST_FALLBACK = process.env.ALLOW_ST_FALLBACK === '1'
const VIEWPORT = { width: 1920, height: 1080 } as const
const MIN_REVEAL_COUNT = 8 // 10 DossierPage acts each emit one [data-reveal]; allow slack for iteration

// Resolve from script dir → up two levels → burned root → public/trailer.
// Survives any invocation cwd (matches the path-resolution discipline
// established in check-tts-readiness.ts + audit-durations.ts + Unit 2.8
// codegen + Unit 3.0 vendor scripts).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const BURNED_ROOT = resolve(SCRIPT_DIR, '..', '..', '..')
const OUTPUT_FILE = resolve(BURNED_ROOT, 'public', 'trailer', 'htp-fullpage.png')

async function preflight(): Promise<void> {
  try {
    const r = await fetch(HTP_URL, { method: 'HEAD' })
    if (!r.ok) {
      throw new Error(`HEAD ${HTP_URL} returned ${r.status}`)
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    const isLocalhost = HTP_URL.includes('localhost') || HTP_URL.includes('127.0.0.1')
    console.error(
      [
        `Preflight failed — ${HTP_URL} unreachable.`,
        '',
        isLocalhost
          ? 'Open a separate terminal and run `pnpm dev` from the burned project root,'
          : 'Check production deploy status (Cloudflare Pages) — or override with',
        isLocalhost
          ? 'then re-run this script.'
          : 'HTP_URL=http://localhost:5173/howtoplay.html for a localhost capture.',
        '',
        `Detail: ${detail}`,
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

  // URL safety assert (SEC-P3-007) — catch silent redirect to 404 /
  // maintenance / wrong route.
  if (!page.url().includes('/howtoplay')) {
    console.error(`ERROR navigated to ${page.url()} — expected /howtoplay`)
    await browser.close()
    process.exit(1)
  }

  // Wait for reveal elements to attach + give gsap.set() the initial
  // state. Replaces the spike's fixed 1500ms.
  await page.waitForSelector('[data-reveal]', { state: 'attached', timeout: 10_000 })
  await page.waitForTimeout(500)

  // Presence-companion to the opacity gate (insight #027) — if the
  // selector finds nothing, `every()` returns true on the empty array
  // and the gate passes vacuously. Assert minimum count first.
  const revealCount = Number(
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').length),
  )
  if (revealCount < MIN_REVEAL_COUNT) {
    console.error(
      `ERROR found ${revealCount} [data-reveal] elements (expected ≥ ${MIN_REVEAL_COUNT}). ` +
        `Page likely wrong — HTP markup may have shifted.`,
    )
    await browser.close()
    process.exit(1)
  }
  console.log(`OK   ${revealCount} [data-reveal] elements present`)

  // Scroll-step loop. Re-reads scrollHeight every 5 steps because
  // reveal animations expand layout — capturing initialScrollHeight
  // once would exit the loop before the last DossierPage's
  // `start: 'top 85%'` threshold fired.
  console.log('Scroll-stepping to fire every ScrollTrigger reveal...')
  const STEP_PX = 200
  const DWELL_MS = 80
  let scrolled = 0
  let currentHeight = Number(
    await page.evaluate(() => document.documentElement.scrollHeight),
  )
  console.log(`  initial scrollHeight=${currentHeight}px`)
  while (scrolled < currentHeight + 500) {
    await page.evaluate((y) => window.scrollTo(0, y), scrolled)
    await page.waitForTimeout(DWELL_MS)
    scrolled += STEP_PX
    if (scrolled % (STEP_PX * 5) === 0) {
      currentHeight = Number(
        await page.evaluate(() => document.documentElement.scrollHeight),
      )
    }
  }
  // Flush to absolute bottom + a touch past, to guarantee final triggers fire.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight + 500))
  await page.waitForTimeout(500)

  // Positive-completion gate — wait until ALL `[data-reveal]` elements
  // reach opacity=1. Replaces the spike's WARN-but-proceed (insight
  // #062 — default-fallback paths mask bugs).
  //
  // **DELIBERATE: we check opacity ONLY, NOT transform.** Earlier
  // iteration also asserted `transform === 'none' || matrix(1, 0, 0,
  // 1, 0, 0)`, on the assumption that the reveal animation terminates
  // at identity matrix. That's wrong for BURNED HTP: `DossierPage`'s
  // `.paper` class sets `transform: rotate(-4deg)` (and per-`nth-child`
  // variants of similar tiny angles) AT REST, independent of the
  // useScrollReveal opacity tween. Including transform in the gate
  // produces a permanently-stuck false positive — opacity is at 1,
  // animation done, but matrix3d carries the deliberate CSS rotation.
  // Opacity is the load-bearing signal of reveal completion; the
  // presence-companion (count ≥ MIN_REVEAL_COUNT, asserted above)
  // handles the empty-selector vacuous case (insight #027).
  console.log('WAIT all [data-reveal] reach opacity=1...')
  try {
    await page.waitForFunction(
      (minCount) => {
        const reveals = document.querySelectorAll('[data-reveal]')
        if (reveals.length < minCount) return false
        return Array.from(reveals).every(
          (el) => getComputedStyle(el).opacity === '1',
        )
      },
      revealCount,
      { timeout: 20_000 },
    )
    console.log('  OK all reveals at opacity=1')
  } catch (err) {
    // FALLBACK: force-complete via ScrollTrigger. Gated on localhost
    // or explicit env var — production captures must fail loud rather
    // than silently force into a wrong-looking state.
    const isLocalhost = HTP_URL.includes('localhost') || HTP_URL.includes('127.0.0.1')
    const allowFallback = isLocalhost || ALLOW_ST_FALLBACK
    const exposed = await page.evaluate(
      () => typeof (window as unknown as { ScrollTrigger?: unknown }).ScrollTrigger !== 'undefined',
    )
    if (allowFallback && exposed) {
      console.warn('  WARN waitForFunction timeout; falling back to ScrollTrigger.progress(1)')
      console.warn(
        `  (allowed because URL is localhost OR ALLOW_ST_FALLBACK=1; isLocalhost=${isLocalhost})`,
      )
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).ScrollTrigger.getAll().forEach(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (st: any) => st.animation && st.animation.progress(1),
        )
      })
      await page.waitForTimeout(500)
    } else {
      console.error('  ERROR completion gate timed out.')
      console.error(`  URL=${HTP_URL} isLocalhost=${isLocalhost} ScrollTrigger exposed=${exposed}`)
      // Per-element diagnostic dump — surface WHICH reveals didn't
      // settle, so root cause is visible instead of just a TimeoutError.
      const stuck = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
        return els.map((el, i) => {
          const cs = getComputedStyle(el)
          const rect = el.getBoundingClientRect()
          return {
            i,
            tag: el.tagName.toLowerCase(),
            cls: el.className.toString().slice(0, 80),
            opacity: cs.opacity,
            transform: cs.transform,
            y: Math.round(rect.top + window.scrollY),
            visible: cs.opacity === '1' &&
              (cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
          }
        })
      })
      console.error('  Per-reveal state:')
      for (const r of stuck) {
        const flag = r.visible ? 'OK ' : 'STK'
        console.error(
          `    [${flag}] #${r.i} y=${r.y}px <${r.tag}.${r.cls}> opacity=${r.opacity} transform=${r.transform.slice(0, 40)}`,
        )
      }
      console.error('  To force-complete against production, set ALLOW_ST_FALLBACK=1 explicitly.')
      await browser.close()
      throw err
    }
  }

  // Reset to top for capture-starting position (cosmetic — fullPage
  // screenshot doesn't need this for correctness, but the resulting
  // PNG's top section reads identically to a first-load view).
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
  console.log(`Capturing full-page screenshot → ${OUTPUT_FILE}`)
  await page.screenshot({ path: OUTPUT_FILE, fullPage: true, type: 'png' })

  const finalHeight = Number(
    await page.evaluate(() => document.documentElement.scrollHeight),
  )
  const s = await stat(OUTPUT_FILE)
  console.log(
    `Saved: ${(s.size / 1024 / 1024).toFixed(2)} MB, ${s.size.toLocaleString()} bytes`,
  )
  console.log(
    `Dimensions: 1920 × ${finalHeight}px at DPR=1; ` +
      `Phase 4 Remotion translateY range: 0 → -${finalHeight - VIEWPORT.height}px`,
  )

  await browser.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
