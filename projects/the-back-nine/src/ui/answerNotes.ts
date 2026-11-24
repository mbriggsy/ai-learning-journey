/*
 * src/ui/answerNotes.ts — every note the answer's hero receives, composed in one pure place (Act 6's RC0).
 *
 * `Result.tsx` held these as a row of memos beside its render; they moved here unchanged in what they say, so the
 * screens that replace the heroes (the Snapshot and the Probability page) read the same notes from the same producer,
 * and the notes' laws are asserted on this function rather than through a rendered hero
 * (`src/ui/__tests__/answerNotes.test.ts`).
 *
 * W9-R7 (KTD5) — THE ANSWERED DRAFT: the draft the SHOWN answer was figured from. Every note describes the shown
 * answer, so every note reads it (the Medicare and state notes, the moved left over, W's stale line and its door's
 * words, the typed-below line); every control and every sheet reads the live draft. With no resolved answer on screen
 * there is no answered draft and every note is absent (neither hero renders a note outside a resolved view). The plan
 * clock alone reads the live draft: it is the build year, which no edit moves, and the sheets need it with no answer.
 *
 * A READ-ONLY TAB (a second tab holds the plan): nothing edited here can be kept, so the standing line keeps its words
 * and loses its door (`withoutDoor`: no buttons named, no seat to open) — the fact is still said.
 */
import type { PricedState } from '@engine/constants/stateTax'
import {
  healthcarePriced,
  isDateRoute,
  medicareExtrasDisclosureView,
  pricedStateForRun,
  spineMedicarePriced,
} from '@intake/intakeMap'
import {
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostTypedBelowLine,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
} from '@intake/workingYearLeftOver'
import type { MemoryModelSnapshot, ScenarioDraft } from '@store/memoryModel'
import type { AssumptionLandingSeat } from './assumptionRegistry'
import { planClockAnchor, type BandPlanClockAnchor } from './bandAnnotations'
import { copy, type WorkingCostAct } from './copy'
import { composeMedicareExtrasTypicalNote, showMedicarePricedNote } from './healthSheetChrome'
import { plainNote, withoutDoor, type NoteParts } from './noteParts'
import { composeVerdictMedicareResidual, composeVerdictStateNote } from './stateTaxDisclosure'

/** The standing answer line's causes (`payCheckNote`): W stale, split by the act its door names; a fresh TYPED W below
 *  today's quote (U11 walk 6's R1, `workingYearCostTypedBelowLine`: it can never share the slot with W stale, which needs
 *  a stale W, and it carries a moved left over's figures as its clause); and the moved left over. */
export type StandingNoteCause = 'w-stale-update' | 'w-stale-confirm-or-change' | 'w-typed-below' | 'left-over-moved'

/** W stale's cause for each act (`workingYearQuote.workingYearCostAct`, council `wf_7fa86902-35c`), exhaustive: the
 *  Result picks the cause with the helper, never a free door label. */
export const W_STALE_CAUSE: Readonly<Record<WorkingCostAct, StandingNoteCause>> = {
  update: 'w-stale-update',
  confirmOrChange: 'w-stale-confirm-or-change',
}

/** The session facts `IntakeApp` decides and the page threads (each documented on `Result`'s props). */
export interface AnswerNotesSession {
  /** The unlock's read-only arm: the standing line loses its door. */
  readonly readOnly: boolean
  /** P3·U13: a staleness clock fired at unlock, so the hero wears the "figured fresh under today's rules" line. */
  readonly stalenessNote: boolean
  /** Build 2's clause host (R12, from `composeReentry` at unlock): a moved left over rides the rules note as a
   *  clause, and the standing slot says nothing of it (one cause, one line). */
  readonly leftOverClauseHost: boolean
  /** The aged-balances clause's honest year (`agedBalancesYearFor`): present ⇔ the shown answer still matches a save
   *  at least one calendar year old. */
  readonly agedBalancesYear?: number
  /** Today's calendar year, read by the caller through the ONE local-calendar chain
   *  (`currentEpochDay` → `epochDayToCalendarYear`) — this module reads no clock. */
  readonly wallCalendarYear: number
}

/** The ONE standing line: its cause, its words as parts, and the assumptions panel's seat its door opens. `seat` is
 *  absent on a read-only tab, whose parts carry no door either (`withoutDoor`). */
export interface StandingNote {
  readonly cause: StandingNoteCause
  readonly parts: NoteParts
  readonly seat?: AssumptionLandingSeat
}

export interface AnswerNotes {
  /** The plan clock (U17 §S0.2: years since the plan was BUILT, never since the save), from the ONE mint. */
  readonly planClock: BandPlanClockAnchor
  /** The PRICED state the shown run priced, or undefined (route-aware off the built params — insights 080, 081). */
  readonly statePricedNote: PricedState | undefined
  /** The shown run priced Medicare but reaches no Healthcare door (all 65 or older): the hero wears the priced-in
   *  affirmation and the narrowed residual. */
  readonly medicarePricedNote: boolean
  /** That affirmation and residual, as the heroes word them; null where `medicarePricedNote` is false. */
  readonly medicarePriced: { readonly affirmation: string; readonly residual: string } | null
  /** The standalone state clause (Card 4), or null where the residual carries it (or no answer is shown). */
  readonly stateNote: string | null
  /** The ask-for-Medicare-extras on-typical appendix (F5), or undefined (entered or affirmed households, unpriced runs). */
  readonly medicareExtrasTypicalNote: string | undefined
  /** The staleness note (the session's), and the moved left over's clause where a rules line hosts it. */
  readonly stalenessNote: boolean
  readonly stalenessClause: string | undefined
  /** The one standing line, or undefined where no cause holds. */
  readonly standing: StandingNote | undefined
  /** The aged-balances clause's year (the session's), or undefined. */
  readonly agedBalancesYear: number | undefined
}

/** The notes the hero receives for the store's current answer (this module's header holds the laws). */
export function composeAnswerNotes(snapshot: MemoryModelSnapshot, session: AnswerNotesSession): AnswerNotes {
  const { readOnly, stalenessNote, leftOverClauseHost, agedBalancesYear, wallCalendarYear } = session
  // THE PLAN CLOCK (P3·U13; U17 §S0.2). Presentation arithmetic ONLY, never written back into the draft. It is 0 for
  // every same-year session and goes positive only when a plan BUILT in an earlier calendar year is re-opened.
  // `startCalendarYear` is written once when the plan is built and survives every re-save, so this is "years since
  // you built this plan", never "years since your save" (the save's vintage rides `agedBalancesYear`).
  const planClock = planClockAnchor(snapshot.draft.startCalendarYear, wallCalendarYear)
  const answeredDraft: ScenarioDraft | null =
    snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer.draft : null
  // P3·U11 follow-up (the post-65 Medicare pricing unit, 2026-07-10) — "was Medicare priced in this
  // run?", route-aware and read off the BUILT params' own overlay decision, never ages and never a
  // re-derivation of the builder's inputs (insight 080; the ultramode fold's sharpening: the age
  // predicate diverged from the run at buildOverlay's degenerate early-return — the SS-only
  // $0-portfolio all-65+ household built NO overlay yet read "priced" from its ages). Spine:
  // `spineMedicarePriced` = the headline builder's own output. Date route: dateSearch.ts forces
  // healthcareEnabled true on every candidate, so Medicare is priced structurally. The household
  // with a priced run but NO Healthcare door (all-65+ — healthcarePriced needs a pre-65 member)
  // wears the "Medicare is priced in" affirmation + the narrowed residual.
  // The HERO's note, off the answered draft whole (the door's reach included: the hero's note describes the
  // run it shows; the Roth lever keeps the live note, in `editorSheets.tsx`, since it describes the run it will
  // preview — KTD5).
  const medicarePricedNote =
    answeredDraft !== null &&
    showMedicarePricedNote({
      medicarePriced: isDateRoute(answeredDraft) || spineMedicarePriced(answeredDraft),
      reachesHealthDoor: healthcarePriced(answeredDraft),
    })
  // The ask-for-Medicare-extras on-typical appendix (F5, population A): per-person BUILT
  // dollars + draft provenance + the name fallback (medicareExtrasDisclosureView — the ONE
  // assembly both F5 homes consume, insight 081), composed to the ONE bi-directional
  // sentence appended inside the residual paragraph. `undefined` for entered/affirmed
  // households and non-priced runs.
  const medicareExtrasTypicalNote =
    answeredDraft === null ? undefined : composeMedicareExtrasTypicalNote(medicareExtrasDisclosureView(answeredDraft))
  // The state-tax unit (S5) — "which PRICED state did THIS run price?", read route-aware off the
  // route's OWN built-params overlay decision (never draft.retirementState — insight 081; never a
  // bare isDateRoute disjunct — insight 080). undefined for not-priced / 'elsewhere' / unbuilt /
  // the degenerate-overlay household. The HERO's twin of the editor sheets' live read, off the
  // answered draft (KTD5: the sheets and the recommendation surface describe what they will run
  // next, the hero what it ran).
  const statePricedNote = answeredDraft === null ? undefined : pricedStateForRun(answeredDraft)
  // The pay check's KTD21 standing line: the household's W no longer matches the spending or state
  // it was given against, and the date still runs on that last figure (R4). The ONE stale predicate
  // (`workingYearQuote.ts`), read off the draft — the same answer the walk's gate and the panel's
  // row read. Its door opens the panel at the W row, and exists only where the tab can save. W's ONE stale line
  // (`workingYearCostStaleLine`): build 2 adds the clause for a "saved" answer waiting on W (R12), and, where the
  // spending rose, what a check at the quote adds (the U11 walk's (ae)).
  // W9-R7 (KTD5): the line, its choice of note and its door's words all describe the shown answer, so they read the
  // answered draft; only the door's open action is live (it opens the panel, which reads the live draft). Choosing
  // from the live draft split the slot: a W fixed in the panel made the note vanish while the date still ran on the
  // old figure (spec-flow I1).
  const payCheckStaleText = answeredDraft === null ? null : workingYearCostStaleLine(answeredDraft)
  // …and its door (council `wf_7fa86902-35c`): the act, which picks the cause and so the door's words
  // (`W_STALE_CAUSE`), and what the Result says beside it (U11 walk 5's (bj), (bk)).
  const payCheckStaleDoor = answeredDraft === null ? null : workingYearCostStaleDoor(answeredDraft)
  // Build 2's moved left over (R12), through the one moved core. Where a tax, state-tax
  // or working-years line fired at unlock (`leftOverClauseHost`, decided once by `composeReentry` and kept for
  // the session, whether or not the left over had moved then), the two figures ride the hero's rules note,
  // with no door of their own (the Assumptions door still reaches the seat); otherwise they take the standing
  // slot (never both — a moved left over needs a fresh W, so the W line never shares it either), whose door
  // opens the left-over seat.
  const leftOverMoved = answeredDraft === null ? null : workingYearLeftOverMoved(answeredDraft)
  // U11 walk 6's R1: a fresh TYPED W below today's quote, which W's stale line never reaches (a typed figure is never
  // staled on a quote, KTD10) — its own line in the same slot. It can never
  // share the slot with W stale (that needs a stale W; this, a fresh one), so W stale goes first only as the order the
  // three are written in. Where the left over has ALSO moved and no rules line hosts that clause, this line takes the
  // slot and carries the moved figures as its clause, since it names the credited figure too (`TypedBelowHost`).
  const typedBelowLine =
    answeredDraft === null
      ? null
      : workingYearCostTypedBelowLine(answeredDraft, { kind: 'result', carriesMoved: !leftOverClauseHost })
  // The standing answer line for one cause: its door opens the panel at that cause's seat, and exists only
  // where the tab can save (a read-only tab reads the fact alone). The parts' `door` — what is said beside the door (for
  // W, the Result's door from `workingYearCostStaleDoor`: its last dt/dd, council `wf_22858e04-f7a`) — rides only with the
  // door, so a read-only tab is never told buttons to press (`withoutDoor`).
  const standingNote = (cause: StandingNoteCause, parts: NoteParts, seat: AssumptionLandingSeat): StandingNote =>
    readOnly ? { cause, parts: withoutDoor(parts) } : { cause, parts, seat }
  const standing =
    payCheckStaleText !== null && payCheckStaleDoor !== null
      ? standingNote(W_STALE_CAUSE[payCheckStaleDoor.act], { ...payCheckStaleText, door: payCheckStaleDoor.result }, 'working-year-cost')
      : typedBelowLine !== null
        ? standingNote('w-typed-below', typedBelowLine, 'working-year-cost')
        : leftOverMoved !== null && !leftOverClauseHost
          ? standingNote('left-over-moved', plainNote(workingYearLeftOverMovedText(leftOverMoved)), 'working-year-left-over')
          : undefined
  return {
    planClock,
    statePricedNote,
    medicarePricedNote,
    medicarePriced: medicarePricedNote
      ? { affirmation: copy.verdictMedicarePriced, residual: composeVerdictMedicareResidual(statePricedNote) }
      : null,
    stateNote: answeredDraft === null ? null : composeVerdictStateNote(statePricedNote, medicarePricedNote),
    medicareExtrasTypicalNote,
    stalenessNote,
    stalenessClause:
      stalenessNote && leftOverClauseHost && leftOverMoved !== null ? workingYearLeftOverMovedClause(leftOverMoved) : undefined,
    standing,
    agedBalancesYear,
  }
}
