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
import { BANDS, quantizeSurvival, summarize } from '@engine/confidence'
import { buildHealthcareStreams, type EnteredHealthSchedules } from '@engine/healthcareStreams'
import type {
  DateBand,
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
  // Symmetric with the Y guard (a structural-misuse throw for direct callers): a bad `paths`
  // here would land on the candidate and only surface as a downstream validateParams rejection
  // misattributed to the candidate — or, for a caller that skips re-validation and hand-feeds
  // decideTrack, as a silently mis-sized SE (an optimistic crown). runDateSearch always injects
  // the tier's pinned count, so this bites only the direct caller it names.
  if (!Number.isInteger(paths) || paths <= 0) {
    throw new Error(`[dateSearch] paths must be a positive integer (got ${paths})`)
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
  //
  // R40 · KTD-8a — `income` is DELIBERATELY NOT destructured out: it is Y-INVARIANT (a pension is
  // received the same in real terms whatever date the household stops working), so it flows through
  // `...overlayBase` UN-truncated, compiled ONCE in `buildOverlay`/`buildParams`, never per candidate.
  // (Truncating it the way contributions are truncated would zero a retiree's pension over [0, Y),
  // un-modeling income they actually receive — the calm-but-wrong direction. The income-invariance
  // CRN test pins that two candidates differing only in Y carry the identical income vectors.)
  //
  // `medicareExtrasMonthly` (the ask-for-Medicare-extras unit) is likewise DELIBERATELY NOT
  // destructured out: the per-person premium dollar is Y-INVARIANT (what a person pays for
  // Part D/Medigap does not depend on the candidate stop date) — WHICH YEARS it charges is
  // decided engine-side by the per-candidate `medicareOnsetSimYear` ∩ living set. Stripping it
  // here would silently $0 every date candidate's extras — the forbidden shape (b), the
  // cardinal optimistic sin.
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
  // `paths` MUST be the path count every curve entry was actually sampled at (the SE at each
  // offset is √(p̂(1−p̂)/paths)): a caller passing fractions sampled at 2k with paths=16k gets a
  // too-narrow haircut — an optimistic crown. runDateSearch guarantees the coupling (one pinned
  // tier for both); a direct caller owns it. Single-sourced by contract, not carried per-entry
  // (the persisted OffsetSurvival shape stays minimal).
  if (!Number.isInteger(paths) || paths <= 0) {
    throw new Error(`[dateSearch] decideTrack paths must be a positive integer (got ${paths})`)
  }
  // THE DENSE-AXIS CONTRACT (v1): offsetYears === its array index, contiguous from 0. The rule's
  // entire honesty argument — "the earliest offset that clears AND KEEPS CLEARING through the
  // window top" — requires every intermediate offset to have been EVALUATED; on a gapped curve
  // an unevaluated dip between the crowned offset and the top (the exact ACA-cliff signature,
  // insight 013) would be skipped, crowning a falsely-EARLY date: the cardinal optimistic sin.
  // So a gapped/unsorted/re-based curve is rejected loudly, never "handled". This is also what
  // the only production producer emits (runDateSearch's dense 0..top sweep), and it makes any
  // index↔offset confusion in the suffix walk below HARMLESS by construction (the two are equal
  // — insight 015's mutation class closed by contract, not by detection). U9's two-track split
  // threads two spend figures through the SAME dense sweep, so the contract survives U9; revisit
  // only if the offset axis itself ever changes shape.
  curve.forEach((c, i) => {
    if (!Number.isInteger(c.offsetYears) || c.offsetYears !== i) {
      throw new Error(
        `[dateSearch] decideTrack requires a dense contiguous offset axis — offsetYears must equal its index (got ${c.offsetYears} at index ${i}); a gap would let an unevaluated dip crown a falsely-early date`,
      )
    }
  })
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
  // The seed is PERSISTED on the 'dates' outcome with a bit-identical-reproduction contract
  // (model.ts — a reopened plan re-runs the identical headline), and a non-finite seed would
  // JSON-null on the U4 write (DND/009) while the engine silently ran on `seed|0 = 0` — the
  // persisted record would not even match what produced the result. Reject it as the defined
  // input failure (NaN-first, insight 010). The headline route's RNG-seed posture is tracked
  // separately (TODO) — this guards the NEW persisted surface C3 introduces.
  if (!Number.isInteger(seed)) {
    return { kind: 'input-failure', reason: `seed must be a finite integer (got ${seed})` }
  }
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
  //
  // DISCLOSED SHALLOW-WINDOW RESIDUAL (C3 boundary review, 4 lenses converged): the guard's
  // principled core is NON-EMPTINESS — at maxHorizonYears == windowTop + 1 the Y = top
  // candidate still grades on a single retirement year (survival structurally near 1, the
  // optimistic direction), and the effect decays continuously as the horizon grows. No
  // principled minimum exists to pin here (any MIN_RETIREMENT_GRADING_YEARS would be vibed,
  // not derived — the §3c constants are pinned-or-nothing), and a real household's horizon is
  // longevity-derived (30–50yr), so the shallow geometry is reachable only by pathological
  // input. Accepted + pinned by a boundary test; D1's input shaping owns any user-facing
  // floor above this engine minimum.
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
  // P3·U9: a budget-carrying input sweeps BOTH tracks in the same ~(window+1) sims — each
  // candidate simulate runs the floor pass internally and emits `distribution.floor`, so
  // the floor curve costs no extra candidate runs (only the per-candidate second pass).
  const hasBudget = input.params.budget !== undefined
  const shouldContinue = opts.shouldContinue ?? (() => Promise.resolve(true))
  const curve: OffsetSurvival[] = []
  const curveFloor: OffsetSurvival[] = []
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
    if (out.infeasible) {
      // The typed per-candidate INFEASIBLE sentinel (M6): a path's overlay computation
      // failed mid-run on gate-valid input (a solver non-convergence / fail-loud backstop).
      // The all-or-nothing policy applies exactly as for a rejection — an unevaluated
      // offset voids the "earliest" claim, so the RUN fails with the named reason (never
      // drop-and-continue, never a generic calm-error that hides WHICH offset broke).
      return {
        kind: 'input-failure',
        reason: `candidate Y=${y} infeasible: ${out.reason} (path ${out.pathIndex})`,
      }
    }
    curve.push({ offsetYears: y, survivalFraction: out.distribution.survivalFraction })
    if (hasBudget) {
      const fl = out.distribution.floor
      if (fl === undefined) {
        // Internal inconsistency (the engine's floor emission is param-driven): a
        // budget-carrying candidate that emits no floor would silently collapse the
        // two-date answer back to one — fail loud, never alias-and-continue.
        throw new Error(`[dateSearch] internal: candidate Y=${y} carried a budget but emitted no floor track`)
      }
      curveFloor.push({ offsetYears: y, survivalFraction: fl.survivalFraction })
    }
  }

  // P3·U9 — the two tracks. LIFESTYLE reads the full-spend curve; FLOOR reads the
  // essentials-only curve when a budget rode the run — two INDEPENDENTLY-derived
  // outcomes through the SAME decideTrack rule/z/grid (insight 047: the split must
  // never alias, or a consumer mutating one corrupts the other). The un-itemized
  // degenerate keeps the single aliased track object — one curve, two coincident
  // tracks, byte-identical to every pre-U9 run (test-pinned).
  const lifestyle = decideTrack(curve, paths)
  const floor = hasBudget ? decideTrack(curveFloor, paths) : lifestyle

  // D2 band: the crowned candidate's per-year projection fan, emitted ONCE — only when a date
  // was crowned (a no-date track has no offset to project; that surface shows no band). The
  // dense-axis contract guarantees `candidates[offsetYears]` IS the crowned candidate, and CRN
  // makes this fan-ON re-run byte-identical to the fan-OFF sweep reading that crowned the date —
  // so the band observes the very distribution behind the date, never a second drifting picture.
  // The sweep ran every candidate fan-OFF (perf + wire payload); this single targeted re-run at
  // the crowned offset is the decided cost (2026-06-28), not fattening every candidate.
  //
  // P3·U9 (council 2026-07-02): the band crowns off the FLOOR track — the load-bearing survival
  // claim — and ALL THREE band fields ride that one track: the fan observes the FLOOR pass
  // (`bandFanTrack: 'floor'`), the state is the FLOOR reading, the offset is the floor's crown.
  // A mixed pairing would lie in one direction or the other (an "on-track" tag over a full-spend
  // fan that dips, or a full-track state that breaks the on-track-or-better contract at a
  // floor-only offset). on-track-or-over-funded still holds by construction: the floor curve's
  // quantized lower bound cleared the bar at this offset, and the re-run is CRN-identical.
  // A can't-fund-the-full-lifestyle tier is a no-date lifestyle track + words — never a hidden
  // red band. The un-itemized degenerate keeps the headline state (the tracks coincide).
  const crownedOffset =
    floor.kind === 'confirmed-date' || floor.kind === 'window-edge-unconfirmed'
      ? floor.offsetYears
      : undefined
  // The crowned candidate already simulated cleanly in the sweep (it produced the crowning
  // reading), and bandFan/summarize perturb no feasibility — so a clean fan-ON re-run is
  // guaranteed. Guard defensively (indeterminate, then infeasible — mirroring the sweep grammar):
  // an indeterminate/infeasible here would be an engine inconsistency, so leave the band absent
  // rather than crash the crowned date.
  let band: DateBand | undefined
  if (crownedOffset !== undefined) {
    // Honor the cooperative-cancellation seam before the most expensive single op (one final-tier
    // run): a newer/locked request arriving after the last sweep candidate must preempt it, exactly
    // as the sweep loop gates every candidate (the module's "async ONLY for cancellation" contract).
    if (!(await shouldContinue())) return { kind: 'cancelled' }
    const crownedParams = candidates[crownedOffset]!
    const crownedOut = simulate(crownedParams, seed, {
      bandFan: true,
      ...(hasBudget ? { bandFanTrack: 'floor' as const } : {}),
    })
    if (!crownedOut.indeterminate && !crownedOut.infeasible) {
      const fan = crownedOut.distribution.bandFan
      if (fan !== undefined) {
        const summary = summarize(crownedOut, crownedParams, seed)
        band = {
          fan,
          outcomeState:
            hasBudget && summary.floorReading !== undefined
              ? summary.floorReading.outcomeState
              : summary.headline.outcomeState,
          offsetYears: crownedOffset,
        }
      }
    }
  }

  return {
    kind: 'dates',
    floor,
    lifestyle,
    tier: opts.tier,
    windowTopYears: DATE_OFFSET_WINDOW_TOP,
    seed,
    ...(band !== undefined ? { band } : {}),
  }
}
