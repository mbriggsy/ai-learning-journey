/**
 * Regression for insight 036: PartySocket's default `maxRetries: Infinity`
 * left the player tab in an unbounded reconnect loop when wrangler died
 * mid-session, accumulating 572k–1.6M console entries before the tab hung.
 *
 * `src/client/connection.ts` now passes `maxRetries: 10` and a noop
 * `debugLogger`, and tracks consecutive close-without-open events to flip
 * status to 'gave-up' when the budget is exhausted. ConnectionOverlay
 * renders a "// CHANNEL DOWN" + Refresh button on 'gave-up'.
 *
 * This test verifies the bounded-logging contract: with the phone forced
 * offline mid-session, console message accumulation stays well under 100
 * for at least 30 seconds. The pre-fix code would already be in the
 * thousands at this point.
 */
import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'

test.describe('PartySocket reconnect bounds (insight 036 regression)', () => {
  test('offline phone does not log-storm; bounded console output', async ({ board, phones, roomCode }) => {
    const phone = phones[0]!
    const otherPhone = phones[1]!

    // Capture every console entry the phone emits so we can prove the
    // post-fix path stays bounded. Pre-fix this would accumulate into
    // the thousands within ~20 seconds.
    const consoleMessages: string[] = []
    phone.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    })

    await joinPhone(phone, roomCode, 'Alice')
    await joinPhone(otherPhone, roomCode, 'Bob')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)
    await waitForPhase(phone, 'playing', 10_000)

    // Baseline: how many console entries does steady-state generate? We
    // sample after the page has fully loaded so the threshold below isn't
    // tripped by routine startup chatter.
    const baselineCount = consoleMessages.length

    // Force the phone offline. Playwright's setOffline(true) blocks all
    // outbound network at the context level — the existing WebSocket
    // immediately disconnects and any reconnect attempts fail at the
    // network layer.
    await phone.context().setOffline(true)

    // Wait 30 seconds — long enough for partysocket to attempt several
    // reconnects with growth factor 1.3 and 10s cap. With maxRetries:10
    // the final attempt lands well after this window, so the loop is
    // still active. The contract under test: console output stays
    // bounded throughout.
    await phone.waitForTimeout(30_000)

    const offlineCount = consoleMessages.length - baselineCount

    // Reasonable bound: each retry yields at most a small handful of
    // entries (browser native WS error + window.error handler). With
    // ~6-8 retries in 30s and ~3 entries each, we expect under ~30.
    // A storm would push this into the thousands. 100 is a generous
    // ceiling that catches any regression toward unbounded logging.
    expect(offlineCount, `expected bounded console output during 30s offline, got ${offlineCount}`).toBeLessThan(100)

    // Restore network and verify the phone can reconnect normally.
    // Within retry budget, partysocket should re-establish on the next
    // attempt. With minReconnectionDelay 1-5s, this typically settles
    // in under 10s.
    await phone.context().setOffline(false)

    await phone.waitForFunction(
      () => {
        const snap = (window as unknown as Record<string, () => Record<string, unknown>>).__gameStoreSnapshot?.()
        return snap !== undefined && snap !== null
      },
      undefined,
      { timeout: 15_000 },
    )
  })
})
