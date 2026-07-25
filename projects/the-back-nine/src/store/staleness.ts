/**
 * P3·U13 — the per-surface staleness reader (council 2026-07-09, wf_a1ef7e25-64d; the
 * build spec is docs/plans/features/u13-build-spec.md).
 *
 * ONE pure comparator: the RAW-decoded persisted scenario vs the CURRENT build's stamp
 * producers, judged at an injected wall-clock epoch-day. PURE by construction — no clock
 * read inside (the caller injects `todayEpochDay`), so every arm is table-testable and the
 * report is deterministic for a given (vault, today) pair.
 *
 * THE READ-SOURCE LAW (the council's adopted red-team constraint (a)): this function is
 * handed the scenario AS DECODED AT UNLOCK — before `draftFromScenario` normalizes it and
 * long before any re-save re-stamps it. Reading a post-resave draft would compare fresh
 * stamps against fresh stamps and never fire (silent-stale = the sin); reading it after a
 * mid-session edit + save would cry wolf. IntakeApp captures the report ONCE at unlock and
 * carries it as UI state.
 *
 * THE HONESTY SPINE (Q1): when a clock here fires, the surface presents the CURRENT-vintage
 * recompute WITH a calm "assumptions updated since your save" note — never a silent
 * recompute, never a re-presentation of a number the current constants can no longer
 * reproduce. When NO clock fires, the persisted seed makes the recompute byte-identical to
 * the saved answer (CRN determinism) — the no-drift case IS the plan's byte-identity claim.
 *
 * ABSENT-STAMP = NOT-APPLICABLE (plan §298): a pre-U13 vault lacks savedAt/taxVintageDetail/
 * dateVintage — those clocks stay quiet (no false stale on legacy vaults), and every
 * "~N years since your save" claim is SUPPRESSED rather than fabricated (never derived from
 * `startCalendarYear`, which means "since you BUILT the plan" and mislabels a re-saver).
 *
 * DELIBERATELY QUIET CLOCKS (documented, not forgotten):
 * - `acaVerifiedOn` is EXCLUDED from the healthcare moved-compare: a re-verify that
 *   confirms the SAME law is provenance, not drift — firing on it would stale every vault
 *   monthly (alarm-when-fine is a lie in the safe direction, still a lie). A real regime
 *   change moves `acaStatus`/`coverageYear`/the numbers, which DO fire.
 * - The RMD-age rule has NO derivable drift today: the banded table (72/73/75,
 *   effectiveFrom 2033) is birth-year-keyed and STATIC in the constants, so a re-derivation
 *   under any wall-clock prices the identical rule. A change to the RULE ITSELF arrives as
 *   a new `legalBasis`/`taxYear` and fires the tax clock. (The plan's "RMD-age rule" clock
 *   is satisfied structurally, not by a boolean that can never be true.)
 * - The senior-bonus SUNSET CROSSING has NO clock — REMOVED by the U13 ultramode review
 *   (2026-07-09, wf_44cdf86d-b71; a dated supersession of the ratified spec's "derived
 *   note", whose premise the review refuted against source). The filed engine unit has
 *   since SHIPPED (same day, council-ratified): `taxCore.seniorBonusFor` now prices the
 *   bonus only in calendar years [effectiveFrom .. sunsetAfter], and the crossing is
 *   STILL not drift — the save already priced the calendar-deterministic sunset, so a
 *   post-2028 re-open recomputes byte-identical. A "rules changed since your save" note
 *   on a byte-identical recompute is alarm-when-fine — the same lie the acaVerifiedOn
 *   exclusion refuses. A real extension/repeal moves `legalBasis`/`taxYear` (and the
 *   symmetric shape pins on the window) and fires the tax clock.
 * - `contributionMoved` is ROUTE-GATED quiet for an all-retired household (same review):
 *   contribution limits enter the engine only through the accumulation overlay
 *   (simulate.ts gates `contributions` on it), so a decumulation-only household's answer is
 *   byte-identical under any CONTRIBUTION_YEAR — and the annual limit bump would otherwise
 *   fire a false "your date" note at essentially every returning retired household.
 * - An ENGINE-DOMAIN change has NO clock — a structural blind spot, named (the Medicare
 *   pricing unit's ultramode review, 2026-07-10, 3-lens convergence, voted real-but-
 *   immaterial): these clocks diff CONSTANT vintages (stamp fields), never whether the APP
 *   ITSELF started pricing something it previously didn't. A pre-unit all-65+ vault
 *   recomputes LOWER on return (Medicare now priced) with every stamp equal — no note.
 *   Held immaterial at ship: the installed base is ~zero (pre-launch, dev plants only) and
 *   the drift direction is CONSERVATIVE (the answer drops — never calm-but-wrong). The
 *   sanctioned mechanism WHEN a real installed base exists is a Q7 saved-era entry
 *   (`appDefaults.ts` — the add-only era map exists for exactly this class); any future
 *   engine-domain unit shipping against real vaults must mint one, not a new clock here.
 * TWO PREDICATES, NOT ONE (the review's hero-echo catch): `rulesMoved` = a clock whose
 * firing means the CURRENT recompute genuinely differs from the saved answer (the hero's
 * "Some rules changed — this answer uses today's" echo may only ride THAT); `anyStale` =
 * anything worth a line at the gate, which ALSO includes the budget window re-confirms —
 * calendar-passage prompts on a byte-identical recompute ("worth a look", never "rules
 * changed"). Collapsing them made a lapsed travel budget fire a false "rules changed"
 * claim on the magic-moment surface.
 *
 * ── U17 §S4 — THE EXPOSURE GATE (the three-way that lands ON the two-predicate split) ──────
 * A bare vintage compare answers "did the TABLE move?", never "did THIS household's answer
 * move?". Shipped defect (pilot-verified 2026-07-25): `reentryChrome.ts` pushed one healthcare
 * line off the OR-collapse of all seven healthcare clocks, so an all-65+ household — which
 * takes `buildOverlay`'s Medicare-only branch (`intakeMap.ts:581-583`), ships NO
 * `enrolledPremium`, and can therefore NEVER open the engine's ACA gate
 * (`taxOverlay.ts:1696-1701`: `acaTable !== undefined && enrolledThisYear > 0 && pre65 > 0`) —
 * was told "Health-coverage rules have been updated" on a moved `acaStatus` stamp. They price
 * ZERO ACA. That is insight 101 inverted: the warning described its poster child, not the
 * predicate's extension. And it was never only a copy bug — `healthcare.moved` fed `rulesMoved`,
 * which drives BOTH the standing hero echo AND `savedRecommendation.ts`'s conjunct 3, so the
 * same falsehood would have demoted a still-valid saved recommendation to 'rules-changed'.
 *
 * EVERY clock now lands in exactly ONE of three buckets:
 *   1. FIRED AND EXPOSED  ⇒ the clock NAMES itself, and counts toward `rulesMoved`.
 *   2. FIRED, NOT EXPOSED ⇒ SILENT. Their recompute is byte-identical, so BOTH "rules changed"
 *      and "worth a look" are false — it counts toward NEITHER predicate.
 *   3. FIRED, UNATTRIBUTABLE ⇒ AGGREGATE under ONE nameless sentence, counting toward
 *      `anyStale` ONLY. We cannot claim their answer moved; we also refuse to go silent on
 *      drift we cannot attribute (the opposite sin — a silent stale).
 *
 * THE GOVERNING RULE (pilot ruling 2026-07-25 — this SUPERSEDES the first cut's "no run-layer
 * reader ⇒ aggregate" heuristic, which measured the wrong thing):
 *
 *   A clock NAMES itself iff the household's run consumed the TABLE THE STAMP DATES, decided
 *   by a producer's-output read. Whether the STAMP FIELD ITSELF has an engine reader is
 *   IRRELEVANT — dating a table is exactly what a vintage marker is for.
 *   AGGREGATE only where exposure is genuinely UNDECIDABLE: no producer read can attribute it.
 *
 * WHAT THE WITHDRAWN HEURISTIC WOULD HAVE SHIPPED — a SILENT STALE, built while fixing an
 * over-alarm. It bucketed `irmaa-freeze` to the aggregate because `irmaaTopTierFrozenThrough`
 * has no engine reader. But `irmaa.value` IS engine-read (simulate.ts:859; solveAnchor.ts:178,180;
 * taxOverlay.ts:1104 — where the whole tier ladder feeds `buildPartBPricingSchedule`), and
 * `consumedConstants.ts:112` puts the ENTIRE `health.` family in the consumed set on
 * `healthcareEnabled === true`. This repo's own tripwire
 * (`irmaaTopTierReindex.tripwire.test.ts:30-41`) prescribes that the 2028 re-index "bump the
 * `irmaa` constant + its constants.shape pins, then move `topTierFrozenThrough` forward" — the
 * priced table and its marker move TOGETHER, by construction. Under the heuristic a returning
 * `?seed=retired` vault would then read `unattributed:['irmaa-freeze']`, `rulesMoved:false`, the
 * hero echo dark, and `savedRecommendation`'s conjunct 3 `current:true` — on a ranking priced
 * against superseded IRMAA brackets. The clincher: `taxVintageDetail.taxYear` has no engine
 * reader either, and nobody would argue `taxMoved` should be nameless.
 *
 * WHERE "EXPOSED" STOPS — the boundary that keeps this rule from sliding into a re-simulation.
 * Exposure answers "did this run READ that table?", NEVER "did that table CHANGE this household's
 * number?". The second question is only answerable by running the engine again under both
 * vintages, which is precisely the work this whole module exists to avoid — the report is a
 * worth-a-look signal taken once at unlock, not a diff of two simulations.
 *
 * The live example, so the next reader does not re-open it (a reviewer raised it, 2026-07-25):
 * `irmaa-freeze` names the Medicare line for EVERY healthcare-priced household, including one
 * whose MAGI never reaches the first IRMAA tier and who therefore pays no surcharge either way.
 * That is deliberate and it is NOT the withdrawn heuristic returning. The run reads the IRMAA
 * schedule (`taxOverlay.ts:1104`) whenever Medicare is priced — that is the exposure fact, and it
 * is decidable at this seam. Whether the tiers bite depends on where a stochastic MAGI path
 * lands across the whole horizon (RMDs grow, a conversion spikes it), which is not a property of
 * the household's inputs at all and cannot be read from any builder's output. Gating on it would
 * require the simulation. Direction of the residual: over-alarm on a "worth a look" line, which
 * is the side this module is allowed to err on — unlike a missed name, which is a silent stale.
 *
 * SO: what a clock DATES decides its family (see {@link HEALTHCARE_CLOCK_FAMILIES}), and the
 * family's exposure read decides its bucket. The aggregate keeps exactly one structural member
 * — the blend snapshot, whose MAX-across-all-rows stamp genuinely cannot be attributed to a
 * household (`tickerBlend.ts:1573-1577`) — plus the unbuildable-draft residual.
 *
 * EXPOSURE IS INJECTED, NEVER RE-DERIVED HERE. `src/store/**` cannot import intake (eslint
 * layer law), so this module cannot call the params builders — and a re-derivation of a
 * producer's INPUTS forks from the producer at its first early return (insights 080/081: the
 * age-keyed `medicareUnpriced` predicate silently lied the day `dateSearch` became a SECOND
 * producer of `healthcareEnabled`). The caller therefore hands us {@link StalenessExposure},
 * computed at the ui/intake seam off the run's OWN BUILT PARAMS (`src/ui/stalenessExposure.ts`).
 * This function stays PURE and layer-clean: exposure is a parameter, not an import.
 */
import type { BudgetCategory, ScenarioV3 } from '@shared/model'
import { appDefaultEraFor, CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { stateTaxVintageStamp, stateProfileKey, type PricedState } from '@engine/constants/stateTax'
import { dateVintageStamp } from '@engine/constants'

/** Which healthcare clock moved. U17 §S4 split the v1 single line into FAMILY-specific lines:
 *  the ACA family and the Medicare family name themselves separately, each behind its OWN
 *  exposure read. WHICH family (or families) a clock belongs to is decided by the table it
 *  DATES — see {@link HEALTHCARE_CLOCK_FAMILIES}, the one mapping. */
export type HealthcareClock =
  | 'coverage-year'
  | 'aca-status'
  | 'fpl-guideline'
  | 'irmaa-freeze'
  | 'part-b'
  | 'extras-typical'
  | 'part-b-trend'

/** The two priced healthcare rulebooks, each with its OWN exposure read and its OWN sentence.
 *  A clock may date one or both. */
export type HealthcareFamily = 'aca' | 'medicare'

/**
 * WHICH PRICED TABLE(S) EACH CLOCK DATES — the ONE mapping, read by BOTH the bucketing and the
 * per-family booleans the copy renders. Two properties make the whole class of "an alarm nothing
 * is allowed to explain" unrepresentable:
 *   · EXHAUSTIVE BY TYPE (`Record<HealthcareClock, …>`): a new clock with no row is a COMPILE
 *     error, not a silently unmapped clock that raises `rulesMoved` with no line beneath it.
 *   · NON-EMPTY BY TYPE (the `[F, ...F[]]` tuple): a row cannot be emptied to `[]`, which would
 *     make the "every read is unpriced" silence arm vacuously true and quietly kill a clock.
 *
 * THE SOURCE FOR EACH ROW:
 *   · `coverage-year` — `COVERAGE_YEAR` is documented at `model.ts:2140` as "the coverage year
 *     the ACA/IRMAA tables are keyed to", so it dates BOTH families and names each one the run
 *     priced. It is the ONLY marker for every annually-re-indexed health figure that carries no
 *     stamp of its own (the four interior IRMAA thresholds, the ACA applicable-percentage bands,
 *     the age-rating curve) — bucketing it nameless would have made the annual health re-key
 *     invisible to exactly the pre-65 marketplace planner it hits hardest.
 *   · `aca-status` / `fpl-guideline` — the marketplace rulebook (`acaEnhancedSubsidyStatus`,
 *     `federalPovertyGuidelines`), priced only where the engine's per-year ACA gate can open
 *     (`taxOverlay.ts:1696-1701`).
 *   · `irmaa-freeze` — dates the IRMAA schedule, which IS engine-read on every healthcare-priced
 *     run (see the header's ruling). Medicare, exactly like `part-b`.
 *   · `part-b` / `part-b-trend` / `extras-typical` — the Medicare cost figures.
 */
const HEALTHCARE_CLOCK_FAMILIES: Readonly<
  Record<HealthcareClock, readonly [HealthcareFamily, ...HealthcareFamily[]]>
> = {
  'coverage-year': ['aca', 'medicare'],
  'aca-status': ['aca'],
  'fpl-guideline': ['aca'],
  'irmaa-freeze': ['medicare'],
  'part-b': ['medicare'],
  'extras-typical': ['medicare'],
  'part-b-trend': ['medicare'],
}

/** A clock that fired but may only be spoken NAMELESSLY (bucket 3): the blend snapshot (whose
 *  MAX-across-rows stamp cannot be attributed even to a household that DOES read the table), and
 *  any clock whose exposure read came back `'unknown'` — today only the unbuildable-draft
 *  residual, which is why the non-healthcare members appear here at all. */
export type UnattributedClock = HealthcareClock | 'blend' | 'tax' | 'contribution'

/** One constant family's answer to "did the run THIS report describes actually PRICE it?" —
 *  a producer's-output read, computed by the caller from the run's own built params.
 *
 *  - `'priced'`   — PROVEN priced ⇒ bucket 1, the clock names itself and raises `rulesMoved`.
 *  - `'unpriced'` — PROVEN unpriced ⇒ bucket 2, SILENT (the recompute is byte-identical).
 *  - `'unknown'`  — not decidable for THIS household from a producer's output ⇒ bucket 3,
 *                   AGGREGATE. Reserved for the genuinely undecidable case, never a
 *                   convenience default: a caller that guesses here manufactures a nameless
 *                   line out of nothing. */
export type ExposureRead = 'priced' | 'unpriced' | 'unknown'

/**
 * What the run this report describes actually priced. Injected (see the header's layer note);
 * built ONLY from producer OUTPUT — never from ages, geography, or any other builder INPUT.
 */
export interface StalenessExposure {
  /** Did the run BUILD a tax overlay at all (`overlayBuiltForRun` — the route's own builder's
   *  `params.overlay !== undefined`)? This is the FEDERAL tax family's gate: `taxEnabled: true`
   *  is hardcoded on every built overlay (`intakeMap.ts:551`) and `consumedConstants.ts:104`
   *  gates the whole `tax.` family on exactly that flag — so a run that took `buildOverlay`'s
   *  degenerate early return (`intakeMap.ts:476-481`: no accounts, no premium, no income —
   *  reachable today by a save-ready Social-Security-only household) re-prices NO tax constant
   *  and is byte-identical under any tax vintage.
   *
   *  ITS OWN BIT, NEVER INFERRED FROM `medicare` (insight 081's shape). The two are CORRELATED
   *  today — and only by an accident of the intake gate: `missingRequiredFacts` REQUIRES the
   *  marketplace quote pair for any household with a pre-65 member (`intakeMap.ts:159-166`), and
   *  an all-65+ household takes the Medicare-only branch, so EVERY save-ready built overlay
   *  happens to carry `healthcareEnabled`. That is a coincidence of two unrelated rules, not a
   *  law: it breaks the day a third overlay branch ships, or the day the quote pair becomes
   *  optional. Deriving the tax gate from it would then silence a real federal rulebook move —
   *  the exact recurrence insight 080 records. `OVERLAY_NO_HEALTH` in `staleness.test.ts` is the
   *  deliberately-hypothetical fixture that keeps this arm falsifiable while they still agree. */
  readonly overlayBuilt: ExposureRead
  /** Did the run price Medicare — i.e. did its built overlay carry `healthcareEnabled`? This
   *  is ALSO the "did it price ANY healthcare constant" read: `consumedConstants.ts:112` gates
   *  the whole `health.*` family on exactly that flag, so `medicare === 'unpriced'` proves NO
   *  field of the healthcare vintage stamp can describe a change to this household's answer. */
  readonly medicare: ExposureRead
  /** Did the run price the ACA discount in some year — the built overlay's `healthcareEnabled`
   *  AND a finite positive `enrolledPremium[t]` (the engine's own per-year gate, minus the
   *  `pre65 > 0` term already baked into the built stream). ACA pricing IMPLIES Medicare
   *  pricing (both need `healthcareEnabled`), so `'priced'` here with `medicare: 'unpriced'`
   *  is a structurally impossible pair. */
  readonly aca: ExposureRead
  /** Did the run's built overlay carry the ACCUMULATION construct — i.e. does any working
   *  owner actually contribute (`contributionsPricedForRun`)? The date route is NOT sufficient
   *  on its own: `dateSearch.ts:230` forces `accumulation` onto EVERY candidate, but it
   *  truncates the BASE overlay's streams, and `contributionStreamsFor` returns `{}` for a
   *  non-working owner (`intakeMap.ts:368`) — so a date-route household whose accounts all
   *  belong to the retired spouse carries EMPTY streams on every candidate and reads no
   *  contribution limit (`consumedConstants.ts:124` gates the `contributions.` family on the
   *  construct's presence; the limits' only pricing read is `annualAdditionsCeilingFor`'s
   *  §415(c) match trim inside `contributionStreamsFor`, which never runs for them). */
  readonly contributions: ExposureRead
  /** Does the run's stock weight READ the dated ticker-blend table (`blendTableReadForRun`)?
   *  `resolveBlend` (`intakeMap.ts:214-216`) consults it ONLY for an account whose ticker hits
   *  a row; an all-manual-blend household — or one whose portfolio totals $0, where
   *  `householdStockWeight` returns null and the run takes the inert `?? 0` — is PROVABLY
   *  inert under any `BLEND_SNAPSHOT_AS_OF` bump. `'priced'` still never NAMES itself (see
   *  `date.blendMoved`): it only earns the household a seat in the nameless aggregate. */
  readonly blend: ExposureRead
  /** The priced state code THIS run actually priced (`pricedStateForRun`'s built-overlay
   *  read), or `undefined` for a household whose run prices no state tax. Closes the state
   *  clock's former KNOWN QUIET LIMITATION — see the clock below. */
  readonly pricedState: PricedState | undefined
}

export interface ExpiredBudgetLine {
  /** Index into the persisted `budget` array (the re-confirm names the line). */
  readonly index: number
  readonly category: BudgetCategory
  /** The line's last active year as persisted (offset from the work-stop anchor). */
  readonly endYear: number
  /** The same boundary as a calendar year (`startCalendarYear + endYear`) — what the
   *  re-confirm quotes ("your travel budget was set to end in 2028 — is that still right?"). */
  readonly endCalendarYear: number
}

export interface StalenessReport {
  /** Wall-time since the save. `null` = no `savedAt` anchor (a pre-U13 vault) — every
   *  "since your save" claim is suppressed. Days clamp at 0 (a future stamp from clock
   *  skew never yields a negative claim). */
  readonly elapsed: { readonly days: number; readonly saveYear: number } | null
  /** The wall-clock calendar year of `todayEpochDay` (derived once — the calendar the
   *  budget windows compare against; independent of `savedAt`). SAME BASIS as the persisted
   *  `startCalendarYear`: the caller injects a LOCAL-calendar epoch-day (`currentEpochDay`),
   *  because the plan anchor was minted from the household's local year — mixing a UTC wall
   *  year against the local anchor expired budget windows a few hours early every Dec 31
   *  (the review's basis-mismatch catch). */
  readonly wallYear: number
  /** The spine verdict's clock: the app methodology defaults moved since the save AND the
   *  household had taken the saved era's default (the Q7 saved-era rule — immunity keys on
   *  the SAVED era's default, NEVER the current one; an unknown saved era is not-comparable
   *  and stays quiet — an older build cannot describe a future version's delta). */
  readonly spine: { readonly appDefaultMoved: boolean }
  readonly controls: {
    /** The bracket-vintage stamp compare (`taxVintageDetail` vs `taxVintageStamp()`),
     *  EXPOSURE-GATED on `exposure.overlayBuilt` (U17 §S4, the F2 correction): a save-ready
     *  household with $0 accounts and Social-Security-only income takes `buildOverlay`'s
     *  degenerate early return, so `taxEnabled` is never set, `consumedConstants.ts:104` skips
     *  the whole `tax.` family, and their recompute is byte-identical under ANY tax vintage.
     *  Firing there would render `stalenessTax` + the hero echo and — once the record surface
     *  wires conjunct 3 — demote a still-valid recommendation, all for a rulebook they never
     *  read. Reachable: `stalenessExposure.test.ts`'s degenerate fixture has no missing facts. */
    readonly taxMoved: boolean
    /** The state-tax vintage clock (the state-tax unit): the household's OWN priced state's
     *  profile moved (`stateTaxVintage` vs `stateTaxVintageStamp()`). EXPOSURE-GATED on
     *  `exposure.pricedState` — the state the RUN priced — and PER-STATE (only that state's
     *  serialized profile is compared, so an NC rate step never alarms a PA/FL vault — the
     *  alarm-when-fine the header refuses). FL is a constitutional $0, byte-identical forever
     *  ⇒ an FL vault never fires. */
    readonly stateTaxMoved: boolean
  }
  readonly healthcare: {
    /** Any healthcare clock the household was PROVEN exposed to fired — the NAMED-line
     *  predicate (bucket 1). Silenced and aggregated clocks are excluded by construction. */
    readonly moved: boolean
    /** The exposed, NAMED clocks only. A clock in bucket 2 or 3 never appears here. */
    readonly movedClocks: readonly HealthcareClock[]
    /** A clock that DATES the ACA tables fired AND the run priced ACA ⇒ its own named line.
     *  Derived from {@link HEALTHCARE_CLOCK_FAMILIES} — the same mapping that bucketed the
     *  clock — so "named" and "has a line" cannot drift apart (the F7 self-contradiction). */
    readonly acaMoved: boolean
    /** The Medicare twin of {@link acaMoved}, off the same mapping. */
    readonly medicareMoved: boolean
    /** Fired, but PROVEN unexposed ⇒ silenced (bucket 2). Carried for the test seam ONLY — it
     *  enters NEITHER predicate and NO copy. Without it a silence arm could pass because the
     *  fixture failed to move the stamp rather than because the gate bit (insight 029). */
    readonly silencedClocks: readonly HealthcareClock[]
  }
  /** Bucket 3 — a reference table the app reads was re-dated, but no run-layer reader can say
   *  whether THIS household's answer moved. Counts toward `anyStale` ONLY, and speaks through
   *  ONE nameless sentence: naming a member here would claim exposure we cannot prove. */
  readonly unattributed: {
    readonly moved: boolean
    readonly clocks: readonly UnattributedClock[]
  }
  readonly date: {
    /** Contribution-limit table year moved, TWICE-GATED (U17 §S4, the F3 correction): the
     *  ROUTE gate (`!allRetired`) protects the WORDING — `stalenessDate` says "behind your
     *  date", which a household with no date must never hear — and `exposure.contributions`
     *  protects the CLAIM. "Structurally exposed because `dateSearch.ts:230` forces the
     *  accumulation construct" was necessary-but-not-sufficient, the very error the
     *  `extras-typical` conjunct (c) note calls out: the forced construct carries the BASE
     *  overlay's streams, and a date-route household whose accounts all belong to the retired
     *  spouse carries empty ones. */
    readonly contributionMoved: boolean
    /** The RAW ticker-blend snapshot compare — kept as the "did the stamp move?" fact for the
     *  non-vacuity arms; it names NO line on either route and NEVER feeds `rulesMoved`. Where
     *  it LANDED is the question: `exposure.blend === 'unpriced'` (no account resolves through
     *  the dated table, or the portfolio is $0) ⇒ SILENT, because that household is provably
     *  inert under any `BLEND_SNAPSHOT_AS_OF` bump; otherwise ⇒ the nameless AGGREGATE, because
     *  the stamp is one MAX `asOf` across ALL ticker rows (`tickerBlend.ts:1573-1577`) and no
     *  per-row comparison exists to say WHICH fund moved. That split is what makes the
     *  aggregate's sentence true of every household that hears it (insight 101, lens (c)). */
    readonly blendMoved: boolean
  }
  /** Budget lines whose window has passed by pure calendar advance — ALREADY-RETIRED
   *  (spine-route) households only: their year-0 anchor is the save's `startCalendarYear`.
   *  A date-route household's budget anchors to the FUTURE crowned work-stop year, so no
   *  window can be "past" before work actually stops (Q6 — documented-inert, a dated
   *  supersession of the plan's route-agnostic wording). */
  readonly budget: { readonly expiredLines: readonly ExpiredBudgetLine[] }
  /** A RULEBOOK the household was PROVEN exposed to moved — the recompute genuinely differs
   *  from the saved answer. The ONLY predicate the hero's standing "Some rules changed since
   *  your save — this answer uses today's" echo may ride, and the ONLY one
   *  `savedRecommendation.ts`'s conjunct 3 may demote on. Bucket 2 (silenced) and bucket 3
   *  (unattributed) are EXCLUDED: neither supports the claim that their answer moved. */
  readonly rulesMoved: boolean
  /** Anything worth a line at the re-entry gate — `rulesMoved` OR an unattributed re-base OR a
   *  budget re-confirm. */
  readonly anyStale: boolean
}

/** Calendar year of an epoch-day (deterministic — Date used as pure math, never a clock).
 *  The day number's own calendar: for the LOCAL-calendar epoch-days `currentEpochDay`
 *  mints, this reads the household's local year; for a UTC day number, the UTC year. */
export function epochDayToCalendarYear(epochDay: number): number {
  return new Date(epochDay * 86_400_000).getUTCFullYear()
}

/** Where a fired clock lands, given the ONE exposure read that governs it (the header's
 *  three-way). ONE mapping, so no clock can be bucketed by a hand-rolled ternary that drifts from
 *  the law. `placeHealth` below is this same law generalised over a clock's family SET: named as
 *  soon as one dated family is priced, silent only when every one is proven unpriced. */
type Bucket = 'named' | 'silent' | 'aggregate'
const bucketFor = (read: ExposureRead): Bucket =>
  read === 'priced' ? 'named' : read === 'unpriced' ? 'silent' : 'aggregate'

export function deriveStaleness(
  scenario: ScenarioV3,
  todayEpochDay: number,
  exposure: StalenessExposure,
): StalenessReport {
  const wallYear = epochDayToCalendarYear(todayEpochDay)

  // ── the wall-time anchor ────────────────────────────────────────────────────────────
  const elapsed =
    scenario.savedAt === undefined
      ? null
      : {
          days: Math.max(0, todayEpochDay - scenario.savedAt),
          saveYear: epochDayToCalendarYear(scenario.savedAt),
        }

  // ── spine: the app methodology-default clock (Q7 — the saved-era rule) ─────────────
  let appDefaultMoved = false
  if (scenario.appDefaultVersion !== CURRENT_APP_DEFAULT_VERSION) {
    const era = appDefaultEraFor(scenario.appDefaultVersion)
    // Known era + the household's value IS that era's default ⇒ they took the default ⇒
    // the note fires. A differing value means they overrode it ⇒ immune. Unknown era ⇒
    // not-comparable ⇒ quiet (never coerced to "not overridden").
    appDefaultMoved = era !== undefined && scenario.survivorSpendingRatio === era.survivorSpendingRatio
  }

  // ── the three buckets, filled by every clock below ──────────────────────────────────
  const movedClocks: HealthcareClock[] = []
  const silencedClocks: HealthcareClock[] = []
  const unattributedClocks: UnattributedClock[] = []
  /** Place a fired NON-healthcare clock and answer "may it name itself?". The aggregate push
   *  is the fail-safe arm: an undecidable exposure NEVER goes quiet on real drift. */
  const nameable = (clock: UnattributedClock, read: ExposureRead): boolean => {
    const bucket = bucketFor(read)
    if (bucket === 'aggregate') unattributedClocks.push(clock)
    return bucket === 'named'
  }

  // ── controls: the tax clock ─────────────────────────────────────────────────────────
  // EXPOSURE-GATED on `overlayBuilt` (U17 §S4 — the F2 correction; see the field's own note).
  // The old comment here claimed the federal clock is "structurally always exposed" because
  // `taxEnabled: true` is hardcoded on every built overlay. The first half is true; the
  // conclusion was not — a household that builds NO overlay reaches a verdict all the same
  // (`buildParams` returns params with `initialPortfolio: 0` and the inert `stockWeight ?? 0`,
  // `intakeMap.ts:605-614`), so "no overlay ⇒ nothing to be stale about" was false.
  const currentTax = taxVintageStamp()
  const savedTax = scenario.taxVintageDetail
  const taxStampMoved =
    savedTax !== undefined &&
    (savedTax.taxYear !== currentTax.taxYear || savedTax.legalBasis !== currentTax.legalBasis)
  const taxMoved = taxStampMoved && nameable('tax', exposure.overlayBuilt)

  // ── controls: the state-tax clock (the state-tax unit) ──────────────────────────────
  // EXPOSURE-GATED on the state THIS RUN PRICED (`exposure.pricedState` — `pricedStateForRun`'s
  // built-overlay read), and PER-STATE: an NC vault is compared ONLY against the current NC
  // profile (never PA/FL — per-state via ONE derived stateProfileKey, so a branch that could
  // mis-select a sibling's profile is structurally impossible; the ultramode review's
  // wrong-profile mutant class, 2026-07-15). A pre-unit vault lacks the stamp (absent =
  // not-comparable, quiet). FL's profile is a constitutional $0, constant by construction ⇒ an
  // FL vault never fires. The serialized profile catches a FUTURE pinned rate step the
  // current-year rate misses.
  //
  // THE FORMER KNOWN QUIET LIMITATION IS CLOSED (U17 §S4 — the mechanism its own comment
  // prescribed). This clock used to key on the persisted GEOGRAPHY (`scenario.retirementState`
  // + `isPricedState`), not the run's pricing decision, because the store cannot call the
  // intake builders; a DEGENERATE-OVERLAY priced-state vault ($0 accounts, no income, no
  // premium — its run builds NO overlay and prices NO state tax) therefore read a false "rules
  // changed" note on a rate re-pin. The injected exposure IS that producer's-output flag, so
  // the geography re-derivation is gone. NEVER re-introduce `scenario.retirementState` here:
  // the draft field and the built overlay field diverge at `buildOverlay`'s early return
  // (insight 081), which is exactly the hole this closed.
  const savedStateTax = scenario.stateTaxVintage
  const pricedState = exposure.pricedState
  let stateTaxMoved = false
  if (savedStateTax !== undefined && pricedState !== undefined) {
    const key = stateProfileKey(pricedState)
    stateTaxMoved = savedStateTax[key] !== stateTaxVintageStamp()[key]
  }

  // ── healthcare: the seven clocks, each bucketed by the FAMILY IT DATES ───────────────
  // (acaVerifiedOn deliberately excluded — see header.)
  //
  // WHY EVERY HEALTHCARE CLOCK IS GATED, with the source that proves it: the engine consumes
  // the WHOLE `health.*` constant family iff `overlay.healthcareEnabled`
  // (`consumedConstants.ts:112`), so a run that built no healthcare overlay re-prices none of
  // it and no field of this stamp can describe a change to its answer. WHICH family a clock
  // answers to is {@link HEALTHCARE_CLOCK_FAMILIES}'s job — there is no second opinion here.
  //   · ACA family → `exposure.aca`. The engine's per-year ACA gate is
  //     `acaTable !== undefined && enrolledThisYear > 0 && pre65 > 0` (`taxOverlay.ts:1696-1701`);
  //     the Medicare-only branch ships NO quote pair, so it can never open — an all-65+
  //     household prices ZERO ACA and must stay SILENT on it.
  //   · Medicare family → `exposure.medicare`.
  //   · `coverage-year` dates BOTH tables, so it names each family the run priced (and only
  //     those). The withdrawn "no engine reader ⇒ aggregate" heuristic is dead — see the header.
  const currentHealth = healthcareVintageStamp()
  const savedHealth = scenario.healthcareVintage
  /** Read the exposure governing one family — the ONE place a family maps to its read. */
  const readFor = (f: HealthcareFamily): ExposureRead => (f === 'aca' ? exposure.aca : exposure.medicare)
  /** Route one fired healthcare clock into its bucket, off the families it DATES. NAMED as soon
   *  as ONE dated family is priced (that family's line is true for them); SILENT only when EVERY
   *  dated family is proven unpriced (nothing it dates was consumed); AGGREGATE otherwise. The
   *  non-empty tuple type makes the `every` arm impossible to satisfy vacuously. */
  const placeHealth = (clock: HealthcareClock): void => {
    const reads = HEALTHCARE_CLOCK_FAMILIES[clock].map(readFor)
    if (reads.some((r) => r === 'priced')) movedClocks.push(clock)
    else if (reads.every((r) => r === 'unpriced')) silencedClocks.push(clock)
    else unattributedClocks.push(clock)
  }
  if (savedHealth !== undefined) {
    if (savedHealth.coverageYear !== currentHealth.coverageYear) placeHealth('coverage-year')
    if (savedHealth.acaStatus !== currentHealth.acaStatus) placeHealth('aca-status')
    if (savedHealth.fplGuidelineYear !== currentHealth.fplGuidelineYear) {
      placeHealth('fpl-guideline')
    }
    // THE IRMAA FREEZE HORIZON is a Medicare cost clock like any other (the F1 correction).
    // `topTierFrozenThrough` has no engine reader of its own — and that is irrelevant: it DATES
    // the `irmaa` schedule, which every healthcare-priced run consumes, and this repo's own
    // tripwire prescribes moving the marker in the SAME commit that re-pins the brackets. See
    // the header's ruling for what the withdrawn heuristic would have silently swallowed.
    if (savedHealth.irmaaTopTierFrozenThrough !== currentHealth.irmaaTopTierFrozenThrough) {
      placeHealth('irmaa-freeze')
    }
    if (savedHealth.partBStandardMonthly !== currentHealth.partBStandardMonthly) {
      placeHealth('part-b')
    }
    // The extras-typical clock (the ask-for-Medicare-extras unit): fires ONLY when (a) the
    // saved stamp CARRIES the extras vintage (a pre-extras-unit vault lacks it — absence is
    // not-comparable, quiet, never coerced to "unchanged"), (b) the vintage moved, AND (c)
    // the vault is actually typical-EXPOSED — some member's fork is not an explicit
    // entered-dollar/affirmed-$0 (an absent field or an 'unanswered'/'typical' entry funds
    // the typical at recompute, so a typical revision genuinely moves THEIR answer; a
    // household of explicit dollars does not care — firing for them is alarm-when-fine).
    //
    // (c) IS NECESSARY BUT NOT SUFFICIENT (U17 §S4): an ABSENT `medicareExtrasByPerson`
    // satisfies it, yet a run that built NO healthcare overlay funds no extras at all
    // (`buildOverlay` resolves the vector only on `healthcareOn || medicareOnly`, and
    // `consumedConstants.ts:114` requires `medicareExtrasMonthly` present). The Medicare
    // exposure read the family mapping applies is what closes that.
    if (
      savedHealth.medicareExtrasTypicalVintage !== undefined &&
      savedHealth.medicareExtrasTypicalVintage !== currentHealth.medicareExtrasTypicalVintage &&
      (scenario.medicareExtrasByPerson === undefined ||
        scenario.medicareExtrasByPerson.some((e) => e.kind === 'typical' || e.kind === 'unanswered'))
    ) {
      placeHealth('extras-typical')
    }
    // The Part-B trend table's era (the trend sourcing unit): a new Trustees-edition adoption
    // mints a new vintage — every vault saved under the old table re-prices its Medicare years
    // under the new one. Absent on a pre-trend stamp = not-comparable, quiet (never coerced to
    // "unchanged").
    //
    // ITS "no exposure gate" COMMENT WAS FALSE and is swept here (U17 §S4, insight 087): the
    // trend schedule `partBPricingByT` is constructed ONLY under
    // `healthcareEnabled && config.taxEnabled` (`taxOverlay.ts:1110-1111`), so a run that built
    // no healthcare overlay never constructs it and re-prices nothing under the new edition.
    if (
      savedHealth.partBTrendVintage !== undefined &&
      savedHealth.partBTrendVintage !== currentHealth.partBTrendVintage
    ) {
      placeHealth('part-b-trend')
    }
  }
  // THE SELF-CONTRADICTION KILL (F7): both booleans read the SAME mapping that bucketed the
  // clock, and BOTH conjuncts are load-bearing. `movedClocks.some(...)` alone would render a
  // family's line for a clock that names a DIFFERENT family (a `coverage-year` move on an
  // all-65+ household names Medicare — it must not also speak the marketplace line); the
  // `readFor(f) === 'priced'` conjunct is what keeps each sentence true for its hearer. And
  // because a clock is NAMED only when at least one dated family is priced, every named clock
  // makes at least one of these true — so `rulesMoved` can never outrun the rendered copy.
  const familyMoved = (f: HealthcareFamily): boolean =>
    readFor(f) === 'priced' && movedClocks.some((c) => HEALTHCARE_CLOCK_FAMILIES[c].includes(f))
  const acaMoved = familyMoved('aca')
  const medicareMoved = familyMoved('medicare')

  const allRetired = scenario.people.every((p) => p.workStatus === 'retired')

  // ── date: the two fixture clocks ─────────────────────────────────────────────────────
  // The contribution clock is ROUTE-gated (header) AND EXPOSURE-gated (U17 §S4's F3 fix). The
  // route gate keeps the WORDING honest — `stalenessDate` says "behind your date". The exposure
  // gate keeps the CLAIM honest: "every date candidate carries the accumulation construct
  // (`dateSearch.ts:230`) ⇒ structurally exposed" is necessary but NOT sufficient, because the
  // forced construct is filled from the BASE overlay's streams and `contributionStreamsFor`
  // returns `{}` for a non-working owner (`intakeMap.ts:368`). A 66/retired + 62/working couple
  // whose accounts all belong to the retired spouse is on the date route with EMPTY streams:
  // `anyContributions` is false (`intakeMap.ts:518-527`), no `accumulation` reaches the base
  // overlay, and the limit tables' only pricing read (the §415(c) match trim) never runs.
  //
  // The blend clock never NAMES itself on either route (see `date.blendMoved`'s own note): the
  // snapshot is one MAX date over the whole ticker table, so even for a household that DOES read
  // the table no per-row comparison exists to attribute it — aggregate. For a household whose
  // accounts never resolve through the table, it is provably inert — SILENT.
  const currentDate = dateVintageStamp()
  const savedDate = scenario.dateVintage
  const contributionStampMoved =
    savedDate !== undefined && savedDate.contributionYear !== currentDate.contributionYear
  const contributionMoved =
    contributionStampMoved && !allRetired && nameable('contribution', exposure.contributions)
  const blendMoved =
    savedDate !== undefined && savedDate.blendSnapshotAsOf !== currentDate.blendSnapshotAsOf
  if (blendMoved && bucketFor(exposure.blend) !== 'silent') unattributedClocks.push('blend')

  // ── budget: expired time-boxed windows (spine route only — Q6) ───────────────────────
  const expiredLines: ExpiredBudgetLine[] = []
  if (allRetired && scenario.budget !== undefined) {
    // Years since the plan was BUILT — `startCalendarYear` is the budget windows' own year-0
    // anchor on this route. Named for what it measures (U17 §S0.2, the repo-wide rename): it is
    // NOT "years since your save", which is `savedAt`'s job three blocks up and diverges from
    // this the moment a household re-saves an older plan.
    const yearsSincePlanBuilt = wallYear - scenario.startCalendarYear
    scenario.budget.forEach((line, index) => {
      if (line.endYear !== undefined && yearsSincePlanBuilt > line.endYear) {
        expiredLines.push({
          index,
          category: line.category,
          endYear: line.endYear,
          endCalendarYear: scenario.startCalendarYear + line.endYear,
        })
      }
    })
  }

  // The two predicates, now fed by the three-way (header). `rulesMoved` takes bucket 1 ONLY —
  // every disjunct here is a NAMED clock: `taxMoved`/`contributionMoved` already carry their
  // exposure gate, `movedClocks` excludes the silenced and the aggregated, and `blendMoved` is
  // DELIBERATELY absent — a nameless re-base can never license the hero's "Some rules changed"
  // echo or `savedRecommendation`'s 'rules-changed' demotion. THE INVARIANT THAT MUST HOLD
  // (pinned in `reentry.test.tsx`): `rulesMoved === true` ⇒ `composeReentry` renders at least one
  // line. An alarm nothing is allowed to explain is worse than either arm of the three-way.
  const rulesMoved =
    appDefaultMoved || taxMoved || stateTaxMoved || movedClocks.length > 0 || contributionMoved
  const unattributedMoved = unattributedClocks.length > 0
  const anyStale = rulesMoved || unattributedMoved || expiredLines.length > 0

  return {
    elapsed,
    wallYear,
    spine: { appDefaultMoved },
    controls: { taxMoved, stateTaxMoved },
    healthcare: {
      moved: movedClocks.length > 0,
      movedClocks,
      acaMoved,
      medicareMoved,
      silencedClocks,
    },
    unattributed: { moved: unattributedMoved, clocks: unattributedClocks },
    date: { contributionMoved, blendMoved },
    budget: { expiredLines },
    rulesMoved,
    anyStale,
  }
}
