/**
 * E2E: B-01 — host session token prevents WiFi-blip race-steal.
 *
 * Pre-fix posture: handleHostConnect gated on `connection.id` only. A
 * second tab opening during a brief disconnect of the original host
 * would walk in and become host — then the original tab's reconnect
 * lost the seat, despite holding the original sessionStorage.
 *
 * Post-fix: the room tracks `hostSession` (the token of the currently-
 * claimed host). It persists through the disconnect grace window
 * (DISCONNECT_DEBOUNCE_MS = 3s). During that grace, only a host-connect
 * presenting the matching token can claim — race-stealers with a
 * different/no token get rejected.
 *
 * The two tests below exercise both halves: rejection of a thief, and
 * reclaim by the original holder presenting the same token.
 */
import { test, expect } from './fixtures'

const WS_PATH = '/parties/game-room'

async function hostConnectVia(
  page: import('@playwright/test').Page,
  roomCode: string,
  sessionToken: string | null,
): Promise<{
  opened: boolean
  reply: { type: string; code?: string; message?: string } | null
  closeCode: number
}> {
  return page.evaluate(
    async ({ room, token, wsPath }: { room: string; token: string | null; wsPath: string }) => {
      const wsUrl = `ws://${window.location.hostname}:8787${wsPath}/${room}`
      const ws = new WebSocket(wsUrl)
      const opened = await new Promise<boolean>(resolve => {
        ws.addEventListener('open', () => resolve(true), { once: true })
        ws.addEventListener('error', () => resolve(false), { once: true })
        setTimeout(() => resolve(false), 3_000)
      })
      if (!opened) return { opened: false, reply: null, closeCode: -1 }

      const payload: Record<string, unknown> = {}
      if (token !== null) payload.sessionToken = token
      ws.send(JSON.stringify({ type: 'host-connect', payload }))

      // Capture either a state-update (success → host claimed) or an
      // error message (rejection). 1500ms is comfortably above
      // round-trip latency for dev wrangler.
      const reply = await new Promise<{ type: string; code?: string; message?: string } | null>(resolve => {
        ws.addEventListener(
          'message',
          e => {
            try {
              const msg = JSON.parse(e.data as string)
              resolve({ type: msg.type, code: msg.payload?.code, message: msg.payload?.message })
            } catch {
              resolve(null)
            }
          },
          { once: true },
        )
        setTimeout(() => resolve(null), 1_500)
      })

      const closeCode = ws.readyState === WebSocket.CLOSED ? 1000 : ws.readyState
      ws.close()
      return { opened, reply, closeCode }
    },
    { room: roomCode, token: sessionToken, wsPath: WS_PATH },
  )
}

// Real RFC 4122 v4 UUIDs — Zod's strict validator rejects malformed
// fixtures (the version + variant bits MUST land in the right ranges).
const THIEF_TOKEN = '5e8c3a64-1d2a-4b97-9b30-7c0c6a14d1e2'
const TOKEN_A = '7a14b9d2-9c44-4d1e-bc55-1f3eb02a9c8a'
const TOKEN_B = '92f8c6d1-2331-4e7c-a0d2-4b8b3c0e1d6c'

test.describe('B-01: host session token', () => {
  test('rejects a second tab with a different token while host is connected', async ({
    board,
    roomCode,
  }) => {
    // Board (Real Tab #1) has already opened and claimed the host seat
    // via the fixture's `board.goto('/board.html')`. Now a "thief" tab
    // with its own freshly-minted token tries to claim — must be denied.
    const result = await hostConnectVia(board, roomCode, THIEF_TOKEN)

    expect(result.opened).toBe(true)
    expect(result.reply?.type).toBe('error')
    expect(result.reply?.code).toBe('INVALID_ACTION')
    expect(result.reply?.message).toBe('Room already has a host')
  })

  test('reclaim succeeds for the original token-holder after the seat is released', async ({
    board,
    roomCode,
  }) => {
    // Different room (avoid colliding with the fixture's pre-claimed seat).
    // We reuse the `board` page just to host the in-browser WS code; the
    // room name is unrelated to the fixture's roomCode.
    void roomCode
    const isolatedRoom = `T${Date.now().toString(36).toUpperCase()}`.slice(0, 8)
    const tokenA = TOKEN_A
    const tokenB = TOKEN_B

    // Tab A claims the host seat. With hostSession previously null in
    // this fresh room, the server adopts tokenA.
    const claim = await hostConnectVia(board, isolatedRoom, tokenA)
    expect(claim.opened).toBe(true)
    expect(claim.reply?.type).toBe('state-update')

    // Tab B (different token) tries during the grace window — REJECTED.
    const stealAttempt = await hostConnectVia(board, isolatedRoom, tokenB)
    expect(stealAttempt.reply?.type).toBe('error')
    expect(stealAttempt.reply?.code).toBe('INVALID_ACTION')

    // Wait for the 3s grace to elapse. Now the server clears hostSession
    // and a fresh claim with the prior original token still works
    // (because it's just adopted as a fresh token by the new claim).
    await board.waitForTimeout(3_500)

    const reclaim = await hostConnectVia(board, isolatedRoom, tokenA)
    expect(reclaim.reply?.type).toBe('state-update')
  })
})
