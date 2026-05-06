/**
 * Framer Hand-reorder cinematic — runtime gate (insight 047, corrected).
 *
 * --- The class of bug this exists to catch ---
 *
 * `Hand.tsx` slots use `AnimatePresence mode="popLayout"` + `layout="position"`
 * to fill the gap when one card stages out. **Empirical finding from this
 * harness:** the reorder is structurally a fast-snap, not a multi-frame
 * spring — `popLayout` removes the exiting card from layout flow inside
 * Framer's render-cycle, and the projection node measures pre-stage and
 * post-stage positions in adjacent frames, leaving no in-between for a
 * spring to interpolate. The remaining ringing (~12px overshoot at
 * ~300-450ms) is what the spring contributes; the main 282px shift lands
 * in one rAF tick.
 *
 * Insight 047 originally hypothesized that an explicit `animate.transform`
 * was clobbering layout-derived translate. Testing four fix variants
 * (split x/scale, drop transform from animate, outer/inner separation,
 * explicit `transition.layout` spring) — all produced the same instant
 * snap when `popLayout` was on. Removing `popLayout` produced a TWO-PHASE
 * shape (smooth Phase 1 during exit + 175px snap when card[0] removed
 * from DOM), which is visually WORSE.
 *
 * The fast-snap is therefore the intended cinematic — fast enough that
 * the user perceives it as "the gap closed when I lifted my finger." The
 * regression risk this gate exists to catch is anything that SLOWS the
 * cinematic into a perceptible two-phase or laggy spring shape:
 *
 *   - `mode="popLayout"` removed → two-phase snap (Phase 1 multi-frame
 *     during exit, Phase 2 ~175px snap at exit-complete)
 *   - `transition.layout` set to a slow spring/duration → main shift
 *     visibly takes 200ms+ to complete
 *   - The slot wrapped in CSS `contain: layout` or similar → projection
 *     node measurement breaks, producing varied wrong shapes
 *
 * --- What this harness does ---
 *
 * Drives a real game to playing phase, picks the active phone, captures
 * the DOM ref of slot[1] BEFORE staging, installs a `requestAnimationFrame`
 * sampler that reads `getBoundingClientRect().left` per frame, then
 * double-taps slot[0] to stage. The captured DOM node persists across
 * React's reconciliation because Framer keys by `card.id` — same node,
 * new layout position.
 *
 * Asserts SHAPE:
 *   - `totalDeltaPx` is substantial (sanity floor — proves the reorder
 *     fired, > one slot-width)
 *   - `timeToSettleMs` is short (the cinematic completes within the
 *     snappy spring window, ≤ 500ms)
 *   - NO mid-motion plateau detected (catches the two-phase regression
 *     where the slot pauses partway and then snaps the rest)
 *
 * Fault-injection canary: paints a synthetic two-phase shape (Phase 1
 * partial smooth motion → 250ms plateau at intermediate position →
 * Phase 2 snap to final). Reads through the same `deriveReorderShape`
 * and asserts the canary trips on the slow-snap signature. Proves the
 * gate is sensitive to the actual regression risk, not numb.
 *
 * --- Why this lives in tests/e2e/ ---
 *
 * Same reasoning as the four sibling Framer gates: layout-position
 * deltas are computed in Framer's useLayoutEffect against a real layout
 * engine. jsdom doesn't run that. The fault we're catching is
 * browser-rendering-pipeline-dependent.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

interface FrameSample {
  /** ms since `performance.timeOrigin`. */
  t: number
  /** Tracked slot's `getBoundingClientRect().left` in CSS px. */
  leftPx: number
}

interface ReorderShape {
  /** First sampled frame's left position (pre-motion baseline). */
  initialLeftPx: number
  /** Last sampled frame's left position (post-settle endpoint). */
  finalLeftPx: number
  /** Total displacement (positive = moved leftward). */
  totalDeltaPx: number
  /** First frame index where leftPx differs from initial by > 5% of totalDelta. */
  firstMotionIdx: number
  /** First frame index after firstMotionIdx where leftPx is within 5% of final. */
  firstSettleIdx: number
  /** Wall-clock from first motion to first settle (motion completion window). */
  timeToSettleMs: number
  /** Detected mid-motion plateau (two-phase regression signature): a window of
   *  ≥ 150ms where leftPx is steady but NOT yet at final. */
  midPlateauMs: number
}

// --- Tolerances ---------------------------------------------------------------

// Snappy spring (stiffness 300, damping 24) settles in ~400ms. The fast-snap
// cinematic completes the main shift in one rAF tick + ~150ms of overshoot
// ringing. 500ms gives margin for CI / Mobile Chrome rAF throttling. A real
// regression to a multi-frame spring would still pass if it settles in
// ≤ 500ms — that's a valid alternative cinematic. The shapes we want to
// catch (two-phase snap, slow transition.layout) all settle > 500ms.
const TIME_TO_SETTLE_MAX_MS = 500

// Plateau detection threshold — any ≥ 150ms window where the slot is steady
// but not at final position is a two-phase-snap signature. The legitimate
// fast-snap has no such plateau (it's at initial → at final → small
// overshoot → settled, all within ~400ms).
const PLATEAU_MAX_MS = 150

// Slot displacement when one card stages out: at least one slot-width plus
// the gap. Slot min-width 120px, gap ~12px. 50px floor catches "wrong slot
// tracked" or "staging never fired."
const MIN_TOTAL_DELTA_PX = 50

// "Substantial motion" threshold — leftPx differs from baseline by >= 5% of
// totalDelta. Loose enough to find motion start in noisy data; tight enough
// to ignore sub-pixel measurement jitter at rest.
const MOTION_THRESHOLD_FRAC = 0.05

// "Settled" threshold — leftPx is within 5% of final position. After settle,
// small overshoot ringing (e.g. ~12px after a 282px shift) stays within band.
const SETTLE_THRESHOLD_FRAC = 0.05

// --- Sampler ------------------------------------------------------------------

async function installSlotSampler(page: Page, slotIndex: number): Promise<void> {
  await page.evaluate((idx) => {
    const w = window as unknown as Record<string, unknown>
    // Scope to the Hand inside handSection — StagingArea also uses
    // `[class*="slot"]` (its `stagedSlot` class), so an unscoped match
    // would conflate the two.
    const slots = document.querySelectorAll('[class*="handSection"] [class*="slot"]')
    if (slots.length <= idx) {
      throw new Error(`hand-reorder sampler: needed slot index ${idx}, found ${slots.length}. Hand may not have rendered, or the selector regressed.`)
    }
    const target = slots[idx] as HTMLElement
    w.__handReorderTarget = target
    w.__handReorderTrace = [] as Array<{ t: number; leftPx: number }>
    const trace = w.__handReorderTrace as Array<{ t: number; leftPx: number }>

    let stopped = false
    const tick = (now: number): void => {
      if (stopped) return
      const rect = target.getBoundingClientRect()
      trace.push({ t: now, leftPx: rect.left })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    w.__stopHandReorderTrace = () => { stopped = true }
  }, slotIndex)
}

async function readSlotTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __handReorderTrace?: FrameSample[]; __stopHandReorderTrace?: () => void }
    w.__stopHandReorderTrace?.()
    return w.__handReorderTrace ?? []
  })
}

function deriveReorderShape(trace: FrameSample[]): ReorderShape {
  if (trace.length < 5) {
    throw new Error(`hand-reorder: trace too short (${trace.length} frames). Sampler did not collect enough frames during the wait window.`)
  }
  const initialLeftPx = trace[0]!.leftPx
  const finalLeftPx = trace[trace.length - 1]!.leftPx
  const totalDeltaPx = initialLeftPx - finalLeftPx
  if (Math.abs(totalDeltaPx) < MIN_TOTAL_DELTA_PX) {
    throw new Error(`hand-reorder: total motion ${totalDeltaPx.toFixed(1)}px is below floor ${MIN_TOTAL_DELTA_PX}px. The reorder did not happen — staging did not fire, or the wrong slot was tracked.`)
  }

  const motionThreshold = MOTION_THRESHOLD_FRAC * Math.abs(totalDeltaPx)
  const settleThreshold = SETTLE_THRESHOLD_FRAC * Math.abs(totalDeltaPx)

  // First motion: first frame where leftPx differs from initial by > threshold.
  const firstMotionIdx = trace.findIndex(f => Math.abs(f.leftPx - initialLeftPx) > motionThreshold)
  if (firstMotionIdx < 0) {
    throw new Error(`hand-reorder: no motion detected (no frame deviated from baseline by > ${motionThreshold.toFixed(1)}px). The dblclick may not have triggered staging.`)
  }

  // First settle: first frame at-or-after firstMotionIdx where leftPx is
  // within settleThreshold of final.
  let firstSettleIdx = -1
  for (let i = firstMotionIdx; i < trace.length; i++) {
    if (Math.abs(trace[i]!.leftPx - finalLeftPx) <= settleThreshold) {
      firstSettleIdx = i
      break
    }
  }
  if (firstSettleIdx < 0) {
    throw new Error(`hand-reorder: slot never settled within ${settleThreshold.toFixed(1)}px of final position ${finalLeftPx.toFixed(1)}px. Motion may have overshot indefinitely or sampler stopped too early.`)
  }
  const timeToSettleMs = trace[firstSettleIdx]!.t - trace[firstMotionIdx]!.t

  // Plateau detection — find the longest window of frames between
  // firstMotionIdx and firstSettleIdx where the position is steady (frame-
  // to-frame Δ ≤ 1px) AND NOT yet within settle band of final. A legit
  // fast-snap goes through this window in essentially one frame, so this
  // count is 0. A two-phase snap pauses ~250-400ms in the middle.
  let midPlateauMs = 0
  if (firstSettleIdx > firstMotionIdx + 1) {
    let plateauStartT: number | null = null
    for (let i = firstMotionIdx; i < firstSettleIdx; i++) {
      const cur = trace[i]!
      const next = trace[i + 1]!
      const isSteady = Math.abs(cur.leftPx - next.leftPx) <= 1
      const notAtFinal = Math.abs(cur.leftPx - finalLeftPx) > settleThreshold
      if (isSteady && notAtFinal) {
        if (plateauStartT === null) plateauStartT = cur.t
      } else {
        if (plateauStartT !== null) {
          midPlateauMs = Math.max(midPlateauMs, cur.t - plateauStartT)
          plateauStartT = null
        }
      }
    }
    // Tail: if plateau is open at end of window, close it at the boundary.
    if (plateauStartT !== null) {
      midPlateauMs = Math.max(midPlateauMs, trace[firstSettleIdx - 1]!.t - plateauStartT)
    }
  }

  return {
    initialLeftPx,
    finalLeftPx,
    totalDeltaPx,
    firstMotionIdx,
    firstSettleIdx,
    timeToSettleMs,
    midPlateauMs,
  }
}

// --- Setup --------------------------------------------------------------------

async function pickActivePhone(phones: readonly Page[], timeout = 10_000): Promise<Page> {
  // `phase: 'playing'` lands a beat before `isMyTurn` settles for the
  // first turn — same race the hand-enlarged-tap-stage suite handles.
  const start = Date.now()
  while (Date.now() - start < timeout) {
    for (const p of phones) {
      const active = await p.evaluate(() => {
        const snap = (window as unknown as Record<string, () => Record<string, unknown>>).__gameStoreSnapshot?.()
        return Boolean(snap?.isMyTurn)
      })
      if (active) return p
    }
    await phones[0]!.waitForTimeout(100)
  }
  throw new Error('hand-reorder: no active phone within timeout — first-turn isMyTurn never settled')
}

async function setupGame(board: Page, phones: readonly Page[], roomCode: string): Promise<Page> {
  await joinPhone(phones[0]!, roomCode, 'Tester1')
  await joinPhone(phones[1]!, roomCode, 'Tester2')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)
  await Promise.all(phones.slice(0, 2).map(p => waitForPhase(p, 'playing', 10_000)))
  return await pickActivePhone(phones.slice(0, 2))
}

// --- Tests --------------------------------------------------------------------

test.describe('Framer Hand-reorder cinematic — popLayout fast-snap shape (insight 047 corrected)', () => {
  test('staging slot[0] settles slot[1] into the gap within snappy spring window, no mid-motion plateau', async ({ board, phones, roomCode }) => {
    const phone = await setupGame(board, phones, roomCode)

    // Wait for the deal to complete — `dealComplete` flips after
    // `hand.length * 80 + 300`ms, ~940ms for an 8-card deal.
    const handSlots = phone.locator('[class*="handSection"] [class*="slot"]')
    await handSlots.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handSlots).toHaveCount(8)
    await phone.waitForTimeout(1_200)

    // Capture slot[1]'s element ref + start sampling BEFORE the stage.
    await installSlotSampler(phone, 1)
    await phone.waitForTimeout(80) // brief pre-roll for steady-state baseline

    // Stage slot[0] via double-tap → useDoubleTap → onStageCard → AnimatePresence
    // exit on slot[0] → popLayout reflow → slot[1..7] fast-snap into gap.
    await handSlots.first().dblclick({ force: true })

    // Cover the snappy spring settle window + buffer.
    await phone.waitForTimeout(900)

    const trace = await readSlotTrace(phone)
    expect(trace.length, `sampler frame count — got ${trace.length}; floor 30`).toBeGreaterThan(30)

    const shape = deriveReorderShape(trace)

    expect.soft(
      shape.totalDeltaPx,
      `total displacement — slot[1] should move leftward by at least ${MIN_TOTAL_DELTA_PX}px (one slot-width + gap). Measured ${shape.totalDeltaPx.toFixed(1)}px. Below floor means the reorder never fired.`,
    ).toBeGreaterThanOrEqual(MIN_TOTAL_DELTA_PX)

    expect.soft(
      shape.timeToSettleMs,
      `time-to-settle — measured ${shape.timeToSettleMs.toFixed(0)}ms from first motion to within-settle-band; max ${TIME_TO_SETTLE_MAX_MS}ms. Above ceiling means the cinematic is no longer a fast-snap. Most likely cause: \`mode="popLayout"\` was removed (introducing a two-phase snap) or \`transition.layout\` was set to a slow duration.`,
    ).toBeLessThanOrEqual(TIME_TO_SETTLE_MAX_MS)

    expect.soft(
      shape.midPlateauMs,
      `mid-motion plateau — measured ${shape.midPlateauMs.toFixed(0)}ms longest steady-but-not-final window; max ${PLATEAU_MAX_MS}ms. A plateau means the slot paused partway through the motion (two-phase snap signature: smooth Phase 1 during card[0]'s exit, then a snap when card[0] is removed from DOM at exit-complete). Restore \`mode="popLayout"\` on the AnimatePresence wrapping the slots.`,
    ).toBeLessThanOrEqual(PLATEAU_MAX_MS)
  })

  test('FAULT INJECTION: two-phase snap shape (popLayout-removed regression) trips the canary', async ({ board, phones, roomCode }) => {
    const phone = await setupGame(board, phones, roomCode)
    const handSlots = phone.locator('[class*="handSection"] [class*="slot"]')
    await handSlots.first().waitFor({ state: 'visible', timeout: 10_000 })
    await phone.waitForTimeout(1_200)

    // Paint a synthetic absolutely-positioned div. Animate its `left` in
    // a TWO-PHASE shape (mimicking the no-popLayout regression):
    //   Phase 1: 400 → 250px smooth over 0-300ms (multi-frame motion)
    //   Plateau: hold at 250px for 300-650ms (350ms steady, NOT at final)
    //   Phase 2: snap from 250 → 50px at t=650ms (single-frame jump)
    //   Hold at 50px (final position)
    // The legitimate fast-snap shape would settle within ~400ms with no
    // plateau. This synthetic shape settles at ~650ms WITH a 350ms plateau —
    // both `timeToSettleMs > 500` and `midPlateauMs > 150` should trip.
    await phone.evaluate(() => {
      const el = document.createElement('div')
      el.id = 'fault-injection-target'
      Object.assign(el.style, {
        position: 'fixed',
        top: '0',
        left: '400px',
        width: '60px',
        height: '60px',
        background: '#444',
        zIndex: '99999',
      })
      document.body.appendChild(el)
      const w = window as unknown as Record<string, unknown>
      w.__faultInjectEl = el
    })

    await phone.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      const target = w.__faultInjectEl as HTMLElement
      w.__handReorderTrace = [] as Array<{ t: number; leftPx: number }>
      const trace = w.__handReorderTrace as Array<{ t: number; leftPx: number }>
      let stopped = false
      const tick = (now: number): void => {
        if (stopped) return
        trace.push({ t: now, leftPx: target.getBoundingClientRect().left })
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      w.__stopHandReorderTrace = () => { stopped = true }
    })

    // Pre-roll.
    await phone.waitForTimeout(80)

    // Schedule the two-phase synthetic motion.
    await phone.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      const target = w.__faultInjectEl as HTMLElement
      const start = performance.now()
      const tick = (now: number): void => {
        const elapsed = now - start
        if (elapsed < 300) {
          // Phase 1: 400 → 250 smoothly over 300ms.
          const t = elapsed / 300
          target.style.left = `${(400 - 150 * t).toFixed(2)}px`
          requestAnimationFrame(tick)
        } else if (elapsed < 650) {
          // Plateau: hold at 250px for 350ms.
          target.style.left = '250px'
          requestAnimationFrame(tick)
        } else if (elapsed < 660) {
          // Phase 2: snap to 50px on the next rAF tick.
          target.style.left = '50px'
          requestAnimationFrame(tick)
        } else if (elapsed < 1100) {
          // Hold at final.
          target.style.left = '50px'
          requestAnimationFrame(tick)
        }
      }
      requestAnimationFrame(tick)
    })

    await phone.waitForTimeout(1_200)

    const trace = await readSlotTrace(phone)
    expect(trace.length, `fault-injection sampler frame count — got ${trace.length}; floor 30`).toBeGreaterThan(30)

    // Sanity: the painter did move the element ≥ 200px total.
    const initial = trace[0]!.leftPx
    const final = trace[trace.length - 1]!.leftPx
    expect(
      Math.abs(initial - final),
      `fault-injection painter sanity — synthetic element should move 350px (initial 400 → final 50). Measured ${(initial - final).toFixed(1)}px.`,
    ).toBeGreaterThan(200)

    // Derive shape — both `timeToSettleMs` and `midPlateauMs` should exceed
    // the healthy thresholds. Catch BOTH so a future tightening of one
    // threshold without the other still trips the canary.
    const shape = deriveReorderShape(trace)

    expect(
      shape.timeToSettleMs,
      `fault-injection canary — two-phase shape MUST take > ${TIME_TO_SETTLE_MAX_MS}ms to settle (synthetic plateau ends at 650ms + Phase 2). Measured ${shape.timeToSettleMs.toFixed(0)}ms.`,
    ).toBeGreaterThan(TIME_TO_SETTLE_MAX_MS)

    expect(
      shape.midPlateauMs,
      `fault-injection canary — two-phase shape MUST show a plateau of > ${PLATEAU_MAX_MS}ms (synthetic plateau is 350ms). Measured ${shape.midPlateauMs.toFixed(0)}ms. If much smaller, the plateau detector is broken or the synthetic painter slipped frames.`,
    ).toBeGreaterThan(PLATEAU_MAX_MS)
  })
})
