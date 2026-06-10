/**
 * The date-search (C3) — the exhaustive, non-monotone-robust sweep over the household
 * date-offset `Y` that produces the fuck-off date: the earliest work-stop offset at which
 * the headline statement reads on-track-or-better, with honest confidence machinery.
 *
 * THE DATE-SEARCH IS NOT THE SOLVER (R32) — it is an outer sweep over a BOUNDED window of
 * candidate offsets (`Y = 0..DATE_OFFSET_WINDOW_TOP`, ≤ 11 candidates), each candidate
 * running the EXISTING `simulate` on the SAME seed (CRN: the draw schedule is a pure
 * function of dimensions, so a tested `Y` moves which draws each phase consumes, never how
 * many or their order — R34's one continuous timeline). It is NOT bias-free either (§3c):
 * `survivalFraction` is an MC point estimate, and selecting the EARLIEST offset whose noisy
 * estimate clears the bar is a threshold-crossing argmin that biases the date EARLIER (the
 * lucky-noise candidate gets crowned — calm-but-wrong-OPTIMISTIC, the cardinal sin). The
 * shared-CRN seed makes per-candidate errors positively CORRELATED, so the keeps-holding
 * rule alone rubber-stamps the false-early offset rather than catching it. The defense is
 * the rule itself: crown off the QUANTIZED one-sided LOWER confidence bound.
 *
 * THE RULE (§3c — every term pinned, not vibed):
 *   - the bar = `BANDS.onTrack`, READ from confidence.ts (the date is DEFINED as "the
 *     earliest offset at which the headline reads on-track-or-better" — objective ≡
 *     headline, no second metric);
 *   - z = {@link DATE_SEARCH_Z} = 1.645 (one-sided 95% — the haircut guards exactly one
 *     direction, the false-early crown);
 *   - the lower bound `p̂ − z·SE` is quantized to `SURVIVAL_GRID` BEFORE the bar compare
 *     (`quantizeSurvival` — the headline's own reading; a date that flips across JS engines
 *     is the same hazard as a headline that does);
 *   - `paths` is pinned per tier ({@link DATE_SEARCH_PATHS}): the FINAL tier's 16,000 makes
 *     `z·SE ≤ ½·SURVIVAL_GRID` at the bar (the haircut moves the quantized reading at most
 *     one grid cell — a designed bounded effect, asserted in the suite); the PROVISIONAL
 *     tier (the during-entry refire posture) runs the headline's 2,000 — its coarser
 *     haircut errs later/conservative, a DESIGNED exemption rendered only under D1's
 *     provisional string class, never crowned as final.
 *
 * NEVER A BISECTION (R26; insight 013): the ACA 400%-FPL cliff is a documented engine
 * discontinuity, so "later = safer" is false — a later offset can FAIL where an earlier one
 * held. The sweep is exhaustive and the crown is the earliest offset that clears AND KEEPS
 * clearing through the window top, with any cleared-then-dipped region DISCLOSED.
 *
 * PURE: deterministic in (input, seed) — no clock/entropy/environment (engine-purity lint).
 * Async ONLY for the cooperative-cancellation seam: the injected `shouldContinue` is awaited
 * between candidate runs (the worker-side implementation does the real macrotask yield +
 * epoch compare in engineProtocol.ts — the same injected-dependency shape as the seed, so a
 * plain-environment test can drive cancellation directly).
 */
import { simulate, validateParams } from '@engine/simulate'
import { BANDS, quantizeSurvival } from '@engine/confidence'
import { buildHealthcareStreams, type EnteredHealthSchedules } from '@engine/healthcareStreams'
import type {
  DateOffsetReading,
  DateSearchOutcome,
  DateSearchTier,
  DateTrackOutcome,
  OverlayParams,
  PersonContributionStreams,
  SimulationParams,
} from '@shared/model'

/**
 * The bounded offset-window top: candidates are `Y = 0..top` inclusive (≤ 11 runs).
 * ANSWER-BEARING, not a compute/UX knob (§3c): the top offset is the keeps-holding evidence
 * anchor, so a one-offset width change can flip outcome CLASSES (floor-confirmed vs
 * no-date-in-window). Pinned in the §3c "pinned, not vibed" family — plan-provenance (a
 * product-decided constant, not a sourced figure); any future change re-runs the §3c
 * honesty battery (both window-edge arms, dip-never-recovers, the two-seed stability test),
 * never tuned against a profile budget or the cold-read.
 */
export const DATE_OFFSET_WINDOW_TOP = 10

/**
 * The pinned per-tier path counts (§3c). `final` = 16,000: the smallest round count with
 * `z·SE ≤ ½·SURVIVAL_GRID` at the `BANDS.onTrack` bar (z²·p(1−p)/0.005² ≈ 13,800 at
 * p = 0.85) — the designed tolerance that keeps the conservative haircut sub-quantum.
 * `provisional` = the headline's 2,000 (the during-entry refire tier — same seed, same
 * CRN-uniform candidates, same rule; the coarser haircut errs later/conservative). The
 * counts are NOT caller-tunable — the tier name is the only dial (the 16k pin itself is a
 * contract, asserted in the suite).
 */
export const DATE_SEARCH_PATHS = { provisional: 2_000, final: 16_000 } as const satisfies Record<
  DateSearchTier,
  number
>

/** One-sided 95% (§3c): the haircut guards exactly one direction — the false-early crown. */
export const DATE_SEARCH_Z = 1.645

/** The date-search input: the ORIGINAL entered params (never mutated — every candidate is a
 *  pure transform of them) + the per-person working-year IRMAA-MAGI figures the override is
 *  built from (D1 collects them; conservatively-high from entered working-year income). The
 *  overlay's health streams carry the AGE-ANCHORED entered schedules ("what coverage would
 *  cost at each age, were you retired then") — the transform window-gates them per
 *  candidate, never time-shifts them (§3b). */
export interface DateSearchInput {
  readonly params: SimulationParams
  readonly workingYearIrmaaMagiByPerson?: readonly number[]
}

/** Sweep options: the compute tier + the cooperative-cancellation gate (awaited between
 *  candidate runs; default always-continue). */
export interface DateSweepOptions {
  readonly tier: DateSearchTier
  readonly shouldContinue?: () => Promise<boolean>
}

/** Truncate one per-person contribution stream family to the working window `[0, Y)` —
 *  contributions stop at the tested date (R31). */
function truncateStreams(pc: PersonContributionStreams, offsetYears: number): PersonContributionStreams {
  const cut = (s: readonly number[] | undefined) => (s === undefined ? undefined : s.slice(0, offsetYears))
  const taxable = cut(pc.taxable)
  const pretax = cut(pc.pretax)
  const roth = cut(pc.roth)
  const hsa = cut(pc.hsa)
  const employerMatch = cut(pc.employerMatch)
  return {
    ...(taxable ? { taxable } : {}),
    ...(pretax ? { pretax } : {}),
    ...(roth ? { roth } : {}),
    ...(hsa ? { hsa } : {}),
    ...(employerMatch ? { employerMatch } : {}),
  }
}

/**
 * Build candidate `Y`'s parameters — the SINGLE owner of Y-dependent construction (§0/§3a).
 * "Set the tested date" is NOT one knob; from one `Y`, against the ORIGINAL entered params
 * (pure per candidate, never progressively mutated), it derives:
 *
 *   1. The PER-PERSON `retirementAge` overrides: each STILL-WORKING person (entered
 *      `retirementAge > currentAge`) gets `currentAge_i + Y`, so every working person's
 *      retire offset equals `Y` exactly — `(currentAge_i + Y) − currentAge_i = Y`, they
 *      coincide BY CONSTRUCTION regardless of differing ages (the engine has NO household
 *      age — §0). An ALREADY-RETIRED person (entered `retirementAge ≤ currentAge`; boundary
 *      equality counts as retired) keeps their entered age VERBATIM — never un-retired into
 *      phantom income (the bridge credits `earnedIncomeReal` for every `t < retire`).
 *      SS claim ages are held AS ENTERED (claim is not searched).
 *   2. The per-person contribution streams TRUNCATED to `[0, Y)` (contributions stop at the
 *      tested date, R31) — and the accumulation construct is ALWAYS PRESENT on a candidate
 *      (entered or empty): its presence keys the §7 working-year zero-withdrawal clamp (the
 *      date route's household lives on salary; a zero-valued-but-constructed run is
 *      deliberately NOT byte-identical to construct-absent — §1; `Y = 0` has no working
 *      years, so presence is inert there and the empty-window golden holds).
 *   3. The healthcare streams (§3b — `healthcareStreams.ts`, window-gated per `Y`, values
 *      never time-shifted), the per-person Medicare onset (`max(65 − currentAge_i, Y)` for
 *      the still-working), and the working-year IRMAA-MAGI override. `healthcareEnabled` is
 *      forced TRUE — a silently healthcare-blind date is never an open path (D1's decided
 *      posture; the validateParams date-route coverage rule enforces the streams' presence
 *      where they are answer-bearing). The IRMAA seed passes through Y-INVARIANT (pre-sim
 *      actual returns no candidate can move).
 *   4. `paths` = the tier's pinned count (the entered headline count is replaced).
 *
 * Throws on STRUCTURAL misuse (no overlay / tax off) — `runDateSearch` pre-rejects both
 * with the calm input-failure grammar, so the throw guards only a direct caller.
 */
export function buildCandidateParams(
  input: DateSearchInput,
  offsetYears: number,
  paths: number,
): SimulationParams {
  const { params } = input
  const overlay = params.overlay
  if (overlay === undefined || !overlay.taxEnabled) {
    throw new Error(
      '[dateSearch] buildCandidateParams requires the tax overlay (taxEnabled) — the date is never computed tax-blind (runDateSearch rejects this calmly up front)',
    )
  }
  if (!Number.isInteger(offsetYears) || offsetYears < 0) {
    throw new Error(`[dateSearch] offsetYears must be a non-negative integer (got ${offsetYears})`)
  }

  // (1) Per-person retirement overrides — still-working → currentAge + Y; retired verbatim.
  const people = params.people.map((p) =>
    p.retirementAge > p.currentAge ? { ...p, retirementAge: p.currentAge + offsetYears } : p,
  )
  const retireOffsets = people.map((p) => p.retirementAge - p.currentAge)

  // (3) The per-candidate healthcare streams + onset + override (window-gate, never reshape).
  const figures = input.workingYearIrmaaMagiByPerson
  const entered: EnteredHealthSchedules = {
    ...(overlay.enrolledPremium ? { enrolledPremium: overlay.enrolledPremium } : {}),
    ...(overlay.slcsp ? { slcsp: overlay.slcsp } : {}),
    ...(overlay.oopMedical ? { oopMedical: overlay.oopMedical } : {}),
    ...(figures ? { workingYearIrmaaMagiByPerson: figures } : {}),
  }
  const streams = buildHealthcareStreams(
    people.map((p, i) => ({ currentAge: p.currentAge, retireOffset: retireOffsets[i] ?? 0 })),
    entered,
  )

  // (2) Contributions truncated to [0, Y); the construct ALWAYS present (the §7 clamp key).
  const enteredContributions = overlay.accumulation?.contributionsByPerson
  const contributionsByPerson = people.map((_, i) => truncateStreams(enteredContributions?.[i] ?? {}, offsetYears))

  // The transform AUTHORITATIVELY owns every Y-dependent overlay field: the gated streams,
  // the onset, and the override replace any entered values (the entered schedules are the
  // age-anchored INPUTS the builder gates — they never reach the engine ungated).
  const {
    enrolledPremium: _e,
    slcsp: _s,
    oopMedical: _o,
    medicareOnsetSimYear: _m,
    irmaaMagiOverride: _w,
    accumulation: _a,
    ...overlayBase
  } = overlay
  const candidateOverlay: OverlayParams = {
    ...overlayBase,
    healthcareEnabled: true,
    accumulation: { contributionsByPerson },
    medicareOnsetSimYear: streams.medicareOnsetSimYear,
    ...(streams.enrolledPremium ? { enrolledPremium: streams.enrolledPremium } : {}),
    ...(streams.slcsp ? { slcsp: streams.slcsp } : {}),
    ...(streams.oopMedical ? { oopMedical: streams.oopMedical } : {}),
    ...(streams.irmaaMagiOverride ? { irmaaMagiOverride: streams.irmaaMagiOverride } : {}),
  }

  return { ...params, people, paths, overlay: candidateOverlay }
}

/** One candidate offset's raw sweep evidence (the decision rule derives the rest). */
export interface OffsetSurvival {
  readonly offsetYears: number
  readonly survivalFraction: number
}

/**
 * The §3c decision rule, pure and sweep-independent: derive each offset's quantized
 * one-sided lower confidence bound, crown the start of the LONGEST CLEARING SUFFIX (the
 * earliest offset that clears AND keeps clearing through the window top — it exists iff the
 * top offset clears), and classify into the three first-class outcomes. Every cleared
 * offset BELOW the candidate is by construction cleared-then-dipped (the candidate is the
 * earliest suffix start, so a failure separates them) — the non-monotone disclosure, the
 * ACA-cliff signature insight 013 predicts. Separated from the sweep so the rule is
 * testable on CONSTRUCTED curves (engineering a real MC fixture that dips at a chosen
 * offset would be the engine-as-oracle anti-pattern, DND/012).
 */
export function decideTrack(curve: readonly OffsetSurvival[], paths: number): DateTrackOutcome {
  if (curve.length === 0) throw new Error('[dateSearch] decideTrack requires a non-empty curve')
  if (!Number.isInteger(paths) || paths <= 0) {
    throw new Error(`[dateSearch] decideTrack paths must be a positive integer (got ${paths})`)
  }
  const readings: DateOffsetReading[] = curve.map((c) => {
    const p = c.survivalFraction
    // Finiteness FIRST (insight 010): a NaN survival would sail through the ≥-bar compare
    // as a silent FAIL — a wrongly-pessimistic curve is still a wrong curve; fail loud.
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new Error(`[dateSearch] survivalFraction must be finite in [0, 1] (got ${p} at Y=${c.offsetYears})`)
    }
    const se = Math.sqrt((p * (1 - p)) / paths)
    const lower = Math.max(0, p - DATE_SEARCH_Z * se)
    const quantizedLowerBound = quantizeSurvival(lower)
    return {
      offsetYears: c.offsetYears,
      survivalFraction: p,
      quantizedLowerBound,
      clears: quantizedLowerBound >= BANDS.onTrack,
    }
  })

  // The candidate = the start of the longest clearing suffix (exists iff the top clears).
  const topIdx = readings.length - 1
  let candidateIdx: number | null = null
  if (readings[topIdx]?.clears === true) {
    let i = topIdx
    while (i >= 0 && readings[i]?.clears === true) i--
    candidateIdx = i + 1
  }

  // Cleared-then-dipped offsets: every clearing offset below the candidate (or ALL clearing
  // offsets when no candidate exists — each necessarily dipped before the failing top).
  const nonMonotoneOffsets = readings
    .filter((r, i) => r.clears && (candidateIdx === null || i < candidateIdx))
    .map((r) => r.offsetYears)

  if (candidateIdx === null) {
    return { kind: 'no-date-in-window', nonMonotoneOffsets, curve: readings }
  }
  const crowned = readings[candidateIdx]
  if (crowned === undefined) throw new Error('[dateSearch] internal: crowned reading missing') // unreachable
  const grade = {
    quantizedLowerBound: crowned.quantizedLowerBound,
    survivalFraction: crowned.survivalFraction,
    marginAboveBar: crowned.quantizedLowerBound - BANDS.onTrack,
  }
  const common = {
    offsetYears: crowned.offsetYears,
    grade,
    nonMonotoneOffsets,
    curve: readings,
  }
  // The window-FLOOR confirmed case (candidateIdx === 0) needs NO extra disclosure: the
  // keeps-holding evidence is MAXIMAL there (every later in-window offset was evaluated);
  // "work-optional AT today" is one-sided by design (negative offsets are never evaluated).
  return candidateIdx === topIdx
    ? { kind: 'window-edge-unconfirmed', ...common }
    : { kind: 'confirmed-date', ...common }
}

/**
 * Run the date-search: validate EVERY candidate up front (all-or-nothing — §3), then sweep
 * `Y = 0..top` on ONE seed at the tier's pinned paths, awaiting the cooperative-cancellation
 * gate between candidate runs, and crown per the §3c rule.
 *
 * THE ALL-OR-NOTHING REJECTION POLICY: `validateParams` is cheap and draw-free, so every
 * candidate's params are validated BEFORE any pinned-path run is dispatched. ANY candidate
 * rejection ⇒ the run-level input-failure variant naming the offending candidate + reason —
 * NEVER drop-and-continue (an unevaluated offset voids the "earliest" claim and silently
 * narrows the answer-bearing window; the seed requirement is genuinely candidate-dependent,
 * so dropping the rejecting candidates would crown a false "confirmed earliest" from the
 * survivors). This routes to D1's input-incomplete placeholder for free (a validateParams
 * rejection IS input failure) and applies identically to both tiers.
 *
 * V1 TRACKS: the degenerate single-total-spend budget makes the floor and lifestyle tracks
 * byte-identical, so ONE curve is evaluated and both tracks read it (the dates COINCIDE —
 * R27; rendered as one). The result SHAPE admits every mixed case now; P3·U9's two-track
 * budget compilation threads two spending figures through this same sweep (the behavioral
 * mixed tests ride U9 — insight 014).
 */
export async function runDateSearch(
  input: DateSearchInput,
  seed: number,
  opts: DateSweepOptions,
): Promise<DateSearchOutcome> {
  const { params } = input
  const paths = DATE_SEARCH_PATHS[opts.tier]
  if (params.people.length === 0) {
    return { kind: 'input-failure', reason: 'no people — the household is empty' }
  }
  // §0 — the all-retired household NEVER enters the sweep (the engine-layer mirror of D2's
  // route predicate, never caller-routing alone): the offset axis is undefined when no
  // work-stop exists to search. NEVER a `Y = 0` "work-optional today" crown (that would
  // conflate already-retired with work-optional-confirmed — an off-track retiree is
  // neither), never a candidate run. The boundary equality (retirementAge === currentAge)
  // counts as retired. Correctness, not just UX: a Y > 0 candidate would zero a retiree's
  // REAL ACA premium stream in [0, Y), un-pricing healthcare they actually pay.
  if (params.people.every((p) => p.retirementAge <= p.currentAge)) {
    return {
      kind: 'input-failure',
      reason:
        'every household member is already retired — the date-offset axis is undefined (the already-retired route is the spine-first confidence statement, §0)',
    }
  }
  if (params.overlay === undefined || !params.overlay.taxEnabled) {
    return {
      kind: 'input-failure',
      reason:
        'the date search requires the tax overlay (taxEnabled) — a tax-blind date is the superseded single-figure on-ramp, never silently computed',
    }
  }
  // The window top is the keeps-holding evidence anchor: a horizon at or below it would
  // grade the top candidates on an EMPTY retirement window (survival ≈ 1 by construction —
  // a structurally false clearing), so reject the degenerate geometry loudly.
  if (params.maxHorizonYears <= DATE_OFFSET_WINDOW_TOP) {
    return {
      kind: 'input-failure',
      reason: `maxHorizonYears must exceed the ${DATE_OFFSET_WINDOW_TOP}-year window top (a top candidate needs retirement years to grade honestly)`,
    }
  }

  // ALL-OR-NOTHING up-front validation (cheap, draw-free — zero pinned-path runs yet).
  const candidates: SimulationParams[] = []
  for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y++) {
    let candidate: SimulationParams
    try {
      candidate = buildCandidateParams(input, y, paths)
    } catch (e) {
      return {
        kind: 'input-failure',
        reason: `candidate Y=${y} could not be constructed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
    const invalid = validateParams(candidate)
    if (invalid !== null) {
      return { kind: 'input-failure', reason: `candidate Y=${y} rejected: ${invalid}` }
    }
    candidates.push(candidate)
  }

  // The sweep — every candidate on the SAME seed at the SAME pinned paths (CRN-uniform).
  const shouldContinue = opts.shouldContinue ?? (() => Promise.resolve(true))
  const curve: OffsetSurvival[] = []
  for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y++) {
    // The cooperative-cancellation gate (§3 worker seam): a lock or a newer request means
    // no further candidate is dispatched and the in-flight result is discarded unrendered
    // (the worker-side implementation yields a real macrotask + compares the epoch here).
    if (!(await shouldContinue())) return { kind: 'cancelled' }
    const candidate = candidates[y]
    if (candidate === undefined) throw new Error('[dateSearch] internal: candidate missing') // unreachable
    const out = simulate(candidate, seed)
    if (out.indeterminate) {
      // Defensive: validateParams accepted this candidate above, so an indeterminate here
      // is a gate/engine disagreement — surface it through the same calm grammar.
      return { kind: 'input-failure', reason: `candidate Y=${y} rejected: ${out.reason}` }
    }
    curve.push({ offsetYears: y, survivalFraction: out.distribution.survivalFraction })
  }

  // V1 degenerate budget: one curve, two coincident tracks (the SHAPE admits U9's split).
  const track = decideTrack(curve, paths)
  return {
    kind: 'dates',
    floor: track,
    lifestyle: track,
    tier: opts.tier,
    windowTopYears: DATE_OFFSET_WINDOW_TOP,
    seed,
  }
}
