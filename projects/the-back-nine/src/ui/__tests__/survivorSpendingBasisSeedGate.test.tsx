// @vitest-environment jsdom
/**
 * THE SURVIVOR CARD'S SPENDING-BASIS LINE on every household that renders the card, through the REAL
 * pipeline — buildSpineParams → runEngine with the app's own options → a structured clone (the worker
 * boundary) → fromWire → `spendingBasisLine` (since Act 6 · RC4, Probability's survivor row; the card left with the answer page). The register's Tier 1 *The survivor card's "still covers you"
 * never says what spending it assumes…*, RULED 2026-10-14 (b9-toronto1, "All three recs"): ONE line,
 * exactly "This assumes about $[survivor] a month of spending on your own (today: $[couple] together)."
 *
 * THE CENSUS (read): the card renders only on the SPINE route (`answerView.ts` carries `survivorReading`
 * on the spine view only; the date route's working member means no card), so its universe is every
 * spine dev seed plus every aged vault plant built on one (the census arm below reads both off `DEV_SEEDS`
 * and `AGED_PLANTS` and pins the spine count; no count is re-typed here), each doctored exactly as
 * `plantDevVault` doctors it. The census arm below fails if a new
 * spine seed or a new spine-based vault plant (read off `AGED_PLANTS`) lands without a row here — no
 * silent no-op (burned/070).
 *
 * THE EXPECTATIONS ARE HAND-DERIVED (DND 012) from each household's entered S, r = 0.75, M and budget —
 * the arithmetic sits in the table, never the engine's formula re-run. The rendered dollars ride the
 * app's own $/month formatter (`formatPerMonth`: the nearest $10, half up — so $4,875.00 reads "$4,880"
 * and $4,958.33 reads "$4,960"); the sentences are LITERALS, so a reworded slot reds here as well as in
 * the copy pins. Measured against the ruling's own run (`wf_cddde314-d13`, 2,000 paths, seed 0xbada55):
 * $4,875 on the retired family, $4,958.33 on the three health seeds, $4,791.67 on `budget`.
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { isRampedBudget } from '@budget/budgetModel'
import { buildSpineParams } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { fromWire } from '@engine/engineWire'
import { cashTermsForYear, survivorSpendingBasis, type PersonOffsets } from '@engine/simulate'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { FIRST_UNAMBIGUOUS_SAVE_DAY } from '@engine/pricingVersion'
import type { CurrentScenario, SimulationParams, SurvivorReading } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import {
  AGED_PLANTS,
  DEV_SEEDS,
  doctorRecordHolds,
  doctorRecordSuperseded,
  doctorStaleVault,
  doctorStateStaleVault,
  doctorYearlyReturn,
  doctorYearlyReturnRecord,
  type DevSeedKey,
} from '../devSeeds'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { spendingBasisLine } from '../survivorLines'

afterEach(cleanup)

/** A clock inside the ACA re-verify window, RELATIVE to the live record (the doctors take a day). */
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

/** The aged plants, doctored the way `plantDevVault` doctors them (a this-build save stamped no earlier
 *  than the first unambiguous day, then the plant's own doctor) and re-hydrated the way unlock does. */
const PLANTS = {
  stale: ['retired', doctorStaleVault],
  statestale: ['nc', doctorStateStaleVault],
  rec: ['retired', doctorRecordHolds],
  recold: ['retired', doctorRecordSuperseded],
  yearpa: ['patypical', doctorYearlyReturn],
  yearfailing: ['failingtypical', doctorYearlyReturn],
  yearrec: ['retired', doctorYearlyReturnRecord],
  recpa: ['patypical', doctorRecordHolds],
  yearparec: ['patypical', doctorYearlyReturnRecord],
  yearsurplus: ['surplustypical', doctorYearlyReturn],
  yearofftrack: ['offtracktypical', doctorYearlyReturn],
  yearpafailing: ['pafailingtypical', doctorYearlyReturn],
  yearfailingentered: ['failingentered', doctorYearlyReturn],
  yearpaofftrackone: ['paofftrackone', doctorYearlyReturn],
  yearsurpluswidest: ['surpluswidest', doctorYearlyReturn],
  yearfailingwidest: ['failingwidest', doctorYearlyReturn],
  yearpasurplus: ['pasurplustypical', doctorYearlyReturn],
  yearpaone: ['paone', doctorYearlyReturn],
  yearparecone: ['paone', doctorYearlyReturnRecord],
  yearpafailingone: ['pafailingone', doctorYearlyReturn],
  recbudget: ['budget', doctorRecordHolds],
} as const satisfies Record<string, readonly [DevSeedKey, (s: CurrentScenario, today: number) => CurrentScenario]>

const plantDraft = (key: keyof typeof PLANTS): ScenarioDraft => {
  const [base, doctor] = PLANTS[key]
  const built = scenarioFromDraft(DEV_SEEDS[base])
  if (!built.ready) throw new Error(`${key}: the base seed is not save-ready`)
  const save: CurrentScenario = {
    ...built.scenario,
    savedAt: Math.max(built.scenario.savedAt ?? FIRST_UNAMBIGUOUS_SAVE_DAY, FIRST_UNAMBIGUOUS_SAVE_DAY),
  }
  const hydrated = draftFromScenario(doctor(save, TODAY))
  if (!hydrated.ok) throw new Error(`${key}: the doctored vault does not hydrate`)
  return hydrated.draft
}

const line = (survivor: string, together: string) =>
  `This assumes about $${survivor} a month of spending on your own (today: $${together} together).`

/** One row per household that renders the card. `annual` = the hand-derived pair (real $/yr). */
const ROWS: readonly {
  readonly key: string
  readonly draft: () => ScenarioDraft
  readonly annual: { readonly survivor: number; readonly couple: number }
  readonly rendered: string
}[] = [
  // The retired family — S $78,000, r 0.75, no M, no budget: 0.75 × 78,000 = 58,500 → $4,875.00 → "4,880".
  // `patypical` (the composites plan's U2) answers "not sure" on Medicare extras: the extras fund through the
  // engine's costs, never the spending basis, so its row is `pa`'s. `retiredkept` (Act 6 · RC5) is `retired` holding kept
  // what-ifs, which are never an engine input, so its row is `retired`'s.
  ...(['retired', 'retiredkept', 'buckets', 'steer', 'nc', 'pa', 'patypical', 'fl', 'elsewhere'] as const).map((key) => ({
    key,
    draft: () => DEV_SEEDS[key],
    annual: { survivor: 58_500, couple: 78_000 },
    rendered: line('4,880', '6,500'),
  })),
  // S $71,600: 0.75 × 71,600 = 53,700 → $4,475.00 → "4,480"; 71,600 / 12 = $5,966.67 → "5,970".
  { key: 'borderline', draft: () => DEV_SEEDS.borderline, annual: { survivor: 53_700, couple: 71_600 }, rendered: line('4,480', '5,970') },
  // S $96,000: 0.75 × 96,000 = 72 thousand a year → $6,000 a month; 96,000 / 12 = $8,000. (Written 6,000 × 12:
  // the bare six-digit figure is the §415(c) ceiling the constants shape gate guards against re-typing.)
  { key: 'failing', draft: () => DEV_SEEDS.failing, annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // `failingtypical` (the composites plan's U2): `failing` with "not sure" extras, the same spending basis.
  { key: 'failingtypical', draft: () => DEV_SEEDS.failingtypical, annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // The rung-3 key council's two already-failing bases: `failingtypical` in Pennsylvania, and `failing` with entered
  // extras. Neither the state nor the extras answer is a spending input, so each keeps `failing`'s basis.
  ...(['pafailingtypical', 'failingentered'] as const).map((key) => ({
    key,
    draft: () => DEV_SEEDS[key],
    annual: { survivor: 6_000 * 12, couple: 96_000 },
    rendered: line('6,000', '8,000'),
  })),
  // `offtracktypical` (the council's off-track base): `retired`'s couple at S $102,000 (8,500 × 12), r 0.75, no M, no
  // budget: 0.75 × 102,000 = 76,500 → $6,375.00 → "6,380" (the $10 step rounds half up); 102,000 / 12 = $8,500.
  { key: 'offtracktypical', draft: () => DEV_SEEDS.offtracktypical, annual: { survivor: 76_500, couple: 8_500 * 12 }, rendered: line('6,380', '8,500') },
  // `paofftrackone` (round 2 of the frames-outside build's review): `offtracktypical` in Pennsylvania with person 0 named
  // alone on "not sure"; neither the state, a name nor the extras answer is a spending input, so the same basis.
  { key: 'paofftrackone', draft: () => DEV_SEEDS.paofftrackone, annual: { survivor: 76_500, couple: 8_500 * 12 }, rendered: line('6,380', '8,500') },
  { key: 'order', draft: () => DEV_SEEDS.order, annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // S $60,000: 0.75 × 60,000 = 45,000 → $3,750; $5,000.
  { key: 'surplus', draft: () => DEV_SEEDS.surplus, annual: { survivor: 45_000, couple: 60_000 }, rendered: line('3,750', '5,000') },
  // `surplustypical` (the council's room base): `surplus` answering "not sure" on extras, the same spending basis.
  { key: 'surplustypical', draft: () => DEV_SEEDS.surplustypical, annual: { survivor: 45_000, couple: 60_000 }, rendered: line('3,750', '5,000') },
  // The frames-outside plan's U1. `pasurplustypical` is `surplustypical` in Pennsylvania: the state is not a spending
  // input, so the same basis.
  { key: 'pasurplustypical', draft: () => DEV_SEEDS.pasurplustypical, annual: { survivor: 45_000, couple: 60_000 }, rendered: line('3,750', '5,000') },
  // `surpluswidest` — S $480,000 (40,000 × 12), r 0.75, no M, no budget: 0.75 × 480,000 = 360,000 → $30,000 a month;
  // 480,000 / 12 = $40,000.
  { key: 'surpluswidest', draft: () => DEV_SEEDS.surpluswidest, annual: { survivor: 30_000 * 12, couple: 40_000 * 12 }, rendered: line('30,000', '40,000') },
  // `failingwidest` — itemized: housing 120,000 is an essentials line of a survivor-fixed category (sticky, never scaled;
  // the budget row below reads housing the same way), no scalable essentials, travel 1,079,880 discretionary (the
  // ceiling's widest spend, (100,000 − 10) × 12 = 1,199,880, less the housing), no M: 120,000 + 0.75 × 1,079,880 =
  // 120,000 + 809,910 = 929,910 → $77,492.50 → "77,490" (the $10 step rounds 7,749.25 steps down); couple 1,199,880
  // → $99,990.
  { key: 'failingwidest', draft: () => DEV_SEEDS.failingwidest, annual: { survivor: 929_910, couple: 1_199_880 }, rendered: line('77,490', '99,990') },
  // `surpluswidestrelief` (b9-1, A's relief combination) — itemized the same way: housing 120,000 sticky, travel
  // 360,000 discretionary (480,000 less the housing), no M: 120,000 + 0.75 × 360,000 = 120,000 + 270,000 = 390,000 →
  // $32,500 a month; couple 480,000 → $40,000.
  { key: 'surpluswidestrelief', draft: () => DEV_SEEDS.surpluswidestrelief, annual: { survivor: 390_000, couple: 40_000 * 12 }, rendered: line('32,500', '40,000') },
  // b9-1, the review's remaining derived members' bases: neither the state, a name nor the extras answer is a spending
  // input, so each keeps its base's basis (`budget`'s, `patypical`'s, `pafailingtypical`'s rows).
  { key: 'pabudgetone', draft: () => DEV_SEEDS.pabudgetone, annual: { survivor: 57_500, couple: 65_600 }, rendered: line('4,790', '5,470') },
  { key: 'paone', draft: () => DEV_SEEDS.paone, annual: { survivor: 58_500, couple: 78_000 }, rendered: line('4,880', '6,500') },
  { key: 'pafailingone', draft: () => DEV_SEEDS.pafailingone, annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // The itemized household — sticky 33,200 (survivor-fixed: housing 18,000 + utilities 4,800 + other 4,400 =
  // 27,200 typed, plus the injected $6,000 OOP medical), scalable essentials 14,400 (food 9,600 +
  // transportation 4,800), discretionary 18,000: 33,200 + 0.75 × 14,400 + 0.75 × 18,000 = 33,200 + 10,800 + 13,500 =
  // 57,500 → $4,791.67 → "4,790"; couple 65,600 → $5,466.67 → "5,470" (a share of 87.7 %, not 75 %).
  { key: 'budget', draft: () => DEV_SEEDS.budget, annual: { survivor: 57_500, couple: 65_600 }, rendered: line('4,790', '5,470') },
  // The health seeds — S $78,000 with M $4,000 held whole: 4,000 + 0.75 × 74,000 = 59,500 → $4,958.33 → "4,960".
  ...(['health', 'healthnc', 'healthgap'] as const).map((key) => ({
    key,
    draft: () => DEV_SEEDS[key],
    annual: { survivor: 59_500, couple: 78_000 },
    rendered: line('4,960', '6,500'),
  })),
  // The early-claim witness (2026-10-15) — `health` at S $60,000, M $4,000 held whole: 4,000 + 0.75 × 56,000 =
  // 46,000 → $3,833.33 → "3,830"; 60,000 / 12 = $5,000.
  { key: 'healthss', draft: () => DEV_SEEDS.healthss, annual: { survivor: 46_000, couple: 60_000 }, rendered: line('3,830', '5,000') },
  // The aged plants: stale / statestale / rec keep their base's S ($78,000); recold's household edited its
  // spend +$6,000 a year (`RECORD_SPEND_EDIT`) → S $84,000: 0.75 × 84,000 = 63,000 → $5,250; $7,000.
  ...(['stale', 'statestale', 'rec'] as const).map((key) => ({
    key: `vault:${key}`,
    draft: () => plantDraft(key),
    annual: { survivor: 58_500, couple: 78_000 },
    rendered: line('4,880', '6,500'),
  })),
  { key: 'vault:recold', draft: () => plantDraft('recold'), annual: { survivor: 63_000, couple: 84_000 }, rendered: line('5,250', '7,000') },
  // The composites plan's U3 plants. Their doctors move the save day, two stamps and the record, never a
  // spending input, so each keeps its base's S: `retired` / `patypical` $78,000 (the retired family's
  // 58,500 → "4,880"), `failingtypical` $96,000 (`failing`'s 6,000 a month).
  ...(['yearpa', 'yearrec', 'recpa', 'yearparec'] as const).map((key) => ({
    key: `vault:${key}`,
    draft: () => plantDraft(key),
    annual: { survivor: 58_500, couple: 78_000 },
    rendered: line('4,880', '6,500'),
  })),
  { key: 'vault:yearfailing', draft: () => plantDraft('yearfailing'), annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // The rung-3 key council's yearly returns: the same doctor, so each keeps its base's S (rows above).
  { key: 'vault:yearsurplus', draft: () => plantDraft('yearsurplus'), annual: { survivor: 45_000, couple: 60_000 }, rendered: line('3,750', '5,000') },
  { key: 'vault:yearofftrack', draft: () => plantDraft('yearofftrack'), annual: { survivor: 76_500, couple: 8_500 * 12 }, rendered: line('6,380', '8,500') },
  ...(['yearpafailing', 'yearfailingentered'] as const).map((key) => ({
    key: `vault:${key}`,
    draft: () => plantDraft(key),
    annual: { survivor: 6_000 * 12, couple: 96_000 },
    rendered: line('6,000', '8,000'),
  })),
  // Round 2 of the frames-outside build's review: its derived members' yearly returns, the same doctor, each its base's S.
  { key: 'vault:yearpaofftrackone', draft: () => plantDraft('yearpaofftrackone'), annual: { survivor: 76_500, couple: 8_500 * 12 }, rendered: line('6,380', '8,500') },
  { key: 'vault:yearsurpluswidest', draft: () => plantDraft('yearsurpluswidest'), annual: { survivor: 30_000 * 12, couple: 40_000 * 12 }, rendered: line('30,000', '40,000') },
  { key: 'vault:yearfailingwidest', draft: () => plantDraft('yearfailingwidest'), annual: { survivor: 929_910, couple: 1_199_880 }, rendered: line('77,490', '99,990') },
  { key: 'vault:yearpasurplus', draft: () => plantDraft('yearpasurplus'), annual: { survivor: 45_000, couple: 60_000 }, rendered: line('3,750', '5,000') },
  // b9-1: the review's remaining derived members a year on, the same doctors, each its base's S.
  ...(['yearpaone', 'yearparecone'] as const).map((key) => ({
    key: `vault:${key}`,
    draft: () => plantDraft(key),
    annual: { survivor: 58_500, couple: 78_000 },
    rendered: line('4,880', '6,500'),
  })),
  { key: 'vault:yearpafailingone', draft: () => plantDraft('yearpafailingone'), annual: { survivor: 6_000 * 12, couple: 96_000 }, rendered: line('6,000', '8,000') },
  // The record card's seat plan's U11: `recbudget`'s doctor adds a goal and a record, never a spending input, so it keeps
  // `budget`'s itemized basis (the row derived above: 57,500 → "4,790"; 65,600 → "5,470").
  { key: 'vault:recbudget', draft: () => plantDraft('recbudget'), annual: { survivor: 57_500, couple: 65_600 }, rendered: line('4,790', '5,470') },
]

const spineParams = (d: ScenarioDraft, key: string): SimulationParams => {
  const p = buildSpineParams(d)
  if (p === null) throw new Error(`${key}: not a spine household`)
  return p
}

/** The pipeline the app runs for the card: the spine headline run with the app's three options, across
 *  a structured clone (what the worker's postMessage delivers), unpacked by the main-thread `fromWire`. */
const readingThroughTheWire = (d: ScenarioDraft, key: string): SurvivorReading => {
  if (d.seed === undefined) throw new Error(`${key}: no engine seed`)
  const wire = structuredClone(runEngine(spineParams(d, key), d.seed, { bandFan: true, survivorConditioned: true, healthReadout: true }))
  const unpacked = fromWire(wire)
  if (!unpacked.ok) throw new Error(`${key}: ${unpacked.reason}`)
  const reading = unpacked.result.survivorReading
  if (reading === undefined) throw new Error(`${key}: no survivor reading`)
  expect(unpacked.result.distribution.survivorConditioned?.spendingBasis, `${key}: the surface carries it`).toEqual(reading.spendingBasis)
  return reading
}

describe('the survivor card’s spending-basis line on every household that renders the card', { timeout: 240_000 }, () => {
  it('the census: the rows are exactly the spine dev seeds and the spine vault plants — a new one of either must add its row', () => {
    const spineSeeds = (Object.keys(DEV_SEEDS) as DevSeedKey[]).filter((k) => buildSpineParams(DEV_SEEDS[k]) !== null)
    expect(ROWS.filter((r) => !r.key.startsWith('vault:')).map((r) => r.key).sort()).toEqual([...spineSeeds].sort())
    expect(spineSeeds).toHaveLength(31)
    // Every registered plant over a spine base renders the card, so each needs a row, doctored as the
    // registry doctors it: read off `AGED_PLANTS`, never re-typed, so a new spine plant reds here.
    const spinePlants = Object.entries(AGED_PLANTS).filter(([, p]) => p !== undefined && spineSeeds.includes(p.base))
    expect(Object.keys(PLANTS).sort()).toEqual(spinePlants.map(([k]) => k).sort())
    for (const [key, p] of spinePlants) {
      expect(PLANTS[key as keyof typeof PLANTS], `${key}: the census doctors it as the registry does`).toEqual([p!.base, p!.doctor])
    }
    expect(ROWS.filter((r) => r.key.startsWith('vault:')).map((r) => r.key.slice('vault:'.length)).sort()).toEqual(Object.keys(PLANTS).sort())
  })

  it('no CARD-BEARING household is ramped — the ramped dev seeds (`dip`, the Go-go years line) ride the date route, which renders no card, so no dev household drives the withheld line live', () => {
    for (const row of ROWS) expect(isRampedBudget(row.draft().budget ?? []), `${row.key}: not ramped`).toBe(false)
    const ramped = (Object.keys(DEV_SEEDS) as DevSeedKey[]).filter((k) => isRampedBudget(DEV_SEEDS[k].budget ?? []))
    expect(ramped).toContain('dip')
    for (const k of ramped) expect(buildSpineParams(DEV_SEEDS[k]), `${k}: off the spine (no card)`).toBeNull()
  })

  for (const row of ROWS) {
    it(`${row.key}: the wire carries $${(row.annual.survivor / 12).toFixed(2)} / $${(row.annual.couple / 12).toFixed(2)} a month and the card reads "${row.rendered}"`, () => {
      const reading = readingThroughTheWire(row.draft(), row.key)
      expect(reading.spendingBasis).toEqual({
        survivorMonthlyReal: row.annual.survivor / 12,
        coupleMonthlyReal: row.annual.couple / 12,
        steady: true, // no card-bearing household is ramped (pinned above) — every one renders the line
      })
      // Since Act 6 · RC4 the survivor row on Probability reads its basis line from this one producer (the old card
      // went with the answer page): the line it prints is the line pinned here.
      expect(spendingBasisLine(reading.spendingBasis), row.key).toBe(row.rendered)
    })
  }
})

describe('the identity pin on every dev household with a survivor phase (pure — no run)', () => {
  const offsetsOf = (p: SimulationParams): PersonOffsets[] =>
    p.people.map((x) => ({
      retire: x.retirementAge - x.currentAge,
      claim: x.socialSecurityClaimAge - x.currentAge,
      earnedIncomeReal: x.earnedIncomeReal,
      socialSecurityReal: 0,
      spousalExcessAnnual: 0,
    }))

  for (const row of ROWS) {
    it(`${row.key}: the basis is cashTermsForYear’s own spend at t = 0 (a year-0 death, either spouse; both alive), the couple figure is annualSpendingReal / 12, and every survivor year spends the same`, () => {
      const p = spineParams(row.draft(), row.key)
      expect(p.people).toHaveLength(2)
      expect(p.longevityMode).toBe('sampled')
      const o = offsetsOf(p)
      const far = p.maxHorizonYears + 5
      const basis = survivorSpendingBasis(p, o, 0, p.maxHorizonYears)
      const spend = (t: number, deaths: readonly number[]) => cashTermsForYear(t, p, o, deaths, 0).spendingReal / 12
      expect(Object.is(basis.survivorMonthlyReal, spend(0, [0, far]))).toBe(true)
      expect(Object.is(basis.survivorMonthlyReal, spend(0, [far, 0]))).toBe(true)
      expect(Object.is(basis.coupleMonthlyReal, spend(0, [far, far]))).toBe(true)
      expect(Object.is(basis.coupleMonthlyReal, p.annualSpendingReal / 12), 'the reconciliation invariant').toBe(true)
      // No card-bearing household is ramped, so the year-0 figure is the spend of EVERY survivor year (measured
      // "constant across the horizon on every seed" — pinned here at the cash seam), and the engine says so.
      expect(basis.steady, `${row.key}: steady`).toBe(true)
      for (let t = 0; t < p.maxHorizonYears; t++) {
        expect(Object.is(spend(t, [0, far]), basis.survivorMonthlyReal), `${row.key} t ${t}`).toBe(true)
      }
    })
  }
})
