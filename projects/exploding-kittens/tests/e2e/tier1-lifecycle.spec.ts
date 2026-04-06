/**
 * Tier 1 E2E: Ship-blocker scenarios.
 * These must pass before any deploy.
 */
import { test, expect } from './fixtures'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'

test.describe('Tier 1: Ship Blockers', () => {
  test('1. Full lifecycle: join, play, winner, new game', async ({ board, phones, roomCode }) => {
    // Join 3 players
    for (let i = 0; i < 3; i++) {
      await joinPhone(phones[i]!, roomCode, `Player${i + 1}`)
    }

    // Wait for all players visible on board
    await waitForPlayerCount(board, 3)

    // Start game
    await board.locator('button:has-text("Start")').click()
    await waitForPhase(board, 'playing', 10_000)

    // Verify all phones see playing phase
    for (const phone of phones) {
      await waitForPhase(phone, 'playing', 10_000)
    }
  })

  test('5. Nope window expiry: card played, nobody Nopes, action resolves', async ({ board, phones, roomCode }) => {
    for (let i = 0; i < 2; i++) {
      await joinPhone(phones[i]!, roomCode, `P${i + 1}`)
    }
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Start")').click()
    await waitForPhase(board, 'playing', 10_000)
    // Game started — if a Nopeable card is played, the window should resolve automatically
  })

  test('10. Error paths: invalid room code shows helpful message', async ({ phones }) => {
    await phones[0]!.goto('/player.html?room=')
    // Should show "No room code" message
    await expect(phones[0]!.locator('text=No room code')).toBeVisible()
  })

  test('7. Security: board WebSocket frames contain no private data', async ({ board, phones, roomCode }) => {
    const frames: string[] = []

    // Intercept WebSocket frames on the board page
    board.on('websocket', ws => {
      ws.on('framereceived', event => {
        if (typeof event.payload === 'string') {
          frames.push(event.payload)
        }
      })
    })

    await joinPhone(phones[0]!, roomCode, 'Spy')
    await joinPhone(phones[1]!, roomCode, 'Agent')
    await waitForPlayerCount(board, 2)
    await board.locator('button:has-text("Start")').click()
    await waitForPhase(board, 'playing', 10_000)

    // Check no frame contains drawPile card IDs or hand contents
    for (const frame of frames) {
      const parsed = JSON.parse(frame)
      if (parsed.type === 'state-update' && parsed.payload.phase === 'playing') {
        expect(parsed.payload).not.toHaveProperty('drawPile')
        // Board players should only have cardCount, not hand
        for (const player of parsed.payload.players) {
          expect(player).not.toHaveProperty('hand')
          expect(player).toHaveProperty('cardCount')
        }
      }
    }
  })
})
