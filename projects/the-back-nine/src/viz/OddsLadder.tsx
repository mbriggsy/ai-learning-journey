/*
 * src/viz/OddsLadder.tsx — the D2c odds ladder (council-decided 2026-06-28; docs/council-log.md).
 * A hand-rolled SVG that answers the date route's secondary "how do my work-optional odds shift by
 * WHEN I stop?" as a DISCRETE integer-rung ladder — ONE dot per evaluated stop-date, never a smooth
 * curve (a spline would manufacture precision the engine, quantized to X-of-10, does not have).
 *
 * THE HONESTY CONTRACTS (each a calm-but-wrong guard the council named — semantics proven in
 * curveMarks.test.ts, geometry in oddsLadderGeometry.test.ts, rendering below):
 *   - INTEGER RUNGS, full 0..10 (no truncated/zoomed axis, back-nine-design §3). A dot's height is
 *     round(qlb·10); the on-track bar draws at the TRUE 8.5 midpoint between failing-8 and clearing-9,
 *     so "clears vs. dips" reads by POSITION (above/below the bar), never by hue.
 *   - THE CROWN IS THE DURABLE DATE, not the tallest dot: the engine's crown (longest clearing
 *     suffix) wears the ring + the one reserved vermilion accent + the direct "your date" tell. The
 *     eye is never invited to pick the lucky peak (optimizer's curse).
 *   - A DIP IS DRAWN TRUE: a cleared-then-dipped offset (the non-monotone ACA-cliff signature, R26)
 *     plots ABOVE the bar (it genuinely clears) as an OPEN dot with a worded "doesn't hold" tell —
 *     not hidden, not smoothed, not alarmed (no red gash / shake / zoom).
 *   - NON-COLOR (the reader is color-blind): height + marker SHAPE (filled / open / ringed / faint) +
 *     direct text carry every signal; the vermilion crown is redundant only. role="img" + caption +
 *     a per-mark aria-label put every dot's reading in the a11y tree.
 *   - NEVER "10 of 10": a ceiling rung (≥ 0.95) reads "better than 9 in 10" via the injected
 *     formatter; no dot ever means certain (the rung-10 line tops the ladder, headroom above it).
 *   - CALM MOTION (back-nine-design §3 / emil): the marks DRAW once (opacity fade), never replay;
 *     prefers-reduced-motion drops the fade and the FINAL DOM is identical (no signal in animation).
 *   - CSP-clean (style-src 'self'): every dynamic value is an SVG presentation/geometry ATTRIBUTE
 *     (the vermilion from palette.ts), never an inline `style`; non-scaling-stroke holds line weight.
 *
 * STRING-FREE: every word + numeral arrives via `labels` (src/ui fills from copy.ts); the renderer
 * types no copy and no number — it reads the marks and formats through the injected slots.
 */

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { OKABE_ITO } from './palette'
import { curveMarks, type CurveMark } from './curveMarks'
import type { DateTrackOutcome } from '@shared/model'
import {
  PLOT,
  VIEWBOX,
  BAR_Y,
  RUNG_YS,
  xForOffset,
  yForRung,
  domainMaxYears,
} from './oddsLadderGeometry'
import './oddsLadder.css'

/** Marker radii (viewBox px). The crown is larger and ringed; a below-bar dot is smaller + faint
 *  (context, de-emphasized). Kept here as render tuning, not geometry. */
const MARK_R = 5
const CROWN_R = 5.5
const CROWN_RING_R = 9

/** Motion timings — mirror band.css's --dur-reveal / --ease-out (numeric for motion). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const DRAW_S = 0.42

/** The copy the ladder renders — all injected by @ui (oddsLadderChrome) from copy.ts. The renderer
 *  formats nothing itself: the odds clamp ("better than 9 in 10") and the calm voice live in copy. */
export interface OddsLadderLabels {
  /** Accessible caption for the whole figure (role="img"). */
  readonly caption: string
  /** A rung → its spoken "X of 10" odds (slots.xOfTen, with the never-"10 of 10" ceiling clamp). */
  readonly formatOdds: (rung: number) => string
  /** A household-clock offset → its x-axis tick label (e.g. "today", "6"). */
  readonly formatOffset: (offsetYears: number) => string
  /** The x-axis caption (e.g. "years from now you stop"). */
  readonly xAxisLabel: string
  /** The on-track bar's label (e.g. "on track"). */
  readonly barLabel: string
  /** The crown's direct tell (e.g. "your date"). */
  readonly crownLabel: string
  /** A dipped offset's direct tell (e.g. "doesn't hold"). */
  readonly dipLabel: string
  /** A mark → its full a11y description (offset + odds + clears/dips/crown), built in copy. */
  readonly describeMark: (mark: CurveMark) => string
}

export interface OddsLadderProps {
  /** The crowned (confirmed-date / window-edge) track. The renderer maps it to marks itself
   *  (curveMarks is pure + viz-local); a no-date track is NOT plotted here (the Honesty Hawk veto —
   *  the mount renders a worded "how close" line instead). */
  readonly track: DateTrackOutcome
  readonly labels: OddsLadderLabels
}

export function OddsLadder({ track, labels }: OddsLadderProps) {
  const reduce = useReducedMotion() ?? false
  // Draw (fade) ONCE; a later render (a tier re-grade) updates dot positions in place, never replays
  // the fade. Reduced motion → no fade, the final DOM identical.
  const hasDrawn = useRef(false)
  useEffect(() => {
    hasDrawn.current = true
  }, [])
  const firstDraw = !hasDrawn.current

  const marks = curveMarks(track)
  const domainMax = domainMaxYears(marks.map((m) => m.offsetYears))

  return (
    <figure className="ladder-figure">
      <svg
        className="ladder-svg"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={labels.caption}
      >
        <LadderFrame barLabel={labels.barLabel} />
        <motion.g
          initial={firstDraw && !reduce ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE_OUT }}
        >
          {marks.map((m) => (
            <LadderMark key={m.offsetYears} mark={m} domainMax={domainMax} labels={labels} />
          ))}
        </motion.g>
        <LadderXAxis marks={marks} domainMax={domainMax} labels={labels} />
        <title>{labels.caption}</title>
      </svg>
    </figure>
  )
}

/* ── the frame: the rung detent grid, the y-axis, the floor, and the on-track bar ─────────────── */
function LadderFrame({ barLabel }: { barLabel: string }) {
  return (
    <g aria-hidden="true">
      {/* faint reference line at every integer rung — the readable detents (odds read at this coarse
          grid, never a smooth %). */}
      {RUNG_YS.map(({ rung, y }) => (
        <line
          key={rung}
          className="ladder-grid"
          x1={PLOT.left}
          y1={y}
          x2={PLOT.right}
          y2={y}
          strokeDasharray="2 5"
        />
      ))}
      {/* y-axis + the floor (rung 0), drawn heavier than the grid. */}
      <line className="ladder-axis" x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} />
      <line
        className="ladder-axis"
        x1={PLOT.left}
        y1={PLOT.bottom}
        x2={PLOT.right}
        y2={PLOT.bottom}
        strokeWidth={1.4}
      />
      {/* THE ON-TRACK BAR — at the TRUE 8.5 midpoint, solid + heavier (distinct from the dashed grid),
          so clearing dots sit visibly above it and failing dots below. */}
      <line className="ladder-bar" x1={PLOT.left} y1={BAR_Y} x2={PLOT.right} y2={BAR_Y} />
      <text className="ladder-bar-label ladder-droppable-label" x={PLOT.left + 6} y={BAR_Y - 6}>
        {barLabel}
      </text>
    </g>
  )
}

/* ── one mark: a dot whose SHAPE encodes its state (filled / open / ringed / faint), color redundant ── */
function LadderMark({
  mark,
  domainMax,
  labels,
}: {
  mark: CurveMark
  domainMax: number
  labels: OddsLadderLabels
}) {
  const x = xForOffset(mark.offsetYears, domainMax)
  const y = yForRung(mark.rung)
  const desc = labels.describeMark(mark)

  if (mark.isCrown) {
    // the durable date: the reserved vermilion accent + a ring (halo) + the direct "your date" tell +
    // its odds. Vermilion is a presentation attribute from palette (CSP-safe), redundant with shape.
    return (
      <g role="img" aria-label={desc}>
        <circle
          className="ladder-ring"
          cx={x}
          cy={y}
          r={CROWN_RING_R}
          fill="none"
          stroke={OKABE_ITO.vermilion}
        />
        <circle className="ladder-dot ladder-dot--crown" cx={x} cy={y} r={CROWN_R} fill={OKABE_ITO.vermilion} />
        <text className="ladder-odds ladder-droppable-label" x={x} y={y - 30} textAnchor="middle">
          {labels.formatOdds(mark.rung)}
        </text>
        <text
          className="ladder-callout ladder-callout--crown ladder-droppable-label"
          x={x}
          y={y - 16}
          textAnchor="middle"
        >
          {labels.crownLabel}
        </text>
      </g>
    )
  }

  if (mark.isDip) {
    // cleared-then-dipped: an OPEN dot ABOVE the bar (it clears) + the worded "doesn't hold" tell.
    return (
      <g role="img" aria-label={desc}>
        <circle className="ladder-dot ladder-dot--dip" cx={x} cy={y} r={MARK_R} />
        <text
          className="ladder-callout ladder-callout--dip ladder-droppable-label"
          x={x}
          y={y - 13}
          textAnchor="middle"
        >
          {labels.dipLabel}
        </text>
      </g>
    )
  }

  // a plain clearing dot (filled ink) or a below-bar dot (smaller, faint — context, de-emphasized).
  const cls = mark.clears ? 'ladder-dot--clears' : 'ladder-dot--below'
  return (
    <g role="img" aria-label={desc}>
      <circle className={`ladder-dot ${cls}`} cx={x} cy={y} r={mark.clears ? MARK_R : MARK_R - 1.4} />
    </g>
  )
}

/* ── the household-clock x-axis: a tick under each evaluated offset + a caption ────────────────── */
function LadderXAxis({
  marks,
  domainMax,
  labels,
}: {
  marks: readonly CurveMark[]
  domainMax: number
  labels: OddsLadderLabels
}) {
  return (
    <g className="ladder-frame-text" textAnchor="middle" aria-hidden="true">
      {marks.map((m) => (
        <text
          key={m.offsetYears}
          className="ladder-droppable-label"
          x={xForOffset(m.offsetYears, domainMax)}
          y={PLOT.bottom + 20}
        >
          {labels.formatOffset(m.offsetYears)}
        </text>
      ))}
      <text className="ladder-axis-caption ladder-droppable-label" x={(PLOT.left + PLOT.right) / 2} y={PLOT.bottom + 42}>
        {labels.xAxisLabel}
      </text>
    </g>
  )
}
