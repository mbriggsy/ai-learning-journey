/*
 * src/viz/ConfidenceBand.tsx — the hand-rolled SVG confidence band (U6 render). ZERO charting
 * library; `motion` animates the band. Renders a percentile fan (real $, household-clock years)
 * onto the fixed viewBox from bandGeometry.ts, OR the indeterminate placeholder.
 *
 * THE CONTRACTS THIS COMPONENT HOLDS (phase-2 U6 + back-nine-design §3):
 *   - LINEAR y anchored at $0 → the ruin case draws the band touching the floor (bandGeometry).
 *   - DRAW ONCE, THEN MORPH: the first resolved reveal FADES the fills + median in (opacity only —
 *     the median is NOT pathLength-traced: a stroke-dash trace fights `non-scaling-stroke` and
 *     under-covers the line at the enlarged scale, leaving it visibly truncated); every later fan
 *     MORPHS the path `d` (widen / shift / narrow) on the constant x-lattice — never a draw-from-
 *     zero replay. The median is an OPACITY overlay, not part of a morphed envelope.
 *   - prefers-reduced-motion: the FINAL rendered DOM is byte-identical with motion on or off —
 *     reduced motion only sets transition duration to 0 and skips the draw/translate. No signal
 *     lives only in the animation (it inherits the non-color guarantees for free).
 *   - non-color: ink-density tiers (median ink line > inner fill > outer fill) + non-hue
 *     annotations + the drawer legend carry the signal; color is redundant. (The in-place text
 *     callouts are a supported seam no production caller fills today — see bandData BandLabels.)
 *     `role="img"` + an accessible caption + per-annotation aria-labels put every signal in the
 *     a11y tree (the reader is color blind).
 *   - SVG DRAWS, HTML WRITES (council wf_ecbe0ab2-7bb, 2026-09-05): the svg holds geometry only —
 *     fan, median, gridlines, rules, dots. EVERY word and numeral (y-tick dollars, the $0 anchor,
 *     the annotation names + ages, the callouts, the placeholder note, the scrub readout) is HTML
 *     in the chart text layer (chartText.tsx), positioned by viewBox fraction and sized on the
 *     product's own type scale — so it renders at the SAME CSS px on a 308px phone figure and a
 *     538px enlarged one, wraps instead of clipping, and follows the reader's browser font size.
 *     The viewBox no longer reserves a label gutter below the $0 floor; the annotation block sits
 *     in flow under the svg and stacks colliding labels into MEASURED rows.
 *   - responsive: one fixed viewBox; `non-scaling-stroke` on every DATA stroke (.band-area,
 *     .band-median, .band-placeholder-edge, .band-scrub-rule, .band-scrub-dot) so the colorblind
 *     line-WEIGHT encoding holds in screen px. The FRAME strokes carry none: .band-axis,
 *     .band-grid and .band-annotation-rule scale with the figure, dash patterns included — a
 *     1-unit frame stroke renders 0.55 CSS px on the 308px phone figure, 0.80 on the 446px
 *     two-pane one. Text never scales with the viewBox, so nothing is ever dropped for width (the
 *     ≤260px label-drop guard of the svg-text era is retired).
 *
 * STRING-FREE: every label arrives via the `labels` / data props (src/viz imports only @shared).
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { bandStopCss } from './scale'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from './palette'
import {
  PLOT,
  PLOT_H,
  PLOT_W,
  VIEWBOX,
  areaPath,
  cohortFadeStops,
  elapsedFadeStops,
  isThinCohort,
  labelAnchor,
  linePath,
  nearestLatticeIndex,
  placeholderPath,
  xForYear,
  yForDollars,
} from './bandGeometry'
import { composeReadoutLines } from './bandData'
import type { BandViewData, BandLabels, BandTooltipRow, ReadoutLineKind, XAnnotation, YTick } from './bandData'
import {
  ChartReadoutRow,
  ChartText,
  ChartTextHost,
  ChartTextLayer,
  useCollisionLayout,
  useReadoutPlacement,
  useReadoutSeat,
  type CtReadoutLine,
  type CtReadoutSeat,
  type CtStyle,
} from './chartText'
import './band.css'

/** A resolved fan (the only state the scrubber attaches to — the placeholder has no per-year data). */
type ResolvedData = Extract<BandViewData, { kind: 'resolved' }>

const OUTER_FILL = bandStopCss(BAND_FILL_OUTER_P)
const INNER_FILL = bandStopCss(BAND_FILL_INNER_P)

/** Motion timings — read from the same easing/duration vocabulary tokens.css names (kept in sync
 *  with --ease-out / --dur-reveal / --dur-step; numeric here because motion takes numbers). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const DRAW_S = 0.42 // --dur-reveal: the once-only first draw
const MORPH_S = 0.26 // --dur-step: a recompute morph

/** viewBox → host fractions (the text layer's coordinate system). */
const fx = (x: number): number => x / VIEWBOX.width
const fy = (y: number): number => y / VIEWBOX.height
/** The y-tick column: end-anchored 8 units left of the axis, as the svg ticks were. */
const TICK_FX = fx(PLOT.left - 8)
/** The readout box top — pinned in the plot's top gutter, never bobbing with the cursor. */
const READOUT_TOP_FY = fy(PLOT.top + 6)

export interface ConfidenceBandProps {
  readonly data: BandViewData
  readonly labels: BandLabels
  /** Enlarge handler. When present, the band ITSELF becomes a focusable `<button>` — one affordance
   *  for mouse AND keyboard/AT (a native button gives Enter/Space for free), so no separate text
   *  button is needed (it was redundant with clicking the graph). */
  readonly onEnlarge?: () => void
  /** Accessible name for the band-as-button (the enlarge action) — supplied by the caller (copy.ts)
   *  whenever `onEnlarge` is set, so the button is never unnamed. Ignored when not enlargeable. */
  readonly enlargeLabel?: string
  /** Identifies the render context — drawer vs the enlarged modal — emitted as the `data-variant`
   *  render hook. It is LIVE, not reserved: band.css keys the per-variant touch-action rules off it
   *  (enlarged denies touch; the drawer takes pan-y so a horizontal glide scrubs and a vertical
   *  swipe stays the page's scroll). It does NOT alter geometry: the viewBox is fixed and the svg's
   *  rendered size is owned by the layout container; the text layer renders at CSS-px sizes in
   *  both variants. */
  readonly variant?: 'drawer' | 'enlarged'
}

/**
 * The band. Pure render of `data`; no internal data state beyond the scrub index. Animation is
 * keyed off whether this is the first resolved reveal (draw) vs a subsequent fan (morph), tracked
 * by a ref so a recompute never replays the draw.
 */
export function ConfidenceBand({ data, labels, onEnlarge, enlargeLabel, variant = 'drawer' }: ConfidenceBandProps) {
  const reduce = useReducedMotion() ?? false
  // Has a RESOLVED fan ever been drawn? First resolved render → draw; later ones → morph.
  const hasDrawn = useRef(false)
  useEffect(() => {
    if (data.kind === 'resolved') hasDrawn.current = true
  }, [data])

  // The scrub index lives HERE (not inside the svg) because the rule + dots are svg geometry while the
  // readout is HTML in the text layer — one state, two channels. The panel re-keys this component on
  // a scale change (insight 047), so a tiered provisional→final re-draw RESETS a stale readout
  // rather than point it at superseded-scale dollars.
  const [scrubIdx, setScrubIdx] = useState<number | null>(null)
  const hostRef = useRef<HTMLSpanElement>(null)
  const rowRef = useRef<HTMLSpanElement>(null)

  const isEnlargeable = onEnlarge !== undefined
  const resolved = data.kind === 'resolved' ? data : null

  // THE SEAT (his eye, 2026-09-06): every column's reading is composed ONCE here and rendered into
  // the flow row, which is both the words' second seat and the surface the decision is measured
  // from. The composition is the same pure seam the in-plot box uses — one honesty decision
  // (composeReadoutLines + the dead-cohort withdrawal), two renderings of it.
  const readoutColumns: readonly (readonly CtReadoutLine[])[] = useMemo(
    () =>
      resolved
        ? resolved.tooltipRows.map((row, i) =>
            composeReadoutLines(labels, row, isThinCohort(resolved.samples[i]?.cohortFraction)).map((l) => ({
              text: l.text,
              className: `band-readout__line ${READOUT_LINE_CLASS[l.kind]}`,
            })),
          )
        : [],
    [resolved, labels],
  )
  const seat = useReadoutSeat({
    hostRef,
    rowRef,
    plotLeftF: fx(PLOT.left),
    plotRightF: fx(PLOT.right),
    deps: [readoutColumns],
  })

  const chart = (
    <>
      <ChartTextHost className="band-plot" ref={hostRef}>
        <svg
          className={`band-svg${isEnlargeable ? ' is-enlargeable' : ''}`}
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={labels.caption}
          data-variant={variant}
          data-band-kind={data.kind}
        >
          <Frame data={data} labels={labels} />
          {resolved ? (
            <ResolvedFan data={resolved} reduce={reduce} firstDraw={!hasDrawn.current} />
          ) : (
            <Placeholder data={data as Extract<BandViewData, { kind: 'indeterminate' }>} />
          )}
          <AnnotationRules annotations={data.annotations} horizonYears={data.horizonYears} />
          {/* The scrub geometry + capture surface sit LAST so the transparent rect is topmost (catches
              the pointer over the whole plot). Resolved-only — the placeholder carries no per-year data. */}
          {resolved && <ScrubLayer data={resolved} idx={scrubIdx} setIdx={setScrubIdx} variant={variant} />}
        </svg>
        <BandTextLayer data={data} labels={labels} scrubIdx={scrubIdx} hostRef={hostRef} seat={seat} />
      </ChartTextHost>
      <AnnotationBlock annotations={data.annotations} horizonYears={data.horizonYears} />
      {/* BELOW the annotation block, never between it and the svg: the block's dashed tails must keep
          touching the plot's bottom edge (chartText.css .ct-block__tail). Reserved at its tallest in
          the flow seat; present-but-zero in the plot seat, where it is only the measurement surface. */}
      <ChartReadoutRow seat={seat} columns={readoutColumns} activeIndex={scrubIdx} className="band-readout-row" ref={rowRef} />
    </>
  )

  return (
    // `data-readout-seat` is the render hook the chart-text gate reads the decision from — the seat is
    // measured before paint and can only be checked against the geometry that produced it.
    <figure className="band-figure" data-readout-seat={seat}>
      {isEnlargeable ? (
        // The graph IS the enlarge trigger: one focusable affordance for mouse AND keyboard/AT.
        // The wrapping <button> carries the click + native Enter/Space; the inner svg keeps its
        // role="img" + caption so the chart's text alternative still reaches the a11y tree. The
        // text layer + annotation block are <span>s so the button's content model stays legal.
        <button type="button" className="band-enlarge-surface" aria-label={enlargeLabel} onClick={onEnlarge}>
          {chart}
        </button>
      ) : (
        <span className="band-chart">{chart}</span>
      )}
    </figure>
  )
}

/* ── the HTML text layer over the plot: y ticks, callouts, the placeholder note, the readout ── */
function BandTextLayer({
  data,
  labels,
  scrubIdx,
  hostRef,
  seat,
}: {
  data: BandViewData
  labels: BandLabels
  scrubIdx: number | null
  hostRef: React.RefObject<HTMLElement | null>
  seat: CtReadoutSeat
}) {
  return (
    <ChartTextLayer className="band-text">
      {/* the y-axis dollar ladder — the sighted position→dollar decoder (O3, 2026-07-10; no SR
          tick-ladder is added: the sr-only range sentence is the AT channel). The $0 anchor is
          design-law §3's honesty proof and is never dropped. */}
      {data.yTicks.map((t: YTick) => (
        <ChartText
          key={t.label}
          className={`band-tick${t.dollars === 0 ? ' band-tick--floor' : ''}`}
          fx={TICK_FX}
          fy={fy(yForDollars(t.dollars, data.dollarMax))}
          anchor="end"
          valign="middle"
        >
          {t.label}
        </ChartText>
      ))}
      {data.kind === 'resolved' &&
        data.callouts.map((c) => (
          <ChartText
            key={c.id}
            className="band-callout"
            fx={fx(xForYear(c.yearsFromNow, data.horizonYears))}
            fy={fy(yForDollars(c.dollars, data.dollarMax))}
            anchor="middle"
            valign="bottom"
            strong
          >
            {c.text}
          </ChartText>
        ))}
      {data.kind === 'indeterminate' && (
        // the non-color tell is the ABSENCE of a median + the wide dashed envelope; the note says so
        // in words, centered on the plot.
        <ChartText
          className="band-placeholder-note"
          fx={fx(xForYear(data.horizonYears / 2, data.horizonYears))}
          fy={fy((PLOT.top + PLOT.bottom) / 2)}
          anchor="middle"
          valign="middle"
          register="sm"
          italic
        >
          {data.placeholderNote}
        </ChartText>
      )}
      {/* the box only ever renders in the PLOT seat; in the FLOW seat the same lines are the row's
          (ConfidenceBand's readoutColumns) — never both, so no reading is ever shown twice. */}
      {data.kind === 'resolved' && scrubIdx !== null && seat === 'plot' && (
        <ScrubReadout data={data} labels={labels} idx={scrubIdx} hostRef={hostRef} />
      )}
    </ChartTextLayer>
  )
}

/* ── the axis frame (y gridlines + the $0 baseline) ───────────────────────────────────────── */
function Frame({ data, labels }: { data: BandViewData; labels: BandLabels }) {
  return (
    <g aria-hidden="true">
      {/* y axis */}
      <line className="band-axis" x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} />
      {/* the $0 baseline — the ruin floor, drawn heavier than the gridlines */}
      <line
        className="band-axis"
        x1={PLOT.left}
        y1={PLOT.bottom}
        x2={PLOT.right}
        y2={PLOT.bottom}
        strokeWidth={1.4}
      />
      {/* the horizontal $ gridlines at every tick but the floor (the tick LABELS live in the text
          layer, at the same y). */}
      {data.yTicks.map((t: YTick) =>
        t.dollars === 0 ? null : (
          <line
            key={t.label}
            className="band-grid"
            x1={PLOT.left}
            y1={yForDollars(t.dollars, data.dollarMax)}
            x2={PLOT.right}
            y2={yForDollars(t.dollars, data.dollarMax)}
            strokeDasharray="2 4"
          />
        ),
      )}
      {/* off-screen axis names for the a11y tree (the reader is color blind) */}
      <title>{labels.caption}</title>
    </g>
  )
}

/* ── the resolved percentile fan ──────────────────────────────────────────────────────────── */
function ResolvedFan({
  data,
  reduce,
  firstDraw,
}: {
  data: Extract<BandViewData, { kind: 'resolved' }>
  reduce: boolean
  firstDraw: boolean
}) {
  const outerD = areaPath(data.samples, 'p10', 'p90', data.horizonYears, data.dollarMax)
  const innerD = areaPath(data.samples, 'p25', 'p75', data.horizonYears, data.dollarMax)
  const medianD = linePath(data.samples, 'p50', data.horizonYears, data.dollarMax)

  // Draw on first reveal; morph on every later fan. Reduced motion → no draw, no transition
  // (duration 0) → the FINAL DOM is identical to the animated end-state.
  const doDraw = firstDraw && !reduce
  const fillTransition = { duration: reduce ? 0 : firstDraw ? DRAW_S : MORPH_S, ease: EASE_OUT }
  const morphTransition = { duration: reduce ? 0 : MORPH_S, ease: EASE_OUT }

  // DEAD-COHORT DE-EMPHASIS (back-nine-design §3): a horizontal opacity mask that fades the fan
  // where the surviving-couple cohort thins, so a late-year slice backed by a handful of paths
  // draws QUIET (small-sample noise never reads as signal) yet stays present (we DO model those
  // years). Pure SVG (gradient + mask attributes — CSP-clean, no inline style), and STATIC: it is
  // part of the final rendered state, so motion-on and motion-off paint the same fade (no signal
  // lives only in animation). The id is render-unique (a drawer + the enlarged modal coexist).
  const uid = useId().replace(/:/g, '')
  const fadeGradId = `cohort-fade-grad-${uid}`
  const fadeMaskId = `cohort-fade-mask-${uid}`
  const fadeStops = cohortFadeStops(data.samples)
  // U17 §S2 — the AGED elapsed-segment demotion: a SECOND static luminance mask, nested inside
  // the cohort-fade group so the two compose multiplicatively (same channel, same discipline —
  // opacity never hue; static, so motion-on and motion-off paint identically). NEVER a re-trimmed
  // `d` (that breaks the morph's constant point-count AND the vertex-snapped scrub) and never a
  // clip (a fan clipped to Today reads as a projection from a KNOWN current balance — the exact
  // optimistic misread the council rejected on the record). Empty stops (fresh session) ⇒ no
  // nested mask at all — the DOM is byte-identical to pre-U17.
  const elapsedGradId = `elapsed-fade-grad-${uid}`
  const elapsedMaskId = `elapsed-fade-mask-${uid}`
  const elapsedStops = elapsedFadeStops(data.elapsedYears, data.horizonYears)

  return (
    <>
      <defs>
        <linearGradient id={fadeGradId} gradientUnits="userSpaceOnUse" x1={PLOT.left} y1={0} x2={PLOT.right} y2={0}>
          {fadeStops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor="#fff" stopOpacity={s.opacity} />
          ))}
        </linearGradient>
        {/* Luminance mask: white×stop-opacity → the fan draws at that opacity. The rect spans the
            whole viewBox; the gradient pads (full opacity left of the plot, floor to the right). */}
        <mask id={fadeMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height}>
          <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${fadeGradId})`} />
        </mask>
        {elapsedStops.length > 0 && (
          <>
            <linearGradient id={elapsedGradId} gradientUnits="userSpaceOnUse" x1={PLOT.left} y1={0} x2={PLOT.right} y2={0}>
              {elapsedStops.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor="#fff" stopOpacity={s.opacity} />
              ))}
            </linearGradient>
            <mask id={elapsedMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height}>
              <rect x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${elapsedGradId})`} />
            </mask>
          </>
        )}
      </defs>
      {/* The fan (fills + median) rides the cohort-fade mask; the text layer (labels) does NOT — text
          stays full-strength. */}
      <g mask={`url(#${fadeMaskId})`}>
        <ElapsedDimGroup maskId={elapsedStops.length > 0 ? elapsedMaskId : null}>
        {/* OUTER p10–p90 (lightest, lowest emphasis). Fill is a DYNAMIC presentation attribute from
            the palette ramp (CSP-safe). The `d` is carried in BOTH initial + animate so the path is
            NEVER rendered with an undefined `d` — on first draw only opacity fades in (no `d`
            interpolation); on a recompute motion keeps its prior `d` and morphs to the new one. */}
        <motion.path
          className="band-area"
          fill={OUTER_FILL}
          initial={doDraw ? { opacity: 0, d: outerD } : false}
          animate={{ opacity: 1, d: outerD }}
          transition={fillTransition}
        />
        {/* INNER p25–p75 (darker, higher emphasis). */}
        <motion.path
          className="band-area"
          fill={INNER_FILL}
          initial={doDraw ? { opacity: 0, d: innerD } : false}
          animate={{ opacity: 1, d: innerD }}
          transition={fillTransition}
        />
        {/* MEDIAN p50 — the OPACITY overlay line (ink, never series-blue). FADES in on first draw
            (NOT pathLength-traced — a stroke-dash trace fights non-scaling-stroke and under-covers
            the line at the enlarged scale); on recompute it morphs `d`. */}
        <motion.path
          className="band-median"
          initial={doDraw ? { opacity: 0, d: medianD } : false}
          animate={{ opacity: 1, d: medianD }}
          transition={doDraw ? { ...fillTransition } : morphTransition}
        />
        </ElapsedDimGroup>
      </g>
    </>
  )
}

/** The U17 §S2 nesting seam: with a mask id, wraps the fan paths in a second masked group (the
 *  elapsed demotion composes with the cohort fade); with null, renders the children UNWRAPPED —
 *  the fresh session's DOM stays byte-identical to pre-U17 (no empty <g> in every snapshot). */
function ElapsedDimGroup({ maskId, children }: { maskId: string | null; children: ReactNode }) {
  return maskId === null ? <>{children}</> : <g className="band-elapsed-dim" mask={`url(#${maskId})`}>{children}</g>
}

/* ── the indeterminate placeholder (wide, low-emphasis, NO median, dashed texture) ────────── */
function Placeholder({ data }: { data: Extract<BandViewData, { kind: 'indeterminate' }> }) {
  const d = placeholderPath(data.horizonYears)
  return (
    <g data-placeholder="true">
      <path className="band-placeholder-fill" d={d} />
      <path className="band-placeholder-edge" d={d} />
      {/* the non-color tell is the ABSENCE of a median + the wide dashed envelope; no precise
          band, no flat line is ever drawn in this mode. The worded note is in the text layer. */}
    </g>
  )
}

/* ── the household-clock annotation RULES (svg) — each carries the a11y sentence ─────────── */
function AnnotationRules({ annotations, horizonYears }: { annotations: readonly XAnnotation[]; horizonYears: number }) {
  return (
    <g>
      {annotations.map((a) => {
        const x = xForYear(a.yearsFromNow, horizonYears)
        return (
          // role="img" + the description: the a11y channel for this moment (both spouses' ages spoken
          // in the sentence). The sighted words are the annotation block's, below the svg.
          <g key={a.id} role="img" aria-label={a.description}>
            <line
              className="band-annotation-rule"
              x1={x}
              y1={PLOT.top + 4}
              x2={x}
              y2={VIEWBOX.height}
              strokeDasharray="3 4"
            />
          </g>
        )
      })}
    </g>
  )
}

/* ── the household-clock annotation LABELS (HTML block in flow under the svg) ─────────────── */
/**
 * Name line (strong) + both spouses' ages, at each moment's x. Colliding labels stack into MEASURED
 * rows (useCollisionLayout 'stagger' — real boxes, no glyph estimate); a dashed tail rises from a
 * staggered label to the svg's bottom edge so it still reads as its rule's label. The block's
 * height is reserved from the row count the layout produced (two lines of --text-xs per row), so
 * nothing below it moves while the answer is being read. The fit-law arms carry ONE row on every
 * spine household (temp/chart-text/precondition.json, 2026-09-05); the date route, which scrolls by
 * design, is where a SECOND row appears. A third has never been measured (docs/architecture.md §12,
 * insight 115: "one or two, never three").
 */
function AnnotationBlock({ annotations, horizonYears }: { annotations: readonly XAnnotation[]; horizonYears: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const items = annotations.map((a) => {
    const x = xForYear(a.yearsFromNow, horizonYears)
    return { a, fx: fx(x), anchor: labelAnchor(x) }
  })
  useCollisionLayout(ref, 'stagger', [items.map((i) => `${i.a.id}:${i.fx}:${i.a.label}:${i.a.ages}`).join('|')])
  const blockStyle: CtStyle = { '--ct-rows': 1 }
  return (
    <span className="ct-block band-annotations" ref={ref} style={blockStyle} aria-hidden="true">
      {items.map(({ a, fx: f, anchor }) => {
        const itemStyle: CtStyle = { '--fx': f }
        return (
          <span key={a.id} className="band-annotation-slot">
            <span className="ct-block__tail" data-ct-tail={a.id} style={itemStyle} />
            {/* an UNNAMED annotation is an interim age tick — axis wayfinding that yields (hides) on a
                collision; a NAMED moment always shows and takes a row instead. */}
            <span
              className={`ct-block__item band-annotation ct-text--${anchor}`}
              data-ct-item={a.id}
              data-ct-optional={a.label === '' ? '' : undefined}
              style={itemStyle}
            >
              <span className="ct-block__name band-annotation__name">{a.label}</span>
              <span className="ct-block__sub band-annotation__ages">{a.ages}</span>
            </span>
          </span>
        )
      })}
    </span>
  )
}

/* ── the hover/scrub layer (pointer-only; aria-hidden) ─────────────────────────────────────────
 * On pointer-move the cursor x is mapped back into viewBox space and SNAPPED to the nearest of the
 * fixed lattice samples — the readout only ever reports a sampled column (no interpolation: the layer
 * boundary forbids the UI inventing a between-samples value, and the snap keeps the readout figure
 * byte-equal to the drawn vertex). The cursor's Y is IGNORED — you read the whole percentile column at
 * that year, never "aim" at a point. The whole group is aria-hidden — the per-year story already
 * reaches the a11y tree via the annotation aria-labels + the figure caption; the scrubber is a
 * pointer-only visual convenience for the (color-blind, not blind) reader. No motion at all → the DOM
 * is identical with reduced-motion on or off, and the readout is glued to the detent (no chase lag).
 */
function ScrubLayer({
  data,
  idx,
  setIdx,
  variant,
}: {
  data: ResolvedData
  idx: number | null
  setIdx: (i: number | null) => void
  variant: 'drawer' | 'enlarged'
}) {
  // A touch drag-scrub (BOTH variants — see onDown) holds pointer capture so a finger that slides off
  // the plot keeps scrubbing; the ref (not state) gates pointerleave/move without an extra render.
  const captured = useRef(false)
  // The DISMISSAL path for a pinned touch readout (the review: a pin with no way off covers ~35% of
  // the phone plot for good): a second TAP on the same pinned column — no glide — clears it.
  const pinnedBefore = useRef<number | null>(null)
  const downIdx = useRef<number | null>(null)
  const moved = useRef(false)

  // Cursor screen→viewBox via the capture rect's own screen CTM (it sits in the svg root coordinate
  // system, so its CTM IS the viewBox transform — robust to preserveAspectRatio letterboxing, unlike
  // getBoundingClientRect ratio math). Null CTM (not laid out, e.g. jsdom) ⇒ no locate, never a NaN.
  const locate = (e: React.PointerEvent<SVGRectElement>): number | null => {
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return nearestLatticeIndex(p.x, data.samples.length)
  }

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    // Touch tracks ONLY as a captured drag, both variants (a stray touch-move never scrubs);
    // mouse/pen hover-scrub freely as before.
    if (e.pointerType === 'touch' && !captured.current) return
    const i = locate(e)
    if (i !== null) {
      if (e.pointerType === 'touch' && i !== downIdx.current) moved.current = true
      setIdx(i)
    }
  }
  // THE TOUCH PIN: a finger that lifts leaves the readout where it last was, so a phone reader can
  // study it (the next tap re-scrubs) — gated on pointerType exactly as OddsLadder does. Chromium
  // fires pointerleave AFTER pointerup on a touch, so an ungated clear here wiped the readout ~600 ms
  // after every lift (measured 2026-09-05, temp/chart-text/measurements.md §b2 — the comment that
  // used to sit on onUp claimed the pin held; it never did).
  const onLeave = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return
    if (!captured.current) setIdx(null)
  }
  // Touch drag-scrub lives on BOTH variants (Briggsy's live phone read, 2026-07-10 — the enlarge
  // hop rendered the chart SMALLER on a portrait phone, so the inline band must read directly;
  // the drawer's `touch-action: pan-y` in band.css keeps vertical pans as page scroll, so only a
  // horizontal glide scrubs). We do NOT preventDefault/stopPropagation, so where the enlarge
  // <button> still wraps the band (fine-pointer contexts), a movement-free TAP bubbles a click
  // and tap-to-enlarge is unchanged — a real drag exceeds the browser's tap slop and fires no
  // click. On coarse-pointer devices the button is gone (panel gates it) and a tap pins the readout
  // at that column — the pin is enforced by onLeave's pointerType gate above.
  const onDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType !== 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    captured.current = true
    const i = locate(e)
    pinnedBefore.current = idx
    downIdx.current = i
    moved.current = false
    if (i !== null) setIdx(i)
  }
  const onUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (!captured.current) return
    captured.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* capture may already be gone (pointercancel) — releasing twice throws; ignore */
    }
    // a movement-free tap on the column that was ALREADY pinned dismisses the readout; any glide,
    // or a tap on a new column, leaves the new pin in place.
    if (e.type === 'pointerup' && !moved.current && downIdx.current !== null && pinnedBefore.current === downIdx.current) {
      setIdx(null)
    }
  }

  return (
    <g className="band-scrub" aria-hidden="true">
      {idx !== null && <ScrubMarks data={data} idx={idx} />}
      {/* The transparent capture surface — `fill="transparent"` + `pointer-events: all` so it receives
          the pointer where a `fill="none"` rect would not. Rendered AFTER the visuals so it is topmost
          (no dead zone behind the rule/dots); the visuals carry `pointer-events: none`. */}
      <rect
        className={`band-scrub-capture band-scrub-capture--${variant}`}
        x={PLOT.left}
        y={PLOT.top}
        width={PLOT_W}
        height={PLOT_H}
        fill="transparent"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </g>
  )
}

/** The live scrubber marks: one thin SOLID rule (distinct from the DASHED milestone rules — this reads
 *  as "where I'm pointing now", not a named moment) + three dots where it crosses p10 / p50 / p90
 *  (median filled, the two edges hollow — shape, not hue). The worded readout is HTML (below). */
function ScrubMarks({ data, idx }: { data: ResolvedData; idx: number }) {
  const s = data.samples[idx]!
  const x = xForYear(s.yearsFromNow, data.horizonYears)
  return (
    <>
      <line className="band-scrub-rule" x1={x} y1={PLOT.top} x2={x} y2={PLOT.bottom} />
      <circle className="band-scrub-dot band-scrub-dot--edge" cx={x} cy={yForDollars(s.p90, data.dollarMax)} r={3} />
      <circle
        className="band-scrub-dot band-scrub-dot--median"
        cx={x}
        cy={yForDollars(s.p50, data.dollarMax)}
        r={3.4}
      />
      <circle className="band-scrub-dot band-scrub-dot--edge" cx={x} cy={yForDollars(s.p10, data.dollarMax)} r={3} />
    </>
  )
}

/** The renderer's only readout responsibility: map a composed line's semantic kind to its CSS class.
 *  The WHAT-to-show decision (and the dead-cohort withdrawal) lives in the pure {@link composeReadoutLines}. */
const READOUT_LINE_CLASS: Record<ReadoutLineKind, string> = {
  ages: 'ct-readout__ages',
  label: 'ct-readout__label',
  value: 'ct-readout__value',
  note: 'ct-readout__note',
}

/** The readout box — the PLOT seat of the readout (the flow seat is the ChartReadoutRow above,
 *  rendering the same composed lines): HTML in the text layer, placed beside the rule from its
 *  MEASURED width (useReadoutPlacement), top-pinned and side-flipped clear of the rule. Each line is a label WORD
 *  (from copy.ts) composed around the PRE-FORMATTED figures — the renderer never types a numeral. The
 *  ages line drops when no household-clock closure was supplied; on a thinned cohort the dollar lines
 *  give way to the calm withdrawal note. This is the sanctioned comprehension channel (council
 *  2026-06-28: "serve comprehension via the non-axis scrub readout") — and on a coarse pointer the
 *  phone's ONLY path to the band's dollar figures, so it renders at --text-sm like every readout. */
function ScrubReadout({
  data,
  labels,
  idx,
  hostRef,
}: {
  data: ResolvedData
  labels: BandLabels
  idx: number
  hostRef: React.RefObject<HTMLElement | null>
}) {
  const s = data.samples[idx]!
  const row: BandTooltipRow | undefined = data.tooltipRows[idx]
  const boxRef = useRef<HTMLSpanElement>(null)
  const x = xForYear(s.yearsFromNow, data.horizonYears)
  // Seated inside the PLOT — never over the y-tick column (O3's position→dollar decoder; a pinned box
  // there re-creates the very "$1.5M reads $1" misread this whole layer exists to prevent) and never
  // over the rule: this component renders ONLY in the plot seat, and useReadoutSeat grants that seat
  // only where the box (its capped max-content) plus the gap fits beside a MID-plot rule — which is
  // exactly placeReadoutX's precondition, so neither of its clamps can fire at any column.
  useReadoutPlacement(boxRef, {
    hostRef,
    ruleFx: row ? fx(x) : null,
    plotLeftF: fx(PLOT.left),
    plotRightF: fx(PLOT.right),
    topF: READOUT_TOP_FY,
  })
  if (!row) return null
  // Withdraw the crisp dollars exactly where the fan visibly fades (the cohort thinned past the same
  // COHORT_FADE.full onset) — a confident "$X at age 97" on a handful of surviving couples is the
  // calm-but-wrong sin. The rule + dots still draw (you see WHERE you are); only the figures go quiet.
  // The gate is a PURE, unit-tested helper (isThinCohort) bound to the same onset as the visual fade.
  const lines = composeReadoutLines(labels, row, isThinCohort(s.cohortFraction))
  return (
    <span className="ct-readout band-readout" ref={boxRef} data-band-readout="">
      {lines.map((l, i) => (
        <span key={i} className={`band-readout__line ${READOUT_LINE_CLASS[l.kind]}`}>
          {l.text}
        </span>
      ))}
    </span>
  )
}
