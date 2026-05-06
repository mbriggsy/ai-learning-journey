/**
 * Framer Nameplate rotateY coin-flip — runtime gate (insight 014).
 *
 * --- The class of bug this exists to catch ---
 *
 * `Nameplate.tsx` flips the brass plate 180° around its vertical center on
 * subject change (new active player, new pending prompt). The cinematic is
 * a physical coin-flip: old plate exits via `rotateY 0 → -90deg, opacity
 * 1 → 0`; new plate enters via `rotateY 90 → 0deg, opacity 0 → 1`. The
 * `mode="wait"` AnimatePresence ensures exit completes before enter starts.
 *
 * Insight 014 (`docs/insights/014-backface-visibility-unreliable-in-chrome.md`)
 * documented that `backface-visibility: hidden` is unreliable in Chrome —
 * the compositor optimizes `rotateY(0deg)` to a 2D identity matrix, and
 * once collapsed there's no 3D context for backface culling to operate
 * against. The fix is opacity-crossfade-at-the-edge-on-midpoint: render
 * both faces continuously, fade opacity through 0 at `rotateY ≈ ±90°`.
 *
 * The current Nameplate code DOES use this pattern (opacity 0 ↔ 1 across
 * the rotation). The regression risk is a future "cleanup" that drops
 * opacity from the animation thinking 3D backface culling will handle it.
 * On Chrome, the back face of the plate would flash visible at edge-on
 * (visibly mirrored / inside-out text). This gate makes that regression
 * fail loudly.
 *
 * Failure modes worth catching at runtime:
 *   - Opacity removed from `initial` / `animate` / `exit` (insight 014's
 *     bug — back face flashes at edge-on)
 *   - `mode="wait"` removed → both plates render simultaneously (status-
 *     strip-style ghost overlap, but on a 3D surface)
 *   - `rotateY` magnitudes shrunk so the rotation never crosses edge-on
 *     (e.g. `rotateY(45deg)` shake instead of full coin-flip — reads as
 *     a flinch, not a handoff)
 *   - `transform` shorthand (`rotateY: 90` motion value) used instead of
 *     transform string — the comment in Nameplate.tsx warns of hardware-
 *     acceleration drift; this gate would catch a regression where the
 *     rotation runs slow / janky
 *
 * --- What this harness does ---
 *
 * Drives a real game to playing phase, captures the initial active
 * player, installs a per-rAF sampler on the `plateContent` element that
 * reads computed transform (parsing rotateY angle from `matrix3d(...)`)
 * and opacity, then uses `__gameStore.applyOptimistic` to flip
 * `currentTurn.currentPlayerId` to the other player. AnimatePresence
 * `mode="wait"` runs exit (rotateY 0 → -90, opacity 1 → 0), unmounts the
 * old plate, mounts the new plate, runs enter (rotateY 90 → 0, opacity
 * 0 → 1).
 *
 * Asserts the EDGE-ON OPACITY INVARIANT: across all sampled frames where
 * `|rotateY|` is in the edge-on band (80° to 100°), the maximum observed
 * opacity must be ≤ 0.3. That's the insight 014 contract — the back face
 * of the plate must be hidden at edge-on, achieved via opacity (NOT via
 * `backface-visibility` which is unreliable on Chrome).
 *
 * Fault-injection canary: paints a synthetic plateContent stuck at
 * `rotateY(90deg)` with opacity 1 (the broken-cleanup shape). Reads
 * through the same `deriveRotateYShape` and asserts the opacity-at-
 * edge-on assertion trips. Sensitivity proven without altering the real
 * Nameplate code.
 *
 * --- Why this lives in tests/e2e/ ---
 *
 * Same reasoning as the four sibling Framer gates: parsing rotateY from
 * a real `matrix3d(...)` computed style requires Chrome's actual
 * compositor. jsdom doesn't run 3D transforms.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

interface FrameSample {
  /** ms since `performance.timeOrigin`. */
  t: number
  /** rotateY in degrees, parsed from `matrix3d(...)`. NaN when no plate present. */
  rotateYDeg: number
  /** Opacity of the plate. 0 when no plate present. */
  opacity: number
}

interface RotateYShape {
  /** Frame count sampled. */
  totalFrames: number
  /** Number of frames where |rotateY| ∈ [80°, 100°] (edge-on band). */
  edgeOnFrames: number
  /** Max opacity observed across the edge-on band (the insight 014 invariant). */
  maxOpacityAtEdgeOn: number
  /** Was a settled state (rotateY ≈ 0, opacity ≈ 1) reached after the flip? */
  reachedSettled: boolean
}

// --- Tolerances ---------------------------------------------------------------

// At edge-on (rotateY ≈ ±90°), the plate is visually flat. Opacity should
// have crossed near-0 by this point (or be ramping back from 0). 0.3 floor
// catches the cleanup-removed-opacity bug while tolerating slight ease-curve
// imperfection at the band boundaries.
const EDGE_ON_OPACITY_MAX = 0.3

// Edge-on band — the angle range where backface culling would normally be
// taking over. ±10° tolerance so the band has enough rAF frames to populate
// even at 30fps Mobile Chrome.
const EDGE_ON_LOW_DEG = 80
const EDGE_ON_HIGH_DEG = 100

// Sanity floor — the test must observe AT LEAST this many edge-on frames
// across both exit and enter halves of the cinematic. At MOTION_DURATIONS.slow
// (400ms) per half, the rotation passes through ±10° band over ~22ms (at
// emphasized cubic-bezier the velocity at boundaries is moderate). So 1-2
// frames per half at 30fps is realistic. Floor of 2 leaves margin without
// being trivially satisfied.
const EDGE_ON_FRAMES_FLOOR = 2

// --- Sampler ------------------------------------------------------------------

async function installNameplateSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    w.__nameplateTrace = [] as Array<{ t: number; rotateYDeg: number; opacity: number }>
    const trace = w.__nameplateTrace as Array<{ t: number; rotateYDeg: number; opacity: number }>

    const findPlateContent = (): HTMLElement | null =>
      document.querySelector('[class*="plateContent"]') as HTMLElement | null

    /**
     * Parse rotateY in degrees from a CSS computed transform string.
     *
     * Pure rotateY produces:
     *   matrix3d(cos, 0, -sin, 0,  0, 1, 0, 0,  sin, 0, cos, 0,  0, 0, 0, 1)
     *
     * Index 0 = cos(angle), Index 8 = sin(angle).
     *
     * Edge cases:
     *   - `none` — no transform applied yet (initial mount before Framer).
     *     rotateY = 0 (treat as settled).
     *   - 2D `matrix(...)` — Chrome collapsed rotateY(0) to identity.
     *     rotateY = 0.
     *   - `matrix3d(...)` — full 3D, parse cos/sin.
     *
     * The Nameplate animates rotateY ∈ [-90°, +90°], never hitting 180°
     * (which would also collapse to a 2D matrix). So treating 2D as
     * angle 0 is safe.
     */
    const parseRotateYDeg = (transform: string): number => {
      if (transform === 'none' || transform === '') return 0
      const m3d = transform.match(/^matrix3d\(([^)]+)\)$/)
      if (m3d?.[1]) {
        const parts = m3d[1].split(',').map(s => parseFloat(s.trim()))
        const cosA = parts[0] ?? 1
        const sinA = parts[8] ?? 0
        return Math.atan2(sinA, cosA) * (180 / Math.PI)
      }
      // 2D `matrix(...)` — collapsed identity, rotateY ≈ 0.
      const m2d = transform.match(/^matrix\(([^)]+)\)$/)
      if (m2d) return 0
      return Number.NaN
    }

    let stopped = false
    const sample = (now: number): void => {
      if (stopped) return
      const el = findPlateContent()
      if (el) {
        const cs = getComputedStyle(el)
        trace.push({
          t: now,
          rotateYDeg: parseRotateYDeg(cs.transform),
          opacity: parseFloat(cs.opacity) || 0,
        })
      } else {
        trace.push({ t: now, rotateYDeg: Number.NaN, opacity: 0 })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    w.__stopNameplateTrace = () => { stopped = true }
  })
}

async function readNameplateTrace(page: Page): Promise<FrameSample[]> {
  return await page.evaluate(() => {
    const w = window as unknown as { __nameplateTrace?: FrameSample[]; __stopNameplateTrace?: () => void }
    w.__stopNameplateTrace?.()
    return w.__nameplateTrace ?? []
  })
}

function deriveRotateYShape(trace: FrameSample[]): RotateYShape {
  const finite = trace.filter(f => Number.isFinite(f.rotateYDeg))
  if (finite.length < 5) {
    throw new Error(`framer-nameplate: trace too short (${finite.length} frames with finite rotateY). Sampler did not catch the flip — likely the plateContent selector missed or the flip never fired.`)
  }
  const edgeOnFrames = finite.filter(f => {
    const abs = Math.abs(f.rotateYDeg)
    return abs >= EDGE_ON_LOW_DEG && abs <= EDGE_ON_HIGH_DEG
  })
  const maxOpacityAtEdgeOn = edgeOnFrames.length > 0
    ? Math.max(...edgeOnFrames.map(f => f.opacity))
    : 0
  // Settled = at least one frame where rotateY ≈ 0 AND opacity ≈ 1.
  // Use lax tolerances since the spring ease-curve approaches asymptotically.
  const reachedSettled = finite.some(f =>
    Math.abs(f.rotateYDeg) < 10 && f.opacity > 0.9,
  )
  return {
    totalFrames: trace.length,
    edgeOnFrames: edgeOnFrames.length,
    maxOpacityAtEdgeOn,
    reachedSettled,
  }
}

// --- Setup --------------------------------------------------------------------

async function bootBoardToPlaying(board: Page, phones: Page[], roomCode: string): Promise<void> {
  await joinPhone(phones[0]!, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)
  // Wait for the initial Nameplate to mount + settle.
  await board.waitForFunction(() => {
    return !!document.querySelector('[class*="plateContent"]')
  }, null, { timeout: 5_000 })
  await board.waitForTimeout(500) // settle window past initial-flip-from-standby
}

async function flipCurrentPlayer(board: Page, otherId: string): Promise<void> {
  // Nameplate's key is composed of `turn:${currentPlayerId}` — flipping
  // `currentTurn.currentPlayerId` is sufficient to trigger the rotateY
  // coin-flip via AnimatePresence. The board's gameStore is per-page so
  // this only affects the board view (no phone-side races).
  await board.evaluate((id) => {
    const w = window as unknown as { __gameStore?: { applyOptimistic: (fn: (s: unknown) => unknown) => void } }
    if (!w.__gameStore) throw new Error('framer-nameplate: __gameStore missing on board page')
    w.__gameStore.applyOptimistic((s: unknown) => {
      const state = s as Record<string, unknown>
      if (state.phase !== 'playing') return s
      return {
        ...state,
        currentTurn: { currentPlayerId: id, turnsRemaining: 1 },
      }
    })
  }, otherId)
}

// --- Tests --------------------------------------------------------------------

test.describe('Framer Nameplate rotateY coin-flip — opacity-at-edge-on contract (insight 014)', () => {
  test('key flip rotates 180° with opacity ≤ 0.3 across the edge-on band', async ({ board, phones, roomCode }) => {
    await bootBoardToPlaying(board, phones, roomCode)

    // Capture players + initial active id. Flip to the other player.
    const initial = await board.evaluate(() => {
      const w = window as unknown as { __gameStoreSnapshot?: () => Record<string, unknown> }
      const snap = w.__gameStoreSnapshot?.() ?? {}
      const players = (Array.isArray(snap.players) ? snap.players : []) as Array<{ id: string; name: string }>
      const currentTurn = snap.currentTurn as { currentPlayerId: string } | null
      const currentId = currentTurn?.currentPlayerId ?? null
      const other = players.find(p => p.id !== currentId)
      return {
        currentId,
        otherId: other?.id ?? '',
        plateText: (document.querySelector('[class*="plateContent"]')?.textContent ?? '').trim(),
      }
    })
    expect(initial.currentId, 'should have a current active player').toBeTruthy()
    expect(initial.otherId, 'should have a second player to flip to').toBeTruthy()

    await installNameplateSampler(board)
    await board.waitForTimeout(80) // pre-roll baseline

    await flipCurrentPlayer(board, initial.otherId)

    // Cinematic: exit (rotateY 0 → -90, ~400ms) + enter (rotateY 90 → 0,
    // ~400ms) under MOTION_DURATIONS.slow + emphasized ease. Wait 1500ms
    // for full sequence + buffer.
    await board.waitForTimeout(1_500)

    const trace = await readNameplateTrace(board)
    expect(trace.length, `sampler frame count — got ${trace.length}; floor 30`).toBeGreaterThan(30)

    // Presence companion: the plate text DID swap (proves the flip fired).
    const finalText = await board.evaluate(() => {
      return (document.querySelector('[class*="plateContent"]')?.textContent ?? '').trim()
    })
    expect.soft(
      finalText,
      `flip actually fired — initial plate text was "${initial.plateText}", final text is "${finalText}". If equal, the key didn't change and AnimatePresence never triggered.`,
    ).not.toEqual(initial.plateText)

    const shape = deriveRotateYShape(trace)

    expect.soft(
      shape.edgeOnFrames,
      `edge-on band coverage — measured ${shape.edgeOnFrames} frames where |rotateY| ∈ [${EDGE_ON_LOW_DEG}°, ${EDGE_ON_HIGH_DEG}°]; floor ${EDGE_ON_FRAMES_FLOOR}. Below floor means the rotation never crossed the edge-on band — likely the rotateY magnitudes were shrunk below ±90° (e.g. a 45° shake instead of a full coin-flip).`,
    ).toBeGreaterThanOrEqual(EDGE_ON_FRAMES_FLOOR)

    expect.soft(
      shape.maxOpacityAtEdgeOn,
      `edge-on opacity invariant (insight 014) — max opacity across edge-on band was ${shape.maxOpacityAtEdgeOn.toFixed(2)}; max ${EDGE_ON_OPACITY_MAX}. Above max means the back face of the plate is visible at edge-on. Most likely cause: opacity was removed from \`initial\` / \`animate\` / \`exit\` on the relying-on-\`backface-visibility:hidden\`. Chrome's compositor collapses identity-resolving 3D transforms to 2D, breaking backface culling. Restore opacity 0 ↔ 1 alongside the rotateY.`,
    ).toBeLessThanOrEqual(EDGE_ON_OPACITY_MAX)

    expect.soft(
      shape.reachedSettled,
      `final-settle sanity — after the flip, at least one sampled frame should show rotateY ≈ 0° AND opacity > 0.9. Reached: ${shape.reachedSettled}. If false, the new plate never settled (transition dragging or AnimatePresence misconfigured).`,
    ).toBe(true)
  })

  test('FAULT INJECTION: synthetic plate stuck at rotateY 90° with opacity 1 trips the canary', async ({ board, phones, roomCode }) => {
    // Don't even need to be in playing phase, but do the boot for parity
    // with the real test (and because the gameStore hooks expect it).
    await bootBoardToPlaying(board, phones, roomCode)

    // Paint a synthetic element with a UNIQUE class (not "plateContent")
    // so the production sampler (which queries `[class*="plateContent"]`)
    // doesn't pick it up — we want the fault-injection sampler to target
    // ONLY the synthetic so the bug shape isn't diluted by the real
    // settled plate.
    await board.evaluate(() => {
      const el = document.createElement('div')
      el.id = 'fault-nameplate-target'
      Object.assign(el.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '99999',
        width: '200px',
        height: '50px',
        background: '#444',
        color: '#fff',
        opacity: '1',
        // rotateY(90deg): cos=0, sin=1 → matrix3d index 0=0, index 8=1.
        transform: 'matrix3d(0, 0, -1, 0,  0, 1, 0, 0,  1, 0, 0, 0,  0, 0, 0, 1)',
      })
      el.textContent = 'FAULT'
      document.body.appendChild(el)
    })

    // Custom sampler scoped to the synthetic — bypasses installNameplateSampler
    // so we can prove deriveRotateYShape catches the bug shape regardless of
    // which DOM node was sampled.
    await board.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      const target = document.getElementById('fault-nameplate-target') as HTMLElement | null
      if (!target) throw new Error('framer-nameplate fault-inject: synthetic target not in DOM')
      w.__nameplateTrace = [] as Array<{ t: number; rotateYDeg: number; opacity: number }>
      const trace = w.__nameplateTrace as Array<{ t: number; rotateYDeg: number; opacity: number }>

      const parseRotateYDeg = (transform: string): number => {
        if (transform === 'none' || transform === '') return 0
        const m3d = transform.match(/^matrix3d\(([^)]+)\)$/)
        if (m3d?.[1]) {
          const parts = m3d[1].split(',').map(s => parseFloat(s.trim()))
          const cosA = parts[0] ?? 1
          const sinA = parts[8] ?? 0
          return Math.atan2(sinA, cosA) * (180 / Math.PI)
        }
        if (/^matrix\(/.test(transform)) return 0
        return Number.NaN
      }

      let stopped = false
      const sample = (now: number): void => {
        if (stopped) return
        const cs = getComputedStyle(target)
        trace.push({
          t: now,
          rotateYDeg: parseRotateYDeg(cs.transform),
          opacity: parseFloat(cs.opacity) || 0,
        })
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
      w.__stopNameplateTrace = () => { stopped = true }
    })

    // Sample the synthetic for ~700ms — well past any rAF throttling concerns.
    await board.waitForTimeout(700)

    const trace = await readNameplateTrace(board)
    expect(trace.length, `fault-injection sampler frame count — got ${trace.length}; floor 15`).toBeGreaterThan(15)

    const shape = deriveRotateYShape(trace)

    // Sanity: the painter put the synthetic at edge-on. Many frames in the
    // band, NOT just one or two.
    expect(
      shape.edgeOnFrames,
      `fault-injection painter check — synthetic plate should have been sampled at edge-on for many frames. Measured ${shape.edgeOnFrames} edge-on frames out of ${trace.length} total. If much smaller, the synthetic transform parsed wrong.`,
    ).toBeGreaterThanOrEqual(10)

    // Canary: opacity at edge-on must be > the healthy ceiling. The synthetic
    // is opacity 1, which obviously fails the 0.3 cap. If this test ever
    // passes the healthy bound, the gate has gone numb.
    expect(
      shape.maxOpacityAtEdgeOn,
      `fault-injection canary — synthetic plate at opacity 1 / rotateY 90° MUST trip the edge-on opacity cap. Measured ${shape.maxOpacityAtEdgeOn.toFixed(2)}.`,
    ).toBeGreaterThan(EDGE_ON_OPACITY_MAX)
  })
})
