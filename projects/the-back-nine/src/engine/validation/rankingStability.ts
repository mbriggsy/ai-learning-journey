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
import { solverRunFingerprint, type SolverRunFingerprint, type SolverRunRanking } from './solverRunFingerprint'

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
  /** THE RUN FINGERPRINT (U15 §S0.2) — computed over the EXACT `(base, candidates, ranking)`
   *  this report was proven on, so the identity is bound to the evaluated roster (never a
   *  caller-supplied opaque). The stability runner is the SINGLE fingerprint authority: the
   *  oracle-cleared token COPIES this value (never recomputes it) so the two can never disagree,
   *  and `solve()` (S5) refuses any token/report whose fingerprint differs from the run it blesses. */
  readonly fingerprint: SolverRunFingerprint
}

/** The CLASS of a stability violation, typed BESIDE the prose so no consumer ever substring-matches
 *  a sentence. The five HARNESS classes are code / world defects — the recommender must not ship
 *  (`solveEntry.ts` bins them `mint-failed`). The two HOUSEHOLD classes are insight 029's presence
 *  companion failing on a household the harness cannot WITNESS — a typed refusal (`solveEntry.ts`,
 *  `kind: 'unwitnessable'`), never a defect, and never the generic "try again" card: the vacuity is
 *  structural, so a retry cannot succeed (insight 109's impossible-retry shape).
 *
 *  `perturbation-inert` fires when the harness's ONE +$1,000 step on the first anchored conversion
 *  candidate leaves that candidate's whole recorded decision surface byte-identical
 *  (`decisionSurfaceIdentical`). The criterion is whether the varied candidate's OWN surface moves —
 *  never whether the pool has room for the dollars — and two disjoint routes are known, so any
 *  sentence about the class must cover both: (i) CLAMP-inert — both arms clamp to the same post-RMD
 *  pre-tax headroom, `min(planned, pretax − rmd)` (`taxOverlay.ts:1444`): a pretax-0 world, or a rail
 *  amount sitting exactly on the headroom; (ii) EXHAUSTED-in-window — the household depletes inside
 *  the conversion window, so every recorded vector is identically zero whatever is converted:
 *  `?seed=failing` (a $60k IRA under a ~$72k year-one draw) converts $50,268 and its $51,268 variant
 *  UNCLAMPED inside the pool and still moves nothing, because every path depletes in year 0 and the
 *  depletion break (`taxOverlay.ts:1831`) precedes the year's tax accrual (`:1853`) — terminals,
 *  depletion years, lifetime tax and Medicare cost are all 0 for every amount from $0 to $200k
 *  (probed 2026-09-04). The bin is verdict-blind: a $900k household with pretax 0 reaches it by
 *  route (i) (solveEntry.test.ts) and a failing household whose surface still responds never does.
 *  `perturbation-infeasible` — the perturbed candidate and its variant both `SimInfeasible` — is the
 *  second household class; no known construction reaches it ALONE today (infeasibility is
 *  world-conditioned, so the sibling is infeasible too and `sibling-unscored` co-fires ⇒ the
 *  classifier returns null ⇒ mint-failed), so it is pinned by the partition types below, not by a
 *  world that cannot be built. */
export type StabilityViolationClass =
  | 'dimension-moved'
  | 'survivor-vacuous'
  | 'perturbation-misconfigured'
  | 'sibling-unscored'
  | 'perturbation-law-broke'
  | 'perturbation-inert'
  | 'perturbation-infeasible'

export interface StabilityViolation {
  readonly class: StabilityViolationClass
  readonly text: string
}

/** The household-conditioned vacuity classes — the harness cannot witness THIS household. */
export type HouseholdVacuity = Extract<StabilityViolationClass, 'perturbation-inert' | 'perturbation-infeasible'>

const HOUSEHOLD_VACUITY: readonly HouseholdVacuity[] = ['perturbation-inert', 'perturbation-infeasible']
const isHouseholdVacuity = (c: StabilityViolationClass): c is HouseholdVacuity =>
  (HOUSEHOLD_VACUITY as readonly StabilityViolationClass[]).includes(c)

/** The harness partition — every class that is NOT a household vacuity. */
type HarnessClass = Exclude<StabilityViolationClass, HouseholdVacuity>
/** Construct a violation IN ITS PARTITION. The class field is the load-bearing decision between
 *  `mint-failed` (never ship) and the typed household refusal, and four of the seven emit sites below
 *  are unreachable by any world a test can build — so a cross-partition mis-tag
 *  (`harnessViolation('perturbation-inert', …)`, which would route a real CRN break to the calm HOLD)
 *  is a COMPILE error here, killed by the type system rather than by a test that cannot be written. */
const harnessViolation = (cls: HarnessClass, text: string): StabilityViolation => ({ class: cls, text })
const householdViolation = (cls: HouseholdVacuity, text: string): StabilityViolation => ({ class: cls, text })

export interface RankingStabilityFailure {
  readonly ok: false
  readonly violations: readonly StabilityViolation[]
}

/**
 * The failure is the HOUSEHOLD's, not the harness's — the class to refuse on, or `null`.
 *
 * EVERY violation must be household-conditioned: one harness-class violation beside a vacuity means
 * the gate itself broke on this run, and `mint-failed` must win (a code defect never hides behind a
 * household's refusal). An empty list is not a failure at all (`null`). The two household branches
 * are mutually exclusive `else if` arms of one perturbation check, so an all-household list carries
 * exactly one class — the first is returned.
 */
export function householdVacuity(failure: RankingStabilityFailure): HouseholdVacuity | null {
  const first = failure.violations[0]
  if (first === undefined) return null
  if (!failure.violations.every((v) => isHouseholdVacuity(v.class))) return null
  return first.class as HouseholdVacuity
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
  /** The ranking objective this report's fingerprint pins (U15 §S0.2). The stability CHECK is
   *  goal-agnostic (it proves CRN decoupling, not the ranked winner); the goal is threaded ONLY
   *  because the report is the run-fingerprint authority and the goal is a ranking-affecting input
   *  absent from the engine params. */
  readonly ranking: SolverRunRanking
  /** The selection tie-tolerance this report's fingerprint pins (U15 §S0.2 v2). IDENTITY-ONLY: the
   *  stability CHECK never consumes it (CRN decoupling is tolerance-independent); it is threaded ONLY
   *  because the report is the run-fingerprint authority and tieTolerance is a ranking-affecting input
   *  (it decides survival-equivalence ⇒ the winner) absent from the engine params. */
  readonly tieTolerance: number
}): { readonly report: RankingStabilityReport } | RankingStabilityFailure {
  const { base, candidates, seedA, seedB, perturbIndex, siblingIndex, ranking, tieTolerance } = opts
  const violations: StabilityViolation[] = []

  // 1. Dimension invariance — the draw schedule's whole input tuple, per candidate.
  for (const [i, c] of candidates.entries()) {
    const p = applyCandidate(base, c)
    if (p.paths !== base.paths || p.maxHorizonYears !== base.maxHorizonYears || p.people.length !== base.people.length) {
      violations.push(
        harnessViolation(
          'dimension-moved',
          `candidate ${i} moved a draw dimension: (${p.paths}, ${p.maxHorizonYears}, ${p.people.length}) vs base ` +
            `(${base.paths}, ${base.maxHorizonYears}, ${base.people.length})`,
        ),
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
          harnessViolation(
            'survivor-vacuous',
            `candidate ${i} seed ${s === 0 ? 'A' : 'B'}: no path entered the survivor regime — the CRN claim would be vacuous (burned/027)`,
          ),
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
    violations.push(
      harnessViolation(
        'perturbation-misconfigured',
        'perturbation arm misconfigured: perturbIndex must name a conversion candidate ≠ siblingIndex',
      ),
    )
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
      violations.push(harnessViolation('sibling-unscored', 'perturbation arm: the sibling must be a scored candidate on seed A'))
    } else if (!decisionSurfaceIdentical(original.distribution, rerunS.distribution)) {
      violations.push(
        harnessViolation(
          'perturbation-law-broke',
          'THE PERTURBATION LAW BROKE: perturbing one candidate’s conversion amount changed a SIBLING’s ' +
            'decision surface — shared state or draw-consumption coupling has entered the evaluation path',
        ),
      )
    }
    // The presence companion (insight 029): the +1,000 must have MOVED the varied candidate —
    // sibling-identity proves decoupling only when something genuinely changed on the other arm.
    const originalPerturbed = outcomesBySeed[0]![perturbIndex]!
    const rerunV = rerunVariant!
    if (originalPerturbed.kind === 'scored' && rerunV.kind === 'scored') {
      if (decisionSurfaceIdentical(originalPerturbed.distribution, rerunV.distribution)) {
        // HOUSEHOLD class (not harness): the varied candidate's OWN surface did not move — both arms
        // clamped to the same headroom, or the household is exhausted inside the window so every
        // recorded vector is zero whatever is converted (see the class docs). The harness cannot
        // witness this household; the criterion is the surface, never the pool's room for the dollars.
        violations.push(
          householdViolation(
            'perturbation-inert',
            'perturbation arm VACUOUS: the +1,000 conversion perturbation left the varied candidate’s own ' +
              'decision surface byte-identical — nothing moved, so sibling-identity proves no decoupling (insight 029)',
          ),
        )
      }
    } else if (originalPerturbed.kind === 'infeasible' && rerunV.kind === 'infeasible') {
      // HOUSEHOLD class (not harness): the anchored conversion cannot be executed on this household at
      // all. No known world reaches this ALONE (the class docs) — the sibling goes infeasible too and
      // `sibling-unscored` co-fires, so the classifier returns null and the run mint-fails.
      violations.push(
        householdViolation(
          'perturbation-infeasible',
          'perturbation arm VACUOUS: the perturbed candidate and its +1,000 variant are BOTH infeasible — ' +
            'no movement is witnessable (insight 029)',
        ),
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
    // Bound to the EXACT roster this report proved stable (§S0.2) — the token copies it verbatim.
    // The run pair (seedA, tieTolerance) joins the identity (§S0.2 v2) — both ranking-affecting.
    fingerprint: solverRunFingerprint(base, candidates, ranking, { seedA, tieTolerance }),
  } as unknown as RankingStabilityReport
  return { report }
}
