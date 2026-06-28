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
import { BandLegend } from './BandLegend'
import type { BandViewData, BandLabels } from './bandData'
import './band.css'

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

      <BandLegend labels={labels} />

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
