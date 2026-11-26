import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, FLOOR, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, armRefiguringWatch, expectRefiguringSeen, gotoSeedFinal, gotoVaultFinal, pinPlantDay, pinnedDay, pinnedYear, refiguringLog, rewalkSeedTo, settleLayout, test } from './reviewSurface'
import { copy, slots } from '../src/ui/copy'
import { navModules } from '../src/ui/shell/routes'
import { ENGINE_PRICING_LEDGER } from '../src/engine/pricingVersion'
import { DEV_VAULT_PASSPHRASE as DEV_PASSPHRASE } from '../src/ui/devSeeds'
import { IN_FRAME_DISCLAIMER_ID } from '../src/ui/disclaimerId'
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
/** The menu's walk targets: Profile → Expenses (RC13b; the interim facts page it replaced was the last interim tab) and
 *  RC6's Cash Flows. */
const PAGES = [{ screen: 'profile-expenses', module: copy.shellModuleProfile, page: copy.shellPageExpenses, hash: '#/profile/expenses' }] as const
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

  test(`?seed=${SEED}: the top bar is 48 px and the sub-nav 40 px; the face is Figtree inside .rc-root; the walked pages reachable, one settled main.result each`, async ({ page }) => {
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
    // Every page the menu walks reachable by its address, one settled main.result each (RC13b: the interim tab, its banner
    // and the legacy padding read inside it went with the facts page, the last interim tab).
    for (const target of PAGES) {
      await showPage(page, target)
      expect(new URL(page.url()).hash, `${target.screen}: the hash names the page`).toBe(target.hash)
      await expect(page.locator('main.result'), `${target.screen}: exactly one main.result`).toHaveCount(1)
      await expect(page.locator(SETTLED_RESULT), `${target.screen}: the settle hook settles here`).toHaveCount(1)
    }
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
      // Every page the route table names, in its order (read from `navModules`, the menu's own source; the order itself is
      // pinned module by module in `routes.test.ts`), so a unit that adds a route never reds this arm by a stale hand list
      // (RC11 and RC12 each did, b9-11).
      const pages = navModules().flatMap((m) => m.pages.map((p) => p.label))
      expect(pages.length, '[test setup] the route table names pages').toBeGreaterThan(5)
      expect(await sheet.getByRole('link').allTextContents(), 'the menu holds every page, in the nav’s order').toEqual(pages)
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

/** `tie`: the page's figures name the caveat in `aria-describedby` (`verdictDescribedBy`), so a screen reader hears it as
 *  their own description. Off only where the page shows no tied figure in the state read: Tax Strategies before a Winner
 *  card (the ask, the steer note, the working route's stopgap); and Cash Flows' table, a figured page that carries no tie
 *  today (filed by milestone 2's fix round; Social Security's all-claimed lines now carry the tie). */
async function assertOneVisibleCaveat(page: Page, inFrameHeight: number | null, tie = true): Promise<void> {
  const caveat = page.locator('main.result[data-inframe-disclaimer] [data-caveat]')
  await expect(caveat, 'Snapshot’s in-frame caveat').toHaveCount(1)
  await expect(caveat).toBeVisible()
  if (tie) {
    await expect(caveat, 'the caveat carries the one in-frame id').toHaveAttribute('id', IN_FRAME_DISCLAIMER_ID)
    const tied = await page.evaluate(
      (id) => [...document.querySelectorAll('main.result [aria-describedby]')].filter((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(id)).length,
      IN_FRAME_DISCLAIMER_ID,
    )
    expect(tied, 'the R13 tie: a figure on the page names the caveat in aria-describedby').toBeGreaterThan(0)
  }
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

/**
 * The page's one R13 caveat can be REACHED and SEEN (RC11, insight 124): the DOCUMENT alone is scrolled to it (never
 * `scrollIntoView`, which scrolls every box on the way and so "reaches" a caveat trapped in an `overflow: hidden` box),
 * then a hit test at two points, the caveat's upper half and 4 px above its bottom edge, must each land on the caveat or
 * inside it, with both points in the window.
 */
async function assertCaveatReachable(page: Page, who: string): Promise<void> {
  const caveat = page.locator('main.result [data-caveat]')
  await expect(caveat, `${who}: one in-frame caveat`).toHaveCount(1)
  await caveat.evaluate((el) => {
    const r = el.getBoundingClientRect()
    window.scrollTo(0, Math.max(0, r.top + window.scrollY - window.innerHeight / 2 + r.height / 2))
  })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const misses = await caveat.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    return [
      ['its upper half', r.top + r.height / 4],
      ['4 px above its bottom edge', r.bottom - 4],
    ].flatMap(([where, y]) => {
      const yy = y as number
      if (yy < 0 || yy > window.innerHeight) return [`${where} (y ${yy.toFixed(1)}) is outside the window`]
      const top = document.elementFromPoint(x, yy)
      return top !== null && (top === el || el.contains(top)) ? [] : [`${where} (y ${yy.toFixed(1)}) lands on ${top === null ? 'nothing' : `${top.tagName.toLowerCase()}.${[...top.classList].slice(0, 3).join('.')}`}`]
    })
  })
  expect(misses, `${who}: the caveat reached and seen`).toEqual([])
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
//   left; Tax Strategies (RC8) carries the record card.
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
        // The survivor's spending basis (the disclosure map's row), said once under both halves while no lever moves it.
        // `retired`'s basis is steady, so the line is drawn (`probabilityView.test.ts` pins the same on its real run).
        if (seed === 'retired') {
          await expect(page.locator('[data-shared-notes]'), `${seed}: the survivor’s spending basis`).toContainText('This assumes about $')
          await expect(page.locator('[data-shared-notes]'), `${seed}: the survivor’s income step-down, said once under both halves`).toContainText('the household’s monthly income steps down about ~$')
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
    // The chart has no key-metric column: its footnote row carries the state clause, exactly once.
    const clause = page.locator('main.result').getByText(copy.verdictStateUnpricedNote, { exact: true })
    await expect(clause, 'dip odds: the unpriced state clause, exactly once').toHaveCount(1)
    await expect(clause).toBeVisible()
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

  test('?vault=rec: Snapshot’s "Try it in the plan" opens Probability with Recommended on the left; Tax Strategies carries the record card', async ({ page }) => {
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
    await expect(page.locator('main.result[data-shell-screen="tax-strategies"] [data-record]'), 'the record card on Tax Strategies').toBeVisible()
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
      await assertCaveatReachable(page, `${seed} PHONE Probability`)
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} PHONE Probability`)
      // The caveat's last line clears the ACTION ITEMS handle (b9-10: on the phone's 16 px panel padding the handle's
      // upper half sat on the caveat's descenders).
      const gap = await page.evaluate(() => {
        const caveat = document.querySelector('main.result [data-caveat]')!.getBoundingClientRect()
        const handle = document.querySelector('main.result [aria-controls="b9-action-items"]')!.getBoundingClientRect()
        return handle.top - caveat.bottom
      })
      expect(gap, `${seed} PHONE: the caveat clears the handle by at least 4 px`).toBeGreaterThanOrEqual(4)
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
      await assertCaveatReachable(page, `${seed} 20px Probability`)
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
  // and the page must still hold the R13 caveat in one frame with the tray shut again, the handle reachable below it.
  // Content over layout (b9-7, 2026-11-24): the survivor step-down line under the survivor row puts the handle 27 px below the frame here.
  test('?seed=budget: a landed what-if that changes the survivor line still holds the R13 caveat in one frame, the ACTION ITEMS handle reachable, the tray shut', async ({ page }) => {
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
      caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
    }))
    expect(frame.scrollY).toBe(0)
    expect(frame.caveat, 'budget landed: the R13 caveat in the first frame').toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    await assertBarsOnOneScale(page, 'budget, the what-if landed')
    // The handle may sit just below the frame here, never out of reach.
    const handle = trayHandle(page)
    await handle.scrollIntoViewIfNeeded()
    await expect(handle, 'budget landed: the ACTION ITEMS handle reachable').toBeVisible()
    await expect(handle).toBeEnabled()
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

  // The subsidy-rules what-if's health line (the register's Tier 0 line RC10 lost): each side's lifetime health cost
  // under the difference line, its cell held from the first frame, and the page still one frame with the tray shut. On
  // the working route the plan's side is its own run, landing after the ring.
  for (const seed of ['health', 'dip'] as const) {
    test(`?seed=${seed}: the other subsidy rules, refreshed, print each side's lifetime health cost under the odds; the landing moves nothing; one frame with the tray shut`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 180_000)
      await openTrayOn(page, seed)
      await tray(page).locator('[data-tray-row="aca-subsidy"]').getByRole('combobox').click()
      await page.getByRole('option', { name: copy.leverHealthRegimeEnhanced, exact: true }).click()
      await expect(page.getByRole('listbox')).toHaveCount(0)
      await tray(page).locator('[data-tray-refresh]').click()
      const cell = page.locator('[data-health]')
      await expect(cell, 'the health cell stands from the first frame of the what-if').toHaveCount(1)
      const before = await cell.evaluate((el) => el.getBoundingClientRect().height)
      const line = cell.locator('span').first()
      await expect(line, 'the health line never landed').toHaveText(/^Lifetime health premiums could run/, { timeout: 150_000 })
      const text = (await line.textContent()) ?? ''
      const figures = [...text.matchAll(/~\$([\d,]+)/g)].map((m) => m[1])
      expect(figures.length, `two figures, each side's own: "${text}"`).toBe(2)
      expect(figures[0], `the rules move the cost on ${seed}: "${text}"`).not.toBe(figures[1])
      expect(await cell.evaluate((el) => el.getBoundingClientRect().height), 'the landing grows no cell').toBe(before)
      await trayHandle(page).click()
      await expect(tray(page)).toHaveCount(0)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(600)
      await settleLayout(page)
      const frame = await page.evaluate(() => ({
        caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
        health: document.querySelector('[data-health]')!.getBoundingClientRect().bottom,
      }))
      expect(frame.health, `${seed}: the health line in the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.caveat, `${seed}: the R13 caveat in the first frame`).toBeLessThanOrEqual(REAL.height)
      await assertOneVisibleCaveat(page, REAL.height)
      await noSidewaysScroll(page, `${seed} REAL health line`)
    })
  }
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

  // A tap at a control's centre reaches the control (b9-10, 2026-11-25): on `health` the compared column grew to its
  // widest value, the control column shrank to 21 px, and the subsidy-rules select ran under the compared cell's box,
  // which took every tap at its centre while the eye saw nothing wrong. The overlap audits pass that page (two text
  // boxes, no two controls); only a hit test sees it.
  for (const seed of ['health', 'retired', 'dip'] as const) {
    test(`?seed=${seed}: every control in the sheet takes a tap at its centre; no other cell's box sits over it`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, seed)
      await trayHandle(page).scrollIntoViewIfNeeded()
      await trayHandle(page).click()
      const sheet = page.getByRole('dialog', { name: copy.trayHandle })
      await expect(sheet).toBeVisible()
      await page.waitForTimeout(400)
      await assertSheetTapsReach(sheet, seed, 4)
    })
  }
})

/** Every visible control in a tray's sheet takes a tap at its centre: no other cell's box sits over it (b9-10). `atLeast`
 *  is how many controls the sheet must hold, so the arm can never probe nothing and pass. */
async function assertSheetTapsReach(sheet: ReturnType<Page['getByRole']>, who: string, atLeast: number): Promise<void> {
  const controls = sheet.locator('[data-tray-row] :is(button, input, [role="combobox"], [role="slider"], [data-thumb])')
  const n = await controls.count()
  expect(n, '[test setup] the sheet has controls').toBeGreaterThanOrEqual(atLeast)
  const covered: string[] = []
  let probed = 0
  for (let i = 0; i < n; i++) {
    const c = controls.nth(i)
    // A visually hidden form control (Base UI's select and slider inputs) takes no tap.
    const hidden = await c.evaluate((el) => getComputedStyle(el).clipPath === 'inset(50%)' || el.closest('[aria-hidden="true"]') !== null || (el as HTMLInputElement).type === 'hidden')
    if (hidden || !(await c.isVisible())) continue
    await c.scrollIntoViewIfNeeded()
    probed += 1
    const hit = await c.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      if (top === null || el === top || el.contains(top)) return null
      const row = el.closest('[data-tray-row]')?.getAttribute('data-tray-row')
      return `${row}: ${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" under ${top.tagName.toLowerCase()} "${(top.textContent ?? '').trim().slice(0, 40)}"`
    })
    if (hit !== null) covered.push(hit)
  }
  expect(probed, '[test setup] the arm probed the sheet’s controls').toBeGreaterThanOrEqual(atLeast)
  expect(covered, `${who}: a control a tap at its centre never reaches`).toEqual([])
}

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
/** One engine-input edit the way a household makes it since Act 6 · RC18 (the assumption panel's inline fields left with
 *  it): the gear opens Settings, the survivor row's door opens the Living expenses drawer over Settings, the share is
 *  moved (70% ↔ 65%, an engine input on every route) and saved, and the module word (the phone's menu) takes the reader
 *  back to `back` ('retirement' lands on Analysis → Probability, 'dashboard' on Snapshot). For the held arms only: the
 *  preview holds the run, so the flag still stands on the way back. Returns once the page named is back. */
async function editThroughSettings(page: Page, back: 'retirement' | 'dashboard'): Promise<void> {
  await page.locator('[data-gear]').click()
  await expect(page.locator('main.result[data-shell-screen="settings"]')).toBeAttached()
  await page.locator('[data-assumption-seat="survivor-ratio"]').getByRole('button', { name: copy.settingsSurvivorRatioDoor }).click()
  const drawer = page.getByRole('dialog', { name: copy.profileKindLiving })
  await expect(drawer).toBeVisible()
  const field = drawer.getByLabel(copy.assumptionSurvivorRatioLabel)
  const now = (await field.inputValue()).replace(/[^0-9]/g, '')
  await field.fill(now === '70' ? '65' : '70')
  await drawer.getByRole('button', { name: copy.profileDrawerSave }).click()
  await expect(drawer).toBeHidden()
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: back === 'retirement' ? copy.shellModuleRetirement : copy.shellModuleDashboard, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: back === 'retirement' ? copy.shellPageAnalysis : copy.shellPageSnapshot, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
  }
  await expect(page.locator(`main.result[data-shell-screen="${back === 'retirement' ? 'probability' : 'snapshot'}"]`)).toBeAttached()
}

async function enterHeldWindow(page: Page, seed: string) {
  await page.goto(`/?preview=refiguring&seed=${seed}`)
  await expect(page.locator(SETTLED_RESULT), `${seed}: the preview never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await toProbability(page, seed)
  await expect(page.locator('[data-intro-eyebrow]').filter({ visible: true }), 'a settled landing shows no re-figuring line').toHaveCount(0)
  const before = { lead: await visibleEdges(page, '[data-intro-lead]'), caveat: await visibleEdges(page, 'main.result [data-caveat]') }
  // The edit through Settings' drawer (RC18). The panel's echo box, which said "being figured again" beside the edit,
  // left with the panel: the page's own line is the one that says it, and these arms read it.
  await editThroughSettings(page, 'retirement')
  await expect(page.locator('main.result[data-answer-refiguring]'), 'the edit raised no re-figuring flag').toBeAttached({ timeout: 30_000 })
  await settleLayout(page)
  return { before }
}

/** Read after the window's boxes: the flag still stands over the old final, so every box was read inside the window. */
async function expectStillHeld(page: Page): Promise<void> {
  await expect(page.locator('main.result[data-answer-refiguring][data-answer-tier="final"]'), 'the preview let the window close before the read').toHaveCount(1)
}

test.describe(`RC4 ported · the re-figuring window, held (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('spine (?seed=budget): the line on one line, in frame; the answer and the R13 caveat do not move', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    const { before } = await enterHeldWindow(page, 'budget')
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
    await expectStillHeld(page)
  })

  test('date (?seed=date): the date’s own line, in frame; the answer does not move; the odds chart wears the caption’s clause', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    const { before } = await enterHeldWindow(page, 'date')
    const line = page.locator('[data-intro-eyebrow]').filter({ visible: true })
    await expect(line).toHaveText(copy.answerRefiguringDate)
    const edges = (await visibleEdges(page, '[data-intro-eyebrow]'))!
    const lead = (await visibleEdges(page, '[data-intro-lead]'))!
    expect(edges.oneLine, `the line wraps (${edges.height.toFixed(1)} px)`).toBe(true)
    expect(edges.bottom, 'the line leaves the first frame').toBeLessThanOrEqual(REAL.height)
    expect(Math.abs(lead.top - before.lead!.top), `the answer moved ${(lead.top - before.lead!.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
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
  test('a spending edit applied from the Action Items tray raises data-answer-refiguring over the old answer, and it clears in the commit that puts up the new one', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS * 2 + 60_000)
    await enterProbability(page, 'retired')
    // $9,500 a month takes `retired` from on track to off track (measured 2026-11-20), so the answer's own words move in
    // the commit that clears the flag; a raise that left them still would leave that commit unseen. Since RC18 (the gear's
    // panel, whose inline field made this edit over Probability, is gone) the edit is the tray's: the spending figure
    // raised by the same share, Refresh, then Apply to my plan, which writes the plan and refigures it on this page (a
    // drawer opened from Settings refigures it off the page: the spine's run lands in about a tenth of a second, measured
    // 2026-11-25, before any trip back).
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    const tray = page.locator('#b9-action-items')
    await expect(tray).toBeVisible()
    const spend = tray.locator('[data-tray-group="spending"] input[inputmode="decimal"]').first()
    const planSpend = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    expect([6_500, 78_000], '`retired` enters its $78,000 a year by the month').toContain(planSpend)
    await spend.fill(String(Math.round((planSpend * 9_500) / 6_500)))
    await spend.press('Enter')
    await tray.locator('[data-tray-refresh]').click()
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the what-if’s run never settled').toHaveCount(0, { timeout: 60_000 })
    const apply = tray.getByRole('button', { name: copy.workbenchRailApply, exact: true })
    await expect(apply).not.toHaveAttribute('aria-disabled', 'true', { timeout: 60_000 })
    await armRefiguringWatch(page)
    await apply.click()
    await expectRefiguringSeen(page, 'the live re-figuring arm')
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
    expect(log.slice(0, rose).every((r) => r.refiguring === false), `the flag stood before the edit: ${story}`).toBe(true)
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

// RC8: Tax → Tax Strategies (plan 6, RC8's Verification). PORTED from RC4's interim tab (the "RC4 re-pointed" arms and
// the record-card arms of "RC4 ported · the vault returns", lines at 31bf6d9e): the steer note in frame (a goal pick on a
// household with no pre-tax money lands a calm note, never a silent dead end), the solve's start shown at once
// (Calculating, `aria-busy`), the record card's HOLDS and SUPERSEDED faces. RETIRED with the old surface: the pending
// well's height against the old grade lockup (the old layout; the clone's Calculating frame replaces the page's body,
// as RightCapital's does). ADDED: the working route's one line, the Winner card in the first frame after a real
// full-precision solve, the three-row list, the Summary bars drawn on one scale in the ratio of their printed figures,
// and Keep pressed in a real browser for the first time (owed from RC4), its record read back after a reload as HOLDS.

/** Tax → Tax Strategies, from the home (the laptop's module word, or the phone's menu). */
async function toTax(page: Page): Promise<void> {
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    const menu = page.getByRole('dialog', { name: copy.shellMenuTitle })
    await menu.getByRole('link', { name: copy.shellPageTaxStrategies, exact: true }).click()
    await expect(menu).toHaveCount(0)
  }
  await expect(page.locator('main.result[data-shell-screen="tax-strategies"]')).toBeAttached()
  await settleLayout(page)
}

/** The goal picked on the page's own radio, then Find: the solve dispatches. */
async function findStrategy(page: Page, goal: string = copy.goalLeaveMoreLabel): Promise<void> {
  await page.getByRole('radio', { name: new RegExp(goal) }).check()
  const find = page.getByRole('button', { name: copy.taxStratFind, exact: true })
  await expect(find, 'a picked goal lets Find run').not.toHaveAttribute('aria-disabled', 'true')
  await find.click()
}

/** The committed solve's Winner card, up to the RV gate's own budget (a full-precision solve: ~30 s here, up to ~3 min
 *  on CI's 4-vCPU runner, `e2e/chart-text-rv.spec.ts`'s `COMMITTED_LOCKUP_MS`). A held card is a red here. */
const WINNER_MS = 360_000

async function bottomOf(page: Page, sel: string): Promise<number> {
  return page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().bottom)
}

test.describe(`RC8 · Tax Strategies at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('?seed=retired: four folder tabs; the first frame holds the bold sentence, the goal picker and Find; Find held with no goal says why; one R13 caveat', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterShell(page)
    await toTax(page)
    await expect(page.locator('main.result')).toHaveCount(1)
    await expect(page.getByRole('tab')).toHaveText([copy.taxStratTabStrategies, copy.taxStratTabSummary, copy.taxStratTabComparison, copy.taxStratTabDetails])
    await expect(page.getByRole('radio')).toHaveCount(2)
    const find = page.getByRole('button', { name: copy.taxStratFind, exact: true })
    for (const sel of ['[data-ask-sentence]', '[data-goal="leave-more"]', '[data-find]', '[data-find-cost]']) {
      expect(await bottomOf(page, sel), `${sel} inside the first frame`).toBeLessThanOrEqual(REAL.height)
    }
    // No goal yet (the retired seed picks none): Find is held, pressable, its reason at rest.
    await expect(find).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-find-held="goal"]')).toHaveText(copy.goalPickerConfirmBlocked)
    await find.click({ force: true })
    await expect(page.locator('[data-calculating]'), 'a held Find starts nothing').toHaveCount(0)
    await assertOneVisibleCaveat(page, null, false) // no Winner card yet: the ask
    await noSidewaysScroll(page, 'retired REAL Tax Strategies')
  })

  test('?seed=steer: Find lands the calm steer note (never a silent dead end) inside the first frame, no Calculating, the R13 caveat below it', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 90_000)
    await gotoSeedFinal(page, 'steer')
    await toTax(page)
    await findStrategy(page)
    const note = page.locator('[data-steer="no-pretax"]')
    await expect(note, 'the steer note renders').toHaveText(copy.recommendNoPretaxNote)
    await expect(page.locator('[data-calculating]')).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    const noteBox = (await note.boundingBox())!
    expect(noteBox.y + noteBox.height, 'the steer note sits inside the first frame').toBeLessThanOrEqual(REAL.height)
    const caveat = page.locator('main.result [data-caveat]')
    expect((await caveat.boundingBox())!.y, 'the R13 caveat sits below the note').toBeGreaterThan(noteBox.y + noteBox.height - 1)
    await assertOneVisibleCaveat(page, null, false) // no Winner card: the steer note
  })

  for (const seed of ['surplus', 'nc'] as const) {
    test(`?seed=${seed}: Find shows Calculating at once (busy, its bold sentence and label), in the first frame`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await gotoSeedFinal(page, seed)
      await toTax(page)
      await findStrategy(page)
      const calc = page.locator('[data-calculating]')
      await expect(calc, 'the live dispatch fired').toBeVisible()
      await expect(calc).toHaveAttribute('aria-busy', 'true')
      await expect(calc).toContainText(copy.recommendPendingLabel)
      await expect(calc).toContainText(copy.taxStratCalculating)
      expect(await bottomOf(page, '[data-calculating]'), 'Calculating sits inside the first frame').toBeLessThanOrEqual(REAL.height)
    })
  }

  test('?vault=rec: no clock fires; the record card’s HOLDS face in the first frame, above the empty state’s Find and its cost', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'rec')
    await expect(page.locator('.reentry-notes p'), 'the rec plant ages no stamp: no clock fires').toHaveCount(0)
    await affirmToEchoedHome(page, 'rec', affirm, false)
    await toTax(page)
    const card = page.locator('main.result[data-shell-screen="tax-strategies"] [data-record]')
    await expect(card, 'the remembered record paints on Tax Strategies').toBeVisible()
    await expect(card.locator('[data-record-heading]')).toHaveText(copy.recommendRecordHeading)
    const standing = card.locator('[data-standing]')
    await expect(standing).toHaveAttribute('data-standing', 'holds')
    await expect(standing).toContainText(copy.recommendRecordHolds)
    expect(await bottomOf(page, '[data-record]'), 'the record card inside the first frame').toBeLessThanOrEqual(REAL.height)
    // The one door is the empty state's Find (the card carries no control of its own), its cost beside it.
    await expect(page.getByRole('button', { name: copy.taxStratFind, exact: true })).toBeVisible()
    await expect(page.locator('[data-find-cost]')).toHaveText(copy.recommendRecordReopenCost)
    const cardBox = (await card.boundingBox())!
    expect((await page.locator('[data-ask]').boundingBox())!.y, 'the card sits above the empty state').toBeGreaterThan(cardBox.y + cardBox.height - 1)
  })

  test('?vault=recold: the SUPERSEDED face names every cause it has, in the producer’s order, and its mint year; the rules clause stays dark', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    const affirm = await unlockToGate(page, 'recold')
    await affirmToEchoedHome(page, 'recold', affirm, false)
    await toTax(page)
    const card = page.locator('main.result[data-shell-screen="tax-strategies"] [data-record]')
    await expect(card).toBeVisible()
    const standing = card.locator('[data-standing]')
    await expect(standing).toHaveAttribute('data-standing', 'superseded')
    await expect(standing).toContainText(copy.recommendRecordSuperseded)
    await expect(standing).not.toContainText(copy.recommendRecordHolds)
    await expect(card.locator('[data-record-causes] li')).toHaveText([copy.recommendRecordSupersededInputs, copy.recommendRecordSupersededSolver])
    await expect(card).not.toContainText(copy.recommendRecordSupersededRules)
    const savedIn = card.locator('[data-record-saved-in]')
    await expect(savedIn).toHaveCount(1)
    const savedInText = (await savedIn.textContent()) ?? ''
    const year = Number(/(\d{4})/.exec(savedInText)?.[1])
    expect(Number.isFinite(year), `the age clause names no year: "${savedInText}"`).toBe(true)
    expect(savedInText, 'the shipped slot, never a re-typed sentence').toBe(slots.recommendRecordSavedIn(year))
    expect(year, 'a record minted this calendar year suppresses the clause instead').toBeLessThan(pinnedYear(page))
  })

  test('?seed=dip (working): the one stopgap line in the first frame; no goal picker, heirs’ bracket or Find; no other tab', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await gotoSeedFinal(page, 'dip')
    await toTax(page)
    await expect(page.locator('[data-working-route]')).toHaveText(copy.taxStratWorkingRoute)
    expect(await bottomOf(page, '[data-working-route]'), 'the line inside the first frame').toBeLessThanOrEqual(REAL.height)
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.locator('[data-heir-bracket]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: copy.taxStratFind })).toHaveCount(0)
    await expect(page.getByRole('tab')).toHaveText([copy.taxStratTabStrategies])
    await assertOneVisibleCaveat(page, REAL.height, false) // no Winner card: the working route
  })

  test('?vault=surplus: a full-precision solve; the Winner card in the first frame; three rows and no rank; Summary’s bars on one scale in one frame; Keep writes the record, its badge and Try; after a reload the record holds', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS * 2 + WINNER_MS + 180_000)
    await gotoVaultFinal(page, 'surplus')
    await toTax(page)
    await findStrategy(page)
    await expect(page.locator('[data-calculating]')).toBeVisible()
    const winner = page.locator('[data-winner]')
    await expect(winner, '?vault=surplus: no Winner card after the full-precision solve (a held card is a red: re-pick the plant)').toBeVisible({ timeout: WINNER_MS })
    await expect(winner).toHaveAttribute('data-winner', 'active')
    await settleLayout(page)
    // THE FIRST FRAME holds the Winner card: its badge, its hero and Keep.
    for (const sel of ['#tax-winner-badge', '[data-winner-hero]', '[data-keep]']) {
      expect(await bottomOf(page, sel), `${sel} inside the first frame`).toBeLessThanOrEqual(REAL.height)
    }
    // The whole card (measured 698.4 of 731 on Windows, 2026-11-25): a CI wrap that pushes it out is a real red.
    const cardBottom = await bottomOf(page, '[data-winner]')
    console.log(`[rc8-winner] the Winner card's bottom at ${cardBottom.toFixed(1)} of ${REAL.height}`)
    expect(cardBottom, 'the whole Winner card inside the first frame').toBeLessThanOrEqual(REAL.height)
    await expect(page.locator('[data-winner-hero]')).toContainText(/^~\$[\d,]+ more left to your heirs$/)
    // THE LIST: exactly three rows (winner, runner-up, baseline), no rank column, the rest counted in words.
    const rows = page.locator('[data-ranked-list] tbody tr')
    await expect(rows).toHaveCount(3)
    await expect(page.locator('[data-ranked-list] [data-row-name]')).toHaveText([copy.taxStratRowWinner, copy.taxStratRowRunnerUp, copy.taxStratRowBaseline])
    await expect(page.locator('[data-ranked-list] th[scope="col"]')).toHaveCount(2)
    // The closing line is whichever the composer prints: all unshown below (`taxStratOthers`) or some above your plan today
    // (`taxStratOthersAbove`); both shapes count the rest in words and say their figures aren’t shown.
    await expect(page.locator('[data-ranked-others]')).toHaveText(
      /^(\d+ other strateg(y was|ies were) compared and ranked below these; (its figure isn’t|their figures aren’t) shown\.|Also compared: \d+ other strateg(y|ies) that ranked between the runner-up and your plan today(, and \d+ that ranked below your plan today)?\. (Its figure isn’t|Their figures aren’t) shown\.)$/,
    )
    const values = await page.locator('[data-row-value]').allTextContents()
    // SUMMARY: the bars print the list's own figures, drawn on one scale in their ratio (insight 169), in one frame.
    await page.getByRole('tab', { name: copy.taxStratTabSummary }).click()
    await expect(page.locator('[data-chart="tax-summary"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
    await page.waitForTimeout(600)
    await settleLayout(page)
    const bars = await page.evaluate(() => {
      const pts = [...document.querySelectorAll('[data-chart="tax-summary"] .highcharts-series .highcharts-point')].map((p) => p.getBoundingClientRect().height)
      const figs = [...document.querySelectorAll('[data-chart="tax-summary"] .highcharts-data-label text')].map((t) => (t.textContent ?? '').trim())
      return { pts, figs }
    })
    expect(bars.figs, 'each bar prints the ranked list’s figure for its strategy').toEqual([values[0], values[2]])
    const dollars = bars.figs.map((f) => Number(f.replace(/[^0-9]/g, '')))
    expect(Math.abs(bars.pts[1]! - bars.pts[0]! * (dollars[1]! / dollars[0]!)), `the bars’ heights (${bars.pts.join(', ')}) in the ratio of ${bars.figs.join(' to ')}`).toBeLessThanOrEqual(5)
    const floor = await hcFloorPx(page)
    expect(hcTextFailures(await hcAudit(page, '[data-chart="tax-summary"]', '[data-summary-chart]'), floor, { texts: [copy.taxStratMetricLeaveMore, ...bars.figs], counts: { 'data-label': 2, 'legend-item': 2 } }), 'Summary’s text').toEqual([])
    expect(hcMarkFailures(await hcMarks(page, '[data-chart="tax-summary"]', '[data-summary-chart]')), 'Summary’s marks').toEqual([])
    await assertOneVisibleCaveat(page, REAL.height)
    // KEEP, pressed in a real browser: the vault exists, so the write goes straight to it; the badge, then Try.
    await page.getByRole('tab', { name: copy.taxStratTabStrategies }).click()
    await page.getByRole('button', { name: copy.snapshotRecKeep, exact: true }).click()
    await expect(page.locator('[data-keep-status="saved"]'), 'Keep reached the disk').toHaveText(copy.recommendSaveSavedBadge, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: copy.snapshotRecTry, exact: true }), 'a kept, current record offers Try it in the plan').toBeVisible()
    await expect(page.locator('[data-record] [data-standing]')).toHaveAttribute('data-standing', 'holds')
    // Through the real path: reload (the plant param is gone), unlock, the re-entry gate; the record HOLDS.
    await page.reload()
    await page.getByLabel('Passphrase', { exact: true }).fill(DEV_PASSPHRASE)
    await page.getByRole('button', { name: 'Open my plan' }).click()
    await page.getByRole('button', { name: /still about right/i }).click()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    await toTax(page)
    const card = page.locator('[data-record]')
    await expect(card.locator('[data-standing]'), 'the kept record, read back from the vault, holds').toHaveAttribute('data-standing', 'holds')
    await expect(card).toContainText(copy.recommendRecordHolds)
  })
})

test.describe(`RC8 · Tax Strategies on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const seed of ['retired', 'dip'] as const) {
    test(`?seed=${seed}: the title, the tabs, the page's body, then one R13 caveat, in order and reachable; no sideways scroll`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await gotoSeedFinal(page, seed)
      await toTax(page)
      const order = await page.evaluate(() => {
        const top = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + window.scrollY
        return {
          title: top('main.result h1'),
          tabs: top('[role="tablist"]'),
          body: top('[data-ask], [data-working-route]'),
          caveat: top('main.result [data-caveat]'),
        }
      })
      expect(order.title).toBeLessThan(order.tabs)
      expect(order.tabs).toBeLessThan(order.body)
      expect(order.body).toBeLessThan(order.caveat)
      if (seed === 'retired') {
        const find = page.getByRole('button', { name: copy.taxStratFind, exact: true })
        await find.scrollIntoViewIfNeeded()
        await expect(find, 'Find is reachable').toBeInViewport()
      }
      await page.locator('main.result [data-caveat]').scrollIntoViewIfNeeded()
      await assertOneVisibleCaveat(page, null, false) // no Winner card: the ask or the working route
      await noSidewaysScroll(page, `${seed} PHONE Tax Strategies`)
    })
  }
})

// The home says so too: while a run on an edit is in flight, Snapshot's ring card carries the same re-figuring line as
// Probability (`copy.answerRefiguringVerdict` / `answerRefiguringDate`, through `ringReading.ts`), and past the phone
// tier its box is held, so the ring and the R13 caveat do not move when it shows or clears. Held through the preview.

/** The preview on `seed`, settled on the home; one engine-input edit through Settings' drawer and back to the home, the
 *  flag seen. Returns the ring's and the caveat's tops read before the edit. */
async function enterHeldHome(page: Page, seed: string): Promise<{ ring: number; caveat: number }> {
  await page.goto(`/?preview=refiguring&seed=${seed}`)
  await expect(page.locator(SETTLED_RESULT), `${seed}: the preview never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
  await settleLayout(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('[data-ring-eyebrow] > span:not([aria-hidden])'), 'a settled home shows no re-figuring line').toHaveText('')
  const top = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y
  const before = { ring: await top('[data-ring-reading]'), caveat: await top('main.result [data-caveat]') }
  await editThroughSettings(page, 'dashboard')
  await expect(page.locator('main.result[data-answer-refiguring]'), 'the edit raised no re-figuring flag').toBeAttached({ timeout: 30_000 })
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
        await assertOneVisibleCaveat(page, null, false) // Cash Flows: its table carries no tie today
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
    // The CSV: exactly the cells shown (header rows first, a header's no-break spaces as plain ones; a spanned year on
    // each of its rows), read off the real file.
    const shown = await cfFrame(page).evaluate((frame) => {
      const head = [...frame.querySelectorAll('thead tr')].map((tr) =>
        [...tr.querySelectorAll('th')].flatMap((th) => [(th.textContent ?? '').replace(/\u00a0/g, ' '), ...Array.from({ length: Number(th.getAttribute('colspan') ?? '1') - 1 }, () => '')]),
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

// ── RC9 · Retirement → Social Security (plan 6, RC9's Verification) ──────────────────────────────────────────────────
// On `retired` (the spine) and `date` (the date route, its runs at the plan's own stop year): Comparison's yearly pairs
// and running totals and Summary's bars each hold ONE frame at his window, from the top bar to the ACTION ITEMS handle
// with the tray closed, the R13 caveat inside it; B9's stopgap line sits under the pickers; the crossing's age label and
// the odds printed under each Summary bar pass the text audit and sit over no mark or other label, at REAL and PHONE; the
// drawn picture is pinned against its printed figures (insight 169: the bars' heights in the ratio of their figures; the
// lines' last points in the ratio of their end labels); the handle opens one filing step per person. `healthss` (both
// already claiming): no tabs and no handle, the no-choice-left line and the lifetime total in frame. Reduced motion: this
// harness pins the page clock, so a chart's morph never leaves its first frame here (RC7's note).
const CLAIMS_PAGE = { screen: 'social-security', module: copy.shellModuleRetirement, page: copy.shellPageSocialSecurity } as const
const CLAIMS_SEEDS = ['retired', 'date'] as const

async function enterClaims(page: Page, seed: string, phone = false): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: CLAIMS_PAGE.page, exact: true }).click()
    await expect(page.locator(`main.result[data-shell-screen="${CLAIMS_PAGE.screen}"]`)).toBeAttached()
  } else await showPage(page, CLAIMS_PAGE)
}

/** One of the page's charts drawn (the date route's strategy runs take a while), settled. */
async function claimsChartDrawn(page: Page, id: string): Promise<void> {
  await expect(page.locator(`[data-chart="${id}"] .highcharts-series-group`), `${id} never drew`).toBeAttached({ timeout: 240_000 })
  await page.waitForTimeout(400)
  await settleLayout(page)
}

/** A printed figure in dollars ("~$1,160,000", "~$1.16mm", "~$480k"). */
function claimsDollars(text: string): number {
  const m = /\$([\d.,]+)\s*(mm|k)?/.exec(text)
  if (m === null) throw new Error(`[test setup] no figure in "${text}"`)
  return Number(m[1]!.replace(/,/g, '')) * (m[2] === 'mm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1)
}

/** One frame at his window: the page unscrolled, the handle's bottom and the caveat inside 731 px, nothing sideways. */
async function assertClaimsFrame(page: Page, who: string): Promise<void> {
  const r = await page.evaluate((handle) => {
    const h = [...document.querySelectorAll('main.result button[aria-controls]')].find((b) => b.textContent === handle)
    return { scrollY: window.scrollY, handle: h === undefined ? null : h.getBoundingClientRect().bottom }
  }, copy.trayHandle)
  expect(r.scrollY).toBe(0)
  expect(r.handle, `${who}: the ACTION ITEMS handle`).not.toBeNull()
  console.log(`[rc9-frame] ${who}: the handle's bottom at ${r.handle!.toFixed(1)} of ${REAL.height}`)
  expect(r.handle!, `${who}: the handle inside the first frame`).toBeLessThanOrEqual(REAL.height)
  await assertOneVisibleCaveat(page, REAL.height)
  await noSidewaysScroll(page, who)
}

type ClaimsBox = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }

/** The x-axis words (each Summary bar's name and odds) over no bar and no other word, inside the visible frame. */
async function assertAxisWordsClear(page: Page, chart: string, frame: string, who: string): Promise<string[]> {
  const r = await page.evaluate(
    ({ sel, frameSel }) => {
      const c = document.querySelector(sel)!
      const rect = (e: Element) => {
        const b = e.getBoundingClientRect()
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }
      }
      const f = c.closest(frameSel)!.getBoundingClientRect()
      return {
        frame: { left: Math.max(0, f.left), right: Math.min(document.documentElement.clientWidth, f.right) },
        words: [...c.querySelectorAll('.highcharts-xaxis-labels text')].map((e) => ({ text: (e.textContent ?? '').trim(), box: rect(e) })),
        marks: [...c.querySelectorAll('.highcharts-series .highcharts-point')].map(rect).filter((b) => b.bottom - b.top > 0.5),
      }
    },
    { sel: chart, frameSel: frame },
  )
  const meet = (a: ClaimsBox, b: ClaimsBox) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
  const out: string[] = []
  r.words.forEach((w, i) => {
    if (w.box.left < r.frame.left - 0.5 || w.box.right > r.frame.right + 0.5) out.push(`outside: "${w.text}" leaves the visible frame`)
    for (const m of r.marks) if (meet(w.box, m)) out.push(`overlap: "${w.text}" overlaps a bar`)
    r.words.slice(i + 1).forEach((v) => meet(w.box, v.box) && out.push(`overlap: "${w.text}" and "${v.text}" overlap`))
  })
  expect(out, `${who}: the words under the bars`).toEqual([])
  return r.words.map((w) => w.text)
}

/** No chart text over other chart text: every axis label, axis title, data label and legend item of the chart, pairwise
 *  (RC9's phone look: a squashed plot piled the y-axis ticks on each other, green on the text audit, which reads each
 *  label against its frame, never against its neighbours). */
async function assertChartTextApart(page: Page, chart: string, who: string): Promise<void> {
  const texts = await page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    return [...c.querySelectorAll('.highcharts-axis-labels text, .highcharts-axis-title, .highcharts-data-label text, .highcharts-legend-item text')]
      .map((e) => {
        const b = e.getBoundingClientRect()
        return { text: (e.textContent ?? '').trim(), box: { left: b.left, right: b.right, top: b.top, bottom: b.bottom } }
      })
      .filter((t) => t.text !== '' && t.box.right - t.box.left > 0.5)
  }, chart)
  const meet = (a: ClaimsBox, b: ClaimsBox) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
  const out: string[] = []
  texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => meet(a.box, b.box) && out.push(`"${a.text}" and "${b.text}" overlap`)))
  expect(out, `${who}: the chart's words apart`).toEqual([])
}

/** No line runs through a printed word: each line's drawn path, sampled every 2 px, never enters a data label's box
 *  (RC9's phone look: the lower end figure sat on the dashed line, the crossing's age on the solid one; `hcMarks` reads
 *  bars and markers, never a line's path). */
async function assertLinesClearOfLabels(page: Page, chart: string, who: string): Promise<void> {
  const hits = await page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    const boxes = [...c.querySelectorAll('.highcharts-data-label text')]
      .map((e) => ({ text: (e.textContent ?? '').trim(), b: e.getBoundingClientRect() }))
      .filter((l) => l.text !== '')
    const out: string[] = []
    for (const path of c.querySelectorAll<SVGPathElement>('.highcharts-series path.highcharts-graph')) {
      const m = path.getScreenCTM()!
      const len = path.getTotalLength()
      const name = path.closest('.highcharts-series')?.getAttribute('class')?.match(/b9-claims-line-[ab]/)?.[0] ?? 'line'
      for (const l of boxes) {
        for (let d = 0; d <= len; d += 2) {
          const p = path.getPointAtLength(d)
          const x = p.x * m.a + p.y * m.c + m.e
          const y = p.x * m.b + p.y * m.d + m.f
          if (x > l.b.left + 1 && x < l.b.right - 1 && y > l.b.top + 1 && y < l.b.bottom - 1) {
            out.push(`${name} runs through "${l.text}"`)
            break
          }
        }
      }
    }
    return out
  }, chart)
  expect(hits, `${who}: no line through a printed word`).toEqual([])
}

/** Summary: every bar's figure printed (above it at his window; under it with its name on the phone, where neighbouring
 *  figures above the bars ran into each other) and its odds under it, the text and marks audits clean, and the drawn
 *  heights in the ratio of the printed figures (insight 169). */
async function auditClaimsSummary(page: Page, who: string): Promise<void> {
  const chart = '[data-chart="claims-summary"]'
  await claimsChartDrawn(page, 'claims-summary')
  const floor = await hcFloorPx(page)
  const r = await page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    const centre = (e: Element) => {
      const b = e.getBoundingClientRect()
      return (b.left + b.right) / 2
    }
    const marks = [...c.querySelectorAll('.highcharts-series .highcharts-point')].map((e) => ({ x: centre(e), h: e.getBoundingClientRect().height })).filter((m) => m.h > 0.5)
    const labels = [...c.querySelectorAll('.highcharts-data-label text')].map((e) => ({ x: centre(e), text: (e.textContent ?? '').trim() })).filter((l) => l.text !== '')
    const words = [...c.querySelectorAll('.highcharts-xaxis-labels text')].map((e) => ({ x: centre(e), text: (e.textContent ?? '').trim() }))
    const nearest = <T extends { x: number }>(xs: readonly T[], x: number): T | undefined => xs.reduce<T | undefined>((best, m) => (best === undefined || Math.abs(m.x - x) < Math.abs(best.x - x) ? m : best), undefined)
    return { above: labels.length > 0, bars: marks.map((m) => ({ h: m.h, text: (labels.length > 0 ? nearest(labels, m.x) : nearest(words, m.x))?.text ?? '' })) }
  }, chart)
  const bars = r.bars.map((b) => ({ ...b, figure: /~\$[\d.,]+(mm|k)?/.exec(b.text)?.[0] ?? '' }))
  expect(bars.length, `${who}: the bars`).toBeGreaterThanOrEqual(2)
  for (const b of bars) expect(b.figure, `${who}: a figure for every bar ("${b.text}")`).not.toBe('')
  const perDollar = bars.map((b) => b.h / claimsDollars(b.figure))
  for (const p of perDollar) {
    expect(Math.abs(p / perDollar[0]! - 1), `${who}: the bars’ heights (${bars.map((b) => `${b.figure} ${b.h.toFixed(1)}px`).join(', ')}) in the ratio of their figures`).toBeLessThanOrEqual(0.02)
  }
  expect(
    hcTextFailures(await hcAudit(page, chart, '[data-claims-bars]'), floor, { texts: r.above ? bars.map((b) => b.figure) : [], counts: { ...(r.above ? { 'data-label': bars.length } : {}), 'axis-label': bars.length + 2 } }),
    `${who}: Summary’s text`,
  ).toEqual([])
  expect(hcMarkFailures(await hcMarks(page, chart, '[data-claims-bars]')), `${who}: Summary’s figures over no bar or each other`).toEqual([])
  await assertChartTextApart(page, chart, `${who} Summary`)
  const words = await assertAxisWordsClear(page, chart, '[data-claims-bars]', who)
  expect(words.length, `${who}: a name and odds under every bar`).toBe(bars.length)
  // A count of 0 to 9 or the ring's ceiling words (`slots.xOfTen` / `xOfTenAtCeiling`), never "10 of 10". Highcharts
  // joins a label's lines (a `<br>` or a wrap) with a zero-width space and drops the wrapped space (read in Chromium,
  // 2026-11-25: "Your plan’s ages\u200b9 of 10"), so the gaps admit either.
  expect(words.every((w) => /(^|[\s\u200b])[0-9][\s\u200b]+of[\s\u200b]+10$|better[\s\u200b]+than[\s\u200b]+9[\s\u200b]+in[\s\u200b]+10$/.test(w)), `${who}: the odds under every bar (${words.join(' | ')})`).toBe(true)
}

/** The running totals: the crossing's ring and its age (the hero's own words), each line's end figure, the text and marks
 *  audits clean, and the lines' last points in the ratio of their printed end figures (insight 169). */
async function auditClaimsCumulative(page: Page, who: string): Promise<void> {
  const chart = '[data-chart="claims-cumulative"]'
  await claimsChartDrawn(page, 'claims-cumulative')
  const floor = await hcFloorPx(page)
  const hero = (await page.locator('[data-claims-hero]').innerText()).trim()
  const crossing = page.locator(`${chart} .b9-claims-cross .highcharts-point`)
  if (hero.startsWith('Age ')) {
    await expect(crossing, `${who}: the ring at the crossing`).toHaveCount(1)
    await expect(page.locator(`${chart} .highcharts-data-label text`, { hasText: hero }), `${who}: the crossing’s age, the hero’s own words`).toHaveCount(1)
  } else await expect(crossing, `${who}: no ring without a crossing`).toHaveCount(0)
  const ends = await page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    const plot = c.querySelector('.highcharts-plot-background')!.getBoundingClientRect()
    return ['.b9-claims-line-a', '.b9-claims-line-b'].map((cls) => {
      const path = c.querySelector(`.highcharts-series${cls} path.highcharts-graph`) as SVGPathElement
      const m = path.getScreenCTM()!
      const p = path.getPointAtLength(path.getTotalLength())
      const y = p.x * m.b + p.y * m.d + m.f
      const label = [...c.querySelectorAll(`.highcharts-data-labels${cls} text`)].map((e) => (e.textContent ?? '').trim()).find((t) => t.includes('$')) ?? ''
      return { height: plot.bottom - y, label }
    })
  }, chart)
  for (const e of ends) expect(e.label, `${who}: each line ends in its printed figure`).toMatch(/^~\$/)
  const [a, b] = ends.map((e) => e.height / claimsDollars(e.label))
  expect(Math.abs(a! / b! - 1), `${who}: the lines’ ends (${ends.map((e) => `${e.label} ${e.height.toFixed(1)}px`).join(', ')}) in the ratio of their figures`).toBeLessThanOrEqual(0.02)
  const texts = [...ends.map((e) => e.label), ...(hero.startsWith('Age ') ? [hero] : []), copy.claimsStrategyEarliest, copy.claimsStrategyPlan]
  expect(hcTextFailures(await hcAudit(page, chart, '[data-claims-pair]'), floor, { texts, counts: { 'legend-item': 2, 'axis-title': 1 } }), `${who}: the running totals’ text`).toEqual([])
  expect(hcMarkFailures(await hcMarks(page, chart, '[data-claims-pair]')), `${who}: the crossing’s age and the end figures over no mark or other label`).toEqual([])
  await assertChartTextApart(page, chart, `${who} running totals`)
  await assertLinesClearOfLabels(page, chart, who)
}

test.describe(`RC9 · Social Security at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  for (const seed of CLAIMS_SEEDS) {
    test(`?seed=${seed}: each tab one frame to the handle; the stopgap under the pickers; the crossing and the odds audited; the picture pinned to its figures; one filing step per person`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 600_000)
      await enterClaims(page, seed)
      await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSocialSecurity })).toBeVisible()
      await claimsChartDrawn(page, 'claims-annual')
      // B9's stopgap (map gap 7): one line under the pickers, above the chart; no "optimal" or "best" anywhere.
      const order = await page.evaluate(() => ({
        pickers: document.querySelector('[data-claims-pickers]')!.getBoundingClientRect().bottom,
        stopgap: document.querySelector('[data-claims-stopgap]')!.getBoundingClientRect(),
        chart: document.querySelector('[data-claims-pair]')!.getBoundingClientRect().top,
      }))
      expect(order.stopgap.top, 'the stopgap under the pickers').toBeGreaterThanOrEqual(order.pickers - 0.5)
      expect(order.stopgap.bottom, 'the stopgap above the chart').toBeLessThanOrEqual(order.chart + 0.5)
      await expect(page.locator('[data-claims-stopgap]')).toHaveText(copy.claimsStopgap)
      expect(await page.locator('main.result').innerText(), 'no strategy is called optimal or best').not.toMatch(/optimal|\bbest\b/i)
      await expect(page.locator('[data-claims-hero]')).toContainText(/~\$[\d,]+ (more|less)|About the same/)
      await assertClaimsFrame(page, `${seed} Comparison, each year`)
      expect(
        hcTextFailures(await hcAudit(page, '[data-chart="claims-annual"]', '[data-claims-pair]'), await hcFloorPx(page), { texts: [copy.claimsStrategyEarliest, copy.claimsStrategyPlan], counts: { 'legend-item': 2, 'axis-title': 1 } }),
        `${seed}: the yearly pairs’ text`,
      ).toEqual([])
      await assertChartTextApart(page, '[data-chart="claims-annual"]', `${seed} REAL yearly pairs`)

      await page.getByRole('button', { name: copy.claimsChartAnnual }).click()
      await page.getByRole('menuitemradio', { name: copy.claimsChartCumulative, exact: true }).click()
      await auditClaimsCumulative(page, `${seed} REAL`)
      await assertClaimsFrame(page, `${seed} Comparison, added up`)

      await page.getByRole('tab', { name: copy.claimsTabSummary }).click()
      await auditClaimsSummary(page, `${seed} REAL`)
      await assertClaimsFrame(page, `${seed} Summary`)

      // The handle opens the filing steps: one numbered step per person, from the strategy shown solid.
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
      await expect(page.locator('[data-claims-steps]')).toBeVisible()
      await expect(page.locator('[data-claims-step]')).toHaveCount(2)
      await expect(page.locator('[data-claims-steps] h3')).toHaveText(slots.claimsStepsHeading(copy.claimsStrategyEarliest))
    })
  }

  test('?seed=healthss (both already claiming): no tabs and no handle; the no-choice-left line, each one’s benefit and the lifetime total, in frame', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    await enterClaims(page, 'healthss')
    await expect(page.locator('[data-claims-page="settled"]')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('[data-claims-settled]').first()).toHaveText(copy.claimsNoChoiceLeft)
    await expect(page.locator('[data-claims-settled]').last()).toHaveText(/^Over your lifetimes that comes to ~\$[\d,]+ in all, in the steady market\.$/, { timeout: 60_000 })
    await expect(page.getByRole('tab')).toHaveCount(0)
    await expect(page.getByRole('button', { name: copy.trayHandle })).toHaveCount(0)
    await settleLayout(page)
    expect(await page.evaluate(() => document.querySelector('[data-claims-page="settled"]')!.getBoundingClientRect().bottom), 'the lines inside the first frame').toBeLessThanOrEqual(REAL.height)
    await assertOneVisibleCaveat(page, REAL.height)
    await noSidewaysScroll(page, 'healthss REAL')
  })
})

test.describe(`RC9 · Social Security on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  for (const seed of CLAIMS_SEEDS) {
    test(`?seed=${seed}: no sideways scroll; the crossing’s age and the odds under the bars pass the audits; the caveat reachable`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 600_000)
      await enterClaims(page, seed, true)
      await claimsChartDrawn(page, 'claims-annual')
      await noSidewaysScroll(page, `${seed} PHONE Comparison`)
      await assertChartTextApart(page, '[data-chart="claims-annual"]', `${seed} PHONE yearly pairs`)
      await page.getByRole('button', { name: copy.claimsChartAnnual }).click()
      await page.getByRole('menuitemradio', { name: copy.claimsChartCumulative, exact: true }).click()
      await auditClaimsCumulative(page, `${seed} PHONE`)
      await page.getByRole('tab', { name: copy.claimsTabSummary }).click()
      await auditClaimsSummary(page, `${seed} PHONE`)
      await noSidewaysScroll(page, `${seed} PHONE Summary`)
      await assertOneVisibleCaveat(page, null)
      const caveat = page.locator('main.result [data-caveat]')
      await caveat.scrollIntoViewIfNeeded()
      await expect(caveat).toBeInViewport()
    })
  }
})

// ── RC10 · Retirement → Health Care (plan 6, RC10's Verification) ──────────────────────────────────────────────────────
// On `health` and `healthnc` (retired, pre-65: the readout, the marketplace years then Medicare), `healthgap` (the wide-gap
// household whose marketplace years carry a cliff share) and `date65` (working, all-65+: the steady market's rows): the
// four small charts, the key-metric column and the R13 caveat under them hold the first frame at his window (plan 4.0: the
// caveat in the REAL frame on every figured page; the old sheet's words follow it, reached by scrolling, then the ACTION
// ITEMS handle, the one thing b9-7's amendment lets drop below the caveat); every printed label passes the text and
// marks audits and sits apart from every other; the four draw on ONE scale, pinned on the drawn picture (insight 169:
// each bar's height per dollar, read from its spoken figure, is the same in every chart); each legend says the middle
// cost (the steady market's cost on the working route); the cliff's count words, where printed, are the sheet's and
// name their base in the key line; the tray opens with B9's health inputs.
const HEALTH_PAGE = { screen: 'health-care', module: copy.shellModuleRetirement, page: copy.shellPageHealthCare } as const
const HEALTH_PARTS = ['aca', 'medicare', 'irmaa', 'extras'] as const

async function enterHealth(page: Page, seed: string, phone = false): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: HEALTH_PAGE.page, exact: true }).click()
    await expect(page.locator(`main.result[data-shell-screen="${HEALTH_PAGE.screen}"]`)).toBeAttached()
  } else await showPage(page, HEALTH_PAGE)
  for (const id of HEALTH_PARTS) {
    await expect(page.locator(`[data-chart="health-${id}"] .highcharts-series-group`), `${seed}: the ${id} chart never drew`).toBeAttached({ timeout: 180_000 })
  }
  await page.waitForTimeout(400)
  await settleLayout(page)
}

/** Each chart's words: the text audit, the marks audit, and no word over another. */
async function auditHealthText(page: Page, who: string): Promise<void> {
  const floor = await hcFloorPx(page)
  for (const id of HEALTH_PARTS) {
    const chart = `[data-chart="health-${id}"]`
    const bound = `[data-health-part="${id}"]`
    expect(hcTextFailures(await hcAudit(page, chart, bound), floor, { texts: [], counts: { 'axis-label': 4 } }), `${who}: the ${id} chart’s text`).toEqual([])
    expect(hcMarkFailures(await hcMarks(page, chart, bound)), `${who}: the ${id} chart’s printed words over no bar or other word`).toEqual([])
    await assertChartTextApart(page, chart, `${who} ${id}`)
  }
}

/** The cliff's counts stand apart: two on one row keep clear space between them (RC10's look: two adjacent stretches'
 *  counts sat edge to edge on one row and read "1 of 102 of 10", which the overlap checks pass since the boxes only touch;
 *  neighbouring stretches now print on alternate rows). */
async function assertCliffCountsApart(page: Page, who: string): Promise<void> {
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-chart="health-aca"] .highcharts-data-label text')]
      .map((e) => ({ text: (e.textContent ?? '').trim(), b: e.getBoundingClientRect() }))
      .filter((l) => l.text !== '')
      .map((l) => ({ text: l.text, left: l.b.left, right: l.b.right, top: l.b.top, bottom: l.b.bottom })),
  )
  const GAP = 6
  const out: string[] = []
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b) => {
      // On one row (their boxes share height, or stand under 2 px apart), two counts need clear space between them.
      const near = a.left < b.right + GAP && b.left < a.right + GAP && a.top < b.bottom + 2 && b.top < a.bottom + 2
      if (near) out.push(`"${a.text}" [${a.left.toFixed(1)},${a.right.toFixed(1)}]x[${a.top.toFixed(1)},${a.bottom.toFixed(1)}] and "${b.text}" [${b.left.toFixed(1)},${b.right.toFixed(1)}]x[${b.top.toFixed(1)},${b.bottom.toFixed(1)}] sit closer than ${GAP}px`)
    }),
  )
  expect(out, `${who}: the cliff counts apart`).toEqual([])
}

/** One scale (insight 169): every drawn bar's height per dollar, the dollars read from its spoken figure, agrees across the
 *  four charts; and each chart's top tick prints the same figure. */
async function assertOneHealthScale(page: Page, who: string): Promise<void> {
  const r = await page.evaluate((parts) => {
    const out: { part: string; h: number; label: string }[] = []
    const tops: string[] = []
    for (const id of parts) {
      const c = document.querySelector(`[data-chart="health-${id}"]`)!
      for (const el of c.querySelectorAll('.highcharts-series.b9-health-bar .highcharts-point')) {
        out.push({ part: id, h: el.getBoundingClientRect().height, label: el.getAttribute('aria-label') ?? '' })
      }
      const ys = [...c.querySelectorAll('.highcharts-yaxis-labels text')]
        .map((t) => ({ text: (t.textContent ?? '').trim(), y: t.getBoundingClientRect().top }))
        .filter((t) => t.text !== '')
      tops.push(ys.sort((a, b) => a.y - b.y)[0]?.text ?? '')
    }
    return { bars: out, tops }
  }, HEALTH_PARTS)
  expect(new Set(r.tops).size, `${who}: one top tick on all four charts (${r.tops.join(' | ')})`).toBe(1)
  const bars = r.bars
    .map((b) => ({ ...b, dollars: Number((/~\$([\d,]+)/.exec(b.label)?.[1] ?? '0').replace(/,/g, '')) }))
    .filter((b) => b.dollars >= 2_000 && b.h > 4)
  expect(bars.length, `${who}: bars to read the scale from`).toBeGreaterThan(4)
  // The scale read off the tallest bar; each other bar's drawn height within its two quantizations of that line: the
  // whole pixel Highcharts snaps a column to, and the $100 grain its spoken figure is printed at.
  const tallest = bars.reduce((t, b) => (b.h > t.h ? b : t))
  const perDollar = tallest.h / tallest.dollars
  for (const b of bars) {
    const off = Math.abs(b.h - perDollar * b.dollars)
    expect(off, `${who}: ${b.part} bar "${b.label}" at ${b.h.toFixed(1)}px, ${off.toFixed(1)}px off the one scale`).toBeLessThanOrEqual(1.5 + perDollar * 60)
  }
}

const HEALTH_SEEDS = [
  { seed: 'health', route: 'retired' },
  { seed: 'healthnc', route: 'retired' },
  { seed: 'healthgap', route: 'retired' },
  { seed: 'date65', route: 'working' },
] as const

test.describe(`RC10 · Health Care at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  for (const { seed, route } of HEALTH_SEEDS) {
    test(`?seed=${seed}: the four charts, the column and the caveat in the first frame; one scale; each legend; the text and marks audits; the notes after the caveat; the tray`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 360_000)
      await enterHealth(page, seed)
      await expect(page.getByRole('heading', { level: 1, name: copy.shellPageHealthCare })).toBeVisible()
      await expect(page.locator('[data-health-route]')).toHaveAttribute('data-health-route', route)
      // The frame: the charts, the key-metric column and the R13 caveat under them inside his window, the page unscrolled.
      const frame = await page.evaluate(() => ({
        scrollY: window.scrollY,
        charts: document.querySelector('[data-health-charts]')!.getBoundingClientRect().bottom,
        metrics: document.querySelector('main.result [data-metrics]')!.getBoundingClientRect().bottom,
        caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
      }))
      console.log(`[rc10-frame] ${seed}: the charts' bottom at ${frame.charts.toFixed(1)}, the column's at ${frame.metrics.toFixed(1)}, the caveat's at ${frame.caveat.toFixed(1)} of ${REAL.height}`)
      expect(frame.scrollY).toBe(0)
      expect(frame.charts, `${seed}: the four charts inside the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.metrics, `${seed}: the key-metric column inside the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.caveat, `${seed}: the R13 caveat inside the first frame`).toBeLessThanOrEqual(REAL.height)
      await expect(page.locator('[data-health-hero]')).toHaveText(/^~\$[\d,]+$/)
      // Each legend: the middle cost (retired), the steady market's cost (working).
      const legend = route === 'retired' ? copy.healthLegendMiddle : copy.healthLegendSteady
      await expect(page.locator('[data-health-legend]')).toHaveText([legend, legend, legend, legend])
      await auditHealthText(page, `${seed} REAL`)
      await assertOneHealthScale(page, `${seed} REAL`)
      // The cliff: the sheet's count words over a bracket, the key line naming the base; none on the working route.
      const cliff = (await page.locator('[data-chart="health-aca"] .highcharts-data-label text').allTextContents()).map((t) => t.trim()).filter((t) => t !== '')
      for (const c of cliff) expect(c, `${seed}: a cliff count in the sheet’s words`).toMatch(/^\d of 10$|^more than 9 in 10$/)
      await assertCliffCountsApart(page, `${seed} REAL`)
      // The count's key sits in the marketplace chart's own box whenever a count prints, inside the first frame (b9-10:
      // it lived only in the notes below the frame).
      const key = page.locator('[data-health-part="aca"] [data-health-cliff-key]')
      await expect(key, `${seed}: the count's key prints exactly when a count does`).toHaveCount(cliff.length > 0 ? 1 : 0)
      if (cliff.length > 0) {
        await expect(key).toHaveText(copy.healthCliffCaption)
        const keyBottom = await key.evaluate((el) => el.getBoundingClientRect().bottom)
        expect(keyBottom, `${seed}: the count's key inside the first frame`).toBeLessThanOrEqual(REAL.height)
      }
      if (seed === 'healthgap') {
        expect(cliff.length, 'healthgap: its marketplace years carry a cliff share').toBeGreaterThan(0)
        await expect(page.locator('[data-health-note]', { hasText: copy.healthCliffKey })).toHaveCount(1)
      }
      if (route === 'working') expect(cliff, 'the working route prints no share').toEqual([])
      // The stopgaps: the surcharge's (retired), the steady market's (working).
      const stopgap = route === 'retired' ? copy.healthIrmaaStopgap : copy.healthWorkingStopgap
      await expect(page.locator('[data-health-note], [data-health-footnote]').filter({ hasText: stopgap })).toHaveCount(1)
      // The charts, the caveat, then the notes and the footnotes (the Medicare affirmation among them).
      const order = await page.evaluate(() => {
        const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top
        return { charts: top('[data-health-charts]'), notes: top('[data-health-notes]'), footnotes: top('[data-health-footnotes]'), caveat: top('main.result [data-caveat]') }
      })
      expect(order.charts).toBeLessThan(order.caveat)
      expect(order.caveat).toBeLessThan(order.notes)
      expect(order.notes).toBeLessThanOrEqual(order.footnotes)
      await expect(page.locator('[data-health-footnote]').filter({ hasText: copy.verdictMedicarePriced })).toHaveCount(1)
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} REAL`)
      // The tray: B9's health inputs, the subsidy rules a what-if where a marketplace year is priced.
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
      await expect(page.locator('[data-health-tray]')).toBeVisible()
      await expect(page.locator('[data-health-tray-aca]')).toHaveCount(route === 'retired' ? 1 : 0)
    })
  }
})

// The arms above run under reduced motion, where Highcharts shows a deferred label at once. With motion on the cliff's
// counts waited on a fade after the morph: in a live browser they read missing for about half a second, and under the
// harnesses' pinned clock (the RC7 landmine) the fade never ran, so a motion-on capture showed a bracket with no count
// (b9-10, 2026-11-25; measured on a real clock: opacity 0 at once, 1 by 1.5 s). Printed values are never deferred
// (`fanOptions.ts`' rule); this arm reads the counts painted at once with motion on.
test.describe(`RC10 · Health Care's cliff counts paint with motion on (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'no-preference' })
  test('?seed=healthgap: every cliff count is painted, its opacity up the tree at least 0.9', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    await enterHealth(page, 'healthgap')
    const labels = page.locator('[data-chart="health-aca"] .highcharts-data-label')
    await expect(labels.first(), 'healthgap: its marketplace years carry a cliff share').toBeAttached({ timeout: 60_000 })
    const painted = () =>
      labels.evaluateAll((els) =>
        els.map((el) => {
          let op = 1
          for (let n: Element | null = el; n !== null && n.tagName.toLowerCase() !== 'svg'; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity)
          return Math.round(op * 100) / 100
        }),
      )
    // A fade, if any, has a second to finish: the morph is 250 ms.
    await expect.poll(async () => (await painted()).every((op) => op >= 0.9), { timeout: 3_000, message: 'healthgap: a cliff count never painted' }).toBe(true)
  })
})

test.describe(`RC10 · Health Care on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  for (const seed of ['health', 'date65'] as const) {
    test(`?seed=${seed}: no sideways scroll; every chart's words pass the audits; one scale; charts, column, caveat, notes in order; the caveat reachable`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 360_000)
      await enterHealth(page, seed, true)
      await noSidewaysScroll(page, `${seed} PHONE`)
      await settleLayout(page)
      await auditHealthText(page, `${seed} PHONE`)
      await assertOneHealthScale(page, `${seed} PHONE`)
      await assertOneVisibleCaveat(page, null)
      // The phone's order: the charts, the key-metric column, the caveat, then the notes (the handle closes the panel).
      const order = await page.evaluate(() => {
        const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top
        return { charts: top('[data-health-charts]'), metrics: top('main.result [data-metrics]'), caveat: top('main.result [data-caveat]'), notes: top('[data-health-notes]') }
      })
      expect(order.charts).toBeLessThan(order.metrics)
      expect(order.metrics).toBeLessThan(order.caveat)
      expect(order.caveat).toBeLessThan(order.notes)
      const caveat = page.locator('main.result [data-caveat]')
      await caveat.scrollIntoViewIfNeeded()
      await expect(caveat).toBeInViewport()
    })
  }
})

// ── RC11 · Retirement → Stress Test (plan 6, RC11; its Verification and Test scenarios) ───────────────────────────────
// - at his window on `retired`, `health` and `dip`: the chart, its words, the stopgap and the R13 caveat in one frame;
//   every printed count and name passes the text and marks audits; the DRAWN bars stand to their printed counts on the
//   one fixed 0-to-10 scale (insight 169: options are not the picture); the caveat is reached and seen (insight 124);
//   the working seed names the stop year every bar reads; Baseline's count is the one Probability prints for your plan;
// - with motion on, every count is painted at once (a deferred label waits on the morph, insight 169);
// - Refresh: a slider moves nothing until it is pressed, then the chart fades under "Loading…" with its counts kept and
//   lands at the new size; the wall time of one Refresh with every stress on is logged (`[rc11-timing]`);
// - on the phone: no sideways scroll, the audits, the caveat reached, and the tray's sheet takes a tap at every
//   control's centre.

const STRESS_PAGE = { screen: 'stress-test', module: copy.shellModuleRetirement, page: copy.shellPageStressTest } as const
const STRESS_CHART = '[data-chart="stress"]'
const STRESS_TRAY = '#b9-stress-items'
const STRESS_COUNT = /^\d of 10$|^better than ?9 in 10$/
const STRESS_RUN_MS = 360_000

/** The bars landed: every run in, the chart drawn and not under its veil. */
async function stressLanded(page: Page, who: string): Promise<void> {
  await expect(page.locator(`${STRESS_CHART} .highcharts-series-group`), `${who}: the stress chart never drew`).toBeAttached({ timeout: 60_000 })
  await expect(page.locator('[data-stress] [aria-busy="true"]'), `${who}: a stress run never landed`).toHaveCount(0, { timeout: STRESS_RUN_MS })
  await page.waitForTimeout(300)
  await settleLayout(page)
}

async function enterStress(page: Page, seed: string, phone = false): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: STRESS_PAGE.page, exact: true }).click()
    await expect(page.locator(`main.result[data-shell-screen="${STRESS_PAGE.screen}"]`)).toBeAttached()
  } else await showPage(page, STRESS_PAGE)
  await stressLanded(page, seed)
}

/** Each bar's drawn height and its printed count, matched by position (each count sits over its own bar). */
async function stressBars(page: Page): Promise<{ readonly id: string; readonly h: number; readonly count: string }[]> {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    const labels = [...c.querySelectorAll('.highcharts-data-label text')].map((t) => {
      const b = t.getBoundingClientRect()
      return { text: [...t.querySelectorAll('tspan')].length > 0 ? [...t.childNodes].map((n) => (n.textContent ?? '').trim()).filter((s) => s !== '').join(' ') : (t.textContent ?? '').trim(), x: b.left + b.width / 2 }
    })
    return [...c.querySelectorAll('.highcharts-point.b9-stress-bar')].map((el) => {
      const b = el.getBoundingClientRect()
      const x = b.left + b.width / 2
      const id = /b9-stress-bar--([a-z-]+)/.exec(el.getAttribute('class') ?? '')?.[1] ?? '?'
      const near = labels.filter((l) => Math.abs(l.x - x) < b.width / 2 + 1)
      return { id, h: b.height, count: near.map((l) => l.text).join(' | ') }
    })
  }, STRESS_CHART)
}

/** The drawn bars stand to their printed counts on the one fixed scale: a bar's height is its count over 10 of the plot's
 *  height (the ceiling's "better than 9 in 10" stands to 9), within the pixel Highcharts snaps a column to. */
async function assertStressHeights(page: Page, who: string): Promise<void> {
  const plot = await page.locator(`${STRESS_CHART} .highcharts-plot-background`).evaluate((el) => el.getBoundingClientRect().height)
  const bars = await stressBars(page)
  expect(bars.length, `${who}: bars to measure`).toBeGreaterThanOrEqual(2)
  for (const b of bars) {
    const t = b.count.replace(/\s+/g, ' ')
    expect(t, `${who}: the ${b.id} bar prints one count`).toMatch(STRESS_COUNT)
    const n = /better than/.test(t) ? 9 : Number(t.split(' ')[0])
    const want = (plot * n) / 10
    expect(Math.abs(b.h - want), `${who}: the ${b.id} bar is ${b.h.toFixed(1)}px for "${t}" (${want.toFixed(1)}px on the 0-to-10 scale)`).toBeLessThanOrEqual(1.5)
  }
}

/** Every bar's words: the text audit (each name printed), the marks audit, and no word over another. */
async function auditStressText(page: Page, who: string, names: readonly string[]): Promise<void> {
  const floor = await hcFloorPx(page)
  const bars = (await stressBars(page)).length
  expect(hcTextFailures(await hcAudit(page, STRESS_CHART, '[data-stress]'), floor, { texts: [], counts: { 'data-label': bars, 'axis-label': 6 + bars } }), `${who}: the chart’s text`).toEqual([])
  // Each bar's whole label, its name and its size, printed in full: Highcharts wraps a label with zero-width spaces and
  // cuts one that will not fit with "…" (RC11's phone look: "Combined every…", green on the text audit).
  const flat = (t: string) => t.replace(/[\s\u200b]+/g, '')
  const labels = (await page.locator(`${STRESS_CHART} .highcharts-xaxis-labels text`).allTextContents()).map(flat)
  for (const n of names) expect(labels.some((l) => l.startsWith(flat(n))), `${who}: the bar named ${n} (${labels.join(' | ')})`).toBe(true)
  const cut = (await page.locator(`${STRESS_CHART} svg text`).allTextContents()).filter((t) => t.includes('…'))
  expect(cut, `${who}: no chart word cut short`).toEqual([])
  expect(hcMarkFailures(await hcMarks(page, STRESS_CHART, '[data-stress]')), `${who}: the counts over no bar or other count`).toEqual([])
  await assertChartTextApart(page, STRESS_CHART, who)
  const all = (await page.locator('[data-stress]').innerText()).replace(/\s+/g, ' ')
  expect(/\b10 of 10\b|\d+(\.\d+)?% (odds|chance|of success)/.test(all), `${who}: no "10 of 10" and no odds as a percent`).toBe(false)
}

const STRESS_SEEDS = [
  { seed: 'retired', names: [copy.stressBaseline, copy.stressSocialSecurity], working: false },
  { seed: 'health', names: [`${copy.stressBaseline}${copy.stressBaselineSub}`, `${copy.stressSocialSecurity}${slots.stressPctLess(20)}`, `${copy.stressOutOfPocket}${slots.stressPctHigher(50)}`, `${copy.stressCombined}${copy.stressCombinedSub}`], working: false },
  { seed: 'dip', names: [copy.stressBaseline, copy.stressSocialSecurity], working: true },
] as const

test.describe(`RC11 · Stress Test at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  for (const { seed, names, working } of STRESS_SEEDS) {
    test(`?seed=${seed}: the chart, its words, the stopgap and the caveat in one frame; the audits; the bars stand to their counts; the caveat reached`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + STRESS_RUN_MS + 60_000)
      await enterStress(page, seed)
      await expect(page.getByRole('heading', { level: 1, name: copy.shellPageStressTest })).toBeVisible()
      await expect(page.locator('[data-stress] > div > h2')).toHaveText(copy.stressTitle)
      const frame = await page.evaluate(() => ({
        scrollY: window.scrollY,
        chart: document.querySelector('[data-stress-chart]')!.getBoundingClientRect().bottom,
        notes: document.querySelector('[data-stress-notes]')!.getBoundingClientRect().bottom,
        caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
        handle: document.querySelector('main.result [aria-controls="b9-stress-items"]')!.getBoundingClientRect().bottom,
      }))
      console.log(`[rc11-frame] ${seed}: chart ${frame.chart.toFixed(1)}, notes ${frame.notes.toFixed(1)}, caveat ${frame.caveat.toFixed(1)}, handle ${frame.handle.toFixed(1)} of ${REAL.height}`)
      expect(frame.scrollY).toBe(0)
      // One frame from the top bar down to the ACTION ITEMS handle, the tray shut (plan 4.0, a single-chart page).
      expect(frame.caveat, `${seed}: the chart, its notes and the caveat inside the first frame`).toBeLessThanOrEqual(REAL.height)
      expect(frame.handle, `${seed}: the ACTION ITEMS handle inside the first frame`).toBeLessThanOrEqual(REAL.height)
      await expect(page.locator('[data-stress-note]').first()).toHaveText(copy.stressStopgap)
      if (seed === 'health') {
        // Every stress reads Baseline's count there: the note says so, first after the stopgap, inside the one frame.
        const note = page.locator('[data-stress-note]').nth(1)
        await expect(note).toHaveText(copy.stressNoneMoves)
        expect(await note.evaluate((el) => el.getBoundingClientRect().bottom), 'health: the none-moves note inside the first frame').toBeLessThanOrEqual(REAL.height)
      }
      await auditStressText(page, `${seed} REAL`, names)
      await assertStressHeights(page, `${seed} REAL`)
      if (working) await expect(page.locator('[data-stress-reads-at]').first()).toHaveText(/if you stop in \d{4}/)
      else await expect(page.locator('[data-stress-reads-at]')).toHaveCount(0)
      await assertOneVisibleCaveat(page, REAL.height)
      await assertCaveatReachable(page, `${seed} REAL`)
      await noSidewaysScroll(page, `${seed} REAL`)
      // Baseline is the plan's own reading: the count Probability prints for your plan.
      const baseline = (await stressBars(page)).find((b) => b.id === 'baseline')!
      await showPage(page, ANALYSIS)
      await expect(page.locator('[data-half="compared"] [data-ring-centre]')).toHaveText(baseline.count)
    })
  }
})

test.describe(`RC11 · Stress Test's counts paint with motion on (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'no-preference' })
  test('?seed=health: every count is painted at once, its opacity up the tree at least 0.9', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + STRESS_RUN_MS)
    await enterStress(page, 'health')
    const painted = () =>
      page.locator(`${STRESS_CHART} .highcharts-data-label`).evaluateAll((els) =>
        els.map((el) => {
          let op = 1
          for (let n: Element | null = el; n !== null && n.tagName.toLowerCase() !== 'svg'; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity)
          return Math.round(op * 100) / 100
        }),
      )
    expect(await painted(), 'health: a count per bar').toHaveLength(4)
    expect((await painted()).every((op) => op >= 0.9), 'health: a count never painted').toBe(true)
  })
})

test.describe(`RC11 · Stress Test's tray: nothing runs until Refresh (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  for (const seed of ['health', 'datesplit'] as const) {
    test(`?seed=${seed}: a slider moves no bar; Refresh fades the chart under "Loading…" with its counts kept, then lands at the new size; the wall time is logged`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 2 * STRESS_RUN_MS)
      await enterStress(page, seed)
      const before = await stressBars(page)
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
      const tray = page.locator(STRESS_TRAY)
      await expect(tray).toBeVisible()
      await expect(tray.locator('[data-tray-row]')).toHaveCount(2)
      const slider = tray.locator('[data-tray-row="social-security"] input[type="range"]')
      await slider.focus()
      await page.keyboard.press('ArrowRight')
      await expect(tray.locator('[data-tray-row="social-security"] [data-stress-size]')).toHaveText(slots.stressPctLess(25))
      await expect(page.locator('[data-tray-words]')).toHaveText(copy.trayPending)
      expect(await stressBars(page), `${seed}: a slider moved a bar`).toEqual(before)
      const t0 = Date.now()
      await page.locator('[data-tray-refresh]').click()
      await expect(page.locator('[data-stress] [aria-busy="true"]'), `${seed}: Refresh never faded the chart`).toHaveCount(1)
      await expect(page.locator('[data-stress] [role="status"]')).toHaveText(copy.probabilityLoading)
      // The counts kept under the veil, never blanked.
      expect((await stressBars(page)).map((b) => b.count)).toEqual(before.map((b) => b.count))
      await expect(page.locator('[data-stress] [aria-busy="true"]')).toHaveCount(0, { timeout: STRESS_RUN_MS })
      console.log(`[rc11-timing] ${seed}: one Refresh with every stress on (${before.length - 1} runs) landed in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
      const words = (await page.locator(`${STRESS_CHART} .highcharts-xaxis-labels text`).allTextContents()).join(' | ')
      expect(words, `${seed}: the bar names its new size`).toContain(slots.stressPctLess(25))
      await expect(page.locator('[data-tray-words]')).toHaveText('')
      await settleLayout(page)
      await assertStressHeights(page, `${seed} refreshed`)
    })
  }
})

test.describe(`RC11 · Stress Test on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  for (const { seed, names } of STRESS_SEEDS) {
    test(`?seed=${seed}: no sideways scroll; every count and name passes the audits; the bars stand to their counts; the caveat reached; every tray control takes a tap`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + STRESS_RUN_MS + 60_000)
      await enterStress(page, seed, true)
      await noSidewaysScroll(page, `${seed} PHONE`)
      await auditStressText(page, `${seed} PHONE`, names)
      await assertStressHeights(page, `${seed} PHONE`)
      await assertOneVisibleCaveat(page, null)
      await assertCaveatReachable(page, `${seed} PHONE`)
      const gap = await page.evaluate(() => {
        const caveat = document.querySelector('main.result [data-caveat]')!.getBoundingClientRect()
        const handle = document.querySelector('main.result [aria-controls="b9-stress-items"]')!.getBoundingClientRect()
        return handle.top - caveat.bottom
      })
      expect(gap, `${seed} PHONE: the caveat clears the handle by at least 4 px`).toBeGreaterThanOrEqual(4)
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
      const sheet = page.getByRole('dialog', { name: copy.trayHandle })
      await expect(sheet).toBeVisible()
      await page.waitForTimeout(400)
      // Every slider's track starts and ends at the same x (the size cell is one fixed width, whatever it reads).
      const tracks = await sheet.locator('[data-tray-row] [data-thumb]').evaluateAll((els) =>
        els.map((t) => {
          const r = t.parentElement!.getBoundingClientRect()
          return { left: r.left, right: r.right }
        }),
      )
      expect(tracks.length, '[test setup] a slider in the sheet').toBeGreaterThanOrEqual(1)
      for (const t of tracks) {
        expect(Math.abs(t.left - tracks[0]!.left), `${seed} PHONE: the tracks start at one x`).toBeLessThanOrEqual(1)
        expect(Math.abs(t.right - tracks[0]!.right), `${seed} PHONE: the tracks end at one x`).toBeLessThanOrEqual(1)
      }
      // The Social Security row's slider at least (Reset, Edit and Refresh sit in the footer, outside the rows).
      await assertSheetTapsReach(sheet, `${seed} PHONE stress tray`, 1)
    })
  }
})

// ── RC12 · Investment → Asset Allocation and Tax Allocation (plan 6, RC12; its Verification and Test scenarios) ─────────
// - at his window on `buckets` and `retired`: one frame per tab (Summary, Detail; Tax Allocation with a part's accounts
//   listed), the R13 caveat in it and reached (insight 124), no sideways scroll;
// - the DRAWN rings stand to their printed shares (insight 169): each slice's arc against its printed percent (Asset
//   Allocation) or its figure's share of the total (Tax Allocation); the centre's two figures are the parts' own, and its
//   words sit inside the hole; the slices sit inside their frame (the marks audit);
// - with a what-if mix set on Analysis (`retired`, 40 / 45 / 15: the stocks' bar runs left to the scale's end): the what-if ring stands to its shares, and Detail's bars
//   stand to their printed shifts on the one symmetric scale, each bar level with its table row at his window, the
//   chart's words passing the text and marks audits;
// - picking a part on the ring (the pointer's way) lists its accounts; switching the picker rebuilds the ring;
// - on the phone: no sideways scroll, the audits, the caveat reached, and every page control takes a tap at its centre.

const ASSET_PAGE = { screen: 'asset-allocation', module: copy.shellModuleInvestment, page: copy.shellPageAssetAllocation } as const
const TAXALLOC_PAGE = { screen: 'tax-allocation', module: copy.shellModuleInvestment, page: copy.shellPageTaxAllocation } as const
/** `DONUT_INNER` in `donutOptions.ts`: the hole's share of the ring's diameter. */
const DONUT_HOLE = 0.64
/** A printed percent ("62%", "+20%", "−15%") as a signed whole number. */
const PCT = (t: string) => Number(t.replace(/[^0-9]/g, '')) * (/[−-]/.test(t) ? -1 : 1)

async function enterInvestment(page: Page, seed: string, target: typeof ASSET_PAGE | typeof TAXALLOC_PAGE, phone = false): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  await moveToInvestment(page, target, phone)
}

async function moveToInvestment(page: Page, target: typeof ASSET_PAGE | typeof TAXALLOC_PAGE, phone: boolean): Promise<void> {
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: target.page, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
    await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
  } else await showPage(page, target)
  await donutsDrawn(page)
}

/** Every ring on the page drawn (the charts' lazy chunk), and the layout settled. */
async function donutsDrawn(page: Page): Promise<void> {
  await expect(page.locator('[data-donut] .highcharts-series-group').first(), 'no ring drew').toBeAttached({ timeout: 60_000 })
  const n = await page.locator('[data-donut]').count()
  for (let i = 0; i < n; i++) await expect(page.locator('[data-donut]').nth(i).locator('.highcharts-series-group')).toBeAttached({ timeout: 30_000 })
  await page.waitForTimeout(400)
  await settleLayout(page)
}

/** A what-if mix on Analysis's tray (the household's own what-if), Refreshed, the tray shut again. */
async function setWhatIfMix(page: Page, mix: readonly [number, number, number], phone: boolean): Promise<void> {
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: ANALYSIS.page, exact: true }).click()
    await expect(page.locator(`main.result[data-shell-screen="${ANALYSIS.screen}"]`)).toBeAttached()
  } else await showPage(page, ANALYSIS)
  await trayHandle(page).click()
  await expect(tray(page), 'the tray never opened').toBeVisible()
  await page.waitForTimeout(400)
  for (const [k, v] of [['stock', mix[0]], ['bond', mix[1]], ['cash', mix[2]]] as const) {
    const input = tray(page).locator(`[data-tray-row="mix:${k}"] input`)
    await input.scrollIntoViewIfNeeded()
    await input.fill(String(v))
    await input.press('Tab')
  }
  await tray(page).locator('[data-tray-refresh]').click()
  await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the what-if never landed').toHaveCount(0, { timeout: 120_000 })
  if (phone) await page.keyboard.press('Escape')
  else await trayHandle(page).click()
  await expect(tray(page)).toHaveCount(0)
}

/** Each drawn slice's arc as a share of the full turn, read from its path (the outer arc's chord, radius and large-arc
 *  flag), never from the options. */
async function sliceShares(page: Page, chartId: string): Promise<{ readonly id: string; readonly share: number }[]> {
  return page.locator(`[data-chart="${chartId}"] path.highcharts-point.b9-donut-part`).evaluateAll((els) =>
    els.map((el) => {
      const id = /b9-donut-part--([a-z]+)/.exec(el.getAttribute('class') ?? '')?.[1] ?? '?'
      const nums = (el.getAttribute('d') ?? '').replace(/[A-Za-z]/g, ' $& ').trim().split(/[\s,]+/)
      // M x0 y0 A r r rotation large sweep x1 y1 …
      const m = nums.indexOf('M')
      const a = nums.indexOf('A')
      const x0 = Number(nums[m + 1])
      const y0 = Number(nums[m + 2])
      const r = Number(nums[a + 1])
      const large = Number(nums[a + 4])
      const x1 = Number(nums[a + 6])
      const y1 = Number(nums[a + 7])
      let angle = 2 * Math.asin(Math.min(1, Math.hypot(x1 - x0, y1 - y0) / (2 * r)))
      if (large === 1) angle = 2 * Math.PI - angle
      return { id, share: angle / (2 * Math.PI) }
    }),
  )
}

/** The ring stands to its printed shares: each slice's arc within 0.6 points of its printed percent (whole percents by
 *  the one rounding rule, plus a pixel's worth), a 0% part drawing nothing. */
async function assertRingShares(page: Page, chartId: string, printed: Readonly<Record<string, number>>, who: string): Promise<void> {
  const drawn = await sliceShares(page, chartId)
  expect(drawn.length, `${who}: slices to measure`).toBeGreaterThanOrEqual(2)
  expect(drawn.map((d) => d.id).sort(), `${who}: a slice per part above 0%`).toEqual(Object.keys(printed).filter((k) => printed[k]! > 0).sort())
  for (const d of drawn) {
    const want = printed[d.id]!
    expect(Math.abs(d.share * 100 - want), `${who}: the ${d.id} slice draws ${(d.share * 100).toFixed(2)}% for a printed ${want}%`).toBeLessThanOrEqual(0.6)
  }
}

/** The legend table's printed percents for one side ('current' or 'whatif'), by part. */
async function printedMix(page: Page, side: 'current' | 'whatif'): Promise<Record<string, number>> {
  const rows = await page.locator('[data-asset-row]').evaluateAll(
    (els, s) => els.map((r) => [r.getAttribute('data-asset-row')!, (r.querySelector(`[data-asset-${s}]`)?.textContent ?? '').trim()] as const),
    side,
  )
  return Object.fromEntries(rows.map(([k, t]) => [k, PCT(t)]))
}

/** The hole's words: inside the hole (every corner of each line's text within its circle), at least the floor size,
 *  unfaded. */
async function assertCentreInHole(page: Page, chartId: string, who: string): Promise<void> {
  const floor = await hcFloorPx(page)
  const misses = await page.locator(`[data-donut="${chartId}"]`).evaluate(
    (host, { hole, floor }) => {
      const ring = host.querySelector('.highcharts-series-group')!.getBoundingClientRect()
      const cx = ring.left + ring.width / 2
      const cy = ring.top + ring.height / 2
      const r = (Math.min(ring.width, ring.height) * hole) / 2
      const out: string[] = []
      const lines = [...host.querySelectorAll('[data-donut-centre] p')]
      if (lines.length === 0) out.push('no centre words')
      for (const p of lines) {
        const range = document.createRange()
        range.selectNodeContents(p)
        const t = range.getBoundingClientRect()
        const cs = getComputedStyle(p)
        if (parseFloat(cs.fontSize) < floor - 0.01) out.push(`"${p.textContent}" at ${cs.fontSize}`)
        if (t.width === 0 || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.9) out.push(`"${p.textContent}" hidden`)
        for (const [x, y] of [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]] as const) {
          const d = Math.hypot(x - cx, y - cy)
          if (d > r + 0.5) out.push(`"${p.textContent}" leaves the hole at (${x.toFixed(1)}, ${y.toFixed(1)}): ${d.toFixed(1)} px from the centre, the hole ${r.toFixed(1)}`)
        }
      }
      return out
    },
    { hole: DONUT_HOLE, floor },
  )
  expect(misses, `${who}: the centre's words inside the ring's hole`).toEqual([])
}

/** The licence's credit printed whole: inside its chart's box (RC12's first look cut its letters at the ring's bottom
 *  edge) and over no axis word (it sat on Detail's "+20%" tick). */
async function assertCreditClear(page: Page, chartId: string, who: string): Promise<void> {
  const bad = await page.locator(`[data-chart="${chartId}"]`).evaluate((c) => {
    const box = c.querySelector('.highcharts-container')!.getBoundingClientRect()
    const credit = c.querySelector('.highcharts-credits')
    if (credit === null) return ['no credit']
    const b = credit.getBoundingClientRect()
    const out: string[] = []
    if (b.left < box.left - 0.5 || b.right > box.right + 0.5 || b.top < box.top - 0.5 || b.bottom > box.bottom + 0.5) out.push(`the credit [${b.top.toFixed(1)}, ${b.bottom.toFixed(1)}] leaves its chart [${box.top.toFixed(1)}, ${box.bottom.toFixed(1)}]`)
    for (const t of c.querySelectorAll('.highcharts-axis-labels text, .highcharts-data-label text')) {
      const r = t.getBoundingClientRect()
      if (r.left < b.right - 0.5 && b.left < r.right - 0.5 && r.top < b.bottom - 0.5 && b.top < r.bottom - 0.5) out.push(`the credit over "${(t.textContent ?? '').trim()}"`)
    }
    return out
  })
  expect(bad, `${who}: ${chartId}'s credit`).toEqual([])
}

/** Every ring's slices inside their frame (the marks audit; the rings print no SVG words, so the text audit reads none),
 *  its credit whole, and every hole's words inside it. */
async function auditRings(page: Page, who: string): Promise<void> {
  const floor = await hcFloorPx(page)
  for (const id of await page.locator('[data-donut]').evaluateAll((els) => els.map((e) => e.getAttribute('data-donut')!))) {
    expect(hcMarkFailures(await hcMarks(page, `[data-chart="${id}"]`, 'main.result .rc-root')), `${who}: ${id}'s slices`).toEqual([])
    expect(hcTextFailures(await hcAudit(page, `[data-chart="${id}"]`, 'main.result .rc-root'), floor, { texts: [], counts: {} }), `${who}: ${id}'s words`).toEqual([])
    await assertCentreInHole(page, id, `${who} ${id}`)
    await assertCreditClear(page, id, who)
  }
}

/** Every control a selector names takes a tap at its centre (the document scrolled to it, never `scrollIntoView`). */
async function assertPageTapsReach(page: Page, selector: string, who: string, atLeast: number): Promise<void> {
  const n = await page.locator(selector).count()
  expect(n, `[test setup] ${who}: controls to probe`).toBeGreaterThanOrEqual(atLeast)
  const covered: string[] = []
  for (let i = 0; i < n; i++) {
    const hit = await page.locator(selector).nth(i).evaluate(async (el) => {
      const r0 = el.getBoundingClientRect()
      window.scrollTo(0, Math.max(0, r0.top + window.scrollY - window.innerHeight / 2))
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return top !== null && (top === el || el.contains(top)) ? null : `"${(el.textContent ?? '').trim().slice(0, 30)}" under ${top?.tagName.toLowerCase()} "${(top?.textContent ?? '').trim().slice(0, 30)}"`
    })
    if (hit !== null) covered.push(hit)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  expect(covered, `${who}: a control a tap at its centre never reaches`).toEqual([])
}

/** One frame: no scroll, the caveat's bottom inside the window. */
async function assertOneFrame(page: Page, who: string): Promise<void> {
  const f = await page.evaluate(() => ({ scrollY: window.scrollY, caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom }))
  console.log(`[rc12-frame] ${who}: caveat ${f.caveat.toFixed(1)} of ${REAL.height}`)
  expect(f.scrollY).toBe(0)
  expect(f.caveat, `${who}: the page and its R13 caveat inside the first frame`).toBeLessThanOrEqual(REAL.height)
}

/** Detail's bars stand to their printed shifts on the one symmetric scale, on the side their sign names, each printing
 *  its shift; beside the table each bar is level with its row. */
async function assertShiftBars(page: Page, who: string, besideTable: boolean): Promise<void> {
  const read = await page.evaluate(() => {
    const c = document.querySelector('[data-chart="mix-shift"]')!
    const plot = c.querySelector('.highcharts-plot-background')!.getBoundingClientRect()
    const zero = c.querySelector('.b9-shift-zero')!.getBoundingClientRect()
    const ticks = [...c.querySelectorAll('.highcharts-yaxis-labels text')].map((t) => (t.textContent ?? '').trim())
    const labels = [...c.querySelectorAll('.highcharts-data-label text')].map((t) => {
      const b = t.getBoundingClientRect()
      return { text: (t.textContent ?? '').trim(), y: b.top + b.height / 2 }
    })
    const rows = Object.fromEntries(
      [...document.querySelectorAll('[data-asset-detail-row]')].map((r) => {
        const b = r.getBoundingClientRect()
        const cells = [...r.querySelectorAll('td')].map((x) => (x.textContent ?? '').trim()).filter((t) => /%$/.test(t))
        return [r.getAttribute('data-asset-detail-row')!, { y: b.top + b.height / 2, cells }]
      }),
    )
    const bars = [...c.querySelectorAll('.highcharts-point.b9-shift-bar')].map((el) => {
      const b = el.getBoundingClientRect()
      return { id: /b9-shift-bar--([a-z]+)/.exec(el.getAttribute('class') ?? '')?.[1] ?? '?', left: b.left, right: b.right, y: b.top + b.height / 2 }
    })
    return { plotLeft: plot.left, plotWidth: plot.width, zeroX: zero.left + zero.width / 2, ticks, labels, rows, bars }
  })
  expect(read.bars.length, `${who}: a bar per part`).toBe(3)
  const axisMax = Math.max(...read.ticks.map((t) => Math.abs(PCT(t))))
  expect(axisMax, `${who}: the scale's end tick`).toBeGreaterThanOrEqual(10)
  expect(Math.abs(read.zeroX - (read.plotLeft + read.plotWidth / 2)), `${who}: the zero rule at the plot's middle`).toBeLessThanOrEqual(1.5)
  const perPx = axisMax / (read.plotWidth / 2)
  for (const b of read.bars) {
    const row = read.rows[b.id]!
    const [cur, wi] = row.cells.slice(-2)
    const want = PCT(wi!) - PCT(cur!)
    const rightward = b.right - read.zeroX > 0.5
    const drawn = (b.right - b.left) * perPx * (rightward ? 1 : -1)
    expect(Math.abs(drawn - want), `${who}: the ${b.id} bar draws ${drawn.toFixed(2)} points for a printed shift of ${want} (what-if ${wi} less current ${cur})`).toBeLessThanOrEqual(1.5 * perPx + 0.01)
    const label = read.labels.find((l) => Math.abs(l.y - b.y) < 6)
    expect(label?.text, `${who}: the ${b.id} bar prints its shift`).toBe(slots.assetShift(want))
    if (besideTable) expect(Math.abs(b.y - row.y), `${who}: the ${b.id} bar level with its table row`).toBeLessThanOrEqual(2)
  }
}

/** Each of Detail's column headings on one line (RC12's phone look broke "What-if" at its hyphen, green on every width
 *  check). */
async function assertHeadingsOneLine(page: Page, who: string): Promise<void> {
  const broken = await page.locator('[data-asset-detail-table] thead th').evaluateAll((ths) =>
    ths.flatMap((th) => {
      const range = document.createRange()
      range.selectNodeContents(th)
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
      return tops.size > 1 ? [(th.textContent ?? '').trim()] : []
    }),
  )
  expect(broken, `${who}: a column heading broken over lines`).toEqual([])
}

const RC12_SIZES = [
  { title: `at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, use: { viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' as const }, phone: false },
  { title: `on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' as const }, phone: true },
] as const

for (const size of RC12_SIZES) {
  test.describe(`RC12 · Asset Allocation ${size.title}`, () => {
    test.use(size.use)
    for (const seed of ['buckets', 'retired'] as const) {
      test(`?seed=${seed}: Summary and Detail${size.phone ? '' : ', each in one frame'}; the ring stands to its printed shares, its centre the parts' own and inside the hole; the cash line; the caveat reached`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 90_000)
        await enterInvestment(page, seed, ASSET_PAGE, size.phone)
        await expect(page.getByRole('heading', { level: 1, name: copy.shellPageAssetAllocation })).toBeVisible()
        const cur = await printedMix(page, 'current')
        expect(cur.stock! + cur.bond! + cur.cash!, `${seed}: the printed parts sum to 100`).toBe(100)
        await assertRingShares(page, 'mix-current', cur, `${seed} current`)
        await expect(page.locator('[data-asset-donut="mix-current"] [data-asset-centre]')).toHaveText(slots.assetCentre(cur.stock!, 100 - cur.stock!))
        await auditRings(page, `${seed} Summary`)
        await expect(page.locator('[data-asset-note]').filter({ hasText: copy.assetCashLine })).toHaveCount(1)
        await expect(page.locator('[data-asset-none]')).toContainText(copy.assetNoWhatIfOpen)
        if (!size.phone) await assertOneFrame(page, `${seed} Summary`)
        await assertOneVisibleCaveat(page, size.phone ? null : REAL.height)
        await assertCaveatReachable(page, `${seed} Summary`)
        await noSidewaysScroll(page, `${seed} Summary`)
        if (size.phone) await assertPageTapsReach(page, 'main.result [role="tab"], main.result [role="combobox"], [data-asset-try]', `${seed} Summary`, 4)
        await page.getByRole('tab', { name: copy.assetTabDetail }).click()
        await expect(page.locator('[data-asset="detail"]')).toBeVisible()
        await settleLayout(page)
        await expect(page.locator('[data-asset-detail-row]')).toHaveCount(3)
        await expect(page.locator('[data-asset-note]').filter({ hasText: copy.assetCashLine })).toHaveCount(1)
        await assertHeadingsOneLine(page, seed)
        if (!size.phone) await assertOneFrame(page, `${seed} Detail`)
        await assertCaveatReachable(page, `${seed} Detail`)
        await noSidewaysScroll(page, `${seed} Detail`)
        if (size.phone) await assertPageTapsReach(page, 'main.result [role="tab"], main.result [role="combobox"], [data-asset-try]', `${seed} Detail`, 4)
      })
    }

    test(`?seed=buckets: switching the picker to one bucket's and one person's accounts rebuilds the ring, which stands to its new shares`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterInvestment(page, 'buckets', ASSET_PAGE, size.phone)
      for (const option of [slots.assetScopeBucket(copy.investBucketRoth), slots.assetScopeOwner('Sam’s')]) {
        await page.locator('[data-asset-side="current"] [role="combobox"]').click()
        await page.getByRole('option', { name: option, exact: true }).click()
        await expect(page.locator('[data-asset-side="current"] [role="combobox"]')).toHaveText(option)
        await donutsDrawn(page)
        const cur = await printedMix(page, 'current')
        await assertRingShares(page, 'mix-current', cur, `buckets ${option}`)
        await auditRings(page, `buckets ${option}`)
      }
    })

    test(`?seed=retired: a what-if mix set on Analysis (40 / 45 / 15): the what-if ring stands to it; Detail's bars stand to the printed shifts${size.phone ? '' : ', each level with its row, in one frame'}; the chart's words pass the audits`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 240_000)
      await gotoSeedFinal(page, 'retired')
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      await setWhatIfMix(page, [40, 45, 15], size.phone)
      await moveToInvestment(page, ASSET_PAGE, size.phone)
      await expect(page.locator('[data-asset-from]')).toHaveText(slots.assetWhatIfFrom(copy.probabilityPickNew))
      const wi = await printedMix(page, 'whatif')
      expect(wi).toEqual({ stock: 40, bond: 45, cash: 15 })
      await assertRingShares(page, 'mix-what-if', wi, 'retired what-if')
      await expect(page.locator('[data-asset-donut="mix-what-if"] [data-asset-centre]')).toHaveText(slots.assetCentre(40, 60))
      await auditRings(page, 'retired with a what-if')
      if (!size.phone) await assertOneFrame(page, 'retired Summary with a what-if')
      await page.getByRole('tab', { name: copy.assetTabDetail }).click()
      await expect(page.locator('[data-chart="mix-shift"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
      await page.waitForTimeout(300)
      await settleLayout(page)
      await assertShiftBars(page, 'retired Detail', !size.phone)
      await assertHeadingsOneLine(page, 'retired Detail with a what-if')
      const floor = await hcFloorPx(page)
      expect(
        hcTextFailures(await hcAudit(page, '[data-chart="mix-shift"]', '[data-asset="detail"]'), floor, { texts: ['−20%', '+15%', '+5%'], counts: { 'data-label': 3, 'axis-label': size.phone ? 6 : 5 } }),
        'retired Detail: the chart’s text',
      ).toEqual([])
      expect(hcMarkFailures(await hcMarks(page, '[data-chart="mix-shift"]', '[data-asset="detail"]')), 'retired Detail: the figures over no bar or other figure').toEqual([])
      await assertChartTextApart(page, '[data-chart="mix-shift"]', 'retired Detail')
      await assertCreditClear(page, 'mix-shift', 'retired Detail')
      // Each part's name (the phone's, over its bar) clear of every bar (RC12's phone look set "Stocks" on its bar's top).
      const onBars = await page.locator('[data-chart="mix-shift"]').evaluate((c) => {
        const bars = [...c.querySelectorAll('.highcharts-point.b9-shift-bar')].map((b) => b.getBoundingClientRect())
        return [...c.querySelectorAll('.highcharts-xaxis-labels text')].flatMap((t) => {
          const r = t.getBoundingClientRect()
          return bars.some((b) => r.left < b.right - 0.5 && b.left < r.right - 0.5 && r.top < b.bottom - 0.5 && b.top < r.bottom - 0.5) ? [(t.textContent ?? '').trim()] : []
        })
      })
      expect(onBars, 'retired Detail: a part’s name over a bar').toEqual([])
      expect((await page.locator('[data-chart="mix-shift"] svg text').allTextContents()).filter((t) => t.includes('…')), 'no chart word cut short').toEqual([])
      if (!size.phone) await assertOneFrame(page, 'retired Detail with a what-if')
      await noSidewaysScroll(page, 'retired Detail with a what-if')
    })
  })

  test.describe(`RC12 · Tax Allocation ${size.title}`, () => {
    test.use(size.use)
    for (const seed of ['buckets', 'retired'] as const) {
      test(`?seed=${seed}: the ring stands to each part's figure; picking a part on the ring lists its accounts${size.phone ? '' : ' in one frame'}; the caveat reached`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 90_000)
        await enterInvestment(page, seed, TAXALLOC_PAGE, size.phone)
        await expect(page.getByRole('heading', { level: 1, name: copy.shellPageTaxAllocation })).toBeVisible()
        const figures = await page
          .locator('[data-taxalloc-part]')
          .evaluateAll((els) => els.map((e) => [e.getAttribute('data-taxalloc-part')!, Number((e.querySelector('span')?.textContent ?? '').replace(/[^0-9]/g, ''))] as const))
        const total = figures.reduce((t, [, v]) => t + v, 0)
        expect(Number((await page.locator('[data-taxalloc-total]').textContent())!.replace(/[^0-9]/g, '')), `${seed}: the hole's total is the parts' sum`).toBe(total)
        if (figures.length >= 2) {
          const drawn = await sliceShares(page, 'tax-allocation')
          for (const [id, v] of figures) {
            const d = drawn.find((x) => x.id === id)!
            expect(Math.abs(d.share - v / total) * 100, `${seed}: the ${id} slice against its figure's share`).toBeLessThanOrEqual(0.3)
          }
        }
        await auditRings(page, `${seed} Tax Allocation`)
        // The pointer's way in: a click inside the slice's band, half-way round its arc.
        const pick = figures[figures.length - 1]![0]
        const at = await page.locator(`[data-chart="tax-allocation"] path.b9-donut-part--${pick}`).evaluate((el, hole) => {
          const ring = el.closest('.highcharts-series-group')!.getBoundingClientRect()
          const cx = ring.left + ring.width / 2
          const cy = ring.top + ring.height / 2
          const nums = (el.getAttribute('d') ?? '').replace(/[A-Za-z]/g, ' $& ').trim().split(/[\s,]+/)
          const m = (el as SVGGraphicsElement).getScreenCTM()!
          const scr = (x: number, y: number) => [x * m.a + y * m.c + m.e, x * m.b + y * m.d + m.f] as const
          const mi = nums.indexOf('M')
          const ai = nums.indexOf('A')
          const [sx, sy] = scr(Number(nums[mi + 1]), Number(nums[mi + 2]))
          const [ex, ey] = scr(Number(nums[ai + 6]), Number(nums[ai + 7]))
          const a0 = Math.atan2(sy - cy, sx - cx)
          let sweep = Math.atan2(ey - cy, ex - cx) - a0
          while (sweep <= 0) sweep += 2 * Math.PI // clockwise on screen (y down)
          const mid = a0 + sweep / 2
          const r = (ring.width / 2) * ((1 + hole) / 2)
          return { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid) }
        }, DONUT_HOLE)
        if (size.phone) await page.touchscreen.tap(at.x, at.y)
        else await page.mouse.click(at.x, at.y)
        await expect(page.locator(`[data-taxalloc-part="${pick}"]`)).toHaveAttribute('aria-pressed', 'true')
        await expect(page.locator('[data-taxalloc-account]').first()).toBeVisible()
        await donutsDrawn(page)
        await expect(page.locator('[data-chart="tax-allocation"] path.b9-donut-picked'), 'the picked slice carries its edge').toHaveCount(1)
        if (!size.phone) await assertOneFrame(page, `${seed} Tax Allocation, a part picked`)
        await assertOneVisibleCaveat(page, size.phone ? null : REAL.height)
        await assertCaveatReachable(page, `${seed} Tax Allocation`)
        await noSidewaysScroll(page, `${seed} Tax Allocation`)
        if (size.phone) await assertPageTapsReach(page, '[data-taxalloc-part]', `${seed} Tax Allocation`, figures.length)
      })
    }
  })
}

// ── RC13a · Profile → Net Worth, Income, Savings and Family (plan 6, RC13; its Fit decision, Verification and Test scenarios) ──
// - scrolling pages: at his window the first frame holds the page's title, its sentence and its first row of cards (Net
//   Worth: the band and the first account row); no page and no drawer scrolls sideways, at either size;
// - each page's first card opens its drawer: at his window the drawer sits inside the 1440×731 window, header to footer,
//   its body scrolling on its own; on the phone it is a full-screen sheet that names itself and takes focus (its title);
//   Escape with nothing changed closes it and hands focus back to the card (insight 071: a real browser's order);
// - one R13 disclaimer visible on every Profile page: Net Worth's in-frame caveat, tied to its band's figure; the trailing
//   mount on the others (no figure);
// - Back over a drawer holding a change asks INSIDE the drawer (the drawer is modal); Stay keeps the change; a Save the
//   walk's check refuses shows its words under the field and writes nothing.
const PROFILE = {
  'net-worth': { screen: 'profile-net-worth', page: copy.shellPageNetWorth },
  income: { screen: 'profile-income', page: copy.shellPageIncome },
  savings: { screen: 'profile-savings', page: copy.shellPageSavings },
  family: { screen: 'profile-family', page: copy.shellPageFamily },
} as const
const PROFILE_SEEDS = ['budget', 'date', 'retired', 'tablewidest'] as const

async function toProfile(page: Page, target: { readonly screen: string; readonly page: string }, phone: boolean): Promise<void> {
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: target.page, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
  } else await showPage(page, { screen: target.screen, module: copy.shellModuleProfile, page: target.page })
  await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
  await expect(page.getByRole('heading', { level: 1, name: target.page })).toBeVisible()
  await settleLayout(page)
}

/** Exactly one R13 disclaimer shows: Net Worth's in-frame caveat (tied to the band), the trailing mount elsewhere. */
async function assertProfileDisclaimer(page: Page, screen: string): Promise<void> {
  if (screen === 'profile-net-worth') {
    await assertOneVisibleCaveat(page, null)
    return
  }
  await expect(page.locator('main.result [data-caveat]'), `${screen}: no in-frame caveat on a page with no figure`).toHaveCount(0)
  const visible = await page.evaluate(
    () => [...document.querySelectorAll('footer.disclaimer, [data-caveat]')].filter((el) => getComputedStyle(el).display !== 'none' && (el as HTMLElement).getClientRects().length > 0).length,
  )
  expect(visible, `${screen}: exactly one visible R13 disclaimer`).toBe(1)
}

/** The first frame at his window: the title, its sentence and the first card (or Net Worth's first row) inside it. */
async function assertProfileFirstFrame(page: Page, who: string): Promise<void> {
  const f = await page.evaluate(() => ({
    scrollY: window.scrollY,
    first: document.querySelector('main.result [data-profile-card], main.result [data-networth-empty], main.result [data-profile-line]')?.getBoundingClientRect().bottom ?? null,
  }))
  expect(f.scrollY).toBe(0)
  expect(f.first, `${who}: a first row to read`).not.toBeNull()
  expect(f.first!, `${who}: the first row of cards inside the first frame`).toBeLessThanOrEqual(REAL.height)
}

/** The open drawer: inside the window, header to footer, nothing sideways, named and focused on its title; on the phone a
 *  full-screen sheet. */
async function assertDrawerFits(page: Page, who: string, phone: boolean): Promise<void> {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(450)
  const r = await dialog.evaluate((d) => {
    const box = d.getBoundingClientRect()
    const body = d.querySelector('[data-profile-drawer-body]')!.parentElement!
    const footer = d.querySelector('footer')!.getBoundingClientRect()
    const title = d.querySelector('h2')!
    const label = d.getAttribute('aria-labelledby') ?? ''
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      footerBottom: footer.bottom,
      bodySideways: body.scrollWidth - body.clientWidth,
      titleFocused: document.activeElement === title,
      named: label !== '' && document.getElementById(label)?.textContent === title.textContent,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  expect(r.top, `${who}: the drawer's top`).toBeGreaterThanOrEqual(-0.5)
  expect(r.bottom, `${who}: the drawer inside the window`).toBeLessThanOrEqual(r.vh + 0.5)
  expect(r.footerBottom, `${who}: Save and Cancel inside the window`).toBeLessThanOrEqual(r.vh + 0.5)
  expect(r.bodySideways, `${who}: the drawer's body scrolls sideways`).toBeLessThanOrEqual(0)
  expect(r.named, `${who}: the drawer names itself by its title`).toBe(true)
  expect(r.titleFocused, `${who}: the drawer takes focus on its title`).toBe(true)
  if (phone) {
    expect(r.left, `${who}: a full-screen sheet (left)`).toBeLessThanOrEqual(0.5)
    expect(r.right, `${who}: a full-screen sheet (right)`).toBeGreaterThanOrEqual(r.vw - 0.5)
    expect(r.bottom - r.top, `${who}: a full-screen sheet (height)`).toBeGreaterThanOrEqual(r.vh - 1)
  } else expect(Math.abs(r.right - r.vw), `${who}: docked right`).toBeLessThanOrEqual(1)
  await noSidewaysScroll(page, who)
}

for (const size of RC12_SIZES) {
  test.describe(`RC13a · the Profile pages ${size.title}`, () => {
    test.use(size.use)
    for (const seed of PROFILE_SEEDS) {
      test(`?seed=${seed}: Net Worth, Income, Savings and Family${size.phone ? '' : ', each first frame'}; each first card's drawer${size.phone ? ' a full-screen sheet' : ' inside the window'}, closed back to its card; one disclaimer`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await gotoSeedFinal(page, seed)
        await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
        for (const [id, target] of Object.entries(PROFILE)) {
          const who = `${seed} ${id}`
          await toProfile(page, target, size.phone)
          if (!size.phone) await assertProfileFirstFrame(page, who)
          await noSidewaysScroll(page, who)
          await assertProfileDisclaimer(page, target.screen)
          const card = page.locator('main.result [data-profile-card]').first()
          if ((await card.count()) === 0) {
            await expect(page.locator('[data-profile-line]'), `${who}: a page with no card says why`).not.toHaveCount(0)
            continue
          }
          await card.click()
          await assertDrawerFits(page, who, size.phone)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog'), `${who}: Escape with nothing changed closes the drawer`).toHaveCount(0)
          await expect(card, `${who}: focus back on the card`).toBeFocused()
        }
        // Net Worth's band names its total as the invested accounts, never a net worth B9 cannot know, and both stopgaps show.
        await toProfile(page, PROFILE['net-worth'], size.phone)
        await expect(page.locator('[data-networth-band]')).toContainText(copy.snapshotInvestedTitle)
        await expect(page.locator('[data-networth-band]')).not.toContainText(/net worth/i)
        await expect(page.locator('[data-networth-note]').filter({ hasText: copy.snapshotInvestedStopgap })).toHaveCount(1)
        await expect(page.locator('[data-networth-note]').filter({ hasText: copy.profileInheritedIraStopgap })).toHaveCount(1)
        await assertCaveatReachable(page, `${seed} net-worth`)
      })
    }

    test(`?seed=date: a new account from the Add menu opens on both its facets${size.phone ? ' as a full-screen sheet' : ' inside the window'}`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await gotoSeedFinal(page, 'date')
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      await toProfile(page, PROFILE['net-worth'], size.phone)
      await page.getByRole('button', { name: copy.profileAddAccount }).click()
      await page.getByRole('menuitem', { name: copy.investBucketPretax }).click()
      await page.getByRole('menuitem', { name: copy.kind401k }).click()
      await assertDrawerFits(page, 'date new 401(k)', size.phone)
      await expect(page.locator('[data-profile-section="holdings"]')).toBeAttached()
      await expect(page.locator('[data-profile-section="deposits"]')).toBeAttached()
      await page.getByRole('dialog').getByRole('button', { name: copy.profileDrawerCancel }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })
  })
}

test.describe(`RC13a · a Profile drawer's Save and Back (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test(`?seed=retired: a yearly figure in the monthly Social Security box is refused under its field and writes nothing; Escape over it asks inside the drawer`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await gotoSeedFinal(page, 'retired')
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    await toProfile(page, PROFILE.income, false)
    const card = page.locator('[data-profile-card="ss-0"]')
    const before = await card.textContent()
    await card.click()
    const dialog = page.getByRole('dialog')
    const field = dialog.getByLabel(copy.ssAmountLabel)
    await field.fill('30000')
    await dialog.getByRole('button', { name: copy.profileDrawerSave }).click()
    await expect(dialog.getByRole('alert')).toHaveText(copy.errPiaCeiling)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog, 'a refused Save keeps the drawer open').toBeVisible()
    await page.keyboard.press('Escape')
    const ask = dialog.locator('[data-profile-ask]')
    await expect(ask, 'Escape over an unsaved change asks, inside the drawer').toBeVisible()
    await expect(ask.getByRole('button', { name: copy.profileUnsavedKeep }), 'focus on the safe choice').toBeFocused()
    await ask.getByRole('button', { name: copy.profileUnsavedDrop }).click()
    await expect(dialog).toHaveCount(0)
    await expect(card, 'nothing refused reached the plan').toHaveText(before!)
    await expect(page.locator(SETTLED_RESULT), 'no re-figuring started').toBeAttached()
  })

  test(`?seed=date: Back over a drawer holding a change asks inside the drawer; Stay keeps the drawer and the change; Go back leaves with the plan untouched`, async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await gotoSeedFinal(page, 'date')
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    await toProfile(page, PROFILE.family, false)
    const before = page.url()
    await page.locator('[data-profile-card="person-0"]').click()
    const dialog = page.getByRole('dialog')
    const name = dialog.getByLabel(copy.nameLabel)
    await name.fill('Jordan')
    await name.blur()
    await page.goBack()
    const ask = dialog.locator('[data-profile-ask]')
    await expect(ask, 'Back with a change held asked nothing').toBeVisible()
    await expect(ask).toContainText(copy.profileLeaveAskUnsaved)
    expect(page.url(), 'the page’s entry went back on').toBe(before)
    await expect(ask.getByRole('button', { name: copy.workbenchLeaveStay }), 'focus moves to the safe choice').toBeFocused()
    await ask.getByRole('button', { name: copy.workbenchLeaveStay }).click()
    await expect(ask).toHaveCount(0)
    await expect(name, 'Stay keeps the change').toHaveValue('Jordan')
    await page.goBack()
    await dialog.locator('[data-profile-ask]').getByRole('button', { name: copy.workbenchLeaveGo }).click()
    await expect(page.locator('main.result[data-shell-screen="profile-family"]')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('header.rc-root p[data-shell-names]'), 'the change never reached the plan').not.toContainText('Jordan')
  })
})

// ── RC13b · Profile → Expenses and Goals, and the pay check's drawer (plan 6, RC13; its Fit decision, Verification, and
//    section 5.2's port of the W step, money picture, left-over seat and coordinate-tap arms to the drawers) ──────────────
// - Expenses and Goals are scrolling pages: at his window the first frame holds the title, its sentence and the first row
//   of cards; EVERY card's drawer fits his window (header to footer, its body scrolling on its own) or, on the phone, is a
//   full-screen sheet that names itself and takes focus; Escape with nothing changed hands focus back to its card (a Goals
//   Retirement card's too, though it opens the Family person drawer); no page and no drawer scrolls sideways; one R13
//   disclaimer (the trailing mount: no figure on either page);
// - the StaleBanner's standing line opens the Pre-retirement living expenses drawer over the page (plan 4.0's map): the
//   W question's stale face, the money picture under it, the left-over question under the whole picture;
// - the gesture hold, ported (insight 149): a W period tapped by coordinate right after typing lands, the note's Keep door
//   tapped right after typing keeps the figure it names, and "All of it" tapped right after typing W stores the figure on
//   screen at the press. Real coordinate taps (`page.mouse`, `page.touchscreen`), never `.click()`, which re-resolves the
//   target between the halves: that is the race itself.
const RC13B_PAGES = {
  goals: { screen: 'profile-goals', page: copy.shellPageGoals },
  expenses: { screen: 'profile-expenses', page: copy.shellPageExpenses },
} as const
const RC13B_SEEDS = ['budget', 'date', 'datesaved', 'datecoststale', 'tablewidest', 'retired'] as const
const W_DRAWER = copy.profileWorkingCostName

for (const size of RC12_SIZES) {
  test.describe(`RC13b · Expenses and Goals ${size.title}`, () => {
    test.use(size.use)
    for (const seed of RC13B_SEEDS) {
      test(`?seed=${seed}: Goals and Expenses${size.phone ? '' : ', each first frame'}; every card's drawer${size.phone ? ' a full-screen sheet' : ' inside the window'}, closed back to its card; one disclaimer`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 180_000)
        await gotoSeedFinal(page, seed)
        await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
        for (const [id, target] of Object.entries(RC13B_PAGES)) {
          const who = `${seed} ${id}`
          await toProfile(page, target, size.phone)
          if (!size.phone) await assertProfileFirstFrame(page, who)
          await noSidewaysScroll(page, who)
          await assertProfileDisclaimer(page, target.screen)
          const ids = await page.locator('main.result [data-profile-card]').evaluateAll((els) => els.map((el) => el.getAttribute('data-profile-card')!))
          expect(ids.length, `${who}: the page draws its cards`).toBeGreaterThanOrEqual(2)
          for (const cardId of ids) {
            const card = page.locator(`main.result [data-profile-card="${cardId}"]`)
            await card.scrollIntoViewIfNeeded()
            await card.click()
            await assertDrawerFits(page, `${who} ${cardId}`, size.phone)
            await page.keyboard.press('Escape')
            await expect(page.getByRole('dialog'), `${who} ${cardId}: Escape with nothing changed closes the drawer`).toHaveCount(0)
            await expect(card, `${who} ${cardId}: focus back on the card`).toBeFocused()
          }
        }
      })
    }
  })
}

/** Open the Pre-retirement living expenses drawer from its Expenses card. */
async function openWDrawer(page: Page, phone: boolean) {
  await toProfile(page, RC13B_PAGES.expenses, phone)
  await page.locator('main.result [data-profile-card="working-cost"]').click()
  const dialog = page.getByRole('dialog', { name: W_DRAWER })
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(450)
  return dialog
}

/** A press, 80 ms, the release (a human's), or a touch tap, at the centre of `target`, after proving the point hits it
 *  (insight 119: what the input path hits). */
async function coordinateTap(page: Page, target: ReturnType<Page['locator']>, touch: boolean, who: string): Promise<void> {
  const box = await target.boundingBox()
  expect(box, `${who}: the target has a box`).not.toBeNull()
  const x = box!.x + box!.width / 2
  const y = box!.y + box!.height / 2
  const hits = await target.evaluate((el, [px, py]) => {
    const hit = document.elementFromPoint(px, py)
    return hit !== null && el.contains(hit)
  }, [x, y] as const)
  expect(hits, `${who}: the tap point is on the target`).toBe(true)
  if (touch) {
    await page.touchscreen.tap(x, y)
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.waitForTimeout(80)
    await page.mouse.up()
  }
}

/** Type into the W figure as a person does, focus kept (the press is what blurs it). */
async function typeWFigure(page: Page, dialog: ReturnType<Page['getByRole']>, text: string) {
  const input = dialog.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true })
  await input.scrollIntoViewIfNeeded()
  await input.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(text)
  return input
}

/** `datecoststale` with its W kept through the Keep door ($84,000 a year, stamped at the $78,000 quote, KTD10) and saved,
 *  then staled on the reading by a move to Pennsylvania (the Home state drawer, saved): the h2 probe's set-up, through the
 *  drawers. The drawer opens again on the kept figure's stale face. */
async function staleEnteredWInDrawer(page: Page, phone: boolean) {
  await gotoSeedFinal(page, 'datecoststale')
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  let dialog = await openWDrawer(page, phone)
  await dialog.getByRole('button', { name: slots.workingCostKeepYearly('84,000') }).click()
  await expect(dialog.locator('[data-working-cost-note]'), 'the kept figure is fresh').toHaveCount(0)
  await dialog.getByRole('button', { name: copy.profileDrawerSave }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await toProfile(page, PROFILE.family, phone)
  await page.locator('main.result [data-profile-card="state"]').click()
  const state = page.getByRole('dialog', { name: copy.profileHomeStateName })
  await state.getByRole('combobox').click()
  await page.getByRole('option', { name: /Pennsylvania/ }).click()
  await state.getByRole('button', { name: copy.profileDrawerSave }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  dialog = await openWDrawer(page, phone)
  await expect(dialog.locator('[data-working-cost-note]'), 'the move to PA stales the kept figure').toContainText(slots.workingCostStaleStateKept('84,000'))
  return dialog
}

for (const size of RC12_SIZES) {
  test.describe(`RC13b · the pay check's drawer ${size.title}`, () => {
    test.use(size.use)

    test('?seed=datecoststale: the standing line opens the drawer over the page; the calm stale note before any tap; "yes" draws the picture, every row inside the drawer', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await gotoSeedFinal(page, 'datecoststale')
      await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached()
      const line = page.locator('[data-stale-banner] p.cs-paycheck-note')
      await expect(line, 'the standing line renders above the page').toHaveCount(1)
      await expect(line).toContainText(copy.stalenessPayCheckNote)
      await line.getByRole('button', { name: copy.stalenessPayCheckCta }).click()
      const dialog = page.getByRole('dialog', { name: W_DRAWER })
      await expect(dialog, 'the door opens the Pre-retirement living expenses drawer').toBeVisible()
      await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'over the page it was opened on').toBeAttached()
      await assertDrawerFits(page, 'datecoststale W drawer', size.phone)
      await expect(dialog.locator('[data-working-cost-note]')).toContainText(slots.workingCostStaleQuote('84,000', '78,000'))
      await expect(dialog.getByRole('alert'), 'no alert before any tap').toHaveCount(0)
      await dialog.locator('[data-choice-group="working-cost"] label').filter({ hasText: copy.workingCostYes }).click()
      await expect(dialog.getByRole('heading', { level: 4, name: copy.workingLedgerComingIn })).toBeVisible({ timeout: 30_000 })
      await noSidewaysScroll(page, 'datecoststale W drawer, picture drawn')
      const rows = await dialog.locator('[data-money-picture] [data-ledger-row]').count()
      expect(rows, 'the picture drew its rows').toBeGreaterThanOrEqual(4)
      await dialog.getByRole('button', { name: copy.profileDrawerSave }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('[data-stale-banner] p.cs-paycheck-note'), 'the answered W leaves no stale line').toHaveCount(0, { timeout: FINAL_TIER_MS })
    })

    test('?seed=datesavedrisenlater: the door below today’s quote says "update"; the drawer’s note holds the year-level lean, and no Keep door', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await gotoSeedFinal(page, 'datesavedrisenlater')
      await page.locator('[data-stale-banner]').getByRole('button', { name: copy.stalenessPayCheckCtaUpdate }).click()
      const dialog = page.getByRole('dialog', { name: W_DRAWER })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('[data-working-cost-note]')).toContainText(slots.workingCostStaleLeftOverYearsCheaper('84,000'))
      // Ported from the walk's W step arm (vertical-fit, retired at RC14): no whole-answer lean on a "saved" note, and no
      // figure at the quote in the fork's description (the red team's attack 4).
      await expect(dialog.locator('[data-working-cost-note]'), 'no whole-answer lean on a "saved" note').not.toContainText(slots.workingCostStaleLeansBetter('84,000'))
      await expect(dialog.locator('[data-working-cost-note]'), 'no figure at the quote in the fork’s description').not.toContainText('5,985')
      await expect(dialog.getByRole('button', { name: /^Keep / }), 'no Keep door below today’s quote (ruling 34)').toHaveCount(0)
      await noSidewaysScroll(page, 'datesavedrisenlater W drawer')
    })

    test('?seed=datesaved: the left-over question below the whole picture: three replies, "All of it" checked at its figure', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await gotoSeedFinal(page, 'datesaved')
      const dialog = await openWDrawer(page, size.phone)
      const seat = dialog.locator('[data-left-over-seat]')
      await expect(seat.getByRole('radio'), 'exactly the three replies').toHaveCount(3)
      await expect(seat.getByRole('radio', { name: copy.workingLedgerLeftOverSaved, exact: true })).toBeChecked()
      await expect(seat.locator('[data-left-over-figure]')).toHaveText(slots.workingLedgerLeftOverFigure('16,985'))
      await expect(seat.locator('[data-left-over-line]')).toHaveText(slots.workingLedgerLeftOverSavedLine('16,985'))
      const placed = await dialog.evaluate((d) => {
        const pic = d.querySelector('[data-money-picture]')!
        const q = d.querySelector('[data-left-over-seat]')!
        return { outside: !pic.contains(q), below: q.getBoundingClientRect().top >= pic.getBoundingClientRect().bottom - 0.5 }
      })
      expect(placed, 'the question sits below the whole picture, never inside it').toEqual({ outside: true, below: true })
      await seat.scrollIntoViewIfNeeded()
      await noSidewaysScroll(page, 'datesaved seat')
    })

    test(`?seed=date: "All of it" tapped by coordinate right after typing W stores the figure on screen at the press (${size.phone ? 'touch' : 'mouse'})`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await gotoSeedFinal(page, 'date')
      const dialog = await openWDrawer(page, size.phone)
      const seat = dialog.locator('[data-left-over-seat]')
      const saved = seat.getByRole('radio', { name: copy.workingLedgerLeftOverSaved, exact: true })
      await expect(saved, '`date` is unanswered').not.toBeChecked()
      await dialog.locator('[data-choice-group="working-cost"] label').filter({ hasText: copy.workingCostDifferent }).click()
      await expect(dialog.getByRole('radio', { name: copy.periodMonth }), 'the untapped unit is a month (KTD17)').toBeChecked()
      // "A different figure" clears the held answer in the drawer's buffer (the walk's arm): type the figure, then a year.
      const input = await typeWFigure(page, dialog, '72000')
      await input.press('Tab')
      await dialog.locator('[data-choice-group="working-cost-period"] label').filter({ hasText: copy.periodYear }).click()
      // Now the gesture: type over it again, the focus kept, then tap "All of it" by coordinate.
      await typeWFigure(page, dialog, '60000')
      const label = seat.locator('label[data-choice="saved"]')
      await label.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus: the press is what blurs it').toBeFocused()
      const shownAtPress = await seat.locator('[data-left-over-figure]').textContent()
      await coordinateTap(page, label, size.phone, 'All of it')
      await expect(saved, 'the tap on "All of it" was lost').toBeChecked()
      // THE GATE: what was stored is the figure on screen at the press; the press's blur committed $60,000 after it.
      await expect(seat.locator('[data-left-over-figure]'), 'the hold let go: the live figure draws').not.toHaveText(shownAtPress!)
      const stored = shownAtPress!.match(/\$([\d,]+)/g)!.at(-1)!.slice(1)
      await expect(seat.locator('[data-left-over-line]'), 'the line names the stored figure, chosen against at the press').toContainText(stored)
    })
  })
}

const TALL_DRAWER_ARMS = [
  { name: '1536×1300 window, mouse', touch: false, use: { viewport: { width: 1536, height: 1300 }, deviceScaleFactor: 1.5 } },
  { name: '1024×1366 touch screen', touch: true, use: { viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
] as const

for (const arm of TALL_DRAWER_ARMS) {
  test.describe(`RC13b · the W period tap right after typing (drawer, ${arm.name})`, () => {
    test.use(arm.use)

    test('"Each month" tapped by coordinate lands: the note above it stands until the click, and 7,000 is a month', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      const dialog = await staleEnteredWInDrawer(page, false)
      const month = dialog.getByRole('radio', { name: copy.periodMonth })
      await expect(month, 'the held figure’s own unit, a year, is the one checked').not.toBeChecked()
      const input = await typeWFigure(page, dialog, '7000')
      const label = dialog.locator('[data-choice-group="working-cost-period"] label[data-choice="month"]')
      await label.scrollIntoViewIfNeeded()
      // THE FLOOR: the note sits above the control, on screen, so its unmount would move the control (the race).
      const geometry = await label.evaluate((el) => {
        const note = el.closest('[role="dialog"]')!.querySelector('[data-working-cost-note]')!.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        return { noteHeight: note.height, noteAbove: note.bottom <= r.top, noteOnScreen: note.bottom > 0 }
      })
      expect(geometry.noteHeight, 'the stale note renders').toBeGreaterThan(0)
      expect(geometry.noteAbove && geometry.noteOnScreen, `the note sits above the control, on screen (${JSON.stringify(geometry)})`).toBe(true)
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus: the press is what blurs it').toBeFocused()
      await coordinateTap(page, label, arm.touch, 'Each month')
      await expect(month, `the tap on "${copy.periodMonth}" was lost`).toBeChecked()
      await expect(dialog.locator('[data-working-cost-note]'), 'the commit landed and the hold let go').toHaveCount(0)
      await expect(input).toHaveValue('7,000')
    })
  })
}

const KEEP_DRAWER_ARMS = [
  { name: `${REAL.width}×${REAL.height}, mouse`, touch: false, phone: false, use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
  { name: `phone ${PHONE.width}×${PHONE.height}, touch`, touch: true, phone: true, use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
] as const

for (const arm of KEEP_DRAWER_ARMS) {
  test.describe(`RC13b · the W note's Keep door tapped right after typing (drawer, ${arm.name})`, () => {
    test.use(arm.use)

    test('"Keep $84,000 a year" tapped by coordinate keeps $84,000, the figure it names, and focus lands on the answer', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      const dialog = await staleEnteredWInDrawer(page, arm.phone)
      const input = await typeWFigure(page, dialog, '7000')
      const door = dialog.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })
      await door.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus: the press is what blurs it').toBeFocused()
      await coordinateTap(page, door, arm.touch, 'Keep')
      await expect(dialog.locator('[data-working-cost-note]'), 'the keep landed and the hold let go').toHaveCount(0)
      await expect(input, 'the door kept the figure it names, not the typed digits').toHaveValue('84,000')
      await expect(dialog.getByRole('radio', { name: copy.periodYear })).toBeChecked()
      const focused = await page.evaluate(() => {
        const a = document.activeElement
        return a instanceof HTMLInputElement && a.type === 'radio' && a.checked
      })
      expect(focused, 'focus never falls to the page: it lands on the answer that now stands').toBe(true)
    })
  })
}

// ── RC18 · Settings (the gear) and the Display drawer (plan 6, RC18; its Fit decision, Verification and Test scenarios) ──
// - Settings is a scrolling page: at his window the first frame holds the title, the intro and the first row (its name and
//   value); every folder tab draws its rows (each stamped `data-assumption-seat`) and nothing scrolls sideways, at both
//   sizes; it prints no projected figure (the household's own figures and the methodology's), so its R13 disclaimer is
//   the trailing mount, exactly one visible, as on the Profile pages with no figured total;
// - on `datecoststale` the W row reads the stale value line, and its door opens the Pre-retirement living expenses drawer
//   over Settings (inside the window; a full-screen sheet on the phone), Escape closing it back on Settings;
// - the Display drawer opens from "Today's dollars" beside Analysis's folder tabs: inside the window (a full-screen sheet
//   on the phone), named by its title, which takes focus, nothing sideways, two switches and no future-dollars one; Save
//   with "Show years instead of ages" puts Confidence's fan on calendar-year ticks titled "Year", and back.
const SETTINGS_TAB_WORDS = [copy.settingsTabMethodology, copy.settingsTabReturns, copy.settingsTabTax, copy.settingsTabHealth, copy.settingsTabOther] as const

async function toSettings(page: Page): Promise<void> {
  await page.locator('[data-gear]').click()
  await expect(page.locator('main.result[data-shell-screen="settings"]')).toBeAttached()
  await expect(page.getByRole('heading', { level: 1, name: copy.settingsTitle })).toBeVisible()
  await settleLayout(page)
}

/** A kit drawer that is not a Profile drawer (the Display drawer): inside the window, docked right (a full-screen sheet on
 *  the phone), named by its title, which holds focus, and nothing sideways. */
async function assertKitDrawerFits(page: Page, who: string, phone: boolean): Promise<void> {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(450)
  const r = await dialog.evaluate((d) => {
    const box = d.getBoundingClientRect()
    const title = d.querySelector('h2')!
    const label = d.getAttribute('aria-labelledby') ?? ''
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      sideways: d.scrollWidth - d.clientWidth,
      titleFocused: document.activeElement === title,
      named: label !== '' && document.getElementById(label)?.textContent === title.textContent,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  expect(r.top, `${who}: the drawer's top`).toBeGreaterThanOrEqual(-0.5)
  expect(r.bottom, `${who}: the drawer inside the window`).toBeLessThanOrEqual(r.vh + 0.5)
  expect(r.sideways, `${who}: the drawer scrolls sideways`).toBeLessThanOrEqual(0)
  expect(r.named, `${who}: the drawer names itself by its title`).toBe(true)
  expect(r.titleFocused, `${who}: the drawer takes focus on its title`).toBe(true)
  if (phone) {
    expect(r.left, `${who}: a full-screen sheet (left)`).toBeLessThanOrEqual(0.5)
    expect(r.right, `${who}: a full-screen sheet (right)`).toBeGreaterThanOrEqual(r.vw - 0.5)
  } else expect(Math.abs(r.right - r.vw), `${who}: docked right`).toBeLessThanOrEqual(1)
  await noSidewaysScroll(page, who)
}

for (const size of RC12_SIZES) {
  test.describe(`RC18 · Settings ${size.title}`, () => {
    test.use(size.use)
    for (const seed of ['retired', 'datecoststale'] as const) {
      test(`?seed=${seed}: every folder tab's rows${size.phone ? '' : ', the first frame'}; nothing sideways; one R13 disclaimer${seed === 'datecoststale' ? '; the W row’s door opens its drawer over Settings' : ''}`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 90_000)
        await gotoSeedFinal(page, seed)
        await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
        await toSettings(page)
        if (!size.phone) {
          const f = await page.evaluate(() => ({
            scrollY: window.scrollY,
            intro: document.querySelector('main.result h1')?.parentElement?.getBoundingClientRect().bottom ?? null,
            first: document.querySelector('main.result [data-assumption-seat] [data-settings-value]')?.getBoundingClientRect().bottom ?? null,
          }))
          expect(f.scrollY).toBe(0)
          expect(f.first, `${seed}: a first row to read`).not.toBeNull()
          expect(f.first!, `${seed}: the first row's value inside the first frame`).toBeLessThanOrEqual(REAL.height)
        }
        for (const word of SETTINGS_TAB_WORDS) {
          const who = `${seed} ${word}`
          await page.getByRole('tab', { name: word, exact: true }).click()
          await expect(page.getByRole('tab', { name: word, exact: true })).toHaveAttribute('aria-selected', 'true')
          await settleLayout(page)
          expect(await page.locator('main.result [data-assumption-seat]').count(), `${who}: the tab draws its rows`).toBeGreaterThan(0)
          await noSidewaysScroll(page, who)
          await expect(page.locator('main.result [data-caveat]'), `${who}: no in-frame caveat on a page with no projected figure`).toHaveCount(0)
          const visible = await page.evaluate(
            () => [...document.querySelectorAll('footer.disclaimer, [data-caveat]')].filter((el) => getComputedStyle(el).display !== 'none' && (el as HTMLElement).getClientRects().length > 0).length,
          )
          expect(visible, `${who}: exactly one visible R13 disclaimer`).toBe(1)
        }
        await page.getByRole('tab', { name: copy.settingsTabMethodology, exact: true }).click()
        if (seed === 'datecoststale') {
          const w = page.locator('[data-assumption-seat="working-year-cost"]')
          await expect(w.locator('[data-settings-value]')).toHaveText(slots.assumptionWorkingCostStale('84,000'))
          const door = w.getByRole('button', { name: copy.settingsWorkingCostDoor })
          await door.click()
          await assertDrawerFits(page, `${seed} W drawer over Settings`, size.phone)
          await expect(page.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeVisible()
          await expect(page.locator('main.result[data-shell-screen="settings"]'), 'the drawer opens over Settings').toBeAttached()
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toHaveCount(0)
          await expect(door, `${seed}: focus back on the row's door`).toBeFocused()
        } else {
          await expect(page.locator('[data-assumption-seat="working-year-cost"]'), 'a retired household has no W row').toHaveCount(0)
        }
      })
    }
  })

  test.describe(`RC18 · the Display drawer ${size.title}`, () => {
    test.use(size.use)
    test(`?seed=retired: "Today’s dollars" opens it${size.phone ? ' as a full-screen sheet' : ' inside the window'}; two switches, no future dollars; years instead of ages moves Confidence's fan to calendar years and back`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      await enterProbability(page, 'retired')
      const open = async () => {
        await page.getByRole('button', { name: copy.displayDoorLabel, exact: true }).click()
        await assertKitDrawerFits(page, 'the Display drawer', size.phone)
        const d = page.getByRole('dialog', { name: copy.displayTitle })
        await expect(d.getByRole('switch')).toHaveCount(2)
        await expect(d.getByRole('switch', { name: /dollars/i })).toHaveCount(0)
        await expect(d.getByText(copy.displayTodaysDollarsLine)).toBeVisible()
        return d
      }
      const fanAxis = async () => {
        const fan = page.locator('[data-chart="fan"]')
        await expect(fan).toBeVisible()
        const title = ((await fan.locator('.highcharts-xaxis .highcharts-axis-title').textContent()) ?? '').trim()
        const ticks = (await fan.locator('.highcharts-xaxis-labels text').allTextContents()).map((t) => Number(t.trim())).filter(Number.isFinite)
        return { title, ticks }
      }
      await page.getByRole('tab', { name: copy.confidenceTab, exact: true }).click()
      await expect(page.locator('main.result[data-shell-screen="confidence"]')).toBeAttached()
      const ages = await fanAxis()
      expect(ages.title, 'the ages axis is titled with whose age').not.toBe(copy.chartAxisYear)
      expect(Math.max(...ages.ticks), 'the ages axis ticks at ages').toBeLessThan(130)
      let d = await open()
      await d.getByRole('switch', { name: copy.displayYears }).click()
      await expect(d.getByText(copy.displayYearsOn)).toBeVisible()
      await d.getByRole('button', { name: copy.profileDrawerSave, exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect.poll(async () => (await fanAxis()).title, { message: 'the fan’s axis never switched to the year' }).toBe(copy.chartAxisYear)
      const years = await fanAxis()
      expect(years.ticks.length, 'the years axis prints its ticks').toBeGreaterThan(0)
      for (const t of years.ticks) {
        expect(t, 'a calendar year').toBeGreaterThan(2000)
        expect(t % 10, 'ticked every 10 years').toBe(0)
      }
      d = await open()
      await d.getByRole('switch', { name: copy.displayYears }).click()
      await d.getByRole('button', { name: copy.profileDrawerSave, exact: true }).click()
      await expect.poll(async () => (await fanAxis()).title, { message: 'the fan’s axis never came back to ages' }).toBe(ages.title)
      await noSidewaysScroll(page, 'Confidence after the Display drawer')
    })
  })
}

// ── RC14 · the first-run stepper (plan 6, RC14; its Fit decision, Verification and Test scenarios; section 5.2's port of
//    `e2e/intake-fold.spec.ts`, retired here, and of the walk's pay-check arms from `e2e/vertical-fit.spec.ts`) ──────────
// - a fresh plan opens on "Start a new plan": a drawer that names itself and takes focus on its title (a full-screen sheet
//   on the phone); Start opens the stepper with its bar and the step's title in the first frame at his window;
// - each step change opens the new step at its own top with focus on its title, a scroll carried into the press reset
//   (intake-fold's law 1, ported: the press is an IN-PAGE click, as there, so no auto-scroll replaces the carried offset);
// - a card's drawer names itself and takes focus (law 2), and the step nav yields while it is open: inert, and a press
//   where Next sits lands on the drawer, never on Next (law 3);
// - Next over a working household with no W refuses: the stepper stays, and the W drawer opens with the gate's message at
//   its field (the walk's "blocked Continue", ported);
// - a re-walk of the refusal witness (`datesolo`) passes every step; on Goals the missing facts stand beside Complete in
//   their own frame (the withheld lead, the cannot-price line naming the blocker), the money picture card opens the
//   drawer's one calm line naming it, and Complete lands on the home;
// - the picture at its fullest (`dateshort`), in the drawer (the walk's arm, ported);
// - nothing scrolls sideways; one R13 disclaimer (the trailing mount: the stepper prints no figure it did not take as a
//   fact), at both sizes.
const SETUP_TITLE = {
  family: slots.setupStepTitle(1, copy.setupHeadFamily),
  income: slots.setupStepTitle(2, copy.setupHeadIncome),
  savings: slots.setupStepTitle(3, copy.setupHeadSavings),
  netWorth: slots.setupStepTitle(4, copy.setupHeadNetWorth),
  expenses: slots.setupStepTitle(5, copy.setupHeadExpenses),
  goals: slots.setupStepTitle(6, copy.setupHeadGoals),
} as const
const SETUP_ORDER = [SETUP_TITLE.family, SETUP_TITLE.income, SETUP_TITLE.savings, SETUP_TITLE.netWorth, SETUP_TITLE.expenses, SETUP_TITLE.goals] as const

const setupHeading = (page: Page) => page.locator('main[data-setup-step] h1')

/** The stepper's Next (or Complete), pressed IN-PAGE (no Playwright auto-scroll: the scroll is what some arms measure). */
const pressNext = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>('[data-setup-nav] button')].at(-1)?.click())

/** Exactly one visible R13 disclaimer (the stepper is outside the shell: the trailing mount). */
async function assertOneSetupDisclaimer(page: Page, who: string): Promise<void> {
  const visible = await page.evaluate(
    () => [...document.querySelectorAll('footer.disclaimer, [data-caveat]')].filter((el) => getComputedStyle(el).display !== 'none' && (el as HTMLElement).getClientRects().length > 0).length,
  )
  expect(visible, `${who}: exactly one visible R13 disclaimer`).toBe(1)
}

/** A fresh plan from the cold start, through "Start a new plan" (its drawer read on the way) to Family. */
async function startFreshPlan(page: Page, phone: boolean): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: copy.coldStartBegin }).click()
  const names = page.getByRole('dialog', { name: copy.setupNewPlanTitle })
  await expect(names).toBeVisible({ timeout: 30_000 })
  await assertDrawerFits(page, 'Start a new plan', phone)
  await names.getByLabel(copy.setupNameYou).fill('Alex')
  await names.getByLabel(copy.setupNameSpouse).fill('Sam')
  await names.getByRole('button', { name: copy.setupNewPlanStart }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(setupHeading(page)).toHaveText(SETUP_TITLE.family)
  await settleLayout(page)
}

for (const size of RC12_SIZES) {
  test.describe(`RC14 · the first-run stepper ${size.title}`, () => {
    test.use(size.use)

    test(`a fresh plan: "Start a new plan" names itself; the bar and the title${size.phone ? '' : ' in the first frame'}; every step change at its own top, focus on its title; nothing sideways; one disclaimer`, async ({ page }) => {
      test.setTimeout(120_000)
      await startFreshPlan(page, size.phone)
      const frame = await page.evaluate(() => ({
        bar: document.querySelector('[data-setup-steps]')!.getBoundingClientRect().bottom,
        title: document.querySelector('main[data-setup-step] h1')!.getBoundingClientRect().bottom,
        vh: window.innerHeight,
      }))
      expect(frame.bar, 'the stepper bar in the first frame').toBeLessThanOrEqual(frame.vh)
      expect(frame.title, 'the step’s title in the first frame').toBeLessThanOrEqual(frame.vh)
      await noSidewaysScroll(page, 'Family')
      await assertOneSetupDisclaimer(page, 'Family')
      for (let i = 1; i < SETUP_ORDER.length; i += 1) {
        const who = SETUP_ORDER[i]!
        // Carry a scroll into the press (what the page can take; a short step may take none at his window).
        const carried = await page.evaluate(() => {
          const s = document.scrollingElement!
          s.scrollTop = 120
          return s.scrollTop
        })
        if (size.phone) expect(carried, `${who}: the pre-press scroll never landed (the reset arm would be vacuous)`).toBeGreaterThan(0)
        await pressNext(page)
        await expect(setupHeading(page), `${who}: Next advanced`).toHaveText(who)
        await page.waitForTimeout(250)
        const at = await page.evaluate(() => ({
          scrollTop: document.scrollingElement!.scrollTop,
          focused: document.activeElement === document.querySelector('main[data-setup-step] h1'),
          titleBottom: document.querySelector('main[data-setup-step] h1')!.getBoundingClientRect().bottom,
          vh: window.innerHeight,
        }))
        expect(at.scrollTop, `${who}: the step opens at its own top (carried ${carried}px)`).toBe(0)
        expect(at.focused, `${who}: focus on the new step’s title`).toBe(true)
        expect(at.titleBottom, `${who}: the title in the first frame`).toBeLessThanOrEqual(at.vh)
        await noSidewaysScroll(page, who)
        await assertOneSetupDisclaimer(page, who)
      }
      await expect(page.getByRole('button', { name: copy.setupComplete }), 'the last step ends with Complete').toBeVisible()
    })

    test('a card’s drawer names itself and takes focus; the step nav yields while it is open (inert, and a press where Next sits lands on the drawer)', async ({ page }) => {
      test.setTimeout(90_000)
      await startFreshPlan(page, size.phone)
      await page.locator('[data-profile-card="person-0"]').click()
      await assertDrawerFits(page, 'Family person drawer', size.phone)
      await expect(page.locator('[data-setup-nav]'), 'the step nav yields: inert under the drawer').toHaveAttribute('inert', '')
      // A press where Next sits (its centre, held inside the window) lands on the drawer or its scrim, never on Next.
      const onNext = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-setup-nav] button')].at(-1)!
        const r = btn.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 2))
        return hit !== null && btn.contains(hit)
      })
      expect(onNext, 'a press where Next sits reaches Next under an open drawer').toBe(false)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('[data-profile-card="person-0"]'), 'focus back on the card').toBeFocused()
      await expect(page.locator('[data-setup-nav]')).not.toHaveAttribute('inert', '')
      await expect(setupHeading(page), 'no step change happened').toHaveText(SETUP_TITLE.family)
    })

    test('Next over a working household with no W refuses: the step stays, and the W drawer opens with the gate’s message at its field', async ({ page }) => {
      test.setTimeout(90_000)
      await startFreshPlan(page, size.phone)
      await page.locator('[data-profile-card="person-0"]').click()
      const person = page.getByRole('dialog')
      await person.getByRole('combobox', { name: copy.workStatusLegend }).click()
      await page.getByRole('option', { name: copy.workStatusWorking, exact: true }).click()
      await person.getByRole('button', { name: copy.profileDrawerSave }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      for (const t of [SETUP_TITLE.income, SETUP_TITLE.savings, SETUP_TITLE.netWorth, SETUP_TITLE.expenses]) {
        await pressNext(page)
        await expect(setupHeading(page)).toHaveText(t)
      }
      await pressNext(page)
      const w = page.getByRole('dialog', { name: copy.profileWorkingCostName })
      await expect(w, 'the refusal opened the W drawer').toBeVisible({ timeout: 10_000 })
      await expect(setupHeading(page), 'Next refused: still on Expenses').toHaveText(SETUP_TITLE.expenses)
      await assertDrawerFits(page, 'W drawer at the gate', size.phone)
      await expect(w.getByRole('alert')).toContainText(copy.errWorkingCostUnanswered)
      // A fresh plan has no spending yet, so no quote to offer: the figure is the whole question and carries the gate.
      await expect(w.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true }), 'the figure carries the refusal').toHaveAttribute('aria-invalid', 'true')
      await expect(w.locator('[data-money-picture]'), 'the W question alone on Expenses').toHaveCount(0)
    })

    test('?seed=datesolo re-walked: every step passes; beside Complete the missing facts in their own frame; the picture’s one calm line; Complete lands on the home', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await rewalkSeedTo(page, 'datesolo', SETUP_TITLE.goals)
      const missing = page.locator('[data-setup-missing]')
      await expect(missing).toContainText(copy.answerWithheldLead)
      await expect(missing).toContainText(`${copy.answerCannotPrice} ${copy.employerCoverageUnpriced}`)
      await expect(missing, 'an unpriceable fact never wears "Still needed"').not.toContainText(copy.answerStillNeeded)
      await noSidewaysScroll(page, 'Goals with the missing facts')
      await page.locator('[data-profile-card="money-picture"]').click()
      const w = page.getByRole('dialog', { name: copy.profileWorkingCostName })
      await expect(w).toBeVisible()
      const picture = w.locator('[data-money-picture]')
      await expect(picture).toContainText(copy.workingLedgerUnknownLeadFinal)
      await expect(picture).not.toContainText(copy.workingLedgerUnknownLead)
      await expect(picture.locator('dl'), 'no list and no zeros').toHaveCount(0)
      expect(
        await picture.evaluate((el, needle) => el.textContent!.split(needle).length - 1, copy.employerCoverageUnpriced),
        'the blocker is named once in the picture',
      ).toBe(1)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await pressNext(page)
      await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'Complete lands on the home').toBeAttached({ timeout: 60_000 })
    })

    test('?seed=dateshort: the money picture at its fullest in its drawer — held-back Social Security, Medicare from savings, every later year short (the walk’s arm, ported)', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await gotoSeedFinal(page, 'dateshort')
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      const dialog = await openWDrawer(page, size.phone)
      const picture = dialog.locator('[data-money-picture]')
      await expect(picture).toContainText(copy.workingLedgerShort)
      // The held-back words are the shipped slot's; $2,760 is U10's hand derivation (Alex's $30,000 of pay less the 2026
      // lower exempt amount, $1 held back for every $2 above it), carried from the walk's arm.
      await expect(picture).toContainText(slots.workingLedgerSsHeldBack('2,760'))
      await expect(picture.getByRole('heading', { name: copy.workingLedgerAlsoFromSavings })).toBeVisible()
      await expect(picture.getByRole('heading', { name: copy.workingLedgerLaterHeading })).toBeVisible()
      await expect(picture.locator('[role="alert"], [aria-live]'), 'the picture is never an alarm').toHaveCount(0)
      // (c)'s floor from the walk's arm: pay and Social Security coming in; payroll tax, deposits and W going out; the
      // bottom line; a line under each of the two headings above: 8 rows.
      expect(await picture.locator('[data-ledger-row]').count(), 'the picture drew every row').toBeGreaterThanOrEqual(8)
      await noSidewaysScroll(page, 'dateshort picture')
    })
  })
}

// ── RC15 · Profile → Blueprint (plan 6, RC15; its Fit decision, Test scenarios and Verification) ─────────────────────────
// - a scrolling page: at his window the first frame holds the title, its sentence and the panel's top row (the legend,
//   the headline box, Edit and Add); no tab scrolls sideways at his window or on the phone;
// - every tile names its category in words (the colour edge is never the only signal), and every category word is one
//   the legend names;
// - no joint column: Net Worth draws one column per person, and "joint" appears nowhere on the tab;
// - each tab's first tile opens its Profile card's drawer, which names itself and takes focus (a full-screen sheet on the
//   phone); Escape with nothing changed hands focus back to the tile;
// - the headline names the invested accounts, never a net worth; one R13 disclaimer on every tab, in the panel (tied to
//   the headline's figure on Net Worth);
// - Goals: the years run in order and each prints both people's ages; on the working seed, the crowned tile's sentence
//   names the very year it sits under (the answer's date, never a year typed here).
const BLUEPRINT = { screen: 'profile-blueprint', page: copy.shellPageBlueprint } as const
const BLUEPRINT_TABS = [
  ['net-worth', copy.shellPageNetWorth],
  ['goals', copy.shellPageGoals],
  ['ise', copy.blueprintTabIse],
] as const

for (const size of RC12_SIZES) {
  test.describe(`RC15 · Blueprint ${size.title}`, () => {
    test.use(size.use)
    for (const seed of ['budget', 'date', 'retired'] as const) {
      test(`?seed=${seed}: each folder tab${size.phone ? '' : ', the first frame'}; every tile names its category; no joint column; a tile opens its card's drawer, named; nothing sideways; one disclaimer`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await gotoSeedFinal(page, seed)
        await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
        await toProfile(page, BLUEPRINT, size.phone)
        if (!size.phone) {
          const top = await page.evaluate(() => ({
            scrollY: window.scrollY,
            headline: document.querySelector('[data-bp-headline]')!.getBoundingClientRect().bottom,
            legend: document.querySelector('[data-bp-legend]')!.getBoundingClientRect().bottom,
          }))
          expect(top.scrollY).toBe(0)
          expect(top.headline, `${seed}: the headline box in the first frame`).toBeLessThanOrEqual(REAL.height)
          expect(top.legend, `${seed}: the legend in the first frame`).toBeLessThanOrEqual(REAL.height)
        }
        for (const [id, word] of BLUEPRINT_TABS) {
          const who = `${seed} ${id}`
          await page.getByRole('tab', { name: word, exact: true }).click()
          await expect(page.locator(`[data-blueprint-tab="${id}"]`)).toBeAttached()
          await settleLayout(page)
          await noSidewaysScroll(page, who)
          // The R13 tie: Net Worth's headline figure; Goals' crowned date where one is settled (the tie on the tile's own
          // button); the lanes print facts only. The crown is found by its icon, never by the tie it is meant to prove: on
          // the working seed's settled answer a crown MUST render, and then its button MUST name the in-frame caveat (an
          // `if` on the tie attribute could run zero times and pass with the tie gone).
          const crowns = page.locator('main.result [data-bp-tile]:has(svg.lucide-crown)')
          const crowned = (await crowns.count()) > 0
          if (seed === 'date' && id === 'goals') {
            expect(crowned, `${who}: the settled answer's crowned date renders`).toBe(true)
            await expect(crowns.first(), `${who}: the crowned tile's button names the in-frame caveat`).toHaveAttribute(
              'aria-describedby',
              new RegExp(`(^|\\s)${IN_FRAME_DISCLAIMER_ID}(\\s|$)`),
            )
          }
          await assertOneVisibleCaveat(page, null, id === 'net-worth' || (id === 'goals' && crowned))
          const legend = await page.locator('[data-bp-legend] li').allInnerTexts()
          const categories = await page.locator('main.result [data-bp-tile] [data-bp-category]').evaluateAll((els) =>
            els.map((el) => ({ text: (el as HTMLElement).innerText.trim(), shown: (el as HTMLElement).getClientRects().length > 0 })),
          )
          expect(categories.length, `${who}: tiles to read`).toBeGreaterThan(0)
          for (const c of categories) {
            expect(c.shown, `${who}: a category word shown`).toBe(true)
            expect(legend.map((l) => l.trim().toUpperCase()), `${who}: "${c.text}" is a legend word`).toContain(c.text.toUpperCase())
          }
          if (id === 'net-worth') {
            await expect(page.locator('[data-bp-column]'), `${who}: one column per person, no joint column`).toHaveCount(2)
            await expect(page.locator('main.result [data-screen="profile-blueprint"]')).not.toContainText(/joint/i)
            await expect(page.locator('[data-bp-headline]')).toContainText(copy.snapshotInvestedTitle)
            await expect(page.locator('[data-bp-headline]')).not.toContainText(/net worth/i)
          }
          if (id === 'goals') {
            const groups = await page.locator('[data-bp-goals] > ol > li').evaluateAll((els) =>
              els.map((el) => ({
                year: Number(el.querySelector('[data-bp-year]')?.textContent),
                ages: el.querySelector('[data-bp-ages]')?.textContent ?? '',
                crowned: el.querySelector('[data-bp-tile]:has(svg.lucide-crown) [data-bp-value]')?.textContent ?? null,
              })),
            )
            expect(groups.length, `${who}: a timeline`).toBeGreaterThan(0)
            const years = groups.map((g) => g.year)
            expect(years, `${who}: the years in order`).toEqual([...years].sort((a, b) => a - b))
            for (const g of groups) expect(g.ages.split(' · '), `${who} ${g.year}: both people's ages`).toHaveLength(2)
            for (const g of groups.filter((x) => x.crowned !== null)) expect(g.crowned!, `${who}: the crowned date names its own year`).toContain(String(g.year))
          }
          const tile = page.locator('main.result [data-bp-tile]').first()
          await tile.click()
          await assertDrawerFits(page, who, size.phone)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog'), `${who}: Escape with nothing changed closes the drawer`).toHaveCount(0)
          await expect(tile, `${who}: focus back on the tile`).toBeFocused()
        }
        await assertCaveatReachable(page, `${seed} blueprint`)
      })
    }
  })
}

// ── RC16 · Dashboard → Balance Sheet (plan 6, RC16; its Verification and Test scenarios) ─────────────────────────────
// On `buckets` (pre-tax, taxable and Roth held, no HSA: one kind at $0): at his window, Current holds the headline and its
// premise, the chart, the stopgap lines, the R13 caveat and the DETAILS handle in ONE frame (plan RC16's Verification);
// the DRAWN columns stand to their printed figures on the one axis from $0 (insight 169: options are not the picture),
// each to within 2 px of its share of the plot and every pair in the ratio of its figures within 5 px; every kind named
// on the axis and its figure printed (the text and marks audits); no liability or net worth word anywhere on the page;
// Details lists the accounts by kind; the handle opens the breakdown, whose total is the headline's; the door opens
// Profile → Net Worth. On the phone the bars run SIDEWAYS (the chart is under `SIDEWAYS_MAX_WIDTH`): the drawn WIDTHS
// stand to the figures under the same 2 px and 5 px laws, no two chart texts meet, a resize to 720 px brings the columns
// back on the same chart and a resize back brings the rows back; no sideways scroll, the audits, the caveat reached.

const BALANCE_PAGE = { screen: 'balance-sheet', module: copy.shellModuleDashboard, page: copy.shellPageBalanceSheet } as const
const BALANCE_CHART = '[data-chart="balance-kinds"]'
const KIND_NAMES = [copy.snapshotInvestedTaxable, copy.snapshotInvestedPretax, copy.snapshotInvestedRoth, copy.snapshotInvestedHsa] as const
/** A printed whole-dollar figure ("$450,000") in dollars. */
const wholeDollars = (t: string) => Number(t.replace(/[^0-9]/g, ''))

async function enterBalance(page: Page, seed: string, phone: boolean): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: BALANCE_PAGE.page, exact: true }).click()
    await expect(page.locator(`main.result[data-shell-screen="${BALANCE_PAGE.screen}"]`)).toBeAttached()
  } else await showPage(page, BALANCE_PAGE)
  await expect(page.locator(`${BALANCE_CHART} .highcharts-series-group`), 'the balance chart never drew').toBeAttached({ timeout: 60_000 })
  await page.waitForTimeout(300)
  await settleLayout(page)
}

/** Each bar's drawn length and the figure printed at its end (matched by position), the plot's length along the value axis
 *  and its top tick, and which way the bars run. Columns (his window): the drawn HEIGHTS, figures matched by x-centre,
 *  the top tick the highest. Sideways (a chart under `SIDEWAYS_MAX_WIDTH`, the phone): the drawn WIDTHS, figures matched
 *  by y-centre, the top tick the rightmost. Sideways is read from the picture, never the options: every bar starts at the
 *  same left edge (columns stand a pitch apart). */
async function balanceColumns(page: Page) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel)!
    const rects = [...c.querySelectorAll('.highcharts-point.b9-kind-bar')].map((el) => ({ el, b: el.getBoundingClientRect() }))
    const lefts = rects.map((r) => r.b.left)
    const sideways = rects.length > 1 && Math.max(...lefts) - Math.min(...lefts) < 2
    const labels = [...c.querySelectorAll('.highcharts-data-label text')].map((t) => {
      const b = t.getBoundingClientRect()
      return { text: (t.textContent ?? '').trim(), x: b.left + b.width / 2, y: b.top + b.height / 2 }
    })
    const ticks = [...c.querySelectorAll('.highcharts-yaxis-labels text')].map((t) => {
      const b = t.getBoundingClientRect()
      return { text: (t.textContent ?? '').trim(), x: b.left + b.width / 2, y: b.top }
    })
    const top = (sideways ? ticks.sort((a, b) => b.x - a.x) : ticks.sort((a, b) => a.y - b.y))[0]?.text ?? ''
    const plotBox = c.querySelector('.highcharts-plot-background')!.getBoundingClientRect()
    const plot = sideways ? plotBox.width : plotBox.height
    const bars = rects.map(({ el, b }) => {
      const id = /b9-kind-bar--([a-z]+)/.exec(el.getAttribute('class') ?? '')?.[1] ?? '?'
      const figure = sideways
        ? labels.filter((l) => Math.abs(l.y - (b.top + b.height / 2)) < Math.max(b.height, 8) / 2 + 1)
        : labels.filter((l) => Math.abs(l.x - (b.left + b.width / 2)) < Math.max(b.width, 8) / 2 + 1)
      return { id, size: sideways ? b.width : b.height, figure: figure.map((l) => l.text).join(' | ') }
    })
    return { sideways, plot, top, bars }
  }, BALANCE_CHART)
}

/** The drawn bars stand to their printed figures: each to its share of the plot on the axis from $0 to the top tick, and
 *  every pair of held kinds in the ratio of its figures (insight 169's check, as RC4b's balance bars are pinned); the bars
 *  run the way the chart's width says (sideways under `SIDEWAYS_MAX_WIDTH`, the phone; columns at his window). */
async function assertBalanceHeights(page: Page, who: string, sideways: boolean): Promise<void> {
  const { sideways: drawn, plot, top, bars } = await balanceColumns(page)
  const way = sideways ? 'row' : 'column'
  expect(drawn, `${who}: the bars run ${sideways ? 'sideways (one row per kind)' : 'upright (one column per kind)'}`).toBe(sideways)
  expect(bars.map((b) => b.id), `${who}: one ${way} per kind, in order`).toEqual(['taxable', 'pretax', 'roth', 'hsa'])
  const ceiling = figureDollars(top)
  expect(ceiling, `${who}: the top tick "${top}" is a figure`).toBeGreaterThan(0)
  for (const b of bars) {
    expect(b.figure, `${who}: the ${b.id} ${way} prints one whole-dollar figure`).toMatch(/^\$[\d,]+$/)
    const want = (plot * wholeDollars(b.figure)) / ceiling
    expect(Math.abs(b.size - want), `${who}: the ${b.id} ${way} is ${b.size.toFixed(1)}px for ${b.figure} (${want.toFixed(1)}px on the axis to ${top})`).toBeLessThanOrEqual(2)
  }
  const held = bars.filter((b) => wholeDollars(b.figure) > 0)
  expect(held.length, `${who}: at least two held kinds to compare`).toBeGreaterThanOrEqual(2)
  const tall = held.reduce((a, b) => (b.size > a.size ? b : a))
  for (const b of held) {
    const want = tall.size * (wholeDollars(b.figure) / wholeDollars(tall.figure))
    expect(Math.abs(b.size - want), `${who}: the ${b.id} ${way} (${b.size.toFixed(1)}px) against the ${tall.id} (${tall.size.toFixed(1)}px) in the ratio of ${b.figure} to ${tall.figure}`).toBeLessThanOrEqual(5)
  }
}

async function auditBalanceText(page: Page, who: string): Promise<void> {
  const floor = await hcFloorPx(page)
  const { bars, sideways } = await balanceColumns(page)
  const figures = bars.map((b) => b.figure)
  // Sideways the value axis keeps $0, the ceiling and (where the intervals divide evenly) the middle tick: two at least.
  expect(hcTextFailures(await hcAudit(page, BALANCE_CHART, '[data-balance-tab]'), floor, { texts: [...KIND_NAMES, ...figures], counts: { 'data-label': 4, 'axis-label': 4 + (sideways ? 2 : 3) } }), `${who}: the chart’s text`).toEqual([])
  const cut = (await page.locator(`${BALANCE_CHART} svg text`).allTextContents()).filter((t) => t.includes('…'))
  expect(cut, `${who}: no chart word cut short`).toEqual([])
  expect(hcMarkFailures(await hcMarks(page, BALANCE_CHART, '[data-balance-tab]')), `${who}: the figures over no column or other figure`).toEqual([])
  await assertChartTextApart(page, BALANCE_CHART, who)
}

async function assertNoNetWorth(page: Page, who: string): Promise<void> {
  const words = (await page.locator('main.result').innerText()).replace(/\s+/g, ' ')
  expect(/net worth|liabilit/i.test(words), `${who}: no net worth and no liabilities on the page`).toBe(false)
}

for (const size of RC12_SIZES) {
  test.describe(`RC16 · Balance Sheet ${size.title}`, () => {
    test.use(size.use)
    test(`?seed=buckets: Current${size.phone ? '' : ' in one frame to the DETAILS handle'}; the columns stand to their printed figures; every kind named; no net worth; Details by kind; the breakdown's total; the caveat reached`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 90_000)
      const who = `buckets ${size.phone ? 'PHONE' : 'REAL'}`
      await enterBalance(page, 'buckets', size.phone)
      await expect(page.getByRole('heading', { level: 1, name: copy.shellPageBalanceSheet })).toBeVisible()
      const headline = (await page.locator('[data-balance-headline] > span').first().innerText()).trim()
      expect(headline, `${who}: the headline`).toMatch(/^Your invested accounts total \$[\d,]+$/)
      await expect(page.locator('[data-balance-as-entered]')).toHaveText(copy.snapshotInvestedAsEntered)
      await expect(page.locator('[data-balance-tab="current"] [data-balance-note]').first()).toHaveText(copy.snapshotInvestedStopgap)
      if (!size.phone) {
        const frame = await page.evaluate(() => ({
          scrollY: window.scrollY,
          chart: document.querySelector('[data-balance-chart]')!.getBoundingClientRect().bottom,
          notes: document.querySelector('[data-balance-notes]')!.getBoundingClientRect().bottom,
          caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
          handle: document.querySelector('main.result [aria-controls="b9-balance-details"]')!.getBoundingClientRect().bottom,
        }))
        console.log(`[rc16-frame] buckets: chart ${frame.chart.toFixed(1)}, notes ${frame.notes.toFixed(1)}, caveat ${frame.caveat.toFixed(1)}, handle ${frame.handle.toFixed(1)} of ${REAL.height}`)
        expect(frame.scrollY).toBe(0)
        expect(frame.caveat, `${who}: the headline, the chart, its notes and the caveat inside the first frame`).toBeLessThanOrEqual(REAL.height)
        expect(frame.handle, `${who}: the DETAILS handle inside the first frame`).toBeLessThanOrEqual(REAL.height)
      }
      await auditBalanceText(page, who)
      await assertBalanceHeights(page, who, size.phone)
      if (size.phone) {
        // A resize across the sideways width re-lays the SAME chart (the phone tier holds, so no new chart is built): wider
        // than `SIDEWAYS_MAX_WIDTH` the columns come back standing to their figures, and back at the phone the rows do,
        // the figures apart each way (insight 169: a live chart once kept its old picture on update).
        const phoneSize = page.viewportSize()!
        await page.setViewportSize({ width: 720, height: phoneSize.height })
        await expect.poll(async () => (await balanceColumns(page)).sideways, { message: `${who} at 720px: the columns came back` }).toBe(false)
        await settleLayout(page)
        await assertBalanceHeights(page, `${who} at 720px`, false)
        await auditBalanceText(page, `${who} at 720px`)
        await page.setViewportSize(phoneSize)
        await expect.poll(async () => (await balanceColumns(page)).sideways, { message: `${who} back at ${phoneSize.width}px: the rows came back` }).toBe(true)
        await settleLayout(page)
        await assertBalanceHeights(page, `${who} back at ${phoneSize.width}px`, true)
        await auditBalanceText(page, `${who} back at ${phoneSize.width}px`)
      }
      const sum = (await balanceColumns(page)).bars.reduce((s, b) => s + wholeDollars(b.figure), 0)
      expect(sum, `${who}: the columns add to the headline's total`).toBe(wholeDollars(headline))
      await assertNoNetWorth(page, `${who} Current`)
      await assertOneVisibleCaveat(page, size.phone ? null : REAL.height)
      await assertCaveatReachable(page, `${who} Current`)
      await noSidewaysScroll(page, `${who} Current`)
      // The DETAILS handle opens the breakdown under the panel (on the phone, its sheet): each kind, and the headline's total.
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('button', { name: copy.balanceSheetHandle, exact: true }).click()
      const breakdown = page.locator('[data-balance-breakdown]')
      await expect(breakdown, `${who}: the breakdown opened`).toBeVisible()
      for (const n of KIND_NAMES) await expect(breakdown.getByText(n, { exact: true })).toBeVisible()
      await expect(breakdown.locator('dd').last()).toHaveText(headline.replace(/^.* (\$[\d,]+)$/, '$1'))
      if (size.phone) await page.keyboard.press('Escape')
      else await page.getByRole('button', { name: copy.balanceSheetHandle, exact: true }).click()
      await expect(breakdown).toBeHidden()
      // Details: the accounts by kind, each kind's total over its accounts; the premise and the stopgaps under them.
      await page.getByRole('tab', { name: copy.balanceSheetTabDetails, exact: true }).click()
      await expect(page.locator('[data-balance-tab="details"]')).toBeAttached()
      await settleLayout(page)
      const groups = await page.locator('[data-balance-group]').evaluateAll((els) => els.map((el) => el.getAttribute('data-balance-group')))
      expect(groups, `${who}: the held kinds, in order`).toEqual(['taxable', 'pretax', 'roth'])
      expect(await page.locator('[data-balance-account]').count(), `${who}: accounts listed`).toBeGreaterThanOrEqual(3)
      await expect(page.locator('[data-balance-tab="details"] [data-balance-note]').first()).toHaveText(copy.snapshotInvestedAsEntered)
      await assertNoNetWorth(page, `${who} Details`)
      await assertOneVisibleCaveat(page, null)
      await assertCaveatReachable(page, `${who} Details`)
      await noSidewaysScroll(page, `${who} Details`)
      // The one door goes where accounts are added and changed: Profile → Net Worth.
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('link', { name: copy.balanceSheetChangeAccounts, exact: true }).click()
      await expect(page.locator('main.result[data-shell-screen="profile-net-worth"]'), `${who}: the door opened Profile → Net Worth`).toBeAttached()
    })
  })
}

// ── RC17 · Analysis → Comparisons, Savings and Retirement Details (plan 6, RC17's Verification) ───────────────────────
// On `retired` (the spine: your plan alone, no what-if open), `dip` (the date route; a stop-year what-if moves the first
// retired year, so the two bars as retirement begins differ) and `dateshort` (every working year runs short): each tab in
// ONE frame at his window down to the ACTION ITEMS handle, the R13 caveat inside it and tied to the figures; each chart's
// words pass the Highcharts text audit; every metric names its market; Comparisons' two bars drawn in the ratio of their
// printed figures (insight 169); on the phone no sideways scroll and the caveat reached.
const RC17_TABS = [
  { tab: copy.comparisonsTab, hash: 'comparisons', screen: 'comparisons' },
  { tab: copy.analysisSavingsTab, hash: 'savings', screen: 'analysis-savings' },
  { tab: copy.retirementDetailsTab, hash: 'retirement-details', screen: 'retirement-details' },
] as const

/** Probability (from the home), then the named Analysis tab; its chart drawn (or the words in its place) and settled. */
async function toAnalysisTab(page: Page, seed: string, t: (typeof RC17_TABS)[number]): Promise<void> {
  if ((await page.locator('main.result[data-shell-screen="snapshot"]').count()) > 0) await toProbability(page, seed)
  await page.getByRole('tab', { name: t.tab, exact: true }).click()
  await expect(page.locator(`main.result[data-shell-screen="${t.screen}"]`)).toBeAttached()
  expect(new URL(page.url()).hash).toBe(`#/retirement/analysis/${t.hash}`)
  await rc17Settled(page, `${seed} ${t.hash}`)
}

async function rc17Settled(page: Page, who: string): Promise<void> {
  await expect(page.locator('[data-analysis-body] .highcharts-series-group, [data-analysis-words]').first(), `${who}: neither a chart nor its words`).toBeAttached({ timeout: 90_000 })
  await expect(page.locator('[data-analysis-panel] [aria-busy="true"]'), `${who}: the runs never settled`).toHaveCount(0, { timeout: 90_000 })
  // The waiting words stand in the chart's place with no aria-busy: settled only once they are gone.
  await expect(page.locator('[data-analysis-words]', { hasText: copy.analysisRunsWaiting }), `${who}: still working out the plans`).toHaveCount(0, { timeout: 90_000 })
  await page.waitForTimeout(500)
  await settleLayout(page)
}

/** Pick a chart from the panel's title menu. */
async function pickRc17Chart(page: Page, label: string): Promise<void> {
  await page.locator('[data-analysis-panel] h2 button').click()
  await page.getByRole('menuitemradio', { name: label, exact: true }).click()
  await rc17Settled(page, label)
}

/** One frame at his window: from the top down to the handle, the caveat inside it, nothing scrolled. */
async function assertRc17Frame(page: Page, who: string): Promise<void> {
  const frame = await page.evaluate(() => ({
    scrollY: window.scrollY,
    body: document.querySelector('[data-analysis-panel]')!.getBoundingClientRect().bottom,
    caveat: document.querySelector('main.result [data-caveat]')!.getBoundingClientRect().bottom,
    handle: document.querySelector('main.result [aria-controls="b9-action-items"]')!.getBoundingClientRect().bottom,
  }))
  console.log(`[rc17-frame] ${who}: panel ${frame.body.toFixed(1)}, caveat ${frame.caveat.toFixed(1)}, handle ${frame.handle.toFixed(1)} of ${REAL.height}`)
  expect(frame.scrollY).toBe(0)
  expect(frame.caveat, `${who}: the chart, its metrics and the caveat inside the first frame`).toBeLessThanOrEqual(REAL.height)
  expect(frame.handle, `${who}: the ACTION ITEMS handle inside the first frame`).toBeLessThanOrEqual(REAL.height)
}

/** The shown chart's words: every axis tick and legend item visible, unclipped and at the floor size; no word cut. */
async function auditRc17Text(page: Page, who: string, counts: Partial<Record<'axis-label' | 'legend-item' | 'data-label', number>>, texts: readonly string[] = []): Promise<void> {
  const charts = await page.locator('[data-analysis-body] [data-chart]').evaluateAll((els) => els.map((el) => el.getAttribute('data-chart')!))
  expect(charts.length, `${who}: a chart drew`).toBeGreaterThan(0)
  const floor = await hcFloorPx(page)
  for (const c of charts) {
    expect(hcTextFailures(await hcAudit(page, `[data-chart="${c}"]`, '[data-analysis-body]'), floor, { texts: c === charts[0] ? texts : [], counts }), `${who} ${c}: the chart’s text`).toEqual([])
    const cut = (await page.locator(`[data-chart="${c}"] svg text`).allTextContents()).filter((t) => t.includes('…'))
    expect(cut, `${who} ${c}: no chart word cut short`).toEqual([])
  }
}

const rc17Metrics = (page: Page): Promise<string[]> => page.locator('[data-analysis-metric]').allInnerTexts()

/** The future select at the panel's top right. */
async function pickRc17Future(page: Page, label: string): Promise<void> {
  await page.locator('[data-analysis-panel]').getByRole('combobox', { name: copy.taxStratMarketLabel }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await rc17Settled(page, label)
}

test.describe(`RC17 · Comparisons, Savings and Retirement Details at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })

  test('?seed=retired: each tab in one frame to the handle; your plan alone, said so; Savings one chart; every metric names its market; the text audit', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 180_000)
    await gotoSeedFinal(page, 'retired')
    for (const t of RC17_TABS) {
      await toAnalysisTab(page, 'retired', t)
      const who = `retired ${t.hash}`
      await assertRc17Frame(page, who)
      await assertOneVisibleCaveat(page, REAL.height)
      await noSidewaysScroll(page, who)
      const metrics = await rc17Metrics(page)
      // Comparisons and Retirement Details draw a chart here (Savings may show its words): each with its key metric.
      if (t.hash !== 'savings') {
        await expect(page.locator('[data-analysis-body] [data-chart]').first(), `${who}: a chart`).toBeAttached()
        expect(metrics.length, `${who}: at least one key metric beside the chart`).toBeGreaterThan(0)
      }
      for (const m of metrics) expect(m, `${who}: a one-path metric names its market`).toContain('in the steady market')
    }
    // Comparisons: one side (no what-if open beside your plan), the line saying how to set one; the three charts.
    await toAnalysisTab(page, 'retired', RC17_TABS[0])
    await expect(page.locator('[data-analysis-note]').first()).toHaveText(copy.cmpNoWhatIf)
    await expect(page.locator('[data-chart="cmp-pair"] .highcharts-series')).toHaveCount(1)
    await auditRc17Text(page, 'retired assets', { 'axis-label': 4, 'data-label': 1 })
    await pickRc17Chart(page, copy.cmpChartTax)
    await auditRc17Text(page, 'retired tax', { 'axis-label': 4 })
    await assertRc17Frame(page, 'retired tax')
    await pickRc17Chart(page, copy.cmpChartAtRetirement)
    await auditRc17Text(page, 'retired at retirement', { 'axis-label': 3, 'data-label': 1 })
    // The rough market: every metric names it.
    await pickRc17Future(page, copy.workbenchViewRough)
    for (const m of await rc17Metrics(page)) expect(m, 'retired rough: the metric names the rough market').toContain('in the rough market')
    await pickRc17Future(page, copy.workbenchViewSteady)
    // Savings: an all-retired household's one chart.
    await toAnalysisTab(page, 'retired', RC17_TABS[1])
    // One chart: its title is a plain heading, no menu (`ChartTitle` with one item).
    await expect(page.locator('[data-analysis-panel] h2.text-chart-title'), 'retired: Savings offers one chart').toHaveText(slots.savThisYearOf(copy.probabilityPlanTitle))
    await expect(page.locator('[data-analysis-panel] h2 button'), 'retired: no chart menu').toHaveCount(0)
    await expect(page.locator('[data-analysis-note]', { hasText: copy.savRetiredNote })).toHaveCount(1)
    // Retirement Details: income sources, the withdrawal rate, spending, each audited and in frame.
    await toAnalysisTab(page, 'retired', RC17_TABS[2])
    await auditRc17Text(page, 'retired income', { 'axis-label': 4, 'legend-item': 2 })
    for (const label of [slots.rdRateOf(copy.probabilityPlanTitle.toLowerCase()), slots.rdSpendingOf(copy.probabilityPlanTitle.toLowerCase())]) {
      await pickRc17Chart(page, label)
      await auditRc17Text(page, `retired ${label}`, { 'axis-label': 4 })
      await assertRc17Frame(page, `retired ${label}`)
    }
    // The rough market: the money runs out in a retired year. Its band is one whole column slot inside the plot (never a
    // sliver past the last column) and its words print on ONE line over it (a band's label wraps to the band's own width
    // unless given its own).
    await pickRc17Chart(page, slots.rdIncomeSourcesOf(copy.probabilityPlanTitle.toLowerCase()))
    await pickRc17Future(page, copy.workbenchViewRough)
    const band = await page.evaluate(() => {
      const c = document.querySelector('[data-chart="rd-years"]')!
      const b = c.querySelector('.b9-ranout-band')!.getBoundingClientRect()
      const label = c.querySelector('.highcharts-plot-band-label')!.getBoundingClientRect()
      const plot = c.querySelector('.highcharts-plot-background')!.getBoundingClientRect()
      const centres = [...new Set([...c.querySelectorAll('.highcharts-series .highcharts-point')].map((p) => p.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => Math.round(r.x + r.width / 2)))].sort((p, q) => p - q)
      const slot = centres.length > 1 ? (centres.at(-1)! - centres[0]!) / (centres.length - 1) : 0
      const fontPx = Number.parseFloat(getComputedStyle(c.querySelector('.highcharts-plot-band-label')!).fontSize)
      return { width: b.width, right: b.right, plotRight: plot.right, slot, labelHeight: label.height, labelWidth: label.width, fontPx, lastCentre: centres.at(-1)! }
    })
    console.log(`[rc17-band] ${JSON.stringify(band)}`)
    expect(band.slot, 'the columns drew').toBeGreaterThan(0)
    expect(Math.abs(band.width - band.slot), `the band (${band.width.toFixed(1)} px) is one column slot (${band.slot.toFixed(1)} px)`).toBeLessThanOrEqual(2)
    expect(band.right, 'the band inside the plot').toBeLessThanOrEqual(band.plotRight + 1)
    expect(band.right - band.lastCentre, 'the band stands beside the last column').toBeGreaterThan(band.slot)
    expect(band.labelHeight, `the band's words on one line (${band.labelHeight.toFixed(1)} px tall at ${band.fontPx} px)`).toBeLessThan(band.fontPx * 1.8)
    expect(band.labelWidth, 'the words wider than the band: never one word per line').toBeGreaterThan(band.width)
    await pickRc17Future(page, copy.workbenchViewSteady)
  })

  test('?seed=dip: a stop-year what-if beside your plan; the two bars as retirement begins, each named with its own year, drawn in the ratio of their figures; each tab in one frame', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 240_000)
    await openTrayOn(page, 'dip')
    const stop = tray(page).locator('[data-tray-row="stop-year"] input[inputmode="numeric"]')
    const year = Number(await stop.inputValue())
    await stop.fill(String(year + 2))
    await stop.press('Enter')
    await tray(page).locator('[data-tray-refresh]').click()
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the stop-year run never landed').toHaveCount(0, { timeout: 120_000 })
    await trayHandle(page).click()
    await expect(tray(page)).toHaveCount(0)
    for (const t of RC17_TABS) {
      await toAnalysisTab(page, 'dip', t)
      await assertRc17Frame(page, `dip ${t.hash}`)
      await assertOneVisibleCaveat(page, REAL.height)
    }
    await toAnalysisTab(page, 'dip', RC17_TABS[0])
    await expect(page.locator('[data-chart="cmp-pair"] .highcharts-series'), 'two sides').toHaveCount(2)
    await auditRc17Text(page, 'dip assets', { 'axis-label': 4, 'data-label': 2, 'legend-item': 2 })
    await pickRc17Chart(page, copy.cmpChartAtRetirement)
    await auditRc17Text(page, 'dip at retirement', { 'axis-label': 4, 'data-label': 2 })
    const bars = await page.evaluate(() => {
      const c = document.querySelector('[data-chart="cmp-bars"]')!
      const pts = [...c.querySelectorAll('.highcharts-series .highcharts-point')].map((p) => p.getBoundingClientRect().height)
      const figs = [...c.querySelectorAll('.highcharts-data-label text')].map((t) => t.textContent ?? '')
      const names = [...c.querySelectorAll('.highcharts-xaxis-labels text')].map((t) => t.textContent ?? '')
      return { pts, figs, names }
    })
    expect(bars.pts.length, 'two bars').toBe(2)
    expect(bars.names.join(' | '), 'each bar names its own first retired year').toContain(String(year + 2))
    expect(bars.names.join(' | ')).toContain(String(year))
    const dollars = bars.figs.map(wholeDollars)
    expect(dollars.every((d) => d > 0), `the figures ${bars.figs.join(', ')}`).toBe(true)
    expect(dollars[0], 'the later stop opens retirement with more').toBeGreaterThan(dollars[1]!)
    expect(Math.abs(bars.pts[1]! - bars.pts[0]! * (dollars[1]! / dollars[0]!)), `the bars’ heights (${bars.pts.join(', ')}) in the ratio of ${bars.figs.join(' to ')}`).toBeLessThanOrEqual(5)
    // Savings: a working household's four charts on each side.
    await toAnalysisTab(page, 'dip', RC17_TABS[1])
    await page.locator('[data-analysis-panel] h2 button').click()
    await expect(page.getByRole('menuitemradio'), 'dip: four Savings charts on each of two sides').toHaveCount(8)
    await page.keyboard.press('Escape')
    await auditRc17Text(page, 'dip this year', { 'axis-label': 3 })
    // Retirement Details' income comparison: the two rings, their caption and the key, in one frame.
    await toAnalysisTab(page, 'dip', RC17_TABS[2])
    await pickRc17Chart(page, copy.rdChartIncomeComparison)
    await expect(page.locator('[data-rd-donut]')).toHaveCount(2)
    await assertRc17Frame(page, 'dip income comparison')
  })

  test('?seed=dateshort: every working year runs short, drawn below the zero line; Savings and Retirement Details in one frame and audited', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 180_000)
    await gotoSeedFinal(page, 'dateshort')
    await toAnalysisTab(page, 'dateshort', RC17_TABS[1])
    await pickRc17Chart(page, slots.savLeftOverOf(copy.probabilityPlanTitle))
    await assertRc17Frame(page, 'dateshort left over')
    await auditRc17Text(page, 'dateshort left over', { 'axis-label': 4 })
    const below = await page.evaluate(() => [...document.querySelectorAll('[data-chart="sav-years"] .highcharts-yaxis-labels text')].some((t) => (t.textContent ?? '').startsWith('(')))
    expect(below, 'dateshort: the axis runs below $0 for the short years').toBe(true)
    // Every working year short: no left-over line, only what the short years draw from savings.
    expect((await rc17Metrics(page))[0]).toMatch(/the working years that run short draw ~\$[\d,]+ from your savings in all, in the steady market\.$/)
    await pickRc17Chart(page, slots.savPerYearOf(copy.probabilityPlanTitle))
    await auditRc17Text(page, 'dateshort per year', { 'axis-label': 4 })
    await toAnalysisTab(page, 'dateshort', RC17_TABS[2])
    await assertRc17Frame(page, 'dateshort income')
    await auditRc17Text(page, 'dateshort income', { 'axis-label': 4, 'legend-item': 2 })
  })
})

test.describe(`RC17 · Comparisons, Savings and Retirement Details on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })

  test('?seed=dip: each tab with no sideways scroll, the caveat reached, the text audit', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 180_000)
    await gotoSeedFinal(page, 'dip')
    for (const t of RC17_TABS) {
      await toAnalysisTab(page, 'dip', t)
      const who = `dip PHONE ${t.hash}`
      await noSidewaysScroll(page, who)
      await auditRc17Text(page, who, { 'axis-label': 3 })
      await assertOneVisibleCaveat(page, null)
      await assertCaveatReachable(page, who)
    }
  })
})

// ── RC20 · Cash Flows → Maps (plan 6, RC20's Verification) ──────────────────────────────────────────────────────────
// On `retired` (the spine) and `dip` (a working household, its stop year marked). THE FIT (the builder's call, RC20): the
// map's own frame at his window holds the title, the selects, the year scrubber, the year's one-path sentence and the
// whole Sankey with every name and amount, nothing scrolled; the page's notes and the R13 caveat follow in order, as on
// the Summary (Maps carries the same lines, which no frame can also hold), the caveat tied to the map and reached. Every
// node prints its name and amount, each label passing the Highcharts text audit and the marks audit (a label over a bar
// or another label fails; the pale flows are drawn under the names on purpose, RightCapital's picture, so they are not
// marks); the labels counted against the drawn bars, so "found no labels" fails (insight 168). The scrubber's year and
// both ages are the Summary's row for that year, at the first year and after the arrow keys move it.
const RC20_SEEDS = ['retired', 'dip'] as const
const MAPS_CHART = '[data-chart="maps-flow"]'

/** The Summary's Year and Age cells for each row, read before Maps opens (the table's own words). */
async function summaryYearsAndAges(page: Page): Promise<{ year: string; age: string }[]> {
  return cfFrame(page).locator('tbody tr').evaluateAll((trs) =>
    trs.map((tr) => {
      const cells = [...tr.querySelectorAll('th, td')].map((c) => (c.textContent ?? '').trim())
      return { year: cells[0] ?? '', age: cells[1] ?? '' }
    }),
  )
}

async function toMaps(page: Page): Promise<void> {
  await page.getByRole('tab', { name: copy.cashFlowsTabMaps }).click()
  await expect(page.locator('[data-maps]')).toBeAttached({ timeout: FINAL_TIER_MS })
}

/** The flow drawn for the shown year, and settled. */
async function mapsDrawn(page: Page, who: string): Promise<void> {
  await expect(page.locator(`${MAPS_CHART} .highcharts-node`).first(), `${who}: the Sankey never drew`).toBeAttached({ timeout: 60_000 })
  await page.waitForTimeout(300)
  await settleLayout(page)
}

/** Every node's name and amount printed, legible, unclipped, clear of every bar and every other name; counted. */
async function auditMaps(page: Page, who: string): Promise<number> {
  const nodes = await page.locator(`${MAPS_CHART} .highcharts-node`).count()
  expect(nodes, `${who}: the year's Sankey draws its bars`).toBeGreaterThanOrEqual(3)
  const floor = await hcFloorPx(page)
  expect(hcTextFailures(await hcAudit(page, MAPS_CHART, '[data-analysis-seat]'), floor, { texts: [], counts: { 'data-label': nodes } }), `${who}: the map's words`).toEqual([])
  const m = await hcMarks(page, MAPS_CHART, '[data-analysis-seat]', '.highcharts-link')
  expect(m.marks.length, `${who}: the marks read are the bars`).toBe(nodes)
  expect(m.labels.length, `${who}: one name and amount per bar`).toBe(nodes)
  for (const l of m.labels) expect(l.text, `${who}: a node prints its name and amount`).toMatch(/^.+(: |[\s\u200b])~?\$[\d,]+$/)
  expect(hcMarkFailures(m), `${who}: no name over a bar or another name`).toEqual([])
  const cut = (await page.locator(`${MAPS_CHART} svg text`).allTextContents()).filter((t) => t.includes('…'))
  expect(cut, `${who}: no word cut short`).toEqual([])
  return nodes
}

/** The scrubber's spoken value and its readout name the Summary's row: its year and both ages. */
async function assertScrubberRow(page: Page, rows: readonly { year: string; age: string }[], k: number, who: string): Promise<void> {
  const row = rows[k]!
  const input = page.locator('[data-maps-thumb] input')
  await expect(input, `${who}: the slider's value text names the row's year and both ages`).toHaveAttribute('aria-valuetext', new RegExp(`^${row.year}, age ${row.age.replace(/[/]/g, '\\/')}(:|$)`))
  const said = (await input.getAttribute('aria-valuetext')) ?? ''
  const shown = await page.locator('[data-maps-year]:visible, [data-maps-year-phone]:visible').first().textContent()
  expect(shown, `${who}: the readout prints what the slider says`).toBe(said)
}

test.describe(`RC20 · Cash Flows → Maps at his window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr, compact mode)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  for (const seed of RC20_SEEDS) {
    test(`?seed=${seed}: Maps — the map in one frame, every node's name and amount audited and clear of every bar, the scrubber on the Summary's rows, the caveat tied and reached, then the tiles`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 180_000)
      await toCashFlows(page, seed, false)
      const rows = await summaryYearsAndAges(page)
      expect(rows.length, '[test setup] the Summary drew its rows').toBeGreaterThan(10)
      await toMaps(page)
      await mapsDrawn(page, seed)
      // The tabs in RightCapital's order; no download (no table), the future select where it stood.
      expect(await page.getByRole('tab').allTextContents()).toEqual([copy.cashFlowsTabMaps, copy.cashFlowsTabSummary, copy.cashFlowsTabAccounts])
      await expect(page.getByRole('button', { name: copy.cashFlowsDownloadLabel })).toHaveCount(0)
      await expect(cfSelect(page, copy.workbenchViewLegend)).toBeVisible()
      await assertScrubberRow(page, rows, 0, `${seed} first year`)
      expect((await page.locator('[data-maps-key]').textContent()) ?? '', `${seed}: the one-path sentence names its market`).toContain('in the steady market')
      if (seed === 'dip') {
        await expect(page.locator('[data-maps-stop]'), 'dip: the year work stops is marked on the line').toHaveCount(1)
        await expect(page.locator('[data-maps-stop-word]')).toHaveText(copy.mapsWorkStops)
      }
      // THE FRAME: nothing scrolled; the title, the selects, the scrubber, the sentence and the whole map with every
      // label inside his window.
      const frame = await page.evaluate((sel) => {
        const chart = document.querySelector(sel)!
        const labels = [...chart.querySelectorAll('.highcharts-data-label')].map((l) => l.getBoundingClientRect().bottom)
        return {
          scrollY: window.scrollY,
          scrubber: document.querySelector('[data-maps-scrubber]')!.getBoundingClientRect().bottom,
          chart: chart.getBoundingClientRect().bottom,
          labels: Math.max(...labels),
        }
      }, MAPS_CHART)
      console.log(`[rc20-frame] ${seed}: ${JSON.stringify(frame)} of ${REAL.height}`)
      expect(frame.scrollY).toBe(0)
      expect(frame.chart, `${seed}: the whole map inside his window`).toBeLessThanOrEqual(REAL.height)
      expect(frame.labels, `${seed}: every name and amount inside his window`).toBeLessThanOrEqual(REAL.height)
      console.log(`[rc20-nodes] ${seed} first year: ${await auditMaps(page, `${seed} first year`)}`)
      await assertOneVisibleCaveat(page, null)
      await noSidewaysScroll(page, `${seed} Maps`)
      // The keyboard: three years on, a fresh map for that year, audited again, on the Summary's row.
      await page.locator('[data-maps-thumb] input').focus()
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
      await assertScrubberRow(page, rows, 3, `${seed} three years on`)
      await mapsDrawn(page, `${seed} three years on`)
      await auditMaps(page, `${seed} three years on`)
      // Past the year work stops, where the run has one (the working household's map changes shape there).
      if ((await page.locator('[data-maps-stop]').count()) > 0) {
        for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
        await assertScrubberRow(page, rows, 9, `${seed} nine years on`)
        if ((await page.locator('[data-maps-words]').count()) === 0) {
          await mapsDrawn(page, `${seed} nine years on`)
          await auditMaps(page, `${seed} nine years on`)
        }
      }
      // End: the last year.
      await page.locator('[data-maps-thumb] input').focus()
      await page.keyboard.press('End')
      await assertScrubberRow(page, rows, rows.length - 1, `${seed} last year`)
      await assertCaveatReachable(page, `${seed} Maps`)
      // The tiles: the two totals over their groups' tiles, no sideways scroll.
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('[data-cash-flows-head]').getByRole('combobox', { name: copy.mapsViewLabel }).click()
      await page.getByRole('option', { name: copy.mapsViewBreakdown, exact: true }).click()
      await expect(page.locator('[data-maps-tiles], [data-maps-words]').first()).toBeVisible()
      await page.locator('[data-maps-thumb] input').focus()
      await page.keyboard.press('Home')
      await expect(page.locator('[data-maps-tiles]')).toBeVisible()
      await expect(page.locator('[data-maps-total="in"]')).toContainText(copy.mapsTotalIn)
      await expect(page.locator('[data-maps-total="out"]')).toContainText(copy.mapsTotalOut)
      expect(await page.locator('[data-maps-tile]').count(), `${seed}: the groups' tiles`).toBeGreaterThanOrEqual(3)
      await noSidewaysScroll(page, `${seed} Breakdown`)
      await assertOneVisibleCaveat(page, null)
    })
  }

  test('?seed=retired: the rough market’s last year, where the money runs out, gets words and a mark, never a map', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 120_000)
    await toCashFlows(page, 'retired', false)
    await pickCf(page, copy.workbenchViewLegend, copy.workbenchViewRough)
    await cfLanded(page)
    const rows = await summaryYearsAndAges(page)
    await toMaps(page)
    await mapsDrawn(page, 'retired rough')
    await expect(page.locator('[data-maps-key]')).toContainText('in the rough market')
    await page.locator('[data-maps-thumb] input').focus()
    await page.keyboard.press('End')
    const year = Number(rows.at(-1)!.year)
    await expect(page.locator('[data-maps-words][role="alert"]')).toHaveText(slots.mapsRanOut(year))
    await expect(page.locator('[data-maps-end="right"]')).toContainText(copy.cashFlowsShortYear)
    await expect(page.locator(MAPS_CHART)).toHaveCount(0)
    await expect(page.locator('[data-cash-flows-lines]')).toContainText(slots.mapsRunsOut(year))
    await assertOneVisibleCaveat(page, null)
  })
})

test.describe(`RC20 · Cash Flows → Maps on the phone (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  for (const seed of RC20_SEEDS) {
    test(`?seed=${seed}: Maps — the tiles in place of the flow, said so; no sideways scroll; the scrubber on the Summary's rows; the caveat reached`, async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      await toCashFlows(page, seed, true)
      const rows = await summaryYearsAndAges(page)
      await toMaps(page)
      await expect(page.locator('[data-maps-tiles]'), `${seed}: the phone shows the tiles`).toBeVisible()
      await expect(page.locator(MAPS_CHART)).toHaveCount(0)
      await expect(page.locator('[data-maps-phone-note]')).toHaveText(copy.mapsPhoneTiles)
      await expect(page.getByRole('combobox', { name: copy.mapsViewLabel }), 'no view select on the phone').toBeHidden()
      await assertScrubberRow(page, rows, 0, `${seed} PHONE first year`)
      await noSidewaysScroll(page, `${seed} PHONE Maps`)
      await page.locator('[data-maps-thumb] input').focus()
      await page.keyboard.press('ArrowRight')
      await assertScrubberRow(page, rows, 1, `${seed} PHONE next year`)
      await noSidewaysScroll(page, `${seed} PHONE next year`)
      await assertOneVisibleCaveat(page, null)
      await assertCaveatReachable(page, `${seed} PHONE Maps`)
    })
  }
})
