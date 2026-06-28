/*
 * src/viz/BandLegend.tsx — the band's three-tier legend (median line / middle-half / 8-in-10),
 * shared by the inline drawer (vertical STACK) and the enlarge modal (horizontal ROW). Decorative
 * (aria-hidden) — the in-place axis text + the household-clock annotations carry the primary
 * non-color signal; the legend reinforces the three ink-density tiers, each paired with a distinct
 * OUTLINE style so the tiers separate without depending on hue (back-nine-design §2). Swatch fills
 * are SVG `fill` PRESENTATION attributes (CSP-safe, source-bound to palette.ts — never a re-typed hex).
 *
 * STRING-FREE: every row label arrives via the `labels` prop (src/ui fills from copy.ts).
 */

import { bandStopCss } from './scale'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from './palette'
import type { BandLabels } from './bandData'

const OUTER_FILL = bandStopCss(BAND_FILL_OUTER_P)
const INNER_FILL = bandStopCss(BAND_FILL_INNER_P)

export interface BandLegendProps {
  readonly labels: BandLabels
  /** `stack` (the drawer — vertical, space-tight) | `row` (the enlarge modal — horizontal, the
   *  lightbox has the width to span the three tiers across one line). Default `stack`. */
  readonly layout?: 'stack' | 'row'
}

export function BandLegend({ labels, layout = 'stack' }: BandLegendProps) {
  return (
    <div className={`band-legend${layout === 'row' ? ' band-legend--row' : ''}`} aria-hidden="true">
      <span className="band-legend__row">
        <LegendSwatch kind="median" />
        {labels.legendMedian}
      </span>
      <span className="band-legend__row">
        <LegendSwatch kind="inner" />
        {labels.legendInner}
      </span>
      <span className="band-legend__row">
        <LegendSwatch kind="outer" />
        {labels.legendOuter}
      </span>
    </div>
  )
}

/** A decorative legend swatch drawn as inline SVG so the band ramp colors apply via `fill`
 *  presentation attributes (CSP-safe). The outline-style differences (band.css) reinforce the
 *  three tiers without depending on hue. */
function LegendSwatch({ kind }: { kind: 'median' | 'inner' | 'outer' }) {
  if (kind === 'median') {
    return (
      <svg className="band-legend__sw band-legend__sw--median" viewBox="0 0 22 3" aria-hidden="true">
        {/* stroke color comes from the .band-legend__line class (var(--ink)) — a CSS rule, never
            a presentation attribute (var() is invalid in a presentation attribute). */}
        <line className="band-legend__line" x1="0" y1="1.5" x2="22" y2="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  const fill = kind === 'inner' ? INNER_FILL : OUTER_FILL
  return (
    <svg className={`band-legend__sw band-legend__sw--${kind}`} viewBox="0 0 22 11" aria-hidden="true">
      <rect x="0" y="0" width="22" height="11" rx="2" fill={fill} />
    </svg>
  )
}
