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
 *   - CSP-clean: every dynamic svg value is a geometry/presentation ATTRIBUTE (never an inline style);
 *     the hatch is an SVG <pattern> def, not injected CSS.
 *   - CLS: a FIXED viewBox in a fixed-dimension container (recommendationViz.css) — the lockup never
 *     reflows when the figures land.
 *   - SVG DRAWS, HTML WRITES (council wf_ecbe0ab2-7bb, 2026-09-05): the svg holds the bars, markers,
 *     floor, guides and bracket; the $0 / ceiling axis labels, both direct end-of-bar labels and the
 *     delta HERO are HTML in the chart text layer (chartText.tsx), sized on the type scale — xs for
 *     the axis frame and BOTH end-of-bar labels, lg for the hero, which keeps the display face
 *     (this chart uses no sm). An end label WRAPS inside its column on a narrow box
 *     instead of running off the chart (svg text rendered 7.7–13 CSS px and had 7 units of slack).
 *
 * STRING-FREE: every word arrives via `labels` (twoFuturesChrome's sibling — the ui layer composes
 * them from copy.ts, pre-formats every figure). The renderer types no copy — the layer boundary keeps
 * it structural.
 */
import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SERIES } from './palette'
import { twoFuturesCeiling } from './TwoFutures'
import { ChartText, ChartTextHost, ChartTextLayer, useCollisionLayout } from './chartText'
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
/** `right` is the end-label column (192 units; was 168): at a 358px phone box the 24-character
 *  "The recommended strategy" at --text-xs needs ~105 CSS px to wrap in TWO lines — the old
 *  right: 168 left a LABEL ROOM of only 156 units (100 CSS px at that box; right: 192 leaves 180
 *  units = 115 px) and wrapped it to three, whose last line touched the delta hero below
 *  (measured 2026-09-05). The bars give up ~6% of their run for it. */
const RV_PLOT = { left: 24, right: 192, top: 40, bottom: 176 } as const
const BAR_H = 30
const ROW_GAP = 26

/** Motion timings — mirror the band's --dur-reveal / --ease-out (numeric for motion). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const DRAW_S = 0.42

/** viewBox → host fractions (the text layer's coordinate system). */
const fx = (x: number): number => x / RV_VIEW.w
const fy = (y: number): number => y / RV_VIEW.h

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
  const hostRef = useRef<HTMLSpanElement>(null)
  // The two end labels WRAP inside their column on a narrow box; where their rendered boxes would
  // touch (a 358px phone), the measured pass pushes the lower one down (chartText 'separate-y').
  useCollisionLayout(hostRef, 'separate-y', [labels.withLabel, labels.withoutLabel], '.rv__bar-label[data-ct-item]')
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
  const hasBracket = gapHi - gapLo >= 1

  // The end-label column: start-anchored 12 units past the plot's right edge, allowed to WRAP within
  // the room left to the viewBox edge (RV_PLOT.right − 12 = 180 units — the same fraction of the host
  // at every width; derived, so a move of RV_PLOT.right cannot rot it).
  const labelX = RV_PLOT.left + plotW + 12
  const labelWidth = (RV_VIEW.w - labelX) / RV_VIEW.w

  return (
    // The whole chart — svg + its text layer — fades in ONCE (the text used to ride the svg's fade).
    <motion.span
      className="rv-reveal"
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE_OUT }}
    >
      <ChartTextHost className="rv-host" ref={hostRef}>
        <svg className="rv" viewBox={`0 0 ${RV_VIEW.w} ${RV_VIEW.h}`} role="img" aria-label={labels.ariaSummary}>
          <defs>
            {/* The recommended arm's FILL TEXTURE — a diagonal hatch (the non-color redundant channel the
                baseline's solid fill lacks). An SVG pattern def, never injected CSS (CSP-clean). */}
            <pattern id="rv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={SERIES.two.color} />
              <line className="rv__hatch-line" x1="0" y1="0" x2="0" y2="6" />
            </pattern>
          </defs>

          {/* The $0 ruin-floor anchor (solid). Its label + the ceiling label are in the text layer. */}
          <line className="rv__floor" x1={RV_PLOT.left} y1={RV_PLOT.top - 10} x2={RV_PLOT.left} y2={RV_PLOT.bottom} />

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

          {/* The DELTA bracket — the measured gap between the two bar tips IS the hero magnitude. Dotted
              guides drop from each tip to the bracket line, distinct from the solid $0 floor. */}
          {hasBracket && (
            <>
              <line className="rv__guide" x1={withoutTipX} y1={withoutY + BAR_H} x2={withoutTipX} y2={bracketY} />
              <line className="rv__guide" x1={withTipX} y1={withY + BAR_H} x2={withTipX} y2={bracketY} />
              <line className="rv__bracket" x1={gapLo} y1={bracketY} x2={gapHi} y2={bracketY} />
            </>
          )}
        </svg>
        <ChartTextLayer className="rv-text">
          {/* the axis frame labels bracket the plot's TOP edge — the $0 anchor at the floor line's head,
              the humane ceiling at the plot's right edge — in the 40-unit headroom above the first bar.
              (Below the bars the bottom margin belongs to the delta hero; on a 358px phone box the two
              could not share it — measured 2026-09-05.) */}
          <ChartText className="rv__axis rv__axis--floor" fx={fx(RV_PLOT.left + 6)} fy={fy(RV_PLOT.top - 20)} anchor="start" valign="middle">
            {labels.floorLabel}
          </ChartText>
          <ChartText className="rv__axis rv__axis--end" fx={fx(RV_PLOT.left + plotW)} fy={fy(RV_PLOT.top - 20)} anchor="end" valign="middle">
            {labels.axisMaxLabel}
          </ChartText>
          {/* the direct end-of-bar labels (a REQUIRED non-color channel — never dropped; they wrap). On
              the xs register, strong: the two bars sit 56 units apart, and at a 358px box a 24-character
              label already wraps to two lines at xs — the sm register wrapped it to three and overprinted
              its neighbour (measured 2026-09-05). */}
          <ChartText className="rv__bar-label" fx={fx(labelX)} fy={fy(withoutY + BAR_H / 2)} anchor="start" valign="middle" strong wrapWidth={labelWidth} collide>
            {labels.withoutLabel}
          </ChartText>
          <ChartText className="rv__bar-label rv__bar-label--with" fx={fx(labelX)} fy={fy(withY + BAR_H / 2)} anchor="start" valign="middle" strong wrapWidth={labelWidth} collide>
            {labels.withLabel}
          </ChartText>
          {/* The delta magnitude — the HERO channel: the largest figure on the chart, in the display face,
              tabular so it never jitters as it morphs; centred under the bracket, or start-anchored at the
              floor when the two tips coincide (no bracket to centre on). */}
          <ChartText
            className="rv__delta"
            fx={fx(hasBracket ? gapMid : RV_PLOT.left)}
            fy={fy(bracketY + 10)}
            anchor={hasBracket ? 'middle' : 'start'}
            valign="top"
            register="lg"
            display
            strong
          >
            <span data-role="delta-hero">{labels.deltaLabel}</span>
          </ChartText>
        </ChartTextLayer>
      </ChartTextHost>
    </motion.span>
  )
}
