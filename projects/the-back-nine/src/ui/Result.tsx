/*
 * src/ui/Result.tsx — D2 the landed magic moment (the result screen).
 *
 * On intake completion the quiet provisional AnswerStrip gives way to the ELEVATED state-adaptive
 * lead: the {@link FuckOffDate} hero for a still-working household, the {@link ConfidenceStatement}
 * for an all-retired one ({@link selectElevatedAnswer} owns the routing — the choice is the answer the
 * engine already crowned, never a re-derivation). The U12 Assumptions door (the Review door's old
 * seat) opens the {@link AssumptionPanel}; the guided re-walk back to intake lives INSIDE it, with
 * every answer preserved (the draft lives in the one `appModel`; nothing is persisted — U8 owns Save).
 *
 * CALM RENDERING (back-nine-design §3): the figures are STATIC and each surface owns its own
 * @starting-style reveal + reduced-motion fallback; this container adds NO theatrics — it only gives
 * the hero room to breathe and seats the quiet return. The hero heading takes focus once on landing
 * (resolvedFocusKey → the surface's focusSignal), the magic-moment announce.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnswerStrip } from '@intake/AnswerStrip'
import { acaPricedForRun, buildControlPreviewParams, healthcarePriced, isDateRoute, medicareExtrasDisclosureView, missingRequiredFacts, pricedStateForRun, spineMedicarePriced } from '@intake/intakeMap'
import { useLiveAnnouncer } from '@intake/a11y'
import { BudgetBuilder } from '@intake/BudgetBuilder'
import { SequencingControl } from '@intake/SequencingControl'
import { RothLever } from '@intake/RothLever'
import { HealthcareSheet } from '@intake/HealthcareSheet'
import { AssumptionPanel } from '@intake/AssumptionPanel'
import { composeMedicareExtrasTypicalNote, showMedicarePricedNote } from './healthSheetChrome'
import { budgetGoverns } from '@budget/budgetModel'
import { commitBudgetPatch } from '@budget/budgetToSpending'
import { previewRunsInWorker, runControlPreview } from '@store/controlPreview'
import { epochDayToCalendarYear } from '@store/staleness'
import { planClockAnchor } from './bandAnnotations'
import type { ScenarioDraft } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import { currentEpochDay } from './scenarioFromDraft'
import type { RecommendationGoal, SavedRecommendationV3, TwoArmControl } from '@shared/model'
import { GoalPicker } from '@intake/GoalPicker'
import { RecommendationSurface, SavedRecordCard, type RecommendationSaveProp } from './RecommendationSurface'
import { savedRecordCardView, type SavedRecordCopy } from './recommendationSaveView'
import { copy, slots } from './copy'
import { appModel } from './appModel'
import { Disclaimer } from './Disclaimer'
import { FuckOffDate } from './FuckOffDate'
import { ConfidenceStatement } from './ConfidenceStatement'
import { selectElevatedAnswer, resolvedFocusKey } from './answerView'
import type { ResaveCopyKey } from './unlockCopy'
import './styles/result.css'

/** The save slot's view + handlers — IntakeApp derives the view (resultSave.ts, the tested
 *  machine) and attaches the callbacks; this screen is dumb wiring over the six states. */
export type ResultSaveProp =
  | { readonly kind: 'none' }
  | { readonly kind: 'first'; readonly onKeep: () => void }
  | { readonly kind: 'clean' }
  | { readonly kind: 'dirty'; readonly onSave: () => void }
  | { readonly kind: 'saving' }
  | { readonly kind: 'failed'; readonly errorKey: ResaveCopyKey; readonly onRetry: () => void }

/** The re-offer backup DOOR (U8-tail) — present ONLY on a returning, WRITABLE session with no
 *  backup-note on record (IntakeApp owns that gating; this screen is dumb wiring). A quiet,
 *  subordinate line + CTA that opens the export step; absent (undefined) ⇒ no door at all. */
export type ResultBackupProp = { readonly onSave: () => void }

/** U17 §S5 — THE RAW PAIR the store's trichotomy produced, never a composed view. This screen alone
 *  owns `solveInvitable` and `isDateRoute`, so it alone can mint the card's label, its cost line and
 *  its onClick TOGETHER — a view composed upstream would arrive beside a wiring decision made here
 *  and could ship a dead door (or an unreachable arm). */
export type RecommendationRecordProp = {
  readonly status: SavedRecommendationStatus
  readonly record: SavedRecommendationV3
}

/**
 * The record card's copy, assembled ONCE at module scope from the swept catalog.
 *
 * `savedRecordCardView` takes its strings as a parameter rather than reading `copy.ts` (its own
 * header explains why), and the cause map is typed `Record<SavedRecommendationSupersededCause,
 * string>` — EXHAUSTIVE, so the day the store adds a fifth supersession cause THIS literal fails to
 * compile (TS2741) instead of the composer silently emitting a card with a missing clause.
 */
const SAVED_RECORD_COPY: SavedRecordCopy = {
  heading: copy.recommendRecordHeading,
  stillHolds: copy.recommendRecordHolds,
  causes: {
    'inputs-changed': copy.recommendRecordSupersededInputs,
    'inputs-unavailable': copy.recommendRecordSupersededUnavailable,
    'solver-changed': copy.recommendRecordSupersededSolver,
    'rules-changed': copy.recommendRecordSupersededRules,
  },
  savedIn: slots.recommendRecordSavedIn,
  reopenLabel: copy.recommendRecordReopenCta,
  reopenCostLine: copy.recommendRecordReopenCost,
}

export function Result({
  onReview,
  save,
  backup,
  recSave,
  recordCard,
  computing = false,
  stalenessNote = false,
  agedBalancesYear,
}: {
  readonly onReview: () => void
  readonly save: ResultSaveProp
  /** U17 §S5 — the strategy slot's derived view + the gesture (IntakeApp owns both machines). */
  readonly recSave?: RecommendationSaveProp
  /** U17 §S5 — the DISK's remembered recommendation + the store's re-entry trichotomy over it, or
   *  undefined when there is no record to judge (or the route cannot answer honestly). */
  readonly recordCard?: RecommendationRecordProp
  /** The re-offer backup door (U8-tail). Present ⇒ render the quiet subordinate line + CTA;
   *  undefined ⇒ no door. Withheld with the whole actions row while computing (an affordance
   *  we don't want used on a non-answer shouldn't exist — the same rule as the quiet doors). */
  readonly backup?: ResultBackupProp
  /** P3·U13 — TRUE when any staleness clock fired at unlock (IntakeApp's re-entry gate
   *  derived it from the RAW vault stamps): both heroes wear the standing "figured fresh
   *  under today's rules" line WITH the verdict. Session-lifetime (drift doesn't un-happen
   *  by re-saving mid-session). Default false. */
  readonly stalenessNote?: boolean
  /** The aged-balances clause's honest year (review 2026-07-10): present ⇔ the rendered
   *  answer still matches an on-disk save whose `savedAt` year is at least one calendar
   *  year old (IntakeApp derives it via `agedBalancesYearFor` — the persist machine's own
   *  saved scenario, so an edit or a re-save suppresses it structurally). Named by the
   *  date route's ladder caveat; absent ⇒ no clause. */
  readonly agedBalancesYear?: number
  /** True while NOTHING has ever resolved (answer 'idle'/'pending' — the "Working it out…"
   *  window). The whole actions row is withheld: the actions act on an answer that isn't
   *  there yet, and an affordance we don't want used shouldn't exist (Briggsy, 2026-07-02).
   *  The edit path is epoch-SAFE during a compute (memoryModel discards stale resolves), so
   *  this is a calm-affordance rule, not a data guard. `pending` is pre-first-resolve ONLY —
   *  the background final sharpen never re-hides the row — and a compute-error shows it
   *  (editing inputs is that failure's remedy). */
  readonly computing?: boolean
}) {
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // Retry re-runs the FINAL tier: the result screen only ever shows the crowned final answer, never a
  // provisional re-blank (a provisional re-fire would mint a higher epoch and supersede the final).
  const retry = useCallback(() => void appModel.recompute('final'), [])

  // The save slot's TRANSITION announcements (ultramode 2026-07-02). The slot swaps whole nodes
  // per state, so a `role='status'` that mounts already-populated may never announce (burned/045),
  // and the success badge is plain text — a screen-reader re-save was silent on both the start and
  // the landing of a durability transition. This persistent, always-mounted polite region (empty
  // until spoken into, clear-after-announce) owns both: →saving announces the pending line, and
  // saving→clean announces the badge. The FAILED arm stays with its own role='alert' (an alert
  // announces on insertion by design — routing it here too would double-speak it). Edit-back
  // clean (failed→clean with no save) is deliberately silent: no durability event occurred.
  // (The shared useLiveAnnouncer() hook — one callback-ref-bound live-region idiom, insight 060.)
  const announcer = useLiveAnnouncer()
  const prevSaveKind = useRef(save.kind)
  useEffect(() => {
    const prev = prevSaveKind.current
    prevSaveKind.current = save.kind
    if (save.kind === prev) return
    if (save.kind === 'saving') announcer.announce(copy.resavePending)
    else if (save.kind === 'clean' && prev === 'saving') announcer.announce(copy.savedBadge)
  }, [save.kind, announcer])

  // P3·U13 — the wall-time anchor (presentation arithmetic ONLY — never written back into
  // the draft; the round-trip guard). The plan clock is 0 for every same-year session; it goes
  // positive only when a plan BUILT in an earlier calendar year is re-opened: the date hero
  // then re-derives its "~N years out" from TODAY while the calendar label holds, and the
  // BAND's x-axis re-bases (year 0 = "Plan built", wall "Today" at x = the plan clock — the
  // one-screen-one-time-base law, threaded through selectElevatedAnswer). The year is read
  // through the ONE local-calendar chain (currentEpochDay → epochDayToCalendarYear — the same
  // basis staleness compares and startCalendarYear was minted in), never a second ad-hoc
  // clock read (ultramode 2026-07-09, the basis catch).
  //
  // IT MEASURES THE BUILD, NOT THE SAVE (U17 §S0.2). `startCalendarYear` is written once when
  // the plan is built and survives every re-save, so this is "years since you built this plan"
  // — never "years since your save". The SAVE's own vintage rides `savedAt` on its own rail
  // (agedBalancesYearFor, threaded by IntakeApp); the two diverge for any re-saver, and the
  // aged band used to speak the wrong one. Math.max(0, …) clamps a device clock that reads
  // BEHIND the build year to the fresh identity — no re-base at all, never a negative x.
  const dateAnchor = useMemo(
    () =>
      planClockAnchor(snapshot.draft.startCalendarYear, epochDayToCalendarYear(currentEpochDay())),
    [snapshot.draft.startCalendarYear],
  )

  const elevated = selectElevatedAnswer(snapshot, retry, dateAnchor)
  const focusKey = resolvedFocusKey(elevated)

  // U9b — the ONE deepening door (council 2026-07-02, Q1/R8): a quiet affordance on the landed
  // answer opens the budget-builder sheet; a governing budget re-words the same door. Offered only
  // on a RESOLVED reading (focusKey is defined exactly then) — the budget deepens an answer, and
  // an affordance we don't want used on a non-answer shouldn't exist.
  const [budgetOpen, setBudgetOpen] = useState(false)
  const governs = budgetGoverns(snapshot.draft.budget)

  // P3·U10 — the two control doors (R9/R11: quiet, invited, never a badge). GATING LAW:
  //  - sequencing: a resolved reading + ≥1 entered account (an order over zero accounts is inert);
  //  - the Roth door: a resolved reading + CATEGORICAL facts only — filing status, never a
  //    personalized bracket/balance computation (plan §U10 teaser law; the $0-pre-tax case gets
  //    the lever's own calm closed face, so even that read stays out of the door predicate).
  const [sequencingOpen, setSequencingOpen] = useState(false)
  const [rothOpen, setRothOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  // Act-4 · U16 §S2 — the recommend-second GOAL choice (the picker precedes the solve). The affordance
  // opens it; a confirmed pick writes `chosenGoal` and dispatches the solve.
  const [goalOpen, setGoalOpen] = useState(false)
  const rothApplied = snapshot.draft.rothConversion
  // P3·U11 — the Healthcare door's domain (categorical, fact-presence only) is the ENGINE's own
  // priced-healthcare gate (healthcarePriced — single-sourced with buildOverlay; council
  // 2026-07-03: no hollow door).
  const healthPriced = healthcarePriced(snapshot.draft)
  // P3·U11 follow-up (the post-65 Medicare pricing unit, 2026-07-10) — "was Medicare priced in this
  // run?", route-aware and read off the BUILT params' own overlay decision, never ages and never a
  // re-derivation of the builder's inputs (insight 080; the ultramode fold's sharpening: the age
  // predicate diverged from the run at buildOverlay's degenerate early-return — the SS-only
  // $0-portfolio all-65+ household built NO overlay yet read "priced" from its ages). Spine:
  // `spineMedicarePriced` = the headline builder's own output. Date route: dateSearch.ts:222 forces
  // healthcareEnabled true on every candidate, so Medicare is priced structurally. The household
  // with a priced run but NO Healthcare door (all-65+ — healthcarePriced needs a pre-65 member)
  // wears the "Medicare is priced in" affirmation + the narrowed residual.
  const medicarePriced = useMemo(
    () => isDateRoute(snapshot.draft) || spineMedicarePriced(snapshot.draft),
    [snapshot.draft],
  )
  const medicarePricedNote = showMedicarePricedNote({ medicarePriced, reachesHealthDoor: healthPriced })
  // The ask-for-Medicare-extras on-typical appendix (F5, population A): per-person BUILT
  // dollars + draft provenance + the name fallback (medicareExtrasDisclosureView — the ONE
  // assembly both F5 homes consume, insight 081), composed to the ONE bi-directional
  // sentence appended inside the residual paragraph. `undefined` for entered/affirmed
  // households and non-priced runs.
  const medicareExtrasTypicalNote = useMemo(
    () => composeMedicareExtrasTypicalNote(medicareExtrasDisclosureView(snapshot.draft)),
    [snapshot.draft],
  )
  // The state-tax unit (S5) — "which PRICED state did THIS run price?", read route-aware off the
  // route's OWN built-params overlay decision (never draft.retirementState — insight 081; never a
  // bare isDateRoute disjunct — insight 080). undefined for not-priced / 'elsewhere' / unbuilt /
  // the degenerate-overlay household. Threaded to every disclosure home (the verdict residual's
  // affirmation names the state; the Roth lever + Healthcare sheet drop the state-tax omission; the
  // RECOMMENDATION surface drops its federal-only scope note), each gating on `!== undefined`.
  const statePricedNote = useMemo(() => pricedStateForRun(snapshot.draft), [snapshot.draft])
  const enhancedApplied = snapshot.draft.enhancedSubsidies === true
  // The wire's per-year healthcare series (spine headline runs only — presence-keyed).
  const healthReadout =
    snapshot.answer.kind === 'headline' ? snapshot.answer.result.distribution.healthReadout : undefined
  // The date route's preview anchor: the CROWNED lifestyle offset (the plan the answer named);
  // undefined (⇒ preview withheld) when no date crowned or on the spine route (unused there).
  const crownedOffset =
    snapshot.answer.kind === 'date' &&
    snapshot.answer.outcome.kind === 'dates' &&
    'offsetYears' in snapshot.answer.outcome.lifestyle
      ? snapshot.answer.outcome.lifestyle.offsetYears
      : undefined
  // O16 (council 2026-07-17; the fold same day) — "does the run the Roth PREVIEW describes price
  // the ACA discount?": producer's-output (insight 080/081) read off buildControlPreviewParams —
  // the exact builder the two-arm preview executes (spine params, or the CROWNED window-gated
  // candidate). Never buildDateInput's pre-sweep base overlay (its quote stream is positive for a
  // pre-65-today member even when a work-to-65+ crown prices zero ACA years). The degenerate,
  // unknown-age, and no-crown households read false and conservatively KEEP the clause.
  const acaPricedNote = useMemo(
    () => acaPricedForRun(snapshot.draft, crownedOffset),
    [snapshot.draft, crownedOffset],
  )
  // The preview runner the sheets inject: params from the CURRENT draft (never a render-captured
  // copy going stale mid-sheet — composed per call), the household's one CRN seed, latest-wins.
  const runPreview = useCallback(
    (control: TwoArmControl) => {
      const { draft } = appModel.getSnapshot()
      const params = buildControlPreviewParams(draft, crownedOffset)
      if (params === null || draft.seed === undefined) return null
      return runControlPreview(params, draft.seed, control)
    },
    [crownedOffset],
  )
  // Apply/escape recompute provisional→final (the decrypt-on-return fast-show precedent): the
  // provisional lands quickly under the thinking-breathe, the final sharpens in the background.
  const recomputeBoth = useCallback(async () => {
    await appModel.recompute('provisional')
    await appModel.recompute('final')
  }, [])

  // U12 — the AssumptionPanel's ONE commit seam: apply the mutate atomically (it reads the
  // store's CURRENT draft inside the update — insight 036, never a render-captured copy),
  // then the ROUTE-AWARE recompute (the ratified F6 policy): SPINE → 'final' ONLY (the
  // spine's two tiers are byte-identical, so a provisional re-fire is pure waste); DATE →
  // the recomputeBoth cadence (provisional lands fast, the final sharpens behind it). The
  // route is read AFTER the update — panel edits can't change workStatus, but the draft the
  // recompute serves is the committed one.
  const commitAssumptionEdit = useCallback(
    (mutate: (d: ScenarioDraft) => ScenarioDraft) => {
      appModel.update(mutate)
      if (isDateRoute(appModel.getSnapshot().draft)) void recomputeBoth()
      else void appModel.recompute('final')
    },
    [recomputeBoth],
  )

  // U12 ultramode — the modal-ownership signal, threaded two ways: (1) `sheetOpen` to both
  // heroes (suppress the landing focus grab + the sharpen announce while a sheet/panel owns
  // focus and AT — an in-panel edit can demote → re-resolve → REMOUNT a hero behind the open
  // aria-modal); (2) `restoreToAssumptionsDoor` to every sheet as the close-time focus
  // fallback for the via-panel route (the panel's Edit row unmounts with the panel, so the
  // sheet's captured owner is disconnected by close time — without a fallback focus strands
  // on <body>). The Assumptions door is the honest landmark: it is the surface the user came
  // through, and it stays reachable in every post-resolve state (the hatch gate below).
  const sheetOpen = budgetOpen || sequencingOpen || rothOpen || healthOpen || assumptionsOpen || goalOpen
  const restoreToAssumptionsDoor = useCallback(
    () => document.querySelector<HTMLElement>('[data-door="assumptions"]'),
    [],
  )

  // U12 — the Assumptions door's gate (F4: it takes the Review door's quiet-row seat; count
  // stays 5). THIS DOOR GATES DIFFERENTLY FROM ITS SIBLINGS, deliberately (3-controls.md:243):
  // every other door gates on `focusKey` and so VANISHES exactly while the answer is
  // indeterminate / inputs-incomplete — but the escape hatch is the way BACK from those
  // states, so it must stay reachable there: a resolved reading (focusKey), the store's
  // post-first-resolve `inputs-incomplete` demotion, the post-first-resolve fallback arms
  // (a date input-failure / an indeterminate headline — the strip is showing, the hero fell
  // back), AND compute-error (its comment above names editing inputs as the remedy — a
  // remedy needs its door; the old Review button was unconditional here). While computing
  // (pre-first-resolve) it is withheld with the whole row, the existing law.
  const hatchReachable =
    focusKey !== undefined ||
    snapshot.answer.kind === 'inputs-incomplete' ||
    snapshot.answer.kind === 'compute-error' ||
    (elevated.kind === 'fallback' &&
      (snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date'))

  // The completion actions (save slot + the ONE budget door + the quiet return), built once.
  // On a RESOLVED date/spine answer they are SEATED in the surface's left reading column (the
  // two-pane grid tucks them under the words instead of stranding them centered below both panes
  // — the scroll + dead-lower-left fix, Briggsy 2026-07-02); on the fallback/pending answer (no
  // two-pane) they render below as before. Withheld entirely while computing (the actions act on
  // an answer that isn't there yet).
  const seatInLead = focusKey !== undefined && (elevated.kind === 'date' || elevated.kind === 'spine')

  // §S2 — the recommend-second invited affordance is offered only when the solve is INVITABLE: no
  // beat yet (idle), or a goal-unset precondition that steers to the picker. A builder-refusal block
  // (no-pretax / spine-unready) and the pending/committed/stale beats own their own renders (S3).
  // Never on a non-answer (the affordance is gated by focusKey with the doors below). `solve` is the
  // tier-less solve channel. U16 §S1 — the ALL-RETIRED (spine) route only in v1: the live solve base
  // is `buildSpineParams` (retirement params), and a still-working household's honest base is the
  // CROWNED date, whose offset this dispatch does not yet thread — so the working-route
  // recommend-second is a follow-up increment (the builder's `spine-unready` refusal covers the date
  // route honestly). Both fit-gate affordance seeds (`retired`, `nc`) are all-retired, so this gate
  // does not regress the measured posture.
  const solve = snapshot.solve
  // The invite door is INVITABLE whenever a first-or-fresh solve is the honest next step: no beat yet
  // (idle), a goal-unset precondition (steer to the picker), OR a `compute-error` channel (a worker
  // death) whose note PROMISES the user they can re-open, so the control that fulfils that promise must
  // return. F-B (U16 chair fix): the `stale` channel is DROPPED from this predicate — it now carries its
  // OWN re-open control INSIDE the stale card (RecommendationSurface), so the promise and its action
  // share ONE home; a second door-row invite would be a SECOND control for the same promise. The four
  // non-invite doors (budget · sequencing · roth · health · assumptions) are unaffected (they gate on
  // focusKey). The dispatch paths stay two — this invite door and the committed/stale re-pick door
  // (both open the GoalPicker). A builder-refusal `blocked` (no-pretax / spine-unready) deliberately
  // does NOT invite — the gap is never the goal, so its own calm named-reason note carries the steer
  // (§Q5, F3; the steer-seed increment split the reasons).
  //
  // U17 §S5 — THE SAME F-B MOVE, FOR THE RETURNING HOUSEHOLD. A vault return lands `idle` WITH a
  // record on disk, and the record card carries its OWN re-open control (label + cost line + onClick
  // minted as one below) — so an un-amended `idle` disjunct would put TWO controls opening the same
  // GoalPicker on that one frame, which is exactly the duplication the stale chair fix retired. With
  // NO record the predicate is byte-identical to today, so every dev seed, the doors-order contract
  // and the measured idle frames are untouched.
  const solveInvitable =
    !isDateRoute(snapshot.draft) &&
    ((solve.kind === 'idle' && recordCard === undefined) ||
      solve.kind === 'compute-error' ||
      (solve.kind === 'blocked' && solve.gap === 'goal-unset'))

  // THE CARD AND ITS DOOR, MINTED IN ONE EXPRESSION — the fork the F-B chair fix closed: label, cost
  // line and onClick are inseparable, and the surface's dead-button law (no handler ⇒ no control)
  // makes divergence unrepresentable.
  //
  // THE RE-OPEN WIRES ON THE POSITIVE `idle` PREDICATE, not on `!solveInvitable`. `pending`, and both
  // builder-refusal `blocked` gaps, are frames this screen deliberately refuses to invite on (see the
  // gate above) and where `pickGoal` → `dispatchSolve` deterministically re-refuses — a door there
  // would promise a re-solve the dispatch cannot deliver. `stale` is excluded for the opposite
  // reason: it already carries the stale card's own re-open, and a second door beside it is the
  // duplication F-B retired. `todayEpochDay` rides the ONE local-calendar chain this file already
  // reads (currentEpochDay → epochDayToCalendarYear), never a second ad-hoc clock.
  const card =
    recordCard === undefined
      ? undefined
      : {
          view: savedRecordCardView(
            recordCard.status,
            recordCard.record,
            currentEpochDay(),
            SAVED_RECORD_COPY,
          ),
          onReopen: solve.kind === 'idle' ? () => setGoalOpen(true) : undefined,
        }
  // A CONFIRMED goal pick: write `chosenGoal`, close the picker, dispatch the solve. A re-pick writes
  // the new goal and re-dispatches — the store's invalidateStaleSolve + the solve request-epoch carry
  // the visible re-solve. NO auto-save: `chosenGoal` rides the draft in-session (the explicit-resave
  // ceremony persists it, like every model field — §S1). Mirrors the sheets' update→close→recompute.
  const pickGoal = useCallback((goal: RecommendationGoal) => {
    appModel.update((d) => ({ ...d, chosenGoal: goal }))
    setGoalOpen(false)
    void appModel.dispatchSolve()
  }, [])

  const actionsNode = computing ? null : (
    <div className="result-actions">
      {/* The save slot: one reserved box across all five populated states (insight 035 — the
        Review button below must never shift under a pointer when a click swaps CTA→pending→
        badge). 'none' renders no slot at all: no claim about a disk state that can't be
        compared, and no reserved emptiness on the never-saveable answer. */}
      {save.kind !== 'none' && (
        <div className="result-save-slot">
          {save.kind === 'first' && (
            <div className="result-keep">
              <button type="button" className="btn-primary" onClick={save.onKeep}>
                {copy.saveCta}
              </button>
              <p className="result-keep__hint">{copy.saveCtaHint}</p>
            </div>
          )}
          {save.kind === 'dirty' && (
            <div className="result-keep">
              <button type="button" className="btn-primary" onClick={save.onSave}>
                {copy.resaveCta}
              </button>
              <p className="result-keep__hint">{copy.resaveHint}</p>
            </div>
          )}
          {save.kind === 'saving' && (
            // Announced by the persistent region above (a status inserted already-populated may
            // not fire, burned/045) — this node is the VISIBLE pending line only.
            <p className="result-save-pending">{copy.resavePending}</p>
          )}
          {save.kind === 'failed' && (
            <div className="result-keep">
              <p className="result-save-error" role="alert">
                {copy[save.errorKey]}
              </p>
              {save.errorKey === 'saveErrorReadOnly' ? (
                // The read-only refusal is NON-transient: `secondTab` is captured once at unlock
                // and never re-probed, so a retry deterministically re-refuses — the primary
                // action must match the copy's own instruction (RELOAD), never a "Try again"
                // that can't succeed (the RestoreFlow vault-exists arm's law; ultramode
                // 2026-07-02 — 7 lenses converged on this exact lying-remedy shape).
                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                  {copy.restoreRetry}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={save.onRetry}>
                  {copy.exportRetry}
                </button>
              )}
            </div>
          )}
          {save.kind === 'clean' && (
            <p className="result-saved">
              <span className="result-saved__mark" aria-hidden="true" />
              {copy.savedBadge}
            </p>
          )}
        </div>
      )}
      {/* §S2 — the recommend-second beat's surface (the second magic moment): the PENDING tell, the
          committed grade lockup + RecommendationViz, and the held/stale/steer notes. DOM-ordered
          directly UNDER the save slot — the recommend-SECOND beat sits ABOVE the in-frame disclaimer
          + the quiet doors, so focus order matches its visual row (F-A the dead-rail fix: at the
          laptop two-pane it leaves the left column for a FULL-WIDTH row below the two panes, the viz
          continuing the band down into the once-blank right rail — confidence.css owns the placement,
          keyed on the surface carrying a real beat so the IDLE frame is byte-identical). Renders
          0-height (just its live region) until the solve is invited, so it never perturbs the idle
          fit frame. The invited AFFORDANCE lives in the quiet row below (a calm door); this region
          carries the response. §S4: the committed beat's RE-PICK door reopens the GoalPicker (the
          standing goal pre-selected); `pickGoal` re-dispatches — the visible re-solve. ROUTE-GATED on
          the SAME !isDateRoute predicate the invite uses (§S1: the v1 recommend-second is
          all-retired-route only — the working-route base is the crowned date this dispatch does not
          yet thread; the date route never renders the surface, so the "doors last" order contract is
          untouched): after a committed/stale beat, a route flip (a spouse un-retires) must not strand
          an orphaned rec note inside the date hero. Idle renders nothing here anyway; the gate drops
          the non-idle body the store still holds. A flip back re-mounts the surface + invite. */}
      {!isDateRoute(snapshot.draft) && (
        <RecommendationSurface
          solve={snapshot.solve}
          pricedState={statePricedNote}
          onRepick={() => setGoalOpen(true)}
          recSave={recSave}
        />
      )}
      {/* The IN-FRAME R13 disclaimer (council 2026-07-08, "buttons drop below" — Briggsy's fork
          call): DOM-ordered ABOVE the backup door AND the quiet doors (the Medicare-pricing unit's
          fold-priority fix, 2026-07-10 — the pulled-forward TODO-7 / Caddie-#3 inversion): every
          UNPROTECTED affordance below it degrades past the fold FIRST, so the protected honesty
          caveat wins the frame (the Hawk's veto; the trailing App mount is the structural first
          casualty). Visible ONLY at the laptop two-pane, where app.css hides the trailing mount;
          display:none below that width — the phone renders byte-identically (same words, one
          visible mount, Disclaimer.tsx has the contract). */}
      <Disclaimer inFrame />
      {/* THE REMEMBERED-RECORD CARD — DOM-ordered BELOW the disclaimer, joining the doors as a
          sanctioned below-fold casualty (Briggsy's ruling, 2026-07-26, on measured numbers).
          It began life inside RecommendationSurface, above this line, and MEASURED at his real
          1536×791 it pushed the protected R13 disclaimer from 702px to 858px (holds, 156px card) and
          to 952px (superseded with two causes, 251px) — a 67-161px breach of the one-frame fit law,
          against an idle frame carrying only 89px of headroom. No honest version of the card fits
          that seat, so this was a PLACEMENT decision and never a trim: every word survives.
          It sits here for the same reason the backup door does — unprotected affordances degrade
          past the fold FIRST so the protected honesty caveat wins the frame (the Hawk's veto). Focus
          order matches visual order; no CSS-only reorder. DOM ORDER ALONE DOES NOT PIN THE PIXELS at
          the laptop two-pane: the actions chain is `display: contents` there, so this card is a grid
          item and confidence.css must seat it (`.rec-record`, the row directly under the caveat).
          Auto-placed it would take the dead RIGHT rail instead — verify:fit's `?vault=rec` /
          `?vault=recold` arms assert both the document order and the seat. The date route is already excluded at the
          producer (IntakeApp's `recordCard` memo returns undefined on `isDateRoute`), so this needs
          no route gate of its own — a crowned-date surface can never carry a record. */}
      {card !== undefined && <SavedRecordCard card={card} />}
      {/* The re-offer backup door (U8-tail): a QUIET, subordinate durability affordance — the plan
          is already saved to this device (the slot above says so); this only offers the off-device
          second copy when none is on record. Reads under the verdict, never a primary CTA, never
          color-only. DOM-ordered BELOW the disclaimer (2026-07-10): it is unprotected, so on the
          tallest composite frame (an all-65+ writable stale return, where the priced-Medicare pair
          + the staleness echo + this door together overrun the fold) it degrades below the fold
          before the disclaimer does — focus order matches visual order, no CSS-only reorder
          (WCAG 2.4.3). A normal vault frame with slack keeps it in-frame. */}
      {backup !== undefined && (
        <div className="result-backup-door">
          <p className="result-backup-door__lead">{copy.backupDoorLead}</p>
          <button type="button" className="btn-quiet" onClick={backup.onSave}>
            {copy.backupDoorCta}
          </button>
        </div>
      )}
      {/* The quiet doors: the sanctioned below-fold flex (the --laptop-fit-height degrade
          contract, tokens.css). display:contents in single column — the stack renders exactly as
          before; at the laptop two-pane the whole actions chain unwraps (display:contents) and
          this row seats as the grid's LAST full-width row, below both panes and below the
          in-frame disclaimer — one flick away, never crowding the answer. */}
      <div className="result-quiet-row">
        {/* §S2 — the invited recommend-second affordance: FIRST in the doors DOM order (so it degrades
            below-fold LAST among the doors), rendered STATICALLY — no scroll-entrance / Intersection
            Observer / badge / pulse (R11: invited, never engagement bait; R12: no imperative). A real
            calm door (btn-quiet, ≥24px, visible non-color focus ring, the --dur-press resting press);
            activating it opens the GoalPicker FIRST (the goal precedes the solve). */}
        {focusKey !== undefined && solveInvitable && (
          <button
            type="button"
            className="btn-quiet result-recommend-invite"
            onClick={() => setGoalOpen(true)}
          >
            {copy.recommendInviteCta}
          </button>
        )}
        {focusKey !== undefined && (
          <button type="button" className="btn-quiet" onClick={() => setBudgetOpen(true)}>
            {governs ? copy.budgetEditCta : copy.budgetCta}
          </button>
        )}
        {focusKey !== undefined && snapshot.draft.enteredAccounts.length > 0 && (
          <button type="button" className="btn-quiet" onClick={() => setSequencingOpen(true)}>
            {snapshot.draft.drawdownPolicy === 'proportional'
              ? copy.leverSequencingCta
              : copy.leverSequencingEditCta}
          </button>
        )}
        {focusKey !== undefined && snapshot.draft.filing === 'mfj' && (
          <button type="button" className="btn-quiet" onClick={() => setRothOpen(true)}>
            {rothApplied === undefined ? copy.leverRothDoorCta : copy.leverRothDoorEditCta}
          </button>
        )}
        {focusKey !== undefined && healthPriced && (
          <button type="button" className="btn-quiet" onClick={() => setHealthOpen(true)}>
            {enhancedApplied ? copy.leverHealthDoorEditCta : copy.leverHealthDoorCta}
          </button>
        )}
        {/* U12 (F4): the Assumptions door in the Review door's old seat — door count stays 5,
            the quiet row stays the grid's LAST full-width row (the vertical-fit contract is
            untouched). Gated by `hatchReachable`, NOT bare focusKey — see the gate above for
            why this one door must survive indeterminate/incomplete. The guided re-walk
            (`onReview`) now lives INSIDE the panel. */}
        {hatchReachable && (
          <button
            type="button"
            className="btn-quiet"
            data-door="assumptions"
            onClick={() => setAssumptionsOpen(true)}
          >
            {copy.assumptionDoorCta}
          </button>
        )}
      </div>
    </div>
  )

  // The committed answer's recompute tier, mirrored below as `data-answer-tier` — the vertical-fit
  // gate's REAL final-tier synchronization (e2e/vertical-fit.spec.ts waits for "final" before any
  // measurement; a class-absence wait was proven vacuous by the gate's adversarial review). Absent
  // until a verdict has committed — exactly when there is no frame worth measuring.
  const answerTier =
    snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date'
      ? snapshot.answer.tier
      : undefined

  return (
    // data-inframe-disclaimer mirrors the actions row EXACTLY (withheld while computing): app.css
    // hides the page-trailing disclaimer behind it at the laptop tier, so a frame with no visible
    // disclaimer is unrepresentable — the trailing mount stands whenever the in-frame one is out.
    <main className="result" data-inframe-disclaimer={computing ? undefined : true} data-answer-tier={answerTier}>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="result-hero">
        {elevated.kind === 'date' && (
          <FuckOffDate
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
            medicarePricedNote={medicarePricedNote}
            medicareExtrasTypicalNote={medicareExtrasTypicalNote}
            statePricedNote={statePricedNote}
            stalenessNote={stalenessNote}
            dateAnchor={dateAnchor}
            agedBalancesYear={agedBalancesYear}
            sheetOpen={sheetOpen}
            onReconfirm={onReview}
          />
        )}
        {elevated.kind === 'spine' && (
          <ConfidenceStatement
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
            medicarePricedNote={medicarePricedNote}
            medicareExtrasTypicalNote={medicareExtrasTypicalNote}
            statePricedNote={statePricedNote}
            stalenessNote={stalenessNote}
            sheetOpen={sheetOpen}
            savedAnchor={dateAnchor}
            agedBalancesYear={agedBalancesYear}
            onReconfirm={onReview}
          />
        )}
        {elevated.kind === 'fallback' && (
          <AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />
        )}
      </div>
      {!seatInLead && actionsNode}
      <BudgetBuilder
        open={budgetOpen}
        draft={snapshot.draft}
        onApply={(items) => {
          // The atomic reconciliation patch — the OOP figure reads the store's CURRENT draft
          // inside the update (insight 036), never a render-captured copy.
          appModel.update((d) => ({ ...d, ...commitBudgetPatch(items, d.health.oopMedicalAnnual) }))
          setBudgetOpen(false)
          void recomputeBoth()
        }}
        onEscape={() => {
          // Back to a single number: budget → strictly-undefined; the scalar keeps its last
          // reconciled value (build-gate 2 — never `budget: []`).
          appModel.update((d) => ({ ...d, budget: undefined }))
          setBudgetOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setBudgetOpen(false)}
        restoreFallback={restoreToAssumptionsDoor}
      />
      <SequencingControl
        open={sequencingOpen}
        draft={snapshot.draft}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        restoreFallback={restoreToAssumptionsDoor}
        savedAnchor={dateAnchor}
        onApply={(policy, order) => {
          // ONE atomic write maintains the 'custom'⟺order biconditional (the codec re-proves it
          // at Save; validateParams re-proves it at every run — the two-gate rule's write half).
          appModel.update((d) => {
            const { drawdownOrder: _order, ...rest } = d
            return { ...rest, drawdownPolicy: policy, ...(order !== undefined ? { drawdownOrder: order } : {}) }
          })
          setSequencingOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setSequencingOpen(false)}
      />
      <RothLever
        open={rothOpen}
        draft={snapshot.draft}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        medicarePricedNote={medicarePricedNote}
        statePricedNote={statePricedNote}
        acaPricedNote={acaPricedNote}
        restoreFallback={restoreToAssumptionsDoor}
        savedAnchor={dateAnchor}
        onApply={(plan) => {
          appModel.update((d) => ({ ...d, rothConversion: plan }))
          setRothOpen(false)
          void recomputeBoth()
        }}
        onRemove={() => {
          // Strip the KEY (absence ≡ no conversions ≡ reduce-to-spine — never an undefined-valued
          // slot a JSON write would null, DND/009).
          appModel.update((d) => {
            const { rothConversion: _plan, ...rest } = d
            return rest
          })
          setRothOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setRothOpen(false)}
      />
      <HealthcareSheet
        open={healthOpen}
        draft={snapshot.draft}
        readout={healthReadout}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        statePricedNote={statePricedNote}
        restoreFallback={restoreToAssumptionsDoor}
        savedAnchor={dateAnchor}
        todayEpochDay={currentEpochDay()}
        onApply={(enhanced) => {
          // THE SINGLE-KEY WRITE FENCE (insight 058): exactly one key moves — set the literal
          // `true`, or STRIP the key entirely (absence ≡ the statutory reverted regime — never
          // `false`, DND/009's strip-the-key discipline; the codec rejects a persisted false).
          appModel.update((d) => {
            const { enhancedSubsidies: _regime, ...rest } = d
            return enhanced ? { ...rest, enhancedSubsidies: true } : rest
          })
          setHealthOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setHealthOpen(false)}
      />
      {/* U12 — the AssumptionPanel mounts at RESULT level, outside the hero swap (supersession
          #6): it exists over the fallback strip too, so the escape hatch stays real exactly
          where the hero has fallen back to incomplete. Via-sheet rows close this panel and
          open the fact's ONE editor home (insight 058 — never a duplicate editor). */}
      <AssumptionPanel
        open={assumptionsOpen}
        snapshot={snapshot}
        missing={missing}
        savedAnchor={dateAnchor}
        onCommitEdit={commitAssumptionEdit}
        onOpenBudget={() => {
          setAssumptionsOpen(false)
          setBudgetOpen(true)
        }}
        onOpenSequencing={() => {
          setAssumptionsOpen(false)
          setSequencingOpen(true)
        }}
        onOpenRoth={() => {
          setAssumptionsOpen(false)
          setRothOpen(true)
        }}
        onOpenHealth={() => {
          setAssumptionsOpen(false)
          setHealthOpen(true)
        }}
        onReview={() => {
          setAssumptionsOpen(false)
          onReview()
        }}
        onClose={() => setAssumptionsOpen(false)}
      />
      {/* §S2 — the GoalPicker: the Tier-2 goal choice that PRECEDES the solve. Reuses the ControlSheet
          focus contract verbatim; a confirmed pick writes `chosenGoal` + dispatches. The via-panel
          focus fallback is the honest Assumptions landmark (the invite trigger unmounts once the beat
          leaves the invitable state). */}
      <GoalPicker
        open={goalOpen}
        current={snapshot.draft.chosenGoal}
        onPick={pickGoal}
        onClose={() => setGoalOpen(false)}
        restoreFallback={restoreToAssumptionsDoor}
      />
    </main>
  )
}
