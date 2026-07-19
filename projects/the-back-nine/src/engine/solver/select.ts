/**
 * `select.ts` — the SOLVER's deterministic shrinkage + selection (U15 §S4).
 *
 * THE ONE NEW SELECTION SURFACE. `search.ts` produced the seed-A reference ranking (`rankedA` ≡
 * `rankCandidates`, the U14-oracled order). But argmax over K candidates on one seed overfits THAT
 * seed's noise (the optimizer's curse), so a raw `rankedA[0]` crown can be a luck pick. This module
 * refines the crown with a DETERMINISTIC shrinkage of each candidate's seed-A **advantage over the
 * conventional prior** toward zero — an advantage that SURVIVES the shrinkage DISPLACES the
 * conventional pick; a near-tie COLLAPSES back onto the prior (the plan's no-change state, R25); a
 * known-DOMINANT advantage survives unchanged. The shrinkage is keyed to the ALREADY-BUILT
 * CRN-difference SE (`selectionTieTolerance`, heldOutSeed.ts) — NO second constant, NO new
 * calibration surface: the surviving-advantage gate is exactly "does the candidate's mean CRN-paired
 * improvement over the prior exceed z · SE of that paired difference?".
 *
 * THE PRIOR IS THE CONVENTIONAL TAXABLE-FIRST ORDERING, NEVER THE USER'S CUSTOM (shrinking toward the
 * user's own habit would launder the status quo into advice — §S4). A-SIDE ONLY: the advantage AND
 * its CRN-difference SE are both read from seed-set A (the selection side); seed-set B carries the
 * surplus-regime agreement check and (downstream, S5) every displayed figure + the grade — never the
 * crown (crowning on B would re-contaminate the held-out).
 *
 * THE ZERO-SHRINKAGE IDENTITY (the council's promoted amendment — shrink-then-argmax is a NEW
 * unoracled selection surface, so it must collapse PROVABLY onto the oracled one): with the shrinkage
 * term forced to zero the shrunk score IS the raw `tier2`, so `selectCore`'s lexicographic is
 * byte-identical to `rankCandidates`. `select.test.ts` pins `selectCore({shrinkage:'off'})`'s winner
 * AND full order ≡ `rankCandidates(...)` on EVERY committed oracle fixture (the surface is a genuine
 * refinement, never a re-implementation that could drift). On a zero-vol oracle world the CRN
 * difference SE is 0 anyway, so shrinkage-on and -off coincide there — the collapse only BITES on a
 * dispersed world (the insight-025 calibration case drives that with an explicit near-tie).
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — a deterministic function of its
 * inputs. `select.ts` reads no seed itself; it consumes the outcomes `search.ts` already produced.
 */
import { BANDS, quantizeSurvival } from '@engine/confidence'
import { selectionTieTolerance } from '../validation/heldOutSeed'
import { demotionAxisCalibrated } from '../validation/gradeCalibration'
import {
  afterTaxBequestPerPath,
  candidateTieBreak,
  tier2,
  type CandidateOutcome,
  type OracleGoal,
} from '../validation/evaluate'
import { solverCandidateId, type CandidateStrategy } from './candidates'
import type { SolverSearchResult } from './search'

// ---- (1) the shrinkage primitive (a pure exported seam — insight 048) -----------------------------

/**
 * The surviving (post-shrinkage) advantage of a candidate over the conventional prior, in the goal's
 * `tier2` orientation where a POSITIVE advantage means "better than the prior". A POSITIVE-PART
 * soft-threshold toward zero, keyed to the CRN-difference `tolerance` (z · SE of the paired
 * difference):
 *
 *  - a positive advantage STRICTLY beyond the tolerance SURVIVES, reduced by the tolerance
 *    (`advantage − tolerance`) — a real signal, shrunk but still a displacer;
 *  - a positive advantage WITHIN the tolerance COLLAPSES to 0 (a near-tie inside the CRN noise
 *    band → the prior is retained; the no-change default);
 *  - a non-positive advantage passes through UNCHANGED — a candidate no better than the prior never
 *    displaces it (it ranks by its own worse score, below the prior; nothing to shrink).
 *
 * At `tolerance === 0` this is the IDENTITY on the advantage for every sign — the zero-shrinkage
 * collapse onto the reference ranking. Finiteness-guarded FIRST (insight 010 — a NaN advantage would
 * make every downstream compare arbitrary).
 */
export function survivingAdvantage(advantage: number, tolerance: number): number {
  if (!Number.isFinite(advantage)) {
    throw new Error(`[select] survivingAdvantage: advantage must be finite (got ${advantage}) — insight 010`)
  }
  if (!(Number.isFinite(tolerance) && tolerance >= 0)) {
    throw new Error(`[select] survivingAdvantage: tolerance must be finite ≥ 0 (got ${tolerance}) — insight 010`)
  }
  if (advantage <= tolerance) {
    // A near-tie POSITIVE advantage collapses to 0 (default to the prior); a non-positive advantage
    // passes through unchanged (it never displaces — it ranks by its own worse score). At tolerance 0
    // the positive branch returns 0 only for advantage 0 (which already equals the advantage), so the
    // whole function is the identity there.
    return advantage > 0 ? 0 : advantage
  }
  return advantage - tolerance
}

// ---- the selection result shapes ------------------------------------------------------------------

/** The winner + retained runner-up + the structured flags, byte-reproducible from the search result
 *  (which is itself byte-reproducible from `(model, seedA, seedB, goal)`). Indices are ENUMERATION
 *  indices into `search.evaluations` / the outcome arrays, so S5 serializes the right B distributions. */
export interface SelectionSelected {
  readonly kind: 'selected'
  /** Enumeration index of the crowned winner (into `outcomesA` / `search.evaluations`). */
  readonly winnerIndex: number
  readonly winnerId: string
  /** The retained runner-up (R23) — the second candidate in the shrunk order; `undefined` only for a
   *  one-candidate set (never in a live solve, which always carries ≥ the conventional prior + a grid arm). */
  readonly runnerUpIndex: number | undefined
  readonly runnerUpId: string | undefined
  /** The full shrunk order best-first, as enumeration indices (a permutation of every candidate;
   *  infeasible candidates ranked worst, never dropped — the R21 comparative field). */
  readonly rankedIndices: readonly number[]
  readonly rankedIds: readonly string[]
  /** The winner IS the conventional prior — the no-change routing signal (plan R25): no candidate's
   *  advantage survived the shrinkage, so the recommendation is "you're already on the best path we
   *  found", never a fabricated active move. A structured flag, no copy (Q6). `false` when no prior
   *  was present (an oracle-fixture subset without the conventional baseline). */
  readonly noChange: boolean
  /** The 10/10→surplus pivot signal (§S4.4): the winner is over-funded on seed-set A AND seed-set B
   *  (raw pre-clamp survival, quantize-then-compare ≥ the over-funded band). Trips ONLY on A/B
   *  AGREEMENT — never on an A-side survival-edge pick, never a false "safe either way". Structured
   *  flag; U16 owns the copy pivot. */
  readonly surplusRegime: boolean
}

/** The refusal shape (§S4.5): a fail-closed structured withheld state the solve path routes the
 *  demotion-axis refusal into — never an uncaught worker throw. UNREACHABLE in a live sequencing-only
 *  solve (conversions stay trend-blocked), but planted-seam-tested. */
export interface SelectionWithheld {
  readonly kind: 'withheld'
  readonly reason: 'demotion-axis-uncalibrated'
  readonly detail: string
  readonly winnerId: string
  readonly runnerUpId: string | undefined
  readonly surplusRegime: boolean
}

export type SelectionResult = SelectionSelected | SelectionWithheld

export interface SelectCoreInput {
  /** The seed-A outcomes (the SELECTION side), in enumeration order. */
  readonly outcomesA: readonly CandidateOutcome[]
  /** The seed-B outcomes (the DISPLAY side), enumeration-aligned with `outcomesA` — read ONLY for the
   *  surplus-regime A/B agreement, never for the crown. Omitted ⇒ the surplus flag stays fail-closed
   *  false (an over-funded pivot needs both draws to agree). */
  readonly outcomesB?: readonly CandidateOutcome[]
  readonly goal: OracleGoal
  /** The A-side survival tie tolerance the top-set equivalence uses (identical to `rankCandidates`). */
  readonly tieTolerance: number
  /** Required for leave-more (the bequest's IRD discount); omitted for pay-less-tax. */
  readonly heirBracket?: number
  /** Enumeration index of the conventional prior (the shrinkage anchor). `undefined` ⇒ no prior in
   *  the set (a fixture subset) ⇒ no shrinkage (the raw reference ranking; the identity still holds). */
  readonly conventionalIndex?: number
  /** `'off'` forces the shrinkage term to zero (the identity mode). Default `'on'`. */
  readonly shrinkage?: 'on' | 'off'
}

// ---- the pure selection core ----------------------------------------------------------------------

type ScoredOutcome = Extract<CandidateOutcome, { kind: 'scored' }>

/** The goal's per-path A-side statistic vector — the CRN-paired raw material of the shrinkage SE
 *  (`selectionTieTolerance`). `undefined` when the run has no bequest/tax lens for the goal (no
 *  shrinkage possible → the candidate is not shrunk). Reuses the SINGLE-SOURCED §1014/IRD form. */
function goalPerPathA(outcome: CandidateOutcome, goal: OracleGoal, heirBracket: number | undefined): readonly number[] | undefined {
  if (outcome.kind !== 'scored') return undefined
  if (goal === 'pay-less-tax') return outcome.distribution.taxAware?.lifetimeTaxPaidReal
  if (heirBracket === undefined) return undefined
  return afterTaxBequestPerPath(outcome.distribution, heirBracket)
}

/** Raw pre-clamp Tier-1 over-funded read (§S4.4): the QUANTIZED survival (the cross-engine grid the
 *  headline decides on — NOT the display `xOfTenClamp`, which caps at 9 and could never see the
 *  ceiling) at-or-above the over-funded band. Consumes `confidence.ts`'s own quantize + band — no
 *  re-typed threshold. */
function isOverFunded(survival: number): boolean {
  return quantizeSurvival(survival) >= BANDS.overFunded
}

interface RankRecord {
  readonly index: number
  readonly candidate: CandidateStrategy
  readonly survival: number
  readonly shrunkTier2: number
  readonly isConventional: boolean
}

/**
 * The pure selection over shrunk scores (§S4 (2)/(3)). Quantized lexicographic — the survival-top set
 * on the raw CRN survival tolerance (identical to `rankCandidates`), then the SHRUNK `tier2` ascending
 * (a near-tie candidate's advantage over the prior collapses onto the prior's score), then a
 * CONVENTIONAL-INCUMBENT tie-break (a top collapse-tie DEFAULTS to the conventional prior — the
 * incumbent wins even against a lower-`candidateTieBreak` policy like `proportional`, so the no-change
 * default is robust), then `candidateTieBreak`. Infeasible candidates rank WORST (never dropped).
 */
export function selectCore(input: SelectCoreInput): SelectionResult {
  const { outcomesA, outcomesB, goal, tieTolerance, heirBracket, conventionalIndex, shrinkage } = input
  if (!(Number.isFinite(tieTolerance) && tieTolerance >= 0)) {
    throw new Error(`[select] tieTolerance must be finite ≥ 0 (got ${tieTolerance}) — a NaN admits everything (insight 010)`)
  }
  if (outcomesA.length === 0) {
    throw new Error('[select] the outcome set is EMPTY — a caller bug (refuse rather than crown nothing as advice)')
  }
  if (outcomesB !== undefined && outcomesB.length !== outcomesA.length) {
    throw new Error('[select] outcomesB must be enumeration-aligned with outcomesA (same length) — the A/B surplus read')
  }

  // The shrinkage anchor: the conventional prior's tier2 + its per-path A vector. Shrinkage engages
  // only when the prior is present AND scored AND the goal lens exists (else the ranking is the raw
  // reference order — the identity still holds). `shrinkage: 'off'` forces the tolerance to 0.
  const convOutcome = conventionalIndex !== undefined ? outcomesA[conventionalIndex] : undefined
  const convScored: ScoredOutcome | undefined = convOutcome?.kind === 'scored' ? convOutcome : undefined
  const goalVecConv = convScored !== undefined ? goalPerPathA(convScored, goal, heirBracket) : undefined
  const tier2Conv = convScored !== undefined ? tier2(convScored.score, goal) : undefined
  const shrinkEngaged =
    shrinkage !== 'off' && convScored !== undefined && goalVecConv !== undefined && tier2Conv !== undefined

  const scored: RankRecord[] = []
  const infeasible: Array<{ readonly index: number; readonly candidate: CandidateStrategy }> = []
  outcomesA.forEach((outcome, index) => {
    if (outcome.kind !== 'scored') {
      infeasible.push({ index, candidate: outcome.candidate })
      return
    }
    const t2 = tier2(outcome.score, goal)
    let shrunkTier2 = t2
    if (shrinkEngaged) {
      const advantage = tier2Conv! - t2 // > 0 ⇒ this candidate is better than the prior on the goal
      const goalVec = goalPerPathA(outcome, goal, heirBracket)
      // The CRN-difference SE keyed tolerance — z · SE of the paired (candidate − prior) per-path
      // difference on seed-set A. A vector that cannot pair (missing / mismatched length / n < 2) is
      // not shrunk (tolerance 0 ⇒ the raw advantage passes through — fail-safe toward the oracle order).
      const tolerance =
        goalVec !== undefined && goalVec.length === goalVecConv!.length && goalVec.length >= 2
          ? selectionTieTolerance(goalVec, goalVecConv!)
          : 0
      shrunkTier2 = tier2Conv! - survivingAdvantage(advantage, tolerance)
    }
    scored.push({
      index,
      candidate: outcome.candidate,
      survival: outcome.score.survival,
      shrunkTier2,
      isConventional: index === conventionalIndex,
    })
  })

  const best = scored.reduce((m, r) => Math.max(m, r.survival), 0)
  const rankedScored = [...scored].sort((x, y) => {
    const xTop = best - x.survival <= tieTolerance
    const yTop = best - y.survival <= tieTolerance
    if (xTop !== yTop) return xTop ? -1 : 1
    if (xTop && yTop) {
      if (x.shrunkTier2 !== y.shrunkTier2) return x.shrunkTier2 - y.shrunkTier2
      // A top collapse-tie DEFAULTS to the conventional prior (the incumbent wins even against a
      // lower-candidateTieBreak policy — the no-change default is not left to policy-enum luck).
      if (x.isConventional !== y.isConventional) return x.isConventional ? -1 : 1
      return candidateTieBreak(x.candidate, y.candidate)
    }
    if (x.survival !== y.survival) return y.survival - x.survival
    if (x.shrunkTier2 !== y.shrunkTier2) return x.shrunkTier2 - y.shrunkTier2
    return candidateTieBreak(x.candidate, y.candidate)
  })
  const rankedInfeasible = [...infeasible].sort((a, b) => candidateTieBreak(a.candidate, b.candidate))

  const rankedRecords = [...rankedScored, ...rankedInfeasible]
  const rankedIndices = rankedRecords.map((r) => r.index)
  const rankedIds = rankedRecords.map((r) => solverCandidateId(r.candidate))
  const winner = rankedRecords[0]
  if (winner === undefined) {
    // outcomesA.length > 0 guaranteed above, so this is unreachable — but never crown `undefined`.
    throw new Error('[select] no candidate to crown — unreachable given a non-empty outcome set (insight 010)')
  }
  const runnerUp = rankedRecords[1]
  const winnerId = solverCandidateId(winner.candidate)
  const runnerUpId = runnerUp !== undefined ? solverCandidateId(runnerUp.candidate) : undefined

  // §S4.4 the surplus-regime flag — the winner over-funded on BOTH seed-sets (A and B agree within
  // the over-funded ε). Fail-closed: an absent/infeasible B outcome, or disagreement in either
  // direction, keeps it OFF (no false "safe either way", no pivot on an A-side survival-edge pick).
  const winnerA = outcomesA[winner.index]
  const winnerB = outcomesB?.[winner.index]
  const overA = winnerA?.kind === 'scored' && isOverFunded(winnerA.score.survival)
  const overB = winnerB?.kind === 'scored' && isOverFunded(winnerB.score.survival)
  const surplusRegime = overA && overB

  // §S4.5 the demotion-margin refusal → a structured withheld state (never an uncaught throw). In the
  // surplus regime the grade rides the goal's DOLLAR axis; the pay-less-tax conversion-near-tie margin
  // is a scale-free SE-multiple calibrated ONLY on a Medicare-bearing post-trend-flip world, so it
  // CANNOT be calibrated in U15 (the trend constant is unsourced — insight 091). A conversion winner
  // over a non-conversion runner-up on that axis would trip `gradeCalibration`'s fail-closed throw;
  // we route it here instead. UNREACHABLE live (conversions stay trend-blocked), planted-seam-tested.
  if (
    surplusRegime &&
    goal === 'pay-less-tax' &&
    !demotionAxisCalibrated('pay-less-tax', winner.candidate.conversion !== null, runnerUp?.candidate.conversion != null)
  ) {
    return {
      kind: 'withheld',
      reason: 'demotion-axis-uncalibrated',
      detail:
        'the pay-less-tax dollar-axis conversion-near-tie demotion margin is uncalibrated in U15 ' +
        '(calibrated only on a Medicare-bearing post-trend-flip world — insight 091); the conversion ' +
        'recommendation is withheld rather than graded on an uncalibrated axis',
      winnerId,
      runnerUpId,
      surplusRegime,
    }
  }

  return {
    kind: 'selected',
    winnerIndex: winner.index,
    winnerId,
    runnerUpIndex: runnerUp?.index,
    runnerUpId,
    rankedIndices,
    rankedIds,
    noChange: conventionalIndex !== undefined && winner.index === conventionalIndex,
    surplusRegime,
  }
}

// ---- the live entry (S5 consumes this) ------------------------------------------------------------

/**
 * Select the recommendation from a `search.ts` result (§S4 (3)) — the live selection seam S5 calls.
 * The winner + the retained runner-up (R23) are byte-reproducible from `(model, seedA, seedB, goal)`
 * because `runSearch` is deterministic and `selectCore` is pure. Shrinks toward the search's
 * `conventionalBaseline` (located by provenance — NEVER the user's custom baseline).
 */
export function selectRecommendation(search: SolverSearchResult, opts?: { readonly shrinkage?: 'on' | 'off' }): SelectionResult {
  const outcomesA = search.evaluations.map((e) => e.a)
  const outcomesB = search.evaluations.map((e) => e.b)
  const conventionalIndex = search.evaluations.findIndex((e) => e.candidate.provenance === 'conventional-baseline')
  return selectCore({
    outcomesA,
    outcomesB,
    goal: search.goal,
    tieTolerance: search.tieTolerance,
    ...(search.heirBracket !== undefined ? { heirBracket: search.heirBracket } : {}),
    ...(conventionalIndex >= 0 ? { conventionalIndex } : {}),
    ...(opts?.shrinkage !== undefined ? { shrinkage: opts.shrinkage } : {}),
  })
}
