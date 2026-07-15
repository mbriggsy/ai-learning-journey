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

/** Exhaustive vocabulary array (the codec's membership surface — same compile-time
 *  exhaustiveness pattern as OUTCOME_STATES, so the union and the array can't drift). */
export const SEXES = ['male', 'female'] as const
type _SexesCover = (typeof SEXES)[number] extends Sex ? true : never
type _SexCovered = Sex extends (typeof SEXES)[number] ? true : never
const _sexesExhaustive: _SexesCover & _SexCovered = true
void _sexesExhaustive

/** One spouse's inputs for the spine. Ages are in whole years at the simulation's
 *  year 0; the earned-income bridge truncates a person's income at the earlier of
 *  their retirement year and their sampled death year (never credit a dead earner). */
export interface PersonInputs {
  readonly sex: Sex
  /** Whole-year age at simulation year 0. */
  readonly currentAge: number
  /** Birth year — keys the Social Security FRA lookup the SS sub-engine needs EVEN when `pia`
   *  is 0 (the FRA factor is computed before the zero short-circuits, so a spine run still needs
   *  a valid year). Previously derived only from `overlay.startCalendarYear` (absent on a spine
   *  run); now a first-class per-person input so the sub-engine is total. The intake sanity layer
   *  owns the `currentAge === startCalendarYear − birthYear` invariant. */
  readonly birthYear: number
  /** Whole-year age at which this person's earned income stops (retirement). */
  readonly retirementAge: number
  /** Flat real earned income per year while working ([year0, min(retirement, death))).
   *  0 disables the bridge for this person (part of the reduce-to-spine condition). */
  readonly earnedIncomeReal: number
  /** Annual real Primary Insurance Amount — the benefit at full retirement age (67) off the SSA
   *  statement, stored ×12 from the monthly entry. The SS sub-engine (`socialSecurityBenefit.ts`)
   *  derives the actual claim-age-adjusted own + Method-C spousal + §202 survivor benefit from it.
   *  0 disables SS for this person (the reduce-to-spine zero — plan §1/§7). */
  readonly pia: number
  /** Whole-year age at which this person's Social Security begins — the claim age the sub-engine
   *  applies the actuarial reduction/credit against (bounded [62, 70] at the R19 gate). */
  readonly socialSecurityClaimAge: number
}

/** The FROZEN v1/v2 persisted person shape — carries the pre-swap, already-claim-adjusted
 *  `socialSecurityReal` scalar (NOT `pia`, NOT `birthYear`: a v1/v2 blob never had them). The live
 *  {@link PersonInputs} now carries `pia` + `birthYear`; `Scenario`(v1) and {@link ScenarioV2}
 *  reference THIS legacy shape so dropping `socialSecurityReal` from the base does not strip it from
 *  the persisted v1/v2 type shapes (plan §10). No v1/v2 blobs exist in the wild yet (save/load is
 *  unbuilt), so this is pure type/codec hygiene — do NOT extend `PersonInputs` (the SS field differs)
 *  and do NOT add `pia`/`birthYear` here. */
export interface PersonInputsLegacy {
  readonly sex: Sex
  readonly currentAge: number
  readonly retirementAge: number
  readonly earnedIncomeReal: number
  readonly socialSecurityReal: number
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
  | 'custom' // the user's own bucket order (P3·U10) — carries a `drawdownOrder` alongside

export const DRAWDOWN_POLICIES = [
  'proportional',
  'taxable-first',
  'pre-tax-first',
  'bracket-fill',
  'custom',
] as const

// Compile-time: the vocabulary array exactly covers the union (both directions) — the
// codec + validateParams membership checks read the array, so a policy added to the
// union cannot silently skip them.
type _PoliciesCover = (typeof DRAWDOWN_POLICIES)[number] extends DrawdownPolicy ? true : never
type _PolicyCovered = DrawdownPolicy extends (typeof DRAWDOWN_POLICIES)[number] ? true : never
const _policiesExhaustive: _PoliciesCover & _PolicyCovered = true
void _policiesExhaustive

/** The GENERAL drawdown sources a custom order permutes — every bucket EXCEPT the
 *  medical-earmarked `hsa` (never a general spending source; the M5 laundering guard).
 *  Structurally the engine's `GeneralBucketKey`; the canonical persisted vocabulary
 *  lives here in the leaf layer (sequencing.ts carries the compile-time tie). */
export const DRAWDOWN_ORDER_KEYS = ['taxable', 'pretax', 'roth'] as const
export type DrawdownOrderKey = (typeof DRAWDOWN_ORDER_KEYS)[number]

/** The Roth-conversion lever's persisted inputs (P3·U10 — R9's second control). The user's
 *  TUNABLE facts persist; the per-year `OverlayParams.conversions` vector is DERIVED at the
 *  params builder (fidelity-over-duplication, the budget precedent). ABSENT ⇒ no conversions
 *  ⇒ reduce-to-spine byte-identity (presence-keyed — an all-zero vector is NEVER written).
 *  Offsets are sim-years from `startCalendarYear` (t = 0 = today), Y-INVARIANT on the date
 *  route (the same absolute schedule rides every swept candidate — dateSearch's existing
 *  `...overlayBase` semantics): "starting N years from now, convert $X a year for M years."
 *  All fields finite (DND-009); the engine clamps each year to the legal pool net of the
 *  non-convertible RMD (`[0, priorYearEndPretax − RMD]`) — magnitude is structurally safe. */
export interface RothConversionPlan {
  /** Requested conversion per active year (real $, > 0 — a zero plan is written as ABSENCE,
   *  never a present-but-empty lever; the codec rejects 0 so present ⟹ meaningful). */
  readonly annualAmountReal: number
  /** First active sim-year offset from `startCalendarYear` (integer ≥ 0; 0 = this year). */
  readonly startYearOffset: number
  /** Consecutive active years (integer ≥ 1). Years past the horizon are inert. */
  readonly years: number
}

/** Expand the persisted lever inputs into the engine's per-year `conversions` vector
 *  (indexed by absolute sim-year, zero before the window, truncated at the horizon).
 *  Pure + shared: the intake builder and the two-arm orchestrator (roth.ts) both derive
 *  from THIS one function, so the lever and the comparison can never disagree about
 *  which years convert. Returns undefined when the window lies entirely past the
 *  horizon — absence stays the reduce-to-spine signal, never a zero-fill. */
export function expandRothConversion(
  plan: RothConversionPlan,
  horizonYears: number,
): readonly number[] | undefined {
  const start = plan.startYearOffset
  if (start >= horizonYears) return undefined
  const end = Math.min(start + plan.years, horizonYears) // exclusive
  const out = new Array<number>(end).fill(0)
  for (let t = start; t < end; t++) out[t] = plan.annualAmountReal
  return out
}

// ---------------------------------------------------------------------------
// Tax-and-accounts overlay input (U2). Federal filing status is shared vocabulary
// (the engine's tax overlay + the persisted scenario both speak it). The overlay is
// OPTIONAL on the engine input: absent ⇒ the tax-blind spine (the reduce-to-spine
// validation/golden mode — Trinity/Bengen, NOT a product first-answer path); present
// ⇒ `simulate` runs the tax-aware decumulation (what the date first-answer requires —
// dateSearch rejects a tax-blind date as the superseded on-ramp).
// ---------------------------------------------------------------------------

/** Federal income-tax filing status. MFJ for the couple; flips to single the year after the
 *  first death (no QSS grace — §Strand 5). The engine's tax overlay re-exports this. */
export type FilingStatus = 'mfj' | 'single'

/** Exhaustive vocabulary array (the codec's membership surface). */
export const FILING_STATUSES = ['mfj', 'single'] as const
type _FilingsCover = (typeof FILING_STATUSES)[number] extends FilingStatus ? true : never
type _FilingCovered = FilingStatus extends (typeof FILING_STATUSES)[number] ? true : never
const _filingsExhaustive: _FilingsCover & _FilingCovered = true
void _filingsExhaustive

/**
 * The retirement-state vocabulary (the state-tax unit; the FILING_STATUSES / MEDICARE_EXTRAS_KINDS
 * precedent — the ONE canonical membership surface the engine's R19 gate, the codec, and the intake
 * picker read). It is the ROSTER FOOTPRINT + an EXPLICIT `'elsewhere'`:
 *   - the v1 PRICED subset `{NC, PA, FL}` (engine `PRICED_STATES` ⊆ this — asserted in
 *     `engine/stateTax.ts`) get their state income tax priced into every headline;
 *   - the DEFERRED roster `{SC, GA, DE}` are recognised-but-UNPRICED — a valid persistable value the
 *     engine takes on the structural `+ 0` no-op branch (byte-identical to the spine) until they are
 *     primary-pinned + built; the v1 picker does not expose them (they collapse to `'elsewhere'`);
 *   - `'elsewhere'` is an EXPLICIT member: a chosen "somewhere else" is a fact worth persisting,
 *     distinct from never-asked ABSENT (the field is optional/undefined for a pre-unit or unanswered
 *     household — the disclosed-out posture verbatim).
 * A value OUTSIDE this set crossing the untyped worker/codec boundary is corruption (R19 → the calm
 * indeterminate), NEVER silently treated as `'elsewhere'` — a typo'd `'NC'` silently unpriced would
 * UNDERSTATE tax for a household that meant a priced state (the survival-overstating, calm-but-wrong
 * direction). Pricing membership is `PRICED_STATES` (engine); this is the persistable/legal vocabulary.
 */
export const STATE_ROSTER = ['NC', 'PA', 'FL', 'SC', 'GA', 'DE', 'elsewhere'] as const
export type RetirementState = (typeof STATE_ROSTER)[number]

/** Roster membership guard — the enum-membership surface for the R19 gate + the codec (the untyped
 *  boundary means the compile-time `RetirementState` type is a promise the runtime must still check). */
export const isRetirementState = (s: string): s is RetirementState =>
  (STATE_ROSTER as readonly string[]).includes(s)

/** An account split by tax treatment (real dollars). Structurally the engine's
 *  `AccountBuckets`; the canonical plaintext vocabulary lives here in the leaf layer. */
export interface AccountBalances {
  /** Brokerage / after-tax: a withdrawal realizes a pro-rata capital gain. */
  readonly taxable: number
  /** Traditional / pre-tax (IRA/401k): withdrawals + RMDs are ordinary income. */
  readonly pretax: number
  /** Roth: tax-free growth and withdrawals. */
  readonly roth: number
  /** HSA (U3 · M5): the 4th, MEDICAL-EARMARKED bucket — qualified medical spend is tax-free and
   *  MAGI-invisible; it is NEVER a general drawdown source. Optional under the schemaVersion-2
   *  additive bump: absent ⇒ 0 ⇒ byte-identical to the 3-bucket model. */
  readonly hsa?: number
}

/** One person's per-account contribution streams (C2 — the accumulation plan's signed inflow
 *  term). Each stream is per-year real $, indexed by ABSOLUTE sim-year, AUXILIARY (a missing/
 *  short entry ⇒ $0 that year, never the end of data). The intake layer expands the entered
 *  flat-real amounts into these streams, applying the age-band contribution ceilings PER RUNWAY
 *  YEAR (the §109 super catch-up expires at 64 — a flat projection would compound legally-
 *  impossible amounts, the calm-but-wrong-optimistic sin); the ENGINE consumes the streams as
 *  given and enforces only the structural boundaries (per-path death truncation + the
 *  retirement stop + the HSA Medicare-enrollment zeroing — C2 §7/§3b). */
export interface PersonContributionStreams {
  /** → the taxable bucket; an after-tax dollar enters at FULL basis (basis += contribution). */
  readonly taxable?: readonly number[]
  /** → the pretax bucket (this person's OWN ledger slot when the per-person split is active). */
  readonly pretax?: readonly number[]
  /** → the roth bucket. */
  readonly roth?: readonly number[]
  /** → the hsa bucket; zeroed from THIS person's Medicare-enrollment onset (default: their
   *  65th sim-year — keyed to the contributing owner, never the spouse; C2 §3b). */
  readonly hsa?: readonly number[]
  /** Employer match — ALWAYS lands in the pretax bucket (the confirmed default rule), even
   *  when the employee deferral is Roth (a SECURE 2.0 §604 Roth match is a deferred option). */
  readonly employerMatch?: readonly number[]
}

/** The accumulation construct (C2). Its PRESENCE — not its values — is the gate (§1): present ⇒
 *  the working-year zero-withdrawal clamp is live (§7) and the contribution inflows fold into the
 *  per-year update; ABSENT ⇒ the byte-identical decumulation-only engine. A zero-valued-but-
 *  constructed run is deliberately NOT byte-identical to construct-absent (the clamp changes
 *  working-year nets) — presence-keyed, never value-derived (a 1¢ contribution change must never
 *  flip the draw regime). */
export interface AccumulationParams {
  /** Per-person contribution streams, aligned by index to `people` (validated, R19). */
  readonly contributionsByPerson: readonly PersonContributionStreams[]
}

/** One person's COMPILED other-income leaf (R40 · KTD-4) — the per-year real-$ vectors
 *  `compileIncomeStreams` pre-weights at build time, indexed by ABSOLUTE sim-year, AUXILIARY (a
 *  missing/short entry ⇒ $0 that year, never the end of data). TWO death-state variants are pre-summed
 *  across this person's streams so the path loop does ZERO allocation — it only SELECTS (KTD-4): FULL
 *  while the owner lives, SURVIVOR (`Σ streams·survivorPct`, derived PER-STREAM) once the owner has died
 *  with the spouse alive, $0 once both are dead. `gross` nets the household withdrawal (seam 1);
 *  `taxable` enters `nonSSordinary` (seam 2 — SS-§86 / ACA-MAGI / IRMAA-MAGI ride it, KTD-1). Each vector
 *  is DROPPED when all-zero (`nonZero`), so absence is the reduce-to-spine signal — never a zero-fill. */
export interface PersonIncomeStream {
  /** FULL gross (owner alive): Σ this person's streams' per-year real $. */
  readonly grossFull?: readonly number[]
  /** FULL taxable: Σ streams' `gross·effectiveTaxableFraction`. */
  readonly taxableFull?: readonly number[]
  /** SURVIVOR gross (owner dead, spouse alive): Σ streams' `gross·survivorPct` — derived PER-STREAM,
   *  never a scalar reweight of FULL (KTD-4 — a single household survivor scalar is the swap-mutant bug). */
  readonly grossSurvivor?: readonly number[]
  /** SURVIVOR taxable: Σ streams' `gross·survivorPct·effectiveTaxableFraction`. */
  readonly taxableSurvivor?: readonly number[]
}

/** The other-income construct (R40 · KTD-3). Its PRESENCE on `OverlayParams.income` — not its values —
 *  is the reduce-to-spine key (R40.6): ABSENT ⇒ the byte-identical no-income engine. Compiled ONCE in
 *  `buildParams` (income is Y-invariant — KTD-8a), never per date-search candidate. */
export interface IncomeParams {
  /** Per-person compiled leaves, aligned by index to `people`; the OWNER's own death gates each (KTD-7). */
  readonly incomeByPerson: readonly PersonIncomeStream[]
}

/** The engine-side tax/accounts overlay input (U2). `taxEnabled` and `rmdEnabled` are INDEPENDENT
 *  switches (RMD is a forced-distribution mechanic, not a tax). `buckets` must sum to
 *  `initialPortfolio` (validated, R19); the >10yr-younger-spouse JLLS divisor (M6b·A) and the
 *  optional per-person pre-tax split (M6b·B, `pretaxByPerson`) ride on top. */
export interface OverlayParams {
  readonly taxEnabled: boolean
  readonly rmdEnabled: boolean
  /** The simulation's year-0 calendar anchor (drives RMD ages + the senior-bonus 65+ count). */
  readonly startCalendarYear: number
  /** Aggregated initial account split; the sum must equal `initialPortfolio`. */
  readonly buckets: AccountBalances
  /** Per-person INITIAL pre-tax split (U2·M6b·B), aligned by index to `people` (owner = 0, spouse
   *  = 1). Its sum must equal `buckets.pretax` (validated, R19). PRESENT ⇒ each spouse's IRA forces
   *  its OWN RMD on its OWN age (+ its own sole-spouse Joint-Life beneficiary), and a deceased
   *  spouse's IRA rolls to the survivor. ABSENT ⇒ the M6a aggregate pool (all pre-tax on the owner)
   *  — the byte-identical default. P2 intake maps the schemaVersion-2 `PersonAccounts.pretax` here. */
  readonly pretaxByPerson?: readonly number[]
  /** Year-0 cost basis of the taxable bucket (real $). REQUIRED when `taxEnabled` and the taxable
   *  bucket is non-empty — no safe default (burned/062); the engine rejects an absent basis (R19). */
  readonly initialTaxableBasis?: number
  /** Initial filing status; the engine flips it to single at the sampled first death (M6a). */
  readonly filing: FilingStatus
  /** The household's retirement state of residence (the state-tax unit). ABSENT/undefined ⇒ the
   *  disclosed-out posture: NO state income tax is priced and the layer is a structural `+ 0` no-op
   *  (byte-identical to the spine). PRESENT + in `PRICED_STATES` (engine) ⇒ that state's income tax
   *  folds into the SAME per-year gross-up fixed point as federal tax (a second addend, never bolted
   *  on after) and into `totalTaxPaidReal`. A recognised-but-unbuilt roster code or `'elsewhere'` is
   *  a legitimate value the engine also takes on the `+ 0` branch. This flag lives on `params.overlay`
   *  (the `healthcareEnabled` precedent) so the route's BUILT params carry it — the S5 producer's-output
   *  state-priced predicate reads it there, never re-deriving geography. R19-validated at the boundary. */
  readonly retirementState?: RetirementState
  /** Per-year requested Roth conversions, indexed by ABSOLUTE year (clamped to the legal pre-tax
   *  pool net of the non-convertible RMD inside the engine). */
  readonly conversions?: readonly number[]
  /** Per-year `bracket-fill` ceiling OVERRIDE (the max discretionary pre-tax draw), indexed by
   *  ABSOLUTE year. Read ONLY when `drawdownPolicy` is `bracket-fill`. An EXPLICIT entry wins
   *  (the direct-caller / P4-solver injection seam); a MISSING entry is ENGINE-DERIVED per
   *  path-year (U11, `magiLandscape`): the min of the active rails' fill headrooms — the next
   *  federal bracket edge, the 400%-FPL ACA cliff in a priced cliff-regime year, and the next
   *  IRMAA step where the recorded MAGI is actually billed inside the horizon. The old
   *  missing-entry ⇒ +Infinity ⇒ silent pre-tax-first degrade is retired — a caller wanting the
   *  uncapped shape passes an explicit +Infinity. IN-MEMORY params only, never persisted
   *  (+Infinity would null under JSON/IndexedDB — DND 009). */
  readonly bracketFillCeilings?: readonly number[]
  // --- U3 healthcare overlay streams (consumed from M3 Slice 4; absent/`healthcareEnabled` false ⇒
  //     the healthcare-blind path, byte-identical to the spine). Each cost stream is per-year real $,
  //     indexed by ABSOLUTE year, and carries its own `Number.isFinite`-FIRST R19 guard at
  //     `validateParams` (insights 008/010) — as-we-go (DON'T front-load a guessed input shape). ---
  /** Master switch for the pre-65 ACA / post-65 IRMAA healthcare overlay. ABSENT/false ⇒ no healthcare
   *  cost is priced (reduce-to-spine). NOTE: enabling alone never prices a premium — the per-year ACA
   *  predicate ALSO requires a finite positive `enrolledPremium[t]`, so a stray `true` in a year with no
   *  premium is inert (the finiteness-FIRST predicate, M3 Slice 4). */
  readonly healthcareEnabled?: boolean
  /** Selects the ARPA/IRA ENHANCED applicable-% table (no 400%-FPL cliff; flat 8.5% open top band) over
   *  the statutory cliff regime (`acaApplicablePercentageEnhanced` vs `acaApplicablePercentage`). Both
   *  tables ship verbatim from primary law (never faked), so the caller picks the regime matching the
   *  plan year's enacted subsidy law. ABSENT/false ⇒ the statutory cliff regime. */
  readonly enhancedSubsidies?: boolean
  /** Per-year Second-Lowest-Cost Silver Plan premium (real $), the §36B benchmark the Premium Tax Credit
   *  is computed against (`PTC = max(0, slcsp − applicable% × MAGI)`), indexed by ABSOLUTE year. */
  readonly slcsp?: readonly number[]
  /** Per-year enrolled-plan premium the household actually pays BEFORE any PTC (real $), indexed by
   *  ABSOLUTE year — the structural upper bound on the net premium (`net = max(0, enrolled − PTC)`). A
   *  finite positive value in a pre-65 year triggers the ACA fixed point (M3 Slice 4). */
  readonly enrolledPremium?: readonly number[]
  /** The 2 PRE-SIM IRMAA-MAGI values `[MAGI[−2], MAGI[−1]]` (real $), seeding the post-65 IRMAA
   *  2-year-lagged feed-forward (M4). Year t's surcharge keys off IRMAA-MAGI[t−2]; for t < 2 that
   *  year is before the sim, so the caller supplies the household's actual prior MAGI (e.g. from recent
   *  returns). REQUIRED (fail-loud, never default 0) iff a member is Medicare-enrolled (≥65) in year 0
   *  (needs seed[0]) or year 1 (needs seed[1]); a default-0 would falsely zero the surcharge →
   *  understate cost → overstate survival (the cardinal calm-but-wrong sin). Unused once the sim has
   *  ≥2 years of its own history. ABSENT is legitimate when no one is near 65 at the start. */
  readonly irmaaMagiSeed?: readonly number[]
  /** Per-person Medicare-enrollment ONSET in SIM-YEAR terms (C3 §3b), aligned by index to `people`:
   *  person i is Medicare-enrolled (IRMAA-priced + Part B-billed) from sim-year
   *  `medicareOnsetSimYear[i]`; values ≤ 0 mean enrolled before the sim. ABSENT ⇒ the biological-65
   *  default (`t ≥ 65 − currentAge_i` ⇔ `currentAge_i + t ≥ 65` — provably today's predicate
   *  verbatim, byte-identical). The date-search supplies `onset_i = max(65 − currentAge_i,
   *  retireOffset_i)` (employer coverage past 65 delays Medicare — the only off-switch for a member
   *  working past 65, since no premium stream gates IRMAA; `healthcareStreams.ts` builds it). ONLY
   *  the IRMAA gate + pricing count key off this; the §63(f)/senior-bonus `count65` and the ACA
   *  `pre65` denominator stay BIOLOGICAL (a 65+ worker still gets the age-65 deduction and is still
   *  not a marketplace member). The HSA contribution zeroing keys off the contributing OWNER's onset. */
  readonly medicareOnsetSimYear?: readonly number[]
  /** Per-year ADDITIVE working-year IRMAA-MAGI override (real $, C3 §3b), indexed by ABSOLUTE year:
   *  the overlay records `irmaaMagiHistory[t] = override[t] + computed irmaaMagi` — ADDITIVE, never
   *  replacement (a working-year Roth conversion, claimed-while-working SS, or a 73+ worker's RMD
   *  lands in the COMPUTED component; replacement or `max()` would understate the sum; additive errs
   *  only conservative/later and equals replacement in the common clamped working year whose computed
   *  MAGI is exactly 0). REQUIRED (coverage-gated at `validateParams`) for bridge years inside the
   *  IRMAA lookback of any member's onset: the lagged read at such a year otherwise finds a clamped
   *  working year's ≈$0 computed MAGI → lowest tier → understated surcharge → a falsely-EARLY date,
   *  SILENTLY (0 is finite — the fail-loud seed guard only catches undefined/NaN). Built
   *  conservatively-HIGH from entered working-year income (`healthcareStreams.ts`). */
  readonly irmaaMagiOverride?: readonly number[]
  /** Per-person Medicare-EXTRAS monthly premium (real $ — Part D / Medigap / Medicare-Advantage
   *  beyond Part B), aligned by index to `people` (owner = 0, spouse = 1); the ask-for-Medicare-
   *  extras unit (wf_efc6ece2-675). Charged as a per-person HETEROGENEOUS vector: each year adds
   *  Σ over {living ∩ Medicare-enrolled} of THAT person's own `extras[i] × 12`, ending at each
   *  death — NEVER `enrolledCount × average` (count×avg reproduces the optimistic survivor
   *  under-charge per-person pricing exists to kill: the surviving high-premium spouse keeps
   *  their FULL premium). Enrollment gates on the same onset machinery as Part B
   *  ({@link medicareOnsetSimYear} / biological-65 default). Real-flat like Part B (no
   *  escalation — the disclosed landmine family). EXCLUDED from the HSA qualified-spend cap
   *  (Pub 969: Medigap is not a qualified premium — extras must never ride the `medicareCost`
   *  arg into `hsaQualifiedSpend`). ABSENT or all-zero ⇒ byte-identical reduce-to-spine
   *  (Σ 0 — the shipped Medicare goldens are a superset, never perturbed). Values are RESOLVED
   *  dollars (the intake's payment fork resolves entered / affirmed-$0 / typical BEFORE the
   *  engine — the engine never sees provenance). */
  readonly medicareExtrasMonthly?: readonly number[]
  // --- U3 · M5: the HSA spend-side inputs (absent / `buckets.hsa` 0 ⇒ the 3-bucket path,
  //     byte-identical — the as-we-go default). ---
  /** Per-year out-of-pocket QUALIFIED medical cost (real $), indexed by ABSOLUTE year. CAP-ONLY —
   *  PINNED: it sizes the HSA qualified-spend cap and NEVER joins the funding need (the household
   *  spending figure is DEFINED as already including OOP medical — the containment premise; premiums
   *  are the only health cost priced on top). At `buckets.hsa = 0` the stream is inert. */
  readonly oopMedical?: readonly number[]
  /** WHICH person owns the household HSA (the `people` index: 0 = owner, 1 = spouse). The 65+
   *  Medicare-premium spend privilege keys to the OWNER's age, never the spouse's (Pub 969), so this
   *  is REQUIRED whenever `taxEnabled` and the run can ever hold HSA dollars (`buckets.hsa > 0` OR a
   *  positive hsa contribution stream — C2 re-derived the liveness property) — a person-0 default
   *  would mis-key the privilege for a spouse-owned HSA (burned/062). On the owner's death the HSA
   *  rolls to the surviving spouse and the privilege re-keys immediately. */
  readonly hsaOwnerIndex?: number
  // --- C2: the accumulation construct (the pre-retirement saving phase). ABSENT ⇒ the
  //     byte-identical decumulation-only engine (presence-keyed, §1). ---
  /** The accumulation construct (C2): per-person per-account contribution streams. PRESENT ⇒ the
   *  working years carry the contribution inflow and the household's spending net is clamped to 0
   *  while a LIVING person is still working (the household lives on salary — §7); the engine
   *  rejects `initialPortfolio === 0` with the construct present (a $0 start would read depleted
   *  at t=0 and silently swallow every contribution — R19). */
  readonly accumulation?: AccumulationParams
  // --- R40: the other-income construct (ongoing non-earned income — pension/rental/annuity/alimony/
  //     other). ABSENT ⇒ the byte-identical no-income engine (presence-keyed, R40.6). ---
  /** Compiled per-person other-income leaves (R40). PRESENT ⇒ each year's gross nets the household
   *  withdrawal (seam 1) and the taxable portion enters `nonSSordinary` ONCE (seam 2 — SS-§86 / ACA-MAGI /
   *  IRMAA-MAGI all ride the single producer, KTD-1); the per-owner SURVIVOR variant is selected at the
   *  owner's sampled death (KTD-4/KTD-7). Income passes the date-sweep UN-truncated (Y-invariant, KTD-8a). */
  readonly income?: IncomeParams
}

// ---------------------------------------------------------------------------
// The itemized budget (P3·U9 — the essentials-floor / lifestyle-surplus split).
// ---------------------------------------------------------------------------

/** The v1 budget category vocabulary (council 2026-07-02 — the add-only one-way door:
 *  these strings persist into encrypted vaults, so a shipped category can gain siblings
 *  but never be split or removed). Deliberately EXCLUDES healthcare/medical: the pre-65
 *  premium is overlay-COMPUTED (never user-typed — plan 3-controls.md, U9 gap-line rule),
 *  and out-of-pocket medical is compile-INJECTED into the sticky floor single-sourced
 *  from the health intake — a user-typed medical line would double-count or silently
 *  starve the HSA qualified-spend cap (the oopMedical containment premise,
 *  taxOverlay.ts §oopMedical). A scoped OOP-only category may join additively in U11. */
export const BUDGET_CATEGORIES = [
  'housing',
  'utilities',
  'food',
  'transportation',
  'travel',
  'gifts',
  'other',
] as const
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

/** The two lexicographic tiers (R20): essentials = the survival floor the FLOOR track
 *  evaluates; discretionary = the surplus the full track adds. Never a third tier. */
export const BUDGET_TIERS = ['essentials', 'discretionary'] as const
export type BudgetTier = (typeof BUDGET_TIERS)[number]

/** One itemized budget line (persisted on {@link ScenarioV3} — additive-optional within
 *  schemaVersion 3). All amounts are TODAY'S-DOLLAR (real) figures, matching the spine's
 *  inflation-adjusted convention. The window is a pair of integer year-OFFSETS from the
 *  HOUSEHOLD work-stop anchor (year 0 = the year work stops; for an already-retired
 *  household that is now; on the date route it is the swept candidate offset Y — the
 *  window is calendar-planned, so per-candidate expansion is deterministic and CRN-safe).
 *  `endYear` ABSENT = lifelong (the {@link IncomeStream.endAge} absence precedent;
 *  never `null`/`Infinity` — DND/009: a null in a number slot is named corruption).
 *  Forward-looking planning input, never expense tracking. */
export interface BudgetLineItem {
  readonly category: BudgetCategory
  /** The user's own name for the line ("Groceries", "See the grandkids"). Display-only. */
  readonly label: string
  /** Real dollars per year while the window is active. Non-negative (R19). */
  readonly annualAmountReal: number
  readonly tier: BudgetTier
  /** First active year, an offset from the household work-stop anchor (0 = the first
   *  retirement year). Integer ≥ 0. */
  readonly startYear: number
  /** Last active year (inclusive), same offset basis. ABSENT = lifelong.
   *  Must be ≥ `startYear` when present (R19). */
  readonly endYear?: number
}

/** The compiled, engine-facing budget construct (produced by `src/budget/budgetToSpending.ts`;
 *  the engine consumes it and cannot import src/budget — this @shared type is the seam).
 *  Three per-RETIREMENT-year real-dollar component profiles, each indexed by
 *  k = years-since-household-work-stop and pre-extended to `maxHorizonYears` (a missing/short
 *  tail entry reads 0 via the auxiliary-stream `?? 0` idiom — never end-of-data).
 *
 *  The survivor composition is realized PER-PATH inside the engine (insight 040 — the
 *  sampled first death is a stochastic, per-path event): with r = 1 while both spouses are
 *  alive, else `survivorSpendingRatio`,
 *    essentials(t) = sticky[k] + r·scalableEssentials[k]
 *    full(t)       = essentials(t) + r·discretionary[k]
 *  `sticky` (housing, utilities, `other`-tagged-essentials, and the compile-INJECTED
 *  out-of-pocket medical floor) does NOT scale at widowhood — scaling the survivor's fixed
 *  costs by the couple ratio would understate the survivor floor, the cardinal
 *  calm-but-wrong direction (council 2026-07-02: ratio-on-total in the engine is VETOED;
 *  r is never baked into these profiles). Containment premise: the injected medical keeps
 *  the floor track's essentials ≥ the overlay's `oopMedical[t]` — the engine's
 *  `validateParams` enforces it fail-loud per year. */
export interface CompiledBudget {
  /** Survivor-sticky essentials dollars per retirement-year (never scaled by r). */
  readonly sticky: readonly number[]
  /** Ratio-scaled essentials dollars per retirement-year. */
  readonly scalableEssentials: readonly number[]
  /** Ratio-scaled discretionary (lifestyle-surplus) dollars per retirement-year. */
  readonly discretionary: readonly number[]
}

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
  /** The compiled itemized budget (P3·U9). ABSENT ⇒ the un-itemized degenerate: the
   *  engine spends the flat `annualSpendingReal` scalar (ratio-on-total at widowhood)
   *  and emits NO floor surface — byte-identical to every pre-U9 run by construction.
   *  PRESENT ⇒ the per-year spend expands from the three component profiles (see
   *  {@link CompiledBudget}) and the run evaluates BOTH tracks — essentials-only (the
   *  floor) and full — on the SAME single shared draw set (contract #1: a tier is a
   *  different SPEND on the SAME paths, never a re-simulation), emitting
   *  {@link Distribution.floor} + a floor reading. When present, `annualSpendingReal`
   *  MUST equal the budget's year-0 full-track total (the reconciliation invariant the
   *  store maintains atomically) so every scalar consumer stays coherent. */
  readonly budget?: CompiledBudget
  /** Which bucket-drawdown policy funds each year's net withdrawal. Inert on a
   *  single pool (the spine), meaningful once U2 splits the portfolio into buckets. */
  readonly drawdownPolicy: DrawdownPolicy
  /** The user's own bucket order (P3·U10). REQUIRED iff `drawdownPolicy === 'custom'`
   *  (validated both ways — an order riding a named policy is as wrong as a custom
   *  policy with no order); a permutation of the three GENERAL buckets (never `hsa`). */
  readonly drawdownOrder?: readonly DrawdownOrderKey[]
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
  /** The tax-and-accounts overlay (U2). ABSENT ⇒ the tax-blind spine (the reduce-to-spine
   *  validation mode, NOT the product first-answer — the date first-answer REQUIRES the overlay;
   *  dateSearch rejects a tax-blind date as the superseded on-ramp). PRESENT ⇒ `simulate` runs
   *  the tax-aware decumulation, feeding the
   *  per-year survivor regime + SS + conversion streams it derives from the death timeline.
   *  Under the EXHAUSTIVE OFF condition (single pool, tax off, RMD-inert, conversion 0) the
   *  tax-aware run is byte-identical to the spine (the reduce-to-spine golden, contract #3). */
  readonly overlay?: OverlayParams
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
  /** Raw distance of the QUANTIZED survival fraction to the nearest outcome-state band
   *  edge (min over the engine's exported `BANDS` edges, in survival-fraction units) —
   *  the third stateless margin, emitted for the P3 sticky STATE gate (memoryModel's
   *  cross-edit hysteresis over the verb-tense/copy-state flip, architecture §9).
   *  `xOfTen.marginToEdge` cannot stand in for it: the x-of-10 display lattice
   *  coincides with the onTrack/borderline edges but NOT the over-funded edge.
   *  Computed on the SAME quantized value the band compare reads (the margin and the
   *  decision share one source); 0 on the indeterminate reading (the existing
   *  zero-margin convention). */
  readonly stateMarginToEdge: number
}

/** The "as the survivor" reading (U7 e1c) — the joint {@link Headline}'s grammar applied to the
 *  survivor-conditioned distribution, so the survivor sentence speaks the SAME vocabulary ("X of 10",
 *  the outcome word) as the joint one. PRESENT on a {@link SimulationResult} iff the run emitted a
 *  {@link SurvivorConditioned} surface (≥ 1 survivor phase). The `xOfTen` rounds the SURVIVOR fraction
 *  through the identical quantize→clamp the joint headline uses (incl. the 9-cap honesty clamp); the
 *  `outcomeState` is selected on the survivor fraction but reserves `already-failing` for the
 *  whole-plan-DOA case (the joint early-death signal), since a survivor cannot be a calm survivor of a
 *  plan that was unfundable from year 0. Carries the {@link SurvivorConditioned} income step-down so a
 *  consumer renders the whole survivor statement from one reading. */
export interface SurvivorReading {
  /** Integer 0..9 — the "X of 10 as the survivor" reading (the joint 9-cap honesty clamp applies). */
  readonly xOfTen: WithMargin<number>
  /** The outcome word the engine selected for the SURVIVOR fraction (same enum as the joint reading). */
  readonly outcomeState: OutcomeState
  /** Pass-through of {@link SurvivorConditioned.incomeStepDownMonthlyReal} — the $/month income cliff. */
  readonly incomeStepDownMonthlyReal: number
}

/** The dollar-grammar adjustment ("trim ~$Y/month" / "you have ~$Y/month of room"). */
export interface DollarAdjustment {
  /** Signed real dollars per month: negative = trim, positive = room, 0 = on the line. For
   *  `rethink` the value is still negative (the same gap-scaled proxy) but the verdict DROPS it —
   *  no single figure is a solve for an unfundable-from-the-start plan, so the clause is figure-less. */
  readonly perMonthReal: WithMargin<number>
  /** `rethink` = already-failing (0 of 10, unfundable from the start): a figure-less, lever-agnostic
   *  verdict, never the sufficiency-implying `trim`. The fork lives in the PURE engine (`buildDollar`),
   *  so the UI clause is a key-lookup that can't re-derive it (Council 2026-06-29). */
  readonly direction: 'trim' | 'room' | 'on-the-line' | 'rethink'
}

/** Per-path tax-aware solver surfaces (U3·M6 — the strategic review's SOLVER OUTPUT
 *  CONTRACT, the P4 argmax inputs). PRESENT on a {@link Distribution} iff the run carried
 *  the tax overlay (presence-keyed — a spine run has no tax data, and zero-fill would
 *  CONTRADICT `terminalValuesReal`, so absence is the honest shape). Six parallel arrays,
 *  each length === paths, every entry a finite number (DND/009 — they cross the worker
 *  wire and will persist).
 *
 *  The `terminal*` figures are each path's state at ITS OWN horizon end — in `sampled`
 *  longevity mode that is the couple's SAMPLED last-death year (the §1014/IRD
 *  leave-more-to-heirs surface: pre-tax = IRD to heirs, taxable's embedded gain
 *  steps up, Roth passes tax-free), capped at `maxHorizonYears` (a path whose couple
 *  outlives the window reports the window end — the censored case); in `fixed-horizon`
 *  mode it is the fixed horizon end. A depleted path reports zeros.
 *
 *  These are parallel ACCOUNTING surfaces (the `totalNetPremiumReal` pattern): they never
 *  perturb the headline trajectory, and `objective ≡ headline` means the P4 objective
 *  reads THESE — never recomputes them in objective.ts (the M3 sign-inversion class). */
export interface TaxAwareDistribution {
  /** Σ income tax actually paid across the path's funded years (real $; federal ordinary +
   *  preferential cap-gains PLUS the priced-state flat layer for a PRICED_STATES household —
   *  one lifetime-tax lens, the state-tax unit). Accrued AFTER the depletion check — a year
   *  the portfolio could not fund counts nothing (the sibling rule). */
  readonly lifetimeTaxPaidReal: readonly number[]
  /** The taxable bucket's value at the path's horizon end (real $). */
  readonly terminalTaxableReal: readonly number[]
  /** The pre-tax bucket at the path's horizon end — the IRD-to-heirs surface (real $). */
  readonly terminalPretaxReal: readonly number[]
  /** The Roth bucket at the path's horizon end (real $). */
  readonly terminalRothReal: readonly number[]
  /** The HSA bucket at the path's horizon end (real $; 0 when the run had no HSA). */
  readonly terminalHsaReal: readonly number[]
  /** The taxable bucket's COST BASIS at the path's horizon end (real $) — with
   *  `terminalTaxableReal` it gives the embedded gain §1014 forgives at death. */
  readonly terminalTaxableBasisReal: readonly number[]
  /** Σ net ACA premium actually paid across the path's funded years (real $; enrolled − PTC,
   *  P3·U11). Accrued AFTER the depletion check (the sibling rule). 0 on a path the healthcare
   *  overlay never priced. The U11 regime-toggle preview headlines the MEDIAN of
   *  `lifetimeNetPremiumReal + lifetimeMedicareCostReal` per arm — the regime's effect
   *  concentrates in the pre-65 ACA years and may barely move the portfolio median. */
  readonly lifetimeNetPremiumReal: readonly number[]
  /** Σ Medicare cost actually paid across the path's funded years (real $; base Part B + the
   *  IRMAA surcharge, per enrolled person — P3·U11). Same accrual rule as its siblings. */
  readonly lifetimeMedicareCostReal: readonly number[]
}

/** One x-grid sample of the per-year portfolio-value percentile fan (the U6/U7 confidence
 *  band's INPUT — the "living-cohort" fan). Real (today's) dollars; the five percentiles are
 *  the band edges the renderer draws (it never invents intermediate percentiles). Computed
 *  ONLY among paths whose household still EXISTS at this year — ≥1 spouse alive AND within the
 *  window. The honesty rule (decided product-side): a path that has DEPLETED but whose couple
 *  is still alive reads $0 here (the ruin floor — the single most important honest signal, so
 *  it MUST stay in the cohort); a path whose couple has BOTH died drops out (it is no longer a
 *  household to hold a portfolio — counting its death-terminal forward would overstate later-
 *  year wealth, the calm-but-wrong-optimistic direction). The fan therefore THINS at later
 *  years as couples die — {@link BandFanYear.cohortFraction} carries that so a band narrowing
 *  because few couples remain can never misread as rising certainty. */
export interface BandFanYear {
  /** Whole years from today (the household clock). 0 = today (the degenerate anchor — every
   *  path starts at `initialPortfolio`); k = the END of sim-year k−1. Monotonic increasing. */
  readonly yearsFromNow: number
  /** 10th percentile portfolio value (the low-futures edge), real $, ≥ 0. */
  readonly p10: number
  /** 25th percentile, real $, ≥ 0. */
  readonly p25: number
  /** 50th percentile (the median path), real $, ≥ 0. */
  readonly p50: number
  /** 75th percentile, real $, ≥ 0. */
  readonly p75: number
  /** 90th percentile (the high-futures edge), real $, ≥ 0. */
  readonly p90: number
  /** Fraction of ALL paths whose household still exists at this year (1 at today, monotone
   *  non-increasing). The honest "how much of the cohort backs this slice" signal — the UI
   *  de-emphasizes a thin late-year band rather than drawing false confidence. */
  readonly cohortFraction: number
}

/** The per-year living-cohort portfolio-value percentile fan — the U6/U7 band's INPUT.
 *
 *  A PARALLEL ACCOUNTING surface (the {@link TaxAwareDistribution} precedent): a pure
 *  observation of per-year portfolio state ALREADY computed inside the decumulation loop. It
 *  perturbs NO draw, path result, or golden — a fan-emitting run's `terminalValuesReal` /
 *  `survivalFraction` / `depletionYears` are byte-identical to the same run without it (the
 *  reduce-to-spine guard proves this). It is OPT-IN per call (`simulate`'s `bandFan` option):
 *  the single headline run requests it; the date-search's many candidates never do (perf +
 *  wire payload). The engine emits compact per-year percentiles — never the raw paths×years
 *  matrix — so the wire payload stays ~years×6, not paths×years. */
export interface BandFan {
  /** One entry per x-grid point, today (index 0) through the run's max horizon, in
   *  `yearsFromNow` order. */
  readonly byYear: readonly BandFanYear[]
}

/** One year of the healthcare readout series (P3·U11 — the Healthcare sheet's INPUT). All
 *  medians are computed among the year's FUNDED living paths (the household exists and the
 *  portfolio funded the year — a depleted-but-alive year pays nothing, so it is excluded from
 *  the cost medians while `cohortFraction` still counts it); the UI withdraws the series where
 *  the cohort thins, exactly like the band (insight 048's pure-gate discipline lives UI-side).
 *  The over-cliff signal is a per-year FRACTION, never a mean — a mean would smear the
 *  discontinuity out of visibility (insight 062). */
export interface HealthReadoutYear {
  /** Whole years from today — k = the END of sim-year k−1 (the {@link BandFanYear} clock). */
  readonly yearsFromNow: number
  /** Median net ACA premium paid (real $/yr; enrolled − PTC, 0 in a year no path priced). */
  readonly acaNetPremiumP50: number
  /** Median BASE Medicare cost (real $/yr; base Part B × enrolled count — income-invariant). */
  readonly medicareBaseP50: number
  /** Median IRMAA surcharge (real $/yr; the income-sensitive step on top of the base —
   *  deliberately SPLIT from the base so the readout can tell the danger-years story). */
  readonly irmaaSurchargeP50: number
  /** Median Medicare-EXTRAS cost (real $/yr; Σ over living∩enrolled of each person's own
   *  Part D / Medigap / MA premium × 12 — income-invariant, deterministic per living-set;
   *  SPLIT from the base line so "base Part B" never silently inflates). 0 when the run
   *  carries no extras vector. */
  readonly medicareExtrasP50: number
  /** Median ACA-MAGI (real $) — the shadow-rate readout's EMPIRICAL anchor (the council's
   *  unbiased-best-estimate contract: the simulation's own median, never a modeled skeleton). */
  readonly acaMagiP50: number
  /** Median IRMAA-MAGI (real $) — the IRMAA-side anchor (distinct calculator; never reuse one). */
  readonly irmaaMagiP50: number
  /** Fraction of the year's ACA-PRICED paths whose MAGI landed strictly over the 400%-FPL
   *  cliff (PTC = 0). 0 when no path priced — read it only where `acaPricedFraction > 0`. */
  readonly overCliffFraction: number
  /** Fraction of ALL paths where ACA actually priced this year (the denominator disclosure
   *  for `overCliffFraction` — same all-paths denominator family as `cohortFraction`). */
  readonly acaPricedFraction: number
  /** Fraction of ALL paths whose household still exists at this year (the {@link BandFanYear}
   *  semantics — the thin-cohort honesty gate reads this). */
  readonly cohortFraction: number
}

/** The per-year healthcare readout series (P3·U11). A PARALLEL observed surface (the
 *  {@link BandFan} precedent): opt-in per call (`simulate`'s `healthReadout` option — the
 *  single headline run requests it; the date-search's candidates never do), observed from
 *  per-year state the overlay already computes, byte-identical to an opt-out run on every
 *  joint field. PRESENT iff opted in AND the run's overlay priced healthcare
 *  (`healthcareEnabled`) — a household outside the engine's priced healthcare domain has NO
 *  honest series to show (the U11 categorical-door contract), so absence is the honest shape. */
export interface HealthReadout {
  /** One entry per sim year (yearsFromNow 1..), ending where no household survives. */
  readonly byYear: readonly HealthReadoutYear[]
}

/** The survivor-conditioned outcome (U7 e1 — the "as the survivor" reading). An OBSERVED surface,
 *  never re-simulated: each path already simulates the full couple→survivor→both-dead timeline (the
 *  survivor spending step-down + the §202 benefit are baked into the cash terms), so this READS the
 *  sampled deaths + the resolved depletion and conditions on widowhood. A PARALLEL accounting surface
 *  (the {@link BandFan} / {@link TaxAwareDistribution} precedent): a survivor-emitting run's joint
 *  `terminalValuesReal` / `survivalFraction` / `depletionYears` are byte-identical to one without it.
 *
 *  A SURVIVOR PHASE exists on a path iff one spouse outlives the other WITHIN the window — the
 *  earliest death is strictly before the latest AND falls inside `maxHorizonYears`. The survivor
 *  inherits the plan, so ANY depletion on such a path — even one that struck while BOTH were alive —
 *  is a survivor FAILURE (the equal-weight definition; blessed 2026-06-27). The fraction conditions on
 *  widowhood, so on a fragile plan it is typically ≤ the joint `survivalFraction` — the honest signal
 *  that the survivor faces more risk than the calm joint headline shows. (NOT a guaranteed inequality:
 *  paths where both die together / both outlive the window are excluded from the denominator.) */
export interface SurvivorConditioned {
  /** Paths with an observed survivor phase (one spouse outliving the other within the window) — the
   *  denominator. The "X of 10 futures where one of you is on your own" the reading conditions on. */
  readonly survivorPhasePaths: number
  /** Of those, the count whose portfolio never depleted ({@link NEVER_DEPLETED}) — the numerator. */
  readonly survivorSurvivors: number
  /** `survivorSurvivors / survivorPhasePaths` — the survivor-conditioned survival fraction (the
   *  "X of 10 as the survivor" reading). In [0, 1]; presence guarantees the denominator is > 0. */
  readonly survivalFraction: number
  /** The median drop in monthly NON-PORTFOLIO household income at widowhood (U7 e1b), real $/month,
   *  ≥ 0. Non-portfolio income = Social Security + ongoing other income (R40, survivor-gated) + earned
   *  income — every dollar that funds spending BEFORE a portfolio withdrawal; the portfolio draw and
   *  the survivor SPENDING step-down are deliberately excluded (this is the INCOME cliff, not the net
   *  cash-need change). Observed by a COUNTERFACTUAL at each survivor-phase path's STEADY-STATE year
   *  (the later of the first-death year and both spouses' SS-claim years, held inside the survivor's
   *  living window): the household income if both were alive that year MINUS the income the survivor
   *  actually has. Anchoring at the steady-state year — NOT the raw first-death year — keeps a death
   *  that lands after retirement but before claiming (where the §202 widow benefit at 60 would
   *  front-run an as-yet-unclaimed retirement benefit and read as income RISING) from UNDERSTATING the
   *  true permanent cliff; each per-path drop is also floored at 0, so the figure is ≥ 0. Median across
   *  survivor-phase paths. PRE-TAX: it does NOT fold in the MFJ→single bracket flip. That flip's sign
   *  on the AFTER-tax cliff is household-dependent — the survivor pays a higher rate PER DOLLAR (narrower
   *  brackets, half the standard deduction, lower SS-taxation thresholds) but on LESS income, so the
   *  after-tax drop can be either shallower or deeper than this pre-tax figure. We therefore report the
   *  UNAMBIGUOUS pre-tax income cliff and let `verdictSurvivorStepDown` flag the bracket shift as a
   *  SEPARATE qualitative consequence — never an ambiguous tax delta baked into $X. The copy's $X reads this. */
  readonly incomeStepDownMonthlyReal: number
}

/** The essentials-floor track's outcome (P3·U9). PRESENT on a {@link Distribution} iff the run
 *  carried a {@link SimulationParams.budget} construct. UNLIKE `bandFan`/`survivorConditioned`,
 *  this is NOT a free observation of already-computed state — it is a GENUINE second
 *  decumulation + overlay pass per path (the essentials-only spend vector on the SAME shared
 *  draws/deaths/returns), so the bandFan byte-identity-guard pattern proves nothing here; the
 *  floor's correctness guard is the degenerate-identity golden (essentials ≡ full ⇒ the two
 *  tracks agree exactly) plus its presence companions. Every full-track success is an
 *  essentials-track success on the same path (essentials spend ≤ full spend per year on
 *  identical draws), so `floor.survivalFraction ≥ survivalFraction` path-for-path — the
 *  reachable tier-ordering law U9 pins (the cliff-driven inversion needs U10's conversions). */
export interface FloorTrack {
  /** Fraction of paths whose portfolio funded the ESSENTIALS-ONLY spend every year.
   *  Continuous in [0, 1], pre-quantization — the Tier-1 floor statistic. */
  readonly survivalFraction: number
  /** Per-path depletion year AGAINST THE ESSENTIALS-ONLY SPEND (or {@link NEVER_DEPLETED}).
   *  Length === paths, paths-aligned with the full track's `depletionYears`. */
  readonly depletionYears: readonly DepletionYear[]
}

/** The raw, continuous distribution the headline rounds FROM — emitted alongside the
 *  rounded outputs so callers can re-round under their own (stateful) rules. */
export interface Distribution {
  /** Terminal real portfolio values, one per path (the full sample, not just pass/fail). */
  readonly terminalValuesReal: readonly number[]
  /** Per-path depth of failure: the absolute year index of depletion, or
   *  {@link NEVER_DEPLETED}. Length === paths. */
  readonly depletionYears: readonly DepletionYear[]
  /** Fraction of paths that survived every year against the FULL spend — the statistic the
   *  X-of-10 headline reads. Continuous in [0, 1], pre-quantization. Computed as
   *  `survivors / paths`, where a path FAILS by depleting against the full per-year spend
   *  (the flat `annualSpendingReal` scalar, or the budget's full track when a
   *  {@link SimulationParams.budget} is present). This is FULL-LIFESTYLE survival — since
   *  P3·U9 the essentials floor is its own surface ({@link Distribution.floor}), present iff
   *  a budget rode the run; in the un-itemized degenerate the two coincide. */
  readonly survivalFraction: number
  /** Per-path tax-aware solver surfaces (U3·M6). PRESENT iff the run carried the tax
   *  overlay — see {@link TaxAwareDistribution} for the presence contract. */
  readonly taxAware?: TaxAwareDistribution
  /** The per-year living-cohort portfolio-value percentile fan (U6/U7 band INPUT). PRESENT iff
   *  the caller opted in via `simulate`'s `bandFan` option — see {@link BandFan} for the
   *  presence + byte-identity contract. A parallel presentation surface; the headline never
   *  rounds from it. */
  readonly bandFan?: BandFan
  /** The per-year healthcare readout series (P3·U11). PRESENT iff the caller opted in via
   *  `simulate`'s `healthReadout` option AND the overlay priced healthcare — see
   *  {@link HealthReadout} for the presence + byte-identity contract. */
  readonly healthReadout?: HealthReadout
  /** The survivor-conditioned outcome (U7 e1). PRESENT iff the caller opted in via `simulate`'s
   *  `survivorConditioned` option AND ≥ 1 path had a survivor phase — see {@link SurvivorConditioned}
   *  for the presence + byte-identity contract. A parallel observed surface; the joint
   *  `survivalFraction` is never derived from it. */
  readonly survivorConditioned?: SurvivorConditioned
  /** The essentials-floor track (P3·U9). PRESENT iff the run carried a
   *  {@link SimulationParams.budget} — see {@link FloorTrack} for why the bandFan
   *  byte-identity pattern does NOT apply (a genuine second compute, param-driven,
   *  not caller-opt-in). */
  readonly floor?: FloorTrack
}

/** The resolved engine output. */
export interface SimulationResult {
  readonly distribution: Distribution
  readonly headline: Headline
  readonly dollar: DollarAdjustment
  /** The "as the survivor" reading (U7 e1c). PRESENT iff `distribution.survivorConditioned` is —
   *  i.e. the run opted into the survivor surface AND ≥ 1 path had a survivor phase. A PARALLEL
   *  reading (the joint headline never rounds from it). */
  readonly survivorReading?: SurvivorReading
  /** The essentials-floor verdict (P3·U9) — the joint {@link Headline}'s grammar applied to the
   *  floor track (identical quantize→band→9-cap pipeline, `already-failing` keyed to the FLOOR's
   *  own depletion signal). PRESENT iff `distribution.floor` is (i.e. the run carried a budget).
   *  A PARALLEL reading; the full-track headline never rounds from it. Engine-tagged so no UI
   *  layer ever re-derives a threshold (the U7/D2 honesty contract). */
  readonly floorReading?: Headline
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
// P3·U10 — the two-arm control comparison (the manual sequencing + Roth levers).
// The WIRE-CROSSING request/outcome vocabulary lives here in the leaf layer (the
// DateSearchOutcome precedent); the orchestration lives in src/engine/roth.ts.
// ---------------------------------------------------------------------------

/** Which control the two-arm comparison varies — the SOLE difference between arms
 *  (contract #2: shared CRN; the delta is signal, never luck).
 *  - `conversion`: with-arm = the candidate {@link RothConversionPlan}; without-arm =
 *    no conversions. The base drawdown policy is HELD FIXED across both arms.
 *  - `sequencing`: selected-policy arm vs the neutral `proportional` baseline arm
 *    (the tax-aware baseline's named policy). The conversion stream is HELD FIXED. */
export type TwoArmControl =
  | { readonly kind: 'conversion'; readonly plan: RothConversionPlan }
  | {
      readonly kind: 'sequencing'
      readonly policy: DrawdownPolicy
      /** REQUIRED iff `policy === 'custom'` (the persisted biconditional's wire mirror). */
      readonly order?: readonly DrawdownOrderKey[]
    }
  | {
      /** P3·U11 — the enhanced-ACA-subsidy regime what-if: with-arm = `enhanced`, without-arm
       *  = the base params VERBATIM (the current applied regime). Meaningful only when the
       *  base overlay prices healthcare (else the arms are identical — the engine returns
       *  the defined indeterminate, the R19 calm contract). */
      readonly kind: 'subsidy-regime'
      readonly enhanced: boolean
    }

/** One arm's compact reading — everything TwoFutures + the delta chrome render from,
 *  and nothing else (the per-path arrays stay worker-side; this crosses by structured
 *  clone). All fields JSON-safe (DND/009). */
export interface TwoArmReading {
  /** The arm's joint headline (the same quantize→band→9-cap pipeline as the spine). */
  readonly headline: Headline
  /** The arm's "as the survivor" reading — the DELTA's primary basis (the plan's
   *  emotional headline is the survivor's number). PRESENT iff ≥ 1 survivor phase. */
  readonly survivorReading?: SurvivorReading
  /** The arm's per-year percentile fan (the TwoFutures series input). */
  readonly bandFan?: BandFan
  /** RAW pre-quantize joint survival fraction ∈ [0,1] — the monotonicity contract's
   *  value (the clamped X-of-10 string can plateau; this must not jitter). */
  readonly survivalFraction: number
  /** RAW pre-quantize survivor-conditioned fraction — present iff the survivor surface is. */
  readonly survivorFraction?: number
  /** The LOWER-median depletion year across paths (never-depleted paths order past every
   *  real year). ABSENT when the median path never depletes — the "~N years longer"
   *  secondary is only quotable when both arms have a real median (never fabricated). */
  readonly medianDepletionYear?: number
  /** The arm's median LIFETIME healthcare cost (real $; per-path Σ net ACA premium + Σ
   *  Medicare cost, then the median — P3·U11). PRESENT iff the arm ran the tax overlay.
   *  The regime-toggle preview HEADLINES the delta of this figure — the regime's effect
   *  concentrates in the pre-65 ACA years and may barely move the portfolio median
   *  (council 2026-07-03). */
  readonly lifetimeHealthCostMedianReal?: number
}

/** The two-arm comparison outcome. `indeterminate` = an arm's INPUT was incomputable
 *  (the R19 contract — e.g. no account buckets to convert); `infeasible` = an arm's
 *  overlay computation failed mid-path (the typed M6 sentinel, never a dropped path). */
export type TwoArmOutcome =
  | {
      readonly kind: 'two-arm'
      /** The control applied (the candidate plan / the selected policy). */
      readonly with: TwoArmReading
      /** The baseline (no conversions / the `proportional` policy). */
      readonly without: TwoArmReading
      /** `with − without` on the RAW fractions, survivor-basis when BOTH arms carry the
       *  survivor surface (the plan's primary framing), else joint-basis. The tests'
       *  monotonicity contract reads THIS, never a clamped string. */
      readonly rawDelta: number
      readonly deltaBasis: 'survivor' | 'joint'
      /** `with.medianDepletionYear − without.medianDepletionYear` — positive = the
       *  with-arm's median path lasts ~N years LONGER. PRESENT iff BOTH arms have a
       *  real median depletion year (never fabricated from a never-depleting median). */
      readonly medianYearsDelta?: number
    }
  | { readonly kind: 'indeterminate'; readonly reason: string }
  | { readonly kind: 'infeasible'; readonly reason: string }

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
  /** Frozen legacy person shape (carries `socialSecurityReal`, never the live `pia`) — see
   *  {@link PersonInputsLegacy}. The live engine swap to `pia` does not retroactively reshape a
   *  persisted v1 blob. */
  readonly people: readonly PersonInputsLegacy[]
  readonly survivorSpendingRatio: number
  readonly drawdownPolicy: DrawdownPolicy
  /** The injected 32-bit seed, persisted as a first-class field so a reopened plan
   *  reproduces byte-identically (contract #1). */
  readonly seed: number
}

// ---------------------------------------------------------------------------
// schemaVersion-2 scenario shape (U2 · M6a). The v1 spine inputs + the tax-overlay
// fields: PER-PERSON account buckets + birth year, the household filing status, and
// provenance stamps. DEFINED HERE for the contract + the decode/migration ladder — it
// is NOT the forward-written persist shape: the guided intake first-writes ScenarioV3
// at P2·U8 (see the schemaVersion-3 block below), and v2 survives only as a decode-
// ladder member (`AnyScenario`) for migrating any legacy save. The schemaVersion 1→2
// migration ladder is owned by U4. CONSUMED VIA `OverlayParams`: P2 intake maps these
// per-person fields down to the engine's `OverlayParams` — the aggregated `buckets`
// PLUS the optional per-person pre-tax split (`pretaxByPerson`, U2·M6b·B — shipped:
// present ⇒ each spouse forces its own RMD; absent ⇒ the byte-identical aggregate pool).
// ---------------------------------------------------------------------------

/** One spouse's account split + birth year (schemaVersion-2). Aligned by index to a v2
 *  scenario's `people`. `birthYear` keys the SECURE-2.0 RMD band + the age-65 deduction; in P2
 *  intake it derives from the calendar year − age (a ±1yr birth-month approximation, sufficient
 *  for the discrete thresholds). `taxableBasis` is the year-0 cost basis of `taxable` (real $);
 *  bundling it here forecloses the parallel-array transposition footgun. */
export interface PersonAccounts {
  readonly birthYear: number
  readonly taxable: number
  /** Year-0 cost basis of the taxable bucket (real $); ≤ `taxable` (the rest is unrealized gain). */
  readonly taxableBasis: number
  readonly pretax: number
  readonly roth: number
  /** This person's OWN HSA (U3 · M5; real $). Per-person because HSA ownership is individual —
   *  the 65+ Medicare-premium spend privilege keys to the OWNER's age and the 55+ catch-up lands
   *  in each spouse's own account (Pub 969 via `hsaFourthBucketRules`/`hsa2026`). Intake sums
   *  these into the aggregated `OverlayParams.buckets.hsa` + derives `hsaOwnerIndex`. Optional
   *  under the schemaVersion-2 additive bump: absent ⇒ 0. */
  readonly hsa?: number
  /** This person's per-account contribution streams (C2; the persisted mirror of the engine's
   *  `AccumulationParams.contributionsByPerson[i]`). Additive under schemaVersion-2 — absent ⇒
   *  no contributions (the decumulation-only scenario). NOT YET WRITTEN to disk: P2 intake
   *  expands the entered flat-real amounts into these streams (per-runway-year age-band
   *  ceilings) and maps them down to `OverlayParams.accumulation`. */
  readonly contributions?: PersonContributionStreams
}

// ---------------------------------------------------------------------------
// The date-search result vocabulary (C3 — the fuck-off date). Lives HERE (the leaf
// layer) because the worker wire (`engineWire.ts`) must speak it while importing only
// @shared. Three FIRST-CLASS outcomes per track (§3c) — `indeterminate` stays reserved
// for INPUT failure (a no-date is a defined ANSWER on valid input), the `OutcomeState`
// enum stays closed (never a 7th state), and every persisted field is a finite numeric
// (DND/009 — the NEVER_DEPLETED = −1 precedent; the no-offset cases simply carry no
// offset field, never an Infinity/NaN sentinel).
// ---------------------------------------------------------------------------

/** The date-search compute tier (§3c, the two-tier posture): during-entry surface-early
 *  refires run at the headline path count (`provisional` — the coarser haircut errs
 *  later/conservative, rendered under D1's provisional string class); the FINAL crowned
 *  date (+ every post-completion/override re-grade) runs at the pinned 16k (`final` —
 *  the designed-tolerance assertion scopes here). The path counts are pinned engine
 *  constants (dateSearch.ts), not caller-tunable numbers. */
export type DateSearchTier = 'provisional' | 'final'

/** One evaluated candidate offset's reading — the per-offset curve entry (surfaced on
 *  every outcome, load-bearing for the no-date answer's calm explanation). */
export interface DateOffsetReading {
  /** The candidate offset Y (whole sim-years from today; the date = today + Y). */
  readonly offsetYears: number
  /** The point-estimate survival fraction at this offset (`survivors / paths`). */
  readonly survivalFraction: number
  /** The conservative one-sided lower confidence bound (`p̂ − z·SE`), QUANTIZED to the
   *  survival grid BEFORE the bar comparison — the value the crowning rule reads (§3c:
   *  reading the lower bound is what stops a lucky-noise offset from being crowned a
   *  false-earliest date; the point estimate is always ≥ it, the disclosed margin). */
  readonly quantizedLowerBound: number
  /** `quantizedLowerBound ≥ BANDS.onTrack` — the per-offset clear/fail the rule reads. */
  readonly clears: boolean
}

/** The grade a crowned (or window-edge) date carries: the SAME quantized lower bound that
 *  crowned it (one run, one statistic, one grade — objective ≡ headline, §3c; the
 *  drill-down renders THIS, never an independent recompute) + its margin above the bar. */
export interface DateGrade {
  /** The crowned offset's quantized lower bound (the conservative grade). */
  readonly quantizedLowerBound: number
  /** The crowned offset's point-estimate survival (≥ the bound — the conservative margin,
   *  disclosed; a drill-down can only read equal-or-better, never worse). */
  readonly survivalFraction: number
  /** `quantizedLowerBound − BANDS.onTrack` (≥ 0 for a crowned date) — the lower-bound
   *  margin, the date↔confidence tradeoff made explicit (R28). */
  readonly marginAboveBar: number
}

/** One track's (floor / lifestyle) date-search outcome — the three first-class cases (§3c).
 *  The candidate = the earliest offset whose quantized lower bound clears AND keeps clearing
 *  through the window top (equivalently: the start of the longest clearing suffix; it exists
 *  iff the top offset clears). */
export type DateTrackOutcome =
  | {
      /** The candidate exists BELOW the window top (≥ 1 later offset of keeps-holding
       *  evidence by construction). A floor candidate (`offsetYears === 0`) reads
       *  "work-optional AT today" — the one-sided window-FLOOR semantic: maximal evidence,
       *  no extra disclosure (never a claim about the past — negative offsets are never
       *  evaluated, by design). */
      readonly kind: 'confirmed-date'
      readonly offsetYears: number
      readonly grade: DateGrade
      /** Cleared-then-dipped offsets BELOW the candidate (the non-monotone-region
       *  disclosure — the ACA-cliff signature; empty when the curve is clean). */
      readonly nonMonotoneOffsets: readonly number[]
      readonly curve: readonly DateOffsetReading[]
    }
  | {
      /** The candidate IS the window top: ZERO later offsets of evidence (the keeps-holding
       *  rule is vacuous) — reported WITH the unconfirmed-tail disclosure, never silently
       *  crowned (unconfirmed-optimistic) and never folded into no-date (pessimistic-false).
       *  Carries the non-monotone disclosure TOO when earlier offsets cleared-then-dipped. */
      readonly kind: 'window-edge-unconfirmed'
      readonly offsetYears: number
      readonly grade: DateGrade
      readonly nonMonotoneOffsets: readonly number[]
      readonly curve: readonly DateOffsetReading[]
    }
  | {
      /** No candidate (the top offset fails — nothing clears, or a dip never recovers
       *  in-window): a first-class DEFINED result — "no work-optional date within the
       *  window" — never "never free," never silently the window-top offset, never a crash,
       *  never `indeterminate`. The curve carries the calm per-offset explanation. */
      readonly kind: 'no-date-in-window'
      readonly nonMonotoneOffsets: readonly number[]
      readonly curve: readonly DateOffsetReading[]
    }

/** The crowned date's confidence band (D2 slice 2): the crowned candidate's per-year projection
 *  fan + the ENGINE's reading of that SAME distribution (the band's outcome-state tag). Bundled so
 *  the fan and its tag are atomically present-or-absent — a fan without its reading is
 *  unrepresentable, and the UI re-derives NEITHER (it reads the engine's authority tag, never a
 *  recomputed grade — the "UI re-derives nothing" law, bandData.ts §outcomeState). A crowned
 *  candidate is on-track-or-better by construction (its quantized lower bound cleared the bar), so
 *  `outcomeState` ∈ {`on-track`, `over-funded`} — never a fail state. Rides the date wire by
 *  structured clone with the rest of the outcome (the fan is compact years×6 FINITE numbers —
 *  DND/009-clean, the $0 ruin floor reads as a real 0; no transferable). */
export interface DateBand {
  readonly fan: BandFan
  readonly outcomeState: OutcomeState
  /** The crowned offset the fan was projected at — the work-stops (accumulation→decumulation)
   *  inflection year. Carried so the UI reads the band's OWN inflection rather than re-deriving it
   *  from a sibling track field (the "UI re-derives nothing" law). In v1 floor ≡ lifestyle so this
   *  equals `floor.offsetYears`; once U9 splits the tracks, a band crowned off one track still names
   *  its own offset. */
  readonly offsetYears: number
}

/** The run-level date-search outcome. `input-failure` is the indeterminate-CLASS variant
 *  (the §0 grammar): an all-retired household (the offset axis is undefined — never a
 *  `Y == 0` "work-optional today" crown), an ANY-candidate `validateParams` rejection (the
 *  all-or-nothing policy: an unevaluated offset voids the "earliest" claim, so a rejecting
 *  candidate fails the RUN, naming the offending input — never drop-and-continue), or a
 *  zero-width window. `cancelled` = the cooperative mid-sweep stop (a lock / a newer
 *  request): no further candidate dispatched, nothing date-shaped rendered. */
export type DateSearchOutcome =
  | {
      readonly kind: 'dates'
      /** The essentials-floor track. In the v1 degenerate (single-total-spend) budget the
       *  two tracks are byte-identical and the dates COINCIDE (rendered as one); the
       *  P3·U9 budget split separates them. The SHAPE admits every mixed case now —
       *  {floor: date, lifestyle: no-date}, the mirrors, and floor > lifestyle (the
       *  100%-FPL-floor signature, correct surprising-but-honest output) — the behavioral
       *  mixed tests ride U9 (insight 014). */
      readonly floor: DateTrackOutcome
      /** The full-budget lifestyle track (terminates independently). */
      readonly lifestyle: DateTrackOutcome
      readonly tier: DateSearchTier
      /** The window top this run evaluated (the §3c evidence anchor — a persisted result
       *  names its own window; a width change re-runs the honesty battery). */
      readonly windowTopYears: number
      readonly seed: number
      /** The crowned date's projection band (D2 slice 2) — PRESENT iff a date was crowned
       *  (`confirmed-date` / `window-edge-unconfirmed`); a `no-date-in-window` run carries none
       *  (nothing to project). The fan is `candidates[crownedOffset]`'s at THIS run's seed —
       *  CRN-identical to the fan-OFF sweep reading that crowned the date. See {@link DateBand}. */
      readonly band?: DateBand
    }
  | { readonly kind: 'input-failure'; readonly reason: string }
  | { readonly kind: 'cancelled' }

/** The schemaVersion-2 plaintext scenario: the v1 spine inputs + the U2 tax-overlay fields.
 *  Additive over v1 — every v1 field carries through unchanged, so the migration is a pure
 *  extension (U4). The provenance stamps make a statutory bracket change read as a deliberate
 *  vintage bump, never silent inflation drift. */
export interface ScenarioV2 {
  /** Migration discriminant — read before any other field on decrypt (U4). */
  readonly schemaVersion: 2
  readonly initialPortfolio: number
  readonly annualSpendingReal: number
  readonly stockWeight: number
  /** Frozen legacy person shape ({@link PersonInputsLegacy}) — v2 shares the v1 person; the live
   *  swap to `pia` rides only the base `PersonInputs`/`PersonInputsV3`, never the persisted v1/v2. */
  readonly people: readonly PersonInputsLegacy[]
  readonly survivorSpendingRatio: number
  readonly drawdownPolicy: DrawdownPolicy
  readonly seed: number
  // --- U2 tax-overlay additions (additive over v1) ---
  /** Per-person account buckets + birth year, aligned by index to `people`. */
  readonly accounts: readonly PersonAccounts[]
  /** Household filing status while the couple is intact (flips to single at the first death). */
  readonly filing: FilingStatus
  /** The simulation's year-0 calendar anchor (drives RMD ages + the senior-bonus 65+ count). */
  readonly startCalendarYear: number
  /** The tax-table vintage applied (e.g. `'OBBBA-2025'`) — a bracket change is a vintage bump. */
  readonly taxVintage: string
  /** The methodology app-default version stamp (which default market/assumption set was applied). */
  readonly appDefaultVersion: string
}

// ---------------------------------------------------------------------------
// schemaVersion-3 scenario shape (P2 · D1 — the account-level intake). The v2
// semantics + the ENTERED truth the guided setup captures: per-person identity +
// work-status, the user's actual account list, the ticker-keyed manual
// classifications, and the household health-cost entry.
//
// DEFINED HERE for the single-shape rule (phase-2 contract #1e: `memoryModel`
// holds the same to-be-persisted MODEL shape, so an intake field can never be
// captured on screen yet silently dropped at Save). First WRITTEN to disk by
// P2·U8, which owns — IN the same change (the as-we-go rule) — the codec's
// `checkV3Fields` + `version === 3` branch and the v2→v3 migration. Until then
// `AnyScenario` stays v1|v2 and the codec's newer-version refuse keeps any
// stray v3 blob calm (never a mis-parse, never healthcare silently OFF).
//
// FIDELITY OVER DUPLICATION (deliberate v2→v3 shape change): v2's
// `initialPortfolio`, `stockWeight`, and per-person `accounts` aggregates are
// NOT carried as stored fields — each is now a pure DERIVATION of
// `enteredAccounts` (+ `tickerClassifications`), owned by `src/intake/intakeMap.ts`
// (portfolio = Σ valueToday; stockWeight = the household blend collapse, §5
// cash→bond; PersonAccounts = the per-person bucket fold). A stored copy beside
// its own inputs is a stale-value hazard inside an encrypted vault — the
// calm-but-wrong class. The U8 v2→v3 migration mints synthetic entered accounts
// from the old aggregates (one per nonzero bucket per person, no ticker), so the
// ladder stays total.
// ---------------------------------------------------------------------------

/** Work status is ASKED, never inferred (a salary-$0 still-working person must
 *  still route date-first — D1). It is also what keeps the constructed
 *  placeholder honest: for `'retired'`, `retirementAge` is the ENTERED stop age
 *  (`≤ currentAge` is the legitimate entry — the status-conditional R19 rule);
 *  for `'working'`, `retirementAge` is the intakeMap-CONSTRUCTED placeholder
 *  (strictly > currentAge, never user-asked — the date IS the product's answer). */
export const WORK_STATUSES = ['working', 'retired'] as const
export type WorkStatus = (typeof WORK_STATUSES)[number]

/** Per-person intake identity over the spine person. `currentAge` is derived once at entry from
 *  DOB → `birthYear` against `startCalendarYear` (whole-year convention — the same ±1yr birth-month
 *  approximation `PersonAccounts.birthYear` documents); the intake sanity layer owns the
 *  `currentAge === startCalendarYear − birthYear` invariant. `birthYear` is inherited from the base
 *  {@link PersonInputs} now (it keys the SS FRA lookup + the per-person mortality cohort) — it is no
 *  longer re-declared here (single-source on the base). */
export interface PersonInputsV3 extends Omit<PersonInputs, 'retirementAge'> {
  /** Display name for the paired two-person screens (PII — encrypted at rest, R39). */
  readonly name: string
  readonly workStatus: WorkStatus
  /** The persisted retirement age is a BICONDITIONAL of `workStatus` (council 2026-06-30, Option B —
   *  the honest model). PRESENT (the entered stop age) for a `'retired'` person; ABSENT for a
   *  `'working'` person — the swept fuck-off-date is their ANSWER, not an input, so the persisted
   *  model carries no synthetic value (storing `currentAge + 1` would be the masquerade `intakeMap`'s
   *  own comment forbids: a value `questions.tsx`'s flip-to-retired would surface as "entered"). The
   *  ENGINE's `PersonInputs.retirementAge` stays REQUIRED — `buildPeople` reconstructs the placeholder
   *  for the date run, kept PRIVATE to intakeMap, never on disk. The codec (`checkPersonV3`) enforces
   *  the biconditional at runtime (reject-on-present for working); the `?` alone can't forbid a value. */
  readonly retirementAge?: number
}

/** Account types the intake offers. The kind→bucket map is intakeMap's
 *  (`401k`/`403b`/`traditional-ira` → pretax · `roth-401k`/`roth-ira` → roth ·
 *  `brokerage` → taxable · `hsa` → hsa), as is the kind→catch-up-account-kind map
 *  for the C1 ceiling checks (employer plans vs IRA vs HSA). */
export const ACCOUNT_KINDS = [
  '401k',
  '403b',
  'traditional-ira',
  'roth-401k',
  'roth-ira',
  'brokerage',
  'hsa',
] as const
export type AccountKind = (typeof ACCOUNT_KINDS)[number]

/** One account as the user entered it (R35/R36 — user-entered values, no live
 *  lookup). The model stores the ENTERED truth; every aggregate is derived. */
export interface EnteredAccount {
  /** Index into `people` — whose account this is (drives the per-person bucket
   *  fold, HSA ownership, and the per-owner contribution streams). */
  readonly ownerIndex: number
  readonly kind: AccountKind
  /** A holding's ticker for the C1 blend lookup. NOT collected by the current
   *  single-account intake — the account's stock/bond/cash mix is entered directly
   *  via `manualBlend`; this field is reserved for the U8 multi-holding entry
   *  (decision 7). Absent or unrecognized ⇒ `manualBlend` is REQUIRED (burned/062
   *  — a blend is never a silent default). */
  readonly ticker?: string
  /** The account's stock/bond/cash mix, entered directly (exact %). REQUIRED
   *  whenever no `ticker` resolves the blend (burned/062 — never a silent default
   *  blend). The current intake always uses this; the household
   *  `tickerClassifications` map is the U8 ticker-keyed reuse path. */
  readonly manualBlend?: TickerClassification
  /** Today's balance (real $). */
  readonly valueToday: number
  /** Cost basis (real $) — taxable kinds only; summed per person → `taxableBasis`
   *  (per-account, not per-lot — accumulation plan §4). */
  readonly basis?: number
  /** Flat-real annual contribution while the owner works (R31). Ceiling-checked
   *  against C1 at the current age; intakeMap applies the per-runway-year
   *  step-down when an age-band expires mid-runway. */
  readonly annualContribution?: number
  /** Flat-real annual employer match while the owner works — always a PRETAX
   *  inflow regardless of the account's own kind (R31). Employer-PLAN kinds only
   *  (401k/403b/Roth-401(k)); an HSA's employer money is {@link hsaEmployerAnnual}. */
  readonly employerMatchAnnual?: number
  /** Flat-real annual EMPLOYER contribution to an HSA while the owner works (HSA
   *  kind only). Routes to the HSA bucket like the owner's own HSA contribution —
   *  NOT the pretax employer-match channel — and counts WITH the personal
   *  contribution against the single HSA family ceiling (employer + employee share
   *  one statutory limit). */
  readonly hsaEmployerAnnual?: number
}

/** The manual ticker classification (R37 fallback): the calm 3-choice answer, or
 *  the advanced exact-% split (intake enforces sum-to-100). Keyed by ticker in
 *  `ScenarioV3.tickerClassifications` — answered once, reused across accounts
 *  WITHIN the flow, persisted only at Save inside the encrypted record (R39). */
export const TICKER_CLASSIFICATION_CHOICES = ['stocks', 'bonds', 'cash'] as const
export type TickerClassificationChoice = (typeof TICKER_CLASSIFICATION_CHOICES)[number]
export type TickerClassification =
  | { readonly kind: 'simple'; readonly choice: TickerClassificationChoice }
  | {
      readonly kind: 'exact'
      readonly stockPct: number
      readonly bondPct: number
      readonly cashPct: number
    }

/** Household health-cost entry (D1 §3b). The compact ENTERED form — the per-age
 *  escalation (federal age curve, per-member split, staggered Medicare exit) and
 *  the per-sim-year flattening are intakeMap's derivation, never stored.
 *  Premiums are $/month as quoted (healthcare.gov / KFF artifacts are monthly);
 *  intakeMap owns the ×12. `oopMedicalAnnual` neither age-escalates nor stops at
 *  65 (B1 cap-only semantics). */
export interface HealthIntakeV3 {
  /** The plan-you'd-pick marketplace premium, today's quote ($/mo). REQUIRED for
   *  any date-route household with a pre-65 retired window (absent coverage is
   *  the optimistic direction — the cardinal sin); the sourcing-stall affordances
   *  (pre-flight note + continue-past) own the UX of its absence. */
  readonly enrolledPremiumMonthlyToday?: number
  /** The SLCSP benchmark, today's quote ($/mo). Same requiredness as enrolled. */
  readonly slcspMonthlyToday?: number
  /** Out-of-pocket medical ($/yr) — OPTIONAL (absent only disables the HSA
   *  qualified-spend cap, the pessimistic-safe direction). Its question copy must
   *  carry the containment contrast (OOP already lives INSIDE the spend figure). */
  readonly oopMedicalAnnual?: number
  /** The `t < lookback` prior-year ACTUAL MAGIs (Y-invariant — pre-sim tax
   *  returns no candidate can move). Collected only when a member is at/near 65. */
  readonly irmaaMagiSeed?: readonly number[]
  /** Per-person working-year INVESTMENT income (interest/dividends/cap-gains/K-1) ON TOP of the
   *  entered salary, aligned by index to `people` — the genuinely-new half of the working-year
   *  IRMAA-MAGI (C3 → Option B, simplified 2026-06-30). The PAY half is NOT re-collected:
   *  `intakeMap.buildDateInput` derives the engine's per-person override as
   *  `earnedIncomeReal + investment` (the salary already funds the bridge — re-asking it was
   *  redundant + confusing, and the engine cannot model a time-varying salary anyway). This
   *  investment income is on the R40 OUT-list and reaches IRMAA-MAGI ONLY through this field, so
   *  omitting it under-states Medicare cost = the cardinal sin — hence it's a first-class required
   *  input (an explicit 0, never a silent skip). EXCLUDES the separately-modeled R40 streams
   *  (pension/rental/annuity/alimony) — those ride `ongoingTaxableIrmaaOnly` in every year, so
   *  entering one here double-counts (KTD-9). A retired member's slot is 0. (A bonus/RSU spike
   *  above the steady salary is a DISCLOSED simplification — the override uses the steady figure;
   *  conservative-or-disclose, R40.) */
  readonly workingYearInvestmentByPerson?: readonly number[]
}

/** The display unit the household spend figure was ANSWERED in. An explicit
 *  user answer (the ambiguous-magnitude force-confirm makes it one — R19), so
 *  it persists per the single-shape fidelity rule; `annualSpendingReal` stays
 *  the canonical engine quantity (annual = entered ×12 when monthly — a unit
 *  preference beside its value, not a second source). */
export const SPEND_ENTRY_PERIODS = ['month', 'year'] as const
export type SpendEntryPeriod = (typeof SPEND_ENTRY_PERIODS)[number]

// ---------------------------------------------------------------------------
// Other income in retirement (R40) — the persisted per-person stream entity. A
// generic ongoing non-earned stream (pension/rental/alimony/annuity/other) that keeps
// paying after work stops. The `type` label SEEDS intake defaults only; the engine
// consumes the COMPILED `PersonIncomeStream` leaf (above), never this entity (KTD-3 —
// the compiled leaf is never persisted, fidelity-over-duplication). Tax treatment is a
// discriminated union keyed on `type` (KTD-6, mirroring `TickerClassification`) so the
// contradictions "a pension carries an annuity exclusion" / "alimony carries a direct
// taxable fraction" are UNREPRESENTABLE in authored code; `compileIncomeStreams` derives
// the effective taxable fraction. At restore the union is erased (`JSON.parse + as`), so
// U8's `checkIncomeStreamV3` re-validates the full arm. Decisions: docs/decisions/
// other-income-r40.md. Requirements: product §7 (R40.1–R40.10).
// ---------------------------------------------------------------------------

export const INCOME_TYPES = ['pension', 'rental', 'alimony', 'annuity', 'other'] as const
export type IncomeType = (typeof INCOME_TYPES)[number]

/** COLA handling for a stream's gross (R40.2 · KTD-2). `real-flat` ⇒ the real value holds (zero
 *  variance — a DETERMINISTIC floor in the confidence band, the U6/D2 render flag); `nominal-flat` ⇒
 *  deflated by inflation only (erodes in real terms); `fixed-pct` ⇒ grows at `colaPct` nominal then
 *  deflated (`colaPct` REQUIRED-and-finite). */
export const COLA_MODES = ['real-flat', 'nominal-flat', 'fixed-pct'] as const
export type ColaMode = (typeof COLA_MODES)[number]

/** The per-`type` tax-treatment arm (KTD-6 — the discriminated union). `compileIncomeStreams` reads it
 *  to the effective taxable fraction: pension/rental/other ⇒ `taxableFraction` (default 1, the
 *  conservative fully-taxable; an entered `< 1` is the DISCLOSED-optimistic basis-recovery opt-in);
 *  alimony ⇒ DERIVED from the agreement date (post-2018 ⇒ 0, not taxable & MAGI-invisible; pre-2019 ⇒ 1;
 *  a pre-2019 instrument expressly modified to adopt the post-2018 rules ⇒ 0); annuity ⇒ qualified ⇒ 1,
 *  non-qualified ⇒ `1 − exclusionFraction`. No redundant derived fraction is persisted (KTD-6). */
export type IncomeTaxTreatment =
  | { readonly type: 'pension'; readonly taxableFraction?: number }
  | { readonly type: 'rental'; readonly taxableFraction?: number }
  | { readonly type: 'other'; readonly taxableFraction?: number }
  | {
      readonly type: 'alimony'
      /** The instrument was EXECUTED after 2018-12-31 (TCJA ⇒ not taxable to the recipient, MAGI-
       *  invisible). The highest-leverage field in the feature — NEVER defaulted (intake asks it). */
      readonly executedAfter2018: boolean
      /** A pre-2019 instrument EXPRESSLY modified after 2018 to adopt the post-2018 tax rules ⇒ also
       *  not taxable. Consulted only when `executedAfter2018 === false`; intake default is no. */
      readonly modifiedAdoptsPost2018Rules?: boolean
    }
  | { readonly type: 'annuity'; readonly qualified: true }
  | {
      readonly type: 'annuity'
      readonly qualified: false
      /** The exclusion ratio (basis / expected return) — the TAX-FREE fraction; effective taxable =
       *  `1 − exclusionFraction`. v1 holds it CONSTANT (the exclusion never exhausts) — disclosed-
       *  optimistic, understates late-life MAGI (the KTD OUT-list). ∈ [0,1], gated entity-side. */
      readonly exclusionFraction: number
    }

/** One persisted other-income stream (R40 · KTD-3, on `ScenarioV3.incomeStreams`) — the common fields +
 *  the `type`-keyed tax-treatment union. Entity scalars (`survivorPct` / `taxableFraction` /
 *  `exclusionFraction` ∈ [0,1]) are range-gated ENTITY-side (intake sanity + U8's codec): they are
 *  multiplied away at compile, so the engine never sees them to range-check (KTD-4). */
export type IncomeStream = {
  /** Whose stream this is — the `people` index (0 = owner, 1 = spouse). Its OWNER's sampled death gates
   *  the SURVIVOR variant, independently per person (KTD-7). */
  readonly ownerIndex: 0 | 1
  /** Gross real $/yr at SIM-YEAR 0 — the anchor (KTD-8b: an already-receiving stream reads exactly this
   *  at t=0). A not-yet-started stream is anchored here too: its value WHEN it begins is this evolved by
   *  COLA/deflation to the start offset (the exponent is the ABSOLUTE sim-year, never re-anchored at the
   *  start) — so a future nominal stream reads conservatively LOWER than `annualRealToday` at its start. */
  readonly annualRealToday: number
  /** The OWNER's age the stream STARTS paying. `≤ currentAge` ⇒ already-receiving, clamped to t=0
   *  (KTD-8b), never rejected. */
  readonly startAge: number
  /** The OWNER's age the stream STOPS (its last paying year). ABSENT ≡ lifetime (DND-009 — never an
   *  `Infinity` / `NaN` / numeric-magic sentinel; `JSON.stringify` silently nulls those). */
  readonly endAge?: number
  readonly colaMode: ColaMode
  /** The fixed NOMINAL growth rate, REQUIRED-and-finite when `colaMode === 'fixed-pct'` (absent/null is
   *  corruption — never coerced to 0, the optimistic-erosion direction; U8's codec enforces). */
  readonly colaPct?: number
  /** The fraction of the stream the SURVIVOR keeps once the owner dies (∈ [0,1]; KTD-7 RECEIPTS figure,
   *  distinct from the household `survivorSpendingRatio` NEEDS figure — they compose at seam 1). No-safe-
   *  default for any continuing stream (R40.7); alimony is 0 by law (§71(b)(1)(D)). */
  readonly survivorPct: number
} & IncomeTaxTreatment

/** The schemaVersion-3 plaintext scenario: the account-level intake truth.
 *  See the section comment above for the define-now/write-at-U8 contract and the
 *  deliberate fidelity-over-duplication shape change vs v2. */
export interface ScenarioV3 {
  /** Migration discriminant — read before any other field on decrypt (U4). */
  readonly schemaVersion: 3
  /** Exactly two (the married-couple precondition — the cold-start frame's one
   *  orientation line). */
  readonly people: readonly PersonInputsV3[]
  readonly enteredAccounts: readonly EnteredAccount[]
  /** Ticker → manual classification, for tickers the C1 table doesn't carry. */
  readonly tickerClassifications: Readonly<Record<string, TickerClassification>>
  readonly health: HealthIntakeV3
  /** The household retirement-spend figure (the preamble question — the v1
   *  degenerate budget; the P3 budget builder reconciles to it). */
  readonly annualSpendingReal: number
  readonly spendEntryPeriod: SpendEntryPeriod
  readonly survivorSpendingRatio: number
  readonly drawdownPolicy: DrawdownPolicy
  readonly filing: FilingStatus
  readonly startCalendarYear: number
  readonly taxVintage: string
  readonly appDefaultVersion: string
  /** The injected 32-bit seed, minted EXACTLY once at the first engine run and
   *  persisted unchanged (phase-2 contract #1b — the reloaded headline is
   *  byte-identical to the screenshot). */
  readonly seed: number
  /** R40 — the persisted per-person other-income streams (pension/rental/alimony/annuity/other).
   *  ALWAYS present, `[]` when none (never `undefined`): the empty list IS the absence, so reduce-to-
   *  spine reads structurally and `compileIncomeStreams` maps `[]`/all-empty → no `OverlayParams.income`. */
  readonly incomeStreams: readonly IncomeStream[]
  /** P3·U9 — the itemized budget line items. ADDITIVE-OPTIONAL within schemaVersion 3
   *  (the hsa/`contributions` tolerant-reader precedent — a pre-U9 v3 vault simply lacks
   *  the field and decodes unchanged; no version bump, no migration). ABSENT ⇒ the
   *  un-itemized degenerate (the `annualSpendingReal` scalar IS the budget). PRESENT ⇒
   *  the line items are the persisted truth; the engine's {@link CompiledBudget} construct
   *  and the two per-year track vectors are DERIVED at the params builder, never stored
   *  (fidelity-over-duplication), and `annualSpendingReal` must equal the year-0
   *  full-track total (the reconciliation invariant — incl. the compile-injected
   *  out-of-pocket medical floor). */
  readonly budget?: readonly BudgetLineItem[]
  /** P3·U10 — the Roth-conversion lever's persisted inputs. ADDITIVE-OPTIONAL within
   *  schemaVersion 3 (the budget/hsa tolerant-reader precedent — a pre-U10 vault simply
   *  lacks the field and decodes unchanged; no version bump). ABSENT ⇒ no conversions ⇒
   *  reduce-to-spine; the per-year engine vector is DERIVED at the params builder via
   *  {@link expandRothConversion}, never stored. */
  readonly rothConversion?: RothConversionPlan
  /** P3·U10 — the custom bucket order. REQUIRED iff `drawdownPolicy === 'custom'` (the
   *  codec enforces the biconditional — an order riding a named policy or a custom policy
   *  with no order is unrepresentable-persisted, the retirementAge-biconditional precedent).
   *  NOTE the compat edge this vocab extension accepts deliberately: a pre-U10 reader
   *  decoding a 'custom' vault fails LOUD (needVocab → corrupt → the damaged door), never
   *  computes a silently-wrong named-policy answer — loud-over-silent, the cardinal rule. */
  readonly drawdownOrder?: readonly DrawdownOrderKey[]
  /** P3·U11 — the enhanced-ACA-subsidy WHAT-IF regime toggle. ADDITIVE-OPTIONAL within
   *  schemaVersion 3 (the budget/rothConversion precedent). PRESENCE-KEYED with the literal
   *  `true`: ABSENT ⇒ the statutory 2026 reverted/cliff-on regime (current law — the engine's
   *  byte-identical default); `false` is UNREPRESENTABLE (the sheet's Apply STRIPS the key on
   *  revert, never writes false — DND 009's strip-the-key discipline; a persisted `false`
   *  reads as writer-bug corruption at the codec). The engine flag it feeds
   *  ({@link OverlayParams.enhancedSubsidies}) selects the ARPA/IRA applicable-% table
   *  (no 400%-FPL cliff) over the reverted one. */
  readonly enhancedSubsidies?: true
  /** The ask-for-Medicare-extras payment fork (council wf_efc6ece2-675, F1/F2). ADDITIVE-
   *  OPTIONAL within schemaVersion 3 (the budget/rothConversion precedent — a pre-unit vault
   *  lacks the field and decodes unchanged). WHEN PRESENT: exactly `people.length` entries,
   *  aligned by index (owner = 0, spouse = 1) — a TOP-LEVEL key, never nested under `health`,
   *  so the R7 assumption-registry compile gate fires (a nested `health.*` sub-field dodges
   *  `Record<keyof ScenarioDraft, …>` — the assumptionRegistry landmine). Resolution at the
   *  params builder: 'entered' → the person's own monthly dollar; 'none' → an AFFIRMED $0
   *  (honest — the Medicare-Advantage arm); 'typical' / 'unanswered' / the ABSENT field →
   *  the conservative-HIGH typical FUNDED (never a silent $0 — deleting a real recurring
   *  bill is the cardinal optimistic sin; absence of the OOP mirror is pessimistic-safe,
   *  absence HERE is not). 'unanswered' is the honest persisted hole for an asked-but-
   *  skipped member — never a fabricated 'typical' adoption. */
  readonly medicareExtrasByPerson?: readonly MedicareExtrasEntryV3[]
  /** The household's retirement state of residence (the state-tax unit; council
   *  wf_cc065e3b-bc1 / wf_d04148cb-1e5). ADDITIVE-OPTIONAL within schemaVersion 3 (the
   *  budget/rothConversion/enhancedSubsidies tolerant-reader precedent — a pre-unit vault
   *  lacks the field and decodes unchanged; no version bump, no migration). A TOP-LEVEL key
   *  (never nested), so the R7 assumption-registry compile gate fires (the medicareExtrasByPerson
   *  reasoning). TWO ABSENCE SEMANTICS, deliberately distinct:
   *   - the field ABSENT/undefined = the household was never asked (a pre-unit vault or an
   *     unanswered step) ⇒ the disclosed-out posture VERBATIM: NO state income tax is priced;
   *   - an EXPLICIT `'elsewhere'` = the household answered "somewhere else / outside the built
   *     set" — a FACT worth persisting, distinct from never-asked (the intake picker's 4th arm).
   *  Both are UNPRICED at the engine (only `PRICED_STATES` {NC,PA,FL} members price; every other
   *  roster code and `'elsewhere'` take the structural `+ 0` no-op, byte-identical to the spine).
   *  The distinction is NOT a strip-on-revert field like `enhancedSubsidies`: `'elsewhere'` is a
   *  real answer that persists as itself, never collapsed to absence (a chosen "somewhere else"
   *  ≠ an unanswered household — the advocate's trust law, S3). The engine flag it feeds
   *  ({@link OverlayParams.retirementState}) rides `params.overlay` presence-keyed (intakeMap),
   *  so the route's BUILT params carry it — the S5 producer's-output state-priced predicate reads
   *  it THERE, never re-deriving geography. `needVocab`-gated at the codec against `STATE_ROSTER`. */
  readonly retirementState?: RetirementState
  /** P3·U11 — the healthcare vintage stamp (contract #6's four clocks, one atomic object —
   *  a partial stamp set is meaningless). WRITTEN FRESH at every Save from the CURRENT
   *  build's canonical constants (`scenarioFromDraft` overwrites whatever the draft carried
   *  — the answer being saved was computed under this build, so write-time truth IS the
   *  honest stamp); READ by U13's staleness check against the live constants at unlock,
   *  BEFORE the recompute refreshes anything. ADDITIVE-OPTIONAL: a pre-U11 vault lacks it —
   *  absent-stamp = not-applicable (contract #6). The dated legislative NOTE the U11 surface
   *  renders reads the LIVE constants at read time, never this stamp (reVerifyEveryBuild —
   *  a persisted as-of must never masquerade as current truth). */
  readonly healthcareVintage?: HealthcareVintageV3
  /** P3·U13 — the save wall-time anchor: finite integer **epoch-day** (UTC days since
   *  1970-01-01; DND 009 — never a millisecond value that reads as a plausible year, never
   *  Infinity/NaN). ENCRYPTED with the model (a cleartext timestamp beside the vault would
   *  leak activity recency; staleness renders only post-unlock anyway) and codec-RANGE-gated
   *  (an in-range garbage value is worse than a reject — insight 046). STAMPED FRESH by
   *  `scenarioFromDraft` at every save-commit; EXCLUDED from the dirty/clean compare and the
   *  draft↔v3 round-trip guard via {@link scenarioIdentity} (the ONE shared normalizer — a
   *  fresh stamp per encode would read as a permanently-dirty session). ADDITIVE-OPTIONAL:
   *  a pre-U13 vault lacks it, and an absent anchor SUPPRESSES every "~N years since your
   *  save" claim — never fabricated from `startCalendarYear` (that means "since you BUILT
   *  the plan", which mislabels a re-saver), never defaulted to "today". */
  readonly savedAt?: number
  /** P3·U13 — the structured tax vintage (the enrichment the opaque `taxVintage` string
   *  could never carry: that literal is hardcoded, never re-stamped, and moves on NO real
   *  bracket refresh). Minted by `taxVintageStamp()` (tax.ts) from the canonical constants,
   *  WRITTEN FRESH at every save (write-time truth — the healthcareVintage precedent), read
   *  by U13's staleness comparator at unlock. The legacy string stays untouched (add-only).
   *  RMD-age rule + senior-bonus sunset are deliberately NOT stamped — they are birth-year/
   *  calendar-DERIVED communication notes against the LIVE constants (already deterministic
   *  inside the engine), never stamp-compares. */
  readonly taxVintageDetail?: TaxVintageV3
  /** P3·U13 — the date-surface vintage (the two fixture clocks the fuck-off-date answer
   *  decays on): the contribution-limit table year (the catch-up step-down shapes the
   *  projected stream) and the ticker-blend/TDF static-snapshot as-of (a stale snapshot
   *  silently misstates the household stock weight). Minted by `dateVintageStamp()`
   *  (constants/index.ts), WRITTEN FRESH at every save, read by U13 at unlock. */
  readonly dateVintage?: DateVintageV3
  /** The state-tax vintage stamp (the state-tax unit; the healthcareVintage/taxVintageDetail
   *  precedent). The federal `taxVintageDetail` keys only on (taxYear, legalBasis) and would
   *  NEVER fire on a state-only rate change (NC's expected step-down, a Q1-silent change) — the
   *  state constants live in their OWN `stateTaxConstants` table, so they need their OWN clock
   *  (074's law: a stamp nothing reads prices nothing). Minted by `stateTaxVintageStamp()`
   *  (engine/constants/stateTax) from the roster's canonical constants, WRITTEN FRESH at every
   *  save (write-time truth — the healthcareVintage precedent), READ by `src/store/staleness.ts`
   *  at unlock. ADDITIVE-OPTIONAL: a pre-unit vault lacks it (absent = not-comparable, quiet —
   *  never coerced to "unchanged"). Follows the vintage-in-identity rule ({@link scenarioIdentity}
   *  strips ONLY the wall-time `savedAt`): build-deterministic, so two same-build saves stamp
   *  identically and an untouched next-day session still reads clean. */
  readonly stateTaxVintage?: StateTaxVintageV3
}

/** The three user-forkable arms of the Medicare-extras payment fork plus the honest
 *  persisted hole. Discriminated on `kind` with codec-enforced biconditionals:
 *  `monthly` iff 'entered'; `adoptionVintage` iff 'typical'. */
export const MEDICARE_EXTRAS_KINDS = ['none', 'entered', 'typical', 'unanswered'] as const
export type MedicareExtrasKind = (typeof MEDICARE_EXTRAS_KINDS)[number]

/** One person's Medicare-extras fork answer (the ask-for-Medicare-extras unit). */
export interface MedicareExtrasEntryV3 {
  /** 'none' = "I pay ~nothing beyond Part B" (the Medicare-Advantage arm — an AFFIRMED $0,
   *  honest); 'entered' = "I pay $X/mo" (own dollar in `monthly`); 'typical' = "not sure —
   *  use a typical figure" (an EXPLICIT adoption, era-stamped in `adoptionVintage`);
   *  'unanswered' = asked, not answered (funds the typical, carries NO adoption stamp —
   *  the system never fabricates an adoption the user didn't make). */
  readonly kind: MedicareExtrasKind
  /** The person's own combined monthly Part D / Medigap / MA premium (real $).
   *  PRESENT iff `kind === 'entered'` (codec biconditional). */
  readonly monthly?: number
  /** The typical-figure era adopted (`medicareExtrasTypical.value.vintage` at adoption
   *  time — F2's saved-era key; NEVER re-derived from `value == current-typical`, the
   *  appDefaults inversion trap). PRESENT iff `kind === 'typical'` (codec biconditional). */
  readonly adoptionVintage?: string
}

/** The persisted structured tax vintage (P3·U13 → the controls-surface clock). Keyed on the
 *  two things a real statutory/table change moves: the table year and the legal-basis
 *  sentence (verbatim from the canonical entry — any wording change is a vintage bump, the
 *  `acaStatus` precedent). */
export interface TaxVintageV3 {
  /** The tax year the bracket/deduction tables are keyed to (`TAX_YEAR`). */
  readonly taxYear: number
  /** The legal-basis display sentence, verbatim (`legalBasis.value`). */
  readonly legalBasis: string
}

/** The persisted date-surface vintage (P3·U13 → the fuck-off-date clock). */
export interface DateVintageV3 {
  /** The contribution-limit table year (`CONTRIBUTION_YEAR`). */
  readonly contributionYear: number
  /** The ticker-blend/TDF static-snapshot as-of date (ISO), aggregated across the
   *  classification table (`BLEND_SNAPSHOT_AS_OF`). */
  readonly blendSnapshotAsOf: string
}

/** The persisted state-tax vintage (the state-tax unit → the `controls.stateTaxMoved` clock in
 *  `src/store/staleness.ts`). Each field is one v1-PRICED state's COMPLETE decumulation profile,
 *  JSON-serialized from `STATE_TAX_PROFILES[state]` (itself assembled from the sourced `.value`s
 *  — source-bound, insight 022; a drifted producer is a clock that never fires). Why the whole
 *  profile rather than a current-year rate scalar: the roster's flat rates are HELD FORWARD (the
 *  NC hawk-veto), so a FUTURE pinned step (e.g. NC 3.49%/2030) changes an out-year the household
 *  still prices while leaving the current-year rate untouched — a scalar would MISS it, the
 *  serialized schedule catches it. Why PER-STATE (not one whole-roster digest): the staleness
 *  reader compares ONLY the household's OWN state's field, so an NC rate change never alarms a
 *  PA or FL vault (the alarm-when-fine the staleness header refuses is a lie even in the safe
 *  direction). FL's profile is a constitutional $0 and is byte-identical forever by construction
 *  — an FL vault never stales. All plain strings (DND-009-clean). A stateless/'elsewhere'/unbuilt
 *  household is route-gated OUT of the clock entirely (it prices no state tax — nothing to stale). */
export interface StateTaxVintageV3 {
  /** North Carolina's full decumulation profile (`STATE_TAX_PROFILES.NC`), serialized — the
   *  flat-rate schedule (incl. any future pinned step), standard deduction, and every treatment
   *  flag. Compared ONLY for an `retirementState === 'NC'` household. */
  readonly ncProfile: string
  /** Pennsylvania's full decumulation profile (`STATE_TAX_PROFILES.PA`), serialized. Compared
   *  ONLY for a `retirementState === 'PA'` household. */
  readonly paProfile: string
  /** Florida's decumulation profile (`STATE_TAX_PROFILES.FL`, the constitutional $0), serialized.
   *  Compared ONLY for a `retirementState === 'FL'` household; constant by construction. */
  readonly flProfile: string
}

/** `savedAt` codec range gate (insight 046 — a bare finiteness check would admit an epoch-
 *  MILLISECOND value that silently reads as year ~55000). Epoch-days: 2020-01-01 ≈ 18263,
 *  2100-01-01 ≈ 47482 — generous on both sides of any real save this product can mint. */
export const SAVED_AT_EPOCH_DAY_MIN = 18_263
export const SAVED_AT_EPOCH_DAY_MAX = 47_482

/** The ONE dirty-compare / round-trip normalizer (P3·U13). `scenarioFromDraft` stamps a
 *  fresh `savedAt` on every encode, and its output is BOTH the disk payload AND the
 *  `JSON.stringify` dirty-compare operand (resultSave.ts) — so identity is judged on the
 *  scenario MINUS the wall-time stamp, or an untouched session would read permanently dirty
 *  the day after its save. Order-preserving key strip (both operands are codec-decode
 *  outputs, so remaining-key order is stable); consumers compare `JSON.stringify` of THIS,
 *  never of the raw scenario. */
export function scenarioIdentity(scenario: ScenarioV3): Omit<ScenarioV3, 'savedAt'> {
  const { savedAt: _savedAt, ...identity } = scenario
  return identity
}

/** The persisted healthcare vintage (P3·U11 → read by U13). Each field is a compact,
 *  purpose-built value copied from its OWN canonical constant (per-figure provenance —
 *  insight 022; never one citation blanketing the family): a change in any one is a vintage
 *  bump U13 can name. All plain finite numbers/strings (DND 009). */
export interface HealthcareVintageV3 {
  /** The coverage year the ACA/IRMAA tables are keyed to (`COVERAGE_YEAR`). */
  readonly coverageYear: number
  /** The ACA legislative regime sentence, verbatim from the canonical entry
   *  (`acaEnhancedSubsidyStatus.value.regime2026`) — any wording change is a regime bump. */
  readonly acaStatus: string
  /** The date the legislative status was last verified (`…verifiedOn`, ISO date string). */
  readonly acaVerifiedOn: string
  /** The HHS poverty-guidelines year the FPL denominators come from (prior-year rule). */
  readonly fplGuidelineYear: number
  /** The IRMAA top-tier freeze horizon (`irmaa.topTierFrozenThrough` — re-indexes after;
   *  the frozen-vs-live split a maintainer must not "helpfully" index early, insight 022). */
  readonly irmaaTopTierFrozenThrough: number
  /** The standard Part B monthly premium (an annually-moving figure — a cheap, precise
   *  proxy for the whole CMS vintage). */
  readonly partBStandardMonthly: number
  /** The Medicare-extras typical's era string (`medicareExtrasTypical.value.vintage`).
   *  ADDITIVE-OPTIONAL (a pre-extras-unit stamp lacks it — absent = not-comparable, quiet;
   *  the staleness reader never coerces absence to "unchanged"). The extras-typical clock
   *  additionally gates on the vault actually having a typical-EXPOSED member (any fork
   *  entry not 'entered'/'none', or the field absent) — a household of entered dollars
   *  does not care that the typical moved. */
  readonly medicareExtrasTypicalVintage?: string
}

/** The exhaustive v3 field set — U8's `checkV3Fields` checklist (burned/063: the
 *  codec arm iterates THIS list, so a field added to the interface cannot
 *  silently skip validation — it fails the compile-time tie below first). */
export const SCENARIO_V3_FIELDS = [
  'schemaVersion',
  'people',
  'enteredAccounts',
  'tickerClassifications',
  'health',
  'annualSpendingReal',
  'spendEntryPeriod',
  'survivorSpendingRatio',
  'drawdownPolicy',
  'filing',
  'startCalendarYear',
  'taxVintage',
  'appDefaultVersion',
  'seed',
  'incomeStreams',
  'budget',
  'rothConversion',
  'drawdownOrder',
  'enhancedSubsidies',
  'medicareExtrasByPerson',
  'retirementState',
  'healthcareVintage',
  'savedAt',
  'taxVintageDetail',
  'dateVintage',
  'stateTaxVintage',
] as const

// Compile-time: the field array exactly covers ScenarioV3 (both directions).
type _V3FieldsCover = (typeof SCENARIO_V3_FIELDS)[number] extends keyof ScenarioV3 ? true : never
type _V3KeysCovered = keyof ScenarioV3 extends (typeof SCENARIO_V3_FIELDS)[number] ? true : never
const _v3FieldsExhaustive: _V3FieldsCover & _V3KeysCovered = true
void _v3FieldsExhaustive

/** The union of persistable plaintext scenario shapes (every version the decode
 *  ladder accepts today). ScenarioV3 JOINED at P2·U8 (its codec arm + first writer);
 *  v1/v2 remain only as legacy decode-ladder members for migrating any older save.
 *  The codec's unknown-version branch (now `> 3`) keeps a still-newer blob surfacing
 *  the calm "saved by a newer version" state, never a mis-parse. */
export type AnyScenario = Scenario | ScenarioV2 | ScenarioV3

// ---------------------------------------------------------------------------
// The at-rest vault record shapes (P1·U4) — the SINGLE-SOURCED definition the
// serializer (src/store/db.ts) writes and the no-key-leak security gate asserts
// against (burned/063: the gate imports THESE shapes/field sets, so adding a field
// to a record cannot silently bypass the "no raw key material" check; the
// compile-time checks below force the field arrays to track the interfaces).
//
// Exactly THREE ENCRYPTED record types exist (the model + the two wraps — the set
// {@link VAULT_KEYS} names and loadVault classifies). The wraps each carry their OWN
// fresh salt + IV; the model record carries no salt (DK is raw random bytes, not
// derived). Bytes are Uint8Array on purpose — IndexedDB structured-clones them natively.
//
// A FOURTH, plaintext SIBLING lives in the same object store — {@link BackupNoteRecord}
// under {@link BACKUP_NOTE_KEY} — but is DELIBERATELY NOT in VAULT_KEYS: it is a note
// ABOUT the vault (did an off-device backup get saved from this device?), never a vault
// record, so loadVault's three-key read can never let the note's presence/absence flip
// the damage verdict. It holds no key material, so it stays outside the no-leak gate's
// three-record iteration.
// ---------------------------------------------------------------------------

/** The model encrypted under DK. */
export interface ModelRecord {
  readonly iv: Uint8Array
  readonly ciphertext: Uint8Array
}

/** DK wrapped under a credential key (passphrase- or recovery-derived). `salt` is the
 *  KDF salt the credential key was derived with; `wrappedDataKey` is AES-GCM ciphertext
 *  of the raw DK bytes — NEVER the raw bytes (the at-rest blob is exactly
 *  PBKDF2-strength protected, no more). */
export interface WrapRecord {
  readonly salt: Uint8Array
  readonly iv: Uint8Array
  readonly wrappedDataKey: Uint8Array
}

/** The exhaustive field sets — the no-leak gate's iteration surface. */
export const MODEL_RECORD_FIELDS = ['iv', 'ciphertext'] as const
export const WRAP_RECORD_FIELDS = ['salt', 'iv', 'wrappedDataKey'] as const

// Compile-time: the field arrays exactly cover the interfaces (both directions).
type _ModelFieldsCover = (typeof MODEL_RECORD_FIELDS)[number] extends keyof ModelRecord ? true : never
type _ModelKeysCovered = keyof ModelRecord extends (typeof MODEL_RECORD_FIELDS)[number] ? true : never
type _WrapFieldsCover = (typeof WRAP_RECORD_FIELDS)[number] extends keyof WrapRecord ? true : never
type _WrapKeysCovered = keyof WrapRecord extends (typeof WRAP_RECORD_FIELDS)[number] ? true : never
const _recordFieldsExhaustive: _ModelFieldsCover & _ModelKeysCovered & _WrapFieldsCover & _WrapKeysCovered = true
void _recordFieldsExhaustive

/** The vault's fixed IndexedDB geometry: one DB, one object store, three ENCRYPTED keys. */
export const VAULT_DB_NAME = 'the-back-nine-vault'
export const VAULT_STORE_NAME = 'vault'
export const VAULT_KEYS = ['model', 'passphraseWrap', 'recoveryWrap'] as const
export type VaultKey = (typeof VAULT_KEYS)[number]

// ---------------------------------------------------------------------------
// The backup-made SENTINEL (U8-tail) — a plaintext sibling note ABOUT the vault, in the
// SAME object store but DELIBERATELY OUTSIDE {@link VAULT_KEYS} (loadVault reads only the
// three named record keys, so a lost/garbled/absent note can never flip the damage
// verdict). It records that an off-device backup file was saved from THIS device, so a
// decrypt-on-return can re-offer the backup exactly when none is on record. The safe
// direction is baked into the reader: absent OR malformed reads as "no backup" (→ re-offer),
// never a false "a backup exists".
// ---------------------------------------------------------------------------

/** The backup-made note. `exportedCount` is a monotone count of confirmed off-device
 *  exports from this device — a NUMBER on purpose (DND/009: never Infinity/NaN/null, which
 *  JSON.stringify / IndexedDB silently coerce; IndexedDB structured-clones a plain number
 *  cleanly). Absent ⇒ no backup ever made here; > 0 ⇒ at least one was. */
export interface BackupNoteRecord {
  readonly exportedCount: number
}

/** The exhaustive field set (mirrors MODEL/WRAP_RECORD_FIELDS — the compile-time gate below
 *  forces it to track the interface, so a field added to the note can't silently escape). */
export const BACKUP_NOTE_FIELDS = ['exportedCount'] as const

/** The note's object-store key — a sibling of, never a member of, {@link VAULT_KEYS}. */
export const BACKUP_NOTE_KEY = 'backupNote'

// Compile-time: the field array exactly covers the interface (both directions).
type _BackupNoteFieldsCover = (typeof BACKUP_NOTE_FIELDS)[number] extends keyof BackupNoteRecord ? true : never
type _BackupNoteKeysCovered = keyof BackupNoteRecord extends (typeof BACKUP_NOTE_FIELDS)[number] ? true : never
const _backupNoteFieldsExhaustive: _BackupNoteFieldsCover & _BackupNoteKeysCovered = true
void _backupNoteFieldsExhaustive

// ---------------------------------------------------------------------------
// The export/backup envelope (P1·U4). Export = encrypted blob; restore = file +
// recovery phrase → set new passphrase. The file carries the model box + the
// recoveryWrap ONLY — deliberately NOT the passphraseWrap: the spec'd restore path
// re-mints a fresh passphrase wrap, and carrying the old one would make an exported
// file sitting in cloud storage openable by the (possibly weak, possibly shared)
// OLD passphrase — widening the negative-pairing guarantee ("file without the
// phrase recovers nothing") into a hole. Bytes are base64 strings (a JSON file).
// `format` + `formatVersion` are checked BEFORE any decrypt (a foreign/corrupt file
// surfaces as "this backup file looks damaged", never a GCM stack trace).
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'the-back-nine-backup'
export const BACKUP_FORMAT_VERSION = 1

/** A GCM box with base64-encoded bytes (the JSON-file form of a vault box). */
export interface BackupBoxV1 {
  readonly iv: string
  readonly ciphertext: string
}

export interface BackupFileV1 {
  readonly format: typeof BACKUP_FORMAT
  readonly formatVersion: typeof BACKUP_FORMAT_VERSION
  readonly model: BackupBoxV1
  readonly recoveryWrap: {
    readonly salt: string
    readonly iv: string
    readonly wrappedDataKey: string
  }
}

// Compile-time: the backup file's wrap carries EXACTLY the WrapRecord field set (as
// base64 strings) and its model box exactly the ModelRecord set — a future field
// added to a record cannot silently fail to ride exports (it fails to typecheck
// here until BackupFileV1 + a format-version decision account for it).
type _BackupWrapCovers = (typeof WRAP_RECORD_FIELDS)[number] extends keyof BackupFileV1['recoveryWrap']
  ? true
  : never
type _BackupWrapCovered = keyof BackupFileV1['recoveryWrap'] extends (typeof WRAP_RECORD_FIELDS)[number]
  ? true
  : never
type _BackupModelCovers = (typeof MODEL_RECORD_FIELDS)[number] extends keyof BackupBoxV1 ? true : never
type _BackupModelCovered = keyof BackupBoxV1 extends (typeof MODEL_RECORD_FIELDS)[number] ? true : never
const _backupShapesTracked: _BackupWrapCovers & _BackupWrapCovered & _BackupModelCovers & _BackupModelCovered = true
void _backupShapesTracked
