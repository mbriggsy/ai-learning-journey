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
 *   - non-color: ink-density tiers (median ink line > inner fill > outer fill) + in-place text
 *     callouts + non-hue annotations carry the signal; color is redundant. `role="img"` + an
 *     accessible caption + per-annotation aria-labels put every signal in the a11y tree (the
 *     reader is color blind).
 *   - responsive: one fixed viewBox, `non-scaling-stroke` on every stroked path, labels DROP
 *     below a legible width (band.css @container) rather than shrink.
 *
 * STRING-FREE: every label arrives via the `labels` / data props (src/viz imports only @shared).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { bandStopCss } from './scale'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from './palette'
import {
  PLOT,
  PLOT_H,
  PLOT_W,
  READOUT_PAD_X,
  READOUT_W,
  VIEWBOX,
  areaPath,
  cohortFadeStops,
  isThinCohort,
  linePath,
  nearestLatticeIndex,
  placeAnnotationLabels,
  placeholderPath,
  placeReadoutBox,
  xForYear,
  yForDollars,
} from './bandGeometry'
import { composeReadoutLines } from './bandData'
import type { BandViewData, BandLabels, BandTooltipRow, ReadoutLineKind, XAnnotation, YTick } from './bandData'
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
  /** Identifies the render context — drawer vs the enlarged modal — emitted only as the
   *  `data-variant` render hook (used by tests, reserved for future per-variant CSS). It does NOT
   *  alter geometry or widen the band: the viewBox is fixed and the rendered size is owned
   *  entirely by the layout container (the modal dialog's width feeding the @container label-drop). */
  readonly variant?: 'drawer' | 'enlarged'
}

/**
 * The band. Pure render of `data`; no internal data state. Animation is keyed off whether this
 * is the first resolved reveal (draw) vs a subsequent fan (morph), tracked by a ref so a
 * recompute never replays the draw.
 */
export function ConfidenceBand({ data, labels, onEnlarge, enlargeLabel, variant = 'drawer' }: ConfidenceBandProps) {
  const reduce = useReducedMotion() ?? false
  // Has a RESOLVED fan ever been drawn? First resolved render → draw; later ones → morph.
  const hasDrawn = useRef(false)
  useEffect(() => {
    if (data.kind === 'resolved') hasDrawn.current = true
  }, [data])

  const isEnlargeable = onEnlarge !== undefined

  const svg = (
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
      {data.kind === 'resolved' ? (
        <ResolvedFan data={data} reduce={reduce} firstDraw={!hasDrawn.current} />
      ) : (
        <Placeholder data={data} />
      )}
      <Annotations annotations={data.annotations} horizonYears={data.horizonYears} />
      {/* The hover/scrub readout sits LAST so its transparent capture surface is topmost (catches the
          pointer over the whole plot). Resolved-only — the placeholder carries no per-year data. */}
      {data.kind === 'resolved' && <ScrubLayer data={data} labels={labels} variant={variant} />}
    </svg>
  )

  return (
    <figure className="band-figure">
      {isEnlargeable ? (
        // The graph IS the enlarge trigger: one focusable affordance for mouse AND keyboard/AT.
        // The wrapping <button> carries the click + native Enter/Space; the inner svg keeps its
        // role="img" + caption so the chart's text alternative still reaches the a11y tree.
        <button type="button" className="band-enlarge-surface" aria-label={enlargeLabel} onClick={onEnlarge}>
          {svg}
        </button>
      ) : (
        svg
      )}
    </figure>
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
      <g className="band-frame-text" textAnchor="end">
        {data.yTicks.map((t: YTick) => {
          const y = yForDollars(t.dollars, data.dollarMax)
          const isFloor = t.dollars === 0
          return (
            <g key={t.label}>
              {!isFloor && (
                <line
                  className="band-grid"
                  x1={PLOT.left}
                  y1={y}
                  x2={PLOT.right}
                  y2={y}
                  strokeDasharray="2 4"
                />
              )}
              <text className="band-droppable-label" x={PLOT.left - 8} y={y + 4}>
                {t.label}
              </text>
            </g>
          )
        })}
      </g>
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
      </defs>
      {/* The fan (fills + median) rides the cohort-fade mask; the callouts (labels) do NOT — text
          stays full-strength. */}
      <g mask={`url(#${fadeMaskId})`}>
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
      </g>
      <Callouts data={data} />
    </>
  )
}

function Callouts({ data }: { data: Extract<BandViewData, { kind: 'resolved' }> }) {
  return (
    <g>
      {data.callouts.map((c) => (
        <text
          key={c.id}
          className="band-callout band-droppable-label"
          x={xForYear(c.yearsFromNow, data.horizonYears)}
          y={yForDollars(c.dollars, data.dollarMax)}
          textAnchor="middle"
        >
          {c.text}
        </text>
      ))}
    </g>
  )
}

/* ── the indeterminate placeholder (wide, low-emphasis, NO median, dashed texture) ────────── */
function Placeholder({ data }: { data: Extract<BandViewData, { kind: 'indeterminate' }> }) {
  const d = placeholderPath(data.horizonYears)
  const midX = xForYear(data.horizonYears / 2, data.horizonYears)
  const midY = (PLOT.top + PLOT.bottom) / 2
  return (
    <g data-placeholder="true">
      <path className="band-placeholder-fill" d={d} />
      <path className="band-placeholder-edge" d={d} />
      {/* the non-color tell is the ABSENCE of a median + the wide dashed envelope; no precise
          band, no flat line is ever drawn in this mode. */}
      <text className="band-placeholder-note band-droppable-label" x={midX} y={midY} textAnchor="middle">
        {data.placeholderNote}
      </text>
    </g>
  )
}

/* ── the household-clock annotations (non-hue: vertical rule + text + both ages) ──────────── */
const ROW_1 = PLOT.bottom + 28
const ROW_2 = PLOT.bottom + 44
const ROW_STAGGER = 34 // pushes a crowded label's two lines below the un-staggered pair

function Annotations({
  annotations,
  horizonYears,
}: {
  annotations: readonly XAnnotation[]
  horizonYears: number
}) {
  // Pure, width-aware multi-row placement (bandGeometry.placeAnnotationLabels): a label that would
  // overprint a close neighbour drops to a lower row. The placement consults EACH row's running
  // edge (not just row 0), so two close labels never both pile onto row 1 and overlap.
  const placed = placeAnnotationLabels(
    annotations.map((a) => ({
      yearsFromNow: a.yearsFromNow,
      chars: Math.max(a.label.length, a.ages.length),
    })),
    horizonYears,
  )

  return (
    <g className="band-frame-text" textAnchor="middle">
      {annotations.map((a, i) => {
        const { x, anchor, level } = placed[i]!
        const dy = level * ROW_STAGGER
        return (
          <g key={a.id} role="img" aria-label={a.description}>
            <line
              className="band-annotation-rule"
              x1={x}
              y1={PLOT.top + 4}
              x2={x}
              y2={PLOT.bottom + 6 + dy}
              strokeDasharray="3 4"
            />
            <text className="band-droppable-label is-strong" x={x} y={ROW_1 + dy} textAnchor={anchor}>
              {a.label}
            </text>
            <text className="band-droppable-label" x={x} y={ROW_2 + dy} textAnchor={anchor}>
              {a.ages}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* ── the hover/scrub readout (pointer-only; aria-hidden) ───────────────────────────────────────
 * On pointer-move the cursor x is mapped back into viewBox space and SNAPPED to the nearest of the
 * fixed lattice samples — the readout only ever reports a sampled column (no interpolation: the layer
 * boundary forbids the UI inventing a between-samples value, and the snap keeps the readout figure
 * byte-equal to the drawn vertex). The cursor's Y is IGNORED — you read the whole percentile column at
 * that year, never "aim" at a point. State lives HERE (inside the band that the panel re-keys on a
 * scale change, insight 047), so a tiered provisional→final re-draw RESETS a stale readout rather than
 * point it at superseded-scale dollars. The whole group is aria-hidden — the per-year story already
 * reaches the a11y tree via the annotation aria-labels + the figure caption; the scrubber is a
 * pointer-only visual convenience for the (color-blind, not blind) reader. No motion at all → the DOM
 * is identical with reduced-motion on or off, and the readout is glued to the detent (no chase lag).
 */
function ScrubLayer({
  data,
  labels,
  variant,
}: {
  data: ResolvedData
  labels: BandLabels
  variant: 'drawer' | 'enlarged'
}) {
  const [idx, setIdx] = useState<number | null>(null)
  // A touch drag-scrub (enlarged only) holds pointer capture so a finger that slides off the plot keeps
  // scrubbing; the ref (not state) gates pointerleave/move without an extra render.
  const captured = useRef(false)

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
    // DRAWER: mouse/pen only — touch is reserved for the wrapping enlarge <button> (tap-to-enlarge).
    if (variant === 'drawer' && e.pointerType === 'touch') return
    // ENLARGED + touch: only track once a drag is captured (a stray touch-move never scrubs).
    if (variant === 'enlarged' && e.pointerType === 'touch' && !captured.current) return
    const i = locate(e)
    if (i !== null) setIdx(i)
  }
  const clear = () => {
    if (!captured.current) setIdx(null)
  }
  // Touch drag-scrub lives ONLY in the enlarged modal (no enlarge button there to fight). We do NOT
  // preventDefault/stopPropagation in the drawer, so a touch tap still bubbles to the enlarge button.
  const onDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (variant !== 'enlarged' || e.pointerType !== 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    captured.current = true
    const i = locate(e)
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
    // Leave idx pinned at the last point so a touch reader can study it; the next tap re-scrubs.
  }

  return (
    <g className="band-scrub" aria-hidden="true">
      {idx !== null && <ScrubVisual data={data} labels={labels} idx={idx} />}
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
        onPointerLeave={clear}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </g>
  )
}

/** The live scrubber marks: one thin SOLID rule (distinct from the DASHED milestone rules — this reads
 *  as "where I'm pointing now", not a named moment) + three dots where it crosses p10 / p50 / p90
 *  (median filled, the two edges hollow — shape, not hue), then the readout box. */
function ScrubVisual({ data, labels, idx }: { data: ResolvedData; labels: BandLabels; idx: number }) {
  const s = data.samples[idx]!
  const row = data.tooltipRows[idx]
  const x = xForYear(s.yearsFromNow, data.horizonYears)
  // Withdraw the crisp dollars exactly where the fan visibly fades (the cohort thinned past the same
  // COHORT_FADE.full onset) — a confident "$X at age 97" on a handful of surviving couples is the
  // calm-but-wrong sin. The rule + dots still draw (you see WHERE you are); only the figures go quiet.
  // The gate is a PURE, unit-tested helper (isThinCohort) bound to the same onset as the visual fade.
  const thin = isThinCohort(s.cohortFraction)
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
      {row && <ScrubReadout labels={labels} row={row} thin={thin} scrubX={x} />}
    </>
  )
}

/** The readout box — an SVG-internal `<g>` positioned by a `transform` ATTRIBUTE (CSP-clean: not an
 *  inline `style`), top-pinned and side-flipped clear of the rule. Each line is a label WORD (from
 *  copy.ts) composed around the PRE-FORMATTED figures — the renderer never types a numeral. The ages
 *  line drops when no household-clock closure was supplied; on a thinned cohort the dollar lines give
 *  way to the calm withdrawal note. */
const READOUT_PAD_Y = 11
const READOUT_LINE = 17

/** The renderer's only readout responsibility: map a composed line's semantic kind to its CSS class.
 *  The WHAT-to-show decision (and the dead-cohort withdrawal) lives in the pure {@link composeReadoutLines}. */
const READOUT_LINE_CLASS: Record<ReadoutLineKind, string> = {
  ages: 'band-readout-ages',
  label: 'band-readout-label',
  value: 'band-readout-value',
  note: 'band-readout-note',
}

function ScrubReadout({
  labels,
  row,
  thin,
  scrubX,
}: {
  labels: BandLabels
  row: BandTooltipRow
  thin: boolean
  scrubX: number
}) {
  const lines = composeReadoutLines(labels, row, thin)
  const h = READOUT_PAD_Y * 2 + lines.length * READOUT_LINE
  const { tx, ty } = placeReadoutBox(scrubX, READOUT_W)
  return (
    <g transform={`translate(${tx},${ty})`}>
      <rect className="band-readout-box" x={0} y={0} width={READOUT_W} height={h} rx={8} />
      {lines.map((l, i) => (
        <text
          key={i}
          className={`band-readout-text ${READOUT_LINE_CLASS[l.kind]}`}
          x={READOUT_PAD_X}
          y={READOUT_PAD_Y + i * READOUT_LINE}
          dominantBaseline="hanging"
        >
          {l.text}
        </text>
      ))}
    </g>
  )
}
