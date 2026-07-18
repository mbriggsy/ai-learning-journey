/**
 * K-CANDIDATE RANKING STABILITY UNDER CRN (U14 S3 — the plan's contract #5 generalized from
 * Act-3's two arms to the whole candidate set).
 *
 * WHAT IS ACTUALLY AT STAKE: the draw schedule is a pure function of `(seed, paths,
 * maxHorizon, peopleCount)` — so the ONE way a candidate can fork the shared futures is by
 * MOVING A DIMENSION. The apply seam guarantees it cannot (S1); this harness PROVES the
 * guarantee live over the same candidate set U15 will score, on BOTH seed-sets (A selects,
 * B carries the rendered figures + the grade — both must be CRN-correct internally):
 *
 *  1. DIMENSION INVARIANCE — every applied candidate's `(paths, maxHorizonYears,
 *     people.length)` byte-equals the base's. A violation is recorded (never smoothed) and
 *     the report is not mintable.
 *  2. THE PERTURBATION LAW — perturbing ONE candidate's conversion amount and re-running a
 *     SIBLING yields the sibling's byte-identical DECISION SURFACE (Tier-1 survival +
 *     depletion, the gross terminal sample, and every tax-aware Tier-2 vector — the total
 *     alone conserves under a pretax→Roth reallocation, so the ranked statistics are checked
 *     TOO): no shared mutable state, no cross-candidate caching, no draw-consumption coupling
 *     anywhere in the evaluation path (the seam U15's batch runner will inherit; a future
 *     runner with per-batch state goes red HERE). The perturbation itself must be REAL —
 *     the varied candidate's own surface must MOVE (insight 029's presence companion; an
 *     inert perturbation makes "sibling unchanged" a vacuous decoupling proof).
 *  3. PRESENCE (insights 027/029, burned/027) — the CRN claim is about consumption ACROSS
 *     the survivor MFJ→single transition, so ≥1 path must actually enter the survivor
 *     regime, witnessed by the engine's OWN minted state (`survivorConditioned.
 *     survivorPhasePaths` — a stamp the transition writes, never the absence of something).
 *  4. FINITENESS DISCIPLINE (insights 028/007) — a typed `SimInfeasible` candidate is
 *     recorded as infeasible-whole-candidate (ranked worst downstream), never a throw that
 *     aborts the batch; an INDETERMINATE output still throws (enumerator bug — evaluate.ts).
 */
import type { Distribution, SimulationParams } from '@shared/model'
import { evaluateCandidates, type CandidateOutcome } from './evaluate'
import { applyCandidate, type CandidateStrategy } from '../solver/candidates'

/** Byte-compare the FULL decision surface of two distributions: Tier-1 (survival fraction +
 *  per-path depletion), the gross terminal sample, and — when the runs are tax-aware — every
 *  per-path tax-aware vector (lifetime tax, the four bucket terminals the after-tax bequest
 *  reads, basis, and both healthcare accruals). The total-terminal check alone would pass a
 *  pretax→Roth reallocation that conserves the sum while moving the RANKED statistics —
 *  EXPORTED so the S3 battery pins that distinction directly (the mutant-killer). */
export function decisionSurfaceIdentical(a: Distribution, b: Distribution): boolean {
  const vec = (x: readonly number[], y: readonly number[]): boolean =>
    x.length === y.length && x.every((v, i) => v === y[i])
  if (a.survivalFraction !== b.survivalFraction) return false
  if (!vec(a.terminalValuesReal, b.terminalValuesReal)) return false
  if (!vec(a.depletionYears, b.depletionYears)) return false
  const ta = a.taxAware
  const tb = b.taxAware
  if ((ta === undefined) !== (tb === undefined)) return false
  if (ta === undefined || tb === undefined) return true
  return (
    vec(ta.lifetimeTaxPaidReal, tb.lifetimeTaxPaidReal) &&
    vec(ta.terminalTaxableReal, tb.terminalTaxableReal) &&
    vec(ta.terminalPretaxReal, tb.terminalPretaxReal) &&
    vec(ta.terminalRothReal, tb.terminalRothReal) &&
    vec(ta.terminalHsaReal, tb.terminalHsaReal) &&
    vec(ta.terminalTaxableBasisReal, tb.terminalTaxableBasisReal) &&
    vec(ta.lifetimeNetPremiumReal, tb.lifetimeNetPremiumReal) &&
    vec(ta.lifetimeMedicareCostReal, tb.lifetimeMedicareCostReal)
  )
}

declare const STABILITY_REPORT: unique symbol

/** Branded — mintable only by {@link runRankingStability} on a clean pass. */
export interface RankingStabilityReport {
  readonly [STABILITY_REPORT]: true
  readonly ok: true
  readonly candidateCount: number
  readonly seeds: readonly [number, number]
  /** Minimum survivor-phase path count across every scored candidate × both seeds. */
  readonly minSurvivorCrossings: number
  readonly infeasibleCount: number
}

export interface RankingStabilityFailure {
  readonly ok: false
  readonly violations: readonly string[]
}

export function runRankingStability(opts: {
  readonly base: SimulationParams
  readonly candidates: readonly CandidateStrategy[]
  readonly seedA: number
  readonly seedB: number
  /** Index of the conversion candidate the perturbation law perturbs (must carry a plan). */
  readonly perturbIndex: number
  /** Index of the sibling whose byte-identity is asserted after the perturbation. */
  readonly siblingIndex: number
}): { readonly report: RankingStabilityReport } | RankingStabilityFailure {
  const { base, candidates, seedA, seedB, perturbIndex, siblingIndex } = opts
  const violations: string[] = []

  // 1. Dimension invariance — the draw schedule's whole input tuple, per candidate.
  for (const [i, c] of candidates.entries()) {
    const p = applyCandidate(base, c)
    if (p.paths !== base.paths || p.maxHorizonYears !== base.maxHorizonYears || p.people.length !== base.people.length) {
      violations.push(
        `candidate ${i} moved a draw dimension: (${p.paths}, ${p.maxHorizonYears}, ${p.people.length}) vs base ` +
          `(${base.paths}, ${base.maxHorizonYears}, ${base.people.length})`,
      )
    }
  }

  // 2 + 3. Evaluate the full set on BOTH seeds with the survivor-crossing stamp requested.
  const outcomesBySeed: ReadonlyArray<readonly CandidateOutcome[]> = [seedA, seedB].map((seed) =>
    evaluateCandidates(base, candidates, seed, { survivorConditioned: true }),
  )
  let minCrossings = Number.POSITIVE_INFINITY
  let infeasibleCount = 0
  for (const [s, outcomes] of outcomesBySeed.entries()) {
    for (const [i, o] of outcomes.entries()) {
      if (o.kind === 'infeasible') {
        infeasibleCount += 1
        continue
      }
      const crossings = o.distribution.survivorConditioned?.survivorPhasePaths
      if (crossings === undefined || !(crossings > 0)) {
        violations.push(
          `candidate ${i} seed ${s === 0 ? 'A' : 'B'}: no path entered the survivor regime — the CRN claim would be vacuous (burned/027)`,
        )
        continue
      }
      minCrossings = Math.min(minCrossings, crossings)
    }
  }

  // 4. The perturbation law: vary ONE candidate's amount; a sibling must be byte-identical.
  const perturbed = candidates[perturbIndex]
  const sibling = candidates[siblingIndex]
  if (perturbed?.conversion == null || sibling === undefined || perturbIndex === siblingIndex) {
    violations.push('perturbation arm misconfigured: perturbIndex must name a conversion candidate ≠ siblingIndex')
  } else {
    const variant: CandidateStrategy = {
      ...perturbed,
      conversion: { ...perturbed.conversion, annualAmountReal: perturbed.conversion.annualAmountReal + 1_000 },
    }
    const [rerunVariant, rerunSibling] = evaluateCandidates(base, [variant, sibling], seedA, {
      survivorConditioned: true,
    })
    const original = outcomesBySeed[0]![siblingIndex]!
    const rerunS = rerunSibling!
    if (original.kind !== 'scored' || rerunS.kind !== 'scored') {
      violations.push('perturbation arm: the sibling must be a scored candidate on seed A')
    } else if (!decisionSurfaceIdentical(original.distribution, rerunS.distribution)) {
      violations.push(
        'THE PERTURBATION LAW BROKE: perturbing one candidate’s conversion amount changed a SIBLING’s ' +
          'decision surface — shared state or draw-consumption coupling has entered the evaluation path',
      )
    }
    // The presence companion (insight 029): the +1,000 must have MOVED the varied candidate —
    // sibling-identity proves decoupling only when something genuinely changed on the other arm.
    const originalPerturbed = outcomesBySeed[0]![perturbIndex]!
    const rerunV = rerunVariant!
    if (originalPerturbed.kind === 'scored' && rerunV.kind === 'scored') {
      if (decisionSurfaceIdentical(originalPerturbed.distribution, rerunV.distribution)) {
        violations.push(
          'perturbation arm VACUOUS: the +1,000 conversion perturbation left the varied candidate’s own ' +
            'decision surface byte-identical — nothing moved, so sibling-identity proves no decoupling (insight 029)',
        )
      }
    } else if (originalPerturbed.kind === 'infeasible' && rerunV.kind === 'infeasible') {
      violations.push(
        'perturbation arm VACUOUS: the perturbed candidate and its +1,000 variant are BOTH infeasible — ' +
          'no movement is witnessable (insight 029)',
      )
    } // exactly one infeasible ⇒ the perturbation demonstrably moved the outcome — presence held
    if (rerunV.kind === 'infeasible') infeasibleCount += 1
  }

  if (violations.length > 0) return { ok: false, violations }
  const report = {
    ok: true,
    candidateCount: candidates.length,
    seeds: [seedA, seedB],
    minSurvivorCrossings: minCrossings,
    infeasibleCount,
  } as unknown as RankingStabilityReport
  return { report }
}
