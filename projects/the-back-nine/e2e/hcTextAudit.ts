import { expect, type Page } from '@playwright/test'
import { FINAL_TIER_MS, SETTLED_RESULT, gotoSeedFinal, settleLayout } from './reviewSurface'

/**
 * THE HIGHCHARTS TEXT AUDIT (Act 6 · RC3; plan 6, section 5.2's chart-text row; `docs/architecture.md` §12). Highcharts
 * draws its words as SVG text at real pixel size (no viewBox scaling), so the old HTML-layer audit (`chartTextAudit.ts`,
 * still run on the old answer page's charts until RC4, RC7 and RC8 retire them) cannot read it. This one reads every
 * text a Highcharts chart prints: data labels (the fan's band words), axis labels and titles, plot-line labels (the
 * named moments), legend items. Each REQUIRED label must exist, be visible (not `display:none`, not `visibility:hidden`,
 * and not faded: its effective opacity up the tree at least 0.9, so an inactive-state fade or a collision hide both
 * fail), be unclipped (inside the chart's container, inside its card and inside the page's width), and be at least the
 * leaf floor size measured in the real browser (insight 115: the smallest size among the element and its tspans).
 *
 * Not a spec (a spec cannot import another's body): `chart-text.spec.ts` and `rc-screens.spec.ts` both read it. The
 * failures come back as a list, so a planted-fail control can assert the exact message a plant must produce.
 */

export type HcKind = 'data-label' | 'axis-label' | 'axis-title' | 'plot-line-label' | 'legend-item'

export type HcLabel = {
  readonly kind: HcKind
  readonly text: string
  readonly minFontPx: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly display: string
  readonly visibility: string
  /** The product of every opacity from the text up to the chart's root. */
  readonly opacity: number
}

export type HcAudit = {
  readonly labels: readonly HcLabel[]
  readonly container: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
  readonly bound: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
  readonly pageWidth: number
}

const TOL = 1

/** Every text the chart inside `chartSelector` prints, measured against `boundSelector` (the chart's card). */
export async function hcAudit(page: Page, chartSelector: string, boundSelector: string): Promise<HcAudit> {
  return page.evaluate(
    ({ sel, boundSel }) => {
      const chart = document.querySelector(sel)
      if (!chart) throw new Error(`hc-text: no chart matches ${sel}`)
      const container = chart.querySelector('.highcharts-container') ?? chart
      const bound = chart.closest(boundSel)
      if (!bound) throw new Error(`hc-text: ${sel} has no ancestor matching ${boundSel}`)
      const root = chart.querySelector('svg.highcharts-root')
      const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      const groups: [string, string][] = [
        ['data-label', '.highcharts-data-label text'],
        ['axis-label', '.highcharts-axis-labels text'],
        ['axis-title', '.highcharts-axis-title'],
        ['plot-line-label', '.highcharts-plot-line-label'],
        ['legend-item', '.highcharts-legend-item text'],
      ]
      const labels = groups.flatMap(([kind, q]) =>
        [...chart.querySelectorAll<SVGElement>(q)].map((el) => {
          const cs = getComputedStyle(el)
          const sizes = [el, ...el.querySelectorAll('tspan')].map((n) => parseFloat(getComputedStyle(n).fontSize))
          let opacity = 1
          let display = cs.display
          let visibility = cs.visibility
          for (let n: Element | null = el; n !== null && n !== root?.parentElement; n = n.parentElement) {
            const ncs = getComputedStyle(n)
            opacity *= parseFloat(ncs.opacity)
            if (ncs.display === 'none') display = 'none'
            const attr = n.getAttribute('visibility')
            if (attr === 'hidden') visibility = 'hidden'
          }
          return {
            kind,
            text: (el.textContent ?? '').trim(),
            minFontPx: Math.min(...sizes),
            ...rect(el.getBoundingClientRect()),
            display,
            visibility,
            opacity,
          }
        }),
      )
      return {
        labels,
        container: rect(container.getBoundingClientRect()),
        bound: rect(bound.getBoundingClientRect()),
        pageWidth: document.documentElement.clientWidth,
      }
    },
    { sel: chartSelector, boundSel: boundSelector },
  ) as Promise<HcAudit>
}

/** What a chart must print: texts that must each appear (exactly, once at least), and per-kind minimum counts. */
export type HcRequired = {
  readonly texts: readonly string[]
  readonly counts: Partial<Record<HcKind, number>>
}

/** Every failure of the audit's oracles, worded so a plant can name the one it trips. Empty means the chart passes. */
export function hcTextFailures(a: HcAudit, floor: number, required: HcRequired): string[] {
  const out: string[] = []
  const live = a.labels.filter((l) => l.text !== '')
  for (const t of required.texts) if (!live.some((l) => l.text === t)) out.push(`missing: "${t}" is not printed`)
  for (const [kind, n] of Object.entries(required.counts)) {
    const have = live.filter((l) => l.kind === kind).length
    if (have < (n ?? 0)) out.push(`missing: ${have} ${kind} label(s), at least ${n} required`)
  }
  for (const l of live) {
    const who = `${l.kind} "${l.text}"`
    if (l.display === 'none' || l.visibility === 'hidden') out.push(`hidden: ${who} is hidden (${l.display}, ${l.visibility})`)
    else if (l.opacity < 0.9) out.push(`hidden: ${who} is faded to ${l.opacity.toFixed(2)} opacity`)
    if (l.minFontPx < floor - 0.01) out.push(`shrunk: ${who} renders at ${l.minFontPx}px, under the ${floor}px floor`)
    const inside = (b: HcAudit['bound']) => l.left >= b.left - TOL && l.right <= b.right + TOL && l.top >= b.top - TOL && l.bottom <= b.bottom + TOL
    if (!inside(a.container)) out.push(`clipped: ${who} leaves the chart [${l.left.toFixed(1)},${l.right.toFixed(1)}]`)
    else if (!inside(a.bound)) out.push(`clipped: ${who} leaves its card`)
    if (l.left < -TOL || l.right > a.pageWidth + TOL) out.push(`clipped: ${who} leaves the page`)
  }
  return out
}

export function assertHcText(a: HcAudit, floor: number, required: HcRequired, label: string): void {
  expect(hcTextFailures(a, floor, required), `${label}: the chart's text`).toEqual([])
}

// ── Snapshot's fan ────────────────────────────────────────────────────────────────────────────────────────────────

/** The fan on Snapshot, and its card. */
export const FAN = ['[data-card="fan"] [data-chart="fan"]', '[data-card="fan"]'] as const

/** The settled answer for a seed, which lands on Snapshot (the home since Act 6 · RC4), the fan drawn and settled. */
export async function enterSnapshot(page: Page, seed: string): Promise<void> {
  await gotoSeedFinal(page, seed)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), 'the seed never landed on Snapshot').toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleFan(page)
}

/** The fan drawn, its morph over (250 ms; a few frames past it), and the layout settled. */
export async function settleFan(page: Page): Promise<void> {
  await expect(page.locator(`${FAN[0]} .highcharts-series-group`), 'the fan never drew').toBeAttached({ timeout: 30_000 })
  await page.waitForTimeout(600)
  await settleLayout(page)
}

/** THE CLONE'S FLOOR, read from the live stylesheet: the computed size of the smallest role token the chart CSS uses,
 *  `--text-axis` (`theme.css`; ref 3.5's 12 px axis labels). The old charts' floor, `--text-xs` (`chartTextAudit.ts`'s
 *  `floorPx`), is the legacy sheet's and stays theirs. */
export async function hcFloorPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const p = document.createElement('span')
    p.style.fontSize = 'var(--text-axis)'
    p.textContent = 'x'
    document.body.appendChild(p)
    const px = parseFloat(getComputedStyle(p).fontSize)
    p.remove()
    return px
  })
}

/** Hover a point of ANOTHER series (the median line, mid-plot), so the audit reads every label under the hover state. */
export async function hoverMedian(page: Page): Promise<void> {
  // ON the median line, at the middle of its length (its own tracker takes the hover, whatever the bands' shape), read
  // from the drawn path in page coordinates; approached in steps, since Highcharts reads its pointer from a moving mouse.
  // The whole chart in the viewport first (a card partly in view is "visible enough" for scrollIntoViewIfNeeded).
  // (Never `settleLayout` after it: that helper pins the scroll back to the top.)
  await page.locator(FAN[0]).evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
  const at = await page.locator(`${FAN[0]} .b9-fan-median path.highcharts-graph`).first().evaluate((el) => {
    const path = el as SVGPathElement
    const p = path.getPointAtLength(path.getTotalLength() / 2)
    const m = path.getScreenCTM()!
    return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }
  })
  await page.mouse.move(at.x - 40, at.y)
  await page.mouse.move(at.x, at.y, { steps: 8 })
  await expect(page.locator(`${FAN[0]} .highcharts-tooltip`), 'the hover raised no tooltip').toBeVisible()
  await page.waitForTimeout(300)
}

// ── The marks audit (a bar or column chart's printed counts against its marks) ─────────────────────────────────────

type Box = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }

export type HcMarks = {
  /** The part of the chart a reader can see: its frame's box, cut to the page's width. */
  readonly frame: Box
  /** Every drawn bar or column (the invisible label spacers excluded), named by its series and its own sentence. */
  readonly marks: readonly { readonly who: string; readonly series: string; readonly box: Box }[]
  /** Every printed data label, with the series that prints it. */
  readonly labels: readonly { readonly text: string; readonly series: string; readonly box: Box }[]
  /** Every plot line (the on-track line). */
  readonly lines: readonly Box[]
}

/**
 * Reads the marks of the chart inside `chartSelector` against the frame `frameSelector` (Act 6 · RC4, the odds chart's
 * two defects: counts printed over the neighbouring hatched column at his window, and years and the legend cut off
 * inside a phone frame narrower than the chart, both green on the text audit). `ignore` names series drawn as nothing
 * (the odds chart's label spacers).
 */
export async function hcMarks(page: Page, chartSelector: string, frameSelector: string, ignore = ''): Promise<HcMarks> {
  return page.evaluate(
    ({ sel, frameSel, ignoreSel }) => {
      const chart = document.querySelector(sel)
      if (!chart) throw new Error(`hc-marks: no chart matches ${sel}`)
      const frameEl = chart.closest(frameSel)
      if (!frameEl) throw new Error(`hc-marks: ${sel} has no ancestor matching ${frameSel}`)
      const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      const f = frameEl.getBoundingClientRect()
      const frame = { left: Math.max(0, f.left), right: Math.min(document.documentElement.clientWidth, f.right), top: f.top, bottom: f.bottom }
      const seriesOf = (el: Element) => /highcharts-series-(\d+)/.exec(el.closest('[class*="highcharts-series-"]')?.getAttribute('class') ?? '')?.[1] ?? '?'
      const skip = (el: Element) => ignoreSel !== '' && el.closest(ignoreSel) !== null
      const marks = [...chart.querySelectorAll('.highcharts-series .highcharts-point')]
        .filter((el) => !skip(el))
        .map((el) => ({ who: (el.getAttribute('aria-label') ?? '').slice(0, 60), series: seriesOf(el), box: rect(el.getBoundingClientRect()) }))
        .filter((m) => m.box.right - m.box.left > 0.5 && m.box.bottom - m.box.top > 0.5)
      const labels = [...chart.querySelectorAll('.highcharts-data-label text')]
        .map((el) => ({ text: (el.textContent ?? '').trim(), series: seriesOf(el), box: rect(el.getBoundingClientRect()) }))
        .filter((l) => l.text !== '')
      const lines = [...chart.querySelectorAll('.highcharts-plot-line')].map((el) => rect(el.getBoundingClientRect()))
      return { frame, marks, labels, lines }
    },
    { sel: chartSelector, frameSel: frameSelector, ignoreSel: ignore },
  ) as Promise<HcMarks>
}

const MARK_TOL = 0.5

/** Every failure of the marks oracles, worded so a plant can name the one it trips. Empty means the chart passes. */
export function hcMarkFailures(m: HcMarks): string[] {
  const out: string[] = []
  const inside = (b: Box) => b.left >= m.frame.left - MARK_TOL && b.right <= m.frame.right + MARK_TOL && b.top >= m.frame.top - MARK_TOL && b.bottom <= m.frame.bottom + MARK_TOL
  const meet = (a: Box, b: Box) => a.left < b.right - MARK_TOL && b.left < a.right - MARK_TOL && a.top < b.bottom - MARK_TOL && b.top < a.bottom - MARK_TOL
  for (const k of m.marks) if (!inside(k.box)) out.push(`outside: the mark "${k.who}" leaves the visible frame`)
  for (const l of m.labels) {
    if (!inside(l.box)) out.push(`outside: data-label "${l.text}" leaves the visible frame`)
    for (const k of m.marks) if (meet(l.box, k.box)) out.push(`overlap: data-label "${l.text}" overlaps the mark "${k.who}" (series ${k.series})`)
    for (const line of m.lines) if (meet(l.box, line)) out.push(`overlap: data-label "${l.text}" crosses a plot line`)
  }
  m.labels.forEach((a, i) => m.labels.slice(i + 1).forEach((b) => meet(a.box, b.box) && out.push(`overlap: data-labels "${a.text}" and "${b.text}" overlap`)))
  return out
}
