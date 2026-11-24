/*
 * src/ui/Result.tsx — the INTERIM recommendation tab, Tax → Tax Strategies (Act 6 · RC4; plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4 "Interim homes" and section 3.1). RC4 made the shell the home and deleted
 * the answer half of this file (the date hero, the confidence statement, the save slot, the band and the ladder: their
 * jobs moved to Snapshot and Probability). What is left is the recommend-second beat in its old look, until RC8
 * rebuilds it as Tax Strategies: the invite, the goal picker, the committed beat (`RecommendationSurface`) and the
 * remembered-record card.
 *
 * It renders a `<div class="result-page">` with NO tier attributes (the shell's one `main.result` carries them, plan
 * 3.1's settle hook: two would make `SETTLED_RESULT` a strict-mode error) and no disclaimer of its own (an interim tab's
 * old component renders none; the shell's R13 mount covers the page, plan 4.0). On the working route, where the solve
 * does not run, it shows RC8's working-route line and nothing else.
 *
 * §S2 — THE GOAL PICKER'S LEAD IS VERDICT-GATED, now on the RAW triple (Act 6 · RC4's ruling: raw everywhere the clone
 * prints a count): "with the basics covered" is false on the cohort the door still opens the picker for, so the lead
 * shows only on a positive list of outcome states read from `rawDisplayed` (never `snapshot.displayed`). 'borderline'
 * is deliberately IN (the Caddie's 2026-07-23 U16 walk cleared it). A new OutcomeState falls to silence.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { isDateRoute, pricedStateForRun, spineMedicarePriced } from '@intake/intakeMap'
import { GoalPicker } from '@intake/GoalPicker'
import { epochDayToCalendarYear } from '@store/staleness'
import { rawDisplayed } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import type { RecommendationGoal, SavedRecommendationV3 } from '@shared/model'
import { currentEpochDay } from './scenarioFromDraft'
import { RecommendationSurface, SavedRecordCard, type RecommendationSaveProp } from './RecommendationSurface'
import { savedRecordCardView } from './recommendationSaveView'
import { SAVED_RECORD_COPY } from './savedRecordCopy'
import { copy } from './copy'
import { appModel } from './appModel'
import { composeAnswerNotes } from './answerNotes'
import { resolvedFocusKey, selectElevatedAnswer } from './answerView'
import './styles/result.css'

/** U17 §S5 — THE RAW PAIR the store's trichotomy produced, never a composed view. This tab alone owns `solveInvitable`
 *  and `isDateRoute`, so it alone can mint the card's label, its cost line and its onClick TOGETHER. */
export type RecommendationRecordProp = {
  readonly status: SavedRecommendationStatus
  readonly record: SavedRecommendationV3
}

/** The goal picker's lead premise: a positive list of outcome states, read from the RAW triple (the module note). */
export function goalLeadPremiseHolds(answer: Parameters<typeof rawDisplayed>[0]): boolean {
  const raw = rawDisplayed(answer)
  return raw !== null && (raw.outcomeState === 'on-track' || raw.outcomeState === 'over-funded' || raw.outcomeState === 'borderline')
}

export function Result({
  recSave,
  recordCard,
}: {
  /** U17 §S5 — the strategy slot's derived view + the gesture (IntakeApp owns both machines). */
  readonly recSave?: RecommendationSaveProp
  /** U17 §S5 — the DISK's remembered recommendation + the store's re-entry trichotomy over it. */
  readonly recordCard?: RecommendationRecordProp
}) {
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const retry = useCallback(() => void appModel.recompute('final'), [])
  // The plan clock (U17 §S0.2: years since the plan was BUILT): the wall year through the ONE local-calendar chain,
  // the anchor from the notes composer's one mint (never a second subtraction here).
  const wallCalendarYear = useMemo(() => epochDayToCalendarYear(currentEpochDay()), [snapshot.draft.startCalendarYear])
  const notes = useMemo(
    () => composeAnswerNotes(snapshot, { readOnly: false, stalenessNote: false, leftOverClauseHost: false, wallCalendarYear }),
    [snapshot, wallCalendarYear],
  )
  const dateAnchor = notes.planClock
  const focusKey = resolvedFocusKey(selectElevatedAnswer(snapshot, retry, dateAnchor))
  const [goalOpen, setGoalOpen] = useState(false)
  // The state the NEXT solve prices, off the live draft (KTD5: the recommendation surface describes what it will run).
  const pricedState = useMemo(() => pricedStateForRun(snapshot.draft), [snapshot.draft])
  // The pay-less-tax ALL-IN hero's scope (build spec D7): the solve's base is `buildSpineParams`, so the spine read is
  // the solve's own predicate.
  const solveHealthcarePriced = useMemo(() => spineMedicarePriced(snapshot.draft), [snapshot.draft])
  const restoreToHeading = useCallback(() => document.querySelector<HTMLElement>('main.result h2[tabindex="-1"]'), [])

  // A CONFIRMED goal pick: write `chosenGoal`, close the picker, dispatch the solve (no auto-save: §S1).
  const pickGoal = useCallback((goal: RecommendationGoal) => {
    appModel.update((d) => ({ ...d, chosenGoal: goal }))
    setGoalOpen(false)
    void appModel.dispatchSolve()
  }, [])

  if (isDateRoute(snapshot.draft)) {
    return (
      <div className="result-page" data-strategies="working-route">
        <p className="rec-note">{copy.strategiesInterimWorkingRoute}</p>
      </div>
    )
  }

  const solve = snapshot.solve
  // The invite: a first-or-fresh solve is the honest next step (no beat yet with no record on disk, a worker death, or
  // a goal-unset precondition); the stale and record cards carry their own re-open controls (F-B).
  const solveInvitable =
    (solve.kind === 'idle' && recordCard === undefined) || solve.kind === 'compute-error' || (solve.kind === 'blocked' && solve.gap === 'goal-unset')
  // THE CARD AND ITS DOOR, MINTED IN ONE EXPRESSION (the F-B chair fix): the re-open wires on the positive `idle`.
  const card =
    recordCard === undefined
      ? undefined
      : {
          view: savedRecordCardView(recordCard.status, recordCard.record, currentEpochDay(), SAVED_RECORD_COPY),
          onReopen: solve.kind === 'idle' ? () => setGoalOpen(true) : undefined,
        }

  return (
    <div className="result-page" data-strategies="">
      {focusKey !== undefined && solveInvitable && (
        <div className="result-quiet-row">
          <button type="button" className="btn-quiet result-recommend-invite" onClick={() => setGoalOpen(true)}>
            {copy.recommendInviteCta}
          </button>
        </div>
      )}
      <RecommendationSurface
        solve={solve}
        pricedState={pricedState}
        healthcarePriced={solveHealthcarePriced}
        planClock={dateAnchor}
        onRepick={() => setGoalOpen(true)}
        recSave={recSave}
      />
      {card !== undefined && <SavedRecordCard card={card} />}
      <GoalPicker
        open={goalOpen}
        current={snapshot.draft.chosenGoal}
        onPick={pickGoal}
        onClose={() => setGoalOpen(false)}
        basicsCovered={goalLeadPremiseHolds(snapshot.answer)}
        restoreFallback={restoreToHeading}
      />
    </div>
  )
}
