/**
 * `solve.ts` — the SOLVER's recommendation ENTRY (U15 §S5): the gate, the trend-block-by-design,
 * the wire payload's value model. RANKS the sequencing-only field, ENUMERATES the withheld
 * conversion levers, and assembles the one structured payload U16 renders.
 *
 * THE GATE IS TWO-CLAUSE (§S5 (1)): `solve()` takes an {@link OracleClearedToken} as a REQUIRED
 * parameter — a recommendation path without a token is a TypeScript COMPILE error (the Act-1
 * no-unkeyed-write mirror, oracleToken.ts) — AND it RE-COMPUTES the run fingerprint (§S0.2) and
 * REFUSES, structurally (never a silent proceed, never a throw), a token whose `mintedOver.fingerprint`
 * differs from the run it is asked to bless. Order (the token) AND identity (the fingerprint) are both
 * enforced: the compile gate proves a token exists; the fingerprint proves it is THIS household's.
 *
 * CONVERSIONS RANK (the trend sourcing unit, 2026-07-19 — council wf_c673339e-257). The Medicare-cost
 * trend is SOURCED and the Part-B pricing consumes it (`PART_B_PRICING_MODE: 'trended'`), so the
 * token's trend clause is CLEAR and the whole roster ranks — conversion candidates included. The
 * partition below still DERIVES from the clause (never a hardcoded filter): if the clause ever
 * re-blocks (e.g. a future vintage regression flips the entry back to unsourced), the conversion
 * subset drops out of ranking and every withheld lever is enumerated with its named reason +
 * direction on the payload — a silently-dropped channel is an abstention, not a pass (insight 092).
 * The pre-sourcing posture (sequencing-only ranking, conversions disclosed-withheld) remains the
 * clause's blocking arm, exercised by test through the pure `_evaluateMedicareTrendClause` seam.
 *
 * THE PAYLOAD IS THE WIRE'S VALUE MODEL (§S5 (4)): full seed-B distributions for the winner + retained
 * runner-up + no-action baseline (the buffers the wire transfer-lists), scalar selection scores for the
 * pruned field (marked NEVER-rendered), the grade + named-driver + surplus-regime + withheld-lever
 * enumeration + `SOLVER_CODE_VERSION` as structured clone. Every DISPLAYED figure reads seed-set B
 * (never the optimizer's-curse-biased seed-A selection score — plan contract #2).
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — a deterministic function of `(token,
 * input)`. The heir bracket + goal ride `input.ranking` (the engine params are goal-agnostic).
 */
import type { Distribution, DrawdownOrderKey, DrawdownPolicy, RothConversionPlan, SimulationParams } from '@shared/model'
import { solverBFamilySize } from '@engine/constants'
import {
  tier2,
  type OracleGoal,
} from '../validation/evaluate'
import { solverRunFingerprint, type SolverRunRanking } from '../validation/solverRunFingerprint'
import { evaluateMedicareTrendClause, type OracleClearedToken, type WithheldReason } from '../validation/oracleToken'
import {
  deriveBFamilyMember,
  deriveSeedB,
  type SelectionScore,
} from '../validation/heldOutSeed'
import {
  GradeFloorRefusal,
  gradeOnFamily,
  namedDriverProbe,
  pairedDecisionDiffs,
  type GradeResult,
  type GradeStatistic,
} from '../validation/gradeCalibration'
import { evaluateCandidates } from '../validation/evaluate'
import {
  goalHeadlineStatistic,
  leaveMoreSkewDisclosure,
  skewOf,
  type CandidateOutcome,
  type LeaveMoreSkewDisclosure,
  type SkewDisclosure,
} from './objective'
import { runSearch, type CandidateEvaluation, type SolverSearchResult } from './search'
import { selectRecommendation } from './select'
import { solverCandidateId, type AnchoredRail, type CandidateStrategy } from './candidates'
import { SOLVER_CODE_VERSION } from './solverCodeVersion'
import { abortRequested, solveAborted, type ShouldAbort, type SolveAborted } from './cancel'

// ---- the input -------------------------------------------------------------------------------

export interface SolveInput {
  /** The built household params — MUST be the exact params the token was minted over (the
   *  fingerprint binds them). Carries the tax overlay (the bucket precondition — §S5 (3)). */
  readonly base: SimulationParams
  /** The FULL enumerated candidate roster the token's fingerprint covers (sequencing arms +
   *  the conversion grid). `solve()` ranks the sequencing-only subset and enumerates the
   *  conversion subset as withheld — it never RE-enumerates (the shared `candidates.ts` is the
   *  one enumerator; a caller passes `enumerateCandidates(...).candidates` straight through). */
  readonly candidates: readonly CandidateStrategy[]
  /** The Act-2 selection seed (integer). seed-set B is `deriveSeedB(seedA)` — never re-derived here. */
  readonly seedA: number
  /** The ranking objective — goal + heir bracket. MUST equal the objective the token's fingerprint
   *  pins (§S0.2); a `leave-more` token can never bless a `pay-less-tax` solve. */
  readonly ranking: SolverRunRanking
  /** The A-side CRN-difference selection tie-tolerance the ranking runs at (heldOutSeed's
   *  `selectionTieTolerance` in a live solve; 0 on the zero-vol oracle worlds). */
  readonly tieTolerance: number
  /** TEST-SEAM ONLY (insight 048): overrides the grade's live 16,000-path B-floor so the grade
   *  path is drivable at a small path count. The live binding NEVER passes this — the calibrated
   *  floor governs, and a base below it yields a structured `gradeUnavailable` (never a throw). */
  readonly _gradeMinPaths?: number
}

// ---- the value-model payload (the wire serializes this) --------------------------------------

/** One DISPLAYED arm (winner / retained runner-up / no-action baseline): its id + the FULL seed-B
 *  distribution (the buffers the wire transfer-lists) + the goal's headline statistic on B + the B
 *  survival fraction. Every figure here is seed-set B (contract #2 — never the seed-A selection score). */
export interface SolveArm {
  readonly id: string
  readonly policy: DrawdownPolicy
  /** The conversion plan. ⚠️ NOT always `null` — this comment used to say "always null in the live
   *  sequencing-only ranking", a premise that EXPIRED 2026-07-19 when Part B went `'trended'` and the
   *  trend clause cleared. Conversion candidates rank live now, so consumers must handle a real plan. */
  readonly conversion: RothConversionPlan | null
  /** Present iff `policy === 'custom'` (the shipped biconditional) — the user's out-of-grid order. */
  readonly drawdownOrder?: readonly DrawdownOrderKey[]
  /** The seed-B distribution — the U16 band/fan/figures read THIS. */
  readonly distributionB: Distribution
  /** The goal's headline statistic on seed-B (objective ≡ headline — real $). */
  readonly headlineStatisticB: number
  /** The seed-B survival fraction (raw pre-clamp). */
  readonly survivalB: number
}

/** A pruned/losing candidate — a SCALAR only (structured clone, no distribution; plan line 178). */
export interface SolvePrunedScore {
  readonly id: string
  /** Position in the shrunk seed-A ranked order (0 = would-be winner). */
  readonly rankIndex: number
  /** The seed-A selection scalar (the lexicographic Tier-2 score), MARKED never-rendered — U16
   *  renders the ORDER, never this value as a displayed figure (the optimizer's-curse-biased read
   *  the held-out machinery defeats). Absent for an infeasible candidate (no score). */
  readonly selectionScoreA?: SelectionScore
}

/** A conversion lever WITHHELD from ranking (insight 092 — a silently-dropped channel is an
 *  abstention). Named + directioned so U16 says "conversions aren't ranked yet" honestly. */
export interface WithheldConversionLever {
  readonly id: string
  readonly policy: DrawdownPolicy
  readonly annualAmountReal: number
  readonly startYearOffset: number
  readonly years: number
  /** The structured reason (the Medicare-trend block owns conversions today — §S5 (2)). */
  readonly reason: WithheldReason
  /** The income rail this conversion was anchored just under — the DIRECTION (insight 092): the
   *  payoff channel (ACA cliff / IRMAA step / bracket edge) that cannot be priced without the
   *  sourced Medicare trend. Undefined only if the caller injected an un-anchored conversion. */
  readonly anchoredRail: AnchoredRail | undefined
}

export interface SolveRefused {
  readonly kind: 'refused'
  readonly reason: 'fingerprint-mismatch' | 'bucket-precondition' | 'held-out-infeasible' | 'tie-tolerance-invalid' | 'heir-bracket-missing'
  readonly detail: string
  readonly solverCodeVersion: number
}

/** The demotion-axis structured withhold (§S4.5) routed up from `select.ts` — never an uncaught
 *  throw. ⚠️ The "unreachable in a live sequencing-only solve (conversions blocked)" premise EXPIRED
 *  2026-07-19; conversions rank live. Reachable on BOTH goals since 2026-08-03 — the `leave-more`
 *  arm used to reach a plain throw instead (the Tier-0 crash) and now routes here like its twin. */
export interface SolveWithheld {
  readonly kind: 'withheld'
  readonly reason: 'demotion-axis-uncalibrated'
  readonly detail: string
  readonly winnerId: string
  readonly runnerUpId: string | undefined
  readonly surplusRegime: boolean
  readonly solverCodeVersion: number
}

export interface SolveRecommendation {
  readonly kind: 'recommended'
  readonly goal: OracleGoal
  readonly heirBracket: number | undefined
  readonly seedA: number
  /** `deriveSeedB(seedA)` — carried so U17 re-derives byte-identically (never persisted raw). */
  readonly seedB: number
  readonly winner: SolveArm
  /** The retained runner-up (R23) — undefined only for a one-arm rankable set (never in a live solve). */
  readonly runnerUp: SolveArm | undefined
  /** The user's CURRENT strategy → recommended comparison anchor (the conventional-order/conversion-0
   *  baseline). Always present (the enumerator + the shrinkage prior require it). */
  readonly noActionBaseline: SolveArm
  /** The full shrunk seed-A ranked order, best-first (a permutation of every ranked candidate id). */
  readonly rankedIds: readonly string[]
  /** Every ranked candidate that is not a displayed arm — scalar only. */
  readonly prunedScores: readonly SolvePrunedScore[]
  /** The winner IS the conventional prior — the no-change routing signal (plan R25; a structured
   *  flag, no copy authored here). */
  readonly noChange: boolean
  /** The 10/10→surplus pivot signal (§S4.4 — A and B agree over the over-funded ε). */
  readonly surplusRegime: boolean
  /** The calibrated grade (U14) on the decision axis. `undefined` iff it could not be computed at
   *  the calibrated B-floor (see `gradeUnavailable`) or there is no runner-up to grade against. */
  readonly grade: GradeResult | undefined
  /** The axis the grade was decided on (survival in the on-track regime; the goal dollar in surplus). */
  readonly gradeStatistic: GradeStatistic
  /** Present iff `grade` is undefined AND a grade WAS attempted — the named reason (never a silent
   *  drop; the grade path stays total — insight 092). */
  readonly gradeUnavailable: { readonly reason: string } | undefined
  /** The named driver the crown hinges on (`gradeCalibration.namedDriverProbe`); the honest
   *  `sampling-noise-near-tie` sentinel when no probe can flip it — never a fabricated cause. */
  readonly namedDriver: string
  /** The §S2 leave-more skew disclosure (the mean's skew beside the typical bequest) — present iff
   *  the goal is leave-more (undefined for pay-less-tax; carried honestly, never fabricated). */
  readonly skewDisclosure: LeaveMoreSkewDisclosure | undefined
  /** The DELTA hero's skew disclosure (the median-advantage increment, 2026-07-23): the skew of the
   *  CRN-PAIRED per-path winner-vs-no-action goal differences on seed-set B — the same vector family
   *  the grade reads (`pairedDecisionDiffs`, the ONE sign-convention home; winner-positive on both
   *  goals, matching the hero's own orientation). The displayed "$X more" is a MEAN of these diffs
   *  (linearity: mean(diffs) ≡ the headline delta), and a mean advantage can lean on a few lucky
   *  futures while the TYPICAL future gains far less — the calm-but-wrong-OPTIMISTIC shape this
   *  channel exists to surface (the level got this disclosure in §S2; the delta never did — the
   *  hunter's surviving asymmetry). `undefined` only when the diffs cannot be computed honestly (no
   *  tax lens / no declared heir bracket) — carried honestly, never fabricated. */
  readonly deltaSkew: SkewDisclosure | undefined
  /** EVERY conversion lever withheld from ranking, named + directioned (insight 092). */
  readonly withheldConversionLevers: readonly WithheldConversionLever[]
  /** The methodology-substrate directional levels this run was minted OVER (the token's
   *  `mintedOver.disclosedDirectional` — U16 §S3, seam (ii)). Copied onto the recommendation so the
   *  grade's ShapeDisclosure note (`composeShapeDisclosure`) rides the SAME substrate the token was
   *  cleared against — the honesty-hawk phasing law: the figure and its disclosure land TOGETHER, never
   *  a structurally-dormant disclosure fed from an empty default. Empty ⇒ no shape note — but the live
   *  mint is NON-empty on any default-assumptions run (`methodology.productionMarket` +
   *  `methodology.survivorSpendingRatio` are directional substrate the pinning walk consumes whenever
   *  the run carries the default bytes; corrected 2026-08-20 — this line said the empty case was
   *  "the common case today" while the note rendered on every real commit). Engine-pure, additive. */
  readonly disclosedDirectional: readonly string[]
  readonly solverCodeVersion: number
}

export type SolveResult = SolveRefused | SolveWithheld | SolveRecommendation | SolveAborted

// ---- helpers ---------------------------------------------------------------------------------

/** Build a displayed arm from a candidate evaluation's seed-B outcome. `undefined` iff B is
 *  infeasible (the held-out draw could not fund it) — the caller routes a required arm's absence
 *  to a structured refusal rather than displaying a phantom figure. */
function armOfB(evaluation: CandidateEvaluation, goal: OracleGoal): SolveArm | undefined {
  const b = evaluation.b
  if (b.kind !== 'scored') return undefined
  const c = evaluation.candidate
  return {
    id: evaluation.id,
    policy: c.policy,
    conversion: c.conversion,
    ...(c.drawdownOrder !== undefined ? { drawdownOrder: c.drawdownOrder } : {}),
    distributionB: b.distribution,
    headlineStatisticB: goalHeadlineStatistic(b.score, goal),
    survivalB: b.score.survival,
  }
}

/** Enumerate every withheld conversion lever (insight 092) with the structured trend reason +
 *  its anchored-rail direction. The reason is the LIVE Medicare-trend clause read: the trend has been
 *  sourced + trended since 2026-07-19 (the Medicare-cost-trend unit), so conversions RANK and this
 *  arm is reachable only if the trend entry regresses to unsourced (⇒ `medicare-trend-unsourced`). */
export function enumerateWithheldConversionLevers(
  conversionCandidates: readonly CandidateStrategy[],
): readonly WithheldConversionLever[] {
  if (conversionCandidates.length === 0) return []
  const reason = evaluateMedicareTrendClause(true)
  // The trend clause returns null only when the trend is sourced AND Part-B pricing consumes it —
  // in which case conversions are no longer withheld and this enumeration is empty by construction.
  if (reason === null) return []
  return conversionCandidates.map((c) => {
    if (c.conversion === null) {
      throw new Error('[solve] enumerateWithheldConversionLevers: a non-conversion candidate was passed as withheld')
    }
    return {
      id: solverCandidateId(c),
      policy: c.policy,
      annualAmountReal: c.conversion.annualAmountReal,
      startYearOffset: c.conversion.startYearOffset,
      years: c.conversion.years,
      reason,
      anchoredRail: c.anchoredRail,
    }
  })
}

/** The grade decision axis: SURVIVAL in the on-track regime (the headline is survival), the GOAL
 *  dollar axis in the surplus regime (the headline pivots to the goal — §S4.4 / plan line 224). */
export function gradeAxisFor(goal: OracleGoal, surplusRegime: boolean): GradeStatistic {
  if (!surplusRegime) return 'survival'
  // EXHAUSTIVE switch + never-guard: in the surplus regime the axis IS the goal dollar — a future
  // third goal must declare its surplus axis explicitly, never pass through untyped (the id-chain
  // `surplusRegime ? goal : 'survival'` would silently widen GradeStatistic behind the compiler).
  switch (goal) {
    case 'pay-less-tax':
      return 'pay-less-tax'
    case 'leave-more':
      return 'leave-more'
    default: {
      const _exhaustive: never = goal
      throw new Error(`[solve] gradeAxisFor: unknown goal ${String(_exhaustive)} — declare its surplus-regime grade axis`)
    }
  }
}

/**
 * The leave-more objective wiring the harness deferred (the per-solve heir bracket is supplied HERE).
 * Assembles the deterministic B-family (the SAME `deriveBFamilyMember` expansion the harness uses) and
 * hands the CRN-paired per-path decision differences — computed by the ONE exported
 * `pairedDecisionDiffs` sign-convention home (gradeCalibration.ts; solve.ts's private twin was deleted
 * in the U15 fold) — to `gradeOnFamily`, the ONE grade DECISION home (never re-implemented). Handles
 * all three axes uniformly so the surplus leave-more grade rides the same machinery as survival/tax.
 *
 * Returns `undefined` (never a throw) when the B-floor cannot be met at the base's path count OR an
 * arm is infeasible on a family member — a structured `gradeUnavailable` the caller carries honestly.
 */
export function gradeSolveRecommendation(opts: {
  readonly base: SimulationParams
  readonly winner: CandidateStrategy
  readonly runnerUp: CandidateStrategy
  readonly seedA: number
  readonly statistic: GradeStatistic
  readonly heirBracket: number | undefined
  readonly minPathsOverride?: number
}): { readonly grade: GradeResult } | { readonly unavailable: string } {
  const { base, winner, runnerUp, seedA, statistic, heirBracket, minPathsOverride } = opts
  if (statistic === 'leave-more' && heirBracket === undefined) {
    return { unavailable: 'leave-more grade requires a declared heir bracket' }
  }
  const seedB = deriveSeedB(seedA)
  const familySize = solverBFamilySize.value
  const familySeeds = Array.from({ length: familySize }, (_, i) => deriveBFamilyMember(seedB, i))
  const family: Array<readonly number[]> = []
  const displayReads: Array<{ winnerSurvival: number; runnerUpSurvival: number }> = []
  const evalOpts = heirBracket !== undefined ? { heirBracket } : {}
  for (const seed of familySeeds) {
    const [w, r] = evaluateCandidates(base, [winner, runnerUp], seed, evalOpts)
    if (w!.kind !== 'scored' || r!.kind !== 'scored') {
      return { unavailable: 'a B-family member is infeasible — the grade cannot be read on it' }
    }
    family.push(pairedDecisionDiffs(w!, r!, statistic, heirBracket))
    if (statistic === 'survival') {
      displayReads.push({ winnerSurvival: w!.score.survival, runnerUpSurvival: r!.score.survival })
    }
  }
  try {
    const grade = gradeOnFamily({
      family,
      statistic,
      winnerHasConversion: winner.conversion !== null,
      runnerUpHasConversion: runnerUp.conversion !== null,
      ...(statistic === 'survival' ? { displayReads } : {}),
      ...(minPathsOverride !== undefined ? { minPathsOverride } : {}),
    })
    return { grade }
  } catch (e) {
    // NARROW: only the typed floor refusal (a base below the calibrated 16,000-path floor, or a
    // non-full B-family) demotes to a NAMED unavailable (the grade path stays total — insight 092).
    // EVERY other throw — the demotion-axis fail-closed guard, a non-finite paired difference, the
    // uncalibrated-sentinel refusal, any programming error — propagates LOUD: a fail-closed guard must
    // never be laundered into a calm "unavailable" (the calm-but-wrong cardinal sin).
    if (e instanceof GradeFloorRefusal) return { unavailable: e.message }
    throw e
  }
}

/**
 * The DELTA hero's skew disclosure (the median-advantage increment): skew of the CRN-paired per-path
 * winner-vs-baseline goal differences on seed-set B, via the ONE sign-convention home
 * (`pairedDecisionDiffs` — winner-positive on both goals, the hero's own orientation) and the ONE
 * skew constructor (`skewOf`). By linearity `meanReal` reproduces the displayed headline delta
 * exactly on a zero-vol world (every path identical — the committed-fixture coherence arm pins it)
 * and to float dust on a live one.
 *
 * `undefined` — carried honestly, never a throw in payload assembly — when the diffs cannot be
 * computed: an unscored arm (unreachable here; `armOfB` already refused), a missing tax lens, or a
 * leave-more goal without a declared heir bracket (unreachable live; the (2.5) refusal holds the
 * door). A presence CHECK, never a catch — a swallowed computation error would be laundering.
 */
export function deltaSkewFor(
  winner: CandidateOutcome,
  baseline: CandidateOutcome,
  goal: OracleGoal,
  heirBracket: number | undefined,
): SkewDisclosure | undefined {
  if (winner.kind !== 'scored' || baseline.kind !== 'scored') return undefined
  if (goal === 'leave-more' && heirBracket === undefined) return undefined
  if (winner.distribution.taxAware === undefined || baseline.distribution.taxAware === undefined) {
    return undefined
  }
  return skewOf(pairedDecisionDiffs(winner, baseline, goal, heirBracket))
}

const refused = (reason: SolveRefused['reason'], detail: string): SolveRefused => ({
  kind: 'refused',
  reason,
  detail,
  solverCodeVersion: SOLVER_CODE_VERSION,
})

// ---- the entry -------------------------------------------------------------------------------

/**
 * Solve for the recommendation over a household + its enumerated roster, gated by the
 * oracle-cleared token (§S5). The token is REQUIRED (the compile gate) and its fingerprint is
 * re-checked (the identity gate). Conversions stay trend-blocked (ranked sequencing-only + the
 * withheld levers enumerated). Deterministic in `(token, input)`.
 *
 * `shouldAbort` is the OPTIONAL injected cooperative-abort seam (§S6, `cancel.ts`): checked at the
 * COARSE stage boundaries that bracket the two dominant cost centers — before the K-candidate search
 * and before the m-draw grade B-family — returning a NAMED `aborted` bin rather than burning that
 * compute on a superseded solve. The engine reads no clock; the caller owns the epoch. Finer
 * (per-candidate) granularity + the live worker-epoch transport WAIT on the profile's numbers (§S6).
 */
export function solve(token: OracleClearedToken, input: SolveInput, shouldAbort?: ShouldAbort): SolveResult {
  const { base, candidates, seedA, ranking, tieTolerance } = input
  const goal = ranking.goal
  const heirBracket = ranking.heirBracket

  // (0) INPUT VALIDATION before the fingerprint gate: tieTolerance is a ranking-affecting run input
  // (it now rides the fingerprint), and every downstream consumer (rankCandidates / selectCore /
  // the shrinkage tolerance) refuses a non-finite or negative tolerance with a throw — so refuse it
  // HERE, loud and structured (a NaN admits every candidate to the survival-top set; insight 010).
  if (!Number.isFinite(tieTolerance) || tieTolerance < 0) {
    return refused(
      'tie-tolerance-invalid',
      `the selection tie-tolerance must be finite ≥ 0 (got ${tieTolerance}) — a non-finite tolerance admits ` +
        'every candidate to the survival-top set (insight 010); refusing rather than ranking on a broken equivalence',
    )
  }

  // (1) The IDENTITY gate (§S0.2): recompute the fingerprint over the run this token is asked to
  // bless and refuse a mismatch — structurally, never a silent proceed. The compile gate already
  // proved a token EXISTS; this proves it is THIS (household, roster, objective, seedA, tieTolerance).
  const runFingerprint = solverRunFingerprint(base, candidates, ranking, { seedA, tieTolerance })
  if (runFingerprint !== token.mintedOver.fingerprint) {
    return refused(
      'fingerprint-mismatch',
      'the oracle-cleared token was minted over a DIFFERENT run (household / candidate roster / objective) ' +
        'than the one solve() was asked to bless — refusing rather than shipping another run’s validation',
    )
  }

  // (2) The bucket precondition (§S5 (3)): the solver searches sequencing × conversion, which
  // require per-person tax buckets — a tax-blind spine has no split to sequence. Refuse structurally.
  if (base.overlay === undefined) {
    return refused(
      'bucket-precondition',
      'the run carries no tax overlay (per-person buckets) — the solver never runs on a defaulted split (burned/062)',
    )
  }

  // (2.5) leave-more REQUIRES a declared heir bracket (the §1014/IRD discount the bequest is scored
  // at). Without it the objective cannot RANK (tier2 throws) or GRADE the after-tax-to-heirs bequest —
  // refuse loud + NAMED here, BEFORE the search, never a compute-error surfacing deep in the grade
  // (burned/062 — no silent default). The fingerprint already pins heirBracket, but this is a run
  // WELL-FORMEDNESS refusal, not an identity mismatch, so it earns its own reason.
  if (goal === 'leave-more' && heirBracket === undefined) {
    return refused(
      'heir-bracket-missing',
      'a leave-more solve requires a declared heir bracket (the §1014/IRD discount the bequest is scored at) — ' +
        'refusing rather than ranking or grading an undefined bequest (burned/062)',
    )
  }

  // (3) Partition — DERIVED FROM THE TOKEN'S TREND CLAUSE (the trend sourcing unit closed the
  // U15 tripwire's named seam): `enumerateWithheldConversionLevers` reads the live clause and
  // returns [] when the trend is sourced AND Part-B pricing consumes it — in which case the WHOLE
  // roster ranks (conversions included). While any lever is withheld, only the sequencing-only
  // subset ranks. The rankable field derives from the clause's own output — never a duplicated
  // hardcoded `conversion === null` filter that could silently orphan a cleared channel.
  const conversionCandidates = candidates.filter((c) => c.conversion !== null)
  const withheldConversionLevers = enumerateWithheldConversionLevers(conversionCandidates)
  const rankable =
    conversionCandidates.length > 0 && withheldConversionLevers.length === 0
      ? candidates
      : candidates.filter((c) => c.conversion === null)

  // COOPERATIVE ABORT (§S6) — before the first dominant cost center (the K-candidate search). A
  // superseded solve bails HERE with a named `aborted` bin rather than decumulating the whole batch.
  if (abortRequested(shouldAbort)) {
    return solveAborted('solve aborted before the K-candidate search (a newer dispatch superseded it)')
  }

  // (4) Search the sequencing-only field on BOTH seed-sets (A selects; B displays + grades).
  const search: SolverSearchResult = runSearch({
    base,
    candidates: rankable,
    seedA,
    goal,
    tieTolerance,
    ...(heirBracket !== undefined ? { heirBracket } : {}),
  })

  // (5) Select: shrinkage + deterministic crown. A demotion-axis refusal routes to a structured
  // withheld state (never a throw), on EITHER goal.
  // ⚠️ EXPIRED PREMISE (was: "unreachable live — sequencing-only ⇒ no conversion winner"). Conversions
  // rank live since 2026-07-19. Until 2026-08-03 a `leave-more` conversion winner reached a THROW that
  // landed as a generic "unavailable" card — the exact calm-but-wrong laundering the catch above warns
  // about. `select.ts`'s guard is goal-agnostic now; both arms return this structured state.
  const selection = selectRecommendation(search)
  if (selection.kind === 'withheld') {
    return {
      kind: 'withheld',
      reason: selection.reason,
      detail: selection.detail,
      winnerId: selection.winnerId,
      runnerUpId: selection.runnerUpId,
      surplusRegime: selection.surplusRegime,
      solverCodeVersion: SOLVER_CODE_VERSION,
    }
  }

  // (6) Build the displayed arms from seed-set B (contract #2 — never the seed-A selection score).
  //
  // ⚠️ THE DISPLAYED BASELINE IS THE HOUSEHOLD'S OWN PLAN (re-anchored 2026-08-03), falling back to
  // the conventional arm only when no user baseline was enumerated (every oracle fixture, so the
  // goldens are untouched). It used to be `search.conventionalBaseline` unconditionally — the FIXED
  // `taxable-first`/conversion-0 candidate — while the shipped nameplate read "Compared with your
  // plan today" and the hero read "than today's plan". For any household whose entered order is not
  // `taxable-first` (including the DEFAULT `proportional` draft) the dollar hero was measured
  // against a plan they never chose, under a label saying it was theirs.
  //
  // `plans/4-recommendation.md` already ratified this: "the rendered delta is current→recommended,
  // NEVER conventional-default→recommended". This is a regression being closed, not a new choice.
  //
  // SELECTION IS UNTOUCHED. `search.userBaseline` feeds the DISPLAY only; the shrinkage prior and
  // the incumbent tie-break still anchor on the conventional arm (`select.ts`), so no ranking moves
  // and the household's own habit is still never laundered into advice.
  const winnerEval = search.evaluations[selection.winnerIndex]!
  const winner = armOfB(winnerEval, goal)
  const displayedBaselineEval = search.userBaseline ?? search.conventionalBaseline
  const baseline = armOfB(displayedBaselineEval, goal)
  if (winner === undefined || baseline === undefined) {
    return refused(
      'held-out-infeasible',
      'the winner or the no-action baseline is infeasible on the held-out seed-set B — refusing to display a phantom figure',
    )
  }
  const runnerUpEval =
    selection.runnerUpIndex !== undefined ? search.evaluations[selection.runnerUpIndex]! : undefined
  const runnerUp = runnerUpEval !== undefined ? armOfB(runnerUpEval, goal) : undefined

  // (7) The pruned field — scalar selection scores only, MARKED never-rendered, in ranked order.
  const armIndices = new Set<number>([
    selection.winnerIndex,
    ...(selection.runnerUpIndex !== undefined ? [selection.runnerUpIndex] : []),
    // The DISPLAYED baseline (not necessarily the conventional one since 2026-08-03) — this set is
    // "arms that render", and the pruned field is by definition what does not.
    search.evaluations.indexOf(displayedBaselineEval),
  ])
  const prunedScores: SolvePrunedScore[] = []
  selection.rankedIndices.forEach((candIndex, rankIndex) => {
    if (armIndices.has(candIndex)) return
    const a = search.evaluations[candIndex]!.a
    prunedScores.push({
      id: search.evaluations[candIndex]!.id,
      rankIndex,
      ...(a.kind === 'scored'
        ? { selectionScoreA: { neverRendered: true, value: tier2(a.score, goal) } as SelectionScore }
        : {}),
    })
  })

  // COOPERATIVE ABORT (§S6) — before the second dominant cost center (the grade's m-draw B-family at
  // the 16k held-out floor). Selection is done + the arms are built (cheap); bail before the grade.
  if (abortRequested(shouldAbort)) {
    return solveAborted('solve aborted before the grade B-family (a newer dispatch superseded it)')
  }

  // (8) The grade on the regime-appropriate axis (survival on-track; the goal dollar in surplus).
  const gradeStatistic = gradeAxisFor(goal, selection.surplusRegime)
  let grade: GradeResult | undefined
  let gradeUnavailable: { readonly reason: string } | undefined
  if (runnerUpEval !== undefined) {
    const graded = gradeSolveRecommendation({
      base,
      winner: winnerEval.candidate,
      runnerUp: runnerUpEval.candidate,
      seedA,
      statistic: gradeStatistic,
      heirBracket,
      ...(input._gradeMinPaths !== undefined ? { minPathsOverride: input._gradeMinPaths } : {}),
    })
    if ('grade' in graded) grade = graded.grade
    else gradeUnavailable = { reason: graded.unavailable }
  }

  // (9) The named driver the crown hinges on (over the RANKABLE field) — the honest sentinel when
  // no probe can flip it. The crown authority is the SHIPPED selection path (shrinkage + the withhold
  // arm), not the raw argmax: a probe that flips the argmax but not the shrunk crown (or the reverse)
  // would name a driver the user never sees. `baselineCrown` is the selection winner we already
  // computed (reused, not re-evaluated). A probed world whose selection WITHHOLDS is a DIFFERENT crown
  // by construction (the string arm is deliberate). Cheap re-ranks; never fabricates a cause.
  const shippedCrown = (probedParams: SimulationParams): string => {
    const s = runSearch({
      base: probedParams,
      candidates: rankable,
      seedA,
      goal,
      tieTolerance,
      ...(heirBracket !== undefined ? { heirBracket } : {}),
    })
    const sel = selectRecommendation(s)
    return sel.kind === 'withheld' ? `withheld:${sel.reason}` : s.evaluations[sel.winnerIndex]!.id
  }
  const { driver: namedDriver } = namedDriverProbe({
    base,
    candidates: rankable,
    goal,
    tieTolerance,
    seed: seedA,
    ...(heirBracket !== undefined ? { heirBracket } : {}),
    baselineCrown: selection.winnerId,
    crownFor: shippedCrown,
  })

  // The §S2 leave-more skew disclosure (the mean's skew beside the typical bequest) on the WINNER's
  // seed-B distribution — present iff leave-more (undefined for pay-less-tax; carried honestly).
  const skewDisclosure =
    goal === 'leave-more' && heirBracket !== undefined
      ? leaveMoreSkewDisclosure(winner.distributionB, heirBracket)
      : undefined

  // The DELTA hero's skew (the median-advantage increment): the paired winner-vs-no-action per-path
  // goal differences on seed-set B — the same outcomes the displayed arms were built from, so the
  // disclosed mean IS the hero's delta (linearity; the committed-fixture coherence arm pins it).
  // Paired against the DISPLAYED baseline, so the disclosed mean IS the hero's delta (linearity).
  // Re-anchoring the hero without re-anchoring this would have made the skew describe a different
  // subtraction than the number it sits beside — the committed-fixture coherence arm pins the pair.
  const deltaSkew = deltaSkewFor(winnerEval.b, displayedBaselineEval.b, goal, heirBracket)

  return {
    kind: 'recommended',
    goal,
    heirBracket,
    seedA,
    seedB: search.seedB,
    winner,
    runnerUp,
    noActionBaseline: baseline,
    rankedIds: selection.rankedIds,
    prunedScores,
    noChange: selection.noChange,
    surplusRegime: selection.surplusRegime,
    grade,
    gradeStatistic,
    gradeUnavailable,
    namedDriver,
    skewDisclosure,
    deltaSkew,
    withheldConversionLevers,
    // Seam (ii): the figure and its disclosure land together — the recommendation carries the SAME
    // methodology-substrate directional levels the token was minted over (never an empty default).
    disclosedDirectional: token.mintedOver.disclosedDirectional,
    solverCodeVersion: SOLVER_CODE_VERSION,
  }
}
