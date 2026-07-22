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
import type { Distribution, RecommendationGoal, SimulationParams } from '@shared/model'
import { DRAWDOWN_POLICIES } from '@shared/model'
import { applyCandidate, type CandidateStrategy } from '../solver/candidates'
import { afterTaxBequestPerPath } from '../solver/objectiveHeadline'

// The §1014/IRD per-path bequest formula is RE-HOMED to the simulate-free `objectiveHeadline.ts`
// (U16 §Q6 — so the render-path objective≡headline guard can recompute it without dragging `simulate`
// into the entry bundle) and RE-EXPORTED verbatim here: every existing importer (`objective.ts`,
// `gradeCalibration.ts`, the oracle tests) keeps `from './evaluate'` unchanged, and the formula
// (the M3 sign-inversion class) still lives in exactly ONE place.
export { afterTaxBequestPerPath }

/** The Tier-2 goal axis. ALIASED to the SHARED canonical vocabulary ({@link RecommendationGoal},
 *  model.ts) so the engine's ranking objective, the codec's enum gate, and the intake GoalPicker
 *  read ONE membership surface (U15 §S5 — the chosen-goal field rides that same vocabulary). The
 *  members are unchanged (`leave-more` / `pay-less-tax`); the `live-bigger-now` goal joins the
 *  shared vocabulary additively when its objective wiring lands (the oracle's five cases exercise
 *  tax + bequest + no-change). */
export type OracleGoal = RecommendationGoal

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
  for (const x of xs) {
    // A NaN element would make the ranking comparator NaN, which Array.sort coerces to 0 —
    // an ARBITRARY rank. Refuse loud, like memberMargin/selectionTieTolerance (insight 010).
    if (!Number.isFinite(x)) throw new Error('[evaluate] non-finite element in a scored statistic (insight 010 — refuse, never NaN)')
    s += x
  }
  return s / xs.length
}

/** Score one resolved distribution (pure — the oracle's re-derivation arms drive it directly). The
 *  §1014/IRD per-path bequest vector it means for `afterTaxBequestMeanReal` is `afterTaxBequestPerPath`,
 *  re-homed to `objectiveHeadline.ts` and re-exported above — one formula, byte-identical everywhere. */
export function scoreFromDistribution(dist: Distribution, heirBracket?: number): CandidateScore {
  if (heirBracket !== undefined && !(Number.isFinite(heirBracket) && heirBracket >= 0 && heirBracket < 1)) {
    throw new Error(`[evaluate] heirBracket must be finite in [0, 1) (got ${heirBracket}) — insight 010`)
  }
  const ta = dist.taxAware
  // The mean of the SINGLE-SOURCED per-path bequest vector — byte-identical to the prior inline map.
  const afterTaxVec = heirBracket !== undefined ? afterTaxBequestPerPath(dist, heirBracket) : undefined
  const afterTax = afterTaxVec !== undefined ? mean(afterTaxVec) : undefined
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

/**
 * The goal's Tier-2 read on a score — smaller-is-better normalized (tax ascending; bequest
 * DESCENDING, so it negates). An undefined statistic under an active goal fails LOUD.
 *
 * EXPORTED (U15 §S1) as the ONE ranking ORIENTATION. `select.ts` (S4) composes its deterministic
 * shrinkage + `candidateTieBreak` on THIS scalar, and `objective.ts` (S1) forwards to
 * `rankCandidates` (which reads it) rather than re-scoring — so no downstream selection surface
 * can re-derive a sign convention that drifts from the reference ranking (objective ≡ headline,
 * plan contract #4). No signature change: it is the same module-private function, now shared.
 */
export function tier2(score: CandidateScore, goal: OracleGoal): number {
  // EXHAUSTIVE switch + never-guard (the sequencing.ts idiom): a future third RECOMMENDATION_GOALS
  // member fails tsc HERE — it must NEVER fall through and score as leave-more (the negated bequest),
  // the sign-inversion the whole architecture guards. This is the ONE ranking orientation home.
  switch (goal) {
    case 'pay-less-tax':
      if (score.lifetimeTaxMeanReal === undefined) {
        throw new Error('[evaluate] pay-less-tax ranking requires taxAware runs (burned/062 — no silent default)')
      }
      return score.lifetimeTaxMeanReal
    case 'leave-more':
      if (score.afterTaxBequestMeanReal === undefined) {
        throw new Error('[evaluate] leave-more ranking requires taxAware runs + a declared heirBracket (burned/062)')
      }
      return -score.afterTaxBequestMeanReal
    default: {
      const _exhaustive: never = goal
      throw new Error(`[evaluate] tier2: unknown goal ${String(_exhaustive)} — the ranking orientation must widen with a new goal`)
    }
  }
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
