/**
 * Arena state screenshot harness.
 *
 * Drives a real 3-player game to playing phase, then forces each
 * mid-play UI state via the test dev hooks (__testInjectEvent for
 * DramaOverlay variants, __gameStore.applyOptimistic for pending-
 * prompt sheets/banners). Screenshots each state to temp/arena-states/
 * for eyeball review — NOT a regression test (no assertions).
 *
 * Why this exists. Mid-play states are the surfaces most likely to
 * harbor visual defects (sheet positioning, drama overlay against the
 * arena backdrop, sub-state of the smart action box). Forcing each in
 * isolation, on a clean game, surfaces composition problems that
 * normal play wouldn't reach in any single playtest. The screenshots
 * are also useful evidence for visual-regression discussions and as
 * shareable references for design reviews.
 *
 * First batch (this file at landing time):
 *   - board/00-baseline-playing.png         (just-started game on board)
 *   - phone/00-baseline-playing.png         (just-started game on drawer phone)
 *   - board/01-drama-intercepted.png        (DramaOverlay text — INTERCEPTED transient)
 *   - phone/01-drama-burned.png             (DramaOverlay card flip — BURNED on drawer phone)
 *   - phone/02-defuse-placement.png         (DefusePlacement sheet — uses the new burned card art)
 *
 * Output paths and ordering chosen so future expansion (Nope window,
 * ELIMINATED, WINS, NameCard, FavorBanner, FuturePeek, etc.) can
 * append numerically without renumbering existing artifacts.
 *
 * Single-project gate. The screenshot output is deterministic across
 * project runs (the fixture pins board to 1920x1080 and phones to
 * iPhone 13 regardless of the surrounding `--project` flag), so we
 * skip non-chromium runs to avoid 3x screenshot overwrites for
 * identical content.
 */

import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import type { Page } from '@playwright/test'

const OUTPUT_DIR = 'temp/arena-states'

async function bootGameToPlaying(board: Page, phones: Page[], roomCode: string): Promise<void> {
  await joinPhone(phones[0]!, roomCode, 'Alice')
  await joinPhone(phones[1]!, roomCode, 'Bob')
  await joinPhone(phones[2]!, roomCode, 'Carol')
  await waitForPlayerCount(board, 3)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)

  // Settle window — wait for board overlays to mount (DramaOverlay's
  // [role="status"] node) and for the lazy DramaOverlay chunk to land
  // on the phone view.
  await board.waitForFunction(() => !!document.querySelector('[role="status"]'))
  await phones[0]!.waitForFunction(() => !!document.querySelector('[role="status"]'), null, { timeout: 5_000 })
  await board.waitForTimeout(300)
  await phones[0]!.waitForTimeout(100)
}

async function injectEvent(page: Page, event: unknown): Promise<void> {
  await page.evaluate((evt) => {
    const w = window as unknown as { __testInjectEvent?: (e: unknown) => void }
    if (!w.__testInjectEvent) throw new Error('arena-states: __testInjectEvent missing — DEV/test mode required')
    w.__testInjectEvent(evt)
  }, event)
}

async function getPlayerId(page: Page): Promise<string> {
  const id = await page.evaluate(() => {
    const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
    if (!w.__gameStore) throw new Error('arena-states: __gameStore missing — DEV/test mode required')
    return w.__gameStore.getPlayerId()
  })
  expect(id, 'phone should have a playerId after join').toBeTruthy()
  return id!
}

test.describe('arena state screenshots', () => {
  test('first batch — baselines + drama variants + defuse', async ({ board, phones, roomCode }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Single-project screenshot harness')
    test.setTimeout(60_000)
    await bootGameToPlaying(board, phones, roomCode)

    // --- Baseline: just-started playing phase ---------------------------------

    await board.screenshot({ path: `${OUTPUT_DIR}/board/00-baseline-playing.png` })
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/00-baseline-playing.png` })

    // --- State 1: DramaOverlay INTERCEPTED transient (board) -----------------
    //
    // Text-variant beat — peak ~1400ms designed; capture mid-peak. The
    // synthetic event uses an arbitrary playerId because DramaOverlay's
    // text variants don't render the player's name in the INTERCEPTED
    // overlay (just the action label).

    await injectEvent(board, { type: 'nope-played', playerId: 'p-ext', chainDepth: 1 })
    // Enter (~250ms) + half of the 1400ms hold = capture at ~950ms in
    await board.waitForTimeout(950)
    await board.screenshot({ path: `${OUTPUT_DIR}/board/01-drama-intercepted.png` })
    // Wait for beat to fully clear before next forcing
    await board.waitForTimeout(1200)

    // --- State 2: DramaOverlay BURNED card-flip (drawer phone) ---------------
    //
    // Drawer-only branch fires when myPlayerId === event.playerId. The
    // Burned card MinimalCard fills the screen for 2400ms — the longest
    // dramatic hold in the game and the variant whose original 2026-04-22
    // GSAP-clip bug was visible to Briggsy as the "camera flash" beat.
    // This screenshot captures the card-flip cinematic at peak (after
    // face-down pause + flip rotation).

    const drawerId = await getPlayerId(phones[0]!)
    await injectEvent(phones[0]!, { type: 'burned-drawn', playerId: drawerId })
    // Enter (~400ms) + face-down pause (~300ms) + flip (~500ms) = ~1200ms
    // in. Capture mid-hold to land squarely on the face-up Burned card.
    await phones[0]!.waitForTimeout(1500)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/01-drama-burned.png` })
    // Wait for beat to fully clear (total ~3700ms; we've already burned
    // 1500ms of it)
    await phones[0]!.waitForTimeout(2400)

    // --- State 3: DefusePlacement sheet (drawer phone) -----------------------
    //
    // Forces the sheet by writing pendingPrompt directly via
    // applyOptimistic. The sheet renders with the new Burned card at
    // hero size — closes the loop with this morning's regen work.

    await phones[0]!.evaluate((id) => {
      const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void } }
      if (!w.__gameStore) throw new Error('arena-states: __gameStore missing on phone')
      w.__gameStore.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        pendingPrompt: { type: 'defuse', playerId: id },
      }))
    }, drawerId)
    // BottomSheet enter spring settles in ~400-700ms; pad to 900ms
    await phones[0]!.waitForTimeout(900)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/02-defuse-placement.png` })
  })
})
