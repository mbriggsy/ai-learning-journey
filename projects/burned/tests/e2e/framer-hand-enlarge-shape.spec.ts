/**
 * Framer hand→enlarge cinematic — visual-coordination runtime gate.
 *
 * --- The class of bug this exists to catch ---
 *
 * The hand→enlarge cinematic ships a `filter: blur(4px → 0 → 4px)` mask
 * deliberately layered on top of `transform: scale(0.35 → 1 → 0.35)`. The
 * blur isn't decorative — it's a structural fix. MinimalCard uses
 * container-query layout thresholds whose breakpoints land MID-scale, so
 * without the blur the user sees two layouts fighting each other in the
 * middle of the transition (header/footer/illustration jumping at threshold
 * crossings).
 *
 * Insights 015 and 016 in `docs/insights/` are the recorded production bugs
 * in this same surface area: Framer transforms compose poorly with `:active`
 * scaling, and CSS animations override `:active` transforms unless a
 * `transform-origin: center` chain is held. The blur-mask on this enlarge
 * is the kind of structural fix that's easy to remove "for performance"
 * during a future refactor — silently breaking the layout-rejig coverage.
 *
 * --- What this harness does ---
 *
 * Drives a real game to playing phase, single-taps a card on a phone view,
 * installs a `requestAnimationFrame` sampler on the portalled enlarge
 * backdrop + card elements, and reads three properties per frame:
 *   - backdrop opacity (Framer 0 → 1 → 0)
 *   - card scale       (parsed from computed transform matrix)
 *   - card blur        (parsed from computed filter)
 *
 * Asserts both SHAPE (time-to-peak, peak-sustained at scale ≥ 0.99) and
 * the CO-ORDINATION INVARIANT: while scale is in mid-transition (0.4–0.95),
 * blur must be substantially > 0. A regression that removes / shortens /
 * decouples the blur reads "two layouts fighting" to the eye but is
 * silent in the engine — exactly the bug class drama-beat-timing was
 * built to surface in a different cinematic surface.
 *
 * The fault-injection test at the bottom paints a scale arc with NO
 * coordinated blur and proves the canary catches it. If that test ever
 * passes the healthy bounds, the gate has gone numb.
 *
 * --- Why this lives in tests/e2e/ ---
 *
 * Same reasoning as drama-beat-timing.spec.ts: the bug class is browser-
 * rendering-pipeline-dependent. Computed-style sampling against a real
 * compositor in real Chrome via Playwright is the only environment where
 * the symptom manifests; jsdom doesn't run Framer animations against a
 * real layout engine.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

interface FrameSample {
  /** ms since `performance.timeOrigin`. */
  t: number
  /** Backdrop opacity. 0 when backdrop element absent from DOM. */
  backdropOpacity: number
  /** Card scale, extracted from `matrix(a, b, c, d, ...)`. NaN when absent. */
  cardScale: number
  /** Card blur in px, parsed from `filter: blur(Xpx)`. NaN when absent. */
  cardBlurPx: number
}

interface EnlargeShape {
  /** Time from first sampled DOM-presence to peak (scale ≥ 0.99). */
  timeToPeakMs: number
  /** Time from peak start to last frame at peak. */
  peakSustainedMs: number
  /** Peak frame count. Sanity-floor against an empty-trace pass. */
  peakFrames: number
  /** Number of mid-transition frames where scale ∈ [0.4, 0.95]. */
  midTransitionFrames: number
  /** Min blur observed on those mid-transition frames. */
  midTransitionMinBlurPx: number
  /** Median blur on mid-transition frames. */
  midTransitionMedianBlurPx: number
}

// --- Tolerances ---------------------------------------------------------------
//
// Spring physics (snappy: stiffness 300, damping 24) settle in ~400-700ms
// depending on travel. Allowing 800ms covers slow-CI jitter while still
// failing on a regression that delays the cinematic by a meaningful margin.
const TIME_TO_PEAK_MAX_MS = 800

// At least this many frames at scale ≥ 0.99 — proves the user actually
// perceives content "fully open." A clip-to-instant-collapse would have 0.
const PEAK_FRAMES_FLOOR = 6

// Co-ordination invariant: while the card is mid-scale (in the band where
// container-query thresholds rejig), blur must be present.
//   - Mid-band: scale ∈ [0.4, 0.95]
//   - At-least-half of mid-band frames must show blur ≥ 0.5px (median floor)
//   - Min blur in the mid-band can dip to 0.1px on a single frame at a
//     threshold crossing without failing — the per-frame floor is loose,
//     the median floor is tight.
const MID_BAND_BLUR_MIN_PX_PER_FRAME = 0.1
const MID_BAND_BLUR_MEDIAN_MIN_PX    = 0.5

// --- Sampler ------------------------------------------------------------------

/**
 * Install a per-rAF sampler on the page. Polls document.body each frame
 * for the portalled enlarge backdrop + card; records opacity, scale, blur.
 * When the elements aren't in the DOM yet, opacity is 0 and scale/blur are
 * NaN — which lets `deriveEnlargeShape` find the activation moment cleanly.
 *
 * `__enlargeTrace` and `__stopEnlargeTrace` install on window.
 */
async function installEnlargeSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__enlargeTrace = [] as Array<{ t: number; backdropOpacity: number; cardScale: number; cardBlurPx: number }>
    const trace = w.__enlargeTrace as Array<{ t: number; backdropOpacity: number; cardScale: number; cardBlurPx: number }>

    // Match by class-substring: CSS-modules append a hash but preserve the
    // original token (`enlargeBackdrop`, `enlargeCard`). Both portal to body.
    const findBackdrop = (): HTMLElement | null =>
      document.querySelector('[class*="enlargeBackdrop"]') as HTMLElement | null
    const findCard = (): HTMLElement | null =>
      document.querySelector('[class*="enlargeCard"]') as HTMLElement | null

    const parseScale = (transform: string): number => {
      // matrix(a, b, c, d, tx, ty) — uniform scale ⇒ a === d. Pull `a`.
      // matrix3d(...) — first row col-1: index 0.
      const m2d = transform.match(/^matrix\(([^)]+)\)$/)
      if (m2d?.[1]) {
        const parts = m2d[1].split(',').map(s => parseFloat(s.trim()))
        return parts[0] ?? Number.NaN
      }
      const m3d = transform.match(/^matrix3d\(([^)]+)\)$/)
      if (m3d?.[1]) {
        const parts = m3d[1].split(',').map(s => parseFloat(s.trim()))
        return parts[0] ?? Number.NaN
      }
      // 'none' or a fallback shorthand we don't expect from Framer.
      return Number.NaN
    }

    const parseBlur = (filter: string): number => {
      if (!filter || filter === 'none') return 0
      const m = filter.match(/blur\(([\d.]+)px\)/)
      return m?.[1] ? parseFloat(m[1]) : 0
    }

    let stopped = false
    const sample = (now: number): void => {
      if (stopped) return
      const backdrop = findBackdrop()
      const card = findCard()
      const backdropOpacity = backdrop ? parseFloat(getComputedStyle(backdrop).opacity) : 0
      const cardScale = card ? parseScale(getComputedStyle(card).transform) : Number.NaN
      const cardBlurPx = card ? parseBlur(getComputedStyle(card).filter) : Number.NaN
      trace.push({ t: now, backdropOpacity, cardScale, cardBlurPx })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    w.__stopEnlargeTrace = () => { stopped = true }
  })
}

async function readEnlargeTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __enlargeTrace?: FrameSample[]; __stopEnlargeTrace?: () => void }
    w.__stopEnlargeTrace?.()
    return w.__enlargeTrace ?? []
  })
}

/**
 * Find the activation window — first frame where the enlarge elements are
 * present AND the card has a numeric scale — and derive shape values from
 * there. Throws if the trace never shows enlarge content; that's a real
 * harness signal (the tap didn't trigger the cinematic).
 */
function deriveEnlargeShape(trace: FrameSample[]): EnlargeShape {
  const presentFrames = trace.filter(f => Number.isFinite(f.cardScale))
  if (presentFrames.length === 0) {
    throw new Error('framer-hand-enlarge: trace never showed enlargeCard — single-tap did not enlarge, or selector missed the portalled element')
  }
  const start = presentFrames[0]!
  const peakFrames = presentFrames.filter(f => f.cardScale >= 0.99)
  if (peakFrames.length === 0) {
    throw new Error('framer-hand-enlarge: card scale never reached >= 0.99 — cinematic clipped or never settled')
  }
  const peakStart = peakFrames[0]!
  const peakEnd = peakFrames[peakFrames.length - 1]!
  const midBand = presentFrames.filter(f => f.cardScale >= 0.4 && f.cardScale <= 0.95)
  const midBlurs = midBand.map(f => f.cardBlurPx).filter(b => Number.isFinite(b)) as number[]
  midBlurs.sort((a, b) => a - b)
  const midMin = midBlurs.length > 0 ? midBlurs[0]! : 0
  const midMedian = midBlurs.length > 0
    ? midBlurs[Math.floor(midBlurs.length / 2)]!
    : 0

  return {
    timeToPeakMs: peakStart.t - start.t,
    peakSustainedMs: peakEnd.t - peakStart.t,
    peakFrames: peakFrames.length,
    midTransitionFrames: midBand.length,
    midTransitionMinBlurPx: midMin,
    midTransitionMedianBlurPx: midMedian,
  }
}

// --- Setup --------------------------------------------------------------------

async function bootGameToPlaying(board: Page, phones: Page[], roomCode: string): Promise<void> {
  await joinPhone(phones[0]!, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)
}

/**
 * Wait for Alice's hand to render at least one card. Returns the bounding
 * rect of the first card slot — useful for tap targeting.
 */
async function findFirstHandCard(phone: Page): Promise<{ x: number; y: number; w: number; h: number }> {
  const card = phone.locator('[class*="hand"] [class*="slot"]').first()
  await card.waitFor({ state: 'visible', timeout: 8_000 })
  const box = await card.boundingBox()
  if (!box) throw new Error('framer-hand-enlarge: hand slot has no bounding box (Framer mid-flight?)')
  return { x: box.x, y: box.y, w: box.width, h: box.height }
}

// --- Tests --------------------------------------------------------------------

test.describe('Framer hand→enlarge cinematic — shape + co-ordination invariant', () => {
  test('single-tap holds shape AND keeps blur active during mid-scale rejig band', async ({ board, phones, roomCode }) => {
    await bootGameToPlaying(board, phones, roomCode)
    const phone = phones[0]!

    const card = await findFirstHandCard(phone)

    await installEnlargeSampler(phone)

    // Tap center of card. Single-tap fires after the 400ms double-tap
    // disambiguation window — the sampler is already running, so it'll
    // capture both pre-tap (no enlarge) and the cinematic itself.
    await phone.touchscreen.tap(card.x + card.w / 2, card.y + card.h / 2)

    // Wait for the cinematic to play out: 400ms double-tap delay +
    // ~700ms snappy-spring settle + 600ms buffer (CI / Mobile Chrome
    // emulation can throttle rAF below native 60fps; widen the buffer
    // so the sampler reliably catches the full arc).
    await phone.waitForTimeout(1_800)

    const trace = await readEnlargeTrace(phone)

    // Frame-count floor stays loose on purpose. Mobile Chrome emulation
    // can rAF at ~30-50fps under Playwright, so a 1.8s sampling window
    // typically yields 50-100 frames. Floor at 30 — below that suggests
    // a sampler bug, not a cinematic regression.
    const presentCount = trace.filter(f => Number.isFinite(f.cardScale)).length
    expect(
      trace.length,
      `sampler frame count — got ${trace.length} frames over 1.8s window. Floor 30; if lower, sampler is throttled or stopped early.`,
    ).toBeGreaterThan(30)
    expect(
      presentCount,
      `cinematic firing check — got ${presentCount} frames where the enlarge card had a numeric scale; need >= 5. If 0, the single-tap didn't enlarge — selector miss, useDoubleTap stalled, or hand wasn't tappable.`,
    ).toBeGreaterThanOrEqual(5)

    const shape = deriveEnlargeShape(trace)

    // --- Shape assertions -----------------------------------------------------

    expect.soft(
      shape.timeToPeakMs,
      `time-to-peak — measured ${shape.timeToPeakMs.toFixed(0)}ms; max ${TIME_TO_PEAK_MAX_MS}ms (snappy spring settle window). If higher, cinematic is dragging or sampler missed activation.`,
    ).toBeLessThan(TIME_TO_PEAK_MAX_MS)

    expect.soft(
      shape.peakFrames,
      `peak-frames floor — measured ${shape.peakFrames} frames at scale >= 0.99; min ${PEAK_FRAMES_FLOOR}. Below floor means the cinematic never sustained at full size.`,
    ).toBeGreaterThanOrEqual(PEAK_FRAMES_FLOOR)

    // --- Co-ordination invariant: blur must mask the mid-scale rejig --------

    expect.soft(
      shape.midTransitionFrames,
      `mid-band frames floor — measured ${shape.midTransitionFrames} frames at scale ∈ [0.4, 0.95]; need >= 3 to assess co-ordination meaningfully. If under 3, sampler may be missing the transit; otherwise the spring is over-snappy and the rejig band has shrunk past the gate.`,
    ).toBeGreaterThanOrEqual(3)

    expect.soft(
      shape.midTransitionMedianBlurPx,
      `co-ordination invariant — median blur in mid-scale band ${shape.midTransitionMedianBlurPx.toFixed(2)}px must be >= ${MID_BAND_BLUR_MEDIAN_MIN_PX}px. The hand→enlarge cinematic deliberately layers blur(4px → 0px) over scale(0.35 → 1) to mask MinimalCard's container-query rejig (insights 015/016 area). A regression that removed / shortened the blur reads as "two layouts fighting" mid-scale; that's exactly what this assertion catches.`,
    ).toBeGreaterThanOrEqual(MID_BAND_BLUR_MEDIAN_MIN_PX)

    expect.soft(
      shape.midTransitionMinBlurPx,
      `per-frame blur floor — min blur on a mid-scale frame was ${shape.midTransitionMinBlurPx.toFixed(2)}px (loose floor ${MID_BAND_BLUR_MIN_PX_PER_FRAME}px). Single-frame dips at threshold crossings are tolerated; the median floor is the real invariant.`,
    ).toBeGreaterThanOrEqual(MID_BAND_BLUR_MIN_PX_PER_FRAME)

    // --- Backdrop sanity (presence companion per insight 027) --------------

    const peakBackdropOpacity = trace
      .filter(f => f.cardScale >= 0.99)
      .map(f => f.backdropOpacity)
    const maxBackdrop = peakBackdropOpacity.length > 0 ? Math.max(...peakBackdropOpacity) : 0
    expect.soft(
      maxBackdrop,
      `backdrop sanity — max backdrop opacity at peak was ${maxBackdrop.toFixed(2)}; should reach ~1. If 0, the backdrop never mounted; the sampler is matching a non-Framer element.`,
    ).toBeGreaterThan(0.9)
  })

  test('FAULT INJECTION: scale arc with no coordinated blur fails the co-ordination invariant', async ({ board, phones, roomCode }) => {
    // This test does NOT use the real hand→enlarge cinematic. It paints
    // a scale arc with NO blur on synthetic enlargeBackdrop + enlargeCard
    // elements appended directly to body, proving the canary catches the
    // bug class even when scale-shape passes.
    //
    // If this test ever passes the healthy bounds, the harness has gone
    // numb and the regression test above is theater.
    await bootGameToPlaying(board, phones, roomCode)
    const phone = phones[0]!

    await installEnlargeSampler(phone)

    await phone.evaluate(() => {
      // Build synthetic backdrop + card. CSS-modules class-substring match
      // ('enlargeBackdrop' / 'enlargeCard') lets the sampler find them.
      const backdrop = document.createElement('div')
      backdrop.className = 'fault_enlargeBackdrop_x'
      Object.assign(backdrop.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '99999', opacity: '1',
      })
      const card = document.createElement('div')
      card.className = 'fault_enlargeCard_x'
      Object.assign(card.style, {
        width: '300px', height: '420px', background: '#222',
        transform: 'matrix(0.35, 0, 0, 0.35, 0, 0)',
        // INTENTIONAL bug shape: NO blur applied during scale transition.
        filter: 'none',
      })
      backdrop.appendChild(card)
      document.body.appendChild(backdrop)

      // Animate scale 0.35 → 1 over 400ms (matches snappy spring settle
      // ballpark) with NO blur. Hold at scale 1 for 200ms. Then strip.
      const start = performance.now()
      const tick = (now: number): void => {
        const elapsed = now - start
        if (elapsed < 400) {
          const t = elapsed / 400
          const s = 0.35 + (1 - 0.35) * t
          card.style.transform = `matrix(${s}, 0, 0, ${s}, 0, 0)`
          // No blur — the bug shape we're proving the canary catches.
          requestAnimationFrame(tick)
        } else if (elapsed < 600) {
          card.style.transform = 'matrix(1, 0, 0, 1, 0, 0)'
          requestAnimationFrame(tick)
        } else {
          backdrop.remove()
        }
      }
      requestAnimationFrame(tick)
    })

    await phone.waitForTimeout(900)

    const trace = await readEnlargeTrace(phone)
    const shape = deriveEnlargeShape(trace)

    // Scale-shape itself should be HEALTHY — the bug shape isn't about
    // scale, it's about blur. So time-to-peak + peak-frames pass.
    expect(shape.timeToPeakMs, 'fault-injection sanity — scale arc should hit peak quickly').toBeLessThan(TIME_TO_PEAK_MAX_MS)
    expect(shape.peakFrames, 'fault-injection sanity — scale arc should hold at peak briefly').toBeGreaterThanOrEqual(3)
    expect(shape.midTransitionFrames, 'fault-injection sanity — scale arc should pass through mid-band').toBeGreaterThanOrEqual(3)

    // The CO-ORDINATION invariant must FAIL — that's what we're proving.
    expect(
      shape.midTransitionMedianBlurPx,
      `fault-injection canary — median blur on mid-band should be ~0 (bug shape paints zero blur). Measured ${shape.midTransitionMedianBlurPx.toFixed(2)}px. If much higher, the synthetic painter has drifted or the harness is reading non-fault frames.`,
    ).toBeLessThan(MID_BAND_BLUR_MEDIAN_MIN_PX)
  })
})
