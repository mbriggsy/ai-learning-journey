/**
 * src/ui/kit/Ring.tsx: the plan's ring (plan 3.1 and 4.0 "The ring"; ref 3.3): about 184 px across with an 8 px
 * stroke (160 px in compact mode), our own SVG, never a chart library's gauge. The arc starts at 3 o'clock and runs clockwise (an SVG circle's stroke starts there), filling `value`/10 of the
 * circle; the blue-to-green gradient runs top to bottom and carries NO meaning; the unfilled arc is light grey; no zones
 * and no threshold tick. A value of 0 draws an empty arc (the already-failing reading); no value draws no arc at all
 * (indeterminate). The centre words and the caption are HTML laid over the SVG, so they follow the font law and are
 * read as text; they are the caller's (`ringReading.ts`, RC3, through `copy.ts`'s slots: "better than 9 in 10", never a
 * bare "10 of 10" and never `${n} of 10`). The SVG is decoration (`aria-hidden`): the words carry the reading.
 */
import { useId, type ReactNode } from 'react'
import { cn } from './cn'
import { svgId } from './svgId'

const RING_BOX = 184
const RING_STROKE = 8
/** The ring's radius: the stroke sits inside the box. */
export const RING_RADIUS = (RING_BOX - RING_STROKE) / 2
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** The arc's drawn length for a count out of 10, clamped to the circle. */
export function ringArcLength(value: number): number {
  return (RING_CIRCUMFERENCE * Math.min(10, Math.max(0, value))) / 10
}

export interface RingProps {
  /** The count out of 10 the arc fills to; absent draws no arc (indeterminate). */
  readonly value: number | undefined
  /** The big words in the middle. */
  readonly centre?: ReactNode
  /** The outcome words under them. */
  readonly caption?: ReactNode
  readonly className?: string
}

/** A centre longer than a count ("9 of 10", seven characters) is words: the over-funded ceiling's "better than 9 in
 *  10". At the count's size those wrapped to three lines and, with the caption under them, spilled past the ring
 *  (measured on `?seed=surplus`, Snapshot and Probability, 2026-11-24), so words take the caption's size, bolded. */
export const RING_WORDY_CHARS = 7

export function Ring({ value, centre, caption, className }: RingProps) {
  const id = svgId(useId(), 'b9-ring')
  const wordy = typeof centre === 'string' && centre.length > RING_WORDY_CHARS
  const c = RING_BOX / 2
  return (
    <div className={cn('relative size-46 shrink-0 compact:size-40', className)}>
      <svg viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} className="size-full" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={RING_BOX}>
            <stop offset="0" className="[stop-color:var(--color-blue)]" />
            <stop offset="1" className="[stop-color:var(--color-green)]" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-ring-track" data-ring="track" />
        {value !== undefined ? (
          <circle
            cx={c}
            cy={c}
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={RING_STROKE}
            strokeLinecap="butt"
            strokeDasharray={`${ringArcLength(value)} ${RING_CIRCUMFERENCE}`}
            data-ring="arc"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-5 text-center text-balance">
        {centre !== undefined ? (
          <span
            className={cn('font-semibold text-stone-900 tabular-nums', wordy ? 'text-intro' : 'text-ring compact:text-ring-compact')}
            data-ring-centre={wordy ? 'words' : 'count'}
          >
            {centre}
          </span>
        ) : null}
        {caption !== undefined ? <span className="text-intro text-plum">{caption}</span> : null}
      </div>
    </div>
  )
}
