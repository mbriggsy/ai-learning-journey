/**
 * The shared plaintext model + the engine's I/O contract (the leaf layer).
 *
 * `src/shared` is the bottom of the dependency graph: the pure engine, the crypto
 * layer, the store, and every UI surface import these types; shared imports NOTHING
 * from a feature layer (ESLint-enforced). This file is therefore the single home of
 * the vocabulary the whole app agrees on — the outcome-state set, the engine's
 * parameter + result shapes, and the persisted-scenario skeleton.
 *
 * SCOPE (P1·U1): the spine runs tax-free / healthcare-free, so this defines the
 * engine's core contract + a minimal plaintext `Scenario`. U2/U3 extend `Scenario`
 * with per-person account buckets + birth years (the schemaVersion-2 field shape);
 * U4 wraps it in the persisted record types + owns the `schemaVersion` migration
 * ladder. Those extensions are additive — the fields here are written from v1.
 */

// ---------------------------------------------------------------------------
// Outcome-state set — engine-owned, single-sourced HERE (contract: the engine is
// the sole authority that selects the state and owns every band edge). The P3
// budget split adds a two-tier lexicographic *reading* over these same states —
// never a 7th state.
// ---------------------------------------------------------------------------

/** The single-metric first-answer outcome states. */
export type OutcomeState =
  | 'on-track' // comfortably funded across the futures
  | 'borderline' // near a band edge — a coin-flip-ish reading
  | 'off-track' // materially underfunded across the futures
  | 'indeterminate' // not enough (or incoherent) input to answer honestly
  | 'over-funded' // all/near-all futures survive — the 10/10-honesty ceiling
  | 'already-failing' // depleted (or near it) before the horizon even runs

/** Exhaustive, ordered list — the iteration surface for tests + UI. Keep in sync
 *  with `OutcomeState` (a compile-time check below proves it covers the union). */
export const OUTCOME_STATES = [
  'on-track',
  'borderline',
  'off-track',
  'indeterminate',
  'over-funded',
  'already-failing',
] as const

// Compile-time exhaustiveness: if `OutcomeState` gains a member not in the array
// (or vice-versa), one of these assignments fails to typecheck.
type _StatesCoverUnion = (typeof OUTCOME_STATES)[number] extends OutcomeState ? true : never
type _UnionCoveredByStates = OutcomeState extends (typeof OUTCOME_STATES)[number] ? true : never
const _statesExhaustive: _StatesCoverUnion & _UnionCoveredByStates = true
void _statesExhaustive

// ---------------------------------------------------------------------------
// Never-depleted sentinel (DND/009). The engine's "portfolio survived the whole
// horizon" outcome MUST persist as an explicit out-of-domain integer — never
// Infinity/NaN/null, which JSON.stringify / IndexedDB silently coerce to null.
// Real depletion years are absolute indices >= 0, so -1 is cleanly out-of-domain.
// U4 owns the persisted decode (a bare null is corruption, NOT never-depleted).
// ---------------------------------------------------------------------------

/** Sentinel depth-of-failure value: the portfolio never depleted across the horizon.
 *  A finite integer on purpose (survives JSON/IndexedDB round-trip; DND/009). */
export const NEVER_DEPLETED = -1

/** Per-path depth of failure: the absolute year index (>= 0) at which the portfolio
 *  first hit zero, or {@link NEVER_DEPLETED} if it survived the full horizon. */
export type DepletionYear = number

/** True for a real depletion (a non-sentinel, in-domain year index). */
export const isDepleted = (d: DepletionYear): boolean => d !== NEVER_DEPLETED && d >= 0

// ---------------------------------------------------------------------------
// Couple / longevity inputs.
// ---------------------------------------------------------------------------

/** Biological sex selects the cohort mortality curve (women's materially higher —
 *  the couple last-survivor figure is the formula applied to the two sex-specific
 *  curves, never a hardcoded constant). */
export type Sex = 'male' | 'female'

/** One spouse's inputs for the spine. Ages are in whole years at the simulation's
 *  year 0; the earned-income bridge truncates a person's income at the earlier of
 *  their retirement year and their sampled death year (never credit a dead earner). */
export interface PersonInputs {
  readonly sex: Sex
  /** Whole-year age at simulation year 0. */
  readonly currentAge: number
  /** Whole-year age at which this person's earned income stops (retirement). */
  readonly retirementAge: number
  /** Flat real earned income per year while working ([year0, min(retirement, death))).
   *  0 disables the bridge for this person (part of the reduce-to-spine condition). */
  readonly earnedIncomeReal: number
  /** Annual real Social Security benefit once claimed (joint→survivor keeps the
   *  larger of the two on the first death). MVP-minimal: a flat real figure. */
  readonly socialSecurityReal: number
  /** Whole-year age at which this person's Social Security begins. */
  readonly socialSecurityClaimAge: number
}

// ---------------------------------------------------------------------------
// Market assumptions. The engine is PURE — the caller injects every moment; the
// engine reads no defaults of its own. The methodology-default sets (historically-
// calibrated for validation; conservative Pfau/Kitces for production) live in
// src/engine/reference/methodology.ts, source-stamped + directional.
// ---------------------------------------------------------------------------

/** First two moments of an asset's annual return, in the space named by
 *  {@link MarketAssumptions.space}. */
export interface AssetMoment {
  /** Arithmetic mean annual return (e.g. 0.088 = 8.8%). */
  readonly mean: number
  /** Standard deviation of the annual return. */
  readonly stdDev: number
}

/** Whether {@link AssetMoment} means/stdDevs are stated as ordinary ("simple")
 *  per-period returns or already in log space. The engine converts simple→log
 *  internally (μ_log = ln(1+m) − σ_log²/2) — declaring the space forbids the
 *  silent simple-mean-with-log-σ mix that biases every percentile. NOTE: the P1
 *  spine implements `'simple'` ONLY; `'log'` is reserved for a future scope
 *  expansion and is rejected as indeterminate by the engine's R19 gate until then. */
export type MomentSpace = 'simple' | 'log'

/** The market the spine draws from. ALL buckets share ONE return draw per year
 *  (contract #2) — `stock`/`bond` describe the two return streams blended by
 *  `stockWeight`; they are NEVER drawn independently per account bucket. */
export interface MarketAssumptions {
  readonly stock: AssetMoment
  readonly bond: AssetMoment
  /** Annual inflation, used to keep withdrawals real if moments are nominal. When
   *  moments are already real, set mean 0 / stdDev 0 and treat returns as real. */
  readonly inflation: AssetMoment
  /** Correlation between the stock and bond return draws (typically ~0 historically). */
  readonly stockBondCorrelation: number
  /** The space `stock`/`bond`/`inflation` are stated in. */
  readonly space: MomentSpace
  /** True if the moments are already real (inflation-adjusted) — then withdrawals
   *  are held flat in real terms and `inflation` is informational only. NOTE: the P1
   *  spine implements `true` ONLY (real moments); nominal moments (`false`, with
   *  inflation deflation) are a future scope expansion, rejected as indeterminate by
   *  the engine's R19 gate until then. */
  readonly returnsAreReal: boolean
}

// ---------------------------------------------------------------------------
// Drawdown policy — sequencing as a first-class engine parameter (R9). The named
// set is the substrate the manual control (P3·U10) and the solver (P4·U15) drive;
// neither re-implements decumulation. The policy decides WHICH bucket funds each
// year's net withdrawal — it consumes ZERO draws. On a single collapsed pool every
// policy is inert (part of reduce-to-spine).
// ---------------------------------------------------------------------------

export type DrawdownPolicy =
  | 'proportional' // draw from every bucket pro-rata to its balance
  | 'taxable-first' // exhaust taxable, then pre-tax, then Roth
  | 'pre-tax-first' // exhaust pre-tax, then taxable, then Roth
  | 'bracket-fill' // fill ordinary income to a target edge, then draw tax-free (U2-aware)

export const DRAWDOWN_POLICIES = [
  'proportional',
  'taxable-first',
  'pre-tax-first',
  'bracket-fill',
] as const

// ---------------------------------------------------------------------------
// Engine parameters (the injected, pure input to `simulate`).
// ---------------------------------------------------------------------------

/** The pure input to the Monte Carlo engine. Deterministic in (`params`, `seed`):
 *  the same params + the same 32-bit seed reproduce a byte-identical distribution
 *  on one JS engine. The seed is INJECTED by the caller (P2 orchestration); the
 *  engine reads no entropy/clock/environment of its own. */
export interface SimulationParams {
  /** Starting portfolio value (real dollars at year 0). */
  readonly initialPortfolio: number
  /** Desired total real spending per year (the figure the first-answer reads against). */
  readonly annualSpendingReal: number
  /** Fraction of the portfolio in stocks (the rest in bonds); rebalanced annually. */
  readonly stockWeight: number
  /** The couple. MVP models two persons; a single person is the degenerate case. */
  readonly people: readonly PersonInputs[]
  /** Survivor spending as a fraction of the couple's spending after the first death
   *  (grounded ~0.75; too-low understates the survivor's need — the unsafe direction). */
  readonly survivorSpendingRatio: number
  /** Which bucket-drawdown policy funds each year's net withdrawal. Inert on a
   *  single pool (the spine), meaningful once U2 splits the portfolio into buckets. */
  readonly drawdownPolicy: DrawdownPolicy
  /** The market the spine draws from (injected; see {@link MarketAssumptions}). */
  readonly market: MarketAssumptions
  /** Number of Monte Carlo paths. */
  readonly paths: number
  /** Maximum cohort horizon in years — the normals matrix is allocated to THIS and
   *  indexed by absolute year, so the draw schedule is a pure function of dimensions
   *  only (contract #1). Financial inputs select WHICH draws are consumed, never how
   *  many or their order. */
  readonly maxHorizonYears: number
  /** Longevity handling:
   *   - `sampled` (the product default): each path samples per-spouse death years and
   *     runs to the couple's last death, with the survivor spending step-down.
   *   - `fixed-horizon`: every path survives exactly `maxHorizonYears` with full
   *     spending (no mortality) — the Trinity-comparable validation mode the Mode-B
   *     MC band asserts against the 30-year historical anchor. */
  readonly longevityMode: 'sampled' | 'fixed-horizon'
}

// ---------------------------------------------------------------------------
// Engine result (the contract the worker boundary, confidence.ts, and viz read).
// ---------------------------------------------------------------------------

/** A rounded display figure paired with the raw distance to its next rounding edge,
 *  so a stateful caller (P2/P3) can layer sticky hysteresis on BOTH the headline and
 *  the dollar figure (the failure mode is one being sticky while the other flickers,
 *  since they render in one sentence). confidence.ts emits the margins; it does not
 *  itself implement cross-edit hysteresis. */
export interface WithMargin<T> {
  readonly value: T
  /** Raw distance to the nearest band/step edge (in the underlying continuous unit). */
  readonly marginToEdge: number
}

/** The first-answer headline. Denominator pinned at 10 (a P2 display contract; the
 *  raw→display rounding target is owned by the engine). The top of scale renders as
 *  the over-funded near-ceiling, never a bald "10 of 10". */
export interface Headline {
  /** Integer 0..10 — the "X of 10" reading. */
  readonly xOfTen: WithMargin<number>
  /** The outcome state the engine selected for this distribution. */
  readonly outcomeState: OutcomeState
}

/** The dollar-grammar adjustment ("trim ~$Y/month" / "you have ~$Y/month of room"). */
export interface DollarAdjustment {
  /** Signed real dollars per month: negative = trim, positive = room, 0 = on the line. */
  readonly perMonthReal: WithMargin<number>
  readonly direction: 'trim' | 'room' | 'on-the-line'
}

/** The raw, continuous distribution the headline rounds FROM — emitted alongside the
 *  rounded outputs so callers can re-round under their own (stateful) rules. */
export interface Distribution {
  /** Terminal real portfolio values, one per path (the full sample, not just pass/fail). */
  readonly terminalValuesReal: readonly number[]
  /** Per-path depth of failure: the absolute year index of depletion, or
   *  {@link NEVER_DEPLETED}. Length === paths. */
  readonly depletionYears: readonly DepletionYear[]
  /** Fraction of paths whose essentials were covered every year (the survival floor
   *  statistic the X-of-10 reads). Continuous in [0, 1], pre-quantization. */
  readonly survivalFraction: number
}

/** The resolved engine output. */
export interface SimulationResult {
  readonly distribution: Distribution
  readonly headline: Headline
  readonly dollar: DollarAdjustment
  /** The seed this result was produced under (round-trips through U4 persistence
   *  bit-identically, so a reopened plan reproduces the identical headline). */
  readonly seed: number
}

/** Tri-state engine outcome — a thrown engine error surfaces as a defined CALM
 *  result, never a hung promise / unhandled rejection / dead worker. The worker
 *  stays alive + reusable. (`indeterminate` invalid-input is a RESOLVED result whose
 *  headline carries the `indeterminate` outcome state — distinct from `calm-error`,
 *  which is an internal failure.) */
export type EngineOutcome =
  | { readonly kind: 'resolved'; readonly result: SimulationResult }
  | { readonly kind: 'calm-error'; readonly reason: string }

// ---------------------------------------------------------------------------
// Persisted scenario skeleton (P1·U1 minimal; U2/U3 add buckets + birth years;
// U4 wraps it in the encrypted record types). `schemaVersion` exists from v1 so the
// migration ladder is possible at all (U4 contract).
// ---------------------------------------------------------------------------

/** The plaintext scenario the user builds. v1 carries the spine inputs + the seed;
 *  later phases extend it (additively) with buckets, budgets, goal, and saved
 *  recommendation. */
export interface Scenario {
  /** Migration discriminant — read before any other field on decrypt (U4). */
  readonly schemaVersion: 1
  readonly initialPortfolio: number
  readonly annualSpendingReal: number
  readonly stockWeight: number
  readonly people: readonly PersonInputs[]
  readonly survivorSpendingRatio: number
  readonly drawdownPolicy: DrawdownPolicy
  /** The injected 32-bit seed, persisted as a first-class field so a reopened plan
   *  reproduces byte-identically (contract #1). */
  readonly seed: number
}
