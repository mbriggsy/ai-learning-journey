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
 * figure/560) hold the widest CATALOG dollar at the type scale on the narrowest two-pane pane?
 * The widest shipping tick measures 38.5 CSS px of ink at --text-xs — the six-glyph "$0.25M" /
 * "$0.75M" / "$1.25M" of the $1.25M lattice, which `borderline` rides (real Chromium, re-measured
 * 2026-09-12 for Caddie Card 10). Card 10 retired the SEVEN-glyph class this gate was first sized
 * against ("$0.375M" / "$1.125M", 45 px — quarters of a 1.5-rung ceiling): niceLattice picks the
 * nice STEP first, so no lattice can produce a three-decimal million. The real-browser gate
 * (e2e/chart-text.spec.ts) re-measures the widest dollar live on every viewport arm, on
 * ?seed=borderline, and bounds the borrow it takes of the drawer's padding on the 320 arm
 * (assertTickColumn). This is the arithmetic tripwire that fires at edit time: a future change to
 * the breakpoint, the gap, the measure, the drawer chrome or PLOT.left that would starve the column
 * fails HERE, loudly, before a browser is opened.
 *
 * Worst case is the breakpoint itself (V = --bp-laptop): just above it the grid activates at the
 * narrowest reveal; wider viewports only grow the band pane (1fr), up to --content-wide.
 */

const here = dirname(fileURLToPath(import.meta.url))
/** Insight 116: a first-match regex over a stylesheet cannot tell a rule from a comment, and every
 *  pin in this file is a first-match regex. Read DECLARATIONS only. Verified 2026-09-05: stripping
 *  changes no value asserted here (bp-laptop 68 / content-wide 70 / measure 36 / space-9 3 /
 *  space-6 1.5 / --gutter max 1.75, and the .band-drawer block match is byte-identical) — it only
 *  closes the door on a future comment that quotes a token or a rule. */
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')
const tokensCss = stripComments(readFileSync(join(here, '..', 'styles', 'tokens.css'), 'utf8'))
const bandCss = stripComments(readFileSync(join(here, '..', '..', 'viz', 'band.css'), 'utf8'))
const ladderCss = stripComments(readFileSync(join(here, '..', '..', 'viz', 'oddsLadder.css'), 'utf8'))

const REM_PX = 16
/** The widest catalog tick's ink at --text-xs (13px), measured in real Chromium 2026-09-12 — the
 *  e2e gate re-measures it live on ?seed=borderline; this constant only sizes the edit-time
 *  tripwire. 38.5 is the six-glyph "$0.25M" / "$0.75M" / "$1.25M"; it was 45 for the seven-glyph
 *  "$0.375M" / "$1.125M" until Card 10 made a three-decimal million unproducible. */
const WIDEST_TICK_INK_PX = 38.5
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

    // Real margin, so a near-miss edit is caught here, not in a cold-read: at the pinned values the
    // column is ~53.7px against 38.5px of ink, and the two assertions together red below a ~42.5px
    // column — a breakpoint at or under 63rem (41.7px, 3.2px slack) or PLOT.left at or under 74
    // units (42.2px). Card 10's honest 6.5px narrowing of the widest dollar shrank that reach:
    // 64rem (44.1px) and the svg era's PLOT.left 78 (44.75px) now clear BOTH lines — because the
    // column genuinely still holds the narrower dollar, not because the gate went blind. The 4px is
    // the cross-platform ink cushion (38.5 Windows vs ≈35.9 Linux, insight 118), not a knob for
    // choosing which breakpoints red.
    expect(tickColumnPx - WIDEST_TICK_INK_PX, 'two-pane tick-column slack shrank below 4px — re-check PLOT.left / the breakpoint').toBeGreaterThan(4)
  })

  it.each([
    ['band.css', () => bandCss],
    ['oddsLadder.css', () => ladderCss],
  ])('the svg-era label-drop guard stays retired: %s carries no @container rule', (name, read) => {
    // Both drops were content losses (WCAG 1.4.10) with no permitted substitute channel; HTML text
    // has nothing to drop. The sources are comment-stripped at module load, which is load-bearing
    // here: both files' retirement notes QUOTE the old rules, so the raw text matches and only the
    // declarations must not.
    expect(/@container\s*\(/.test(read()), `a @container rule is back in ${name} — the drop guard was retired 2026-09-05`).toBe(false)
  })
})
