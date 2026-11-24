import { expect, type Page } from '@playwright/test'
import { PHONE, PHONE_DPR, REAL, REAL_DPR, gotoSeedFinal, settleLayout, test } from '../reviewSurface'
import { copy } from '../../src/ui/copy'

/**
 * e2e/held/rail-look.spec.ts — an INSTRUMENT, never a gate (the workbench plan's U15: "the rail at his laptop window
 * and at a phone width, no clipping, no element over another, every figure legible"). It drives the real What if page
 * on the dev server, pulls a lever, waits for the what-if's reading and paired years, and records:
 *  - the page's sideways overflow (none is the law);
 *  - text clipped by its own box (an element whose content is wider than a box that does not show its overflow);
 *  - controls drawn over one another (any two visible controls whose boxes intersect, ancestor pairs excluded);
 *  - text under 12 CSS px;
 *  - Apply's place before and after the what-if's reading lands (insight 035: it must not move under a finger).
 * Screenshots land in the folder `RAIL_SHOTS` names (the builder's scratchpad), never in the repo.
 *
 *     RAIL_SHOTS=<dir> pnpm exec playwright test --config e2e/held/shots.config.ts rail-look
 */

const SHOTS = process.env.RAIL_SHOTS ?? 'test-results/rail-look'

interface Audit {
  readonly sideways: number
  readonly clipped: readonly string[]
  readonly overlaps: readonly string[]
  readonly tiny: readonly string[]
}

async function audit(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const root = document.querySelector('.wb-whatif')!
    const doc = document.documentElement
    // Inside a closed lever only its summary is drawn: the rest is laid out but never painted.
    const inClosedLever = (el: Element) => {
      const d = el.closest('details:not([open])')
      return d !== null && el.closest('summary')?.parentElement !== d
    }
    const shown = (el: Element) => {
      if (inClosedLever(el)) return false
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
    }
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 40)}"`
    const clipped = [...root.querySelectorAll('*')]
      .filter((el) => shown(el) && !el.classList.contains('sr-only'))
      .filter((el) => {
        const cs = getComputedStyle(el)
        if (cs.overflowX === 'visible' || cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false
        return el.scrollWidth > el.clientWidth + 1
      })
      .map(name)
    const controls = [...root.querySelectorAll('button, input, select, summary, label.segment, label.wb-lever__policy')].filter(
      (el) => shown(el) && !el.closest('[inert]'),
    )
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
    const tiny = [...root.querySelectorAll('*')]
      .filter((el) => shown(el) && !el.closest('.sr-only') && [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== ''))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .map(name)
    return { sideways: doc.scrollWidth - doc.clientWidth, clipped, overlaps, tiny }
  })
}

async function openWhatIf(page: Page, seed: string) {
  await gotoSeedFinal(page, seed)
  // Since Act 6 · RC4 the seed lands on the home and the What if page is Analysis's interim folder tab: Retirement (the
  // module word at a laptop, the menu's Analysis on a phone), then the tab.
  const modules = page.getByRole('navigation', { name: copy.shellModulesLabel })
  if (await modules.isVisible()) await modules.getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
  else {
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    await page.getByRole('dialog', { name: copy.shellMenuTitle }).getByRole('link', { name: copy.shellPageAnalysis, exact: true }).click()
  }
  await page.getByRole('tab', { name: copy.workbenchPageWhatIf, exact: true }).click()
  await expect(page.locator('.wb-whatif')).toBeVisible()
}

/** Bring the page's top into view, as a reader lands on it (the room's pinned seat went with the room at RC2). */
async function toPageTop(page: Page) {
  await page.evaluate(() => {
    const top = document.querySelector('.wb-whatif')!.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, Math.max(0, top - 12))
  })
}

/** Apply's box in PAGE coordinates (a click scrolls the page to its target; the viewport box would read that scroll). */
const applyBox = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('.wb-apply__go')!.getBoundingClientRect()
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }
  })

test.describe('at his laptop window (1440×731 at 2×)', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('a working household: a stop year pulled; the readings land and Apply holds still', async ({ page }) => {
    test.setTimeout(300_000)
    await openWhatIf(page, 'dip')
    await page.locator('.wb-lever[data-lever="stop-year"] > summary').click()
    const select = page.locator('.wb-lever[data-lever="stop-year"] select')
    const planYear = Number(await select.inputValue())
    const before = await applyBox(page)
    await select.selectOption(String(planYear + 2))
    const pending = await applyBox(page)
    await expect(page.locator('.wb-pair')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.wb-reading').nth(1).locator('.wb-reading__count')).not.toHaveText('')
    await settleLayout(page)
    await toPageTop(page)
    const landed = await applyBox(page)
    test.info().annotations.push({ type: 'apply-box', description: JSON.stringify({ before, pending, landed }) })
    expect(pending?.y, 'Apply moved when the lever committed').toBe(before?.y)
    expect(landed.y, 'Apply moved when the what-if landed').toBe(before.y)
    const a = await audit(page)
    test.info().annotations.push({ type: 'audit', description: JSON.stringify(a) })
    await page.screenshot({ path: `${SHOTS}/rail-1440x731.png` })
    await page.screenshot({ path: `${SHOTS}/rail-1440x731-full.png`, fullPage: true })
    expect(a.sideways).toBeLessThanOrEqual(0)
    expect(a.clipped).toEqual([])
    expect(a.overlaps).toEqual([])
    expect(a.tiny).toEqual([])
  })
})

test.describe('at a phone (390×844 at 3×)', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test('an all-retired household with a budget: the withdrawal order pulled; the readings and the year blocks read', async ({ page }) => {
    test.setTimeout(300_000)
    await openWhatIf(page, 'budget')
    await page.locator('.wb-lever[data-lever="withdrawal-order"] > summary').click()
    const before = await applyBox(page)
    await page.locator('.wb-lever[data-lever="withdrawal-order"] input[value="bracket-fill"]').click()
    const pending = await applyBox(page)
    await expect(page.locator('.wb-pair-blocks')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.wb-reading').nth(1).locator('.wb-reading__count')).not.toHaveText('')
    await settleLayout(page)
    const landed = await applyBox(page)
    test.info().annotations.push({ type: 'apply-box', description: JSON.stringify({ before, pending, landed }) })
    expect(pending?.y, 'Apply moved when the lever committed').toBe(before?.y)
    expect(landed.y, 'Apply moved when the what-if landed').toBe(before.y)
    const a = await audit(page)
    test.info().annotations.push({ type: 'audit', description: JSON.stringify(a) })
    await page.evaluate(() => document.querySelector('.wb-apply')!.scrollIntoView({ block: 'start' }))
    await page.screenshot({ path: `${SHOTS}/rail-390x844.png` })
    await page.evaluate(() => document.querySelector('.wb-lever[data-lever="withdrawal-order"]')!.scrollIntoView({ block: 'start' }))
    await page.screenshot({ path: `${SHOTS}/rail-390x844-levers.png` })
    await page.screenshot({ path: `${SHOTS}/rail-390x844-full.png`, fullPage: true })
    expect(a.sideways).toBeLessThanOrEqual(0)
    expect(a.clipped).toEqual([])
    expect(a.overlaps).toEqual([])
    expect(a.tiny).toEqual([])
  })
})
