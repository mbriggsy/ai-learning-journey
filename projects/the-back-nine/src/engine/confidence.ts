/**
 * Distribution → the first-answer reading (PURE: one run → one reading).
 *
 * Owns the raw→display rounding target for the headline + dollar, the outcome-state
 * selection, and every band edge. Cross-engine robustness (contract #1, findings
 * §Strand 2) — stated precisely: the survival statistic is `survivors / paths`, an
 * EXACT integer ratio given the count, so it does NOT drift bit-to-bit across engines.
 * The residual cross-engine risk is a single path landing within transcendental
 * rounding-noise of depletion and flipping the COUNT by ±1 (measure-zero for realistic
 * inputs). Quantizing to a coarse 1% grid BEFORE the band-edge decision gives margin
 * that absorbs MOST such ±1/paths flips (they rarely straddle a grid boundary) and
 * stabilizes the X-of-10 mapping against last-ULP noise in the rounding math — so a
 * screenshot reproduces across engines in the overwhelming common case. It is NOT an
 * absolute bit-identical promise; that is the WASM cross-engine-determinism trigger
 * (CLAUDE.md). This is STATELESS (priorHeadline = null); cross-edit sticky rounding is a
 * P2/P3 concern built on the emitted margins.
 *
 * Framing rule (Kitces): never "probability of failure" — the reading is survival /
 * coverage ("X of 10 futures your plan covers"), and the top of scale is the
 * over-funded near-ceiling, never a bald "10 of 10" (false certainty).
 */
import {
  NEVER_DEPLETED,
  isDepleted,
  type Distribution,
  type DollarAdjustment,
  type Headline,
  type OutcomeState,
  type SimulationParams,
  type SimulationResult,
  type SurvivorReading,
} from '@shared/model'
import type { SimOutput } from '@engine/simulate'

/** Coarse quantization grid for the survival statistic — 1% is ~13 orders of
 *  magnitude above last-ULP noise, so it absorbs cross-engine transcendental drift
 *  while staying finer than the 10% band width. */
export const SURVIVAL_GRID = 0.01

/** Outcome-state band edges on the QUANTIZED survival fraction (engine-owned).
 *  Below `borderline` is off-track; the already-failing verdict is reserved for the
 *  near-total + EARLY-death case (unfundable from the start), not a late failure. */
export const BANDS = {
  overFunded: 0.98, // ≥ → over-funded near-ceiling
  onTrack: 0.85, // ≥ → on-track
  borderline: 0.65, // ≥ → borderline; below → off-track
} as const

/** Display step for the monthly dollar figure ($/month) — the rounding the margin
 *  metadata measures distance to. */
export const DOLLAR_STEP = 10

/** Quantize a survival-type statistic to the coarse grid BEFORE any band-edge decision —
 *  the cross-engine screenshot-reproduction idiom. EXPORTED for the date-search (C3 §3c):
 *  the date is DEFINED as "the earliest offset at which the headline reads on-track-or-
 *  better", so its rule must be the headline's OWN quantize-then-compare — never a
 *  re-typed grid or a raw compare (objective ≡ headline). */
export const quantizeSurvival = (s: number): number => Math.round(s / SURVIVAL_GRID) * SURVIVAL_GRID

/** Nearest distance to a band edge where `round(s*10)` flips (the (k+0.5)/10 points). */
function marginToXOfTenEdge(survival: number): number {
  const scaled = survival * 10
  const nearestFlip = Math.round(scaled - 0.5) + 0.5 // nearest half-integer
  return Math.abs(scaled - nearestFlip) / 10
}

function median(sorted: readonly number[]): number {
  const n = sorted.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  if (n % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))
  return sorted[idx] ?? 0
}

/** Median absolute year of depletion among the paths that actually depleted. */
function medianDepletionYear(depletionYears: readonly number[]): number {
  const depleted = depletionYears.filter(isDepleted).sort((a, b) => a - b)
  return depleted.length === 0 ? NEVER_DEPLETED : median(depleted)
}

// The depletion signal is a PARAMETER (P3·U9): each reading's already-failing check keys to
// its own track's depletion depth — the joint headline and the survivor reading pass the
// JOINT depletionYears; the floor reading passes the floor track's own (see each builder).
function selectOutcomeState(quantized: number, depletionYears: readonly number[]): OutcomeState {
  // already-failing: essentially everything fails AND it dies EARLY (the $0-portfolio
  // / unfundable case — "depleted before the horizon even runs"). A plan that fails
  // late in bad futures is off-track, not already-failing.
  if (quantized <= 0.02) {
    const medDeplete = medianDepletionYear(depletionYears)
    return medDeplete !== NEVER_DEPLETED && medDeplete <= 2 ? 'already-failing' : 'off-track'
  }
  if (quantized >= BANDS.overFunded) return 'over-funded'
  if (quantized >= BANDS.onTrack) return 'on-track'
  if (quantized >= BANDS.borderline) return 'borderline'
  return 'off-track'
}

function buildHeadline(distribution: Distribution): Headline {
  const survival = distribution.survivalFraction
  const quantized = quantizeSurvival(survival)
  const state = selectOutcomeState(quantized, distribution.depletionYears)
  // 10/10-honesty clamp: the displayed reading never reaches 10 (false certainty);
  // the over-funded ceiling reads "9 of 10" with the over-funded state carrying the
  // "more than enough" framing. Tie-break: round-half-up (defined + stable).
  const xOfTen = Math.max(0, Math.min(9, Math.round(quantized * 10)))
  return {
    xOfTen: { value: xOfTen, marginToEdge: marginToXOfTenEdge(quantized) },
    outcomeState: state,
  }
}

/** The "as the survivor" reading (U7 e1c) — the joint {@link buildHeadline} grammar applied to the
 *  survivor-conditioned fraction, so the survivor sentence speaks the SAME vocabulary (the "X of 10"
 *  count, the outcome word) as the joint one. Returns undefined when the run carries no survivor
 *  surface (presence-keyed — the caller opted out, or no path had a survivor phase). The xOfTen runs
 *  the identical quantize → 9-cap honesty clamp the joint headline uses; the outcome state is selected
 *  on the SURVIVOR fraction, but `already-failing` still keys to the JOINT early-death signal (a
 *  survivor cannot be a calm survivor of a plan that was unfundable from year 0 — that DOA reservation
 *  is a whole-plan property, never re-derived from the survivor fraction alone). */
function buildSurvivorReading(distribution: Distribution): SurvivorReading | undefined {
  const sc = distribution.survivorConditioned
  if (!sc) return undefined
  const quantized = quantizeSurvival(sc.survivalFraction)
  // already-failing keys to the JOINT depletion signal (the whole-plan DOA reservation —
  // see the builder doc above); the fraction is the survivor-conditioned one.
  const state = selectOutcomeState(quantized, distribution.depletionYears)
  const xOfTen = Math.max(0, Math.min(9, Math.round(quantized * 10)))
  return {
    xOfTen: { value: xOfTen, marginToEdge: marginToXOfTenEdge(quantized) },
    outcomeState: state,
    incomeStepDownMonthlyReal: sc.incomeStepDownMonthlyReal,
  }
}

/** The essentials-floor verdict (P3·U9) — the joint {@link buildHeadline} grammar applied to
 *  the floor track's fraction, so the Tier-1 sentence speaks the SAME vocabulary ("X of 10",
 *  the outcome word) as the lifestyle one. Returns undefined when the run carried no budget
 *  (presence-keyed). The identical quantize → band → 9-cap pipeline; `already-failing` keys
 *  to the FLOOR's OWN depletion signal — "even essentials-only spending is unfundable from
 *  the start" IS the floor tier's DOA case (unlike the survivor reading, whose DOA
 *  reservation is a whole-plan JOINT property). No UI layer re-derives any of this (the
 *  U7/D2 honesty contract — the second tier's state is engine-tagged here). */
function buildFloorReading(distribution: Distribution): Headline | undefined {
  const floor = distribution.floor
  if (!floor) return undefined
  const quantized = quantizeSurvival(floor.survivalFraction)
  const state = selectOutcomeState(quantized, floor.depletionYears)
  const xOfTen = Math.max(0, Math.min(9, Math.round(quantized * 10)))
  return {
    xOfTen: { value: xOfTen, marginToEdge: marginToXOfTenEdge(quantized) },
    outcomeState: state,
  }
}

function buildDollar(distribution: Distribution, params: SimulationParams, state: OutcomeState): DollarAdjustment {
  const sortedTerminal = [...distribution.terminalValuesReal].sort((a, b) => a - b)
  const p10 = percentile(sortedTerminal, 0.1) // conservative (bad-futures) terminal
  const monthlySpend = params.annualSpendingReal / 12

  // Direction from the verdict; magnitude is a COARSE single-run estimate (the precise
  // optimal-spending solve is the P4 solver — this is a first-answer hint, not a solve).
  let direction: DollarAdjustment['direction']
  let perMonth: number
  if (state === 'over-funded' || (state === 'on-track' && p10 > 0)) {
    // Even the conservative future leaves a surplus → room to spend its safe draw.
    direction = 'room'
    perMonth = (p10 * 0.04) / 12
  } else if (state === 'borderline' || state === 'on-track') {
    // 'on-track' reaches here only when p10 ≤ 0 (the bad-decile future is depleted: survival in
    // [85%, 90%) ⇒ >10% of paths fail). The plan is mostly on track but its downside is rough, so HOLD —
    // never tell an on-track plan to 'trim' (a self-contradicting message vs the headline), and never
    // offer 'room' off a depleted bad decile. (U3-exit code-review pilot — the prior code fell an
    // on-track/p10≤0 plan through to 'trim'.)
    direction = 'on-the-line'
    perMonth = 0
  } else {
    // off-track / already-failing → a shortfall. Coarse proxy: a fraction of current spend scaled
    // by the shortfall in survival below the on-track floor (NOT a solve — the precise optimal-
    // spending answer is the P4 solver). already-failing is unfundable from the start (survival ≈ 0):
    // no single trim is a solve, and the figure SATURATES to ≈ −spend × the gap, carrying ~zero
    // state-specific signal — so it forks to a figure-LESS, lever-agnostic 'rethink' verdict, never
    // the sufficiency-implying 'trim' clause. off-track keeps 'trim' (its reworded clause speaks
    // DIRECTION — "toward steadier ground" — not arrival). (Council 2026-06-29.)
    const gap = Math.max(0, BANDS.onTrack - quantizeSurvival(distribution.survivalFraction))
    perMonth = -monthlySpend * gap
    direction = state === 'already-failing' ? 'rethink' : 'trim'
  }

  const marginToEdge = Math.abs(perMonth - (Math.round(perMonth / DOLLAR_STEP) * DOLLAR_STEP))
  return { perMonthReal: { value: perMonth, marginToEdge }, direction }
}

/** The defined indeterminate reading — minimal/incoherent input yields the honest
 *  "not enough to answer" first answer, never a falsely confident number. */
function indeterminateResult(seed: number): SimulationResult {
  return {
    distribution: { terminalValuesReal: [], depletionYears: [], survivalFraction: 0 },
    headline: { xOfTen: { value: 0, marginToEdge: 0 }, outcomeState: 'indeterminate' },
    dollar: { perMonthReal: { value: 0, marginToEdge: 0 }, direction: 'on-the-line' },
    seed,
  }
}

/** Map a simulation output to the first-answer reading. The INFEASIBLE arm is excluded at
 *  the type level (M6): an infeasible candidate has NO distribution to read and is not the
 *  indeterminate input-failure — the caller (engineProtocol's `runEngine`, the P4 solver)
 *  must dispatch it BEFORE summarizing, so a new call site cannot silently conflate the two. */
export function summarize(
  output: Exclude<SimOutput, { infeasible: true }>,
  params: SimulationParams,
  seed: number,
): SimulationResult {
  if (output.indeterminate) return indeterminateResult(seed)
  const distribution = output.distribution
  const headline = buildHeadline(distribution)
  const dollar = buildDollar(distribution, params, headline.outcomeState)
  // The survivor reading rides iff the run emitted a survivor surface (presence-keyed — absent, not
  // `undefined`, when there is none, mirroring the distribution's taxAware/bandFan convention).
  const survivorReading = buildSurvivorReading(distribution)
  // The floor reading rides iff the run carried a budget (P3·U9, presence-keyed).
  const floorReading = buildFloorReading(distribution)
  return {
    distribution,
    headline,
    dollar,
    ...(survivorReading ? { survivorReading } : {}),
    ...(floorReading ? { floorReading } : {}),
    seed,
  }
}
