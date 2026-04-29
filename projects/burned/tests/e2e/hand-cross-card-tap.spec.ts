/**
 * E2E: Hand cross-card rapid-tap regression (TODO #9 stray card selection).
 *
 * Bug as reported by playtest agent (run 2026-04-26-1303-3p, seat-1 v1):
 *   "After playing Burn the Files (double-click), tried to click 'End turn
 *    draw'. Got _enlargeBackdrop error for Call in a Favor. ... a double-
 *    click on one card appears to inadvertently select/trigger the adjacent
 *    card (possibly a mis-registration issue with the double-click timing —
 *    the second click of the dblclick lands on the next card)."
 *
 * Failure mode: useDoubleTap's pre-fix behavior cancelled card-A's pending
 * single-tap timer when a tap on card B arrived within the 400ms threshold,
 * then scheduled a NEW single-tap timer for card B. 400ms later B's enlarge
 * backdrop opened, blocking End-turn until manually dismissed.
 *
 * Fix (src/client/player/hooks/useDoubleTap.ts): cross-card taps within
 * threshold cancel + reset without rescheduling. Ambiguous intent resolves
 * to "no action."
 *
 * The unit test at src/client/player/hooks/useDoubleTap.test.tsx covers the
 * hook-level state machine. This spec covers the integration: real React,
 * real Hand component, real DOM events, real backdrop portal.
 *
 * Deliberately turn-agnostic — single-tap-to-enlarge is available to any
 * seat with cards in hand.
 */
import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'

test.describe('Hand: cross-card rapid-tap regression (TODO #9)', () => {
  test('two rapid taps on different cards do NOT strand an enlarge backdrop', async ({
    board,
    phones,
    roomCode,
  }) => {
    // Minimum game: 2 players. The hand is dealt to both seats; the bug
    // is independent of turn order.
    await joinPhone(phones[0]!, roomCode, 'Tester1')
    await joinPhone(phones[1]!, roomCode, 'Tester2')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)

    const phone = phones[0]!
    await waitForPhase(phone, 'playing', 10_000)

    // Cards in the player view are MinimalCard divs — they carry the
    // unique [data-type] attribute. At game start, the only MinimalCard
    // instances on the player view are in the Hand. Clicks on the inner
    // MinimalCard div bubble up to the slot's onPointerUp handler.
    const cardSelector = 'div[role="button"][data-type]:not([aria-disabled="true"])'
    await phone.locator(cardSelector).first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(phone.locator(cardSelector)).toHaveCount(8)

    // Baseline — no backdrop should be present at game start.
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)

    const cardA = phone.locator(cardSelector).nth(0)
    const cardB = phone.locator(cardSelector).nth(1)

    // Two rapid clicks on adjacent cards. Playwright's click() resolves in
    // tens of ms; the two events land well inside the 400ms threshold.
    // `force: true` skips the actionability check (animated cards may
    // briefly fail the check during the deal-in stagger).
    await cardA.click({ force: true })
    await cardB.click({ force: true })

    // Wait past the single-tap threshold (400ms) plus padding.
    await phone.waitForTimeout(700)

    // Pre-fix: Card B's single-tap timer fired during the wait, opening
    // the enlarge backdrop and blocking the rest of the UI.
    // Post-fix: The cross-card branch cancelled the pending timer and
    // did not reschedule. Backdrop count stays at zero.
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
  })
})
