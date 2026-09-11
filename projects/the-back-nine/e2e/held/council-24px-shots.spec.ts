import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { REAL, REAL_DPR, PHONE, gotoSeedFinal } from '../reviewSurface'
import { mkdirSync } from 'node:fs'

/**
 * AN INSTRUMENT, NOT A GATE — the frames Briggsy's eye audits the 2026-09-10 council ruling from.
 *
 * It asserts NOTHING about the product: it navigates, pins the root font it actually rendered at,
 * and writes PNGs to `temp/council-24px/`. It is held out of EVERY CI gate — and that is gated,
 * not claimed: `pnpm verify:fit` allowlists its three specs by name, Vitest excludes `e2e/**`,
 * the CSP harness's `testIgnore` denylist names the `held` directory at any depth (the glob is
 * spelled in the config — it cannot be spelled inside a block comment), and
 * scripts/__tests__/playwright-harness-partition.test.ts runs each config's real collector to
 * prove nothing under e2e/held/ is claimed by a CI gate. (The first cut of this file claimed it
 * "can never red CI" on the strength of the first two alone; the CSP harness collects e2e/**
 * by default, so `pnpm verify:csp` ran these six arms against dist/ — no `?seed=` routes there —
 * and CI was red for three commits, c61dea7e through 73242ac8.) Run it by hand:
 *
 *     pnpm exec playwright test --config e2e/held/shots.config.ts
 *
 * WHY IT EXISTS AT ALL (the review's P2 on the throwaway harness that made the first set): that
 * harness took `fullPage: true` FIRST and the first-frame shot second, and the 24 px first frame
 * came back BYTE-IDENTICAL to the 16 px control — Chromium drops the `Page.setFontSizes`
 * emulation when a full-page capture resizes the surface, so every shot after one is at the
 * browser default. Two rules follow, and this file is built around them:
 *
 *   1. THE FIRST-FRAME SHOT IS TAKEN FIRST, the full-page shot second. Order is the fix.
 *   2. THE ROOT IS RE-MEASURED IMMEDIATELY BEFORE EVERY CAPTURE and asserted to be the regime the
 *      shot is NAMED for. A screenshot filed under a font size it was not taken at is worse than
 *      no screenshot: his eye would rule on a frame that does not exist on anyone's device.
 */

const OUT = 'temp/council-24px'

/** Re-measure the root on the page about to be captured and pin it to the NAMED regime, then
 *  shoot. Called separately for the first-frame and the full-page capture — rule 2 above. */
async function shoot(page: Page, name: string, expectedRootPx: number): Promise<void> {
  const before = await rootPx(page)
  expect(before, `${name}: first-frame capture at root ${before}px, named ${expectedRootPx}px`).toBe(
    expectedRootPx,
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${OUT}/${name}-first-frame.png` })
  const between = await rootPx(page)
  expect(between, `${name}: the root moved to ${between}px before the full-page capture`).toBe(
    expectedRootPx,
  )
  await page.screenshot({ path: `${OUT}/${name}-fullpage.png`, fullPage: true })
}

function rootPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
}

/** The reader's raised browser default, through CDP — the same call the fit gate's arms make. */
async function raise(page: Page, context: BrowserContext, px: number): Promise<void> {
  await page.goto('/')
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: px, fixed: px } })
}

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true })
})

test.describe('the phone at the default font', () => {
  test.use({ viewport: PHONE })
  test('phone-16px-retired', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await shoot(page, 'phone-16px-retired', 16)
  })
  test('phone-16px-dip (the date route)', async ({ page }) => {
    await gotoSeedFinal(page, 'dip')
    await shoot(page, 'phone-16px-dip', 16)
  })
})

test.describe(`Briggsy's window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  // THE CONTROL. Same viewport, same seed, no emulation — the frame the 24 px shot must NOT
  // resemble byte-for-byte. (That equality is exactly the defect this file was written to kill.)
  test('laptop-16px-retired-control', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await shoot(page, 'laptop-16px-retired-control', 16)
  })

  // 24 px: 68rem resolves to 1632 px, so this 1536 window renders the STACKED tier — the regime
  // the scrolling law governs, and the one his eye is auditing.
  test('laptop-24px-retired', async ({ page, context }) => {
    await raise(page, context, 24)
    await gotoSeedFinal(page, 'retired')
    await shoot(page, 'laptop-24px-retired', 24)
  })

  test('laptop-24px-dip (the date route)', async ({ page, context }) => {
    await raise(page, context, 24)
    await gotoSeedFinal(page, 'dip')
    await shoot(page, 'laptop-24px-dip', 24)
  })

  // 20 px — Chrome's one-click "Large": 68rem is 1360 px, so this window STAYS two-pane and the
  // one-frame budget binds at 1.25× ink. `budget` is the worst measured seed (the protected
  // caveat ended at 936 px against 791). The open fork's frame.
  test('laptop-20px-budget', async ({ page, context }) => {
    await raise(page, context, 20)
    await gotoSeedFinal(page, 'budget')
    await shoot(page, 'laptop-20px-budget', 20)
  })
})
