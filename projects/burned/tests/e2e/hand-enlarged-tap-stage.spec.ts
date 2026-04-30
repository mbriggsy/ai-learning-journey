/**
 * E2E: Hand enlarged-card-tap stages it; backdrop tap dismisses.
 *
 * Bug as reported by playtest agents (run 2026-04-29-2139-3p, issues
 * #006 + #007, two seats independently): on the favor-target's phone, a
 * single-tap on a hand card opened the enlarged preview, but a second
 * single-tap on the previewed card DISMISSED the preview without
 * staging the card. The staging button stayed disabled. Players were
 * stuck in a preview/dismiss loop with no discoverable confirm path.
 *
 * Failure mode: `Hand.tsx` registered `useDoubleTap(stage, dismiss)` on
 * the BACKDROP element, which received both card and backdrop taps as
 * a single event stream. Single-tap-on-card resolved as DISMISS instead
 * of STAGE.
 *
 * Fix (`src/client/player/Hand.tsx`): split the handlers. Tap on the
 * card itself = STAGE (with `stopPropagation`). Tap on the backdrop
 * area outside the card = dismiss. No more `useDoubleTap` on the
 * enlarged surface; single-tap is enough since the user has already
 * implicitly selected the card by previewing it.
 *
 * The fix applies to ALL hand interactions, not just favor-response —
 * so this spec drives the simpler turn-active path (active seat's own
 * turn, no favor needed). Same code surface; same regression contract.
 */
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'

async function pickActivePhone(phones: readonly Page[], timeout = 10_000): Promise<Page> {
  // `phase: 'playing'` arrives a beat before the projection's
  // `isMyTurn` settles for the first turn — polling avoids the race.
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
  throw new Error('No active phone found within timeout')
}

test.describe('Hand: enlarged-card tap stages; backdrop tap dismisses (issues #006/#007)', () => {
  test('single-tap on enlarged card stages it (the broken path now works)', async ({
    board,
    phones,
    roomCode,
  }) => {
    await joinPhone(phones[0]!, roomCode, 'Tester1')
    await joinPhone(phones[1]!, roomCode, 'Tester2')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)
    await Promise.all(phones.slice(0, 2).map(p => waitForPhase(p, 'playing', 10_000)))
    const phone = await pickActivePhone(phones.slice(0, 2))

    // Scope to the hand region — staged cards also carry data-type and
    // role=button, so the un-scoped selector counted both the un-staged
    // hand cards AND the staged card after the test action.
    const handCards = phone.locator('[class*="handSection"]').locator('div[role="button"][data-type]:not([aria-disabled="true"])')
    await handCards.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handCards).toHaveCount(8)

    // Baseline — no backdrop and no staged cards at game start.
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)

    // Step 1: single-tap a hand card → enlarged preview opens.
    await handCards.first().click({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(1)

    // Step 2: tap the enlarged card itself — pre-fix this dismissed the
    // preview without staging. Post-fix it stages.
    // Center-of-element click lands on the enlarged card, which is
    // centered inside the backdrop.
    await phone.locator('[class*="enlargeCard"]').click({ force: true })

    // Backdrop dismisses, hand drops to 7, staging button now enabled.
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
    await expect(handCards).toHaveCount(7)
  })

  test('tap on backdrop area outside the card dismisses without staging', async ({
    board,
    phones,
    roomCode,
  }) => {
    await joinPhone(phones[0]!, roomCode, 'Tester1')
    await joinPhone(phones[1]!, roomCode, 'Tester2')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)

    await Promise.all(phones.slice(0, 2).map(p => waitForPhase(p, 'playing', 10_000)))
    const phone = await pickActivePhone(phones.slice(0, 2))

    // Scope to the hand region — staged cards also carry data-type and
    // role=button, so the un-scoped selector counted both the un-staged
    // hand cards AND the staged card after the test action.
    const handCards = phone.locator('[class*="handSection"]').locator('div[role="button"][data-type]:not([aria-disabled="true"])')
    await handCards.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handCards).toHaveCount(8)

    // Open the enlarged preview.
    await handCards.first().click({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(1)

    // Tap top-left corner of backdrop, well outside the centered card.
    // The backdrop is the full viewport via portal-to-body; (10, 60)
    // lands above the card vertical center. Need `position` arg so
    // Playwright doesn't auto-center on the card (which IS the
    // backdrop's only child).
    const backdrop = phone.locator('[class*="enlargeBackdrop"]')
    await backdrop.click({ position: { x: 10, y: 60 }, force: true })

    // Backdrop dismisses; hand stays at 8 (nothing staged).
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
    await expect(handCards).toHaveCount(8)
  })
})
