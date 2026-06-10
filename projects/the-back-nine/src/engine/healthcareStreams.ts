/**
 * The per-candidate healthcare cost-stream builder (C3 §3b) — "healthcare ON at the tested
 * date" is STREAM CONSTRUCTION, not an engine gate. The engine has NO retirement boundary:
 * the overlay's ACA gate keys off a finite-positive `enrolledPremium[t]` (+ a pre-65 living
 * member), and IRMAA keys off Medicare enrollment — so the ONLY way a candidate work-stop
 * date moves healthcare is by building the streams it consumes. This module is that single
 * owner. `buildCandidateParams(Y)` (dateSearch.ts) calls it with every still-working person's
 * `retireOffset = Y`; a plain-decumulation caller with bridge years uses it with the ENTERED
 * offsets (the same builder closes the latent shipped ≈$0-lagged-IRMAA hole for them).
 *
 * THE CONTRACT — WINDOW-GATE, never reshape (§3b, decided):
 *   - The entered ACA/OOP schedules are AGE-ANCHORED per-sim-year values ("what coverage
 *     would cost at each age, were you retired then"). The builder only ZEROES them in the
 *     household working window `[0, windowStart)` and passes them through VERBATIM from
 *     `windowStart` — values are NEVER time-shifted, so two candidate windows price the same
 *     absolute sim-year at the same entered value, and CRN comparability across candidates
 *     holds on the value axis too.
 *   - `windowStart = max(0, max_i retireOffset_i)` — the window opens when the LAST worker
 *     stops (the §0 household-level R33 reading: employer family coverage while anyone works;
 *     a mixed household's retired pre-65 spouse is deliberately unpriced during `[0, Y)`,
 *     disclosed through the §0 channel, D2-owned).
 *   - Gated working years carry an EXPLICIT 0 — an entered "no premium", never an absent
 *     hole: the validateParams date-route coverage arm treats ABSENT as the error (a silently
 *     healthcare-blind date), while the wage-blind arm rejects only POSITIVE premiums in
 *     bridge years. Explicit 0s satisfy both. Holes in the RETIRED window pass through as
 *     holes (the coverage arm's job is to catch them).
 *   - `oopMedical` rides the SAME gate (the §6 guard's sibling: no working year may carry a
 *     nonzero HSA-qualified spend — the salary pays working-year medical).
 *   - The IRMAA-MAGI SEED is Y-INVARIANT (pre-sim actual tax returns no candidate can move) —
 *     this builder never touches it.
 *
 * PER-PERSON MEDICARE ONSET (§3b): `onset_i = max(65 − currentAge_i, retireOffset_i)` in
 * sim-year terms — employer coverage past 65 DELAYS Medicare enrollment (the correct
 * real-world model, and the only off-switch for a member working past 65, since no premium
 * stream gates IRMAA); an already-retired person collapses to their 65th sim-year (a retired
 * 66yo IS enrolled from t = 0 — the household `max(65, A)` form would have zeroed their
 * ENTIRE Medicare cost during a spouse's working years: base Part B included, understated
 * cost, a falsely-early date). Values ≤ 0 mean "enrolled before the sim started".
 *
 * THE WORKING-YEAR IRMAA-MAGI OVERRIDE (§3b): the `irmaaMagiSeed` structurally covers ONLY
 * `t < lookback`, so a member crossing onset at `t ≥ lookback` (the common mid-50s case)
 * would lag-read a clamped working year's ≈$0 computed MAGI → lowest tier → understated
 * surcharge → a falsely-early date, SILENTLY (0 is finite). The override supplies a per-year
 * conservatively-high working-year IRMAA-MAGI (from entered working-year income figures),
 * covering exactly the working window `[0, windowStart)` and summing the still-working
 * members per year (each member drops out at their OWN stop). The overlay records it
 * ADDITIVELY (`override[t] + computed`) — never replacement (a working-year conversion /
 * claimed-while-working SS / a 73+ worker's RMD lands in the computed component; additive
 * errs only conservative/later).
 *
 * PURE: a function of its arguments only — no clock/entropy/environment (engine-purity lint).
 * Death truncation is deliberately ABSENT here: streams are per-CANDIDATE, not per-path (one
 * transform cannot see per-path deaths); the death-path residual is disclosed (§7, D2-owned).
 */

/** One household member, in the builder's vocabulary: their whole-year age at sim year 0 and
 *  their work-stop offset in sim-years (`retirementAge − currentAge`; ≤ 0 = already retired).
 *  In the date sweep every still-working person's offset IS the candidate `Y` (§0). */
export interface HealthStreamPerson {
  readonly currentAge: number
  readonly retireOffset: number
}

/** The ENTERED, age-anchored schedules + per-person working-year income figures (D1 collects
 *  these; the engine consumes them as given). All indexed by ABSOLUTE sim-year. */
export interface EnteredHealthSchedules {
  /** Per-year enrolled-plan premium were the household retired that year (real $). */
  readonly enrolledPremium?: readonly number[]
  /** Per-year SLCSP benchmark were the household retired that year (real $). */
  readonly slcsp?: readonly number[]
  /** Per-year out-of-pocket qualified medical (real $; B1's HSA cap consumes it). */
  readonly oopMedical?: readonly number[]
  /** Per-person conservatively-high working-year IRMAA-MAGI figures (real $, from entered
   *  working-year income), aligned by index to the builder's `people`. */
  readonly workingYearIrmaaMagiByPerson?: readonly number[]
}

/** The built per-candidate streams, ready to land on `OverlayParams` (the engine consumes
 *  them through the same validated fields as any caller's). */
export interface BuiltHealthStreams {
  readonly enrolledPremium?: readonly number[]
  readonly slcsp?: readonly number[]
  readonly oopMedical?: readonly number[]
  /** Per-person Medicare-enrollment onset (sim-year terms), people-aligned — ALWAYS built
   *  (the absent-signal biological default is the engine's, not this builder's). */
  readonly medicareOnsetSimYear: readonly number[]
  /** The working-year additive IRMAA-MAGI override, covering exactly `[0, windowStart)`.
   *  Absent when no one works or no figures were supplied. */
  readonly irmaaMagiOverride?: readonly number[]
}

/** `onset_i = max(65 − currentAge_i, retireOffset_i)` (§3b) — see the module doc. */
export function medicareOnsetForPerson(currentAge: number, retireOffset: number): number {
  return Math.max(65 - currentAge, retireOffset)
}

/** Window-gate one age-anchored schedule: explicit 0 in `[0, windowStart)`, verbatim
 *  pass-through (holes preserved) from `windowStart`. Same length, same indexing — values
 *  are never time-shifted. */
function windowGate(entered: readonly number[], windowStart: number): readonly number[] {
  const out: number[] = new Array<number>(entered.length)
  for (let t = 0; t < entered.length; t++) {
    if (t < windowStart) {
      out[t] = 0
    } else if (Object.hasOwn(entered, t)) {
      out[t] = entered[t] as number
    }
    // else: a retired-window HOLE stays a hole (absent ≠ 0 — the coverage arm's distinction).
  }
  return out
}

/**
 * Build the per-candidate healthcare streams (§3b). See the module doc for the full
 * contract. Structural misuse fails loud — these inputs are `buildCandidateParams`
 * arithmetic (offsets/ages), not user value-streams: a NaN here is a programming error that
 * would silently mis-window EVERY stream (insight 010 — a NaN survives every relational
 * compare, so `t < windowStart` would read false forever and un-gate the working years).
 * The entered schedule VALUES pass through un-vetted on purpose: `validateParams` is the
 * R19 gate for value streams, and the date-search's all-or-nothing up-front validation maps
 * a bad value to the defined input-failure rejection (never a mid-sweep throw).
 */
export function buildHealthcareStreams(
  people: readonly HealthStreamPerson[],
  entered: EnteredHealthSchedules,
): BuiltHealthStreams {
  if (people.length === 0) throw new Error('[healthcareStreams] at least one person is required')
  for (const p of people) {
    // INTEGER, not just finite (C3 boundary review): these are sim-year indices/whole-year ages
    // by contract. A fractional retireOffset has TWO failure shapes, one loud-but-bare and one
    // silent — `new Array(windowStart)` below throws an undescriptive RangeError when figures
    // are supplied, and with NO figures the fractional windowStart silently corrupts every
    // `t < windowStart` window gate instead (un-gating working years). Reject both here.
    if (!Number.isInteger(p.currentAge) || !Number.isInteger(p.retireOffset)) {
      throw new Error(
        '[healthcareStreams] currentAge/retireOffset must be whole-year integers — a NaN/fractional offset silently mis-windows every stream (insight 010)',
      )
    }
  }
  const figures = entered.workingYearIrmaaMagiByPerson
  if (figures !== undefined && figures.length !== people.length) {
    throw new Error(
      `[healthcareStreams] workingYearIrmaaMagiByPerson has ${figures.length} entries but the household has ${people.length} people — never silently re-indexed`,
    )
  }

  // The household working window: open until the LAST worker stops (§0's household-level
  // R33 reading). All-retired ⇒ 0 ⇒ every gate below is a verbatim pass-through.
  const windowStart = Math.max(0, ...people.map((p) => p.retireOffset))

  const medicareOnsetSimYear = people.map((p) => medicareOnsetForPerson(p.currentAge, p.retireOffset))

  // The override: per working year, the sum of the still-working members' figures (each
  // member's window is their OWN `[0, retireOffset_i)` — a retired member contributes never).
  let irmaaMagiOverride: number[] | undefined
  if (figures !== undefined && windowStart > 0) {
    irmaaMagiOverride = new Array<number>(windowStart)
    for (let u = 0; u < windowStart; u++) {
      let sum = 0
      for (let i = 0; i < people.length; i++) {
        if (u < (people[i]?.retireOffset ?? 0)) sum += figures[i] ?? 0
      }
      irmaaMagiOverride[u] = sum
    }
  }

  return {
    ...(entered.enrolledPremium ? { enrolledPremium: windowGate(entered.enrolledPremium, windowStart) } : {}),
    ...(entered.slcsp ? { slcsp: windowGate(entered.slcsp, windowStart) } : {}),
    ...(entered.oopMedical ? { oopMedical: windowGate(entered.oopMedical, windowStart) } : {}),
    medicareOnsetSimYear,
    ...(irmaaMagiOverride ? { irmaaMagiOverride } : {}),
  }
}
