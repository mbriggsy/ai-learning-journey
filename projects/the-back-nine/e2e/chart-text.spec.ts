import { test, expect, type Page } from '@playwright/test'
import { REAL, REAL_DPR, FLOOR, PHONE, PHONE_DPR, gotoSeedFinal, settleLayout } from './reviewSurface'

/**
 * THE CHART TEXT GATE (council wf_ecbe0ab2-7bb, 2026-09-05 — run via `pnpm verify:fit`, harness in
 * playwright.fit.config.ts, so it is CI-enforced with the fit law).
 *
 * WHY IT EXISTS. The four result charts drew their words as SVG <text> inside a fixed 560-wide viewBox at
 * width:100%, so every label scaled with the figure: measured 6.1–8.3 CSS px on a 390 phone, 8.0–9.5 at the
 * 1088 two-pane floor, 10–11.5 on the 1536 laptop (temp/chart-text, kept). Nothing in CI could see it —
 * the two label gates asserted PRESENCE, and the de-collision suite derived its expectations from the same
 * glyph constant under test. Every word now lives in the HTML chart text layer (src/viz/chartText.tsx) at the
 * product's own type scale; this gate is the real-browser proof that the words are READABLE, INSIDE their
 * figure, and never on top of each other — with a planted-fail control on each oracle, so a green here is a
 * green that could have been red (insight 032 / 016).
 *
 * WHAT IT PINS, on every arm the product ships to (PHONE 390 @3 touch · a 320 reflow arm · FLOOR 1088 · REAL
 * 1536 @2.5):
 *  - THE FLOOR: every visible chart text node renders at ≥ --text-xs (READ from tokens.css at runtime,
 *    never re-typed here — the smallest register the system already wears; insight 082).
 *  - CONTAINMENT: every visible node's box lies inside its chart's figure (an end-anchored dollar that
 *    clipped LEFT read as a plausible WRONG dollar in the svg era — the red team's decisive attack).
 *  - NON-OVERLAP: no two visible nodes of one chart intersect (the measured collision layout does its job).
 *  - NOTHING NAMED IS HIDDEN: an unnamed interim age tick may yield on a collision; a named moment never.
 *  - THE READER'S FONT: raising the browser default font makes the chart text LARGER, never smaller (the svg
 *    era shrank phone chart text from 6.88 to 5.99 CSS px as the reader turned their font UP).
 *  - REDUCED MOTION: the text layer renders the same node set with motion on and off.
 *
 * Every measurement waits for the FINAL engine tier (gotoSeedFinal) and a settled layout (settleLayout).
 */

type Node = {
  readonly text: string
  readonly cls: string
  readonly fontPx: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly hidden: boolean
  readonly optional: boolean
}
type Audit = {
  readonly figure: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
  readonly nodes: readonly Node[]
  readonly svgTextCount: number
}

/** The legibility floor, read from the live stylesheet: the computed size of a --text-xs probe. */
async function floorPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const p = document.createElement('span')
    p.style.fontSize = 'var(--text-xs)'
    p.textContent = 'x'
    document.body.appendChild(p)
    const px = parseFloat(getComputedStyle(p).fontSize)
    p.remove()
    return px
  })
}

/** Every chart text node inside `figureSelector`. The containment bound is the chart's enclosing
 *  CARD or COLUMN — the band's drawer, a lever sheet's dialog, else the main content column — not
 *  the bare svg box: a y-tick column may borrow a few px of its card's padding on the 320 reflow arm
 *  (it renders inside the card, on screen, unclipped), while a label that leaves the card is the
 *  clipped-dollar defect this gate exists to catch. */
async function audit(page: Page, figureSelector: string): Promise<Audit> {
  return page.evaluate((sel) => {
    const fig = document.querySelector(sel)
    if (!fig) throw new Error(`chart-text: no figure matches ${sel}`)
    const bound = fig.closest('.band-drawer') ?? fig.closest('[role="dialog"]') ?? fig.closest('main') ?? fig
    const fb = bound.getBoundingClientRect()
    const nodes = [...fig.querySelectorAll<HTMLElement>('.ct-text, .ct-block__item')].map((el) => {
      const cs = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      return {
        text: (el.textContent ?? '').trim(),
        cls: el.className,
        fontPx: parseFloat(cs.fontSize),
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        hidden: cs.visibility === 'hidden' || cs.display === 'none' || el.hasAttribute('data-ct-hidden'),
        optional: el.hasAttribute('data-ct-optional'),
      }
    })
    return {
      figure: { left: fb.left, right: fb.right, top: fb.top, bottom: fb.bottom },
      nodes,
      svgTextCount: fig.querySelectorAll('svg text').length,
    }
  }, figureSelector)
}

const TOL = 1 // px — sub-pixel rounding at fractional device scales

function assertChartText(a: Audit, floor: number, label: string): void {
  expect(a.svgTextCount, `${label}: the svg must carry NO <text> — every word is HTML`).toBe(0)
  const visible = a.nodes.filter((n) => !n.hidden && n.text !== '')
  expect(visible.length, `${label}: no visible chart text at all`).toBeGreaterThan(0)
  for (const n of visible) {
    expect(n.fontPx, `${label}: "${n.text}" renders at ${n.fontPx}px — under the ${floor}px floor (--text-xs)`).toBeGreaterThanOrEqual(floor - 0.01)
    expect(
      n.left >= a.figure.left - TOL && n.right <= a.figure.right + TOL && n.top >= a.figure.top - TOL && n.bottom <= a.figure.bottom + TOL,
      `${label}: "${n.text}" [${n.left.toFixed(1)},${n.right.toFixed(1)}]×[${n.top.toFixed(1)},${n.bottom.toFixed(1)}] leaves its figure ` +
        `[${a.figure.left.toFixed(1)},${a.figure.right.toFixed(1)}]×[${a.figure.top.toFixed(1)},${a.figure.bottom.toFixed(1)}]`,
    ).toBe(true)
  }
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const p = visible[i]!
      const q = visible[j]!
      const overlap = p.left < q.right - 0.5 && p.right > q.left + 0.5 && p.top < q.bottom - 0.5 && p.bottom > q.top + 0.5
      expect(overlap, `${label}: "${p.text}" overprints "${q.text}"`).toBe(false)
    }
  }
  // a hidden node must be an OPTIONAL one (an interim age tick or an intermediate x tick)
  for (const n of a.nodes.filter((n) => n.hidden)) {
    expect(n.optional || /tf__axis--xtick|ladder-xtick/.test(n.cls), `${label}: a NAMED label was hidden: "${n.text}"`).toBe(true)
  }
}

const ARMS = [
  { name: 'PHONE', use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
  { name: 'NARROW', use: { viewport: { width: 320, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'FLOOR', use: { viewport: FLOOR } },
  { name: 'REAL', use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
] as const

for (const arm of ARMS) {
  test.describe(`chart text — ${arm.name} (${arm.use.viewport.width}×${arm.use.viewport.height})`, () => {
    test.use(arm.use)

    test('the band on the densest date household (the split label): readable, inside, never overprinting', async ({ page }) => {
      // `datemixed` carries the widest named moment ("Essentials date") and two annotation rows; it
      // renders NO ladder (the crowned date is the essentials date, not a work-optional one).
      await gotoSeedFinal(page, 'datemixed')
      const floor = await floorPx(page)
      expect(floor, 'the --text-xs token did not resolve').toBeGreaterThanOrEqual(12)
      assertChartText(await audit(page, 'figure.band-figure'), floor, `${arm.name} band/datemixed`)
      // the $0 anchor — design-law §3's honesty proof — is present and visible
      await expect(page.locator('figure.band-figure .band-tick--floor')).toHaveText('$0')
      await expect(page.locator('figure.band-figure .band-tick--floor')).toBeVisible()
    })

    test('the band + the odds ladder on the date household: readable, inside, never overprinting', async ({ page }) => {
      await gotoSeedFinal(page, 'datesplit')
      const floor = await floorPx(page)
      assertChartText(await audit(page, 'figure.band-figure'), floor, `${arm.name} band/datesplit`)
      assertChartText(await audit(page, 'figure.ladder-figure'), floor, `${arm.name} ladder/datesplit`)
      // the crown callout sits INSIDE the figure (it flips beside the dot only at the ceiling rung)
      await expect(page.locator('figure.ladder-figure .ladder-crown')).toBeVisible()
    })

    test('the spine band (the one-frame fit-law household) keeps ONE annotation row and readable ticks', async ({ page }) => {
      await gotoSeedFinal(page, 'retired')
      const floor = await floorPx(page)
      assertChartText(await audit(page, 'figure.band-figure'), floor, `${arm.name} band/retired`)
      // the fit-law arms rest on a one-row annotation block (temp/chart-text/precondition.json)
      const rows = await page.locator('figure.band-figure .band-annotations').evaluate((el) => getComputedStyle(el).getPropertyValue('--ct-rows').trim())
      expect(rows, `${arm.name}: the spine household grew a second annotation row`).toBe('1')
    })

    test('TwoFutures in a lever sheet: wrapped end labels, hidden-only-ticks, readable', async ({ page }) => {
      await gotoSeedFinal(page, 'retired')
      await page.locator('.result-quiet-row button', { hasText: 'Change your withdrawal order' }).first().click()
      const dialog = page.locator('[role="dialog"]').last()
      await expect(dialog).toBeVisible()
      // Pick a different policy by NATIVE click (the sr-only radio trap the caddie walk documents —
      // the label intercepts a pointer click; el.click() is layout-independent and still bubbles to
      // React's root), asserted checked so a missed pick fails RED here rather than as "no chart".
      // Pin the radio by VALUE before clicking: a `:not(:checked)` locator re-resolves to the NEXT
      // unchecked radio once this one commits, so asserting on it would always fail.
      const value = await dialog.locator('.control-policies input[type="radio"]:not(:checked)').first().getAttribute('value')
      const radio = dialog.locator(`.control-policies input[type="radio"][value="${value}"]`)
      await radio.evaluate((el) => (el as HTMLInputElement).click())
      await expect(radio, 'the policy radio did not commit').toBeChecked()
      const chart = dialog.locator('svg.tf')
      await expect(chart, 'the lever preview never rendered its TwoFutures chart').toBeVisible({ timeout: 90_000 })
      await settleLayout(page)
      await chart.scrollIntoViewIfNeeded()
      const floor = await floorPx(page)
      assertChartText(await audit(page, '.tf-host'), floor, `${arm.name} tf/order`)
      // both end labels (a REQUIRED non-color channel) are visible
      const labels = dialog.locator('.tf__label:not([data-ct-hidden])')
      await expect(labels).toHaveCount(2)
    })
  })
}

// ── the planted-fail controls: each oracle above must be able to go red ────────────────────────
test.describe('chart text — the oracles bite (planted-fail controls)', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test('a planted CLIP (a tick shoved past the figure edge) and a planted SHRINK are both caught', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    // baseline: green
    assertChartText(await audit(page, 'figure.band-figure'), floor, 'control baseline')
    // plant a clip via the same CSSOM channel the layer uses (-0.6 of the host: well past the drawer's
    // 24px padding, so the bound — the card — is genuinely left, not just the svg box)
    await page.locator('figure.band-figure .band-tick').first().evaluate((el) => (el as HTMLElement).style.setProperty('--fx', '-0.6'))
    const clipped = await audit(page, 'figure.band-figure')
    const first = clipped.nodes.find((n) => n.cls.includes('band-tick'))!
    expect(first.left < clipped.figure.left - TOL, 'the planted clip did not leave the card — the containment oracle is vacuous').toBe(true)
    expect(() => assertChartText(clipped, floor, 'planted clip')).toThrow()
    // plant a shrink
    await page.locator('figure.band-figure .band-tick').first().evaluate((el) => {
      ;(el as HTMLElement).style.setProperty('--fx', '')
      ;(el as HTMLElement).style.fontSize = '8px'
    })
    const shrunk = await audit(page, 'figure.band-figure')
    expect(() => assertChartText(shrunk, floor, 'planted shrink')).toThrow()
  })
})

// ── the reader's font: chart text follows the browser default UP, never down ──────────────────
test.describe('chart text — follows the reader’s browser font size', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test('at a 20px default the smallest chart text is LARGER than at 16px (the svg era shrank it)', async ({ page, context }) => {
    await gotoSeedFinal(page, 'retired')
    const at16 = await audit(page, 'figure.band-figure')
    const min16 = Math.min(...at16.nodes.filter((n) => !n.hidden && n.text !== '').map((n) => n.fontPx))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 20 } })
    await page.reload()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
    await settleLayout(page)
    const at20 = await audit(page, 'figure.band-figure')
    const min20 = Math.min(...at20.nodes.filter((n) => !n.hidden && n.text !== '').map((n) => n.fontPx))
    expect(min20, `chart text did not follow the reader's font: ${min16}px @16 → ${min20}px @20`).toBeGreaterThan(min16)
    // and it still holds every other contract at the larger size
    assertChartText(at20, await floorPx(page), 'PHONE band @20px root')
  })
})

// ── reduced motion: the text layer is identical with motion on and off ─────────────────────────
test.describe('chart text — reduced motion changes nothing', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('the same text nodes, same words, same sizes under prefers-reduced-motion', async ({ page }) => {
    await gotoSeedFinal(page, 'datemixed')
    const motion = await audit(page, 'figure.band-figure')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
    await settleLayout(page)
    const reduced = await audit(page, 'figure.band-figure')
    const shape = (a: Audit) => a.nodes.map((n) => `${n.text}|${n.fontPx}|${n.hidden}`)
    expect(shape(reduced)).toEqual(shape(motion))
  })
})
