/**
 * src/ui/kit/Card.tsx: two card shapes.
 *
 * `Card` is Snapshot's card (plan 3.1; ref 2.1; `rc-shell/planoverview-03.png`): white, a 1 px `--stone-300` edge,
 * 12 px corners, no shadow, its title in semibold at the top left and an optional action at the top right.
 *
 * `ProfileCard` is a Profile section's record card (ref 2.4; `rc-shell/vimeo-income_add-a-salary.jpg`): a plum band
 * with a white icon at the left and the record's kind in small uppercase semibold at the right, then a `--stone-100`
 * body with the record's name and its label/value rows. The whole card is one button that opens the record's drawer.
 * The selected card's band is `--plum-dark` AND it carries a 2 px plum-dark ring and `aria-current`; while a drawer is
 * open the other cards fade (`dimmed`), so the open record is told by more than a colour.
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

export interface ProfileCardRow {
  readonly label: string
  readonly value: string
}

export interface ProfileCardProps {
  /** The record's kind, printed in the band ("Salary"); drawn uppercase by CSS, so the words stay as written. */
  readonly kind: string
  readonly icon: ReactNode
  /** The record's own name ("Pat's salary"). */
  readonly name: string
  readonly rows?: readonly ProfileCardRow[]
  readonly selected?: boolean
  readonly dimmed?: boolean
  readonly onOpen: () => void
  readonly className?: string
}

export function ProfileCard({ kind, icon, name, rows = [], selected = false, dimmed = false, onOpen, className }: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      data-selected={selected || undefined}
      className={cn(
        'flex w-full cursor-pointer flex-col text-left transition-opacity duration-200 ease-settle wide:w-72',
        selected && 'outline-2 outline-offset-0 outline-plum-dark',
        dimmed && !selected && 'opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-14 items-center justify-between gap-3 px-4 text-bg [&_svg]:size-8',
          selected ? 'bg-plum-dark' : 'bg-plum',
        )}
      >
        <span aria-hidden="true" className="flex">
          {icon}
        </span>
        <span className="text-label font-semibold tracking-nav uppercase">{kind}</span>
      </span>
      <span className="flex min-h-40 flex-col justify-between gap-4 border border-t-0 border-stone-300 bg-stone-100 p-4">
        <span className="text-body text-stone-900">{name}</span>
        {rows.length > 0 ? (
          <span className="flex flex-col gap-1">
            {rows.map((row) => (
              <span key={row.label} className="flex justify-between gap-3 text-label text-stone-600">
                <span>{row.label}</span>
                <span className="text-stone-900 tabular-nums">{row.value}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  )
}
