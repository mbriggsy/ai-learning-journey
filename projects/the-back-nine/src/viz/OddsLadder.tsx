/*
 * src/viz/OddsLadder.tsx — the D2c odds ladder (council-decided 2026-06-28; docs/council-log.md;
 * reworked to the N=1 cold-read 2026-07-03 — see the REWORK note below).
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
 *   - A DIP IS DRAWN TRUE — QUIETLY (the 2026-07-03 rework): a cleared-then-dipped offset (the
 *     non-monotone budget-collision signature, R26) plots at its TRUE above-bar rung but in the
 *     same small/faint de-emphasis as a below-bar dot — everything left of the crown that is not
 *     durable reads QUIET, and the STORY ("clears at first, but doesn't hold") lives in the scrub
 *     readout + the per-dot a11y sentence + the first-frame hero note. The earlier encoding (an
 *     OPEN dot above the bar + a floating "doesn't hold" label) read as a riddle, not a warning.
 *   - NON-COLOR (the reader is color-blind): height + marker SHAPE/emphasis + direct text carry
 *     every signal; the vermilion crown is redundant only. role="img" + caption + a per-mark
 *     aria-label put every dot's reading in the a11y tree.
 *   - NEVER "10 of 10": a ceiling rung (≥ 0.95) reads "better than 9 in 10" via the injected
 *     formatter; no dot ever means certain (the rung-10 line tops the ladder, headroom above it).
 *   - SCRUB, NOT TOOLTIP (cold-read 2026-07-03): the ladder reads by hover exactly like the fan
 *     chart — a snap-to-offset rule + a reserved worded readout line above the plot (the SAME
 *     sentence the a11y tree speaks; pointer-only, aria-hidden, instant). The native SVG <title>
 *     tooltip is gone.
 *   - CALM MOTION (back-nine-design §3 / emil): the marks DRAW once (opacity fade), never replay;
 *     prefers-reduced-motion drops the fade and the FINAL DOM is identical (no signal in animation).
 *   - CSP-clean (style-src 'self'): every dynamic value is an SVG presentation/geometry ATTRIBUTE
 *     (the vermilion from palette.ts), never an inline `style`; non-scaling-stroke holds line weight.
 *
 * STRING-FREE: every word + numeral arrives via `labels` (src/ui fills from copy.ts); the renderer
 * types no copy and no number — it reads the marks and formats through the injected slots.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { OKABE_ITO } from './palette'
import { agedLadderMarks, curveMarks, type CurveMark } from './curveMarks'
import type { DateTrackOutcome } from '@shared/model'
import {
  PLOT,
  PLOT_W,
  PLOT_H,
  VIEWBOX,
  BAR_Y,
  RUNG_YS,
  xForOffset,
  yForRung,
  domainMaxYears,
  nearestOffsetIndex,
} from './oddsLadderGeometry'
import './oddsLadder.css'

/** Marker radii (viewBox px). The crown is larger and ringed; a NON-DURABLE dot (below-bar OR a
 *  dip) is smaller + faint (context, de-emphasized). Kept here as render tuning, not geometry. */
const MARK_R = 5
const QUIET_R = MARK_R - 1.4
const CROWN_R = 5.5
const CROWN_RING_R = 9

/** The rungs the y-axis annotates with their "X of 10" odds, so a dot's HEIGHT reads as odds off the
 *  axis (the council-decided synthesis 2026-06-29: a y-axis scale, NOT a per-dot label on all 11 — full
 *  "X of 10" collides at ~44 viewBox units of dot spacing — and NOT a smooth line / 0–100% axis, which
 *  re-introduce the false precision + the "certain" claim the ladder exists to refuse). Stacked in the
 *  left margin, the full frame fits with no horizontal collision. Deliberately STOPS below the ceiling
 *  (rung 9 = "on track"; no rung-10 label) so the headroom above stays the "never certain" signal. */
const Y_AXIS_LABEL_RUNGS = [3, 5, 7] as const

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
  /** The on-track bar's label (e.g. "on track") — a quiet y-axis-margin anchor beside its bar. */
  readonly barLabel: string
  /** The crown's direct tell (e.g. "your date"). */
  readonly crownLabel: string
  /** A mark → its full worded reading (offset + odds + clears/dips/crown), built in copy. ONE
   *  sentence, TWO channels: the per-dot aria-label AND the hover/scrub readout line. */
  readonly describeMark: (mark: CurveMark) => string
}

export interface OddsLadderProps {
  /** The crowned (confirmed-date / window-edge) track. The renderer maps it to marks itself
   *  (curveMarks is pure + viz-local); a no-date track is NOT plotted here (the Honesty Hawk veto —
   *  the mount renders a worded "how close" line instead). */
  readonly track: DateTrackOutcome
  readonly labels: OddsLadderLabels
  /** The U13 wall-time anchor's plan clock — calendar years since the plan was BUILT (council
   *  2026-07-10; renamed U17 §S0.2, it was never "years since your save"): on an aged vault the
   *  marks re-base to years-from-today and already-passed stop-years drop (agedLadderMarks — the
   *  ONE re-base seam; ticks, aria, and the scrub readout all read the re-based marks). 0 (every
   *  fresh session) is the reference identity. The crown-arrived withdraw (the crown has passed —
   *  `offsetHasPassed`) is the MOUNT's law — this renderer is never mounted in that state. */
  readonly yearsSincePlanBuilt?: number
}

export function OddsLadder({ track, labels, yearsSincePlanBuilt = 0 }: OddsLadderProps) {
  const reduce = useReducedMotion() ?? false
  // Draw (fade) ONCE; a later render (a tier re-grade) updates dot positions in place, never replays
  // the fade. Reduced motion → no fade, the final DOM identical.
  const hasDrawn = useRef(false)
  useEffect(() => {
    hasDrawn.current = true
  }, [])
  const firstDraw = !hasDrawn.current

  // Filter-before-geometry (council 2026-07-10): the aged re-base trims passed stop-years at the
  // mark ARRAY, then the domain derives from the SURVIVORS' display offsets — a negative offset
  // reaching xForOffset would silently clamp to the left edge ("today"), a lie.
  const marks = agedLadderMarks(curveMarks(track), yearsSincePlanBuilt)
  const domainMax = domainMaxYears(marks.map((m) => m.offsetYears))

  // The scrub (the band's grammar, simplified — no enlarge modal to share touch with): pointer
  // move/down snaps to the nearest offset; leave clears for mouse/pen, a touch stays PINNED so a
  // phone reader can study the line (the next tap re-scrubs). State lives here so a remount (the
  // tiered re-grade) resets a stale readout — insight 047's discipline.
  const [scrubIdx, setScrubIdx] = useState<number | null>(null)
  const locate = (e: React.PointerEvent<SVGRectElement>): number | null => {
    // jsdom's SVG stubs OMIT getScreenCTM entirely (not just return null) — feature-check first.
    const ctm = typeof e.currentTarget.getScreenCTM === 'function' ? e.currentTarget.getScreenCTM() : null
    if (!ctm) return null // not laid out — never a NaN index
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return nearestOffsetIndex(p.x, marks.map((m) => m.offsetYears), domainMax)
  }
  const onScrub = (e: React.PointerEvent<SVGRectElement>) => {
    const i = locate(e)
    if (i !== null) setScrubIdx(i)
  }
  const onLeave = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType !== 'touch') setScrubIdx(null)
  }
  const scrubbed = scrubIdx === null ? null : (marks[scrubIdx] ?? null)

  return (
    <figure className="ladder-figure">
      {/* The reserved readout (insight 035 — the box NEVER changes height): every mark's sentence
          renders STACKED in one grid cell, visibility-hidden except the scrubbed one, so the box
          is always exactly as tall as the LONGEST reading wraps at the CURRENT width — a fixed
          em-reserve was one line short and the page jumped on every hover (Briggsy, 2026-07-03).
          aria-hidden: every dot's SAME sentence already lives in the a11y tree as its aria-label —
          this is the pointer channel of one single-sourced reading. */}
      <p className="ladder-readout" aria-hidden="true">
        {marks.map((m, i) => (
          <span key={m.planOffsetYears} className="ladder-readout__line" data-active={i === scrubIdx || undefined}>
            {labels.describeMark(m)}
          </span>
        ))}
      </p>
      <svg
        className="ladder-svg"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={labels.caption}
      >
        <LadderFrame barLabel={labels.barLabel} />
        <LadderYAxis formatOdds={labels.formatOdds} />
        <motion.g
          initial={firstDraw && !reduce ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : DRAW_S, ease: EASE_OUT }}
        >
          {marks.map((m) => (
            // Keyed on the DURABLE plan offset: display re-bases, identity doesn't (council
            // 2026-07-10 — a re-key would replay the draw-once fade, insight 047).
            <LadderMark key={m.planOffsetYears} mark={m} domainMax={domainMax} labels={labels} />
          ))}
        </motion.g>
        <LadderXAxis marks={marks} domainMax={domainMax} labels={labels} />
        {/* the live scrub rule — SOLID (reads as "where I'm pointing", not a named moment) + the
            transparent capture surface, topmost so no dot creates a dead zone. */}
        <g className="ladder-scrub" aria-hidden="true">
          {scrubbed !== null && (
            <line
              className="ladder-scrub-rule"
              x1={xForOffset(scrubbed.offsetYears, domainMax)}
              y1={PLOT.top}
              x2={xForOffset(scrubbed.offsetYears, domainMax)}
              y2={PLOT.bottom}
            />
          )}
          <rect
            className="ladder-scrub-capture"
            x={PLOT.left}
            y={PLOT.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="transparent"
            onPointerMove={onScrub}
            onPointerDown={onScrub}
            onPointerLeave={onLeave}
          />
        </g>
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
          so clearing dots sit visibly above it and failing dots below. Its label is a QUIET y-axis
          anchor in the left margin (the same family + styling as the "X of 10" rung anchors below
          it — the margin at rung 8.5 is structurally free). The two earlier in-plot placements both
          collided with real curves (cold-read 2026-07-03). */}
      <line className="ladder-bar" x1={PLOT.left} y1={BAR_Y} x2={PLOT.right} y2={BAR_Y} />
      <text className="ladder-yaxis-label ladder-droppable-label" x={PLOT.left - 8} y={BAR_Y + 4} textAnchor="end">
        {barLabel}
      </text>
    </g>
  )
}

/* ── the y-axis odds scale: a few "X of 10" anchors in the left margin so each dot's HEIGHT reads as
   odds off the axis (no per-dot clutter, no smooth line, no 0–100% / certainty). Decorative — the
   per-mark a11y already speaks each dot's odds — so aria-hidden, and droppable on the narrowest drawer. */
function LadderYAxis({ formatOdds }: { formatOdds: (rung: number) => string }) {
  return (
    <g className="ladder-yaxis" textAnchor="end" aria-hidden="true">
      {Y_AXIS_LABEL_RUNGS.map((rung) => (
        <text
          key={rung}
          className="ladder-yaxis-label ladder-droppable-label"
          x={PLOT.left - 8}
          y={yForRung(rung) + 4}
        >
          {formatOdds(rung)}
        </text>
      ))}
    </g>
  )
}

/* ── one mark: a dot whose EMPHASIS encodes its state (crown ringed · durable clears filled · every
   non-durable dot quiet/faint at its TRUE rung), color redundant ──────────────────────────────── */
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
    // cleared-then-dipped (the non-monotone signature): drawn at its TRUE above-bar rung — the
    // position never lies — but QUIET (the same de-emphasis as below-bar): it is not durable, so
    // it must never read as pickable. The story ("clears at first, but doesn't hold") rides the
    // scrub readout + this dot's aria sentence + the first-frame hero note — the 2026-07-03
    // cold-read killed the open-dot + floating-label riddle.
    return (
      <g role="img" aria-label={desc}>
        <circle className="ladder-dot ladder-dot--dip" cx={x} cy={y} r={QUIET_R} />
      </g>
    )
  }

  // a plain clearing dot: FILLED only at-or-after the crown (durable); a pre-crown clear cannot
  // exist (it would be a dip by construction). Below-bar: smaller, faint — context, de-emphasized.
  const cls = mark.clears ? 'ladder-dot--clears' : 'ladder-dot--below'
  return (
    <g role="img" aria-label={desc}>
      <circle className={`ladder-dot ${cls}`} cx={x} cy={y} r={mark.clears ? MARK_R : QUIET_R} />
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
          key={m.planOffsetYears}
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
