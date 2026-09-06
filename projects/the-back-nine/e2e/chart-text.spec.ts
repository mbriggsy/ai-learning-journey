import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { REAL, REAL_DPR, FLOOR, PHONE, PHONE_DPR, FINAL_TIER_MS, gotoSeedFinal, settleLayout } from './reviewSurface'
/* The band's scrub SNAPS to one of LATTICE_POINTS columns, so the readout's whole placement state
 * space is finite — the sweep below walks EVERY column rather than sampling a few (importing from
 * ../src is this directory's precedent: caddie-walk.spec.ts reads the copy catalog the same way). */
import { LATTICE_POINTS } from '../src/viz/bandData'

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
 * card, and never on top of each other — with a planted-fail control on each of `assertChartText`'s seven
 * oracles, every `toThrow` bound to that oracle's own message, so a green here is a green that could have
 * been red (insight 032 / 016).
 *
 * WHAT IT PINS, on every VIEWPORT arm the product ships to (PHONE 390 @3 touch · a 320 reflow arm ·
 * FLOOR 1088 · REAL 1536 @2.5), over FOUR households — the two dense date routes, the one-frame
 * spine, and `borderline`, the widest-y-tick household (45 CSS px of ink) — never all of them:
 *  - THE FLOOR: every visible chart text node renders at ≥ --text-xs, measured at the LEAF — a child
 *    with its own font-size (`.ladder-crown__tell` is --text-xs inside a --text-sm crown) is measured,
 *    not its parent's register. The floor is READ from tokens.css at runtime, never re-typed here —
 *    the smallest register the system already wears; insight 082.
 *  - CONTAINMENT: every visible node's box lies inside the CARD named for it at the call site — the
 *    band's drawer, a lever sheet's dialog, the page column for the ladder (`audit()` carries the
 *    measured reasons): the figure plus the card padding a y-tick may borrow on the 320 arm. A node
 *    that LEAVES the card is the end-anchored dollar that clipped LEFT into a plausible WRONG dollar
 *    in the svg era, the red team's decisive attack. The y-tick column carries its own tighter bound
 *    (`assertTickColumn`).
 *  - THE ANCHOR: every node's computed transform is real (never `none`) — the one signature of a
 *    type-invalid var() in chartText.css's translate chain, which silently un-anchors a label.
 *  - NON-OVERLAP: no two visible nodes of one chart intersect (the measured collision layout does its job).
 *  - NOTHING NAMED IS HIDDEN: an unnamed interim age tick may yield on a collision; a named moment
 *    never — and a `data-ct-priority` node never, whatever class it shares with its neighbours.
 *  - THE SCRUB READOUT (band + TwoFutures) takes ONE OF TWO SEATS, measured per width before paint
 *    (src/viz/chartText.tsx useReadoutSeat; his eye on the 320 cold read, 2026-09-06): the box over
 *    the plot where its ink is containable there, else a flow row under the chart. It is therefore
 *    not in audit()'s node set; it carries its own oracles at every lattice column — every line at
 *    the floor and INSIDE ITS OWN CONTAINER (the box, or the row), the seat matching the measured
 *    predicate, the row's height never changing as the reader scrubs, the box's side flipping at
 *    most once RIGHT→LEFT (placeReadoutX seats the box right of its rule while that fits inside the
 *    plot and left once it does not) — and on touch the pin dismisses on a same-column re-tap and
 *    re-pins on a new column.
 *  - THE LADDER CROWN takes ONE OF TWO SEATS on the same law, measured per width before paint
 *    (src/viz/OddsLadder.tsx useCrownSeat; his eye, 2026-09-06): ABOVE its ringed dot while the
 *    measured headroom holds the two lines, else a reserved row above the plot. Its oracles: the
 *    seat matching the headroom that produced it, the callout inside its own figure, and — the whole
 *    ruling — the words clear of every dot and ring (the dead BESIDE-the-dot branch printed the
 *    ceiling's "better than 9 in 10" across the year-2..5 dots on the 320 arm AND the 1536 laptop).
 *  - THE READER'S FONT: raising the browser default font makes the chart text LARGER, never smaller (the svg
 *    era shrank phone chart text from 6.88 to 5.99 CSS px as the reader turned their font UP).
 *  - REDUCED MOTION: the text layer renders the same node set with motion on and off.
 *
 * Every measurement waits for the FINAL engine tier (gotoSeedFinal) and a settled layout (settleLayout).
 *
 * NOT covered here, by design: RecommendationViz rides its own serialized solve arm (`verify:fit:rv`,
 * open in the register — a full-precision solve beside these arms would starve them of cores).
 */

type Node = {
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
type Rect = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }
type Audit = {
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

/** Every chart text node inside `figureSelector`, measured against `boundSelector` — the chart's own
 *  CARD, NAMED per chart, never a fallback chain (a chart whose bound is missing fails loudly).
 *  A node may legitimately sit a few px outside the <svg> box and inside the card's padding — on
 *  screen, unclipped (nothing on the drawer path sets `overflow: hidden`; band.css's only one is the
 *  `.band-modal-open` body lock). The per-chart reasons, measured 2026-09-05:
 *   · band → `.band-drawer` (ConfidenceBandPanel.tsx) or the enlarge `[role="dialog"]`: the dollars
 *     end-anchor at TICK_FX = 84/560 = 0.15 of the figure, and the widest catalog dollar is 45 px of
 *     ink at --text-xs on Windows, 42 on Linux CI (`borderline`'s seven-glyph "$0.375M" / "$1.125M";
 *     FreeType rounds glyph advances to whole pixels). On the 320 arm that column
 *     renders narrower than the dollar, so it hangs LEFT of `figure.band-figure` into the drawer's
 *     own padding — `assertTickColumn` carries the tighter, live-measured bound for that borrow,
 *     with the arm-by-arm numbers in its own docblock.
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
 *     (ACCEPTED_ONTRACK_OVERPRINT_PX / ACCEPTED_LABEL_GUTTER_PX, at the instrument below).
 *  A label that leaves the NAMED bound is the clipped-dollar defect this gate exists to catch. */
async function audit(page: Page, figureSelector: string, boundSelector: string): Promise<Audit> {
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
        // adding leaves to those sets would flag legal layout as a collision. (`3` is TEXT_NODE — the
        // spec's own `Node` type shadows the DOM's in type space.)
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

const TOL = 1 // px — sub-pixel rounding at fractional device scales

function assertChartText(a: Audit, floor: number, label: string): void {
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
    // transform, so `none` is only ever this failure. SCOPE, honestly: the 2026-09-05 `--ct-ty: 0`
    // defect lived on the only valign="top" node in src/viz — the RecommendationViz hero — which this
    // gate does not render yet; the edit-time twin in src/viz/__tests__/chartText.test.tsx holds that
    // case, and this arm holds the same failure class on the three charts rendered here.
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

/** The clearance a borrowed dollar must keep from the card's edge — the same 4 px the two-pane
 *  edit-time tripwire keeps as tick-column slack (twoPaneHonestyFloor.test.ts) and bandGeometry's
 *  PLOT comment names as "the 4 px gap". */
const TICK_CLEARANCE_PX = 4

/** THE Y-TICK COLUMN — the one place the containment bound above is deliberately loose. The dollars
 *  end-anchor 8 units left of the axis (ConfidenceBand TICK_FX), and on a narrow arm the widest
 *  catalog dollar is wider than the column renders, so it hangs LEFT of the figure into the card's
 *  own padding: on screen, unclipped (audit()'s note). Loose is not unbounded — the ink must stay
 *  clear of the CARD edge, where a clip (the plausible-WRONG-dollar attack) would start. The
 *  allowance is READ from the live card at each arm, exactly as `floorPx` reads --text-xs: a typed
 *  25 would go quietly wrong the day the drawer is re-spaced.
 *  MEASURED (the `borderline` arm, this gate, 2026-09-05, Windows/DirectWrite — `room` is 25.0 px on
 *  every arm: the drawer's 24 px padding + 1 px border): the 45.0 px "$0.375M" / "$1.125M" sit 21.9 px
 *  INSIDE the figure at REAL (446 px figure), 8.7 px inside at FLOOR (358), 1.2 px inside at PHONE
 *  (308), and hang 9.3 px LEFT of it on the 320 arm (238 px figure, a 35.7 px column) — 15.7 px clear
 *  of the card edge. Every other catalog dollar is narrower (38.5, 32.1, 12.9 px). Linux CI renders
 *  the same glyphs ~3 px narrower (FreeType's whole-pixel advances): 42.0 px, a 6.3 px borrow at 320. */
function assertTickColumn(a: Audit, label: string): void {
  const ticks = a.nodes.filter((n) => !n.hidden && /band-tick/.test(n.cls))
  expect(ticks.length, `${label}: fewer than two y-ticks — the tick oracle has nothing to measure`).toBeGreaterThan(1)
  const widest = Math.max(...ticks.map((n) => n.right - n.left))
  // Non-vacuity, two halves: this arm exists to render the WIDEST catalog dollar — the seven-glyph
  // quarters of a 1.5-rung ceiling ("$0.375M" / "$1.125M", bandData buildYTicks) — so (1) such a
  // dollar must be ON the axis (the household's ceiling still lands on the 1.5 rung), and (2) its ink
  // must be the widest thing the catalog renders (a MAX, never a min — `$0` is a .band-tick too). The
  // ink floor is PLATFORM-AWARE: the same Source Sans 3 glyphs measure 45.0 px on Windows (DirectWrite,
  // fractional advances) and 42.0 px on Linux CI (FreeType rounds each advance to a whole pixel —
  // seven glyphs lose ~3 px; measured 2026-09-05 when a Windows-pinned 44 reddened CI). 40 clears both
  // and still excludes every six-glyph dollar (38.5 / ~36).
  expect(
    ticks.some((n) => /^\$\d\.\d{3}M$/.test(n.text)),
    `${label}: no seven-glyph quarter dollar on the axis (${ticks.map((n) => n.text).join(' ')}) — this seed no longer quarters a 1.5-rung ceiling; the arm proves nothing, re-pick the seed`,
  ).toBe(true)
  expect(
    widest,
    `${label}: the widest y-tick is ${widest.toFixed(1)}px of ink — narrower than the widest catalog dollar renders on any platform (45.0 Windows / 42.0 Linux at --text-xs); the arm proves nothing, re-pick the seed`,
  ).toBeGreaterThanOrEqual(40)
  const room = a.chartBox.left - a.bound.left // the card padding a tick is permitted to borrow
  for (const n of ticks) {
    const borrow = a.chartBox.left - n.left
    expect(
      borrow,
      `${label}: "${n.text}" hangs ${borrow.toFixed(1)}px left of its figure into ${room.toFixed(1)}px of card padding — a dollar within ${TICK_CLEARANCE_PX}px of the card edge is the clip this gate exists to catch`,
    ).toBeLessThanOrEqual(room - TICK_CLEARANCE_PX)
  }
}

type CtSeat = 'plot' | 'flow'
type ReadoutLine = {
  readonly text: string
  readonly fontPx: number
  /** the INK box (a Range over the line's contents), never the line's own border box: a nowrap line
   *  inside a capped box paints past its border, and inside the flow row `max-inline-size: 100%`
   *  CLAMPS the border box over exactly that overflow — the rect would hide what the reader sees. */
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}
type ReadoutAudit = {
  /** the seat the chart DECIDED, read from its own `data-readout-seat` render hook */
  readonly seat: CtSeat
  readonly present: boolean
  /** the container the ink must stay inside: the box's border box, or the flow row's */
  readonly container: Rect
  /** the card the flow row must stay inside (the same bound audit() uses for this chart) */
  readonly card: Rect
  readonly plot: { readonly left: number; readonly right: number }
  readonly ruleX: number | null
  readonly tickRight: number
  /** the box's left edge (plot seat only) — the side-flip oracle's input */
  readonly boxLeft: number | null
  readonly rowHeight: number
  readonly figureHeight: number
  readonly lines: readonly ReadoutLine[]
  /** the seat predicate's own inputs, measured independently off the rendered row */
  readonly ink: {
    readonly widestInkPx: number
    readonly widestColumnPx: number
    readonly chromePx: number
    readonly capPx: number
    readonly plotWidthPx: number
    readonly hostW: number
  }
}

/** The gap between the scrub rule and the readout box. Mirrors CT_READOUT_GAP_PX (src/viz/chartText.tsx),
 *  BY HAND: e2e cannot import that module (it imports a stylesheet, which the Playwright loader does
 *  not transform), and a hand-typed constant is this suite's discipline anyway (DND 012 — the unit
 *  battery types the same 10 rather than reading it off the code under test). */
const READOUT_GAP_PX = 10

/** The tolerance on "the ink is inside its own container" — sub-pixel rounding only. */
const INK_TOL = 0.5

/** The scrub readout takes ONE OF TWO SEATS (src/viz/chartText.tsx useReadoutSeat), so it is
 *  deliberately NOT in audit()'s node set: in the PLOT seat it covers the fan by design and its
 *  bound is the plot; in the FLOW seat it is a reserved row under the chart and its bound is the
 *  card. This reads BOTH, plus the predicate's own measured inputs, so the oracles below can check
 *  the words AND the decision that placed them. The plot rect is read from the transparent capture
 *  rect the chart already draws — no geometry is re-typed. */
async function auditReadout(page: Page, figSel: string, capSel: string, ruleSel: string, tickSel: string, boundSel: string): Promise<ReadoutAudit> {
  return page.evaluate(
    ([fs, cs, rs, ts, bs]) => {
      const fig = document.querySelector(fs)
      if (!fig) throw new Error(`chart-text: no figure matches ${fs}`)
      const bound = fig.closest(bs)
      if (!bound) throw new Error(`chart-text: ${fs} has no ancestor matching ${bs} — name a real card`)
      const seat = fig.getAttribute('data-readout-seat')
      if (seat !== 'plot' && seat !== 'flow') throw new Error(`chart-text: ${fs} published no data-readout-seat (got ${seat})`)
      const box = fig.querySelector<HTMLElement>('.ct-readout')
      const row = fig.querySelector<HTMLElement>('.ct-readout-row')
      if (!row) throw new Error(`chart-text: ${fs} renders no .ct-readout-row — the flow seat is missing`)
      const capEl = fig.querySelector(cs)
      if (!capEl) throw new Error(`chart-text: no capture rect matches ${cs} inside ${fs}`)
      const cap = capEl.getBoundingClientRect()
      const rule = fig.querySelector(rs)?.getBoundingClientRect() ?? null
      const ticks = [...fig.querySelectorAll(ts)].map((t) => t.getBoundingClientRect())
      const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      const active = row.querySelector<HTMLElement>('[data-ct-readout-item][data-active]')
      const shown: HTMLElement[] =
        seat === 'plot'
          ? box
            ? [...box.querySelectorAll<HTMLElement>(':scope > span')]
            : []
          : active
            ? [...active.querySelectorAll<HTMLElement>('[data-ct-readout-line]')]
            : []
      const container = seat === 'plot' ? box : row
      // the predicate's inputs, measured off the row exactly as the hook does — but from THIS side of
      // the browser: the app measured them at layout time, this reads the rendered result back.
      let widestInkPx = 0
      let widestColumnPx = 0
      for (const item of row.querySelectorAll<HTMLElement>('[data-ct-readout-item]')) {
        widestColumnPx = Math.max(widestColumnPx, item.getBoundingClientRect().width)
        for (const line of item.querySelectorAll<HTMLElement>('[data-ct-readout-line]')) {
          if (getComputedStyle(line).whiteSpace !== 'nowrap') continue
          widestInkPx = Math.max(widestInkPx, line.getBoundingClientRect().width)
        }
      }
      const hostW = fig.querySelector('.ct-host')!.getBoundingClientRect().width
      const capRaw = getComputedStyle(row).getPropertyValue('--ct-readout-cap').trim()
      const capNum = parseFloat(capRaw)
      return {
        seat,
        present: shown.length > 0,
        container: container ? rect(container.getBoundingClientRect()) : { left: 0, right: 0, top: 0, bottom: 0 },
        card: rect(bound.getBoundingClientRect()),
        plot: { left: cap.left, right: cap.right },
        ruleX: rule ? rule.left + rule.width / 2 : null,
        tickRight: ticks.length ? Math.max(...ticks.map((t) => t.right)) : cap.left,
        boxLeft: box ? box.getBoundingClientRect().left : null,
        rowHeight: row.getBoundingClientRect().height,
        figureHeight: fig.getBoundingClientRect().height,
        lines: shown.map((l) => {
          const range = document.createRange()
          range.selectNodeContents(l)
          const ink = range.getBoundingClientRect()
          return {
            text: (l.textContent ?? '').trim(),
            fontPx: parseFloat(getComputedStyle(l).fontSize),
            left: ink.left,
            right: ink.right,
            top: ink.top,
            bottom: ink.bottom,
          }
        }),
        ink: {
          widestInkPx,
          widestColumnPx,
          chromePx: row.querySelector('[data-ct-readout-chrome]')?.getBoundingClientRect().width ?? 0,
          capPx: Number.isFinite(capNum) ? (capRaw.endsWith('%') ? (capNum / 100) * hostW : capNum) : Number.POSITIVE_INFINITY,
          plotWidthPx: cap.width,
          hostW,
        },
      }
    },
    [figSel, capSel, ruleSel, tickSel, boundSel] as const,
  )
}

/** The seat the MEASURED geometry demands, re-derived here from boxes this spec read itself (the app
 *  reads its own, at layout time, through useReadoutSeat). Both clauses are the shipped law: the ink
 *  fits the box's cap, and the box as it renders fits beside a MID-plot rule — and the same
 *  "was anything measured at all" guard the predicate carries, so the two are the SAME function and
 *  a divergence here is a real divergence and never a transcription gap. */
function expectedSeat(r: ReadoutAudit): CtSeat {
  if (!(r.ink.widestColumnPx > 0) || !(r.ink.plotWidthPx > 0)) return 'plot'
  const boxPx = Math.min(r.ink.widestColumnPx + r.ink.chromePx, r.ink.capPx)
  return r.ink.widestInkPx + r.ink.chromePx <= r.ink.capPx && boxPx + READOUT_GAP_PX <= r.ink.plotWidthPx / 2 ? 'plot' : 'flow'
}

function assertReadout(r: ReadoutAudit, floor: number, label: string): void {
  // THE SEAT MATCHES THE MEASURED PREDICATE — a stale decision (a hook that never re-ran on the
  // resize or the font swap) shows up here and nowhere else. FIRST, so a planted wrong seat reds on
  // its own message rather than on the empty seat it leaves behind.
  expect(
    r.seat,
    `${label}: the chart seated the readout in the ${r.seat} but the geometry says ${expectedSeat(r)} — ` +
      `widest ink ${r.ink.widestInkPx.toFixed(1)} + chrome ${r.ink.chromePx.toFixed(1)} vs cap ${r.ink.capPx.toFixed(1)}; ` +
      `box ${Math.min(r.ink.widestColumnPx + r.ink.chromePx, r.ink.capPx).toFixed(1)} + gap ${READOUT_GAP_PX} vs half-plot ${(r.ink.plotWidthPx / 2).toFixed(1)}`,
  ).toBe(expectedSeat(r))
  // NON-VACUITY on clause 1 (insight 029). `widestInkPx` is the widest line this browser reported
  // `white-space: nowrap` for; every household these readout arms drive (`retired`) composes an ages
  // line and dollar figures, all nowrap, so a zero here is never a real reading — it is the
  // measurement itself having gone blind (a `white-space` computed-value change, a renamed kind
  // class, a row that stopped rendering its columns). Both the app and `expectedSeat` would then
  // read 0 and AGREE, and the cap clause would pass for every arm forever.
  expect(
    r.ink.widestInkPx,
    `${label}: no UNBREAKABLE readout line was measured (widest nowrap ink 0 across ${r.ink.widestColumnPx.toFixed(1)}px of column) — ` +
      `the seat predicate's cap clause is vacuous; the ink measurement, not the household, is what broke`,
  ).toBeGreaterThan(0)
  expect(r.present, `${label}: the scrub readout never rendered (seat ${r.seat})`).toBe(true)
  expect(r.lines.length, `${label}: the readout rendered no lines`).toBeGreaterThan(0)
  for (const l of r.lines) {
    expect(l.fontPx, `${label}: readout line "${l.text}" renders at ${l.fontPx}px — under the ${floor}px floor`).toBeGreaterThanOrEqual(floor - 0.01)
    // THE INK IS INSIDE ITS OWN CONTAINER. The 320 defect was 13px of every line outside the box's
    // border; the remedy is a SEAT, so this holds in both of them (the box, or the row).
    // The INLINE axis is exact — that is the axis a nowrap figure overflows on, and the whole defect.
    // The BLOCK axis carries a per-line allowance because a glyph box legitimately exceeds a
    // `line-height: 1.3` box by the font's half-leading (measured 2.0px on a 15.04px line at the 320
    // arm); half the line's own font size bounds that and still catches a line rendered clear of its
    // container.
    const leading = l.fontPx / 2
    expect(
      l.left >= r.container.left - INK_TOL &&
        l.right <= r.container.right + INK_TOL &&
        l.top >= r.container.top - leading &&
        l.bottom <= r.container.bottom + leading,
      `${label}: readout line "${l.text}" ink [${l.left.toFixed(1)},${l.right.toFixed(1)}]×[${l.top.toFixed(1)},${l.bottom.toFixed(1)}] ` +
        `leaves its own ${r.seat === 'plot' ? 'box' : 'row'} [${r.container.left.toFixed(1)},${r.container.right.toFixed(1)}]×[${r.container.top.toFixed(1)},${r.container.bottom.toFixed(1)}]`,
    ).toBe(true)
    if (r.seat === 'plot') {
      expect(
        l.left >= r.plot.left - TOL && l.right <= r.plot.right + TOL,
        `${label}: readout line "${l.text}" [${l.left.toFixed(1)},${l.right.toFixed(1)}] leaves the plot [${r.plot.left.toFixed(1)},${r.plot.right.toFixed(1)}]`,
      ).toBe(true)
      expect(l.left > r.tickRight + TOL, `${label}: readout line "${l.text}" sits over the y-tick dollar column (tick ink to ${r.tickRight.toFixed(1)})`).toBe(true)
      if (r.ruleX !== null) {
        expect(l.left > r.ruleX + TOL || l.right < r.ruleX - TOL, `${label}: readout line "${l.text}" paints over the scrub rule at x=${r.ruleX.toFixed(1)}`).toBe(true)
      }
    } else {
      // in the flow seat the words are OUT of the plot by design; the bound they must respect is the
      // chart's own card — the same one every other node in this gate is measured against.
      expect(
        l.left >= r.card.left - TOL && l.right <= r.card.right + TOL,
        `${label}: readout line "${l.text}" [${l.left.toFixed(1)},${l.right.toFixed(1)}] leaves its card [${r.card.left.toFixed(1)},${r.card.right.toFixed(1)}]`,
      ).toBe(true)
    }
  }
  // the two seats are EXCLUSIVE: no reading is ever shown twice, and the unused seat reserves nothing.
  if (r.seat === 'flow') {
    expect(r.boxLeft, `${label}: the in-plot box rendered in the FLOW seat — the reading is on screen twice`).toBeNull()
  } else {
    expect(r.rowHeight, `${label}: the flow row reserves ${r.rowHeight.toFixed(1)}px in the PLOT seat — it must collapse to nothing`).toBeLessThanOrEqual(INK_TOL)
  }
}

/** THE ROW NEVER MOVES (insight 035): in the flow seat every column's reading is rendered stacked
 *  and hidden, so the row is reserved at its TALLEST at this width — its height is the same at every
 *  column AND before anything is scrubbed, and so is the whole chart's. A row that grew to fit the
 *  reading would shift the page under a scrubbing finger, which is the defect the reserve exists to
 *  prevent. Its own function so a plant can bind to its message. */
function assertReservedRow(idleHeight: number, rowHeights: readonly number[], figureHeights: readonly number[], label: string): void {
  expect(rowHeights.length, `${label}: fewer than five columns scrubbed — the reserved-row oracle proves little`).toBeGreaterThanOrEqual(5)
  expect(
    new Set(rowHeights.map((h) => h.toFixed(2))).size,
    `${label}: the flow row changed height while scrubbing (${rowHeights.map((h) => h.toFixed(2)).join(' ')})`,
  ).toBe(1)
  expect(
    new Set([idleHeight, ...figureHeights].map((h) => h.toFixed(2))).size,
    `${label}: the chart changed height between idle (${idleHeight.toFixed(2)}) and scrubbed (${figureHeights.map((h) => h.toFixed(2)).join(' ')}) — the row is not reserved`,
  ).toBe(1)
}

/** The box seats RIGHT of the rule while that fits inside the plot and LEFT once it does not
 *  (src/viz/chartText.tsx placeReadoutX), so walking the columns left→right the side may change at
 *  most ONCE, and only right→left. Pure, so the control below can prove it discriminates. */
function sideFlips(sides: readonly ('left' | 'right')[]): { readonly flips: number; readonly monotone: boolean } {
  let flips = 0
  let backwards = 0
  for (let i = 1; i < sides.length; i++) {
    if (sides[i] === sides[i - 1]) continue
    flips++
    if (sides[i] === 'right') backwards++
  }
  return { flips, monotone: flips <= 1 && backwards === 0 }
}

/* ── the ladder CROWN's two seats ──────────────────────────────────────────────────────────────
 * The crown callout takes ONE OF TWO SEATS, measured per WIDTH before paint (src/viz/OddsLadder.tsx
 * useCrownSeat; his eye on temp/cold-read-320, pictures 06 + 07, 2026-09-06): ABOVE its ringed dot
 * while the measured headroom holds the two lines, else a reserved row above the plot. It replaces
 * the BESIDE-the-dot ceiling branch, which — flush against its dot — printed "better than 9 in 10"
 * straight across the year-2..5 dots on the 320 arm AND the 1536 laptop. Like the scrub readout it
 * is deliberately outside `assertChartText`'s bound set logic in the ABOVE seat's headroom sense:
 * its own oracles below check the DECISION and the marks it must clear, while `assertChartText`
 * still holds it to the floor, the card and non-overlap with other TEXT in whichever seat it takes.
 */
type CrownSeat = 'above' | 'flow'

/** The ladder viewBox's height and the crown's dot→callout gap, BY HAND — the same discipline as
 *  READOUT_GAP_PX above (DND 012): src/viz/oddsLadderGeometry.ts's `VIEWBOX.height` is 284 and
 *  src/viz/OddsLadder.tsx's `CROWN_GAP` is `CROWN_RING_R + 5` = 14 viewBox units. Re-deriving the
 *  headroom here from numbers this spec types itself is what makes the seat oracle a check rather
 *  than a transcription of the code under test. */
const LADDER_VIEWBOX_H = 284
const CROWN_GAP_UNITS = 14

type CrownAudit = {
  /** the seat the chart DECIDED, read from its own `data-crown-seat` render hook */
  readonly seat: CrownSeat
  readonly present: boolean
  readonly text: string
  /** the callout as it renders in the seat that is showing: the in-plot box, or the row's item */
  readonly callout: Rect
  readonly figure: Rect
  readonly host: Rect
  /** every mark the plot draws — the dots and the crown's halo ring, which the words must clear */
  readonly marks: readonly { readonly cls: string; readonly rect: Rect }[]
  /** the plot's own top edge (the capture rect's), so a run can REPORT how far into the plot the
   *  callout's last line reaches — see the residual note on `assertCrown` */
  readonly plotTopPx: number
  /** the gap from the callout's bottom edge down to the top of the crown's own halo ring — the
   *  thing that BOUNDS the residual above, since the crown-vs-marks clause reds the moment the
   *  callout reaches the ring. Reported so the bound is a measured number and not an assurance. */
  readonly ringClearancePx: number
  /** THE RESERVE. `.ladder-crown-row` is authored from the two registers it wears
   *  (`--ct-row-h`, oddsLadder.css) rather than measured, so the row's own block height and the ink
   *  it holds are two independent numbers that must agree — the row collapses to nothing in the
   *  above seat and holds the whole callout in the flow seat. */
  readonly rowReservePx: number
  /** the predicate's own inputs, re-measured off the rendered DOM from this side of the browser */
  readonly probeHeightPx: number
  readonly headroomPx: number
  readonly hostHeightPx: number
}

/** Read the crown's seat, the callout that seat put on screen, the marks it must clear, and the two
 *  numbers the decision was made from. The headroom is derived from the CROWN DOT's own rendered
 *  centre — not from a re-typed rung — so the spec never has to know which rung this household
 *  crowned: the dot's centre IS `yForRung(rung)` in host px, and the callout anchors CROWN_GAP_UNITS
 *  above it. */
async function auditCrown(page: Page): Promise<CrownAudit> {
  return page.evaluate(
    ([vbH, gapUnits]) => {
      const fig = document.querySelector('figure.ladder-figure')
      if (!fig) throw new Error('chart-text: no figure matches figure.ladder-figure')
      const seat = fig.getAttribute('data-crown-seat')
      if (seat !== 'above' && seat !== 'flow') throw new Error(`chart-text: the ladder published no data-crown-seat (got ${seat})`)
      const host = fig.querySelector('.ct-host')
      if (!host) throw new Error('chart-text: the ladder figure has no .ct-host — the headroom has nothing to measure against')
      const probe = fig.querySelector('[data-ladder-crown-probe]')
      if (!probe) throw new Error('chart-text: the crown row renders no probe — the seat would be decided from nothing')
      const dot = fig.querySelector('.ladder-dot--crown')
      if (!dot) throw new Error('chart-text: this household crowned no date — the crown oracles have nothing to walk')
      const row = fig.querySelector('.ladder-crown-row')
      if (!row) throw new Error('chart-text: the ladder rendered no .ladder-crown-row — the crown has only one seat')
      const ring = fig.querySelector('.ladder-ring')
      const shown =
        seat === 'above'
          ? fig.querySelector<HTMLElement>('.ladder-text .ladder-crown')
          : fig.querySelector<HTMLElement>('.ladder-crown-row__item')
      const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })
      const hostR = host.getBoundingClientRect()
      const dotR = dot.getBoundingClientRect()
      const capture = fig.querySelector('.ladder-scrub-capture')
      if (!capture) throw new Error('chart-text: the ladder drew no scrub capture rect — the plot has no measured top edge')
      return {
        seat,
        present: shown !== null,
        text: (shown?.textContent ?? '').trim(),
        callout: shown ? rect(shown.getBoundingClientRect()) : { left: 0, right: 0, top: 0, bottom: 0 },
        figure: rect(fig.getBoundingClientRect()),
        host: rect(hostR),
        marks: [...fig.querySelectorAll('.ladder-dot, .ladder-ring')].map((m) => ({
          cls: m.getAttribute('class') ?? '',
          rect: rect(m.getBoundingClientRect()),
        })),
        plotTopPx: capture.getBoundingClientRect().top,
        // the crown's own halo ring is what the residual dip runs into: the callout's bottom is
        // CROWN_GAP − CROWN_RING_R = 5 viewBox units above it, and the marks clause below reds there.
        ringClearancePx: ring && shown ? ring.getBoundingClientRect().top - shown.getBoundingClientRect().bottom : Number.NaN,
        rowReservePx: row.getBoundingClientRect().height,
        probeHeightPx: probe.getBoundingClientRect().height,
        // the callout's anchor sits CROWN_GAP_UNITS above the crown dot's centre; everything between
        // that anchor and the host's top edge is room the two lines may grow into.
        headroomPx: (dotR.top + dotR.height / 2 - hostR.top) - (gapUnits / vbH) * hostR.height,
        hostHeightPx: hostR.height,
      }
    },
    [LADDER_VIEWBOX_H, CROWN_GAP_UNITS] as const,
  )
}

/** The seat the MEASURED geometry demands, re-derived from boxes this spec read itself (the app
 *  reads its own, at layout time, through useCrownSeat) — the same one clause, including the same
 *  "was anything measured at all" guard, so a divergence here is a real divergence. */
function expectedCrownSeat(c: CrownAudit): CrownSeat {
  if (!(c.probeHeightPx > 0) || !(c.headroomPx > 0)) return 'above'
  return c.probeHeightPx <= c.headroomPx ? 'above' : 'flow'
}

function assertCrown(c: CrownAudit, label: string): void {
  // THE SEAT MATCHES THE MEASURED PREDICATE — first, so a planted wrong seat reds on its own message
  // rather than on the empty seat it leaves behind.
  expect(
    c.seat,
    `${label}: the ladder seated the crown ${c.seat} but the geometry says ${expectedCrownSeat(c)} — ` +
      `callout ${c.probeHeightPx.toFixed(1)}px tall vs ${c.headroomPx.toFixed(1)}px of headroom on a ${c.hostHeightPx.toFixed(1)}px host`,
  ).toBe(expectedCrownSeat(c))
  // NON-VACUITY on both inputs (insight 029): a zero on either side makes the predicate degenerate
  // to "always above", and the app and this spec would then read 0 and AGREE forever.
  expect(c.probeHeightPx, `${label}: the crown probe measured 0px — the seat predicate is vacuous (the probe stopped rendering, or the row is display:none)`).toBeGreaterThan(0)
  expect(c.headroomPx, `${label}: the crown headroom measured ${c.headroomPx.toFixed(1)}px — the host or the crown dot never laid out`).toBeGreaterThan(0)
  expect(c.present, `${label}: the crown callout never rendered (seat ${c.seat})`).toBe(true)
  expect(c.text.length, `${label}: the crown callout rendered no words`).toBeGreaterThan(0)
  // CONTAINED. In the ABOVE seat the callout grows UP out of its anchor, so the failure it can have
  // is its top leaving the figure (the instrument measured the old callout 13.5px ABOVE the svg host
  // at 320 × root-20); in the FLOW seat it is inside the reserved row, inside the figure.
  expect(
    c.callout.top >= c.figure.top - TOL &&
      c.callout.bottom <= c.figure.bottom + TOL &&
      c.callout.left >= c.figure.left - TOL &&
      c.callout.right <= c.figure.right + TOL,
    `${label}: the crown callout "${c.text}" [${c.callout.left.toFixed(1)},${c.callout.right.toFixed(1)}]×[${c.callout.top.toFixed(1)},${c.callout.bottom.toFixed(1)}] ` +
      `leaves its figure [${c.figure.left.toFixed(1)},${c.figure.right.toFixed(1)}]×[${c.figure.top.toFixed(1)},${c.figure.bottom.toFixed(1)}]`,
  ).toBe(true)
  // THE ROW'S RESERVE. `--ct-row-h` (oddsLadder.css) is AUTHORED from the two registers the callout
  // wears, never measured — the `.ct-block` discipline — so the row's block height and the ink it
  // holds are two independent numbers that have to agree, and nothing else here can see them part:
  // the row's item overflowing its box would still be inside the figure and inside `main.result`.
  // Both directions matter and they are opposite clauses, so each carries its own message:
  //   · ABOVE — the row must collapse to NOTHING (it is present only so its probe can be measured);
  //     a row that reserved height there would push the plot down for no words.
  //   · FLOW  — the row must hold the whole callout, or the words paint down into the plot.
  if (c.seat === 'above') {
    expect(
      c.rowReservePx,
      `${label}: the crown row reserves ${c.rowReservePx.toFixed(1)}px in the above seat — it must collapse to nothing when the callout is in the plot`,
    ).toBeLessThanOrEqual(TOL)
  } else {
    expect(
      c.rowReservePx,
      `${label}: the crown row reserves ${c.rowReservePx.toFixed(1)}px but must hold the ink it renders — the callout is ${c.probeHeightPx.toFixed(1)}px tall`,
    ).toBeGreaterThanOrEqual(c.probeHeightPx - TOL)
  }
  // CLEAR OF THE MARKS — the whole ruling. A callout that covers a dot hides an evaluated stop-date
  // from the one chart that exists to show them all.
  // RESIDUAL, reported rather than SEPARATELY bounded — because this clause already bounds it: the
  // callout anchors CROWN_GAP units above its DOT, and a crown below the ceiling has a rung's worth
  // of plot above that dot, so a rung-9 callout's last line legitimately sits a few px BELOW the
  // plot's top edge (7.1px at REAL = 8 viewBox units, yForRung(9) − 14 − PLOT.top), where a scrub
  // rule drawn at the crown's own column passes behind it. A hairline behind a tell, not a covered
  // mark — and it cannot get worse than ~13 units, because the callout's bottom is only 5 viewBox
  // units (~4.4px at REAL, `ringClearancePx` in every run's report) above its OWN halo ring and this
  // loop reds the instant it reaches it. Closing it outright would mean anchoring at PLOT.top, which
  // costs the PHONE arm its above seat (40.9px of headroom becomes 35.8, under a 36.6px callout) — a
  // taste call his eye has not been asked.
  for (const m of c.marks) {
    const hit =
      c.callout.left < m.rect.right - 0.5 && c.callout.right > m.rect.left + 0.5 && c.callout.top < m.rect.bottom - 0.5 && c.callout.bottom > m.rect.top + 0.5
    expect(
      hit,
      `${label}: the crown callout "${c.text}" [${c.callout.left.toFixed(1)},${c.callout.right.toFixed(1)}]×[${c.callout.top.toFixed(1)},${c.callout.bottom.toFixed(1)}] ` +
        `covers a mark (${m.cls}) at [${m.rect.left.toFixed(1)},${m.rect.right.toFixed(1)}]×[${m.rect.top.toFixed(1)},${m.rect.bottom.toFixed(1)}]`,
    ).toBe(false)
  }
}

/** Two settled frames: the readout carries NO motion (ConfidenceBand: "glued to the detent") and
 *  useReadoutPlacement is a useLayoutEffect, so this is a settled placement without waiting on
 *  `settleLayout`'s animation scan. */
const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

/** figure → the card it must stay inside. Reasons + measurements: audit()'s note above. */
const BAND = ['figure.band-figure', '.band-drawer, [role="dialog"]'] as const
const LADDER = ['figure.ladder-figure', 'main.result'] as const
const TF = ['.tf-host', '[role="dialog"]'] as const

const ARMS = [
  { name: 'PHONE', use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
  { name: 'NARROW', use: { viewport: { width: 320, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  // WCAG 1.4.10's LITERAL test condition: 320 CSS px in a desktop UA whose classic scrollbar takes
  // layout width (every other 320 arm is isMobile — overlay scrollbars — so the gate could not see
  // the ~15 px it costs the figure; council wf_1b45326f-9e8, 2026-09-05). Fine pointer: it scrubs by hover.
  { name: 'NARROW-SCROLLBAR', use: { viewport: { width: 320, height: 800 } } },
  { name: 'FLOOR', use: { viewport: FLOOR } },
  { name: 'REAL', use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
] as const

/** THE SEAT EACH ARM MEASURED (2026-09-06, Windows/DirectWrite, the `retired` household — the seat
 *  is a function of the WIDEST column's ink, so it is per-arm AND per-household). Recorded, not
 *  decreed: `assertReadout` re-derives the seat from the live geometry on every arm, and this table
 *  is the NON-VACUITY half — a remedy that quietly took one seat everywhere would still satisfy the
 *  predicate oracle, and only this table can see it. The numbers behind it (band, `retired`):
 *    · REAL   446px host → plot 356.8, half 178.4, cap 169.5; widest ink 128.8 + 26 chrome = 154.8
 *             ≤ 169.5, box min(138 + 26, 169.5) + 10 = 174 ≤ 178.4 → PLOT.
 *    · FLOOR  358px host → cap 136.0; 154.8 > 136.0 → FLOW (the cap clause, not the room).
 *    · PHONE  308px host → cap 117.0; 148.2 > 117.0 → FLOW (the box would have to be 31px WIDER than
 *             the cap allows to hold its widest line — the box does not clip, the line paints out).
 *    · 320 arms 238px host → cap 90.4; 147.1 > 90.4 → FLOW (the 13px-past-the-border shape his eye
 *             ruled CROWDED on temp/cold-read-320, pictures 01–03).
 *  Update it from a measured run, never from a guess — and never to make a red go away. */
const BAND_SEAT: Readonly<Record<string, CtSeat>> = {
  PHONE: 'flow',
  NARROW: 'flow',
  'NARROW-SCROLLBAR': 'flow',
  FLOOR: 'flow',
  REAL: 'plot',
}
/** The same, for TwoFutures inside a lever sheet. Fine-pointer arms only — TF's scrub is mouse/pen
 *  (TwoFutures.tsx onMove). Its readout is a shorter composition than the fan's (two arm figures, no
 *  range), so its ink clears the cap everywhere measured and it is the ROOM clause that decides:
 *    · REAL and FLOOR both render the sheet at its max width — a 752px host → plot 429.7, half
 *      214.9; box 117.5 + 10 ≤ 214.9 → PLOT on both.
 *    · 320-scrollbar 280px host → plot 160.0, half 80.0; box 106.4 + 10 > 80.0 → FLOW. TF's plot is
 *      320 of 560 units against the band's 448, so a narrow sheet runs out of room sooner. */
const TF_SEAT: Readonly<Record<string, CtSeat>> = {
  'NARROW-SCROLLBAR': 'flow',
  FLOOR: 'plot',
  REAL: 'plot',
}

/** THE CROWN'S SEAT PER ARM, on `?seed=atceiling` — the CEILING crown, whose dot sits on the top
 *  rung and therefore has the LEAST headroom of any rung (its callout anchors at 42 of the 284-unit
 *  viewBox, against a rung-9 crown's 64). Recorded from a measured run, not decreed: `assertCrown`
 *  re-derives the seat from live geometry on every arm, and this table is the NON-VACUITY half —
 *  a remedy that quietly took one seat everywhere would satisfy the predicate oracle, and only a
 *  recorded table can see it.
 *
 *  It is ALL FLOW, and that is the finding rather than an omission: the callout is two rem-fixed
 *  lines — 36.6px on the phone's 15.2px --text-sm, 37.7px once the clamp tops out at 16px — while
 *  the ceiling's headroom is a FRACTION of the figure's width: the anchor sits 42 of the 560 viewBox
 *  units below the host's top, i.e. 42/560 = 7.5% of the figure, so a 37.7px callout needs a
 *  37.7 / 0.075 = ~503px ladder figure and the widest this product ever renders is 496px. It misses
 *  by SEVEN PIXELS OF FIGURE WIDTH — which is the same 0.5px of headroom REAL falls short by, and
 *  exactly why REAL sits inside CROWN_SEAT_MARGIN_PX below. Not "structurally impossible": one
 *  re-spaced page column away, so re-measure rather than assume. The ceiling rung is why the
 *  BESIDE-the-dot branch existed; there was never room, and printing across the year-2..5 dots is
 *  what "no room" used to look like (temp/cold-read-320, pictures 06 + 07).
 *  MEASURED 2026-09-06 (Windows/DirectWrite): REAL a 496px figure → a 251.5px host, 37.2px of
 *  headroom against a 37.7px callout (FLOW by 0.5px — the closest any arm comes); FLOOR a 408px
 *  figure → a 206.9px host, 30.6px; PHONE a 358px figure → a 181.5px host, 26.8px against 36.6;
 *  the 320 arms a 288px figure → a 146.0px host, 21.6px against 36.4.
 *  Update it from a measured run, never from a guess — and never to make a red go away. */
const CROWN_SEAT_CEILING: Readonly<Record<string, CrownSeat>> = {
  PHONE: 'flow',
  NARROW: 'flow',
  'NARROW-SCROLLBAR': 'flow',
  FLOOR: 'flow',
  REAL: 'flow',
}

/** The same on `?seed=datesplit`, whose crown sits one rung lower (rung 9) and so carries 64 of the
 *  284 units — 22 more than the ceiling. That one rung is the whole difference between a seat and no
 *  seat, and it is where BOTH seats are observed. MEASURED 2026-09-06:
 *    · REAL  a 251.5px host → 56.7px of headroom for a 37.7px callout ⇒ ABOVE (19.0px clear).
 *    · FLOOR a 206.9px host → 46.6px vs 37.7 ⇒ ABOVE (8.9px).
 *    · PHONE a 181.5px host → 40.9px vs 36.6 ⇒ ABOVE (4.3px — the tightest above seat that ships).
 *    · the 320 arms → FLOW. */
const CROWN_SEAT_RUNG9: Readonly<Record<string, CrownSeat>> = {
  PHONE: 'above',
  NARROW: 'flow',
  'NARROW-SCROLLBAR': 'flow',
  FLOOR: 'above',
  REAL: 'above',
}

/** The crown's non-vacuity claim is made over the UNION of the two tables, because the seat is a
 *  function of the seed's RUNG as well as the arm's width: the ceiling never fits above anywhere,
 *  the rung below it fits on the three widest arms. Either table alone would under-state the
 *  catalog; together they hold both seats. */
const CROWN_SEATS_OBSERVED: Readonly<Record<string, CrownSeat>> = {
  ...Object.fromEntries(Object.entries(CROWN_SEAT_CEILING).map(([arm, seat]) => [`atceiling/${arm}`, seat])),
  ...Object.fromEntries(Object.entries(CROWN_SEAT_RUNG9).map(([arm, seat]) => [`datesplit/${arm}`, seat])),
}

/** How close to its own boundary a measured seat may sit before the RECORDED table stops being
 *  enforced. The decision is a rem-fixed callout height against a fraction of a width, so a token
 *  re-tune or a one-step layout change moves it by a pixel or two — and REAL's ceiling crown misses
 *  the above seat by 0.5px. Inside this band the LIVE predicate (`assertCrown`, which runs on every
 *  arm regardless) is the whole check and the run reports the margin; outside it the table must
 *  match, or someone re-measures. It buys a boundary case a stable CI, never a waived oracle. */
const CROWN_SEAT_MARGIN_PX = 2

/** Hold the recorded seat where the measurement is not sitting on its own boundary. */
function expectRecordedCrownSeat(c: CrownAudit, recorded: CrownSeat, label: string, table: string): void {
  const margin = Math.abs(c.headroomPx - c.probeHeightPx)
  if (margin <= CROWN_SEAT_MARGIN_PX) {
    report(`${label}: seat=${c.seat}, ${margin.toFixed(1)}px from its own boundary — inside the ${CROWN_SEAT_MARGIN_PX}px band, so ${table} is not enforced here`)
    return
  }
  expect(c.seat, `${label}: the recorded seat (${recorded}) is not what the browser seated — re-measure and update ${table}`).toBe(recorded)
}

/** Both seats must be observed across the catalog — the oracle above is only as good as the arms it
 *  runs on, and a table that collapsed to one seat would make every seat assertion vacuous. (Shared
 *  by the readout's two tables and the crown's union: the shape of the claim is identical.) */
function assertBothSeatsObserved(table: Readonly<Record<string, string>>, what: string): void {
  expect(new Set(Object.values(table)).size, `${what}: the recorded seats are all the same — the seat oracle is vacuous`).toBe(2)
}

/** Set the browser's default font to 20px — the reader's-font condition. Per-target emulation, so it
 *  survives navigation: call it BEFORE the first `gotoSeedFinal` and the page solves ONCE at root-20
 *  (a date seed's final tier is ~1 min; two of them in one test blow the 120 s budget). */
async function setRootFont20(page: Page, context: BrowserContext): Promise<void> {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 20 } })
}

/** Raise the default font to 20px on an ALREADY-rendered page and re-render it — for the before/after
 *  comparison the reader's-font oracle needs. */
async function raiseRootFont(page: Page, context: BrowserContext): Promise<void> {
  await setRootFont20(page, context)
  await page.reload()
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleLayout(page)
}

for (const arm of ARMS) {
  test.describe(`chart text — ${arm.name} (${arm.use.viewport.width}×${arm.use.viewport.height})`, () => {
    test.use(arm.use)

    test('the band on the densest date household (the split label): readable, inside, never overprinting', async ({ page }) => {
      // `datemixed` carries the widest named moment ("Essentials date") and two annotation rows; it
      // renders NO ladder (the crowned date is the essentials date, not a work-optional one).
      await gotoSeedFinal(page, 'datemixed')
      const floor = await floorPx(page)
      expect(floor, 'the --text-xs token did not resolve').toBeGreaterThanOrEqual(12)
      assertChartText(await audit(page, ...BAND), floor, `${arm.name} band/datemixed`)
      // the $0 anchor — design-law §3's honesty proof — is present and visible
      await expect(page.locator('figure.band-figure .band-tick--floor')).toHaveText('$0')
      await expect(page.locator('figure.band-figure .band-tick--floor')).toBeVisible()
    })

    test('the band + the odds ladder on the date household: readable, inside, never overprinting', async ({ page }) => {
      await gotoSeedFinal(page, 'datesplit')
      const floor = await floorPx(page)
      assertChartText(await audit(page, ...BAND), floor, `${arm.name} band/datesplit`)
      const ladder = await audit(page, ...LADDER)
      assertChartText(ladder, floor, `${arm.name} ladder/datesplit`)
      // the priority clause in assertChartText is NOT vacuous — a real ladder node wears the flag AND the
      // audit really reads it. This assertion is load-bearing because nothing else can catch a dropped or
      // misspelled `priority` read: `e2e/` is outside tsconfig.json's `include`, so `pnpm typecheck` and
      // `pnpm build` never see this file, and eslint runs without type information — an undefined
      // `n.priority` would make `!n.priority` always true and degrade the clause back to the class
      // whitelist, still green. Same shape as the containment control's non-vacuity check below.
      expect(
        ladder.nodes.some((n) => n.priority),
        `${arm.name}: no ladder node carries data-ct-priority — the never-hide clause is vacuous`,
      ).toBe(true)
      // THE CROWN, one rung below the ceiling (rung 9 — 22 viewBox units more headroom than
      // `atceiling` above): the seat its measurement demands, inside the figure, clear of every dot.
      assertBothSeatsObserved(CROWN_SEATS_OBSERVED, 'the crown')
      const c = await auditCrown(page)
      report(
        `${arm.name} rung-9 crown: seat=${c.seat} — host ${c.hostHeightPx.toFixed(1)}px tall, headroom ${c.headroomPx.toFixed(1)}px, ` +
          `callout ${c.probeHeightPx.toFixed(1)}px ⇒ ${(c.headroomPx - c.probeHeightPx).toFixed(1)}px of clearance; its last line reaches ${(c.callout.bottom - c.plotTopPx).toFixed(1)}px past the plot's top edge, ` +
          `${c.ringClearancePx.toFixed(1)}px clear of its own halo ring; the row reserves ${c.rowReservePx.toFixed(1)}px`,
      )
      assertCrown(c, `${arm.name} crown/datesplit`)
      expectRecordedCrownSeat(c, CROWN_SEAT_RUNG9[arm.name]!, `${arm.name} rung-9 crown`, 'CROWN_SEAT_RUNG9')
      // the "today" anchor itself — the one regression no attribute check can see: `data-ct-priority` and
      // the label BOTH derive from the same `t.today` (src/viz/OddsLadder.tsx, the x-axis block), so a tick
      // that loses its today-ness sheds the attribute and reads as an ordinary numeral. Copy source:
      // `ladderOffsetTick(0)`, src/ui/copy.ts — if that string changes, change this regex with it.
      await expect(
        page.locator('figure.ladder-figure .ladder-xtick', { hasText: /^today$/ }),
        'the ladder lost its "today" anchor (src/ui/copy.ts, ladderOffsetTick(0))',
      ).toBeVisible()
    })

    test('the spine band (the one-frame fit-law household) keeps ONE annotation row and readable ticks', async ({ page }) => {
      await gotoSeedFinal(page, 'retired')
      const floor = await floorPx(page)
      assertChartText(await audit(page, ...BAND), floor, `${arm.name} band/retired`)
      // the fit-law arms rest on a one-row annotation block (temp/chart-text/precondition.json)
      const rows = await page.locator('figure.band-figure .band-annotations').evaluate((el) => getComputedStyle(el).getPropertyValue('--ct-rows').trim())
      expect(rows, `${arm.name}: the spine household grew a second annotation row`).toBe('1')
    })

    test('the widest-tick household (a $1.5M ceiling quartered into seven-glyph dollars): the dollar column holds', async ({ page }) => {
      // `borderline` is the only spine seed in the measured catalog whose y-ticks reach the 45 CSS px
      // worst case ($0.375M / $1.125M — buildYTicks quarters a niceCeil 1.5 rung, an ordinary Back
      // Nine couple); every seed the tests above drive tops out at 22.4–32.1 px, so without this arm
      // the widest dollar the product renders never renders in CI. A spine seed costs ~2–3 s per arm.
      await gotoSeedFinal(page, 'borderline')
      const floor = await floorPx(page)
      const a = await audit(page, ...BAND)
      assertChartText(a, floor, `${arm.name} band/borderline`)
      assertTickColumn(a, `${arm.name} band/borderline`)
    })

    test('the CEILING crown (a household that clears today): the seat its headroom allows, clear of every dot', async ({ page }) => {
      // `atceiling` is the only seed whose crowned mark sits on the TOP rung, where the callout has
      // the least headroom of any rung — the case the dead BESIDE-the-dot branch served, and the one
      // whose "better than 9 in 10" printed straight across the year-2..5 dots on BOTH the 320 arm
      // and the 1536 laptop (his eye, temp/cold-read-320 pictures 06 + 07, 2026-09-06). Its odds
      // still read the clamped ceiling proportion, never "10 of 10".
      await gotoSeedFinal(page, 'atceiling')
      const floor = await floorPx(page)
      assertBothSeatsObserved(CROWN_SEATS_OBSERVED, 'the crown')
      assertChartText(await audit(page, ...LADDER), floor, `${arm.name} ladder/atceiling`)
      const c = await auditCrown(page)
      report(
        `${arm.name} ceiling crown: seat=${c.seat} — host ${c.hostHeightPx.toFixed(1)}px tall, headroom ${c.headroomPx.toFixed(1)}px, ` +
          `callout ${c.probeHeightPx.toFixed(1)}px ⇒ ${(c.headroomPx - c.probeHeightPx).toFixed(1)}px of clearance; its last line reaches ${(c.callout.bottom - c.plotTopPx).toFixed(1)}px past the plot's top edge, ` +
          `${c.ringClearancePx.toFixed(1)}px clear of its own halo ring; the row reserves ${c.rowReservePx.toFixed(1)}px`,
      )
      assertCrown(c, `${arm.name} crown/atceiling`)
      // Copy source: XOFTEN_CEILING in src/ui/copy.ts — if that string changes, change this regex with it.
      expect(c.text, 'the seed no longer crowns the ceiling rung, or the ceiling clamp broke (src/ui/copy.ts XOFTEN_CEILING)').toMatch(/better than 9 in 10/)
      // the dead branch must not survive anywhere: one rule for every rung now.
      await expect(page.locator('figure.ladder-figure .ladder-crown--side'), 'the BESIDE-the-dot branch is gone — it printed across the dots').toHaveCount(0)
      expectRecordedCrownSeat(c, CROWN_SEAT_CEILING[arm.name]!, `${arm.name} ceiling crown`, 'CROWN_SEAT_CEILING')
    })

    test('the scrub readout at EVERY lattice column: the measured seat, the ink inside it, a row that never moves — and dismissible on touch', async ({ page }) => {
      await gotoSeedFinal(page, 'retired')
      const floor = await floorPx(page)
      assertBothSeatsObserved(BAND_SEAT, 'band')
      const idleHeight = await page.locator('figure.band-figure').first().evaluate((f) => f.getBoundingClientRect().height)
      // scoped to the inline figure — the enlarge modal renders a second `rect.band-scrub-capture--enlarged`
      const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
      expect(cap, 'the band drew no scrub capture rect').toBeTruthy()
      const touch = 'hasTouch' in arm.use
      const y = cap.y + cap.height * 0.5
      // xForYear is linear across the capture rect, so lattice index i sits at i/(LATTICE_POINTS-1).
      // Fine pointers sweep EVERY column (49 hover moves); touch steps by 4 so each tap is a NEW
      // column (a repeat column would DISMISS — ConfidenceBand's onUp) and the run stays quick.
      const step = touch ? 4 : 1
      // A touch at the capture rect's EXACT left edge dispatches no pointerdown to the rect on the 390 @3
      // arm (measured 2026-09-05: 0 / 0.34 / 0.5 px inside → no readout; 1 px inside → pins; the 320 @2
      // arm pins at 0). The scrub snaps to the NEAREST column either way, so a 1 px inset at both ends
      // still visits columns 0 and 48 — it just lands the touch on the rect.
      const xAt = (i: number) => Math.min(cap.x + cap.width - 1, Math.max(cap.x + 1, cap.x + cap.width * (i / (LATTICE_POINTS - 1))))
      let last = -1
      let maxLines = 0
      const sides: ('left' | 'right')[] = []
      const rowHeights: number[] = []
      const figureHeights: number[] = []
      let seen: CtSeat | null = null
      let measured = ''
      for (let i = 0; i < LATTICE_POINTS; i += step) {
        const x = xAt(i)
        if (touch) await page.touchscreen.tap(x, y)
        else await page.mouse.move(x, y)
        await twoFrames(page)
        const r = await auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick', BAND[1])
        maxLines = Math.max(maxLines, r.lines.length)
        assertReadout(r, floor, `${arm.name} band readout @lattice ${i}`)
        // THE SEAT IS PER WIDTH, NEVER PER COLUMN: it must not flip while the reader scrubs.
        if (seen === null) seen = r.seat
        expect(r.seat, `${arm.name}: the seat changed mid-scrub (${seen} → ${r.seat} at column ${i}) — the decision is per WIDTH`).toBe(seen)
        rowHeights.push(r.rowHeight)
        figureHeights.push(r.figureHeight)
        if (r.seat === 'plot' && r.ruleX !== null && r.boxLeft !== null) sides.push(r.boxLeft < r.ruleX ? 'left' : 'right')
        measured =
          `host ${r.ink.hostW.toFixed(1)}px, plot ${r.ink.plotWidthPx.toFixed(1)}, half ${(r.ink.plotWidthPx / 2).toFixed(1)}, cap ${r.ink.capPx.toFixed(1)}, ` +
          `widest ink ${r.ink.widestInkPx.toFixed(1)} + chrome ${r.ink.chromePx.toFixed(1)} = ${(r.ink.widestInkPx + r.ink.chromePx).toFixed(1)}, ` +
          `box ${Math.min(r.ink.widestColumnPx + r.ink.chromePx, r.ink.capPx).toFixed(1)}, row reserves ${r.rowHeight.toFixed(1)}`
        last = i
      }
      expect(seen, `${arm.name}: the recorded seat for this arm (${BAND_SEAT[arm.name]}) is not what the browser seated — re-measure and update BAND_SEAT`).toBe(BAND_SEAT[arm.name])
      report(`${arm.name} band readout: seat=${seen} — ${measured}`)
      if (seen === 'flow') {
        assertReservedRow(idleHeight, rowHeights, figureHeights, `${arm.name} band readout`)
      } else {
        // SIDE-FLIP MONOTONICITY: the box seats right of the rule while that fits and left after, so
        // across the columns the side flips at most once, and only right→left.
        const f = sideFlips(sides)
        expect(sides.length, `${arm.name}: no column measured the box's side — the flip oracle is vacuous`).toBeGreaterThanOrEqual(5)
        expect(f.monotone, `${arm.name}: the readout box's side is not monotone across the columns (${f.flips} flips: ${sides.join(' ')})`).toBe(true)
        expect(new Set(sides).size, `${arm.name}: the box never flipped side across the whole plot — the monotonicity oracle saw one branch only`).toBe(2)
      }
      // Seed guard (assertTickColumn's discipline): this arm exists to walk the FULL composition — ages,
      // the range's label + figure, the most-likely label + figure (composeReadoutLines). A household
      // whose columns all thinned to the calm withdrawal note would pass every oracle above while
      // proving little — so fail, and re-pick the seed. (The ink-width analogue — "the widest catalog
      // readout line" — waits on a catalog measurement no artefact holds yet.)
      expect(maxLines, `${arm.name}: no column composed the full five-line readout — this seed proves less than the arm claims; re-pick it`).toBeGreaterThanOrEqual(5)
      if (touch) {
        // the touch PIN must be dismissible (a pin with no way off covers ~35% of the phone plot for good)
        const mid = Math.floor((LATTICE_POINTS - 1) / 2)
        expect(mid, 'pick a dismissal column the sweep did not end on').not.toBe(last)
        const mx = xAt(mid)
        // the pinned reading, WHICHEVER seat it took: the in-plot box, or the row's active column.
        const readout = page.locator('figure.band-figure .band-readout, figure.band-figure .ct-readout-row [data-ct-readout-item][data-active]')
        await page.touchscreen.tap(mx, y)
        await expect(readout).toHaveCount(1)
        await page.touchscreen.tap(mx, y)
        await expect(readout, 'a second tap on the pinned column did not dismiss the readout').toHaveCount(0)
        await page.touchscreen.tap(xAt(Math.floor(mid / 2)), y)
        await expect(readout, 'a tap on a NEW column did not re-pin').toHaveCount(1)
      }
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
      assertChartText(await audit(page, ...TF), floor, `${arm.name} tf/order`)
      // both end labels (a REQUIRED non-color channel) are visible
      const labels = dialog.locator('.tf__label:not([data-ct-hidden])')
      await expect(labels).toHaveCount(2)
    })

    // TF's scrub is fine-pointer only (TwoFutures.tsx onMove: `if (e.pointerType === 'touch') return`),
    // so its readout arm runs where a hover exists. Its own test, so a readout regression reds HERE
    // and never masks the label / tick oracles above.
    if (!('hasTouch' in arm.use)) {
      test('TwoFutures’ scrub readout across the years: the measured seat, and the ink inside it', async ({ page }) => {
        await gotoSeedFinal(page, 'retired')
        await page.locator('.result-quiet-row button', { hasText: 'Change your withdrawal order' }).first().click()
        const dialog = page.locator('[role="dialog"]').last()
        await expect(dialog).toBeVisible()
        const value = await dialog.locator('.control-policies input[type="radio"]:not(:checked)').first().getAttribute('value')
        const radio = dialog.locator(`.control-policies input[type="radio"][value="${value}"]`)
        await radio.evaluate((el) => (el as HTMLInputElement).click())
        await expect(radio, 'the policy radio did not commit').toBeChecked()
        const chart = dialog.locator('svg.tf')
        await expect(chart, 'the lever preview never rendered its TwoFutures chart').toBeVisible({ timeout: 90_000 })
        await settleLayout(page)
        await chart.scrollIntoViewIfNeeded()
        const floor = await floorPx(page)
        // TF's rule snaps to integer YEARS, not the band's 49-column lattice, so a 7-point sweep across
        // the corridor is the right density — and it must cross the middle, where a too-wide box would
        // be clamped over its own rule on a small host.
        const cap = (await dialog.locator('rect.tf__scrub-capture').first().boundingBox())!
        expect(cap, 'TwoFutures drew no scrub capture rect').toBeTruthy()
        assertBothSeatsObserved(TF_SEAT, 'TwoFutures')
        // the readout's figure is `.tf-reveal`, not `.tf-host`: the flow row sits UNDER the plot,
        // outside the text layer's host (the label/tick oracles above keep the tighter `.tf-host`).
        const idleHeight = await dialog.locator('.tf-reveal').first().evaluate((el) => el.getBoundingClientRect().height)
        const rowHeights: number[] = []
        const figureHeights: number[] = []
        let seen: CtSeat | null = null
        let measured = ''
        const fractions = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
        for (const f of fractions) {
          await page.mouse.move(cap.x + cap.width * f, cap.y + cap.height * 0.5)
          await twoFrames(page)
          const r = await auditReadout(page, '.tf-reveal', 'rect.tf__scrub-capture', '.tf__scrub-rule', '.tf__axis--ytick', TF[1])
          assertReadout(r, floor, `${arm.name} tf readout @${f}`)
          if (seen === null) seen = r.seat
          expect(r.seat, `${arm.name} tf: the seat changed mid-scrub (${seen} → ${r.seat} at ${f}) — the decision is per WIDTH`).toBe(seen)
          rowHeights.push(r.rowHeight)
          figureHeights.push(r.figureHeight)
          measured =
            `host ${r.ink.hostW.toFixed(1)}px, plot ${r.ink.plotWidthPx.toFixed(1)}, half ${(r.ink.plotWidthPx / 2).toFixed(1)}, cap ${r.ink.capPx.toFixed(1)}, ` +
            `widest ink ${r.ink.widestInkPx.toFixed(1)} + chrome ${r.ink.chromePx.toFixed(1)} = ${(r.ink.widestInkPx + r.ink.chromePx).toFixed(1)}, ` +
            `box ${Math.min(r.ink.widestColumnPx + r.ink.chromePx, r.ink.capPx).toFixed(1)}, row reserves ${r.rowHeight.toFixed(1)}`
        }
        expect(seen, `${arm.name} tf: the recorded seat (${TF_SEAT[arm.name]}) is not what the browser seated — re-measure and update TF_SEAT`).toBe(TF_SEAT[arm.name])
        report(`${arm.name} tf readout: seat=${seen} — ${measured}`)
        if (seen === 'flow') assertReservedRow(idleHeight, rowHeights, figureHeights, `${arm.name} tf readout`)
      })
    }
  })
}

// ── the planted-fail controls: each oracle above must be able to go red ────────────────────────
test.describe('chart text — the oracles bite (planted-fail controls)', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  /* Eight plants on one page load — one per assertion inside assertChartText (svg-text · empty layer ·
     floor · anchor transform · containment · overlap · named-hidden), plus the LEAF floor — and every
     `toThrow` is BOUND to that oracle's own message. An unbound toThrow is green when a plant trips a
     DIFFERENT oracle, which is how a control rots into theater (insights 016 / 029). The y-ticks are
     the plant surface because they carry no `data-ct-item`, so useCollisionLayout's reset sweep
     (chartText.tsx boxesOf) can never erase a plant mid-test. */
  test('each of assertChartText’s seven oracles has a plant bound to its own message — and so does the leaf floor', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    const tick = page.locator('figure.band-figure .band-tick')
    expect(await tick.count(), 'fewer than two y-ticks — the collision plant cannot land').toBeGreaterThanOrEqual(2)
    const fyOf = (n: number) => tick.nth(n).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--fy'))
    assertChartText(await audit(page, ...BAND), floor, 'control baseline')

    // 1. CONTAINMENT — a tick shoved past the card edge (-0.6 of the host: well past the drawer's
    // 24px padding, so the bound is genuinely left, not just the svg box). Save the AUTHORED --fx:
    // React wrote it through style.setProperty (docs/architecture.md, "Positions are CSSOM writes"),
    // and CSSOM setProperty with an EMPTY value invokes removeProperty — so the restore this control
    // used to do (`setProperty('--fx', '')`) deleted React's authored --fx and parked the tick at fx=0
    // for the rest of the test. It stayed green because the floor check precedes containment for the
    // same node and the shrunk tick is visible[0], so the shrink plant threw from the FLOOR either
    // way; the bug was a mispositioned baseline, not a mis-proved oracle. Save and write back the
    // authored string.
    const authoredFx = await tick.first().evaluate((el) => (el as HTMLElement).style.getPropertyValue('--fx'))
    expect(authoredFx, 'the first tick carries no authored --fx — the restore below would be a no-op').not.toBe('')
    await tick.first().evaluate((el) => (el as HTMLElement).style.setProperty('--fx', '-0.6'))
    const clipped = await audit(page, ...BAND)
    const first = clipped.nodes.find((n) => n.cls.includes('band-tick'))!
    expect(first.left < clipped.bound.left - TOL, 'the planted clip did not leave the drawer — the containment oracle is vacuous').toBe(true)
    expect(() => assertChartText(clipped, floor, 'planted clip')).toThrow(/leaves its bound/)
    await tick.first().evaluate((el, fx) => (el as HTMLElement).style.setProperty('--fx', fx), authoredFx)
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the clip')

    // 2. THE FLOOR — a tick under --text-xs.
    await tick.first().evaluate((el) => ((el as HTMLElement).style.fontSize = '8px'))
    const shrunk = await audit(page, ...BAND)
    expect(() => assertChartText(shrunk, floor, 'planted shrink')).toThrow(/under the .*px floor/)
    await tick.first().evaluate((el) => ((el as HTMLElement).style.fontSize = ''))
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the shrink')

    // 2b. THE LEAF FLOOR — a child with its own size, which the parent's computed font-size cannot
    // see (the shape the pre-leaf oracle missed). `retired` renders "Today" first and "Plan horizon"
    // last, both NAMED and visible on this arm — so `.first()` is a non-empty name inside a VISIBLE
    // item and the plant cannot be vacuous.
    const name = page.locator('figure.band-figure .band-annotation__name').first()
    await expect(name, 'no named annotation to plant on — the leaf control would be vacuous').toHaveText(/\S/)
    await name.evaluate((el) => ((el as HTMLElement).style.fontSize = '8px'))
    const leaf = await audit(page, ...BAND)
    const item = leaf.nodes.find((n) => n.cls.includes('band-annotation') && n.minFontPx < floor)
    expect(item, 'the planted leaf shrink never reached the audit — the leaf walk is vacuous').toBeTruthy()
    expect(item!.fontPx, 'the PARENT still reads at or above the floor — exactly what the pre-leaf oracle missed').toBeGreaterThanOrEqual(floor - 0.01)
    expect(() => assertChartText(leaf, floor, 'planted leaf shrink')).toThrow(/floor \(--text-xs\)/)
    await name.evaluate((el) => ((el as HTMLElement).style.fontSize = ''))
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the leaf shrink')

    // 2c. THE ANCHOR — plant the TYPE error itself: a unitless zero where chartText.css's calc() needs
    // a length (NOT `0px` — that is the whole bug). `.band-tick` is a `.ct-text` span, so the inline
    // custom property overrides the class register and reaches the transform declaration. React never
    // authors `--ct-ty` inline, so `removeProperty` is the exact restore here (unlike --fx/--fy).
    await tick.first().evaluate((el) => (el as HTMLElement).style.setProperty('--ct-ty', '0'))
    const untyped = await audit(page, ...BAND)
    const bad = untyped.nodes.find((n) => n.cls.includes('band-tick'))!
    expect(bad.transform, 'the planted unitless zero did not invalidate the transform — the anchor oracle is vacuous').toBe('none')
    expect(() => assertChartText(untyped, floor, 'planted unitless --ct-ty')).toThrow(/computes transform:none/)
    await tick.first().evaluate((el) => (el as HTMLElement).style.removeProperty('--ct-ty'))
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the unitless --ct-ty')

    // 3. NON-OVERLAP — every .band-tick shares one --fx (ConfidenceBand TICK_FX) and differs only by
    // --fy; .ct-text reads `top: calc(var(--fy,0) * 100%)` (chartText.css), so tick 0's --fy on tick 1
    // lands one end-anchored box exactly on the other. Save + restore the authored --fy for the same
    // reason as plant 1 (`removeProperty` would delete React's value).
    const authoredFy = await fyOf(1)
    await tick.nth(1).evaluate((el, y) => (el as HTMLElement).style.setProperty('--fy', y), await fyOf(0))
    const stacked = await audit(page, ...BAND)
    expect(() => assertChartText(stacked, floor, 'planted collision')).toThrow(/overprints/)
    await tick.nth(1).evaluate((el, y) => (el as HTMLElement).style.setProperty('--fy', y), authoredFy)
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the collision')

    // 4. NOTHING NAMED IS HIDDEN — a y-tick is NAMED: it carries no data-ct-optional (only the band's
    // empty-label annotation does), no data-ct-priority, and its class matches neither pattern in the
    // whitelist.
    await tick.first().evaluate((el) => el.setAttribute('data-ct-hidden', ''))
    const hidden = await audit(page, ...BAND)
    expect(hidden.nodes.find((n) => n.cls.includes('band-tick'))!.hidden, 'the planted hide did not take').toBe(true)
    expect(() => assertChartText(hidden, floor, 'planted named-hide')).toThrow(/a NAMED label was hidden/)
    await tick.first().evaluate((el) => el.removeAttribute('data-ct-hidden'))
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the named-hide')

    // 5. THE SVG WRITES NOTHING — append one <text> to the chart's svg.
    await page.locator('figure.band-figure svg').first().evaluate((svg) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      t.setAttribute('data-plant', '')
      t.textContent = 'plant'
      svg.appendChild(t)
    })
    const withText = await audit(page, ...BAND)
    expect(withText.svgTextCount, 'the planted <text> did not land').toBe(1)
    expect(() => assertChartText(withText, floor, 'planted svg word')).toThrow(/must carry NO <text>/)
    await page.locator('figure.band-figure svg text[data-plant]').evaluate((t) => t.remove())
    assertChartText(await audit(page, ...BAND), floor, 'baseline after the svg word')

    // 6. THE LAYER IS NOT EMPTY — hide every node. LAST, and never restored: the band legitimately
    // hides its unnamed interim ANNOTATION (`ct-block__item band-annotation`, "70 / 69" on PHONE,
    // FLOOR and REAL for `retired`), so a blanket un-hide would re-create the collision the layout
    // resolved and turn the baseline red.
    await page.locator('figure.band-figure').evaluate((fig) => {
      for (const el of fig.querySelectorAll('.ct-text, .ct-block__item')) el.setAttribute('data-ct-hidden', '')
    })
    const blank = await audit(page, ...BAND)
    expect(() => assertChartText(blank, floor, 'planted blank layer')).toThrow(/no visible chart text at all/)
  })

  test('the LADDER oracles bite too — a planted CLIP and a planted SHRINK on the odds axis', async ({ page }) => {
    // the ladder only renders on a dated hero, so this control needs its own seed (the band control's
    // `retired` household plots no ladder; `datemixed` renders none either).
    await gotoSeedFinal(page, 'datesplit')
    const floor = await floorPx(page)
    assertChartText(await audit(page, ...LADDER), floor, 'ladder control baseline')
    // `.ladder-yaxis-label` is a plain ChartText (no data-ct-item), so no layout pass can undo the plant.
    const tick = page.locator('figure.ladder-figure .ladder-yaxis-label').first()
    const authoredFx = await tick.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--fx'))
    expect(authoredFx, 'the rung label carries no authored --fx — the restore below would be a no-op').not.toBe('')
    await tick.evaluate((el) => (el as HTMLElement).style.setProperty('--fx', '-0.6'))
    const clipped = await audit(page, ...LADDER)
    const first = clipped.nodes.find((n) => n.cls.includes('ladder-yaxis-label'))!
    expect(first.left < clipped.bound.left - TOL, 'the planted clip did not leave the page column — the ladder containment oracle is vacuous').toBe(true)
    expect(() => assertChartText(clipped, floor, 'ladder planted clip')).toThrow(/leaves its bound/)
    await tick.evaluate((el, fx) => (el as HTMLElement).style.setProperty('--fx', fx), authoredFx)
    assertChartText(await audit(page, ...LADDER), floor, 'ladder baseline after the clip')
    await tick.evaluate((el) => ((el as HTMLElement).style.fontSize = '8px'))
    const shrunk = await audit(page, ...LADDER)
    expect(() => assertChartText(shrunk, floor, 'ladder planted shrink')).toThrow(/under the .*px floor/)
  })
})

// ── the CROWN oracles bite: the marks, the containment, the seat and the row's reserve ───────────
/* On REAL with `datesplit` — the rung-9 crown, the one seed/arm pair in the catalog that takes the
 * ABOVE seat with real room (19.0px of it). That is the seat where a plant can actually put the
 * words back on the dots, which is the shape his eye ruled on; a control on an arm already in the
 * flow seat would prove nothing about the oracle that matters. (`atceiling` cannot serve: the
 * ceiling rung has no room on ANY shipping arm — see CROWN_SEAT_CEILING.)
 *
 * It then NARROWS THE SAME SOLVED PAGE to 320 — the only place in this suite where the seat is
 * re-decided rather than decided at mount, so the only proof `useCrownSeat`'s ResizeObserver runs —
 * and plants the flow seat's half of the reserve there, one arm and one solve for both. */
test.describe('chart text — the CROWN oracles bite (planted-fail controls)', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('the marks, the figure, the seat, the row’s reserve in both seats, and a live re-seat on resize', async ({ page }) => {
    await gotoSeedFinal(page, 'datesplit')
    const base = await auditCrown(page)
    expect(base.seat, 'this control needs the ABOVE seat — this arm no longer takes it, re-pick the arm').toBe('above')
    assertCrown(base, 'crown control baseline')
    expect(base.marks.length, 'the ladder drew no marks — the crown-vs-marks oracle is vacuous').toBeGreaterThan(2)

    // 1. THE WORDS ON THE DOTS — the ruled defect, planted: shove the callout DOWN through the
    // `--ct-dy` the anchor chain already carries (chartText.css .ct-text's transform), so the plant
    // moves the ink without touching the probe's height or the host, and the seat oracle stays green.
    // The shove is MEASURED, not a round number: it lands the callout's bottom edge exactly on the
    // crown dot's own centre, so the plant cannot overshoot the marks on a wider host and quietly
    // stop biting (a fixed 60px does exactly that at REAL — the callout clears the dots below them).
    const crownDot = base.marks.find((m) => /ladder-dot--crown/.test(m.cls))
    expect(crownDot, 'the ladder drew no crowned dot — the shove has nothing to aim at').toBeTruthy()
    const shovePx = (crownDot!.rect.top + crownDot!.rect.bottom) / 2 - base.callout.bottom
    expect(shovePx, 'the callout already sits at or below its dot — the plant would be a no-op').toBeGreaterThan(1)
    const onDots = await page.addStyleTag({ content: `.ladder-text .ladder-crown { --ct-dy: ${shovePx.toFixed(1)}px; }` })
    await twoFrames(page)
    const covering = await auditCrown(page)
    expect(
      covering.marks.some(
        (m) =>
          covering.callout.left < m.rect.right - 0.5 &&
          covering.callout.right > m.rect.left + 0.5 &&
          covering.callout.top < m.rect.bottom - 0.5 &&
          covering.callout.bottom > m.rect.top + 0.5,
      ),
      'the planted shove never reached a dot — the crown-vs-marks oracle is vacuous',
    ).toBe(true)
    expect(() => assertCrown(covering, 'planted crown-over-dots')).toThrow(/covers a mark/)
    await onDots.evaluate((el) => el.remove())
    await twoFrames(page)
    assertCrown(await auditCrown(page), 'baseline after the shove onto the dots')

    // 2. CONTAINMENT — the same lever the other way: a callout lifted clean out of the top of its
    // figure (the instrument measured the OLD callout 13.5px above the svg host at 320 × root-20).
    const offTop = await page.addStyleTag({ content: '.ladder-text .ladder-crown { --ct-dy: -400px; }' })
    await twoFrames(page)
    const lifted = await auditCrown(page)
    expect(lifted.callout.top < lifted.figure.top - TOL, 'the planted lift did not leave the figure — the containment oracle is vacuous').toBe(true)
    expect(() => assertCrown(lifted, 'planted crown above the figure')).toThrow(/leaves its figure/)
    await offTop.evaluate((el) => el.remove())
    await twoFrames(page)
    assertCrown(await auditCrown(page), 'baseline after the lift')

    // 3. THE SEAT. Plant the DECISION itself — the attribute the ladder publishes — against a
    // geometry that says otherwise; nothing else on the page moves, so only the seat oracle sees it.
    await page.locator('figure.ladder-figure').first().evaluate((f) => f.setAttribute('data-crown-seat', 'flow'))
    const lying = await auditCrown(page)
    expect(lying.seat, 'the planted seat did not take').toBe('flow')
    expect(() => assertCrown(lying, 'planted crown seat')).toThrow(/but the geometry says above/)
    await page.locator('figure.ladder-figure').first().evaluate((f) => f.setAttribute('data-crown-seat', 'above'))
    const restored = await auditCrown(page)
    assertCrown(restored, 'baseline after the planted seat')

    // 4. THE ROW'S RESERVE, ABOVE SEAT — the row is present only so its probe can be measured, so it
    // must reserve NOTHING here. Planted by giving it a height: the plot would be pushed down for no
    // words on screen, and only this clause can see it (the row holds no audited text in this seat).
    const reserved = await page.addStyleTag({ content: '.ct-block.ladder-crown-row[data-seat="above"] { height: 40px; }' })
    await twoFrames(page)
    const bulging = await auditCrown(page)
    expect(bulging.rowReservePx > TOL, 'the planted height did not reach the row — the above-seat reserve oracle is vacuous').toBe(true)
    expect(() => assertCrown(bulging, 'planted above-seat reserve')).toThrow(/in the above seat/)
    await reserved.evaluate((el) => el.remove())
    await twoFrames(page)
    assertCrown(await auditCrown(page), 'baseline after the planted reserve')

    // 5. THE RE-DECISION ON RESIZE, and the FLOW seat's reserve planted inside it. `useCrownSeat`
    // re-decides on a ResizeObserver callback, and NOTHING else in this suite exercises that path —
    // every other arm decides once at mount. Narrowing the window to 320 shrinks the ladder figure,
    // which shrinks the host, which takes the headroom under the (unchanged) callout: the SAME page,
    // already solved, must hand the words to the row. Non-vacuity is the `above` baseline above.
    // The STAMP is what makes it a re-decision rather than a remount: a React unmount would replace
    // the figure element and a fresh mount would decide correctly with no observer at all, so the
    // same DOM node has to survive the resize for this to prove the ResizeObserver path runs.
    await page.locator('figure.ladder-figure').first().evaluate((f) => f.setAttribute('data-resize-stamp', 'pre'))
    await page.setViewportSize({ width: 320, height: 800 })
    await twoFrames(page)
    await twoFrames(page)
    await expect(
      page.locator('figure.ladder-figure[data-resize-stamp="pre"]'),
      'the ladder figure was replaced by the reflow — a remount, not a re-decision; this control proves nothing about the ResizeObserver',
    ).toHaveCount(1)
    const narrowed = await auditCrown(page)
    report(
      `crown re-decision on a live 1536 → 320 resize: seat=${restored.seat} → ${narrowed.seat} — headroom ${restored.headroomPx.toFixed(1)}px → ` +
        `${narrowed.headroomPx.toFixed(1)}px against a ${narrowed.probeHeightPx.toFixed(1)}px callout; the row reserves ${narrowed.rowReservePx.toFixed(1)}px`,
    )
    expect(
      narrowed.seat,
      'the crown did not re-seat on a live resize — useCrownSeat decided once at mount and its ResizeObserver is dead',
    ).toBe('flow')
    assertCrown(narrowed, 'crown after the live resize')

    // the FLOW seat's own reserve: `--ct-row-h` is AUTHORED (oddsLadder.css), never measured, so a
    // row shorter than the two registers it renders drops the words down into the plot. Nothing else
    // sees it — the overflowing item is still inside the figure and still inside `main.result`.
    const starved = await page.addStyleTag({ content: '.ct-block.ladder-crown-row { --ct-row-h: 6px; }' })
    await twoFrames(page)
    const short = await auditCrown(page)
    expect(
      short.rowReservePx < short.probeHeightPx - TOL,
      'the planted shrink did not take the row under its ink — the flow-seat reserve oracle is vacuous',
    ).toBe(true)
    expect(() => assertCrown(short, 'planted flow-seat reserve')).toThrow(/must hold the ink it renders/)
    await starved.evaluate((el) => el.remove())
    await twoFrames(page)
    assertCrown(await auditCrown(page), 'baseline after the starved row')
  })
})

// ── the READOUT oracles bite: one control per seat, each `toThrow` bound to its own message ─────
/* The readout's oracles live outside `assertChartText` (it takes two seats and its bound is not the
 * card in either), so they carry their own plants — one per seat, because the failure SHAPES differ:
 * in the plot seat a nowrap line paints past a capped border box; in the flow seat the row is the
 * container and `max-inline-size: 100%` clamps the line's own border box over exactly that overflow,
 * which is why the oracle measures the INK (a Range over the line) and never the line's rect. */
test.describe('chart text — the readout oracles bite in the FLOW seat (planted-fail controls)', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test('the ink-inside-its-row, the seat, and the reserved row each have a plant bound to their own message', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    const y = cap.y + cap.height * 0.5
    const at = (f: number) => cap.x + cap.width * f
    const idleHeight = await page.locator('figure.band-figure').first().evaluate((f) => f.getBoundingClientRect().height)
    const read = async () => auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick', BAND[1])

    await page.touchscreen.tap(at(0.5), y)
    await twoFrames(page)
    const base = await read()
    expect(base.seat, 'this control needs the FLOW seat — the phone arm no longer takes it, re-pick the arm').toBe('flow')
    assertReadout(base, floor, 'flow control baseline')

    // 1. THE INK LEAVES ITS ROW. A TRANSFORM, deliberately: it moves the ink without changing a
    // single width the seat is decided from, so the plant cannot re-seat the readout and red on a
    // different oracle. (A narrowed row would do both.)
    const shove = await page.addStyleTag({ content: '.ct-readout-row__item[data-active] { transform: translateX(400px); }' })
    await twoFrames(page)
    const shoved = await read()
    expect(shoved.lines[0]!.right > shoved.container.right + INK_TOL, 'the planted shove did not leave the row — the ink oracle is vacuous').toBe(true)
    expect(() => assertReadout(shoved, floor, 'planted shove')).toThrow(/leaves its own row/)
    await shove.evaluate((el) => el.remove())
    await twoFrames(page)
    assertReadout(await read(), floor, 'baseline after the shove')

    // 2. THE SEAT. Plant the DECISION itself — the attribute the chart publishes — against a geometry
    // that says otherwise; nothing else on the page moves, so only the seat oracle can see it.
    await page.locator('figure.band-figure').first().evaluate((f) => f.setAttribute('data-readout-seat', 'plot'))
    const lying = await read()
    expect(lying.seat, 'the planted seat did not take').toBe('plot')
    expect(() => assertReadout(lying, floor, 'planted seat')).toThrow(/but the geometry says flow/)
    await page.locator('figure.band-figure').first().evaluate((f) => f.setAttribute('data-readout-seat', 'flow'))
    assertReadout(await read(), floor, 'baseline after the planted seat')

    // 3. THE RESERVED ROW. Grow ONLY the active column: the row is then as tall as the tallest
    // reading PLUS the plant while something is scrubbed, and the chart jumps between idle and
    // scrubbed — exactly the shift the reserve exists to prevent.
    const grow = await page.addStyleTag({ content: '.ct-readout-row__item[data-active] { padding-block-end: 40px; }' })
    const heights: number[] = []
    const figures: number[] = []
    for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      await page.touchscreen.tap(at(f), y)
      await twoFrames(page)
      const r = await read()
      heights.push(r.rowHeight)
      figures.push(r.figureHeight)
    }
    expect(figures[0]! > idleHeight + 1, 'the planted growth never reached the figure — the reserved-row oracle is vacuous').toBe(true)
    expect(() => assertReservedRow(idleHeight, heights, figures, 'planted growth')).toThrow(/changed height between idle/)
    await grow.evaluate((el) => el.remove())
    await twoFrames(page)
    // and the real row is reserved: five columns, one height, and the same figure as idle
    const okHeights: number[] = []
    const okFigures: number[] = []
    for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      await page.touchscreen.tap(at(f), y)
      await twoFrames(page)
      const r = await read()
      okHeights.push(r.rowHeight)
      okFigures.push(r.figureHeight)
    }
    assertReservedRow(idleHeight, okHeights, okFigures, 'baseline after the growth')
  })
})

test.describe('chart text — the readout oracles bite in the PLOT seat (planted-fail controls)', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('the ink-inside-its-box has a plant bound to its own message, and the side-flip checker discriminates', async ({ page }) => {
    // THE SIDE-FLIP CHECKER, first and without a browser: an equality that cannot fail proves nothing
    // (insight 029), so feed it a sequence that is NOT monotone and one that is.
    expect(sideFlips(['right', 'right', 'left', 'left']).monotone, 'a single right→left flip is the legal shape').toBe(true)
    expect(sideFlips(['right', 'left', 'right']).monotone, 'the checker does not discriminate a non-monotone sequence').toBe(false)
    expect(sideFlips(['left', 'right']).monotone, 'the checker does not discriminate a backwards flip').toBe(false)

    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    const read = async () => auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick', BAND[1])
    await page.mouse.move(cap.x + cap.width * 0.5, cap.y + cap.height * 0.5)
    await twoFrames(page)
    const base = await read()
    expect(base.seat, 'this control needs the PLOT seat — this arm no longer takes it, re-pick the arm').toBe('plot')
    assertReadout(base, floor, 'plot control baseline')

    // THE INK LEAVES ITS BOX — the 320 shape, planted on a wide arm: squeeze the box's cap and its
    // nowrap lines (the figures) paint past the border. The plant touches `.ct-readout`'s max-width
    // only, never the `--ct-readout-cap` the seat is decided from, so the seat oracle stays green and
    // this reds on the ink alone.
    const squeeze = await page.addStyleTag({ content: '.ct-readout { max-width: 12%; }' })
    await twoFrames(page)
    const squeezed = await read()
    expect(
      squeezed.lines.some((l) => l.right > squeezed.container.right + INK_TOL),
      'the planted squeeze kept every line inside the box — the ink oracle is vacuous',
    ).toBe(true)
    expect(() => assertReadout(squeezed, floor, 'planted squeeze')).toThrow(/leaves its own box/)
    await squeeze.evaluate((el) => el.remove())
    await twoFrames(page)
    assertReadout(await read(), floor, 'baseline after the squeeze')
  })
})

// ── the reader's font: chart text follows the browser default UP, never down ──────────────────
test.describe('chart text — follows the reader’s browser font size', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  test('at a 20px default the smallest chart text is LARGER than at 16px (the svg era shrank it)', async ({ page, context }) => {
    await gotoSeedFinal(page, 'retired')
    const at16 = await audit(page, ...BAND)
    const visible16 = at16.nodes.filter((n) => !n.hidden && n.text !== '')
    // non-vacuity: `Math.min()` of nothing is Infinity, and Infinity > Infinity is false — an empty
    // layer would fail this test for the wrong reason instead of naming the vacuity.
    expect(visible16.length, 'no chart text to measure — the reader-font oracle is vacuous').toBeGreaterThan(0)
    const min16 = Math.min(...visible16.map((n) => n.minFontPx))
    await raiseRootFont(page, context)
    const at20 = await audit(page, ...BAND)
    const visible20 = at20.nodes.filter((n) => !n.hidden && n.text !== '')
    expect(visible20.length, 'no chart text to measure at 20px — the reader-font oracle is vacuous').toBeGreaterThan(0)
    const min20 = Math.min(...visible20.map((n) => n.minFontPx))
    expect(min20, `chart text did not follow the reader's font: ${min16}px @16 → ${min20}px @20`).toBeGreaterThan(min16)
    // and it still holds every other contract at the larger size
    assertChartText(at20, await floorPx(page), 'PHONE band @20px root')
  })

  test('the scrub readout at a 20px root: the seat follows the reader’s font, and the ink stays inside it', async ({ page, context }) => {
    // The readout is --text-sm (rem-relative) inside a 38%-of-host cap that is NOT: at a 20px root
    // the lines grow ×1.25 while the cap does not move, so the seat must be RE-DECIDED — this is the
    // arm that proves the decision follows the reader's font and not only the viewport.
    await gotoSeedFinal(page, 'retired')
    await raiseRootFont(page, context)
    const floor = await floorPx(page)
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    const y = cap.y + cap.height * 0.5
    const mid = Math.floor((LATTICE_POINTS - 1) / 2)
    // The reader's font is where the RESERVE is least safe: raising the root re-wraps every worded
    // line, so which column is TALLEST can change, and a row reserved from the 16px wrap would move
    // under the reader here and nowhere else. Five columns + the idle frame, the same oracle the
    // root-16 sweep runs — the arm this contract most needs is the one it was missing.
    const idleHeight = await page.locator('figure.band-figure').first().evaluate((f) => f.getBoundingClientRect().height)
    const rowHeights: number[] = []
    const figureHeights: number[] = []
    let seen: CtSeat | null = null
    for (const i of [4, 14, mid, 34, LATTICE_POINTS - 5]) {
      await page.touchscreen.tap(cap.x + cap.width * (i / (LATTICE_POINTS - 1)), y)
      await twoFrames(page)
      const r = await auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick', BAND[1])
      assertReadout(r, floor, `PHONE band readout @20px root, lattice ${i}`)
      if (seen === null) seen = r.seat
      expect(r.seat, `PHONE @20px root: the seat changed mid-scrub (${seen} → ${r.seat} at column ${i}) — the decision is per WIDTH`).toBe(seen)
      rowHeights.push(r.rowHeight)
      figureHeights.push(r.figureHeight)
      if (i === mid) {
        report(
          `PHONE band readout @20px root: seat=${r.seat} — host ${r.ink.hostW.toFixed(1)}px, cap ${r.ink.capPx.toFixed(1)}, ` +
            `widest ink ${r.ink.widestInkPx.toFixed(1)} + chrome ${r.ink.chromePx.toFixed(1)}, row reserves ${r.rowHeight.toFixed(1)}`,
        )
      }
    }
    if (seen === 'flow') assertReservedRow(idleHeight, rowHeights, figureHeights, 'PHONE band readout @20px root')
  })
})

// ── the 320 arm at a 20px root — the INSTRUMENT for the held council items ─────────────────────
// Council wf_1b45326f-9e8 (2026-09-05, docs/council-log.md): "never sanction a bound no browser has
// rendered." These tests RENDER the narrowest arm at the reader's-font condition and REPORT the
// held quantities as run annotations (the crown's headroom, the label column's clearance, the
// readout's ink past its box) — the numbers the held decision waits on. They assert only what the
// gate already asserts everywhere; the held oracles land with their remedies, each with a plant.
test.describe('chart text — the 320 arm at a 20px browser default (the instrument)', () => {
  test.use({ viewport: { width: 320, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  test('the band holds every text contract at 320 × root-20, and the readout takes the seat its ink demands', async ({ page, context }) => {
    await setRootFont20(page, context)
    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    expect(floor, 'the 20px root did not take — --text-xs should read 16.25px, not 13').toBeGreaterThan(16)
    assertChartText(await audit(page, ...BAND), floor, 'NARROW band @20px root')
    // The narrowest arm at the reader's-font condition — the exhibit the council held on
    // (docs/council-log.md 2026-09-05) and the picture his eye ruled CROWDED (temp/cold-read-320,
    // 02). It is now ASSERTED, not merely reported: the ink must be inside whichever seat it took.
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    await page.touchscreen.tap(cap.x + cap.width * 0.5, cap.y + cap.height * 0.5)
    await twoFrames(page)
    const r = await auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick', BAND[1])
    assertReadout(r, floor, 'NARROW band readout @20px root')
    const inkPastCappedBox = r.ink.widestInkPx + r.ink.chromePx - r.ink.capPx
    report(
      `320 × root-20 readout: seat=${r.seat}, host ${r.ink.hostW.toFixed(1)}px, plot ${r.ink.plotWidthPx.toFixed(1)}px (half ${(r.ink.plotWidthPx / 2).toFixed(1)}), ` +
        `cap ${r.ink.capPx.toFixed(1)}px, widest unbreakable ink ${r.ink.widestInkPx.toFixed(1)}px + chrome ${r.ink.chromePx.toFixed(1)}px, ` +
        `row reserves ${r.rowHeight.toFixed(1)}px — ` +
        `${inkPastCappedBox > 0 ? `${inkPastCappedBox.toFixed(1)}px more than the capped box could hold, which is why the words left the plot` : `${(-inkPastCappedBox).toFixed(1)}px of room inside the capped box`}`,
    )
  })

  test('the ladder at 320 × root-20: the crown takes its measured seat, and the ACCEPTED label column holds its bound', async ({ page, context }) => {
    await setRootFont20(page, context)
    await gotoSeedFinal(page, 'datesplit')
    const floor = await floorPx(page)
    expect(floor, 'the 20px root did not take — --text-xs should read 16.25px, not 13').toBeGreaterThan(16)

    // THE CROWN: the exhibit the council held on is now decided by measurement. On this arm the two
    // lines do not fit the headroom, so the words leave for the reserved row above the plot — the
    // callout no longer renders 13.5px ABOVE the svg host, which is what the instrument's first
    // render found here.
    const c = await auditCrown(page)
    assertCrown(c, 'NARROW ladder @20px root, crown')
    expect(c.seat, 'the 320 × root-20 arm is the narrowest ink-vs-room case there is — it must take the flow seat').toBe('flow')

    const m = await page.locator('figure.ladder-figure').evaluate((fig) => {
      const f = fig.getBoundingClientRect()
      const label = fig.querySelector('.ladder-bar-label')!.getBoundingClientRect()
      // the rung-7 anchor is the HIGHEST "X of 10" on screen (smallest top) — the one just under the bar
      const rung7 = [...fig.querySelectorAll('.ladder-yaxis-label')].map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top)[0] ?? null
      return {
        figW: f.width,
        labelPastFigureLeft: f.left - label.left,
        labelInk: label.width,
        labelH: label.height,
        // "on track" sits at rung 8.5, the rung-7 anchor just below it: a positive number is overprint
        onTrackOverRung7: rung7 ? label.bottom - rung7.top : null,
      }
    })
    report(
      `320 × root-20 ladder: figure ${m.figW.toFixed(1)}px; crown seat=${c.seat} (headroom ${c.headroomPx.toFixed(1)}px vs a ${c.probeHeightPx.toFixed(1)}px callout); ` +
        `"on track" ${m.labelInk.toFixed(1)}px of ink × ${m.labelH.toFixed(1)}px tall, ${m.labelPastFigureLeft.toFixed(1)}px past the figure's left edge into the gutter; ` +
        `it overprints the rung-7 anchor by ${m.onTrackOverRung7 === null ? 'n/a' : m.onTrackOverRung7.toFixed(1) + 'px'}`,
    )

    // THE ACCEPTED PAIR, bounded. Everything else in `assertChartText` stays exactly as strict as it
    // is on every other arm: the "on track" label is lifted OUT of the shared node set only so its
    // one accepted overlap does not red, and it is then held to the floor, the anchor, the card, and
    // non-overlap with every OTHER node by hand — plus the two named bounds below.
    const a = await audit(page, ...LADDER)
    const barLabel = a.nodes.find((n) => /ladder-bar-label/.test(n.cls) && !n.hidden)
    expect(barLabel, 'the ladder rendered no visible "on track" bar label — the accepted bound has nothing to hold').toBeTruthy()
    assertChartText({ ...a, nodes: a.nodes.filter((n) => n !== barLabel) }, floor, 'NARROW ladder @20px root')
    expect(
      barLabel!.minFontPx,
      `"on track" renders at ${barLabel!.minFontPx}px — under the ${floor}px floor; ACCEPTED means readable, and readable is the floor`,
    ).toBeGreaterThanOrEqual(floor - 0.01)
    expect(barLabel!.transform, '"on track" computes transform:none — a type-invalid var() in the anchor chain').not.toBe('none')
    expect(
      barLabel!.left >= a.bound.left - TOL && barLabel!.right <= a.bound.right + TOL && barLabel!.top >= a.bound.top - TOL && barLabel!.bottom <= a.bound.bottom + TOL,
      `"on track" [${barLabel!.left.toFixed(1)},${barLabel!.right.toFixed(1)}] leaves its bound ${a.boundSel} — the ACCEPTED borrow is of the page GUTTER, never of the card's edge`,
    ).toBe(true)
    // the rung-7 anchor is the ONE node it may touch; against every other visible node it is as
    // strict as `assertChartText` is (a NEW collider must red here, not hide behind the acceptance).
    const rung7 = a.nodes.filter((n) => !n.hidden && /ladder-yaxis-label/.test(n.cls)).sort((x, y) => x.top - y.top)[0]
    expect(rung7, 'no visible "X of 10" rung anchor — the accepted pair is not on screen').toBeTruthy()
    for (const n of a.nodes.filter((n) => !n.hidden && n.text !== '' && n !== barLabel && n !== rung7)) {
      const overlap =
        barLabel!.left < n.right - 0.5 && barLabel!.right > n.left + 0.5 && barLabel!.top < n.bottom - 0.5 && barLabel!.bottom > n.top + 0.5
      expect(overlap, `NARROW ladder @20px root: "on track" overprints "${n.text}" — only the rung-7 anchor is accepted`).toBe(false)
    }
    const overprintPx = barLabel!.bottom - rung7!.top
    const gutterPx = a.chartBox.left - barLabel!.left
    expect(
      overprintPx,
      `"on track" overprints the rung-7 anchor by ${overprintPx.toFixed(1)}px — past the ${ACCEPTED_ONTRACK_OVERPRINT_PX}px his eye accepted on this arm (temp/cold-read-320, picture 05)`,
    ).toBeLessThanOrEqual(ACCEPTED_ONTRACK_OVERPRINT_PX)
    expect(
      gutterPx,
      `"on track" hangs ${gutterPx.toFixed(1)}px left of its figure into the page gutter — past the ${ACCEPTED_LABEL_GUTTER_PX}px his eye accepted on this arm (temp/cold-read-320, picture 05)`,
    ).toBeLessThanOrEqual(ACCEPTED_LABEL_GUTTER_PX)
  })
})

/* THE ACCEPTED 320 × root-20 LADDER STATE — his eye, 2026-09-06, on temp/cold-read-320 picture 05
 * ("05-ladder-320-root20-rung7-vs-ontrack.png", ?seed=datesplit): the "on track" bar label and the
 * "7 of 10" rung anchor touch, and the label hangs into the page gutter. His verdict was "look ok",
 * ACCEPTED AS RENDERED — so there is no hide-on-collision layout here and no geometry change
 * (moving PLOT.left off the 92 it shares with bandGeometry and TF_PLOT was REJECTED at council
 * 2026-09-05: it breaks band/TF parity).
 *
 * WHY IT IS ACCEPTABLE, so a future reader does not "fix" it: both labels stay READABLE (each is a
 * whole line at the floor, and what touches is the label's descender band against the top of the
 * anchor below it — no glyph is obscured); the pair is a y-axis SCALE beside its own bar, not a
 * datum; and the gutter it borrows is the page column's padding, on screen and unclipped — the
 * clipped-dollar attack this gate exists to catch cannot happen to a start-of-line label.
 *
 * THE NUMBERS ARE A CEILING, NOT A LICENCE. Measured on this arm 2026-09-06 (Windows/DirectWrite):
 * 4.6px of overprint and 13.3px into the gutter (the run's own instrument line, re-measured here —
 * docs/architecture.md §12 and src/viz/oddsLadderGeometry.ts's PLOT comment carry the same pair);
 * at root-16 (picture 04, ACCEPTED too) the same
 * label sits ~1px into the gutter and touches nothing. The bounds below are those measurements plus
 * a small margin, and they RED beyond it — a third label joining the pile, or a re-spaced page
 * column, is a new decision and must come back to his eye rather than ride this acceptance. */
const ACCEPTED_ONTRACK_OVERPRINT_PX = 6
const ACCEPTED_LABEL_GUTTER_PX = 16

/** The instrument's numbers must reach a human: the run annotation lands in the report, the stdout
 *  line in the terminal / CI log (the list reporter prints test stdout). Deliberate, not debug noise. */
function report(measurement: string): void {
  test.info().annotations.push({ type: 'measurement', description: measurement })
  console.log(`[instrument] ${measurement}`)
}

// ── reduced motion: the text layer is identical with motion on and off ─────────────────────────
test.describe('chart text — reduced motion changes nothing', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('the same text nodes, same words, same sizes under prefers-reduced-motion', async ({ page }) => {
    await gotoSeedFinal(page, 'datemixed')
    const motion = await audit(page, ...BAND)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: FINAL_TIER_MS })
    await settleLayout(page)
    const reduced = await audit(page, ...BAND)
    const shape = (a: Audit) => a.nodes.map((n) => `${n.text}|${n.fontPx}|${n.hidden}`)
    // non-vacuity + discrimination (insight 029: an equality on a structurally empty surface
    // discriminates nothing) — both sides carry nodes, and a one-px change on one side is SEEN.
    expect(shape(motion).length, 'nothing to compare — the reduced-motion oracle is vacuous').toBeGreaterThan(0)
    expect(shape(reduced).length, 'nothing to compare — the reduced-motion oracle is vacuous').toBeGreaterThan(0)
    expect(
      shape({ ...reduced, nodes: reduced.nodes.map((n, i) => (i === 0 ? { ...n, fontPx: n.fontPx + 1 } : n)) }),
      'shape() does not discriminate',
    ).not.toEqual(shape(motion))
    expect(shape(reduced)).toEqual(shape(motion))
  })
})
