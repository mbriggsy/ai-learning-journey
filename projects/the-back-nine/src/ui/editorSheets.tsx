/*
 * src/ui/editorSheets.tsx — the ONE home of the plan's lever sheets and their writes (Act 5, U8).
 *
 * The budget builder, the healthcare sheet and the AssumptionPanel each write the draft through one write (an atomic reconciliation patch, a biconditional pair, a single-key fence:
 * insight 058), then recompute. They used to be hosted by Result alone. The workbench room's facts page opens the
 * same sheets, so the hosting moved here and both screens call it, and an edit made from the room is the same edit
 * made from the answer. The lever sheets' writes themselves live in `src/intake/whatIf.ts` (U14), shared with the
 * what-if's `applyBundle` and U15's Apply, so Apply writes exactly what was compared. The withdrawal-order and Roth
 * sheets left with Act 6 · RC4b: both levers are tried in Probability's Action Items tray and written by its Apply, so
 * the AssumptionPanel's rows for them open the tray at that row (`onOpenSequencing`, `onOpenRoth`, the host's).
 *
 * What moved with them: the open state, the sheets' JSX and writes, the preview runner (`runPreview`, params
 * from the CURRENT draft at each call), the notes the sheets read (`medicarePricedNote`, `statePricedNote`,
 * `acaPricedNote`, the health readout), and the recompute cadences. Result keeps its own copies of what its
 * heroes read (the answered draft's notes, KTD5), and keeps the GoalPicker.
 *
 * THE RECOMPUTE CADENCES, one home each:
 *  - {@link recomputeBoth}: provisional then final; a provisional a newer edit superseded sends no final (W9-R7,
 *    R6, KTD7). The sheets' Apply has always run it on either route.
 *  - {@link recomputeAfterEdit}: ROUTE-AWARE (the ratified F6 policy): the date route runs `recomputeBoth`; the
 *    spine runs the final alone (its two tiers are byte-identical, so a provisional is waste). The panel's
 *    commits and the workbench's step sheet run it. The route is read AFTER the edit lands.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { buildControlPreviewParams, pricedStateForRun } from '@intake/intakeMap'
import { BudgetBuilder } from '@intake/BudgetBuilder'
import { HealthcareSheet } from '@intake/HealthcareSheet'
import { AssumptionPanel } from '@intake/AssumptionPanel'
import type { MissingFact } from '@intake/intakeMap'
import { withBudgetItems, withEnhancedSubsidies, withoutBudget } from '@intake/whatIf'
import { previewRunsInWorker, runControlPreview } from '@store/controlPreview'
import type { MemoryModel, MemoryModelSnapshot, ScenarioDraft } from '@store/memoryModel'
import type { TwoArmControl } from '@shared/model'
import type { BandPlanClockAnchor } from './bandAnnotations'
import type { AssumptionLandingSeat } from './assumptionRegistry'
import { currentEpochDay } from './scenarioFromDraft'
import { recomputeAfterEdit, recomputeBoth } from './recompute'

export interface EditorSheetsArgs {
  readonly model: MemoryModel
  /** The store's live snapshot (the host re-renders on every notify). */
  readonly snapshot: MemoryModelSnapshot
  /** The still-missing required facts (the panel's echo names them). */
  readonly missing: readonly MissingFact[]
  /** The host's ONE plan-clock anchor (never a second clock read). */
  readonly savedAnchor: BandPlanClockAnchor
  /** Where a sheet's focus lands on close when its opening control has unmounted (re-queried at close). */
  readonly restoreFallback: () => HTMLElement | null
  /** The panel's guided re-walk. Absent ⇒ the panel draws none (the workbench room). */
  readonly onReview?: () => void
  /** The panel's collections row, where it differs from the re-walk. Absent ⇒ `onReview`. */
  readonly onEditCollections?: () => void
  /** The panel's withdrawal-order and Roth rows: the host opens the Action Items tray at that row (RC4b). */
  readonly onOpenSequencing: () => void
  readonly onOpenRoth: () => void
}

export interface EditorSheets {
  readonly openBudget: () => void
  readonly openHealth: () => void
  /** Open the AssumptionPanel, landing at `seat` when given (`AssumptionLandingSeat`). */
  readonly openAssumptions: (seat?: AssumptionLandingSeat) => void
  /** Close every sheet (the shell, on a page change: a sheet never stays open over another page). `dropStaged`: the
   *  budget's staged rows go too, as a leave's ask says ("an entry not yet added is dropped"); a plain close keeps them
   *  for the next open. */
  readonly closeAll: (dropStaged?: boolean) => void
  /** A sheet or the panel owns focus and the accessibility tree (the heroes hold their landing focus). */
  readonly sheetOpen: boolean
  /** "Which PRICED state will the next run price?" — off the LIVE draft, route-aware (the sheets and the
   *  recommendation surface describe what they will run next; KTD5). */
  readonly statePricedNote: ReturnType<typeof pricedStateForRun>
  /** The three sheets, to render once in the host. */
  readonly node: ReactNode
}

export function useEditorSheets({
  model,
  snapshot,
  missing,
  savedAnchor,
  restoreFallback,
  onReview,
  onEditCollections,
  onOpenSequencing,
  onOpenRoth,
}: EditorSheetsArgs): EditorSheets {
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  // The budget builder keeps its staged rows across a close; a new key mounts it afresh from the draft (`closeAll`).
  const [budgetMount, setBudgetMount] = useState(0)
  // Where the assumptions panel lands when it opens. Dropped the moment the panel closes, on EVERY close and
  // route-away path at once (a render-phase reset), so the ordinary door never re-lands on a seat.
  const [assumptionsSeat, setAssumptionsSeat] = useState<AssumptionLandingSeat | undefined>(undefined)
  if (!assumptionsOpen && assumptionsSeat !== undefined) setAssumptionsSeat(undefined)

  const { draft } = snapshot
  // The state-tax unit (S5): which PRICED state the next run prices, off the route's own built overlay.
  const statePricedNote = useMemo(() => pricedStateForRun(snapshot.draft), [snapshot.draft])
  // The wire's per-year healthcare series (spine headline runs only — presence-keyed).
  const healthReadout = snapshot.answer.kind === 'headline' ? snapshot.answer.result.distribution.healthReadout : undefined
  // The date route's preview anchor: the CROWNED lifestyle offset; undefined (⇒ preview withheld) when no date
  // crowned or on the spine route.
  const crownedOffset =
    snapshot.answer.kind === 'date' &&
    snapshot.answer.outcome.kind === 'dates' &&
    'offsetYears' in snapshot.answer.outcome.lifestyle
      ? snapshot.answer.outcome.lifestyle.offsetYears
      : undefined
  // The preview runner the sheets inject: params from the CURRENT draft (composed per call), the household's
  // one CRN seed, latest-wins.
  const runPreview = useCallback(
    (control: TwoArmControl) => {
      const current = model.getSnapshot().draft
      const params = buildControlPreviewParams(current, crownedOffset)
      if (params === null || current.seed === undefined) return null
      return runControlPreview(params, current.seed, control)
    },
    [model, crownedOffset],
  )
  const both = useCallback(() => void recomputeBoth(model), [model])
  // The AssumptionPanel's ONE commit seam: apply the mutate atomically (it reads the store's CURRENT draft inside
  // the update — insight 036), then the route-aware recompute.
  const commitAssumptionEdit = useCallback(
    (mutate: (d: ScenarioDraft) => ScenarioDraft) => {
      model.update(mutate)
      recomputeAfterEdit(model)
    },
    [model],
  )

  const sheetOpen = budgetOpen || healthOpen || assumptionsOpen
  const openAssumptions = useCallback((seat?: AssumptionLandingSeat) => {
    setAssumptionsSeat(seat)
    setAssumptionsOpen(true)
  }, [])

  const closeAll = useCallback((dropStaged = false) => {
    setBudgetOpen(false)
    setHealthOpen(false)
    setAssumptionsOpen(false)
    if (dropStaged) setBudgetMount((n) => n + 1)
  }, [])

  const node = (
    <>
      <BudgetBuilder
        key={budgetMount}
        open={budgetOpen}
        draft={draft}
        onApply={(items) => {
          // The atomic reconciliation patch — the OOP figure reads the store's CURRENT draft inside the update
          // (insight 036), never a render-captured copy.
          model.update((d) => withBudgetItems(d, items))
          setBudgetOpen(false)
          both()
        }}
        onEscape={() => {
          // Back to a single number: budget → strictly-undefined; the scalar keeps its last reconciled value
          // (build-gate 2 — never `budget: []`).
          model.update(withoutBudget)
          setBudgetOpen(false)
          both()
        }}
        onClose={() => setBudgetOpen(false)}
        restoreFallback={restoreFallback}
      />
      <HealthcareSheet
        open={healthOpen}
        draft={draft}
        readout={healthReadout}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        statePricedNote={statePricedNote}
        restoreFallback={restoreFallback}
        savedAnchor={savedAnchor}
        todayEpochDay={currentEpochDay()}
        onApply={(enhanced) => {
          // THE SINGLE-KEY WRITE FENCE (insight 058): exactly one key moves — set the literal `true`, or STRIP
          // the key entirely (absence ≡ the statutory reverted regime — never `false`, DND/009).
          model.update((d) => withEnhancedSubsidies(d, enhanced))
          setHealthOpen(false)
          both()
        }}
        onClose={() => setHealthOpen(false)}
      />
      {/* U12 — via-sheet rows close this panel and open the fact's ONE editor home (insight 058). */}
      <AssumptionPanel
        open={assumptionsOpen}
        snapshot={snapshot}
        missing={missing}
        savedAnchor={savedAnchor}
        onCommitEdit={commitAssumptionEdit}
        onOpenBudget={() => {
          setAssumptionsOpen(false)
          setBudgetOpen(true)
        }}
        onOpenSequencing={() => {
          setAssumptionsOpen(false)
          onOpenSequencing()
        }}
        onOpenRoth={() => {
          setAssumptionsOpen(false)
          onOpenRoth()
        }}
        onOpenHealth={() => {
          setAssumptionsOpen(false)
          setHealthOpen(true)
        }}
        {...(onReview !== undefined
          ? {
              onReview: () => {
                setAssumptionsOpen(false)
                onReview()
              },
            }
          : {})}
        {...(onEditCollections !== undefined
          ? {
              onEditCollections: () => {
                setAssumptionsOpen(false)
                onEditCollections()
              },
            }
          : {})}
        onClose={() => setAssumptionsOpen(false)}
        initialSeat={assumptionsSeat}
        restoreFallback={restoreFallback}
      />
    </>
  )

  return {
    openBudget: useCallback(() => setBudgetOpen(true), []),
    openHealth: useCallback(() => setHealthOpen(true), []),
    openAssumptions,
    closeAll,
    sheetOpen,
    statePricedNote,
    node,
  }
}
