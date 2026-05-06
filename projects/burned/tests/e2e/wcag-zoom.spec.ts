/**
 * WCAG 1.4.4 — 200% browser zoom protocol (Phase 5 §2.3).
 *
 * Captures each target screen at 100% baseline and 200% zoom, programmatically
 * checks for horizontal-overflow at each, and writes evidence screenshots to
 * temp/wcag-zoom/{phone,board}/<name>-{100,200}.png. The protocol doc
 * (test/device-test/wcag-200-zoom-protocol.md) consumes the programmatic
 * results + the screenshots; visual inspection (text legibility, no clipping,
 * fluid clamps engage) is a HUMAN review step that the protocol structure
 * leaves PENDING.
 *
 * Why approximate via body.style.zoom = '200%' instead of browser-UI zoom.
 * Playwright/Chromium do not expose user-level browser zoom programmatically
 * (chrome://settings/zoom is UI-only). body.style.zoom is the closest
 * scriptable equivalent: Chrome scales rendered content by the factor while
 * leaving the physical viewport unchanged, which mirrors what Ctrl + + does.
 * Non-Chromium browsers don't honor body.style.zoom; this spec is chromium-
 * only for that reason.
 *
 * Smallest viewport per axis is the target — if 1.4.4 passes at 375×667
 * (phone) and 1280×800 (board), it passes at larger viewports by construction.
 *
 * Coverage in this session:
 *   - JoinScreen (empty / name-typed) — fresh route, no game state.
 *   - Lobby phone (1 player joined) — minimal state.
 *   - Lobby board (room code + QR) — fresh route.
 * PENDING for next session (complex state setup):
 *   - PlayingView with 10-card hand, CardDetailSheet, EliminatedView,
 *     DefusePlacement sheet, NameCard sheet, GameOver.
 *   These need the arena-states-style 3-player boot + state injection.
 */

import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { joinPhone, waitForPhase, waitForPlayerCount } from './helpers'
import { writeFileSync } from 'node:fs'

interface OverflowReport {
  scrollWidth: number
  clientWidth: number
  overflow: boolean
  overflowPx: number
}

async function measureOverflow(page: Page): Promise<OverflowReport> {
  const m = await page.evaluate(() => {
    const sw = document.documentElement.scrollWidth
    const cw = document.documentElement.clientWidth
    return { scrollWidth: sw, clientWidth: cw }
  })
  return {
    scrollWidth: m.scrollWidth,
    clientWidth: m.clientWidth,
    overflow: m.scrollWidth > m.clientWidth,
    overflowPx: Math.max(0, m.scrollWidth - m.clientWidth),
  }
}

async function installPageErrorRecorder(page: Page): Promise<void> {
  // Push pageerror events AND errors that ErrorBoundary swallows into a
  // window array that assertHealthyRender can read back. React's
  // componentDidCatch consumes errors so window.onerror never fires;
  // we hook console.error too because ErrorBoundary logs there.
  await page.addInitScript(() => {
    const w = window as unknown as { __wcagPageErrors?: string[] }
    w.__wcagPageErrors = []
    window.addEventListener('error', (e) => {
      const msg = e.error instanceof Error
        ? `${e.error.message}\n${e.error.stack ?? '(no stack)'}`
        : String(e.message)
      w.__wcagPageErrors!.push(`window.error: ${msg}`)
    })
    window.addEventListener('unhandledrejection', (e) => {
      w.__wcagPageErrors!.push(`Unhandled rejection: ${String(e.reason)}`)
    })
    const origError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.message}\n${a.stack ?? '(no stack)'}`
        if (typeof a === 'object') {
          try { return JSON.stringify(a) } catch { return String(a) }
        }
        return String(a)
      }).join(' ')
      // Heuristic: only capture entries that look like ErrorBoundary catches
      // or React DOM warnings about render errors. Everything else passes
      // through silently to avoid drowning the test output.
      if (msg.includes('ErrorBoundary') || msg.includes('caught:') || msg.includes('Error:') || msg.includes('TypeError')) {
        w.__wcagPageErrors!.push(`console.error: ${msg}`)
      }
      origError(...args)
    }
  })
}

async function assertHealthyRender(page: Page, screenName: string): Promise<void> {
  // Catches "tests green but capture wrong" — if a JS error was thrown and
  // caught by ErrorBoundary, the fallback "// COMMS SCRAMBLED" text renders
  // instead of the target screen. Detect via text content + connection
  // overlay's open dialog. Pulls accumulated pageerrors for diagnosis.
  const result = await page.evaluate(() => {
    const body = document.body.textContent ?? ''
    const errorBoundaryFallback = body.includes('COMMS SCRAMBLED')
    const connDialog = document.querySelector('dialog[aria-label="Connection status"]') as HTMLDialogElement | null
    const connOverlayOpen = connDialog?.open === true
    const w = window as unknown as { __wcagPageErrors?: string[] }
    const errors = w.__wcagPageErrors ?? []
    return { errorBoundaryFallback, connOverlayOpen, errors }
  })
  if (result.errorBoundaryFallback) {
    const errSummary = result.errors.length > 0
      ? `\n\nCaptured page errors (${result.errors.length}):\n${result.errors.join('\n---\n')}`
      : '\n\n(No page errors captured — error happened before recorder installed, or was suppressed.)'
    throw new Error(`assertHealthyRender(${screenName}): ErrorBoundary fallback is rendering ("COMMS SCRAMBLED"). A JS error was thrown — check optimistic state shape, card-type strings, or component prop types.${errSummary}`)
  }
  if (result.connOverlayOpen) {
    throw new Error(`assertHealthyRender(${screenName}): ConnectionOverlay is open — WebSocket is not 'connected'. Capture would render the disconnect overlay, not the target screen.`)
  }
}

async function captureZoomPair(
  page: Page,
  surface: 'phone' | 'board',
  name: string,
): Promise<{ at100: OverflowReport; at200: OverflowReport }> {
  await assertHealthyRender(page, name)
  // 100% baseline
  await page.evaluate(() => {
    document.body.style.zoom = ''
  })
  await page.waitForTimeout(150)
  const at100 = await measureOverflow(page)
  await page.screenshot({
    path: `temp/wcag-zoom/${surface}/${name}-100.png`,
    fullPage: false,
  })

  // 200% zoom
  await page.evaluate(() => {
    document.body.style.zoom = '200%'
  })
  await page.waitForTimeout(200) // settle layout reflow
  const at200 = await measureOverflow(page)
  await page.screenshot({
    path: `temp/wcag-zoom/${surface}/${name}-200.png`,
    fullPage: false,
  })

  // Reset for next test
  await page.evaluate(() => {
    document.body.style.zoom = ''
  })
  return { at100, at200 }
}

interface Result {
  surface: 'phone' | 'board'
  screen: string
  at100: OverflowReport
  at200: OverflowReport
}
const results: Result[] = []

function record(surface: Result['surface'], screen: string, pair: { at100: OverflowReport; at200: OverflowReport }): void {
  results.push({ surface, screen, ...pair })
}

test.describe('WCAG 1.4.4 — 200% zoom (chromium-only)', () => {
  // Single project for this protocol — body.style.zoom is Chrome-specific.
  test.skip(({ browserName }) => browserName !== 'chromium', 'chromium-only')

  test.describe('phone (375×667)', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })

    test('JoinScreen — empty', async ({ page, board, roomCode }) => {
      // /player.html without ?room= shows the "No room code" screen, not
      // JoinScreen. Use the roomCode fixture so the name input renders.
      void board
      await page.goto(`/player.html?room=${roomCode}`)
      await page.locator('input[type="text"]').waitFor({ state: 'visible' })
      const pair = await captureZoomPair(page, 'phone', 'joinScreen-empty')
      record('phone', 'JoinScreen — empty', pair)
      // Soft assertion — record but don't fail (this is a survey)
      expect.soft(pair.at100.overflow, 'no horizontal overflow at 100%').toBe(false)
    })

    test('JoinScreen — name typed', async ({ page, board, roomCode }) => {
      void board
      await page.goto(`/player.html?room=${roomCode}`)
      await page.locator('input[type="text"]').waitFor({ state: 'visible' })
      await page.locator('input[type="text"]').fill('Cyril')
      const pair = await captureZoomPair(page, 'phone', 'joinScreen-nameTyped')
      record('phone', 'JoinScreen — name typed', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    })

    test('NoRoomCode — bare /player.html', async ({ page }) => {
      // Plan §2.2.3 row 32 — the screen a confused user lands on without ?room=.
      await page.goto('/player.html')
      await page.waitForFunction(
        () => document.body.textContent?.includes('No room code'),
        null,
        { timeout: 5000 },
      )
      const pair = await captureZoomPair(page, 'phone', 'noRoomCode')
      record('phone', 'NoRoomCode', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    })

    test('Lobby — 1 player joined', async ({ page, board, roomCode }) => {
      await joinPhone(page, roomCode, 'Cyril')
      // Wait for lobby state — the player should be visible in their own client
      await page.waitForFunction(
        () => {
          const w = window as unknown as { __gameStoreSnapshot?: () => { phase?: string } }
          return w.__gameStoreSnapshot?.()?.phase === 'lobby'
        },
        null,
        { timeout: 5000 },
      )
      await page.waitForTimeout(200)
      const pair = await captureZoomPair(page, 'phone', 'lobby-1player')
      record('phone', 'Lobby — 1 player joined', pair)
      expect.soft(pair.at100.overflow).toBe(false)
      // Avoid unused-var on board fixture — touch it.
      void board
    })
  })

  test.describe('board (1280×800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('Lobby — empty (QR + room code)', async ({ page }) => {
      await page.goto('/board.html')
      await page.locator('[class*="roomCode"]').waitFor({ state: 'visible', timeout: 10_000 })
      await page.waitForTimeout(200)
      const pair = await captureZoomPair(page, 'board', 'lobby-empty')
      record('board', 'Lobby — empty', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    })
  })

  // Complex-state phone screens: drive a 3-player game to playing, then
  // step through state primers (the arena-states pattern). Phone viewport is
  // resized to 375×667 mid-test before each capture so the captureZoomPair
  // helper measures the correct WCAG target dimensions.
  test('phone complex states (PlayingView, sheets, EliminatedView)', async ({ board, phones, roomCode }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'chromium-only')
    test.setTimeout(120_000)

    await installPageErrorRecorder(phones[0]!)

    // Boot 3-player game to playing. Mirror the arena-states pattern.
    await joinPhone(phones[0]!, roomCode, 'Alice')
    await joinPhone(phones[1]!, roomCode, 'Bob')
    await joinPhone(phones[2]!, roomCode, 'Carol')
    await waitForPlayerCount(board, 3)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)
    await phones[0]!.waitForFunction(() => !!document.querySelector('[role="status"]'), null, { timeout: 5_000 })
    await board.waitForTimeout(300)

    // Resize Alice (drawer) to WCAG target viewport — clamps re-evaluate.
    await phones[0]!.setViewportSize({ width: 375, height: 667 })
    await phones[0]!.waitForTimeout(300) // settle layout reflow

    const aliceId = await phones[0]!.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      return w.__gameStore?.getPlayerId() ?? ''
    })
    const bobId = await phones[1]!.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      return w.__gameStore?.getPlayerId() ?? ''
    })

    async function setPendingPrompt(page: Page, prompt: Record<string, unknown> | null): Promise<void> {
      await page.evaluate((p) => {
        const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void; clearOptimistic: () => void } }
        if (!w.__gameStore) throw new Error('wcag-zoom: __gameStore missing')
        if (p === null) {
          w.__gameStore.clearOptimistic()
        } else {
          w.__gameStore.applyOptimistic((s) => ({
            ...(s as Record<string, unknown>),
            pendingPrompt: p,
          }))
        }
      }, prompt)
    }

    async function expectDialogWithText(page: Page, text: string): Promise<void> {
      await page.waitForFunction(
        (expected) => {
          const dlg = document.querySelector('dialog[open]')
          return !!dlg && dlg.textContent?.includes(expected) === true
        },
        text,
        { timeout: 3_000 },
      )
    }

    // PlayingView baseline (no overlay, no sheet).
    {
      const pair = await captureZoomPair(phones[0]!, 'phone', 'playingView-baseline')
      record('phone', 'PlayingView — baseline', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }

    // DefusePlacement sheet.
    {
      await setPendingPrompt(phones[0]!, { type: 'defuse', playerId: aliceId })
      await expectDialogWithText(phones[0]!, 'Hide the Burned Card')
      await phones[0]!.waitForTimeout(500)
      const pair = await captureZoomPair(phones[0]!, 'phone', 'defusePlacement-sheet')
      record('phone', 'DefusePlacement sheet', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }

    // NameCard sheet (triple-steal target picker).
    {
      await setPendingPrompt(phones[0]!, { type: 'name-card', playerId: aliceId, targetId: bobId })
      await expectDialogWithText(phones[0]!, 'Name a card to steal from')
      await phones[0]!.waitForTimeout(500)
      const pair = await captureZoomPair(phones[0]!, 'phone', 'nameCard-sheet')
      record('phone', 'NameCard sheet', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }

    // Favor banner (inline, not a sheet — Player.tsx renders favor-response
    // as a banner above the staging area).
    {
      await setPendingPrompt(phones[0]!, { type: 'favor-response', playerId: aliceId, requesterId: bobId })
      await phones[0]!.waitForTimeout(600)
      const pair = await captureZoomPair(phones[0]!, 'phone', 'favorBanner')
      record('phone', 'Favor banner (inline)', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }

    // Clear pending prompt before remaining captures.
    await setPendingPrompt(phones[0]!, null)
    await phones[0]!.waitForTimeout(200)

    // PlayingView with full 10-card hand (§2.3.1 row 3 — most constrained).
    // Reshape myHand via optimistic state to 10 cards. Card types span the
    // catalog so the hand reads as a real-game pickup.
    {
      await phones[0]!.evaluate(() => {
        const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void } }
        // Real BURNED card types per src/shared/card-defs.ts. Mix of
        // operatives (matchable for combos) + actions to hit the visual
        // texture of a real late-game hand.
        const tenCards = [
          { id: 'wcag-h-1',  type: 'dash-barlowe' },
          { id: 'wcag-h-2',  type: 'vera-khan' },
          { id: 'wcag-h-3',  type: 'sable-ashworth' },
          { id: 'wcag-h-4',  type: 'janet-broadside' },
          { id: 'wcag-h-5',  type: 'reassign' },
          { id: 'wcag-h-6',  type: 'direct-order' },
          { id: 'wcag-h-7',  type: 'go-dark' },
          { id: 'wcag-h-8',  type: 'intel-briefing' },
          { id: 'wcag-h-9',  type: 'call-in-a-favor' },
          { id: 'wcag-h-10', type: 'intercepted' },
        ]
        w.__gameStore?.applyOptimistic((s) => ({
          ...(s as Record<string, unknown>),
          myHand: tenCards,
        }))
      })
      await phones[0]!.waitForTimeout(400) // hand re-layout settle
      const pair = await captureZoomPair(phones[0]!, 'phone', 'playingView-fullHand10')
      record('phone', 'PlayingView — 10-card hand (§2.3 row 3)', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }

    // Real EliminatedView component (§2.3.1 row 5). Player.tsx routes to
    // <EliminatedView /> when myPlayer.isAlive === false. Find Alice in
    // players[] and flip the flag.
    {
      await phones[0]!.evaluate((id) => {
        const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void } }
        w.__gameStore?.applyOptimistic((s) => {
          const state = s as Record<string, unknown>
          const players = (state.players as Array<Record<string, unknown>>) ?? []
          return {
            ...state,
            players: players.map((p) => p.id === id ? { ...p, isAlive: false } : p),
          }
        })
      }, aliceId)
      await phones[0]!.waitForTimeout(500) // route swap settle
      const pair = await captureZoomPair(phones[0]!, 'phone', 'eliminatedView-real')
      record('phone', 'EliminatedView (real component)', pair)
      expect.soft(pair.at100.overflow).toBe(false)
    }
  })

  // Board GameOver — winner reveal at smallest board viewport.
  test('board GameOver — winner reveal', async ({ board, phones, roomCode }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'chromium-only')
    test.setTimeout(60_000)

    // Boot to playing so player ids exist; then drive board into game_over.
    await joinPhone(phones[0]!, roomCode, 'Alice')
    await joinPhone(phones[1]!, roomCode, 'Bob')
    await joinPhone(phones[2]!, roomCode, 'Carol')
    await waitForPlayerCount(board, 3)
    await board.locator('button:has-text("Cleared Hot")').click()
    await waitForPhase(board, 'playing', 10_000)
    await board.waitForTimeout(300)

    const aliceId = await phones[0]!.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      return w.__gameStore?.getPlayerId() ?? ''
    })
    const bobId = await phones[1]!.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      return w.__gameStore?.getPlayerId() ?? ''
    })
    const carolId = await phones[2]!.evaluate(() => {
      const w = window as unknown as { __gameStore?: { getPlayerId(): string | null } }
      return w.__gameStore?.getPlayerId() ?? ''
    })

    // Resize board to WCAG target.
    await board.setViewportSize({ width: 1280, height: 800 })
    await board.waitForTimeout(300)

    // Drive board state to game_over with Alice winning, Carol then Bob
    // eliminated (eliminationOrder is order-of-elimination).
    await board.evaluate(({ winner, eliminated }) => {
      const w = window as unknown as { __gameStore?: { applyOptimistic: (t: (s: unknown) => unknown) => void } }
      w.__gameStore?.applyOptimistic((s) => ({
        ...(s as Record<string, unknown>),
        phase: 'game_over',
        winnerId: winner,
        eliminationOrder: eliminated,
      }))
    }, { winner: aliceId, eliminated: [carolId, bobId] })

    await board.waitForTimeout(800) // mount + stagger settle
    const pair = await captureZoomPair(board, 'board', 'gameOver-winner')
    record('board', 'GameOver — winner reveal', pair)
    expect.soft(pair.at100.overflow).toBe(false)
  })

  test.afterAll(async () => {
    // Write a JSON sidecar that the protocol doc consumes.
    writeFileSync(
      'temp/wcag-zoom/results.json',
      JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
    )
  })
})
