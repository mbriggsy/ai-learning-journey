/**
 * The harness's candidate evaluation + REFERENCE ranking (U14 — consumed by the optimality
 * oracle (S2), ranking stability (S3), grade calibration (S4), and the held-out defense (S5)).
 *
 * THE SEAM CONTRACT (named loudly for U15's council): this module is the validation harness's
 * OWN implementation of the lexicographic objective (plan contract #4 — objective ≡ headline
 * metric): Tier 1 = the survival fraction; Tier 2 = the goal's concrete distributional
 * statistic (pay-less-tax = mean lifetime tax; leave-more = mean AFTER-TAX-to-heirs bequest,
 * first-order §1014/IRD at a CALLER-declared heir bracket). U15's `objective.ts`/`select.ts`
 * must either CONSUME these functions or be validated against these exact fixtures — two
 * implementations that drift is the oracle validating nothing, and U15's pre-build council
 * owns that wiring decision. Until then, THIS is the ranking the oracle's known-best cases
 * gate.
 *
 * Candidate evaluation runs each candidate through `applyCandidate` (the shared apply seam)
 * + the REAL `simulate` on ONE seed — CRN by construction (the draw schedule is a pure
 * function of dimensions the apply seam provably never moves). A typed `SimInfeasible` makes
 * the CANDIDATE infeasible as a whole — ranked WORST, never a dropped path (the dropped class
 * would be exactly the aggressive near-cliff candidates) and never a throw (which would abort
 * the batch) — M6/architecture §7.5. A `SimIndeterminate` is DIFFERENT: the base params
 * passed validation, so a candidate flipping them invalid is an enumerator/harness BUG — it
 * throws (fail loud), never a quiet skip.
 */
import { simulate, type SimOutput } from '@engine/simulate'
import type { Distribution, SimulationParams } from '@shared/model'
import { DRAWDOWN_POLICIES } from '@shared/model'
import { applyCandidate, type CandidateStrategy } from '../solver/candidates'

/** The Tier-2 goal axis (the live-bigger goal joins with U15's go-go machinery — the oracle's
 *  five cases exercise tax + bequest + no-change). */
export type OracleGoal = 'pay-less-tax' | 'leave-more'

export interface CandidateScore {
  /** Tier-1: the raw survival fraction (quantization happens at DECISION surfaces, not here). */
  readonly survival: number
  /** Pay-less-tax: mean lifetime tax paid (real $) across paths. `undefined` when the run
   *  carried no tax overlay — a tax-goal compare against it fails loud downstream. */
  readonly lifetimeTaxMeanReal: number | undefined
  /** The GROSS estate (mean terminal real $) — deliberately exposed so the case-(iv) guard
   *  can prove a gross-argmax crowns the WRONG winner (contract #7's inversion witness). */
  readonly terminalGrossMeanReal: number
  /** Leave-more: mean after-tax-to-heirs bequest at the declared heir bracket — taxable at
   *  market value (§1014 step-up), pre-tax and HSA × (1 − heirBracket) (IRD / taxable
   *  inheritance, first-order), Roth tax-free. `undefined` without taxAware or a bracket. */
  readonly afterTaxBequestMeanReal: number | undefined
}

export type CandidateOutcome =
  | {
      readonly kind: 'scored'
      readonly candidate: CandidateStrategy
      readonly score: CandidateScore
      readonly distribution: Distribution
    }
  | {
      readonly kind: 'infeasible'
      readonly candidate: CandidateStrategy
      readonly reason: string
      readonly pathIndex: number
    }

const mean = (xs: readonly number[]): number => {
  if (xs.length === 0) throw new Error('[evaluate] mean of an empty array (insight 010 — refuse, never NaN)')
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

/** Score one resolved distribution (pure — the oracle's re-derivation arms drive it directly). */
export function scoreFromDistribution(dist: Distribution, heirBracket?: number): CandidateScore {
  if (heirBracket !== undefined && !(Number.isFinite(heirBracket) && heirBracket >= 0 && heirBracket < 1)) {
    throw new Error(`[evaluate] heirBracket must be finite in [0, 1) (got ${heirBracket}) — insight 010`)
  }
  const ta = dist.taxAware
  const afterTax =
    ta !== undefined && heirBracket !== undefined
      ? mean(
          ta.terminalTaxableReal.map(
            (taxable, p) =>
              taxable + // §1014: stepped up at death — heirs owe nothing on the gain
              (ta.terminalPretaxReal[p] ?? 0) * (1 - heirBracket) + // IRD at the declared bracket
              (ta.terminalRothReal[p] ?? 0) + // tax-free
              (ta.terminalHsaReal[p] ?? 0) * (1 - heirBracket), // taxable to a non-spouse heir (first-order)
          ),
        )
      : undefined
  return {
    survival: dist.survivalFraction,
    lifetimeTaxMeanReal: ta !== undefined ? mean(ta.lifetimeTaxPaidReal) : undefined,
    terminalGrossMeanReal: mean(dist.terminalValuesReal),
    afterTaxBequestMeanReal: afterTax,
  }
}

/** Fold one engine output into a candidate outcome (pure — the synthetic-infeasible and
 *  indeterminate-throw arms drive THIS seam; the evaluation loop binds it to real runs). */
export function collectCandidateOutcome(
  candidate: CandidateStrategy,
  out: SimOutput,
  heirBracket?: number,
): CandidateOutcome {
  if (out.indeterminate) {
    throw new Error(
      `[evaluate] candidate {${candidate.policy}, ${candidate.conversion?.annualAmountReal ?? 0}} produced ` +
        `INDETERMINATE params (${out.reason}) — the base passed validation, so this is an enumerator/harness bug, ` +
        `never a quiet skip`,
    )
  }
  if (out.infeasible) {
    return { kind: 'infeasible', candidate, reason: out.reason, pathIndex: out.pathIndex }
  }
  return { kind: 'scored', candidate, score: scoreFromDistribution(out.distribution, heirBracket), distribution: out.distribution }
}

/** Evaluate every candidate on ONE seed through the shared apply seam + the real engine. */
export function evaluateCandidates(
  base: SimulationParams,
  candidates: readonly CandidateStrategy[],
  seed: number,
  opts?: { readonly heirBracket?: number; readonly survivorConditioned?: boolean },
): readonly CandidateOutcome[] {
  return candidates.map((candidate) =>
    collectCandidateOutcome(
      candidate,
      simulate(applyCandidate(base, candidate), seed, {
        ...(opts?.survivorConditioned === true ? { survivorConditioned: true } : {}),
      }),
      opts?.heirBracket,
    ),
  )
}

// ---- The reference lexicographic ranking ----------------------------------------------------

/** Deterministic tie-break (plan contract #3): policy enum order, then conversion amount
 *  ascending (the conversion-0 arm first), then window years. Pure candidate-shape order —
 *  no seeded coin is needed anywhere in the harness. */
export function candidateTieBreak(a: CandidateStrategy, b: CandidateStrategy): number {
  const pa = DRAWDOWN_POLICIES.indexOf(a.policy)
  const pb = DRAWDOWN_POLICIES.indexOf(b.policy)
  if (pa !== pb) return pa - pb
  const aa = a.conversion?.annualAmountReal ?? 0
  const ab = b.conversion?.annualAmountReal ?? 0
  if (aa !== ab) return aa - ab
  return (a.conversion?.years ?? 0) - (b.conversion?.years ?? 0)
}

/** The goal's Tier-2 read on a score — smaller-is-better normalized (tax ascending; bequest
 *  DESCENDING, so it negates). An undefined statistic under an active goal fails LOUD. */
function tier2(score: CandidateScore, goal: OracleGoal): number {
  if (goal === 'pay-less-tax') {
    if (score.lifetimeTaxMeanReal === undefined) {
      throw new Error('[evaluate] pay-less-tax ranking requires taxAware runs (burned/062 — no silent default)')
    }
    return score.lifetimeTaxMeanReal
  }
  if (score.afterTaxBequestMeanReal === undefined) {
    throw new Error('[evaluate] leave-more ranking requires taxAware runs + a declared heirBracket (burned/062)')
  }
  return -score.afterTaxBequestMeanReal
}

/**
 * The REFERENCE ranking (plan contract #4): survival-equivalence is decided against the BEST
 * candidate's survival (within `tieTolerance` of the top — the CRN-difference-keyed tolerance
 * the caller supplies; the zero-vol oracle worlds pass an exact 0); WITHIN the top set the
 * goal statistic ranks; outside it, survival descending then the goal; typed-infeasible
 * candidates rank WORST as whole candidates. Ties break deterministically.
 */
export function rankCandidates(
  outcomes: readonly CandidateOutcome[],
  goal: OracleGoal,
  tieTolerance: number,
): readonly CandidateOutcome[] {
  if (!(Number.isFinite(tieTolerance) && tieTolerance >= 0)) {
    throw new Error(`[evaluate] tieTolerance must be finite ≥ 0 (got ${tieTolerance}) — a NaN admits everything (insight 010)`)
  }
  const scored = outcomes.filter((o): o is Extract<CandidateOutcome, { kind: 'scored' }> => o.kind === 'scored')
  const infeasible = outcomes.filter((o) => o.kind === 'infeasible')
  const best = scored.reduce((m, o) => Math.max(m, o.score.survival), 0)
  const ranked = [...scored].sort((x, y) => {
    const xTop = best - x.score.survival <= tieTolerance
    const yTop = best - y.score.survival <= tieTolerance
    if (xTop !== yTop) return xTop ? -1 : 1
    if (xTop && yTop) {
      const t = tier2(x.score, goal) - tier2(y.score, goal)
      if (t !== 0) return t
      return candidateTieBreak(x.candidate, y.candidate)
    }
    if (x.score.survival !== y.score.survival) return y.score.survival - x.score.survival
    const t = tier2(x.score, goal) - tier2(y.score, goal)
    if (t !== 0) return t
    return candidateTieBreak(x.candidate, y.candidate)
  })
  const rankedInfeasible = [...infeasible].sort((x, y) => candidateTieBreak(x.candidate, y.candidate))
  return [...ranked, ...rankedInfeasible]
}
