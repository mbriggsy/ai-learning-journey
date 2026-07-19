/**
 * `search.ts` — the SOLVER's K-candidate batch runner (U15 §S3): RANK, never re-decumulate.
 *
 * WHAT IT DOES AND, LOUDLY, WHAT IT DOES NOT. It runs the enumerated candidate set through the
 * ONE shared evaluation path and hands the ranked field on to selection — it never re-implements
 * candidate generation, the apply seam, the spine/overlay per-year update, or the reference
 * ranking. Every one of those is IMPORTED:
 *
 *  - candidate identity comes from `candidates.ts` (`CandidateStrategy` / `solverCandidateId`);
 *  - each candidate is applied + simulated through `evaluateCandidates` (validation/evaluate) —
 *    the EXACT function `runRankingStability` and `gradeCalibration` drive, so the CRN identity
 *    ("identical draws across all K candidates", plan contract #5) is inherited BY IMPORT, never
 *    re-proven here: the draw schedule is a pure function of `(seed, paths, maxHorizon,
 *    peopleCount)` and `applyCandidate` provably moves none of those, so the same `buildDraws`
 *    matrix feeds every candidate on a given seed. `search.test.ts` pins that the K-candidate
 *    stability check runs over THIS exact set (the shared module IS the proof);
 *  - the ranking is `objective.ts`'s `rankForGoal` — pinned ≡ the harness's `rankCandidates`, so
 *    the shipped ranking IS the oracle-validated one (objective ≡ headline, plan contract #4).
 *
 * REDUCE-TO-SPINE INHERITED (test-pinned): the conventional-order / conversion-0 candidate applied
 * through `applyCandidate` is byte-identical (same seed) to the validated spine distribution — the
 * solver layer perturbs no golden. `search.test.ts`'s reduce-to-spine arm asserts it directly.
 *
 * THE LABELED BASELINES (§S3): the conventional-order / conversion-0 candidate is ALWAYS present
 * (the no-change oracle case + the S4 shrinkage prior both require it — this module REFUSES a set
 * without it) and the user's forced-in CURRENT strategy rides as an out-of-grid labeled baseline
 * (a `custom` per-bucket order scored on the SAME draws). The §S0.4 provenance-injective ids keep
 * every arm distinct — the baselines are located by PROVENANCE, never by a lossy `policy:amount`.
 *
 * A/B DISCIPLINE (plan contract #2): SELECTION reads seed-set A; seed-set B (the canonical
 * `deriveSeedB` expansion — never `seedA + 1`) carries every displayed figure + the grade. BOTH
 * seed-sets are evaluated per candidate here; the §S6 profile budgets both plus the m-draw
 * B-family, and never extrapolates one from the other. The ranking (`rankedA`) runs on A ONLY —
 * B is carried for display, never for the crown (crowning on B would re-contaminate the held-out).
 *
 * LEGALITY IS UPSTREAM (§S3): the enumerator's RMD-first sentinels already excluded the
 * over-headroom amounts (they live in `CandidateSet.rejected`, never in the `candidates` array this
 * module receives) — `search.ts` scores exactly the set it is handed and NEVER re-filters. A
 * candidate that is feasible by headroom but hits a typed per-path `SimInfeasible` is folded by
 * `evaluateCandidates` into an `infeasible` outcome and ranked WORST by `rankForGoal` (never a
 * dropped path, never a throw that aborts the batch) — inherited, not re-implemented.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — a deterministic function of its
 * `(base, candidates, seedA, goal, tieTolerance, heirBracket?)` inputs.
 */
import type { SimulationParams } from '@shared/model'
import { deriveSeedB } from '../validation/heldOutSeed'
import { evaluateCandidates, type CandidateOutcome, type OracleGoal } from '../validation/evaluate'
import { rankForGoal } from './objective'
import { solverCandidateId, type CandidateStrategy } from './candidates'

/** One candidate, evaluated on BOTH seed-sets (§S3's A/B discipline made concrete). */
export interface CandidateEvaluation {
  readonly candidate: CandidateStrategy
  /** The §S0.4 provenance-injective id (the arm-distinct label the fingerprint + rankings write). */
  readonly id: string
  /** Seed-set A outcome — the SELECTION side (the curse-biased in-sample read; never rendered). */
  readonly a: CandidateOutcome
  /** Seed-set B outcome — the DISPLAY + grade side (the independent held-out draw). */
  readonly b: CandidateOutcome
}

/** The batch runner's structured output — the field select.ts (S4) shrinks over + the solve entry
 *  (S5) serializes. `rankedA` is the oracled ranking; the baselines are the located labeled arms. */
export interface SolverSearchResult {
  readonly seedA: number
  /** The canonical held-out seed — `deriveSeedB(seedA)`, re-derivable forever (never persisted raw). */
  readonly seedB: number
  readonly goal: OracleGoal
  readonly tieTolerance: number
  /** The first-order heir bracket the leave-more bequest is scored at (undefined for pay-less-tax). */
  readonly heirBracket: number | undefined
  /** Every candidate, both seed-sets, in ENUMERATION order (`evaluations[i] ↔ candidates[i]`). */
  readonly evaluations: readonly CandidateEvaluation[]
  /** The seed-A field ranked best-first — the oracle-validated ranking (rankForGoal ≡ rankCandidates).
   *  A permutation of every A outcome (infeasible candidates included, ranked worst). */
  readonly rankedA: readonly CandidateOutcome[]
  /** The ALWAYS-present conventional-order / conversion-0 baseline (the no-change oracle case + the
   *  S4 shrinkage prior). Located by provenance; a set lacking exactly one is REFUSED. */
  readonly conventionalBaseline: CandidateEvaluation
  /** The user's out-of-grid labeled baseline (the forced-in CURRENT strategy), iff one was enumerated. */
  readonly userBaseline: CandidateEvaluation | undefined
}

export interface SolverSearchInput {
  readonly base: SimulationParams
  /** The enumerator's FEASIBLE output (`CandidateSet.candidates` — the `rejected` over-headroom
   *  amounts are already excluded upstream; this module scores exactly this set and NEVER re-filters). */
  readonly candidates: readonly CandidateStrategy[]
  /** The selection seed. Must be an integer (the bit-identical A/B reproduction contract; a
   *  fractional seed would make `deriveSeedB` and `simulate` refuse downstream anyway). */
  readonly seedA: number
  readonly goal: OracleGoal
  /** The A-side CRN-difference selection tie-tolerance the ranking runs at (the zero-vol oracle
   *  worlds pass an exact 0; a live solve passes the `selectionTieTolerance` read). */
  readonly tieTolerance: number
  /** Required for leave-more (the bequest's IRD discount); omitted for pay-less-tax. */
  readonly heirBracket?: number
  /** Opt in to the survivor-crossing stamp (the K-candidate CRN stability harness requests it).
   *  Observe-only in `simulate` — byte-identical to an opt-out run on every scored field. */
  readonly survivorConditioned?: boolean
}

/**
 * Evaluate every candidate on BOTH seed-sets, rank seed-set A, and locate the labeled baselines.
 * The whole method body is import-and-forward: no scorer, no ranker, no apply, no draw schedule is
 * authored here.
 */
export function runSearch(input: SolverSearchInput): SolverSearchResult {
  const { base, candidates, seedA, goal, tieTolerance, heirBracket, survivorConditioned } = input

  if (candidates.length === 0) {
    throw new Error(
      '[search] the candidate set is EMPTY — the enumerator always emits at least the conventional ' +
        'baseline; an empty set is a caller bug (refuse rather than crown nothing as advice)',
    )
  }
  if (!Number.isInteger(seedA)) {
    throw new Error(
      `[search] seedA must be an integer (got ${seedA}) — the bit-identical A/B reproduction contract ` +
        `(deriveSeedB / simulate both refuse a fractional seed)`,
    )
  }

  // The labeled baselines — located by PROVENANCE (§S0.4 injective ids keep the arms distinct; a
  // lossy policy:amount would collide the conventional grid point with the user's default baseline).
  // Checked BEFORE the expensive 2K-candidate evaluation: a set with no prior can never be crowned,
  // so refuse fast rather than decumulate a whole batch and then discover it (fail-loud, fail-early).
  const conventionalIndices = candidates.flatMap((c, i) => (c.provenance === 'conventional-baseline' ? [i] : []))
  if (conventionalIndices.length !== 1) {
    throw new Error(
      `[search] expected exactly ONE conventional-order / conversion-0 baseline (the no-change oracle ` +
        `case + the S4 shrinkage prior both require it) — got ${conventionalIndices.length}; the ` +
        `enumerator guarantees it in a real solve (refuse rather than crown advice with no prior)`,
    )
  }
  const userIndices = candidates.flatMap((c, i) => (c.provenance === 'user-baseline' ? [i] : []))
  if (userIndices.length > 1) {
    throw new Error(
      `[search] at most ONE user baseline is enumerable (got ${userIndices.length}) — a caller injected ` +
        `two CURRENT strategies; refuse the ambiguous status quo rather than score both as the user's habit`,
    )
  }

  // The held-out seed is the CANONICAL splitmix expansion — never seedA + 1 (heldOutSeed's contract).
  const seedB = deriveSeedB(seedA)

  const evalOpts = {
    ...(heirBracket !== undefined ? { heirBracket } : {}),
    ...(survivorConditioned === true ? { survivorConditioned: true } : {}),
  }

  // BOTH seed-sets, per candidate, through the ONE shared apply-seam + real engine. Using the SAME
  // `evaluateCandidates` the stability + grade harnesses drive is what makes the CRN identity
  // ("identical draws across all K", contract #5) hold by construction — not a second scorer to drift.
  const outcomesA = evaluateCandidates(base, candidates, seedA, evalOpts)
  const outcomesB = evaluateCandidates(base, candidates, seedB, evalOpts)

  const evaluations: readonly CandidateEvaluation[] = candidates.map((candidate, i) => ({
    candidate,
    id: solverCandidateId(candidate),
    a: outcomesA[i]!,
    b: outcomesB[i]!,
  }))

  // The oracled ranking runs on SEED-SET A ONLY (the selection side). rankForGoal is pinned ≡
  // rankCandidates, so this IS the reference ranking — infeasible candidates ranked worst, never dropped.
  const rankedA = rankForGoal(outcomesA, goal, tieTolerance)

  return {
    seedA,
    seedB,
    goal,
    tieTolerance,
    heirBracket,
    evaluations,
    rankedA,
    conventionalBaseline: evaluations[conventionalIndices[0]!]!,
    userBaseline: userIndices.length === 1 ? evaluations[userIndices[0]!]! : undefined,
  }
}
