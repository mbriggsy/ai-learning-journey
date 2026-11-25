import { expect, type Page } from '@playwright/test'
import { test, REAL, REAL_DPR, PHONE, PHONE_DPR, gotoSeedFinal, settleLayout } from './reviewSurface'
import { hcAudit, hcFloorPx, hcMarkFailures, hcMarks, hcTextFailures } from './hcTextAudit'
import { copy } from '../src/ui/copy'

/**
 * The RECOMMENDATION chart-text gate (`verify:fit:rv`, playwright.fit-rv.config.ts), rewritten for Act 6 · RC8 (plan
 * docs/plans/6-rightcapital-ui-plan.md, section 5.2's row for this harness: "rewritten on Tax Strategies (Summary bars,
 * the Winner card's hero), same serialized harness and job"). It stays on its own SERIALIZED harness because its subject
 * exists only after a full-precision worker solve (insight 121: CPU-bound solves beside the fit arms would starve them).
 *
 * WHAT IT DRIVES. `?seed=surplus`, the over-funded household whose solve commits a RECOMMENDED payload with a real
 * leave-more delta: Tax → Tax Strategies, "Leave more behind" on the page's own radio, Find, Calculating, then the Winner
 * card, polled for up to COMMITTED_LOCKUP_MS. A held card, or the no-change register, is a RED, never a skip: the gate
 * exists to read the hero's figure and the Summary bars, and a seed that stops committing one must be re-picked.
 *
 * WHAT IT AUDITS, at PHONE (the narrowest box: the two bars' printed figures sit closest) and REAL (his window):
 *  - the Winner card's hero: present, in the goal's words with its figure ("~$X more left to your heirs"), drawn at or
 *    above the clone's leaf floor (`--text-axis`), inside its card and the page, and never cut (no box hides its overflow);
 *    the check is new, so a shrunk-hero plant must red it once (the planted-fail discipline, insights 016/029);
 *  - the Summary bars (Highcharts' DOM, `hcTextAudit.ts`): the metric's name, each bar's printed figure and the legend
 *    present, visible, unclipped and at the floor; and the marks oracles: no printed figure over a bar or over the other
 *    figure, nothing past the chart's frame (RC8's look found the two figures overprinting each other on the phone).
 */

/** The committed solve's own wait (re-budgeted 2026-10-04 from CI's `[rv-lockup]` lines on the pooled v9 build: worst arm
 *  175.2 s on CI's 4-vCPU runner; 360 s is ≥ 2× it). Re-read the `[rv-lockup]` lines after any roster growth. */
const COMMITTED_LOCKUP_MS = 360_000

const ARMS = [
  { name: 'PHONE', use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
  { name: 'REAL', use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
] as const

/** `?seed=surplus` to its Winner card. */
async function gotoWinner(page: Page): Promise<void> {
  await gotoSeedFinal(page, 'surplus')
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    const menu = page.getByRole('dialog', { name: copy.shellMenuTitle })
    await menu.getByRole('link', { name: copy.shellPageTaxStrategies, exact: true }).click()
    await expect(menu).toHaveCount(0)
  }
  await expect(page.locator('main.result[data-shell-screen="tax-strategies"]'), 'Tax Strategies never showed').toBeAttached()
  const radio = page.getByRole('radio', { name: new RegExp(copy.goalLeaveMoreLabel) })
  await radio.check()
  await expect(radio, 'the goal radio did not commit').toBeChecked()
  await page.getByRole('button', { name: copy.taxStratFind, exact: true }).click()
  await expect(page.locator('[data-calculating]'), 'Calculating never showed (a refusal would land at once here)').toBeVisible()
  const pendingAt = Date.now()
  await expect(page.locator('[data-winner], [data-notice="held"]'), 'no Winner card after the full-precision solve').toBeVisible({ timeout: COMMITTED_LOCKUP_MS })
  // THE RE-BUDGET INSTRUMENT: CI's reporters print no per-test time on a green run, so this line is the measurement.
  const lockupS = (Date.now() - pendingAt) / 1000
  const arm = test.info().titlePath.at(-2) ?? test.info().title
  console.log(`[rv-lockup] ${arm}: ${lockupS.toFixed(1)} s of the ${COMMITTED_LOCKUP_MS / 1000} s budget`)
  await expect(page.locator('[data-winner="active"]'), '?seed=surplus produced no ACTIVE Winner card (a hold, or the no-change register): this gate has no figure to read; re-pick the seed').toHaveCount(1)
  await settleLayout(page)
}

type HeroRead = { readonly text: string; readonly fontPx: number; readonly inCard: boolean; readonly inPage: boolean; readonly cut: string }

async function readHero(page: Page): Promise<HeroRead> {
  return page.locator('[data-winner-hero]').evaluate((el) => {
    const r = el.getBoundingClientRect()
    const card = el.closest('[data-winner]')!.getBoundingClientRect()
    let cut = ''
    for (let n: Element | null = el; n !== null && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const hides = (v: string) => v === 'hidden' || v === 'clip'
      if ((hides(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) || (hides(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || cs.textOverflow === 'ellipsis') {
        cut = `${n.tagName.toLowerCase()}.${(n.getAttribute('class') ?? '').slice(0, 40)}`
        break
      }
    }
    return {
      text: (el.textContent ?? '').trim(),
      fontPx: parseFloat(getComputedStyle(el).fontSize),
      inCard: r.left >= card.left - 1 && r.right <= card.right + 1 && r.top >= card.top - 1 && r.bottom <= card.bottom + 1,
      inPage: r.left >= -1 && r.right <= document.documentElement.clientWidth + 1,
      cut,
    }
  })
}

function heroFailures(h: HeroRead, floor: number): string[] {
  const out: string[] = []
  if (!/^~\$[\d,]+ more left to your heirs$/.test(h.text)) out.push(`words: the hero reads "${h.text}", not the leave-more hero with its figure`)
  if (h.fontPx < floor - 0.01) out.push(`shrunk: the hero renders at ${h.fontPx}px, under the ${floor}px floor`)
  if (!h.inCard) out.push('clipped: the hero leaves its card')
  if (!h.inPage) out.push('clipped: the hero leaves the page')
  if (h.cut !== '') out.push(`clipped: ${h.cut} hides the hero's overflow`)
  return out
}

for (const arm of ARMS) {
  test.describe(`Recommendation chart text — ${arm.name} (${arm.use.viewport.width}×${arm.use.viewport.height})`, () => {
    test.use({ ...arm.use, reducedMotion: 'reduce' })

    test('the Winner card’s hero and the Summary bars: readable, inside their boxes, never overprinting — and the hero audit bites', async ({ page }) => {
      await gotoWinner(page)
      const floor = await hcFloorPx(page)
      expect(floor, 'the --text-axis token did not resolve').toBeGreaterThanOrEqual(12)

      // THE HERO.
      expect(heroFailures(await readHero(page), floor), `${arm.name}: the Winner card’s hero`).toEqual([])
      // The plant, on the node itself: a shrunk hero must red the floor oracle with its own message, then come back.
      await page.locator('[data-winner-hero]').evaluate((el) => (el as HTMLElement).style.setProperty('font-size', '8px'))
      expect(heroFailures(await readHero(page), floor).some((f) => f.startsWith('shrunk:')), `${arm.name}: the planted 8px hero went unseen — the hero audit is vacuous`).toBe(true)
      await page.locator('[data-winner-hero]').evaluate((el) => (el as HTMLElement).style.removeProperty('font-size'))
      expect(heroFailures(await readHero(page), floor), `${arm.name}: the hero after the plant`).toEqual([])

      // THE SUMMARY BARS.
      await page.getByRole('tab', { name: copy.taxStratTabSummary }).click()
      await expect(page.locator('[data-chart="tax-summary"] .highcharts-series-group'), 'the Summary bars never drew').toBeAttached({ timeout: 30_000 })
      await page.locator('[data-summary-chart]').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
      const figures = (await page.locator('[data-chart="tax-summary"] .highcharts-data-label text').allTextContents()).map((t) => t.trim())
      expect(figures, `${arm.name}: two printed figures, one per bar`).toHaveLength(2)
      for (const f of figures) expect(f, `${arm.name}: a bar prints "${f}", not a ~$ figure`).toMatch(/^~\$[\d.,]+(mm|k)?$/)
      const text = hcTextFailures(await hcAudit(page, '[data-chart="tax-summary"]', '[data-summary-chart]'), floor, {
        texts: [copy.taxStratMetricLeaveMore, copy.recVizWithLabel, copy.recVizWithoutLabel, ...figures],
        counts: { 'data-label': 2, 'legend-item': 2, 'axis-label': 3 },
      })
      expect(text, `${arm.name}: the Summary bars’ text`).toEqual([])
      expect(hcMarkFailures(await hcMarks(page, '[data-chart="tax-summary"]', '[data-summary-chart]')), `${arm.name}: the Summary bars’ marks`).toEqual([])
    })
  })
}
