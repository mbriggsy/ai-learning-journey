import { useRef } from 'react'
import type { ProjectReport } from '@/types'
import { formatBytes } from '@/lib/format'
import { buildDonutSegments, totalMediaBytes, type DonutSegment } from '@/lib/donut'
import { gsap, useGSAP, ScrollTrigger } from '@/motion/gsap-context'
import { ease } from '@/motion/easings'
import { duration } from '@/motion/tokens'
import { prefersReducedMotion } from '@/motion/reduced-motion'
import styles from './AssetDonut.module.css'

const R = 40
const CX = 50
const CY = 50
const CIRCUMFERENCE = 2 * Math.PI * R

// C2 PLACEHOLDER PALETTE (Phase 9 pins a proper mode-aware sequential palette). Differentiated
// by LUMINANCE, not hue — meaning rides the labeled legend, never color (Briggsy is color blind).
// The dominant slice gets the warm accent; the rest are a value ramp on --text-primary.
type Swatch = { stroke: string; opacity: number }
const PALETTE: ReadonlyArray<Swatch> = [
  { stroke: 'var(--accent-primary)', opacity: 1 },
  { stroke: 'var(--text-primary)', opacity: 0.9 },
  { stroke: 'var(--text-primary)', opacity: 0.62 },
  { stroke: 'var(--text-primary)', opacity: 0.42 },
  { stroke: 'var(--text-primary)', opacity: 0.28 },
]
const FALLBACK_SWATCH: Swatch = { stroke: 'var(--text-primary)', opacity: 1 }
const paletteAt = (i: number): Swatch => PALETTE[i % PALETTE.length] ?? FALLBACK_SWATCH

/**
 * Movement 4 — the AssetDonut, the page's one motion flourish (Phase 5 Decision 5). Stroked
 * `<circle>` arcs (NOT filled wedges — DrawSVGPlugin animates stroke-dash and needs a visible
 * stroke). Dash math on the REAL circumference `2πr`, never `pathLength` — so the C2 static
 * resting state and the C3 DrawSVG animated state agree on arc length. C2 renders every arc
 * fully drawn; C3 layers the staggered draw-on.
 *
 * Tells the media-VOLUME story (bytes); the composition inventory tells the breadth story
 * (counts) — complementary, no redundancy. Omits zero kinds; the page omits the whole donut
 * when all media is zero.
 */
export function AssetDonut({ assetBytesByKind }: { assetBytesByKind: ProjectReport['assetBytesByKind'] }) {
  const donutRef = useRef<HTMLDivElement>(null)
  const segments = buildDonutSegments(assetBytesByKind)
  const total = totalMediaBytes(assetBytesByKind)

  // SVG carries the whole breakdown for screen readers (the visual is decorative on its own).
  const ariaLabel = `Media by type: ${segments.map((s) => `${s.label} ${formatBytes(s.bytes)}`).join(', ')}.`

  // DrawSVG reveal (C3) — the page's one flourish. Reduced-motion / dead-layer → the C2 static
  // arcs + visible legend stand (CSS default). The GLOBAL refresh self-heal lives on the page's
  // block-reveal useGSAP, so a donut above the fold on a deep-link still fires on that refresh.
  useGSAP(
    () => {
      const root = donutRef.current
      if (!root || prefersReducedMotion()) return // C2 static donut + legend stay visible
      const arcs = gsap.utils.toArray<SVGCircleElement>('[data-donut-arc]', root)
      const legend = gsap.utils.toArray<HTMLElement>('[data-donut-legend]', root)
      // Hide the center total alongside the legend so the whole donut reveals as ONE moment —
      // otherwise the static center number floats in an empty ring before the arcs draw.
      const center = gsap.utils.toArray<HTMLElement>('[data-donut-center]', root)
      if (arcs.length === 0) return

      // Hidden state in JS (P0 — never CSS): collapse each arc to zero length, hide legend+center.
      gsap.set(arcs, { drawSVG: '0% 0%' })
      gsap.set([...legend, ...center], { autoAlpha: 0 })

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline()
          // Each arc draws to its own segment range (start%→end% of the real circumference);
          // the per-segment stagger communicates "distinct buckets" (emil).
          arcs.forEach((arc, i) => {
            const s = arc.dataset.drawStart ?? '0'
            const e = arc.dataset.drawEnd ?? '0'
            tl.to(arc, { drawSVG: `${s}% ${e}%`, duration: duration.reveal, ease: ease.arrive }, i * 0.08)
          })
          // Center total + legend fade in AFTER the ring settles (not synced per-segment).
          tl.to([...center, ...legend], { autoAlpha: 1, duration: 0.5, ease: ease.arrive }, '>-0.15')
        },
      })
      return () => trigger.kill()
    },
    { scope: donutRef, dependencies: [] },
  )

  return (
    <div className={styles.donut} ref={donutRef}>
      <div className={styles.ring}>
        <svg
          className={styles.svg}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Rotate so 0% sits at 12 o'clock; segments laid head-to-tail by dash offset. */}
          <g transform={`rotate(-90 ${CX} ${CY})`}>
            {segments.map((seg, i) => (
              <Arc key={seg.key} seg={seg} palette={paletteAt(i)} />
            ))}
          </g>
        </svg>
        <div className={styles.center} data-donut-center aria-hidden>
          <span className={styles.centerValue}>{formatBytes(total)}</span>
          <span className={styles.centerLabel}>generated</span>
        </div>
      </div>

      <ul className={styles.legend} data-donut-legend>
        {segments.map((seg, i) => (
          <li key={seg.key} className={styles.legendRow}>
            <span
              className={styles.swatch}
              style={{ background: paletteAt(i).stroke, opacity: paletteAt(i).opacity }}
              aria-hidden
            />
            <span className={styles.legendLabel}>{seg.label}</span>
            <span className={`${styles.legendBytes} tabular`}>{formatBytes(seg.bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Arc({ seg, palette }: { seg: DonutSegment; palette: { stroke: string; opacity: number } }) {
  const dash = seg.sweep * CIRCUMFERENCE
  return (
    <circle
      data-donut-arc
      // C3 DrawSVG targets (percent of the real circumference) — read by the reveal timeline so
      // motion never depends on the segments array's render order matching the DOM.
      data-draw-start={seg.start * 100}
      data-draw-end={(seg.start + seg.sweep) * 100}
      cx={CX}
      cy={CY}
      r={R}
      fill="none"
      stroke={palette.stroke}
      strokeOpacity={palette.opacity}
      strokeWidth={14}
      strokeLinecap="butt"
      // C2 static resting state: real-circumference dash (draw `dash`, gap the rest; offset to the
      // segment's start angle). DrawSVG resolves its %s against the SAME 2πr, so the animated rest
      // state lands here exactly. reduced-motion / dead-layer renders this fully-drawn arc.
      strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
      strokeDashoffset={-seg.start * CIRCUMFERENCE}
    />
  )
}
