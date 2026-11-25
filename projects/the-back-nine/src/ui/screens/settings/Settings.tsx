/**
 * src/ui/screens/settings/Settings.tsx: the gear's page (Act 6 · RC18; ref 2.20, `rc-shell/plansettings-02.png`), drawn
 * from `settingsView.ts` and deciding nothing. Folder tabs across the panel's top; under the tab's heading, a two-column
 * grid (one column on the phone) of rows: the setting's name, its value in a bordered box (RightCapital's dropdown, read
 * as a value here: a change is made where the setting lives), the plain lines under it, and the door to that place. The
 * box takes the kit's read-only fill (`--stone-200`, ref 2.0's locked field), so it never reads as a field to type in.
 * A read-only tab draws the same rows with no door (the view carries none). Under the Methodology grid, beside the line
 * naming where the household's facts live, the guided re-walk ("Walk through everything again"), the old panel's door
 * into the walk-through, kept here while the walk exists: RC14 replaces the walk with the stepper.
 *
 * Fit decision (plan 4.0): a scrolling page of rows; its first frame holds the title, the intro and the first row.
 */
import type { Ref } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button, PageFrame } from '../../kit'
import { copy } from '../../copy'
import type { SettingsDoor, SettingsRow, SettingsTab, SettingsView } from './settingsView'

export interface SettingsProps {
  readonly view: SettingsView
  readonly headingRef?: Ref<HTMLHeadingElement>
  readonly onTab: (tab: SettingsTab) => void
  /** A row's door: the shell opens the drawer over this page, the tray on Probability, or Tax Strategies. */
  readonly onDoor: (door: SettingsDoor) => void
  /** The guided re-walk, while the walk-through exists (RC14 replaces it with the stepper): absent on a read-only tab. */
  readonly onReview?: () => void
}

function Row({ row, onDoor }: { readonly row: SettingsRow; readonly onDoor: (door: SettingsDoor) => void }) {
  const nameId = `settings-${row.seat}`
  return (
    <section className="flex min-w-0 flex-col gap-2" data-assumption-seat={row.seat} aria-labelledby={nameId}>
      <h3 id={nameId} className="text-intro font-regular text-stone-900">
        {row.name}
      </h3>
      {row.values.length > 0 ? (
        <div className="flex flex-col gap-1 border border-stone-300 bg-stone-200 px-3 py-2.5 text-body text-stone-900" data-settings-value="">
          {row.values.map((v) => (
            <p key={v} className="tabular-nums">
              {v}
            </p>
          ))}
        </div>
      ) : null}
      {row.lines.map((l) => (
        <p key={l} className="text-body text-stone-600" data-settings-line="">
          {l}
        </p>
      ))}
      {row.door !== undefined ? (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onDoor(row.door!)} data-settings-door={row.door.kind}>
            {row.door.label}
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </section>
  )
}

export function Settings({ view, headingRef, onTab, onDoor, onReview }: SettingsProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="settings" data-settings-tab={view.tab}>
      <PageFrame
        title={view.title}
        headingRef={headingRef}
        intro={view.intro}
        tabs={{ label: view.tabsLabel, items: view.tabs, value: view.tab, onValueChange: onTab }}
      >
        <div className="flex flex-col gap-8">
          <h2 className="text-chart-title font-regular text-stone-900 wide:text-step-title">{view.heading}</h2>
          <div className="grid grid-cols-1 gap-x-16 gap-y-8 wide:grid-cols-2">
            {view.rows.map((row) => (
              <Row key={row.seat} row={row} onDoor={onDoor} />
            ))}
          </div>
          {view.footnote !== undefined ? <p className="text-label text-stone-600">{view.footnote}</p> : null}
          {view.footnote !== undefined && onReview !== undefined ? (
            <div>
              <Button variant="secondary" size="sm" onClick={onReview} data-settings-rewalk="">
                {copy.assumptionRewalkCta}
              </Button>
            </div>
          ) : null}
        </div>
      </PageFrame>
    </div>
  )
}
