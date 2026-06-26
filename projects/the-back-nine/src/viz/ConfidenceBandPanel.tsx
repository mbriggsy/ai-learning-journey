/*
 * src/viz/ConfidenceBandPanel.tsx — the drawer that holds the band (direction B: Lead + Drawer).
 * The R4 on-demand "show me the range" reveal made compositional: a pull-tabbed drawer containing
 * the band, a legend, and the explicit click-to-enlarge affordance.
 *
 * A thin wrapper around <ConfidenceBand>: it owns the drawer chrome + the enlarge state, and
 * hands the SAME band data to both the inline band and the enlarge modal. The enlarge trigger is
 * the GRAPH ITSELF — a focusable <button> serving mouse AND keyboard/AT in one affordance (no
 * separate text button; it was redundant with clicking the graph). `chrome.enlargeLabel` is the
 * graph-button's accessible name.
 *
 * STRING-FREE: every label arrives via the `labels` / `chrome` props (src/ui fills from copy.ts).
 */

import { useState } from 'react'
import { ConfidenceBand } from './ConfidenceBand'
import { BandEnlargeModal } from './BandEnlargeModal'
import { bandStopCss } from './scale'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from './palette'
import type { BandViewData, BandLabels } from './bandData'
import './band.css'

// The legend swatches reuse the band's ramp colors via SVG `fill` PRESENTATION attributes
// (CSP-safe, NOT a CSS-governed inline `style`; source-bound to palette.ts, never a re-typed
// hex). The median swatch is the ink line; the fills are the two ramp stops. The legend is
// decorative (aria-hidden) — the in-place callouts carry the primary non-color signal.
const OUTER_FILL = bandStopCss(BAND_FILL_OUTER_P)
const INNER_FILL = bandStopCss(BAND_FILL_INNER_P)

/** The drawer's own chrome strings (not part of the band's data — supplied by the caller). */
export interface BandPanelChrome {
  /** The pull-tab overline (e.g. "The range, opened"). */
  readonly pull: string
  /** The enlarge trigger label (e.g. "Study the range"). */
  readonly enlargeLabel: string
  /** The enlarge modal title. */
  readonly modalTitle: string
  /** The modal close-control label. */
  readonly closeLabel: string
}

export interface ConfidenceBandPanelProps {
  readonly data: BandViewData
  readonly labels: BandLabels
  readonly chrome: BandPanelChrome
}

export function ConfidenceBandPanel({ data, labels, chrome }: ConfidenceBandPanelProps) {
  const [enlarged, setEnlarged] = useState(false)
  const open = () => setEnlarged(true)

  return (
    <aside className="band-drawer" aria-label={labels.caption}>
      <span className="band-drawer__tab" aria-hidden="true" />
      <p className="band-drawer__pull">{chrome.pull}</p>

      <ConfidenceBand
        data={data}
        labels={labels}
        onEnlarge={open}
        enlargeLabel={chrome.enlargeLabel}
        variant="drawer"
      />

      <div className="band-legend" aria-hidden="true">
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

      <BandEnlargeModal
        open={enlarged}
        onClose={() => setEnlarged(false)}
        data={data}
        labels={labels}
        title={chrome.modalTitle}
        closeLabel={chrome.closeLabel}
      />
    </aside>
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
    <svg
      className={`band-legend__sw band-legend__sw--${kind}`}
      viewBox="0 0 22 11"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="22" height="11" rx="2" fill={fill} />
    </svg>
  )
}
