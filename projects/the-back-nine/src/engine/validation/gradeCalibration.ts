/**
 * GRADE CALIBRATION (U14 S4) — "just do it" really is robust; "coin-flip" really is a
 * coin-flip; a conversion near-tie is DEMOTED (the council's Q3 amendment).
 *
 * THE GRADE ALGORITHM (all-members rule — grade stability is built in, never bolted on):
 * the winner's advantage is read on EVERY member of the deterministic seedB-derived
 * B-family as the mean of the CRN-PAIRED per-path differences in the decision statistic,
 * with its own member band zB · SE(diffs). `just-do-it` requires EVERY member's margin
 * strictly beyond its band — a single luck-flippable member (a margin inside noise, or a
 * sign flip) forces the conservative `coin-flip` reading. Three additional clauses:
 *
 *  - THE MIN-B FLOOR: a member read on fewer than `solverMinBPaths` paths is REFUSED
 *    (thrown) — the margin-vs-band decision must not itself be noise.
 *  - THE CONVERSION-NEAR-TIE DEMOTION (supersession item 7a): the difference-keyed grade's
 *    common-mode shape-bias cancellation is ASYMMETRIC — conversion front-loads balance
 *    reduction, so the non-cancelling i.i.d.-lognormal residual FLATTERS conversion exactly
 *    in the near-tie regime (market-model §3–§5). When the winner carries a conversion and
 *    the runner-up does not, a minimum member margin below the calibrated demotion margin
 *    grades `coin-flip` even if every band is cleared.
 *  - THE DISPLAY-TENTH RECONCILIATION (S4.4): a survival advantage that rounds below one
 *    display tenth must not render an unchanged `X of 10` under `just-do-it` — when the
 *    winner's and runner-up's displayed tenths agree on ANY member, the grade carries
 *    `subTenthCollapse: true` and U15/U16 route it into the no-change state.
 *
 * FRESH-DRAW PROTOCOL (documented where the machinery lives): seed-set B + every threshold
 * here are used-once-per-release and re-drawn on any change to the candidate set or the
 * thresholds; the N=1 cold-read may revise tone, NEVER these numbers against B outputs.
 *
 * THE SUBSTRATE DISCLOSURE SEAM (S4.5, insight 048): the grade output carries the
 * machine-readable directional-substrate flag composed by a PURE exported function — U16
 * renders the shape-limitation note ADJACENT in the same DOM lockup as the grade, and the
 * seam is testable without a render path.
 */
import type { SimulationParams } from '@shared/model'
import {
  isCalibrated,
  solverBFamilySize,
  solverConversionNearTieDemotionMargin,
  solverMinBPaths,
  solverSelectionTieZ,
} from '@engine/constants'
import { quantizeSurvival, xOfTenClamp } from '@engine/confidence'
import type { CandidateStrategy } from '../solver/candidates'
import { evaluateCandidates, rankCandidates, type CandidateOutcome, type OracleGoal } from './evaluate'
import { deriveBFamilyMember, deriveSeedB, survivalIndicators } from './heldOutSeed'

export type Grade = 'just-do-it' | 'coin-flip'

export interface MemberMargin {
  readonly margin: number
  readonly band: number
  readonly beyondBand: boolean
  readonly paths: number
}

export interface GradeResult {
  readonly grade: Grade
  readonly memberMargins: readonly MemberMargin[]
  readonly demotionFired: boolean
  /** True when the advantage clears the bands but rounds below one display tenth — the
   *  caller routes this into the no-change state rather than an unchanged-looking win. */
  readonly subTenthCollapse: boolean
}

/** The displayed tenth — READ from the confidence pipeline's own exported pieces (quantize →
 *  the canonical {@link xOfTenClamp} honesty clamp; the U14 review fold killed the re-typed
 *  mirror — one formula, one home, no drift-pin obligation). */
export const displayTenth = (survival: number): number => xOfTenClamp(quantizeSurvival(survival))

/** One member's margin + band from its CRN-paired per-path differences (B-side). */
function memberMargin(pairedDiffs: readonly number[], minPaths: number): MemberMargin {
  const n = pairedDiffs.length
  if (n < minPaths) {
    throw new Error(
      `[gradeCalibration] a B-family member read on ${n} paths is below the ${minPaths}-path floor — ` +
        `the margin decision would itself be noise (refused, never averaged)`,
    )
  }
  let sum = 0
  for (const d of pairedDiffs) {
    if (!Number.isFinite(d)) throw new Error('[gradeCalibration] non-finite paired difference (insight 010)')
    sum += d
  }
  const margin = sum / n
  let ss = 0
  for (const d of pairedDiffs) ss += (d - margin) * (d - margin)
  const band = solverSelectionTieZ.value * Math.sqrt(ss / (n - 1) / n)
  return { margin, band, beyondBand: margin > band, paths: n }
}

export interface GradeOnFamilyInputs {
  /** Per-member CRN-paired per-path differences (winner − runner-up, oriented so POSITIVE
   *  means the winner is better) in the decision statistic. */
  readonly family: ReadonlyArray<readonly number[]>
  /** The decision statistic the family's differences are measured IN — the demotion margin
   *  is calibrated in SURVIVAL-FRACTION units (solver.ts), so a conversion-winner near-tie
   *  on any other axis REFUSES rather than silently comparing dollars to 0.02 (U14 fold). */
  readonly statistic: 'survival' | 'pay-less-tax'
  readonly winnerHasConversion: boolean
  readonly runnerUpHasConversion: boolean
  /** Supplied when the decision statistic is survival — enables the display-tenth clause. */
  readonly displayReads?: ReadonlyArray<{ readonly winnerSurvival: number; readonly runnerUpSurvival: number }>
  /** TEST-SEAM ONLY (insight 048): the synthetic arms drive small vectors; the live binding
   *  never passes this — the calibrated floor governs. */
  readonly minPathsOverride?: number
}

/** The demotion-axis guard, ONE home (U14 fold): the calibrated 0.02 demotion margin is
 *  survival-fraction units, so a conversion-winner-over-non-conversion near-tie on any other
 *  statistic REFUSES — a dollar-diff family would make `minMargin < 0.02` structurally false
 *  and silently skip the caution on exactly the flattered lever. Called by the live binding
 *  BEFORE the expensive family evaluation, and again at the pure seam (no bypass). */
function assertDemotionAxisCalibrated(
  statistic: 'survival' | 'pay-less-tax',
  winnerHasConversion: boolean,
  runnerUpHasConversion: boolean,
): void {
  if (winnerHasConversion && !runnerUpHasConversion && statistic !== 'survival') {
    throw new Error(
      `[gradeCalibration] the conversion-near-tie demotion margin is calibrated in SURVIVAL-FRACTION ` +
        `units — a '${statistic}' conversion-winner near-tie needs its own calibrated margin ` +
        `(U15's objective wiring); refusing rather than silently skipping the demotion (burned/062)`,
    )
  }
}

/** The PURE grade decision (the live binding is {@link gradeRecommendation}). */
export function gradeOnFamily(inputs: GradeOnFamilyInputs): GradeResult {
  const familySize = solverBFamilySize.value
  if (!isCalibrated(familySize) || inputs.family.length !== familySize) {
    throw new Error(
      `[gradeCalibration] the grade runs over the FULL ${familySize}-member B-family (got ${inputs.family.length}) — ` +
        `a partial family is not a stability check`,
    )
  }
  const minPaths = inputs.minPathsOverride ?? solverMinBPaths.value
  const memberMargins = inputs.family.map((diffs) => memberMargin(diffs, minPaths))
  const allBeyond = memberMargins.every((m) => m.beyondBand)
  const minMargin = Math.min(...memberMargins.map((m) => m.margin))

  const demotionMargin = solverConversionNearTieDemotionMargin.value
  const demotionApplies = inputs.winnerHasConversion && !inputs.runnerUpHasConversion
  assertDemotionAxisCalibrated(inputs.statistic, inputs.winnerHasConversion, inputs.runnerUpHasConversion)
  if (demotionApplies && !isCalibrated(demotionMargin)) {
    throw new Error(
      '[gradeCalibration] the conversion-near-tie demotion margin is UNCALIBRATED (sentinel) — ' +
        'the token refuses upstream; refusing to grade a conversion winner here too (burned/062)',
    )
  }
  const demotionFired = demotionApplies && isCalibrated(demotionMargin) && minMargin < demotionMargin

  const subTenthCollapse =
    allBeyond &&
    !demotionFired &&
    inputs.displayReads !== undefined &&
    inputs.displayReads.some((r) => displayTenth(r.winnerSurvival) === displayTenth(r.runnerUpSurvival))

  return {
    grade: allBeyond && !demotionFired ? 'just-do-it' : 'coin-flip',
    memberMargins,
    demotionFired,
    subTenthCollapse,
  }
}

// ---- The live binding: run the B-family through the real engine -----------------------------

export interface GradeRecommendationResult extends GradeResult {
  readonly seedB: number
  readonly familySeeds: readonly number[]
}

/** Per-path goal statistic, oriented winner-positive. */
function pairedGoalDiffs(
  winner: CandidateOutcome,
  runner: CandidateOutcome,
  goal: OracleGoal | 'survival',
): readonly number[] {
  if (winner.kind !== 'scored' || runner.kind !== 'scored') {
    throw new Error('[gradeCalibration] grading requires two SCORED candidates (an infeasible candidate never grades)')
  }
  if (goal === 'survival') {
    const w = survivalIndicators(winner.distribution)
    const r = survivalIndicators(runner.distribution)
    return w.map((x, i) => x - r[i]!)
  }
  const wTa = winner.distribution.taxAware
  const rTa = runner.distribution.taxAware
  if (wTa === undefined || rTa === undefined) {
    throw new Error('[gradeCalibration] a goal-statistic grade requires tax-aware runs (burned/062)')
  }
  if (goal === 'pay-less-tax') {
    // Winner-positive: the winner PAYS LESS, so runner − winner.
    return wTa.lifetimeTaxPaidReal.map((w, i) => rTa.lifetimeTaxPaidReal[i]! - w)
  }
  throw new Error('[gradeCalibration] leave-more per-path grading lands with U15\'s objective wiring (the heir bracket is per-solve there)')
}

/**
 * Grade a winner against its runner-up on the deterministic B-family (the real engine, the
 * shared apply seam, the calibrated floors — no overrides). `statistic` picks the decision
 * axis; `'survival'` also engages the display-tenth clause.
 */
export function gradeRecommendation(opts: {
  readonly base: SimulationParams
  readonly winner: CandidateStrategy
  readonly runnerUp: CandidateStrategy
  readonly seedA: number
  readonly statistic: 'survival' | 'pay-less-tax'
}): GradeRecommendationResult {
  const { base, winner, runnerUp, seedA, statistic } = opts
  // Fail BEFORE the expensive family evaluation: the demotion axis must be calibrated for
  // this statistic (the guard's one home — gradeOnFamily re-checks at the pure seam).
  assertDemotionAxisCalibrated(statistic, winner.conversion !== null, runnerUp.conversion !== null)
  const seedB = deriveSeedB(seedA)
  const familySize = solverBFamilySize.value
  const familySeeds = Array.from({ length: familySize }, (_, i) => deriveBFamilyMember(seedB, i))
  const family: Array<readonly number[]> = []
  const displayReads: Array<{ winnerSurvival: number; runnerUpSurvival: number }> = []
  for (const seed of familySeeds) {
    const [w, r] = evaluateCandidates(base, [winner, runnerUp], seed)
    family.push(pairedGoalDiffs(w!, r!, statistic))
    if (statistic === 'survival' && w!.kind === 'scored' && r!.kind === 'scored') {
      displayReads.push({ winnerSurvival: w!.score.survival, runnerUpSurvival: r!.score.survival })
    }
  }
  const result = gradeOnFamily({
    family,
    statistic,
    winnerHasConversion: winner.conversion !== null,
    runnerUpHasConversion: runnerUp.conversion !== null,
    ...(statistic === 'survival' ? { displayReads } : {}),
  })
  return { ...result, seedB, familySeeds }
}

// ---- The named-driver sensitivity probe (S4.2) ----------------------------------------------

export interface NamedDriverProbe {
  readonly name: string
  readonly transform: (base: SimulationParams) => SimulationParams
}

/** The built-in ACA-regime probe: flip the enhanced-subsidies toggle (only meaningful when
 *  healthcare is priced — the caller's candidate near-tie may hinge on the regime). */
export const ACA_ENHANCED_PROBE: NamedDriverProbe = {
  name: 'aca-enhanced-subsidies',
  transform: (base) => {
    const o = base.overlay
    if (o?.healthcareEnabled !== true) return base
    const { enhancedSubsidies: prior, ...rest } = o
    return { ...base, overlay: { ...rest, ...(prior === true ? {} : { enhancedSubsidies: true }) } }
  },
}

/**
 * Re-rank the candidates under each probe; the FIRST probe whose world flips the crown is
 * the named driver ("depends on whether enhanced ACA subsidies return"). A near-tie no
 * probe can flip carries the `sampling-noise-near-tie` sentinel — never a fabricated cause.
 */
export function namedDriverProbe(opts: {
  readonly base: SimulationParams
  readonly candidates: readonly CandidateStrategy[]
  readonly goal: OracleGoal
  readonly tieTolerance: number
  readonly seed: number
  readonly heirBracket?: number
  readonly probes?: readonly NamedDriverProbe[]
}): { readonly driver: string } {
  const { base, candidates, goal, tieTolerance, seed, heirBracket } = opts
  const probes = opts.probes ?? [ACA_ENHANCED_PROBE]
  const crownOf = (params: SimulationParams): string => {
    const ranked = rankCandidates(evaluateCandidates(params, candidates, seed, { heirBracket }), goal, tieTolerance)
    const top = ranked[0]
    if (top === undefined) throw new Error('[gradeCalibration] namedDriverProbe: empty candidate set')
    return `${top.candidate.policy}:${top.candidate.conversion?.annualAmountReal ?? 0}`
  }
  const baseline = crownOf(base)
  for (const probe of probes) {
    const probed = probe.transform(base)
    if (probed === base) continue // the probe declared itself inapplicable to this world
    if (crownOf(probed) !== baseline) return { driver: probe.name }
  }
  return { driver: 'sampling-noise-near-tie' }
}

// ---- The substrate disclosure seam (S4.5) ---------------------------------------------------

export interface ShapeDisclosure {
  /** Machine-readable: the grade's LEVEL rides still-directional methodology substrate —
   *  U16 renders the shape-limitation note ADJACENT in the same DOM lockup as the grade. */
  readonly directionalLevel: boolean
  readonly substrateKeys: readonly string[]
}

/** Pure composition (insight 048 — never inlined in an undrivable render path). */
export function composeShapeDisclosure(disclosedDirectional: readonly string[]): ShapeDisclosure {
  return {
    directionalLevel: disclosedDirectional.length > 0,
    substrateKeys: [...disclosedDirectional].sort(),
  }
}
