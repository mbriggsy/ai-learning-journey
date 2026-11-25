/**
 * src/ui/screens/retirement/PlanListDrawer.tsx: the plan list drawer (plan docs/plans/6-rightcapital-ui-plan.md, RC5; ref
 * 2.8's plan list; `rc-analysis/FRAME_add-or-remove-plans-drawer.png`, `creating-multiple-proposed-plans__*.png`). The
 * pencil beside Probability's right picker opens it in the kit's right drawer (a full-screen sheet on the phone). Draws
 * `planListView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: Your plan and Recommended pinned on a pale band at the top, a divider, then the kept
 * what-ifs by name, each with its ⋮⋮ handle; a row's Copy, Rename and Delete show on hover (and always on a touch screen,
 * and whenever focus is inside the row, so a keyboard reaches them: `theme.css`'s `[data-row-actions]` rule); "Keep this
 * what-if" opens an inline name box with a tick, as RightCapital names a new plan; the footer's Done closes it.
 *
 * THE TYPED BUFFERS (insight 112): the name box and a half-typed rename live in the shell (`box`), never here, so closing
 * the drawer drops neither (reopened, the box is as it was), and the shell holds the leave guard while one differs from
 * its seed. Delete asks first, inline, its safe choice focused.
 *
 * REORDER: drag the handle (the pointer followed on the window; the row moves through the list as the pointer passes each
 * row's middle, and the new order is written once, on release), or focus the handle and press the up or down arrow
 * (written at once, its new place said aloud). No animation on a keyboard move.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Check, Copy, GripVertical, Pencil, Trash2, X } from 'lucide-react'
import { Button, Drawer, cn } from '../../kit'
import { copy, slots } from '../../copy'
import { moved, type PlanListView } from './planListView'

/** The typed name the drawer holds: a new keep, or a rename of one row (`seed`: what the box opened with). */
export type NameBox =
  | { readonly kind: 'keep'; readonly text: string; readonly seed: string; readonly replaces?: string }
  | { readonly kind: 'rename'; readonly id: string; readonly text: string; readonly seed: string }

export interface PlanListDrawerProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly view: PlanListView
  readonly box: NameBox | null
  readonly onBox: (box: NameBox | null) => void
  /** Why a typed name can't be used (`nameError`), or null. */
  readonly validate: (text: string, exceptId?: string) => string | null
  /** Open a kept what-if on the left side (closes the drawer). */
  readonly onOpenLeft: (id: string) => void
  /** Confirm the name box (Keep, or a rename): resolves once the write has landed or been refused. */
  readonly onConfirm: (box: NameBox) => void
  readonly onCopy: (id: string) => void
  readonly onDelete: (id: string) => void
  readonly onOrder: (ids: readonly string[], movedId: string) => void
  /** The last write's words (a refusal, a failed save, "Kept as …"), spoken politely. */
  readonly said: string | null
}

const ROW = 'flex min-h-12 items-center gap-2 border-b border-stone-200 py-1'

export function PlanListDrawer(props: PlanListDrawerProps) {
  const { open, onOpenChange, view, box, onBox, validate, onOpenLeft, onConfirm, onCopy, onDelete, onOrder, said } = props
  const [deleting, setDeleting] = useState<string | null>(null)
  // A drag in progress: the order the list shows while the pointer moves, written once on release.
  const [dragOrder, setDragOrder] = useState<readonly string[] | null>(null)
  const drag = useRef<{ readonly id: string; readonly startY: number; readonly startIndex: number; readonly rowHeight: number; readonly from: readonly string[]; order: readonly string[]; readonly stop: () => void } | null>(null)
  const ids = view.rows.map((r) => r.id)
  const order = dragOrder ?? ids
  const rows = order.map((id) => view.rows.find((r) => r.id === id)).filter((r) => r !== undefined)
  const keepBox = box?.kind === 'keep' ? box : null
  // A drawer that closes mid-drag stops listening (and writes nothing).
  useEffect(() => () => drag.current?.stop(), [])

  // The pointer is followed on the WINDOW, not the handle: a row moved down is re-inserted in the list, and a node taken
  // out of the page loses its pointer capture, so the handle's own events would stop mid-drag and its release never land.
  // The order shown is kept on the drag itself, so the release writes exactly what the list showed last.
  const startDrag = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0 || drag.current !== null) return
    const pointer = e.pointerId
    const height = e.currentTarget.closest<HTMLElement>('[data-kept-row]')?.getBoundingClientRect().height ?? 0
    const move = (ev: globalThis.PointerEvent) => {
      const d = drag.current
      if (d === null || ev.pointerId !== pointer) return
      const to = Math.max(0, Math.min(d.from.length - 1, d.startIndex + Math.round((ev.clientY - d.startY) / d.rowHeight)))
      const next = d.from.filter((x) => x !== d.id)
      next.splice(to, 0, d.id)
      if (next.join('|') !== d.order.join('|')) {
        d.order = next
        setDragOrder(next)
      }
    }
    const end = (ev: globalThis.PointerEvent) => {
      const d = drag.current
      if (d === null || ev.pointerId !== pointer) return
      d.stop()
      setDragOrder(null)
      if (d.order.join('|') !== d.from.join('|')) onOrder(d.order, d.id)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      drag.current = null
    }
    drag.current = { id, startY: e.clientY, startIndex: ids.indexOf(id), rowHeight: height > 0 ? height : 48, from: ids, order: ids, stop }
    // Capture keeps the press on the handle (no text selected across the list) while it stays in the page.
    if ('setPointerCapture' in e.currentTarget) e.currentTarget.setPointerCapture(pointer)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    setDragOrder(ids)
  }
  const keyMove = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const next = moved(ids, id, e.key === 'ArrowUp' ? -1 : 1)
    if (next !== ids) onOrder(next, id)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={view.title} closeLabel={copy.planListClose} cancelLabel={copy.planListDone}>
      <div className="flex flex-col gap-4" data-plan-list="">
        {view.withheld !== undefined ? (
          <p className="text-body text-stone-900" data-plan-list-withheld="">
            {view.withheld}
          </p>
        ) : null}
        {view.ceremonyNote !== undefined ? (
          <p className="text-label text-stone-600" data-plan-list-ceremony="">
            {view.ceremonyNote}
          </p>
        ) : null}
        <div>
          {/* Your plan and Recommended, pinned on a pale band: always there, never moved, copied or deleted. */}
          <ul className="flex flex-col bg-stone-100 px-4" aria-label={view.title} data-plan-list-pinned="">
            {view.pinned.map((name) => (
              <li key={name} className="flex min-h-12 items-center text-body text-stone-900">
                {name}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col border-t border-stone-300" data-plan-list-kept="">
            {rows.map((row) => {
              const renaming = box?.kind === 'rename' && box.id === row.id ? box : null
              const dragging = dragOrder !== null && drag.current?.id === row.id
              if (deleting === row.id) {
                return (
                  <li key={row.id} className={cn(ROW, 'flex-wrap px-2')} data-kept-row={row.id}>
                    <DeleteAsk
                      name={row.name}
                      onGo={() => {
                        setDeleting(null)
                        onDelete(row.id)
                      }}
                      onStay={() => setDeleting(null)}
                    />
                  </li>
                )
              }
              return (
                <li key={row.id} className={cn(ROW, 'pr-2', dragging && 'bg-blue-tint shadow-menu')} data-kept-row={row.id}>
                  {view.canWrite ? (
                    <button
                      type="button"
                      className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-stone-600 hover:bg-stone-100 active:cursor-grabbing"
                      aria-label={slots.planListMove(row.name)}
                      onPointerDown={(e) => startDrag(e, row.id)}
                      onKeyDown={(e) => keyMove(e, row.id)}
                      data-kept-handle=""
                    >
                      <GripVertical size={18} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  ) : (
                    <span aria-hidden="true" className="w-4 shrink-0" />
                  )}
                  {renaming !== null ? (
                    <NameField box={renaming} label={slots.planListRowActions(row.name)} confirmLabel={copy.planListRenameConfirm} error={validate(renaming.text, row.id)} onBox={onBox} onConfirm={onConfirm} />
                  ) : (
                    // The name keeps its room (at least 12rem, or the whole row on a narrow phone): the actions drop to a
                    // line of their own when the row can't hold both, never the name squeezed to a letter a line.
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                      <button
                        type="button"
                        className="min-w-[min(100%,12rem)] flex-1 cursor-pointer py-2 text-left text-body break-words text-stone-900 underline-offset-4 hover:underline"
                        aria-label={slots.planListOpenRow(row.name)}
                        onClick={() => onOpenLeft(row.id)}
                        data-kept-open=""
                      >
                        <span data-kept-label="">{row.name}</span>
                        {row.shownLeft || row.shownRight ? (
                          <span className="ml-2 text-label text-stone-600">
                            {row.shownLeft ? copy.planListShownLeft : copy.planListShownRight}
                          </span>
                        ) : null}
                      </button>
                      {view.canWrite ? (
                        <div className="flex shrink-0 items-center gap-1" role="group" aria-label={slots.planListRowActions(row.name)} data-row-actions="">
                          <Button variant="quiet" size="sm" icon={<Copy size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={() => onCopy(row.id)}>
                            {copy.planListCopy}
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            icon={<Pencil size={16} strokeWidth={1.5} aria-hidden="true" />}
                            onClick={() => onBox({ kind: 'rename', id: row.id, text: row.name, seed: row.name })}
                          >
                            {copy.planListRename}
                          </Button>
                          <Button variant="quiet" size="sm" icon={<Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />} onClick={() => setDeleting(row.id)}>
                            {copy.planListDelete}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              )
            })}
            {keepBox !== null && view.keep.kind === 'open' ? (
              <li className={cn(ROW, 'pl-12 pr-2')} data-kept-new="">
                <NameField box={keepBox} label={copy.planListNameLabel} confirmLabel={copy.planListNameConfirm} error={validate(keepBox.text, keepBox.replaces)} onBox={onBox} onConfirm={onConfirm} />
              </li>
            ) : null}
          </ul>
        </div>
        {view.empty !== undefined && keepBox === null ? <p className="text-label text-stone-600">{view.empty}</p> : null}
        {view.keep.kind === 'open' && keepBox === null ? (
          <div className="flex flex-col items-start gap-2">
            {view.keep.replaces !== undefined ? <p className="text-label text-stone-600">{copy.probabilityKeptChangedNote}</p> : null}
            <Button
              variant="secondary"
              onClick={() => {
                const r = view.keep.kind === 'open' ? view.keep.replaces : undefined
                onBox(r !== undefined ? { kind: 'keep', text: r.name, seed: r.name, replaces: r.id } : { kind: 'keep', text: '', seed: '' })
              }}
              data-plan-list-keep=""
            >
              {copy.planListKeep}
            </Button>
          </div>
        ) : null}
        {view.keep.kind === 'withheld' && view.keep.words !== view.withheld ? (
          <p className="text-label text-stone-600" data-plan-list-keep-withheld="">
            {view.keep.words}
          </p>
        ) : null}
        <p className="text-label text-stone-900" role="status" aria-live="polite" data-plan-list-said="">
          {said ?? ''}
        </p>
      </div>
    </Drawer>
  )
}

/** The inline name box with its tick (ref 2.8: a new plan is named in an inline box with a ✓): Enter confirms, Escape
 *  closes the box (not the drawer). The words for a refused name sit under it, tied to the box. */
function NameField({
  box,
  label,
  confirmLabel,
  error,
  onBox,
  onConfirm,
}: {
  readonly box: NameBox
  readonly label: string
  readonly confirmLabel: string
  readonly error: string | null
  readonly onBox: (box: NameBox | null) => void
  readonly onConfirm: (box: NameBox) => void
}) {
  const inputId = useId()
  const errorId = useId()
  const [tried, setTried] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  // A refused name shows its words under the box. A name sent on is not checked again while its write lands: the write
  // puts it in the list at once, so the check would call it taken on the success path (a refused write says so itself).
  const confirm = () => {
    setTried(error !== null)
    if (error === null) onConfirm(box)
  }
  const showError = tried && error !== null
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      {/* The box keeps its room; its two buttons drop under it when the row is narrow. */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          ref={ref}
          id={inputId}
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          value={box.text}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : undefined}
          onChange={(e) => {
            setTried(false)
            onBox({ ...box, text: e.target.value })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirm()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              onBox(null)
            }
          }}
          className="h-10 min-w-[min(100%,12rem)] flex-1 rounded-control border border-blue-ink bg-bg px-3 text-body text-stone-900"
          data-kept-name=""
        />
        <Button variant="primary" size="md" icon={<Check size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={confirm} data-kept-confirm="">
          {confirmLabel}
        </Button>
        <Button variant="quiet" size="md" icon={<X size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={() => onBox(null)}>
          {copy.planListNameCancel}
        </Button>
      </div>
      {showError ? (
        <p id={errorId} role="alert" className="text-label text-stone-900">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Delete asks first, in the row: the name and what it does, the safe choice focused. */
function DeleteAsk({ name, onGo, onStay }: { readonly name: string; readonly onGo: () => void; readonly onStay: () => void }) {
  const stay = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    stay.current?.focus()
  }, [])
  return (
    <div className="flex w-full flex-col gap-2 py-2" role="alert" data-kept-delete="">
      <p className="text-body text-stone-900">{slots.planListDeleteAsk(name)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="neutral" ref={stay} onClick={onStay}>
          {copy.planListDeleteStay}
        </Button>
        <Button variant="destructive" onClick={onGo}>
          {copy.planListDeleteGo}
        </Button>
      </div>
    </div>
  )
}
