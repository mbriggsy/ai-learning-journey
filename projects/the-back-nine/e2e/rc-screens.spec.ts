import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, FLOOR, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, armRefiguringWatch, expectRefiguringSeen, gotoSeedFinal, gotoVaultFinal, pinPlantDay, pinnedDay, pinnedYear, refiguringLog, settleLayout, test } from './reviewSurface'
import { copy, slots } from '../src/ui/copy'
import { ENGINE_PRICING_LEDGER } from '../src/engine/pricingVersion'
import { DEV_VAULT_PASSPHRASE as DEV_PASSPHRASE } from '../src/ui/devSeeds'
import { FAN, assertHcText, enterSnapshot, hcAudit, hcFloorPx, hcMarkFailures, hcMarks, hcTextFailures, hoverMedian } from './hcTextAudit'

/**
 * Act 6's screens, one unit's arms at a time (plan docs/plans/6-rightcapital-ui-plan.md, sections 4.0 and 5.2), on the
 * fit harness (`playwright.fit.config.ts`; `playwright.config.ts` denies it, `scripts/__tests__/playwright-harness-partition.test.ts`
 * proves one owner). Every arm enters as a user would: since RC4 the dev seed's settled answer lands on the home
 * (Dashboard → Snapshot), and the module and page words move between pages.
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
/** The interim pages (outside any `.rc-root`), and RC6's Cash Flows, the menu's other walk target. */
const PAGES = [{ screen: 'interim-facts', module: copy.shellModuleProfile, page: copy.workbenchPageFacts, hash: '#/profile/facts' }] as const
const CASH_FLOWS = { screen: 'cash-flows', module: copy.shellModuleRetirement, page: copy.shellPageCashFlows, hash: '#/retirement/cash-flows' } as const

/** The settled answer, which lands on the home, Dashboard → Snapshot (RC4: the shell is the home, no door). */
async function enterShell(page: Page): Promise<void> {
  await gotoSeedFinal(page, SEED)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT), 'the shell carries the settle hook').toBeAttached({ timeout: FINAL_TIER_MS })
}

/** Move to a page by the laptop's nav: the module's word in the top bar, then the page's word in the sub-nav. */
async function showPage(page: Page, target: { readonly screen: string; readonly module: string; readonly page: string }): Promise<void> {
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
    await showPage(page, PAGES[0])
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

    // THE PREFLIGHT SCOPE: the facts page's sections keep their legacy padding (`workbench.css`'s `.wb-facts__section`;
    // the table page's header cell carried this arm until RC6 rebuilt Cash Flows), and the interim container keeps its
    // own top padding (20 px). A scoped preflight that reached the container (`.rc-root` on it, or a scope widened past
    // `.rc-root`) zeroes both.
    await showPage(page, PAGES[0])
    await expect(page.locator('.wb-facts__section').first(), 'the facts page never drew').toBeVisible({ timeout: 60_000 })
    const legacy = await page.evaluate(() => ({
      th: getComputedStyle(document.querySelector('.wb-facts__section')!).paddingTop,
      container: getComputedStyle(document.querySelector('.shell-interim')!).paddingTop,
      insideRcRoot: document.querySelector('.shell-interim')!.closest('.rc-root') !== null,
    }))
    expect(legacy.insideRcRoot, 'the interim container sits outside every .rc-root').toBe(false)
    expect(legacy.th, 'a legacy section’s padding survives inside the shell').toBe('12px')
    expect(legacy.container, 'the interim container’s legacy padding survives').toBe('20px')
  })

  test(`?seed=${SEED}: Back with an open drawer holding an edit asks first, in the app; Stay keeps the drawer and the edit`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterShell(page)
    await showPage(page, PAGES[0])
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
    for (const target of [PAGES[0], CASH_FLOWS]) {
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
        copy.shellPageSnapshot,
        copy.shellPageAnalysis,
        copy.shellPageHealthCare,
        copy.shellPageCashFlows,
        copy.shellPageTaxStrategies,
        copy.workbenchPageFacts,
      ])
      await sheet.getByRole('link', { name: target.page, exact: true }).click()
      await expect(sheet, 'the menu closes on the choice').toHaveCount(0)
      await expect(menuButton, 'focus returns to the menu button').toBeFocused()
      await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
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

// ── RC3 · Dashboard → Snapshot (plan 6, RC3's Verification) ──────────────────────────────────────────────────────────
// On `retired` (the spine), `dip` and `datemixed` (the date route; `datemixed` the densest named moments): Snapshot is a
// scrolling page whose first frame at his window holds the title, the ring card and the stat rings; exactly one R13
// disclaimer is visible, in frame at REAL (the ring card's caveat; App.tsx's trailing mount hidden behind
// `data-inframe-disclaimer`); the fan's band words, ticks, named moments and legend pass the Highcharts text audit
// (`e2e/hcTextAudit.ts`) at REAL and PHONE, read again with the median hovered at REAL; on the phone the cards stack in
// one column in their order; no page scrolls sideways.
const RC3_SEEDS = ['retired', 'dip', 'datemixed'] as const
const CARD_ORDER = ['ring', 'stats', 'invested', 'fan', 'recommendations'] as const

/** The fan's required words: the two ranges' words printed inside them, every legend item, and at least the axis
 *  ticks and named moments every household's fan carries. */
const FAN_REQUIRED = {
  texts: [copy.snapshotFanOuterWords, copy.snapshotFanInnerWords, copy.snapshotFanOuter, copy.snapshotFanInner, copy.snapshotFanMedian],
  counts: { 'data-label': 2, 'legend-item': 3, 'axis-label': 4, 'plot-line-label': 2 },
} as const

async function assertOneVisibleCaveat(page: Page, inFrameHeight: number | null): Promise<void> {
  const caveat = page.locator('main.result[data-inframe-disclaimer] [data-caveat]')
  await expect(caveat, 'Snapshot’s in-frame caveat').toHaveCount(1)
  await expect(caveat).toBeVisible()
  await expect(page.locator('footer.disclaimer'), 'App.tsx’s trailing mount is hidden behind data-inframe-disclaimer').toBeHidden()
  const visible = await page.evaluate(
    () => [...document.querySelectorAll('footer.disclaimer, [data-caveat]')].filter((el) => getComputedStyle(el).display !== 'none' && (el as HTMLElement).getClientRects().length > 0).length,
  )
  expect(visible, 'exactly one visible R13 disclaimer').toBe(1)
  if (inFrameHeight !== null) {
    const box = (await caveat.boundingBox())!
    expect(box.y + box.height, 'the caveat sits inside the first frame').toBeLessThanOrEqual(inFrameHeight)
  }
}

async function noSidewaysScroll(page: Page, who: string): Promise<void> {
  const w = await page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement
    return { scroll: doc.scrollWidth, client: doc.clientWidth }
  })
  expect(w.scroll, `${who}: the page scrolls sideways`).toBeLessThanOrEqual(w.client)
}

test.describe(`RC3 · Snapshot at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  for (const seed of RC3_SEEDS) {
    test(`?seed=${seed}: the first frame holds the title, the ring card and the stat rings; one R13 caveat in frame; the fan's text passes the audit`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterSnapshot(page, seed)
      await expect(page.locator('main.result'), 'exactly one main.result').toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSnapshot })).toBeVisible()
      await expect(page.locator('[data-ring-reading]'), `${seed}: the ring card shows no reading`).toBeVisible()
      // The stat rings land from the steady future's run: a hedged figure in each dial.
      await expect(page.locator('[data-stat]').first(), `${seed}: the stat figure never landed`).toContainText('~', { timeout: 60_000 })
      await settleLayout(page)
      const frame = await page.evaluate(() => {
        const bottom = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().bottom
        return {
          title: bottom('main.result h1'),
          ring: bottom('[data-card="ring"]'),
          stats: Math.max(...[...document.querySelectorAll('[data-stat]')].map((el) => el.getBoundingClientRect().bottom)),
          scrollY: window.scrollY,
        }
      })
      expect(frame.scrollY).toBe(0)
      expect(frame.title, `${seed}: the title in the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.ring, `${seed}: the ring card in the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.stats, `${seed}: the stat rings in the first frame`).toBeLessThanOrEqual(REAL.height)
      await assertOneVisibleCaveat(page, REAL.height)
      await noSidewaysScroll(page, `${seed} REAL`)
      await page.locator(FAN[1]).scrollIntoViewIfNeeded()
      await settleLayout(page)
      const floor = await hcFloorPx(page)
      assertHcText(await hcAudit(page, ...FAN), floor, FAN_REQUIRED, `${seed} REAL fan`)
      if (seed === 'dip') {
        // Every working household's fan is cut where the cohort thins (`dip` well before its last year): the right-hand
        // moment names the cut, never the plan's horizon.
        await expect(page.locator(`${FAN[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockCutLabel }), 'dip: the cut edge named').toHaveCount(1)
        await expect(page.locator(`${FAN[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockHorizonLabel }), 'dip: no "Plan horizon" on a cut fan').toHaveCount(0)
      }
      // Decision 7: hovering a point of ANOTHER series fades no printed value.
      await hoverMedian(page)
      assertHcText(await hcAudit(page, ...FAN), floor, FAN_REQUIRED, `${seed} REAL fan, the median hovered`)
    })
  }
})

test.describe(`RC3 · Snapshot on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of RC3_SEEDS) {
    test(`?seed=${seed}: one column in order, one R13 caveat, no sideways scroll; the fan's text passes the audit`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterSnapshot(page, seed)
      const boxes = await page.evaluate(
        (order) =>
          order.map((name) => {
            const r = document.querySelector(`[data-card="${name}"]`)!.getBoundingClientRect()
            return { name, left: Math.round(r.left), top: r.top, bottom: r.bottom }
          }),
        [...CARD_ORDER],
      )
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i]!.top, `${seed}: ${boxes[i]!.name} sits below ${boxes[i - 1]!.name}`).toBeGreaterThanOrEqual(boxes[i - 1]!.bottom)
        expect(boxes[i]!.left, `${seed}: ${boxes[i]!.name} shares the one column`).toBe(boxes[0]!.left)
      }
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} PHONE`)
      await page.locator(FAN[1]).scrollIntoViewIfNeeded()
      await settleLayout(page)
      const floor = await hcFloorPx(page)
      assertHcText(await hcAudit(page, ...FAN), floor, FAN_REQUIRED, `${seed} PHONE fan`)
    })
  }
})

// ── RC4 · the shell as the home, and Retirement → Analysis → Probability (plan 6, RC4's Verification and test scenarios;
// section 5.2's ports from `e2e/vertical-fit.spec.ts` and `e2e/chart-text.spec.ts`) ─────────────────────────────────
// - a seed's settled answer lands on Snapshot (no answer page, no door), the landing REPLACING the document's entry;
// - Probability at his window in compact mode on every named seed: one frame from the top bar to the R13 caveat (title,
//   intro, the panel, the caveat in frame, plan RC4's fit decision with no tray yet), exactly one visible R13 caveat, the
//   state clause naming the state the run priced (North Carolina, Pennsylvania, Florida's $0, the unpriced monolith), the
//   working route's survivor stopgap and no balance bar, the retired route's bar labelled "when the second of you dies"
//   with its text passing the Highcharts audit; no sideways scroll;
// - Odds by stop year on `dip` (laptop and phone): exactly one crowned year wearing its word, no "10 of 10" anywhere, the
//   on-track line's word, the text audit (the phone's frame scrolls inside itself, never the page); on `?vault=datearrived`
//   no year before the wall year is plotted;
// - at the phone and at a 20 px browser default: the intro, the halves, then the caveat, in order and reachable;
// - the saved recommendation (`?vault=rec`): Snapshot's "Try it in the plan" opens Probability with Recommended on the
//   left; the interim Tax Strategies tab carries the record card.
const RC4_FRAME_SEEDS = [
  { seed: 'retired', route: 'headline', state: null },
  // The split households: an essentials row under each ring (measured: before the halves shared their rows' second
  // lines, `budget`'s caveat sat at 767 px).
  { seed: 'budget', route: 'headline', state: null },
  { seed: 'patypical', route: 'headline', state: 'Pennsylvania' },
  { seed: 'nc', route: 'headline', state: 'North Carolina' },
  { seed: 'pa', route: 'headline', state: 'Pennsylvania' },
  { seed: 'fl', route: 'headline', state: 'Florida' },
  { seed: 'elsewhere', route: 'headline', state: copy.verdictStateUnpricedNote },
  { seed: 'dip', route: 'date', state: null },
  { seed: 'datenc', route: 'date', state: 'North Carolina' },
  { seed: 'date65', route: 'date', state: null },
  { seed: 'datemixed', route: 'date', state: null },
] as const

/** A seed's settled answer, then Retirement → Analysis → Probability (the module word at a laptop, the menu on a
 *  phone), its charts drawn and settled. */
async function enterProbability(page: Page, seed: string): Promise<void> {
  await gotoSeedFinal(page, seed)
  await toProbability(page, seed)
}

/** From the home, Retirement → Analysis → Probability, its charts drawn and settled. */
async function toProbability(page: Page, seed: string): Promise<void> {
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), `${seed}: the seed never landed on the home`).toBeAttached({ timeout: 30_000 })
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: copy.shellPageAnalysis, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
  }
  await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
  await expect(page.locator('[data-ring-half="compared"]'), `${seed}: the plan’s ring never drew`).toBeVisible({ timeout: 60_000 })
  if ((await page.locator('[data-probability="headline"]').count()) > 0) {
    // The bar, or on a $0 middle balance the words in its place.
    await expect(page.locator('[data-bar="compared"] .highcharts-series-group, [data-bar-none]').first(), `${seed}: the plan’s bar never drew`).toBeAttached({ timeout: 60_000 })
  }
  await page.waitForTimeout(800)
  await settleLayout(page)
}

/** Open the Odds by stop year chart through the chart title's menu. */
async function openOdds(page: Page): Promise<void> {
  await page.getByRole('button', { name: copy.probabilityChartRings }).click()
  await page.getByRole('menuitemradio', { name: copy.probabilityChartOdds }).click()
  await expect(page.locator('[data-chart="odds"] .highcharts-series-group'), 'the odds chart never drew').toBeAttached({ timeout: 30_000 })
  await page.waitForTimeout(800)
  await settleLayout(page)
}

/** The odds chart's marks: every drawn bar prints its own count (one label per bar), and no mark oracle fails: every bar
 *  and every label inside the frame a reader sees, no label over any bar, the on-track line or another label. */
async function assertOddsMarks(page: Page, label: string): Promise<void> {
  const m = await hcMarks(page, '[data-chart="odds"]', '[data-odds-frame]', '.b9-odds-spacer')
  expect(m.marks.length, `${label}: the chart drew its bars`).toBeGreaterThan(0)
  expect(m.labels.length, `${label}: every bar prints its count`).toBe(m.marks.length)
  expect(hcMarkFailures(m), `${label}: the chart’s marks`).toEqual([])
}

/** Every printed word of the odds chart, read off its SVG. */
const oddsWords = (page: Page) => page.locator('[data-chart="odds"] svg text').allTextContents()

test.describe(`RC4 · the home and Probability at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=retired: the settled answer lands on Snapshot, the document’s entry replaced, no answer page and no door', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await gotoSeedFinal(page, 'retired')
    await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
    expect(await page.evaluate(() => history.state)).toEqual({ b9: 'workspace', n: 1 })
    expect(new URL(page.url()).hash).toBe('#/dashboard/snapshot')
    await expect(page.locator('.result-page'), 'no old answer page anywhere').toHaveCount(0)
    await expect(page.getByRole('button', { name: copy.workbenchDoorCta })).toHaveCount(0)
    await expect(page.locator('main.result'), 'exactly one main.result').toHaveCount(1)
  })

  for (const { seed, route, state } of RC4_FRAME_SEEDS) {
    test(`?seed=${seed}: Probability holds one frame from the top bar to the ACTION ITEMS handle (the tray closed); one caveat; ${state === null ? 'its route’s rows' : 'the state clause'}`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      await expect(page.getByRole('heading', { level: 1, name: copy.analysisTitle })).toBeVisible()
      await expect(page.locator(`[data-probability="${route}"]`), `${seed}: the ${route} route`).toBeAttached()
      await expect(page.locator('[data-intro-lead]'), `${seed}: the answer’s lead`).not.toHaveText('')
      await assertOneVisibleCaveat(page, REAL.height)
      const frame = await page.evaluate(() => ({
        scrollY: window.scrollY,
        halves: Math.max(...[...document.querySelectorAll('[data-half]')].map((el) => el.getBoundingClientRect().bottom)),
        metrics: document.querySelector('[data-metrics]')!.getBoundingClientRect().bottom,
        handle: document.querySelector('[aria-controls="b9-action-items"]')?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
        trayShut: document.querySelector('#b9-action-items') === null,
      }))
      expect(frame.scrollY).toBe(0)
      expect(frame.trayShut, `${seed}: the tray lands closed`).toBe(true)
      expect(frame.handle, `${seed}: the ACTION ITEMS handle in the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.halves, `${seed}: the halves in the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.metrics, `${seed}: the key-metric column in the first frame`).toBeLessThanOrEqual(REAL.height)
      await noSidewaysScroll(page, `${seed} REAL Probability`)
      const words = await page.locator('main.result').innerText()
      expect(words, `${seed}: never "10 of 10"`).not.toContain('10 of 10')
      if (state !== null) await expect(page.locator('[data-metrics], [data-footnote]').filter({ hasText: state }).first(), `${seed}: the state clause`).toBeVisible()
      if (route === 'date') {
        await expect(page.locator('[data-survivor-stopgap]'), `${seed}: the survivor stopgap on both halves`).toHaveCount(2)
        await expect(page.locator('[data-bar]'), `${seed}: no balance bar on the working route`).toHaveCount(0)
      } else {
        await expect(page.locator('[data-bar-label]'), `${seed}: the bar named for what it holds`).toContainText('when the second of you dies')
        // The survivor row (HEAD's survivor-row arms, plan 5.2's RC4 port list): every retired frame seed is a couple
        // with a survivor reading, so both halves print it; its absence where the reading is absent is the composer's
        // unit arm (`probabilityView.test.ts`).
        for (const side of ['alternative', 'compared'] as const) {
          await expect(page.locator(`[data-half="${side}"] [data-reading-row]`).first(), `${seed}: the ${side} half’s survivor row`).toContainText(slots.probabilitySurvivorRow(''))
        }
        const floor = await hcFloorPx(page)
        assertHcText(await hcAudit(page, '[data-bar="compared"] [data-chart="bar-compared"]', '[data-half="compared"]'), floor, { texts: [], counts: { 'data-label': 1, 'axis-label': 2 } }, `${seed} REAL bar`)
      }
    })
  }

  test('?seed=dip: Odds by stop year — one crowned year wearing its word, the on-track line’s word, no "10 of 10", the text audit', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'dip')
    await openOdds(page)
    await expect(page.locator('[data-chart="odds"] .b9-odds-crown'), 'exactly one crowned year').toHaveCount(1)
    const words = await oddsWords(page)
    expect(words.join(' '), 'the crown’s word').toContain(copy.ladderCrownLabel)
    expect(words.join(' '), 'the on-track line’s word').toContain(copy.ladderBarLabel)
    expect(words.join(' '), 'never "10 of 10"').not.toContain('10 of 10')
    const floor = await hcFloorPx(page)
    assertHcText(await hcAudit(page, '[data-chart="odds"]', '[data-odds-chart]'), floor, { texts: [copy.ladderBarLabel], counts: { 'data-label': 3, 'axis-label': 4, 'legend-item': 2 } }, 'dip REAL odds')
    await assertOddsMarks(page, 'dip REAL odds')
    await assertOneVisibleCaveat(page, null)
  })

  // The marks oracles are a new kind of check, so each one is planted once and must go red with its own message: a
  // count printed over the neighbouring hatched bar (the 2026-11-24 defect at his window), and the marks and labels
  // pushed past the frame a reader sees (the phone defect: years and labels cut off inside a narrower frame).
  test('?seed=dip: the odds marks audit bites — a label over a neighbouring bar, and marks past the visible frame, each go red', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'dip')
    await openOdds(page)
    const read = async () => hcMarkFailures(await hcMarks(page, '[data-chart="odds"]', '[data-odds-frame]', '.b9-odds-spacer'))
    expect(await read(), 'the unplanted chart passes').toEqual([])
    // Plant 1: move the first count onto the first hatched bar.
    await page.evaluate(() => {
      const label = document.querySelector<SVGGElement>('[data-chart="odds"] .highcharts-data-label')!
      const bar = document.querySelector('[data-chart="odds"] .b9-hatch .highcharts-point')!
      const l = label.getBoundingClientRect()
      const b = bar.getBoundingClientRect()
      label.dataset.planted = label.getAttribute('transform') ?? ''
      const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(label.dataset.planted)
      const [x, y] = m === null ? [0, 0] : [Number(m[1]), Number(m[2])]
      label.setAttribute('transform', `translate(${x + (b.left - l.left) + 4},${y + (b.top - l.top)})`)
    })
    const one = await read()
    expect(one.some((f) => f.startsWith('overlap: data-label')), `plant 1 (a count over a bar) is caught: ${JSON.stringify(one)}`).toBe(true)
    await page.evaluate(() => {
      const label = document.querySelector<SVGGElement>('[data-chart="odds"] .highcharts-data-label')!
      label.setAttribute('transform', label.dataset.planted ?? '')
    })
    expect(await read(), 'plant 1 undone').toEqual([])
    // Plant 2: the bars and their labels pushed past the frame's right edge.
    await page.evaluate(() => {
      for (const g of document.querySelectorAll<SVGGElement>('[data-chart="odds"] .highcharts-series-group, [data-chart="odds"] .highcharts-data-labels')) g.style.transform = 'translateX(2000px)'
    })
    const two = await read()
    expect(two.some((f) => f.startsWith('outside: the mark')), `plant 2 (a mark past the frame) is caught: ${JSON.stringify(two.slice(0, 3))}`).toBe(true)
    expect(two.some((f) => f.startsWith('outside: data-label')), `plant 2 (a label past the frame) is caught`).toBe(true)
  })

  test('?vault=datearrived: Odds by stop year plots no stop year that has already passed', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await gotoVaultFinal(page, 'datearrived')
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
    await openOdds(page)
    const ticks = (await page.locator('[data-chart="odds"] .highcharts-xaxis-labels text').allTextContents()).map(Number).filter(Number.isFinite)
    expect(ticks.length, 'the odds chart printed its years').toBeGreaterThan(0)
    expect(Math.min(...ticks), 'no passed stop year is plotted').toBeGreaterThanOrEqual(pinnedYear(page))
  })

  test('?vault=rec: Snapshot’s "Try it in the plan" opens Probability with Recommended on the left; the interim Tax Strategies tab carries the record card', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await gotoVaultFinal(page, 'rec')
    await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached({ timeout: 30_000 })
    const tryIt = page.locator('[data-card="recommendations"]').getByRole('button', { name: copy.snapshotRecTry })
    await expect(tryIt, 'the saved record offers Try it in the plan').toBeVisible({ timeout: 30_000 })
    await tryIt.click()
    await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
    await expect(page.locator('[data-half="alternative"]'), 'the left half names the recommendation').toHaveAttribute('aria-label', copy.probabilityPickRecommended)
    await expect(page.locator('[data-half="alternative"] [data-ring-half]'), 'the recommendation’s side drew its ring').toBeVisible({ timeout: 60_000 })
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="interim-strategies"] .rec-record'), 'the record card on the interim tab').toBeVisible()
  })
})

test.describe(`RC4 · Probability on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the intro, the halves, then one R13 caveat, in order and reachable; no sideways scroll`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      const order = await page.evaluate(() => {
        const top = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + window.scrollY
        return { intro: top('[data-analysis-intro]'), halves: top('[data-half="alternative"]'), caveat: top('main.result [data-caveat]') }
      })
      expect(order.intro).toBeLessThan(order.halves)
      expect(order.halves).toBeLessThan(order.caveat)
      await page.locator('main.result [data-caveat]').scrollIntoViewIfNeeded()
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} PHONE Probability`)
    })
  }

  test('?seed=dip: Odds by stop year on the phone — every stop year, every count whole, the legend; nothing past the frame; no sideways scroll', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'dip')
    await openOdds(page)
    await noSidewaysScroll(page, 'dip PHONE odds')
    const floor = await hcFloorPx(page)
    // Every oracle, none set aside: inside the chart, its card and the page, shown and unshrunk.
    const failures = hcTextFailures(await hcAudit(page, '[data-chart="odds"]', '[data-odds-chart]'), floor, { texts: [copy.ladderBarLabel], counts: { 'data-label': 3, 'legend-item': 2 } })
    expect(failures, 'dip PHONE odds: the chart’s text').toEqual([])
    await assertOddsMarks(page, 'dip PHONE odds')
  })
})

test.describe(`RC4 · Probability at a 20 px browser default (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the intro, the halves, then one R13 caveat, in order and reachable; no sideways scroll`, async ({ page, context }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      const cdp = await context.newCDPSession(page)
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 20 } })
      await enterProbability(page, seed)
      const order = await page.evaluate(() => {
        const top = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + window.scrollY
        return { intro: top('[data-analysis-intro]'), halves: top('[data-half="alternative"]'), caveat: top('main.result [data-caveat]') }
      })
      expect(order.intro).toBeLessThan(order.halves)
      expect(order.halves).toBeLessThan(order.caveat)
      await page.locator('main.result [data-caveat]').scrollIntoViewIfNeeded()
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} 20px Probability`)
    })
  }
})

// ── RC4b · the Action Items tray (plan 6, RC4, "The Action Items tray"; its Verification and Test scenarios) ──────────
// - at his window on `retired`: one row changed carries its three cues (blue-ink words, medium weight, a 2 px left bar)
//   and its own way back; nothing runs until Refresh; Refresh fades the left half under "Loading…" with its numbers kept,
//   and the landing reading moves no tap target (Refresh, Apply, the picker);
// - on `dip`: a stop year pulled and refreshed withholds Apply with its reason, Apply then writing nothing;
// - on the phone: the tray is a full-height sheet whose rows and footer are reachable, with no sideways scroll;
// - a real Back press past the first page with an unkept what-if open asks first (the browser's leave dialog: insight
//   112), and a page move keeps the what-if and asks nothing.

const tray = (page: Page) => page.locator('#b9-action-items')
const trayHandle = (page: Page) => page.getByRole('button', { name: copy.trayHandle, exact: true })

async function openTrayOn(page: Page, seed: string): Promise<void> {
  await enterProbability(page, seed)
  await trayHandle(page).click()
  await expect(tray(page), 'the tray never opened').toBeVisible()
  await page.waitForTimeout(400)
}

/** A tap target's place: in the window for the tray's own buttons (where the finger is), in the page for the left
 *  picker above (the tray open, the page scrolls, and the browser's scroll anchoring keeps the tray still when the
 *  halves above it change height), each rounded to the whole pixel. */
const boxOf = async (page: Page, sel: string, inPage: boolean) =>
  page.locator(sel).first().evaluate((el, doc) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y + (doc ? window.scrollY : 0)) }
  }, inPage)

/** A printed bar figure ("~$1.1mm", "~$675k") in dollars. */
function figureDollars(text: string): number {
  const m = /\$([\d.]+)\s*(mm|k)?/.exec(text)
  if (m === null) throw new Error(`[test setup] no figure in "${text}"`)
  return Number(m[1]) * (m[2] === 'mm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1)
}

/** The two balance bars on ONE scale (plan RC4: "The two halves share one y-scale"): the same tick words at the same
 *  heights on both charts, and the bars' drawn heights in the ratio of their printed figures (within the figures'
 *  rounding, a few px). Each chart scaled to its own top would draw a $675k bar as tall as a $1.1mm one. */
async function assertBarsOnOneScale(page: Page, who: string): Promise<void> {
  const r = await page.evaluate(() => {
    const read = (side: string) => {
      const host = document.querySelector(`[data-bar="${side}"]`)
      if (host === null) return null
      const point = host.querySelector('.highcharts-point')?.getBoundingClientRect()
      const ticks = [...host.querySelectorAll('.highcharts-yaxis-labels text')].map((t) => ({ w: t.textContent ?? '', y: Math.round(t.getBoundingClientRect().top) }))
      return { h: point?.height ?? 0, ticks, fig: host.querySelector('.highcharts-data-label text')?.textContent ?? '' }
    }
    return { alt: read('alternative'), cmp: read('compared') }
  })
  expect(r.alt && r.cmp, `${who}: both bars drew`).toBeTruthy()
  const { alt, cmp } = r as { alt: NonNullable<typeof r.alt>; cmp: NonNullable<typeof r.cmp> }
  expect(alt.ticks.length, `${who}: the axis prints its ticks (more than "$0")`).toBeGreaterThanOrEqual(3)
  expect(alt.ticks.map((t) => t.w), `${who}: both bars print the same ticks`).toEqual(cmp.ticks.map((t) => t.w))
  alt.ticks.forEach((t, i) => expect(Math.abs(t.y - cmp.ticks[i]!.y), `${who}: tick "${t.w}" at one height on both`).toBeLessThanOrEqual(1))
  const want = alt.h * (figureDollars(cmp.fig) / figureDollars(alt.fig))
  expect(Math.abs(cmp.h - want), `${who}: the bars’ heights (${alt.h.toFixed(1)}, ${cmp.h.toFixed(1)}) in the ratio of ${alt.fig} to ${cmp.fig}`).toBeLessThanOrEqual(5)
}

test.describe(`RC4b · the Action Items tray at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=retired: a changed row wears three cues; nothing runs until Refresh; the run fades the left half with its numbers kept; the landing moves no tap target', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 150_000)
    await openTrayOn(page, 'retired')
    const before = await page.locator('[data-half="alternative"] [data-ring-centre]').textContent()
    const spend = tray(page).locator('[data-tray-row="spending:total"] input').first()
    const plan = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    expect(plan, '[test setup] the plan’s spending reads').toBeGreaterThan(20_000)
    await spend.fill(String(plan - 20_000))
    await spend.press('Enter')
    const box = tray(page).locator('[data-tray-row="spending:total"] [data-changed]')
    await expect(box, 'the changed value is marked').toHaveCount(1)
    const cues = await box.evaluate((el) => {
      const cs = getComputedStyle(el)
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-blue-ink').trim()
      return { weight: cs.fontWeight, bar: cs.borderLeftWidth, color: cs.color, ink }
    })
    expect(cues.weight, 'medium weight').toBe('500')
    expect(cues.bar, 'a 2 px left bar').toBe('2px')
    expect(cues.ink, '[test setup] the blue-ink token reads').not.toBe('')
    await expect(tray(page).getByRole('button', { name: slots.workbenchRailBackName(copy.workbenchRailSpendTitle) }), 'the row’s own way back').toBeVisible()
    // Nothing runs before Refresh: the left half still reads the plan, and is not loading.
    await expect(page.locator('[data-half="alternative"] [data-ring-centre]')).toHaveText(before ?? '')
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0)
    await expect(tray(page).getByText(copy.trayPending, { exact: true })).toBeVisible()
    const targets = ['[data-tray-refresh]', `#b9-action-items button:has-text("${copy.workbenchRailApply}")`, '[data-half="alternative"] [role="combobox"]']
    await tray(page).locator('[data-tray-refresh]').click()
    // In flight: the half keeps its number, faded under "Loading…".
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the run fades the left half').toHaveCount(1)
    await expect(page.locator('[data-half="alternative"] [data-ring-centre]'), 'its numbers stay put').toHaveText(before ?? '')
    const inFlight = await Promise.all(targets.map((t, i) => boxOf(page, t, i === 2)))
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the reading never landed').toHaveCount(0, { timeout: 120_000 })
    await page.waitForTimeout(600)
    const landed = await Promise.all(targets.map((t, i) => boxOf(page, t, i === 2)))
    expect(landed, 'the landing reading moves no tap target (Refresh, Apply, the picker)').toEqual(inFlight)
    await expect(page.locator('[data-difference]'), 'the difference line speaks the two counts').not.toHaveText('')
    await assertBarsOnOneScale(page, 'retired, the what-if landed')
    await noSidewaysScroll(page, 'retired REAL tray')
  })

  // The landed what-if's fit (plan RC4's fit decision holds in every state the page reaches, not only the empty
  // what-if): on `budget`, the tightest seed, a what-if that moves the survivor's spending line keeps a line in each half,
  // and the page must still hold one frame down to the handle with the tray shut again.
  test('?seed=budget: a landed what-if that changes the survivor line still holds one frame to the ACTION ITEMS handle, the tray shut', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 150_000)
    await openTrayOn(page, 'budget')
    const line = tray(page).locator('[data-tray-group="spending"] input[inputmode="decimal"]').first()
    await line.fill('1000')
    await line.press('Enter')
    await tray(page).locator('[data-tray-refresh]').click()
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the reading never landed').toHaveCount(0, { timeout: 120_000 })
    await trayHandle(page).click()
    await expect(tray(page)).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(600)
    await settleLayout(page)
    // Non-vacuity: the landed state keeps a second line in a half (it is the state that grows the halves).
    expect(await page.locator('[data-half] [data-reading-row] p.text-label').count(), 'the landed what-if keeps no line of its own: the arm measures nothing new').toBeGreaterThan(0)
    const frame = await page.evaluate(() => ({
      scrollY: window.scrollY,
      handle: document.querySelector('[aria-controls="b9-action-items"]')!.getBoundingClientRect().bottom,
    }))
    expect(frame.scrollY).toBe(0)
    expect(frame.handle, 'budget landed: the ACTION ITEMS handle in the first frame').toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    await assertBarsOnOneScale(page, 'budget, the what-if landed')
  })

  test('?seed=dip: a stop year pulled and refreshed withholds Apply with its reason; a press writes nothing', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 150_000)
    await openTrayOn(page, 'dip')
    const stop = tray(page).locator('[data-tray-row="stop-year"] input[inputmode="numeric"]')
    const year = Number(await stop.inputValue())
    await stop.fill(String(year + 2))
    await stop.press('Enter')
    await tray(page).locator('[data-tray-refresh]').click()
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the stop-year run never landed').toHaveCount(0, { timeout: 120_000 })
    const apply = tray(page).getByRole('button', { name: copy.workbenchRailApply, exact: true })
    await expect(apply).toHaveAttribute('aria-disabled', 'true')
    await expect(tray(page).locator('[data-tray-words]')).toHaveText(copy.workbenchRailApplyWithheldStop)
    await apply.click({ force: true }) // aria-disabled: Playwright waits for "enabled", the press itself must still land
    await expect(tray(page).locator('[data-tray-words]'), 'a withheld press says why again and writes nothing').toHaveText(copy.workbenchRailApplyWithheldStop)
    await expect(page.locator('[data-half="alternative"]'), 'the left ring names its own stop year').toContainText(String(year + 2))
  })

  test('?seed=retired: a real Back press past the first page with an unkept what-if asks first; a page move keeps it and asks nothing', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    await openTrayOn(page, 'retired')
    const spend = tray(page).locator('[data-tray-row="spending:total"] input').first()
    const plan = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    await spend.fill(String(plan - 5_000))
    await spend.press('Enter')
    const asked: string[] = []
    page.on('dialog', (d) => {
      asked.push(d.type())
      void d.dismiss()
    })
    // A page move (Probability back to the home) drops nothing: no ask, and the edit is still there on return.
    await page.goBack()
    await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
    await expect(page.getByText(copy.shellLeaveWhatIf, { exact: true })).toHaveCount(0)
    expect(asked, 'a page move asks nothing').toEqual([])
    // Back from the first page leaves the app: the browser's own leave dialog stands over the unkept what-if.
    await page.goBack({ timeout: 5_000 }).catch(() => null)
    await expect.poll(() => asked, { timeout: 10_000 }).toEqual(['beforeunload'])
    await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'Stay keeps the app').toBeAttached()
    await page.goForward()
    await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
    await trayHandle(page).click()
    await expect(tray(page).locator('[data-tray-row="spending:total"] [data-changed]'), 'the edit survived the page move').toHaveCount(1)
  })
})

test.describe(`RC4b · the Action Items tray on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the tray is a full-height sheet; its first row and its footer are reachable; no sideways scroll`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      await trayHandle(page).scrollIntoViewIfNeeded()
      await trayHandle(page).click()
      const sheet = page.getByRole('dialog', { name: copy.trayHandle })
      await expect(sheet).toBeVisible()
      await expect.poll(() => sheet.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0)
      await expect(sheet.locator('[data-tray-row]').first()).toBeVisible()
      await sheet.locator('[data-tray-refresh]').scrollIntoViewIfNeeded()
      await expect(sheet.locator('[data-tray-refresh]')).toBeVisible()
      const wide = await sheet.evaluate((el) => {
        const body = el.querySelector('.overflow-y-auto') as HTMLElement
        return { scroll: body.scrollWidth, client: body.clientWidth }
      })
      expect(wide.scroll, `${seed}: the sheet scrolls sideways`).toBeLessThanOrEqual(wide.client)
      await noSidewaysScroll(page, `${seed} PHONE tray`)
      await sheet.getByRole('button', { name: copy.trayClose }).click()
      await expect(sheet).toHaveCount(0)
    })
  }
})

// ── RC4 ported from e2e/vertical-fit.spec.ts (plan 6, section 5.2: an honesty law is PORTED with its surface) ─────────
// Each arm keeps the old arm's LAW and reads it on the new screen; the old layout (the two panes, the doors, the seats)
// went with the answer page. HEAD's arm is named above each block, at 95c715e19
// (`git show 95c715e19:projects/the-back-nine/e2e/vertical-fit.spec.ts`).

/** The date route's order on Probability: the hero, then the intro's lines in the composer's order, then the halves,
 *  then the R13 caveat LAST (nothing drawn in the page below it), the caveat below both the halves and the key-metric
 *  column. Returns the intro's lines, in order. */
async function assertDateRouteOrder(page: Page, who: string): Promise<string[]> {
  await expect(page.locator('[data-probability="date"]'), `${who}: the date route`).toBeAttached()
  await expect(page.locator('[data-ring-half="compared"]'), `${who}: the plan’s ring drew`).toBeVisible()
  const read = await page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom }
    }
    const caveat = document.querySelector('main.result [data-caveat]')
    const caveatBottom = caveat?.getBoundingClientRect().bottom ?? NaN
    // Caveat last: every drawn element of the page ends at or above the caveat's bottom (its own subtree and its
    // ancestors aside): the old doors-last walk's law, with the caveat now the page's last line.
    let below = ''
    for (const el of document.querySelectorAll('main.result *')) {
      if (caveat === null || el === caveat || caveat.contains(el) || el.contains(caveat)) continue
      // The ACTION ITEMS handle (RC4b) is the panel's last mark, centred on its bottom edge below the caveat, with the
      // empty spacer that seats it: the plan's order is the panel, the caveat, then the handle.
      if (el.closest('[aria-controls="b9-action-items"]') !== null || (el.getAttribute('aria-hidden') === 'true' && (el.textContent ?? '') === '' && el.children.length === 0)) continue
      const r = el.getBoundingClientRect()
      // Drawn: a real box (a screen-reader-only region, 1 px and clipped, draws nothing).
      if (r.width <= 1 || r.height <= 1 || getComputedStyle(el).visibility === 'hidden') continue
      if (r.bottom > caveatBottom + 0.5 && below === '') below = `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').slice(0, 40)} ends at ${r.bottom.toFixed(1)}`
    }
    return {
      lead: box('[data-intro-lead]'),
      lines: [...document.querySelectorAll('[data-analysis-intro] p:not([data-intro-eyebrow])')].map((p) => (p.textContent ?? '').trim()),
      halves: box('[data-half="compared"]'),
      metrics: box('[data-metrics]'),
      caveat: box('main.result [data-caveat]'),
      below,
    }
  })
  expect(read.lead && read.halves && read.metrics && read.caveat, `${who}: the hero, the halves, the metrics and the caveat all drew`).toBeTruthy()
  expect(read.halves!.top, `${who}: the halves sit below the hero`).toBeGreaterThanOrEqual(read.lead!.bottom - 0.5)
  expect(read.caveat!.top, `${who}: the R13 caveat sits below the halves`).toBeGreaterThanOrEqual(read.halves!.bottom - 0.5)
  expect(read.caveat!.top, `${who}: the R13 caveat sits below the key-metric column`).toBeGreaterThanOrEqual(read.metrics!.bottom - 0.5)
  expect(read.below, `${who}: nothing is drawn below the R13 caveat`).toBe('')
  await assertOneVisibleCaveat(page, null)
  return read.lines
}

// HEAD :1861 (dip), :1919 (date65), :1966 (datenc): the date route's order contract and its state and Medicare lines.
test.describe(`RC4 ported · the date route’s order contract on Probability (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=dip: the hero, the essentials line, then the dip line, in order; the unpriced state clause once; the caveat last', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'dip')
    const lines = await assertDateRouteOrder(page, 'dip')
    const essentials = lines.findIndex((l) => /essentials/i.test(l))
    const dip = lines.indexOf(copy.dateNonMonotoneNote)
    expect(essentials, `dip: the essentials line is in the intro (${JSON.stringify(lines)})`).toBeGreaterThanOrEqual(0)
    expect(dip, `dip: the dip line follows the essentials line (${JSON.stringify(lines)})`).toBeGreaterThan(essentials)
    await expect(page.locator('main.result').getByText(copy.verdictStateUnpricedNote, { exact: true }), 'dip: the unpriced state clause, exactly once').toHaveCount(1)
  })

  test('?seed=date65: Medicare is named priced (the affirmation and its residual); the caveat last', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'date65')
    await assertDateRouteOrder(page, 'date65')
    await expect(page.getByText('are already counted in this answer, on top of your spending').first(), 'date65: the priced-Medicare affirmation').toBeVisible()
    await expect(page.getByText('could run higher than shown').first(), 'date65: the narrowed residual ships WITH the affirmation').toBeVisible()
  })

  test('?seed=datenc: North Carolina named on the residual, once, never beside the unpriced clause; the caveat last', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'datenc')
    await assertDateRouteOrder(page, 'datenc')
    const nc = page.locator('main.result').getByText('Your North Carolina state income tax is already counted in this answer, on top of your spending')
    await expect(nc, 'datenc: the NC clause, exactly once').toHaveCount(1)
    await expect(nc).toBeVisible()
    await expect(page.locator('main.result').getByText(copy.verdictStateUnpricedNote, { exact: true }), 'datenc: never the unpriced clause beside it').toHaveCount(0)
  })
})

// HEAD :2276: the computing frame. One R13 caveat stands during the crunch: from the first frame a page shows until the
// final answer settles, every animation frame shows exactly one visible caveat (the in-frame one or App.tsx's trailing
// one, never both, never none).
for (const vp of [PHONE, REAL] as const) {
  test.describe(`RC4 ported · the computing window at ${vp.width}×${vp.height} — one caveat stands during the crunch`, () => {
    test.use({ viewport: vp, deviceScaleFactor: vp === REAL ? REAL_DPR : PHONE_DPR })
    test('?seed=dip: every frame from the first page to the settled answer shows exactly one R13 caveat', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await page.addInitScript(() => {
        type Reading = { t: number; n: number; screen: string }
        const w = window as unknown as { __caveats: Reading[] }
        w.__caveats = []
        const t0 = performance.now()
        const tick = () => {
          const main = document.querySelector('main.result')
          if (main !== null) {
            const n = [...document.querySelectorAll('footer.disclaimer, [data-caveat]')].filter(
              (el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && (el as HTMLElement).getClientRects().length > 0,
            ).length
            const last = w.__caveats[w.__caveats.length - 1]
            const screen = main.getAttribute('data-shell-screen') ?? 'none'
            if (last === undefined || last.n !== n || last.screen !== screen) w.__caveats.push({ t: Math.round(performance.now() - t0), n, screen })
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      await page.goto('/?seed=dip')
      await expect(page.locator(SETTLED_RESULT), 'the seed never settled').toBeAttached({ timeout: FINAL_TIER_MS })
      await page.waitForTimeout(500)
      const log = await page.evaluate(() => (window as unknown as { __caveats: { t: number; n: number; screen: string }[] }).__caveats)
      expect(log.length, 'the watch saw no page frame at all').toBeGreaterThan(0)
      const story = log.map((r) => `${r.t}ms ${r.screen}:${r.n}`).join(' · ')
      expect(log.every((r) => r.n === 1), `a frame showed other than one caveat: ${story}`).toBe(true)
    })
  })
}

// HEAD :2401 / :2456 / :2476: the re-figuring line over the old answer, held and live. While a run on an edit is in
// flight the page keeps the answer from before the edit and says so: the line on Probability (the intro's eyebrow; past
// the phone tier it rides the folder tabs' row), the panel echo's words, and on the odds chart its tag. Held through
// `?preview=refiguring` (the real app with every run after the first final held, `src/ui/preview/RefiguringPreview.tsx`),
// because live the window lasts one run.

type Edges = { readonly top: number; readonly bottom: number; readonly height: number; readonly oneLine: boolean } | null

/** The visible element's edges (the first visible match), and whether it is one line box. */
async function visibleEdges(page: Page, sel: string): Promise<Edges> {
  return page.evaluate((s) => {
    const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none')
    if (el === undefined) return null
    const r = el.getBoundingClientRect()
    const lh = parseFloat(getComputedStyle(el).lineHeight)
    return { top: r.top, bottom: r.bottom, height: r.height, oneLine: Number.isFinite(lh) && r.height <= lh * 1.5 }
  }, sel)
}

/** The preview on `seed`, settled, then Probability; one engine-input edit through the gear's drawer (the survivor's
 *  spending share), the flag SEEN, the echo read before and after, the drawer closed. Returns the boxes read before. */
async function enterHeldWindow(page: Page, seed: string) {
  await page.goto(`/?preview=refiguring&seed=${seed}`)
  await expect(page.locator(SETTLED_RESULT), `${seed}: the preview never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await toProbability(page, seed)
  await expect(page.locator('[data-intro-eyebrow]').filter({ visible: true }), 'a settled landing shows no re-figuring line').toHaveCount(0)
  const before = { lead: await visibleEdges(page, '[data-intro-lead]'), caveat: await visibleEdges(page, 'main.result [data-caveat]') }
  await page.locator('[data-gear]').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await settleLayout(page)
  const echoBefore = await visibleEdges(page, '[role="dialog"] .ap-echo')
  const field = dialog.getByLabel(copy.assumptionSurvivorRatioLabel)
  const now = (await field.inputValue()).replace(/[^0-9]/g, '')
  await field.fill(now === '70' ? '65' : '70')
  await field.press('Tab')
  await expect(page.locator('main.result[data-answer-refiguring]'), 'the edit raised no re-figuring flag').toBeAttached({ timeout: 30_000 })
  await settleLayout(page)
  const echoAfter = await visibleEdges(page, '[role="dialog"] .ap-echo')
  const echoText = await dialog.locator('.ap-echo').textContent()
  await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
  await expect(dialog).toBeHidden()
  await settleLayout(page)
  return { before, echoBefore, echoAfter, echoText }
}

/** Read after the window's boxes: the flag still stands over the old final, so every box was read inside the window. */
async function expectStillHeld(page: Page): Promise<void> {
  await expect(page.locator('main.result[data-answer-refiguring][data-answer-tier="final"]'), 'the preview let the window close before the read').toHaveCount(1)
}

test.describe(`RC4 ported · the re-figuring window, held (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('spine (?seed=budget): the line on one line, in frame; the answer and the R13 caveat do not move; the echo says so in its own box', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    const { before, echoBefore, echoAfter, echoText } = await enterHeldWindow(page, 'budget')
    const line = page.locator('[data-intro-eyebrow]').filter({ visible: true })
    await expect(line, 'one visible re-figuring line').toHaveCount(1)
    await expect(line).toHaveText(copy.answerRefiguringVerdict)
    const edges = (await visibleEdges(page, '[data-intro-eyebrow]'))!
    const lead = (await visibleEdges(page, '[data-intro-lead]'))!
    const caveat = (await visibleEdges(page, 'main.result [data-caveat]'))!
    expect(edges.oneLine, `the line wraps (${edges.height.toFixed(1)} px)`).toBe(true)
    expect(edges.top, 'the line climbs above the page top').toBeGreaterThanOrEqual(0)
    expect(edges.bottom, 'the line leaves the first frame').toBeLessThanOrEqual(REAL.height)
    expect(Math.abs(lead.top - before.lead!.top), `the answer moved ${(lead.top - before.lead!.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
    expect(Math.abs(caveat.top - before.caveat!.top), `the R13 caveat moved ${(caveat.top - before.caveat!.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
    expect(caveat.bottom, 'the R13 caveat left the frame').toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    expect(echoText, 'the drawer’s echo says the answer is being figured again').toBe(copy.assumptionEchoRefiguring)
    expect(Math.abs(echoAfter!.height - echoBefore!.height), 'the echo’s reserved box changed height').toBeLessThanOrEqual(0.5)
    await expectStillHeld(page)
  })

  test('date (?seed=date): the date’s own line, in frame; the answer does not move; the odds chart wears the caption’s clause', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    const { before, echoText } = await enterHeldWindow(page, 'date')
    const line = page.locator('[data-intro-eyebrow]').filter({ visible: true })
    await expect(line).toHaveText(copy.answerRefiguringDate)
    const edges = (await visibleEdges(page, '[data-intro-eyebrow]'))!
    const lead = (await visibleEdges(page, '[data-intro-lead]'))!
    expect(edges.oneLine, `the line wraps (${edges.height.toFixed(1)} px)`).toBe(true)
    expect(edges.bottom, 'the line leaves the first frame').toBeLessThanOrEqual(REAL.height)
    expect(Math.abs(lead.top - before.lead!.top), `the answer moved ${(lead.top - before.lead!.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
    expect(echoText).toBe(copy.assumptionEchoRefiguring)
    await openOdds(page)
    await expect(page.locator('[data-odds-chart]').getByText(copy.answerRefiguringCaption, { exact: true }), 'the odds chart says its figures predate the change').toBeVisible()
    await expectStillHeld(page)
  })
})

test.describe(`RC4 ported · the re-figuring window, held (phone ${PHONE.width}×${PHONE.height})`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const { seed, words } of [
    { seed: 'budget', words: copy.answerRefiguringVerdict },
    { seed: 'date', words: copy.answerRefiguringDate },
  ] as const) {
    test(`?seed=${seed}: the line sits in the flow above the answer it qualifies, over nothing`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterHeldWindow(page, seed)
      const line = page.locator('[data-intro-eyebrow]').filter({ visible: true })
      await expect(line).toHaveText(words)
      const edges = (await visibleEdges(page, '[data-intro-eyebrow]'))!
      const lead = (await visibleEdges(page, '[data-intro-lead]'))!
      expect(edges.top, 'the line climbs above the page top').toBeGreaterThanOrEqual(0)
      expect(edges.bottom, 'the line overlaps the answer below it').toBeLessThanOrEqual(lead.top + 0.5)
      await expectStillHeld(page)
    })
  }
})

test.describe(`RC4 ported · the re-figuring signal, live (?seed=retired, ${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('a spending edit in the gear’s drawer raises data-answer-refiguring over the old answer, and it clears in the commit that puts up the new one', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS * 2 + 60_000)
    await enterProbability(page, 'retired')
    await page.locator('[data-gear]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const field = dialog.getByLabel(copy.spendLabel, { exact: true })
    await expect(field, '`retired` enters its $78,000 a year by the month').toHaveValue('6,500')
    await armRefiguringWatch(page)
    // $9,500 a month takes `retired` from on track to off track (measured 2026-11-20), so the answer's own words move in
    // the commit that clears the flag; a raise that left them still would leave that commit unseen.
    await field.click()
    await field.press('ControlOrMeta+a')
    await field.pressSequentially('9500')
    await field.blur()
    await expect(field).toHaveValue('9,500')
    await expectRefiguringSeen(page, 'the live re-figuring arm')
    await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
    await expect(dialog).toBeHidden()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    const log = await refiguringLog(page)
    const first = log[0]
    expect(first, 'the watch read nothing').toBeTruthy()
    expect(first!.refiguring, 'the watch was armed on a page already re-figuring').toBe(false)
    const rose = log.findIndex((r) => r.refiguring === true)
    const fell = log.findIndex((r, i) => i > rose && r.refiguring === false)
    const story = log.map((r) => `${r.t}ms ${String(r.refiguring)}/${String(r.tier)} "${r.verdict}"`).join(' · ')
    expect(rose, `the flag never rose: ${story}`).toBeGreaterThan(0)
    expect(fell, `the flag never cleared: ${story}`).toBeGreaterThan(rose)
    for (const r of log.slice(rose, fell)) expect(r.verdict, `while the flag stood the page showed another answer: ${story}`).toBe(first!.verdict)
    expect(log[fell]!.verdict, `the flag cleared with the old answer still up: ${story}`).not.toBe(first!.verdict)
    expect(log.slice(fell).every((r) => r.refiguring === false), `the flag rose again with no second edit: ${story}`).toBe(true)
  })
})

// HEAD :2564 / :2757 / :2939 / :4000 / :4223 / :4736: the vault returns. Every `?seed=` arm bypasses the re-entry gate,
// so these are the arms that measure it: the gate (`ReEntry.tsx`, kept) offers its decision pair inside the first frame
// with the plant's own disclosures, by name; the affirm lands the echoed answer on the home, whose staleness note rides
// the StaleBanner while the R13 caveat stays in the first frame, on Snapshot and on Probability. The old echo frame's
// layout (its gaps, its backup door below the caveat, its density tiers) went with the answer page; the backup re-offer
// is the lock menu's now.

const GATE_AFFIRM = /still about right/i

/** The plant, unlocked, to its gate: the decision pair's affirm inside the first frame. Returns the affirm. */
async function unlockToGate(page: Page, key: string) {
  await page.goto(`/?vault=${key}`)
  const unlock = page.getByRole('button', { name: 'Open my plan' })
  await expect(unlock, `?vault=${key}: the plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
  await unlock.click()
  const affirm = page.getByRole('button', { name: GATE_AFFIRM })
  await expect(affirm).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const box = await affirm.boundingBox()
  expect(box, 'the affirm reported no box').not.toBeNull()
  expect(box!.y + box!.height, `?vault=${key}: the affirm sits below the first frame`).toBeLessThanOrEqual(page.viewportSize()!.height)
  return affirm
}

/**
 * Probability on an aged return may scroll (plan 6, RC4's fit decision: the pilot's call, 2026-11-24, b9-5): the
 * StaleBanner's lines stand above the page (132 px with their gaps on `?vault=yearpa`; measured, the caveat at 740 to
 * 853 px). The law there is the ORDER (the banner's lines, the answer, the halves, the R13 caveat last), exactly one
 * visible caveat, and the caveat reachable. Snapshot keeps the one-frame law on the aged return (569 to 658 px).
 */
async function assertAgedReturnOrder(page: Page, who: string): Promise<void> {
  const read = await page.evaluate(() => {
    const box = (sel: string) => {
      const els = [...document.querySelectorAll(sel)]
      if (els.length === 0) return null
      const rs = els.map((e) => e.getBoundingClientRect())
      return { top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) }
    }
    const caveat = document.querySelector('main.result [data-caveat]')
    const caveatBottom = caveat?.getBoundingClientRect().bottom ?? NaN
    let below = ''
    for (const el of document.querySelectorAll('main.result *')) {
      if (caveat === null || el === caveat || caveat.contains(el) || el.contains(caveat)) continue
      // The ACTION ITEMS handle (RC4b) is the panel's last mark, centred on its bottom edge below the caveat, with the
      // empty spacer that seats it: the plan's order is the panel, the caveat, then the handle.
      if (el.closest('[aria-controls="b9-action-items"]') !== null || (el.getAttribute('aria-hidden') === 'true' && (el.textContent ?? '') === '' && el.children.length === 0)) continue
      const r = el.getBoundingClientRect()
      // Drawn: a real box (a screen-reader-only region, 1 px and clipped, draws nothing).
      if (r.width <= 1 || r.height <= 1 || getComputedStyle(el).visibility === 'hidden') continue
      if (r.bottom > caveatBottom + 0.5 && below === '') below = `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').slice(0, 60)} ends at ${r.bottom.toFixed(1)} (caveat ${caveatBottom.toFixed(1)})`
    }
    return { banner: box('[data-stale-banner]'), lead: box('[data-intro-lead]'), halves: box('[data-half]'), caveat: box('main.result [data-caveat]'), below }
  })
  expect(read.banner && read.lead && read.halves && read.caveat, `${who}: the banner, the answer, the halves and the caveat all drew`).toBeTruthy()
  expect(read.lead!.top, `${who}: the answer sits below the StaleBanner’s lines`).toBeGreaterThanOrEqual(read.banner!.bottom - 0.5)
  expect(read.halves!.top, `${who}: the halves sit below the answer`).toBeGreaterThanOrEqual(read.lead!.bottom - 0.5)
  expect(read.caveat!.top, `${who}: the R13 caveat sits below the halves`).toBeGreaterThanOrEqual(read.halves!.bottom - 0.5)
  expect(read.below, `${who}: nothing is drawn below the R13 caveat`).toBe('')
  await assertOneVisibleCaveat(page, null)
  const caveat = page.locator('main.result [data-caveat]')
  await caveat.scrollIntoViewIfNeeded()
  await expect(caveat, `${who}: the R13 caveat is reachable`).toBeInViewport()
}

/** The affirm pressed: the echoed answer settles on the home; its staleness note (when the plant fires a clock) rides
 *  the StaleBanner, and one R13 caveat stands in the first frame on Snapshot, then on Probability (where a banner
 *  stands, Probability's law is the aged return's order and reach, above). */
async function affirmToEchoedHome(page: Page, key: string, affirm: ReturnType<Page['getByRole']>, staleness: boolean): Promise<void> {
  await affirm.click()
  await expect(page.locator(SETTLED_RESULT), `?vault=${key}: the echoed answer never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), `?vault=${key}: the affirm lands on the home`).toBeAttached()
  await settleLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('.cs-staleness-note'), `?vault=${key}: the staleness note`).toHaveCount(staleness ? 1 : 0)
  if (staleness) await expect(page.locator('.cs-staleness-note')).toBeVisible()
  const banners = (await page.locator('[data-stale-banner]').count()) > 0
  await assertOneVisibleCaveat(page, REAL.height)
  await toProbability(page, key)
  await page.evaluate(() => window.scrollTo(0, 0))
  if (banners) await assertAgedReturnOrder(page, `?vault=${key} Probability`)
  else await assertOneVisibleCaveat(page, REAL.height)
}

const MEDICARE_PRICED = 'are already counted in this answer, on top of your spending'
const TYPICAL_EXTRAS = 'Extra coverage here is a typical figure'

test.describe(`RC4 ported · the vault returns: the gate, then the echoed answer on the home (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?vault=stale: the decision pair in frame with the aged vault’s own lines, by name; the echo keeps its staleness note and the caveat in frame', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'stale')
    // The count is the plant's, derived in `devSeeds.test.ts` ("'stale' composes EXACTLY the lines…"): the federal tax
    // line and one Medicare line, the engine-pricing ledger's method line when a reprice row shipped after the save,
    // and the Medicare-spending re-confirm. The plant's today is the pinned day, never Node's clock.
    const plantSavedAt = pinnedDay(page) - 760
    const methodLine = ENGINE_PRICING_LEDGER.some((r) => r.kind === 'reprice' && r.sinceEpochDay > plantSavedAt && r.families.some((f) => f === 'tax' || f === 'medicare')) ? 1 : 0
    await expect(page.locator('.reentry-notes p')).toHaveCount(2 + methodLine + 1)
    await expect(page.getByText(copy.stalenessReconfirmMedicareSpending)).toBeVisible()
    await expect(page.getByText('Medicare cost figures have been updated')).toBeVisible()
    await expect(page.getByText('Marketplace health-plan rules have been updated'), 'no marketplace years: the ACA line stays dark').toHaveCount(0)
    await expect(page.getByText('Reference data this tool reads has been updated since your save'), 'the nameless aggregate stays dark').toHaveCount(0)
    await expect(page.getByText('You saved this about 2 years ago.')).toBeVisible()
    await affirmToEchoedHome(page, 'stale', affirm, true)
    await expect(page.getByText(MEDICARE_PRICED).first(), 'the echo names Medicare priced').toBeVisible()
  })

  for (const { key, word, typical } of [
    { key: 'yearpa', word: copy.outcomeBorderline, typical: 1 },
    { key: 'yearfailing', word: copy.outcomeAlreadyFailing, typical: 1 },
    { key: 'yearpafailing', word: copy.outcomeAlreadyFailing, typical: 1 },
    { key: 'yearofftrack', word: copy.outcomeOffTrack, typical: 1 },
    { key: 'yearfailingentered', word: copy.outcomeAlreadyFailing, typical: 0 },
    { key: 'yearsurplus', word: copy.outcomeOverFunded, typical: 1 },
  ] as const) {
    test(`?vault=${key} (a year on): the tax and Medicare lines, the year’s elapsed line, the pair in frame; the echo reads “${word}” with the caveat in frame`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      await pinPlantDay(page, key)
      const affirm = await unlockToGate(page, key)
      await expect(page.locator('.reentry-notes p')).toHaveText([copy.stalenessTax, copy.stalenessMedicare])
      await expect(page.getByText(slots.reentryElapsedYears(1)), 'the elapsed line reads a year').toBeVisible()
      await affirmToEchoedHome(page, key, affirm, true)
      await expect(page.locator('[data-intro-lead]'), `?vault=${key}: the answer the plant is built to show`).toContainText(word)
      await expect(page.getByText(MEDICARE_PRICED).first(), `?vault=${key}: Medicare named priced`).toBeVisible()
      await expect(
        page.locator('main.result').getByText(TYPICAL_EXTRAS),
        typical === 1 ? 'the "not sure" answer funds the typical extras line' : 'the entered extras carry no typical line',
      ).toHaveCount(typical)
    })
  }

  test('?vault=statestale: the state-tax clock alone, by name, the pair in frame; the echo names North Carolina with the caveat in frame', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'statestale')
    const notes = page.locator('.reentry-notes p')
    await expect(notes, 'the state-tax clock fires alone').toHaveCount(1)
    await expect(notes).toContainText('State tax rules have been updated since your save')
    await expect(page.getByText('Marketplace health-plan rules have been updated'), 'the ACA family stays dark').toHaveCount(0)
    await expect(page.getByText('Medicare cost figures have been updated'), 'the Medicare family stays dark').toHaveCount(0)
    await expect(page.getByText('Reference data this tool reads has been updated since your save'), 'the nameless aggregate stays dark').toHaveCount(0)
    await affirmToEchoedHome(page, 'statestale', affirm, true)
    await expect(page.locator('main.result').getByText(/North Carolina/).first(), 'the echo names North Carolina').toBeVisible()
  })

  test('?vault=datestale: the pair in frame; the echo’s hero and the odds chart’s crowned year speak one year, and the aged-balances line rides the chart', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'datestale')
    await affirmToEchoedHome(page, 'datestale', affirm, true)
    const hero = (await page.locator('[data-intro-lead]').innerText()).trim()
    const heroYear = /around (\d{4})/.exec(hero)?.[1]
    expect(heroYear, `the hero names no year: "${hero}"`).toBeTruthy()
    await openOdds(page)
    const crown = await page.locator('[data-chart="odds"] .b9-odds-crown').first().getAttribute('aria-label')
    const crownYear = /Stopping in (\d{4})/.exec(crown ?? '')?.[1]
    expect(crownYear, `the crowned bar names no year: "${crown}"`).toBeTruthy()
    expect(crownYear, `two years on one screen: the hero says ${heroYear}, the crowned bar says ${crownYear}`).toBe(heroYear)
    await expect(page.locator('[data-odds-chart]').getByText('They also read from your account balances as you entered them in'), 'the aged-balances line rides the chart').toBeVisible()
  })

  test('?vault=rec: no clock fires; the interim Tax Strategies tab paints the record’s HOLDS face with its re-open control and its cost', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'rec')
    await expect(page.locator('.reentry-notes p'), 'the rec plant ages no stamp: no clock fires').toHaveCount(0)
    await affirmToEchoedHome(page, 'rec', affirm, false)
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
    const card = page.locator('main.result[data-shell-screen="interim-strategies"] .rec-record')
    await expect(card, 'the remembered record paints on the Tax Strategies tab').toBeVisible()
    await expect(card.locator('.rec-note__head')).toHaveText(copy.recommendRecordHeading)
    const standing = card.locator('.rec-record__standing')
    await expect(standing).toHaveAttribute('data-standing', 'holds')
    await expect(standing).toContainText(copy.recommendRecordHolds)
    await expect(card.getByRole('button', { name: copy.recommendRecordReopenCta })).toBeVisible()
    await expect(card.locator('.rec-record__cost')).toHaveText(copy.recommendRecordReopenCost)
  })

  test('?vault=recold: the SUPERSEDED face names every cause it has, in the producer’s order, and its mint year; the rules clause stays dark', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'recold')
    await affirmToEchoedHome(page, 'recold', affirm, false)
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
    const card = page.locator('main.result[data-shell-screen="interim-strategies"] .rec-record')
    await expect(card).toBeVisible()
    const standing = card.locator('.rec-record__standing')
    await expect(standing).toHaveAttribute('data-standing', 'superseded')
    await expect(standing).toContainText(copy.recommendRecordSuperseded)
    await expect(standing).not.toContainText(copy.recommendRecordHolds)
    await expect(card.locator('.rec-record__causes li')).toHaveText([copy.recommendRecordSupersededInputs, copy.recommendRecordSupersededSolver])
    await expect(card).not.toContainText(copy.recommendRecordSupersededRules)
    const savedIn = card.locator('p.rec-note__line')
    await expect(savedIn).toHaveCount(1)
    const savedInText = (await savedIn.textContent()) ?? ''
    const year = Number(/(\d{4})/.exec(savedInText)?.[1])
    expect(Number.isFinite(year), `the age clause names no year: "${savedInText}"`).toBe(true)
    expect(savedInText, 'the shipped slot, never a re-typed sentence').toBe(slots.recommendRecordSavedIn(year))
    expect(year, 'a record minted this calendar year suppresses the clause instead').toBeLessThan(pinnedYear(page))
  })
})

// HEAD :4851: the spend lane. The solved figure lands in the key-metric column's first line, and nothing below it moves:
// the clause's cell holds its widest form hidden while the figure is pending (`clauseReserve`), so the difference line,
// the halves and the R13 caveat stand still as it lands, at his window and on the phone; under reduced motion the swap
// carries no transition.

type SpendRead = { readonly spend: string | null; readonly difference: number; readonly halves: number; readonly caveat: number; readonly caveatBottom: number }

async function spendRead(page: Page): Promise<SpendRead> {
  return page.evaluate(() => {
    const top = (sel: string) => document.querySelector(sel)?.getBoundingClientRect().top ?? NaN
    return {
      spend: document.querySelector('[data-metrics] [data-spend]')?.getAttribute('data-spend') ?? null,
      difference: top('[data-difference]'),
      halves: top('[data-half="compared"]'),
      caveat: top('main.result [data-caveat]'),
      caveatBottom: document.querySelector('main.result [data-caveat]')?.getBoundingClientRect().bottom ?? NaN,
    }
  })
}

/** `surplus` on Probability caught with its figure pending, then landed: both reads. The page moves to Probability
 *  before the final answer, and every message to an engine worker is held 1.5 s (the spend solve starts on the final
 *  and could otherwise land before the settled frame is read: measured, it raced the read on two runs of three), so
 *  the pending read is the settled answer's own first frame. */
async function spendLanding(page: Page): Promise<{ pending: SpendRead; sized: SpendRead }> {
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      setTimeout(() => Reflect.apply(send, this, args), 1500)
    } as typeof send
  })
  await page.goto('/?seed=surplus')
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'surplus never landed on the home').toBeAttached({ timeout: FINAL_TIER_MS })
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: copy.shellPageAnalysis, exact: true }).click()
  }
  await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
  await expect(page.locator(SETTLED_RESULT), 'surplus never settled').toBeAttached({ timeout: FINAL_TIER_MS })
  await page.evaluate(() => window.scrollTo(0, 0))
  const pending = await spendRead(page)
  expect(pending.spend, 'the clause must be caught pending (else the arm proves nothing)').toBe('pending')
  await expect(page.locator('[data-metrics] [data-spend]'), 'the figure never landed').toHaveAttribute('data-spend', 'sized', { timeout: 90_000 })
  await settleLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('[data-metrics] [data-spend]')).toContainText('Above that, it starts to sit close to the line.')
  return { pending, sized: await spendRead(page) }
}

function expectNothingMoved({ pending, sized }: { pending: SpendRead; sized: SpendRead }, who: string): void {
  for (const k of ['difference', 'halves', 'caveat'] as const) {
    expect(Math.abs(sized[k] - pending[k]), `${who}: the ${k} moved ${(sized[k] - pending[k]).toFixed(1)} px as the figure landed`).toBeLessThanOrEqual(0.5)
  }
}

test.describe('RC4 ported · the spend lane — the solved figure lands without moving anything', () => {
  test.describe(`at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('?seed=surplus: the pending frame fits, nothing moves as the figure lands, the sized frame fits', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 150_000)
      const reads = await spendLanding(page)
      expect(reads.pending.caveatBottom, 'the pending frame’s caveat leaves the first frame').toBeLessThanOrEqual(REAL.height)
      expectNothingMoved(reads, 'REAL')
      expect(reads.sized.caveatBottom, 'the sized frame’s caveat leaves the first frame').toBeLessThanOrEqual(REAL.height)
      await assertOneVisibleCaveat(page, REAL.height)
    })
  })
  test.describe(`on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
    test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR })
    test('?seed=surplus: nothing below the clause moves as the figure lands (the reserve holds the sized clause)', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 150_000)
      expectNothingMoved(await spendLanding(page), 'PHONE')
    })
  })
  test.describe('under prefers-reduced-motion', () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
    test('?seed=surplus: the figure lands with no transition on the swapped clause', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 150_000)
      await spendLanding(page)
      const durations = await page.evaluate(() =>
        [...document.querySelectorAll('[data-metrics] [data-spend], [data-metrics] [data-spend] *')].flatMap((el) => getComputedStyle(el).transitionDuration.split(',').map((d) => d.trim())),
      )
      expect(durations.every((d) => d === '0s'), `a transition runs on the clause: ${JSON.stringify(durations)}`).toBe(true)
    })
  })
})

// HEAD :1250 / :1329: the recommend-second surface's steer note and pending frame, RE-POINTED to the interim Tax →
// Tax Strategies tab, where `Result.tsx` still renders that surface until RC8. Their laws stand: the goal pick on a
// household with no pre-tax savings lands a calm steer note, never a silent dead end; the pick's live dispatch shows the
// pending tell with the shared breathe, and its well holds the committed grade lockup's height so the landing does not
// jump. The posture and right-rail arms (:1207 / :1453) measured the old answer page's layout and retire.

/** The interim Tax Strategies tab, from the home. */
async function toStrategies(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
  await expect(page.locator('main.result[data-shell-screen="interim-strategies"]')).toBeAttached()
  await settleLayout(page)
}

/** The invite → the goal picker → "Leave more behind" → See the strategy: the solve dispatches. */
async function pickLeaveMore(page: Page): Promise<void> {
  await page.locator('.result-recommend-invite').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog, 'the goal picker opens before the solve').toBeVisible()
  const radio = dialog.getByRole('radio', { name: /Leave more behind/ })
  await radio.evaluate((el) => (el as HTMLInputElement).click())
  await expect(radio).toBeChecked()
  await dialog.getByRole('button', { name: 'See the strategy', exact: true }).click()
  await expect(dialog).toBeHidden()
}

test.describe(`RC4 re-pointed · the recommend-second surface on the interim Tax Strategies tab (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=steer: the goal pick lands the calm steer note (never a silent dead end), no pending tell, the invite gone, the R13 caveat below it', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await gotoSeedFinal(page, 'steer')
    await toStrategies(page)
    await pickLeaveMore(page)
    const note = page.locator('.rec-note--no-pretax')
    await expect(note, 'the steer note renders').toBeVisible()
    await expect(page.locator('.solve-pending')).toHaveCount(0)
    await expect(page.locator('.result-recommend-invite')).toHaveCount(0)
    const noteBox = (await note.boundingBox())!
    const caveat = page.locator('footer.disclaimer')
    await expect(caveat, 'the interim page’s one R13 caveat').toBeVisible()
    expect((await caveat.boundingBox())!.y, 'the R13 caveat sits below the note').toBeGreaterThan(noteBox.y + noteBox.height - 1)
  })

  for (const seed of ['surplus', 'nc'] as const) {
    test(`?seed=${seed}: the goal pick drives the pending tell with the shared breathe; its well holds the committed grade lockup’s height`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await gotoSeedFinal(page, seed)
      await toStrategies(page)
      await pickLeaveMore(page)
      const panel = page.locator('.solve-pending-panel')
      await expect(panel, 'the pending tell renders: the live dispatch fired').toBeVisible()
      await expect(panel).toHaveAttribute('aria-busy', /.*/)
      await expect(page.locator('.solve-pending')).toBeVisible()
      const motion = await page.evaluate(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const label = document.querySelector('.solve-pending')
        const anims = label === null ? [] : label.getAnimations().map((a) => ({ name: (a as CSSAnimation).animationName, infinite: a.effect?.getTiming().iterations === Infinity, running: a.playState === 'running' }))
        return { reduce, anims }
      })
      if (!motion.reduce) {
        expect(motion.anims.some((a) => a.name === 'thinking-breathe' && a.infinite && a.running), 'the pending tell carries the shared infinite thinking-breathe').toBe(true)
      }
      // The committed grade lockup planted beside the well, measured, removed: the well must hold its height.
      const cls = await page.locator('.recommendation-surface').evaluate((surface) => {
        const panelEl = document.querySelector('.solve-pending-panel') as HTMLElement | null
        const panelWell = panelEl ? panelEl.getBoundingClientRect().height : 0
        const el = document.createElement('div')
        el.className = 'rec-committed'
        el.innerHTML =
          '<div class="rec-grade" role="group">' +
          '<p class="rec-grade__head"><svg class="rec-grade__glyph" width="22" height="22" viewBox="0 0 22 22"></svg>' +
          '<span class="rec-grade__word">A confident lean</span></p>' +
          '<p class="rec-grade__hero">This keeps about $128,000 more for the two of you to pass on than staying on your current plan.</p>' +
          '</div>'
        surface.appendChild(el)
        const word = el.querySelector('.rec-grade__word') as HTMLElement
        const wordLineHeight = parseFloat(getComputedStyle(word).lineHeight)
        const lockup = Math.round((el.querySelector('.rec-grade') as HTMLElement).getBoundingClientRect().height)
        const wordOneLine = word.getBoundingClientRect().height <= wordLineHeight * 1.4
        el.remove()
        return { panelWell: Math.round(panelWell), lockup, wordOneLine }
      })
      expect(cls.wordOneLine, 'the grade word holds one line').toBe(true)
      expect(cls.panelWell, `the pending well (${cls.panelWell}px) collapsed below the committed lockup (${cls.lockup}px): the landing would jump`).toBeGreaterThanOrEqual(cls.lockup - 8)
      expect(cls.panelWell, `the pending well (${cls.panelWell}px) over-reserves against the committed lockup (${cls.lockup}px)`).toBeLessThanOrEqual(cls.lockup + 44)
    })
  }
})

// The home says so too: while a run on an edit is in flight, Snapshot's ring card carries the same re-figuring line as
// Probability (`copy.answerRefiguringVerdict` / `answerRefiguringDate`, through `ringReading.ts`), and past the phone
// tier its box is held, so the ring and the R13 caveat do not move when it shows or clears. Held through the preview.

/** The preview on `seed`, settled on the home; one engine-input edit through the gear's drawer, the flag seen, the
 *  drawer closed. Returns the ring's and the caveat's tops read before the edit. */
async function enterHeldHome(page: Page, seed: string): Promise<{ ring: number; caveat: number }> {
  await page.goto(`/?preview=refiguring&seed=${seed}`)
  await expect(page.locator(SETTLED_RESULT), `${seed}: the preview never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
  await settleLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('[data-ring-eyebrow] > span:not([aria-hidden])'), 'a settled home shows no re-figuring line').toHaveText('')
  const top = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y
  const before = { ring: await top('[data-ring-reading]'), caveat: await top('main.result [data-caveat]') }
  await page.locator('[data-gear]').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const field = dialog.getByLabel(copy.assumptionSurvivorRatioLabel)
  const now = (await field.inputValue()).replace(/[^0-9]/g, '')
  await field.fill(now === '70' ? '65' : '70')
  await field.press('Tab')
  await expect(page.locator('main.result[data-answer-refiguring]'), 'the edit raised no re-figuring flag').toBeAttached({ timeout: 30_000 })
  await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
  await expect(dialog).toBeHidden()
  await settleLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  return before
}

test.describe(`RC4 · Snapshot’s re-figuring line, held (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('?seed=budget: the ring card says the answer is being figured again; the ring and the R13 caveat do not move; the caveat stays in frame', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    const before = await enterHeldHome(page, 'budget')
    const line = page.locator('[data-ring-eyebrow] > span:not([aria-hidden])')
    await expect(line, 'the ring card’s re-figuring line').toHaveText(copy.answerRefiguringVerdict)
    await expect(line).toBeVisible()
    const ring = (await page.locator('[data-ring-reading]').boundingBox())!
    const caveat = (await page.locator('main.result [data-caveat]').boundingBox())!
    expect((await line.boundingBox())!.y + (await line.boundingBox())!.height, 'the line sits above the ring').toBeLessThanOrEqual(ring.y + 0.5)
    expect(Math.abs(ring.y - before.ring), `the ring moved ${(ring.y - before.ring).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
    expect(Math.abs(caveat.y - before.caveat), `the R13 caveat moved ${(caveat.y - before.caveat).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
    await assertOneVisibleCaveat(page, REAL.height)
    await expectStillHeld(page)
  })
})

test.describe(`RC4 · Snapshot’s re-figuring line, held (phone ${PHONE.width}×${PHONE.height})`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  test('?seed=budget: the ring card says so, in the flow above the ring, over nothing', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterHeldHome(page, 'budget')
    const line = page.locator('[data-ring-eyebrow] > span:not([aria-hidden])')
    await expect(line).toHaveText(copy.answerRefiguringVerdict)
    await expect(line).toBeVisible()
    const lb = (await line.boundingBox())!
    const ring = (await page.locator('[data-ring-reading]').boundingBox())!
    expect(lb.y + lb.height, 'the line overlaps the ring below it').toBeLessThanOrEqual(ring.y + 0.5)
    await expectStillHeld(page)
  })
})

// ── RC5 · the plan list and kept what-ifs (plan 6, RC5: its Verification and Test scenarios) ───────────────────────────
// - at his window: the pencil beside the right picker opens the plan list as a right drawer, your plan pinned on top and
//   the kept what-ifs below by name, each with its handle and (on hover) Copy, Rename and Delete; nothing in it scrolls
//   sideways or is cut; closed again, Probability still holds one frame to the ACTION ITEMS handle;
// - on the phone: the same list is a full-screen sheet, its rows and its Done reachable, no sideways scroll;
// - the two-up: two kept what-ifs, neither your plan, side by side, each with its own reading on one balance scale, both
//   named in the difference line;
// - a plan holding kept what-ifs survives a save and a reopen through the real path: a rename written from the drawer
//   on a planted vault, the page reloaded and the vault unlocked again, reads back in the list's own order;
// - with no vault, Keep opens the save ceremony and the kept what-if is on the left when the household comes back;
// - the lock menu's Keep over an unkept what-if asks first (found at RC4b's close: it dropped the what-if silently).

const planList = (page: Page) => page.getByRole('dialog', { name: copy.planListTitle })

async function openPlanList(page: Page): Promise<void> {
  await page.getByRole('button', { name: copy.planListOpenLabel }).click()
  await expect(planList(page)).toBeVisible()
  // The drawer slides in on a 300 ms transition: measure it at rest.
  await expect.poll(() => planList(page).evaluate((el) => Math.round(el.getBoundingClientRect().right))).toBe(page.viewportSize()!.width)
  await settleLayout(page)
}

/** Pick a choice in one of Probability's two pickers (by the picker's name). */
async function pickIn(page: Page, picker: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: picker }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
  // The list closes on a short transition: never let a second picker's list meet this one's.
  await expect(page.getByRole('listbox')).toHaveCount(0)
}

/** Nothing in the drawer is cut or scrolls sideways. */
async function assertDrawerWhole(page: Page, who: string): Promise<void> {
  const r = await planList(page).evaluate((el) => {
    const body = el.querySelector('.overflow-y-auto') as HTMLElement
    const cut = [...el.querySelectorAll('*')].filter((n) => {
      const cs = getComputedStyle(n)
      return cs.textOverflow === 'ellipsis' || ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && n.scrollWidth > n.clientWidth + 1)
    }).length
    return { scroll: body.scrollWidth, client: body.clientWidth, cut }
  })
  expect(r.scroll, `${who}: the list scrolls sideways`).toBeLessThanOrEqual(r.client)
  expect(r.cut, `${who}: text cut inside the list`).toBe(0)
}

test.describe(`RC5 · the plan list at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  for (const seed of ['retiredkept', 'dipkept'] as const) {
    test(`?seed=${seed}: the pencil opens the plan list as a right drawer, pinned plan first, each kept what-if with its handle and its hover actions; closed, Probability still holds one frame`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      await openPlanList(page)
      const box = (await planList(page).boundingBox())!
      expect(box.x, 'a right drawer, not a full-width sheet').toBeGreaterThan(REAL.width * 0.3)
      expect(box.height).toBeGreaterThanOrEqual(REAL.height - 1)
      await expect(planList(page).locator('[data-plan-list-pinned] li').first()).toHaveText(copy.probabilityPlanTitle)
      const rows = planList(page).locator('[data-kept-row]')
      await expect(rows).toHaveCount(3)
      for (let i = 0; i < 3; i++) await expect(rows.nth(i).locator('[data-kept-handle]'), 'each row’s handle').toBeVisible()
      // The row's actions: faded until hovered (a pointer that hovers), shown on hover, in reach of the keyboard.
      const actions = rows.first().locator('[data-row-actions]')
      expect(await actions.evaluate((el) => getComputedStyle(el).opacity), 'unhovered, the actions are faded').toBe('0')
      await rows.first().hover()
      await expect.poll(() => actions.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      for (const word of [copy.planListCopy, copy.planListRename, copy.planListDelete]) await expect(actions.getByRole('button', { name: word })).toBeVisible()
      await assertDrawerWhole(page, `${seed} REAL plan list`)
      // Every row in the first frame of the drawer, and its Done.
      const bottoms = await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom))
      expect(Math.max(...bottoms)).toBeLessThanOrEqual(REAL.height)
      await expect(planList(page).getByRole('button', { name: copy.planListDone })).toBeInViewport()
      await planList(page).getByRole('button', { name: copy.planListDone }).click()
      await expect(planList(page)).toHaveCount(0)
      await page.evaluate(() => window.scrollTo(0, 0))
      await settleLayout(page)
      const handle = await page.evaluate(() => document.querySelector('[aria-controls="b9-action-items"]')!.getBoundingClientRect().bottom)
      expect(handle, `${seed}: the ACTION ITEMS handle in the first frame with the right picker and its pencil`).toBeLessThanOrEqual(REAL.height)
      await assertOneVisibleCaveat(page, REAL.height)
      await noSidewaysScroll(page, `${seed} REAL Probability with the plan list closed`)
    })
  }

  test('?seed=retiredkept: two kept what-ifs side by side, neither your plan, each with its own reading on one balance scale, both named in the difference line', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 150_000)
    await enterProbability(page, 'retiredkept')
    await pickIn(page, copy.probabilityComparedLabel, 'Spend a little less')
    await pickIn(page, copy.probabilityPickerLabel, 'Pre-tax savings first')
    await expect(page.locator('[data-half="compared"]')).toHaveAttribute('aria-label', 'Spend a little less')
    await expect(page.locator('[data-half="alternative"]')).toHaveAttribute('aria-label', 'Pre-tax savings first')
    for (const side of ['alternative', 'compared'] as const) {
      await expect(page.locator(`[data-half="${side}"] [data-ring-centre]`), `the ${side} side’s own reading`).toBeVisible({ timeout: 120_000 })
      await expect(page.locator(`[data-half="${side}"] [aria-busy="true"]`)).toHaveCount(0, { timeout: 120_000 })
      await expect(page.locator(`[data-bar="${side}"] .highcharts-point`).first()).toBeAttached({ timeout: 60_000 })
    }
    await page.waitForTimeout(800)
    await settleLayout(page)
    await expect(page.locator('[data-difference]')).toContainText('Spend a little less reads')
    await expect(page.locator('[data-difference]')).toContainText('Pre-tax savings first reads')
    await assertBarsOnOneScale(page, 'retiredkept, two kept what-ifs')
    await assertOneVisibleCaveat(page, REAL.height)
  })

  test('?seed=dipkept: a kept what-if whose account is gone says so on its side and prints no count', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterProbability(page, 'dipkept')
    await pickIn(page, copy.probabilityComparedLabel, 'Save into the old account')
    await expect(page.locator('[data-half="compared"] [data-half-status]')).toHaveText(copy.workbenchRailRefusedAccountGone)
    await expect(page.locator('[data-half="compared"] [data-ring-centre]')).toHaveCount(0)
  })

  test('?vault=retiredkept: a rename written from the plan list survives a reload and an unlock through the real path, in the list’s own order', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS * 2 + 90_000)
    await gotoVaultFinal(page, 'retiredkept')
    await toProbability(page, 'retiredkept')
    await openPlanList(page)
    const second = planList(page).locator('[data-kept-row]').nth(1)
    await second.hover()
    await second.getByRole('button', { name: copy.planListRename }).click()
    const name = planList(page).locator('[data-kept-name]')
    await name.fill('Pre-tax first, renamed')
    await name.press('Enter')
    await expect(second.getByRole('button', { name: slots.planListOpenRow('Pre-tax first, renamed') })).toBeVisible()
    // The drawer is modal (the page behind it is out of the accessibility tree): the lock's own state attribute.
    await expect(page.locator('[data-save-state]'), 'the plan reads saved after the write').toHaveAttribute('data-save-state', 'clean')
    // Through the real path: reload (the plant param is gone), the real vault's unlock, its re-entry gate.
    await page.reload()
    await page.getByLabel('Passphrase', { exact: true }).fill(DEV_PASSPHRASE)
    await page.getByRole('button', { name: 'Open my plan' }).click()
    await page.getByRole('button', { name: /still about right/i }).click()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    await toProbability(page, 'retiredkept')
    await openPlanList(page)
    await expect(planList(page).locator('[data-kept-open] [data-kept-label]')).toHaveText(['Spend a little less', 'Pre-tax first, renamed', 'A calmer mix'])
  })

  test('?seed=retired (no vault): Keep opens the save ceremony; back from it, the kept what-if is listed and open on the left', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 150_000)
    await openTrayOn(page, 'retired')
    const spend = tray(page).locator('[data-tray-row="spending:total"] input').first()
    const plan = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    await spend.fill(String(plan - 6_000))
    await spend.press('Enter')
    await tray(page).locator('[data-tray-refresh]').click()
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 120_000 })
    await trayHandle(page).click()
    await openPlanList(page)
    await expect(planList(page).locator('[data-plan-list-ceremony]')).toHaveText(copy.planListFirstNote)
    await planList(page).getByRole('button', { name: copy.planListKeep }).click()
    await planList(page).getByLabel(copy.planListNameLabel).fill('Six thousand less')
    await planList(page).getByRole('button', { name: copy.planListNameConfirm }).click()
    await expect(page.getByRole('heading', { name: copy.saveHeading }), 'the save ceremony opened').toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: copy.flowBack }).first().click()
    await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached({ timeout: 30_000 })
    await expect(page.locator('[data-half="alternative"]'), 'the kept what-if is open on the left').toHaveAttribute('aria-label', 'Six thousand less')
    await openPlanList(page)
    await expect(planList(page).locator('[data-kept-open] [data-kept-label]')).toHaveText(['Six thousand less'])
  })

  test('?seed=retired (no vault): the lock menu’s Keep over an unkept what-if asks first; Stay keeps the what-if', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await openTrayOn(page, 'retired')
    const spend = tray(page).locator('[data-tray-row="spending:total"] input').first()
    const plan = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    await spend.fill(String(plan - 6_000))
    await spend.press('Enter')
    await trayHandle(page).click()
    await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
    await page.getByRole('menuitem', { name: copy.saveCta }).click()
    await expect(page.getByText(copy.shellCeremonyWhatIf), 'the ask names the what-if it would drop').toBeVisible()
    await expect(page.getByRole('heading', { name: copy.saveHeading }), 'nothing left yet').toHaveCount(0)
    await page.getByRole('button', { name: copy.workbenchLeaveStay }).click()
    await expect(page.getByText(copy.shellCeremonyWhatIf)).toHaveCount(0)
    await trayHandle(page).click()
    await expect(tray(page).locator('[data-tray-row="spending:total"] [data-changed]'), 'Stay keeps the edit').toHaveCount(1)
  })
})

test.describe(`RC5 · the plan list on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of ['retiredkept', 'dipkept'] as const) {
    test(`?seed=${seed}: the plan list is a full-screen sheet; every row's actions shown without hover; Done reachable; no sideways scroll`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      await page.getByRole('button', { name: copy.planListOpenLabel }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: copy.planListOpenLabel }).click()
      await expect(planList(page)).toBeVisible()
      await expect.poll(() => planList(page).evaluate((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)] })).toEqual([0, 0, PHONE.width])
      await settleLayout(page)
      const rows = planList(page).locator('[data-kept-row]')
      await expect(rows).toHaveCount(3)
      // No hover on a touch screen: the actions are shown, never faded.
      expect(await rows.first().locator('[data-row-actions]').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      await assertDrawerWhole(page, `${seed} PHONE plan list`)
      const done = planList(page).getByRole('button', { name: copy.planListDone })
      await done.scrollIntoViewIfNeeded()
      await expect(done).toBeInViewport()
      await noSidewaysScroll(page, `${seed} PHONE plan list`)
      await done.click()
      await expect(planList(page)).toHaveCount(0)
    })
  }
})

// ── RC6 · Retirement → Cash Flows (plan 6, RC6's Verification; plan 5.2: the year table's arms ported from
// `vertical-fit.spec.ts`). On `tablewidest` (the widest household: every column the table can draw, seven-digit
// balances, two 20-character names), `retired` and `dip`, at his window and on the phone:
//  - the page never scrolls sideways; the table scrolls inside its own frame (`tablewidest` on the phone proves the frame
//    really scrolls, or the law reads nothing), with Year and Age held at the frame's left edge scrolled to its end;
//  - at his window the first frame holds the title, the selects and the table's header rows;
//  - Income tax is a plain header (never a drill), and on `dip` payroll tax is its own column;
//  - a drill and its breadcrumb round-trip, back to the same headers;
//  - the Steady/Rough switch moves neither select;
//  - exactly one visible R13 caveat (the panel's; App.tsx's trailing mount hidden).
// Retired from the old table's arms: "no scroller at a laptop" (the plan's fit decision: a scrolling table at any size),
// and "each row's sentences read whole inside the frame" (the sentences left the table for the "Notes by year" list
// under it, so nothing of theirs sits in the scrolling frame). Ported: no sideways page scroll, the frame scrolling on
// the phone, and the rows landing moving no tap target (below).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const RC6_SEEDS = ['tablewidest', 'retired', 'dip'] as const
/** The Summary columns the widest seed draws (`cashFlowsView.ts`'s `summarySpecs`). It was planted for the old table's boxes,
 *  so five top columns it never fills (the first person's other income, Roth put in, the conversion, income not kept, a short year)
 *  are read by the composer's own tests, not here: this pin catches the seed drifting narrower. */
const TABLE_WIDEST_COLUMNS: readonly string[] = [
  'year', 'age', 'pay-0', 'pay-1', 'social-security', 'other-1', 'draw-taxable', 'draw-pretax', 'draw-roth', 'hsa-spend',
  'spending', 'income-tax', 'tax-on-pay', 'payroll', 'put-in-taxable', 'put-in-pretax', 'put-in-hsa',
]
const cfFrame = (page: Page) => page.locator('[data-table-frame]')
const cfSelect = (page: Page, name: string) => page.locator('[data-cash-flows-controls]').getByRole('combobox', { name })
const ANALYSIS = { screen: 'probability', module: copy.shellModuleRetirement, page: copy.shellPageAnalysis, hash: '#/retirement/analysis/probability' } as const

async function cfLanded(page: Page): Promise<void> {
  await expect(cfFrame(page), 'the table never landed').toBeVisible({ timeout: FINAL_TIER_MS })
  await expect(page.locator('[data-table-frame][data-busy]')).toHaveCount(0, { timeout: FINAL_TIER_MS })
  await settleLayout(page)
}

async function toCashFlows(page: Page, seed: string, phone: boolean): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: copy.shellPageCashFlows, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
  } else await showPage(page, CASH_FLOWS)
  await expect(page.locator('main.result[data-shell-screen="cash-flows"]')).toBeAttached()
  await cfLanded(page)
}

async function pickCf(page: Page, name: string, option: string): Promise<void> {
  await cfSelect(page, name).click()
  await page.getByRole('option', { name: option, exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
}

/** The frame's widths and its lead columns' left edges, at its start and scrolled to its end. */
async function frameReading(page: Page) {
  return cfFrame(page).evaluate(async (frame) => {
    const raf = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    const leads = () =>
      [...frame.querySelectorAll('tbody tr:first-child > :nth-child(-n+2)')].map((c) => Math.round((c.getBoundingClientRect().left - frame.getBoundingClientRect().left) * 10) / 10)
    frame.scrollLeft = 0
    await raf()
    const atStart = leads()
    frame.scrollLeft = frame.scrollWidth
    await raf()
    const atEnd = leads()
    const scrolled = frame.scrollLeft
    frame.scrollLeft = 0
    await raf()
    return { overflowX: getComputedStyle(frame).overflowX, scroll: frame.scrollWidth, client: frame.clientWidth, scrolled, atStart, atEnd }
  })
}

const selectBoxes = (page: Page) =>
  page.locator('[data-cash-flows-controls] [role="combobox"]').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return [Math.round(r.x * 10) / 10, Math.round((r.y + window.scrollY) * 10) / 10, Math.round(r.width * 10) / 10]
    }),
  )

for (const size of [
  { title: `at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, use: { viewport: REAL, deviceScaleFactor: REAL_DPR }, phone: false },
  { title: `on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true }, phone: true },
] as const) {
  test.describe(`RC6 · Cash Flows ${size.title}`, () => {
    test.use(size.use)
    for (const seed of RC6_SEEDS) {
      test(`?seed=${seed}: no sideways page scroll; the table scrolls in its own frame, Year and Age held; one caveat; Income tax no drill; a drill round-trips; the market switch moves no select`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await toCashFlows(page, seed, size.phone)
        await noSidewaysScroll(page, `${seed} Summary`)
        // The widest household is still the widest: every Summary column the table can draw is on screen (a seed whose
        // crown drifts to today, or that loses an account, would drop columns and leave every width law vacuous).
        const cols = await cfFrame(page).locator('thead th[data-col]').evaluateAll((ths) => ths.map((th) => th.getAttribute('data-col')))
        console.log(`[rc6 ${seed} columns] ${JSON.stringify(cols)}`)
        if (seed === 'tablewidest') expect(cols, 'the widest household prints every Summary column').toEqual(TABLE_WIDEST_COLUMNS)
        const f = await frameReading(page)
        console.log(`[rc6 ${seed} ${size.phone ? 'PHONE' : 'REAL'}] ${JSON.stringify(f)}`)
        expect(f.overflowX, 'the table scrolls inside its own frame').toBe('auto')
        if (seed === 'tablewidest' && size.phone) expect(f.scroll, 'the widest household’s table outgrows the phone’s frame, so the law reads something').toBeGreaterThan(f.client)
        if (f.scrolled > 0) expect(f.atEnd, 'Year and Age stay at the frame’s left edge scrolled to its end').toEqual(f.atStart)
        await assertOneVisibleCaveat(page, null)
        if (!size.phone) {
          // The first frame holds the title, the selects and the table's header rows.
          const head = await page.evaluate(() => ({
            title: document.querySelector('main.result h1')!.getBoundingClientRect().bottom,
            selects: Math.max(...[...document.querySelectorAll('[data-cash-flows-controls] [role="combobox"]')].map((el) => el.getBoundingClientRect().bottom)),
            thead: document.querySelector('[data-table-frame] thead')!.getBoundingClientRect().bottom,
          }))
          console.log(`[rc6 ${seed} REAL first frame] ${JSON.stringify(head)}`)
          expect(Math.max(head.title, head.selects, head.thead), `${seed}: the header rows sit in the first frame`).toBeLessThanOrEqual(REAL.height)
        }
        await expect(cfFrame(page).getByRole('columnheader', { name: copy.workbenchColIncomeTax, exact: true })).toBeVisible()
        await expect(cfFrame(page).getByRole('button', { name: copy.workbenchColIncomeTax, exact: true }), 'Income tax is never a drill').toHaveCount(0)
        if (seed === 'dip') await expect(cfFrame(page).getByRole('columnheader', { name: copy.workbenchLinePayroll, exact: true }), 'payroll tax, its own column').toBeAttached()
        // A drill and its breadcrumb round-trip.
        const headers = () => cfFrame(page).locator('thead th[data-col]').allTextContents()
        const before = await headers()
        const drill = cfFrame(page).locator('thead button').first()
        const drillName = (await drill.textContent()) ?? ''
        await drill.click()
        await expect(page.locator('[data-cash-flows-title]')).toHaveText(`${copy.cashFlowsTabSummary}/${drillName}`)
        await expect(page.locator('[data-cash-flows-title]')).toBeFocused()
        await noSidewaysScroll(page, `${seed} drill ${drillName}`)
        await page.locator('[data-cash-flows-title]').getByRole('button', { name: copy.cashFlowsTabSummary }).click()
        await expect(page.locator('[data-cash-flows-title]')).toHaveText(copy.cashFlowsTabSummary)
        expect(await headers()).toEqual(before)
        // Steady and Rough switch without moving either select.
        const at = await selectBoxes(page)
        await pickCf(page, copy.workbenchViewLegend, copy.workbenchViewRough)
        await cfLanded(page)
        expect(await selectBoxes(page), 'the switch moved a select').toEqual(at)
        await noSidewaysScroll(page, `${seed} Rough`)
        // The Accounts tab: its table switcher, and still no sideways page scroll.
        await page.getByRole('tab', { name: copy.cashFlowsTabAccounts }).click()
        await cfLanded(page)
        await expect(page.getByRole('combobox', { name: copy.cashFlowsAccountsLabel })).toBeVisible()
        await noSidewaysScroll(page, `${seed} Accounts`)
      })
    }
  })
}

test.describe(`RC6 · Cash Flows: the rows landing move no tap target (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  // Ported from the old table's switch walk (insight 035): the page is opened BEFORE the final answer's table runs land
  // (every message to the engine worker held 400 ms from the first load), and an in-page recorder logs the future
  // select's page-relative box on every frame on the settled answer, from its first paint until thirty frames after the
  // rows land. The presses are the top bar's and the sub-nav's, at the page's top, so no scroll moves a rect the walk compares.
  test('?seed=tablewidest: the future select stays put from its first paint through the rows landing', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS * 2 + 60_000)
    await page.addInitScript(() => {
      const send = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
        setTimeout(() => Reflect.apply(send, this, args), 400)
      } as typeof send
    })
    await page.goto('/?seed=tablewidest')
    await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on the home').toBeAttached({ timeout: FINAL_TIER_MS })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(() => {
      type Frame = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly table: boolean }
      const log: Frame[] = []
      ;(window as unknown as { __cfWalk: Frame[] }).__cfWalk = log
      let after = 0
      const tick = () => {
        const select = document.querySelector('[data-cash-flows-controls] [role="combobox"]')
        const settled = document.querySelector('main.result[data-answer-tier="final"]:not([data-answer-refiguring])') !== null
        if (select !== null && settled) {
          const r = select.getBoundingClientRect()
          const table = document.querySelector('[data-table-frame]:not([data-busy])') !== null
          log.push({ x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height, table })
          if (table) after++
        }
        if (after < 30) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    // The nav at the page's top: its presses scroll nothing the walk compares.
    await showPage(page, CASH_FLOWS)
    await expect(page.locator('main.result[data-shell-screen="cash-flows"]')).toBeAttached()
    await expect(cfFrame(page), 'the table never landed').toBeVisible({ timeout: FINAL_TIER_MS })
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __cfWalk: { table: boolean }[] }).__cfWalk.filter((f) => f.table).length), { timeout: FINAL_TIER_MS })
      .toBeGreaterThanOrEqual(30)
    const frames = await page.evaluate(() => (window as unknown as { __cfWalk: { x: number; y: number; w: number; h: number; table: boolean }[] }).__cfWalk)
    const before = frames.filter((f) => !f.table)
    console.log(`[rc6 switch walk] frames=${frames.length} beforeRows=${before.length} first=${JSON.stringify(frames[0])} last=${JSON.stringify(frames.at(-1))}`)
    expect(before.length, 'the select painted before the rows landed: otherwise the walk compares nothing').toBeGreaterThan(0)
    const first = frames[0]!
    for (const f of frames) {
      expect(Math.abs(f.x - first.x), 'the select moved sideways').toBeLessThanOrEqual(0.5)
      expect(Math.abs(f.y - first.y), 'the select moved up or down').toBeLessThanOrEqual(0.5)
      expect(Math.abs(f.w - first.w)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(f.h - first.h)).toBeLessThanOrEqual(0.5)
    }
  })
})

test.describe(`RC6 · Cash Flows: the plan select, the paired form and the CSV (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, acceptDownloads: true })

  test('?seed=retiredkept: a kept what-if’s own rows; your plan beside the what-if open on Analysis, every year your plan’s row over the what-if’s, each named; the CSV holds exactly the shown cells', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    await toCashFlows(page, 'retiredkept', false)
    const planRow = await cfFrame(page).locator('tbody tr').nth(5).textContent()
    await pickCf(page, copy.cashFlowsPlanLabel, 'Spend a little less')
    await cfLanded(page)
    expect(await cfFrame(page).locator('tbody tr').nth(5).textContent(), 'the kept what-if’s own rows').not.toBe(planRow)
    // Open a kept what-if on Analysis's left, then set it beside your plan here.
    await showPage(page, ANALYSIS)
    await page.getByRole('combobox', { name: copy.probabilityPickerLabel }).click()
    await page.getByRole('option', { name: 'Pre-tax savings first', exact: true }).click()
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await showPage(page, CASH_FLOWS)
    await pickCf(page, copy.cashFlowsPlanLabel, copy.cashFlowsPickPaired)
    await cfLanded(page)
    const groups = await cfFrame(page)
      .locator('tbody[data-row-group]')
      .evaluateAll((bodies) =>
        bodies.map((b) => ({
          year: b.querySelector('th[scope="rowgroup"]')?.textContent ?? '',
          span: b.querySelector('th[scope="rowgroup"]')?.getAttribute('rowspan') ?? '',
          runs: [...b.querySelectorAll('th[scope="row"]')].map((th) => th.textContent),
        })),
      )
    expect(groups.length, 'a group per year').toBeGreaterThan(10)
    for (const g of groups) {
      expect(g.runs, `${g.year}: your plan’s row over the what-if’s, each named`).toEqual([copy.workbenchRailPlanLabel, 'Pre-tax savings first'])
      expect(g.span).toBe('2')
    }
    // The CSV: exactly the cells shown (header rows first; a spanned year on each of its rows), read off the real file.
    const shown = await cfFrame(page).evaluate((frame) => {
      const head = [...frame.querySelectorAll('thead tr')].map((tr) =>
        [...tr.querySelectorAll('th')].flatMap((th) => [th.textContent ?? '', ...Array.from({ length: Number(th.getAttribute('colspan') ?? '1') - 1 }, () => '')]),
      )
      const body = [...frame.querySelectorAll('tbody')].flatMap((tb) => {
        const year = tb.querySelector('th[scope="rowgroup"]')?.textContent ?? null
        return [...tb.querySelectorAll('tr')].map((tr) => {
          const cells = [...tr.querySelectorAll('th, td')].map((c) => c.textContent ?? '')
          return year !== null && tr.querySelector('th[scope="rowgroup"]') === null ? [year, ...cells] : cells
        })
      })
      return [...head, ...body]
    })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: copy.cashFlowsDownloadLabel }).click()])
    const bytes = readFileSync((await download.path())!)
    expect([...bytes.subarray(0, 3)], 'a byte-order mark first').toEqual([0xef, 0xbb, 0xbf])
    const parse = (line: string): string[] => {
      const out = ['']
      let q = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!
        if (ch === '"' && q && line[i + 1] === '"') {
          out[out.length - 1] += '"'
          i++
        } else if (ch === '"') q = !q
        else if (ch === ',' && !q) out.push('')
        else out[out.length - 1] += ch
      }
      return out
    }
    expect(bytes.subarray(3).toString('utf8').split('\r\n').map(parse), 'the CSV is the shown cells').toEqual(shown)
  })
})

// ── RC7 · Retirement → Analysis → Confidence (plan 6, RC7's Verification, its test scenarios and its "Owed from RC4";
// section 5.2's ports: the old band's chart-text arms (the spine, the dense date household, the aged spine and aged date
// band, the widest tick) and the two vertical-fit laws RC4 retired with the old band, "the honesty floor — 68rem
// exactly" and "the band legend", rebuilt here on the clone's fan) ─────────────────────────────────────────────────────
// - at his window on `retired` and `dip`: one frame from the top bar to the end of the charts, the key-metric column and
//   the R13 caveat (the caveat closes that column); one visible caveat; no sideways scroll; every band word, tick, legend
//   item and moment label passes the Highcharts text audit, the run-out chart's too; the run-out chart's plot sits under
//   the fan's to the pixel; the retired metrics speak "in 100 futures" and no screen word is a percent, "0 in 100" or
//   "10 of 10"; the working route shows its stop marker and its stopgap line and no run-out chart;
// - at the phone and at a 20 px default: the same audit, and the charts, the metrics, then the caveat, in order and
//   reachable;
// - the aged returns (`?vault=stale`, `?vault=datestale`): the fan names when the plan was built and where today sits;
// - the floor (68rem exactly): the fan keeps its dollar ticks down to $0, and every band word and legend item is in frame
//   and legible; the legend names each range the fan draws, and nothing else;
// - the legend toggle: with both ranges hidden the axis zooms to the median and still starts at $0, the ranges' words
//   leave with them, and the run-out chart re-lines its years under the fan's.

const CONF = ['[data-confidence] [data-chart="fan"]', '[data-confidence]'] as const
const RUN_OUT = ['[data-chart="runout"]', '[data-runout-card]'] as const
/** The fan's required words on Confidence: both ranges' words, the legend's three names, its ticks and at least two
 *  named moments (Today and the plan's horizon on every household). */
const CONF_REQUIRED = FAN_REQUIRED
const RUN_OUT_REQUIRED = { texts: [], counts: { 'axis-label': 5 } } as const
/** The words no Confidence screen may print: a percent for odds or a share, "0 in 100", "10 of 10". */
const CONF_BANNED = /%|\b0 in 100\b|\b10 of 10\b/

/** From the home, Retirement → Analysis, then the Confidence tab; the fan drawn and, retired, the run-out chart. */
async function toConfidence(page: Page, who: string): Promise<void> {
  await toProbability(page, who)
  await page.getByRole('tab', { name: copy.confidenceTab }).click()
  await expect(page.locator('main.result[data-shell-screen="confidence"]')).toBeAttached()
  await expect(page.locator(`${CONF[0]} .highcharts-series-group`), `${who}: the fan never drew`).toBeAttached({ timeout: 30_000 })
  if ((await page.locator('[data-confidence="headline"]').count()) > 0) {
    await expect(page.locator(`${RUN_OUT[0]} .highcharts-series-group`), `${who}: the run-out chart never drew`).toBeAttached({ timeout: 30_000 })
  }
  await page.waitForTimeout(800)
  await settleLayout(page)
}

async function enterConfidence(page: Page, seed: string): Promise<void> {
  await gotoSeedFinal(page, seed)
  await toConfidence(page, seed)
}

/** The two charts' plot areas, left and right edges. */
async function plotEdges(page: Page): Promise<{ fan: { left: number; right: number }; runOut: { left: number; right: number } | null }> {
  return page.evaluate(() => {
    const edge = (sel: string) => {
      const r = document.querySelector(sel)?.getBoundingClientRect()
      return r === undefined ? null : { left: r.left, right: r.right }
    }
    return { fan: edge('[data-confidence] [data-chart="fan"] .highcharts-plot-background')!, runOut: edge('[data-chart="runout"] .highcharts-plot-background') }
  })
}

/** Every Confidence text audit: the fan's, and on the retired route the run-out chart's. */
async function auditConfidence(page: Page, who: string): Promise<void> {
  await page.locator(CONF[0]).scrollIntoViewIfNeeded()
  await settleLayout(page)
  const floor = await hcFloorPx(page)
  assertHcText(await hcAudit(page, ...CONF), floor, CONF_REQUIRED, `${who} fan`)
  if ((await page.locator(RUN_OUT[0]).count()) > 0) assertHcText(await hcAudit(page, ...RUN_OUT), floor, RUN_OUT_REQUIRED, `${who} run-out chart`)
  const words = await page.locator('[data-confidence]').innerText()
  expect(CONF_BANNED.test(words), `${who}: a banned word on the tab: ${CONF_BANNED.exec(words)?.[0]}`).toBe(false)
}

/** The charts, then the key-metric column, then the caveat, in the reading order and stacked so on the phone; the caveat
 *  reachable. */
async function assertConfidenceOrder(page: Page, who: string, stacked: boolean): Promise<void> {
  const read = await page.evaluate(() => {
    const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect()
    const charts = [...document.querySelectorAll('[data-fan], [data-runout-card], [data-runout-stopgap]')].map((e) => e.getBoundingClientRect())
    const caveat = document.querySelector('main.result [data-caveat]')!
    const metrics = document.querySelector('[data-metrics]')!
    const follows = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    return {
      chartsBottom: Math.max(...charts.map((r) => r.bottom)),
      metricsTop: box('[data-metrics]').top,
      caveatTop: caveat.getBoundingClientRect().top,
      metricsAfterCharts: follows(document.querySelector('[data-fan]')!, metrics),
      caveatLast: follows(metrics.querySelector('[data-metric], [data-footnote]') ?? metrics, caveat) && metrics.contains(caveat),
    }
  })
  expect(read.metricsAfterCharts, `${who}: the key-metric column follows the charts`).toBe(true)
  expect(read.caveatLast, `${who}: the R13 caveat closes the key-metric column`).toBe(true)
  if (stacked) {
    expect(read.metricsTop, `${who}: the metrics stack under the charts`).toBeGreaterThanOrEqual(read.chartsBottom - 0.5)
    expect(read.caveatTop, `${who}: the caveat under the metrics`).toBeGreaterThanOrEqual(read.metricsTop)
  }
  await assertOneVisibleCaveat(page, null)
  const caveat = page.locator('main.result [data-caveat]')
  await caveat.scrollIntoViewIfNeeded()
  await expect(caveat, `${who}: the R13 caveat is reachable`).toBeInViewport()
}

test.describe(`RC7 · Confidence at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=retired: one frame to the run-out chart and the caveat; the plots line up; the run-out words; the text audit', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterConfidence(page, 'retired')
    await expect(page.getByRole('heading', { level: 2, name: copy.confidenceChartTitle })).toBeVisible()
    await expect(page.getByRole('button', { name: copy.trayHandle }), 'no ACTION ITEMS on Confidence: the fan reads your plan only').toHaveCount(0)
    const frame = await page.evaluate(() => ({
      scrollY: window.scrollY,
      fan: document.querySelector('[data-fan]')!.getBoundingClientRect().bottom,
      runOut: document.querySelector('[data-runout-card]')!.getBoundingClientRect().bottom,
      metrics: document.querySelector('[data-metrics]')!.getBoundingClientRect().bottom,
    }))
    expect(frame.scrollY).toBe(0)
    for (const [what, bottom] of Object.entries(frame).filter(([k]) => k !== 'scrollY')) expect(bottom, `retired: the ${what} inside his window`).toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    await noSidewaysScroll(page, 'retired REAL Confidence')
    const edges = await plotEdges(page)
    expect(edges.runOut, 'the run-out chart drew a plot').not.toBeNull()
    expect(Math.abs(edges.runOut!.left - edges.fan.left), 'the run-out plot starts under the fan’s first year').toBeLessThanOrEqual(1)
    expect(Math.abs(edges.runOut!.right - edges.fan.right), 'the run-out plot ends under the fan’s last year').toBeLessThanOrEqual(1)
    const metrics = await page.locator('[data-metric]').allInnerTexts()
    expect(metrics[0], 'the lead metric: the share by the last year drawn').toMatch(/^By ages \d+ and \d+, (about \d+ in 100 futures have|fewer than 1 in 100 futures have)/)
    // `retired`'s fan is cut at the thinning cohort (year 27 of 47): the whole plan's share names the longer span and
    // why the charts stop, and the right-hand moment says where the range ends, never "Plan horizon".
    expect(metrics[1], 'the whole plan’s share, worded as the longer span').toMatch(/^The charts stop at ages \d+ and \d+: past them, .*Over the whole plan, (about \d+ in 100 futures run|fewer than 1 in 100 futures run)/)
    await expect(page.locator(`${CONF[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockCutLabel }), 'the cut edge named').toHaveCount(1)
    await expect(page.locator(`${CONF[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockHorizonLabel })).toHaveCount(0)
    await auditConfidence(page, 'retired REAL')
    // Decision 7: hovering the median fades no printed value.
    await page.locator(CONF[0]).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const median = await page.locator(`${CONF[0]} .b9-fan-median path.highcharts-graph`).first().boundingBox()
    await page.mouse.move(median!.x + median!.width / 2, median!.y + median!.height / 2, { steps: 6 })
    assertHcText(await hcAudit(page, ...CONF), await hcFloorPx(page), CONF_REQUIRED, 'retired REAL fan, hovered')
  })

  test('?seed=dip: one frame; the stop-year marker and word; the stopgap line in the run-out chart’s place; the text audit', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterConfidence(page, 'dip')
    await expect(page.locator(`${CONF[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockWorkStopsLabel }), 'the stop-year marker’s word').toHaveCount(1)
    await expect(page.locator('[data-runout-stopgap]')).toHaveText(copy.confidenceRunOutStopgap)
    await expect(page.locator(RUN_OUT[0]), 'no run-out chart on the working route').toHaveCount(0)
    // The working fan is cut where the cohort thins: "Range ends" at the cut, never "Plan horizon".
    await expect(page.locator(`${CONF[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockCutLabel }), 'dip: the cut edge named').toHaveCount(1)
    await expect(page.locator(`${CONF[0]} .highcharts-plot-line-label`, { hasText: copy.bandClockHorizonLabel }), 'dip: no "Plan horizon" on a cut fan').toHaveCount(0)
    // Under the fan, whose world the range prices (the track note), inside the frame with the rest.
    await expect(page.locator('[data-confidence] [data-fan-track]'), 'dip: the fan’s track note').toHaveCount(1)
    const bottom = await page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-fan], [data-fan-track], [data-runout-stopgap], [data-metrics]')].map((e) => e.getBoundingClientRect().bottom)))
    expect(bottom, 'dip: the fan, the stopgap and the metrics inside his window').toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    await noSidewaysScroll(page, 'dip REAL Confidence')
    await auditConfidence(page, 'dip REAL')
  })

  test('?seed=retired: the legend toggle — both ranges hidden, the axis zooms to the median from $0, the ranges’ words leave, the run-out years re-line', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    // Highcharts times its morph on the page clock, which this harness fixes (`reviewSurface.ts`'s `setFixedTime`), so
    // a redraw's morph never leaves its first frame here: the plot and the ticks stay where the toggle found them
    // (measured: the plot's left edge held at the old axis's while the run-out chart had moved). Reduced motion draws
    // each redraw in its final place, which is what a reader sees once the 250 ms morph ends.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterConfidence(page, 'retired')
    const ticks = () => page.locator(`${CONF[0]} .highcharts-yaxis-labels text`).allTextContents()
    const top = (labels: string[]) => Math.max(...labels.map(figureDollars))
    const before = await ticks()
    for (const name of [copy.snapshotFanOuter, copy.snapshotFanInner]) {
      await page.locator(`${CONF[0]} .highcharts-legend-item`, { hasText: name }).click()
    }
    await page.waitForTimeout(800)
    const after = await ticks()
    expect(after, 'the zoomed axis still starts at $0').toContain('$0')
    expect(top(after), `the axis zoomed in to the median (${before.join(' ')} → ${after.join(' ')})`).toBeLessThan(top(before))
    for (const words of [copy.snapshotFanOuterWords, copy.snapshotFanInnerWords]) {
      await expect(page.locator(`${CONF[0]} .highcharts-data-label`, { hasText: words }), `"${words}" leaves with its range`).toBeHidden()
    }
    await expect(page.locator(`${CONF[0]} .highcharts-legend-item-hidden`), 'two legend items struck through').toHaveCount(2)
    // The run-out chart is rebuilt on the fan's new plot box once the fan has redrawn (its key, `RunOutChart.tsx`).
    await expect
      .poll(async () => {
        const e = await plotEdges(page)
        return Math.round(Math.abs(e.runOut!.left - e.fan.left) + Math.abs(e.runOut!.right - e.fan.right))
      }, { message: 'the run-out plot re-lines under the zoomed fan', timeout: 5_000 })
      .toBeLessThanOrEqual(1)
    // And back: the full axis and the words return.
    for (const name of [copy.snapshotFanOuter, copy.snapshotFanInner]) await page.locator(`${CONF[0]} .highcharts-legend-item`, { hasText: name }).click()
    await page.waitForTimeout(800)
    expect(await ticks()).toEqual(before)
    await expect(page.locator(`${CONF[0]} .highcharts-data-label`, { hasText: copy.snapshotFanOuterWords })).toBeVisible()
  })
})

test.describe(`RC7 · Confidence on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the charts, the metrics, then the caveat, in one column; no sideways scroll; the text audit`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterConfidence(page, seed)
      await noSidewaysScroll(page, `${seed} PHONE Confidence`)
      await auditConfidence(page, `${seed} PHONE`)
      await assertConfidenceOrder(page, `${seed} PHONE`, true)
    })
  }
})

test.describe(`RC7 · Confidence at a 20 px browser default (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the text audit at the reader’s font; the charts, the metrics, then the caveat; no sideways scroll`, async ({ page, context }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      const cdp = await context.newCDPSession(page)
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 20 } })
      await enterConfidence(page, seed)
      await noSidewaysScroll(page, `${seed} 20px Confidence`)
      await auditConfidence(page, `${seed} 20px`)
      await assertConfidenceOrder(page, `${seed} 20px`, false)
    })
  }
})

test.describe(`RC7 · Confidence on the aged returns (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  for (const key of ['stale', 'datestale'] as const) {
    test(`?vault=${key}: the fan names when the plan was built and where today sits; the text audit; one caveat, reachable`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      const affirm = await unlockToGate(page, key)
      await affirm.click()
      await expect(page.locator(SETTLED_RESULT), `?vault=${key}: the echoed answer never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
      await toConfidence(page, `?vault=${key}`)
      const moments = await page.locator(`${CONF[0]} .highcharts-plot-line-label`).allTextContents()
      expect(moments, `?vault=${key}: the moments (${moments.join(' | ')})`).toEqual(expect.arrayContaining([copy.bandClockBuiltLabel, copy.bandClockTodayLabel]))
      // The aged fan ships beside its premise (U17 §S2) and the premise's re-confirm door, rendered.
      const premise = page.locator('[data-confidence] [data-fan-premise]')
      await expect(premise, `?vault=${key}: the aged fan's premise`).toHaveCount(1)
      await expect(premise.getByRole('button', { name: copy.bandPremiseReconfirmCta }), `?vault=${key}: the premise's door`).toBeVisible()
      await auditConfidence(page, `?vault=${key} REAL`)
      await assertConfidenceOrder(page, `?vault=${key}`, false)
    })
  }
})

test.describe('RC7 · the old band’s chart-text arms, ported to Confidence', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  // The densest date household (`datemixed`, the floor-dated split) and the widest tick (`borderline`, the old $1.25M
  // lattice's six-glyph dollars): every word readable, inside, never shrunk or hidden.
  for (const seed of ['datemixed', 'borderline'] as const) {
    test(`?seed=${seed}: the fan’s text passes the audit`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterConfidence(page, seed)
      await auditConfidence(page, `${seed} REAL`)
    })
  }
})

test.describe(`RC7 · the honesty floor — 68rem exactly (${FLOOR.width}×${FLOOR.height})`, () => {
  test.use({ viewport: FLOOR })
  test('?seed=retired: the fan keeps its dollar ticks to $0; every band word and the legend in frame and legible; the legend names each range the fan draws', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await enterConfidence(page, 'retired')
    // The two-pane tier holds at the floor: the key-metric column beside the charts.
    const side = await page.evaluate(() => document.querySelector('[data-metrics]')!.getBoundingClientRect().left > document.querySelector('[data-fan]')!.getBoundingClientRect().right)
    expect(side, 'the floor is still the two-pane tier').toBe(true)
    // The y-tick dollars are the colour-blind reader's position-to-dollar decoder (never colour alone), $0 the honest
    // floor of the scale.
    const ticks = await page.locator(`${CONF[0]} .highcharts-yaxis-labels text`).allTextContents()
    expect(ticks.length, 'the fan drew no dollar ticks').toBeGreaterThan(2)
    expect(ticks, 'the $0 anchor').toContain('$0')
    // Every band word, tick, moment and legend item: present, visible, unclipped, at the floor size, and in frame.
    const audit = await hcAudit(page, ...CONF)
    expect(hcTextFailures(audit, await hcFloorPx(page), CONF_REQUIRED), 'the fan’s text at the floor').toEqual([])
    const outOfFrame = audit.labels.filter((l) => (l.kind === 'data-label' || l.kind === 'legend-item') && l.text !== '' && l.bottom > FLOOR.height + 0.5)
    expect(outOfFrame.map((l) => l.text), 'every band word and legend item inside the first frame').toEqual([])
    // The band legend: it names each range the fan draws, and nothing else (band shape alone never carries the
    // encoding). The drawn tiers are read off the chart's own series; the legend's rows off its items.
    const legend = await page.evaluate((sel) => {
      const chart = document.querySelector(sel)!
      const drawn = ['b9-fan-outer', 'b9-fan-inner', 'b9-fan-median'].filter((c) => chart.querySelector(`.highcharts-series.${c} path`) !== null)
      const rows = [...chart.querySelectorAll('.highcharts-legend-item')].map((el) => ({
        tier: ['b9-fan-outer', 'b9-fan-inner', 'b9-fan-median'].find((c) => el.classList.contains(c)) ?? '?',
        text: (el.textContent ?? '').trim(),
        shown: el.getBoundingClientRect().height > 0,
      }))
      return { drawn, rows }
    }, CONF[0])
    expect(legend.drawn, 'the fan draws its three tiers').toEqual(['b9-fan-outer', 'b9-fan-inner', 'b9-fan-median'])
    expect(legend.rows.map((r) => r.tier), 'one legend row per drawn tier, in order').toEqual(legend.drawn)
    expect(legend.rows.map((r) => r.text), 'each row names its range').toEqual([copy.snapshotFanOuter, copy.snapshotFanInner, copy.snapshotFanMedian])
    expect(legend.rows.every((r) => r.shown), 'every legend row is drawn').toBe(true)
  })
})
