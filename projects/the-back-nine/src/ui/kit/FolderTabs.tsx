/**
 * src/ui/kit/FolderTabs.tsx: the folder tabs on the panel's top right edge, and the panel they open (plan 3.1; ref
 * 2.0 "The folder-tab panel"), on Base UI's Tabs (shadcn's Base UI `tabs`, restyled). Inactive tabs are filled
 * `--stone-200`; the active one is white with a border on three sides that opens into the panel below. The open edge,
 * the white fill and `aria-selected` carry which tab is open (never colour alone). On the phone the tabs are a strip
 * that scrolls sideways inside itself (ref 2.21).
 *
 * The panel is the white box with the 1 px `--stone-300` edge, square corners, no shadow; its padding is 48 px (32 in
 * compact mode, 16 on the phone). Only the active tab's content is passed in, so one panel is drawn.
 */
import type { ReactNode } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { cn } from './cn'

export interface FolderTab<Id extends string> {
  readonly id: Id
  readonly label: string
}

export interface FolderTabsProps<Id extends string> {
  /** The tab list's name ("Analysis views"). */
  readonly label: string
  readonly items: readonly FolderTab<Id>[]
  readonly value: Id
  readonly onValueChange: (id: Id) => void
  /** The open tab's content (the panel's body). */
  readonly children: ReactNode
  /** A line under the tabs, left of them, on value screens ("Values in today's dollars, rounded"). */
  readonly note?: ReactNode
  readonly panelClassName?: string
}

/** The panel box alone, for a page with no folder tabs. */
export const PANEL_CLASSES =
  'relative border border-stone-300 bg-bg p-4 wide:p-8 laptop:p-panel compact:p-8'

export function FolderTabs<Id extends string>({ label, items, value, onValueChange, children, note, panelClassName }: FolderTabsProps<Id>) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onValueChange(next as Id)} className="flex flex-col">
      <div className="flex flex-col items-stretch gap-2 wide:flex-row wide:items-end wide:justify-between">
        {note !== undefined ? <p className="pb-2 text-label text-stone-600">{note}</p> : <span aria-hidden="true" />}
        <Tabs.List
          aria-label={label}
          className="relative z-10 -mb-px flex max-w-full gap-1 overflow-x-auto overflow-y-hidden wide:justify-end"
        >
          {items.map((tab) => (
            <Tabs.Tab
              key={tab.id}
              value={tab.id}
              className={(state) =>
                cn(
                  'shrink-0 cursor-pointer border px-5 py-2.5 text-body whitespace-nowrap',
                  state.active
                    ? 'border-stone-300 border-b-bg bg-bg text-stone-900'
                    : 'border-transparent border-b-stone-300 bg-stone-200 text-stone-600 hover:text-stone-900',
                )
              }
            >
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
      <Tabs.Panel value={value} className={cn(PANEL_CLASSES, panelClassName)}>
        {children}
      </Tabs.Panel>
    </Tabs.Root>
  )
}
