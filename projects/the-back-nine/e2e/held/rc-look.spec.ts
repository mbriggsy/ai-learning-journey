import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, gotoSeedFinal, gotoVaultFinal, settleLayout, test } from '../reviewSurface'
import { copy } from '../../src/ui/copy'

/**
 * e2e/held/rc-look.spec.ts: an INSTRUMENT, never a gate (Act 6's "Local look", plan docs/plans/6-rightcapital-ui-plan.md
 * sections 4.0 and 7.1 point 4). For each unit it captures every finished screen at his window (1440×731 @2) and a phone
 * (390×844 @3), for a retired seed (`retired`) and a working one (`date`; `RC_SEEDS=retired,dip` names others), entered as a
 * user lands (since RC4 the seed's settled answer lands on the home), and audits each frame:
 *  - the page never scrolls sideways;
 *  - no text is clipped (an element whose content is wider or taller than a box that hides its overflow; an ellipsis
 *    counts as clipped, since the kit never cuts text to fit);
 *  - no two visible controls overlap;
 *  - no text under 12 CSS px.
 * The phone's menu is captured open too, and since RC4b Probability's Action Items tray: open with one changed row, after
 * its Refresh (Apply's words on the working seed, a stop year pulled), and its Edit drawer. Screenshots land in the repo's gitignored `temp/rc-shots/<unit>/`, named
 * `<screen>-<seed>-<size>.png`, for Briggsy to review the output.
 *
 *     RC_UNIT=RC2 pnpm exec playwright test --config e2e/held/shots.config.ts rc-look
 */

const UNIT = process.env.RC_UNIT ?? 'RC2'
const OUT = `temp/rc-shots/${UNIT}` // resolved from the run's working directory, the project root
const SEEDS = (process.env.RC_SEEDS ?? 'retired,date').split(',')
const SCREENS = [
  { id: 'snapshot', screen: 'snapshot', module: copy.shellModuleDashboard, page: copy.shellPageSnapshot },
  { id: 'probability', screen: 'probability', module: copy.shellModuleRetirement, page: copy.shellPageAnalysis },
  { id: 'health-care', screen: 'health-care', module: copy.shellModuleRetirement, page: copy.shellPageHealthCare },
  { id: 'cash-flows', screen: 'cash-flows', module: copy.shellModuleRetirement, page: copy.shellPageCashFlows },
  { id: 'tax-strategies', screen: 'tax-strategies', module: copy.shellModuleTax, page: copy.shellPageTaxStrategies },
  { id: 'facts', screen: 'interim-facts', module: copy.shellModuleProfile, page: copy.workbenchPageFacts },
  { id: 'social-security', screen: 'social-security', module: copy.shellModuleRetirement, page: copy.shellPageSocialSecurity },
] as const

interface Audit {
  readonly sideways: number
  readonly clipped: readonly string[]
  readonly overlaps: readonly string[]
  readonly tiny: readonly string[]
}

async function audit(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const shown = (el: Element) => {
      if (el.closest('details:not([open])') !== null && el.closest('summary') === null) return false
      if (el.closest('[aria-hidden="true"], .sr-only, .highcharts-visually-hidden, [inert]') !== null) return false
      // A visually hidden form control (Base UI's select and slider inputs, clipped to nothing for assistive tech).
      if (getComputedStyle(el).clipPath === 'inset(50%)') return false
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
    }
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')} "${(el.textContent ?? '').trim().slice(0, 40)}"`
    const hasText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
    const all = [...document.body.querySelectorAll('*')].filter(shown)
    const clipped = all
      .filter((el) => {
        const cs = getComputedStyle(el)
        if (cs.textOverflow === 'ellipsis' || Number(cs.webkitLineClamp) > 0) return true
        const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
        const hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
        return (hidesX && el.scrollWidth > el.clientWidth + 1) || (hidesY && hasText(el) && el.scrollHeight > el.clientHeight + 1)
      })
      .map(name)
    const controls = all.filter((el) => el.matches('a[href], button, input, select, textarea, summary, label.segment, [role="menuitem"]'))
    const overlaps: string[] = []
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i]!
        const b = controls[j]!
        if (a.contains(b) || b.contains(a)) continue
        const ra = a.getBoundingClientRect()
        const rb = b.getBoundingClientRect()
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
        if (ix > 1 && iy > 1) overlaps.push(`${name(a)} × ${name(b)}`)
      }
    }
    const tiny = all.filter((el) => hasText(el) && parseFloat(getComputedStyle(el).fontSize) < 12).map(name)
    return { sideways: doc.scrollWidth - doc.clientWidth, clipped, overlaps, tiny }
  })
}

async function enterShell(page: Page, seed: string): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen]')).toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
}

/** Probability's charts settled: the plan's ring, and on the retired route both balance bars drawn and morphed. */
async function settleProbability(page: Page): Promise<void> {
  await expect(page.locator('[data-ring-half="compared"]')).toBeVisible({ timeout: 60_000 })
  if ((await page.locator('[data-probability="headline"]').count()) > 0) {
    await expect(page.locator('[data-bar="compared"] .highcharts-series-group')).toBeAttached({ timeout: 60_000 })
  }
  await page.waitForTimeout(800)
}

async function showScreen(page: Page, target: (typeof SCREENS)[number], phone: boolean): Promise<void> {
  if (phone) {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: target.page, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.shellMenuTitle })).toHaveCount(0)
  } else {
    const moduleLink = page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: target.module, exact: true })
    if ((await moduleLink.getAttribute('aria-current')) !== 'page') await moduleLink.click()
    const pageLink = page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: target.page, exact: true })
    if ((await pageLink.getAttribute('aria-current')) !== 'page') await pageLink.click()
  }
  await expect(page.locator(`main.result[data-shell-screen="${target.screen}"]`)).toBeAttached()
  if (target.screen === 'probability') await settleProbability(page)
  if (target.screen === 'snapshot') {
    // The fan's lazy chunk and its 250 ms morph (a seed with no band draws words instead).
    await expect(page.locator('[data-card="fan"] [data-chart="fan"] .highcharts-series-group, [data-card="fan"] p').first()).toBeAttached({ timeout: 30_000 })
    await page.waitForTimeout(600)
  }
  if (target.screen === 'cash-flows') await expect(page.locator('[data-table-frame], [data-cash-flows-state][role="alert"]').first()).toBeVisible({ timeout: 60_000 })
  if (target.screen === 'social-security') await settleClaims(page, 'claims-annual')
  if (target.screen === 'health-care') await settleHealth(page)
  await settleLayout(page)
}

/** Social Security's shown view settled: the named chart drawn (the date route's runs can take a minute), or the page's
 *  own words where it has no choices (never the "working out" words, which a run's landing replaces). */
async function settleClaims(page: Page, chart: string): Promise<void> {
  await expect(page.locator(`[data-chart="${chart}"] .highcharts-series-group, [data-claims-page]`).first()).toBeAttached({ timeout: 240_000 })
  await page.waitForTimeout(600)
}

/** Health Care's four small charts drawn (the working route's steady rows take a while), or the page's own words. */
async function settleHealth(page: Page): Promise<void> {
  await expect(page.locator('[data-chart="health-extras"] .highcharts-series-group, [data-health-page]').first()).toBeAttached({ timeout: 240_000 })
  await page.waitForTimeout(600)
}

const SIZES = [
  { tag: '1440x731', use: { viewport: REAL, deviceScaleFactor: REAL_DPR }, phone: false },
  { tag: '390x844', use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true }, phone: true },
] as const

for (const size of SIZES) {
  test.describe(`${UNIT} look at ${size.tag}`, () => {
    test.use(size.use)
    for (const seed of SEEDS) {
      test(`?seed=${seed}: every shell screen captured and audited`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        for (const target of SCREENS) {
          await showScreen(page, target, size.phone)
          const a = await audit(page)
          findings[target.id] = a
          await page.screenshot({ path: `${OUT}/${target.id}-${seed}-${size.tag}.png` })
          await page.screenshot({ path: `${OUT}/${target.id}-${seed}-${size.tag}-full.png`, fullPage: true })
        }
        // The Action Items tray (RC4b): open, one row changed (the working seed's stop year two years on; a retired seed's
        // spending $10,000 lower), then refreshed, then its Edit drawer.
        await showScreen(page, SCREENS[1], size.phone)
        if ((await page.locator('[data-probability]').count()) > 0 && (await page.locator('[data-probability="pending"], [data-probability="fallback"], [data-probability="error"]').count()) === 0) {
          await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          const tray = page.locator('#b9-action-items')
          await expect(tray).toBeVisible()
          await page.waitForTimeout(400)
          const stop = tray.locator('[data-tray-row="stop-year"] input[inputmode="numeric"]')
          if ((await stop.count()) > 0) {
            const year = Number(await stop.inputValue())
            await stop.fill(String(year + 2))
            await stop.press('Enter')
          } else {
            const spend = tray.locator('[data-tray-row="spending:total"] input').first()
            if ((await spend.count()) > 0) {
              const v = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
              await spend.fill(String(v - 10_000))
              await spend.press('Enter')
            }
          }
          const changed = tray.locator('[data-changed]').first()
          if ((await changed.count()) > 0) await changed.scrollIntoViewIfNeeded()
          await settleLayout(page)
          findings['tray'] = await audit(page)
          await page.screenshot({ path: `${OUT}/tray-${seed}-${size.tag}.png` })
          await page.screenshot({ path: `${OUT}/tray-${seed}-${size.tag}-full.png`, fullPage: true })
          await tray.getByRole('button', { name: copy.trayRefresh, exact: true }).click()
          await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 90_000 })
          await page.waitForTimeout(800)
          await tray.locator('[data-tray-words]').scrollIntoViewIfNeeded()
          await settleLayout(page)
          findings['tray-refreshed'] = await audit(page)
          await page.screenshot({ path: `${OUT}/tray-refreshed-${seed}-${size.tag}.png` })
          await page.screenshot({ path: `${OUT}/tray-refreshed-${seed}-${size.tag}-full.png`, fullPage: true })
          await tray.getByRole('button', { name: copy.trayEdit, exact: true }).click()
          const edit = page.getByRole('dialog', { name: copy.trayEditTitle })
          await expect(edit).toBeVisible()
          await page.waitForTimeout(500)
          await settleLayout(page)
          findings['tray-edit'] = await audit(page)
          await page.screenshot({ path: `${OUT}/tray-edit-${seed}-${size.tag}.png` })
          await page.keyboard.press('Escape')
          await expect(edit).toHaveCount(0)
          if (size.phone) {
            await page.keyboard.press('Escape')
            await expect(tray).toHaveCount(0)
          }
        }
        // Probability's second chart, Odds by stop year (the working route only): the chart title's menu.
        await showScreen(page, SCREENS[1], size.phone)
        if ((await page.locator('[data-probability="date"]').count()) > 0) {
          await page.getByRole('button', { name: copy.probabilityChartRings }).click()
          await page.getByRole('menuitemradio', { name: copy.probabilityChartOdds }).click()
          await expect(page.locator('[data-chart="odds"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
          await page.waitForTimeout(800)
          await settleLayout(page)
          findings['odds'] = await audit(page)
          await page.screenshot({ path: `${OUT}/odds-${seed}-${size.tag}.png` })
          await page.screenshot({ path: `${OUT}/odds-${seed}-${size.tag}-full.png`, fullPage: true })
        }
        if (size.phone) {
          await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
          const sheet = page.getByRole('dialog', { name: copy.shellMenuTitle })
          await expect(sheet).toBeVisible()
          // The sheet drops in on a transition that may not have started when the settle looks: wait for it to rest.
          await expect.poll(() => sheet.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0)
          await settleLayout(page)
          findings['menu'] = await audit(page)
          await page.screenshot({ path: `${OUT}/menu-${seed}-${size.tag}.png` })
          await page.keyboard.press('Escape')
        } else {
          await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
          await expect(page.getByRole('menu')).toBeVisible()
          await settleLayout(page)
          findings['lock'] = await audit(page)
          await page.screenshot({ path: `${OUT}/lock-${seed}-${size.tag}.png` })
          await page.keyboard.press('Escape')
        }
        test.info().annotations.push({ type: 'audit', description: JSON.stringify(findings) })
        console.log(`[rc-look ${UNIT} ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}

// Tax Strategies over a vault plant carrying a saved recommendation (`?vault=rec`): the record card above the empty state
// (RC8), at both sizes, and Snapshot's Recommendations card over the same record.
for (const size of SIZES) {
  test.describe(`${UNIT} look, the saved recommendation at ${size.tag}`, () => {
    test.use(size.use)
    test('?vault=rec: Tax Strategies with the record card, and the home’s Recommendations card', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      await gotoVaultFinal(page, 'rec')
      await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached({ timeout: 30_000 })
      await page.locator('[data-card="recommendations"]').scrollIntoViewIfNeeded()
      await settleLayout(page)
      await page.screenshot({ path: `${OUT}/snapshot-rec-${size.tag}-full.png`, fullPage: true })
      await showScreen(page, SCREENS[4], size.phone)
      const a = await audit(page)
      await page.screenshot({ path: `${OUT}/tax-strategies-rec-${size.tag}.png` })
      await page.screenshot({ path: `${OUT}/tax-strategies-rec-${size.tag}-full.png`, fullPage: true })
      console.log(`[rc-look ${UNIT} rec ${size.tag}] ${JSON.stringify(a)}`)
      expect.soft(a.sideways, 'sideways scroll').toBeLessThanOrEqual(0)
      expect.soft(a.tiny, 'text under 12 px').toEqual([])
    })
  })
}

// RC5: the plan list and kept what-ifs, on a retired and a working household holding three kept what-ifs each
// (`retiredkept`, `dipkept`) and on their bases with none (`retired`, `dip`): the list empty and full, a row's actions
// on hover, a rename in progress, the inline Keep box, the two pickers open, and a two-up of two kept what-ifs.
const KEPT_LOOK = [
  { seed: 'retiredkept', empty: 'retired', right: 'Spend a little less', left: 'Pre-tax savings first' },
  { seed: 'dipkept', empty: 'dip', right: 'Stop a year later', left: 'Pre-tax savings first' },
] as const

async function shot(page: Page, findings: Record<string, Audit>, id: string, seed: string, tag: string): Promise<void> {
  await settleLayout(page)
  findings[id] = await audit(page)
  await page.screenshot({ path: `${OUT}/${id}-${seed}-${tag}.png` })
}

async function openList(page: Page): Promise<void> {
  const pencil = page.getByRole('button', { name: copy.planListOpenLabel })
  await pencil.scrollIntoViewIfNeeded()
  await pencil.click()
  const list = page.getByRole('dialog', { name: copy.planListTitle })
  await expect(list).toBeVisible()
  await page.waitForTimeout(500)
}

async function closeList(page: Page): Promise<void> {
  await page.getByRole('dialog', { name: copy.planListTitle }).getByRole('button', { name: copy.planListDone }).click()
  await expect(page.getByRole('dialog', { name: copy.planListTitle })).toHaveCount(0)
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, the plan list at ${size.tag}`, () => {
    test.use(size.use)
    for (const k of KEPT_LOOK) {
      test(`?seed=${k.empty}: the plan list with nothing kept`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 60_000)
        const findings: Record<string, Audit> = {}
        await enterShell(page, k.empty)
        await showScreen(page, SCREENS[1], size.phone)
        await openList(page)
        await shot(page, findings, 'plan-list-empty', k.empty, size.tag)
        const a = findings['plan-list-empty']!
        expect.soft(a.sideways, 'sideways scroll').toBeLessThanOrEqual(0)
        expect.soft(a.clipped, 'clipped text').toEqual([])
        expect.soft(a.overlaps, 'overlapping controls').toEqual([])
        expect.soft(a.tiny, 'text under 12 px').toEqual([])
      })
      test(`?seed=${k.seed}: the plan list full, a row's actions, a rename, the Keep box, the pickers, a two-up`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS * 2 + 180_000)
        const findings: Record<string, Audit> = {}
        // One page load per test: a second load in one test loses the phone's touch emulation (`(hover: hover)` then
        // reads true and the row actions read as a laptop's, faded until hovered). The empty list has its own test above.
        await enterShell(page, k.seed)
        await showScreen(page, SCREENS[1], size.phone)
        for (const [id, name] of [['pickers-left', copy.probabilityPickerLabel], ['pickers-right', copy.probabilityComparedLabel]] as const) {
          const picker = page.getByRole('combobox', { name })
          await picker.scrollIntoViewIfNeeded()
          await picker.click()
          await expect(page.getByRole('listbox')).toBeVisible()
          await page.waitForTimeout(300)
          await shot(page, findings, id, k.seed, size.tag)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('listbox')).toHaveCount(0)
        }
        // The two-up: a kept what-if on each side.
        for (const [name, option] of [[copy.probabilityComparedLabel, k.right], [copy.probabilityPickerLabel, k.left]] as const) {
          await page.getByRole('combobox', { name }).click()
          await page.getByRole('option', { name: option, exact: true }).click()
          await expect(page.getByRole('listbox')).toHaveCount(0)
        }
        for (const side of ['alternative', 'compared'] as const) {
          await expect(page.locator(`[data-half="${side}"] [aria-busy="true"]`)).toHaveCount(0, { timeout: 120_000 })
          // Landed: a count in the ring, or words that are not the run's own "working" line (a refusal, the waiting line).
          await expect
            .poll(() => page.locator(`[data-half="${side}"]`).evaluate((el, working) => el.querySelector('[data-ring-centre]') !== null || [...el.querySelectorAll('[data-half-status]')].some((n) => n.textContent !== working), copy.workbenchRailWorking), { timeout: 240_000 })
            .toBe(true)
        }
        await page.waitForTimeout(1_000)
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, findings, 'two-up', k.seed, size.tag)
        await page.screenshot({ path: `${OUT}/two-up-${k.seed}-${size.tag}-full.png`, fullPage: true })
        // The list: full, then a row's actions (hovered at the laptop; always shown on the phone).
        await openList(page)
        await shot(page, findings, 'plan-list', k.seed, size.tag)
        const list = page.getByRole('dialog', { name: copy.planListTitle })
        const row = list.locator('[data-kept-row]').first()
        if (!size.phone) await row.hover()
        await page.waitForTimeout(300)
        await shot(page, findings, 'plan-list-hover', k.seed, size.tag)
        // A rename in progress.
        const second = list.locator('[data-kept-row]').nth(1)
        if (!size.phone) await second.hover()
        await second.getByRole('button', { name: copy.planListRename }).click()
        await list.locator('[data-kept-name]').fill('Pre-tax first, then')
        await shot(page, findings, 'plan-list-rename', k.seed, size.tag)
        await list.getByRole('button', { name: copy.planListNameCancel }).click()
        await closeList(page)
        // The Keep box: a new what-if (one row changed and refreshed), then Keep in the list.
        await page.getByRole('combobox', { name: copy.probabilityPickerLabel }).click()
        await page.getByRole('option', { name: copy.probabilityPickNew, exact: true }).click()
        await expect(page.getByRole('listbox')).toHaveCount(0)
        const handle = page.getByRole('button', { name: copy.trayHandle, exact: true })
        await handle.scrollIntoViewIfNeeded()
        await handle.click()
        const tray = page.locator('#b9-action-items')
        await expect(tray).toBeVisible()
        const stop = tray.locator('[data-tray-row="stop-year"] input[inputmode="numeric"]')
        if ((await stop.count()) > 0) {
          await stop.fill(String(Number(await stop.inputValue()) + 2))
          await stop.press('Enter')
        } else {
          const spend = tray.locator('[data-tray-row="spending:total"] input').first()
          await spend.fill(String(Number((await spend.inputValue()).replace(/[^0-9]/g, '')) - 10_000))
          await spend.press('Enter')
        }
        await tray.getByRole('button', { name: copy.trayRefresh, exact: true }).click()
        await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 120_000 })
        if (size.phone) {
          await page.keyboard.press('Escape')
          await expect(tray).toHaveCount(0)
        }
        await openList(page)
        await list.getByRole('button', { name: copy.planListKeep }).click()
        await list.getByLabel(copy.planListNameLabel).fill('Lean years')
        await shot(page, findings, 'plan-list-keep', k.seed, size.tag)
        console.log(`[rc-look ${UNIT} plan list ${k.seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}

// RC6: Retirement → Cash Flows, on a retired and a working household holding kept what-ifs (`retiredkept`, `dipkept`),
// and the table's widest household (`tablewidest`): the Summary, a drill open with its breadcrumb, the Accounts tab with
// its table switcher open, the Rough future, a kept what-if picked, and your plan beside the what-if open on Analysis.
const CASH_FLOWS = SCREENS[3]

async function pickOn(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
}

async function tableLanded(page: Page): Promise<void> {
  await expect(page.locator('[data-table-frame]')).toBeVisible({ timeout: 90_000 })
  await expect(page.locator('[data-table-frame][data-busy]')).toHaveCount(0, { timeout: 90_000 })
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, Cash Flows at ${size.tag}`, () => {
    test.use(size.use)
    for (const k of [...KEPT_LOOK, { seed: 'tablewidest', left: null }] as const) {
      test(`?seed=${k.seed}: Cash Flows — Summary, a drill, Accounts, Rough, a kept what-if, your plan beside the what-if`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 240_000)
        await enterShell(page, k.seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, CASH_FLOWS, size.phone)
        await tableLanded(page)
        await shot(page, findings, 'cash-flows-summary', k.seed, size.tag)
        await page.screenshot({ path: `${OUT}/cash-flows-summary-${k.seed}-${size.tag}-full.png`, fullPage: true })
        if (k.left === null) {
          // The widest household, scrolled to the frame's end on the phone (the lead columns held).
          await page.locator('[data-table-frame]').evaluate((f) => (f.scrollLeft = f.scrollWidth))
          await shot(page, findings, 'cash-flows-summary-end', k.seed, size.tag)
          await page.locator('[data-table-frame]').evaluate((f) => (f.scrollLeft = 0))
        }
        const drill = page.locator('[data-table-frame] thead button').first()
        if ((await drill.count()) > 0) {
          await drill.click()
          await shot(page, findings, 'cash-flows-drill', k.seed, size.tag)
          await page.locator('[data-cash-flows-title] button').first().click()
        }
        await pickOn(page, copy.workbenchViewLegend, copy.workbenchViewRough)
        await tableLanded(page)
        await shot(page, findings, 'cash-flows-rough', k.seed, size.tag)
        await pickOn(page, copy.workbenchViewLegend, copy.workbenchViewSteady)
        await page.getByRole('tab', { name: copy.cashFlowsTabAccounts }).click()
        await tableLanded(page)
        await shot(page, findings, 'cash-flows-accounts', k.seed, size.tag)
        await page.getByRole('combobox', { name: copy.cashFlowsAccountsLabel }).click()
        await expect(page.getByRole('listbox')).toBeVisible()
        await page.waitForTimeout(300)
        await page.screenshot({ path: `${OUT}/cash-flows-accounts-switcher-${k.seed}-${size.tag}.png` })
        await page.keyboard.press('Escape')
        await page.getByRole('tab', { name: copy.cashFlowsTabSummary }).click()
        if (k.left !== null) {
          await pickOn(page, copy.cashFlowsPlanLabel, k.right)
          await tableLanded(page)
          await shot(page, findings, 'cash-flows-kept', k.seed, size.tag)
          // Your plan beside the what-if open on Analysis: open a kept what-if on the left there, then pick the pair.
          await showScreen(page, SCREENS[1], size.phone)
          await pickOn(page, copy.probabilityPickerLabel, k.left)
          await showScreen(page, CASH_FLOWS, size.phone)
          await pickOn(page, copy.cashFlowsPlanLabel, copy.cashFlowsPickPaired)
          await tableLanded(page)
          await shot(page, findings, 'cash-flows-paired', k.seed, size.tag)
          await page.screenshot({ path: `${OUT}/cash-flows-paired-${k.seed}-${size.tag}-full.png`, fullPage: true })
        }
        console.log(`[rc-look ${UNIT} cash flows ${k.seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}

// RC7: Retirement → Analysis → Confidence, on a retired and a working household and the aged spine (`?vault=stale`): the
// tab, the legend with both ranges hidden (the axis zoomed to the median), and the run-out chart (scrolled to on the
// phone). Reduced motion, because the harness fixes the page clock and Highcharts times its morph on it: a toggle's
// redraw would be caught in its first frame (the RC7 fit arm's note); reduced motion draws each one in its final place.
async function toConfidenceTab(page: Page, phone: boolean): Promise<void> {
  await showScreen(page, SCREENS[1], phone)
  await page.getByRole('tab', { name: copy.confidenceTab }).click()
  await expect(page.locator('[data-confidence] [data-chart="fan"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
  if ((await page.locator('[data-confidence="headline"]').count()) > 0) {
    await expect(page.locator('[data-chart="runout"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
  }
  await page.waitForTimeout(600)
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, Confidence at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const target of ['retired', 'dip', 'vault=stale'] as const) {
      const name = target.replace('vault=', 'vault-')
      test(`${target}: Confidence — the tab, the median only, the run-out chart`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 180_000)
        if (target === 'vault=stale') {
          await page.goto('/?vault=stale')
          await page.getByRole('button', { name: 'Open my plan' }).click()
          await page.getByRole('button', { name: /still about right/i }).click()
          await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
        } else await enterShell(page, target)
        const findings: Record<string, Audit> = {}
        await toConfidenceTab(page, size.phone)
        await shot(page, findings, 'confidence', name, size.tag)
        await page.screenshot({ path: `${OUT}/confidence-${name}-${size.tag}-full.png`, fullPage: true })
        const fan = page.locator('[data-confidence] [data-chart="fan"]')
        for (const range of [copy.snapshotFanOuter, copy.snapshotFanInner]) await fan.locator('.highcharts-legend-item', { hasText: range }).click()
        await page.waitForTimeout(400)
        await fan.evaluate((el) => el.scrollIntoView({ block: 'center' }))
        findings['confidence-median-only'] = await audit(page)
        await page.screenshot({ path: `${OUT}/confidence-median-only-${name}-${size.tag}.png` })
        for (const range of [copy.snapshotFanOuter, copy.snapshotFanInner]) await fan.locator('.highcharts-legend-item', { hasText: range }).click()
        if ((await page.locator('[data-runout-card]').count()) > 0) {
          await page.locator('[data-runout-card]').evaluate((el) => el.scrollIntoView({ block: 'center' }))
          findings['confidence-run-out'] = await audit(page)
          await page.screenshot({ path: `${OUT}/confidence-run-out-${name}-${size.tag}.png` })
        }
        console.log(`[rc-look ${UNIT} confidence ${target} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}

// RC8: Tax → Tax Strategies, on a retired household with a full-precision solve driven (`surplus`: the empty state, the
// Calculating frame, the Winner card with the ranked list, Summary, Comparison's invested assets and withdrawals, and
// Details' two tables) and on a working household (`dip`: the one stopgap line). Reduced motion (the harness's pinned
// clock would catch a chart's morph in its first frame).
const TAX = SCREENS[4]
const SOLVE_MS = 360_000

for (const size of SIZES) {
  test.describe(`${UNIT} look, Tax Strategies at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    test('?seed=surplus: the empty state, Calculating, the Winner card and list, Summary, Comparison, Details', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + SOLVE_MS + 240_000)
      await enterShell(page, 'surplus')
      const findings: Record<string, Audit> = {}
      await showScreen(page, TAX, size.phone)
      await shot(page, findings, 'tax-strategies-empty', 'surplus', size.tag)
      await page.getByRole('radio', { name: new RegExp(copy.goalLeaveMoreLabel) }).check()
      await page.getByRole('button', { name: copy.taxStratFind, exact: true }).click()
      await expect(page.locator('[data-calculating]')).toBeVisible()
      await shot(page, findings, 'tax-strategies-calculating', 'surplus', size.tag)
      await expect(page.locator('[data-winner]')).toBeVisible({ timeout: SOLVE_MS })
      await shot(page, findings, 'tax-strategies', 'surplus', size.tag)
      await page.screenshot({ path: `${OUT}/tax-strategies-surplus-${size.tag}-full.png`, fullPage: true })
      await page.getByRole('tab', { name: copy.taxStratTabSummary }).click()
      await expect(page.locator('[data-chart="tax-summary"] .highcharts-series-group')).toBeAttached({ timeout: 30_000 })
      await page.waitForTimeout(400)
      await shot(page, findings, 'tax-summary', 'surplus', size.tag)
      await page.getByRole('tab', { name: copy.taxStratTabComparison }).click()
      await expect(page.locator('[data-chart="tax-pair"] .highcharts-series-group')).toBeAttached({ timeout: 120_000 })
      await page.waitForTimeout(400)
      await shot(page, findings, 'tax-comparison', 'surplus', size.tag)
      await page.screenshot({ path: `${OUT}/tax-comparison-surplus-${size.tag}-full.png`, fullPage: true })
      await page.getByRole('button', { name: copy.taxStratChartAssets }).click()
      await page.getByRole('menuitemradio', { name: copy.taxStratChartWithdrawals, exact: true }).click()
      await expect(page.locator('[data-chart="tax-stack-plan"] .highcharts-series-group')).toBeAttached({ timeout: 60_000 })
      await page.waitForTimeout(400)
      await shot(page, findings, 'tax-comparison-withdrawals', 'surplus', size.tag)
      await page.screenshot({ path: `${OUT}/tax-comparison-withdrawals-surplus-${size.tag}-full.png`, fullPage: true })
      await page.getByRole('tab', { name: copy.taxStratTabDetails }).click()
      await expect(page.locator('[data-details="table"]')).toBeVisible({ timeout: 60_000 })
      await shot(page, findings, 'tax-details', 'surplus', size.tag)
      await page.getByRole('combobox', { name: copy.taxStratTableLabel }).click()
      await page.getByRole('option', { name: copy.taxStratTableMedicare }).click()
      await expect(page.locator('[data-details-table="medicare"]')).toBeVisible()
      await shot(page, findings, 'tax-details-medicare', 'surplus', size.tag)
      await page.screenshot({ path: `${OUT}/tax-details-medicare-surplus-${size.tag}-full.png`, fullPage: true })
      console.log(`[rc-look ${UNIT} tax surplus ${size.tag}] ${JSON.stringify(findings)}`)
      for (const [id, a] of Object.entries(findings)) {
        expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
        expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
        expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
        expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
      }
    })

    test('?seed=dip: the working route’s one line', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 60_000)
      await enterShell(page, 'dip')
      const findings: Record<string, Audit> = {}
      await showScreen(page, TAX, size.phone)
      await shot(page, findings, 'tax-strategies', 'dip', size.tag)
      console.log(`[rc-look ${UNIT} tax dip ${size.tag}] ${JSON.stringify(findings)}`)
      for (const [id, a] of Object.entries(findings)) {
        expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
        expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
        expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
        expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
      }
    })
  })
}

// RC9: Retirement → Social Security, on each seed (`retired` and `date` by default; `healthss` is the no-choice-left
// household): Comparison's yearly pairs and running totals, Summary's bars with the odds under them, and the filing
// steps in the Action Items tray. Reduced motion (the harness's pinned clock would catch a chart's morph in its first frame).
const CLAIMS = SCREENS[6]

for (const size of SIZES) {
  test.describe(`${UNIT} look, Social Security at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Social Security — the yearly pairs, the running totals, the Summary, the filing steps`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 600_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, CLAIMS, size.phone)
        await shot(page, findings, 'claims-annual', seed, size.tag)
        await page.screenshot({ path: `${OUT}/claims-annual-${seed}-${size.tag}-full.png`, fullPage: true })
        if ((await page.locator('[data-claims-comparison]').count()) > 0) {
          await page.getByRole('button', { name: copy.claimsChartAnnual }).click()
          await page.getByRole('menuitemradio', { name: copy.claimsChartCumulative, exact: true }).click()
          await settleClaims(page, 'claims-cumulative')
          await shot(page, findings, 'claims-cumulative', seed, size.tag)
          await page.screenshot({ path: `${OUT}/claims-cumulative-${seed}-${size.tag}-full.png`, fullPage: true })
          await page.getByRole('tab', { name: copy.claimsTabSummary }).click()
          await settleClaims(page, 'claims-summary')
          await shot(page, findings, 'claims-summary', seed, size.tag)
          await page.screenshot({ path: `${OUT}/claims-summary-${seed}-${size.tag}-full.png`, fullPage: true })
          await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          await expect(page.locator('[data-claims-steps]')).toBeVisible()
          await page.waitForTimeout(500)
          await shot(page, findings, 'claims-steps', seed, size.tag)
          await page.screenshot({ path: `${OUT}/claims-steps-${seed}-${size.tag}-full.png`, fullPage: true })
        }
        console.log(`[rc-look ${UNIT} claims ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}

// RC10: Retirement → Health Care, on each seed (`health`, `healthnc` and `date65` for the unit): the first frame (the four
// small charts and the key-metric column), the whole page (the sheet's words under the charts, the caveat), and the
// Action Items tray with B9's health inputs. Reduced motion, as RC9's.
const HEALTH = SCREENS[2]

for (const size of SIZES) {
  test.describe(`${UNIT} look, Health Care at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Health Care — the four charts and the column, the whole page, the tray`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 360_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, HEALTH, size.phone)
        await shot(page, findings, 'health-care', seed, size.tag)
        await page.screenshot({ path: `${OUT}/health-care-${seed}-${size.tag}-full.png`, fullPage: true })
        if ((await page.locator('[data-health-charts]').count()) > 0) {
          await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          await expect(page.locator('[data-health-tray]')).toBeVisible()
          await page.locator('[data-health-tray]').scrollIntoViewIfNeeded()
          await page.waitForTimeout(500)
          await shot(page, findings, 'health-tray', seed, size.tag)
          await page.screenshot({ path: `${OUT}/health-tray-${seed}-${size.tag}-full.png`, fullPage: true })
        }
        console.log(`[rc-look ${UNIT} health ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }
  })
}
