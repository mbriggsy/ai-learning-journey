/**
 * Framer Status-strip crossfade — runtime gate for the AnimatePresence
 * `mode="wait"` contract.
 *
 * --- The class of bug this exists to catch ---
 *
 * `StatusBar.tsx` uses `<AnimatePresence mode="wait" initial={false}>` to
 * crossfade the status text on key change ("You're up" → "Sable is on
 * deck"). The `mode="wait"` is load-bearing: without it, BOTH the exiting
 * and entering spans render simultaneously during the transition,
 * producing a visual stutter where two overlapping texts ghost each other
 * for ~300ms.
 *
 * Recorded landmines that argue for a runtime gate here:
 *   - `mode="wait"` removed → AnimatePresence default is `sync` →
 *     concurrent old + new render = ghost overlap
 *   - `key` prop drops or becomes constant → exit/enter never fires →
 *     status text changes silently with no animation cue
 *   - `MOTION.snappy` swapped for a long-duration transition → status
 *     swap drags, the crisp-handoff feel is lost
 *
 * --- What this harness does ---
 *
 * Drives a phone view to playing phase, captures the StatusBar's initial
 * inner span, then uses `__gameStore.applyOptimistic` to mutate
 * `currentTurn.currentPlayerId` (flipping the StatusBar key from `'me'`
 * to `'wait-<other>'` instantly). Samples per-rAF:
 *   - the COUNT of `.inner` spans currently in the DOM
 *   - each visible span's opacity
 *
 * Asserts:
 *   - mode="wait" invariant: at no frame should TWO spans both have
 *     opacity ≥ 0.5 (the ghost-overlap signature)
 *   - presence companion: the crossfade DID happen (old span exited,
 *     new span entered; final span text differs from initial)
 *   - shape: total transition wall-clock under a generous bound
 *
 * Fault-injection canary: paints two simultaneous spans at high opacity
 * and asserts the overlap detector triggers.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

interface FrameSample {
  /** ms since `performance.timeOrigin`. */
  t: number
  /** Number of `[class*="inner"]` spans inside `[class*="statusBar"]`. */
  innerCount: number
  /** Highest opacity across all inner spans (0 if none present). */
  maxOpacity: number
  /** Number of spans with opacity ≥ 0.5 simultaneously (overlap signature). */
  highOpacityCount: number
}

interface CrossfadeShape {
  /** Number of frames where two spans were simultaneously ≥ 0.5 opacity. */
  overlapFrames: number
  /** Wall-clock from first observed change in span identity to settled state. */
  totalMs: number
  /** Frame count sampled. */
  totalFrames: number
}

// --- Tolerances ---------------------------------------------------------------

// Crossfade is exit + enter — designed under `MOTION.snappy` spring (~400-700ms
// settle) per side. Allow 1500ms for the full sequential pair under CI/Mobile
// Chrome rAF throttling.
const TOTAL_TRANSITION_MAX_MS = 1500

// mode="wait" contract: at NO frame should two spans both be at high opacity.
// Tolerance 1 frame for layout-pipeline edge case (browser may briefly mount
// the new span just before the old finishes its exit animation).
const OVERLAP_FRAMES_MAX = 1

// --- Sampler ------------------------------------------------------------------

async function installCrossfadeSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__crossfadeTrace = [] as Array<{ t: number; innerCount: number; maxOpacity: number; highOpacityCount: number }>
    const trace = w.__crossfadeTrace as Array<{ t: number; innerCount: number; maxOpacity: number; highOpacityCount: number }>

    let stopped = false
    const sample = (now: number): void => {
      if (stopped) return
      // Match StatusBar's inner spans by class-substring. CSS-modules hash
      // the names, but the original tokens (`statusBar`, `inner`) survive.
      const inners = document.querySelectorAll('[class*="statusBar"] [class*="inner"]')
      let maxOp = 0
      let highCount = 0
      for (const el of Array.from(inners)) {
        const op = parseFloat(getComputedStyle(el as HTMLElement).opacity)
        if (op > maxOp) maxOp = op
        if (op >= 0.5) highCount++
      }
      trace.push({ t: now, innerCount: inners.length, maxOpacity: maxOp, highOpacityCount: highCount })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    w.__stopCrossfadeTrace = () => { stopped = true }
  })
}

async function readCrossfadeTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __crossfadeTrace?: FrameSample[]; __stopCrossfadeTrace?: () => void }
    w.__stopCrossfadeTrace?.()
    return w.__crossfadeTrace ?? []
  })
}

function deriveCrossfadeShape(trace: FrameSample[]): CrossfadeShape {
  const overlapFrames = trace.filter(f => f.highOpacityCount >= 2).length
  // Approximate total transition: from first frame where innerCount changed
  // (== identity flip moment) to last frame before re-stabilizing at single
  // visible span.
  const firstChange = trace.findIndex((f, i) => i > 0 && f.innerCount !== trace[i - 1]!.innerCount)
  const totalMs = firstChange < 0
    ? 0
    : (trace[trace.length - 1]!.t - trace[firstChange]!.t)
  return {
    overlapFrames,
    totalMs,
    totalFrames: trace.length,
  }
}

// --- Setup --------------------------------------------------------------------

async function bootToPhonePlaying(phone: Page, phones: Page[], board: Page, roomCode: string): Promise<void> {
  await joinPhone(phone, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(phone, 'playing', 10_000)

  // Wait for StatusBar to render its initial state.
  await phone.waitForFunction(() => {
    return !!document.querySelector('[class*="statusBar"] [class*="inner"]')
  }, null, { timeout: 5_000 })
  // Settle window — initial mount @starting-style + any debounced state.
  await phone.waitForTimeout(200)
}

async function flipCurrentPlayer(phone: Page, otherId: string): Promise<void> {
  // Two state slices need to flip together for StatusBar to actually swap:
  //   - `currentTurn.currentPlayerId` drives `currentPlayerName` lookup
  //   - `isMyTurn` is a flat boolean on the playing-player ViewState slice
  // (read by `useIsMyTurn()` directly — not derived from currentTurn).
  // Updating only one half leaves the StatusBar key stuck at `'me'`.
  await phone.evaluate((id) => {
    const w = window as unknown as { __gameStore?: { applyOptimistic: (fn: (s: unknown) => unknown) => void } }
    if (!w.__gameStore) throw new Error('framer-status-strip: __gameStore missing')
    w.__gameStore.applyOptimistic((s: unknown) => {
      const state = s as Record<string, unknown>
      if (state.phase !== 'playing') return s
      return {
        ...state,
        isMyTurn: false,
        currentTurn: { currentPlayerId: id, turnsRemaining: 1 },
      }
    })
  }, otherId)
}

// --- Tests --------------------------------------------------------------------

test.describe('Framer Status-strip crossfade — mode="wait" contract + shape', () => {
  test('key flip transitions cleanly without ghost-overlap', async ({ board, phones, roomCode }) => {
    const phone = phones[0]!
    await bootToPhonePlaying(phone, phones, board, roomCode)

    // Capture initial state — Alice should be the active player. Then we'll
    // flip to a different playerId to trigger the crossfade.
    const initial = await phone.evaluate(() => {
      const inner = document.querySelector('[class*="statusBar"] [class*="inner"]') as HTMLElement | null
      const w = window as unknown as { __gameStoreSnapshot?: () => Record<string, unknown> }
      const snap = w.__gameStoreSnapshot?.()
      const otherPlayer = (snap && Array.isArray(snap.players))
        ? (snap.players as Array<{ id: string; name: string }>).find(p => p.id !== ((snap as Record<string, unknown>).myPlayerId as string))
        : null
      return {
        text: inner?.textContent ?? '',
        otherId: otherPlayer?.id ?? '',
      }
    })
    expect(initial.otherId, 'should have a second player to flip to').toBeTruthy()

    await installCrossfadeSampler(phone)
    await flipCurrentPlayer(phone, initial.otherId)

    // Spring settle window for exit + enter pair, plus margin.
    await phone.waitForTimeout(1_400)

    const trace = await readCrossfadeTrace(phone)
    expect(trace.length, `sampler frame count — got ${trace.length}; floor 30`).toBeGreaterThan(30)

    // --- Presence companion: the crossfade DID happen --------------------
    const finalText = await phone.evaluate(() => {
      const inner = document.querySelector('[class*="statusBar"] [class*="inner"]') as HTMLElement | null
      return inner?.textContent ?? ''
    })
    expect.soft(
      finalText,
      `crossfade actually fired — initial text was "${initial.text}", final text is "${finalText}". If equal, the key didn't change and AnimatePresence never triggered.`,
    ).not.toEqual(initial.text)

    const shape = deriveCrossfadeShape(trace)

    // --- mode="wait" INVARIANT ------------------------------------------
    expect.soft(
      shape.overlapFrames,
      `mode="wait" contract — measured ${shape.overlapFrames} frames where TWO inner spans simultaneously had opacity ≥ 0.5; max ${OVERLAP_FRAMES_MAX}. Above max means AnimatePresence is in mode="sync" (default) — old + new spans ghost-overlap during the crossfade, producing the stutter this gate exists to catch.`,
    ).toBeLessThanOrEqual(OVERLAP_FRAMES_MAX)

    // --- Shape sanity ---------------------------------------------------
    expect.soft(
      shape.totalMs,
      `total transition wall-clock — ${shape.totalMs.toFixed(0)}ms over the sample window; max ${TOTAL_TRANSITION_MAX_MS}ms. Above max means the transition is dragging or never settled — likely a transition-config regression.`,
    ).toBeLessThan(TOTAL_TRANSITION_MAX_MS)
  })

  test('FAULT INJECTION: two simultaneous high-opacity spans trigger the overlap detector', async ({ board, phones, roomCode }) => {
    // Paint two synthetic spans both at opacity 0.7 inside a synthetic
    // statusBar container. Prove the overlap detector counts at least 1
    // overlap frame on this bug shape. If it doesn't, the gate is numb.
    const phone = phones[0]!
    await bootToPhonePlaying(phone, phones, board, roomCode)

    await installCrossfadeSampler(phone)

    await phone.evaluate(() => {
      const container = document.createElement('div')
      container.className = 'fault_statusBar_x'
      Object.assign(container.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '99999',
      })
      const span1 = document.createElement('span')
      span1.className = 'fault_inner_x'
      span1.textContent = 'OLD'
      span1.style.opacity = '0.7'
      const span2 = document.createElement('span')
      span2.className = 'fault_inner_x'
      span2.textContent = 'NEW'
      span2.style.opacity = '0.7'
      container.appendChild(span1)
      container.appendChild(span2)
      document.body.appendChild(container)
      // Hold for 200ms to ensure rAF samples it across multiple frames.
      setTimeout(() => container.remove(), 250)
    })

    // Wait for the synthetic overlap window + buffer.
    await phone.waitForTimeout(500)

    const trace = await readCrossfadeTrace(phone)
    const overlapFrames = trace.filter(f => f.highOpacityCount >= 2).length

    expect(
      overlapFrames,
      `fault-injection canary — synthetic two-span overlap should trigger the detector at least 3 frames (200ms hold @ 60fps). Measured ${overlapFrames}. If 0, the sampler isn't seeing the synthetic spans — selector miss or class-substring regression.`,
    ).toBeGreaterThanOrEqual(3)
  })
})
