/**
 * memoryModel — the in-memory session/engine-client orchestrator for the magic
 * moment (phase-2 cross-cutting contract #1; created BY D1 as the U5 reshape).
 *
 * NOT passive data. Six obligations (the contract's (a)–(f)):
 *  (a) rides the single long-lived engine handle (`engineClient` — an eager
 *      module-level singleton outside any render path; StrictMode-proof);
 *  (b) mints the per-scenario 32-bit seed EXACTLY once via crypto.getRandomValues
 *      at the first engine dispatch, stores it as a first-class model field
 *      (`draft.seed`), reuses it for every recompute, and it persists UNCHANGED
 *      at Save (the reloaded headline is byte-identical to the screenshot; the
 *      P3 controls + P4 solver reuse it as the shared-draw CRN seed — `seedA`);
 *  (c) exposes the worker-vs-main-thread capability flag (set at client
 *      construction, never inside src/engine);
 *  (d) is the recompute home — and the NAMED FUTURE owner of the rounding-
 *      hysteresis seam. Phase 2 builds NO sticky rounding: during intake the
 *      headline moves freely so sharpening is visible. The `lastDisplayed*`
 *      fields + margin gating are seated in PHASE 3 (session-only, never
 *      persisted) — declared here as a documented placeholder, unused in P2;
 *  (e) holds the ONE plaintext shape — `ScenarioDraft`, the same field names as
 *      the to-be-persisted `ScenarioV3` (mapped FROM it, so a rename breaks both
 *      together). No parallel intake shape, no field-mapping layer: Save is a
 *      clean serialize of the completed draft (U8's field-fidelity guard rests
 *      on this);
 *  (f) stamps each dispatched run with a monotonic request epoch and DISCARDS
 *      any resolved result older than the latest committed epoch, so racing
 *      in-flight runs never render a stale intermediate.
 *
 * THE DATE-ROUTE EPOCH ORDER (C3 forward item (b), engineProtocol.ts:64-81):
 * result-discard alone cannot stop a sweep already running worker-side — the
 * dispatcher calls `engine.setLatestEpoch(epoch)` BEFORE
 * `engine.runDateSearch(..., epoch)` (same MessagePort ⇒ FIFO ⇒ the commit
 * lands first and cancels any older in-flight sweep between candidates), then
 * correlates by PROMISE IDENTITY on resolve (the outcome deliberately carries
 * no epoch). The headline route's OWN discard is the same main-thread commit-
 * if-newer rule — but it too bumps the worker epoch up front (AT2), so a date→
 * spine switch cancels any in-flight sweep instead of letting it run to the end.
 *
 * REQUIRED-FACT ABSENCE IS NEVER DEFAULTED — AND ONE AUTHORITY DECIDES IT
 * (burned/062; amended U12 2026-07-08, council wf_dff75c2f-9e3, resolving this
 * header's old promise that builders emit engine sentinels — they never did,
 * and a pure "engine decides" contract is IMPOSSIBLE for intake-domain facts:
 * an absent ACA quote pair builds params that VALIDATE fine, healthcare
 * silently unpriced — the optimistic direction — which is exactly why the
 * intake requires them). The resolved doctrine: a required user-fact not
 * validly present stays `undefined` (or invalid) in the draft, and
 * `missingRequiredFacts` is the ONE authority that says so — the builders
 * return null exactly when it is non-empty (U12 widened it to
 * NOT-VALIDLY-PRESENT: a zeroed spend is missing, not a household). The
 * engine's R19 gate stays the decider for everything DISPATCHED (out-of-range
 * params map to INDETERMINATE — the second layer). Post-first-resolve,
 * builder-null commits `inputs-incomplete` — the store RECORDS the intake
 * authority's verdict, it never fabricates an engine result and never holds a
 * stale confident headline over a draft that no longer supports one. There is
 * no `?? 0`, no "skip with a reasonable default".
 *
 * Crypto note: this is the store layer — `crypto.getRandomValues` is allowed
 * here (U0's lint bans it only inside src/engine; the seed is INJECTED into the
 * engine per its purity contract).
 */
import type {
  DateSearchTier,
  DateSearchOutcome,
  DollarAdjustment,
  EnteredAccount,
  Headline,
  HealthIntakeV3,
  IncomeStream,
  OutcomeState,
  PersonInputsV3,
  ScenarioV3,
  SimulationParams,
  SimulationResult,
  TickerClassification,
} from '@shared/model'
import type { DateSearchInput } from '@engine/dateSearch'
import { appDefaultEraFor, CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { fromWire, dateSearchFromWire, solveFromWire } from '@engine/engineWire'
// TYPE-ONLY (erased — the solver stays out of the store bundle; the token is minted worker-side and
// never crosses the wire). The solve DISPATCH is store orchestration; the request is built by the
// injected builder (U16's real builder; tests drive a fake), the payload reconstructed by solveFromWire.
import type { SolvePayload, SolveRequest } from '@engine/solver/solveEntry'
// The PURE commit-epoch guard for the solve lane (§S6, cancel.ts) — a runtime import of one leaf
// predicate (it drags no MC compute; cancel.ts imports only the version constant). The UNCONDITIONAL
// discard rule lives in ONE tested home, wired here (insight 048 — the decision is never inlined).
import { shouldCommitSolve } from '@engine/solver/cancel'
// U16 §S1 — the solve-run FINGERPRINT (invalidation SOURCE-BINDS to this pure identity, never a
// bespoke epoch mirror — the forked-seam trap). A runtime import of one pure leaf function: it
// reaches only `solverCandidateId` + a self-contained canonical serializer (candidates.ts's heavy
// magiLandscape/taxCore imports are unreachable from that path — tree-shaken; verify:bundle guards
// the budget). The store computes BOTH the dispatched run's identity AND the fresh-vs-committed diff
// with this one function, so the comparison is apples-to-apples.
import { solverRunFingerprint, type SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
// The display-geometry constants the sticky gates read — the engine's OWN exported values
// (never re-typed; the same objects confidence.ts computes the emitted margins against).
import { DOLLAR_STEP, STATE_OPTIMISM_RANK, SURVIVAL_GRID } from '@engine/confidence'
import type { EngineClient } from './engineClient'

// ---------------------------------------------------------------------------
// The draft shape — ScenarioV3 mid-population. Same fields, same names; the
// required USER-FACTS are optional while uncollected (sentinels at the builder
// seam, never defaults), the methodology fields are pre-applied and surfaced.
// Mapped FROM ScenarioV3 so the compile breaks if the shapes drift apart.
// ---------------------------------------------------------------------------

/** Person mid-entry: every asked fact optional until answered. */
export type PersonDraft = Partial<PersonInputsV3>

/** Health entry mid-population: same fields as `HealthIntakeV3`, but the
 *  per-person/per-year arrays tolerate HOLES (an unanswered member) while the
 *  flow is in progress. The persisted V3 arrays are complete by construction —
 *  Save gates on completeness (U8), and JSON would silently null an undefined
 *  element (DND/009), so holes never reach disk. */
export interface HealthDraft
  extends Omit<HealthIntakeV3, 'workingYearInvestmentByPerson' | 'irmaaMagiSeed'> {
  readonly workingYearInvestmentByPerson?: readonly (number | undefined)[]
  readonly irmaaMagiSeed?: readonly (number | undefined)[]
}

/** The single in-memory plaintext shape (contract (e)). */
export interface ScenarioDraft
  extends Partial<
    // `budget` is optional in the DRAFT exactly as it is in v3: absent = the
    // un-itemized degenerate (P3·U9). The store is ESLint-banned from importing
    // @budget, so the reconciliation invariant (`annualSpendingReal` == the budget's
    // year-0 full total incl. injected OOP medical) is maintained at the intake/ui
    // CALL SITE — every writer applies the items AND the reconciled scalar in ONE
    // `model.update` (the builder's `commitBudgetPatch`; the oop-medical step's
    // re-reconcile), so no consumer observes the two disagreeing.
    // `rothConversion`/`drawdownOrder` (P3·U10) ride the same additive-optional
    // contract: absent = no lever / a named policy; the custom-order⟺'custom'
    // biconditional is maintained at the control's single `model.update` write site
    // (the codec re-proves it at Save — scenarioFromDraft round-trips the pair).
    // `enhancedSubsidies` (P3·U11) is presence-keyed `true` — the sheet's Apply
    // strips the key on revert (absence IS the statutory reverted regime); the
    // healthcare sheet writes ONLY this key (the single-key write fence, insight 058).
    // `healthcareVintage` (P3·U11) rides the draft for the shape tie only — the SAVE
    // path stamps it fresh from the current build's constants (scenarioFromDraft),
    // so whatever the draft carries is never the written truth.
    // `savedAt`/`taxVintageDetail`/`dateVintage` (P3·U13) ride the same
    // stamped-fresh-at-save contract (scenarioFromDraft overwrites all four stamps +
    // appDefaultVersion); the draft's copies exist for the shape tie and for U13's
    // staleness reader, which reads the RAW-decoded persisted model at unlock — never
    // the draft (a re-save would have re-stamped it: reading the draft cries wolf).
    // `medicareExtrasByPerson` (the ask-for-Medicare-extras unit) is a TOP-LEVEL key
    // deliberately — nested under `health` it would dodge the R7 assumption-registry
    // compile gate (Record<keyof ScenarioDraft>). The V3 entry type itself tolerates a
    // mid-entry 'entered'-without-dollar at the TYPE level (the biconditional is
    // codec-enforced at Save); the ONE write-shape helper (`writeMedicareExtras`,
    // questions.tsx) always emits complete two-entry arrays ('unanswered' fills), so
    // per-person holes never exist and no hole-tolerant draft twin is needed.
    // `retirementState` (the state-tax unit) rides the draft so intake/panel can read+write it
    // (the R7 seat + the picker). A TOP-LEVEL key (never nested under `health`) so the
    // assumption-registry compile gate fires. It is a USER FACT, not a stamped-fresh field:
    // scenarioFromDraft carries it via `...draft` (unlike the vintage stamps below). ABSENT =
    // never-asked (disclosed-out); an explicit 'elsewhere' persists as a fact. `stateTaxVintage`
    // (the state-tax clock) rides the same stamped-fresh-at-save contract as the other vintages
    // (scenarioFromDraft overwrites it from the current build's constants; the draft's copy exists
    // for the shape tie and for U13's staleness reader, which reads the RAW-decoded model).
    Pick<
      ScenarioV3,
      | 'annualSpendingReal'
      | 'seed'
      | 'budget'
      | 'rothConversion'
      | 'drawdownOrder'
      | 'enhancedSubsidies'
      | 'medicareExtrasByPerson'
      | 'retirementState'
      | 'healthcareVintage'
      | 'savedAt'
      | 'taxVintageDetail'
      | 'dateVintage'
      | 'stateTaxVintage'
      // Act-4 · U15 — the chosen Tier-2 goal (additive-optional; ABSENT = the unset sentinel).
      // A USER FACT carried via `...draft` at Save (the retirementState precedent), NOT a
      // stamped-fresh vintage. intake/GoalPicker (U16) reads+writes it; the solve precondition
      // refuses to dispatch while it is unset (no Tier-1-only tie-break crowned as advice).
      | 'chosenGoal'
    >
  >,
    Pick<
      ScenarioV3,
      | 'spendEntryPeriod'
      | 'survivorSpendingRatio'
      | 'drawdownPolicy'
      | 'filing'
      | 'startCalendarYear'
      | 'taxVintage'
      | 'appDefaultVersion'
    > {
  readonly people: readonly [PersonDraft, PersonDraft]
  readonly enteredAccounts: readonly EnteredAccount[]
  readonly incomeStreams: readonly IncomeStream[]
  readonly tickerClassifications: Readonly<Record<string, TickerClassification>>
  readonly health: HealthDraft
}

// Compile-time: a completed draft's field set IS the v3 field set — no parallel
// shape can drift in (the single-shape tie). ONE named exception: the draft has
// no `schemaVersion` — it is prepended at U8's encrypt/Save step (contract #1e),
// never carried mid-entry.
type _DraftKeysAreV3Keys = keyof ScenarioDraft extends keyof ScenarioV3 ? true : never
type _V3KeysAreDraftKeys = keyof ScenarioV3 extends keyof ScenarioDraft | 'schemaVersion'
  ? true
  : never
const _draftShapeTied: _DraftKeysAreV3Keys & _V3KeysAreDraftKeys = true
void _draftShapeTied

// ---------------------------------------------------------------------------
// The answer snapshot the surface renders (cross-cutting #6's transport):
// `pending` governs ONLY the pre-first-resolve window; once any result has
// committed, later dispatches HOLD the last answer (the surface morphs, never
// re-blanks). `compute-error` is the non-verdict retry mode.
// ---------------------------------------------------------------------------

export type ModelAnswer =
  | { readonly kind: 'idle' } // nothing dispatched yet (pre-minimum-viable input)
  | { readonly kind: 'pending' } // first dispatch in flight, nothing ever resolved
  // The resolved arms RECORD WHICH RECOMPUTE TIER COMMITTED them (`tier`): the real-browser
  // vertical-fit gate synchronizes on it (Result.tsx mirrors it as `data-answer-tier`, and
  // e2e/vertical-fit.spec.ts waits for "final" before measuring — the gate's adversarial review
  // proved a class-absence wait is vacuous on the hero, which never renders a provisional tag).
  // REQUIRED, not optional: a commit that forgot the stamp would silently break that
  // synchronization — the compiler holds the door. Note the spine's two tiers are byte-identical
  // TODAY (the spine run below ignores the tier); the stamp still records the truthful fact —
  // whether the 'final' dispatch is the one that landed.
  | { readonly kind: 'headline'; readonly result: SimulationResult; readonly tier: DateSearchTier } // spine route (incl. outcomeState 'indeterminate')
  | { readonly kind: 'date'; readonly outcome: DateSearchOutcome; readonly tier: DateSearchTier } // date route (incl. its defined input-failure)
  // U12 (the F9 demotion, council 2026-07-08): a required fact stopped being validly
  // present AFTER an answer had resolved (`missingRequiredFacts` — the one authority; the
  // builders return null on it). Deliberately TIER-LESS: this is not an answer, and the
  // vertical-fit gate's data-answer-tier="final" wait must never satisfy on it (Result's
  // tier mirror narrows on headline|date only). answerView routes it to the fallback
  // strip, which names the still-missing facts from the draft.
  | { readonly kind: 'inputs-incomplete' }
  | { readonly kind: 'compute-error'; readonly reason: string }

// ---------------------------------------------------------------------------
// U15 §S5 (5) — the TIER-LESS solve lifecycle (the recommend-second dispatch/pending/committed
// arm, mirroring U12's tier-less `inputs-incomplete`). Every user-READ state is a structured
// flag + a MACHINE label — NO copy is authored in this unit (the pending-state CHARACTER — what
// the wait feels like — is decided AFTER profile.ts reports real numbers; ⚑ digest, his eye may
// re-cut it). NO fabricated tier: a solve is a recommendation, not a spine/date answer, so it
// carries no DateSearchTier (the vertical-fit gate's data-answer-tier="final" wait must never
// satisfy on a solve state — Result mirrors ModelAnswer only, never SolveAnswer). This is WIRING,
// not chrome: U16's GoalPicker + rendered beats read these flags, they are never rendered here.
// ---------------------------------------------------------------------------

/** The precondition the solve was NOT dispatched on (§S5 (3)) — each a structured flag the U16
 *  surface routes (goal-unset ⇒ present the GoalPicker; buckets-defaulted ⇒ the RothAccounts
 *  mini-intake). Never a fabricated recommendation on an unmet precondition (burned/062). */
export type SolvePreconditionGap = 'goal-unset' | 'buckets-defaulted'

export type SolveAnswer =
  | { readonly kind: 'idle' } // no solve invited yet (the second beat not opened)
  // A precondition blocked the dispatch — the solve was NEVER sent (no Tier-1-only tie-break
  // crowned as advice). `label` is a stable MACHINE key (no copy), equal to `gap`. Structurally
  // DISTINCT from a committed withheld payload (§S1): a pre-dispatch USER precondition (goal /
  // buckets), never a worker-computed refusal — two calm states, both naming the true reason.
  | { readonly kind: 'blocked'; readonly gap: SolvePreconditionGap; readonly label: SolvePreconditionGap }
  // A solve is in flight (the calm "working on it" window). `label` is a machine key; the
  // wait's CHARACTER is deferred (profile.ts), so no copy rides here.
  | { readonly kind: 'pending'; readonly label: 'solving' }
  // A solve committed — the reconstructed payload (recommended / refused / withheld /
  // token-withheld / mint-failed; each its own structured flag via `payload.kind`). `fingerprint`
  // is the solver-run identity it was solved on (§S1) — the committed arm carries WHAT IT SOLVED
  // ON, so a later draft edit diffs a freshly-built fingerprint against it (source-bound to
  // solverRunFingerprint, never a bespoke mirror).
  | { readonly kind: 'committed'; readonly payload: SolvePayload; readonly fingerprint: SolverRunFingerprint }
  // §S1 INVALIDATION: a draft mutation changed a ranking-affecting input since this rec was found,
  // so the committed rec no longer describes the current household. Demoted to this structured
  // state — NEVER a stale rec rendered as current, and NEVER an auto-re-solve (re-solving is
  // INVITED, like the beat itself). Mirrors U12's tier-less inputs-incomplete demotion on the solve
  // channel; TIER-LESS by construction (the vertical-fit gate must never satisfy on it). `label` is
  // a machine key; the copy (`recommendStale*` — heading + body + re-open CTA) is minted in copy.ts
  // and rendered as ONE coherent card in RecommendationSurface (F-B).
  | { readonly kind: 'stale'; readonly label: 'inputs-changed' }
  // The worker promise rejected (worker death / clone failure) — the calm retry mode, never an
  // uncaught rejection into the UI (the recompute() precedent).
  | { readonly kind: 'compute-error'; readonly reason: string }

export interface MemoryModelSnapshot {
  readonly draft: ScenarioDraft
  readonly answer: ModelAnswer
  /** U12 — the sticky-resolved DISPLAY triple for the spine hero sentence (contract (d)).
   *  Null whenever no complete spine verdict stands (indeterminate / date route / error /
   *  inputs-incomplete / nothing resolved). The raw result on `answer` is NEVER altered —
   *  the band + every drill-down read it; only the sentence reads this. Written inside the
   *  same commit as the answer, before its single notify (burned/017): no listener can
   *  observe the answer and its displayed triple disagreeing across a frame. */
  readonly displayed: StickyDisplay | null
  /** U15 §S5 (5) — the recommend-second solve lifecycle (tier-less; a SEPARATE channel from
   *  `answer`, which stays the spine/date first beat). `idle` until the second beat is invited. */
  readonly solve: SolveAnswer
  readonly runningInWorker: boolean
}

// ---------------------------------------------------------------------------
// The params-builder seam — intakeMap's exports (slice (e)) plug in here; tests
// drive the orchestration mechanics through fakes. A builder returns null
// whenever `missingRequiredFacts` is non-empty (the ONE intake-domain
// authority — U12 widened it to not-validly-present) or the draft can't shape
// params at all; otherwise the engine-shaped input, and the engine's R19 gate
// remains the decider for everything dispatched. See the module header for why
// builder-null (not an engine sentinel) carries intake-domain incompleteness,
// and recompute() for the post-first-resolve `inputs-incomplete` demotion.
// ---------------------------------------------------------------------------

export interface ParamsBuilders {
  readonly buildSpineParams: (draft: ScenarioDraft) => SimulationParams | null
  readonly buildDateInput: (draft: ScenarioDraft) => DateSearchInput | null
  /** U15 §S5 — build the on-demand solve request from the draft (the enumerated roster + the
   *  household params + the injected `todayEpochDay` clock read). Returns null on the BUCKET
   *  precondition (a defaulted split can't be sequenced — burned/062), exactly the builder-null
   *  convention the spine/date builders use. OPTIONAL: a model wired without it never dispatches a
   *  solve (the U16 builder plugs in here; the P2/P3 surfaces don't carry it). The chosen-goal
   *  precondition is checked BEFORE this (memoryModel reads `draft.chosenGoal` directly for a precise
   *  `goal-unset` gap). The oracle-cleared token is NOT the builder's concern — it is minted
   *  worker-side inside `runSolve` (it cannot cross the wire). */
  readonly buildSolveDispatch?: (draft: ScenarioDraft) => SolveRequest | null
}

export interface MemoryModelDeps {
  readonly client: EngineClient
  readonly builders: ParamsBuilders
  /** Injectable for tests; defaults to one crypto.getRandomValues uint32. */
  readonly mintSeed?: () => number
  /** Injectable calendar anchor for tests; defaults to the wall clock (store
   *  layer — the engine itself stays timeless; this becomes the STORED
   *  `startCalendarYear` param). */
  readonly startCalendarYear?: number
}

export interface MemoryModel {
  subscribe(listener: () => void): () => void
  getSnapshot(): MemoryModelSnapshot
  /** Apply an edit to the draft (back-nav-safe: every step reads/writes THIS
   *  model — no per-step local copy to lose). Does NOT auto-recompute: the flow
   *  calls `recompute()` on question-COMMIT (never per keystroke). */
  update(mutate: (draft: ScenarioDraft) => ScenarioDraft): void
  /** Dispatch the state-appropriate engine run for the current draft: the
   *  date-search when ≥1 person's ASKED work status is 'working'; the spine
   *  headline when all are 'retired' (status drives routing — never inferred
   *  from salary). No-op (→ idle) below minimum-viable input. */
  recompute(tier?: DateSearchTier): Promise<void>
  /** U15 §S5 (5) — invite the recommend-second solve for the current draft (the SECOND beat,
   *  a separate channel from `recompute`'s first beat). Refuses to dispatch on an unmet
   *  precondition (goal unset ⇒ `blocked{goal-unset}`; the injected builder returns null on a
   *  defaulted bucket split ⇒ `blocked{buckets-defaulted}`), never fabricating a recommendation.
   *  Otherwise dispatches the worker solve (which mints the oracle-cleared token) and commits the
   *  reconstructed payload if newer (the epoch-discard discipline). No-op if no solve builder is
   *  wired (P2/P3 models). */
  dispatchSolve(): Promise<void>
}

// ---------------------------------------------------------------------------
// U12 — the sticky-rounding seam (contract (d), the P3 seat filled; plan
// 3-controls.md:241 + architecture §9). The DISPLAYED spine triple holds steady
// across a tiny edit whose new reading lands a hair past a display flip, so the
// sentence never flickers between two honest roundings of one household.
// Hysteresis on the DISPLAY only — the raw result is never altered.
//
// TWO INDEPENDENT GATES IN TWO UNITS (model.ts `WithMargin` names the failure
// mode — one figure sticky while the other flickers in one sentence):
//  - the headline count + verdict state gate on the survival-fraction margins
//    (`xOfTen.marginToEdge` + `stateMarginToEdge` — both are distances to their
//    FLIP EDGES, computed on the same quantized value the band compare reads);
//  - the dollar gates on the $/month margin — NOTE THE INVERTED SENSE:
//    `perMonthReal.marginToEdge` is the distance to the ROUNDED DISPLAY VALUE
//    (confidence.ts:195), so the flip edge sits at DOLLAR_STEP/2 − margin. This
//    seam is that emission's FIRST consumer (insight 047: audit a contract its
//    first consumer never stressed) — the sense difference is deliberate there
//    and compensated HERE, in one place.
//
// EPS POSTURE (a project-owned heuristic, one rule for both units): hold a
// ONE-step display flip only while the new reading sits within 20% of the
// half-flip distance of the edge it crossed — SURVIVAL_GRID (0.01 of the 0.05
// half-flip; on the 0.01 quantize grid this means "exactly on the edge") and
// DOLLAR_STEP/10 ($1 of the $5 half-flip). Anything past that, a ≥2-step move,
// or a dollar-DIRECTION change always adopts (a direction flip is a regime
// change; holding across it would compose an incoherent sentence).
//
// THE CONSERVATIVE-DIRECTION LAW (U12 ultramode, 8-lens convergence): every hold
// is DIRECTION-GATED — a hold may only ever keep a display LESS optimistic than
// the raw reading (the lower count, the lower-ranked verdict word per the
// engine's STATE_OPTIMISM_RANK, the lower dollar). A reading RISING onto an
// edge holds the prior (calm, conservative); a reading FALLING onto an edge
// always adopts the worse truth immediately (holding the rosier prior is the
// calm-but-wrong cardinal sin — the prior comment claimed "conservative by
// construction", which was only true for the rising direction). And the COUNT
// may hold only under a STABLE verdict word (unchanged or itself held): a
// state flip is a regime change, and holding the count across it composes a
// sentence the engine can never emit ({9, borderline} — buildHeadline's
// borderline band caps at 8).
//
// LIFECYCLE: session-only, captured at the resolve→verdict transition inside
// commit(), freed across indeterminate / error / date-route / inputs-incomplete
// commits (the seam applies only to a complete spine answer — an escape-hatch
// edit on an indeterminate answer is defined non-sticky, plan :243), re-seated
// on re-entry by the deterministic recompute (U13's read). NEVER serialized —
// it lives beside the epochs, structurally outside the draft (the shape tie
// makes a draft field a compile error).
// ---------------------------------------------------------------------------

/** The sticky-resolved spine DISPLAY triple (+ the dollar's direction, which is
 *  never held across — a direction flip always adopts wholesale). */
export interface StickyDisplay {
  readonly xOfTen: number
  readonly outcomeState: OutcomeState
  /** The ROUNDED $/month display figure (a DOLLAR_STEP multiple). */
  readonly perMonthDollar: number
  readonly direction: DollarAdjustment['direction']
}

export const HEADLINE_STICKY_EPS = SURVIVAL_GRID
export const DOLLAR_STICKY_EPS = DOLLAR_STEP / 10

/** The pure hysteresis rule (insight 048 — the decision is an exported, planted-fail-
 *  tested seam; commit() keeps only the wiring). Given the previous displayed triple and
 *  the new raw reading, decide what the sentence shows. */
export function resolveStickyDisplay(
  prev: StickyDisplay | null,
  headline: Headline,
  dollar: DollarAdjustment,
): StickyDisplay {
  const rawX = headline.xOfTen.value
  const rawState = headline.outcomeState
  const rawDollar = Math.round(dollar.perMonthReal.value / DOLLAR_STEP) * DOLLAR_STEP
  const direction = dollar.direction
  if (prev === null) {
    return { xOfTen: rawX, outcomeState: rawState, perMonthDollar: rawDollar, direction }
  }

  // Verdict state: hold only an edge-hugging flip whose count moved at most one
  // step (a ≥2-step count move is a real regime change — adopt even edge-close),
  // and ONLY in the conservative direction: the held word must rank BELOW the
  // raw one (a falling reading landing on an edge adopts the worse truth; the
  // engine's own rank table is the one band-order source, never re-derived).
  const stateHoldEligible =
    rawState !== prev.outcomeState &&
    Math.abs(rawX - prev.xOfTen) <= 1 &&
    STATE_OPTIMISM_RANK[prev.outcomeState] < STATE_OPTIMISM_RANK[rawState] &&
    headline.stateMarginToEdge < HEADLINE_STICKY_EPS

  // Headline count: hold a one-step flip that lands within EPS of the flip edge —
  // conservative direction only (the held count must be the LOWER one).
  const xHoldEligible =
    rawX !== prev.xOfTen &&
    Math.abs(rawX - prev.xOfTen) === 1 &&
    prev.xOfTen < rawX &&
    headline.xOfTen.marginToEdge < HEADLINE_STICKY_EPS

  // SYMMETRIC REGIME COUPLING: each unit may hold only while the other is STABLE
  // (unchanged) or itself held — otherwise both adopt together. This makes the
  // displayed (word, count) pair provably either PREV's pair or RAW's pair, both
  // engine-emittable — a one-sided coupling still leaked {9, borderline} (count
  // adopted at the 0.98 edge under a held word; caught by the property sweep).
  const holdX = xHoldEligible && (rawState === prev.outcomeState || stateHoldEligible)
  const holdState = stateHoldEligible && (rawX === prev.xOfTen || xHoldEligible)

  // Dollar: the emitted margin is distance to the ROUNDED value — flip-edge
  // distance is the half-step complement (the inverted-sense compensation).
  // Conservative direction only: hold the LOWER figure (less room / the bigger
  // trim — perMonth is negative under 'trim', so lower = more conservative in
  // both worded directions).
  const dollarEdgeDistance = DOLLAR_STEP / 2 - dollar.perMonthReal.marginToEdge
  const holdDollar =
    direction === prev.direction &&
    rawDollar !== prev.perMonthDollar &&
    Math.abs(rawDollar - prev.perMonthDollar) === DOLLAR_STEP &&
    prev.perMonthDollar < rawDollar &&
    dollarEdgeDistance < DOLLAR_STICKY_EPS

  return {
    xOfTen: holdX ? prev.xOfTen : rawX,
    outcomeState: holdState ? prev.outcomeState : rawState,
    perMonthDollar: holdDollar ? prev.perMonthDollar : rawDollar,
    direction,
  }
}

const defaultMintSeed = (): number => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! // integer in [0, 2^32) — satisfies the engine's integer-seed gate
}

export function createMemoryModel(deps: MemoryModelDeps): MemoryModel {
  const mintSeed = deps.mintSeed ?? defaultMintSeed
  const startYear = deps.startCalendarYear ?? new Date().getFullYear()

  let draft: ScenarioDraft = {
    people: [{}, {}],
    enteredAccounts: [],
    incomeStreams: [],
    tickerClassifications: {},
    health: {},
    // Methodology defaults — pre-applied and SURFACED (R7; editable in P3),
    // never silent stand-ins for a required user-fact. (spendEntryPeriod is the
    // documented ENTRY default — the ambiguous-band force-confirm makes the
    // user own it explicitly before the engine ever runs on it.)
    spendEntryPeriod: 'month',
    // Single-sourced from the era map (P3·U13) — the staleness reader's saved-era
    // comparison is only honest if the shipped default and the era entry can't drift.
    survivorSpendingRatio: appDefaultEraFor(CURRENT_APP_DEFAULT_VERSION)!.survivorSpendingRatio,
    drawdownPolicy: 'proportional',
    filing: 'mfj',
    startCalendarYear: startYear,
    taxVintage: 'OBBBA-2025',
    appDefaultVersion: CURRENT_APP_DEFAULT_VERSION,
  }

  let answer: ModelAnswer = { kind: 'idle' }
  // U15 §S5 (5) — the solve lifecycle state (a SEPARATE channel from `answer`).
  let solveAnswer: SolveAnswer = { kind: 'idle' }

  // (f) — the epoch pair: `dispatched` mints (monotonic), `committed` gates
  // rendering. A resolve whose epoch ≤ committed is DISCARDED unrendered.
  let dispatchedEpoch = 0
  let committedEpoch = 0
  // U15 — the solve's OWN epoch pair (commit-if-newer on the solve channel, so a rapid
  // re-invite discards a stale in-flight solve; worker-side cooperative cancel is S6/cancel.ts).
  let solveDispatchedEpoch = 0
  let solveCommittedEpoch = 0

  // U12 — contract (d) FILLED (the P2 placeholder made real): `lastDisplayed` is
  // the session-only sticky baseline (see the seam block above for the full
  // rule + lifecycle), and `everResolved` gates the F9 inputs-incomplete
  // demotion — pre-first-resolve incompleteness stays the idle home (mid-intake
  // behavior byte-identical to P2), post-first-resolve it must never hold a
  // stale confident verdict.
  let everResolved = false
  let lastDisplayed: StickyDisplay | null = null

  const listeners = new Set<() => void>()
  let snapshot: MemoryModelSnapshot = {
    draft,
    answer,
    displayed: lastDisplayed,
    solve: solveAnswer,
    runningInWorker: deps.client.runningInWorker,
  }

  const notify = () => {
    snapshot = { draft, answer, displayed: lastDisplayed, solve: solveAnswer, runningInWorker: deps.client.runningInWorker }
    for (const l of listeners) l()
  }

  const ensureSeed = (): number => {
    if (draft.seed === undefined) {
      draft = { ...draft, seed: mintSeed() } // minted ONCE; persisted unchanged at Save
    }
    return draft.seed!
  }

  const commit = (epoch: number, next: ModelAnswer): void => {
    if (epoch <= committedEpoch) return // stale — discard unrendered (f)
    committedEpoch = epoch
    if (next.kind === 'headline' || next.kind === 'date') everResolved = true
    // U12 — the sticky display resolves INSIDE the commit, before its single
    // notify (burned/017): one snapshot carries the answer AND its displayed
    // triple, so no listener can ever observe a one-frame mixed pair. A spine
    // verdict advances the baseline; every other arm frees it (the seam applies
    // only to a complete spine answer — indeterminate/error/date/incomplete all
    // reset, and the NEXT verdict is a fresh capture, never held against a
    // pre-gap number).
    lastDisplayed =
      next.kind === 'headline' && next.result.headline.outcomeState !== 'indeterminate'
        ? resolveStickyDisplay(lastDisplayed, next.result.headline, next.result.dollar)
        : null
    answer = next
    notify()
  }

  // U15 §S5 (5) — the solve channel's commit-if-newer (mirrors `commit`'s epoch discard, on the
  // solve's OWN epoch pair). THE LAW: every rendered solve-lane state EXCEPT pending advances the
  // committed epoch through this commitSolve (blocked, committed, compute-error alike — a blocked
  // transition is still epoch-gated: an OLDER worker RESOLVE races a NEWER local blocked/committed
  // transition, and committing the stale resolve OVER the newer state is exactly the bug the epoch
  // pair closes). `pending` is the sole exception: it does not advance the committed epoch, it MARKS
  // the newest dispatch (solveDispatchedEpoch), and the resolve path additionally HOLDS unless its
  // own epoch IS that newest dispatch (the lane has no worker-side cancel yet — the epoch pair carries
  // the whole discipline).
  const commitSolve = (epoch: number, next: SolveAnswer): void => {
    // The UNCONDITIONAL commit-epoch guard (§S6 — cancel.ts's pure seam): a resolved solve commits
    // ONLY if strictly newer than the last committed. A superseded solve NEVER renders, whatever its
    // speed (the Act-2 request-epoch discipline extended to the solve lane).
    if (!shouldCommitSolve(epoch, solveCommittedEpoch)) return
    solveCommittedEpoch = epoch
    solveAnswer = next
    notify()
  }

  // U16 §S1 — the solve-run fingerprint of a dispatched request (its whole ranking-affecting input
  // set; see solverRunFingerprint's header for the fail-closed scope). Computed store-side from the
  // SAME request handed to the worker, so the committed identity and every fresh diff share one
  // definition (never a re-typed subset).
  const fingerprintOf = (request: SolveRequest): SolverRunFingerprint =>
    solverRunFingerprint(request.base, request.candidates, request.ranking, {
      seedA: request.seedA,
      tieTolerance: request.tieTolerance,
    })

  // The CURRENT draft's solve fingerprint, or null when the draft can no longer build a solve
  // request (a defaulted bucket / a removed required fact — itself an invalidation). Built through
  // the SAME injected builder dispatchSolve uses, so the fresh identity is never a bespoke
  // re-derivation of the run.
  const currentDraftFingerprint = (): SolverRunFingerprint | null => {
    const build = deps.builders.buildSolveDispatch
    if (build === undefined) return null
    const request = build(draft)
    return request === null ? null : fingerprintOf(request)
  }

  // §S1 INVALIDATION: demote a COMMITTED solve whose fingerprint no longer matches the current
  // draft to the structured `stale` state. Only the committed arm demotes; a null fresh fingerprint
  // (the draft can't build a run any more) is itself a change. Mutates `solveAnswer` in place — the
  // caller owns the notify. Returns true iff it demoted. It NEVER dispatches: re-solving is invited,
  // never stormed on a draft edit (the planted auto-re-solve mutant re-dispatches here, which the
  // no-auto-resolve test forbids).
  const invalidateStaleSolve = (): boolean => {
    if (solveAnswer.kind !== 'committed') return false
    const fresh = currentDraftFingerprint()
    if (fresh !== null && fresh === solveAnswer.fingerprint) return false
    solveAnswer = { kind: 'stale', label: 'inputs-changed' }
    return true
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSnapshot: () => snapshot,

    update(mutate) {
      draft = mutate(draft)
      // §S1 invalidation: a draft edit that changes the solver-run fingerprint demotes a committed
      // recommendation to `stale` — never a stale rec rendered as current, and NEVER an auto-re-solve
      // (re-solving is invited, not stormed). A no-op for every non-committed solve state.
      invalidateStaleSolve()
      notify()
    },

    async recompute(tier: DateSearchTier = 'provisional'): Promise<void> {
      const anyWorking = draft.people.some((p) => p.workStatus === 'working')
      const allStatusesAnswered = draft.people.every((p) => p.workStatus !== undefined)
      if (!allStatusesAnswered) return // work-status is THE router — unanswered ⇒ no dispatch

      // Build BEFORE any state change: builder-null = intake-domain
      // incompleteness (`missingRequiredFacts`, the ONE authority — U12 widened
      // it to not-validly-present, so a zeroed spend lands here too). Pre-first-
      // resolve this stays `idle` — no dispatch, no flicker, the strip names
      // what's missing (mid-intake behavior byte-identical to P2). Post-first-
      // resolve, HOLDING the stale confident verdict is the cardinal sin the F9
      // veto named (a cleared-or-zeroed spend must never keep "over-funded" on
      // screen) — demote to `inputs-incomplete`. The epoch mint + worker-side
      // cancel keep an older in-flight sweep from landing OVER the demotion.
      const input = anyWorking ? deps.builders.buildDateInput(draft) : null
      const params = anyWorking ? null : deps.builders.buildSpineParams(draft)
      if (anyWorking ? input === null : params === null) {
        if (everResolved) {
          const epoch = ++dispatchedEpoch
          void deps.client.engine.setLatestEpoch(epoch)
          commit(epoch, { kind: 'inputs-incomplete' })
        }
        return
      }

      const epoch = ++dispatchedEpoch
      // The cancel signal is route-INDEPENDENT (AT2, D1 review): bump the
      // worker-side epoch before ANY dispatch so a spine recompute ALSO cancels
      // an in-flight date sweep (FIFO on the same port), not only a date→date
      // supersession. ORDER IS LOAD-BEARING (C3 item (b)): this commit must reach
      // the worker before the next dispatch so an older sweep cancels between
      // candidates. Harmless + idempotent for the spine route (run() ignores it).
      void deps.client.engine.setLatestEpoch(epoch)
      if (answer.kind === 'idle') {
        // `pending` exists only in the pre-first-resolve window; once anything
        // has committed we hold the last answer visible (no re-blank).
        answer = { kind: 'pending' }
        notify()
      }

      try {
        if (anyWorking) {
          const seed = ensureSeed()
          const wire = await deps.client.engine.runDateSearch(input!, seed, tier, epoch)
          const res = dateSearchFromWire(wire)
          // A superseded sweep resolves `cancelled` — HOLD the prior answer, never
          // commit it: committing renders AnswerStrip's null arm → a blanked strip
          // until the newer epoch lands (the no-re-blank contract, AC1/D1 review).
          if (res.ok && res.outcome.kind === 'cancelled') return
          commit(
            epoch,
            res.ok
              ? { kind: 'date', outcome: res.outcome, tier }
              : { kind: 'compute-error', reason: res.reason },
          )
        } else {
          const seed = ensureSeed()
          // The spine headline run opts into the per-year percentile fan (the U6/U7 band INPUT), the
          // U7 survivor-conditioned surface (the "as the survivor" reading), AND the U11 per-year
          // healthcare readout (the Healthcare sheet's series — emitted only when the overlay prices
          // healthcare; absence is the honest categorical-door shape). All three are byte-identical
          // to an opted-out run on the headline statistics (the reduce-to-spine guard) — they only
          // OBSERVE. The date route deliberately requests NONE (its many sweep candidates would blow
          // the wire payload; and it renders a timing claim, not a joint-solvency verdict).
          const wire = await deps.client.engine.run(params!, seed, { bandFan: true, survivorConditioned: true, healthReadout: true })
          const res = fromWire(wire)
          commit(
            epoch,
            res.ok
              ? { kind: 'headline', result: res.result, tier }
              : { kind: 'compute-error', reason: res.reason },
          )
        }
      } catch {
        // A rejected engine promise (worker death, clone failure) is the calm
        // compute-error mode — never an uncaught rejection into the UI.
        commit(epoch, { kind: 'compute-error', reason: 'engine-unavailable' })
      }
    },

    async dispatchSolve(): Promise<void> {
      // No solve builder wired (P2/P3 models) ⇒ the second beat is not reachable; stay idle.
      const build = deps.builders.buildSolveDispatch
      if (build === undefined) return

      // PRECONDITION 1 — the chosen goal (§S5 (3); plan line 175). Read the draft DIRECTLY so the
      // gap is precise (`goal-unset` ⇒ U16 presents the GoalPicker first). The solve is never
      // dispatched while unset — no Tier-1-only tie-break is crowned as advice (burned/062).
      if (draft.chosenGoal === undefined) {
        // A LOCAL decision, but epoch-gated all the same: mint the newest solve epoch and commit
        // through commitSolve, so a stale in-flight resolve (an older dispatch still pending
        // worker-side) is discarded by the commit-epoch guard instead of landing OVER this blocked
        // state (no worker-side cancel on the solve lane — the epoch pair carries the discipline).
        const epoch = ++solveDispatchedEpoch
        commitSolve(epoch, { kind: 'blocked', gap: 'goal-unset', label: 'goal-unset' })
        return
      }

      // PRECONDITION 2 — the bucket precondition (plan line 174): the injected builder returns null
      // on a defaulted split (the builder-null convention). A defaulted split is a silent
      // measurement, the calm-but-wrong shape — refuse, never solve on it.
      const request = build(draft)
      if (request === null) {
        // Epoch-gated for the same reason as goal-unset above: mint + commit so a stale in-flight
        // resolve is discarded rather than rendered over this blocked state.
        const epoch = ++solveDispatchedEpoch
        commitSolve(epoch, { kind: 'blocked', gap: 'buckets-defaulted', label: 'buckets-defaulted' })
        return
      }

      // RECOMMEND-SECOND ORDERING (§S1): the solve DISPATCHES only after the spine beat has
      // committed — the spine lane never starves the one shared worker. Source-binds to
      // `everResolved` (the same flag the U12 demotion gates on), never a bespoke ordering mirror.
      // Belt-and-suspenders behind the UI (the affordance lives in the doors region, shown only
      // post-spine-commit): a no-op keeps the solve channel dormant until the first beat lands. NOT
      // a `blocked` arm — the two blocked states name USER preconditions (goal / buckets); this is a
      // structural ordering guard, not a user gap.
      if (!everResolved) return

      // Dispatch. Compute the run FINGERPRINT from the SAME request handed to the worker (§S1) so
      // the committed arm carries exactly what it solved on. Mint the epoch, render the pending
      // state, and commit-if-newer on resolve (a rapid re-invite discards the stale in-flight solve).
      // The oracle-cleared token is minted worker-side inside runSolve (it cannot cross the wire);
      // every payload arm is a NAMED bin (insight 092).
      const dispatchedFingerprint = fingerprintOf(request)
      const epoch = ++solveDispatchedEpoch
      solveAnswer = { kind: 'pending', label: 'solving' }
      notify()
      try {
        const wire = await deps.client.engine.runSolve(request)
        const view = solveFromWire(wire)
        // A cooperatively-ABORTED solve (§S6) is a superseded run that bailed mid-flight — HOLD the
        // prior answer, never commit it (the date route's `cancelled` discipline: committing a
        // non-answer would blank the surface). The commit-epoch guard discards a stale result once a
        // NEWER solve has committed, but the newer one may still be in flight — so recognize the
        // aborted bin explicitly and hold. (Reachable only once the worker-epoch transport is wired —
        // the granularity call deferred to the profile, §S6 — but handled now so it is never rendered.)
        if (view.ok && view.payload.kind === 'aborted') return
        // HOLD unless this dispatch is still the latest. The solve lane has NO worker-side cancel yet,
        // so the epoch pair must carry the whole discipline: an OLDER solve resolving after a NEWER
        // dispatch must not render its stale result over the newer pending (the date route's
        // cancelled-hold mirror). commitSolve's own committed-epoch guard is defense-in-depth; this
        // guard is load-bearing while the newer dispatch is still PENDING (nothing committed yet).
        if (epoch !== solveDispatchedEpoch) return
        if (view.ok) {
          // PENDING-DURING-EDIT guard (§S1, the calm-but-wrong close): if the draft's fingerprint
          // moved WHILE this solve was in flight (an edit during the ~72s wait), the just-computed
          // rec already describes a superseded household — commit the `stale` state, never a rec for
          // the old inputs shown as current for even one frame. A fresh fingerprint that still
          // matches means no ranking-affecting edit landed, and the rec stands.
          const fresh = currentDraftFingerprint()
          const stillCurrent = fresh !== null && fresh === dispatchedFingerprint
          commitSolve(
            epoch,
            stillCurrent
              ? { kind: 'committed', payload: view.payload, fingerprint: dispatchedFingerprint }
              : { kind: 'stale', label: 'inputs-changed' },
          )
        } else {
          commitSolve(epoch, { kind: 'compute-error', reason: view.reason })
        }
      } catch {
        // A rejected engine promise (worker death, clone failure) is the calm compute-error mode —
        // but still epoch-held: a superseded dispatch's rejection must not blank the newer pending.
        if (epoch !== solveDispatchedEpoch) return
        commitSolve(epoch, { kind: 'compute-error', reason: 'engine-unavailable' })
      }
    },
  }
}
