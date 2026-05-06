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
 * State manifest:
 *   - board/00-baseline-playing.png         Just-started game on board
 *   - phone/00-baseline-playing.png         Just-started game on drawer phone
 *   - board/01-drama-intercepted.png        DramaOverlay text — INTERCEPTED transient
 *   - phone/01-drama-burned.png             DramaOverlay card flip — BURNED on drawer phone
 *   - phone/02-defuse-placement.png         DefusePlacement sheet — uses the new burned card art
 *   - phone/03-name-card.png                NameCard sheet — triple-steal target picker
 *   - phone/04-favor-banner.png             FavorBanner — pending favor-response on target phone
 *   - board/02-drama-eliminated.png         DramaOverlay text — player-eliminated peak
 *   - board/03-drama-wins.png               DramaOverlay text — game-over WINS (LAST: unmounts host)
 *
 * Numbered prefixes give stable ordering. Future states (Nope window
 * mid-countdown, FuturePeek read-only + rearrange) can append without
 * renumbering existing artifacts.
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

async function setPendingPrompt(page: Page, prompt: Record<string, unknown> | null): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void; clearOptimistic: () => void } }
    if (!w.__gameStore) throw new Error('arena-states: __gameStore missing')
    if (p === null) {
      w.__gameStore.clearOptimistic()
    } else {
      w.__gameStore.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        pendingPrompt: p,
      }))
    }
  }, prompt)
}

async function expectOverlayText(page: Page, text: string): Promise<void> {
  // Polls the [role="status"] overlay for the expected text (DramaOverlay
  // is mounted in DOM throughout — only its content swaps per beat).
  await page.waitForFunction(
    (expected) => {
      const overlay = document.querySelector('[role="status"]')
      return !!overlay && overlay.textContent?.includes(expected) === true
    },
    text,
    { timeout: 2_000 },
  )
}

async function expectDialogWithText(page: Page, text: string): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const dlg = document.querySelector('dialog[open]')
      return !!dlg && dlg.textContent?.includes(expected) === true
    },
    text,
    { timeout: 2_000 },
  )
}

test.describe('arena state screenshots', () => {
  test('captures live mid-play UI states', async ({ board, phones, roomCode }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Single-project screenshot harness')
    test.setTimeout(90_000)
    await bootGameToPlaying(board, phones, roomCode)

    // Capture player ids up front — we need targetIds for NameCard +
    // FavorBanner priming.
    const aliceId = await getPlayerId(phones[0]!)
    const bobId   = await getPlayerId(phones[1]!)

    // --- Baseline: just-started playing phase ---------------------------------

    await board.screenshot({ path: `${OUTPUT_DIR}/board/00-baseline-playing.png` })
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/00-baseline-playing.png` })

    // --- State 1: DramaOverlay INTERCEPTED transient (board) -----------------

    await injectEvent(board, { type: 'nope-played', playerId: 'p-ext', chainDepth: 1 })
    await expectOverlayText(board, 'INTERCEPTED')
    // Enter (~250ms) + half of the 1400ms hold = capture at ~950ms in
    await board.waitForTimeout(700) // expectOverlayText absorbs ~enter, then hold mid-peak
    await board.screenshot({ path: `${OUTPUT_DIR}/board/01-drama-intercepted.png` })
    await board.waitForTimeout(1200) // let beat clear

    // --- State 2: DramaOverlay BURNED card-flip (drawer phone) ---------------
    //
    // Drawer-only branch fires when myPlayerId === event.playerId. Burned
    // card MinimalCard fills the screen for 2400ms — the longest dramatic
    // hold in the game and the variant whose original 2026-04-22 GSAP-clip
    // bug was visible to Briggsy as the "camera flash" beat.

    await injectEvent(phones[0]!, { type: 'burned-drawn', playerId: aliceId })
    // Enter (~400ms) + face-down pause (~300ms) + flip (~500ms) = ~1200ms
    // in. Capture mid-hold to land squarely on the face-up Burned card.
    await phones[0]!.waitForTimeout(1500)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/01-drama-burned.png` })
    await phones[0]!.waitForTimeout(2400) // let beat fully clear

    // --- State 3: DefusePlacement sheet (drawer phone) -----------------------

    await setPendingPrompt(phones[0]!, { type: 'defuse', playerId: aliceId })
    await expectDialogWithText(phones[0]!, 'Hide the Burned Card')
    await phones[0]!.waitForTimeout(500) // BottomSheet spring settle
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/02-defuse-placement.png` })

    // --- State 4: NameCard sheet (drawer phone) ------------------------------
    //
    // Triple-steal target-picker. Forces with name-card prompt + targetId
    // pointing at Bob (phones[1]). Sheet header reads "Name a card to
    // steal from Bob".

    await setPendingPrompt(phones[0]!, { type: 'name-card', playerId: aliceId, targetId: bobId })
    await expectDialogWithText(phones[0]!, 'Name a card to steal from')
    await phones[0]!.waitForTimeout(500)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/03-name-card.png` })

    // --- State 5: FavorBanner (target phone) ---------------------------------
    //
    // Favor-response prompt is handled INLINE in the player view (banner +
    // staging unified flow), not as a bottom sheet — see Player.tsx
    // pendingPrompt?.type === 'favor-response' branches. Target phone's
    // hand stays interactive; we capture the banner state.
    //
    // Clear NameCard sheet first (closing it cleanly) by setting a fresh
    // optimistic snapshot for favor-response.

    await setPendingPrompt(phones[0]!, { type: 'favor-response', playerId: aliceId, requesterId: bobId })
    // No dialog this time — banner renders inline. Just give the layout a
    // beat to settle, then capture.
    await phones[0]!.waitForTimeout(600)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/04-favor-banner.png` })

    // --- State 5b: Nope window mid-countdown (board) ------------------------
    //
    // NopeCountdownBar renders when boardView.nopeWindow !== null. We force
    // a mid-countdown state by setting remainingMs ≈ 4000ms (out of ~10000)
    // and a recent startedAtMs so the visual clock reads as actively ticking.
    // Capture the board state showing the bar at ~mid-fill.

    await board.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      const now = Date.now()
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        nopeWindow: {
          remainingMs: 4000,
          deadlineMs: now + 4000,
          chainDepth: 1,
          startedAtMs: now - 6000,
          generation: 1,
        },
      }))
    })
    await board.waitForTimeout(400) // NopeCountdownBar mount + fade-in
    await board.screenshot({ path: `${OUTPUT_DIR}/board/04-nope-window.png` })
    // Clear nope window so it doesn't pollute later captures.
    await board.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        nopeWindow: null,
      }))
    })

    // --- State 5c: FuturePeek read-only (drawer phone) ----------------------
    //
    // FuturePeek renders when pendingPrompt is null AND privateData.futureCards
    // exists with length > 0 (the See the Future case). The store does not
    // expose a setPrivateData helper, but __gameStore IS the singleton, so we
    // mutate privateData directly + call notify().

    // Clear any lingering pending prompt from earlier captures.
    await setPendingPrompt(phones[0]!, null)
    await phones[0]!.waitForTimeout(150)

    await phones[0]!.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: {
          privateData: { futureCards?: Array<{ id: string; type: string }> }
          notify: () => void
        }
      }
      if (!w.__gameStore) throw new Error('arena-states: __gameStore missing')
      // Real BURNED card types — see the future shows the top 3 cards in
      // draw-pile order.
      w.__gameStore.privateData = {
        futureCards: [
          { id: 'fp-1', type: 'reassign' },
          { id: 'fp-2', type: 'go-dark' },
          { id: 'fp-3', type: 'dash-barlowe' },
        ],
      }
      w.__gameStore.notify()
    })
    await phones[0]!.waitForFunction(
      () => !!document.querySelector('dialog[open]'),
      null,
      { timeout: 3000 },
    )
    await phones[0]!.waitForTimeout(500) // BottomSheet spring settle
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/05-future-peek-readonly.png` })

    // --- State 5d: FuturePeek rearrange (drawer phone) ----------------------
    //
    // Alter the Future variant. Same privateData shape, but the pendingPrompt
    // type is 'future-rearrange' which makes deriveActiveBottomSheet return
    // canRearrange: true. The grip-handle drag affordance becomes active.

    await phones[0]!.evaluate((id) => {
      const w = window as unknown as {
        __gameStore?: {
          privateData: { futureCards?: Array<{ id: string; type: string }> }
          applyOptimistic: (t: (s: unknown) => unknown) => void
          notify: () => void
        }
      }
      if (!w.__gameStore) throw new Error('arena-states: __gameStore missing')
      // Keep the same futureCards — only the prompt type changes.
      w.__gameStore.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        pendingPrompt: { type: 'future-rearrange', playerId: id },
      }))
      w.__gameStore.notify()
    }, aliceId)
    await phones[0]!.waitForTimeout(500)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/06-future-peek-rearrange.png` })

    // Clear pendingPrompt + privateData before ELIMINATED capture so the
    // sheet dismisses cleanly.
    await setPendingPrompt(phones[0]!, null)
    await phones[0]!.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { privateData: Record<string, unknown>; notify: () => void }
      }
      if (!w.__gameStore) return
      w.__gameStore.privateData = {}
      w.__gameStore.notify()
    })
    await phones[0]!.waitForTimeout(200)

    // --- State 6: DramaOverlay ELIMINATED (board) ----------------------------
    //
    // Use a REAL player id so the overlay renders the player's name
    // instead of falling back to "UNKNOWN" for an unresolved id. Bob's
    // the obvious eliminated stand-in here — Alice is the active drawer
    // through the rest of the spec, and using the win-id-target for the
    // eliminated screenshot would cross-pollute the visual.

    await injectEvent(board, { type: 'player-eliminated', playerId: bobId, rank: 3 })
    await expectOverlayText(board, 'ELIMINATED')
    await board.waitForTimeout(700)
    await board.screenshot({ path: `${OUTPUT_DIR}/board/02-drama-eliminated.png` })
    await board.waitForTimeout(1200)

    // --- State 7: DramaOverlay WINS (board) — LAST ---------------------------
    //
    // game-over swaps the board into a phase that may unmount or
    // restructure DramaOverlay's host — running this before any other
    // beat would invalidate the overlay for everything after.
    //
    // Use a real player id so the overlay renders "ALICE WINS" — the
    // synthetic 'p-win' fallback rendered "UNKNOWN WINS" which read as
    // a bug, not a representative production state.

    await injectEvent(board, { type: 'game-over', winnerId: aliceId })
    await expectOverlayText(board, 'WINS')
    // game-over text variant uses 2000ms holdMs — designed peak ~2000ms.
    // Capture mid-peak for stable text + glow.
    await board.waitForTimeout(900)
    await board.screenshot({ path: `${OUTPUT_DIR}/board/03-drama-wins.png` })
  })
})
