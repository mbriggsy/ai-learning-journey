/**
 * `solveEntry.ts` — mint-then-solve (U15 §S5): the WORKER-side orchestration that turns a raw solve
 * request into the recommendation payload, gated by U14's harness-minted oracle-cleared token.
 *
 * WHY THE MINT LIVES HERE, NOT ACROSS THE WIRE. The {@link OracleClearedToken} is BRANDED (a unique
 * symbol) and constructable only by `mintOracleToken` — it cannot survive `structuredClone` across the
 * worker boundary (the brand strips). So the token must be minted AND consumed on the SAME side: this
 * module runs the harness (the optimality oracle over the committed fixtures + K-candidate ranking
 * stability over THIS household), mints, and hands the token straight to `solve()`. `engineProtocol`'s
 * `runSolve` calls this and packs the payload — the main thread never holds a token.
 *
 * THE TREND CLAUSE (§S5 (2), closed by the trend sourcing unit 2026-07-19). The candidate roster
 * carries the conversion grid (ranking stability's perturbation law REQUIRES a conversion candidate
 * to perturb — rankingStability.ts:143), and the run fingerprint covers that whole roster. The
 * token's trend clause is evaluated on the TRUE amounts of the roster `solve()` ranks — the whole
 * roster, conversions included, now that the trend is sourced AND the Part-B pricing consumes it
 * (the clause reads both halves and is CLEAR). The clause stays load-bearing in the blocking
 * direction: a future regression to an unsourced trend or an un-consuming pricing mode re-blocks
 * every conversion-bearing mint right here (the lying-mirror witness pins it), and `solve()`'s
 * partition re-derives the sequencing-only posture from the same clause (insight 092 — withheld
 * levers enumerate, never silently drop).
 *
 * EVERY EXIT IS A NAMED BIN (insight 092): mint-failed (the harness gate itself broke — never ship),
 * token-withheld (a real honesty gate fired — state cert / stale ACA / uncalibrated ε), or `solve()`'s
 * own refused / withheld / recommended. No path silently produces nothing.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — `todayEpochDay` is INJECTED (the ACA
 * freshness clause reads it; the engine reads no clock).
 */
import type { SimulationParams } from '@shared/model'
import type { SolverRunRanking } from '../validation/solverRunFingerprint'
import { runOptimalityOracle } from '../validation/optimalityOracle'
import { runRankingStability } from '../validation/rankingStability'
import { mintOracleToken, type WithheldReason } from '../validation/oracleToken'
import { deriveSeedB } from '../validation/heldOutSeed'
import { SOLVER_CASES } from '../reference/solver-cases'
import type { CandidateStrategy } from './candidates'
import { SOLVER_CODE_VERSION } from './solverCodeVersion'
import { solve, type SolveInput, type SolveResult } from './solve'
import { abortRequested, solveAborted, type ShouldAbort } from './cancel'

/** The oracle-cleared token was WITHHELD by an honesty gate — no recommendation ships (§S6.3). The
 *  reasons name EVERY true cause (state certification pending / stale ACA / uncalibrated ε), never
 *  blaming the law when a primary is merely un-pinned. Structured; U17's re-entry consumes it. */
export interface SolveTokenWithheld {
  readonly kind: 'token-withheld'
  readonly reasons: readonly WithheldReason[]
  /** Methodology-substrate directional levels shipped-disclosed (the grade's shape note — never blocking). */
  readonly disclosedDirectional: readonly string[]
  readonly solverCodeVersion: number
}

/** The HARNESS GATE ITSELF failed — the optimality oracle found a wrong-best, or ranking stability
 *  found a CRN break. The recommender MUST NOT ship (this is a code defect the gate exists to catch),
 *  surfaced as a calm structured failure, never a throw. */
export interface SolveMintFailed {
  readonly kind: 'mint-failed'
  readonly stage: 'oracle' | 'stability' | 'roster'
  readonly detail: string
  readonly solverCodeVersion: number
}

/** The full worker-side solve payload (the wire's value model). */
export type SolvePayload = SolveResult | SolveTokenWithheld | SolveMintFailed

export interface SolveRequest {
  readonly base: SimulationParams
  /** The FULL enumerated roster (sequencing arms + the conversion grid). The conversion grid is
   *  needed for ranking stability's perturbation law; `solve()` ranks only the sequencing subset. */
  readonly candidates: readonly CandidateStrategy[]
  readonly seedA: number
  readonly ranking: SolverRunRanking
  /** The A-side CRN-difference survival top-set selection tie-tolerance the ranking runs at (0 on a
   *  zero-vol world; a live solve supplies `heldOutSeed.selectionTieTolerance` over the survival
   *  indicators of the equivalence-gating pair — computed by the caller/builder). */
  readonly tieTolerance: number
  /** Injected today (epoch-day) — the ACA freshness clause reads it; the engine reads no clock. */
  readonly todayEpochDay: number
  /** TEST-SEAM ONLY: overrides the grade's live 16,000-path B-floor (threaded to `solve`). */
  readonly _gradeMinPaths?: number
}

const mintFailed = (stage: SolveMintFailed['stage'], detail: string): SolveMintFailed => ({
  kind: 'mint-failed',
  stage,
  detail,
  solverCodeVersion: SOLVER_CODE_VERSION,
})

/** Locate the perturbation pair ranking stability requires: a conversion candidate (perturbed) and a
 *  distinct feasible sibling (the conventional baseline). `null` when the roster carries no conversion
 *  candidate — U14 ranking stability cannot prove CRN decoupling without one (a documented limitation:
 *  a household with no anchored conversion grid cannot be validated by the current harness). */
export function perturbationPair(
  candidates: readonly CandidateStrategy[],
): { readonly perturbIndex: number; readonly siblingIndex: number } | null {
  const perturbIndex = candidates.findIndex((c) => c.conversion !== null)
  if (perturbIndex < 0) return null
  // The sibling: the conventional baseline (always feasible + conversion-free), else any other index.
  let siblingIndex = candidates.findIndex((c) => c.provenance === 'conventional-baseline')
  if (siblingIndex < 0 || siblingIndex === perturbIndex) {
    siblingIndex = candidates.findIndex((_, i) => i !== perturbIndex)
  }
  if (siblingIndex < 0 || siblingIndex === perturbIndex) return null
  return { perturbIndex, siblingIndex }
}

/**
 * Mint the oracle-cleared token for this household + roster, then solve. Never throws for a defined
 * outcome — every gate failure is a named bin.
 *
 * `shouldAbort` is the OPTIONAL injected cooperative-abort seam (§S6, `cancel.ts`): checked at the
 * coarse stage boundaries bracketing the two dominant cost centers — before the harness gates (the
 * oracle + the 2K-candidate ranking stability) and again before `solve()`'s search + grade — returning
 * a NAMED `aborted` bin. The worker shell injects it (closed over a worker-side latest-solve-epoch, the
 * date-lane `setLatestEpoch` analog); the engine reads no clock. That live transport + finer
 * granularity WAIT on the profile's numbers (§S6) — U15 ships the seam + these coarse checkpoints.
 */
export function solveWithMint(request: SolveRequest, shouldAbort?: ShouldAbort): SolvePayload {
  const { base, candidates, seedA, ranking, tieTolerance, todayEpochDay } = request

  // COOPERATIVE ABORT (§S6) — before ANY compute: a solve superseded before it even started bails here.
  if (abortRequested(shouldAbort)) {
    return solveAborted('solve aborted before the harness gates (a newer dispatch superseded it)')
  }

  // (a) The optimality oracle over the committed fixtures (household-independent; the known-best gate).
  const oracleOut = runOptimalityOracle(SOLVER_CASES)
  if ('failures' in oracleOut) {
    return mintFailed(
      'oracle',
      `the optimality oracle found a wrong-best on the committed roster (${oracleOut.failures
        .map((f) => f.fixtureId)
        .join(', ')}) — the recommender must not ship`,
    )
  }

  // (b) K-candidate ranking stability over THIS household's roster (the CRN-decoupling gate). It
  // REQUIRES a conversion candidate to perturb — the roster's conversion grid supplies it.
  const pair = perturbationPair(candidates)
  if (pair === null) {
    return mintFailed(
      'roster',
      'the candidate roster carries no conversion candidate — U14 ranking stability cannot prove CRN ' +
        'decoupling without one (a household with no anchored conversion grid is not validatable by the current harness)',
    )
  }
  const seedB = deriveSeedB(seedA)
  const stabilityOut = runRankingStability({
    base,
    candidates,
    seedA,
    seedB,
    perturbIndex: pair.perturbIndex,
    siblingIndex: pair.siblingIndex,
    ranking,
    // The run pair (seedA already above, tieTolerance here) rides the report's fingerprint (§S0.2 v2),
    // so the token's identity binds the tolerance solve() re-checks against — never a stale bless.
    tieTolerance,
  })
  if (!('report' in stabilityOut)) {
    return mintFailed('stability', `ranking stability found a CRN break: ${stabilityOut.violations.join(' | ')}`)
  }

  // COOPERATIVE ABORT (§S6) — the harness gates (the 2K-candidate ranking stability) just finished;
  // bail before the mint + `solve()`'s search + grade if a newer dispatch superseded this one.
  if (abortRequested(shouldAbort)) {
    return solveAborted('solve aborted after the harness gates, before the mint (a newer dispatch superseded it)')
  }

  // (c) The mint. The trend clause is evaluated on the TRUE amounts of the roster `solve()` will
  // rank — post-trend-sourcing that is the WHOLE roster, conversions included (the clause is clear:
  // sourced constant + consuming pricing). Passing the real amounts keeps the clause honest in both
  // directions: if the trend ever regresses to unsourced, the conversion-bearing set is blocked at
  // the mint again, never silently ranked (the lying-mirror witness drives exactly that arm).
  const rankedConversionAmounts = candidates.map((c) =>
    c.conversion === null ? undefined : c.conversion.annualAmountReal,
  )
  const mint = mintOracleToken({
    params: base,
    candidateConversionAmounts: rankedConversionAmounts,
    todayEpochDay,
    oracleReport: oracleOut.report,
    stabilityReport: stabilityOut.report,
  })
  if ('withheld' in mint) {
    return {
      kind: 'token-withheld',
      reasons: mint.withheld,
      disclosedDirectional: mint.disclosedDirectional,
      solverCodeVersion: SOLVER_CODE_VERSION,
    }
  }

  // (d) Solve — the fingerprint re-check inside `solve()` binds the token to THIS exact run. The abort
  // seam threads through so `solve()`'s own pre-search / pre-grade checkpoints fire too (§S6).
  const input: SolveInput = {
    base,
    candidates,
    seedA,
    ranking,
    tieTolerance,
    ...(request._gradeMinPaths !== undefined ? { _gradeMinPaths: request._gradeMinPaths } : {}),
  }
  return solve(mint.token, input, shouldAbort)
}
