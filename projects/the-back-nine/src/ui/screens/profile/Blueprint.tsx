/**
 * src/ui/screens/profile/Blueprint.tsx: Profile → Blueprint (Act 6 · RC15; ref 2.6; `rc-shell/site-blueprint-net-worth.png`,
 * `site-blueprint-goals.png`, `kbbp-ise-01.png`). Draws `blueprintView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: folder tabs Net Worth, Goals, and Income, Savings, Expenses on one panel. Across the
 * panel's top: the legend of short thick dashes with their words (left), the headline box (centre), and Edit (outlined;
 * a checklist that hides or shows a category) with the blue "Add >" menu (right). Below the seam they stack.
 * - Net Worth: the two people side by side at his window, a line from them out and down to each person's column of tiles
 *   (no Jointly Held column: B9 has no joint ownership); on the phone each column is headed by its person.
 * - Goals: the dotted spine, each year in bold with both people's ages under it, the year's tiles beside it, alternating
 *   left and right at his window (their coloured edge on the spine side); on the phone the spine runs down the left. The
 *   working household's stop and its budget lines wait in "After work stops" until the answer names the year.
 * - Income, Savings, Expenses: swim lanes (rows Income, Savings, Expenses, labelled up the left side at his window;
 *   columns the two people); the household's spending is one row under both, said in words.
 *
 * Every tile: a 4 px coloured edge, a pale tint of the colour, its CATEGORY word in small caps above its name (the colour
 * is never the only signal), its value; one button that opens the same drawer as its Profile card. While a drawer is
 * open the tile carries a 2 px plum-dark ring and `aria-current`, and the rest fade. No text is ever cut.
 *
 * The R13 caveat closes the panel on every tab (the shell stamps the page as carrying it in frame); the Net Worth
 * headline's figure and the crowned work-optional date's tile (its button) are tied to it by `aria-describedby`.
 *
 * Fit decision (plan RC15): a scrolling page; its first frame holds the title, the intro and the panel's top row.
 */
import { useId, useState, type ReactNode, type Ref } from 'react'
import { ArrowDown, Crown, Repeat, UserRound } from 'lucide-react'
import { AddMenu, Button, Caveat, Checkbox, PageFrame, cn } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { addEntries } from './CardsPage'
import type { DrawerTarget } from './profileView'
import type { BlueprintPerson, BlueprintTab, BlueprintTile, BlueprintView, TileTone, TimelineGroup } from './blueprintView'

const EDGE: Readonly<Record<TileTone, string>> = {
  green: 'border-green',
  blue: 'border-blue',
  orange: 'border-orange',
  sky: 'border-sky',
  coral: 'border-coral',
  umber: 'border-umber',
}
const FILL: Readonly<Record<TileTone, string>> = {
  green: 'bg-mint',
  blue: 'bg-blue-tint',
  orange: 'bg-sand-tint',
  sky: 'bg-stone-100',
  coral: 'bg-blush',
  // The inherited IRA's tile: a neutral ground, its umber edge and its printed category word carrying it (U13).
  umber: 'bg-stone-100',
}
const DASH: Readonly<Record<TileTone, string>> = {
  green: 'bg-green',
  blue: 'bg-blue',
  orange: 'bg-orange',
  sky: 'bg-sky',
  coral: 'bg-coral',
  umber: 'bg-umber',
}

interface TileProps {
  readonly tile: BlueprintTile
  readonly selected: string | null
  readonly onOpen: (target: DrawerTarget, card?: string) => void
  /** Which side carries the coloured edge: the spine side on Goals' left column, else the left. */
  readonly edge?: 'left' | 'right'
}

function Tile({ tile, selected, onOpen, edge = 'left' }: TileProps) {
  const isSelected = selected === tile.id
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-current={isSelected ? 'true' : undefined}
      // The crowned date's tie to the R13 caveat sits on the button, the element a reader lands on (a description on an
      // inner span of a button is never read).
      aria-describedby={tile.crowned === true && tile.value !== undefined ? verdictDescribedBy() : undefined}
      onClick={() => onOpen(tile.target, tile.id)}
      data-profile-card={tile.id}
      data-bp-tile=""
      data-bp-legend={tile.legend}
      className={cn(
        'flex min-h-22 w-full cursor-pointer flex-col justify-center gap-1 px-5 py-3 transition-opacity duration-200 ease-settle',
        // The spine runs down the left on the phone, so every tile's edge is on its left there.
        edge === 'left' ? 'border-l-4 text-center' : 'border-l-4 text-center laptop:border-l-0 laptop:border-r-4 laptop:text-right',
        EDGE[tile.tone],
        FILL[tile.tone],
        'hover:ring-1 hover:ring-stone-400 hover:ring-inset',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink',
        isSelected && 'outline-2 outline-plum-dark',
        selected !== null && !isSelected && 'opacity-50',
      )}
    >
      <span className="text-label font-semibold tracking-nav break-words text-stone-600 uppercase" data-bp-category="">
        {tile.category}
      </span>
      <span className="text-body break-words text-stone-900">
        {tile.crowned === true ? <Crown size={18} strokeWidth={1.5} aria-hidden="true" className="mr-1.5 inline-block align-[-3px] text-plum" /> : null}
        {tile.repeats === true ? (
          <Repeat size={16} strokeWidth={1.5} aria-hidden="true" className="mr-1.5 inline-block align-[-2px] text-stone-600" data-bp-repeat="" />
        ) : null}
        {tile.name}
      </span>
      {tile.value !== undefined ? (
        <span className="text-body font-semibold break-words text-pretty text-stone-900 tabular-nums" data-bp-value="">
          {tile.value}
        </span>
      ) : null}
      {tile.note !== undefined ? <span className="text-label break-words text-stone-600">{tile.note}</span> : null}
    </button>
  )
}

function Tiles({ tiles, selected, onOpen, edge, className }: { readonly tiles: readonly BlueprintTile[]; readonly edge?: 'left' | 'right'; readonly className?: string } & Omit<TileProps, 'tile' | 'edge'>) {
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {tiles.map((t) => (
        <li key={t.id}>
          <Tile tile={t} selected={selected} onOpen={onOpen} {...(edge !== undefined ? { edge } : {})} />
        </li>
      ))}
    </ul>
  )
}

function PersonHead({ person, className }: { readonly person: BlueprintPerson; readonly className?: string }) {
  return (
    <span className={cn('flex flex-col items-center gap-1 text-center', className)}>
      <UserRound size={44} strokeWidth={1.5} aria-hidden="true" className="text-plum" />
      <span className="text-intro break-words text-stone-900">{person.name}</span>
      {person.age !== null ? <span className="text-body text-stone-600 tabular-nums">{person.age}</span> : null}
    </span>
  )
}

type TileHandlers = Omit<TileProps, 'tile' | 'edge'>

function NetWorthBody({ body, ...h }: { readonly body: Extract<BlueprintView['body'], { kind: 'net-worth' }> } & TileHandlers) {
  return (
    <div className="flex flex-col" data-bp-networth="">
      {/* His window: the two people side by side, a line out and down to each one's column (decoration: each column
          names its person for a reader). */}
      <div aria-hidden="true" className="hidden laptop:flex laptop:flex-col">
        <div className="flex justify-center gap-16">
          {body.columns.map((c, i) => (
            <PersonHead key={i} person={c.person} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2">
          <span className="ml-[50%] h-10 rounded-tl-card border-t-2 border-l-2 border-plum" />
          <span className="mr-[50%] h-10 rounded-tr-card border-t-2 border-r-2 border-plum" />
        </div>
        <div className="grid grid-cols-2">
          <ArrowDown size={20} strokeWidth={2} className="-mt-2 justify-self-center text-plum" />
          <ArrowDown size={20} strokeWidth={2} className="-mt-2 justify-self-center text-plum" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-8 laptop:grid-cols-2 laptop:gap-0">
        {body.columns.map((c, i) => (
          <section key={i} className="flex min-w-0 flex-col gap-3 laptop:px-10" data-bp-column={i}>
            <h3 className="laptop:sr-only">
              <PersonHead person={c.person} />
            </h3>
            {c.tiles.length > 0 ? <Tiles tiles={c.tiles} {...h} /> : null}
            {c.empty !== null ? (
              <p className="text-center text-body text-stone-600" data-bp-empty="">
                {c.empty}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}

function GroupRow({ group, side, ...h }: { readonly group: TimelineGroup; readonly side: 'left' | 'right' } & TileHandlers) {
  return (
    <li className="relative grid grid-cols-1 gap-3 pl-8 laptop:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] laptop:gap-8 laptop:pl-0" data-bp-group={group.key}>
      {/* The spine's marker on the phone (the dotted line runs down the left). */}
      <span aria-hidden="true" className="absolute top-2 left-[3px] size-3 rounded-full border-2 border-stone-500 bg-bg laptop:hidden" />
      <h3 className="flex flex-col laptop:col-start-2 laptop:row-start-1 laptop:items-center laptop:bg-bg laptop:py-2 laptop:text-center">
        <span className="text-chart-title font-semibold text-stone-900 tabular-nums" data-bp-year="">
          {group.label}
        </span>
        {group.ages !== null ? (
          <span className="text-body text-stone-600 tabular-nums" data-bp-ages="">
            {group.ages}
          </span>
        ) : null}
      </h3>
      <Tiles
        tiles={group.tiles}
        edge={side === 'left' ? 'right' : 'left'}
        className={side === 'left' ? 'laptop:col-start-1 laptop:row-start-1' : 'laptop:col-start-3 laptop:row-start-1'}
        {...h}
      />
    </li>
  )
}

function Timeline({ groups, ...h }: { readonly groups: readonly TimelineGroup[] } & TileHandlers) {
  return (
    <ol className="relative flex flex-col gap-8">
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-2 border-l-2 border-dotted border-stone-500 laptop:left-1/2" />
      {groups.map((g, i) => (
        <GroupRow key={g.key} group={g} side={i % 2 === 0 ? 'left' : 'right'} {...h} />
      ))}
    </ol>
  )
}

function GoalsBody({ body, ...h }: { readonly body: Extract<BlueprintView['body'], { kind: 'goals' }> } & TileHandlers) {
  return (
    <div className="flex flex-col gap-10" data-bp-goals="">
      {body.groups.length > 0 ? <Timeline groups={body.groups} {...h} /> : null}
      {body.after !== null ? (
        <section className="flex flex-col gap-4" data-bp-after="">
          <h3 className="text-chart-title font-regular text-plum">{body.after.heading}</h3>
          <p className="max-w-[56rem] text-body text-stone-600">{body.after.intro}</p>
          <Timeline groups={body.after.groups} {...h} />
        </section>
      ) : null}
      {body.unplaced !== null ? (
        <section className="flex flex-col gap-4" data-bp-unplaced="">
          <h3 className="text-chart-title font-regular text-plum">{body.unplaced.heading}</h3>
          <Tiles tiles={body.unplaced.tiles} className="laptop:grid laptop:grid-cols-2 laptop:gap-3" {...h} />
        </section>
      ) : null}
    </div>
  )
}

function IseBody({ body, ...h }: { readonly body: Extract<BlueprintView['body'], { kind: 'ise' }> } & TileHandlers) {
  return (
    <div className="flex flex-col" data-bp-ise="">
      {/* His window: the people over their columns (decoration: each cell names its person for a reader). */}
      <div aria-hidden="true" className="hidden laptop:grid laptop:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] laptop:pb-4">
        <span />
        {body.people.map((p, i) => (
          <PersonHead key={i} person={p} />
        ))}
      </div>
      {body.lanes.map((lane) => (
        <section
          key={lane.id}
          className="flex flex-col gap-4 border-t border-dashed border-stone-400 py-6 laptop:grid laptop:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] laptop:gap-x-10"
          data-bp-lane={lane.id}
        >
          <h3
            className={cn(
              'text-chart-title font-regular text-plum laptop:flex laptop:items-center laptop:justify-center laptop:[writing-mode:vertical-rl] laptop:rotate-180',
              // A lane with both per-person cells and a "Both of you" row (Income with a both-people gift): its label spans
              // both rows.
              lane.cells !== null && lane.shared !== undefined && 'laptop:row-span-2',
            )}
          >
            {lane.label}
          </h3>
          {lane.cells !== null
            ? lane.cells.map((cell, i) => (
                <div key={i} className="flex min-w-0 flex-col gap-3" data-bp-cell={i}>
                  <h4 className="text-body font-semibold text-stone-900 laptop:sr-only">{body.people[i]?.name}</h4>
                  {cell.tiles.length > 0 ? <Tiles tiles={cell.tiles} {...h} /> : null}
                  {cell.empty !== null ? (
                    <p className="text-body text-stone-600 laptop:text-center" data-bp-empty="">
                      {cell.empty}
                    </p>
                  ) : null}
                </div>
              ))
            : null}
          {lane.shared !== undefined ? (
            <div className={cn('flex min-w-0 flex-col gap-3 laptop:col-span-2', lane.cells !== null && 'laptop:col-start-2')} data-bp-shared="">
              <h4 className="text-body font-semibold text-stone-900 laptop:text-center">{lane.shared.label}</h4>
              <Tiles tiles={lane.shared.tiles} className="laptop:grid laptop:grid-cols-2 laptop:gap-x-10" {...h} />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  )
}

export interface BlueprintProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: BlueprintView
  readonly selected: string | null
  readonly onOpen: (target: DrawerTarget, card?: string) => void
  readonly onTab: (tab: BlueprintTab) => void
  /** The legend ids hidden on this tab, and the change Edit's checklist makes. */
  readonly hidden: ReadonlySet<string>
  readonly onHidden: (id: string, hidden: boolean) => void
  readonly caveat: readonly string[]
  /** The StaleBanner's lines while the tab prints the answer's sentence (`view.answerShown`), drawn inside the panel
   *  below the folder tabs, so a tab switch never moves the tabs (milestone 3's review, round 2). */
  readonly banner?: ReactNode
}

export function Blueprint({ headingRef, view, selected, onOpen, onTab, hidden, onHidden, caveat, banner }: BlueprintProps) {
  const [editOpen, setEditOpen] = useState(false)
  const editId = useId()
  const h: TileHandlers = { selected, onOpen }
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="profile-blueprint" data-blueprint-tab={view.tab}>
      <PageFrame
        title={view.title}
        headingRef={headingRef}
        intro={view.intro}
        tabs={{ label: view.tabsLabel, items: view.tabs, value: view.tab, onValueChange: onTab }}
        caveat={<Caveat lines={caveat} />}
      >
        <div className="flex flex-col gap-8">
          {banner}
          <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] laptop:items-start laptop:gap-8">
            <ul aria-label={view.legendLabel} className="flex flex-col gap-2" data-bp-legend="">
              {view.legend.map((l) => (
                <li key={l.id} className="flex items-center gap-3 text-body text-stone-900">
                  <span aria-hidden="true" className={cn('h-1 w-8 shrink-0', DASH[l.tone])} />
                  {l.label}
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center gap-2">
              <p className="bg-stone-200 px-8 py-4 text-center text-chart-title font-semibold text-stone-900 tabular-nums" data-bp-headline="">
                <span aria-describedby={view.headlineFigure ? verdictDescribedBy() : undefined}>{view.headline}</span>
              </p>
              {view.notes.map((n) => (
                <p key={n} className="max-w-[32rem] text-center text-label text-stone-600" data-bp-note="">
                  {n}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-start gap-3 laptop:justify-end">
              <Button variant="secondary" aria-expanded={editOpen} aria-controls={editId} onClick={() => setEditOpen((o) => !o)}>
                {view.edit.label}
              </Button>
              {view.add !== null ? <AddMenu label={view.add.label} items={addEntries(view.add, onOpen)} /> : null}
            </div>
          </div>
          {editOpen ? (
            <fieldset id={editId} className="flex flex-col gap-3 border border-stone-300 px-5 py-4 wide:flex-row wide:flex-wrap wide:gap-x-8" data-bp-edit="">
              <legend className="px-1 text-label font-semibold text-stone-900">{view.edit.legend}</legend>
              {view.legend.map((l) => (
                <Checkbox key={l.id} label={l.label} checked={!hidden.has(l.id)} onCheckedChange={(on) => onHidden(l.id, !on)} />
              ))}
            </fieldset>
          ) : (
            <span id={editId} hidden />
          )}
          {view.body.kind === 'net-worth' ? (
            <NetWorthBody body={view.body} {...h} />
          ) : view.body.kind === 'goals' ? (
            <GoalsBody body={view.body} {...h} />
          ) : (
            <IseBody body={view.body} {...h} />
          )}
          {view.lines.map((l) => (
            <p key={l} className="max-w-[56rem] text-body text-stone-600" data-bp-line="">
              {l}
            </p>
          ))}
        </div>
      </PageFrame>
    </div>
  )
}
