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
 *  - THE SCRUB READOUT (band + TwoFutures) sits OVER the plot by design, so it is not in audit()'s
 *    node set; it carries its own oracle at every lattice column — every line at the floor, inside
 *    the plot, clear of the scrub rule and of the y-tick dollar column — and on touch the pin
 *    dismisses on a same-column re-tap and re-pins on a new column.
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
 *     is document-tall, so the ladder's vertical containment here is weak; the crown's headroom and
 *     the label column's clearance are HELD council work (docs/council-log.md 2026-09-05) — the root-20
 *     instrument below renders and REPORTS them, sanctions nothing.
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

type ReadoutAudit = {
  readonly present: boolean
  readonly plot: { readonly left: number; readonly right: number }
  readonly ruleX: number | null
  readonly tickRight: number
  readonly lines: readonly { readonly text: string; readonly fontPx: number; readonly left: number; readonly right: number }[]
}

/** The scrub readout is absolutely positioned OVER the plot, so it is deliberately NOT in audit()'s
 *  node set: it covers the fan by design, and its bound is the PLOT, not the card. Its own oracle —
 *  every LINE (not the box: __ages/__value are white-space:nowrap inside a max-width box and can paint
 *  past the border) at/above the floor, inside the plot, clear of the scrub rule and clear of the
 *  y-tick dollar column (O3's position→dollar decoder). The plot rect is read from the transparent
 *  capture rect the chart already draws at PLOT.left/PLOT.top/PLOT_W/PLOT_H — no geometry is re-typed. */
async function auditReadout(page: Page, figSel: string, capSel: string, ruleSel: string, tickSel: string): Promise<ReadoutAudit> {
  return page.evaluate(
    ([fs, cs, rs, ts]) => {
      const fig = document.querySelector(fs)
      if (!fig) throw new Error(`chart-text: no figure matches ${fs}`)
      const box = fig.querySelector<HTMLElement>('.ct-readout')
      const capEl = fig.querySelector(cs)
      if (!capEl) throw new Error(`chart-text: no capture rect matches ${cs} inside ${fs}`)
      const cap = capEl.getBoundingClientRect()
      const rule = fig.querySelector(rs)?.getBoundingClientRect() ?? null
      const ticks = [...fig.querySelectorAll(ts)].map((t) => t.getBoundingClientRect())
      return {
        present: box !== null,
        plot: { left: cap.left, right: cap.right },
        ruleX: rule ? rule.left + rule.width / 2 : null,
        tickRight: ticks.length ? Math.max(...ticks.map((t) => t.right)) : cap.left,
        lines: box
          ? [...box.querySelectorAll<HTMLElement>(':scope > span')].map((l) => {
              const r = l.getBoundingClientRect()
              return { text: (l.textContent ?? '').trim(), fontPx: parseFloat(getComputedStyle(l).fontSize), left: r.left, right: r.right }
            })
          : [],
      }
    },
    [figSel, capSel, ruleSel, tickSel] as const,
  )
}

function assertReadout(r: ReadoutAudit, floor: number, label: string): void {
  expect(r.present, `${label}: the scrub readout never rendered`).toBe(true)
  expect(r.lines.length, `${label}: the readout rendered no lines`).toBeGreaterThan(0)
  for (const l of r.lines) {
    expect(l.fontPx, `${label}: readout line "${l.text}" renders at ${l.fontPx}px — under the ${floor}px floor`).toBeGreaterThanOrEqual(floor - 0.01)
    expect(
      l.left >= r.plot.left - TOL && l.right <= r.plot.right + TOL,
      `${label}: readout line "${l.text}" [${l.left.toFixed(1)},${l.right.toFixed(1)}] leaves the plot [${r.plot.left.toFixed(1)},${r.plot.right.toFixed(1)}]`,
    ).toBe(true)
    expect(l.left > r.tickRight + TOL, `${label}: readout line "${l.text}" sits over the y-tick dollar column (tick ink to ${r.tickRight.toFixed(1)})`).toBe(true)
    if (r.ruleX !== null) {
      expect(l.left > r.ruleX + TOL || l.right < r.ruleX - TOL, `${label}: readout line "${l.text}" paints over the scrub rule at x=${r.ruleX.toFixed(1)}`).toBe(true)
    }
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

/** The 320 arms render the readout shape the council HELD (docs/council-log.md 2026-09-05): on a host
 *  this narrow the readout's nowrap lines paint 13 px past their own border box — the 38% cap bounds
 *  the BOX, not the ink — and past the plot at the flip column. The remedy is a design shape held for a
 *  measured cold read, so those arms are DECLARED expected failures: Playwright reds the run the day
 *  one passes, which is the forcing function to delete the declaration with the remedy. */
const HELD_READOUT_320 = 'HELD (council 2026-09-05): the 320 readout shape — the ink leaves its box; see docs/council-log.md'
const isNarrowArm = (arm: (typeof ARMS)[number]): boolean => arm.use.viewport.width === 320

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
      // the crown callout sits INSIDE the figure (it flips beside the dot only at the ceiling rung)
      await expect(page.locator('figure.ladder-figure .ladder-crown')).toBeVisible()
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

    test('the CEILING crown (a household that clears today): the callout renders BESIDE its dot, aligned to its anchor', async ({ page }) => {
      // `atceiling` is the only seed whose crowned mark sits at rung 10 (OddsLadder's CROWN_SIDE_RUNG)
      // — the BESIDE branch, which until 2026-09-05 no seed rendered and no CSS rule aligned (council
      // wf_1b45326f-9e8). Its odds read the clamped ceiling proportion, never "10 of 10".
      await gotoSeedFinal(page, 'atceiling')
      const floor = await floorPx(page)
      assertChartText(await audit(page, ...LADDER), floor, `${arm.name} ladder/atceiling`)
      const crown = page.locator('figure.ladder-figure .ladder-crown')
      await expect(crown, 'the seed no longer crowns the ceiling rung — re-tune `atceiling` (src/ui/devSeeds.ts)').toHaveClass(/ladder-crown--side/)
      // Copy source: XOFTEN_CEILING in src/ui/copy.ts — if that string changes, change this regex with it.
      await expect(crown, 'the ceiling crown must read the clamped proportion (src/ui/copy.ts XOFTEN_CEILING)').toContainText(/better than 9 in 10/)
      await expect(crown).toBeVisible()
      // the alignment rule is BOUND to the primitive's anchor class — measured, not assumed
      const a = await crown.evaluate((el) => ({ end: el.classList.contains('ct-text--end'), textAlign: getComputedStyle(el).textAlign, justify: getComputedStyle(el).justifyItems }))
      expect(a.textAlign, `${arm.name}: a beside-the-dot crown must align to its anchored edge (.ladder-crown--side)`).toBe(a.end ? 'right' : 'left')
      expect(a.justify, `${arm.name}: a beside-the-dot crown must justify to its anchored edge (.ladder-crown--side)`).toBe(a.end ? 'end' : 'start')
    })

    test('the scrub readout at EVERY lattice column: inside the plot, off the rule, off the y-tick dollars — and dismissible on touch', async ({ page }) => {
      test.fail(isNarrowArm(arm), HELD_READOUT_320)
      await gotoSeedFinal(page, 'retired')
      const floor = await floorPx(page)
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
      for (let i = 0; i < LATTICE_POINTS; i += step) {
        const x = xAt(i)
        if (touch) await page.touchscreen.tap(x, y)
        else await page.mouse.move(x, y)
        await twoFrames(page)
        const r = await auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick')
        maxLines = Math.max(maxLines, r.lines.length)
        assertReadout(r, floor, `${arm.name} band readout @lattice ${i}`)
        last = i
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
        const readout = page.locator('figure.band-figure .band-readout')
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
    // so its readout arm runs where a hover exists. Its own test, so the 320 fine-pointer arm's HELD
    // shape (the box is ~117 px content-sized against a ~166 px plot there — it cannot clear the rule
    // in the middle years) reds THIS declaration and never masks the label / tick oracles above.
    if (!('hasTouch' in arm.use)) {
      test('TwoFutures’ scrub readout across the years: inside the plot, off the rule, off the y-tick dollars', async ({ page }) => {
        test.fail(isNarrowArm(arm), HELD_READOUT_320)
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
        for (const f of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
          await page.mouse.move(cap.x + cap.width * f, cap.y + cap.height * 0.5)
          await twoFrames(page)
          assertReadout(await auditReadout(page, '.tf-host', 'rect.tf__scrub-capture', '.tf__scrub-rule', '.tf__axis--ytick'), floor, `${arm.name} tf readout @${f}`)
        }
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

  test('the scrub readout at a 20px root: inside the plot, off the rule, off the y-tick dollars', async ({ page, context }) => {
    // The readout is --text-sm (rem-relative) inside a 38%-of-host cap that is NOT: at a 20px root
    // the lines grow ×1.25 and the box cannot hold them even on the 390 phone. Same HELD shape as
    // the 320 arms — declared, so the day it passes the declaration must go.
    test.fail(true, HELD_READOUT_320)
    await gotoSeedFinal(page, 'retired')
    await raiseRootFont(page, context)
    const floor = await floorPx(page)
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    const y = cap.y + cap.height * 0.5
    const mid = Math.floor((LATTICE_POINTS - 1) / 2)
    for (const i of [4, mid, LATTICE_POINTS - 5]) {
      await page.touchscreen.tap(cap.x + cap.width * (i / (LATTICE_POINTS - 1)), y)
      await twoFrames(page)
      assertReadout(await auditReadout(page, 'figure.band-figure', 'rect.band-scrub-capture', '.band-scrub-rule', '.band-tick'), floor, `PHONE band readout @20px root, lattice ${i}`)
    }
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

  test('the band holds every text contract at 320 × root-20; the readout is measured', async ({ page, context }) => {
    await setRootFont20(page, context)
    await gotoSeedFinal(page, 'retired')
    const floor = await floorPx(page)
    expect(floor, 'the 20px root did not take — --text-xs should read 16.25px, not 13').toBeGreaterThan(16)
    assertChartText(await audit(page, ...BAND), floor, 'NARROW band @20px root')
    // the readout, measured: box vs its lines vs the plot at the mid column — reported, not sanctioned
    const cap = (await page.locator('figure.band-figure rect.band-scrub-capture').first().boundingBox())!
    await page.touchscreen.tap(cap.x + cap.width * 0.5, cap.y + cap.height * 0.5)
    await twoFrames(page)
    const m = await page.locator('figure.band-figure').evaluate((fig) => {
      const box = fig.querySelector<HTMLElement>('.ct-readout')
      const plot = fig.querySelector('rect.band-scrub-capture')!.getBoundingClientRect()
      if (!box) return null
      const b = box.getBoundingClientRect()
      const lines = [...box.children].map((l) => l.getBoundingClientRect())
      const inkRight = Math.max(...lines.map((r) => r.right))
      return { hostW: fig.querySelector('.ct-host')!.getBoundingClientRect().width, boxW: b.width, inkPastBox: inkRight - b.right, inkPastPlot: inkRight - plot.right }
    })
    expect(m, 'the readout never rendered at 320 × root-20').toBeTruthy()
    report(`320 × root-20 readout: host ${m!.hostW.toFixed(1)}px, box ${m!.boxW.toFixed(1)}px, ink past the box ${m!.inkPastBox.toFixed(1)}px, past the plot ${m!.inkPastPlot.toFixed(1)}px (mid column)`)
  })

  test('the ladder at 320 × root-20: the crown headroom + the label column are measured; the rung-7 anchor collides with "on track"', async ({ page, context }) => {
    // The instrument's first render found a FOURTH exhibit of the held mechanism: rung spacing is
    // 22 viewBox units (11.3 px on the 288 px figure) while two --text-xs anchors at a 20 px root are
    // ~21 px tall each, so "7 of 10" (rung 7) and "on track" (rung 8.5) overprint. Declared, with the
    // held ladder column — the measurements above it are what the remedy waits on.
    test.fail(true, 'HELD (council 2026-09-05): the ladder label column at 320 × root-20 — the rung-7 anchor overprints "on track"; see docs/council-log.md')
    await setRootFont20(page, context)
    await gotoSeedFinal(page, 'datesplit')
    const floor = await floorPx(page)
    expect(floor, 'the 20px root did not take — --text-xs should read 16.25px, not 13').toBeGreaterThan(16)
    const m = await page.locator('figure.ladder-figure').evaluate((fig) => {
      const f = fig.getBoundingClientRect()
      // the HOST is the svg's box — the crown's headroom is measured against ITS top, not the figure's
      // (the figure also holds the readout sentence above the chart)
      const host = fig.querySelector('.ct-host')!.getBoundingClientRect()
      const crown = fig.querySelector('.ladder-crown')?.getBoundingClientRect() ?? null
      const label = fig.querySelector('.ladder-bar-label')!.getBoundingClientRect()
      // the rung-7 anchor is the HIGHEST "X of 10" on screen (smallest top) — the one just under the bar
      const rung7 = [...fig.querySelectorAll('.ladder-yaxis-label')].map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top)[0] ?? null
      return {
        figW: f.width,
        crownAboveHost: crown ? host.top - crown.top : null,
        labelPastFigureLeft: f.left - label.left,
        labelInk: label.width,
        labelH: label.height,
        // "on track" sits at rung 8.5, the rung-7 anchor just below it: a positive number is overprint
        onTrackOverRung7: rung7 ? label.bottom - rung7.top : null,
      }
    })
    report(
      `320 × root-20 ladder: figure ${m.figW.toFixed(1)}px; the crown's top sits ${m.crownAboveHost === null ? 'n/a' : m.crownAboveHost.toFixed(1) + 'px above the svg host'} (negative = inside); ` +
        `"on track" ${m.labelInk.toFixed(1)}px of ink × ${m.labelH.toFixed(1)}px tall, ${m.labelPastFigureLeft.toFixed(1)}px past the figure's left edge into the gutter; ` +
        `it overprints the rung-7 anchor by ${m.onTrackOverRung7 === null ? 'n/a' : m.onTrackOverRung7.toFixed(1) + 'px'}`,
    )
    assertChartText(await audit(page, ...LADDER), floor, 'NARROW ladder @20px root')
  })
})

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
