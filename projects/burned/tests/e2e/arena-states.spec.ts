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
 *   - board/04-nope-window.png              NopeCountdownBar — single-Nope mid-countdown
 *   - board/05-nope-chain-burn.png          NopeCountdownBar — chainDepth ≥ 2
 *   - phone/05-future-peek-readonly.png     FuturePeek — Intel Briefing read-only
 *   - phone/06-future-peek-rearrange.png    FuturePeek — Falsify Intel rearrange
 *   - phone/07-card-detail-drama.png        CardDetailSheet long-press — drama-accent card
 *   - phone/08-nope-chain-burn-counter.png  SmartActionBox — Counter verb during chainDepth ≥ 1
 *   - phone/09-steal-report-queue.png       StealReport queue — +N more chip with stacked dispatches
 *   - board/02-drama-eliminated.png         DramaOverlay text — player-eliminated peak
 *   - board/03-drama-wins.png               DramaOverlay text — game-over WINS (LAST: unmounts host)
 *   - phone/10-game-over-rankings.png       GameOver — phone view with Run It Back button (B-11)
 *   - phone/11-host-offline.png             JoinScreen joined-state — // HOST OFFLINE label (B-02)
 *   - phone/12-disconnected-name-picker.png JoinScreen pre-join — Resume as picker (B-14)
 *
 * Numbered prefixes give stable ordering. Future states can append
 * without renumbering existing artifacts.
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

    // --- State 5b2: Chain-burn nope window (board + observer phone) --------
    //
    // chainDepth ≥ 1 flips the SmartActionBox verb from "Intercept" to
    // "Counter" on any opponent holding an Intercepted card (engine.ts:980;
    // SmartActionBox.tsx:177). Captures Bob's phone as observer with an
    // Intercepted card forced into hand + the board view at chainDepth 2.
    //
    // Observer is critical: the actor (Alice) at chainDepth 0 lands in the
    // waiting branch, but at chainDepth ≥ 1 chain-burn becomes legal even
    // for the actor — observers are simpler to seed.

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
          chainDepth: 2,
          startedAtMs: now - 6000,
          generation: 1,
        },
      }))
    })
    await phones[1]!.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      const now = Date.now()
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        nopeWindow: {
          remainingMs: 4000,
          deadlineMs: now + 4000,
          chainDepth: 2,
          startedAtMs: now - 6000,
          generation: 1,
        },
        myHand: [
          { id: 'chain-h-1', type: 'intercepted' },
          { id: 'chain-h-2', type: 'reassign' },
          { id: 'chain-h-3', type: 'go-dark' },
        ],
      }))
    })
    await board.waitForTimeout(400)
    await phones[1]!.waitForTimeout(400)
    await board.screenshot({ path: `${OUTPUT_DIR}/board/05-nope-chain-burn.png` })
    await phones[1]!.screenshot({ path: `${OUTPUT_DIR}/phone/08-nope-chain-burn-counter.png` })

    // Clear nope window on board AND clear observer phone's optimistic
    // patch so subsequent captures aren't polluted.
    await board.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        nopeWindow: null,
      }))
    })
    await phones[1]!.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { clearOptimistic: () => void }
      }
      w.__gameStore?.clearOptimistic()
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

    // --- State 5e: CardDetailSheet for a drama-accent card -------------------
    //
    // Long-press a drama-accent card to open CardDetailSheet at hero size.
    // This is the canonical surface for `--color-accent-drama` on a card-face
    // — captures the ochre-9 mustard rendering at full size, including the
    // card-name header, the ACTION pill, the icon glyph, and the play hint.
    // Same long-press emulation pattern as `tests/e2e/wcag-zoom.spec.ts`.
    //
    // useSortedHand groups action-category cards alphabetically by display
    // name within their bucket. With reassign / direct-order / go-dark seeded
    // here, slot[0] resolves to "Direct Order" (D < G < R).
    {
      await phones[0]!.evaluate(() => {
        const w = window as unknown as {
          __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
        }
        w.__gameStore?.applyOptimistic((s) => ({
          ...(s as Record<string, unknown>),
          myHand: [
            { id: 'arena-h-1', type: 'reassign' },
            { id: 'arena-h-2', type: 'direct-order' },
            { id: 'arena-h-3', type: 'go-dark' },
          ],
        }))
      })
      await phones[0]!.waitForTimeout(400) // hand re-layout settle

      const slot = phones[0]!.locator('[class*="handSection"] [class*="slot"]').first()
      await slot.hover()
      await phones[0]!.mouse.down()
      await phones[0]!.waitForTimeout(700) // > 600ms LONG_PRESS_MS
      await phones[0]!.mouse.up()
      await expectDialogWithText(phones[0]!, 'Direct Order')
      await phones[0]!.waitForTimeout(400) // BottomSheet enter settle
      await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/07-card-detail-drama.png` })
      await phones[0]!.keyboard.press('Escape')
      await phones[0]!.waitForTimeout(300)

      // Reset hand so subsequent state primers start from a clean slate.
      await phones[0]!.evaluate(() => {
        const w = window as unknown as {
          __gameStore?: { clearOptimistic: () => void }
        }
        w.__gameStore?.clearOptimistic()
      })
      await phones[0]!.waitForTimeout(200)
    }

    // --- State 7b: StealReport queue with +N more chip ----------------------
    //
    // Inject 3 combo-steal events targeting Alice. The StealReport queue
    // processes them in order and surfaces the first dispatch with a
    // "+2 more" chip indicating the queued reports waiting behind it.
    // Cooldown gate (350ms) on the Acknowledge button means the queue
    // visibly stacks instead of dismissing in a tap-storm — that's the
    // surface we want to capture.

    await injectEvent(phones[0]!, { type: 'combo-steal', stealerId: bobId, targetId: aliceId, found: true, cardType: 'go-dark' })
    await injectEvent(phones[0]!, { type: 'combo-steal', stealerId: bobId, targetId: aliceId, found: true, cardType: 'reassign' })
    await injectEvent(phones[0]!, { type: 'combo-steal', stealerId: bobId, targetId: aliceId, found: false, cardType: 'direct-order' })
    await phones[0]!.waitForFunction(
      () => !!document.querySelector('[role="alertdialog"]'),
      null,
      { timeout: 3_000 },
    )
    // StealReport's paper "deliberate" Framer transition holds ~480ms;
    // a 700ms wait lands the capture squarely in the rest pose.
    await phones[0]!.waitForTimeout(700)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/09-steal-report-queue.png` })

    // Drain the queue so subsequent captures aren't polluted by the
    // dispatch overlay. 350ms cooldown between Acknowledge taps.
    for (let i = 0; i < 3; i++) {
      const ackBtn = phones[0]!.locator('button:has-text("Acknowledge")')
      if ((await ackBtn.count()) === 0) break
      await ackBtn.click().catch(() => undefined)
      await phones[0]!.waitForTimeout(420)
    }

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

    // --- State 8: Phone game_over rankings (Alice's phone) -----------------
    //
    // Real flow: server pushes phase=game_over to all clients after the
    // engine emits game-over. Harness path: optimistically swap the phone's
    // phase + populate winnerId/eliminationOrder so GameOver renders
    // rankings + the B-11 "Run It Back" button. Captured AFTER the board
    // WINS beat to mirror the real lifecycle ordering (overlay first,
    // rankings after).

    await phones[0]!.evaluate(({ winner, elim }) => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        phase: 'game_over',
        winnerId: winner,
        eliminationOrder: elim,
      }))
    }, { winner: aliceId, elim: [bobId] })
    // Phone GameOver vocabulary: "// CASE 47-B · CLOSED [CLASSIFIED]" header,
    // winner hero stack, "// OPERATIVE STATUS: SURVIVED|ELIMINATED",
    // rankings list, "// NEW CASE" button (Run It Back per B-11). Wait
    // for the "// NEW CASE" button — most specific marker, only present
    // in the GameOver tree.
    await phones[0]!.locator('button:has-text("NEW CASE")').waitFor({ timeout: 8_000 })
    // GameOver row stagger is 80ms × N + the play-again button delay
    // (0.8s + 0.08*rankings + 0.3s). For a 3-player game, total animate-in
    // window is ~1.4s. Capture at 1500ms for stable layout.
    await phones[0]!.waitForTimeout(1500)
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/10-game-over-rankings.png` })
  })

  test('captures lobby + pre-join states', async ({ board, phones, roomCode }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Single-project screenshot harness')
    test.setTimeout(45_000)

    // --- State 9: Phone host-offline label (B-02) --------------------------
    //
    // Phone joins (lobby state, game NOT started). Optimistic patch flips
    // hostConnected to false. JoinScreen swaps the joined-state waiting
    // label from "Standing by..." to "// HOST OFFLINE" in accent-burned.

    await joinPhone(phones[0]!, roomCode, 'Alice')
    await waitForPlayerCount(board, 1)
    // Wait for phone's gameStore to receive the lobby projection.
    await phones[0]!.waitForFunction(() => {
      const snap = (window as unknown as { __gameStoreSnapshot?: () => Record<string, unknown> }).__gameStoreSnapshot?.()
      return snap?.phase === 'lobby'
    }, null, { timeout: 5_000 })

    await phones[0]!.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void }
      }
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        hostConnected: false,
      }))
    })
    await phones[0]!.waitForFunction(
      () => /HOST OFFLINE/.test(document.body.textContent ?? ''),
      null,
      { timeout: 2_000 },
    )
    await phones[0]!.waitForTimeout(500) // label color transition settle
    await phones[0]!.screenshot({ path: `${OUTPUT_DIR}/phone/11-host-offline.png` })

    // --- State 10: Disconnected-name picker (pre-join, B-14) ---------------
    //
    // Fresh phone navigates to /player.html?room=XYZ but does NOT submit
    // a name. Inject lastError = GAME_ALREADY_STARTED with disconnectedNames
    // so JoinScreen's reclaimNames branch renders the "// Resume as"
    // picker. lastError is private on GameStore — runtime mutation works
    // because TS privacy is compile-time only.

    const freshPhone = await phones[1]!.context().newPage()
    await freshPhone.goto(`/player.html?room=${roomCode}`)
    await freshPhone.waitForFunction(
      () => !!(window as unknown as { __gameStore?: unknown }).__gameStore,
      null,
      { timeout: 5_000 },
    )
    await freshPhone.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: {
          lastError: unknown
          notify: () => void
        }
      }
      if (!w.__gameStore) throw new Error('arena-states: __gameStore missing')
      w.__gameStore.lastError = {
        code: 'GAME_ALREADY_STARTED',
        message: 'Game has already started',
        disconnectedNames: ['Vera', 'Otto'],
      }
      w.__gameStore.notify()
    })
    await freshPhone.waitForFunction(
      () => /Resume as/.test(document.body.textContent ?? ''),
      null,
      { timeout: 3_000 },
    )
    await freshPhone.waitForTimeout(400)
    await freshPhone.screenshot({ path: `${OUTPUT_DIR}/phone/12-disconnected-name-picker.png` })
    await freshPhone.close()
  })
})
