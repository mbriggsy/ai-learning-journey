/**
 * THE PRICING WITNESS — the gate that makes a forgotten `ENGINE_PRICING_LEDGER` row LOUD (the
 * engine-domain council, 2026-09-27, Q5).
 *
 * A DRIFT DETECTOR, NOT A CORRECTNESS GOLDEN. Nothing here says any figure is RIGHT: the digests below
 * were pinned from the tree as it stood when the ledger shipped, and they prove only that the pricers'
 * outputs have not MOVED since. Correctness oracles live where DND 012 puts them — externally-derived
 * fixtures in each pricer's own test file (taxOverlay / stateTax / healthOverlay / medicarePricing /
 * frozenNominalDeflation …). A green digest here is never evidence a number is correct, and a red one is
 * never evidence it is wrong: it is evidence it CHANGED, and a changed price reaches every saved vault's
 * recompute — which the U13 honesty spine says may never happen with no note.
 *
 * HOW: per `PricingFamily`, a fixed probe grid runs through that family's EXPORTED PURE PRICERS only;
 * every output is quantized to WHOLE DOLLARS (`Math.round` — a sub-dollar float wobble is not a price
 * change) and folded into a djb2 digest (the `vintageStamps.test.ts` pattern). Each family's digest is
 * pinned beside the NEWEST ledger version that declares the family (`atVersion`; 0 when no row has yet —
 * `aca` today). A pricer change therefore reds here unless the SAME change appends a ledger row declaring
 * the family AND re-pins the digest at that row's version.
 *
 * THE CONTRIBUTIONS PROBE READS `@intake/sanity`: the per-runway-year contribution ceiling (the HSA
 * catch-up erosion, ledger v6) is intake-layer code the accumulation stream builder calls. ESLint's
 * layer ban exempts every `__tests__/` directory (`eslint.config.js` TEST_IGNORES), so the probe lives
 * here with its five siblings rather than in a second witness file. The ACA probe reads the intake
 * quote escalator for the same reason — it is how a saved marketplace quote maps into run params.
 *
 * THE SPENDING PROBE (ledger v11, the 2026-10-08 survivor-medical lean) reads `cashTermsForYear` — the
 * engine's exported, pure per-year cash seam — on an income-free couple, so each output IS the year's
 * spend: the couple years, and the survivor years with the entered out-of-pocket medical absent, 0,
 * inside S, and above S (the clamp). Its pin is the family's first; a planted pre-v11 composition (M
 * ignored) moves it 3,410,359,151 → 2,319,140,495, so the grid sees the change the row records.
 *
 * THE WORKING-YEAR FLOOR PROBES (ledger v12, 2026-10-20). The `tax` grid gained the floor's two exported
 * helpers (`prepareWorkingYearFloor` + `workingYearFederalCharge`, the exact calls the gross-up makes in a
 * §7-clamped year) over B, I, SS and the portfolio's own income, with the floor-ABSENT figure beside them;
 * the `stateTax` grid gained the wage axis (`clampedOrdinaryBase`) and the floor's state charge. When v12
 * appended, both pins read `'row-unpinned'` with the digest UNMOVED — the old grids could not see the
 * floor — so the grids were widened, not the pins merely bumped. The pre-v12 probes are kept as a
 * verbatim slice that still digests to the v6 pins (the floor is additive), and a "floor ignored" mutant
 * (the helper handed B = 0, or I = 0, or a zero wage) is kept as an arm that must move each digest.
 *
 * CROSS-ENGINE GUARD: every pricer here is basic IEEE arithmetic (no transcendental), but a probe value
 * whose fractional part sat within 1e-4 of .5 would still round on a knife edge. One arm asserts no
 * probe output does, so a CI Linux run can never flip a digest a Windows run pinned.
 *
 * WHAT IT CANNOT SEE (so no one reads a green run as total): only these pure pricers are probed. A change
 * in how they are COMPOSED — the tax overlay's gross-up fixed point (including WHICH years carry a
 * working-year floor, and the B / I `simulate.cashTermsForYear` hands it), the IRMAA two-year lag and survivor
 * filing flip, the RMD path, or `intakeMap`'s draft → params mapping beyond the quote escalator — can move
 * a saved household's recompute with every digest here unmoved. The ledger's append discipline still
 * binds those changes; this gate simply cannot enforce it for them.
 */
import { describe, expect, it } from 'vitest'
import { ENGINE_PRICING_LEDGER, type PricingFamily, type PricingLedgerRow } from '@engine/pricingVersion'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { deductionStack, ordinaryIncomeTax, ordinaryPlusCapitalGainsTax, taxableSocialSecurity } from '@engine/taxCore'
import { stateIncomeTax, type StateTaxYearContext } from '@engine/stateTax'
import {
  boundPartBPricingSchedule,
  fplForHousehold,
  irmaaBillScalesFor,
  irmaaScheduleAsCompared,
  irmaaTierSurchargeMonthly,
  medicareAnnualCost,
  slidingScalePtc,
  solveAcaFundedGross,
  type GrossUpSolution,
} from '@engine/healthOverlay'
import { nextIrmaaStep } from '@engine/magiLandscape'
import { acaApplicablePercentage, acaApplicablePercentageEnhanced, irmaa, PRICED_STATES } from '@engine/constants'
import { ACCOUNT_KINDS, FILING_STATUSES, type FilingStatus, type MarketAssumptions, type PersonInputs, type SimulationParams } from '@shared/model'
import { cashTermsForYear } from '@engine/simulate'
import { prepareWorkingYearFloor, workingYearFederalCharge, workingYearStateCharge } from '@engine/taxOverlay'
import { annualAdditionsCeilingFor, contributionCeilingInYear } from '@intake/sanity'
import { escalateQuote } from '@intake/intakeMap'

// =============================================================================================
// The probe grids — one per family. Each `run` returns labelled RAW outputs (labels feed the guard's
// messages, never the digest); `perturb` nudges ONE probe input for the non-vacuity arm.
// =============================================================================================

type Probed = ReadonlyArray<readonly [label: string, raw: number]>
interface FamilyProbe<G> {
  readonly grid: G
  readonly run: (g: G) => Probed
  /** One probe input moved — the family's digest must move with it (else its probes are blind). */
  readonly perturb: (g: G) => G
}
/** Erase the grid type so the six probes share one Record (no `any`). */
interface ErasedProbe {
  readonly values: () => Probed
  readonly perturbedValues: () => Probed
}
const erase = <G,>(p: FamilyProbe<G>): ErasedProbe => ({
  values: () => p.run(p.grid),
  perturbedValues: () => p.run(p.perturb(p.grid)),
})
/** A null (uncapped / no-step) answer, as a whole-dollar sentinel that no real price takes. */
const NONE = -1

// ── tax: the deduction stack (+ the windowed, deflated, per-person senior bonus), §86 SS taxation
//    (deflated thresholds), ordinary tax, ordinary + LTCG — and (ledger v12) the working-year tax
//    floor's two exported helpers, with the floor-absent figure beside them ────────────────────────
/** The working-year tax floor's probe (ledger v12, 2026-10-20): `prepareWorkingYearFloor` +
 *  `workingYearFederalCharge` — the exact helpers `solveGrossWithdrawal` calls in a §7-clamped year —
 *  over the outside income B (taxable pay + clamped ongoing taxable) and I (entered working-year
 *  investment income, the three readings), beside SS and the portfolio's own ordinary / gain income P.
 *  The floor-ABSENT figure (the gross-up's own pre-floor expression, T(P, ss)) rides the digest too: it
 *  is the control the B = I = 0 corner must reproduce bit for bit (R3 — the arm below). */
interface FloorGrid {
  readonly years: readonly number[]
  readonly ss: readonly number[]
  /** B — the outside ordinary base. */
  readonly bases: readonly number[]
  /** I — the entered working-year investment income. */
  readonly investments: readonly number[]
  /** P — what the portfolio supplies: [ordinary (RMD/draw/conversion), realized gain]. */
  readonly portfolio: ReadonlyArray<readonly [ordinary: number, gain: number]>
}
interface TaxGrid {
  readonly years: readonly number[]
  readonly magis: readonly number[]
  readonly ssOther: readonly number[]
  readonly ssBenefit: readonly number[]
  readonly ordinary: readonly number[]
  readonly gains: readonly number[]
  readonly floor: FloorGrid
}
const count65sFor = (filing: FilingStatus): readonly number[] => (filing === 'mfj' ? [0, 1, 2] : [0, 1])
/** The gross-up's floor-ABSENT federal expression — the §86 provisional over ordinary + gain, the taxable
 *  SS added to the ordinary base, the gain stacked on top (`taxOverlay.federalTaxBesideSs`'s order of
 *  operations, which is module-private; re-composed here from the same exported pricers). */
const floorAbsentTax = (ordinary: number, gain: number, ss: number, filing: FilingStatus, c: number, y: number): number =>
  ordinaryPlusCapitalGainsTax(ordinary + taxableSocialSecurity(ordinary + gain, ss, filing, y), gain, filing, c, y)
/** The pre-v12 tax probes, VERBATIM — kept as their own slice so the arm below can prove the floor is
 *  purely additive: this slice still digests to the v6 pin. */
const taxLegacyProbes = (g: TaxGrid): Probed => {
  const out: Array<readonly [string, number]> = []
  for (const filing of FILING_STATUSES) {
    for (const y of g.years) {
      for (const c of count65sFor(filing)) {
        for (const m of g.magis) out.push([`deductionStack ${filing} ${c}×65 magi ${m} ${y}`, deductionStack(filing, c, m, y)])
        for (const o of g.ordinary) out.push([`ordinaryIncomeTax ${filing} ${c}×65 ${o} ${y}`, ordinaryIncomeTax(o, filing, c, y)])
        for (const o of g.ordinary.slice(0, 3)) {
          for (const gain of g.gains) {
            out.push([`ordinary+LTCG ${filing} ${c}×65 ${o}+${gain} ${y}`, ordinaryPlusCapitalGainsTax(o, gain, filing, c, y)])
          }
        }
      }
      for (const o of g.ssOther) {
        for (const b of g.ssBenefit) out.push([`taxableSS ${filing} other ${o} benefit ${b} ${y}`, taxableSocialSecurity(o, b, filing, y)])
      }
    }
  }
  return out
}
/** The floor probes. `outsideFor` is the seam the planted "floor ignored" mutant is recorded through
 *  (the B the helper is handed) — identity here. */
const taxFloorProbes = (
  f: FloorGrid,
  outsideFor: (b: number, i: number) => { ordinaryBase: number; investmentIncome: number } = (b, i) => ({ ordinaryBase: b, investmentIncome: i }),
): Probed => {
  const out: Array<readonly [string, number]> = []
  for (const filing of FILING_STATUSES) {
    for (const y of f.years) {
      for (const c of count65sFor(filing)) {
        for (const ss of f.ss) {
          for (const [po, pg] of f.portfolio) {
            out.push([`floor-absent ${filing} ${c}×65 ss ${ss} P ${po}+${pg} ${y}`, floorAbsentTax(po, pg, ss, filing, c, y)])
          }
          for (const b of f.bases) {
            for (const i of f.investments) {
              const floor = prepareWorkingYearFloor(outsideFor(b, i), { ssBenefit: ss, filing, count65: c, calendarYear: y, minLivingAge: 60 })
              for (const [po, pg] of f.portfolio) {
                const charge = workingYearFederalCharge(floor, po, pg)
                const at = `${filing} ${c}×65 ss ${ss} B ${b} I ${i} P ${po}+${pg} ${y}`
                out.push([`floor tax ${at}`, charge.tax])
                out.push([`floor ssTaxable ${at}`, charge.ssTaxable])
              }
            }
          }
        }
      }
    }
  }
  return out
}
/** The tax inputs carry ODD CENTS on purpose: round-dollar inputs × the statutory rates (10/12/15/22/
 *  24/32/35/37 %, the 6 % phase-out, the 50/85 % SS inclusions) land EXACTLY on $x.50 — 75 such probe
 *  outputs in the first cut — which the cross-engine guard below refuses. Exact is not the hazard
 *  (IEEE basic arithmetic is identical everywhere), but a digest is only as robust as its most
 *  knife-edged value, so the grid is moved off the edge rather than the guard relaxed. The floor grid
 *  follows the same rule; its years straddle the senior-bonus window (2027 in, 2030 out) and a deflated
 *  §86 year (2041), its B values both sides of the deduction and across brackets, its I values the
 *  `dip`-scale and a gain-dominant one, its P values a conversion, a mixed draw and a large RMD. Its
 *  large SS value carries a tax of its own (T(0, ss) > 0) in the deflated years, where the floor's
 *  EXACTNESS branch is what keeps the B = I = 0 corner bit-exact — the control arm below reads it. */
const TAX: FamilyProbe<TaxGrid> = {
  grid: {
    years: [2025, 2026, 2027, 2028, 2029, 2031, 2036, 2046, 2061],
    magis: [0, 70_003.17, 150_011.29, 180_023.41, 230_037.53, 260_049.67, 320_061.79, 500_073.91],
    ssOther: [0, 9_011.23, 21_029.61, 33_041.07, 47_059.87, 80_071.53],
    ssBenefit: [0, 18_017.19, 37_023.47, 61_031.67],
    ordinary: [20_013.37, 60_047.11, 120_089.73, 250_131.19, 600_173.83],
    gains: [0, 40_021.29, 150_067.41],
    floor: {
      years: [2026, 2027, 2030, 2041],
      ss: [0, 31_013.29, 143_013.29],
      bases: [0, 21_011.37, 102_003.67, 251_029.13],
      investments: [0, 10_007.23, 80_011.59],
      portfolio: [
        [0, 0],
        [34_001.19, 0],
        [12_003.31, 7_009.87],
        [90_021.53, 0],
      ],
    },
  },
  run: (g) => [...taxLegacyProbes(g), ...taxFloorProbes(g.floor)],
  perturb: (g) => ({ ...g, magis: g.magis.map((m) => (m === 150_011.29 ? 151_011.29 : m)) }),
}

// ── stateTax: the three priced profiles (NC deflated deduction + stepped rate, PA's class base and
//    59½ gate, FL's structural zero) ───────────────────────────────────────────────────────────────
type StateChannels = Pick<StateTaxYearContext, 'pretaxDistribution' | 'conversion' | 'ongoingTaxable' | 'realizedGain' | 'ssBenefitTaxable'>
interface StateGrid {
  readonly years: readonly number[]
  readonly ages: readonly number[]
  readonly channels: readonly StateChannels[]
  /** The working-year floor's WAGE axis (ledger v12): `clampedOrdinaryBase` — a clamped year's outside
   *  ordinary income B + I, which NC's AGI-derived base takes and PA / FL ignore structurally. The
   *  ABSENT value is the legacy slice above it (kept verbatim). */
  readonly wages: readonly number[]
  /** The floor's state half (`workingYearStateCharge`): [B, I] pairs, at a subset of the years. */
  readonly floorOutside: ReadonlyArray<readonly [b: number, i: number]>
  readonly floorYears: readonly number[]
}
/** The pre-v12 state probes, VERBATIM (the channel grid with no wage) — the slice the arm below proves
 *  still digests to the v6 pin. */
const stateLegacyProbes = (g: StateGrid): Probed => {
  const out: Array<readonly [string, number]> = []
  for (const state of PRICED_STATES) {
    for (const filing of FILING_STATUSES) {
      for (const calendarYear of g.years) {
        for (const minLivingAge of g.ages) {
          g.channels.forEach((ch, i) => {
            out.push([
              `stateIncomeTax ${state} ${filing} ${calendarYear} age ${minLivingAge} channels#${i}`,
              stateIncomeTax({ state, filing, calendarYear, minLivingAge, ...ch }),
            ])
          })
        }
      }
    }
  }
  return out
}
/** The wage axis and the floor's state charge. `wageFor` is the planted-mutant seam (the base the
 *  pricer is handed) — identity here. */
const stateWageProbes = (g: StateGrid, wageFor: (w: number) => number = (w) => w): Probed => {
  const out: Array<readonly [string, number]> = []
  for (const state of PRICED_STATES) {
    for (const filing of FILING_STATUSES) {
      for (const calendarYear of g.years) {
        for (const minLivingAge of g.ages) {
          g.channels.forEach((ch, i) => {
            for (const w of g.wages) {
              out.push([
                `stateIncomeTax ${state} ${filing} ${calendarYear} age ${minLivingAge} channels#${i} wage ${w}`,
                stateIncomeTax({ state, filing, calendarYear, minLivingAge, ...ch, clampedOrdinaryBase: wageFor(w) }),
              ])
            }
          })
        }
      }
      for (const calendarYear of g.floorYears) {
        for (const [b, i] of g.floorOutside) {
          const floor = prepareWorkingYearFloor(
            { ordinaryBase: wageFor(b), investmentIncome: i },
            { ssBenefit: 0, filing, count65: 0, calendarYear, pricedState: state, minLivingAge: 58 },
          )
          g.channels.forEach((ch, k) => {
            out.push([`workingYearStateCharge ${state} ${filing} ${calendarYear} B ${b} I ${i} channels#${k}`, workingYearStateCharge(floor, ch)])
          })
        }
      }
    }
  }
  return out
}
const STATE_TAX: FamilyProbe<StateGrid> = {
  grid: {
    years: [2026, 2027, 2029, 2030, 2033, 2040, 2055],
    ages: [58, 60, 72],
    channels: [
      { pretaxDistribution: 0, conversion: 0, ongoingTaxable: 0, realizedGain: 0, ssBenefitTaxable: 0 },
      { pretaxDistribution: 38_000, conversion: 0, ongoingTaxable: 0, realizedGain: 0, ssBenefitTaxable: 29_000 },
      { pretaxDistribution: 91_000, conversion: 0, ongoingTaxable: 13_000, realizedGain: 0, ssBenefitTaxable: 0 },
      { pretaxDistribution: 38_000, conversion: 47_000, ongoingTaxable: 0, realizedGain: 21_000, ssBenefitTaxable: 29_000 },
      { pretaxDistribution: 0, conversion: 47_000, ongoingTaxable: 0, realizedGain: 0, ssBenefitTaxable: 0 },
      { pretaxDistribution: 0, conversion: 0, ongoingTaxable: 13_000, realizedGain: 21_000, ssBenefitTaxable: 0 },
      { pretaxDistribution: 11_000, conversion: 0, ongoingTaxable: 0, realizedGain: 0, ssBenefitTaxable: 0 },
      { pretaxDistribution: 91_000, conversion: 47_000, ongoingTaxable: 13_000, realizedGain: 21_000, ssBenefitTaxable: 29_000 },
    ],
    // Both sides of NC's (deflated) $25,500 MFJ / $12,750 single deduction, and a large wage.
    wages: [0, 9_013.41, 41_007.29, 150_019.83],
    floorOutside: [
      [0, 0],
      [9_013.41, 0],
      [102_003.67, 10_007.23],
    ],
    floorYears: [2026, 2030, 2040],
  },
  run: (g) => [...stateLegacyProbes(g), ...stateWageProbes(g)],
  perturb: (g) => ({ ...g, channels: g.channels.map((c, i) => (i === 1 ? { ...c, pretaxDistribution: 39_000 } : c)) }),
}

// ── medicare: the IRMAA lines AS COMPARED (the price frame + growth base), the step function straddling
//    each line, the Part B / Part D trend schedule, the full annual cost, the step card's crossing ──────
interface MedicareGrid {
  readonly lineYears: readonly [number, number]
  readonly straddleYears: readonly number[]
  readonly scheduleStarts: readonly number[]
  readonly horizon: number
  readonly costYears: readonly number[]
  readonly costMagis: readonly number[]
  readonly stepYears: readonly number[]
  readonly stepMagis: readonly number[]
}
const MEDICARE: FamilyProbe<MedicareGrid> = {
  grid: {
    lineYears: [2023, 2045],
    straddleYears: [2024, 2026, 2027, 2029, 2033, 2040, 2045],
    scheduleStarts: [2024, 2029],
    horizon: 40,
    costYears: [2026, 2030, 2040],
    costMagis: [80_000, 230_000, 800_000],
    stepYears: [2026, 2028, 2035],
    stepMagis: [50_000, 150_000, 300_000, 450_000],
  },
  run: (g) => {
    const out: Array<readonly [string, number]> = []
    const schedule = irmaa.value
    // (1) Every tier's single + MFJ line, every MAGI year, plus one $100k-nominal of that year in real $.
    for (let y = g.lineYears[0]; y <= g.lineYears[1]; y++) {
      const compared = irmaaScheduleAsCompared(schedule, y)
      compared.tiers.forEach((t, k) => {
        out.push([`IRMAA line tier${k + 1} single MAGI ${y}`, t.singleMagiThreshold])
        out.push([`IRMAA line tier${k + 1} mfj MAGI ${y}`, t.mfjMagiThreshold])
      })
      out.push([`$100k nominal in real $ MAGI ${y}`, 100_000 * compared.oneNominalDollarReal])
    }
    // (2) The per-person surcharge (annual) one real dollar under, ON, and one over every line.
    for (const y of g.straddleYears) {
      const compared = irmaaScheduleAsCompared(schedule, y)
      const scales = irmaaBillScalesFor(compared)
      for (const filing of FILING_STATUSES) {
        compared.tiers.forEach((t, k) => {
          const line = filing === 'mfj' ? t.mfjMagiThreshold : t.singleMagiThreshold
          for (const d of [-1, 0, 1]) {
            out.push([
              `surcharge ${filing} tier${k + 1} line${d >= 0 ? '+' : ''}${d} MAGI ${y}`,
              12 * irmaaTierSurchargeMonthly(line + d, filing, compared, scales),
            ])
          }
        })
      }
    }
    // (3) The bound Part B schedule: base (annual) and every surcharge scale (per $100k), 40 years.
    for (const start of g.scheduleStarts) {
      boundPartBPricingSchedule(start, g.horizon).forEach((p, t) => {
        out.push([`Part B base annual ${start}+${t}`, 12 * p.baseMonthlyReal])
        out.push([`Part B scale ×100k ${start}+${t}`, 100_000 * p.scales.partB])
        p.scales.partDByTier.forEach((s, k) => out.push([`Part D tier${k + 1} scale ×100k ${start}+${t}`, 100_000 * s]))
      })
    }
    // (4) The full annual Medicare cost at the bill year's base + scales, one and two enrolled.
    for (const y of g.costYears) {
      const compared = irmaaScheduleAsCompared(schedule, y)
      const bill = boundPartBPricingSchedule(y + compared.magiLookbackYears, 1)[0]!
      for (const filing of FILING_STATUSES) {
        for (const m of g.costMagis) {
          for (const n of [1, 2]) {
            out.push([
              `medicareAnnualCost ${filing} MAGI ${m} (${y}) ×${n}`,
              medicareAnnualCost(m, filing, n, compared, bill.baseMonthlyReal, bill.scales),
            ])
          }
        }
      }
    }
    // (5) The step card's next line + its crossing price at the bill year's scales (ledger v9).
    for (const y of g.stepYears) {
      const compared = irmaaScheduleAsCompared(schedule, y)
      const scales = irmaaBillScalesFor(compared)
      for (const filing of FILING_STATUSES) {
        for (const m of g.stepMagis) {
          const step = nextIrmaaStep(m, filing, compared, scales)
          out.push([`next step line ${filing} MAGI ${m} (${y})`, step === null ? NONE : step.threshold])
          out.push([`next step crossing annual ${filing} MAGI ${m} (${y})`, step === null ? NONE : 12 * step.surchargeDeltaMonthlyPerPerson])
        }
      }
    }
    return out
  },
  perturb: (g) => ({ ...g, costMagis: g.costMagis.map((m) => (m === 230_000 ? 290_000 : m)) }),
}

// ── aca: the poverty line, the cliff-removed PTC over both tables, the self-consistent premium solve
//    (a synthetic, monotone gross-up), and the intake quote escalator (age-rated, staggered exits) ──────
interface AcaGrid {
  readonly sizes: readonly number[]
  readonly fplFractions: readonly number[]
  readonly slcsps: readonly number[]
  readonly baseNets: readonly number[]
  readonly enrolleds: readonly number[]
  readonly ssFull: readonly number[]
  readonly quotes: readonly number[]
  readonly ageSets: ReadonlyArray<readonly number[]>
}
const TABLES = [
  ['reverted', acaApplicablePercentage.value],
  ['enhanced', acaApplicablePercentageEnhanced.value],
] as const
/** A synthetic inner gross-up (a flat 22 % tax wedge): monotone in the net, which is all the solver's
 *  bisection assumes — the witness pins the SOLVER's pricing, not the tax overlay's. */
const syntheticFundNet =
  (ssFull: number) =>
  (net: number): GrossUpSolution => {
    const gross = net / 0.78
    return { gross, components: { nonSSordinary: gross, realizedGain: 0, ssBenefitFull: ssFull, ssBenefitTaxable: 0 } }
  }
const ACA: FamilyProbe<AcaGrid> = {
  grid: {
    sizes: [1, 2, 3, 4, 5, 6],
    fplFractions: [0.9, 1.1, 1.4, 1.75, 2.2, 2.7, 3.4, 3.9, 4.3, 5.5],
    slcsps: [11_300, 24_700],
    baseNets: [20_000, 40_000, 65_000],
    enrolleds: [18_000, 30_000],
    ssFull: [0, 24_000],
    quotes: [1_430, 2_260],
    ageSets: [[60, 58], [63], [45, 41], [64, 66], [30, 12]],
  },
  run: (g) => {
    const out: Array<readonly [string, number]> = []
    for (const n of g.sizes) out.push([`fplForHousehold ${n}`, fplForHousehold(n)])
    for (const [name, table] of TABLES) {
      for (const n of [1, 2, 4]) {
        const fpl = fplForHousehold(n)
        for (const f of g.fplFractions) {
          for (const slcsp of g.slcsps) out.push([`PTC ${name} size ${n} ${f}×FPL slcsp ${slcsp}`, slidingScalePtc(f * fpl, slcsp, fpl, table)])
        }
      }
      const fpl2 = fplForHousehold(2)
      for (const baseNet of g.baseNets) {
        for (const enrolled of g.enrolleds) {
          for (const ss of g.ssFull) {
            const s = solveAcaFundedGross(baseNet, 22_000, enrolled, fpl2, table, syntheticFundNet(ss))
            const at = `${name} net ${baseNet} enrolled ${enrolled} ss ${ss}`
            out.push([`ACA solve gross ${at}`, s.gross])
            out.push([`ACA solve netPremium ${at}`, s.netPremium])
            out.push([`ACA solve ptc ${at}`, s.ptc])
            out.push([`ACA solve magi ${at}`, s.magi])
            out.push([`ACA solve flags ${at}`, (s.overCliff ? 2 : 0) + (s.belowFloor ? 1 : 0)])
          }
        }
      }
    }
    for (const q of g.quotes) {
      for (const ages of g.ageSets) {
        escalateQuote(q, ages, 12).forEach((v, t) => out.push([`escalateQuote ${q}/mo ages ${ages.join('+')} t${t}`, v]))
      }
    }
    return out
  },
  perturb: (g) => ({ ...g, slcsps: g.slcsps.map((s) => (s === 24_700 ? 25_700 : s)) }),
}

// ── contributions: the per-runway-year ceiling (the HSA catch-up erosion) across every kind, and the
//    §415(c) annual-additions ceiling ───────────────────────────────────────────────────────────────
interface ContributionGrid {
  readonly ages: readonly number[]
  readonly years: readonly number[]
}
const CONTRIBUTIONS: FamilyProbe<ContributionGrid> = {
  grid: {
    ages: [30, 49, 50, 54, 55, 58, 60, 62, 63, 64, 67],
    // NOT 2036: the age-55 HSA ceiling there is $9,485.500154 — 1.5e-4 off the rounding edge, inside
    // any sane margin even though outside the guard's 1e-4. Moved a year rather than trusted.
    years: [2026, 2027, 2030, 2035, 2050],
  },
  run: (g) => {
    const out: Array<readonly [string, number]> = []
    for (const kind of ACCOUNT_KINDS) {
      for (const age of g.ages) {
        for (const y of g.years) out.push([`ceiling ${kind} age ${age} ${y}`, contributionCeilingInYear(kind, age, y) ?? NONE])
      }
    }
    for (const age of g.ages) out.push([`§415(c) additions age ${age}`, annualAdditionsCeilingFor(age)])
    return out
  },
  // An AGE nudge (49 → 51 crosses the age-50 catch-up), not a year: a year nudge reaches only the HSA
  // erosion, so a year-flat ceiling (the erosion removed) would leave it blind — observed under mutant.
  perturb: (g) => ({ ...g, ages: g.ages.map((a) => (a === 49 ? 51 : a)) }),
}

// ── spending: how a household's spend figure maps into the per-year spend the engine funds — the
//    budgetless survivor composition (ledger v11, the 2026-10-08 survivor-medical lean), probed
//    through the exported pure `cashTermsForYear` (the wired composition, not only its helper) on an
//    income-free couple, so `net` IS the year's spend ──────────────────────────────────────────────
interface SpendingGrid {
  readonly spends: readonly number[]
  readonly ratios: readonly number[]
  /** `undefined` = the field absent (the pre-v11 ratio-on-total path, kept in the grid on purpose). */
  readonly oops: readonly (number | undefined)[]
}
const SPENDING_PERSON: PersonInputs = {
  sex: 'male',
  currentAge: 70,
  birthYear: 1956,
  retirementAge: 65,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
}
const SPENDING_MARKET: MarketAssumptions = {
  stock: { mean: 0.05, stdDev: 0.17 },
  bond: { mean: 0.018, stdDev: 0.06 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0.1,
  space: 'simple',
  returnsAreReal: true,
}
/** No income of any kind ⇒ `net = max(0, spending − 0 − 0 − 0)` = the year's spend, exactly. */
const SPENDING_OFFSETS = [0, 1].map(() => ({ retire: -5, claim: -3, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 }))
/** [label, deathOffsets] at t = 5: both alive, then either spouse gone (the survivor year). */
const SPENDING_PHASES: ReadonlyArray<readonly [string, readonly number[]]> = [
  ['both alive', [50, 50]],
  ['survivor (first died t3)', [3, 50]],
  ['survivor (second died t3)', [50, 3]],
]
const SPENDING: FamilyProbe<SpendingGrid> = {
  grid: {
    spends: [41_003.17, 78_011.29, 120_029.53],
    ratios: [0.6, 0.75, 0.9, 1],
    // The last entry exceeds every spend: the m = min(M, S) clamp is inside the grid.
    oops: [undefined, 0, 2_017.47, 4_003.07, 9_041.23, 150_000.37],
  },
  run: (g) => {
    const out: Array<readonly [string, number]> = []
    for (const S of g.spends) {
      for (const r of g.ratios) {
        for (const M of g.oops) {
          const params: SimulationParams = {
            initialPortfolio: 1_000_000,
            annualSpendingReal: S,
            stockWeight: 0.5,
            people: [SPENDING_PERSON, { ...SPENDING_PERSON, sex: 'female' }],
            survivorSpendingRatio: r,
            ...(M !== undefined ? { survivorOopMedicalReal: M } : {}),
            drawdownPolicy: 'proportional',
            market: SPENDING_MARKET,
            paths: 1,
            maxHorizonYears: 50,
            longevityMode: 'sampled',
          }
          for (const [phase, deaths] of SPENDING_PHASES) {
            out.push([`spend S ${S} r ${r} M ${String(M)} ${phase}`, cashTermsForYear(5, params, SPENDING_OFFSETS, deaths, 0).net])
          }
        }
      }
    }
    return out
  },
  // An M nudge: a probe grid that never read M (the v11 composition removed) would leave it unmoved.
  perturb: (g) => ({ ...g, oops: g.oops.map((m) => (m === 4_003.07 ? 4_503.07 : m)) }),
}

const PROBES: Readonly<Record<PricingFamily, ErasedProbe>> = {
  tax: erase(TAX),
  stateTax: erase(STATE_TAX),
  medicare: erase(MEDICARE),
  aca: erase(ACA),
  contributions: erase(CONTRIBUTIONS),
  spending: erase(SPENDING),
}
const FAMILIES = Object.keys(PROBES) as readonly PricingFamily[]

// =============================================================================================
// The digest + the checker.
// =============================================================================================

/** Whole dollars, finiteness first (a NaN would round to NaN and JSON-serialize as null — silent). */
const wholeDollars = (p: Probed): number[] =>
  p.map(([label, raw]) => {
    if (!Number.isFinite(raw)) throw new Error(`[pricingWitness] non-finite probe output at ${label}: ${raw}`)
    return Math.round(raw)
  })

/** djb2 over the JSON of the quantized outputs (the vintageStamps.test.ts pattern). */
export function witnessDigest(p: Probed): number {
  const s = JSON.stringify(wholeDollars(p))
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h
}

/** The newest ledger version declaring `family` — 0 when no row ever has. */
export function latestVersionDeclaring(family: PricingFamily, ledger: readonly PricingLedgerRow[]): number {
  return ledger.reduce((v, r) => (r.families.includes(family) ? Math.max(v, r.version) : v), 0)
}

export interface WitnessPin {
  readonly atVersion: number
  readonly digest: number
}
export type WitnessVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'digest-moved' | 'row-unpinned' | 'pin-ahead'; readonly message: string }

/**
 * THE CONTRACT, as one pure decision: a family's computed digest must equal its pin, AND the pin must sit
 * at the newest ledger row declaring the family. The two halves move TOGETHER or not at all:
 *   · digest moved, no new row                → 'digest-moved' (the forgotten row — the reason this exists);
 *   · a new row declares it, pin not re-pinned → 'row-unpinned' (whether or not the digest moved);
 *   · a pin claiming a version no row declares → 'pin-ahead'.
 * What it CANNOT see is a digest re-pinned alone at the same `atVersion` — that edit lives in this file,
 * and only the failure message (and review) stands between it and a silent recompute.
 */
export function checkWitness(
  family: PricingFamily,
  computed: number,
  pinned: WitnessPin,
  ledger: readonly PricingLedgerRow[],
): WitnessVerdict {
  const latest = latestVersionDeclaring(family, ledger)
  if (pinned.atVersion > latest) {
    return {
      ok: false,
      reason: 'pin-ahead',
      message: `The ${family} witness is pinned at v${pinned.atVersion}, but the newest ENGINE_PRICING_LEDGER row declaring ${family} is v${latest}. A pin never runs ahead of the ledger.`,
    }
  }
  if (pinned.atVersion < latest) {
    return {
      ok: false,
      reason: 'row-unpinned',
      message:
        `ENGINE_PRICING_LEDGER v${latest} declares ${family}, but its witness is still pinned at v${pinned.atVersion}. ` +
        `Re-pin PINNED.${family} at { atVersion: ${latest}, digest: ${computed} }. ` +
        (computed === pinned.digest
          ? `The digest did NOT move — either the row over-declares ${family} (a line naming a change the household may not have) or this probe grid cannot see the change: widen the grid until it does.`
          : `The digest moved with the row — the expected case.`),
    }
  }
  if (computed !== pinned.digest) {
    return {
      ok: false,
      reason: 'digest-moved',
      message:
        `An engine pricer's output moved for family ${family} (digest ${pinned.digest} → ${computed}) with no new ENGINE_PRICING_LEDGER row declaring it. ` +
        `Append a row (src/engine/pricingVersion.ts) declaring ${family} — and bump SOLVER_CODE_VERSION if the family is scored — THEN re-pin this digest at the new version. ` +
        `Never re-pin alone: a saved household would recompute a different answer with no note. ` +
        `(The one exception, per the ledger's header: a CONSTANTS change whose vintage stamp moved in the same commit is the vintage clocks' disclosure — re-pin at the same atVersion and say so in the commit.)`,
    }
  }
  return { ok: true }
}

/**
 * THE PINS — the baseline, computed from the tree the ledger shipped with (ledger v10, 2026-09-27;
 * the `spending` family first pinned at ledger v11, 2026-10-09; `tax` and `stateTax` re-pinned at ledger
 * v12, 2026-10-20, the working-year tax floor). `atVersion` = the newest row declaring the family
 * (`aca`: none yet). Re-pin ONLY as `checkWitness`'s message prescribes.
 */
const PINNED: Readonly<Record<PricingFamily, WitnessPin>> = {
  // v12 (the working-year tax floor): the grids GREW (the floor helpers; the wage axis) — the pre-v12
  // probes are a verbatim slice that still digests to the v6 pins below ({@link PRE_FLOOR_PINS}).
  tax: { atVersion: 12, digest: 934_978_903 },
  stateTax: { atVersion: 12, digest: 556_955_509 },
  medicare: { atVersion: 10, digest: 412_678_172 },
  aca: { atVersion: 0, digest: 2_928_507_043 },
  contributions: { atVersion: 6, digest: 2_046_752_883 },
  // NEW at ledger v11 (the survivor-medical lean) — the family's first pin, so no prior digest.
  spending: { atVersion: 11, digest: 3_410_359_151 },
}

/** The `tax` / `stateTax` pins as they stood before ledger v12 — the digest of each family's LEGACY
 *  slice (the probes that existed then, verbatim). Two arms read them: the floor is purely ADDITIVE
 *  (every pre-floor pricer output is byte-identical — R5), and against the shipped ledger these pins
 *  read `'row-unpinned'` (v12 declares both families, so they could never have stayed). */
const PRE_FLOOR_PINS = {
  tax: { atVersion: 6, digest: 16_675_659 },
  stateTax: { atVersion: 6, digest: 612_050_713 },
} as const satisfies Partial<Record<PricingFamily, WitnessPin>>

// =============================================================================================
// The arms.
// =============================================================================================

describe('the pricing witness — a moved pricer with no ledger row is LOUD', () => {
  it.each(FAMILIES)('%s: the computed digest equals its pin, and the pin sits at the newest row declaring the family', (family) => {
    const computed = witnessDigest(PROBES[family].values())
    const verdict = checkWitness(family, computed, PINNED[family], ENGINE_PRICING_LEDGER)
    // (a) + (b) as one verdict, so the failure carries the contract at the moment of the edit.
    expect(verdict.ok ? 'ok' : verdict.message).toBe('ok')
    expect(computed, `(a) ${family}: computed digest vs PINNED`).toBe(PINNED[family].digest)
    expect(PINNED[family].atVersion, `(b) ${family}: the pin's version vs the ledger`).toBe(
      latestVersionDeclaring(family, ENGINE_PRICING_LEDGER),
    )
  })

  it.each(FAMILIES)('%s: CROSS-ENGINE GUARD — no probe output sits within 1e-4 of a .5 rounding edge', (family) => {
    const knifeEdge = PROBES[family]
      .values()
      .filter(([, raw]) => Math.abs(raw - Math.floor(raw) - 0.5) < 1e-4)
      .map(([label, raw]) => `${label} = ${raw}`)
    expect(knifeEdge, 'move these probe points off the rounding edge').toEqual([])
  })

  it.each(FAMILIES)('%s: NON-VACUITY — nudging one probe input moves the digest (the grid is not blind)', (family) => {
    const probe = PROBES[family]
    const base = probe.values()
    const nudged = probe.perturbedValues()
    expect(nudged.length, 'the nudge moves an input, never the grid’s size').toBe(base.length)
    expect(witnessDigest(nudged)).not.toBe(witnessDigest(base))
    // …and the grid is not degenerate: it produces many distinct whole-dollar answers.
    expect(new Set(wholeDollars(base)).size, `${family}: distinct outputs`).toBeGreaterThan(10)
  })
})

describe('the working-year tax floor’s probes (ledger v12, 2026-10-20) — additive, controlled, and not blind', () => {
  const floorGrid = TAX.grid.floor

  it('the floor is purely ADDITIVE: each family’s legacy slice (the pre-v12 probes, verbatim) still digests to its pre-v12 pin', () => {
    // R5 at the pricer level: every output the witness pinned before the floor is byte-identical after
    // it — the re-pin at v12 is the grid GROWING, never a pre-floor price moving.
    expect(witnessDigest(taxLegacyProbes(TAX.grid)), 'tax legacy slice').toBe(PRE_FLOOR_PINS.tax.digest)
    expect(witnessDigest(stateLegacyProbes(STATE_TAX.grid)), 'stateTax legacy slice').toBe(PRE_FLOOR_PINS.stateTax.digest)
  })

  it('THE CONTROL (R3): at B = I = 0 the floor helpers return the floor-ABSENT figure BIT FOR BIT, at every probe point — and the base moves it where it should', () => {
    // The "pay never lowers the charge" check below is a property of this grid's SMALL benefits only:
    // past the §86 85 %-of-benefit cap at a large benefit the pay CAN lower the portfolio's increment (KTD4
    // — regime-conditional; the floor block's §86-cap arm pins one), so the large SS value skips it.
    const MONOTONE_SS_MAX = 31_013.29
    let checked = 0
    let movedByBase = 0
    let ssTaxedAlone = 0
    for (const filing of FILING_STATUSES) {
      for (const y of floorGrid.years) {
        for (const c of count65sFor(filing)) {
          for (const ss of floorGrid.ss) {
            const ctx = { ssBenefit: ss, filing, count65: c, calendarYear: y, minLivingAge: 60 }
            const zero = prepareWorkingYearFloor({ ordinaryBase: 0, investmentIncome: 0 }, ctx)
            const withPay = prepareWorkingYearFloor({ ordinaryBase: 102_003.67, investmentIncome: 0 }, ctx)
            if (zero.zeroTax > 0) ssTaxedAlone += 1
            for (const [po, pg] of floorGrid.portfolio) {
              const absent = floorAbsentTax(po, pg, ss, filing, c, y)
              const at = `${filing} ${c}×65 ss ${ss} P ${po}+${pg} ${y}`
              expect(Object.is(workingYearFederalCharge(zero, po, pg).tax, absent), `B = I = 0: ${at}`).toBe(true)
              checked += 1
              const paid = workingYearFederalCharge(withPay, po, pg).tax
              // On this grid's small benefits the pay never lowers the charge — a grid property, not a law.
              if (ss <= MONOTONE_SS_MAX) expect(paid, `B > 0 never charges less: ${at}`).toBeGreaterThanOrEqual(absent - 1e-6)
              if (po + pg > 0 && paid > absent + 1) movedByBase += 1
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100)
    expect(movedByBase, 'non-vacuity: $102,003.67 of pay lifts the charge on portfolio income at many probe points').toBeGreaterThan(20)
    expect(ssTaxedAlone, 'non-vacuity: the large benefit carries a tax of its own (T(0, ss) > 0), so the exactness branch is read').toBeGreaterThan(0)
  })

  it('FLOOR IGNORED (the recorded "helper ignores B" mutant, kept as an arm): handing the helper B = 0 — or I = 0 — moves the tax digest off its pin', () => {
    const pinned = witnessDigest(TAX.run(TAX.grid))
    expect(pinned, 'premise: the live grid is the pinned one').toBe(PINNED.tax.digest)
    const ignoringB = witnessDigest([...taxLegacyProbes(TAX.grid), ...taxFloorProbes(floorGrid, (_b, i) => ({ ordinaryBase: 0, investmentIncome: i }))])
    const ignoringI = witnessDigest([...taxLegacyProbes(TAX.grid), ...taxFloorProbes(floorGrid, (b) => ({ ordinaryBase: b, investmentIncome: 0 }))])
    expect(ignoringB, 'a floor blind to the pay is caught').not.toBe(pinned)
    expect(ignoringI, 'a floor blind to the investment income is caught').not.toBe(pinned)
  })

  it('WAGE IGNORED (the state twin): handing the state pricer a zero wage moves the stateTax digest off its pin — NC’s base is seen', () => {
    const pinned = witnessDigest(STATE_TAX.run(STATE_TAX.grid))
    expect(pinned, 'premise: the live grid is the pinned one').toBe(PINNED.stateTax.digest)
    const ignoringWage = witnessDigest([...stateLegacyProbes(STATE_TAX.grid), ...stateWageProbes(STATE_TAX.grid, () => 0)])
    expect(ignoringWage).not.toBe(pinned)
  })

  it('against the SHIPPED ledger the pre-v12 pins read `row-unpinned` for BOTH families — v12 declares tax AND stateTax, so neither pin could have stayed', () => {
    for (const family of ['tax', 'stateTax'] as const) {
      const old = PRE_FLOOR_PINS[family]
      const v = checkWitness(family, old.digest, old, ENGINE_PRICING_LEDGER)
      expect(v.ok, family).toBe(false)
      if (v.ok) continue
      expect(v.reason, family).toBe('row-unpinned')
      expect(v.message, family).toMatch(/v12 declares/)
    }
  })
})

describe('checkWitness — planted failures, both ways (the checker itself is under test)', () => {
  const family: PricingFamily = 'tax'
  const pin = PINNED[family]
  const latest = latestVersionDeclaring(family, ENGINE_PRICING_LEDGER)
  const withNewRow = (f: PricingFamily): readonly PricingLedgerRow[] => [
    ...ENGINE_PRICING_LEDGER,
    {
      version: ENGINE_PRICING_LEDGER.length + 1,
      kind: 'reprice',
      families: [f],
      shippedOn: '2099-01-01',
      sinceEpochDay: epochDayFromIsoDate('2099-01-01'),
      solverCodeVersion: null,
      commits: ['(planted)'],
      what: '(planted by the checker test)',
    },
  ]
  const moved = (pin.digest ^ 0x5a5a5a5a) >>> 0

  it('the baseline passes (a checker that always fails would pass the arms below)', () => {
    expect(checkWitness(family, pin.digest, pin, ENGINE_PRICING_LEDGER)).toEqual({ ok: true })
  })

  it('a MOVED digest with NO new row fails — and the message carries the append-then-re-pin contract', () => {
    const v = checkWitness(family, moved, pin, ENGINE_PRICING_LEDGER)
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.reason).toBe('digest-moved')
    expect(v.message).toMatch(/with no new ENGINE_PRICING_LEDGER row declaring it/)
    expect(v.message).toMatch(/Append a row \(src\/engine\/pricingVersion\.ts\) declaring tax/)
    expect(v.message).toMatch(/bump SOLVER_CODE_VERSION if the family is scored/)
    expect(v.message).toMatch(/Never re-pin alone: a saved household would recompute a different answer with no note\./)
  })

  it('a NEW ROW with the digest UNMOVED fails (the pin lags the ledger) — and names the over-declare / blind-grid fork', () => {
    const v = checkWitness(family, pin.digest, pin, withNewRow(family))
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.reason).toBe('row-unpinned')
    expect(v.message).toMatch(/did NOT move/)
  })

  it('a new row AND a moved digest, still pinned at the old version, fails too (re-pin both halves)', () => {
    const v = checkWitness(family, moved, pin, withNewRow(family))
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.reason).toBe('row-unpinned')
  })

  it('BOTH moved together — a new row declaring the family, the digest re-pinned at its version — passes', () => {
    const ledger = withNewRow(family)
    expect(checkWitness(family, moved, { atVersion: ENGINE_PRICING_LEDGER.length + 1, digest: moved }, ledger)).toEqual({ ok: true })
  })

  it('a new row for a DIFFERENT family never licenses this family’s moved digest', () => {
    const v = checkWitness(family, moved, pin, withNewRow('aca'))
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.reason).toBe('digest-moved')
  })

  it('a pin AHEAD of the ledger fails (a pin can only follow a row)', () => {
    const v = checkWitness(family, pin.digest, { atVersion: latest + 1, digest: pin.digest }, ENGINE_PRICING_LEDGER)
    expect(v.ok).toBe(false)
    if (v.ok) return
    expect(v.reason).toBe('pin-ahead')
  })

  it('latestVersionDeclaring reads the ledger, not the array length: 0 for a family no row declares', () => {
    expect(latestVersionDeclaring('aca', ENGINE_PRICING_LEDGER)).toBe(0)
    expect(latestVersionDeclaring('aca', withNewRow('aca'))).toBe(ENGINE_PRICING_LEDGER.length + 1)
    expect(latestVersionDeclaring('tax', withNewRow('aca'))).toBe(latest)
  })
})
