/**
 * src/ui/kit/Tray.tsx: the Action Items tray (plan 3.1; ref 2.8; `rc-analysis/action-items__cleanshot-2024-10-28-at-
 * 15-44-44-copy.png`): opened by the panel's handle, it grows the page downward on `--stone-100` with column groups side
 * by side (`TrayColumn`, each headed by the two plans' names over a thin rule), sections in semibold (`TraySection`),
 * and rows (`TrayRow`): the name (cut with an ellipsis), the control (a slider and a box, or a picker), and the
 * compared plan's value as plain text at the right. Its footer (`TrayFooter`) is Reset, Edit and Refresh at the right.
 *
 * The changed value's mark lives on the control (`MoneyInput`/`Select` `changed`: blue-ink words on a pale blue box,
 * medium weight and a 2 px left bar), and the compared value beside it is a second cue that needs no colour. A row
 * added only in this what-if gets a green dot with a "+" in it AND words a screen reader reads (`added`).
 *
 * On the phone the tray is a full-height bottom sheet instead (ref 2.21), on Base UI's Dialog: the same content under a
 * header with its name and an X. Motion: on a wide window the tray opens by Base UI's Collapsible height transition
 * (300 ms on the drawer curve); the sheet slides up; both are instant (the tray) or a fade (the sheet) under reduced
 * motion.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Dialog } from '@base-ui/react/dialog'
import { Plus, RotateCcw, X } from 'lucide-react'
import { Button } from './Button'
import { cn } from './cn'
import { useWide } from './useWide'

export interface TrayProps {
  /** The id the panel's handle names in `aria-controls`. */
  readonly id: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** The sheet's title on the phone (the handle's words). */
  readonly title: string
  /** The phone sheet's X. */
  readonly closeLabel: string
  readonly children: ReactNode
  readonly footer?: ReactNode
}

export function Tray({ id, open, onOpenChange, title, closeLabel, children, footer }: TrayProps) {
  const wide = useWide()
  const content = (
    <>
      <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-2 laptop:gap-8">{children}</div>
      {footer !== undefined ? <div className="mt-8">{footer}</div> : null}
    </>
  )
  if (wide) {
    return (
      <Collapsible.Root open={open} onOpenChange={onOpenChange}>
        <Collapsible.Panel
          id={id}
          data-tray=""
          className={cn(
            'h-(--collapsible-panel-height) overflow-hidden bg-stone-100',
            'transition-[height] duration-300 ease-drawer data-ending-style:duration-200',
            'data-starting-style:h-0 data-ending-style:h-0 motion-reduce:transition-none',
          )}
        >
          <div className="px-8 py-8 laptop:px-10">{content}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    )
  }
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal className="rc-root">
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-900/35 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Dialog.Popup
          id={id}
          data-tray=""
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex h-dvh flex-col bg-stone-100 outline-none',
            'transition-[translate,opacity] duration-300 ease-drawer data-ending-style:duration-200',
            'motion-safe:data-starting-style:translate-y-full motion-safe:data-ending-style:translate-y-full',
            'motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0',
          )}
        >
          <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-stone-300 bg-stone-200 py-2 pr-2 pl-4">
            <Dialog.Title className="min-w-0 flex-1 break-words text-body font-semibold tracking-nav text-stone-900 uppercase">
              {title}
            </Dialog.Title>
            <Dialog.Close aria-label={closeLabel} className="flex size-10 cursor-pointer items-center justify-center rounded-control text-stone-900">
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">{content}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export interface TrayColumnProps {
  /** The edited side's name ("This what-if") and the compared side's ("Your plan"). */
  readonly editedLabel: string
  readonly comparedLabel: string
  readonly children: ReactNode
}

/** The compared side's name, for the rows under it: a screen reader reads each compared figure with the plan it is. */
const ComparedName = createContext<string | null>(null)

/** One column group: the two plans' names over a thin rule, then its sections. Rows line up on a shared grid. */
export function TrayColumn({ editedLabel, comparedLabel, children }: TrayColumnProps) {
  return (
    <ComparedName.Provider value={comparedLabel}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,auto)] content-start gap-x-6 wide:grid-cols-[minmax(6rem,1fr)_auto_minmax(5rem,11rem)] wide:gap-x-4">
        <div className="col-span-full grid grid-cols-subgrid border-b border-stone-300 pb-3 text-body text-stone-900">
          <span aria-hidden="true" className="hidden wide:block" />
          <span className="text-center">{editedLabel}</span>
          <span className="text-right">{comparedLabel}</span>
        </div>
        {children}
      </div>
    </ComparedName.Provider>
  )
}

export function TraySection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="col-span-full grid grid-cols-subgrid border-b border-stone-300 py-4">
      <h3 className="col-span-full pb-2 text-body font-semibold text-stone-900">{title}</h3>
      {children}
    </section>
  )
}

export interface TrayRowProps {
  /** The row's name (a link, on a row added only in this what-if). */
  readonly label: ReactNode
  /** The edited side's control: a slider and a box, or a picker. */
  readonly control: ReactNode
  /** The compared plan's value, as plain text. */
  readonly compared: ReactNode
  /** Set on a row added only in this what-if: the words a screen reader reads for its green "+" dot. */
  readonly added?: string
  /** A sub-row (indented a step further). */
  readonly indent?: boolean
  /** The row's id and its group, stamped as `data-tray-row` and `data-tray-group` (a screen's hooks for focus and
   *  tests). */
  readonly rowId?: string
  readonly group?: string
  /** Lines under the row, at the full width of its control and compared value. */
  readonly notes?: ReactNode
  /** The row's own way back to the compared plan's value, drawn under that value (a pulled row's undo), so the control
   *  cell keeps its width for the controls. */
  readonly back?: ReactNode
}

export function TrayRow({ label, control, compared, added, indent = false, rowId, group, notes, back }: TrayRowProps) {
  // The column's head names the compared plan for the eye; a screen reader, reading row by row, hears it before the figure.
  const comparedName = useContext(ComparedName)
  const value =
    comparedName !== null && compared !== '' && compared !== null && compared !== undefined ? (
      <>
        <span className="sr-only">{comparedName} </span>
        {compared}
      </>
    ) : (
      compared
    )
  return (
    <div className="col-span-full grid min-h-11 grid-cols-subgrid items-center gap-y-1 py-1.5" data-tray-row={rowId} data-tray-group={group}>
      <span className={cn('col-span-full flex min-w-0 items-center gap-2 text-body text-stone-900 wide:col-span-1', indent ? 'pl-4 wide:pl-8' : 'pl-0 wide:pl-4')}>
        {added !== undefined ? (
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-green text-stone-900">
            <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
            <span className="sr-only">{added}</span>
          </span>
        ) : null}
        {/* Wraps, never truncates: a cut label hides content (the content-over-looks law). */}
        <span className="min-w-0 break-words">{label}</span>
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{control}</div>
      {back === undefined ? (
        <span className="text-right text-body text-stone-900 tabular-nums">{value}</span>
      ) : (
        <span className="flex flex-col items-end text-right text-body text-stone-900 tabular-nums">
          {value}
          {back}
        </span>
      )}
      {notes !== undefined ? <div className={cn('col-span-full flex flex-col gap-1 text-label text-stone-600', indent ? 'pl-4 wide:pl-8' : 'wide:pl-4')}>{notes}</div> : null}
    </div>
  )
}

export interface TrayAction {
  readonly label: string
  readonly onSelect: () => void
  readonly disabled?: boolean
}

export interface TrayFooterProps {
  readonly reset?: TrayAction
  readonly edit?: TrayAction
  readonly refresh?: TrayAction
}

/** Reset (a text action), Edit (outlined) and Refresh (solid) at the right; each shows only when its action is given. */
export function TrayFooter({ reset, edit, refresh }: TrayFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {reset !== undefined ? (
        <Button variant="quiet" icon={<RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={reset.onSelect} disabled={reset.disabled}>
          {reset.label}
        </Button>
      ) : null}
      {edit !== undefined ? (
        <Button variant="secondary" onClick={edit.onSelect} disabled={edit.disabled}>
          {edit.label}
        </Button>
      ) : null}
      {refresh !== undefined ? (
        <Button variant="primary" onClick={refresh.onSelect} disabled={refresh.disabled}>
          {refresh.label}
        </Button>
      ) : null}
    </div>
  )
}
