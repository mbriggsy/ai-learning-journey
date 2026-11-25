/**
 * src/ui/kit/ProfileCard.tsx: a Profile section's record card (plan 6, RC13; ref 2.4; `rc-shell/dataentry-05.png`,
 * `rc-shell/profile-05.png`, `profile-07.png`). Used by every Profile page (Act 6 · RC13a's Family, Income, Savings; RC13b's
 * Expenses and Goals) and by RC14's stepper.
 *
 * Anatomy, as RightCapital draws it: a plum band (about a quarter of the card) with a large white line icon at the left
 * and the record's kind at the right in small uppercase semibold white (a person's card has no icon); then a
 * `--stone-100` body with the record's name at the top and its label / value rows pinned to the bottom. The whole card
 * is one button that opens the record's drawer (`aria-haspopup="dialog"`).
 *
 * While a drawer is open the selected card's band is `--plum-dark` AND it carries a 2 px plum-dark ring and
 * `aria-current`, and the other cards fade (`dimmed`), so the open record is told by more than a colour. No text is ever
 * cut: the name and the rows wrap and the body grows (`min-h-*`, never a fixed height).
 *
 * `cardId` is stamped as `data-profile-card`: a drawer's close hands focus back to its card by it (the card a drawer
 * just added has no opener to return to), and the e2e arms and the look instrument find a card by it.
 */
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface ProfileCardRow {
  readonly label: string
  readonly value: string
}

export interface ProfileCardProps {
  /** The record's kind, printed in the band ("Salary"); drawn uppercase by CSS, so the words stay as written. */
  readonly kind: string
  /** A lucide icon at 1.5 px, drawn white in the band; absent on a person's card (ref 2.4). */
  readonly icon?: ReactNode
  /** The record's own name ("Pat's salary"). */
  readonly name: string
  readonly rows?: readonly ProfileCardRow[]
  /** A line under the name, before the rows (a stopgap or a state the rows cannot say). */
  readonly note?: string
  readonly selected?: boolean
  readonly dimmed?: boolean
  readonly onOpen: () => void
  readonly cardId?: string
  readonly className?: string
}

export function ProfileCard({ kind, icon, name, rows = [], note, selected = false, dimmed = false, onOpen, cardId, className }: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-current={selected ? 'true' : undefined}
      data-selected={selected || undefined}
      data-profile-card={cardId}
      className={cn(
        'group flex w-full cursor-pointer flex-col text-left transition-opacity duration-200 ease-settle wide:w-72',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink',
        selected && 'outline-2 outline-offset-0 outline-plum-dark',
        dimmed && !selected && 'opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'flex min-h-16 items-center justify-between gap-3 px-5 py-2 text-bg [&_svg]:size-9',
          selected ? 'bg-plum-dark' : 'bg-plum group-hover:bg-plum-dark',
        )}
      >
        <span aria-hidden="true" className="flex shrink-0">
          {icon}
        </span>
        <span className="min-w-0 text-right text-label font-semibold tracking-nav break-words uppercase">{kind}</span>
      </span>
      <span className="flex min-h-40 flex-1 flex-col justify-between gap-4 border border-t-0 border-stone-300 bg-stone-100 px-5 pt-4 pb-5">
        <span className="flex flex-col gap-1">
          <span className="text-body break-words text-stone-900">{name}</span>
          {note !== undefined ? <span className="text-label break-words text-stone-600">{note}</span> : null}
        </span>
        {rows.length > 0 ? (
          <span className="flex flex-col gap-1.5">
            {rows.map((row) => (
              // A value too long to sit beside its label (a sentence, never a figure) wraps under it, the full width, so a
              // card never grows past its column (RC13b: W's and the left-over answer's words).
              <span key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-label text-stone-900">
                <span className="min-w-0 break-words text-stone-600">{row.label}</span>
                <span className="ml-auto min-w-0 max-w-full break-words text-right tabular-nums">{row.value}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  )
}
