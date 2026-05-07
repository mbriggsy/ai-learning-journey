/**
 * E2E: E-08 — close unidentified connections after IDENTIFY_TIMEOUT_MS.
 *
 * Pre-fix posture: a freshly-accepted WS could sit indefinitely (or until
 * the 30s+10s heartbeat timeout) without ever sending host-connect or
 * join, holding one of the MAX_CONNECTIONS=12 slots. Floods could squat
 * the room cap and lock real players out.
 *
 * Post-fix: server schedules a 5s timer on accept; if no role is set
 * before it fires, the connection closes with code 4002.
 *
 * The test opens a raw WebSocket against the wrangler dev server, sends
 * NOTHING, and asserts a server-initiated close event lands within ~7s.
 */
import { test, expect } from './fixtures'

test.describe('E-08: identify timeout', () => {
  test('connection closes within ~10s if no host-connect / join arrives', async ({
    board,
    roomCode,
  }) => {
    // Use the board page as a host for the WebSocket. We aren't using
    // partysocket — just a raw WS so the server sees zero application
    // messages from us.
    const result = await board.evaluate(async (room: string) => {
      // Match connection.ts: party='game-room', room=<roomCode>, port 8787 dev.
      const wsUrl = `ws://${window.location.hostname}:8787/parties/game-room/${room}`
      const ws = new WebSocket(wsUrl)

      const opened = await new Promise<boolean>((resolve) => {
        ws.addEventListener('open', () => resolve(true), { once: true })
        ws.addEventListener('error', () => resolve(false), { once: true })
        setTimeout(() => resolve(false), 3_000)
      })

      if (!opened) return { opened: false, closeCode: -1, elapsedMs: 0 }

      const start = Date.now()
      const closeInfo = await new Promise<{ code: number; reason: string } | null>((resolve) => {
        ws.addEventListener('close', e => resolve({ code: e.code, reason: e.reason }), { once: true })
        // 12s budget: 5s identify timeout + dev-server jitter + propagation
        setTimeout(() => resolve(null), 12_000)
      })

      return {
        opened: true,
        closeCode: closeInfo?.code ?? -1,
        closeReason: closeInfo?.reason ?? '',
        elapsedMs: Date.now() - start,
      }
    }, roomCode)

    expect(result.opened).toBe(true)
    // 4002 = "Identify timeout" (the close reason set in onConnect's timer).
    expect(result.closeCode).toBe(4002)
    // Elapsed is from open → close. Should be roughly the 5s timer + jitter.
    expect(result.elapsedMs).toBeGreaterThan(4_000)
    expect(result.elapsedMs).toBeLessThan(11_000)
  })
})
