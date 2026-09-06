/**
 * Act-4 · U17 · S3 — THE RE-ENTRY TRICHOTOMY: may a saved recommendation be re-presented as
 * CURRENT? (build spec `docs/plans/features/act4-u17-saved-recommendation-build-spec.md`, Q3.)
 *
 * THE RULE: only when ALL THREE hold —
 *   1. the fresh solver-run fingerprint MATCHES the record's,
 *   2. `SOLVER_CODE_VERSION` MATCHES the record's,
 *   3. NO RULEBOOK CLOCK FIRED against the RECORD'S OWN ERA.
 * Otherwise the surface shows the action-warning record and an INVITED re-open that names its
 * cost (U16 measured the solve at 45.9× a single simulate). NEVER an auto-re-solve, and never a
 * remembered ranking re-drawn as if it were today's.
 *
 * WHY CONJUNCT 3 COMPARES THE RECORD'S ERA AND NOT THE SCENARIO'S — the correctness reason this
 * whole era snapshot exists. `deriveStaleness` (staleness.ts) compares the SCENARIO's vintage
 * stamps, and `scenarioFromDraft` RE-MINTS every one of those stamps FRESH at every save. So a
 * plan whose recommendation was found under old brackets, and then re-saved after a bracket
 * change, carries stamps that say "saved under today's rules" — `deriveStaleness` reads "no clock
 * fired" while the remembered verdict was priced under superseded law. That is the constant-blind
 * fingerprint hole one level up (`solverRunFingerprint` EXCLUDES `consumedConstantEntries` BY
 * DESIGN — its header says so), and re-presenting a stale ranking as current advice with a proof
 * attached is the cardinal calm-but-wrong sin.
 *
 * ONE COMPARATOR, NOT TWO. This module does NOT re-implement the clock logic; it runs the SAME
 * `deriveStaleness` against a scenario whose five era-bearing fields are OVERLAID from the record.
 * A second copy of the compare is precisely the drift that cost U17·S0 a failed verification.
 *
 * PURE: the caller injects `todayEpochDay` and the freshly-built `SolverRunFingerprint` (or
 * `null`). No clock read, no engine dispatch, no store state — every arm is table-testable.
 */
import type { ScenarioV3, SavedRecommendationV3, SavedRecommendationEraV3 } from '@shared/model'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { deriveStaleness, type StalenessExposure, type StalenessReport } from './staleness'

/** Why a saved recommendation may no longer be re-presented as current. Each names a DIFFERENT
 *  repair: re-solve (inputs), finish the answer (unavailable), re-solve under this build
 *  (solver), re-solve under today's rules (rules). */
export type SavedRecommendationSupersededCause =
  /** The fresh solver-run fingerprint differs from the record's — a ranking-affecting household
   *  input moved since the run. */
  | 'inputs-changed'
  /** NO fresh fingerprint can be built at all (the goal is unset, a required fact went missing,
   *  the builder refused) — so "does it still match?" is UNANSWERABLE. Fail-closed: an
   *  unanswerable identity question is never answered "yes". */
  | 'inputs-unavailable'
  /** `SOLVER_CODE_VERSION !== record.solverCodeVersion` — this build's ranking code cannot
   *  reproduce that ranking. */
  | 'solver-changed'
  /** A rulebook clock fired against the RECORD'S era (see the header). */
  | 'rules-changed'

export interface SavedRecommendationStatus {
  /** True iff EVERY conjunct holds — i.e. iff `causes` is empty. The only state in which the
   *  remembered recommendation may be spoken in the present tense. */
  readonly current: boolean
  /** EVERY cause that holds, never just the first one found — INSIGHT 101 IS BINDING: a warning
   *  that names one cause when two hold describes its poster child, not the predicate's whole
   *  extension, and S4's copy register is built directly on this output. Empty IFF `current`.
   *  Order is the stable declaration order above (inputs → solver → rules), so the copy layer can
   *  compose deterministically; it carries NO priority meaning. */
  readonly causes: readonly SavedRecommendationSupersededCause[]
  /** The FULL staleness report computed against the RECORD's era — carried out (not just its
   *  `rulesMoved` bit) so S4's exposure-gated copy register can name WHICH rulebook moved without
   *  re-deriving it against a different era and silently disagreeing with this verdict. */
  readonly eraStaleness: StalenessReport
}

export interface SavedRecommendationStatusInput {
  /** The record as decoded from the vault (or as just minted — the same shape either way). */
  readonly record: SavedRecommendationV3
  /** The CURRENT household scenario. Its household facts (people, budget, startCalendarYear,
   *  retirementState, medicareExtrasByPerson, survivorSpendingRatio) are the right basis for the
   *  clock's exposure gates and budget windows — those describe the household TODAY. Only the
   *  five ERA-bearing fields are overlaid from the record. */
  readonly scenario: ScenarioV3
  /** The freshly-built fingerprint of what a solve WOULD run on right now, or `null` when no run
   *  can be built (the fail-closed arm). Injected — the store owns the builder seam. */
  readonly freshFingerprint: SolverRunFingerprint | null
  /** Wall-clock epoch-day, injected (this module reads no clock). */
  readonly todayEpochDay: number
  /** What the run this household would get TODAY actually prices — the producer's-output
   *  exposure record `deriveStaleness` gates every clock on (U17 §S4; built at the ui/intake
   *  seam by `exposureForDraft`, because the store may not import intake). REQUIRED, not
   *  optional-with-a-default: a defaulted exposure would silently restore the OR-collapse this
   *  closed, and omitting it must be a compile error — the same structural-bind reasoning the
   *  era overlay below spells out.
   *
   *  A SAVED RECOMMENDATION IS ALWAYS A SPINE-ROUTE HOUSEHOLD, verified in source:
   *  `solveDispatch.ts:67-68` returns the typed refusal 'spine-unready' whenever
   *  `buildSpineParams(draft)` is null, and it is null exactly on the date route
   *  (`intakeMap.ts:713-714`) — so no record can exist for a date-route household. That is why no
   *  crowned offset is needed here and insight 088's date trap cannot arise: `exposureForDraft`
   *  takes its spine arm, where both reads come from the SAME `buildSpineParams` the headline
   *  run uses and are therefore EXACT. */
  readonly exposure: StalenessExposure
}

export function deriveSavedRecommendationStatus(
  input: SavedRecommendationStatusInput,
): SavedRecommendationStatus {
  const { record, scenario, freshFingerprint, todayEpochDay, exposure } = input

  // ── conjunct 3's basis: the scenario re-dressed in the RECORD's era ───────────────────────
  // THE OVERLAY IS TYPED SO THAT OMITTING ANY ERA-BEARING KEY IS A COMPILE ERROR.
  // `Required<Pick<ScenarioV3, keyof SavedRecommendationEraV3>>` demands EXACTLY the five keys the
  // era snapshot carries, each DEFINED (the era's own members are all required — model.ts
  // `SavedRecommendationEraV3` explains why the scenario's absent-is-quiet contract does not
  // transplant to a record). A forgotten key is TS2741 at this literal, not a silently-quiet clock
  // discovered by a household.
  //
  // WHY NOT `{ ...scenario, ...record.era }`. Today the blind spread would behave identically —
  // that is exactly what makes it dangerous. The moment ANY era member goes back to optional, the
  // spread leaves the SCENARIO's (re-minted, therefore fresher) stamp in place for every key the
  // record omits, silently answering "this clock did not move" about a comparison it never made —
  // and it reads correct while doing it. The typed literal makes BOTH halves of that regression
  // compile errors: the missing key, and the `T | undefined` value.
  //
  // A test cannot substitute for this. A verifier deleted `appDefaultVersion` from the old spread
  // and the ENTIRE suite stayed green — `APP_DEFAULT_ERAS` holds one era and it IS the current
  // one, so `appDefaultMoved` is false on both sides of every assertion. The bind has to be
  // structural.
  const overlay: Required<Pick<ScenarioV3, keyof SavedRecommendationEraV3>> = {
    appDefaultVersion: record.era.appDefaultVersion,
    taxVintageDetail: record.era.taxVintageDetail,
    stateTaxVintage: record.era.stateTaxVintage,
    healthcareVintage: record.era.healthcareVintage,
    dateVintage: record.era.dateVintage,
  }
  const eraScenario: ScenarioV3 = { ...scenario, ...overlay }
  const eraStaleness = deriveStaleness(eraScenario, todayEpochDay, exposure)

  const causes: SavedRecommendationSupersededCause[] = []

  // ── conjunct 1: the household's ranking-affecting inputs ──────────────────────────────────
  // A null fresh fingerprint is its OWN named cause, never folded into 'inputs-changed': the two
  // want different words from S4 ("your answer changed" vs "we can't check — finish the answer"),
  // and collapsing them would make the copy claim knowledge the store does not have.
  if (freshFingerprint === null) causes.push('inputs-unavailable')
  else if (freshFingerprint !== record.fingerprint) causes.push('inputs-changed')

  // ── conjunct 2: the ranking CODE ──────────────────────────────────────────────────────────
  // `!==`, NOT `<` (a dated override of solverCodeVersion.ts's own prediction, swept in the same
  // commit). A record from a NEWER build — a vault written by a later build and opened by this
  // one, which the multi-device/backup-restore path makes real — is EQUALLY un-re-presentable:
  // this build's code cannot reproduce that build's ranking, so "still current" is a claim we
  // cannot support in either direction. Fail closed both ways.
  if (record.solverCodeVersion !== SOLVER_CODE_VERSION) causes.push('solver-changed')

  // ── conjunct 3: the rulebooks, against the record's era ───────────────────────────────────
  // `rulesMoved`, NOT `anyStale`. `anyStale` additionally includes the expired-budget-window
  // re-confirms — calendar-passage prompts on a BYTE-IDENTICAL recompute (staleness.ts's
  // two-predicate split). Letting a lapsed travel budget demote a still-valid recommendation
  // would be alarm-when-fine: a lie in the safe direction, still a lie, and it would push the
  // household into a multi-minute re-solve that could only reproduce the same answer.
  //
  // U17 §S4 narrowed `rulesMoved` under this line WITHOUT touching it: a clock the household was
  // not exposed to no longer enters the predicate, and the unattributed re-base bucket never
  // did. Both narrowings are in the same direction as the note above — a record demoted for a
  // reason nothing is allowed to name would be the worst of the three states.
  if (eraStaleness.rulesMoved) causes.push('rules-changed')

  return { current: causes.length === 0, causes, eraStaleness }
}
