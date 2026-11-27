/**
 * src/ui/screens/retirement/ActionItemsTray.tsx: Probability's Action Items tray (plan docs/plans/6-rightcapital-ui-
 * plan.md, RC4, "The Action Items tray"; ref 2.8; `rc-analysis/action-items__cleanshot-2024-10-28-at-15-44-44-copy.png`,
 * `FRAME_action-items-drawer-add-new-items-goals-menu.png`, `FRAME_new-action-item-green-dot-row.png`). Draws
 * `trayView.ts`'s view in the kit's `Tray` and decides nothing: every row, mark and commit rule is the composer's.
 *
 * EXPLICIT REFRESH: a control writes the PENDING bundle only (`useWhatIf`'s `setLever`), so no figure anywhere moves
 * while the tray is edited; Refresh commits the whole bundle once and starts one run. A typed box commits on blur or
 * Enter, so a press of Refresh or Apply that blurs a box reads the figure the blur committed (the presses read the
 * hook's refs, insights 036 and 149). Neither button is ever `disabled`: a disabled button takes no focus, so the box
 * would never blur and the typed figure would be lost; Apply is `aria-disabled` and its handler re-checks at the press.
 * A box holding text it could not read (the kit marks it `data-typed-refused` and says why beneath it) stops both
 * presses, as it stops a drawer's Save (Act 6 · RC14): its last good figure is not what it shows, so no what-if runs on
 * it and Apply writes none of it.
 *
 * NOTHING MOVES UNDER A FINGER (insights 035, 149): each row's "Back to the plan" keeps its room when the row is not
 * pulled (invisible and inert), so a commit that pulls a row moves nothing below it.
 *
 * The Edit drawer ("Add or remove action items") chooses the rows that show, and its "Add new items" opens the spending
 * line drawer (a budget household only: a line needs a budget to sit in). A line added only in this what-if wears the
 * green "+" dot with words, and its name is a link back to its drawer.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Undo2 } from 'lucide-react'
import type { ScenarioDraft } from '@store/memoryModel'
import { canonicalIdentityToken, type BudgetTier, type DrawdownPolicy, type InheritedPace, type WhatIfBudgetLineV6, type WhatIfLeverKind, type WhatIfLeverV6 } from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { AddMenu, Button, Checkbox, Drawer, DrawerFields, MoneyInput, Select, Slider, Tray, TrayColumn, TrayRow, TraySection, WholeInput, cn } from '../../kit'
import { copy, slots } from '../../copy'
import type { BandPlanClockAnchor } from '../../bandAnnotations'
import { leverTarget, railMoney, type RailOffers } from '../../workbench/railChrome'
import type { WhatIf } from '../../workbench/useWhatIf'
import {
  acaCommit,
  bucketWords,
  claimCommit,
  depositCommit,
  employerCommit,
  lineCommit,
  mixCommit,
  moveBucket,
  orderCommit,
  paceCommit,
  policyLabel,
  rothCommit,
  rothFieldsFor,
  stopCommit,
  totalCommit,
  trayApply,
  trayView,
  withoutHidden,
  awaitingWithoutHidden,
  type RothFields,
  type TrayRowView,
} from './trayView'

export interface TrayFocus {
  readonly lever: WhatIfLeverKind
  /** Changes per ask, so the same row can be asked for twice. */
  readonly n: number
}

export interface ActionItemsTrayProps {
  readonly id: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly whatIf: WhatIf
  /** The committed answer's draft (the draft every what-if is applied to). */
  readonly draft: ScenarioDraft
  readonly offers: RailOffers
  /** The left side's name ("New what-if", "Recommended"): the edited column's head. */
  readonly editedLabel: string
  readonly anchor: BandPlanClockAnchor
  /** The date route's crowned lifestyle offset (the Roth row's notes describe that run). */
  readonly crownedOffset?: number
  readonly wallCalendarYear: number
  readonly readOnly: boolean
  /** The left half's reading is worked out on the committed answer (Apply's gate). */
  readonly current: boolean
  /** The saved recommendation's action in words, while the left picker shows it (the tray then edits nothing). */
  readonly recommendation?: string
  /** The rows the Edit drawer hid, and its write. */
  readonly hidden: ReadonlySet<string>
  readonly onHidden: (hidden: ReadonlySet<string>) => void
  /** Lowered deposits waiting for the employer's figure (D7), and their write. */
  readonly awaiting: ReadonlyMap<string, number>
  readonly onAwaiting: (awaiting: ReadonlyMap<string, number>) => void
  /** A facts-page link or an assumption row asked for this lever's row: focus it. */
  readonly focus?: TrayFocus
  /** The shell's one live region. */
  readonly announce: (text: string) => void
}

const WIDE_BOX = 'w-32'
const NARROW_BOX = 'w-24'
/** The pace picker's width (U17): its choices wrap inside it. */
const PACE_BOX = 'w-52 min-w-0'
/** The tray's short slider (ref 2.8's is about 140 px at RightCapital's wider tray; the row's name needs the room). */
const SLIDER = 'w-24'

/** A row's own way back, drawn whether or not the row is pulled so a pull moves nothing (unpulled: unseen, inert). */
function Back({ label, pulled, onBack }: { readonly label: string; readonly pulled: boolean; readonly onBack: () => void }) {
  return (
    <Button
      variant="quiet"
      size="sm"
      icon={<Undo2 size={16} strokeWidth={1.5} aria-hidden="true" />}
      aria-label={slots.workbenchRailBackName(label)}
      inert={!pulled}
      className={pulled ? undefined : 'invisible'}
      onClick={onBack}
    >
      {copy.trayBack}
    </Button>
  )
}

export function ActionItemsTray(props: ActionItemsTrayProps) {
  const { id, open, onOpenChange, whatIf, draft, offers, editedLabel, anchor, crownedOffset, wallCalendarYear, readOnly, current, recommendation, hidden, onHidden, awaiting, onAwaiting, focus, announce } = props
  const view = trayView({ draft, offers, pending: whatIf.pending, committed: whatIf.own, hidden, awaitingEmployer: awaiting, anchor, ...(crownedOffset !== undefined ? { crownedOffset } : {}) })
  const apply = trayApply({ draft, committed: recommendation !== undefined ? whatIf.shown : whatIf.own, pendingDiffers: recommendation === undefined && view.pendingDiffers, current, readOnly })
  // What Apply last said, held for the state it was said in: a write's words for the bundle shown after it and the edits
  // typed since (none), so the first edit typed after an Apply takes "Applied" away and the line says it waits for
  // Refresh (round 3 of the milestone-1 review: "Your plan now holds these changes" stood beside an edit the plan did
  // not hold); a refusal's for the bundle shown, the edits typed and Apply's own state together, so "waits until this
  // what-if is worked out" goes when the run lands and "waits for Refresh" when Back undoes the edit (an aria-disabled
  // Apply still takes a press). A writer's refusal over an open Apply stays until one of them moves. The state is read on
  // the render after the press (`key: null` until then): a write's reset of the bundles, and a figure the press's own
  // blur committed, have both landed by then, and the press's render saw neither (insight 036).
  const [said, setSaid] = useState<{ readonly words: string; readonly applied: boolean; readonly key: string | null } | null>(null)
  const editsKey = `${whatIf.shownKey}|${canonicalIdentityToken(whatIf.pending)}`
  const stateKey = (applied: boolean) => (applied ? editsKey : `${editsKey}|${apply.kind}`)
  if (said !== null && said.key === null) setSaid({ ...said, key: stateKey(said.applied) })
  // Said once: the words go when their state moves on, so a later return to the same bundle (a Reset back to the empty
  // one after a write) never brings back "Applied" for a write that press did not make.
  const saidStands = said !== null && (said.key === null || said.key === stateKey(said.applied))
  if (said !== null && !saidStands) setSaid(null)
  const saidNow = saidStands ? said.words : null
  const [editOpen, setEditOpen] = useState(false)
  const [line, setLine] = useState<{ readonly open: boolean; readonly editing?: WhatIfBudgetLineV6 }>({ open: false })
  const applyId = useId()

  // A focus ask: open at the lever's first row and bring focus to its first control (the panel mounts on open, so the
  // row is looked for over a few frames).
  useEffect(() => {
    if (focus === undefined) return
    let frames = 0
    let raf = 0
    // (Until RC18 a door inside the closing assumption panel waited here for its sheet to hand focus back first; the
    // doors that come here now are Settings' rows and Health Care's tray, page buttons with no sheet to close.)
    const look = () => {
      // The lever's first row that holds a control: a group's own row (Social Security's, the pace's) holds none.
      const rows = document.querySelectorAll<HTMLElement>(`#${CSS.escape(id)} [data-tray-group="${focus.lever}"]`)
      for (const row of rows) {
        const target = row.querySelector<HTMLElement>('input, [role="combobox"], [role="slider"], button:not([inert])')
        if (target === null) continue
        target.focus()
        if (typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'center' })
        return
      }
      if (++frames < 240) raf = requestAnimationFrame(look)
    }
    raf = requestAnimationFrame(look)
    return () => cancelAnimationFrame(raf)
  }, [focus, id])

  /** Blur the box under focus (its commit, or its refusal, lands first), then whether any tray box holds text it could
   *  not read: Refresh and Apply stop while one does, the box's own words saying why. */
  const refusedBoxHeld = (): boolean => {
    const tray = document.getElementById(id)
    const active = document.activeElement
    if (active instanceof HTMLElement && tray?.contains(active) === true) active.blur()
    return tray?.querySelector('[data-typed-refused]') != null
  }

  const set = whatIf.setLever
  const rows = (list: readonly TrayRowView[]) => list.map((row) => <Row key={`${row.id}|${whatIf.epoch}`} row={row} {...{ set, draft, anchor, wallCalendarYear, awaiting, onAwaiting, pending: whatIf.pending, onOpenLine: (l: WhatIfBudgetLineV6) => setLine({ open: true, editing: l }) }} />)

  // One line of words beside the footer's buttons: what Apply last said, else that the tray's edits wait for Refresh,
  // else why Apply is shut (or the note an open Apply carries).
  const words = saidNow ?? (recommendation === undefined && view.pendingDiffers ? copy.trayPending : (apply.words ?? null))
  const footer = (
    <div className="flex flex-col gap-4">
      {view.refusal !== undefined ? (
        <p role="alert" className="text-body text-stone-900" data-tray-refusal="">
          {view.refusal}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p id={applyId} className="min-w-0 flex-1 basis-64 text-label text-stone-600" data-tray-words="">
          {words ?? ''}
        </p>
        {recommendation === undefined ? (
          <>
            <Button variant="quiet" icon={<Undo2 size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={whatIf.reset}>
              {copy.trayReset}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              {copy.trayEdit}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!refusedBoxHeld()) whatIf.refresh()
              }}
              data-tray-refresh=""
            >
              {copy.trayRefresh}
            </Button>
          </>
        ) : null}
        {apply.kind !== 'hidden' ? (
          <Button
            variant="secondary"
            aria-disabled={apply.kind !== 'open'}
            aria-describedby={words !== null ? applyId : undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => {
              if (refusedBoxHeld()) return
              const { words: w, applied } = whatIf.apply()
              setSaid({ words: w, applied, key: null })
              announce(w)
            }}
          >
            {copy.workbenchRailApply}
          </Button>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <Tray id={id} open={open} onOpenChange={onOpenChange} title={copy.trayHandle} closeLabel={copy.trayClose} footer={footer}>
        {recommendation !== undefined ? (
          <div className="col-span-full flex flex-col items-start gap-3 laptop:col-span-2" data-tray-recommendation="">
            <p className="text-body text-stone-900">{recommendation}</p>
            <p className="text-label text-stone-600">{copy.workbenchRailRecShowing}</p>
            <Button variant="quiet" onClick={() => whatIf.setMode('own')}>
              {copy.workbenchRailRecLeave}
            </Button>
          </div>
        ) : (
          <>
            <TrayColumn editedLabel={editedLabel} comparedLabel={copy.probabilityPlanTitle}>
              {view.left.map((s) => (
                <TraySection key={s.id} title={s.title}>
                  {rows(s.rows)}
                  {s.notes.map((note) => (
                    <p key={note} className="col-span-full pt-2 text-label text-stone-600 wide:pl-4">
                      {note}
                    </p>
                  ))}
                </TraySection>
              ))}
            </TrayColumn>
            <TrayColumn editedLabel={editedLabel} comparedLabel={copy.probabilityPlanTitle}>
              {view.right.map((s) => (
                <TraySection key={s.id} title={s.title}>
                  {rows(s.rows)}
                  {s.notes.map((note) => (
                    <p key={note} className="col-span-full pt-2 text-label text-stone-600 wide:pl-4">
                      {note}
                    </p>
                  ))}
                </TraySection>
              ))}
            </TrayColumn>
          </>
        )}
      </Tray>
      <EditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        sections={view.editSections}
        hidden={hidden}
        canAddLine={view.canAddLine}
        onAddLine={() => {
          // The line's drawer replaces the Edit drawer (one modal at a time, RightCapital's "opens its data-entry
          // drawer at once"): the checklist's unsaved ticks go with it.
          setEditOpen(false)
          setLine({ open: true })
        }}
        onSave={(next) => {
          onHidden(next)
          whatIf.setPending(withoutHidden(whatIf.pending, next))
          const stillAwaiting = awaitingWithoutHidden(awaiting, next)
          if (stillAwaiting !== awaiting) onAwaiting(stillAwaiting)
        }}
      />
      <LineDrawer
        key={`${line.editing?.id ?? 'new'}|${String(line.open)}`}
        open={line.open}
        editing={line.editing}
        draft={draft}
        pending={whatIf.pending}
        onClose={() => setLine({ open: false })}
        onSave={(l) => set(`spending:line:${l.id}`, { kind: 'spending', op: 'add', line: l })}
        onDelete={(l) => set(`spending:line:${l.id}`, null)}
      />
    </>
  )
}

// ── One row ──────────────────────────────────────────────────────────────────────────────────────────────────────────

interface RowProps {
  readonly row: TrayRowView
  readonly set: WhatIf['setLever']
  readonly draft: ScenarioDraft
  readonly anchor: BandPlanClockAnchor
  readonly wallCalendarYear: number
  readonly pending: readonly WhatIfLeverV6[]
  readonly awaiting: ReadonlyMap<string, number>
  readonly onAwaiting: (awaiting: ReadonlyMap<string, number>) => void
  readonly onOpenLine: (line: WhatIfBudgetLineV6) => void
}

const TIERS: readonly { readonly value: BudgetTier; readonly label: string }[] = [
  { value: 'essentials', label: copy.budgetTierEssentials },
  { value: 'discretionary', label: copy.budgetTierDiscretionary },
]
const LINE_CHOICES: readonly { readonly value: BudgetTier | 'out'; readonly label: string }[] = [...TIERS, { value: 'out', label: copy.trayLineOut }]

function Notes({ notes, error }: { readonly notes: readonly string[]; readonly error?: string | undefined }) {
  if (notes.length === 0 && error === undefined) return undefined
  return (
    <>
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      {error !== undefined ? (
        <p role="alert" className="text-stone-900">
          {error}
        </p>
      ) : null}
    </>
  )
}

function Row({ row, set, draft, anchor, wallCalendarYear, pending, awaiting, onAwaiting, onOpenLine }: RowProps) {
  const [error, setError] = useState<string | undefined>(undefined)
  const c = row.control
  const back = (onBack: () => void) => <Back label={row.label} pulled={row.changed} onBack={onBack} />
  const lever = pending.find((l) => leverTarget(l) === row.id)
  const common = { rowId: row.id, group: row.lever, label: row.label, compared: row.compared, ...(row.indent === true ? { indent: true } : {}) }
  const notes = (extra?: string) => <Notes notes={row.notes} error={extra ?? error} />
  const withNotes = (n: ReactNode) => (n === undefined ? {} : { notes: n })

  switch (c.kind) {
    case 'stop': {
      const commit = (y: number | undefined) => {
        if (y === undefined) return set('stop-year', null)
        if (y < c.min || y > c.max) return setError(slots.workbenchRailRefusedStopWindow(c.min, c.max))
        setError(undefined)
        set('stop-year', stopCommit(Number(row.compared), y))
      }
      return (
        <TrayRow
          back={back(() => set('stop-year', null))}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              <Slider label={row.label} value={c.value} min={c.min} max={c.max} onValueChange={(y) => commit(y)} className={SLIDER} />
              <WholeInput label={row.label} hideLabel value={c.value} changed={row.changed} invalidMessage={copy.trayInvalidWhole} onCommit={commit} className={NARROW_BOX} />
            </>
          }
        />
      )
    }
    case 'deposit': {
      const id = row.id
      const label = slots.workbenchRailDepositLabel(c.offer.name)
      const without = () => {
        const next = new Map(awaiting)
        next.delete(c.offer.accountId)
        return next
      }
      return (
        <TrayRow
          back={back(() => {
                onAwaiting(without())
                set(id, null)
              })}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              <MoneyInput
                label={label}
                hideLabel
                value={c.value}
                changed={row.changed}
                invalidMessage={copy.errBudgetAmountNonFinite}
                className={WIDE_BOX}
                onCommit={(v) => {
                  const out = depositCommit(c.offer, lever, v)
                  const next = without()
                  if (out.awaiting !== undefined) next.set(c.offer.accountId, out.awaiting)
                  onAwaiting(next)
                  set(id, out.lever)
                }}
              />
            </>
          }
        />
      )
    }
    case 'employer': {
      const id = `deposits:${c.offer.accountId}`
      return (
        <TrayRow
          {...common}
          {...withNotes(notes())}
          control={
            <MoneyInput
              label={row.label}
              hideLabel
              value={c.value}
              changed={row.changed}
              invalidMessage={copy.errBudgetAmountNonFinite}
              className={WIDE_BOX}
              onCommit={(v) => {
                const next = employerCommit(c.offer, c.deposit, v)
                if (next === null) return
                const m = new Map(awaiting)
                m.delete(c.offer.accountId)
                onAwaiting(m)
                set(id, next)
              }}
            />
          }
        />
      )
    }
    case 'total':
      return (
        <TrayRow
          back={back(() => set('spending:total', null))}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              <MoneyInput
                label={copy.workbenchRailSpendTotalLabel}
                hideLabel
                value={c.value}
                changed={row.changed}
                invalidMessage={copy.errBudgetAmountNonFinite}
                className={WIDE_BOX}
                onCommit={(v) => set('spending:total', totalCommit(c.plan, v))}
              />
            </>
          }
        />
      )
    case 'line': {
      const name = row.label
      const write = (next: WhatIfBudgetLineV6) => set(row.id, lineCommit(c.line, next))
      return (
        <TrayRow
          back={back(() => set(row.id, null))}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              {/* Taken out, the box stays (locked) so nothing in the row moves under the press. */}
              <MoneyInput
                label={slots.workbenchRailLineAmount(name)}
                hideLabel
                value={c.shown.annualAmountReal}
                readOnly={c.removed}
                changed={lever?.kind === 'spending' && lever.op === 'replace' && lever.line.annualAmountReal !== c.line.annualAmountReal}
                invalidMessage={copy.errBudgetAmountNonFinite}
                className={WIDE_BOX}
                onCommit={(v) => write({ ...c.shown, annualAmountReal: v ?? c.line.annualAmountReal })}
              />
              {/* The line's kind, or taken out of this what-if: one picker, so the row holds two controls at the tray's width. */}
              <Select<BudgetTier | 'out'>
                label={slots.workbenchRailLineTier(name)}
                hideLabel
                items={LINE_CHOICES}
                value={c.removed ? 'out' : c.shown.tier}
                changed={c.removed || c.shown.tier !== c.line.tier}
                onValueChange={(choice) =>
                  choice === 'out' ? set(row.id, { kind: 'spending', op: 'remove', lineId: c.line.id }) : write({ ...(c.removed ? c.line : c.shown), tier: choice })
                }
                className="min-w-0"
              />
            </>
          }
        />
      )
    }
    case 'added':
      return (
        <TrayRow
          back={back(() => set(row.id, null))}
          {...common}
          label={
            <button type="button" className="cursor-pointer text-left text-body text-blue-ink underline underline-offset-2" onClick={() => onOpenLine(c.line)} data-tray-line-link="">
              {row.label}
            </button>
          }
          {...(row.added !== undefined ? { added: row.added } : {})}
          {...withNotes(notes())}
          control={
            <>
              <span className="text-body text-stone-900 tabular-nums">{slots.workbenchRailPerYear(railMoney(c.line.annualAmountReal))}</span>
            </>
          }
        />
      )
    case 'claim': {
      const commit = (age: number | undefined) => {
        if (age === undefined) {
          setError(undefined)
          return set(row.id, null)
        }
        const out = claimCommit(c.offer, age)
        if ('error' in out) return setError(out.error)
        setError(undefined)
        set(row.id, out.lever)
      }
      return (
        <TrayRow
          back={back(() => {
                setError(undefined)
                set(row.id, null)
              })}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              <Slider label={slots.workbenchRailClaimLabel(c.offer.possessive)} value={c.value} min={c.min} max={c.max} onValueChange={(a) => commit(a)} className={SLIDER} />
              <WholeInput label={slots.workbenchRailClaimLabel(c.offer.possessive)} hideLabel value={c.value} changed={row.changed} invalidMessage={copy.trayInvalidWhole} onCommit={commit} className={NARROW_BOX} />
            </>
          }
        />
      )
    }
    case 'order': {
      const planOrder = { policy: draft.drawdownPolicy, order: draft.drawdownOrder }
      const send = (p: DrawdownPolicy, o: typeof c.order) => set('withdrawal-order', orderCommit(planOrder, p, o))
      return (
        <>
          <TrayRow
          back={back(() => set('withdrawal-order', null))}
            {...common}
            {...withNotes(notes())}
            control={
              <>
                <Select<DrawdownPolicy>
                  label={row.label}
                  hideLabel
                  items={c.offered.map((p) => ({ value: p, label: policyLabel(p) }))}
                  value={c.policy}
                  changed={row.changed}
                  onValueChange={(p) => send(p, c.order)}
                  className="min-w-0"
                />
              </>
            }
          />
          {c.policy === 'custom'
            ? c.order.map((key, i) => (
                <TrayRow
                  key={key}
                  rowId={`withdrawal-order:${key}`}
                  group="withdrawal-order"
                  indent
                  label={`${i + 1}. ${bucketWords(key)}`}
                  compared=""
                  control={
                    <>
                      <Button variant="neutral" size="sm" aria-label={`${copy.leverOrderMoveUp}: ${bucketWords(key)}`} aria-disabled={i === 0} onClick={() => send('custom', moveBucket(c.order, key, -1))}>
                        <span aria-hidden="true">{copy.leverOrderUpGlyph}</span>
                      </Button>
                      <Button
                        variant="neutral"
                        size="sm"
                        aria-label={`${copy.leverOrderMoveDown}: ${bucketWords(key)}`}
                        aria-disabled={i === c.order.length - 1}
                        onClick={() => send('custom', moveBucket(c.order, key, 1))}
                      >
                        <span aria-hidden="true">{copy.leverOrderDownGlyph}</span>
                      </Button>
                    </>
                  }
                />
              ))
            : null}
        </>
      )
    }
    case 'roth':
      return <RothRows row={row} plan={c.plan} held={c.held} set={set} draft={draft} anchor={anchor} wallCalendarYear={wallCalendarYear} common={common} back={back} />
    case 'mix':
      return <MixRows row={row} held={c.held} set={set} common={common} back={back} />
    case 'group':
      return <TrayRow {...common} {...(row.notes.length > 0 ? { notes: <Notes notes={row.notes} /> } : {})} control={null} />
    case 'pace':
      return <PaceRows row={row} offer={c.offer} value={c.value} set={set} common={common} back={back} />
    case 'aca':
      return (
        <TrayRow
          back={back(() => set('aca-subsidy', null))}
          {...common}
          {...withNotes(notes())}
          control={
            <>
              <Select<'enhanced' | 'reverted'>
                label={row.label}
                hideLabel
                items={[
                  { value: 'reverted', label: copy.leverHealthRegimeReverted },
                  { value: 'enhanced', label: copy.leverHealthRegimeEnhanced },
                ]}
                value={c.value ? 'enhanced' : 'reverted'}
                changed={row.changed}
                onValueChange={(v) => set('aca-subsidy', acaCommit(c.plan, v === 'enhanced'))}
                className="min-w-0"
              />
            </>
          }
        />
      )
  }
}

type Common = { readonly rowId: string; readonly group: string; readonly label: string; readonly compared: string; readonly indent?: boolean }

function RothRows({
  row,
  plan,
  held,
  set,
  draft,
  anchor,
  wallCalendarYear,
  common,
  back,
}: {
  readonly row: TrayRowView
  readonly plan: Extract<TrayRowView['control'], { kind: 'roth' }>['plan']
  readonly held: Extract<TrayRowView['control'], { kind: 'roth' }>['held']
  readonly set: WhatIf['setLever']
  readonly draft: ScenarioDraft
  readonly anchor: BandPlanClockAnchor
  readonly wallCalendarYear: number
  readonly common: Common
  readonly back: (onBack: () => void) => ReactNode
}) {
  const shownPlan = held === 'none' ? undefined : (held ?? plan)
  const [mode, setMode] = useState<'none' | 'amount'>(shownPlan === undefined ? 'none' : 'amount')
  const [fields, setFields] = useState<RothFields>(() => rothFieldsFor(held, plan, draft.startCalendarYear, wallCalendarYear))
  const [wait, setWait] = useState<string | undefined>(undefined)
  const send = (m: 'none' | 'amount', f: RothFields) => {
    const out = rothCommit(plan, m, f, draft.startCalendarYear, anchor, wallCalendarYear)
    if (out.kind === 'wait') {
      setWait(out.words)
      return
    }
    setWait(undefined)
    set('roth', out.lever)
  }
  const field = (key: keyof RothFields) => (v: number | undefined) => {
    const next = { ...fields, [key]: v }
    setFields(next)
    send(mode, next)
  }
  const fieldRow = (key: keyof RothFields, label: string, input: ReactNode) => (
    <TrayRow rowId={`roth:${key}`} group="roth" indent label={label} compared="" control={input} />
  )
  return (
    <>
      <TrayRow
          back={back(() => {
              setMode(plan === undefined ? 'none' : 'amount')
              setFields(rothFieldsFor(undefined, plan, draft.startCalendarYear, wallCalendarYear))
              setWait(undefined)
              set('roth', null)
            })}
        {...common}
        {...(wait !== undefined || row.notes.length > 0 ? { notes: <Notes notes={row.notes} error={wait} /> } : {})}
        control={
          <>
            <Select<'none' | 'amount'>
              label={row.label}
              hideLabel
              items={[
                { value: 'none', label: copy.workbenchRailRothNone },
                { value: 'amount', label: copy.workbenchRailRothAmount },
              ]}
              value={mode}
              changed={row.changed}
              onValueChange={(m) => {
                setMode(m)
                send(m, fields)
              }}
              className="min-w-0"
            />
          </>
        }
      />
      {mode === 'amount' ? (
        <>
          {fieldRow('amount', copy.leverRothAmountLabel, <MoneyInput label={copy.leverRothAmountLabel} hideLabel value={fields.amount} changed={row.changed} invalidMessage={copy.errBudgetAmountNonFinite} onCommit={field('amount')} className={WIDE_BOX} />)}
          {fieldRow('startYear', copy.leverRothStartLabel, <WholeInput label={copy.leverRothStartLabel} hideLabel value={fields.startYear} changed={row.changed} invalidMessage={copy.trayInvalidWhole} onCommit={field('startYear')} className={NARROW_BOX} />)}
          {fieldRow('years', copy.leverRothYearsLabel, <WholeInput label={copy.leverRothYearsLabel} hideLabel value={fields.years} changed={row.changed} invalidMessage={copy.trayInvalidWhole} onCommit={field('years')} className={NARROW_BOX} />)}
        </>
      ) : null}
    </>
  )
}

/** An inherited IRA's pace (U17): the rule, and for "ending in a chosen year" an indented year row. The rule is held here
 *  while its year is blank or refused, as the Roth row holds its mode: no lever until the year reads (`paceCommit`). */
function PaceRows({
  row,
  offer,
  value,
  set,
  common,
  back,
}: {
  readonly row: TrayRowView
  readonly offer: Extract<TrayRowView['control'], { kind: 'pace' }>['offer']
  readonly value: InheritedPace
  readonly set: WhatIf['setLever']
  readonly common: Common
  readonly back: (onBack: () => void) => ReactNode
}) {
  const yearOf = (p: InheritedPace) => (p.kind === 'even-to-year' ? p.lastYear : undefined)
  const [kind, setKind] = useState<InheritedPace['kind']>(value.kind)
  const [year, setYear] = useState<number | undefined>(yearOf(value))
  const [wait, setWait] = useState<string | undefined>(undefined)
  const send = (k: InheritedPace['kind'], y: number | undefined) => {
    const out = paceCommit(offer, k, y)
    if (out.kind === 'wait') {
      setWait(out.words)
      return
    }
    setWait(undefined)
    set(row.id, out.lever)
  }
  return (
    <>
      <TrayRow
        back={back(() => {
          setKind(offer.plan.kind)
          setYear(yearOf(offer.plan))
          setWait(undefined)
          set(row.id, null)
        })}
        {...common}
        {...(wait !== undefined || row.notes.length > 0 ? { notes: <Notes notes={row.notes} error={wait} /> } : {})}
        control={
          <>
            <Select<InheritedPace['kind']>
              label={row.label}
              hideLabel
              items={[
                { value: 'law-minimum', label: copy.trayPaceLawMinimum },
                { value: 'even', label: slots.trayPaceEven(offer.lastYear) },
                { value: 'even-to-year', label: copy.trayPaceChosen },
              ]}
              value={kind}
              changed={row.changed || kind !== offer.plan.kind}
              onValueChange={(k) => {
                setKind(k)
                send(k, year)
              }}
              // Its longest choice wraps inside the box: grown to its words, the box widened the tray's shared control
              // column until the names beside it broke inside a word ("Roth conversion / s" at 1440 px).
              className={PACE_BOX}
            />
          </>
        }
      />
      {kind === 'even-to-year' ? (
        <TrayRow
          rowId={`${row.id}:year`}
          group="inherited-pace"
          indent
          label={copy.trayPaceYear}
          compared=""
          control={
            <WholeInput
              label={slots.trayPaceYearOf(offer.name)}
              hideLabel
              value={year}
              changed={row.changed}
              invalidMessage={copy.trayInvalidWhole}
              className={NARROW_BOX}
              onCommit={(y) => {
                setYear(y)
                send('even-to-year', y)
              }}
            />
          }
        />
      ) : null}
    </>
  )
}

function MixRows({
  row,
  held,
  set,
  common,
  back,
}: {
  readonly row: TrayRowView
  readonly held: Extract<TrayRowView['control'], { kind: 'mix' }>['held']
  readonly set: WhatIf['setLever']
  readonly common: Common
  readonly back: (onBack: () => void) => ReactNode
}) {
  const [parts, setParts] = useState<{ stock?: number; bond?: number; cash?: number }>(held ?? {})
  const [error, setError] = useState<string | undefined>(undefined)
  const commit = (next: typeof parts) => {
    setParts(next)
    const out = mixCommit(next)
    setError(out.error)
    if (out.lever !== undefined) set('mix', out.lever)
  }
  const part = (key: 'stock' | 'bond' | 'cash', label: string) => (
    <TrayRow
      rowId={`mix:${key}`}
      group="mix"
      indent
      label={label}
      compared=""
      control={
        <WholeInput
          label={label}
          hideLabel
          suffix="%"
          value={parts[key]}
          changed={row.changed}
          invalidMessage={copy.trayInvalidWhole}
          className={NARROW_BOX}
          onCommit={(v) => commit({ ...parts, [key]: v !== undefined && v <= 100 ? v : undefined })}
        />
      }
    />
  )
  return (
    <>
      <TrayRow
        {...common}
        notes={<Notes notes={row.notes} error={error} />}
        control={null}
        back={back(() => {
          setParts({})
          setError(undefined)
          set('mix', null)
        })}
      />
      {part('stock', copy.workbenchRailMixStocks)}
      {part('bond', copy.workbenchRailMixBonds)}
      {part('cash', copy.workbenchRailMixCash)}
    </>
  )
}

// ── The Edit drawer ──────────────────────────────────────────────────────────────────────────────────────────────────

function EditDrawer({
  open,
  onOpenChange,
  sections,
  hidden,
  canAddLine,
  onAddLine,
  onSave,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly sections: ReturnType<typeof trayView>['editSections']
  readonly hidden: ReadonlySet<string>
  readonly canAddLine: boolean
  readonly onAddLine: () => void
  readonly onSave: (hidden: ReadonlySet<string>) => void
}) {
  const [draftHidden, setDraftHidden] = useState<ReadonlySet<string>>(hidden)
  // Each opening starts from the rows shown now.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraftHidden(hidden)
  }
  const all = sections.flatMap((s) => s.items.map((i) => i.id))
  const allShown = all.every((i) => !draftHidden.has(i))
  const toggle = (itemId: string, show: boolean) => {
    const next = new Set(draftHidden)
    if (show) next.delete(itemId)
    else next.add(itemId)
    setDraftHidden(next)
  }
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={copy.trayEditTitle}
      closeLabel={copy.trayClose}
      cancelLabel={copy.trayCancel}
      saveLabel={copy.traySave}
      onSave={() => onSave(draftHidden)}
    >
      <div className="flex flex-col gap-6" data-tray-edit="">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-intro text-stone-900">{copy.trayEditSections}</h3>
          <Checkbox label={copy.trayEditSelectAll} checked={allShown} onCheckedChange={(c) => setDraftHidden(c ? new Set() : new Set(all))} />
        </div>
        <DrawerFields>
          {sections.map((s) => (
            <fieldset key={s.title} className="flex flex-col gap-2">
              <legend className="pb-2 text-body font-semibold text-stone-900">{s.title}</legend>
              {s.items.map((item) => (
                <Checkbox key={item.id} label={item.label} checked={!draftHidden.has(item.id)} onCheckedChange={(c) => toggle(item.id, c)} />
              ))}
            </fieldset>
          ))}
        </DrawerFields>
        <p className="text-label text-stone-600">{copy.trayEditHideNote}</p>
        {canAddLine ? (
          <div>
            <AddMenu label={copy.trayEditAddNew} items={[{ id: 'expenses', label: copy.traySectionExpenses, items: [{ id: 'line', label: copy.trayEditAddLine, onSelect: onAddLine }] }]} />
          </div>
        ) : null}
      </div>
    </Drawer>
  )
}

// ── The spending line drawer ─────────────────────────────────────────────────────────────────────────────────────────

interface NewLine {
  readonly label: string
  readonly amount?: number
  readonly tier: BudgetTier
  readonly startYear?: number
  readonly endYear?: number
}

function LineDrawer({
  open,
  editing,
  draft,
  pending,
  onClose,
  onSave,
  onDelete,
}: {
  readonly open: boolean
  readonly editing: WhatIfBudgetLineV6 | undefined
  readonly draft: ScenarioDraft
  readonly pending: readonly WhatIfLeverV6[]
  readonly onClose: () => void
  readonly onSave: (line: WhatIfBudgetLineV6) => void
  readonly onDelete: (line: WhatIfBudgetLineV6) => void
}) {
  const [line, setLineState] = useState<NewLine>(
    editing !== undefined
      ? { label: editing.label, amount: editing.annualAmountReal, tier: editing.tier, startYear: editing.startYear, ...(editing.endYear !== undefined ? { endYear: editing.endYear } : {}) }
      : { label: '', tier: 'essentials', startYear: 0 },
  )
  // Save reads the line through a ref: the kit's Save blurs the focused box first, and that blur's commit lands here in
  // the same press, before the render that would refresh `line` (insights 036 and 149). A box that refused its text
  // commits nothing and the kit's Save stops on its mark, so no refused figure is ever staged (milestone 3's review, X1).
  const lineRef = useRef(line)
  const setLine = (next: (l: NewLine) => NewLine) => {
    lineRef.current = next(lineRef.current)
    setLineState(lineRef.current)
  }
  const [error, setError] = useState<string | undefined>(undefined)
  const nameId = useId()
  const anyWorking = draft.people.some((p) => p.workStatus === 'working')
  const windowHelp = anyWorking ? copy.budgetWindowHelp : slots.budgetWindowHelpRetired(draft.startCalendarYear)
  // Where year 0 is the plan's first year (no one working: the help names it), each box names the calendar year its count
  // lands on, as the Living worksheet does; never under a blank box.
  const yearLine = (offset: number | undefined) =>
    !anyWorking && offset !== undefined ? { description: slots.budgetWindowYearIs(draft.startCalendarYear + offset) } : {}
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={copy.trayLineTitle}
      closeLabel={copy.trayClose}
      cancelLabel={copy.trayCancel}
      saveLabel={copy.traySave}
      onSave={() => {
        const now = lineRef.current
        const { amount, startYear, endYear } = now
        if (amount === undefined || startYear === undefined || (endYear !== undefined && endYear < startYear)) {
          setError(endYear !== undefined && startYear !== undefined && endYear < startYear ? copy.errBudgetWindowReversed : copy.workbenchRailAddLineNeeds)
          return false
        }
        const id =
          editing?.id ?? freshStableId(new Set([...idsInUse(draft), ...pending.flatMap((l) => (l.kind === 'spending' && l.op !== 'remove' && l.op !== 'total' ? [l.line.id] : []))]))
        onSave({ id, category: editing?.category ?? 'other', label: now.label.trim(), annualAmountReal: amount, tier: now.tier, startYear, ...(endYear !== undefined ? { endYear } : {}) })
        onClose()
        return true
      }}
      {...(editing !== undefined ? { deleteLabel: copy.trayLineDelete, onDelete: () => onDelete(editing) } : {})}
    >
      <div className="flex flex-col gap-6" data-tray-line="">
        <DrawerFields>
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-body text-stone-900">
              {copy.budgetLineLabelLabel}
            </label>
            <input
              id={nameId}
              type="text"
              autoComplete="off"
              value={line.label}
              onChange={(e) => setLine((l) => ({ ...l, label: e.target.value }))}
              className="h-10 rounded-control border border-stone-300 bg-bg px-3 text-body text-stone-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-ink"
            />
          </div>
          <MoneyInput label={copy.budgetAmountLabel} value={line.amount} invalidMessage={copy.errBudgetAmountNonFinite} onCommit={(v) => setLine((l) => ({ ...l, ...(v === undefined ? { amount: undefined } : { amount: v }) }))} />
          <Select<BudgetTier> label={copy.budgetTierLegend} items={TIERS} value={line.tier} onValueChange={(tier) => setLine((l) => ({ ...l, tier }))} />
          <span aria-hidden="true" className="hidden wide:block" />
          <WholeInput
            label={copy.budgetWindowFromLabel}
            value={line.startYear}
            invalidMessage={copy.profileInvalidYearOffset}
            {...yearLine(line.startYear)}
            onCommit={(v) => setLine((l) => ({ ...l, ...(v === undefined ? { startYear: undefined } : { startYear: v }) }))}
          />
          <WholeInput
            label={copy.budgetWindowThroughLabel}
            value={line.endYear}
            invalidMessage={copy.profileInvalidYearOffset}
            {...yearLine(line.endYear)}
            onCommit={(v) => setLine((l) => ({ ...l, ...(v === undefined ? { endYear: undefined } : { endYear: v }) }))}
          />
        </DrawerFields>
        <p className={cn('text-label text-stone-600')}>{windowHelp}</p>
        {error !== undefined ? (
          <p role="alert" className="text-body text-stone-900">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
