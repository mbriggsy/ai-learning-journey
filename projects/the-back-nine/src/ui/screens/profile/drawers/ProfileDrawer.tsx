/**
 * src/ui/screens/profile/drawers/ProfileDrawer.tsx: the frame every Profile drawer opens in (Act 6 · RC13a; plan
 * docs/plans/6-rightcapital-ui-plan.md, RC13; ref 2.0 "The right drawer"; `rc-shell/vimeo-income_add-a-salary.jpg`), on the
 * kit's `Drawer`. RC13b's Expenses and Goals drawers open in it too.
 *
 * THE CONTRACT (insights 158, 159, 112, 149, 071, 060):
 *  - BUFFERED. The drawer edits its own copy of its fields (`useDrawerBuffer`); the store's draft moves only on Save.
 *  - SAVE commits the focused field first (a figure typed and not yet blurred is part of the edit), refuses while a box
 *    still holds text it could not read (the box says so under itself; the kit marks it `data-typed-refused`), then runs the
 *    caller's save (`drawerSave.ts`: every check the walk's Continue runs, plus the entry form's own decision tree, with
 *    every rule's field touched because a drawer has no later Continue); a refusal shows each error under its own field
 *    (a fact on another card in a line at the top of the body), and the drawer stays open; a pass is ONE store commit and
 *    the route-aware recompute.
 *  - CANCEL, THE X, ESCAPE AND THE SCRIM commit the focused field first too, then close where nothing changed; over
 *    unsaved changes they never drop them silently: the drawer stays open and asks, in a line that never scrolls away
 *    (the kit's `notice` slot), "Keep editing" (focused: the safe choice) or "Drop the changes". Nothing refused ever
 *    reaches the store, because nothing reaches it but a passed Save.
 *  - A BACK PRESS (the shell's leave ask, raised by the buffer's hold on the leave-page guard) is asked INSIDE the drawer,
 *    in the same slot: the drawer is modal, so an ask on the page beneath could be neither seen nor pressed. Its words
 *    say the drawer's changes are dropped (they are not in the plan until Save).
 *  - DELETE (red, footer left, list records only) asks for a second press before it removes anything.
 *  - FOCUS: the title takes focus on open (it names the drawer and pops no phone keyboard; at 390 px the kit's drawer is a
 *    full-screen sheet); on close focus goes to the card the drawer was opened for (re-found by `data-profile-card`, so a
 *    card the drawer just added takes it), else the page's heading. The card is re-found at close, never held from open
 *    (insight 060's lesson: never bind a node a later render may replace).
 *  - READ-ONLY (a view-only tab, plan 4.0): no Save, no Delete, the fields read-only; Cancel closes.
 *  - TYPED, NOT YET BLURRED (RC13b): a figure typed into a box is in no buffer until its blur commits it, and a browser
 *    Back blurs nothing (the page change unmounts the box), so while a box in the body holds typing the drawer holds the
 *    leave guard too: a Back asks, never dropping the digits silently (insight 071's dying field, for the Back path).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUnsavedBufferHold } from '@intake/unsavedBuffer'
import { Button, Drawer } from '../../../kit'
import { copy } from '../../../copy'

/** The shell's leave ask over the drawer (`Shell.tsx`'s `ShellLeaveAsk`). */
export interface DrawerLeaveAsk {
  readonly lines: readonly string[]
  readonly onGo: () => void
  readonly onStay: () => void
  readonly goLabel?: string
}

export interface ProfileDrawerProps {
  readonly open: boolean
  readonly title: string
  readonly icon?: ReactNode
  readonly readOnly: boolean
  /** Whether the buffer differs from its seed (read after the focused field commits). */
  readonly isDirty: () => boolean
  /** The caller's Save: true when it saved (the drawer then closes), false when refused (it stays open). */
  readonly onSave: () => boolean
  /** List records only: remove the record (after the second press), then close the drawer (the caller does both: focus
   *  goes to the page's heading, the record's card being gone). */
  readonly onDelete?: () => void
  /** Close the drawer (the caller's open state goes false). */
  readonly onClose: () => void
  /** After the drawer's exit has run: the caller drops it. */
  readonly onClosed: () => void
  /** Where focus goes on close. */
  readonly finalFocus: () => HTMLElement | null
  /** The shell's Back ask, while one stands. */
  readonly leaveAsk?: DrawerLeaveAsk
  /** Refusals on no field the drawer shows (another card's fact), each a sentence. */
  readonly errors?: readonly string[]
  /** Save's word where it is not "Save" (the first-run stepper's names drawer: "Start"). */
  readonly saveLabel?: string
  readonly children: ReactNode
}

/** The shell's line for an open entry, in the drawer's own words (its changes are dropped, never kept). */
const ASK_LINES: ReadonlyMap<string, string> = new Map([[copy.workbenchLeaveAsk, copy.profileLeaveAskUnsaved]])

function Ask({ lines, keep, drop }: { readonly lines: readonly string[]; readonly keep: { readonly label: string; readonly onPress: () => void }; readonly drop: { readonly label: string; readonly onPress: () => void } }) {
  const keepRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    keepRef.current?.focus()
  }, [])
  return (
    <div role="alert" className="flex flex-col gap-3" data-profile-ask="">
      {lines.map((l) => (
        <p key={l} className="text-body text-stone-900">
          {l}
        </p>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button ref={keepRef} variant="primary" onClick={keep.onPress}>
          {keep.label}
        </Button>
        <Button variant="neutral" onClick={drop.onPress}>
          {drop.label}
        </Button>
      </div>
    </div>
  )
}

export function ProfileDrawer({ open, title, icon, readOnly, isDirty, onSave, onDelete, onClose, onClosed, finalFocus, leaveAsk, errors = [], saveLabel = copy.profileDrawerSave, children }: ProfileDrawerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [asking, setAsking] = useState(false)
  const [armed, setArmed] = useState(false)
  // A box in the body holds typed text not yet committed (the header's last law); its blur ends it.
  const [typing, setTyping] = useState(false)
  useUnsavedBufferHold(open && !readOnly && typing)

  /** Commit the field under focus: the kit's fields commit on blur, synchronously. */
  const commitFocused = () => {
    const active = document.activeElement
    if (active instanceof HTMLElement && bodyRef.current?.contains(active) === true) active.blur()
  }
  /** Cancel, the X, Escape and the scrim. */
  const requestClose = () => {
    if (leaveAsk !== undefined) return // the shell's ask stands: its own choices end it
    commitFocused()
    if (!readOnly && isDirty()) {
      setAsking(true)
      return
    }
    onClose()
  }

  const notice =
    leaveAsk !== undefined ? (
      <Ask
        key="leave"
        lines={leaveAsk.lines.map((l) => ASK_LINES.get(l) ?? l)}
        keep={{ label: copy.workbenchLeaveStay, onPress: leaveAsk.onStay }}
        drop={{ label: leaveAsk.goLabel ?? copy.workbenchLeaveGo, onPress: leaveAsk.onGo }}
      />
    ) : asking ? (
      <Ask
        key="unsaved"
        lines={[copy.profileUnsavedAsk]}
        keep={{ label: copy.profileUnsavedKeep, onPress: () => setAsking(false) }}
        drop={{
          label: copy.profileUnsavedDrop,
          onPress: () => {
            setAsking(false)
            onClose()
          },
        }}
      />
    ) : null

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose()
      }}
      onClosed={onClosed}
      title={title}
      icon={icon}
      closeLabel={copy.profileDrawerClose}
      cancelLabel={copy.profileDrawerCancel}
      focusTitle
      finalFocus={finalFocus}
      notice={notice}
      {...(readOnly
        ? {}
        : {
            saveLabel,
            onSave: () => {
              commitFocused()
              setAsking(false)
              // Never past a box holding text its parser refused (its own words show under it): that text never reached
              // the buffer, so saving would keep the old figure, or none, under a refusal on screen (Act 6 · RC14).
              if (bodyRef.current?.querySelector('[data-typed-refused]') != null) return false
              if (onSave()) onClose()
              return false
            },
            ...(onDelete !== undefined
              ? {
                  deleteLabel: armed ? copy.profileDrawerDeleteConfirm : copy.profileDrawerDelete,
                  onDelete: () => {
                    if (!armed) {
                      setArmed(true)
                      return false
                    }
                    onDelete()
                    return false
                  },
                }
              : {}),
          })}
    >
      <div
        ref={bodyRef}
        className="flex flex-col gap-6"
        data-profile-drawer-body=""
        onChange={(e) => {
          if (e.target instanceof HTMLInputElement && e.target.type === 'text') setTyping(true)
        }}
        onBlur={() => setTyping(false)}
      >
        {errors.length > 0 ? (
          <ul role="alert" className="flex flex-col gap-2 border-l-2 border-stone-900 pl-3 text-label text-stone-900" data-profile-drawer-errors="">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </Drawer>
  )
}
