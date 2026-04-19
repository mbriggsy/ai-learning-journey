/**
 * Layout-integrity sweep: drives a 3-player game end-to-end and captures
 * screenshots + computed overflow metrics at every major surface across
 * phone and board viewports.
 *
 * Not part of the Tier 1 ship-blocker suite. Run manually:
 *   pnpm exec playwright test tests/e2e/layout-sweep.spec.ts --project=chromium
 */
import { test, type Page, type BrowserContext, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'temp', 'layout-sweep')
mkdirSync(OUT, { recursive: true })

type OverflowFinding = {
  viewport: string
  surface: string
  selector: string
  text: string
  kind: 'horizontal-overflow' | 'vertical-overflow' | 'out-of-bounds' | 'clipped-by-ancestor'
  overflow: { scrollW: number; clientW: number; scrollH: number; clientH: number }
  rect: { x: number; y: number; w: number; h: number }
}

async function captureOverflow(page: Page, viewport: string, surface: string): Promise<OverflowFinding[]> {
  return page.evaluate(
    ({ viewport, surface }) => {
      const findings: OverflowFinding[] = []
      const all = document.querySelectorAll<HTMLElement>('body *')
      const vw = window.innerWidth
      const vh = window.innerHeight

      all.forEach((el) => {
        const cs = getComputedStyle(el)
        // Skip hidden / zero-size elements
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return

        const selector = el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : '') +
          (el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '')
        const text = (el.textContent ?? '').trim().slice(0, 60)

        // Only flag overflow when the element would actually clip or scroll.
        // `overflow: visible` (the default) renders children outside the box
        // by design — pseudo-element glow halos, focus rings, tooltips, etc.
        // scrollWidth > clientWidth there is expected, not a bug.
        const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
        const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'

        // 1. Horizontal overflow: content wider than container AND the element
        // actually clips (hidden/clip). Scroll/auto containers self-handle.
        if (el.scrollWidth > el.clientWidth + 1 && clipsX) {
          findings.push({
            viewport, surface, selector, text,
            kind: 'horizontal-overflow',
            overflow: { scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight },
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          })
        }

        // 2. Vertical overflow on clipping containers.
        if (el.scrollHeight > el.clientHeight + 1 && clipsY) {
          findings.push({
            viewport, surface, selector, text,
            kind: 'vertical-overflow',
            overflow: { scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight },
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          })
        }

        // 3. Out of viewport bounds (bleeding off-screen)
        if (rect.right > vw + 1 || rect.left < -1 || rect.bottom > vh + 1 || rect.top < -1) {
          // Exclude absolutely/fixed-positioned overlays that are intentionally off-screen
          if (cs.position !== 'fixed' && cs.position !== 'absolute') {
            findings.push({
              viewport, surface, selector, text,
              kind: 'out-of-bounds',
              overflow: { scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight },
              rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            })
          }
        }
      })

      return findings
    },
    { viewport, surface },
  )
}

async function snap(page: Page, viewport: string, name: string, findings: OverflowFinding[]): Promise<void> {
  const surface = `${viewport}__${name}`
  await page.screenshot({ path: join(OUT, `${surface}.png`), fullPage: false })
  findings.push(...(await captureOverflow(page, viewport, name)))
}

async function newBoard(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/board.html')
  await page.waitForFunction(() => {
    const snap = (window as unknown as { __gameStoreSnapshot?: () => { roomCode?: string } }).__gameStoreSnapshot?.()
    return snap && typeof snap.roomCode === 'string' && snap.roomCode.length > 0
  }, { timeout: 10_000 })
  return page
}

async function getRoomCode(board: Page): Promise<string> {
  return board.evaluate(() => {
    const snap = (window as unknown as { __gameStoreSnapshot?: () => { roomCode?: string } }).__gameStoreSnapshot?.()
    return snap?.roomCode ?? ''
  })
}

async function newPhone(browser: import('@playwright/test').Browser, deviceKey: 'Pixel 5' | 'iPhone 13'): Promise<{ page: Page; ctx: BrowserContext }> {
  const device = devices[deviceKey]
  const ctx = await browser.newContext({ ...device, hasTouch: true })
  const page = await ctx.newPage()
  return { page, ctx }
}

async function joinPhone(page: Page, roomCode: string, name: string): Promise<void> {
  await page.goto(`/player.html?room=${roomCode}`)
  await page.locator('input[type="text"]').fill(name)
  await page.locator('button:has-text("Check In")').click()
}

test.setTimeout(180_000)

test('layout sweep', async ({ browser }) => {
  const findings: OverflowFinding[] = []
  const boardCtx = await browser.newContext()
  const board = await newBoard(boardCtx)
  const roomCode = await getRoomCode(board)

  // BOARD: lobby (empty)
  await snap(board, 'board_1920', 'lobby_empty', findings)

  // Join 3 phones (Pixel 5 for phone_412, iPhone 13 for phone_390)
  const { page: p1, ctx: c1 } = await newPhone(browser, 'Pixel 5')
  const { page: p2, ctx: c2 } = await newPhone(browser, 'iPhone 13')
  const { page: p3, ctx: c3 } = await newPhone(browser, 'Pixel 5')

  // Phone join screen (before name entered)
  await p1.goto(`/player.html?room=${roomCode}`)
  await snap(p1, 'phone_pixel5', 'join_screen', findings)

  await joinPhone(p1, roomCode, 'Dash')
  await joinPhone(p2, roomCode, 'Vera')
  await joinPhone(p3, roomCode, 'Otto')

  await board.waitForFunction(() => {
    const snap = (window as unknown as { __gameStoreSnapshot?: () => { players?: unknown[] } }).__gameStoreSnapshot?.()
    return snap && Array.isArray(snap.players) && snap.players.length === 3
  }, { timeout: 15_000 })

  // Let AnimatePresence stagger (0.06s * 3 players = 180ms) + Motion settle
  await board.waitForTimeout(500)

  // BOARD: lobby with 3 players
  await snap(board, 'board_1920', 'lobby_3players', findings)

  // Phone: lobby waiting state
  await snap(p1, 'phone_pixel5', 'lobby_waiting', findings)
  await snap(p2, 'phone_iphone13', 'lobby_waiting', findings)

  // Start game
  await board.locator('button:has-text("Cleared Hot")').click()
  await board.waitForFunction(() => {
    const snap = (window as unknown as { __gameStoreSnapshot?: () => { phase?: string } }).__gameStoreSnapshot?.()
    return snap?.phase === 'playing'
  }, { timeout: 15_000 })
  await p1.waitForFunction(() => {
    const snap = (window as unknown as { __gameStoreSnapshot?: () => { phase?: string } }).__gameStoreSnapshot?.()
    return snap?.phase === 'playing'
  }, { timeout: 15_000 })

  // BOARD: arena playing
  await board.waitForTimeout(500)
  await snap(board, 'board_1920', 'arena_playing', findings)

  // PHONES: playing view — capture all three (one will be "your turn")
  await p1.waitForTimeout(500)
  await snap(p1, 'phone_pixel5', 'playing_view', findings)
  await snap(p2, 'phone_iphone13', 'playing_view', findings)
  await snap(p3, 'phone_pixel5_p3', 'playing_view', findings)

  // Determine who's turn it is by checking each phone
  const activePhone = await (async () => {
    for (const p of [p1, p2, p3]) {
      const isMyTurn = await p.evaluate(() => {
        const snap = (window as unknown as { __gameStoreSnapshot?: () => { isMyTurn?: boolean; currentPlayerId?: string; playerId?: string } }).__gameStoreSnapshot?.()
        return snap ? snap.currentPlayerId === snap.playerId : false
      })
      if (isMyTurn) return p
    }
    return null
  })()

  if (activePhone) {
    const viewportWidth = activePhone.viewportSize()?.width ?? 0
    const vpName = viewportWidth <= 400 ? 'phone_iphone13' : 'phone_pixel5'

    // Double-tap the first card in the hand to stage it
    const firstCard = activePhone.locator('[class*="card"][class*="handCard"], [data-card-id]').first()
    const cardCount = await firstCard.count()
    if (cardCount > 0) {
      // Trigger double-tap via two rapid pointerdown/up events
      await firstCard.dispatchEvent('pointerdown')
      await firstCard.dispatchEvent('pointerup')
      await firstCard.dispatchEvent('pointerdown')
      await firstCard.dispatchEvent('pointerup')
      await activePhone.waitForTimeout(600)
      await snap(activePhone, vpName, 'staging_one_card', findings)
    }
  }

  // Capture GameOver-adjacent: skip, would need to force a game to end.
  // Tier-1 coverage is enough for layout sweep.

  // Cleanup
  for (const ctx of [c1, c2, c3, boardCtx]) await ctx.close()

  // Write findings report
  const { writeFileSync } = await import('node:fs')
  writeFileSync(
    join(OUT, 'findings.json'),
    JSON.stringify(findings, null, 2),
  )
  console.log(`\nLayout sweep: captured ${findings.length} overflow findings to temp/layout-sweep/findings.json`)
  for (const f of findings.slice(0, 40)) {
    console.log(`  [${f.viewport}][${f.surface}] ${f.kind}: ${f.selector} "${f.text.slice(0, 30)}" — ${JSON.stringify(f.overflow)}`)
  }
})
