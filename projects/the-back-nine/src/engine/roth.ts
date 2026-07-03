/**
 * roth.ts — the U10 two-arm control comparison ORCHESTRATOR (R9's manual half).
 *
 * Runs a "with" arm and a "without" arm of ONE control — the Roth-conversion lever or
 * the sequencing policy — and emits the compact {@link TwoArmOutcome} the TwoFutures
 * surface renders. It ORCHESTRATES; it does NOT re-implement decumulation, taxes, RMDs,
 * the SS fixed-point, or the ACA fixed-point (contract #1, the de-duplication): both
 * arms run through `simulate` → the SAME per-year overlay update the spine uses, so
 * order-of-operations can never drift between the spine and a control.
 *
 * CRN BY CONSTRUCTION (contract #2). The draw schedule is a pure function of the seed
 * and the path/horizon DIMENSIONS only (`buildDraws(seed, paths, maxHorizon, people)`)
 * — financial inputs select which draws are CONSUMED, never how many or their order.
 * The two arms differ ONLY in overlay fields (`conversions` / the drawdown policy),
 * so two `simulate` calls on the SAME seed consume byte-identical normals path-for-path
 * — including across each path's MFJ→single transition. The delta is signal, not luck,
 * and it is stable as the lever drags.
 *
 * THE ARMS DIFFER IN EXACTLY ONE THING (the comparison's honesty):
 *  - `conversion`: with = the candidate plan expanded via the ONE shared
 *    {@link expandRothConversion} (the same function the intake builder uses, so the
 *    lever and the committed model can never disagree about which years convert);
 *    without = NO conversions key (absence, never a zero-fill — reduce-to-spine is
 *    presence-keyed). The base policy rides both arms unchanged.
 *  - `sequencing`: selected policy (+ its order iff 'custom') vs the neutral
 *    `proportional` baseline — the named tax-aware-baseline policy (plan §U10). The
 *    conversion stream (from the base params) rides both arms unchanged.
 *
 * BOTH ARMS AT IDENTICAL TAX FIDELITY (product D-decision; architecture §7.1): there is
 * no tax-blind arm — a tax-blind delta is sign-inverted (it sees only the cash drain of
 * paying conversion tax, so every conversion looks worse).
 *
 * CONVERSION-TAX FUNDING (v1, decided 2026-07-03 by error direction — insight-055
 * composition): the conversion's tax joins the year's gross-up and is funded per the
 * ACTIVE drawdown policy — NOT force-routed from the taxable bucket (the plan's
 * "paid from taxable" ideal). Per-policy funding UNDERSTATES the conversion's benefit
 * (part of the tax burden draws through pre-tax → more ordinary income → more drag),
 * the CONSERVATIVE direction on the recommend-conversion axis — never the optimistic
 * sin. The divergence is DISCLOSED next to the delta (copy.ts) and filed as the
 * R7-editable upgrade (U12's assumption panel).
 */
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import {
  expandRothConversion,
  isDepleted,
  type DepletionYear,
  type SimulationParams,
  type SimulationResult,
  type TwoArmControl,
  type TwoArmOutcome,
  type TwoArmReading,
} from '@shared/model'

/**
 * The LOWER median depletion year across all paths. Never-depleted paths order PAST
 * every real depletion year (they are the best outcomes — the {@link NEVER_DEPLETED}
 * sentinel's raw -1 would otherwise sort them WORST and invert the median). Returns
 * undefined when the median path never depletes — the "~N years longer" secondary is
 * only quotable from two REAL medians, never fabricated. The LOWER median (not an
 * interpolated midpoint) errs toward earlier depletion — the conservative direction.
 */
export function medianDepletionYear(depletionYears: readonly DepletionYear[]): number | undefined {
  if (depletionYears.length === 0) return undefined
  const ordered = depletionYears
    .map((y) => (isDepleted(y) ? y : Number.POSITIVE_INFINITY))
    .sort((a, b) => a - b)
  const median = ordered[Math.floor((ordered.length - 1) / 2)]!
  return Number.isFinite(median) ? median : undefined
}

/** Build one arm's params from the base + the control's setting for that arm. PURE and
 *  minimal: every field the control does not name is the base's, byte-for-byte, so the
 *  arms cannot drift apart on anything but the compared control. */
export function buildArmParams(
  base: SimulationParams,
  control: TwoArmControl,
  arm: 'with' | 'without',
): SimulationParams {
  if (control.kind === 'conversion') {
    const overlay = base.overlay
    if (overlay === undefined) return base // guarded by the caller — see runTwoArm's indeterminate
    // Strip any base conversions first: the WITHOUT arm is genuinely conversion-free, and
    // the WITH arm carries exactly the CANDIDATE plan (never the base's schedule + the
    // candidate's stacked together).
    const { conversions: _base, ...overlayRest } = overlay
    if (arm === 'without') {
      return { ...base, overlay: overlayRest }
    }
    const conversions = expandRothConversion(control.plan, base.maxHorizonYears)
    return {
      ...base,
      overlay: { ...overlayRest, ...(conversions !== undefined ? { conversions } : {}) },
    }
  }
  // P3·U11 — subsidy-regime: the with-arm carries the toggled regime; the without-arm is the
  // base VERBATIM (the current applied regime — the honest "today's plan" baseline whether the
  // user is trying the enhanced hypothesis on or taking an applied one back off). The caller
  // guards healthcareEnabled, so the flag genuinely selects a table.
  if (control.kind === 'subsidy-regime') {
    const overlay = base.overlay
    if (overlay === undefined) return base // guarded by the caller — see runTwoArm's indeterminate
    if (arm === 'without') return base
    // Strip-then-spread (the persisted discipline's wire mirror): the reverted arm carries NO
    // key (the engine's `?? false` default), never `enhancedSubsidies: false`.
    const { enhancedSubsidies: _regime, ...overlayRest } = overlay
    return {
      ...base,
      overlay: { ...overlayRest, ...(control.enhanced ? { enhancedSubsidies: true } : {}) },
    }
  }
  // sequencing: the selected policy vs the proportional baseline. drawdownOrder rides
  // ONLY the with-arm and ONLY when the policy is 'custom' (the biconditional).
  const { drawdownOrder: _order, ...baseRest } = base
  if (arm === 'without') {
    return { ...baseRest, drawdownPolicy: 'proportional' }
  }
  return {
    ...baseRest,
    drawdownPolicy: control.policy,
    ...(control.order !== undefined ? { drawdownOrder: control.order } : {}),
  }
}

/** The median of a plain sample (interpolated midpoint on an even count — the standard
 *  quantile a reader expects; the DEPLETION median above deliberately differs, see its doc). */
function medianOf(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const h = (sorted.length - 1) / 2
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!)
}

/** One arm's compact reading off the resolved result (the wire-crossing subset). */
function readingFrom(result: SimulationResult): TwoArmReading {
  const dist = result.distribution
  const median = medianDepletionYear(dist.depletionYears)
  // P3·U11 — the arm's median LIFETIME healthcare cost (Σ net ACA premium + Σ Medicare per
  // path, then the median). The regime-toggle preview HEADLINES this delta — the regime's
  // effect concentrates pre-65 and may barely move the portfolio median (council 2026-07-03).
  const lifetimeHealthCost = dist.taxAware
    ? medianOf(dist.taxAware.lifetimeNetPremiumReal.map((premium, i) => premium + (dist.taxAware!.lifetimeMedicareCostReal[i] ?? 0)))
    : undefined
  return {
    headline: result.headline,
    ...(result.survivorReading !== undefined ? { survivorReading: result.survivorReading } : {}),
    ...(dist.bandFan !== undefined ? { bandFan: dist.bandFan } : {}),
    survivalFraction: dist.survivalFraction,
    ...(dist.survivorConditioned !== undefined
      ? { survivorFraction: dist.survivorConditioned.survivalFraction }
      : {}),
    ...(median !== undefined ? { medianDepletionYear: median } : {}),
    ...(lifetimeHealthCost !== undefined ? { lifetimeHealthCostMedianReal: lifetimeHealthCost } : {}),
  }
}

/**
 * Run the two-arm comparison. Deterministic in (`base`, `seed`, `control`); the same
 * seed both arms (CRN). The $0-pre-tax / no-overlay conversion case returns the DEFINED
 * indeterminate outcome (the UI closes the lever calmly — "nothing to convert"; R19's
 * calm contract, never a fabricated pair of identical arms).
 */
export function runTwoArm(base: SimulationParams, seed: number, control: TwoArmControl): TwoArmOutcome {
  if (control.kind === 'conversion') {
    // No overlay = no account buckets = nothing to convert; a $0 pre-tax pool is the
    // same terminal state one level down. Both are the lever's defined CLOSED state.
    if (base.overlay === undefined) {
      return { kind: 'indeterminate', reason: 'no account buckets — there is nothing to convert' }
    }
    if (base.overlay.buckets.pretax <= 0) {
      return { kind: 'indeterminate', reason: 'the pre-tax pool is empty — there is nothing to convert' }
    }
  }
  // P3·U11 — the regime toggle is meaningful only where the overlay prices healthcare (the
  // enhanced table selects nothing otherwise — the arms would be byte-identical, a fabricated
  // zero-delta comparison). The UI's categorical door makes this unreachable; this is the
  // engine's own defined calm arm (R19), never a silent identical pair.
  if (control.kind === 'subsidy-regime' && base.overlay?.healthcareEnabled !== true) {
    return { kind: 'indeterminate', reason: 'healthcare is not priced for this household — the subsidy regime changes nothing' }
  }

  const arms: TwoArmReading[] = []
  for (const arm of ['with', 'without'] as const) {
    const params = buildArmParams(base, control, arm)
    const out = simulate(params, seed, { bandFan: true, survivorConditioned: true })
    if (out.indeterminate) return { kind: 'indeterminate', reason: out.reason }
    if (out.infeasible) return { kind: 'infeasible', reason: out.reason }
    arms.push(readingFrom(summarize(out, params, seed)))
  }
  const [withArm, withoutArm] = [arms[0]!, arms[1]!]

  // The delta's basis: the SURVIVOR pair when both arms observed a survivor phase (the
  // plan's primary framing — the survivor's number), else the joint pair. Never mixed.
  const survivorBasis = withArm.survivorFraction !== undefined && withoutArm.survivorFraction !== undefined
  const rawDelta = survivorBasis
    ? withArm.survivorFraction! - withoutArm.survivorFraction!
    : withArm.survivalFraction - withoutArm.survivalFraction

  const medianYearsDelta =
    withArm.medianDepletionYear !== undefined && withoutArm.medianDepletionYear !== undefined
      ? withArm.medianDepletionYear - withoutArm.medianDepletionYear
      : undefined

  return {
    kind: 'two-arm',
    with: withArm,
    without: withoutArm,
    rawDelta,
    deltaBasis: survivorBasis ? 'survivor' : 'joint',
    ...(medianYearsDelta !== undefined ? { medianYearsDelta } : {}),
  }
}
