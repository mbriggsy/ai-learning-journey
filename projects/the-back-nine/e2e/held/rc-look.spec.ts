import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, PHONE, PHONE_DPR, REAL, REAL_DPR, SETTLED_RESULT, gotoSeedFinal, settleLayout, test } from '../reviewSurface'
import { copy } from '../../src/ui/copy'

/**
 * e2e/held/rc-look.spec.ts: an INSTRUMENT, never a gate (Act 6's "Local look", plan docs/plans/6-rightcapital-ui-plan.md
 * sections 4.0 and 7.1 point 4). For each unit it captures every finished screen at his window (1440×731 @2) and a phone
 * (390×844 @3), for a retired seed (`retired`) and a working one (`date`), entered through the answer page's door as a
 * user would, and audits each frame:
 *  - the page never scrolls sideways;
 *  - no text is clipped (an element whose content is wider or taller than a box that hides its overflow; an ellipsis
 *    counts as clipped, since the kit never cuts text to fit);
 *  - no two visible controls overlap;
 *  - no text under 12 CSS px.
 * The phone's menu is captured open too. Screenshots land in the repo's gitignored `temp/rc-shots/<unit>/`, named
 * `<screen>-<seed>-<size>.png`, for Briggsy to review the output.
 *
 *     RC_UNIT=RC2 pnpm exec playwright test --config e2e/held/shots.config.ts rc-look
 */

const UNIT = process.env.RC_UNIT ?? 'RC2'
const OUT = `temp/rc-shots/${UNIT}` // resolved from the run's working directory, the project root
const SEEDS = ['retired', 'date'] as const
const SCREENS = [
  { id: 'cash-flows', screen: 'interim-table', module: copy.shellModuleRetirement, page: copy.shellPageCashFlows },
  { id: 'what-if', screen: 'interim-whatif', module: copy.shellModuleRetirement, page: copy.shellPageAnalysis },
  { id: 'facts', screen: 'interim-facts', module: copy.shellModuleProfile, page: copy.workbenchPageFacts },
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
      if (el.closest('[aria-hidden="true"], .sr-only, [inert]') !== null) return false
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
  await page.locator('.result-quiet-row [data-door="workbench"]').click()
  await expect(page.locator('main.result[data-shell-screen]')).toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
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
  if (target.screen === 'interim-table') await expect(page.locator('.wb-table, .wb-state:not(.wb-state--loading)').first()).toBeVisible({ timeout: 60_000 })
  await settleLayout(page)
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
