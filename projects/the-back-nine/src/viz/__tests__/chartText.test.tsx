// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useRef } from 'react'
import {
  ChartReadoutRow,
  ChartText,
  ChartTextHost,
  ChartTextLayer,
  layoutCollisions,
  measureReadoutInk,
  placeReadoutX,
  readoutSeat,
  useReadoutSeat,
  type CtReadoutLine,
} from '../chartText'

/**
 * The chart TEXT LAYER (council wf_ecbe0ab2-7bb, 2026-09-05 — "SVG draws, HTML writes").
 *
 * What this battery pins:
 *  - <ChartText> positions by viewBox FRACTIONS written as CSSOM custom properties (`--fx`/`--fy`),
 *    anchors like SVG text, and sizes on the three borrowed registers — never a px of its own.
 *  - layoutCollisions works on MEASURED boxes. jsdom lays nothing out, so every box here is a
 *    stubbed getBoundingClientRect — synthetic geometry the assertions are derived from by hand,
 *    never from the constant under test (the placer this replaces carried LABEL_CHAR_PX 6.6 and a
 *    suite that computed its expectations through it — DND 012's self-referential oracle).
 *  - 'stagger': named items stack into rows they clear; optional items HIDE on a collision (the
 *    interim age ticks) and never take a row; the host learns the row count.
 *  - 'hide': the later collider hides; a priority item never does.
 *  - 'separate-y': a lower box is pushed down by exactly its overlap plus the pad.
 */

afterEach(cleanup)

/** Stub a laid-out box on an element (jsdom's default is all zeros — "not laid out"). */
function box(el: Element, left: number, width: number, top = 0, height = 20): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left, right: left + width, top, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}) }),
  })
}

describe('ChartText — a positioned, register-sized HTML text node', () => {
  it('writes the position as --fx/--fy custom properties (CSSOM, never a style attribute string)', () => {
    const { getByText } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0.25} fy={0.5} anchor="end" valign="bottom" register="sm" strong>
            $0
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    const el = getByText('$0')
    expect(el.style.getPropertyValue('--fx')).toBe('0.25')
    expect(el.style.getPropertyValue('--fy')).toBe('0.5')
    expect(el.className).toContain('ct-text--end')
    expect(el.className).toContain('ct-text--vbottom')
    expect(el.className).toContain('ct-text--sm')
    expect(el.className).toContain('ct-text--strong')
    // no inline font-size anywhere: the size is the register's token (chartText.css)
    expect(el.style.fontSize).toBe('')
  })

  it('the layer is the SIGHTED channel: aria-hidden, so the a11y tree keeps the svg caption', () => {
    const { container } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0} fy={0}>
            x
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    expect(container.querySelector('.ct-layer')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('a wrapping label carries its column width as --fw and the wrap class', () => {
    const { getByText } = render(
      <ChartTextHost>
        <ChartTextLayer>
          <ChartText fx={0.7} fy={0.5} wrapWidth={0.3}>
            The recommended strategy
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>,
    )
    const el = getByText('The recommended strategy')
    expect(el.style.getPropertyValue('--fw')).toBe('0.3')
    expect(el.className).toContain('ct-text--wrap')
  })
})

function host(html: string): HTMLElement {
  const h = document.createElement('div')
  h.innerHTML = html
  document.body.appendChild(h)
  return h
}

describe('layoutCollisions — stagger: named items take rows, optional items yield', () => {
  it('two named labels that overlap land on rows 0 and 1; a clear third stays on row 0; the host learns 2 rows', () => {
    const h = host(
      '<span data-ct-item="a"></span><span data-ct-item="b"></span><span data-ct-item="c"></span>' +
        '<span data-ct-tail="b"></span>',
    )
    const [a, b, c] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 50) // [0, 50]
    box(b!, 40, 60) // [40, 100] — overlaps a by 10 → row 1
    box(c!, 120, 40) // [120, 160] — clears a (50 + 6 pad) → row 0
    layoutCollisions(h, 'stagger')
    expect(a!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(b!.style.getPropertyValue('--ct-row')).toBe('1')
    expect(c!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('2')
    // the tail follows its label's row
    expect(h.querySelector<HTMLElement>('[data-ct-tail="b"]')!.style.getPropertyValue('--ct-row')).toBe('1')
  })

  it('a third overlapping named label takes a THIRD row — content is never cut to fit', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b"></span><span data-ct-item="c"></span>')
    const [a, b, c] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 60)
    box(b!, 10, 60)
    box(c!, 20, 60)
    layoutCollisions(h, 'stagger')
    expect([a, b, c].map((el) => el!.style.getPropertyValue('--ct-row'))).toEqual(['0', '1', '2'])
    expect(h.style.getPropertyValue('--ct-rows')).toBe('3')
  })

  it('an OPTIONAL item (an interim age tick) that collides HIDES instead of taking a row; a clear one stays visible on row 0', () => {
    const h = host(
      '<span data-ct-item="today"></span><span data-ct-item="t1" data-ct-optional></span><span data-ct-item="t2" data-ct-optional></span>' +
        '<span data-ct-tail="t1"></span>',
    )
    const [today, t1, t2] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(today!, 0, 45)
    box(t1!, 30, 40) // collides with Today → hidden, no row
    box(t2!, 120, 40) // clear → shown on row 0
    layoutCollisions(h, 'stagger')
    expect(t1!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(h.querySelector('[data-ct-tail="t1"]')!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(t2!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(t2!.style.getPropertyValue('--ct-row')).toBe('0')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('1') // no row was spent on the tick
  })

  it('a second pass re-measures from clean state: a prior row/hidden mark never leaks into the next layout', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b" data-ct-optional></span>')
    const [a, b] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 50)
    box(b!, 30, 40)
    layoutCollisions(h, 'stagger')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(true)
    // the tick moves clear (a wider figure): the second pass must UN-hide it
    box(b!, 200, 40)
    layoutCollisions(h, 'stagger')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(false)
  })

  it('un-laid-out items (all-zero boxes, jsdom) are ignored — no row, no hide, one reserved row', () => {
    const h = host('<span data-ct-item="a"></span><span data-ct-item="b"></span>')
    layoutCollisions(h, 'stagger')
    expect(h.style.getPropertyValue('--ct-rows')).toBe('1')
    for (const el of h.querySelectorAll<HTMLElement>('[data-ct-item]')) {
      expect(el.style.getPropertyValue('--ct-row')).toBe('')
      expect(el.hasAttribute('data-ct-hidden')).toBe(false)
    }
  })
})

describe('layoutCollisions — hide: the later collider yields, a priority item never does', () => {
  it('an intermediate tick over an endpoint hides; the endpoint stays; a clear tick stays', () => {
    const h = host(
      '<span class="x" data-ct-item="today" data-ct-priority></span><span class="x" data-ct-item="t5"></span>' +
        '<span class="x" data-ct-item="t9"></span><span class="x" data-ct-item="end" data-ct-priority></span>',
    )
    const [today, t5, t9, end] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(today!, 0, 60, 0, 16)
    box(t5!, 50, 30, 0, 16) // overlaps today's [0,60] → hidden
    box(t9!, 150, 30, 0, 16) // clear
    box(end!, 170, 50, 0, 16) // overlaps t9 — but end is priority, so t9 must yield instead
    layoutCollisions(h, 'hide', '.x[data-ct-item]')
    expect(today!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(end!.hasAttribute('data-ct-hidden')).toBe(false)
    expect(t5!.hasAttribute('data-ct-hidden')).toBe(true)
    expect(t9!.hasAttribute('data-ct-hidden')).toBe(true)
  })

  it('the selector scopes the pass: items outside it are neither measured nor touched', () => {
    const h = host('<span class="x" data-ct-item="a"></span><span class="y" data-ct-item="b"></span>')
    const [a, b] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(a!, 0, 60, 0, 16)
    box(b!, 10, 60, 0, 16) // would collide with a — but it is not in the selector
    layoutCollisions(h, 'hide', '.x[data-ct-item]')
    expect(b!.hasAttribute('data-ct-hidden')).toBe(false)
  })
})

describe('layoutCollisions — separate-y: a lower box is pushed down by its overlap plus the pad', () => {
  it('two end labels 10px apart with 20px boxes: the lower moves down 16px (10 overlap + 6 pad); a clear pair moves nothing', () => {
    const h = host('<span class="l" data-ct-item="w"></span><span class="l" data-ct-item="wo"></span>')
    const [w, wo] = [...h.querySelectorAll<HTMLElement>('[data-ct-item]')]
    box(w!, 400, 100, 100, 20) // [100, 120]
    box(wo!, 400, 100, 110, 20) // [110, 130] — overlaps by 10
    layoutCollisions(h, 'separate-y', '.l[data-ct-item]')
    expect(w!.style.getPropertyValue('--ct-dy')).toBe('')
    expect(wo!.style.getPropertyValue('--ct-dy')).toBe('16.00px')
    // clear pair
    box(wo!, 400, 100, 150, 20)
    layoutCollisions(h, 'separate-y', '.l[data-ct-item]')
    expect(wo!.style.getPropertyValue('--ct-dy')).toBe('')
  })
})

// ── the anchor registers must be TYPED, not just zero (the 2026-09-05 `--ct-ty: 0` defect) ────────
describe('chartText.css — the anchor registers are <length-percentage>, never a bare number', () => {
  it('every .ct-text--* anchor value carries a unit or is a percentage', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'chartText.css'), 'utf8')
    // WHY THIS PIN AND NOT A GENERAL RULE. `--ct-ty` substitutes into a calc() — `.ct-text`'s
    // `translate(var(--ct-tx, 0), calc(var(--ct-ty, -50%) + var(--ct-dy, 0px)))` — where a bare `0`
    // is a <number>, `<number> + <length>` fails type-checking, the declaration is invalid at
    // computed-value time and the WHOLE transform falls back to `none`, taking the horizontal anchor
    // with it. That shipped: `.ct-text--vtop { --ct-ty: 0 }` left the RecommendationViz delta hero
    // anchored at the bracket midpoint — and the real-browser gate cannot see that case yet (no RV arm),
    // so this edit-time pin is what holds it. It is NOT a general "properties in calc() need units"
    // rule: --fx/--fy/--fw/--fh/--ct-row/--ct-rows are DELIBERATELY unitless multipliers inside
    // calc(). These six rules are the whole exposed surface — the only other property in that
    // calc(), --ct-dy, is JS-written and always px (useCollisionLayout, and only when dy > 0).
    const LENGTH_PCT = /^-?(?:\d+\.?\d*|\.\d+)(?:px|%|rem|em)$/
    const regs = [...css.matchAll(/\.ct-text--(start|middle|end|vtop|vmiddle|vbottom)\s*\{\s*(--ct-t[xy])\s*:\s*([^;}]+)[;\s]*\}/g)].map((m) => ({
      cls: m[1]!,
      prop: m[2]!,
      value: m[3]!.trim(),
    }))
    expect(regs.length, 'the six anchor registers are no longer one-declaration rules — re-derive this pin, it just went vacuous').toBe(6)
    for (const r of regs) {
      expect(LENGTH_PCT.test(r.value), `.ct-text--${r.cls} sets ${r.prop}: ${r.value} — a bare number here invalidates the .ct-text calc() and transform falls back to none`).toBe(true)
    }
  })
})

// ── the readout placer — pure numbers, the contract the svg era pinned and a4b334c2 deleted ───────
describe('placeReadoutX — beside the rule while that fits, else the other side, then clamped inside the plot', () => {
  // Constants by hand (DND 012): the band's plot is PLOT.left 92 .. PLOT.right 540 of a 560 viewBox
  // (bandGeometry.ts), consumed as fractions of the host; gap 10 (CT_READOUT_GAP_PX).
  const L = 92 / 560
  const R = 540 / 560

  it('a left-half scrub seats the box RIGHT of the rule: rule + gap', () => {
    // rule 200, box 120: 200 + 10 + 120 = 330 ≤ 540 → 210
    expect(placeReadoutX(560, 120, 200 / 560, L, R)).toBe(210)
  })

  it('a right-half scrub FLIPS the box left of the rule: rule − gap − box', () => {
    // rule 500: 500 + 130 = 630 > 540 → 500 − 10 − 120 = 370 (≥ 92, and 370 + 120 = 490 ≤ 540)
    expect(placeReadoutX(560, 120, 500 / 560, L, R)).toBe(370)
  })

  it('the LEFT clamp is reachable: a flipped box that would leave the plot seats on its left edge', () => {
    // The precondition (2·box + gap ≤ plot) is broken ON PURPOSE to reach the clamp arm: rule 100,
    // box 440 → 100 + 450 > 540 flips; 100 − 10 − 440 = −350 < 92 → clamped to 92 (92 + 440 = 532 fits).
    expect(placeReadoutX(560, 440, 100 / 560, L, R)).toBe(92)
  })

  it('a box WIDER than the plot seats on the left edge (the right clamp cannot do better)', () => {
    // rule 300, box 500 (> the 448-unit plot): flips to −210 → 92; 92 + 500 > 540 → max(92, 40) = 92
    expect(placeReadoutX(560, 500, 300 / 560, L, R)).toBe(92)
  })

  it('on the 390 phone (a 308px host, the 38% cap) every lattice vertex seats the box inside the plot and clear of its rule', () => {
    // The scrub SNAPS to one of 49 lattice columns whose rule x is linear across the plot
    // (bandGeometry xForYear); the state space is finite, so walk it all. boxW = 0.38 × 308 (the cap).
    // The continuous worst case at this host clears by ~2.4 px; the lattice never lands there —
    // its worst vertex clears by ~6 px (measured 2026-09-05). Below a ~250 px host the continuous
    // infimum crosses zero (chartText.css .ct-readout carries the derivation) — that regime is HELD
    // council work and is NOT asserted here.
    const hostW = 308
    const boxW = 0.38 * hostW
    const left = L * hostW
    const right = R * hostW
    let flips = 0
    for (let i = 0; i < 49; i++) {
      const ruleFx = (92 + (448 * i) / 48) / 560
      const rule = ruleFx * hostW
      const x = placeReadoutX(hostW, boxW, ruleFx, L, R)
      expect(x, `vertex ${i}: the box leaves the plot on the left`).toBeGreaterThanOrEqual(left - 1e-9)
      expect(x + boxW, `vertex ${i}: the box leaves the plot on the right`).toBeLessThanOrEqual(right + 1e-9)
      const clear = x > rule || x + boxW < rule
      expect(clear, `vertex ${i}: the box covers its own rule (x ${x.toFixed(2)}, rule ${rule.toFixed(2)}, box ${boxW.toFixed(2)})`).toBe(true)
      if (x < rule) flips++
    }
    // non-vacuity: both seats are exercised across the sweep
    expect(flips, 'no vertex flipped left — the sweep exercised one branch only').toBeGreaterThan(0)
    expect(flips, 'every vertex flipped left — the sweep exercised one branch only').toBeLessThan(49)
  })
})

// ── the readout SEAT: in the plot, or in a flow row (his eye on the 320 cold read, 2026-09-06) ────
describe('readoutSeat — the in-plot seat is legal only while the ink is containable there', () => {
  // Constants by hand (DND 012); the numbers are the ones a real Chromium measured on the fit
  // harness (2026-09-06, the `retired` household): chrome 26 px (2 × --space-3 + 2 × 1px border),
  // gap 10 px (CT_READOUT_GAP_PX), the band's plot 0.8 of the host, the cap 0.38 of it.
  const chromePx = 26

  it('a wide host seats the box in the PLOT: the ink fits the cap AND the box fits beside a mid-plot rule', () => {
    // REAL (1536 @2.5): a 446 px host → plot 356.8, half 178.4, cap 169.5. The widest UNBREAKABLE
    // line is 128.8 px ("$1.055M – $1.055M"); the widest column's max-content is 138 px (the label,
    // which WRAPS and so never governs containment). 128.8 + 26 = 154.8 ≤ 169.5, and
    // min(138 + 26, 169.5) + 10 = 174 ≤ 178.4.
    expect(readoutSeat({ widestInkPx: 128.8, widestColumnPx: 138, chromePx }, 0.38 * 446, 0.8 * 446)).toBe('plot')
  })

  it('the CAP clause alone sends the words to FLOW (the defect his eye ruled on: ink outside its own box)', () => {
    // PHONE (390 @3): a 308 px host → cap 117.0, half 123.2. 122.2 + 26 = 148.2 > 117.0 — the box
    // would clip its own widest line by 31 px.
    expect(readoutSeat({ widestInkPx: 122.2, widestColumnPx: 138, chromePx }, 0.38 * 308, 0.8 * 308)).toBe('flow')
  })

  it('the HALF-PLOT clause alone sends the words to FLOW (a box that could be clamped over its rule)', () => {
    // a cap wide enough for the ink, a plot too narrow to seat the box beside a mid-plot rule:
    // 100 + 26 = 126 ≤ 400, but min(126, 400) + 10 = 136 > 260 / 2.
    expect(readoutSeat({ widestInkPx: 100, widestColumnPx: 100, chromePx }, 400, 260)).toBe('flow')
  })

  it('THE BOUNDARY: both clauses met with nothing to spare is still the PLOT seat; a hair over either is FLOW', () => {
    // ink + chrome = 150 = the cap exactly; box + gap = 160 = half the plot exactly.
    const ink = { widestInkPx: 124, widestColumnPx: 124, chromePx }
    expect(readoutSeat(ink, 150, 320)).toBe('plot')
    expect(readoutSeat({ ...ink, widestInkPx: 124.01 }, 150, 320)).toBe('flow') // a hair over the cap
    expect(readoutSeat(ink, 150, 319.98)).toBe('flow') // a hair over the half plot
  })

  it('the CAPPED box is what must fit beside the rule — a column wider than the cap cannot widen it', () => {
    // widestColumn 400 + 26 is far past the 150 cap, so the box renders at 150: 150 + 10 ≤ 340 / 2.
    expect(readoutSeat({ widestInkPx: 120, widestColumnPx: 400, chromePx }, 150, 340)).toBe('plot')
  })

  it('nothing laid out (a zero measurement: jsdom, or a host with no box yet) keeps the PLOT seat', () => {
    expect(readoutSeat({ widestInkPx: 0, widestColumnPx: 0, chromePx: 0 }, 100, 300)).toBe('plot')
    expect(readoutSeat({ widestInkPx: 50, widestColumnPx: 50, chromePx: 0 }, 100, 0)).toBe('plot')
  })

  it('ZERO unbreakable ink is a MEASUREMENT, not an absence: the half-plot clause still binds', () => {
    // composeReadoutLines (src/viz/bandData.ts) drops the ages line when no household clock closed
    // and WITHDRAWS the dollars on a thinned cohort — that column reads only the note, which wraps.
    // Every line wrapping means nothing can paint past the border (clause 1 is vacuously true), but
    // the BOX still has to clear its own rule, so clause 2 is the one that must still decide.
    const wrapOnly = { widestInkPx: 0, widestColumnPx: 120, chromePx: 26 }
    // the 320 arm's 238 px host: cap 90.4, half-plot 95.2 — the capped box (90.4) + the 10 px gap
    // is 100.4, past the half plot, so the words leave even though no ink can overflow.
    expect(readoutSeat(wrapOnly, 0.38 * 238, 0.8 * 238)).toBe('flow')
    // REAL's 446 px host: box min(146, 169.5) + 10 = 156 ≤ 178.4 — the same column keeps the plot.
    expect(readoutSeat(wrapOnly, 0.38 * 446, 0.8 * 446)).toBe('plot')
  })
})

/* THE FAKE MEASURER. jsdom lays nothing out (every box is zeros) and resolves no stylesheet, so the
 * hook's inputs are stubbed from the fixture's own class tokens — `w<px>` is a box's width, `nowrap`
 * a line that cannot break — plus the `--ct-readout-cap` the row would carry. Every expectation
 * below is hand-derived from those numbers, never from the predicate under test (DND 012), and the
 * numbers are the ones a real Chromium measured on the fit harness. */
const CHROME_PX = 26

function fakeMeasure(cap: string): () => void {
  const realRect = Element.prototype.getBoundingClientRect
  const realGcs = window.getComputedStyle
  const cls = (el: Element): string => (typeof el.className === 'string' ? el.className : '')
  const widthOf = (el: Element): number => {
    if (el.hasAttribute('data-ct-readout-chrome')) return CHROME_PX
    const m = /(?:^|\s)w(\d+(?:\.\d+)?)/.exec(cls(el))
    if (m) return parseFloat(m[1]!)
    // a grid item with `justify-self: start` hugs its content: as wide as its widest line
    if (el.hasAttribute('data-ct-readout-item')) {
      return Math.max(0, ...[...el.querySelectorAll('[data-ct-readout-line]')].map((l) => widthOf(l)))
    }
    return 0
  }
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const width = widthOf(this)
    return { left: 0, right: width, top: 0, bottom: 0, width, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  }
  window.getComputedStyle = ((el: Element) =>
    ({
      whiteSpace: /(?:^|\s)nowrap(?:\s|$)/.test(cls(el)) ? 'nowrap' : 'normal',
      getPropertyValue: (p: string) => (p === '--ct-readout-cap' ? cap : ''),
    }) as unknown as CSSStyleDeclaration) as typeof window.getComputedStyle
  return () => {
    Element.prototype.getBoundingClientRect = realRect
    window.getComputedStyle = realGcs
  }
}

/** The band's plot as fractions of its host (bandGeometry PLOT.left 92 … PLOT.right 540 of 560). */
const SEAT_PLOT_L = 92 / 560
const SEAT_PLOT_R = 540 / 560

function SeatHarness({ hostClass, columns }: { hostClass: string; columns: readonly (readonly CtReadoutLine[])[] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLSpanElement>(null)
  const seat = useReadoutSeat({ hostRef, rowRef, plotLeftF: SEAT_PLOT_L, plotRightF: SEAT_PLOT_R, deps: [columns] })
  return (
    <div>
      <div ref={hostRef} className={hostClass} />
      <ChartReadoutRow seat={seat} columns={columns} activeIndex={0} ref={rowRef} />
      <span data-seat-readback="">{seat}</span>
    </div>
  )
}

/** Two columns' readings at the widths the browser measured (the label + note lines WRAP, so they
 *  carry no `nowrap` token — exactly as chartText.css sets `white-space` per kind). */
const SEAT_COLUMNS: readonly (readonly CtReadoutLine[])[] = [
  [
    { text: 'Ages 80 / 79', className: 'ct-readout__ages nowrap w90.4' },
    { text: 'Eight in ten land between', className: 'ct-readout__label w138' },
    { text: '$1.055M – $1.055M', className: 'ct-readout__value nowrap w128.8' },
  ],
  [
    { text: 'Ages 66 / 65', className: 'ct-readout__ages nowrap w88' },
    { text: 'Too few couples to show a range.', className: 'ct-readout__note w120' },
  ],
]

describe('measureReadoutInk — the widest UNBREAKABLE line, the widest column, and the box chrome', () => {
  it('skips the lines that WRAP (they re-wrap into the box) and takes the widest nowrap ink', () => {
    const restore = fakeMeasure('38%')
    try {
      const { container } = render(<ChartReadoutRow seat="flow" columns={SEAT_COLUMNS} activeIndex={0} />)
      const ink = measureReadoutInk(container.querySelector<HTMLElement>('.ct-readout-row')!)
      // the 138 px label is WIDER than the 128.8 px figure and must NOT be the ink measurement …
      expect(ink.widestInkPx).toBe(128.8)
      // … but it does govern the column's own max-content, which is the width the box would take
      expect(ink.widestColumnPx).toBe(138)
      expect(ink.chromePx).toBe(CHROME_PX)
    } finally {
      restore()
    }
  })
})

describe('useReadoutSeat — one decision per WIDTH, taken before paint', () => {
  it('a 446 px host (REAL) keeps the PLOT seat', () => {
    const restore = fakeMeasure('38%')
    try {
      const { container } = render(<SeatHarness hostClass="w446" columns={SEAT_COLUMNS} />)
      expect(container.querySelector('[data-seat-readback]')!.textContent).toBe('plot')
      expect(container.querySelector('.ct-readout-row')!.getAttribute('data-seat')).toBe('plot')
    } finally {
      restore()
    }
  })

  it('a 308 px host (PHONE) hands the words to the FLOW row — the ink cannot fit the capped box', () => {
    const restore = fakeMeasure('38%')
    try {
      const { container } = render(<SeatHarness hostClass="w308" columns={SEAT_COLUMNS} />)
      expect(container.querySelector('[data-seat-readback]')!.textContent).toBe('flow')
      expect(container.querySelector('.ct-readout-row')!.getAttribute('data-seat')).toBe('flow')
    } finally {
      restore()
    }
  })

  it('a host that has not been laid out keeps the PLOT seat (never decided from a phantom geometry)', () => {
    const restore = fakeMeasure('38%')
    try {
      const { container } = render(<SeatHarness hostClass="host" columns={SEAT_COLUMNS} />)
      expect(container.querySelector('[data-seat-readback]')!.textContent).toBe('plot')
    } finally {
      restore()
    }
  })
})

describe('ChartReadoutRow — every column always in the DOM, exactly one of them showing', () => {
  it('stacks one item per column, marks ONLY the active one, and carries the chrome probe', () => {
    const { container } = render(<ChartReadoutRow seat="flow" columns={SEAT_COLUMNS} activeIndex={1} />)
    const row = container.querySelector('.ct-readout-row')!
    expect(row.querySelectorAll('[data-ct-readout-item]')).toHaveLength(SEAT_COLUMNS.length)
    expect(row.querySelectorAll('[data-ct-readout-item][data-active]')).toHaveLength(1)
    expect(row.querySelectorAll('[data-ct-readout-item]')[1]!.hasAttribute('data-active')).toBe(true)
    // every column's lines are present at every moment — that is what RESERVES the row's height at
    // its tallest AND what makes the seat measurable with no box on screen
    expect(row.querySelectorAll('[data-ct-readout-line]')).toHaveLength(5)
    expect(row.querySelector('[data-ct-readout-chrome]')).not.toBeNull()
    // the sighted channel: the a11y tree keeps the svg caption + the annotation sentences
    expect(row.getAttribute('aria-hidden')).toBe('true')
    // the kind classes ride through unchanged — one register vocabulary in both seats
    expect(row.querySelector('.ct-readout__ages')).not.toBeNull()
  })

  it('nothing scrubbed: the row is blank but every column is still reserved (no item is active)', () => {
    const { container } = render(<ChartReadoutRow seat="flow" columns={SEAT_COLUMNS} activeIndex={null} />)
    const row = container.querySelector('.ct-readout-row')!
    expect(row.querySelectorAll('[data-ct-readout-item][data-active]')).toHaveLength(0)
    expect(row.querySelectorAll('[data-ct-readout-item]')).toHaveLength(SEAT_COLUMNS.length)
  })
})
