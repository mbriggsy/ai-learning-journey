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
// Tax-and-accounts overlay input (U2). Federal filing status is shared vocabulary
// (the engine's tax overlay + the persisted scenario both speak it). The overlay is
// OPTIONAL on the engine input: absent ⇒ the tax-blind spine (every existing first-
// answer path); present ⇒ `simulate` runs the tax-aware decumulation.
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
  /** Per-year requested Roth conversions, indexed by ABSOLUTE year (clamped to the legal pre-tax
   *  pool net of the non-convertible RMD inside the engine). */
  readonly conversions?: readonly number[]
  /** Per-year `bracket-fill` ceiling (the max discretionary pre-tax draw — the cheap ordinary-income
   *  room to the caller's target edge), indexed by ABSOLUTE year. Read ONLY when `drawdownPolicy` is
   *  `bracket-fill`; a missing entry ⇒ the pre-tax-first fallback. The caller (P3 control / P4 solver,
   *  a tax-bracket edge today and an ACA-MAGI cliff once U3 lands) computes the dollar cap. */
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
  /** The tax-and-accounts overlay (U2). ABSENT ⇒ the tax-blind spine (the only mode the P2
   *  first-answer runs); PRESENT ⇒ `simulate` runs the tax-aware decumulation, feeding the
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
}

/** The dollar-grammar adjustment ("trim ~$Y/month" / "you have ~$Y/month of room"). */
export interface DollarAdjustment {
  /** Signed real dollars per month: negative = trim, positive = room, 0 = on the line. */
  readonly perMonthReal: WithMargin<number>
  readonly direction: 'trim' | 'room' | 'on-the-line'
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
  /** Σ federal income tax actually paid across the path's funded years (real $; ordinary +
   *  preferential cap-gains, the engine's full tax model). Accrued AFTER the depletion
   *  check — a year the portfolio could not fund counts nothing (the sibling rule). */
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
}

/** The raw, continuous distribution the headline rounds FROM — emitted alongside the
 *  rounded outputs so callers can re-round under their own (stateful) rules. */
export interface Distribution {
  /** Terminal real portfolio values, one per path (the full sample, not just pass/fail). */
  readonly terminalValuesReal: readonly number[]
  /** Per-path depth of failure: the absolute year index of depletion, or
   *  {@link NEVER_DEPLETED}. Length === paths. */
  readonly depletionYears: readonly DepletionYear[]
  /** Fraction of paths that survived every year — the survival floor statistic the X-of-10 reads.
   *  Continuous in [0, 1], pre-quantization. Computed as `survivors / paths`, where a path FAILS by
   *  depleting against the FULL `annualSpendingReal`. The product frames this as the *essentials*
   *  floor, but in P1/P2 essentials ≡ full spend (the single-total-spend degenerate budget — see
   *  phase-3's "degenerate budget"); the essentials-vs-full split arrives in P3·U9. Until then this
   *  is full-spend survival — never read an "essentials-only" meaning off it. */
  readonly survivalFraction: number
  /** Per-path tax-aware solver surfaces (U3·M6). PRESENT iff the run carried the tax
   *  overlay — see {@link TaxAwareDistribution} for the presence contract. */
  readonly taxAware?: TaxAwareDistribution
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

// ---------------------------------------------------------------------------
// schemaVersion-2 scenario shape (U2 · M6a). The v1 spine inputs + the tax-overlay
// fields: PER-PERSON account buckets + birth year, the household filing status, and
// provenance stamps. DEFINED HERE for the contract; first WRITTEN to disk by Phase 3
// (the P2 first-answer runs with the overlay OFF, so a v1 scenario is still valid),
// and the schemaVersion 1→2 migration ladder is owned by U4. NOT YET CONSUMED: the
// engine reads the AGGREGATED `OverlayParams` (P2 intake maps these per-person fields
// down to it); per-person pre-tax RMD splitting is M6b.
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
  readonly people: readonly PersonInputs[]
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

/** Per-person intake identity over the v1 spine person. `currentAge` (inherited)
 *  is derived once at entry from DOB → `birthYear` against `startCalendarYear`
 *  (whole-year convention — the same ±1yr birth-month approximation
 *  `PersonAccounts.birthYear` documents); the intake sanity layer owns the
 *  `currentAge === startCalendarYear − birthYear` invariant. `birthYear` also
 *  feeds the per-person mortality-cohort keying (P1-exit forward item — the SSA
 *  snapshot holds every cohort, no re-fetch). */
export interface PersonInputsV3 extends PersonInputs {
  /** Display name for the paired two-person screens (PII — encrypted at rest, R39). */
  readonly name: string
  readonly birthYear: number
  readonly workStatus: WorkStatus
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
  /** Primary holding's ticker. Absent or unrecognized ⇒ the manual classifier is
   *  REQUIRED (burned/062 — an unknown ticker is never a silent default blend). */
  readonly ticker?: string
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
   *  inflow regardless of the account's own kind (R31). */
  readonly employerMatchAnnual?: number
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
  /** Per-person working-year MAGI for the conservatively-high IRMAA override —
   *  aligned by index to `people`. NEVER a salary echo (C3 boundary item (a)): a
   *  non-salary worker enters their honest figure (K-1/investment income, or an
   *  explicit 0 for a live-on-cash household). */
  readonly workingYearIrmaaMagiByPerson?: readonly number[]
}

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
  'survivorSpendingRatio',
  'drawdownPolicy',
  'filing',
  'startCalendarYear',
  'taxVintage',
  'appDefaultVersion',
  'seed',
] as const

// Compile-time: the field array exactly covers ScenarioV3 (both directions).
type _V3FieldsCover = (typeof SCENARIO_V3_FIELDS)[number] extends keyof ScenarioV3 ? true : never
type _V3KeysCovered = keyof ScenarioV3 extends (typeof SCENARIO_V3_FIELDS)[number] ? true : never
const _v3FieldsExhaustive: _V3FieldsCover & _V3KeysCovered = true
void _v3FieldsExhaustive

/** The union of persistable plaintext scenario shapes (every version the decode
 *  ladder accepts today). ScenarioV3 is DEFINED above but deliberately NOT a
 *  member yet — it joins this union at P2·U8 with its codec arm + migration (its
 *  first writer). The codec's unknown-version branch is what makes the deferral
 *  safe (a v3 blob read by this build surfaces the calm "saved by a newer
 *  version" state, never a mis-parse and never healthcare silently OFF). */
export type AnyScenario = Scenario | ScenarioV2

// ---------------------------------------------------------------------------
// The at-rest vault record shapes (P1·U4) — the SINGLE-SOURCED definition the
// serializer (src/store/db.ts) writes and the no-key-leak security gate asserts
// against (burned/063: the gate imports THESE shapes/field sets, so adding a field
// to a record cannot silently bypass the "no raw key material" check; the
// compile-time checks below force the field arrays to track the interfaces).
//
// Exactly THREE record types exist. The wraps each carry their OWN fresh salt + IV;
// the model record carries no salt (DK is raw random bytes, not derived). Bytes are
// Uint8Array on purpose — IndexedDB structured-clones them natively.
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

/** The vault's fixed IndexedDB geometry: one DB, one object store, three keys. */
export const VAULT_DB_NAME = 'the-back-nine-vault'
export const VAULT_STORE_NAME = 'vault'
export const VAULT_KEYS = ['model', 'passphraseWrap', 'recoveryWrap'] as const
export type VaultKey = (typeof VAULT_KEYS)[number]

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
