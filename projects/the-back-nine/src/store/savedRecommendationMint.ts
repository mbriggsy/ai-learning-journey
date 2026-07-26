/**
 * Act-4 · U17 · S5 — THE MINT: one committed solve → one `SavedRecommendationV3`, or an honest
 * refusal (build spec `docs/plans/features/act4-u17-saved-recommendation-build-spec.md`, Q5).
 *
 * IT IS A PROJECTION, NOT A DERIVATION. Every field is COPIED from a producer that already decided
 * it — the committed payload, the committed run identity, the composed view's own register, the
 * build's constant stamps. Nothing here re-computes a decision some other module already made
 * (insight 081: single-sourcing by re-deriving a producer's inputs forks at that producer's first
 * early return, and `recommendedView` has several).
 *
 * PURE. `mintedAt` is INJECTED — this module reads no clock, no store state, no engine dispatch, so
 * every arm is table-testable. The wall-time read stays at the gesture, in the ui layer that already
 * owns the save gate's epoch-day helper.
 *
 * IT VALIDATES ITS OWN MINT, AND THAT IS THE WHOLE POINT OF THE MODULE. The record is the ONE atom
 * `decodeScenario` drops NON-FATALLY, and that tolerance is charter'd for the READ side. On the
 * WRITE side it is a trap: a structurally-bad record put on the draft leaves `scenarioFromDraft`
 * choosing between saving the plan minus the record (the household is told "Saved" about a record
 * the vault does not have — the cardinal calm-but-wrong sin) and refusing the whole save (stranding
 * the household's real edits over a defect in OUR code). Both are downstream of the real mistake:
 * letting an invalid record onto the draft at all. So the LAST thing this function does is run the
 * SAME validator the decode path runs (`validateSavedRecommendation` — never a parallel copy that
 * could drift) and hand the caller a refusal it must render, per the obligation recorded on
 * `SaveReady.droppedAtoms`.
 *
 * REFUSE, NEVER DEFAULT (burned/062). Two codec BICONDITIONALS run through this record, and each one
 * is a PAIR this mint emits WHOLE or not at all:
 *   · `action.drawdownOrder` iff `policy === 'custom'` — a 'custom' action with no order names no
 *     strategy, and an order riding a named policy would silently NOT govern.
 *   · `verdict.subTenthCollapse` iff `verdict.grade` — the qualifier lives INSIDE the engine's
 *     `GradeResult`, so half a pair is unproducible. A withheld grade must NOT acquire an invented
 *     `subTenthCollapse: false` (the structurally-dormant disclosure fed from an empty default that
 *     solve.ts's phasing law forbids), and an absent grade must NOT acquire a defaulted 'coin-flip'
 *     (a fabricated reading the run never made).
 * A payload that carries half a pair is a producer bug: the mint spreads what it has, the codec
 * names it, and the caller gets `{ ok: false }` — never a plausible completion of the other half.
 */
import type { SolveRecommendation } from '@engine/solver/solve'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { stateTaxVintageStamp } from '@engine/constants/stateTax'
import { dateVintageStamp } from '@engine/constants'
import { CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import type { SavedRecommendationEraV3, SavedRecommendationV3 } from '@shared/model'
import { validateSavedRecommendation } from '@shared/scenarioCodec'

/** The mint's outcome. A refusal carries the codec's OWN `detail` (the failing field path), because
 *  the gesture must be able to say WHAT it could not save — insight 100: a gesture that promises an
 *  affordance owes a rendered outcome, and "we saved your plan, we could not save the
 *  recommendation" is only honest if it can name the defect it hit. */
export type MintOutcome =
  | { readonly ok: true; readonly record: SavedRecommendationV3 }
  | { readonly ok: false; readonly detail: string }

/**
 * THE ERA THE RUN WAS PRICED UNDER — read off THIS BUILD'S CONSTANTS, through the SAME four stamp
 * producers `scenarioFromDraft` writes the scenario's stamps from (insight 022: a second producer is
 * a clock that never fires). The engine is a pure function of these tables, and the solve being
 * minted ran in THIS process against THIS build — so the live stamps ARE the era that priced it.
 *
 * NOT READ OFF THE SCENARIO, deliberately. On `ScenarioV3` all five era-bearing fields type
 * `T | undefined` (a pre-U13 vault legitimately predates the stamps), so a scenario-sourced era
 * invites a `!` or a `?? {}` at exactly the seam where `SavedRecommendationEraV3` requires all five
 * PRESENT — and an era short one stamp pins that rulebook's clock `false` FOREVER, so the record
 * re-presents as CURRENT however far the law drifted (model.ts spells the fail-open out). Reading
 * the constants makes the undefined branch non-existent rather than handled.
 */
function eraStamp(): SavedRecommendationEraV3 {
  return {
    appDefaultVersion: CURRENT_APP_DEFAULT_VERSION,
    taxVintageDetail: taxVintageStamp(),
    stateTaxVintage: stateTaxVintageStamp(),
    healthcareVintage: healthcareVintageStamp(),
    dateVintage: dateVintageStamp(),
  }
}

/**
 * Mint the record for a COMMITTED recommendation.
 *
 * @param payload  the committed `SolveRecommendation` — the run this record describes.
 * @param fingerprint  the COMMITTED `SolveAnswer.fingerprint` (`memoryModel.ts` — the identity of
 *   the run above), NEVER a fresh recompute taken at save time. The two are equal at the mint and
 *   diverge afterwards, and that divergence IS the trichotomy's mechanism: minting from the fresh
 *   side would stamp the record with inputs the recommendation was never computed against, which on
 *   a stale draft is a calm-but-wrong memory rather than a detectable one. The engine's alias is a
 *   BARE `string`, so the type cannot enforce any of this — the bind is a test (insight 087).
 * @param noDollarRegister  the COMPOSED view's own `mode === 'no-change'` register, copied. It is
 *   un-derivable from this record by construction (two of its three disjuncts read seed-B headline
 *   dollars the record deliberately does not carry), so re-computing it here would silently re-tell
 *   a run whose live surface refused to claim any switch AS an active switch.
 * @param mintedAt  epoch-DAY, injected (this module reads no clock). Epoch-MILLISECONDS here is a
 *   finite integer that silently reads as year ~55000 — the codec's range gate refuses it (DND 009 /
 *   insight 046), which is why the validation below is not a formality.
 */
export function mintSavedRecommendation(
  payload: SolveRecommendation,
  fingerprint: SolverRunFingerprint,
  noDollarRegister: boolean,
  mintedAt: number,
): MintOutcome {
  const record: SavedRecommendationV3 = {
    mintedAt,
    fingerprint,
    // The version the RUN was solved under, off the payload — never this build's live
    // `SOLVER_CODE_VERSION`. Reading the live constant would make the record's version equal the
    // comparand by construction, and conjunct 2 of the trichotomy could then never fire.
    solverCodeVersion: payload.solverCodeVersion,
    // The goal the run RANKED for, off the payload — never `scenario.chosenGoal`, which is live and
    // editable: a household that flips the picker after saving must not have its old record
    // silently re-labelled with a goal that ranking never saw.
    goal: payload.goal,
    action: {
      // The WINNER's arm, never the runner-up's or the no-action baseline's (all three are
      // `SolveArm`s on the payload — the wrong-arm swap is the mutant this field's tests kill).
      candidateId: payload.winner.id,
      policy: payload.winner.policy,
      // BICONDITIONAL half #1, present-iff-present: the arm carries the order iff it is 'custom'.
      // A 'custom' winner that arrived without one is refused below, never handed a default order.
      ...(payload.winner.drawdownOrder !== undefined ? { drawdownOrder: payload.winner.drawdownOrder } : {}),
    },
    verdict: {
      // BICONDITIONAL half #2 — ONE spread, so the pair can only ever land TOGETHER or not at all.
      // Absent grade = WITHHELD (the B-family floor refusal, or no runner-up to grade against);
      // absence IS the sentinel, and the qualifier has nothing to qualify.
      ...(payload.grade !== undefined
        ? { grade: payload.grade.grade, subTenthCollapse: payload.grade.subTenthCollapse }
        : {}),
      noChange: payload.noChange,
      surplusRegime: payload.surplusRegime,
      // The INJECTED register, never re-derived (see the @param note).
      noDollarRegister,
    },
    era: eraStamp(),
  }
  // THE GATE. Same validator as the decode path, returned rather than thrown, so a mint-time refusal
  // is a control-flow decision at the caller and not a corrupt-vault event. Deleting this line keeps
  // every behavioural arm above green while re-opening the silent write-side drop — which is why a
  // SOURCE-BIND arm pins the call site itself (insight 032/081).
  const v = validateSavedRecommendation(record)
  return v.ok ? { ok: true, record } : { ok: false, detail: v.detail }
}
