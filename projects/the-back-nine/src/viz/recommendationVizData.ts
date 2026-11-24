/** The recommendation chart's labels (`RecommendationViz.tsx` draws it). Moved out of `RecommendationViz.tsx` by Act
 *  6's RC0, unchanged. */

export interface RecommendationVizLabels {
  /** Direct end-of-bar label for the recommended (with) arm. */
  readonly withLabel: string
  /** Direct end-of-bar label for the baseline (without) arm — "your plan today". */
  readonly withoutLabel: string
  /** The delta-magnitude HERO label (pre-formatted "$48,000"); the direction is carried by the copy
   *  above the chart + which bar is longer, never by this label's sign. */
  readonly deltaLabel: string
  /** The $0 floor label (pre-formatted "$0"). */
  readonly floorLabel: string
  /** The axis ceiling label (pre-formatted "~$820k"). */
  readonly axisMaxLabel: string
  /** The whole figure's accessible sentence (role="img" — both magnitudes AND the delta, A2 AT-parity). */
  readonly ariaSummary: string
}
