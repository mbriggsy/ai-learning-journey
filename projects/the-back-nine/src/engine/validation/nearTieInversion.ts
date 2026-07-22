/**
 * `nearTieInversion.ts` — the near-tie inversion stress PROBE (U16 build spec §S0.2; the
 * runway item-7 dissent's recorded flip condition, absorbed from the U16 council's red team).
 *
 * THE QUESTION IT ANSWERS: does the difference-keyed conversion-vs-no-conversion advantage —
 * the quantity the shipped near-tie grade rides — INVERT when the market draw carries the
 * historical temporal shape (block-bootstrap; market-model §3/§5's autocorrelated, regime-
 * clustered grind) instead of i.i.d. lognormal, at the measured near-tie class world? If yes,
 * the richer draw is a HARD upstream prerequisite (the dissent wins); if no, the richer-draw
 * deferral is ratified on the record and the conversion-near-tie DEMOTION
 * (`solverConversionNearTieDemotionSeMultiple`) carries the residual.
 *
 * THE 095 DISCIPLINE (shipped-path, never a bespoke twin): candidates apply through the ONE
 * `applyCandidate` seam; every run is the real `simulate` (decumulation + tax + healthcare —
 * the channels conversion pays through); scores come from the shipped `collectCandidateOutcome`
 * / `scoreFromDistribution`. ONLY the draw source varies, via the `_injectedDraws` harness seam
 * — and the control arm's advantage is byte-comparable to a plain shipped run (the injection
 * identity is separately test-pinned).
 *
 * CRN WITHIN EVERY ARM: both candidates of a rep consume the IDENTICAL matrix (control = the
 * seed's own `buildDraws`; bootstrap = one `buildBootstrapDraws` build) — the advantage is pure
 * strategy signal within each arm. ACROSS arms the longevity uniforms are held VERBATIM (the
 * bootstrap carries the control seed's own longevity stream), so the arm delta isolates the
 * market SHAPE.
 *
 * THE PRE-REGISTERED FIRES CRITERION (fixed here, in code, before the first full-scale run —
 * the garden-of-forking-paths guard): the probe FIRES iff, across the rep battery,
 *   (a) the CONTROL mean advantage is positive (the shipped world really crowns the conversion
 *       winner — the validity check that the near-tie class reproduced), AND
 *   (b) the BOOTSTRAP mean advantage is negative (the sign inverts), AND
 *   (c) |bootstrap mean| exceeds 2× the bootstrap advantage's SE-of-mean (beyond rep noise).
 * Anything short of (a)∧(b)∧(c) — including a shrunk-but-positive bootstrap advantage — does
 * NOT fire; the shrinkage magnitude is REPORTED (`shapePenalty`) for the record either way.
 *
 * PURE: deterministic in (spec) — seeds injected, no clock, no entropy.
 */
import { simulate } from '@engine/simulate'
import { applyCandidate, type CandidateStrategy } from '@engine/solver/candidates'
import { collectCandidateOutcome } from '@engine/validation/evaluate'
import { deriveSeedB } from '@engine/validation/heldOutSeed'
import { buildBootstrapDraws } from '@engine/validation/blockBootstrap'
import type { PersonInputs, SimulationParams } from '@shared/model'

// ---- The measured near-tie class (ONE home — the Q4d calibration world) ---------------------

/**
 * The Q4d calibration world (the trend sourcing unit, measured 2026-07-19, wf_c673339e-257):
 * all-65+ MFJ, Medicare-priced under the TRENDED Part B + scaled IRMAA — the world class the
 * conversion-near-tie demotion SE-multiple was calibrated on (`solverConversionNearTieDemotionSeMultiple`,
 * constants/solver.ts — its citation names this class). Exported from HERE as the one fixture
 * home; `gradeCalibration.test.ts` (the proving case) and the §S0.2 stress probe both consume it
 * (a re-typed twin is the 048 drift class).
 */
export function q4dNearTieWorld(paths: number): SimulationParams {
  const people: readonly PersonInputs[] = [
    { sex: 'female', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 26_000, socialSecurityClaimAge: 66 },
    { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 64, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 65 },
  ]
  return {
    initialPortfolio: 2_150_000,
    annualSpendingReal: 124_000,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: {
      stock: { mean: 0.04, stdDev: 0.12 },
      bond: { mean: 0.015, stdDev: 0.055 },
      inflation: { mean: 0.03, stdDev: 0.041 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths,
    maxHorizonYears: 38,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 150_000, pretax: 1_900_000, roth: 100_000 },
      initialTaxableBasis: 130_000,
      filing: 'mfj',
      healthcareEnabled: true,
      irmaaMagiSeed: [120_000, 120_000],
    },
  }
}

/** The measured class's near-tie pair: the 30k×3yr conversion winner… */
export const nearTieWinner: CandidateStrategy = {
  policy: 'taxable-first',
  conversion: { annualAmountReal: 30_000, startYearOffset: 0, years: 3 },
  provenance: 'grid',
}

/** …over the conventional conversion-0 runner-up. */
export const nearTieRunnerUp: CandidateStrategy = {
  policy: 'taxable-first',
  conversion: null,
  provenance: 'conventional-baseline',
}

export interface InversionProbeSpec {
  /** The near-tie world (the measured demotion class — e.g. the Q4d Medicare-bearing world). */
  readonly base: SimulationParams
  /** The shipped near-tie WINNER (the conversion-bearing candidate the demotion guards). */
  readonly winner: CandidateStrategy
  /** The no-conversion runner-up (the conventional baseline of the pair). */
  readonly runnerUp: CandidateStrategy
  /** Distinct integer seeds, one per rep — pre-registered by the caller, never generated here. */
  readonly seeds: readonly number[]
  /** Moving-block length L (years). L=1 is the i.i.d. permutation null-control. */
  readonly blockLength: number
  /** Present iff the observational tier-2 bequest columns are wanted. */
  readonly heirBracket?: number
}

/** One arm's reading at one seed: both candidates' survival + the paired advantage. */
export interface ArmReading {
  readonly winnerSurvival: number
  readonly runnerUpSurvival: number
  /** winner − runnerUp (the winner-positive convention — the shipped pairedDecisionDiffs sign). */
  readonly advantage: number
  /** Observational tier-2 columns (never part of the fires criterion). */
  readonly winnerLifetimeTax: number | undefined
  readonly runnerUpLifetimeTax: number | undefined
}

export interface InversionRepReading {
  readonly seed: number
  readonly control: ArmReading
  readonly bootstrap: ArmReading
}

export interface InversionProbeResult {
  readonly readings: readonly InversionRepReading[]
  readonly controlMeanAdvantage: number
  readonly bootstrapMeanAdvantage: number
  /** Sample SD of the per-rep bootstrap advantages / √reps. */
  readonly bootstrapAdvantageSeOfMean: number
  /** controlMean − bootstrapMean: the measured shape penalty on the conversion advantage
   *  (positive = the historical shape is HARSHER on conversion than i.i.d. — the §3–§5
   *  direction; reported for the record whether or not the probe fires). */
  readonly shapePenalty: number
  /** How many reps each arm crowned the conversion winner (advantage > 0). */
  readonly controlWinnerReps: number
  readonly bootstrapWinnerReps: number
  /** The pre-registered criterion (see the module header). */
  readonly fires: boolean
}

function armReading(
  base: SimulationParams,
  winner: CandidateStrategy,
  runnerUp: CandidateStrategy,
  seed: number,
  heirBracket: number | undefined,
  injected: ReturnType<typeof buildBootstrapDraws> | undefined,
): ArmReading {
  const run = (c: CandidateStrategy) => {
    const out = simulate(
      applyCandidate(base, c),
      seed,
      injected !== undefined ? { _injectedDraws: injected } : undefined,
    )
    const collected = collectCandidateOutcome(c, out, heirBracket)
    if (collected.kind !== 'scored') {
      throw new Error(
        `[nearTieInversion] candidate {${c.policy}, ${c.conversion?.annualAmountReal ?? 0}} went ` +
          `INFEASIBLE (${collected.reason}) under ${injected !== undefined ? 'bootstrap' : 'control'} ` +
          `draws at seed ${seed} — the probe cannot score it; a real finding, surfaced loud`,
      )
    }
    return collected.score
  }
  const w = run(winner)
  const r = run(runnerUp)
  return {
    winnerSurvival: w.survival,
    runnerUpSurvival: r.survival,
    advantage: w.survival - r.survival,
    winnerLifetimeTax: w.lifetimeTaxMeanReal,
    runnerUpLifetimeTax: r.lifetimeTaxMeanReal,
  }
}

/** Run the probe. Deterministic in (spec). */
export function runNearTieInversionProbe(spec: InversionProbeSpec): InversionProbeResult {
  const { base, winner, runnerUp, seeds, blockLength, heirBracket } = spec
  if (seeds.length < 3) {
    throw new Error(`[nearTieInversion] need ≥ 3 reps for an SE-of-mean (got ${seeds.length})`)
  }
  if (new Set(seeds).size !== seeds.length) {
    throw new Error('[nearTieInversion] rep seeds must be distinct (a repeated seed double-counts one draw)')
  }
  const readings: InversionRepReading[] = seeds.map((seed) => {
    const control = armReading(base, winner, runnerUp, seed, heirBracket, undefined)
    const injected = buildBootstrapDraws({
      base,
      blockLength,
      // The block-start index stream must be well-separated from the simulate stream at the same
      // seed — the canonical SplitMix expansion, not seed+1 (the heldOutSeed decorrelation law).
      bootstrapSeed: deriveSeedB(seed),
      simulateSeed: seed,
    })
    const bootstrap = armReading(base, winner, runnerUp, seed, heirBracket, injected)
    return { seed, control, bootstrap }
  })

  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const ctrlAdvs = readings.map((r) => r.control.advantage)
  const bootAdvs = readings.map((r) => r.bootstrap.advantage)
  const controlMeanAdvantage = mean(ctrlAdvs)
  const bootstrapMeanAdvantage = mean(bootAdvs)
  const bootVar =
    bootAdvs.reduce((a, b) => a + (b - bootstrapMeanAdvantage) * (b - bootstrapMeanAdvantage), 0) /
    (bootAdvs.length - 1)
  const bootstrapAdvantageSeOfMean = Math.sqrt(bootVar / bootAdvs.length)

  return {
    readings,
    controlMeanAdvantage,
    bootstrapMeanAdvantage,
    bootstrapAdvantageSeOfMean,
    shapePenalty: controlMeanAdvantage - bootstrapMeanAdvantage,
    controlWinnerReps: ctrlAdvs.filter((a) => a > 0).length,
    bootstrapWinnerReps: bootAdvs.filter((a) => a > 0).length,
    fires:
      controlMeanAdvantage > 0 &&
      bootstrapMeanAdvantage < 0 &&
      Math.abs(bootstrapMeanAdvantage) > 2 * bootstrapAdvantageSeOfMean,
  }
}
