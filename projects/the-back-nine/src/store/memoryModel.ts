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
import { fromWire, dateSearchFromWire } from '@engine/engineWire'
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
    Pick<
      ScenarioV3,
      | 'annualSpendingReal'
      | 'seed'
      | 'budget'
      | 'rothConversion'
      | 'drawdownOrder'
      | 'enhancedSubsidies'
      | 'medicareExtrasByPerson'
      | 'healthcareVintage'
      | 'savedAt'
      | 'taxVintageDetail'
      | 'dateVintage'
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

  // (f) — the epoch pair: `dispatched` mints (monotonic), `committed` gates
  // rendering. A resolve whose epoch ≤ committed is DISCARDED unrendered.
  let dispatchedEpoch = 0
  let committedEpoch = 0

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
    runningInWorker: deps.client.runningInWorker,
  }

  const notify = () => {
    snapshot = { draft, answer, displayed: lastDisplayed, runningInWorker: deps.client.runningInWorker }
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

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSnapshot: () => snapshot,

    update(mutate) {
      draft = mutate(draft)
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
  }
}
