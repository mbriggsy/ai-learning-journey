/**
 * E2E: B-02 — host-disconnect during lobby surfaces a banner on phones.
 *
 * Pre-fix posture: when the board/TV closed during lobby, players were
 * stuck staring at "Standing by, awaiting deployment" forever — no signal
 * the only thing that could start the game was gone.
 *
 * Post-fix: server now broadcasts `hostConnected: false` on the lobby
 * view (debounced by DISCONNECT_DEBOUNCE_MS = 3s to absorb WiFi blips),
 * and JoinScreen swaps the waiting label to "// HOST OFFLINE" with an
 * accent-burned color shift.
 */
import { test, expect } from './fixtures'
import { joinPhone, waitForPlayerCount } from './helpers'

test.describe('B-02: host-disconnect lobby banner', () => {
  test('phones surface "// HOST OFFLINE" when board closes during lobby', async ({
    board,
    phones,
    roomCode,
  }) => {
    // Two phones join, board is up. Joined-state phones see "Standing by..."
    await joinPhone(phones[0]!, roomCode, 'Vera')
    await joinPhone(phones[1]!, roomCode, 'Otto')
    await waitForPlayerCount(board, 2)

    const phone0 = phones[0]!
    const waitingLabel = phone0.locator('p[class*="waiting"] span[class*="waitingLabel"]')
    await expect(waitingLabel).toHaveText('Standing by, awaiting deployment')

    // Kill the board page — host disconnects. Server's debounce window
    // (3s) absorbs WiFi blips; we wait it out.
    await board.close()

    // Wait up to 6s (debounce + broadcast + render) for the swap.
    await expect(waitingLabel).toHaveText('// HOST OFFLINE', { timeout: 6_000 })

    // The data-host-offline attribute drives the color/weight shift.
    const waitingNode = phone0.locator('p[class*="waiting"]')
    await expect(waitingNode).toHaveAttribute('data-host-offline', 'true')
  })
})
