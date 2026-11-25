/**
 * src/ui/kit/Card.tsx: `Card`, Snapshot's card (plan 3.1; ref 2.1; `rc-shell/planoverview-03.png`): white, a 1 px `--stone-300` edge,
 * 12 px corners, no shadow, its title in semibold at the top left and an optional action at the top right.
 * (A Profile record card is `ProfileCard.tsx`.)
 */
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface CardProps {
  readonly title?: string
  /** The heading level for the title (a page's cards sit under its h1). */
  readonly headingLevel?: 2 | 3
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  /** A name for the card, stamped as `data-card` (the e2e arms and the look instrument find a card by it). */
  readonly name?: string
}

export function Card({ title, headingLevel = 2, action, children, className, name }: CardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section data-card={name} className={cn('flex flex-col gap-4 rounded-card border border-stone-300 bg-bg p-6', className)}>
      {title !== undefined || action !== undefined ? (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          {title !== undefined ? <Heading className="text-chart-title font-semibold text-stone-900">{title}</Heading> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}
