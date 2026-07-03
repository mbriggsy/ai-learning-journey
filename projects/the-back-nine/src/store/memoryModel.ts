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
 * REQUIRED-FACT ABSENCE IS A SENTINEL, NEVER A DEFAULT (burned/062): a required
 * user-fact not yet collected stays `undefined` in the draft; the params
 * builders (intakeMap, injected — slice (e)) emit an out-of-range sentinel the
 * engine's R19 gate maps to the INDETERMINATE state. There is no `?? 0`, no
 * "skip with a reasonable default" — a partially-entered household can never
 * render a confident headline.
 *
 * Crypto note: this is the store layer — `crypto.getRandomValues` is allowed
 * here (U0's lint bans it only inside src/engine; the seed is INJECTED into the
 * engine per its purity contract).
 */
import type {
  DateSearchTier,
  DateSearchOutcome,
  EnteredAccount,
  HealthIntakeV3,
  IncomeStream,
  PersonInputsV3,
  ScenarioV3,
  SimulationParams,
  SimulationResult,
  TickerClassification,
} from '@shared/model'
import type { DateSearchInput } from '@engine/dateSearch'
import { fromWire, dateSearchFromWire } from '@engine/engineWire'
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
    Pick<
      ScenarioV3,
      'annualSpendingReal' | 'seed' | 'budget' | 'rothConversion' | 'drawdownOrder' | 'enhancedSubsidies' | 'healthcareVintage'
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
  | { readonly kind: 'headline'; readonly result: SimulationResult } // spine route (incl. outcomeState 'indeterminate')
  | { readonly kind: 'date'; readonly outcome: DateSearchOutcome } // date route (incl. its defined input-failure)
  | { readonly kind: 'compute-error'; readonly reason: string }

export interface MemoryModelSnapshot {
  readonly draft: ScenarioDraft
  readonly answer: ModelAnswer
  readonly runningInWorker: boolean
}

// ---------------------------------------------------------------------------
// The params-builder seam — intakeMap's exports (slice (e)) plug in here; tests
// drive the orchestration mechanics through fakes. A builder returns null while
// the draft is below minimum-viable input (no dispatch — `idle`, the
// input-incomplete placeholder's home), or the engine-shaped input (with
// burned/062 sentinels standing in for any absent required fact, so the engine
// — never the UI — decides indeterminate).
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
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    filing: 'mfj',
    startCalendarYear: startYear,
    taxVintage: 'OBBBA-2025',
    appDefaultVersion: 'p2-d1',
  }

  let answer: ModelAnswer = { kind: 'idle' }

  // (f) — the epoch pair: `dispatched` mints (monotonic), `committed` gates
  // rendering. A resolve whose epoch ≤ committed is DISCARDED unrendered.
  let dispatchedEpoch = 0
  let committedEpoch = 0

  // P3 SEAT (contract (d)) — documented, deliberately not built in P2: the
  // `lastDisplayed*` sticky-rounding baseline is captured at the resolve→verdict
  // transition and re-seated on re-entry from the deterministic recompute.
  // Session-only state living HERE when P3 adds it; NEVER serialized at Save.
  // P2 intake numbers move freely so sharpening stays visible.

  const listeners = new Set<() => void>()
  let snapshot: MemoryModelSnapshot = {
    draft,
    answer,
    runningInWorker: deps.client.runningInWorker,
  }

  const notify = () => {
    snapshot = { draft, answer, runningInWorker: deps.client.runningInWorker }
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

      // Build BEFORE any state change: a null builder result means "below
      // minimum-viable input" — no dispatch, no flicker. (Pre-first-answer that
      // leaves `idle`, the input-incomplete placeholder's home; post-first-answer
      // it HOLDS the last answer — engine-level incompleteness arrives via
      // burned/062 sentinels → the engine's indeterminate, not via builder-null.)
      const input = anyWorking ? deps.builders.buildDateInput(draft) : null
      const params = anyWorking ? null : deps.builders.buildSpineParams(draft)
      if (anyWorking ? input === null : params === null) return

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
              ? { kind: 'date', outcome: res.outcome }
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
              ? { kind: 'headline', result: res.result }
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
