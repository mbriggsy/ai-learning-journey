/**
 * Framer BottomSheet enter/exit cinematic — runtime gate.
 *
 * --- The class of bug this exists to catch ---
 *
 * BottomSheet (`src/client/shared/BottomSheet.tsx`) is the chrome for every
 * server-prompted decision UI on the phone — DefusePlacement, FuturePeek,
 * NameCard, TargetSelect. The motion contract is a vanilla Framer pattern:
 *   `m.div initial={translateY 100%} animate={translateY 0%} transition={MOTION.snappy}`
 * inside an AnimatePresence wrapper around a `<dialog>` element.
 *
 * Failure modes worth catching at runtime:
 *   - MOTION.snappy spring config drift (stiffness/damping changes that
 *     produce overshoots, sluggish settles, or never-settle oscillations)
 *   - AnimatePresence wiring breaks — open=true but content never enters,
 *     or open=false but content never exits (dialog stays open forever)
 *   - `contain: layout` traps on an ancestor (insight 013) — sheet renders
 *     in wrong viewport position (does not reach top-of-content at peak)
 *   - Framer-version regressions that break translate-only animations
 *
 * --- What this harness does ---
 *
 * Drives a phone view to a state where Player.tsx is mounted, then uses
 * the `__testForceLocalTarget` DEV hook (added to Player.tsx for this
 * harness) to flip the local-target sheet open and closed. Samples per-rAF:
 *   - dialog presence (open vs absent)
 *   - sheet content `translateY` (parsed from computed transform matrix)
 *   - dialog viewport position (does the sheet reach the bottom edge of
 *     the viewport at translateY 0% — the contain:layout-trap signature
 *     would push it elsewhere)
 *
 * Asserts SHAPE: enter completes within spring settle window (~700ms),
 * peak holds at translateY ≈ 0px, exit returns to translateY ≈ 100% over
 * a comparable window. Includes the same fault-injection canary as
 * drama-beat-timing — paints a synthetic translateY arc that NEVER reaches
 * 0px (the broken-spring shape) and asserts the canary catches it.
 *
 * Sensitivity verified empirically: temporarily replacing `MOTION.snappy`
 * with a never-settling spring (e.g. damping 0) in BottomSheet.tsx flips
 * the test red.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

interface FrameSample {
  /** ms since `performance.timeOrigin`. */
  t: number
  /** Sheet content translateY in CSS px. NaN when content not in DOM. */
  translateYPx: number
  /** Dialog `<dialog>` open boolean. False when dialog absent. */
  dialogOpen: boolean
  /** Sheet content top-edge position relative to viewport bottom (px). NaN when absent. */
  bottomGapPx: number
}

interface SheetShape {
  /** Time from first DOM presence with finite translateY to translateY ≤ 5px. */
  timeToPeakMs: number
  /** Frame count at translateY ≤ 5px (peak persistence). */
  peakFrames: number
  /** Min translateY observed (should be ≈ 0px at peak). */
  minTranslateYPx: number
  /** Max bottomGapPx observed at peak — distance from sheet bottom to viewport bottom. */
  peakBottomGapPx: number
}

// --- Tolerances ---------------------------------------------------------------

// Spring (snappy: stiffness 300, damping 24) settles in ~400-700ms. Allow
// 800ms for CI / Mobile Chrome rAF throttling.
const TIME_TO_PEAK_MAX_MS = 800

// Peak persistence floor — must hold at translateY ≤ 5px for at least
// this many frames to confirm the user perceives a settled sheet.
const PEAK_FRAMES_FLOOR = 8

// Position invariant — at peak, the sheet's bottom edge should be at or
// near the viewport bottom (insight 013 catch: contain:layout trap on an
// ancestor would push position:fixed descendants off the bottom edge).
// Tolerance 50px covers any safe-area inset / shadow extension.
const PEAK_BOTTOM_GAP_MAX_PX = 50

// --- Sampler ------------------------------------------------------------------

async function installSheetSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__sheetTrace = [] as Array<{ t: number; translateYPx: number; dialogOpen: boolean; bottomGapPx: number }>
    const trace = w.__sheetTrace as Array<{ t: number; translateYPx: number; dialogOpen: boolean; bottomGapPx: number }>

    // BottomSheet's content `m.div` carries CSS-modules `content` class.
    // Match by class-substring so the hashed name doesn't break selection.
    const findContent = (): HTMLElement | null =>
      document.querySelector('dialog [class*="content"]') as HTMLElement | null
    const findDialog = (): HTMLDialogElement | null =>
      document.querySelector('dialog') as HTMLDialogElement | null

    const parseTranslateY = (transform: string): number => {
      // matrix(a, b, c, d, tx, ty) — uniform translate ⇒ ty = index 5.
      const m2d = transform.match(/^matrix\(([^)]+)\)$/)
      if (m2d?.[1]) {
        const parts = m2d[1].split(',').map(s => parseFloat(s.trim()))
        return parts[5] ?? Number.NaN
      }
      // matrix3d(...) — translate y is index 13.
      const m3d = transform.match(/^matrix3d\(([^)]+)\)$/)
      if (m3d?.[1]) {
        const parts = m3d[1].split(',').map(s => parseFloat(s.trim()))
        return parts[13] ?? Number.NaN
      }
      // 'none' = no transform = ty 0.
      if (transform === 'none') return 0
      return Number.NaN
    }

    let stopped = false
    const sample = (now: number): void => {
      if (stopped) return
      const content = findContent()
      const dialog = findDialog()
      const dialogOpen = !!(dialog && dialog.open)
      const translateYPx = content ? parseTranslateY(getComputedStyle(content).transform) : Number.NaN
      let bottomGapPx = Number.NaN
      if (content) {
        const rect = content.getBoundingClientRect()
        bottomGapPx = window.innerHeight - rect.bottom
      }
      trace.push({ t: now, translateYPx, dialogOpen, bottomGapPx })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    w.__stopSheetTrace = () => { stopped = true }
  })
}

async function readSheetTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __sheetTrace?: FrameSample[]; __stopSheetTrace?: () => void }
    w.__stopSheetTrace?.()
    return w.__sheetTrace ?? []
  })
}

/**
 * Find the activation window in the trace.
 *
 * AnimatePresence has a one-frame quirk: when content first mounts but
 * before Framer's `initial` transform has applied, computed `transform`
 * reads as `none` → translateY 0. That frame is at the content's natural
 * post-mount layout position (which can be wrong relative to the eventual
 * settled position because the parent dialog is still resolving its
 * top-layer placement). Filter it out by anchoring "Framer applied" to
 * the first frame where translateY > 50 — the initial 100% offset proves
 * Framer's rendering pipeline is engaged.
 */
function findActivation(trace: FrameSample[]): { startIdx: number; framerStartIdx: number } {
  const startIdx = trace.findIndex(f => Number.isFinite(f.translateYPx))
  if (startIdx < 0) return { startIdx: -1, framerStartIdx: -1 }
  // First frame where Framer's initial offset is observable. Most cinematics
  // start from translateY 100% which equals the sheet's height (~150-300px).
  // 50px is well above any post-settle oscillation amplitude.
  const framerStartIdx = trace.findIndex(f => Number.isFinite(f.translateYPx) && f.translateYPx > 50)
  return { startIdx, framerStartIdx }
}

function deriveSheetShape(trace: FrameSample[]): SheetShape {
  const { startIdx, framerStartIdx } = findActivation(trace)
  if (startIdx < 0) {
    throw new Error('framer-bottom-sheet: trace never showed sheet content — open trigger failed, content selector missed, or dialog never opened')
  }
  if (framerStartIdx < 0) {
    throw new Error('framer-bottom-sheet: trace never showed translateY > 50px — Framer initial transform never applied. AnimatePresence wiring regression.')
  }
  // Peak measurement starts AFTER Framer's pipeline engaged.
  const postFramer = trace.slice(framerStartIdx).filter(f => Number.isFinite(f.translateYPx))
  const peakFrames = postFramer.filter(f => f.translateYPx <= 5)
  if (peakFrames.length === 0) {
    throw new Error(`framer-bottom-sheet: translateY never reached <= 5px — sheet never settled at top. Min observed: ${Math.min(...postFramer.map(f => f.translateYPx)).toFixed(1)}px.`)
  }
  const peakStart = peakFrames[0]!
  const minY = Math.min(...postFramer.map(f => f.translateYPx))
  const peakBottomGaps = peakFrames.map(f => f.bottomGapPx).filter(g => Number.isFinite(g)) as number[]
  // Median is more robust than max — single-frame layout-shift outliers don't
  // dominate the assertion. Insight 013 (contain:layout trap) would push
  // EVERY peak frame off the viewport bottom, not one.
  peakBottomGaps.sort((a, b) => a - b)
  const peakBottomGapPx = peakBottomGaps.length > 0
    ? peakBottomGaps[Math.floor(peakBottomGaps.length / 2)]!
    : Number.NaN
  return {
    timeToPeakMs: peakStart.t - trace[framerStartIdx]!.t,
    peakFrames: peakFrames.length,
    minTranslateYPx: minY,
    peakBottomGapPx,
  }
}

// --- Setup --------------------------------------------------------------------

/**
 * Boot to playing phase. The `__testForceLocalTarget` hook lives inside
 * `PlayingView` (mounted only when the game enters playing phase), so the
 * lobby alone isn't enough to make it available. Two-player game boots
 * fastest — Bob joins solely to satisfy the start-game minimum.
 */
async function bootPhoneToPlaying(phone: Page, phones: Page[], board: Page, roomCode: string): Promise<void> {
  await joinPhone(phone, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(phone, 'playing', 10_000)
  await phone.waitForFunction(() => {
    const w = window as unknown as { __testForceLocalTarget?: unknown }
    return typeof w.__testForceLocalTarget === 'function'
  }, null, { timeout: 8_000 })
}

async function forceSheet(page: Page, reason: 'direct-order' | null): Promise<void> {
  await page.evaluate((r) => {
    const w = window as unknown as { __testForceLocalTarget?: (reason: string | null) => void }
    if (!w.__testForceLocalTarget) throw new Error('framer-bottom-sheet: __testForceLocalTarget missing — Player.tsx hook not registered')
    w.__testForceLocalTarget(r)
  }, reason)
}

// --- Tests --------------------------------------------------------------------

test.describe('Framer BottomSheet cinematic — enter shape + position invariant', () => {
  test('open hits translateY 0 within spring settle window AND sits flush with viewport bottom', async ({ board, phones, roomCode }) => {
    const phone = phones[0]!
    await bootPhoneToPlaying(phone, phones, board, roomCode)

    await installSheetSampler(phone)
    await forceSheet(phone, 'direct-order')

    // Spring settle window + buffer.
    await phone.waitForTimeout(1_200)

    const trace = await readSheetTrace(phone)
    expect(trace.length, `sampler frame count — got ${trace.length} frames; floor 30`).toBeGreaterThan(30)

    const present = trace.filter(f => Number.isFinite(f.translateYPx))
    expect(
      present.length,
      `sheet-content presence — got ${present.length} frames with finite translateY; need >= 5. If 0, the sheet never opened or selector missed.`,
    ).toBeGreaterThanOrEqual(5)

    const shape = deriveSheetShape(trace)

    expect.soft(
      shape.timeToPeakMs,
      `time-to-peak — measured ${shape.timeToPeakMs.toFixed(0)}ms; max ${TIME_TO_PEAK_MAX_MS}ms (snappy spring settle window).`,
    ).toBeLessThan(TIME_TO_PEAK_MAX_MS)

    expect.soft(
      shape.peakFrames,
      `peak persistence — measured ${shape.peakFrames} frames at translateY <= 5px; min ${PEAK_FRAMES_FLOOR}. Below floor means sheet never sustained at peak (oscillation, immediate exit, or motion config regression).`,
    ).toBeGreaterThanOrEqual(PEAK_FRAMES_FLOOR)

    expect.soft(
      shape.minTranslateYPx,
      `peak depth — min translateY ${shape.minTranslateYPx.toFixed(1)}px should be near 0. Larger values mean the sheet didn't fully arrive (spring config drift or AnimatePresence wiring regression).`,
    ).toBeLessThanOrEqual(5)

    expect.soft(
      shape.peakBottomGapPx,
      `position invariant (insight 013 catch) — at peak the sheet's bottom edge should be at or below the viewport bottom (gap <= ${PEAK_BOTTOM_GAP_MAX_PX}px). Measured ${shape.peakBottomGapPx.toFixed(0)}px. A larger gap means an ancestor's contain/transform/filter trapped the position:fixed dialog and pushed it off the bottom edge.`,
    ).toBeLessThanOrEqual(PEAK_BOTTOM_GAP_MAX_PX)
  })

  test('close returns to translateY 100% (dialog dismounts on exit complete)', async ({ board, phones, roomCode }) => {
    const phone = phones[0]!
    await bootPhoneToPlaying(phone, phones, board, roomCode)

    // Open and let it settle first.
    await forceSheet(phone, 'direct-order')
    await phone.waitForTimeout(800)

    // Now sample the EXIT.
    await installSheetSampler(phone)
    await forceSheet(phone, null)
    await phone.waitForTimeout(1_200)

    const trace = await readSheetTrace(phone)
    expect(trace.length, `sampler frame count — got ${trace.length}; floor 30`).toBeGreaterThan(30)

    const present = trace.filter(f => Number.isFinite(f.translateYPx))
    if (present.length === 0) {
      throw new Error('exit-trace had no present frames — sheet was already closed before sampler started')
    }

    // Find max translateY observed during exit. Should reach near the
    // sheet's own height (the AnimatePresence exit animates back to
    // translateY 100% which equals the sheet's height in CSS px).
    const maxY = Math.max(...present.map(f => f.translateYPx))
    expect.soft(
      maxY,
      `exit depth — max translateY during exit was ${maxY.toFixed(1)}px. Should reach a substantial positive value (near the sheet's height) before the dialog dismounts. A small max means the exit animation was clipped or the dialog dismounted instantly.`,
    ).toBeGreaterThan(50)

    // After settle, dialog should be CLOSED — that's the AnimatePresence
    // onExitComplete contract. Look at the last few frames: dialog.open
    // should be false.
    const lastFrames = trace.slice(-5)
    const lastOpenStates = lastFrames.map(f => f.dialogOpen)
    expect.soft(
      lastOpenStates.every(o => !o),
      `dialog cleanup — after exit settle, dialog.open should be false on the trailing frames. Trailing dialogOpen states: ${JSON.stringify(lastOpenStates)}. AnimatePresence onExitComplete must call dialog.close().`,
    ).toBe(true)
  })

  test('FAULT INJECTION: sheet that never reaches translateY 0 fails the time-to-peak canary', async ({ board, phones, roomCode }) => {
    // Paint a synthetic dialog + content element directly. Animate
    // translateY 100% → 50% → 50% (NEVER reaches 0). This is the
    // broken-spring / clipped-AnimatePresence shape — sheet partially
    // arrives but never settles at the top. Prove the canary catches it.
    const phone = phones[0]!
    await bootPhoneToPlaying(phone, phones, board, roomCode)

    await installSheetSampler(phone)

    await phone.evaluate(() => {
      const dialog = document.createElement('dialog')
      Object.assign(dialog.style, {
        position: 'fixed', left: '0', right: '0', bottom: '0',
        margin: '0', padding: '0', border: 'none', background: 'transparent',
        width: '100%', height: '300px', zIndex: '99999',
      })
      const content = document.createElement('div')
      content.className = 'fault_content_x'
      Object.assign(content.style, {
        width: '100%', height: '300px', background: '#444',
        transform: 'matrix(1, 0, 0, 1, 0, 300)',
      })
      dialog.appendChild(content)
      document.body.appendChild(dialog)
      dialog.show() // makes dialog.open === true (showModal would block)

      const start = performance.now()
      const tick = (now: number): void => {
        const elapsed = now - start
        if (elapsed < 400) {
          // Animate from translateY 300 → 150 over 400ms (NEVER reaches 0).
          const t = elapsed / 400
          const ty = 300 - (300 - 150) * t
          content.style.transform = `matrix(1, 0, 0, 1, 0, ${ty})`
          requestAnimationFrame(tick)
        } else if (elapsed < 1200) {
          // Hold at 150px (never settles to 0).
          content.style.transform = 'matrix(1, 0, 0, 1, 0, 150)'
          requestAnimationFrame(tick)
        } else {
          dialog.remove()
        }
      }
      requestAnimationFrame(tick)
    })

    await phone.waitForTimeout(1_500)

    const trace = await readSheetTrace(phone)
    const present = trace.filter(f => Number.isFinite(f.translateYPx))

    // Sanity: the synthetic painter DID produce content frames, and the
    // min translateY observed is 150px (the bug's "never settled" floor).
    expect(present.length, 'fault-injection sanity — synthetic painter should have produced content frames').toBeGreaterThan(10)
    const minY = Math.min(...present.map(f => f.translateYPx))
    expect(
      minY,
      `fault-injection painter check — synthetic content paints translateY 150px floor (bug shape). Measured min ${minY.toFixed(1)}px. If much lower, the painter has drifted.`,
    ).toBeGreaterThan(100)

    // The CANARY must FAIL: deriveSheetShape should throw because no
    // frame ever reaches translateY <= 5px.
    let threw = false
    try {
      deriveSheetShape(trace)
    } catch (err) {
      threw = true
      const msg = (err as Error).message
      expect(
        msg,
        `fault-injection canary — broken-spring shape (translateY stuck at 150px) must trigger the "never reached <= 5px" error. Actual error: "${msg}"`,
      ).toContain('never reached <= 5px')
    }
    expect(
      threw,
      'fault-injection canary check — deriveSheetShape MUST throw on the broken-spring trace. If not, the gate is numb.',
    ).toBe(true)
  })
})
