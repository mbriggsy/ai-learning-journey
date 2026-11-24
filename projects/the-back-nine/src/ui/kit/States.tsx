/**
 * src/ui/kit/States.tsx: the three page states every figured screen draws (plan 3.1; ref 2.0 "Loading state", "Stale
 * state", "Empty state"). Every word is the caller's.
 *
 * `StaleBanner`: the last result stays visible and a one-line banner says it is out of date, naming what changed and
 * when the result was made, with the one action that refreshes it (or opens the fact that moved). A clock icon and the
 * words carry it; it is a polite status, so a screen reader hears it arrive.
 *
 * `EmptyState`: a bold centred sentence saying what the screen waits for (TPAW's rule, ref 2.0), and one button.
 *
 * `LoadingVeil`: no spinner and no skeleton. The old figure fades to 40% while a small "Loading…" sits over it, then the
 * new values come in. Its status region is always mounted, so the words are announced when they land (burned/045: a
 * live region mounted already populated may never be read).
 */
import type { ReactNode } from 'react'
import { History } from 'lucide-react'
import { Button } from './Button'
import { cn } from './cn'

export interface StateAction {
  readonly label: string
  readonly onSelect: () => void
}

export interface StaleBannerProps {
  readonly message: ReactNode
  readonly action?: StateAction
  readonly className?: string
}

export function StaleBanner({ message, action, className }: StaleBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 border border-l-4 border-stone-300 border-l-plum bg-stone-100 px-4 py-3 wide:flex-row wide:items-center',
        className,
      )}
    >
      {/* A div, not a p: a message may be a block of its own (a list of labelled parts), and a p may hold no block. */}
      <div className="flex min-w-0 flex-1 items-start gap-2 text-body text-stone-900">
        <History size={20} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0 text-plum" />
        <div className="min-w-0">{message}</div>
      </div>
      {action !== undefined ? (
        <Button variant="secondary" size="sm" onClick={action.onSelect} className="self-start wide:self-center">
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

export interface EmptyStateProps {
  /** What the screen is waiting for, in one plain sentence. */
  readonly sentence: string
  readonly action?: StateAction
  readonly className?: string
}

export function EmptyState({ sentence, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-6 px-4 py-16 text-center', className)}>
      <p className="max-w-2xl text-chart-title font-semibold text-stone-900">{sentence}</p>
      {action !== undefined ? <Button onClick={action.onSelect}>{action.label}</Button> : null}
    </div>
  )
}

export interface LoadingVeilProps {
  readonly loading: boolean
  /** "Loading…" */
  readonly label: string
  /** The figure or chart that stays visible under the veil. */
  readonly children: ReactNode
  readonly className?: string
}

export function LoadingVeil({ loading, label, children, className }: LoadingVeilProps) {
  return (
    <div className={cn('relative', className)} aria-busy={loading || undefined}>
      <div className={cn('transition-opacity duration-200 ease-settle', loading && 'opacity-40')}>{children}</div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span role="status" className={cn('text-label font-semibold text-stone-600', loading && 'rounded-bar bg-bg/80 px-2')}>
          {loading ? label : null}
        </span>
      </div>
    </div>
  )
}
