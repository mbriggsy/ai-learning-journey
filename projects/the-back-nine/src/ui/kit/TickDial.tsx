/**
 * src/ui/kit/TickDial.tsx: Snapshot's small stat ring (plan 3.1; ref 2.1; `rc-shell/planoverview-03.png`): a full ring
 * of short radial ticks in two blues, top to bottom, a bold figure and its caption in the middle. The ticks are
 * decoration (`aria-hidden`); the figure and the caption are HTML text and carry the reading, their words the caller's.
 */
import { useId, type ReactNode } from 'react'
import { cn } from './cn'
import { svgId } from './svgId'

const DIAL_BOX = 144
const DIAL_STROKE = 12
const DIAL_RADIUS = (DIAL_BOX - DIAL_STROKE) / 2
const DIAL_TICKS = 90

export interface TickDialProps {
  /** The bold figure ("~4.1%"). */
  readonly value: ReactNode
  readonly caption: ReactNode
  readonly className?: string
}

export function TickDial({ value, caption, className }: TickDialProps) {
  const id = svgId(useId(), 'b9-dial')
  const c = DIAL_BOX / 2
  const period = (2 * Math.PI * DIAL_RADIUS) / DIAL_TICKS
  return (
    <div className={cn('relative size-36 shrink-0', className)}>
      <svg viewBox={`0 0 ${DIAL_BOX} ${DIAL_BOX}`} className="size-full" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={DIAL_BOX}>
            <stop offset="0" className="[stop-color:var(--color-blue)]" />
            <stop offset="1" className="[stop-color:var(--color-sky)]" />
          </linearGradient>
        </defs>
        <circle
          cx={c}
          cy={c}
          r={DIAL_RADIUS}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={DIAL_STROKE}
          strokeDasharray={`${period * 0.3} ${period * 0.7}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-5 text-center">
        <span className="text-chart-title font-semibold text-stone-900 tabular-nums">{value}</span>
        <span className="text-label text-stone-900">{caption}</span>
      </div>
    </div>
  )
}
