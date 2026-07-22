/*
 * src/viz/RecommendationViz.tsx — Act-4 · U16 §S3b: the recommend-second beat's two-arm comparison.
 *
 * EXTENDS the shipped TwoFutures TWO-ARM GRAMMAR (back-nine-design §2/§3), mapped to the pair of
 * TERMINAL goal magnitudes the solve payload actually carries (winner vs no-action baseline — the
 * seed-B headline statistic each). The solve arms carry a terminal distribution, NOT a per-year fan,
 * so this is a two-BAR terminal comparison, never a fabricated year-by-year median path (the full
 * two-series richness is the S4 deferral — see the build spec §S4). The comparison is honest because
 * both arms share the CRN draw, so the DELTA (the gap between the two bar tips) is common-mode-cancelled
 * — the non-color HERO channel.
 *
 * NON-COLOR IDENTITY (the reader is color-blind — color is the LEAST-trusted channel):
 *   - the two arms differ by FILL TEXTURE (baseline = solid, recommended = diagonal hatch over its
 *     fill), by END-MARKER SHAPE (circle vs triangle — the SERIES.one/two marker set), by a DIRECT
 *     end-of-bar TEXT label each, by ROW position, and by luminance (blue vs vermilion). Hue is the
 *     fifth, redundant channel.
 *   - $0-ANCHORED: every bar grows from the $0 floor at the left gutter (the ruin anchor is always
 *     drawable — a magnitude can never be truncated to exaggerate a gap).
 *   - CALM: draws ONCE (opacity fade), morphs on recompute, never replays; reduced motion drops the
 *     fade and the final DOM is byte-identical (no signal lives in the animation).
 *   - CSP-clean: every dynamic value is an SVG geometry/presentation ATTRIBUTE (never an inline style);
 *     the hatch is an SVG <pattern> def, not injected CSS.
 *   - CLS: a FIXED viewBox in a fixed-dimension container (recommendationViz.css) — the lockup never
 *     reflows when the figures land.
 *
 * STRING-FREE: every word arrives via `labels` (twoFuturesChrome's sibling — the ui layer composes
 * them from copy.ts, pre-formats every figure). The renderer types no copy — the layer boundary keeps
 * it structural.
 */
import { motion, useReducedMotion } from 'motion/react'
import { SERIES } from './palette'
import { twoFuturesCeiling } from './TwoFutures'
import './recommendationViz.css'

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

const RV_VIEW = { w: 560, h: 210 } as const
const RV_PLOT = { left: 24, right: 168, top: 40, bottom: 176 } as const
const BAR_H = 30
const ROW_GAP = 26

export function RecommendationViz({
  withoutMagnitude,
  withMagnitude,
  labels,
}: {
  readonly withoutMagnitude: number
  readonly withMagnitude: number
  readonly labels: RecommendationVizLabels
}) {
  const reduce = useReducedMotion() ?? false
  // The SAME humane ceiling the axis-max label was formatted against (twoFuturesCeiling), so the bar
  // geometry and the "~$820k" gridline label can never disagree. Floors to a drawable axis.
  const ceiling = twoFuturesCeiling(Math.max(withoutMagnitude, withMagnitude, 0))
  const plotW = RV_VIEW.w - RV_PLOT.right - RV_PLOT.left
  const barLen = (mag: number): number =>
    ceiling <= 0 ? 0 : Math.max(0, Math.min(1, mag / ceiling)) * plotW

  const withoutY = RV_PLOT.top
  const withY = RV_PLOT.top + BAR_H + ROW_GAP
  const withoutLen = barLen(withoutMagnitude)
  const withLen = barLen(withMagnitude)
  const withoutTipX = RV_PLOT.left + withoutLen
  const withTipX = RV_PLOT.left + withLen

  // The delta bracket spans between the two bar tips at the mid-row line — the visible measured gap IS
  // the delta magnitude (the hero). Ordered so it draws left→right regardless of which arm is longer.
  const bracketY = withY + BAR_H + 20
  const gapLo = Math.min(withoutTipX, withTipX)
  const gapHi = Math.max(withoutTipX, withTipX)
  const gapMid = (gapLo + gapHi) / 2

  return (
    <motion.svg
      className="rv"
      viewBox={`0 0 ${RV_VIEW.w} ${RV_VIEW.h}`}
      role="img"
      aria-label={labels.ariaSummary}
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <defs>
        {/* The recommended arm's FILL TEXTURE — a diagonal hatch (the non-color redundant channel the
            baseline's solid fill lacks). An SVG pattern def, never injected CSS (CSP-clean). */}
        <pattern id="rv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={SERIES.two.color} />
          <line className="rv__hatch-line" x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>

      {/* The $0 ruin-floor anchor (solid) + the axis frame labels. */}
      <line className="rv__floor" x1={RV_PLOT.left} y1={RV_PLOT.top - 10} x2={RV_PLOT.left} y2={RV_PLOT.bottom} />
      <text className="rv__axis" x={RV_PLOT.left} y={RV_PLOT.bottom + 16}>
        {labels.floorLabel}
      </text>
      <text className="rv__axis rv__axis--end" x={RV_PLOT.left + plotW} y={RV_PLOT.bottom + 16} textAnchor="end">
        {labels.axisMaxLabel}
      </text>

      {/* WITHOUT (baseline / today's plan): series one — blue, SOLID fill, circle end marker. */}
      <rect
        className="rv__bar"
        data-arm="without"
        data-fill="solid"
        x={RV_PLOT.left}
        y={withoutY}
        width={withoutLen}
        height={BAR_H}
        fill={SERIES.one.color}
        rx={3}
      />
      <circle className="rv__marker" data-arm="without" cx={withoutTipX} cy={withoutY + BAR_H / 2} r={5} fill={SERIES.one.color} />
      <text className="rv__bar-label" x={RV_PLOT.left + plotW + 12} y={withoutY + BAR_H / 2 + 4}>
        {labels.withoutLabel}
      </text>

      {/* WITH (recommended): series two — vermilion, HATCH fill (texture, not hue), triangle end marker. */}
      <rect
        className="rv__bar rv__bar--with"
        data-arm="with"
        data-fill="hatch"
        x={RV_PLOT.left}
        y={withY}
        width={withLen}
        height={BAR_H}
        fill="url(#rv-hatch)"
        rx={3}
      />
      <polygon
        className="rv__marker"
        data-arm="with"
        points={`${withTipX},${withY + BAR_H / 2 - 6} ${withTipX - 6},${withY + BAR_H / 2 + 5} ${withTipX + 6},${withY + BAR_H / 2 + 5}`}
        fill={SERIES.two.color}
      />
      <text className="rv__bar-label rv__bar-label--with" x={RV_PLOT.left + plotW + 12} y={withY + BAR_H / 2 + 4}>
        {labels.withLabel}
      </text>

      {/* The DELTA bracket — the measured gap between the two bar tips IS the hero magnitude. Dotted
          guides drop from each tip to the bracket line, distinct from the solid $0 floor. */}
      {gapHi - gapLo >= 1 && (
        <>
          <line className="rv__guide" x1={withoutTipX} y1={withoutY + BAR_H} x2={withoutTipX} y2={bracketY} />
          <line className="rv__guide" x1={withTipX} y1={withY + BAR_H} x2={withTipX} y2={bracketY} />
          <line className="rv__bracket" x1={gapLo} y1={bracketY} x2={gapHi} y2={bracketY} />
        </>
      )}
      <text className="rv__delta" data-role="delta-hero" x={gapHi - gapLo >= 1 ? gapMid : RV_PLOT.left} y={bracketY + 20} textAnchor={gapHi - gapLo >= 1 ? 'middle' : 'start'}>
        {labels.deltaLabel}
      </text>
    </motion.svg>
  )
}
