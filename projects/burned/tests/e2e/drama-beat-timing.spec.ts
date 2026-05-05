/**
 * Drama-beat frame-timing harness.
 *
 * --- The class of bug this exists to catch ---
 *
 * 2026-04-22 → 2026-05-01: GSAP `'<'` position parameter on the exit tweens
 * anchored them to the START of the hold tween instead of after it. The
 * timeline's `totalDuration()` was correct from the engine's POV (and the
 * Vitest pin in `DramaOverlay.test.ts` passed). But the rendered element's
 * opacity reached 0 at t≈861ms regardless of whether `holdMs` was 1200,
 * 1600, 2000, or 2400. Every drama beat in the game was clipping to ~30%
 * of designed duration for ~10 days, undetected.
 *
 * Why the existing Vitest didn't catch it: it asserts on the GSAP timeline
 * object (`tl.totalDuration()`). That's the engine's internal accounting,
 * not what the user actually sees. A future regression of the same shape —
 * e.g. a parent transform/opacity overriding the target's, an HMR-induced
 * timeline reset, a stylesheet rule colliding — would slip past the same
 * assertion.
 *
 * --- What this harness does ---
 *
 * Drives a real game to playing phase, installs a `requestAnimationFrame`
 * sampler on the DramaOverlay's outer + active inner element (sampling
 * computed opacity each frame), injects synthetic GameEvents via the
 * `__testInjectEvent` dev hook, then derives the rendered "beat shape"
 * (total visible duration + sustained-peak duration) and compares it to
 * what `getDramaBeats` declares.
 *
 * Effective visibility is `min(outerOpacity, innerOpacity)` — the user
 * sees content only when both are non-zero. Sampling both surfaces is what
 * makes this catch the original bug class regardless of which element the
 * collision happens on.
 *
 * The fault-injection test at the bottom paints a deliberately clipped
 * opacity arc directly in page context (no event, no GSAP) and proves
 * the canary thresholds DO fire on the bug shape — so we know the harness
 * is sensitive, not just passing because everything's fine right now.
 *
 * --- Why this spec lives in tests/e2e/ instead of vitest ---
 *
 * The bug was browser-rendering-pipeline-dependent (GSAP → CSS → compositor).
 * jsdom doesn't run GSAP timelines against a real compositor. Real Chrome
 * via Playwright is the only environment where the symptom manifests.
 * Future work moves the same methodology onto chrome-devtools-mcp so seat
 * agents and ad-hoc Claude sessions can do the same kind of measurement
 * interactively.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'
import type { GameEvent } from '../../src/shared/types'

interface FrameSample { t: number; outer: number; inner: number }
interface BeatShape {
  /** Time from first non-zero effective opacity to its return to zero. */
  totalVisibleMs: number
  /** Time from first reaching peak (>=0.99) to last sample at peak. */
  peakSustainedMs: number
  /** Frame count at peak. Useful as a sanity floor. */
  peakFrames: number
}

interface BeatSpec {
  label: string
  event: GameEvent
  /**
   * Sustained-peak target — the duration the user perceives content as
   * "fully on screen." For text/card variants this matches `holdMs`. For
   * card-flip the perceived peak ALSO covers the face-down pause + flip
   * animation (the flipContainer wrapper stays opacity 1 throughout
   * those — only its rotator children animate), so peak ≈ pause + flip
   * + holdMs.
   */
  designedPeakMs: number
  /** Total time from first paint to full fade-out: enter + peak + exit. */
  designedTotalMs: number
}

const PEAK_TOLERANCE_RATIO  = 0.6  // measured peak must be >= 60% of designed peak
const TOTAL_TOLERANCE_RATIO = 0.15 // total visible may drift by ±15%

async function installSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__dramaTrace = [] as Array<{ t: number; outer: number; inner: number }>
    const overlay = document.querySelector('[role="status"]') as HTMLElement | null
    if (!overlay) throw new Error('drama-beat-timing: no [role="status"] overlay found on page')
    const inner = overlay.firstElementChild as HTMLElement | null
    if (!inner) throw new Error('drama-beat-timing: overlay has no inner slot')
    const trace = w.__dramaTrace as Array<{ t: number; outer: number; inner: number }>
    let stopped = false
    const sample = (now: number): void => {
      if (stopped) return
      // Walk children to find the slot whose computed display is not 'none'.
      // The overlay swaps display between text/card/flip slots per beat
      // variant; we want the active one.
      let activeInner: HTMLElement = inner
      for (const child of Array.from(overlay.children)) {
        const el = child as HTMLElement
        if (getComputedStyle(el).display !== 'none') {
          activeInner = el
          break
        }
      }
      const outerOp = parseFloat(getComputedStyle(overlay).opacity)
      const innerOp = parseFloat(getComputedStyle(activeInner).opacity)
      trace.push({ t: now, outer: outerOp, inner: innerOp })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    w.__stopDramaTrace = () => { stopped = true }
  })
}

async function readTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __dramaTrace?: Array<{ t: number; outer: number; inner: number }>; __stopDramaTrace?: () => void }
    w.__stopDramaTrace?.()
    return w.__dramaTrace ?? []
  })
}

async function injectEvent(page: Page, event: GameEvent): Promise<void> {
  await page.evaluate((evt) => {
    const w = window as unknown as { __testInjectEvent?: (e: unknown) => void }
    if (!w.__testInjectEvent) throw new Error('drama-beat-timing: __testInjectEvent missing — gameStore dev hook not loaded (DEV/test mode required)')
    w.__testInjectEvent(evt)
  }, event)
}

/**
 * Effective visibility = min(outer, inner) — content is on screen only when
 * both elements are non-zero opacity.
 *
 * --- Why we measure SHAPE, not phase boundaries against raw `holdMs` ---
 *
 * The GSAP `back.out(1.1)` enter overshoots, so the opacity-≥0.99 crossing
 * sits around t≈0.5 of designed enter duration. The `power2.out` exit
 * decays fast-then-slow, so opacity-<0.05 crossing sits around t≈0.78 of
 * designed exit duration. Threshold-naive comparison to raw `MOTION_DURATIONS`
 * values diverges by 100ms+ even when the timeline is correct — that's
 * ease-curve slack, not a bug.
 *
 * What the original 2026-04-22 GSAP `'<'` clip bug would have produced:
 *   - enter normal (~250ms)
 *   - exit running IN PARALLEL with hold start, so peak collapses
 *     immediately (~0ms peakSustained) and total visible ≈ enter + exit
 *     (~650ms instead of ~2250ms designed)
 *
 * Two assertions cleanly catch that shape AND every variant of "visible
 * content was clipped relative to designed":
 *   1. totalVisibleMs ≈ designed total (within ±15%) — gross clipping
 *   2. peakSustainedMs >= 60% of designed peak — peak-collapse signature
 *
 * Both tolerances are wide enough to absorb ease-curve slack and CI
 * scheduling jitter, narrow enough to fail noisily on the bug class. The
 * fault-injection test below empirically confirms the bug-shape fails.
 */
function deriveBeatShape(trace: FrameSample[]): BeatShape {
  const eff = trace.map(s => ({ t: s.t, v: Math.min(s.outer, s.inner) }))
  const enterStart = eff.find(s => s.v > 0.05)
  if (!enterStart) throw new Error('drama-beat-timing: trace never rises above 0 — overlay never showed')
  const peakFrames = eff.filter(s => s.v >= 0.99)
  if (peakFrames.length === 0) throw new Error('drama-beat-timing: effective opacity never reached >=0.99 — beat never fully entered')
  const peakStart = peakFrames[0]!
  const peakEnd = peakFrames[peakFrames.length - 1]!
  const exitEnd = eff.find(s => s.t > peakEnd.t && s.v < 0.05)
  if (!exitEnd) throw new Error('drama-beat-timing: effective opacity never returned to ~0 — beat never exited (clipping check window too short?)')
  return {
    totalVisibleMs:  exitEnd.t - enterStart.t,
    peakSustainedMs: peakEnd.t - peakStart.t,
    peakFrames:      peakFrames.length,
  }
}

async function bootGameToPlaying(board: Page, phones: Page[], roomCode: string): Promise<void> {
  // Two-player game so DramaOverlay mounts on the board view.
  // (DramaOverlay only mounts post-lobby — see Board.tsx phase gate.)
  await joinPhone(phones[0]!, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)
  // Wait for DramaOverlay to mount + seed lastProcessed to the current
  // event-log tail so the join/start events don't replay through the queue.
  await board.waitForFunction(() => !!document.querySelector('[role="status"]'))
  await board.waitForTimeout(100)
}

/**
 * Run one beat through the harness and assert its rendered shape.
 *
 * `expect.soft` so that when this is called multiple times in a single
 * test, ALL beats report their findings at the end instead of stopping
 * at the first failure — gives a complete picture of which beats drift
 * vs which are clean.
 */
async function assertBeatShape(board: Page, spec: BeatSpec): Promise<BeatShape> {
  await installSampler(board)
  await injectEvent(board, spec.event)
  // Settle window: designed total + a generous tail so even slow CI machines
  // capture the full return to opacity 0.
  await board.waitForTimeout(spec.designedTotalMs + 800)

  const trace = await readTrace(board)
  expect(trace.length, `${spec.label}: sampler produced no frames`).toBeGreaterThan(60)

  const shape = deriveBeatShape(trace)

  const totalLow  = spec.designedTotalMs * (1 - TOTAL_TOLERANCE_RATIO)
  const totalHigh = spec.designedTotalMs * (1 + TOTAL_TOLERANCE_RATIO)
  const peakLow   = spec.designedPeakMs * PEAK_TOLERANCE_RATIO

  const totalMsg = `${spec.label}: total visible drift — measured ${shape.totalVisibleMs.toFixed(0)}ms vs designed ${spec.designedTotalMs}ms (±${TOTAL_TOLERANCE_RATIO * 100}%, bounds ${totalLow.toFixed(0)}-${totalHigh.toFixed(0)}ms). Trace: ${trace.length} frames, peak frames=${shape.peakFrames}.`
  const peakMsg  = `${spec.label}: peak-sustained drift (GSAP-clip canary) — measured ${shape.peakSustainedMs.toFixed(0)}ms vs designed ${spec.designedPeakMs}ms — must be >= ${peakLow.toFixed(0)}ms (${PEAK_TOLERANCE_RATIO * 100}% of designed peak). Trace: ${trace.length} frames.`

  expect.soft(shape.totalVisibleMs,  totalMsg).toBeGreaterThan(totalLow)
  expect.soft(shape.totalVisibleMs,  totalMsg).toBeLessThan(totalHigh)
  expect.soft(shape.peakSustainedMs, peakMsg ).toBeGreaterThan(peakLow)

  return shape
}

// --- Designed values (lifted from src/client/shared/DramaOverlay.tsx getDramaBeats
// + tokens/motion.ts MOTION_DURATIONS). If those drift, update here. ---
//
// MOTION_DURATIONS.base  = 250ms (text variant enter)
// MOTION_DURATIONS.slow  = 400ms (card / card-flip enter, all variants exit)
//
// Card-flip extras:  300ms face-down pause + 500ms 0°→180° rotation
const ENTER_TEXT_MS = 250
const ENTER_CARD_MS = 400
const EXIT_MS       = 400
const FLIP_PAUSE_MS = 300
const FLIP_ROTATE_MS = 500

const totalForText = (holdMs: number) => ENTER_TEXT_MS + holdMs + EXIT_MS
const peakForCardFlip = (holdMs: number) => FLIP_PAUSE_MS + FLIP_ROTATE_MS + holdMs
const totalForCardFlip = (holdMs: number) => ENTER_CARD_MS + peakForCardFlip(holdMs) + EXIT_MS

test.describe('Drama beats — visible (rendered) duration matches designed', () => {
  test('all board-visible beats hold their designed shape (no GSAP clip)', async ({ board, phones, roomCode }) => {
    await bootGameToPlaying(board, phones, roomCode)

    // Seven beats run sequentially in the same game so we pay the join +
    // start setup cost (~5s) once instead of seven times. Each beat installs
    // a fresh sampler, injects, settles, then the next beat resets. Soft
    // expectations so all seven report instead of bailing on the first
    // failure — when something drifts you want the full diff.

    // Text-variant beats — all use ENTER_TEXT + hold + EXIT_MS structure.
    await assertBeatShape(board, {
      label:           'extraction-played',
      event:           { type: 'extraction-played', playerId: 'p-extract' },
      designedPeakMs:  1600,
      designedTotalMs: totalForText(1600),
    })

    await assertBeatShape(board, {
      label:           'player-eliminated',
      event:           { type: 'player-eliminated', playerId: 'p-elim', rank: 3 },
      designedPeakMs:  1500,
      designedTotalMs: totalForText(1500),
    })

    await assertBeatShape(board, {
      // INTERCEPTED is `transient: true`, but transients only abort on a
      // `turn-started` event in the same batch. We aren't firing one — the
      // beat plays out fully, same as a critical beat. The transient flag
      // only changes the "should-this-beat-survive-handoff" question, not
      // the shape when it does play.
      label:           'nope-played (INTERCEPTED, transient)',
      event:           { type: 'nope-played', playerId: 'p-nope', chainDepth: 1 },
      designedPeakMs:  1400,
      designedTotalMs: totalForText(1400),
    })

    await assertBeatShape(board, {
      label:           'card-played: burn-the-files (FILES BURNED)',
      // No comboSize key — `comboSize === undefined` is what the engine
      // checks (line 177 of DramaOverlay.tsx) to differentiate a single
      // play from a triple-steal stage. Single play = the beat fires.
      event:           { type: 'card-played', playerId: 'p-btf', cardType: 'burn-the-files' },
      designedPeakMs:  1200,
      designedTotalMs: totalForText(1200),
    })

    await assertBeatShape(board, {
      label:           'card-played: falsify-intel (INTEL FALSIFIED)',
      event:           { type: 'card-played', playerId: 'p-fi', cardType: 'falsify-intel' },
      designedPeakMs:  1200,
      designedTotalMs: totalForText(1200),
    })

    // Card-flip variant — board sees this on burned-drawn (myPlayerId = null,
    // so the drawer-only `card` branch is skipped and the cinematic plays).
    // Sampler tracks the flipContainer's opacity, which holds at 1 across
    // the whole face-down pause + flip + settled-hold sequence — so the
    // perceived peak duration includes the flip animation, not just `holdMs`.
    await assertBeatShape(board, {
      label:           'burned-drawn (card-flip, board view)',
      event:           { type: 'burned-drawn', playerId: 'p-burn' },
      designedPeakMs:  peakForCardFlip(1400),
      designedTotalMs: totalForCardFlip(1400),
    })

    // game-over LAST. The GameOver overlay swaps the board into a phase
    // that may unmount or restructure DramaOverlay's host — running it
    // before other beats would invalidate the sampler for everything after.
    await assertBeatShape(board, {
      label:           'game-over (WINS)',
      event:           { type: 'game-over', winnerId: 'p-win' },
      designedPeakMs:  2000,
      designedTotalMs: totalForText(2000),
    })
  })

  test('burned-drawn (drawer view, card variant) holds peak ≈2400ms', async ({ board, phones, roomCode }) => {
    // The drawer-only branch in `getDramaBeats`: when `myPlayerId === event.playerId`,
    // the cinematic is the Burned MinimalCard filling the screen for 2400ms —
    // the longest dramatic hold in the game. This beat was the original 2026-05-01
    // motivation: Briggsy's "camera flash" eye-in-loop report was THIS beat,
    // clipped by GSAP `'<'` from a designed 2400ms to a measured ~861ms. We
    // need the harness to pin it specifically.
    //
    // To exercise the drawer branch the page MUST be a phone view with a
    // populated `gameStore.playerId`, and the injected event's playerId
    // must match. We pull the phone's own playerId via `__gameStore` and
    // wire it back into the synthetic event.
    await bootGameToPlaying(board, phones, roomCode)

    const drawerPhone = phones[0]!
    // Wait for DramaOverlay to mount on the phone (it's lazy-imported in
    // Player.tsx — see the `lazy(() => import('@client/shared/DramaOverlay'))`
    // call. After the playing-phase state arrives, the lazy chunk fetches
    // and the overlay reaches the DOM within a tick or two).
    await drawerPhone.waitForFunction(() => !!document.querySelector('[role="status"]'), null, { timeout: 5_000 })
    await drawerPhone.waitForTimeout(100)

    const myPlayerId = await drawerPhone.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      if (!w.__gameStore) throw new Error('drama-beat-timing: __gameStore missing on phone (DEV/test mode required)')
      return w.__gameStore.getPlayerId()
    })
    expect(myPlayerId, 'phone should have a playerId after joinPhone').toBeTruthy()

    await assertBeatShape(drawerPhone, {
      label:           'burned-drawn (drawer card)',
      event:           { type: 'burned-drawn', playerId: myPlayerId! },
      // Card variant: enter (slow) + hold 2400 + exit (slow). Same shape as
      // text variants but with longer enter and the `cardSlot` element as
      // the active inner — the sampler picks it up via the `display !== 'none'`
      // walk because card-variant beats set cardSlot to display:flex.
      designedPeakMs:  2400,
      designedTotalMs: ENTER_CARD_MS + 2400 + EXIT_MS,
    })
  })

  test('FAULT INJECTION: clipped paint produces sub-canary peak — proves harness is sensitive', async ({ board, phones, roomCode }) => {
    // This test does NOT use `__testInjectEvent` or DramaOverlay's GSAP
    // pipeline at all. It paints a deliberately clipped opacity arc on the
    // overlay elements directly — opacity rises 0→1 over 250ms, then
    // immediately drops 1→0 over 400ms with NO sustained peak. That's the
    // shape the original 2026-04-22 GSAP `'<'` bug produced.
    //
    // Goal: assert that `deriveBeatShape` on this trace returns values
    // that fail BOTH canary thresholds. If this test ever passes the
    // healthy bounds, the harness has gone numb and the regression test
    // above is theater.
    await bootGameToPlaying(board, phones, roomCode)
    await installSampler(board)

    await board.evaluate(() => {
      const overlay = document.querySelector('[role="status"]') as HTMLElement | null
      if (!overlay) throw new Error('fault-injection: no overlay')
      const inner = overlay.firstElementChild as HTMLElement | null
      if (!inner) throw new Error('fault-injection: no inner slot')
      // Make the first slot the "active" one so the sampler picks it up
      // (sampler walks children for `display !== 'none'`).
      ;(inner as HTMLElement).style.display = 'block'
      ;(inner as HTMLElement).textContent = 'CLIPPED'
      overlay.style.opacity = '1'
      ;(inner as HTMLElement).style.opacity = '0'

      const ENTER_MS = 250
      // Tiny sampler-alignment plateau (~50ms — real bug-shape was ~16ms,
      // a single rAF tick, which the 60fps sampler may miss entirely
      // depending on phase alignment). 50ms is still 19× below the 960ms
      // canary floor, so this remains a faithful stand-in for "no meaningful
      // peak." If 50ms ever passes the canary, the canary has been gutted.
      const PEAK_HOLD_MS = 50
      const EXIT_MS  = 400
      const start = performance.now()
      const tick = (now: number): void => {
        const elapsed = now - start
        if (elapsed < ENTER_MS) {
          // Linear rise on the inner element. Outer stays at 1.
          ;(inner as HTMLElement).style.opacity = String(elapsed / ENTER_MS)
          requestAnimationFrame(tick)
        } else if (elapsed < ENTER_MS + PEAK_HOLD_MS) {
          // Brief plateau so the sampler reliably catches the peak.
          ;(inner as HTMLElement).style.opacity = '1'
          overlay.style.opacity = '1'
          requestAnimationFrame(tick)
        } else if (elapsed < ENTER_MS + PEAK_HOLD_MS + EXIT_MS) {
          // The bug shape: peak collapses immediately. Inner pinned at 1,
          // outer drops via power2.out approximation (ease-out cubic on
          // inverted t).
          ;(inner as HTMLElement).style.opacity = '1'
          const exitT = (elapsed - ENTER_MS - PEAK_HOLD_MS) / EXIT_MS
          overlay.style.opacity = String((1 - exitT) * (1 - exitT))
          requestAnimationFrame(tick)
        } else {
          overlay.style.opacity = '0'
        }
      }
      requestAnimationFrame(tick)
    })

    // Wait long enough for the painted shape to complete + sampler to
    // capture the full arc. ENTER (250) + EXIT (400) + tail = ~1500ms.
    await board.waitForTimeout(1500)

    const trace = await readTrace(board)
    const shape = deriveBeatShape(trace)

    // Healthy EXTRACTED canary thresholds (the ones the first batch above
    // measures against): designed peak 1600ms → peak floor 960ms; designed
    // total 2250ms → total floor 1912ms. The clipped paint should miss
    // BOTH by a wide margin — peakSustained near 0ms, total near 650ms.

    // Assert the clipped shape falls SHORT of the canary's lower bounds.
    // Tight upper bounds here so a future change that softens canary
    // sensitivity (e.g. lowering 0.6 to 0.1) doesn't leave this test
    // silently passing.
    const HEALTHY_PEAK_FLOOR_MS  = 1600 * PEAK_TOLERANCE_RATIO  // = 960
    const HEALTHY_TOTAL_FLOOR_MS = 2250 * (1 - TOTAL_TOLERANCE_RATIO) // = 1912.5

    expect(
      shape.peakSustainedMs,
      `fault-injection peak sanity — bug-shape painted ~50ms PEAK_HOLD plateau (sampler-alignment buffer); allow up to 200ms for jitter. Measured ${shape.peakSustainedMs.toFixed(0)}ms. If much higher, the painter or sampler has drifted.`,
    ).toBeLessThan(200)

    expect(
      shape.peakSustainedMs,
      `fault-injection canary check — bug-shape peak ${shape.peakSustainedMs.toFixed(0)}ms must be BELOW healthy floor ${HEALTHY_PEAK_FLOOR_MS}ms. If not, the canary's >=60% threshold has been softened too far.`,
    ).toBeLessThan(HEALTHY_PEAK_FLOOR_MS)

    expect(
      shape.totalVisibleMs,
      `fault-injection total sanity — bug-shape total ${shape.totalVisibleMs.toFixed(0)}ms must be BELOW healthy floor ${HEALTHY_TOTAL_FLOOR_MS}ms. If not, the canary's ±15% bound has been widened too far.`,
    ).toBeLessThan(HEALTHY_TOTAL_FLOOR_MS)
  })
})
