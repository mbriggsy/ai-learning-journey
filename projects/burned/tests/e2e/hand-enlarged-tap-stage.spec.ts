/**
 * E2E: Hand enlarged-card tap discriminator — single=dismiss, double=stage.
 *
 * REGRESSION CONTRACT for the app's gesture vocabulary:
 *   - Hand card tap: single = preview, double = stage
 *   - Enlarged card tap: single = return-to-hand, double = stage
 *   - StagingArea tap: single = preview, double = unstage
 *
 * The discriminator is universal: single-tap is INSPECT (reversible
 * peek), double-tap is COMMIT. Do not "fix" the enlarged surface to
 * commit-on-single-tap — that breaks the contract a user just learned
 * in the hand. Triage issues #006/#007 (run 2026-04-29-2139-3p) framed
 * the user-confusion as a tap-semantic bug; it's actually first-time
 * discoverability friction. The gesture itself is correct.
 *
 * This spec locks the gesture so a future "fix" against the same triage
 * pressure can't silently re-invert it.
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

async function setupGame(board: Page, phones: readonly Page[], roomCode: string): Promise<Page> {
  await joinPhone(phones[0]!, roomCode, 'Tester1')
  await joinPhone(phones[1]!, roomCode, 'Tester2')
  await waitForPlayerCount(board, 2)
  await board.locator('button:has-text("Cleared Hot")').click()
  await waitForPhase(board, 'playing', 10_000)
  await Promise.all(phones.slice(0, 2).map(p => waitForPhase(p, 'playing', 10_000)))
  return await pickActivePhone(phones.slice(0, 2))
}

// Scope to the hand region — staged cards also carry data-type and
// role=button, so an un-scoped selector would over-count after staging.
const handCardsLocator = (phone: Page) =>
  phone.locator('[class*="handSection"]').locator('div[role="button"][data-type]:not([aria-disabled="true"])')

test.describe('Hand: enlarged-card tap discriminator (regression contract)', () => {
  test('single-tap on enlarged card returns it to the hand (no staging)', async ({
    board,
    phones,
    roomCode,
  }) => {
    const phone = await setupGame(board, phones, roomCode)
    const handCards = handCardsLocator(phone)
    await handCards.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handCards).toHaveCount(8)
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)

    // Open preview.
    await handCards.first().click({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(1)

    // Single-tap on the enlarged card → useDoubleTap waits 400ms then
    // resolves as single → dismiss. Hand stays at 8 (nothing staged).
    await phone.locator('[class*="enlargeCard"]').click({ force: true })
    await phone.waitForTimeout(600)
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
    await expect(handCards).toHaveCount(8)
  })

  test('double-tap on enlarged card stages it', async ({
    board,
    phones,
    roomCode,
  }) => {
    const phone = await setupGame(board, phones, roomCode)
    const handCards = handCardsLocator(phone)
    await handCards.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handCards).toHaveCount(8)

    // Open preview.
    await handCards.first().click({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(1)

    // Double-tap on the enlarged card → useDoubleTap fires the double
    // handler immediately. Hand drops to 7; backdrop dismisses.
    await phone.locator('[class*="enlargeCard"]').dblclick({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
    await expect(handCards).toHaveCount(7)
  })

  test('single-tap on backdrop area outside the card dismisses without staging', async ({
    board,
    phones,
    roomCode,
  }) => {
    const phone = await setupGame(board, phones, roomCode)
    const handCards = handCardsLocator(phone)
    await handCards.first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(handCards).toHaveCount(8)

    // Open preview.
    await handCards.first().click({ force: true })
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(1)

    // Tap outside the centered card. (10, 60) lands above the card.
    // `position` arg overrides Playwright's center-of-element default,
    // which would land on the card (the backdrop's only child).
    await phone.locator('[class*="enlargeBackdrop"]').click({ position: { x: 10, y: 60 }, force: true })
    await phone.waitForTimeout(600)
    await expect(phone.locator('[class*="enlargeBackdrop"]')).toHaveCount(0)
    await expect(handCards).toHaveCount(8)
  })
})
