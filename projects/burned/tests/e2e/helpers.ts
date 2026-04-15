import type { Page } from '@playwright/test'

/**
 * Wait for the game store to reach a specific phase.
 * Relies on __gameStoreSnapshot exposed in test mode.
 */
export async function waitForPhase(page: Page, phase: string, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const snap = (window as unknown as Record<string, () => Record<string, unknown>>).__gameStoreSnapshot?.()
      return snap && snap.phase === expected
    },
    phase,
    { timeout },
  )
}

/**
 * Wait until the lobby has a specific number of players.
 */
export async function waitForPlayerCount(page: Page, count: number, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const snap = (window as unknown as Record<string, () => Record<string, unknown>>).__gameStoreSnapshot?.()
      return snap && Array.isArray(snap.players) && snap.players.length === expected
    },
    count,
    { timeout },
  )
}

/**
 * Join a phone to a room.
 */
export async function joinPhone(page: Page, roomCode: string, name: string): Promise<void> {
  await page.goto(`/player.html?room=${roomCode}`)
  await page.locator('input[type="text"]').fill(name)
  await page.locator('button:has-text("Check In")').click()
}
