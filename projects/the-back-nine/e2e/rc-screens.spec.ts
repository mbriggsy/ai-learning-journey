import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, gotoSeedFinal, settleLayout, test } from './reviewSurface'
import { copy } from '../src/ui/copy'

/**
 * Act 6's screens, one unit's arms at a time (plan docs/plans/6-rightcapital-ui-plan.md, sections 4.0 and 5.2), on the
 * fit harness (`playwright.fit.config.ts`; `playwright.config.ts` denies it, `scripts/__tests__/playwright-harness-partition.test.ts`
 * proves one owner). Every arm enters as a user would: the dev seed's settled answer, then the answer page's door.
 *
 * RC2, the shell (section 3.1's Verification):
 *  - at his window (1440×731 @2, compact mode) the top bar is 48 px and the sub-nav 40 px; every interim page is
 *    reachable from the nav, each with exactly one `main.result` (two would make `SETTLED_RESULT` a strict-mode error in
 *    every gate) that settles; and on the table page a legacy rule's computed padding survives inside the shell (the
 *    scoped preflight never reaches an interim tab: `.rc-root` is never on the interim container);
 *  - Back with an open drawer holding an edit asks first, in the app, and loses nothing (a real browser's focus and
 *    teardown order differ from jsdom's, insight 071);
 *  - on the phone (390×844 @3) no page scrolls sideways, and the menu reaches every page, closes on the choice and
 *    hands focus back to its button;
 *  - the face: the shell's `.rc-root` surfaces (the top bar, the banner, the menu's headings) compute in Figtree, and
 *    the legacy layer's bare element rules (`base.css`'s heading serif and brand colour, its `p` measure) never reach
 *    inside `.rc-root` (`theme.css`'s scoped neutraliser).
 */

const SEED = 'retired'
const PAGES = [
  { screen: 'interim-table', module: copy.shellModuleRetirement, page: copy.shellPageCashFlows, hash: '#/retirement/cash-flows' },
  { screen: 'interim-whatif', module: copy.shellModuleRetirement, page: copy.shellPageAnalysis, hash: '#/retirement/analysis/what-if' },
  { screen: 'interim-facts', module: copy.shellModuleProfile, page: copy.workbenchPageFacts, hash: '#/profile/facts' },
] as const

/** The settled answer, then the shell through the answer page's door; it lands on the year-by-year table. */
async function enterShell(page: Page): Promise<void> {
  await gotoSeedFinal(page, SEED)
  const door = page.locator('.result-quiet-row [data-door="workbench"]')
  await expect(door, 'the door never mounted on the settled answer').toBeVisible()
  await door.click()
  await expect(page.locator('main.result[data-shell-screen="interim-table"]'), 'the door never opened the shell').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT), 'the shell carries the settle hook').toBeAttached({ timeout: FINAL_TIER_MS })
}

/** Move to a page by the laptop's nav: the module's word in the top bar, then the page's word in the sub-nav. */
async function showPage(page: Page, target: (typeof PAGES)[number]): Promise<void> {
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  const moduleLink = modules.getByRole('link', { name: target.module, exact: true })
  if ((await moduleLink.getAttribute('aria-current')) !== 'page') await moduleLink.click()
  const subNav = page.getByRole('navigation', { name: copy.shellPagesLabel })
  const pageLink = subNav.getByRole('link', { name: target.page, exact: true })
  if ((await pageLink.getAttribute('aria-current')) !== 'page') await pageLink.click()
  await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
}

/** Legacy `--brand` (`tokens.css`), the colour `base.css`'s headings carry: never a kit heading's. */
const LEGACY_BRAND = 'rgb(11, 61, 46)'

/** An element's face, colour and measure, the three things the legacy layer's bare element rules would set. */
const faceOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el)
    return { family: cs.fontFamily.replace(/["']/g, ''), color: cs.color, maxWidth: cs.maxWidth }
  })

const height = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => Math.round(el.getBoundingClientRect().height * 10) / 10)

test.describe(`RC2 · the shell at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test(`?seed=${SEED}: the top bar is 48 px and the sub-nav 40 px; every interim page reachable, one settled main.result each; a legacy rule's padding survives inside the shell`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterShell(page)
    await settleLayout(page)
    expect(await height(page, 'header.rc-root'), 'the top bar in compact mode').toBeCloseTo(48, 0)
    expect(await height(page, `nav[aria-label="${copy.shellPagesLabel}"]`), 'the sub-nav in compact mode').toBeCloseTo(40, 0)
    // The active module's block runs the bar's full height and meets the sub-nav: no seam between them.
    const join = await page.evaluate((label) => {
      const active = document.querySelector('header.rc-root a[aria-current="page"]')!.getBoundingClientRect()
      const header = document.querySelector('header.rc-root')!.getBoundingClientRect()
      const sub = document.querySelector(`nav[aria-label="${label}"]`)!.getBoundingClientRect()
      return { top: active.top - header.top, bottom: active.bottom, subTop: sub.top }
    }, copy.shellPagesLabel)
    expect(join.top, 'the active module block starts at the bar’s top').toBeCloseTo(0, 0)
    expect(Math.abs(join.bottom - join.subTop), 'the active module block meets the sub-nav').toBeLessThanOrEqual(0.5)

    // THE FACE: the shell's `.rc-root` surfaces render in Figtree (the main entry loads it), and the legacy layer's bare
    // element rules (`base.css`'s `p` measure, its headings' serif and brand colour) never reach inside `.rc-root`.
    const wordmark = await faceOf(page, 'header.rc-root a[href="./"] span:last-child')
    expect(wordmark.family, 'the top bar renders in Figtree').toMatch(/^Figtree Variable(,|$)/)
    const names = await faceOf(page, 'header.rc-root p[data-shell-names]')
    expect(names.maxWidth, 'a p inside .rc-root carries no legacy reading measure').toBe('none')
    const banner = await faceOf(page, 'p[data-interim-banner]')
    expect(banner.family, 'the interim banner renders in Figtree').toMatch(/^Figtree Variable(,|$)/)
    expect(banner.maxWidth, 'the banner carries no legacy reading measure').toBe('none')

    for (const target of PAGES) {
      await showPage(page, target)
      expect(new URL(page.url()).hash, `${target.screen}: the hash names the page`).toBe(target.hash)
      await expect(page.locator('main.result'), `${target.screen}: exactly one main.result`).toHaveCount(1)
      await expect(page.locator(SETTLED_RESULT), `${target.screen}: the settle hook settles here`).toHaveCount(1)
      await expect(page.getByText(copy.shellInterimBanner, { exact: true }), `${target.screen}: the interim banner`).toBeVisible()
      await expect(page.locator('main.result .shell-interim__title'), `${target.screen}: the page's heading`).toBeVisible()
    }

    // THE PREFLIGHT SCOPE: the table page's header cells keep their legacy padding (`workbench.css`'s `.wb-th`, 12 px at
    // the left), and the interim container keeps its own top padding (20 px). A scoped preflight that reached the
    // container (`.rc-root` on it, or a scope widened past `.rc-root`) zeroes both.
    await showPage(page, PAGES[0])
    await expect(page.locator('.wb-table'), 'the table’s rows never landed').toBeVisible({ timeout: 60_000 })
    const legacy = await page.evaluate(() => ({
      th: getComputedStyle(document.querySelector('.wb-table th.wb-th[data-col]')!).paddingLeft,
      container: getComputedStyle(document.querySelector('.shell-interim')!).paddingTop,
      insideRcRoot: document.querySelector('.shell-interim')!.closest('.rc-root') !== null,
    }))
    expect(legacy.insideRcRoot, 'the interim container sits outside every .rc-root').toBe(false)
    expect(legacy.th, 'a legacy header cell’s padding survives inside the shell').toBe('12px')
    expect(legacy.container, 'the interim container’s legacy padding survives').toBe('20px')
  })

  test(`?seed=${SEED}: Back with an open drawer holding an edit asks first, in the app; Stay keeps the drawer and the edit`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterShell(page)
    await showPage(page, PAGES[2])
    await page.getByRole('button', { name: 'Edit the two of you', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: copy.workbenchFactsPeople, exact: true })
    await expect(sheet, 'the step sheet never opened').toBeVisible()
    const name = sheet.getByLabel(copy.nameLabel, { exact: true }).first()
    await name.fill('Jordan')
    await name.blur()
    const before = page.url()
    await page.goBack()
    const ask = page.getByRole('alertdialog', { name: copy.workbenchLeaveAsk })
    await expect(ask, 'Back with an edit open asked nothing').toBeVisible()
    expect(page.url(), 'the page’s entry went back on: the address still names the facts page').toBe(before)
    await expect(page.locator('main.result[data-shell-screen="interim-facts"]')).toBeAttached()
    await expect(sheet, 'the drawer stays open under the ask').toBeVisible()
    await expect(ask.getByRole('button', { name: copy.workbenchLeaveStay }), 'focus moves to the safe choice').toBeFocused()
    await ask.getByRole('button', { name: copy.workbenchLeaveStay }).click()
    await expect(ask).toHaveCount(0)
    await expect(sheet, 'Stay keeps the drawer').toBeVisible()
    await expect(name, 'Stay keeps the edit').toHaveValue('Jordan')
  })
})

test.describe(`RC2 · the shell on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test(`?seed=${SEED}: no page scrolls sideways; the menu reaches every page, closes on the choice and hands focus back to its button`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterShell(page)
    await expect(page.getByRole('navigation', { name: copy.shellModulesLabel }), 'the modules leave the bar on the phone').toBeHidden()
    await expect(page.getByRole('navigation', { name: copy.shellPagesLabel }), 'the sub-nav leaves for the menu on the phone').toBeHidden()
    const menuButton = page.getByRole('button', { name: copy.shellMenuOpen, exact: true })
    for (const target of [PAGES[1], PAGES[2], PAGES[0]]) {
      await menuButton.click()
      const sheet = page.getByRole('dialog', { name: copy.shellMenuTitle })
      await expect(sheet, 'the menu never opened').toBeVisible()
      for (const heading of await sheet.locator('h2').all()) {
        const face = await heading.evaluate((el) => {
          const cs = getComputedStyle(el)
          return { text: el.textContent, family: cs.fontFamily.replace(/["']/g, ''), color: cs.color }
        })
        expect(face.family, `the menu heading "${face.text}" renders in Figtree, never the legacy serif`).toMatch(/^Figtree Variable(,|$)/)
        expect(face.color, `the menu heading "${face.text}" never wears the legacy brand colour`).not.toBe(LEGACY_BRAND)
      }
      expect(await sheet.getByRole('link').allTextContents(), 'the menu holds every page, in the nav’s order').toEqual([
        copy.shellPageAnalysis,
        copy.shellPageCashFlows,
        copy.workbenchPageFacts,
      ])
      await sheet.getByRole('link', { name: target.page, exact: true }).click()
      await expect(sheet, 'the menu closes on the choice').toHaveCount(0)
      await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
      await expect(menuButton, 'focus returns to the menu button').toBeFocused()
      await settleLayout(page)
      const widths = await page.evaluate(() => {
        const doc = document.scrollingElement ?? document.documentElement
        return { scroll: doc.scrollWidth, client: doc.clientWidth }
      })
      expect(widths.scroll, `${target.screen}: the page scrolls sideways`).toBeLessThanOrEqual(widths.client)
      await expect(page.locator('main.result'), `${target.screen}: exactly one main.result`).toHaveCount(1)
    }
  })
})
