/**
 * The spend solve — the REAL answer to "how much could we spend?" / "how much less?" behind the
 * verdict's magnitude clause (register Tier 1 *The spending floor — a real solve*; council
 * wf_faa1af2d-052, 2026-09-26). It replaces `buildDollar`'s heuristics, which were measured WRONG
 * through the real pipeline: the off-track trim over-cut ~2× (`retired` at $10,000: "$2,800" quoted,
 * which the engine rates over-funded) and the room figure oversold (`surplus`: "+$7,470" lands on
 * borderline).
 *
 * THE PREDICATE (one, both directions): a spend PASSES when the engine's OWN reading at it is `room`
 * — `buildDollar`'s direction, i.e. over-funded, or on-track with a bad-decile future that still ends
 * above $0 — AND, when the run carries a survivor reading, that reading is on-track or better. Never
 * the bare `BANDS.onTrack` edge: between 0.85 and the room predicate the engine itself says "close to
 * the line" (the Honesty Hawk's veto, twice). The objective IS the headline's reading at that spend —
 * no second metric (the dateSearch precedent).
 *
 * THE ANSWER is the pass/fail EDGE the halving lands on, on the {@link SPEND_SOLVE_STEP} grid: F passes
 * and F + one step FAILS — both actually run, never inferred (a re-run at F alone proves determinism,
 * not an interval — insight 013). That is the HIGHEST passing grid spend only under the pre-scan's
 * monotonicity CHECK: the scanned readings on the answer's side (the ladder + the entered spend) must
 * read pass…pass fail…fail in spend order, and any other shape — there, at an off-grid entered spend's
 * grid floor, or at F + one step — is refused as `non-monotone` (the caller keeps the figure-less
 * clause; the ACA cliff is a real discontinuity). Monotonicity is CHECKED at every probed spend, never
 * assumed and never proven between them: a pocket the ladder and the halving both step over is unseen.
 *
 * CRN: every candidate differs from the headline's params ONLY in `annualSpendingReal`; the draw
 * schedule is a pure function of (seed, paths, horizon, people), so every probe sees byte-identical
 * futures. PURE: deterministic in (params, seed) — no clock/entropy/environment; async ONLY for the
 * injected cooperative-cancellation seam (`shouldContinue`, the dateSearch shape).
 */
import { simulate } from '@engine/simulate'
import { summarize, SPEND_SOLVE_STEP } from '@engine/confidence'
import type { OutcomeState, SimulationParams } from '@shared/model'

/** The ROOM search's ceiling as a multiple of the entered spend — a household that still reads
 *  `room` at 3× what it entered is `unbracketed` (the clause stays figure-less; "more than 3× your
 *  spending" is not a figure anyone plans a life on). Product-decided, not sourced. */
export const SPEND_SOLVE_ROOM_CAP_MULTIPLE = 3

/** The coarse pre-scan ladders, as multiples of the entered monthly spend, in the order probed.
 *  ROOM probes upward to the cap; TRIM probes downward. Every point is floored onto the grid. */
export const SPEND_SOLVE_PRESCAN = {
  room: [1.25, 1.5, 2, 2.5, SPEND_SOLVE_ROOM_CAP_MULTIPLE],
  trim: [0.75, 0.5, 0.25],
} as const

export type SpendSolveUnsizedReason =
  /** a budget governs spending — the scalar is the budget's year-0 total, so moving it alone would
   *  desync the reconciliation invariant (simulate.ts); budgeted plans stay unsized (R2 open). */
  | 'budget-governed'
  /** the entered spend's reading is not `room` or `trim` (borderline, on the line, already-failing,
   *  indeterminate, or an infeasible run) — no magnitude clause is sized. */
  | 'no-direction'
  /** ROOM only: the joint reading is `room` but the survivor reading at the entered spend is not
   *  on track — no "more" can be quoted while the survivor is short. */
  | 'survivor-short'
  /** the pass/fail boundary was not found inside the scanned range (room past the cap; trim still
   *  failing at the lowest ladder point). */
  | 'unbracketed'
  /** the scanned readings were not pass…pass fail…fail in spend order. */
  | 'non-monotone'
  /** ROOM only: the solved edge F is not above the entered spend (the headroom is under one
   *  step) — "more than $X … at about $X" would be a non-answer. */
  | 'within-a-step'
  /** EITHER direction: the solved edge F is under one grid step ($0 — a trim ladder
   *  floors 0.25 × an entered spend under $400/mo to $0, and $0 can read `room`). A $0 figure is
   *  not a spend anyone plans on, and the sentence's formatter refuses it (the ultramode review's
   *  F1, 2026-09-26: it reached render and the error boundary took the whole app). */
  | 'below-grid'

export type SpendSolveOutcome =
  | {
      readonly kind: 'sized'
      readonly direction: 'room' | 'trim'
      /** F — a POSITIVE multiple of SPEND_SOLVE_STEP (≥ one step — `below-grid` otherwise), real
       *  dollars per month; a run AT F passed. */
      readonly monthlyReal: number
      /** F + SPEND_SOLVE_STEP — a run AT this spend FAILED (the other side of the pin). */
      readonly failedAtMonthlyReal: number
      /** The entered spend the solve started from (the headline's own, unrounded). */
      readonly enteredMonthlyReal: number
      /** How many engine runs the solve took (the profile's unit of cost). */
      readonly probes: number
    }
  | { readonly kind: 'unsized'; readonly reason: SpendSolveUnsizedReason; readonly probes: number }
  | { readonly kind: 'cancelled' }

export interface SpendSolveOptions {
  /** Awaited before every engine run; `false` cancels (the dateSearch seam). */
  readonly shouldContinue?: () => Promise<boolean>
}

const SURVIVOR_OK: ReadonlySet<OutcomeState> = new Set<OutcomeState>(['on-track', 'over-funded'])

interface Probe {
  readonly pass: boolean
  readonly direction: 'room' | 'trim' | 'other'
  /** `room` joint reading whose survivor reading is short (only meaningful at the entered spend). */
  readonly survivorShort: boolean
}

const floorToGrid = (monthly: number): number => Math.floor(monthly / SPEND_SOLVE_STEP) * SPEND_SOLVE_STEP

/** Solve for the grid edge the engine reads as `room` (+ survivor on track) at F and not at F + one
 *  step, both run — the highest such spend under the pre-scan's monotonicity check (see the header). */
export async function solveSpend(
  params: SimulationParams,
  seed: number,
  opts: SpendSolveOptions = {},
): Promise<SpendSolveOutcome> {
  if (params.budget !== undefined) return { kind: 'unsized', reason: 'budget-governed', probes: 0 }
  const shouldContinue = opts.shouldContinue ?? (() => Promise.resolve(true))
  const entered = params.annualSpendingReal / 12
  const cache = new Map<number, Probe>()
  let probes = 0

  /** Run the plan at `monthly` (real $/month) — the ONE field that differs from the headline. */
  const probe = async (monthly: number): Promise<Probe | 'cancelled'> => {
    const hit = cache.get(monthly)
    if (hit !== undefined) return hit
    if (!(await shouldContinue())) return 'cancelled'
    probes++
    const at: SimulationParams = { ...params, annualSpendingReal: monthly * 12 }
    const out = simulate(at, seed, { survivorConditioned: true })
    let result: Probe
    if (out.infeasible) {
      result = { pass: false, direction: 'other', survivorShort: false }
    } else {
      const r = summarize(out, at, seed)
      const d = r.dollar.direction
      const direction = d === 'room' || d === 'trim' ? d : 'other'
      const survivorOk = r.survivorReading === undefined || SURVIVOR_OK.has(r.survivorReading.outcomeState)
      result = { pass: direction === 'room' && survivorOk, direction, survivorShort: direction === 'room' && !survivorOk }
    }
    cache.set(monthly, result)
    return result
  }

  const at = await probe(entered)
  if (at === 'cancelled') return { kind: 'cancelled' }
  if (at.direction === 'other') return { kind: 'unsized', reason: 'no-direction', probes }
  if (at.survivorShort) return { kind: 'unsized', reason: 'survivor-short', probes }
  const direction = at.direction

  // The pre-scan: every ladder point on the answer's side, then the entered spend, in SPEND order.
  const ladder = SPEND_SOLVE_PRESCAN[direction].map((m) => floorToGrid(entered * m))
  const scanned: { readonly monthly: number; readonly pass: boolean }[] = [{ monthly: entered, pass: at.pass }]
  for (const monthly of ladder) {
    const p = await probe(monthly)
    if (p === 'cancelled') return { kind: 'cancelled' }
    scanned.push({ monthly, pass: p.pass })
  }
  scanned.sort((a, b) => a.monthly - b.monthly)
  // Monotone means pass…pass fail…fail as spend rises: once a fail is seen, no later pass.
  let seenFail = false
  for (const s of scanned) {
    if (!s.pass) seenFail = true
    else if (seenFail) return { kind: 'unsized', reason: 'non-monotone', probes }
  }
  const lastPass = [...scanned].reverse().find((s) => s.pass)
  const firstFail = scanned.find((s) => !s.pass)
  if (lastPass === undefined || firstFail === undefined) return { kind: 'unsized', reason: 'unbracketed', probes }

  // Narrow on the grid: lo is the highest known GRID pass, hi the lowest known fail above it.
  let lo = floorToGrid(lastPass.monthly)
  if (lo !== lastPass.monthly) {
    // The entered spend is off-grid; its grid floor is a separate spend and must be run itself.
    const p = await probe(lo)
    if (p === 'cancelled') return { kind: 'cancelled' }
    if (!p.pass) return { kind: 'unsized', reason: 'non-monotone', probes }
  }
  let hi = firstFail.monthly
  while (hi - lo > SPEND_SOLVE_STEP) {
    const mid = floorToGrid((lo + hi) / 2)
    if (mid <= lo || mid >= hi) break
    const p = await probe(mid)
    if (p === 'cancelled') return { kind: 'cancelled' }
    if (p.pass) lo = mid
    else hi = mid
  }
  // The other side of the pin is RUN, never inferred from an off-grid or wider neighbour.
  const above = await probe(lo + SPEND_SOLVE_STEP)
  if (above === 'cancelled') return { kind: 'cancelled' }
  if (above.pass) return { kind: 'unsized', reason: 'non-monotone', probes }
  if (lo < SPEND_SOLVE_STEP) return { kind: 'unsized', reason: 'below-grid', probes }
  if (direction === 'room' && lo <= entered) return { kind: 'unsized', reason: 'within-a-step', probes }
  return {
    kind: 'sized',
    direction,
    monthlyReal: lo,
    failedAtMonthlyReal: lo + SPEND_SOLVE_STEP,
    enteredMonthlyReal: entered,
    probes,
  }
}
