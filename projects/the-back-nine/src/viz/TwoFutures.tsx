/*
 * src/viz/TwoFutures.tsx — the U10 two-futures comparison (R9/R10: the manual controls' evidence).
 * A hand-rolled SVG drawing the two arms' MEDIAN paths — the with-arm and the without-arm of ONE
 * control change — on a shared clock, so the gap between the lines IS the control's effect
 * (both arms ride identical draws; CRN makes the gap signal, never luck).
 *
 * THE HONESTY CONTRACTS (back-nine-design §3):
 *   - MEDIANS ONLY, deliberately: two overlapping percentile fans are mud, and the odds language
 *     (the delta sentence above this chart) already carries the distribution honestly. The chart
 *     answers "how does the middle-of-the-road path RUN?" — the caption says exactly that.
 *   - LINEAR y anchored at $0 (never truncated, never log — the ruin floor must be drawable).
 *   - NON-COLOR IDENTITY (the reader is color-blind): the two series differ by line-STYLE
 *     (solid/dashed), marker SHAPE (circle/triangle), a direct END LABEL each, and luminance —
 *     color (blue/vermilion, the measured widest-separation Okabe–Ito pair) is the least-trusted
 *     channel. End labels sit value-ordered with a minimum separation so converging arms never
 *     collide; a thin DOTTED leader (distinct from both series strokes) ties a displaced label
 *     to its line so it can never read as a third series.
 *   - CALM: draws ONCE (opacity fade), morphs on recompute, never a replay; reduced motion drops
 *     the fade — the final DOM is byte-identical (no signal lives in the animation).
 *   - CSP-clean: every dynamic value is an SVG geometry/presentation ATTRIBUTE, never an inline
 *     style; `vector-effect: non-scaling-stroke` holds the dash geometry (the non-color channel)
 *     at every viewport width.
 *
 * STRING-FREE: every word arrives via `labels` (src/ui/twoFuturesChrome.ts fills from copy.ts);
 * the renderer types no copy — the layer boundary (viz imports only @shared + siblings) is what
 * keeps it that way, structurally.
 */
import { motion, useReducedMotion } from 'motion/react'
import { SERIES } from './palette'
import './twoFutures.css'

export interface TwoFuturesPoint {
  readonly yearsFromNow: number
  readonly medianReal: number
}

export interface TwoFuturesLabels {
  /** Direct end-of-line label for the WITH arm (e.g. "With the conversion"). */
  readonly withLabel: string
  /** Direct end-of-line label for the WITHOUT arm (e.g. "Today’s plan"). */
  readonly withoutLabel: string
  /** The y-ceiling gridline's preformatted dollar label (e.g. "~$1.2M"). */
  readonly dollarMaxLabel: string
  /** The x-axis endpoints. */
  readonly todayLabel: string
  readonly horizonLabel: string
  /** The whole figure's accessible sentence (role="img" — the a11y-tree text alternative). */
  readonly ariaSummary: string
}

export const TF_VIEW = { w: 560, h: 280 } as const
export const TF_PLOT = { left: 16, right: 148, top: 18, bottom: 252 } as const
const LABEL_MIN_SEPARATION = 26

/** A calm 2-significant-digit ceiling ≥ max (the axis never truncates a line). Pure + exported
 *  for the planted-fail test. */
export function twoFuturesCeiling(maxDollar: number): number {
  if (!Number.isFinite(maxDollar) || maxDollar <= 0) return 1
  const mag = 10 ** (Math.floor(Math.log10(maxDollar)) - 1)
  return Math.ceil(maxDollar / mag) * mag
}

export function TwoFutures({
  withArm,
  withoutArm,
  labels,
}: {
  readonly withArm: readonly TwoFuturesPoint[]
  readonly withoutArm: readonly TwoFuturesPoint[]
  readonly labels: TwoFuturesLabels
}) {
  const reduce = useReducedMotion() ?? false
  const all = [...withArm, ...withoutArm]
  if (withArm.length < 2 || withoutArm.length < 2) return null
  const maxYears = Math.max(...all.map((p) => p.yearsFromNow))
  const dollarMax = twoFuturesCeiling(Math.max(...all.map((p) => p.medianReal)))
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const px = (years: number): number =>
    TF_PLOT.left + (maxYears <= 0 ? 0 : (years / maxYears) * (plotRight - TF_PLOT.left))
  const py = (dollars: number): number =>
    TF_PLOT.bottom - (dollars / dollarMax) * (TF_PLOT.bottom - TF_PLOT.top)

  const path = (pts: readonly TwoFuturesPoint[]): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.yearsFromNow).toFixed(1)},${py(p.medianReal).toFixed(1)}`).join('')

  // End labels, value-ordered with a minimum separation (converging arms must never collide;
  // the leader line below ties a displaced label back to its line).
  const endWith = withArm[withArm.length - 1]!
  const endWithout = withoutArm[withoutArm.length - 1]!
  const rawWithY = py(endWith.medianReal)
  const rawWithoutY = py(endWithout.medianReal)
  let labelWithY = rawWithY
  let labelWithoutY = rawWithoutY
  if (Math.abs(labelWithY - labelWithoutY) < LABEL_MIN_SEPARATION) {
    const mid = (labelWithY + labelWithoutY) / 2
    if (labelWithY <= labelWithoutY) {
      labelWithY = mid - LABEL_MIN_SEPARATION / 2
      labelWithoutY = mid + LABEL_MIN_SEPARATION / 2
    } else {
      labelWithY = mid + LABEL_MIN_SEPARATION / 2
      labelWithoutY = mid - LABEL_MIN_SEPARATION / 2
    }
  }
  const labelX = plotRight + 14

  return (
    <motion.svg
      className="tf"
      viewBox={`0 0 ${TF_VIEW.w} ${TF_VIEW.h}`}
      role="img"
      aria-label={labels.ariaSummary}
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* The $0 floor + the ceiling gridline (linear, anchored at 0 — the honesty axis). */}
      <line className="tf__grid" x1={TF_PLOT.left} y1={TF_PLOT.bottom} x2={plotRight} y2={TF_PLOT.bottom} />
      <line className="tf__grid tf__grid--top" x1={TF_PLOT.left} y1={TF_PLOT.top} x2={plotRight} y2={TF_PLOT.top} />
      <text className="tf__axis" x={TF_PLOT.left} y={TF_PLOT.top - 6}>
        {labels.dollarMaxLabel}
      </text>
      <text className="tf__axis" x={TF_PLOT.left} y={TF_PLOT.bottom + 16}>
        {labels.todayLabel}
      </text>
      <text className="tf__axis tf__axis--end" x={plotRight} y={TF_PLOT.bottom + 16}>
        {labels.horizonLabel}
      </text>

      {/* WITHOUT (the baseline): series one — blue, solid, circle. */}
      <path
        className="tf__line"
        d={path(withoutArm)}
        stroke={SERIES.one.color}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="tf__marker"
        cx={px(endWithout.yearsFromNow)}
        cy={rawWithoutY}
        r={4}
        fill={SERIES.one.color}
      />
      {/* WITH (the change): series two — vermilion, dashed, triangle. */}
      <path
        className="tf__line tf__line--dashed"
        d={path(withArm)}
        stroke={SERIES.two.color}
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        className="tf__marker"
        points={`${px(endWith.yearsFromNow)},${rawWithY - 5} ${px(endWith.yearsFromNow) - 5},${rawWithY + 4} ${px(endWith.yearsFromNow) + 5},${rawWithY + 4}`}
        fill={SERIES.two.color}
      />

      {/* Leaders (thin DOTTED — distinct from both series strokes) + direct end labels. */}
      <line
        className="tf__leader"
        x1={px(endWithout.yearsFromNow) + 6}
        y1={rawWithoutY}
        x2={labelX - 4}
        y2={labelWithoutY}
      />
      <line
        className="tf__leader"
        x1={px(endWith.yearsFromNow) + 6}
        y1={rawWithY}
        x2={labelX - 4}
        y2={labelWithY}
      />
      <text className="tf__label" x={labelX} y={labelWithoutY + 4}>
        {labels.withoutLabel}
      </text>
      <text className="tf__label tf__label--with" x={labelX} y={labelWithY + 4}>
        {labels.withLabel}
      </text>
    </motion.svg>
  )
}
