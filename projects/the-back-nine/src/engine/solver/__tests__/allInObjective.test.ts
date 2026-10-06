/**
 * The pay-less-tax ALL-IN objective — the one-field law across the FIVE read sites (build spec
 * `pay-less-tax-all-in-build-spec.md` D4 / §5.2 / §5.4; Briggsy's 2026-10-05 "All-in cost" ruling).
 *
 * The rank (`tier2`), the displayed headline (`goalHeadlineStatistic`), the render guard's recompute
 * (`headlineStatisticFromDistribution`), the shrinkage SE's per-path vector (`goalPerPathA`) and the
 * grade / delta-skew diffs (`pairedDecisionDiffs`) must be ONE statistic. A partial switch — one site
 * left on income tax — ships green unless something pins all five together, so this file carries:
 *  - THE CROSS-HOME PIN: on one priced distribution all five agree under `Object.is` (both sides are
 *    `mean()` over the SAME `lifetimeAllInCostPerPath` vector, so exact equality is the contract —
 *    a sum-of-means anywhere breaks it by float dust; the fixture is non-dyadic so it can);
 *  - THE PREMIUM-ONLY PLANT: two worlds that differ ONLY in one path's net premium move all five;
 *  - THE SOURCE BIND: none of the five functions reads `lifetimeTaxPaidReal` / `lifetimeTaxMeanReal`
 *    (only `lifetimeAllInCostPerPath` composes the income-tax addend).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { NEVER_DEPLETED, type Distribution } from '@shared/model'
import { goalHeadlineStatistic } from '../objective'
import { headlineStatisticFromDistribution, lifetimeAllInCostPerPath, mean } from '../objectiveHeadline'
import { goalPerPathA } from '../select'
import { scoreFromDistribution, tier2, type CandidateOutcome } from '../../validation/evaluate'
import { pairedDecisionDiffs } from '../../validation/gradeCalibration'
import type { CandidateStrategy } from '../candidates'

const candidate: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'grid' }

function pricedDist(tax: readonly number[], premium: readonly number[], medicare: readonly number[]): Distribution {
  const zeros = tax.map(() => 0)
  return {
    terminalValuesReal: zeros,
    depletionYears: tax.map(() => NEVER_DEPLETED),
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: tax,
      terminalTaxableReal: zeros,
      terminalPretaxReal: zeros,
      terminalRothReal: zeros,
      terminalHsaReal: zeros,
      terminalTaxableBasisReal: zeros,
      lifetimeNetPremiumReal: premium,
      lifetimeMedicareCostReal: medicare,
    },
  }
}

const scored = (dist: Distribution): CandidateOutcome => ({ kind: 'scored', candidate, score: scoreFromDistribution(dist), distribution: dist })

/** The five sites' pay-less-tax reads on one distribution (the diffs site via a ZERO-cost runner:
 *  runner − winner = −all-in per path, so −mean(diffs) is the all-in mean). */
function fiveSites(dist: Distribution): readonly number[] {
  const o = scored(dist)
  if (o.kind !== 'scored') throw new Error('unreachable')
  const zero = scored(pricedDist(dist.taxAware!.lifetimeTaxPaidReal.map(() => 0), dist.taxAware!.lifetimeTaxPaidReal.map(() => 0), dist.taxAware!.lifetimeTaxPaidReal.map(() => 0)))
  const perPath = goalPerPathA(o, 'pay-less-tax', undefined)
  if (perPath === undefined) throw new Error('goalPerPathA must carry the all-in vector on a tax-aware run')
  return [
    tier2(o.score, 'pay-less-tax'),
    goalHeadlineStatistic(o.score, 'pay-less-tax'),
    headlineStatisticFromDistribution(dist, 'pay-less-tax', undefined),
    mean(perPath),
    -mean(pairedDecisionDiffs(o, zero, 'pay-less-tax')),
  ]
}

describe('the cross-home pin — all five pay-less-tax sites are ONE statistic (Object.is, a priced distribution)', () => {
  // Non-dyadic on purpose: here mean(per-path sum) and mean(tax)+mean(prem)+mean(med) differ in the last
  // bits (the premise assert proves it), so a sum-of-means at ANY site breaks the Object.is chain.
  const dist = pricedDist([0.1, 0.7, 1_000_000.3], [0.2, 0.4, 1234.56], [0.3, 1.1, 7.77])

  it('premise: the fixture separates mean-of-sum from sum-of-means', () => {
    const ta = dist.taxAware!
    const sumOfMeans = mean(ta.lifetimeTaxPaidReal) + mean(ta.lifetimeNetPremiumReal) + mean(ta.lifetimeMedicareCostReal)
    expect(Object.is(mean(lifetimeAllInCostPerPath(dist)!), sumOfMeans)).toBe(false)
  })

  it('tier2 ≡ goalHeadlineStatistic ≡ headlineStatisticFromDistribution ≡ mean(goalPerPathA) ≡ −mean(pairedDecisionDiffs vs a zero-cost arm) ≡ mean(all-in)', () => {
    const allInMean = mean(lifetimeAllInCostPerPath(dist)!)
    const sites = fiveSites(dist)
    sites.forEach((v, i) => expect(Object.is(v, allInMean), `site ${i + 1} = ${v}, all-in mean = ${allInMean}`).toBe(true))
    // …and it is NOT the income-tax mean (else the pin could pass on a tax-only world).
    expect(Object.is(allInMean, mean(dist.taxAware!.lifetimeTaxPaidReal))).toBe(false)
  })
})

describe('the premium-only plant — a difference in ONE path’s net premium alone moves all five sites', () => {
  it('every site reads the planted premium (income tax and Medicare byte-identical between the two worlds)', () => {
    const tax = [10_000, 12_000, 14_000]
    const medicare = [2_000, 2_000, 2_000]
    const before = fiveSites(pricedDist(tax, [5_000, 7_000, 9_000], medicare))
    const after = fiveSites(pricedDist(tax, [5_000, 7_000, 9_000 + 3_000], medicare)) // +3,000 on path 3 ⇒ mean +1,000
    before.forEach((b, i) => expect(after[i]! - b, `site ${i + 1}`).toBe(1_000))
  })
})

describe('the source bind (§5.4) — no pay-less-tax site reads the income-tax field; only lifetimeAllInCostPerPath composes it', () => {
  /** The body of `function <name>(` in a source file, comments stripped (a docblock may NAME the
   *  income-tax field; only code is bound). */
  function functionBody(relPath: string, name: string): string {
    const src = readFileSync(fileURLToPath(new URL(relPath, import.meta.url)), 'utf8')
    const start = src.indexOf(`function ${name}(`)
    if (start < 0) throw new Error(`no function ${name} in ${relPath}`)
    let i = src.indexOf('(', start)
    let depth = 0
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++
      else if (src[i] === ')' && --depth === 0) break
    }
    const open = src.indexOf('{', i)
    depth = 0
    let j = open
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++
      else if (src[j] === '}' && --depth === 0) break
    }
    return src.slice(open, j + 1).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  }

  const SITES: readonly { readonly file: string; readonly fn: string; readonly reads: RegExp }[] = [
    { file: '../../validation/evaluate.ts', fn: 'tier2', reads: /lifetimeAllInCostMeanReal/ },
    { file: '../objective.ts', fn: 'goalHeadlineStatistic', reads: /lifetimeAllInCostMeanReal/ },
    { file: '../objectiveHeadline.ts', fn: 'headlineStatisticFromDistribution', reads: /lifetimeAllInCostPerPath/ },
    { file: '../select.ts', fn: 'goalPerPathA', reads: /lifetimeAllInCostPerPath/ },
    { file: '../../validation/gradeCalibration.ts', fn: 'pairedDecisionDiffs', reads: /lifetimeAllInCostPerPath/ },
  ]

  for (const { file, fn, reads } of SITES) {
    it(`${fn} (${file.replace(/^.*\//, '')}) reads the all-in statistic, never lifetimeTaxPaidReal / lifetimeTaxMeanReal`, () => {
      const body = functionBody(file, fn)
      expect(body).toMatch(reads)
      expect(body).not.toMatch(/lifetimeTaxPaidReal|lifetimeTaxMeanReal/)
    })
  }

  it('in objectiveHeadline.ts the income-tax vector is read ONLY inside lifetimeAllInCostPerPath', () => {
    const src = readFileSync(fileURLToPath(new URL('../objectiveHeadline.ts', import.meta.url)), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const inside = functionBody('../objectiveHeadline.ts', 'lifetimeAllInCostPerPath')
    const count = (s: string): number => (s.match(/lifetimeTaxPaidReal/g) ?? []).length
    expect(count(inside)).toBe(1)
    expect(count(code)).toBe(count(inside))
  })
})
