/**
 * E2E: JoinScreen surfaces server refusal inline (TODO #6 follow-up).
 *
 * Companion to the unit tests in src/client/player/JoinScreen.test.tsx.
 * Those pin the wiring contract via a mocked useLastError hook; this spec
 * proves it works against a live wrangler server emitting a real
 * `GAME_ALREADY_STARTED` error message.
 *
 * Why this gap was hidden in the harness: the player view mounts a global
 * <ErrorToast/> that auto-dismisses after 2s. A Playwright snapshot taken
 * after the toast faded shows no error UI at all, even though the server
 * did refuse. Calibration seat agents that landed late hit exactly this
 * pattern: "Check In active but page never transitioned" with no apparent
 * cause. The inline error makes the refusal sticky until the user
 * acknowledges it (by typing).
 */
import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'

test.describe('JoinScreen: server-error surfacing', () => {
  test('shows GAME_ALREADY_STARTED inline when joining a game that already started', async ({
    board,
    phones,
    roomCode,
  }) => {
    // Two phones join + game starts.
    await joinPhone(phones[0]!, roomCode, 'Early1')
    await joinPhone(phones[1]!, roomCode, 'Early2')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)

    // Third phone tries to join late. URL carries `?name=Latecomer` so
    // Player.tsx fires auto-join on connect — same code path a real
    // late seat hits. Server replies with GAME_ALREADY_STARTED; the
    // join screen falls through to the form because assignedColor is
    // never set.
    const late = phones[2]!
    await late.goto(`/player.html?room=${roomCode}&name=Latecomer`)

    // The inline error is rendered as a <p class*="error"> below the input.
    // Wait for it explicitly — the auto-join → server refusal round trip
    // takes a few hundred ms.
    const errorMsg = late.locator('p[class*="error"]')
    await errorMsg.waitFor({ state: 'visible', timeout: 5_000 })
    await expect(errorMsg).toHaveText('Game has already started')

    // Sanity: the join form is still rendered (the error didn't replace
    // the page) and the input is interactive. A real human could change
    // their name and try again.
    await expect(late.locator('input[type="text"]')).toBeVisible()
    await expect(late.locator('button:has-text("Check In")')).toBeVisible()
  })

  test('typing in the input clears the inline server error', async ({
    board,
    phones,
    roomCode,
  }) => {
    await joinPhone(phones[0]!, roomCode, 'Early1')
    await joinPhone(phones[1]!, roomCode, 'Early2')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)

    const late = phones[2]!
    await late.goto(`/player.html?room=${roomCode}&name=Latecomer`)
    const errorMsg = late.locator('p[class*="error"]')
    await errorMsg.waitFor({ state: 'visible', timeout: 5_000 })

    // User types. Inline error clears, giving them a clean slate for
    // the next attempt — even though that attempt will be refused too.
    await late.locator('input[type="text"]').click()
    await late.locator('input[type="text"]').fill('Latecomer2')
    await expect(errorMsg).toHaveCount(0)
  })

  test('B-14: GAME_ALREADY_STARTED surfaces a reclaim picker for disconnected names', async ({
    board,
    phones,
    roomCode,
  }) => {
    // Two phones join + game starts.
    await joinPhone(phones[0]!, roomCode, 'Vera')
    await joinPhone(phones[1]!, roomCode, 'Otto')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)

    // Otto's tab dies (sessionStorage is wiped from server's perspective —
    // his WebSocket closes, so his playerId is no longer in any active
    // connection state). Vera stays connected.
    await phones[1]!.close()

    // Latecomer phone — a returning Otto whose phone died, with a typo on
    // his retry. Server refuses with GAME_ALREADY_STARTED but now includes
    // disconnectedNames=['Otto'] so the dead-end becomes a recovery path.
    const late = phones[2]!
    await late.goto(`/player.html?room=${roomCode}&name=Stranger`)

    // Picker button for the disconnected name appears under the input.
    const reclaimBtn = late.locator('button[class*="reclaimButton"]:has-text("Otto")')
    await reclaimBtn.waitFor({ state: 'visible', timeout: 5_000 })

    // Vera's name MUST NOT appear — she's still actively connected.
    await expect(
      late.locator('button[class*="reclaimButton"]:has-text("Vera")'),
    ).toHaveCount(0)

    // Tap the picker. Server takes the reclaim and projects the player's
    // hand back to this tab — assignedColor flips, the join form is
    // replaced by the in-game UI.
    await reclaimBtn.click()
    await late.waitForFunction(
      () => {
        const snap = (window as unknown as Record<string, () => Record<string, unknown> | null>)
          .__gameStoreSnapshot?.()
        return snap?.phase === 'playing'
      },
      undefined,
      { timeout: 5_000 },
    )
  })
})
