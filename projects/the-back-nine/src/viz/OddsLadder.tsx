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
 *   - CSP-clean (style-src 'self'): every dynamic svg value is a presentation/geometry ATTRIBUTE
 *     (the vermilion from palette.ts), never an inline style; non-scaling-stroke holds line weight.
 *   - SVG DRAWS, HTML WRITES (council wf_ecbe0ab2-7bb, 2026-09-05): the svg holds the grid, the
 *     bar, the dots and the scrub rule; every word and numeral — the "X of 10" axis, the bar label,
 *     the crown's odds + "your date" tell, the x-axis offsets and caption — is HTML in the chart
 *     text layer (chartText.tsx), sized on the type scale so it renders at the same CSS px on a
 *     358px phone figure and a 576px single-column one (svg text scaled with the viewBox and
 *     measured 7.0–9.7 CSS px). The x-axis block sits in flow under the svg, whose viewBox no
 *     longer reserves a label gutter below the floor.
 *
 * STRING-FREE: every word + numeral arrives via `labels` (src/ui fills from copy.ts); the renderer
 * types no copy and no number — it reads the marks and formats through the injected slots.
 */

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
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
import { ChartText, ChartTextHost, ChartTextLayer, useCollisionLayout, type CtAnchor, type CtStyle } from './chartText'
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

/** The gap between the ringed crown dot's CENTRE and the callout's bottom edge, in viewBox units —
 *  the ring's own radius plus 5 units of air, so the words never graze the halo.
 *
 *  THE RESIDUAL THIS LEAVES, so nobody re-derives it: a crowned date always CLEARS the bar, so its
 *  rung is 9 or 10 (curveMarks: `clears ⟺ rung ≥ 9`, round(8.5) = 9). At rung 10 the anchor is at
 *  `yForRung(10) − 14` = 42, clear ABOVE PLOT.top. At rung 9 it is at 64, i.e. 8 units BELOW
 *  PLOT.top's 56 — so an above-seated rung-9 callout's last line sits 8 units (7.1 px at REAL)
 *  inside the plot, and the scrub rule drawn at the crown's OWN column passes behind that line. It
 *  is a hairline behind a tell, and it is BOUNDED: the callout's bottom is only
 *  `CROWN_GAP − CROWN_RING_R` = 5 units above its own halo ring, and the gate's crown-vs-marks
 *  oracle (e2e/chart-text.spec.ts `assertCrown`) reds the instant it reaches it. Closing it outright
 *  means anchoring at `min(yForRung(rung) − CROWN_GAP, PLOT.top)`, which costs the PHONE arm its
 *  above seat (40.9 px of headroom becomes 35.8, under a 36.6 px callout) — a taste call his eye has
 *  not been asked. Do not "fix" it silently in either direction. */
const CROWN_GAP = CROWN_RING_R + 5

/** Motion timings — mirror band.css's --dur-reveal / --ease-out (numeric for motion). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const DRAW_S = 0.42

/** viewBox → host fractions (the text layer's coordinate system). */
const fx = (x: number): number => x / VIEWBOX.width
const fy = (y: number): number => y / VIEWBOX.height
/** The y-axis label column: end-anchored 8 units left of the axis, as the svg labels were. */
const AXIS_FX = fx(PLOT.left - 8)

/* ── the crown callout's TWO SEATS, decided per WIDTH before paint ──────────────────────────────
 *
 * THE LAW (council wf_1b45326f-9e8, 2026-09-05 → docs/architecture.md §12 "the room is not the
 * ink"; executed on his eye's ruling of temp/cold-read-320, pictures 06 + 07, 2026-09-06): a
 * fraction-authored room bounds a BOX and is silent about the INK, which is rem-fixed. Contain the
 * ink; never widen the room (moving PLOT.top was REJECTED at council — 64 ties by 0.17 px, 68
 * compresses every rung on every arm). Where containment and in-plot seating are jointly
 * unsatisfiable, the words LEAVE the plot for flow reserved at their TALLEST.
 *
 * The BESIDE-the-dot branch died with that ruling: at the ceiling rung the callout used to sit
 * flush against its dot, and "better than 9 in 10" then printed straight across the year-2..5 dots
 * on BOTH the 320 arm and the 1536 laptop (pictures 06 + 07 — crowded on both). ONE rule now
 * serves every rung: ABOVE the ring while the measured headroom holds the callout, else the flow
 * row above the plot. The dot, its ring and the vermilion accent never move — only the words do.
 */

/** Which seat the crown callout takes at the current width. */
export type CrownSeat = 'above' | 'flow'

/** The room a rung's callout has above it, in HOST px: the callout is BOTTOM-anchored at
 *  `yForRung(rung) − CROWN_GAP` viewBox units, and the host renders the full viewBox height, so
 *  that anchor sits exactly this many px below the host's top edge — every one of them is room the
 *  two lines may grow into. Pure; exported for tests. */
export function crownHeadroomPx(rung: number, hostHeightPx: number): number {
  return fy(yForRung(rung) - CROWN_GAP) * hostHeightPx
}

/**
 * The ABOVE seat is legal iff the callout's MEASURED height fits that headroom. One clause, because
 * the callout is a fixed pair of `nowrap` lines on two rem-fixed registers: its height is a function
 * of the reader's font alone, while the headroom is a fraction of a width — so the two cross, and
 * they cross at a different width for every rung.
 *
 * Pure numbers, no DOM — "Exported for tests" exactly like `placeReadoutX` (src/viz/chartText.tsx).
 * Nothing laid out (jsdom, a host with no box yet) keeps the ABOVE seat: the decision is only ever
 * made from real geometry, never from a phantom zero.
 */
export function crownSeat(calloutHeightPx: number, headroomPx: number): CrownSeat {
  if (!(calloutHeightPx > 0) || !(headroomPx > 0)) return 'above'
  return calloutHeightPx <= headroomPx ? 'above' : 'flow'
}

/** The callout's horizontal anchor, by EDGE PROXIMITY — the band's own labelAnchor rule: a crown
 *  near the right edge END-anchors so its words stay inside the figure, a left-edge one
 *  START-anchors, everything between is centred (28 units ≈ half a two-line callout's width). ONE
 *  rule for BOTH seats, so the words hang off the same edge whichever seat they take. */
function crownAnchorFor(x: number): CtAnchor {
  return x > PLOT.right - 28 ? 'end' : x < PLOT.left + 28 ? 'start' : 'middle'
}

/**
 * Decide the crown's seat before paint, and again on a host/probe resize and once on
 * `document.fonts.ready` (a webfont swap re-sizes the callout's lines without resizing the host —
 * the same reason both chart-text layout hooks carry it).
 *
 * The height is ALWAYS read off the row's hidden PROBE, never off whichever callout happens to be
 * on screen: the probe is in the DOM in both seats, so one surface produces the decision in both
 * and the seat cannot depend on the seat that preceded it. Re-deciding therefore cannot oscillate —
 * and the row growing in the flow seat never moves the host, whose height follows its width alone.
 */
function useCrownSeat(
  hostRef: RefObject<HTMLElement | null>,
  probeRef: RefObject<HTMLElement | null>,
  rung: number | null,
  deps: readonly unknown[],
): CrownSeat {
  const [seat, setSeat] = useState<CrownSeat>('above')
  useLayoutEffect(() => {
    const host = hostRef.current
    const probe = probeRef.current
    if (!host || !probe || rung === null) return
    const decide = () => {
      const hostH = host.getBoundingClientRect().height
      if (hostH === 0) return // not laid out (jsdom) — never decide from a phantom geometry
      setSeat(crownSeat(probe.getBoundingClientRect().height, crownHeadroomPx(rung, hostH)))
    }
    decide()
    let live = true
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (fonts) void fonts.ready.then(() => live && decide())
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false
      }
    }
    const ro = new ResizeObserver(() => decide())
    ro.observe(host)
    ro.observe(probe)
    return () => {
      live = false
      ro.disconnect()
    }
    // the caller names what moves the ink (the composed words) in `deps`
  }, [hostRef, probeRef, rung, ...deps])
  return seat
}

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
  const crown = marks.find((m) => m.isCrown)

  // THE CROWN'S SEAT (his eye, 2026-09-06): the callout's words sit above their ringed dot only
  // while the measured headroom holds them; otherwise they leave for the reserved row above the
  // plot. The row renders in BOTH seats (collapsed in the above seat) because its hidden probe is
  // the ONE surface the decision is measured from.
  const hostRef = useRef<HTMLSpanElement>(null)
  const crownProbeRef = useRef<HTMLSpanElement>(null)
  const crownX = crown === undefined ? null : xForOffset(crown.offsetYears, domainMax)
  const crownOdds = crown === undefined ? '' : labels.formatOdds(crown.rung)
  const seat = useCrownSeat(hostRef, crownProbeRef, crown?.rung ?? null, [crownOdds, labels.crownLabel])

  return (
    // `data-crown-seat` is the render hook the chart-text gate reads the decision from — the seat is
    // measured before paint and can only be checked against the geometry that produced it.
    <figure className="ladder-figure" data-crown-seat={crown === undefined ? undefined : seat}>
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
      {crown !== undefined && crownX !== null && (
        <CrownRow
          seat={seat}
          fxValue={fx(crownX)}
          anchor={crownAnchorFor(crownX)}
          odds={crownOdds}
          tell={labels.crownLabel}
          ref={crownProbeRef}
        />
      )}
      <ChartTextHost className="ladder-plot" ref={hostRef}>
        <svg
          className="ladder-svg"
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={labels.caption}
        >
          <LadderFrame />
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
        <ChartTextLayer className="ladder-text">
          {/* the y-axis odds scale: a few "X of 10" anchors in the left margin so each dot's HEIGHT
              reads as odds off the axis (no per-dot clutter, no smooth line, no 0–100% / certainty).
              Decorative — the per-mark a11y already speaks each dot's odds. */}
          {Y_AXIS_LABEL_RUNGS.map((rung) => (
            <ChartText key={rung} className="ladder-yaxis-label" fx={AXIS_FX} fy={fy(yForRung(rung))} anchor="end" valign="middle">
              {labels.formatOdds(rung)}
            </ChartText>
          ))}
          {/* THE ON-TRACK BAR's label — a QUIET y-axis anchor in the left margin (the same family as
              the "X of 10" rung anchors; the margin at rung 8.5 is structurally free — both earlier
              in-plot placements collided with real curves, cold-read 2026-07-03). */}
          <ChartText className="ladder-bar-label" fx={AXIS_FX} fy={fy(BAR_Y)} anchor="end" valign="middle">
            {labels.barLabel}
          </ChartText>
          {/* the callout only ever renders in the ABOVE seat; in the FLOW seat the same two lines
              are the row's, above the plot — never both, so the crown is never read twice. */}
          {crown !== undefined && crownX !== null && seat === 'above' && (
            <CrownCallout rung={crown.rung} x={crownX} odds={crownOdds} tell={labels.crownLabel} />
          )}
        </ChartTextLayer>
      </ChartTextHost>
      <LadderXAxis marks={marks} domainMax={domainMax} labels={labels} />
    </figure>
  )
}

/* ── the frame: the rung detent grid, the y-axis, the floor, and the on-track bar ─────────────── */
function LadderFrame() {
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
          so clearing dots sit visibly above it and failing dots below. Its label is HTML (text layer). */}
      <line className="ladder-bar" x1={PLOT.left} y1={BAR_Y} x2={PLOT.right} y2={BAR_Y} />
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
    // the durable date: the reserved vermilion accent + a ring (halo); the direct "your date" tell +
    // its odds are HTML in the text layer (CrownCallout). Vermilion is a presentation attribute from
    // palette (CSP-safe), redundant with shape.
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

/** The crown's ABOVE seat: the two-line callout — its odds (the strong register) over the direct
 *  "your date" tell — stacked ABOVE the ringed dot, bottom-anchored {@link CROWN_GAP} units clear of
 *  the halo and anchored by {@link crownAnchorFor}'s edge-proximity rule. ONE rule for every rung
 *  since 2026-09-06: the BESIDE-the-dot ceiling branch is gone (it printed across the year-2..5 dots
 *  on every arm — his eye, temp/cold-read-320 pictures 06 + 07). This renders only where
 *  {@link crownSeat} measured room for it; otherwise the words are in {@link CrownRow}. */
function CrownCallout({ rung, x, odds, tell }: { rung: number; x: number; odds: string; tell: string }) {
  return (
    <ChartText
      className="ladder-crown"
      fx={fx(x)}
      fy={fy(yForRung(rung) - CROWN_GAP)}
      anchor={crownAnchorFor(x)}
      valign="bottom"
      register="sm"
      strong
    >
      <span className="ladder-crown__odds">{odds}</span>
      <span className="ladder-crown__tell">{tell}</span>
    </ChartText>
  )
}

/**
 * The crown's FLOW seat: the same two lines in a reserved row directly above the svg, held at the
 * crown's own x under the same edge-proximity anchor — so the words still point at the date they
 * name, they simply stopped standing on the dots. The row RESERVES its height at both seats' worth
 * of ink and never changes it (insight 035; `.ladder-readout` above it is the shipped precedent),
 * so the plot cannot move under a reader who resizes into or out of the flow seat.
 *
 * The PROBE is why the row renders even in the ABOVE seat, where it reserves nothing: an empty,
 * hidden copy of the callout is the ONE surface {@link useCrownSeat} measures, in both seats
 * (`display: none` measures zero, and the seat could never be re-decided from it). Out of flow and
 * never painted — it measures, it never renders.
 *
 * STRING-FREE: both words arrive from the caller (labels → copy.ts), as everywhere else here.
 */
function CrownRow({
  seat,
  fxValue,
  anchor,
  odds,
  tell,
  ref,
}: {
  readonly seat: CrownSeat
  readonly fxValue: number
  readonly anchor: CtAnchor
  readonly odds: string
  readonly tell: string
  readonly ref?: React.Ref<HTMLSpanElement>
}) {
  const rowStyle: CtStyle = { '--ct-rows': 1 }
  const itemStyle: CtStyle = { '--fx': fxValue }
  return (
    <span className="ct-block ladder-crown-row" data-seat={seat} aria-hidden="true" style={rowStyle}>
      <span className="ladder-crown ladder-crown-row__probe" data-ladder-crown-probe="" ref={ref}>
        <span className="ladder-crown__odds">{odds}</span>
        <span className="ladder-crown__tell">{tell}</span>
      </span>
      {seat === 'flow' && (
        <span className={`ct-block__item ladder-crown ladder-crown-row__item ct-text--${anchor}`} style={itemStyle}>
          <span className="ladder-crown__odds">{odds}</span>
          <span className="ladder-crown__tell">{tell}</span>
        </span>
      )}
    </span>
  )
}

/* ── the household-clock x-axis (HTML in flow under the svg): a tick label under each evaluated
   offset + the caption. Ticks that would overprint a neighbour HIDE (the "today" tick has priority
   over its numeral neighbours); the a11y tree is untouched — every mark speaks its own offset. ── */
function LadderXAxis({
  marks,
  domainMax,
  labels,
}: {
  marks: readonly CurveMark[]
  domainMax: number
  labels: OddsLadderLabels
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const ticks = marks.map((m) => ({ key: m.planOffsetYears, fx: fx(xForOffset(m.offsetYears, domainMax)), text: labels.formatOffset(m.offsetYears), today: m.offsetYears === 0 }))
  useCollisionLayout(ref, 'hide', [ticks.map((t) => `${t.key}:${t.fx}:${t.text}`).join('|')])
  const blockStyle: CtStyle = { '--ct-rows': 1 }
  return (
    <span className="ladder-xaxis" aria-hidden="true">
      <span className="ct-block ct-block--line ladder-xticks" ref={ref} style={blockStyle}>
        {ticks.map((t) => {
          const s: CtStyle = { '--fx': t.fx }
          return (
            <span key={t.key} className="ct-block__item ladder-xtick ct-text--middle" data-ct-item={String(t.key)} data-ct-priority={t.today ? '' : undefined} style={s}>
              {t.text}
            </span>
          )
        })}
      </span>
      <span className="ladder-xcaption">{labels.xAxisLabel}</span>
    </span>
  )
}
