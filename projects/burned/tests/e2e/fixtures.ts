import { test as base, type Page, devices } from '@playwright/test'

export type GameFixtures = {
  board: Page
  phones: Page[]
  roomCode: string
}

export const test = base.extend<GameFixtures>({
  board: async ({ browser }, use) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
  phones: async ({ browser }, use) => {
    const pages: Page[] = []
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true })
      pages.push(await ctx.newPage())
    }
    await use(pages)
    for (const page of pages) {
      await page.context().close()
    }
  },
  roomCode: async ({ board }, use) => {
    await board.goto('/board.html')
    // Wait for room code to appear in the lobby
    const codeEl = board.locator('[class*="roomCode"]')
    await codeEl.waitFor({ timeout: 10_000 })
    const code = await codeEl.textContent() ?? ''
    await use(code.trim())
  },
})

export { expect } from '@playwright/test'
