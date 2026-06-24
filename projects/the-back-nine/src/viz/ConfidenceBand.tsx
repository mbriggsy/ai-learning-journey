/*
 * src/viz/ConfidenceBand.tsx — the hand-rolled SVG confidence band (U6 render). ZERO charting
 * library; `motion` animates the band. Renders a percentile fan (real $, household-clock years)
 * onto the fixed viewBox from bandGeometry.ts, OR the indeterminate placeholder.
 *
 * THE CONTRACTS THIS COMPONENT HOLDS (phase-2 U6 + back-nine-design §3):
 *   - LINEAR y anchored at $0 → the ruin case draws the band touching the floor (bandGeometry).
 *   - DRAW ONCE, THEN MORPH: the first resolved reveal fades the fills in + draws the median
 *     line (pathLength 0→1); every later fan MORPHS the path `d` (widen / shift / narrow) on the
 *     constant x-lattice — never a draw-from-zero replay. The median is an OPACITY overlay, not
 *     part of a morphed envelope.
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

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { bandStopCss } from './scale'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from './palette'
import {
  PLOT,
  PLOT_W,
  VIEWBOX,
  areaPath,
  linePath,
  placeholderPath,
  xForYear,
  yForDollars,
} from './bandGeometry'
import type { BandViewData, BandLabels, XAnnotation, YTick } from './bandData'
import './band.css'

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
  /** Click handler for the click-to-enlarge affordance (mouse convenience). When present the
   *  band shows the zoom-in cursor; the keyboard/AT path is the caller's explicit button. */
  readonly onEnlarge?: () => void
  /** Larger geometry hint for the enlarged view — purely cosmetic (the viewBox is fixed; this
   *  only relaxes the @container label-drop by widening the rendered band). Unused by the math. */
  readonly variant?: 'drawer' | 'enlarged'
}

/**
 * The band. Pure render of `data`; no internal data state. Animation is keyed off whether this
 * is the first resolved reveal (draw) vs a subsequent fan (morph), tracked by a ref so a
 * recompute never replays the draw.
 */
export function ConfidenceBand({ data, labels, onEnlarge, variant = 'drawer' }: ConfidenceBandProps) {
  const reduce = useReducedMotion() ?? false
  // Has a RESOLVED fan ever been drawn? First resolved render → draw; later ones → morph.
  const hasDrawn = useRef(false)
  useEffect(() => {
    if (data.kind === 'resolved') hasDrawn.current = true
  }, [data])

  const isEnlargeable = onEnlarge !== undefined

  return (
    <figure className="band-figure">
      <svg
        className={`band-svg${isEnlargeable ? ' is-enlargeable' : ''}`}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={labels.caption}
        data-variant={variant}
        data-band-kind={data.kind}
        onClick={onEnlarge}
      >
        <Frame data={data} labels={labels} />
        {data.kind === 'resolved' ? (
          <ResolvedFan data={data} reduce={reduce} firstDraw={!hasDrawn.current} />
        ) : (
          <Placeholder data={data} />
        )}
        <Annotations annotations={data.annotations} horizonYears={data.horizonYears} />
      </svg>
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

  return (
    <>
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
      {/* MEDIAN p50 — the OPACITY overlay line (ink, never series-blue). On first draw it traces
          (pathLength 0→1); on recompute it morphs `d` and never replays the trace. */}
      <motion.path
        className="band-median"
        initial={doDraw ? { opacity: 0, pathLength: 0, d: medianD } : false}
        animate={{ opacity: 1, pathLength: 1, d: medianD }}
        transition={doDraw ? { ...fillTransition } : morphTransition}
      />
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
/** Minimum horizontal gap (viewBox px) between two annotation labels before the later one is
 *  staggered to a lower row, so close moments (e.g. two retirements a few years apart) never
 *  overprint. The rules still sit at their true x. */
const LABEL_MIN_GAP = 70
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
  // Pre-compute x + a stagger level so a crowded label drops to a lower row (alternating) instead
  // of overprinting its neighbor.
  let lastX = Number.NEGATIVE_INFINITY
  let lastLevel = 0
  const placed = annotations.map((a) => {
    const x = clampX(xForYear(a.yearsFromNow, horizonYears))
    const level = x - lastX < LABEL_MIN_GAP ? (lastLevel === 0 ? 1 : 0) : 0
    lastX = x
    lastLevel = level
    return { a, x, level }
  })

  return (
    <g className="band-frame-text" textAnchor="middle">
      {placed.map(({ a, x, level }) => {
        const anchor = x > PLOT.right - 28 ? 'end' : x < PLOT.left + 28 ? 'start' : 'middle'
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

function clampX(x: number): number {
  const lo = PLOT.left
  const hi = PLOT.left + PLOT_W
  return x < lo ? lo : x > hi ? hi : x
}
