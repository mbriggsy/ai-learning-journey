/**
 * src/ui/screens/settings/DisplayDrawer.tsx: the Display drawer (Act 6 · RC18; ref 2.20,
 * `rc-analysis/FRAME_display-settings-drawer.png`), opened from the "Today's dollars" control beside a value page's
 * folder tabs (`DisplayDoor`). Two switches, each with the line that says what it does in its current position, and the
 * dollars stated as today's dollars (B9's own unit: no future-dollars switch until `src/engine/priceIndex.ts` backs
 * one, critique 12). The switches move a copy; Save hands it to the shell, Cancel, the X, Escape and the scrim drop it
 * (RightCapital's Cancel / Save). The choices last for the session (`displaySettings.ts`), so a read-only tab may change
 * them too: they write neither the plan nor the vault.
 */
import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { copy } from '../../copy'
import { Drawer, Switch } from '../../kit'
import type { DisplaySettings } from '../../displaySettings'

export interface DisplayDrawerProps {
  readonly open: boolean
  readonly settings: DisplaySettings
  readonly onSave: (next: DisplaySettings) => void
  readonly onClose: () => void
}

function Choice({ label, line, checked, onChange }: { readonly label: string; readonly line: string; readonly checked: boolean; readonly onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Switch label={label} checked={checked} onCheckedChange={onChange} />
      <p className="text-label text-stone-600" data-display-line="">
        {line}
      </p>
    </div>
  )
}

/** The drawer's body, keyed afresh on each open, so the copy it edits starts from the settings in force. */
function DisplayBody({ open, settings, onSave, onClose }: DisplayDrawerProps) {
  const [draft, setDraft] = useState(settings)
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={copy.displayTitle}
      icon={<Settings2 strokeWidth={1.5} aria-hidden="true" />}
      closeLabel={copy.profileDrawerClose}
      cancelLabel={copy.profileDrawerCancel}
      saveLabel={copy.profileDrawerSave}
      onSave={() => {
        onSave(draft)
      }}
      focusTitle
    >
      {/* One column, as RightCapital's list of switches: the kit's two-column field grid scattered it. */}
      <div className="flex max-w-2xl flex-col gap-6" data-display-body="">
        <h3 className="text-intro font-regular text-stone-900">{copy.displayLead}</h3>
        <div className="flex flex-col gap-1.5" data-display-dollars="">
          <p className="text-body font-semibold text-stone-900">{copy.displayTodaysDollars}</p>
          <p className="text-label text-stone-600">{copy.displayTodaysDollarsLine}</p>
        </div>
        <Choice
          label={copy.displaySameScale}
          line={draft.sameScale ? copy.displaySameScaleOn : copy.displaySameScaleOff}
          checked={draft.sameScale}
          onChange={(sameScale) => setDraft((d) => ({ ...d, sameScale }))}
        />
        <Choice
          label={copy.displayYears}
          line={draft.timeAxis === 'years' ? copy.displayYearsOn : copy.displayYearsOff}
          checked={draft.timeAxis === 'years'}
          onChange={(years) => setDraft((d) => ({ ...d, timeAxis: years ? 'years' : 'ages' }))}
        />
        <p className="text-label text-stone-600">{copy.displaySessionNote}</p>
      </div>
    </Drawer>
  )
}

/** "Today's dollars" beside a value page's folder tabs (ref 2.20): the door into the Display drawer, the gear's mark
 *  beside the words. Its name holds its visible words ("Display settings: today's dollars"). Without a door (a host
 *  with no drawer), the plain words. */
export function DisplayDoor({ onOpen }: { readonly onOpen?: (() => void) | undefined }) {
  if (onOpen === undefined) return <>{copy.probabilityTodaysDollars}</>
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.displayDoorLabel}
      data-display-door=""
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-control text-label text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
    >
      {copy.probabilityTodaysDollars}
      <Settings2 size={16} strokeWidth={1.5} aria-hidden="true" className="text-plum" />
    </button>
  )
}

export function DisplayDrawer(props: DisplayDrawerProps) {
  // Each open is numbered (a render-phase adjustment on the open edge), so a reopened drawer edits a fresh copy; the
  // drawer stays mounted through its exit, so its close animates and focus goes back to the control that opened it.
  const [seq, setSeq] = useState(0)
  const [wasOpen, setWasOpen] = useState(props.open)
  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) setSeq((n) => n + 1)
  }
  return <DisplayBody key={seq} {...props} />
}
