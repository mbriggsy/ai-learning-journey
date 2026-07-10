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
 * THE FAN-PARITY CHROME (Briggsy's station-2 cold-read, 2026-07-08 — "x and y axis with the same
 * hover treatment we give the fan out"):
 *   - y-axis dollar gridlines via the SAME humane ladder + tick builder the fan uses (bandData's
 *     niceCeil / buildYTicks — quarters of the ceiling are clean figures by construction);
 *   - intermediate x-axis year ticks between the today/horizon endpoints;
 *   - a snap-to-year hover scrub (mouse/pen only — the sheets scroll under touch; the figure's
 *     aria summary already carries the whole story, so the scrub is aria-hidden pointer sugar,
 *     exactly the fan's stance): one solid rule + a dot on each arm in that arm's own MARKER
 *     SHAPE (circle/triangle — identity by shape, never hue), and a readout box quoting the
 *     household ages plus both arms' pre-formatted dollars for the snapped year. An arm that has
 *     ENDED by that year (dead-cohort truncation) simply drops its lines — the readout goes
 *     quiet exactly where the line visibly stops, never quoting a median past the cohort.
 *
 * STRING-FREE: every word arrives via `labels` / `rows` (src/ui/twoFuturesChrome.ts fills from
 * copy.ts, pre-formats every figure); the renderer types no copy — the layer boundary (viz
 * imports only @shared + siblings) is what keeps it that way, structurally.
 */
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SERIES } from './palette'
import { niceCeil, type YTick } from './bandData'
import './twoFutures.css'

export interface TwoFuturesPoint {
  readonly yearsFromNow: number
  readonly medianReal: number
}

/** One integer-lattice-year readout row for the hover scrub (composed by twoFuturesChrome — every
 *  figure pre-formatted, string-free viz). A per-arm value is ABSENT where that arm's series has
 *  ended (dead-cohort truncation): the line visibly stops, so the readout goes quiet with it. */
export interface TwoFuturesReadoutRow {
  readonly yearsFromNow: number
  /** Both spouses' ages at this year (the SAME slot + rule the fan's readout uses); '' when no
   *  household-ages closure was supplied — the line simply drops. */
  readonly ages: string
  readonly withValue?: string
  readonly withoutValue?: string
}

/** An intermediate x-axis year tick (between the today/horizon endpoint labels). */
export interface TwoFuturesXTick {
  readonly years: number
  readonly label: string
}

export interface TwoFuturesLabels {
  /** Direct end-of-line label for the WITH arm (e.g. "With the conversion"). */
  readonly withLabel: string
  /** Direct end-of-line label for the WITHOUT arm (e.g. "Today’s plan"). */
  readonly withoutLabel: string
  /** The y-ceiling gridline's preformatted dollar label (e.g. "~$1.2M"). Rendered only on the
   *  legacy no-yTicks path — a supplied yTicks lattice carries its own top label. */
  readonly dollarMaxLabel: string
  /** The x-axis endpoints. */
  readonly todayLabel: string
  readonly horizonLabel: string
  /** Leads the readout's ages line (the fan's own `bandReadoutAgesLabel` word). Optional so the
   *  legacy callers (and an ages-less readout) stay valid; the line drops when absent. */
  readonly readoutAgesLabel?: string
  /** The whole figure's accessible sentence (role="img" — the a11y-tree text alternative). */
  readonly ariaSummary: string
}

export const TF_VIEW = { w: 560, h: 280 } as const
/** Plot box. `left` holds the fan-parity y-label gutter (bandGeometry PLOT.left = 78 — the same
 *  glyph budget at the same 560-wide viewBox family); `right` reserves the end-label column. */
export const TF_PLOT = { left: 78, right: 148, top: 18, bottom: 252 } as const
const LABEL_MIN_SEPARATION = 26

/** A calm axis ceiling ≥ max — the SAME humane ladder the fan's axis rides (bandData.niceCeil:
 *  1 / 1.5 / 2 / 3 / 4 / 5 / 6 / 8 / 10 × 10^k), so quarter-ticks are clean figures by
 *  construction (fan parity, Briggsy's station-2 cold-read 2026-07-08 — was a 2-significant-digit
 *  ceiling whose quarters landed on half-thousands). Floors to 1 on a degenerate input so the
 *  axis is never $0-tall/undrawable. Pure + exported for the planted-fail test. */
export function twoFuturesCeiling(maxDollar: number): number {
  const c = niceCeil(Number.isFinite(maxDollar) ? maxDollar : 0)
  return c > 0 ? c : 1
}

/** Estimated axis-glyph advance at the 12px `.tf__axis` face (the tfReadoutWidth convention —
 *  a viewBox-space estimate, not a measurement; the gap absorbs the slack). */
const TF_AXIS_CHAR_W = 6.4
const TF_AXIS_GAP = 10
/**
 * Drop any intermediate x tick whose label would collide with an ENDPOINT label — the endpoint
 * carries the named moment, so the colliding tick yields (deriveTwoFuturesXTicks' "an endpoint
 * collision is worse than a missing tick", made geometry-aware: the ages dialect's labels are
 * wide, and a household one year past a round decade puts its first tick a few years from Today
 * — seen live colliding on `?seed=retired`, 2026-07-10). The fan resolves the same crowding by
 * row-staggering (placeAnnotationLabels); this chart has no second axis row in its viewBox, so
 * the calm resolution is omission. Pure + exported for tests.
 */
export function visibleXTicks(
  xTicks: readonly TwoFuturesXTick[],
  todayLabel: string,
  horizonLabel: string,
  maxYears: number,
): TwoFuturesXTick[] {
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const px = (years: number): number =>
    TF_PLOT.left + (maxYears <= 0 ? 0 : (years / maxYears) * (plotRight - TF_PLOT.left))
  const todayEnd = TF_PLOT.left + todayLabel.length * TF_AXIS_CHAR_W + TF_AXIS_GAP
  const horizonStart = plotRight - horizonLabel.length * TF_AXIS_CHAR_W - TF_AXIS_GAP
  return xTicks.filter((t) => {
    const half = (t.label.length * TF_AXIS_CHAR_W) / 2
    const cx = px(t.years)
    return cx - half > todayEnd && cx + half < horizonStart
  })
}

/** Snap a viewBox x to the nearest integer lattice year (the fan's nearestLatticeIndex, on the TF
 *  plot box). Pure + exported for tests — the pointer glue itself is jsdom-unreachable. */
export function tfNearestYear(viewBoxX: number, horizonYears: number): number {
  if (!Number.isFinite(viewBoxX) || horizonYears < 1) return 0
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const t = Math.min(1, Math.max(0, (viewBoxX - TF_PLOT.left) / (plotRight - TF_PLOT.left)))
  const y = Math.round(t * horizonYears)
  return y < 0 ? 0 : y > horizonYears ? horizonYears : y
}

/** Readout box width from its own composed lines (the box hugs its longest line — TF series
 *  labels are caller-worded, so a fixed width would clip one sheet's words and float another's).
 *  ~6.6px/char at the 12.5px readout type; clamped to a calm floor. Pure + exported for tests. */
const TF_READOUT_CHAR_W = 6.6
const TF_READOUT_PAD_X = 12
export function tfReadoutWidth(lines: readonly { readonly text: string }[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.text.length), 0)
  return Math.max(120, Math.round(longest * TF_READOUT_CHAR_W) + TF_READOUT_PAD_X * 2)
}

/** Place the readout box beside the scrub rule — the fan's placeReadoutBox on the TF plot box:
 *  flip LEFT exactly when a right-placed box would overflow the plot (derived from the box fit,
 *  never a magic fraction), then clamp fully inside the plot. Top-gutter pinned (never bobbing
 *  with the cursor, never over the mid-plot median lines). Pure + exported for tests. */
const TF_READOUT_GAP = 12
export function tfPlaceReadout(scrubX: number, boxW: number): { readonly tx: number; readonly ty: number } {
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const flipLeft = scrubX + TF_READOUT_GAP + boxW > plotRight
  const raw = flipLeft ? scrubX - TF_READOUT_GAP - boxW : scrubX + TF_READOUT_GAP
  const maxTx = plotRight - boxW
  const tx = raw < TF_PLOT.left ? TF_PLOT.left : raw > maxTx ? maxTx : raw
  return { tx, ty: TF_PLOT.top + 6 }
}

/** Compose the readout's lines for one lattice year (the fan's composeReadoutLines shape — a PURE
 *  seam so the quiet-where-the-line-ends honesty is unit-testable): ages first (drops when
 *  unsupplied), then per arm a label + value pair ONLY where that arm still has a median (an
 *  ended arm's pair drops with its line — never a figure past the cohort). Baseline (without)
 *  leads, mirroring the drawn stack and the delta sentence's grammar. */
export type TfReadoutLineKind = 'ages' | 'label' | 'value'
export interface TfReadoutLine {
  readonly text: string
  readonly kind: TfReadoutLineKind
}
export function composeTfReadoutLines(
  labels: TwoFuturesLabels,
  row: TwoFuturesReadoutRow,
): TfReadoutLine[] {
  const lines: TfReadoutLine[] = []
  if (row.ages && labels.readoutAgesLabel) {
    lines.push({ text: `${labels.readoutAgesLabel} ${row.ages}`, kind: 'ages' })
  }
  if (row.withoutValue !== undefined) {
    lines.push({ text: labels.withoutLabel, kind: 'label' })
    lines.push({ text: row.withoutValue, kind: 'value' })
  }
  if (row.withValue !== undefined) {
    lines.push({ text: labels.withLabel, kind: 'label' })
    lines.push({ text: row.withValue, kind: 'value' })
  }
  return lines
}

export function TwoFutures({
  withArm,
  withoutArm,
  labels,
  yTicks,
  xTicks,
  rows,
}: {
  readonly withArm: readonly TwoFuturesPoint[]
  readonly withoutArm: readonly TwoFuturesPoint[]
  readonly labels: TwoFuturesLabels
  /** The y-axis dollar lattice (bandData.buildYTicks over twoFuturesCeiling — chrome-supplied,
   *  pre-formatted). Absent ⇒ the legacy two-gridline frame (ceiling + $0 floor) renders. */
  readonly yTicks?: readonly YTick[]
  /** Intermediate x-axis year ticks (chrome-supplied). Absent ⇒ endpoints only. */
  readonly xTicks?: readonly TwoFuturesXTick[]
  /** Per-integer-year readout rows for the hover scrub (chrome-supplied). Absent ⇒ no scrub. */
  readonly rows?: readonly TwoFuturesReadoutRow[]
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
      {/* ── the axis frame ──
          With a chrome-supplied y-lattice: the fan's frame grammar — dashed interior gridlines,
          left-gutter dollar labels, the $0 ruin floor solid. Without one (legacy callers): the
          original ceiling-line + top-left label frame, unchanged. */}
      <line className="tf__grid" x1={TF_PLOT.left} y1={TF_PLOT.bottom} x2={plotRight} y2={TF_PLOT.bottom} />
      {yTicks !== undefined ? (
        <g aria-hidden="true">
          {yTicks.map((t) => {
            const y = py(t.dollars)
            const isFloor = t.dollars === 0
            return (
              <g key={t.label}>
                {!isFloor && (
                  <line className="tf__grid tf__grid--tick" x1={TF_PLOT.left} y1={y} x2={plotRight} y2={y} />
                )}
                <text className="tf__axis tf__axis--ytick" x={TF_PLOT.left - 8} y={y + 4}>
                  {t.label}
                </text>
              </g>
            )
          })}
        </g>
      ) : (
        <>
          <line className="tf__grid tf__grid--top" x1={TF_PLOT.left} y1={TF_PLOT.top} x2={plotRight} y2={TF_PLOT.top} />
          <text className="tf__axis" x={TF_PLOT.left} y={TF_PLOT.top - 6}>
            {labels.dollarMaxLabel}
          </text>
        </>
      )}
      <text className="tf__axis" x={TF_PLOT.left} y={TF_PLOT.bottom + 16}>
        {labels.todayLabel}
      </text>
      {xTicks !== undefined &&
        visibleXTicks(xTicks, labels.todayLabel, labels.horizonLabel, maxYears).map((t) => (
          <text
            key={t.years}
            className="tf__axis tf__axis--xtick"
            x={px(t.years)}
            y={TF_PLOT.bottom + 16}
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}
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

      {/* The hover scrub sits LAST so its transparent capture surface is topmost. */}
      {rows !== undefined && rows.length > 0 && (
        <TfScrubLayer
          withArm={withArm}
          withoutArm={withoutArm}
          rows={rows}
          labels={labels}
          maxYears={maxYears}
          px={px}
          py={py}
        />
      )}
    </motion.svg>
  )
}

/* ── the hover scrub (pointer-only; aria-hidden — the fan's ScrubLayer, on the TF plot) ─────────
 * Cursor screen→viewBox via the capture rect's own screen CTM (robust to preserveAspectRatio
 * letterboxing), snapped to the nearest INTEGER lattice year — the readout only ever reports a
 * sampled column (no interpolation; the snap keeps the figure byte-equal to the drawn vertex).
 * Mouse/pen ONLY: the sheets scroll under touch, and there is no enlarge affordance here to
 * carry a touch variant — the aria summary + delta sentence carry the story for everyone else.
 * State lives inside the render (a recompute remounts/re-props and resets a stale year — the
 * insight-047 stance). No motion at all → the DOM is identical under reduced motion.
 */
function TfScrubLayer({
  withArm,
  withoutArm,
  rows,
  labels,
  maxYears,
  px,
  py,
}: {
  readonly withArm: readonly TwoFuturesPoint[]
  readonly withoutArm: readonly TwoFuturesPoint[]
  readonly rows: readonly TwoFuturesReadoutRow[]
  readonly labels: TwoFuturesLabels
  readonly maxYears: number
  readonly px: (years: number) => number
  readonly py: (dollars: number) => number
}) {
  const [year, setYear] = useState<number | null>(null)

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    setYear(tfNearestYear(p.x, maxYears))
  }

  const row = year === null ? undefined : rows.find((r) => r.yearsFromNow === year)

  return (
    <g className="tf__scrub" aria-hidden="true">
      {year !== null && row !== undefined && (
        <TfScrubVisual
          year={year}
          row={row}
          labels={labels}
          withPoint={withArm.find((p) => p.yearsFromNow === year)}
          withoutPoint={withoutArm.find((p) => p.yearsFromNow === year)}
          px={px}
          py={py}
        />
      )}
      <rect
        className="tf__scrub-capture"
        x={TF_PLOT.left}
        y={TF_PLOT.top}
        width={TF_VIEW.w - TF_PLOT.right - TF_PLOT.left}
        height={TF_PLOT.bottom - TF_PLOT.top}
        fill="transparent"
        onPointerMove={onMove}
        onPointerLeave={() => setYear(null)}
      />
    </g>
  )
}

/** The live marks: one thin SOLID rule + a dot on each arm in that arm's OWN marker shape
 *  (circle = without/series one, triangle = with/series two — identity by shape, never hue),
 *  then the readout box. A truncated arm simply has no dot and no readout pair at this year. */
function TfScrubVisual({
  year,
  row,
  labels,
  withPoint,
  withoutPoint,
  px,
  py,
}: {
  readonly year: number
  readonly row: TwoFuturesReadoutRow
  readonly labels: TwoFuturesLabels
  readonly withPoint?: TwoFuturesPoint
  readonly withoutPoint?: TwoFuturesPoint
  readonly px: (years: number) => number
  readonly py: (dollars: number) => number
}) {
  const x = px(year)
  const lines = composeTfReadoutLines(labels, row)
  const boxW = tfReadoutWidth(lines)
  const { tx, ty } = tfPlaceReadout(x, boxW)
  const READOUT_PAD_Y = 10
  const READOUT_LINE = 15.5
  const h = READOUT_PAD_Y * 2 + lines.length * READOUT_LINE
  const KIND_CLASS: Record<TfReadoutLineKind, string> = {
    ages: 'tf__readout-ages',
    label: 'tf__readout-label',
    value: 'tf__readout-value',
  }
  return (
    <>
      <line className="tf__scrub-rule" x1={x} y1={TF_PLOT.top} x2={x} y2={TF_PLOT.bottom} />
      {withoutPoint !== undefined && (
        <circle className="tf__scrub-dot" cx={x} cy={py(withoutPoint.medianReal)} r={3.6} fill={SERIES.one.color} />
      )}
      {withPoint !== undefined && (
        <polygon
          className="tf__scrub-dot"
          points={`${x},${py(withPoint.medianReal) - 4.4} ${x - 4.4},${py(withPoint.medianReal) + 3.6} ${x + 4.4},${py(withPoint.medianReal) + 3.6}`}
          fill={SERIES.two.color}
        />
      )}
      {lines.length > 0 && (
        <g transform={`translate(${tx},${ty})`}>
          <rect className="tf__readout-box" x={0} y={0} width={boxW} height={h} rx={7} />
          {lines.map((l, i) => (
            <text
              key={i}
              className={`tf__readout-text ${KIND_CLASS[l.kind]}`}
              x={TF_READOUT_PAD_X}
              y={READOUT_PAD_Y + i * READOUT_LINE}
              dominantBaseline="hanging"
            >
              {l.text}
            </text>
          ))}
        </g>
      )}
    </>
  )
}
