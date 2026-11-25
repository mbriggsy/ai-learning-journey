/*
 * src/ui/editorSheets.tsx — the AssumptionPanel's one mount, the gear's interim drawer until Act 6 · RC18 replaces it with
 * Settings (Act 5, U8; shrunk by RC13b to this one arm).
 *
 * The AssumptionPanel writes the draft through one write (a biconditional pair: insight 058), then recomputes. The budget
 * builder's sheet left with RC13b: the budget is Profile → Expenses' Living expenses drawer, and the panel's budget row
 * opens it (`onOpenBudget`, the host's). The lever sheets' writes themselves live in `src/intake/whatIf.ts` (U14), shared with the
 * what-if's `applyBundle` and U15's Apply, so Apply writes exactly what was compared. The withdrawal-order and Roth
 * sheets left with Act 6 · RC4b: both levers are tried in Probability's Action Items tray and written by its Apply, so
 * the AssumptionPanel's rows for them open the tray at that row (`onOpenSequencing`, `onOpenRoth`, the host's). The healthcare
 * sheet left with Act 6 · RC10: its picture is Retirement → Health Care, and the panel's subsidy-rules row opens that page
 * (`onOpenHealth`, the host's), whose Action Items tray tries the rules as a what-if on Analysis.
 *
 * The panel's commits run the route-aware recompute (`recomputeAfterEdit`, `src/ui/recompute.ts`): the date route runs
 * provisional then final, the spine the final alone. The route is read AFTER the edit lands.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { pricedStateForRun } from '@intake/intakeMap'
import { AssumptionPanel } from '@intake/AssumptionPanel'
import type { MissingFact } from '@intake/intakeMap'
import type { MemoryModel, MemoryModelSnapshot, ScenarioDraft } from '@store/memoryModel'
import type { BandPlanClockAnchor } from './bandAnnotations'
import type { AssumptionLandingSeat } from './assumptionRegistry'
import { recomputeAfterEdit } from './recompute'

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
  /** The panel's subsidy-rules row: the host opens Retirement → Health Care (RC10). */
  readonly onOpenHealth: () => void
  /** The panel's governed-spend row: the host opens Profile → Expenses' Living expenses drawer (RC13b). */
  readonly onOpenBudget: () => void
}

export interface EditorSheets {
  /** Open the AssumptionPanel, landing at `seat` when given (`AssumptionLandingSeat`). */
  readonly openAssumptions: (seat?: AssumptionLandingSeat) => void
  /** Close the panel (the shell, on a page change: a sheet never stays open over another page). */
  readonly closeAll: () => void
  /** A sheet or the panel owns focus and the accessibility tree (the heroes hold their landing focus). */
  readonly sheetOpen: boolean
  /** "Which PRICED state will the next run price?" — off the LIVE draft, route-aware (the sheets and the
   *  recommendation surface describe what they will run next; KTD5). */
  readonly statePricedNote: ReturnType<typeof pricedStateForRun>
  /** The panel, to render once in the host. */
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
  onOpenHealth,
  onOpenBudget,
}: EditorSheetsArgs): EditorSheets {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  // Where the assumptions panel lands when it opens. Dropped the moment the panel closes, on EVERY close and
  // route-away path at once (a render-phase reset), so the ordinary door never re-lands on a seat.
  const [assumptionsSeat, setAssumptionsSeat] = useState<AssumptionLandingSeat | undefined>(undefined)
  if (!assumptionsOpen && assumptionsSeat !== undefined) setAssumptionsSeat(undefined)

  // The state-tax unit (S5): which PRICED state the next run prices, off the route's own built overlay.
  const statePricedNote = useMemo(() => pricedStateForRun(snapshot.draft), [snapshot.draft])
  // The AssumptionPanel's ONE commit seam: apply the mutate atomically (it reads the store's CURRENT draft inside
  // the update — insight 036), then the route-aware recompute.
  const commitAssumptionEdit = useCallback(
    (mutate: (d: ScenarioDraft) => ScenarioDraft) => {
      model.update(mutate)
      recomputeAfterEdit(model)
    },
    [model],
  )

  const sheetOpen = assumptionsOpen
  const openAssumptions = useCallback((seat?: AssumptionLandingSeat) => {
    setAssumptionsSeat(seat)
    setAssumptionsOpen(true)
  }, [])

  const closeAll = useCallback(() => {
    setAssumptionsOpen(false)
  }, [])

  const node = (
    <>
      {/* U12 — via-sheet rows close this panel and open the fact's ONE editor home (insight 058). */}
      <AssumptionPanel
        open={assumptionsOpen}
        snapshot={snapshot}
        missing={missing}
        savedAnchor={savedAnchor}
        onCommitEdit={commitAssumptionEdit}
        onOpenBudget={() => {
          setAssumptionsOpen(false)
          onOpenBudget()
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
          onOpenHealth()
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
    openAssumptions,
    closeAll,
    sheetOpen,
    statePricedNote,
    node,
  }
}
