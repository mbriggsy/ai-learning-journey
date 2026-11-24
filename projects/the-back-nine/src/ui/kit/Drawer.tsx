/**
 * src/ui/kit/Drawer.tsx: the right drawer every editor opens in (plan 3.1; ref 2.0 "The right drawer";
 * `rc-shell/vimeo-income_add-a-salary.jpg`), on Base UI's Dialog (shadcn's Base UI `sheet`, restyled): docked right
 * at about 45% of the window over a light scrim, full height; a plum header band with a white icon, the title, the
 * previous/next chevrons a record editor steps with, a thin divider and the X; a scrolling body (`DrawerFields` lays
 * out the two columns of label-over-field rows); a `--stone-200` footer with Delete at the left and Cancel and Save at
 * the right. On the phone it is a full-screen sheet.
 *
 * Read-only (plan 4.0): a drawer with no `onSave` shows no Save, and one with no `onDelete` shows no Delete, so a
 * view-only tab passes neither. Every word is a prop (plan 2.1 decision 10). Save closes the drawer unless its handler
 * returns `false` (a refused figure keeps it open).
 *
 * Motion (plan 2.1 decision 8): Base UI's CSS transitions, the panel sliding in from the right in 300 ms on the drawer
 * curve and out in 200 ms, the scrim fading; under reduced motion both only fade. Focus moves into the drawer on open
 * and returns to the element that opened it on close (Base UI's focus manager; the real-browser check is in
 * `e2e/csp.spec.ts`'s kit arm, insight 071).
 */
import { useState, type ReactElement, type ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button, buttonClasses } from './Button'
import { cn } from './cn'

export interface DrawerStep {
  readonly label: string
  readonly onSelect: () => void
}

export interface DrawerProps {
  /** Controlled open state; leave both out to let `trigger` own it. */
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  /** The element that opens the drawer (focus returns to it on close). */
  readonly trigger?: ReactElement
  readonly title: string
  /** A lucide icon at 1.5 px, drawn white on the band before the title. */
  readonly icon?: ReactNode
  readonly closeLabel: string
  /** A record editor's step to the previous / next record without closing (ref 2.0, Loan). */
  readonly previous?: DrawerStep
  readonly next?: DrawerStep
  readonly cancelLabel: string
  readonly onCancel?: () => void
  readonly saveLabel?: string
  /** Absent in a read-only drawer. Return `false` to keep the drawer open. */
  readonly onSave?: () => boolean | void
  readonly saveDisabled?: boolean
  readonly deleteLabel?: string
  /** Absent in a read-only drawer, and on a record that cannot be deleted. */
  readonly onDelete?: () => void
  readonly children: ReactNode
}

const bandButton =
  'flex size-9 cursor-pointer items-center justify-center rounded-control text-bg hover:bg-bg/15 focus-visible:outline-bg'

export function Drawer({
  open,
  onOpenChange,
  trigger,
  title,
  icon,
  closeLabel,
  previous,
  next,
  cancelLabel,
  onCancel,
  saveLabel,
  onSave,
  saveDisabled = false,
  deleteLabel,
  onDelete,
  children,
}: DrawerProps) {
  const [ownOpen, setOwnOpen] = useState(false)
  const isOpen = open ?? ownOpen
  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(next) => setOpen(next)}>
      {trigger !== undefined ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Portal className="rc-root">
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-40 bg-stone-900/35 transition-opacity duration-300 ease-settle',
            'data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-200',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col bg-bg shadow-drawer outline-none',
            'wide:w-[max(45vw,34rem)] wide:max-w-full',
            'transition-[translate,opacity] duration-300 ease-drawer data-ending-style:duration-200',
            'motion-safe:data-starting-style:translate-x-full motion-safe:data-ending-style:translate-x-full',
            'motion-reduce:data-starting-style:opacity-0 motion-reduce:data-ending-style:opacity-0',
          )}
        >
          <header className="flex min-h-14 shrink-0 items-center gap-3 bg-plum py-2 pr-3 pl-6 text-bg">
            {icon !== undefined ? <span className="flex shrink-0 [&_svg]:size-6">{icon}</span> : null}
            <Dialog.Title className="min-w-0 flex-1 break-words text-intro font-regular">{title}</Dialog.Title>
            {previous !== undefined ? (
              <button type="button" className={bandButton} aria-label={previous.label} onClick={previous.onSelect}>
                <ChevronUp size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ) : null}
            {next !== undefined ? (
              <button type="button" className={bandButton} aria-label={next.label} onClick={next.onSelect}>
                <ChevronDown size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ) : null}
            <span aria-hidden="true" className="h-6 w-px bg-bg/40" />
            <Dialog.Close className={bandButton} aria-label={closeLabel}>
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 text-body text-stone-900">{children}</div>
          <footer className="flex shrink-0 flex-wrap items-center gap-3 bg-stone-200 px-6 py-4">
            {onDelete !== undefined && deleteLabel !== undefined ? (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete()
                  setOpen(false)
                }}
              >
                {deleteLabel}
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-3">
              <Dialog.Close className={buttonClasses('neutral')} onClick={() => onCancel?.()}>
                {cancelLabel}
              </Dialog.Close>
              {onSave !== undefined && saveLabel !== undefined ? (
                <Button
                  variant="primary"
                  disabled={saveDisabled}
                  onClick={() => {
                    if (onSave() !== false) setOpen(false)
                  }}
                >
                  {saveLabel}
                </Button>
              ) : null}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** The drawer body's two columns of label-over-field rows (one column on the phone), 24 px apart (ref 3.6). */
export function DrawerFields({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-x-6 gap-y-6 wide:grid-cols-2', className)}>{children}</div>
}
