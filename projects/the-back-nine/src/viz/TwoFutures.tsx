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
 *   - CSP-clean: every dynamic svg value is a geometry/presentation ATTRIBUTE, never an inline
 *     style; `vector-effect: non-scaling-stroke` holds the dash geometry (the non-color channel)
 *     at every viewport width.
 *   - SVG DRAWS, HTML WRITES (council wf_ecbe0ab2-7bb, 2026-09-05): the svg holds the lines,
 *     markers, gridlines, leaders and the scrub rule; every word and numeral — y-tick dollars, the
 *     today/horizon endpoints, the intermediate year ticks, both end labels and the scrub readout —
 *     is HTML in the chart text layer (chartText.tsx), sized on the type scale. On a narrow box the
 *     end labels WRAP inside their column instead of running off the chart, and their vertical
 *     separation is MEASURED from the rendered boxes, as is the intermediate ticks' collision with
 *     the endpoints (the svg era estimated both from per-glyph constants).
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
import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { SERIES } from './palette'
import { niceCeil, type YTick } from './bandData'
import { ChartText, ChartTextHost, ChartTextLayer, useCollisionLayout, useReadoutPlacement, type CtStyle } from './chartText'
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
/** Plot box. `left` holds the fan-parity y-label gutter (bandGeometry PLOT.left = 92 — the same
 *  fraction of the same 560-wide viewBox family, so the HTML tick column renders at the same width
 *  the band's does); `right` reserves the end-label column (134 units, in which an end label WRAPS). */
export const TF_PLOT = { left: 92, right: 148, top: 18, bottom: 252 } as const
/** The end labels' minimum vertical separation in viewBox units — the FIRST pass (pure geometry, so
 *  the svg leaders can be drawn to the separated y); the text layer then measures the rendered
 *  label boxes and pushes a lower one further down if two wrapped labels would still touch. */
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

/** Snap a viewBox x to the nearest integer lattice year (the fan's nearestLatticeIndex, on the TF
 *  plot). Clamped to [0, horizonYears]; a non-finite x or degenerate horizon yields today (0). */
export function tfNearestYear(viewBoxX: number, horizonYears: number): number {
  if (!Number.isFinite(viewBoxX) || horizonYears < 1) return 0
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const t = Math.min(1, Math.max(0, (viewBoxX - TF_PLOT.left) / (plotRight - TF_PLOT.left)))
  const y = Math.round(t * horizonYears)
  return y < 0 ? 0 : y > horizonYears ? horizonYears : y
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

/** Motion timings — mirror the band's --dur-reveal / --ease-out (numeric for motion). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const DRAW_S = 0.42

/** viewBox → host fractions (the text layer's coordinate system). */
const fx = (x: number): number => x / TF_VIEW.w
const fy = (y: number): number => y / TF_VIEW.h
/** The y-tick column: end-anchored 8 units left of the axis (the band's TICK_FX rule). */
const TICK_FX = fx(TF_PLOT.left - 8)
/** The x-axis labels' line, centred in the bottom gutter under the floor. */
const XAXIS_FY = fy(TF_PLOT.bottom + 15)
const READOUT_TOP_FY = fy(TF_PLOT.top + 6)

const KIND_CLASS: Record<TfReadoutLineKind, string> = {
  ages: 'ct-readout__ages',
  label: 'ct-readout__label',
  value: 'ct-readout__value',
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
  const hostRef = useRef<HTMLSpanElement>(null)
  const [year, setYear] = useState<number | null>(null)
  const all = [...withArm, ...withoutArm]
  const drawable = withArm.length >= 2 && withoutArm.length >= 2
  const maxYears = drawable ? Math.max(...all.map((p) => p.yearsFromNow)) : 1
  const dollarMax = drawable ? twoFuturesCeiling(Math.max(...all.map((p) => p.medianReal))) : 1
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const px = (years: number): number =>
    TF_PLOT.left + (maxYears <= 0 ? 0 : (years / maxYears) * (plotRight - TF_PLOT.left))
  const py = (dollars: number): number =>
    TF_PLOT.bottom - (dollars / dollarMax) * (TF_PLOT.bottom - TF_PLOT.top)

  // The MEASURED collision passes over the text layer (one host, two families): intermediate x
  // ticks HIDE where they would overprint an endpoint or each other (the endpoints have priority);
  // the two end labels are pushed apart vertically where their rendered (possibly wrapped) boxes
  // would touch. Both hooks are declared unconditionally (hooks law); an undrawable chart has no
  // host to lay out.
  useCollisionLayout(hostRef, 'hide', [maxYears, xTicks?.map((t) => `${t.years}:${t.label}`).join('|') ?? '', labels.todayLabel, labels.horizonLabel], '.tf__axis--x[data-ct-item]')
  useCollisionLayout(hostRef, 'separate-y', [withArm, withoutArm, labels.withLabel, labels.withoutLabel], '.tf__label[data-ct-item]')

  if (!drawable) return null

  const path = (pts: readonly TwoFuturesPoint[]): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.yearsFromNow).toFixed(1)},${py(p.medianReal).toFixed(1)}`).join('')

  // End labels, value-ordered with a minimum separation (converging arms must never collide;
  // the leader line below ties a displaced label back to its line). The text layer measures the
  // rendered boxes and separates further if two WRAPPED labels still touch.
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
  const labelWidth = (TF_VIEW.w - labelX) / TF_VIEW.w

  const row = year === null || rows === undefined ? undefined : rows.find((r) => r.yearsFromNow === year)

  return (
    // The whole chart — svg + its text layer — fades in ONCE (the text used to ride the svg's fade).
    <motion.span
      className="tf-reveal"
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE_OUT }}
    >
      <ChartTextHost className="tf-host" ref={hostRef}>
        <svg className="tf" viewBox={`0 0 ${TF_VIEW.w} ${TF_VIEW.h}`} role="img" aria-label={labels.ariaSummary}>
          {/* ── the axis frame ──
              With a chrome-supplied y-lattice: the fan's frame grammar — dashed interior gridlines and
              the $0 ruin floor solid (the dollar labels are in the text layer). Without one (legacy
              callers): the original ceiling-line frame, its label in the text layer too. */}
          <line className="tf__grid" x1={TF_PLOT.left} y1={TF_PLOT.bottom} x2={plotRight} y2={TF_PLOT.bottom} />
          {yTicks !== undefined ? (
            <g aria-hidden="true">
              {yTicks.map((t) =>
                t.dollars === 0 ? null : (
                  <line key={t.label} className="tf__grid tf__grid--tick" x1={TF_PLOT.left} y1={py(t.dollars)} x2={plotRight} y2={py(t.dollars)} />
                ),
              )}
            </g>
          ) : (
            <line className="tf__grid tf__grid--top" x1={TF_PLOT.left} y1={TF_PLOT.top} x2={plotRight} y2={TF_PLOT.top} />
          )}

          {/* WITHOUT (the baseline): series one — blue, solid, circle. */}
          <path className="tf__line" d={path(withoutArm)} stroke={SERIES.one.color} vectorEffect="non-scaling-stroke" />
          <circle className="tf__marker" cx={px(endWithout.yearsFromNow)} cy={rawWithoutY} r={4} fill={SERIES.one.color} />
          {/* WITH (the change): series two — vermilion, dashed, triangle. */}
          <path className="tf__line tf__line--dashed" d={path(withArm)} stroke={SERIES.two.color} vectorEffect="non-scaling-stroke" />
          <polygon
            className="tf__marker"
            points={`${px(endWith.yearsFromNow)},${rawWithY - 5} ${px(endWith.yearsFromNow) - 5},${rawWithY + 4} ${px(endWith.yearsFromNow) + 5},${rawWithY + 4}`}
            fill={SERIES.two.color}
          />

          {/* The leaders to the end labels are HTML elbows in the text layer (below) — they must follow the
              label's MEASURED push, which an svg attribute may never read. */}

          {/* The hover scrub sits LAST so its transparent capture surface is topmost. */}
          {rows !== undefined && rows.length > 0 && (
            <TfScrubLayer
              year={year}
              setYear={setYear}
              withPoint={year === null ? undefined : withArm.find((p) => p.yearsFromNow === year)}
              withoutPoint={year === null ? undefined : withoutArm.find((p) => p.yearsFromNow === year)}
              maxYears={maxYears}
              px={px}
              py={py}
            />
          )}
        </svg>
        <ChartTextLayer className="tf-text">
          {/* the y-axis dollar labels (or the legacy ceiling label) */}
          {yTicks !== undefined ? (
            yTicks.map((t) => (
              <ChartText key={t.label} className="tf__axis tf__axis--ytick" fx={TICK_FX} fy={fy(py(t.dollars))} anchor="end" valign="middle">
                {t.label}
              </ChartText>
            ))
          ) : (
            <ChartText className="tf__axis tf__axis--ceiling" fx={fx(TF_PLOT.left)} fy={fy(TF_PLOT.top - 4)} anchor="start" valign="bottom">
              {labels.dollarMaxLabel}
            </ChartText>
          )}
          {/* the x-axis: endpoints (priority — never hidden) + the intermediate year ticks (hidden where
              they would overprint) */}
          <ChartText className="tf__axis tf__axis--x tf__axis--today" fx={fx(TF_PLOT.left)} fy={XAXIS_FY} anchor="start" valign="middle" collide priority>
            {labels.todayLabel}
          </ChartText>
          {xTicks?.map((t) => (
            <ChartText key={t.years} className="tf__axis tf__axis--x tf__axis--xtick" fx={fx(px(t.years))} fy={XAXIS_FY} anchor="middle" valign="middle" collide>
              {t.label}
            </ChartText>
          ))}
          <ChartText className="tf__axis tf__axis--x tf__axis--end" fx={fx(plotRight)} fy={XAXIS_FY} anchor="end" valign="middle" collide priority>
            {labels.horizonLabel}
          </ChartText>
          {/* the elbow leaders (thin DOTTED — distinct from both series strokes): from each end marker, a
              run along its y to the label column's edge, then a drop to the label — the label's TAIL, so
              the measured 'separate-y' push moves the drop's end with the label (chartText.css .ct-leader). */}
          <TfLeader itemKey="without" markerX={px(endWithout.yearsFromNow) + 6} markerY={rawWithoutY} labelY={labelWithoutY} columnX={labelX - 4} />
          <TfLeader itemKey="with" markerX={px(endWith.yearsFromNow) + 6} markerY={rawWithY} labelY={labelWithY} columnX={labelX - 4} />
          {/* the direct end labels — a REQUIRED non-color channel: never dropped, they wrap in their column */}
          <ChartText className="tf__label" fx={fx(labelX)} fy={fy(labelWithoutY)} anchor="start" valign="middle" register="sm" strong wrapWidth={labelWidth} collide itemKey="without">
            {labels.withoutLabel}
          </ChartText>
          <ChartText className="tf__label tf__label--with" fx={fx(labelX)} fy={fy(labelWithY)} anchor="start" valign="middle" register="sm" strong wrapWidth={labelWidth} collide itemKey="with">
            {labels.withLabel}
          </ChartText>
          {row !== undefined && year !== null && <TfReadout labels={labels} row={row} ruleX={px(year)} hostRef={hostRef} />}
        </ChartTextLayer>
      </ChartTextHost>
    </motion.span>
  )
}

/** One elbow leader (HTML, in the text layer): positioned by fractions — the marker's x/y, the run to
 *  the label column, and the vertical span to the label's FIRST-PASS y. The measured pass writes the
 *  label's push onto this element too (it is the label's `data-ct-tail`), and the CSS grows or moves
 *  the drop by it, so the leader's end and the label's box are always written by the same numbers. */
function TfLeader({ itemKey, markerX, markerY, labelY, columnX }: { readonly itemKey: string; readonly markerX: number; readonly markerY: number; readonly labelY: number; readonly columnX: number }) {
  const down = labelY >= markerY
  const style: CtStyle = {
    '--fx': fx(markerX),
    '--fw': fx(Math.max(0, columnX - markerX)),
    '--fy': fy(down ? markerY : labelY),
    '--fh': fy(Math.abs(labelY - markerY)),
  }
  return <span className={`ct-leader tf__leader ${down ? 'ct-leader--down' : 'ct-leader--up'}`} data-ct-tail={itemKey} style={style} aria-hidden="true" />
}

/* ── the hover scrub (pointer-only; aria-hidden — the fan's ScrubLayer, on the TF plot) ─────────
 * Cursor screen→viewBox via the capture rect's own screen CTM (robust to preserveAspectRatio
 * letterboxing), snapped to the nearest INTEGER lattice year — the readout only ever reports a
 * sampled column (no interpolation; the snap keeps the figure byte-equal to the drawn vertex).
 * Mouse/pen ONLY, deliberately unlike the band and the ladder (both pin a touch readout): the
 * lever sheets scroll under touch, and there is no enlarge affordance here to carry a touch
 * variant — the aria summary + delta sentence carry the story for everyone else. State lives in
 * the chart (a recompute remounts/re-props and resets a stale year — the insight-047 stance). No
 * motion at all → the DOM is identical under reduced motion.
 */
function TfScrubLayer({
  year,
  setYear,
  withPoint,
  withoutPoint,
  maxYears,
  px,
  py,
}: {
  readonly year: number | null
  readonly setYear: (y: number | null) => void
  readonly withPoint?: TwoFuturesPoint
  readonly withoutPoint?: TwoFuturesPoint
  readonly maxYears: number
  readonly px: (years: number) => number
  readonly py: (dollars: number) => number
}) {
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    setYear(tfNearestYear(p.x, maxYears))
  }
  const x = year === null ? null : px(year)
  return (
    <g className="tf__scrub" aria-hidden="true">
      {x !== null && (
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
        </>
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

/** The readout box — HTML in the text layer, hugging its own lines and seated beside the rule from
 *  its MEASURED width (the svg era sized it from a 6.6-units-per-glyph estimate that the 13px value
 *  line already exceeded). Seated inside the PLOT, the band's contract (ConfidenceBand ScrubReadout):
 *  a whole-host corridor let it drift over the end-label column — the REQUIRED non-color channel —
 *  at the later years (chart-text gate, 2026-09-05). The box is content-sized (~117 px at the lever
 *  sheet's 752 px host) against a 430 px plot, so one side always has room there; a host under
 *  ~430 px would have to cover the rule, which only a touch device (no scrub) reaches today.
 *  A truncated arm simply has no dot and no readout pair at this year. */
function TfReadout({
  labels,
  row,
  ruleX,
  hostRef,
}: {
  readonly labels: TwoFuturesLabels
  readonly row: TwoFuturesReadoutRow
  readonly ruleX: number
  readonly hostRef: React.RefObject<HTMLElement | null>
}) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const lines = composeTfReadoutLines(labels, row)
  // TF_PLOT.right is a MARGIN (the end-label column), not a coordinate — the plot's right edge is
  // TF_VIEW.w − TF_PLOT.right, exactly as the capture rect's width is computed above.
  useReadoutPlacement(boxRef, { hostRef, ruleFx: lines.length > 0 ? fx(ruleX) : null, plotLeftF: fx(TF_PLOT.left), plotRightF: fx(TF_VIEW.w - TF_PLOT.right), topF: READOUT_TOP_FY })
  if (lines.length === 0) return null
  return (
    <span className="ct-readout tf__readout" ref={boxRef} data-tf-readout="">
      {lines.map((l, i) => (
        <span key={i} className={`tf__readout-line ${KIND_CLASS[l.kind]}`}>
          {l.text}
        </span>
      ))}
    </span>
  )
}
