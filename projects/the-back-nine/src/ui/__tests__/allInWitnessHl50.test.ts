/**
 * THE hl50 WITNESS — the register's "~$50k-spend witness household" (build spec §5.3; the Tier 0
 * entry's RULED block owes it): the `health` dev seed (`retiredHealth`, 61/59, ACA-priced) re-run
 * with ONLY its spending changed to $50,000/yr, where the pay-less-tax objective's income-tax-only
 * crown and its all-in crown DISAGREE on a live, volatile, CRN-seeded engine run.
 *
 * Kept OUT of DEV_SEEDS on purpose (membership would enrol it in every DEV_SEEDS loop and in the
 * Caddie walk — adding it is Briggsy's call); it is constructed here from the seed draft.
 *
 * ⚑ 16,000 paths on BOTH live seeds (the draft's seedA + its derived seedB), NEVER fewer: at 256
 * paths the paired z is ≈ 2.5 (the register's measurement), and the witness is meaningful only where
 * the all-in difference is many SEs clear of zero. The roster is the minimal one the search accepts:
 * the conventional baseline (the search's required prior), the household's own plan, pre-tax-first:0
 * (the income-tax-only crown) and bracket-fill:0 (the all-in crown).
 *
 * THE EXPECTED CROWN IS DERIVED INDEPENDENTLY (register method b, DND 012): direct
 * `simulate(applyCandidate)` per candidate, then THIS file's own tier-1 (survival, tolerance 0) /
 * tier-2 (the mean of its OWN per-path sum of tax + net premium + Medicare) sort — never the build's
 * statistic. The shipped `selectRecommendation` must crown the RANKING seed-set's (A) arm.
 *
 * RE-DERIVED 2026-10-09 (the budgetless survivor-medical lean, SOLVER_CODE_VERSION 11 — `health` enters
 * M $4,000, now held whole in the survivor years). Measured at 16k, pre-lean → lean, survivors of 16,000:
 *   · seed A: the household's own plan / pre-tax-first:0 / bracket-fill:0 all 15,996 → all 15,995 — Tier 1
 *     still ties the three and Tier 2 crowns bracket-fill:0 (unchanged);
 *   · seed B: own plan 15,998 → 15,998, bracket-fill:0 15,998 → 15,997, pre-tax-first:0 15,997 → 15,997.
 *     The lean cost bracket-fill:0 ONE path, so Tier 1 at tolerance 0 is now a singleton — the
 *     household's own plan (`baseline:proportional:20000`) — and the independent seed-B crown moved
 *     bracket-fill:0 → baseline:proportional:20000 on a one-path edge;
 *   · the shipped selection (seed A ranks) crowns bracket-fill:0 under both engines, and the ptf/bf
 *     inversion — the witness's subject — holds on both seeds.
 */
import { describe, expect, it } from 'vitest'
import { buildSolveRequest } from '@intake/solveDispatch'
import { simulate } from '@engine/simulate'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { deriveSeedB } from '@engine/validation/heldOutSeed'
import { applyCandidate, solverCandidateId, type CandidateStrategy } from '@engine/solver/candidates'
import { runSearch } from '@engine/solver/search'
import { selectRecommendation } from '@engine/solver/select'
import type { Distribution } from '@shared/model'
import { resolveDevSeed } from '../devSeeds'

const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5
const PATHS = 16_000
const PRE_TAX_FIRST = 'grid:pre-tax-first:0'
const BRACKET_FILL = 'grid:bracket-fill:0'
/** The household's own plan (the user baseline: proportional + its applied $20,000 conversion). */
const OWN_PLAN = 'baseline:proportional:20000'

function hl50Request() {
  const draft = resolveDevSeed('health')
  if (draft === null) throw new Error('no dev seed "health"')
  const req = buildSolveRequest({ ...draft, annualSpendingReal: 50_000, chosenGoal: 'pay-less-tax' }, TODAY)
  if (typeof req === 'string') throw new Error(`hl50: the builder refused (${req})`)
  const keep = (c: CandidateStrategy): boolean =>
    c.provenance === 'conventional-baseline' ||
    c.provenance === 'user-baseline' ||
    solverCandidateId(c) === PRE_TAX_FIRST ||
    solverCandidateId(c) === BRACKET_FILL
  const candidates = req.candidates.filter(keep)
  return { base: { ...req.base, paths: PATHS }, candidates, seedA: req.seedA }
}

/** This file's OWN all-in per path (an independent sum — never `lifetimeAllInCostPerPath`). */
function allInOf(d: Distribution): readonly number[] {
  const ta = d.taxAware
  if (ta === undefined) throw new Error('hl50 runs carry the tax overlay')
  const out: number[] = []
  for (let p = 0; p < ta.lifetimeTaxPaidReal.length; p++) {
    out.push(ta.lifetimeTaxPaidReal[p]! + ta.lifetimeNetPremiumReal[p]! + ta.lifetimeMedicareCostReal[p]!)
  }
  return out
}

/** CRN-paired difference a − b: mean, SE and z. */
function paired(a: readonly number[], b: readonly number[]): { readonly mean: number; readonly se: number; readonly z: number } {
  const n = a.length
  const d = a.map((x, i) => x - b[i]!)
  const m = d.reduce((s, x) => s + x, 0) / n
  const v = d.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1)
  const se = Math.sqrt(v / n)
  return { mean: m, se, z: m / se }
}

describe('the hl50 witness — a live ACA household where income tax and all-in crown DIFFERENT strategies (16k paths, both live seeds)', () => {
  it('the all-in crown on the ranking seed is bracket-fill:0 (independent ranker), the shipped selection agrees, and the pre-tax-first / bracket-fill inversion is many SEs clear on BOTH seeds', () => {
    const t0 = Date.now()
    const { base, candidates, seedA } = hl50Request()
    expect(candidates.map(solverCandidateId)).toEqual(expect.arrayContaining([PRE_TAX_FIRST, BRACKET_FILL]))
    expect(candidates.length).toBe(4)
    expect(base.overlay?.healthcareEnabled).toBe(true)
    const seedB = deriveSeedB(seedA)

    for (const seed of [seedA, seedB]) {
      const runs = candidates.map((c) => {
        const out = simulate(applyCandidate(base, c), seed)
        if (out.indeterminate || out.infeasible) throw new Error(`hl50: ${solverCandidateId(c)} did not score`)
        return { id: solverCandidateId(c), dist: out.distribution }
      })
      // The independent ranker: tier 1 = survival at tolerance 0; tier 2 = mean own-sum all-in, ascending.
      const best = Math.max(...runs.map((r) => r.dist.survivalFraction))
      const top = runs.filter((r) => r.dist.survivalFraction === best)
      const meanAllIn = (r: (typeof runs)[number]): number => {
        const v = allInOf(r.dist)
        return v.reduce((s, x) => s + x, 0) / v.length
      }
      const crown = [...top].sort((x, y) => meanAllIn(x) - meanAllIn(y))[0]!
      // Seed A (the RANKING seed-set): Tier 1 ties the own plan, pre-tax-first and bracket-fill, and Tier 2
      // crowns bracket-fill. Seed B: since the survivor-medical lean the household's own plan survives ONE
      // more path of 16,000 than both grid arms (15,998 vs 15,997 — re-derived, see the header), so Tier 1
      // at tolerance 0 crowns it alone there.
      expect(crown.id, `seed ${seed}: the independent all-in crown`).toBe(seed === seedA ? BRACKET_FILL : OWN_PLAN)

      const ptf = runs.find((r) => r.id === PRE_TAX_FIRST)!
      const bf = runs.find((r) => r.id === BRACKET_FILL)!
      // Tier 1 never favours pre-tax-first; on seed A (the RANKING seed-set) survival is EQUAL, so the
      // crown is decided by Tier 2 — the all-in statistic itself. (Seed B, re-measured under the lean:
      // bf and ptf both 15,997 of 16,000 — pre-lean bf led by one path, 15,998.)
      expect(bf.dist.survivalFraction, `seed ${seed}: bracket-fill survives at least as often`).toBeGreaterThanOrEqual(ptf.dist.survivalFraction)
      if (seed === seedA) expect(ptf.dist.survivalFraction, 'seed A: equal survival (Tier 2 decides)').toBe(bf.dist.survivalFraction)
      const allIn = paired(allInOf(ptf.dist), allInOf(bf.dist))
      const tax = paired(ptf.dist.taxAware!.lifetimeTaxPaidReal, bf.dist.taxAware!.lifetimeTaxPaidReal)
      // pre-tax-first costs MORE all-in, many SEs clear (measured z 19.3 / 20.4) …
      expect(allIn.z, `seed ${seed}: all-in z (mean ${allIn.mean.toFixed(0)} ± ${allIn.se.toFixed(0)})`).toBeGreaterThanOrEqual(5)
      // … while it pays LESS income tax (the opposite sign — the inversion).
      expect(tax.mean, `seed ${seed}: income-tax diff (mean ${tax.mean.toFixed(0)} ± ${tax.se.toFixed(0)})`).toBeLessThan(0)
      // The Medicare addend is LIVE in an engine run (Spec 2) — not a vacuous zero vector.
      expect(bf.dist.taxAware!.lifetimeMedicareCostReal.some((x) => x > 0)).toBe(true)
      console.info(`[hl50] seed ${seed}: all-in ptf−bf ${allIn.mean.toFixed(1)} ± ${allIn.se.toFixed(1)} (z ${allIn.z.toFixed(1)}); tax ${tax.mean.toFixed(1)} ± ${tax.se.toFixed(1)}`)
    }

    // The shipped selection (both seed-sets, shrinkage on) crowns the same arm.
    const search = runSearch({ base, candidates, seedA, goal: 'pay-less-tax', tieTolerance: 0 })
    const sel = selectRecommendation(search)
    if (sel.kind !== 'selected') throw new Error(`hl50: selection did not crown (${sel.kind})`)
    expect(sel.winnerId).toBe(BRACKET_FILL)
    console.info(`[hl50] runtime ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  }, 600_000)
})
