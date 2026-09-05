import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PLOT, VIEWBOX } from '@viz/bandGeometry'

/**
 * THE TWO-PANE HONESTY-FLOOR GATE (D2d, council 2026-06-29 — source-bind pattern, docs/insights/032;
 * RE-POINTED 2026-09-05, council wf_ecbe0ab2-7bb).
 *
 * The laptop two-pane (≥ --bp-laptop) promotes the projection band into the right pane. The band's
 * y-tick dollars are the color-blind reader's position→dollar decoder (O3: no SR tick-ladder may
 * substitute), so the pane must never be so narrow that the tick column cannot hold a dollar.
 *
 * Until 2026-09-05 the ticks were svg text that SCALED with the pane, and the guard was a
 * `@container (max-width: 260px)` rule that display:none'd them below that width — so this gate
 * asserted the worst-case pane stayed above 260px. That contract is retired with the svg text
 * (chartText.css): the ticks are HTML at --text-xs, they never scale and are never dropped, and the
 * question becomes GEOMETRIC — does the y-tick column (PLOT.left − 8 units, rendered at
 * figure/560) hold the widest six-glyph dollar at the type scale on the narrowest two-pane pane?
 * The widest shipping tick measured 45 CSS px of ink at --text-xs ("$1.25M", "$2.25M" — real
 * Chromium, 2026-09-05, temp/chart-text/precondition.json); the real-browser gate
 * (e2e/chart-text.spec.ts) measures the LIVE ink at every arm. This is the arithmetic tripwire that
 * fires at edit time: a future change to the breakpoint, the gap, the measure, the drawer chrome or
 * PLOT.left that would starve the column fails HERE, loudly, before a browser is opened.
 *
 * Worst case is the breakpoint itself (V = --bp-laptop): just above it the grid activates at the
 * narrowest reveal; wider viewports only grow the band pane (1fr), up to --content-wide.
 */

const here = dirname(fileURLToPath(import.meta.url))
const tokensCss = readFileSync(join(here, '..', 'styles', 'tokens.css'), 'utf8')
const bandCss = readFileSync(join(here, '..', '..', 'viz', 'band.css'), 'utf8')

const REM_PX = 16
/** The widest catalog tick's ink at --text-xs (13px), measured in real Chromium 2026-09-05 — the
 *  e2e gate re-measures it live; this constant only sizes the edit-time tripwire. */
const WIDEST_TICK_INK_PX = 45
/** The tick is end-anchored 8 viewBox units left of the axis (ConfidenceBand TICK_FX). */
const TICK_INSET_UNITS = 8

/** A `--name: Nrem` token, in px. Throws if absent (fail-loud — the gate can't run on a renamed token). */
function remTokenPx(css: string, name: string): number {
  const m = css.match(new RegExp(`--${name}:\\s*([0-9.]+)rem`))
  if (!m) throw new Error(`token --${name} (rem) not found — honesty-floor gate cannot run`)
  return parseFloat(m[1]!) * REM_PX
}

/** The clamp MAX of --gutter (clamp(min, vw, MAX)) — the gutter at/above the breakpoint, where 4vw
 *  has long since exceeded the cap, so each page gutter is the cap. */
function gutterMaxPx(): number {
  const m = tokensCss.match(/--gutter:\s*clamp\([^,]+,[^,]+,\s*([0-9.]+)rem\s*\)/)
  if (!m) throw new Error('--gutter clamp(...) max not found — honesty-floor gate cannot run')
  return parseFloat(m[1]!) * REM_PX
}

/** The .band-drawer horizontal chrome (px) = 2× horizontal padding + 2× border. The chrome math
 *  ASSUMES the drawer's 3-value padding shorthand puts --space-6 on the horizontal axis; assert that
 *  shape so a future re-spacing of the drawer can't silently invalidate the derivation. */
function bandDrawerChromePx(space6: number): number {
  const block = bandCss.match(/\.band-drawer\s*\{[^}]*\}/)
  if (!block) throw new Error('.band-drawer rule not found — honesty-floor gate cannot run')
  const pad = block[0].match(/padding:\s*var\(--space-5\)\s+var\(--space-6\)\s+var\(--space-6\)/)
  if (!pad) throw new Error('.band-drawer padding is no longer `--space-5 --space-6 --space-6` — re-derive the chrome math')
  const border = block[0].match(/border:\s*([0-9.]+)px/)
  if (!border) throw new Error('.band-drawer border width not found — honesty-floor gate cannot run')
  return 2 * space6 + 2 * parseFloat(border[1]!)
}

describe('two-pane honesty floor — the band keeps a legible y-tick column at the narrowest pane (derived from CSS + geometry)', () => {
  it('the worst-case (breakpoint) band-figure renders a tick column wide enough for the widest catalog dollar', () => {
    const bpLaptop = remTokenPx(tokensCss, 'bp-laptop')
    const contentWide = remTokenPx(tokensCss, 'content-wide')
    const measure = remTokenPx(tokensCss, 'measure')
    const gap = remTokenPx(tokensCss, 'space-9') // the two-pane column-gap
    const space6 = remTokenPx(tokensCss, 'space-6')
    const gutter = gutterMaxPx()
    const chrome = bandDrawerChromePx(space6)

    // The narrowest two-pane reveal sits AT the breakpoint: content fills the viewport minus gutters,
    // capped at --content-wide (above the breakpoint the band pane only grows via 1fr).
    const available = bpLaptop - 2 * gutter
    const reveal = Math.min(available, contentWide)
    const bandPane = reveal - measure - gap // grid col 1 (--measure) + column-gap + col 2 (the band)
    const bandFigure = bandPane - chrome

    // The load-bearing assertion: the y-tick column, rendered at figure/viewBox, holds the widest tick.
    const tickColumnPx = ((PLOT.left - TICK_INSET_UNITS) / VIEWBOX.width) * bandFigure
    expect(
      tickColumnPx,
      `worst-case band-figure ${Math.round(bandFigure)}px renders a ${tickColumnPx.toFixed(1)}px tick column — ` +
        `narrower than the widest catalog dollar (${WIDEST_TICK_INK_PX}px of ink at --text-xs). ` +
        `bp=${bpLaptop} gutters=${2 * gutter} measure=${measure} gap=${gap} chrome=${chrome} → pane=${bandPane}`,
    ).toBeGreaterThan(WIDEST_TICK_INK_PX)

    // Real margin, so a near-miss edit (a narrower PLOT.left, a 60–64rem breakpoint) is caught here,
    // not in a cold-read: at the pinned values the column is ~53.7px against 45px of ink.
    expect(tickColumnPx - WIDEST_TICK_INK_PX, 'two-pane tick-column slack shrank below 4px — re-check PLOT.left / the breakpoint').toBeGreaterThan(4)
  })

  it('the svg-era label-drop guard stays retired: band.css carries no @container rule', () => {
    // The 260px drop was a content loss (WCAG 1.4.10) with no permitted substitute; HTML text has
    // nothing to drop. Match RULE position only — the retirement comment names the old rule as history.
    const rules = bandCss.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(/@container\s*\(/.test(rules), 'a @container rule is back in band.css — the drop guard was retired 2026-09-05').toBe(false)
  })
})
