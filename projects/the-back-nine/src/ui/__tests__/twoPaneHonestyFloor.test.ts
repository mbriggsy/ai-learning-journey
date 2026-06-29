import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * THE TWO-PANE HONESTY-FLOOR GATE (D2d, council 2026-06-29 — source-bind pattern, docs/insights/032).
 *
 * The laptop two-pane (≥ --bp-laptop) promotes the projection band into the right pane. If that pane
 * is too narrow, the band-figure falls under the band.css `@container (max-width: 260px)` threshold
 * and SILENTLY display:none's the percentile TEXT labels + scrub — the never-color-alone honesty
 * channel the color-blind reader depends on. The Honesty Hawk's veto-trigger is "ship below that
 * floor." This gate re-derives the WORST-CASE (narrowest) two-pane band-figure width from the
 * COMMITTED tokens.css + band.css text — never re-typed — and asserts it clears the floor with the
 * council's proven slack. A future edit to the breakpoint, the gap, the measure, the band-drawer
 * chrome, or the label-drop threshold that would strip the labels fails HERE, loudly.
 *
 * Worst case is the breakpoint itself (V = --bp-laptop): just above it the grid activates at the
 * narrowest reveal; wider viewports only grow the band pane (1fr), up to --content-wide.
 *
 * This is the arithmetic guard that fits the infra (the live render is screenshot-verified, and the
 * dist-served e2e can't reach the DEV-only ?seed= two-pane). A real-browser label-visible assertion
 * is the documented fast-follow (needs a dev-server Playwright project — TODO).
 */

const here = dirname(fileURLToPath(import.meta.url))
const tokensCss = readFileSync(join(here, '..', 'styles', 'tokens.css'), 'utf8')
const bandCss = readFileSync(join(here, '..', '..', 'viz', 'band.css'), 'utf8')

const REM_PX = 16

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

/** The band.css `@container (max-width: Npx)` label-drop threshold — the floor we must clear. */
function labelDropThresholdPx(): number {
  const m = bandCss.match(/@container\s*\(max-width:\s*([0-9.]+)px\)/)
  if (!m) throw new Error('band.css @container label-drop threshold not found — gate cannot run')
  return parseFloat(m[1]!)
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

describe('two-pane honesty floor — the band keeps its color-blind percentile labels (derived from CSS)', () => {
  it('the worst-case (breakpoint) band-figure clears the 260px label-drop floor with the council slack', () => {
    const bpLaptop = remTokenPx(tokensCss, 'bp-laptop')
    const contentWide = remTokenPx(tokensCss, 'content-wide')
    const measure = remTokenPx(tokensCss, 'measure')
    const gap = remTokenPx(tokensCss, 'space-9') // the two-pane column-gap
    const space6 = remTokenPx(tokensCss, 'space-6')
    const gutter = gutterMaxPx()
    const floor = labelDropThresholdPx()
    const chrome = bandDrawerChromePx(space6)

    // The narrowest two-pane reveal sits AT the breakpoint: content fills the viewport minus gutters,
    // capped at --content-wide (above the breakpoint the band pane only grows via 1fr).
    const available = bpLaptop - 2 * gutter
    const reveal = Math.min(available, contentWide)
    const bandPane = reveal - measure - gap // grid col 1 (--measure) + column-gap + col 2 (the band)
    const bandFigure = bandPane - chrome

    // The load-bearing assertion: the percentile labels survive the promotion at the narrowest width.
    expect(
      bandFigure,
      `worst-case band-figure ${Math.round(bandFigure)}px would drop the never-color-alone labels (floor ${floor}px). ` +
        `bp=${bpLaptop} gutters=${2 * gutter} measure=${measure} gap=${gap} chrome=${chrome} → pane=${bandPane}`,
    ).toBeGreaterThan(floor)

    // The council proved ~98px of slack at the pinned values; require a real margin so a near-miss edit
    // (e.g. dropping the breakpoint to 60–64rem, which yields ~230px) is caught here, not in a CVD audit.
    expect(bandFigure - floor, 'two-pane honesty-floor slack shrank below 50px — re-check the breakpoint').toBeGreaterThan(50)
  })
})
