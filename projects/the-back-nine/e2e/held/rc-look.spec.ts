import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, gotoSeedFinal, gotoVaultFinal, settleLayout, test } from '../reviewSurface'
import { copy, slots } from '../../src/ui/copy'

/**
 * e2e/held/rc-look.spec.ts: an INSTRUMENT, never a gate (Act 6's "Local look", plan docs/plans/6-rightcapital-ui-plan.md
 * sections 4.0 and 7.1 point 4). For each unit it captures every finished screen at his window (1440×731 @2) and a phone
 * (390×844 @3), for a retired seed (`retired`) and a working one (`date`; `RC_SEEDS=retired,dip` names others), entered as a
 * user lands (since RC4 the seed's settled answer lands on the home), and audits each frame:
 *  - the page never scrolls sideways;
 *  - no text is clipped (an element whose content is wider or taller than a box that hides its overflow; an ellipsis
 *    counts as clipped, since the kit never cuts text to fit, and so does a chart word Highcharts cut with "…");
 *  - no two visible controls overlap;
 *  - no text under 12 CSS px.
 * The phone's menu is captured open too, and since RC4b Probability's Action Items tray: open with one changed row, after
 * its Refresh (Apply's words on the working seed, a stop year pulled), and its Edit drawer; since RC11 Stress Test's tray,
 * open after a Refresh with the Social Security stress moved one step; since RC12 Investment's Asset Allocation (Summary,
 * its picker switched, Detail) and Tax Allocation (a part's accounts listed), then both again with a what-if mix set; since
 * RC13a the Profile pages (Net Worth, Income, Savings, Family), each with a drawer open (on the phone, its full-screen
 * sheet), and a drawer refusing a Save (a Social Security figure over its ceiling) with the error under its field; since
 * RC13b Goals and Expenses with every card's drawer, the budget worksheet, and the Pre-retirement living expenses drawer
 * stale and kept (opened from the standing line); since RC18 Settings, each folder tab (and the W row's drawer over it on
 * a working seed), and the Display drawer open over Analysis; since RC14 the first-run stepper: its six steps re-walked
 * from Settings over each seed, and on a fresh plan "Start a new plan", each empty step, Complete waiting on facts and Next
 * refusing with the W drawer at its field (filter `-g "the first-run stepper"`); since RC16 Balance Sheet: Current, its DETAILS
 * breakdown open and its Details tab (filter `-g "Balance Sheet, both tabs"`); since RC17 Analysis's Comparisons, Savings
 * and Retirement Details, chart by chart (filter `-g "Analysis runs tabs"`); since RC19 the vault and session screens: the
 * cold start, the unlock card and a refused unlock, recovery, restore, the damaged-vault notice, the save drawer step by step,
 * the backup drawer, the re-entry gate, a second tab's view-only banner and the error boundary (filter
 * `-g "the vault and session screens"`); since RC20 Cash Flows → Maps: the flow by year, the tiles and the rough market's last
 * year (filter `-g "Cash Flows Maps"`); since the Act 5 plan's U13 the inherited IRA (`?seed=inherited`) on Cash Flows' tables,
 * Maps and Retirement Details (filter `-g "the inherited IRA"`). Screenshots land in the repo's gitignored `temp/rc-shots/<unit>/`, named
 * `<screen>-<seed>-<size>.png`, for Briggsy to review the output.
 *
 *     RC_UNIT=RC2 pnpm exec playwright test --config e2e/held/shots.config.ts rc-look
 */

const UNIT = process.env.RC_UNIT ?? 'RC2'
const OUT = `temp/rc-shots/${UNIT}` // resolved from the run's working directory, the project root
const SEEDS = (process.env.RC_SEEDS ?? 'retired,date').split(',')
const ALL_SCREENS = [
  { id: 'snapshot', screen: 'snapshot', module: copy.shellModuleDashboard, page: copy.shellPageSnapshot },
  { id: 'balance-sheet', screen: 'balance-sheet', module: copy.shellModuleDashboard, page: copy.shellPageBalanceSheet },
  { id: 'probability', screen: 'probability', module: copy.shellModuleRetirement, page: copy.shellPageAnalysis },
  { id: 'health-care', screen: 'health-care', module: copy.shellModuleRetirement, page: copy.shellPageHealthCare },
  { id: 'cash-flows', screen: 'cash-flows', module: copy.shellModuleRetirement, page: copy.shellPageCashFlows },
  { id: 'tax-strategies', screen: 'tax-strategies', module: copy.shellModuleTax, page: copy.shellPageTaxStrategies },
  { id: 'social-security', screen: 'social-security', module: copy.shellModuleRetirement, page: copy.shellPageSocialSecurity },
  { id: 'stress-test', screen: 'stress-test', module: copy.shellModuleRetirement, page: copy.shellPageStressTest },
  { id: 'asset-allocation', screen: 'asset-allocation', module: copy.shellModuleInvestment, page: copy.shellPageAssetAllocation },
  { id: 'tax-allocation', screen: 'tax-allocation', module: copy.shellModuleInvestment, page: copy.shellPageTaxAllocation },
  { id: 'net-worth', screen: 'profile-net-worth', module: copy.shellModuleProfile, page: copy.shellPageNetWorth },
  { id: 'income', screen: 'profile-income', module: copy.shellModuleProfile, page: copy.shellPageIncome },
  { id: 'savings', screen: 'profile-savings', module: copy.shellModuleProfile, page: copy.shellPageSavings },
  { id: 'family', screen: 'profile-family', module: copy.shellModuleProfile, page: copy.shellPageFamily },
  { id: 'goals', screen: 'profile-goals', module: copy.shellModuleProfile, page: copy.shellPageGoals },
  { id: 'expenses', screen: 'profile-expenses', module: copy.shellModuleProfile, page: copy.shellPageExpenses },
  { id: 'blueprint', screen: 'profile-blueprint', module: copy.shellModuleProfile, page: copy.shellPageBlueprint },
  // RC18: the gear's page, reached by the gear (no module word names it).
  { id: 'settings', screen: 'settings', module: copy.shellGear, page: copy.settingsTitle },
] as const
/** `RC_ONLY=stress-test` captures only the named screens (comma-separated ids), and Probability's tray and odds
 *  captures only where Probability is among them. */
const ONLY = process.env.RC_ONLY?.split(',')
const SCREENS = ALL_SCREENS.filter((s) => ONLY === undefined || ONLY.includes(s.id))
/** A screen by its id, from the whole list: `SCREENS` is filtered by `RC_ONLY`, so an index into it names a different
 *  screen under a filter (a Health Care capture once shot Social Security). */
const screenById = (id: (typeof ALL_SCREENS)[number]['id']) => ALL_SCREENS.find((s) => s.id === id)!
const PROBABILITY = screenById('probability')

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
        // A native file input: Chromium's own style cuts the picked name inside the box with an ellipsis that no page
        // style overrides (measured, RC19); RestoreFlow prints the name whole under the box, which this audit reads.
        if (el.matches('input[type="file"]')) return false
        const cs = getComputedStyle(el)
        if (cs.textOverflow === 'ellipsis' || Number(cs.webkitLineClamp) > 0) return true
        const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
        const hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
        return (hidesX && el.scrollWidth > el.clientWidth + 1) || (hidesY && hasText(el) && el.scrollHeight > el.clientHeight + 1)
      })
      .map(name)
    // A chart word Highcharts cut to fit ends in "…" with no CSS to show it (RC11's phone look: "Combined every…").
    for (const t of document.querySelectorAll('svg text')) if (shown(t) && (t.textContent ?? '').includes('…')) clipped.push(name(t))
    // A control's box as it is SEEN: cut by every ancestor that hides or scrolls its overflow (RC13a: a drawer body's field
    // scrolled under its footer is clipped by the body, never drawn over the footer's buttons). Null: nothing of it shows.
    const seen = (el: Element): DOMRect | null => {
      let r = el.getBoundingClientRect()
      for (let up = el.parentElement; up !== null; up = up.parentElement) {
        const cs = getComputedStyle(up)
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
        const c = up.getBoundingClientRect()
        const left = Math.max(r.left, c.left)
        const top = Math.max(r.top, c.top)
        const right = Math.min(r.right, c.right)
        const bottom = Math.min(r.bottom, c.bottom)
        if (right - left <= 1 || bottom - top <= 1) return null
        r = new DOMRect(left, top, right - left, bottom - top)
      }
      return r
    }
    const controls = all.filter((el) => el.matches('a[href], button, input, select, textarea, summary, label.segment, [role="menuitem"]'))
    const overlaps: string[] = []
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i]!
        const b = controls[j]!
        if (a.contains(b) || b.contains(a)) continue
        const ra = seen(a)
        const rb = seen(b)
        if (ra === null || rb === null) continue
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
    // The bar, or on a $0 middle balance (`failing`) the words in its place.
    await expect(page.locator('[data-bar="compared"] .highcharts-series-group, [data-bar-none]').first()).toBeAttached({ timeout: 60_000 })
  }
  await page.waitForTimeout(800)
}

async function showScreen(page: Page, target: (typeof SCREENS)[number], phone: boolean): Promise<void> {
  if (target.screen === 'settings') {
    await page.locator('[data-gear]').click()
  } else if (phone) {
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
  if (target.screen === 'stress-test') await settleStress(page)
  if (target.screen === 'asset-allocation' || target.screen === 'tax-allocation') await settleRings(page)
  if (target.screen === 'balance-sheet') await settleBalance(page)
  await settleLayout(page)
}

/** Balance Sheet's columns drawn (the charts' lazy chunk), or the page's own words (no accounts, or every one at $0). */
async function settleBalance(page: Page): Promise<void> {
  await expect(page.locator('[data-chart="balance-kinds"] .highcharts-series-group, [data-balance-page], [data-balance-zero], [data-balance-tab="details"]').first()).toBeAttached({ timeout: 60_000 })
  await page.waitForTimeout(600)
}

/** Stress Test's bars landed (a working plan's final-tier runs take a while), or the page's own words. */
async function settleStress(page: Page): Promise<void> {
  await expect(page.locator('[data-chart="stress"] .highcharts-series-group, [data-stress-page]').first()).toBeAttached({ timeout: 240_000 })
  await expect(page.locator('[data-stress] [aria-busy="true"]')).toHaveCount(0, { timeout: 360_000 })
  await page.waitForTimeout(600)
}

/** Investment's rings drawn (the charts' lazy chunk), or the page's own words. */
async function settleRings(page: Page): Promise<void> {
  await expect(page.locator('[data-donut] .highcharts-series-group, [data-asset-page], [data-taxalloc-page]').first()).toBeAttached({ timeout: 60_000 })
  await page.waitForTimeout(600)
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
        if (SCREENS.includes(PROBABILITY)) await showScreen(page, PROBABILITY, size.phone)
        if (SCREENS.includes(PROBABILITY) && (await page.locator('[data-probability]').count()) > 0 && (await page.locator('[data-probability="pending"], [data-probability="fallback"], [data-probability="error"]').count()) === 0) {
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
        // Stress Test's tray (RC11): open, the Social Security stress one step on, refreshed and landed.
        const stressScreen = SCREENS.find((s) => s.id === 'stress-test')
        if (stressScreen !== undefined) {
          await showScreen(page, stressScreen, size.phone)
          if ((await page.locator('[data-chart="stress"]').count()) > 0) {
            await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
            const tray = page.locator('#b9-stress-items')
            await expect(tray).toBeVisible()
            await page.waitForTimeout(400)
            await tray.locator('[data-tray-row="social-security"] input[type="range"]').focus()
            await page.keyboard.press('ArrowRight')
            await page.locator('[data-tray-refresh]').click()
            await expect(page.locator('[data-stress] [aria-busy="true"]')).toHaveCount(0, { timeout: 360_000 })
            await page.waitForTimeout(800)
            await settleLayout(page)
            findings['stress-tray'] = await audit(page)
            await page.screenshot({ path: `${OUT}/stress-test-tray-${seed}-${size.tag}.png` })
            await page.screenshot({ path: `${OUT}/stress-test-tray-${seed}-${size.tag}-full.png`, fullPage: true })
            if (size.phone) {
              await page.keyboard.press('Escape')
              await expect(tray).toHaveCount(0)
            }
          }
        }
        // Investment (RC12): Asset Allocation's Detail tab, its picker switched to the first other accounts it offers, Tax
        // Allocation with a part's accounts listed, then both again with a what-if mix (80 / 15 / 5) set on Analysis.
        const asset = SCREENS.find((s) => s.id === 'asset-allocation')
        const taxAlloc = SCREENS.find((s) => s.id === 'tax-allocation')
        const investmentShots = async (tag: string) => {
          if (asset !== undefined) {
            await showScreen(page, asset, size.phone)
            if ((await page.locator('[data-asset="summary"]').count()) > 0) {
              await shot(page, findings, `asset-allocation${tag}`, seed, size.tag)
              await page.screenshot({ path: `${OUT}/asset-allocation${tag}-${seed}-${size.tag}-full.png`, fullPage: true })
              const picker = page.locator('[data-asset-side="current"] [role="combobox"]')
              await picker.click()
              const options = page.getByRole('option')
              await expect(options.first()).toBeVisible()
              if ((await options.count()) > 1) {
                await options.nth(1).click()
                await settleRings(page)
                await shot(page, findings, `asset-allocation-picker${tag}`, seed, size.tag)
                await picker.click()
                await page.getByRole('option').first().click()
              } else await page.keyboard.press('Escape')
              await page.getByRole('tab', { name: copy.assetTabDetail, exact: true }).click()
              await page.waitForTimeout(800)
              await shot(page, findings, `asset-allocation-detail${tag}`, seed, size.tag)
              await page.screenshot({ path: `${OUT}/asset-allocation-detail${tag}-${seed}-${size.tag}-full.png`, fullPage: true })
              await page.getByRole('tab', { name: copy.assetTabSummary, exact: true }).click()
            }
          }
          if (taxAlloc !== undefined) {
            await showScreen(page, taxAlloc, size.phone)
            const part = page.locator('[data-taxalloc-part]').last()
            if ((await part.count()) > 0) {
              await part.click()
              await page.waitForTimeout(600)
              await page.mouse.move(0, 0)
              await shot(page, findings, `tax-allocation-picked${tag}`, seed, size.tag)
              await page.screenshot({ path: `${OUT}/tax-allocation-picked${tag}-${seed}-${size.tag}-full.png`, fullPage: true })
              await part.click()
            }
          }
        }
        if (asset !== undefined || taxAlloc !== undefined) {
          await investmentShots('')
          if (asset !== undefined) {
            await showScreen(page, PROBABILITY, size.phone)
            if ((await page.locator('[data-probability="pending"], [data-probability="fallback"], [data-probability="error"]').count()) === 0) {
              const tray = page.locator('#b9-action-items')
              // The tray's open state lives on the shell, so at the laptop width the tray the capture above left open is
              // still open here: the handle opens it only when it is shut (a click on an open tray shuts it).
              if ((await tray.count()) === 0) await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
              await expect(tray).toBeVisible()
              await page.waitForTimeout(400)
              for (const [k, v] of [['stock', '80'], ['bond', '15'], ['cash', '5']] as const) {
                const input = tray.locator(`[data-tray-row="mix:${k}"] input`)
                await input.scrollIntoViewIfNeeded()
                await input.fill(v)
                await input.press('Tab')
              }
              await tray.locator('[data-tray-refresh]').click()
              await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 240_000 })
              if (size.phone) await page.keyboard.press('Escape')
              else await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
              await expect(tray).toHaveCount(0)
              await investmentShots('-whatif')
            }
          }
        }
        // Probability's second chart, Odds by stop year (the working route only): the chart title's menu.
        if (SCREENS.includes(PROBABILITY)) await showScreen(page, PROBABILITY, size.phone)
        if (SCREENS.includes(PROBABILITY) && (await page.locator('[data-probability="date"]').count()) > 0) {
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

// RC16: Dashboard → Balance Sheet on each seed (and `buckets`, the household with three kinds held and one at $0): Current,
// the DETAILS breakdown open under the panel (on the phone, its sheet), and the Details tab (whole page too). Filter with
// `-g "Balance Sheet, both tabs"`.
for (const size of SIZES) {
  test.describe(`${UNIT} look, Balance Sheet, both tabs at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of [...SEEDS, 'buckets']) {
      test(`?seed=${seed}: Balance Sheet — Current, the DETAILS breakdown, Details`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, screenById('balance-sheet'), size.phone)
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, findings, 'balance-current', seed, size.tag)
        await page.screenshot({ path: `${OUT}/balance-current-${seed}-${size.tag}-full.png`, fullPage: true })
        const handle = page.getByRole('button', { name: copy.balanceSheetHandle, exact: true })
        if ((await handle.count()) > 0) {
          await handle.click()
          await expect(page.locator('[data-balance-breakdown]')).toBeVisible()
          await page.waitForTimeout(400)
          // At a laptop width the breakdown grows the page under the panel, below the first frame (`shot` settles back to
          // the top): the whole-page shot shows it whole, under the chart.
          await shot(page, findings, 'balance-breakdown', seed, size.tag)
          if (!size.phone) await page.screenshot({ path: `${OUT}/balance-breakdown-${seed}-${size.tag}-full.png`, fullPage: true })
          if (size.phone) await page.keyboard.press('Escape')
          else await handle.click()
          await expect(page.locator('[data-balance-breakdown]')).toBeHidden()
        }
        const details = page.getByRole('tab', { name: copy.balanceSheetTabDetails, exact: true })
        if ((await details.count()) > 0) {
          await details.click()
          await expect(page.locator('[data-balance-tab="details"]')).toBeAttached()
          await page.evaluate(() => window.scrollTo(0, 0))
          await shot(page, findings, 'balance-details', seed, size.tag)
          await page.screenshot({ path: `${OUT}/balance-details-${seed}-${size.tag}-full.png`, fullPage: true })
          await page.getByRole('tab', { name: copy.balanceSheetTabCurrent, exact: true }).click()
        }
        console.log(`[rc-look ${UNIT} balance ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        auditAll(findings)
      })
    }
  })
}

// RC17: Analysis's Comparisons, Savings and Retirement Details, each chart in its title menu. `retired` (your plan alone),
// `dip` (a stop-year what-if beside the plan, so every comparison has two sides: its own-plan and comparison charts, the
// what-if's own copies left out), `dateshort` (every working year short: Savings' left over under the zero line) and
// `failing` (its money runs out in year 0: words in the charts' place). At his window every chart; on the phone each
// tab's first chart and Comparisons' bars, whole page too. Then the money running out mid-retirement (`retired` on the
// rough market; `offtracktypical` beside a later claim): the ended lines and the hatched band. Filter with
// `-g "Analysis runs tabs"`.
const RC17_LOOK_TABS = [
  { id: 'comparisons', tab: copy.comparisonsTab },
  { id: 'savings', tab: copy.analysisSavingsTab },
  { id: 'details', tab: copy.retirementDetailsTab },
] as const

async function settleRuns(page: Page): Promise<void> {
  await expect(page.locator('[data-analysis-body] .highcharts-series-group, [data-analysis-words]').first()).toBeAttached({ timeout: 120_000 })
  await expect(page.locator('[data-analysis-panel] [aria-busy="true"]')).toHaveCount(0, { timeout: 120_000 })
  // The waiting words stand in the chart's place with no aria-busy: settled only once they are gone.
  await expect(page.locator('[data-analysis-words]', { hasText: copy.analysisRunsWaiting })).toHaveCount(0, { timeout: 120_000 })
  await page.waitForTimeout(500)
}

/** Pick a chart from the panel's title menu. */
async function pickRunsChart(page: Page, label: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('[data-analysis-panel] h2 button').click()
  await page.getByRole('menuitemradio', { name: label, exact: true }).click()
  await settleRuns(page)
}

/** The Retirement Details income chart's ran-out band: one whole column slot inside the plot, its words on ONE line. */
async function expectOneSlotBand(page: Page, who: string): Promise<void> {
  const band = await page.evaluate(() => {
    const c = document.querySelector('[data-chart="rd-years"]')!
    const b = c.querySelector('.b9-ranout-band')!.getBoundingClientRect()
    const labelEl = c.querySelector('.highcharts-plot-band-label')!
    const label = labelEl.getBoundingClientRect()
    const plot = c.querySelector('.highcharts-plot-background')!.getBoundingClientRect()
    const centres = [...new Set([...c.querySelectorAll('.highcharts-series .highcharts-point')].map((p) => p.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => Math.round(r.x + r.width / 2)))].sort((p, q) => p - q)
    const slot = centres.length > 1 ? (centres.at(-1)! - centres[0]!) / (centres.length - 1) : 0
    return { width: b.width, right: b.right, plotRight: plot.right, slot, labelHeight: label.height, labelWidth: label.width, fontPx: Number.parseFloat(getComputedStyle(labelEl).fontSize) }
  })
  console.log(`[rc-look ${UNIT} band ${who}] ${JSON.stringify(band)}`)
  expect(Math.abs(band.width - band.slot), `${who}: the band is one column slot`).toBeLessThanOrEqual(2)
  expect(band.right, `${who}: the band inside the plot`).toBeLessThanOrEqual(band.plotRight + 1)
  expect(band.labelHeight, `${who}: the band's words on one line`).toBeLessThan(band.fontPx * 1.8)
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, Analysis runs tabs at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of ['retired', 'dip', 'dateshort', 'failing'] as const) {
      test(`?seed=${seed}: Comparisons, Savings and Retirement Details, chart by chart`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 360_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, PROBABILITY, size.phone)
        if (seed === 'dip') {
          await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          const tray = page.locator('#b9-action-items')
          await expect(tray).toBeVisible()
          const stop = tray.locator('[data-tray-row="stop-year"] input[inputmode="numeric"]')
          await stop.fill(String(Number(await stop.inputValue()) + 2))
          await stop.press('Enter')
          await tray.locator('[data-tray-refresh]').click()
          await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 180_000 })
          if (size.phone) await page.keyboard.press('Escape')
          else await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          await expect(tray).toHaveCount(0)
        }
        for (const t of RC17_LOOK_TABS) {
          if (seed === 'failing' && t.id === 'savings') continue
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.getByRole('tab', { name: t.tab, exact: true }).click()
          await settleRuns(page)
          // One chart: its title is a plain heading (no menu).
          const menu = (await page.locator('[data-analysis-panel] h2 button').count()) > 0
          let labels = [await page.locator('[data-analysis-panel] h2.text-chart-title').innerText()]
          if (menu) {
            await page.locator('[data-analysis-panel] h2 button').click()
            await expect(page.getByRole('menuitemradio').first()).toBeVisible()
            labels = await page.getByRole('menuitemradio').allTextContents()
            await page.keyboard.press('Escape')
          }
          // The what-if's own copies left out on `dip` (its names run in the sentence's lower case). On the phone each tab's
          // first chart, and Comparisons' bars too (they turn sideways with long names).
          const isNew = (l: string) => l.toLowerCase().includes(copy.probabilityPickNew.toLowerCase())
          const phoneWanted = t.id === 'comparisons' && seed !== 'failing' ? [labels[0]!, ...labels.filter((l) => l === copy.cmpChartAtRetirement || l === copy.cmpChartToday)] : labels.slice(0, 1)
          const wanted = size.phone ? phoneWanted : seed === 'failing' ? labels.slice(0, 1) : seed === 'dip' ? labels.filter((l) => !isNew(l)) : labels
          for (const [i, label] of wanted.entries()) {
            if (i > 0 || label !== labels[0]) {
              await page.evaluate(() => window.scrollTo(0, 0))
              await page.locator('[data-analysis-panel] h2 button').click()
              await page.getByRole('menuitemradio', { name: label, exact: true }).click()
              await settleRuns(page)
            }
            await page.evaluate(() => window.scrollTo(0, 0))
            // The pointer off the chart, so no hover tooltip from the menu's press sits over the picture.
            if (!size.phone) await page.mouse.move(2, 2)
            await shot(page, findings, `${t.id}-${i + 1}`, seed, size.tag)
            if (size.phone) await page.screenshot({ path: `${OUT}/${t.id}-${i + 1}-${seed}-${size.tag}-full.png`, fullPage: true })
          }
          // The menu open over the chart (its first item), at his window.
          if (!size.phone && seed !== 'failing' && menu) {
            await page.locator('[data-analysis-panel] h2 button').click()
            await page.waitForTimeout(300)
            await page.screenshot({ path: `${OUT}/${t.id}-menu-${seed}-${size.tag}.png` })
            await page.keyboard.press('Escape')
          }
        }
        console.log(`[rc-look ${UNIT} analysis-runs ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        auditAll(findings)
      })
    }

    // The money runs out mid-retirement: `retired` on the rough market (one side, its line ending in words at $0) and
    // `offtracktypical` on the steady market with a later Social Security claim beside it (a ran-out pair). Comparisons'
    // invested assets (each end label right of its line, a $0 end above the baseline) and Retirement Details' income
    // columns (the hatched band one column slot wide, its words on one line).
    for (const w of [
      { seed: 'retired', rough: true, lever: false },
      { seed: 'offtracktypical', rough: false, lever: true },
    ] as const) {
      test(`?seed=${w.seed}: the money runs out in retirement, the ended lines and the hatched band`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 360_000)
        await enterShell(page, w.seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, PROBABILITY, size.phone)
        if (w.lever) {
          await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          const tray = page.locator('#b9-action-items')
          await expect(tray).toBeVisible()
          await page.waitForTimeout(400)
          await tray.locator('[data-tray-row^="claim-age:"] input[type="range"]').first().focus()
          await page.keyboard.press('ArrowRight')
          await tray.locator('[data-tray-refresh]').click()
          await expect(page.locator('[data-half="alternative"] [aria-busy="true"]')).toHaveCount(0, { timeout: 180_000 })
          if (size.phone) await page.keyboard.press('Escape')
          else await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
          await expect(tray).toHaveCount(0)
        }
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.getByRole('tab', { name: copy.comparisonsTab, exact: true }).click()
        await settleRuns(page)
        if (w.rough) {
          await page.locator('[data-analysis-panel]').getByRole('combobox', { name: copy.taxStratMarketLabel }).click()
          await page.getByRole('option', { name: copy.workbenchViewRough, exact: true }).click()
          await settleRuns(page)
        }
        await page.evaluate(() => window.scrollTo(0, 0))
        if (!size.phone) await page.mouse.move(2, 2)
        await shot(page, findings, 'runout-comparisons', w.seed, size.tag)
        await page.getByRole('tab', { name: copy.retirementDetailsTab, exact: true }).click()
        await settleRuns(page)
        // The plan's own income columns (the what-if's first on a pair's menu).
        const plan = slots.rdIncomeSourcesOf(copy.probabilityPlanTitle.toLowerCase())
        if ((await page.locator('[data-analysis-panel] h2.text-chart-title').innerText()) !== plan) await pickRunsChart(page, plan)
        await page.evaluate(() => window.scrollTo(0, 0))
        if (!size.phone) await page.mouse.move(2, 2)
        await shot(page, findings, 'runout-details', w.seed, size.tag)
        if ((await page.locator('[data-chart="rd-years"] .b9-ranout-band').count()) > 0) await expectOneSlotBand(page, `${w.seed} ${size.tag}`)
        else console.log(`[rc-look ${UNIT} band ${w.seed} ${size.tag}] no band: ${(await page.locator('[data-analysis-metric]').allInnerTexts()).join(' | ')}`)
        if (size.phone) await page.screenshot({ path: `${OUT}/runout-details-${w.seed}-${size.tag}-full.png`, fullPage: true })
        console.log(`[rc-look ${UNIT} runout ${w.seed} ${size.tag}] ${JSON.stringify(findings)}`)
        auditAll(findings)
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
      await showScreen(page, screenById('tax-strategies'), size.phone)
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
        await showScreen(page, PROBABILITY, size.phone)
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
        await showScreen(page, PROBABILITY, size.phone)
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
const CASH_FLOWS = screenById('cash-flows')

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
          await showScreen(page, PROBABILITY, size.phone)
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

// RC20: Cash Flows → Maps, on a retired and a working household (`retired`, `dip`): the flow (a Sankey) at the first
// year, three years on and after work stops, the Breakdown tiles, the rough market's last year where the money runs out,
// and the whole page once. The phone shows the tiles in the flow's place. Reduced motion (the pinned clock would freeze a
// redraw). Filter with `-g "Cash Flows Maps"`.
async function mapsShown(page: Page): Promise<void> {
  await expect(page.locator('[data-chart="maps-flow"] .highcharts-node, [data-maps-tiles], [data-maps-words]').first()).toBeAttached({ timeout: 90_000 })
  await page.waitForTimeout(400)
}

async function mapsYearKeys(page: Page, key: string, times = 1): Promise<void> {
  await page.locator('[data-maps-thumb] input').focus()
  for (let i = 0; i < times; i++) await page.keyboard.press(key)
  await mapsShown(page)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, Cash Flows Maps at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of ['retired', 'dip'] as const) {
      test(`?seed=${seed}: Maps — the flow by year, the tiles, the rough market's last year`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 240_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, screenById('cash-flows'), size.phone)
        await tableLanded(page)
        await page.getByRole('tab', { name: copy.cashFlowsTabMaps }).click()
        await mapsShown(page)
        const view = size.phone ? 'tiles' : 'flow'
        await shot(page, findings, `maps-${view}`, seed, size.tag)
        await page.screenshot({ path: `${OUT}/maps-${view}-${seed}-${size.tag}-full.png`, fullPage: true })
        await mapsYearKeys(page, 'ArrowRight', 4)
        await shot(page, findings, `maps-${view}-index4`, seed, size.tag)
        if ((await page.locator('[data-maps-stop]').count()) > 0) {
          await mapsYearKeys(page, 'ArrowRight', 5)
          await shot(page, findings, `maps-${view}-retired-year`, seed, size.tag)
        }
        await mapsYearKeys(page, 'Home')
        if (!size.phone) {
          await page.getByRole('combobox', { name: copy.mapsViewLabel }).click()
          await page.getByRole('option', { name: copy.mapsViewBreakdown, exact: true }).click()
          await mapsShown(page)
          await shot(page, findings, 'maps-tiles', seed, size.tag)
          await page.getByRole('combobox', { name: copy.mapsViewLabel }).click()
          await page.getByRole('option', { name: copy.mapsViewFlow, exact: true }).click()
        }
        await pickOn(page, copy.workbenchViewLegend, copy.workbenchViewRough)
        await mapsShown(page)
        await mapsYearKeys(page, 'End')
        await shot(page, findings, `maps-rough-last`, seed, size.tag)
        console.log(`[rc-look ${UNIT} maps ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
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

// The RC20 review's two extra looks: the widest spread of one year's figures (`datesavedtypedpension` six years in, its
// bars drawn to scale) at his window, and the tiles between the phone and the laptop tier (900 px wide, `dip`).
test.describe(`${UNIT} look, Cash Flows Maps, the widest spread at 1440x731`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR, reducedMotion: 'reduce' })
  test('?seed=datesavedtypedpension: Maps six years in, at his window', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 240_000)
    await enterShell(page, 'datesavedtypedpension')
    const findings: Record<string, Audit> = {}
    await showScreen(page, screenById('cash-flows'), false)
    await tableLanded(page)
    await page.getByRole('tab', { name: copy.cashFlowsTabMaps }).click()
    await mapsShown(page)
    await mapsYearKeys(page, 'ArrowRight', 5)
    await shot(page, findings, 'maps-flow-index5', 'datesavedtypedpension', '1440x731')
    // Its stale banner stands over the page, so the map itself gets its own shot.
    await page.locator('[data-maps]').screenshot({ path: `${OUT}/maps-flow-index5-datesavedtypedpension-1440x731-map.png` })
    console.log(`[rc-look ${UNIT} maps datesavedtypedpension] ${JSON.stringify(findings)}`)
    for (const [id, a] of Object.entries(findings)) {
      expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
      expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
    }
  })
})
test.describe(`${UNIT} look, Cash Flows Maps, the tiles at 900x800`, () => {
  test.use({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  test('?seed=dip: Maps at 900 px, the tiles', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 240_000)
    await enterShell(page, 'dip')
    const findings: Record<string, Audit> = {}
    await showScreen(page, screenById('cash-flows'), false)
    await tableLanded(page)
    await page.getByRole('tab', { name: copy.cashFlowsTabMaps }).click()
    await mapsShown(page)
    await shot(page, findings, 'maps-tiles', 'dip', '900x800')
    await page.screenshot({ path: `${OUT}/maps-tiles-dip-900x800-full.png`, fullPage: true })
    console.log(`[rc-look ${UNIT} maps dip 900] ${JSON.stringify(findings)}`)
    for (const [id, a] of Object.entries(findings)) {
      expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
      expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
      expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
    }
  })
})

// The Act 5 plan's U13 (slice 2): the inherited IRA on the screens a general seed list never reaches, on `?seed=inherited`
// (two inherited IRAs of one heir): Cash Flows' Summary and its Planned distribution drill, the three Accounts tables that
// carry an inherited column (each at the frame's start, scrolled to its end, and each account's group scrolled half under
// the held Year and Age; Required withdrawals' notes whole), Maps on the first year and on the first year a withdrawal
// moves money to taxable, and Retirement Details' income chart. Reduced motion, as the Maps block. Filter with
// `-g "the inherited IRA"`.
for (const size of SIZES) {
  test.describe(`${UNIT} look, the inherited IRA at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    test('?seed=inherited: Cash Flows (Summary, the distribution drill, Accounts), Maps and Retirement Details', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 360_000)
      const seed = 'inherited'
      await enterShell(page, seed)
      const findings: Record<string, Audit> = {}
      await showScreen(page, CASH_FLOWS, size.phone)
      await tableLanded(page)
      await shot(page, findings, 'inh-summary', seed, size.tag)
      await page.locator('[data-table-frame] thead button', { hasText: copy.cashFlowsGroupDistribution }).click()
      await shot(page, findings, 'inh-distribution', seed, size.tag)
      await page.locator('[data-cash-flows-title] button').first().click()
      await page.getByRole('tab', { name: copy.cashFlowsTabAccounts }).click()
      await tableLanded(page)
      for (const [id, table] of [
        ['inh-end', copy.cashFlowsAccountsEnd],
        ['inh-withdrawals', copy.cashFlowsAccountsWithdrawals],
        ['inh-rmd', copy.cashFlowsAccountsRmd],
      ] as const) {
        await pickOn(page, copy.cashFlowsAccountsLabel, table)
        await tableLanded(page)
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, findings, id, seed, size.tag)
        const scrolls = await page.locator('[data-table-frame]').evaluate((f) => f.scrollWidth > f.clientWidth)
        if (scrolls) {
          await page.locator('[data-table-frame]').evaluate((f) => (f.scrollLeft = f.scrollWidth))
          await shot(page, findings, `${id}-end`, seed, size.tag)
          // Each account's group scrolled half under the held Year and Age: its name must still read whole.
          const groups = await page.locator('[data-table-frame] th[data-group^="inherited-"]').count()
          for (let g = 0; g < groups; g++) {
            await page.locator('[data-table-frame]').evaluate(async (f, k) => {
              const th = f.querySelectorAll<HTMLElement>('th[data-group^="inherited-"]')[k]!
              const lead = f.querySelector<HTMLElement>('tbody tr:first-child > :nth-child(2)')!
              // Measured at rest: a held cell's offsetLeft includes its stuck offset once the frame has scrolled.
              f.scrollLeft = 0
              await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
              f.scrollLeft = th.offsetLeft - (lead.offsetLeft + lead.offsetWidth) + th.offsetWidth / 2
            }, g)
            await shot(page, findings, `${id}-group${g}-half`, seed, size.tag)
          }
          await page.locator('[data-table-frame]').evaluate((f) => (f.scrollLeft = 0))
        }
      }
      await page.screenshot({ path: `${OUT}/inh-rmd-${seed}-${size.tag}-full.png`, fullPage: true })
      // Maps: the first year, then the first year a withdrawal moves money to taxable (its words line shows).
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('tab', { name: copy.cashFlowsTabMaps }).click()
      await mapsShown(page)
      const view = size.phone ? 'tiles' : 'flow'
      await shot(page, findings, `inh-maps-${view}`, seed, size.tag)
      // The year's notes sit under the panel, outside `[data-maps]`.
      const moved = page.getByText(copy.mapsInheritedMoved, { exact: true })
      for (let i = 0; i < 40 && (await moved.count()) === 0; i++) await mapsYearKeys(page, 'ArrowRight')
      console.log(`[rc-look ${UNIT} inherited maps] moved-to-taxable year found: ${(await moved.count()) > 0}`)
      await shot(page, findings, `inh-maps-${view}-moved`, seed, size.tag)
      await page.screenshot({ path: `${OUT}/inh-maps-${view}-moved-${seed}-${size.tag}-full.png`, fullPage: true })
      // Retirement Details: the plan's income chart and its notes.
      await showScreen(page, PROBABILITY, size.phone)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('tab', { name: copy.retirementDetailsTab, exact: true }).click()
      await settleRuns(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      if (!size.phone) await page.mouse.move(2, 2)
      await shot(page, findings, 'inh-details', seed, size.tag)
      await page.screenshot({ path: `${OUT}/inh-details-${seed}-${size.tag}-full.png`, fullPage: true })
      // Not Tax Strategies' withdrawal stacks: on this seed both goals come back held (a converting winner over a
      // non-converting runner-up, the shape guard; measured 2026-11-27), so the stacks never draw here.
      console.log(`[rc-look ${UNIT} inherited ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })
  })
}

// RC7: Retirement → Analysis → Confidence, on a retired and a working household and the aged spine (`?vault=stale`): the
// tab, the legend with both ranges hidden (the axis zoomed to the median), and the run-out chart (scrolled to on the
// phone). Reduced motion, because the harness fixes the page clock and Highcharts times its morph on it: a toggle's
// redraw would be caught in its first frame (the RC7 fit arm's note); reduced motion draws each one in its final place.
async function toConfidenceTab(page: Page, phone: boolean): Promise<void> {
  await showScreen(page, PROBABILITY, phone)
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
const TAX = screenById('tax-strategies')
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
const CLAIMS = screenById('social-security')

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
const HEALTH = screenById('health-care')

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

// ── RC13a · the Profile pages and their drawers ─────────────────────────────────────────────────────────────────────────
const PROFILE_PAGES = [screenById('net-worth'), screenById('income'), screenById('savings'), screenById('family')] as const

/** Open the first card or row on the page (its drawer), shoot it, and shut it with nothing changed. */
async function shootDrawer(page: Page, findings: Record<string, Audit>, id: string, seed: string, tag: string, card: string): Promise<void> {
  const opener = page.locator(`[data-profile-card="${card}"]`)
  if ((await opener.count()) === 0) return
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(450)
  await shot(page, findings, `${id}-drawer`, seed, tag)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, the Profile pages at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Net Worth, Income, Savings and Family, each page and a drawer open, and a refused Save`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 180_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        for (const target of PROFILE_PAGES) {
          await showScreen(page, target, size.phone)
          await shot(page, findings, target.id, seed, size.tag)
          await page.screenshot({ path: `${OUT}/${target.id}-${seed}-${size.tag}-full.png`, fullPage: true })
          // A page with no card (Savings on an all-retired seed) shoots no drawer.
          if ((await page.locator('[data-profile-card]').count()) > 0) {
            const first = await page.locator('[data-profile-card]').first().getAttribute('data-profile-card')
            if (first !== null) await shootDrawer(page, findings, target.id, seed, size.tag, first)
          }
        }
        // A new account from Net Worth's Add menu (both facets in one drawer), and a Savings drawer on the working seed.
        await showScreen(page, screenById('net-worth'), size.phone)
        await page.getByRole('button', { name: copy.profileAddAccount }).click()
        await page.getByRole('menuitem', { name: copy.investBucketPretax }).click()
        await page.getByRole('menuitem', { name: copy.kind401k }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.waitForTimeout(450)
        await shot(page, findings, 'net-worth-add', seed, size.tag)
        await page.getByRole('dialog').getByRole('button', { name: copy.profileDrawerCancel }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        // A refused Save: a yearly figure typed into the monthly Social Security box (the 12× misentry its ceiling guards).
        await showScreen(page, screenById('income'), size.phone)
        await page.locator('[data-profile-card="ss-0"]').click()
        const ss = page.getByRole('dialog')
        await expect(ss).toBeVisible()
        await ss.getByLabel(copy.ssAmountLabel).fill('30000')
        await ss.getByRole('button', { name: copy.profileDrawerSave }).click()
        await expect(ss.getByRole('alert').first()).toBeVisible()
        await page.waitForTimeout(300)
        await shot(page, findings, 'income-refused', seed, size.tag)
        // Escape over the unsaved figure asks first, in the drawer.
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-profile-ask]')).toBeVisible()
        await shot(page, findings, 'income-ask', seed, size.tag)
        await page.getByRole('button', { name: copy.profileUnsavedDrop }).click()
        await expect(ss).toHaveCount(0)
        console.log(`[rc-look ${UNIT} profile ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
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

// ── RC13b · Expenses and Goals and their drawers; the Pre-retirement living expenses drawer stale with Keep; the worksheet ──
const RC13B_LOOK = [screenById('goals'), screenById('expenses')] as const

for (const size of SIZES) {
  test.describe(`${UNIT} look, Expenses and Goals at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Goals and Expenses, each page and every card's drawer open, and the budget worksheet`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 240_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        for (const target of RC13B_LOOK) {
          await showScreen(page, target, size.phone)
          await shot(page, findings, target.id, seed, size.tag)
          await page.screenshot({ path: `${OUT}/${target.id}-${seed}-${size.tag}-full.png`, fullPage: true })
          const cards = await page.locator('main.result [data-profile-card]').evaluateAll((els) => els.map((el) => el.getAttribute('data-profile-card')!))
          for (const card of cards) await shootDrawer(page, findings, `${target.id}-${card}`, seed, size.tag, card)
        }
        // The worksheet: the Living expenses drawer moved to "A budget, line by line", one line added and its figure typed.
        await showScreen(page, screenById('expenses'), size.phone)
        await page.locator('[data-profile-card="living"]').click()
        const living = page.getByRole('dialog')
        await expect(living).toBeVisible()
        await living.locator('[data-choice-group="living-approach"] label[data-choice="budget"]').click()
        const add = living.getByRole('button', { name: copy.budgetAddLine })
        if ((await add.count()) > 0 && (await living.locator('[data-budget-line]').count()) === 0) {
          await add.click()
          await living.getByLabel(copy.budgetAmountLabel).first().fill('24000')
          await living.getByLabel(copy.budgetAmountLabel).first().blur()
        }
        await page.waitForTimeout(450)
        await shot(page, findings, 'expenses-worksheet', seed, size.tag)
        await living.getByRole('button', { name: copy.profileDrawerCancel }).click()
        const drop = living.getByRole('button', { name: copy.profileUnsavedDrop })
        if ((await drop.count()) > 0) await drop.click()
        await expect(living).toHaveCount(0)
        console.log(`[rc-look ${UNIT} expenses-goals ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        for (const [id, a] of Object.entries(findings)) {
          expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
          expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
          expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
          expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
        }
      })
    }

    test('?seed=datecoststale: the Pre-retirement living expenses drawer stale, its Keep door, opened from the standing line', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      await enterShell(page, 'datecoststale')
      const findings: Record<string, Audit> = {}
      await shot(page, findings, 'snapshot-w-stale', 'datecoststale', size.tag)
      await page.locator('[data-stale-banner]').getByRole('button', { name: copy.stalenessPayCheckCta }).click()
      const dialog = page.getByRole('dialog', { name: copy.profileWorkingCostName })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('[data-working-cost-note]')).toBeVisible()
      await page.waitForTimeout(450)
      await shot(page, findings, 'w-stale', 'datecoststale', size.tag)
      await dialog.getByRole('button', { name: /^Keep / }).click()
      await expect(dialog.locator('[data-working-cost-note]')).toHaveCount(0)
      await page.waitForTimeout(300)
      await shot(page, findings, 'w-kept', 'datecoststale', size.tag)
      console.log(`[rc-look ${UNIT} w ${size.tag}] ${JSON.stringify(findings)}`)
      for (const [id, a] of Object.entries(findings)) {
        expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
        expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
        expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
        expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
      }
    })
  })
}

// ── RC18 · Settings, each folder tab; its W row's drawer over it (a working seed); the Display drawer ─────────────────────
const SETTINGS_TABS = [
  ['methodology', copy.settingsTabMethodology],
  ['returns', copy.settingsTabReturns],
  ['tax', copy.settingsTabTax],
  ['health', copy.settingsTabHealth],
  ['other', copy.settingsTabOther],
] as const

for (const size of SIZES) {
  test.describe(`${UNIT} look, Settings and the Display drawer at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Settings, each folder tab (whole page too), the W row's drawer where there is one, and the Display drawer`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 180_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, screenById('settings'), size.phone)
        for (const [id, word] of SETTINGS_TABS) {
          await page.getByRole('tab', { name: word, exact: true }).click()
          await page.evaluate(() => window.scrollTo(0, 0))
          await shot(page, findings, `settings-${id}`, seed, size.tag)
          await page.screenshot({ path: `${OUT}/settings-${id}-${seed}-${size.tag}-full.png`, fullPage: true })
        }
        await page.getByRole('tab', { name: copy.settingsTabMethodology, exact: true }).click()
        const w = page.locator('[data-assumption-seat="working-year-cost"]')
        if ((await w.count()) > 0) {
          await w.getByRole('button', { name: copy.settingsWorkingCostDoor }).click()
          await expect(page.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeVisible()
          await page.waitForTimeout(450)
          await shot(page, findings, 'settings-w-drawer', seed, size.tag)
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toHaveCount(0)
        }
        await showScreen(page, PROBABILITY, size.phone)
        await page.getByRole('button', { name: copy.displayDoorLabel, exact: true }).click()
        const display = page.getByRole('dialog', { name: copy.displayTitle })
        await expect(display).toBeVisible()
        await page.waitForTimeout(450)
        await shot(page, findings, 'display-drawer', seed, size.tag)
        await display.getByRole('switch', { name: copy.displayYears }).click()
        await display.getByRole('switch', { name: copy.displaySameScale }).click()
        await page.waitForTimeout(200)
        await shot(page, findings, 'display-drawer-moved', seed, size.tag)
        await display.getByRole('button', { name: copy.profileDrawerSave, exact: true }).click()
        await expect(display).toHaveCount(0)
        // What the two choices draw: Probability's bars on their own scales (retired), Confidence's fan on years.
        await settleProbability(page)
        await shot(page, findings, 'probability-own-scales', seed, size.tag)
        await page.getByRole('tab', { name: copy.confidenceTab, exact: true }).click()
        await expect(page.locator('main.result[data-shell-screen="confidence"]')).toBeAttached()
        await expect(page.locator('[data-chart="fan"] .highcharts-series-group, main.result [data-card="fan"] p').first()).toBeAttached({ timeout: 30_000 })
        await page.waitForTimeout(600)
        await shot(page, findings, 'confidence-years', seed, size.tag)
        // The other charts over the plan's years, on the years axis.
        await showScreen(page, screenById('health-care'), size.phone)
        await shot(page, findings, 'health-care-years', seed, size.tag)
        await showScreen(page, screenById('social-security'), size.phone)
        await shot(page, findings, 'social-security-years', seed, size.tag)
        console.log(`[rc-look ${UNIT} settings ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
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

// ── RC14 · the first-run stepper: each of the six steps re-walked over a retired and a working seed (Settings' re-walk),
//    "Start a new plan" on a fresh plan, Complete waiting on facts still to enter, and Next refusing with the W drawer
//    opened at its field. Filter by this block's own words: `-g "the first-run stepper"`. ───────────────────────────────
const SETUP_STEP_IDS = ['family', 'income', 'savings', 'net-worth', 'expenses', 'goals'] as const

/** The stepper's Next (or Complete), pressed in-page. */
const setupNext = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLButtonElement>('[data-setup-nav] button')].at(-1)?.click())

async function setupShot(page: Page, findings: Record<string, Audit>, id: string, seed: string, tag: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, findings, id, seed, tag)
  await page.screenshot({ path: `${OUT}/${id}-${seed}-${tag}-full.png`, fullPage: true })
}

function auditAll(findings: Record<string, Audit>): void {
  for (const [id, a] of Object.entries(findings)) {
    expect.soft(a.sideways, `${id}: sideways scroll`).toBeLessThanOrEqual(0)
    expect.soft(a.clipped, `${id}: clipped text`).toEqual([])
    expect.soft(a.overlaps, `${id}: overlapping controls`).toEqual([])
    expect.soft(a.tiny, `${id}: text under 12 px`).toEqual([])
  }
}

for (const size of SIZES) {
  test.describe(`${UNIT} look, the first-run stepper at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: the first-run stepper's six steps, re-walked from Settings`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 120_000)
        await enterShell(page, seed)
        await page.locator('[data-gear]').click()
        await page.getByRole('button', { name: copy.assumptionRewalkCta }).click()
        const heading = page.locator('main[data-setup-step] h1')
        await expect(heading).toBeVisible({ timeout: 30_000 })
        const findings: Record<string, Audit> = {}
        for (const step of SETUP_STEP_IDS) {
          await expect(page.locator(`main[data-setup-step="${step}"]`)).toBeAttached()
          await setupShot(page, findings, `setup-${step}`, seed, size.tag)
          if (step !== 'goals') await setupNext(page)
        }
        console.log(`[rc-look ${UNIT} stepper ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        auditAll(findings)
      })
    }

    test('a fresh plan: the first-run stepper’s "Start a new plan", each empty step, Complete waiting on facts, and Next refusing at the W gate', async ({ page }) => {
      test.setTimeout(120_000)
      const findings: Record<string, Audit> = {}
      await page.goto('/')
      await page.getByRole('button', { name: copy.coldStartBegin }).click()
      const names = page.getByRole('dialog', { name: copy.setupNewPlanTitle })
      await expect(names).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(450)
      await shot(page, findings, 'setup-new-plan', 'fresh', size.tag)
      await names.getByLabel(copy.setupNameYou).fill('Alex')
      await names.getByLabel(copy.setupNameSpouse).fill('Sam')
      await names.getByRole('button', { name: copy.setupNewPlanStart }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      for (const step of SETUP_STEP_IDS) {
        await expect(page.locator(`main[data-setup-step="${step}"]`)).toBeAttached()
        await setupShot(page, findings, step === 'goals' ? 'setup-complete-waiting' : `setup-${step}`, 'fresh', size.tag)
        if (step !== 'goals') await setupNext(page)
      }
      // Back to Family: one of them still working; then a chevron forward to Goals stops at Expenses on the missing W,
      // the W drawer opened at its field.
      await page.locator('[data-setup-steps] button').first().click()
      await page.locator('[data-profile-card="person-0"]').click()
      const person = page.getByRole('dialog')
      await person.getByRole('combobox', { name: copy.workStatusLegend }).click()
      await page.getByRole('option', { name: copy.workStatusWorking, exact: true }).click()
      await person.getByRole('button', { name: copy.profileDrawerSave }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.locator('[data-setup-steps] button').last().click()
      await expect(page.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeVisible()
      await page.waitForTimeout(600)
      await shot(page, findings, 'setup-next-refused', 'fresh', size.tag)
      console.log(`[rc-look ${UNIT} stepper fresh ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })
  })
}

// ── RC15 · Profile → Blueprint: each folder tab (the frame and the whole page), a tile's drawer on each, and Edit's
//    checklist with a category hidden. Filter by this block's own words: `-g "Blueprint's folder tabs"`. ─────────────────
const BLUEPRINT_TABS = [
  ['net-worth', copy.shellPageNetWorth],
  ['goals', copy.shellPageGoals],
  ['ise', copy.blueprintTabIse],
] as const

for (const size of SIZES) {
  test.describe(`${UNIT} look, Blueprint's folder tabs at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })
    for (const seed of SEEDS) {
      test(`?seed=${seed}: Blueprint, each folder tab (whole page too) and a tile's drawer on it, and Edit with a category hidden`, async ({ page }) => {
        test.setTimeout(FINAL_TIER_MS + 180_000)
        await enterShell(page, seed)
        const findings: Record<string, Audit> = {}
        await showScreen(page, screenById('blueprint'), size.phone)
        for (const [id, word] of BLUEPRINT_TABS) {
          await page.getByRole('tab', { name: word, exact: true }).click()
          await expect(page.locator(`[data-blueprint-tab="${id}"]`)).toBeAttached()
          await page.evaluate(() => window.scrollTo(0, 0))
          await shot(page, findings, `blueprint-${id}`, seed, size.tag)
          await page.screenshot({ path: `${OUT}/blueprint-${id}-${seed}-${size.tag}-full.png`, fullPage: true })
          const first = await page.locator('main.result [data-bp-tile]').first().getAttribute('data-profile-card')
          if (first !== null) await shootDrawer(page, findings, `blueprint-${id}`, seed, size.tag, first)
        }
        await page.getByRole('tab', { name: copy.shellPageNetWorth, exact: true }).click()
        await page.getByRole('button', { name: copy.blueprintEdit, exact: true }).click()
        await page.getByRole('checkbox', { name: copy.investBucketPretax }).click()
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, findings, 'blueprint-edit', seed, size.tag)
        console.log(`[rc-look ${UNIT} blueprint ${seed} ${size.tag}] ${JSON.stringify(findings)}`)
        auditAll(findings)
      })
    }
  })
}

// ── RC19 · the vault and session screens: the cold start, the unlock card (and a refused unlock with its words), the
//    recovery and restore cards, the damaged-vault notice, the save drawer's steps (passphrase, recovery word, backup,
//    done), the backup drawer, the re-entry gate, a second tab's view-only banner and the error boundary. Filter by this
//    block's own words: `-g "the vault and session screens"`. ─────────────────────────────────────────────────────────
import { DEV_VAULT_PASSPHRASE } from '../../src/ui/devSeeds'

const RC19_RECOVERY = 'lattice harbor cinder vellum 48 thicket'

for (const size of SIZES) {
  test.describe(`${UNIT} look, the vault and session screens at ${size.tag}`, () => {
    test.use({ ...size.use, reducedMotion: 'reduce' })

    test('the cold start, restore, the unlock card, a refused unlock, recovery and the damaged-vault notice', async ({ page }) => {
      test.setTimeout(180_000)
      const findings: Record<string, Audit> = {}
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: copy.coldStartQuestion })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-cold-start', 'fresh', size.tag)
      await page.getByRole('button', { name: copy.coldStartRestoreAction }).click()
      await expect(page.getByRole('heading', { name: copy.restoreHeading })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-restore-cold', 'fresh', size.tag)
      // The file step with a file picked (any file passes this step; the word step reads it): the name prints whole under
      // the box, Continue no longer withheld.
      const picked = 'the-back-nine-backup-2026-11-26.json'
      await page.locator('input[type="file"]').setInputFiles({ name: picked, mimeType: 'application/json', buffer: Buffer.from('{"stub":"backup"}') })
      await expect(page.getByText(picked, { exact: true })).toBeVisible()
      await shot(page, findings, 'vault-restore-picked', 'fresh', size.tag)

      // A planted vault: the unlock card (the dev plant fills the field), then a refused passphrase with its words.
      await page.goto('/?vault=retired')
      const unlock = page.getByRole('button', { name: copy.unlockButton })
      await expect(unlock).toBeVisible({ timeout: 60_000 })
      const box = page.getByLabel(copy.unlockLabel, { exact: true })
      await box.fill('')
      await shot(page, findings, 'vault-unlock', 'retired', size.tag)
      await box.fill('not the passphrase at all')
      await unlock.click()
      await expect(page.getByRole('alert').filter({ hasText: copy.unlockWrongCredential })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-unlock-refused', 'retired', size.tag)

      // The recovery card, then back.
      await page.getByRole('button', { name: copy.unlockForgot }).click()
      await expect(page.getByRole('heading', { name: copy.recoverHeading })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-recovery', 'retired', size.tag)

      // The damaged-vault notice: one of the vault's three records taken away, then a reload.
      await page.evaluate(
        () =>
          new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('the-back-nine-vault')
            open.onsuccess = () => {
              const tx = open.result.transaction('vault', 'readwrite')
              tx.objectStore('vault').delete('recoveryWrap')
              tx.oncomplete = () => {
                open.result.close()
                resolve()
              }
              tx.onerror = () => reject(tx.error)
            }
            open.onerror = () => reject(open.error)
          }),
      )
      await page.goto('/')
      await expect(page.locator('[data-restore-intro="damaged"]'), 'the damaged-vault notice').toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-damaged', 'retired', size.tag)
      console.log(`[rc-look ${UNIT} vault entry ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })

    test('the save drawer, step by step, then the backup drawer from the lock menu', async ({ page }) => {
      test.setTimeout(FINAL_TIER_MS + 120_000)
      const findings: Record<string, Audit> = {}
      await enterShell(page, 'retired')
      await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
      await page.getByRole('menuitem', { name: copy.saveCta }).click()
      const drawer = page.getByRole('dialog', { name: copy.saveDrawerTitle })
      await expect(drawer).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(400)
      await shot(page, findings, 'vault-save-passphrase', 'retired', size.tag)
      // A passphrase under the floor, refused with its words, then one that clears it.
      await drawer.getByLabel(copy.passphraseLabel, { exact: true }).fill('short')
      await drawer.getByLabel(copy.passphraseConfirmLabel, { exact: true }).fill('short')
      // Withheld (`aria-disabled`, kept pressable so it can say why): Playwright's click waits for "enabled", so force it.
      await drawer.getByRole('button', { name: copy.flowNext, exact: true }).click({ force: true })
      await expect(drawer.getByRole('alert').filter({ hasText: copy.passphraseTooShort })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-save-refused', 'retired', size.tag)
      await drawer.getByLabel(copy.passphraseLabel, { exact: true }).fill(DEV_VAULT_PASSPHRASE)
      await drawer.getByLabel(copy.passphraseConfirmLabel, { exact: true }).fill(DEV_VAULT_PASSPHRASE)
      await drawer.getByRole('button', { name: copy.flowNext, exact: true }).click()
      await expect(drawer.getByRole('heading', { name: copy.recoveryHeading })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-save-recovery', 'retired', size.tag)
      // A one-word recovery word, refused with the recovery step's own words.
      await drawer.getByLabel(copy.recoveryLabel, { exact: true }).fill('harbor')
      await drawer.getByLabel(copy.recoveryConfirmLabel, { exact: true }).fill('harbor')
      await drawer.getByRole('button', { name: copy.flowNext, exact: true }).click({ force: true })
      await expect(drawer.getByRole('alert').filter({ hasText: copy.recoveryTooShort })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-save-recovery-refused', 'retired', size.tag)
      await drawer.getByLabel(copy.recoveryLabel, { exact: true }).fill(RC19_RECOVERY)
      await drawer.getByLabel(copy.recoveryConfirmLabel, { exact: true }).fill(RC19_RECOVERY)
      await drawer.getByRole('button', { name: copy.flowNext, exact: true }).click()
      await expect(drawer.getByRole('heading', { name: copy.exportHeading })).toBeVisible({ timeout: 60_000 })
      await shot(page, findings, 'vault-save-backup', 'retired', size.tag)
      await drawer.getByRole('button', { name: copy.exportShowText, exact: true }).click()
      await drawer.getByRole('button', { name: copy.exportTextSaved, exact: true }).click()
      await shot(page, findings, 'vault-save-backup-saved', 'retired', size.tag)
      await drawer.getByRole('button', { name: copy.exportFinish, exact: true }).click()
      await expect(drawer.getByRole('heading', { name: copy.savedHeading })).toBeVisible()
      await shot(page, findings, 'vault-save-done', 'retired', size.tag)
      await drawer.getByRole('button', { name: copy.savedDone, exact: true }).click()
      await expect(drawer).toHaveCount(0)
      // Back up and export: the lock menu's door opens its own drawer.
      await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
      await page.getByRole('menuitem', { name: copy.backupDoorCta }).click()
      const backup = page.getByRole('dialog', { name: copy.backupDoorCta })
      await expect(backup).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(400)
      await shot(page, findings, 'vault-backup-drawer', 'retired', size.tag)
      console.log(`[rc-look ${UNIT} vault save ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })

    test('the re-entry gate on a return, then a second tab: view-only, its gate and its banner over the home', async ({ page, context }) => {
      test.setTimeout(FINAL_TIER_MS + 180_000)
      const findings: Record<string, Audit> = {}
      await page.goto('/?vault=date')
      await page.getByRole('button', { name: copy.unlockButton }).click()
      await expect(page.getByRole('heading', { name: copy.reentryHeading })).toBeVisible({ timeout: 60_000 })
      await shot(page, findings, 'vault-reentry', 'date', size.tag)
      // The first tab holds the writer; a second tab of the same browser opens the plan view-only.
      const second = await context.newPage()
      await second.goto('/')
      await second.getByLabel(copy.unlockLabel, { exact: true }).fill(DEV_VAULT_PASSPHRASE)
      await second.getByRole('button', { name: copy.unlockButton }).click()
      await expect(second.getByRole('button', { name: copy.reentryContinueCta })).toBeVisible({ timeout: 60_000 })
      await expect(second.getByText(copy.unlockReadOnlyLead, { exact: true })).toBeVisible()
      await shot(second, findings, 'vault-reentry-view-only', 'date', size.tag)
      await second.getByRole('button', { name: copy.reentryContinueCta }).click()
      await expect(second.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached({ timeout: 60_000 })
      await expect(second.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      await second.evaluate(() => window.scrollTo(0, 0))
      await shot(second, findings, 'vault-view-only-banner', 'date', size.tag)
      console.log(`[rc-look ${UNIT} vault return ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })

    test('the error boundary in the shell’s frame (a chunk that never loads)', async ({ page }) => {
      test.setTimeout(120_000)
      const findings: Record<string, Audit> = {}
      // The lazy intake chunk fails to load (offline with an evicted cache, insight 053): "Start a new plan" meets the
      // boundary, never a blank page.
      await page.route('**/src/ui/IntakeApp.tsx*', (r) => r.abort())
      await page.goto('/')
      await page.getByRole('button', { name: copy.coldStartBegin }).click()
      await expect(page.getByRole('button', { name: copy.restoreRetry })).toBeVisible({ timeout: 30_000 })
      await shot(page, findings, 'vault-error-boundary', 'fresh', size.tag)
      console.log(`[rc-look ${UNIT} vault boundary ${size.tag}] ${JSON.stringify(findings)}`)
      auditAll(findings)
    })
  })
}
