import { expect, type Page } from '@playwright/test'

/**
 * The chart-text AUDIT CORE — the node measurement and the oracles every chart-text arm runs
 * (`docs/architecture.md` §12, "The gate is real Chromium"). ONE home, shared by the two specs that
 * read the rendered charts:
 *  - `chart-text.spec.ts` — the band, the ladder and TwoFutures on every shipping arm (`verify:fit`);
 *  - `chart-text-rv.spec.ts` — RecommendationViz on its own SERIALIZED solve arm (`verify:fit:rv`).
 * Extracted from chart-text.spec.ts 2026-09-07 (the RV gate increment): a spec cannot import these
 * from another spec — importing a *.spec.ts executes its module body, which registers every one of
 * its describes in the importing harness (reviewSurface.ts records the same law) — so they live here.
 * Not in tsconfig.json's `include`: nothing typechecks e2e/, so every field the audit reads carries a
 * non-vacuity pin in the spec that consumes it (the `data-ct-priority` pin is the pattern).
 */

export type Node = {
  readonly text: string
  readonly cls: string
  readonly fontPx: number
  /** the smallest font-size among the elements inside this node that own a text run — the leaf floor */
  readonly minFontPx: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly hidden: boolean
  readonly optional: boolean
  readonly priority: boolean
  /** the computed transform — `none` only ever means a type-invalid var() in the anchor chain */
  readonly transform: string
}
export type Rect = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
export type Audit = {
  /** the CARD the node set must stay inside — named per chart at the call site (audit()'s note) */
  readonly bound: Rect
  readonly boundSel: string
  /** The chart's OWN figure box. `bound` above is the CARD the containment oracle uses; this is the
   *  tighter box the y-tick borrow is measured against (`assertTickColumn`). */
  readonly chartBox: Rect
  readonly nodes: readonly Node[]
  readonly svgTextCount: number
}

/** The legibility floor, read from the live stylesheet: the computed size of a --text-xs probe. */
export async function floorPx(page: Page): Promise<number> {
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

/** Every chart text node inside `figureSelector`, measured against `boundSelector` — the chart's own
 *  CARD, NAMED per chart, never a fallback chain (a chart whose bound is missing fails loudly).
 *  A node may legitimately sit a few px outside the <svg> box and inside the card's padding — on
 *  screen, unclipped (nothing on the drawer path sets `overflow: hidden`; band.css's only one is the
 *  `.band-modal-open` body lock). The per-chart reasons, measured 2026-09-05 (the band's dollar
 *  re-measured 2026-09-12 for Card 10) — every Windows figure below is a real render, every Linux
 *  one is DERIVED from insight 118's single cross-platform datum:
 *   · band → `.band-drawer` (ConfidenceBandPanel.tsx) or the enlarge `[role="dialog"]`: the dollars
 *     end-anchor at TICK_FX = 84/560 = 0.15 of the figure, and the widest catalog dollar measures
 *     38.5 px of ink at --text-xs on Windows, with ≈35.9 EXPECTED on Linux CI (derived, not
 *     measured: 38.5 − 6 × 0.43, the 0.43 px/glyph loss coming from insight 118's seven-glyph
 *     45.0 Windows / 42.0 Linux pair — FreeType rounds glyph advances to whole pixels).
 *     `borderline`'s six-glyph "$0.25M" / "$0.75M" / "$1.25M" is that dollar — the 1.25M lattice,
 *     which retired the seven-glyph "$0.375M" / "$1.125M" class at 45 / 42 px.
 *     On the 320 arm that column still renders narrower than the dollar, so it hangs LEFT of
 *     `figure.band-figure` into the drawer's own padding — `assertTickColumn` carries the tighter,
 *     live-measured bound for that borrow, with the arm-by-arm numbers in its own docblock.
 *   · TwoFutures → the lever sheet `[role="dialog"]`: the x-axis row is centred at XAXIS_FY = 267/280
 *     of the host with a fixed ~17 px box, so it rides (8.45 − 0.0464 × hostH) px BELOW the host —
 *     0.25 px at PHONE (a 175 px host), ~2 px on the 320 arm. The dialog is its true card; a bare
 *     `.tf-host` bound reds the 320 arm on legitimate layout.
 *   · ladder → `main.result`: the ladder has no padded card of its OWN — `.fod-ladder`, `.fuck-off-date`
 *     and `.result-hero` all carry zero horizontal padding — so its first padded ancestor is the page
 *     column, whose gutter is the padding; its end-anchored "on track" label is 44.3 px of ink against
 *     a 0.15 × 288 = 43.2 px column on the 320 arm, i.e. ~1 px into that gutter. RESIDUAL: main's rect
 *     is document-tall, so the ladder's vertical containment here is weak — the CROWN therefore
 *     carries its own containment bound against `figure.ladder-figure` (`assertCrown`), and the label
 *     column's 320 × root-20 state is ACCEPTED under two named bounds his eye set on 2026-09-06
 *     (ACCEPTED_ONTRACK_OVERPRINT_PX / ACCEPTED_LABEL_GUTTER_PX, at the 320 × root-20 instrument in
 *     `chart-text.spec.ts`).
 *  A label that leaves the NAMED bound is the clipped-dollar defect this gate exists to catch. */
export async function audit(page: Page, figureSelector: string, boundSelector: string): Promise<Audit> {
  return page.evaluate(
    ({ sel, boundSel }) => {
      const fig = document.querySelector(sel)
      if (!fig) throw new Error(`chart-text: no figure matches ${sel}`)
      const bound = fig.closest(boundSel)
      if (!bound) throw new Error(`chart-text: ${sel} has no ancestor matching ${boundSel} — name a real card`)
      const fb = bound.getBoundingClientRect()
      // a display:contents ancestor generates NO box (.fod-graphs, .reveal__lead, .reveal__actions):
      // a zero rect would fail every node instead of bounding it.
      if (fb.width === 0 || fb.height === 0) throw new Error(`chart-text: the bound ${boundSel} has no box (display:contents?)`)
      const cb = fig.getBoundingClientRect()
      const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      const nodes = [...fig.querySelectorAll<HTMLElement>('.ct-text, .ct-block__item')].map((el) => {
        const cs = getComputedStyle(el)
        const b = el.getBoundingClientRect()
        // The floor is a LEAF property. A child with its own font-size — `.ladder-crown__tell`
        // (oddsLadder.css, --text-xs inside a --text-sm crown) — is invisible to the parent's
        // computed size. Walk every element that OWNS a direct non-empty text node (any depth, no diff
        // against the parent) and take the smallest. Containment + non-overlap stay on the PARENT box:
        // `.ct-block__name` / `.ct-block__sub` are display:block siblings that legitimately stack, so
        // adding leaves to those sets would flag legal layout as a collision. (`3` is TEXT_NODE — this
        // module's own `Node` type shadows the DOM's in type space.)
        const owners = [el, ...el.querySelectorAll<HTMLElement>('*')].filter((n) =>
          [...n.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? '').trim() !== ''),
        )
        const sizes = owners.map((n) => parseFloat(getComputedStyle(n).fontSize))
        return {
          text: (el.textContent ?? '').trim(),
          cls: el.className,
          fontPx: parseFloat(cs.fontSize),
          minFontPx: sizes.length ? Math.min(...sizes) : parseFloat(cs.fontSize),
          left: b.left,
          right: b.right,
          top: b.top,
          bottom: b.bottom,
          hidden: cs.visibility === 'hidden' || cs.display === 'none' || el.hasAttribute('data-ct-hidden'),
          optional: el.hasAttribute('data-ct-optional'),
          priority: el.hasAttribute('data-ct-priority'),
          transform: cs.transform,
        }
      })
      return { bound: rect(fb), boundSel, chartBox: rect(cb), nodes, svgTextCount: fig.querySelectorAll('svg text').length }
    },
    { sel: figureSelector, boundSel: boundSelector },
  )
}

export const TOL = 1 // px — sub-pixel rounding at fractional device scales

export function assertChartText(a: Audit, floor: number, label: string): void {
  expect(a.svgTextCount, `${label}: the svg must carry NO <text> — every word is HTML`).toBe(0)
  const visible = a.nodes.filter((n) => !n.hidden && n.text !== '')
  expect(visible.length, `${label}: no visible chart text at all`).toBeGreaterThan(0)
  for (const n of visible) {
    expect(
      n.minFontPx,
      `${label}: "${n.text}" has a line at ${n.minFontPx}px (the node itself is ${n.fontPx}px) — under the ${floor}px floor (--text-xs)`,
    ).toBeGreaterThanOrEqual(floor - 0.01)
    // THE ANCHOR. The whole `transform` is ONE declaration (chartText.css: `.ct-text` and
    // `.ct-block__item` each own one), so if any var() in it substitutes a value of the wrong TYPE the
    // declaration is invalid at computed-value time and transform falls back to `none`, taking the
    // horizontal anchor with it. A mis-anchored label still sits inside its card and can still
    // overprint nothing, so no other oracle here can see it. Every node this gate audits declares a
    // transform, so `none` is only ever this failure. SCOPE: the 2026-09-05 `--ct-ty: 0` defect lived
    // on the only valign="top" node in src/viz — the RecommendationViz hero. chart-text-rv.spec.ts
    // renders that node and PLANTS the unitless zero on it (this oracle must red there); the edit-time
    // twin in src/viz/__tests__/chartText.test.tsx pins the stylesheet's registers; and this oracle
    // holds the same failure class on every node either spec audits.
    expect(
      n.transform,
      `${label}: "${n.text}" computes transform:none — a var() in chartText.css's transform chain is type-invalid (a unitless 0 inside the calc())`,
    ).not.toBe('none')
    expect(
      n.left >= a.bound.left - TOL && n.right <= a.bound.right + TOL && n.top >= a.bound.top - TOL && n.bottom <= a.bound.bottom + TOL,
      `${label}: "${n.text}" [${n.left.toFixed(1)},${n.right.toFixed(1)}]×[${n.top.toFixed(1)},${n.bottom.toFixed(1)}] leaves its bound ${a.boundSel} ` +
        `[${a.bound.left.toFixed(1)},${a.bound.right.toFixed(1)}]×[${a.bound.top.toFixed(1)},${a.bound.bottom.toFixed(1)}]`,
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
  // a hidden node must be an OPTIONAL one (an interim age tick or an intermediate x tick) — and NEVER a
  // PRIORITY one: `data-ct-priority` is the 'hide' layout's own never-hide flag (src/viz/chartText.tsx,
  // layoutCollisions 'hide' — priority boxes seed `kept` and are never iterated for a clash), and the
  // ladder's "today" tick wears it while sharing the `.ladder-xtick` class with its numeral neighbours
  // (src/viz/OddsLadder.tsx, the x-axis block), so the class whitelist alone would let a named moment
  // vanish. NOTE the 'stagger' branch partitions on `data-ct-optional` and never reads priority; today
  // nothing emits both, so this clause is safe there — a future priority item inside a stagger host
  // (the band's annotation block) would need that branch taught the flag before it could be hidden
  // without reddening here.
  for (const n of a.nodes.filter((n) => n.hidden)) {
    expect(
      !n.priority && (n.optional || /tf__axis--xtick|ladder-xtick/.test(n.cls)),
      `${label}: a NAMED label was hidden: "${n.text}"${n.priority ? ' — a data-ct-priority node; the layout must never hide one' : ''}`,
    ).toBe(true)
  }
}
