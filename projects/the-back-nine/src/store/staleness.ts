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
 */
import type { BudgetCategory, ScenarioV3 } from '@shared/model'
import { appDefaultEraFor, CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { stateTaxVintageStamp, isPricedState, stateProfileKey } from '@engine/constants/stateTax'
import { dateVintageStamp } from '@engine/constants'

/** Which healthcare clock moved. The v1 gate renders ONE healthcare line off `moved`; the
 *  per-clock names are the U17-inheritable granularity (the Act-4 staleness copy names the
 *  specific rulebook — 4-recommendation #8b), carried now so the report shape never re-opens. */
export type HealthcareClock =
  | 'coverage-year'
  | 'aca-status'
  | 'fpl-guideline'
  | 'irmaa-freeze'
  | 'part-b'
  | 'extras-typical'

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
    /** The bracket-vintage stamp compare (`taxVintageDetail` vs `taxVintageStamp()`). */
    readonly taxMoved: boolean
    /** The state-tax vintage clock (the state-tax unit): the household's OWN priced state's
     *  profile moved (`stateTaxVintage` vs `stateTaxVintageStamp()`). ROUTE-GATED two ways —
     *  quiet for a stateless/'elsewhere'/unbuilt household (it prices no state tax, so nothing
     *  can be stale), and PER-STATE (only the household's own state's serialized profile is
     *  compared, so an NC rate step never alarms a PA/FL vault — the alarm-when-fine the header
     *  refuses). FL is a constitutional $0, byte-identical forever ⇒ an FL vault never fires. */
    readonly stateTaxMoved: boolean
  }
  readonly healthcare: {
    readonly moved: boolean
    readonly movedClocks: readonly HealthcareClock[]
  }
  readonly date: {
    /** Contribution-limit table year moved — DATE ROUTE ONLY (an all-retired household's
     *  answer never reads a contribution limit; see the route-gate note in the header). */
    readonly contributionMoved: boolean
    readonly blendMoved: boolean
  }
  /** Budget lines whose window has passed by pure calendar advance — ALREADY-RETIRED
   *  (spine-route) households only: their year-0 anchor is the save's `startCalendarYear`.
   *  A date-route household's budget anchors to the FUTURE crowned work-stop year, so no
   *  window can be "past" before work actually stops (Q6 — documented-inert, a dated
   *  supersession of the plan's route-agnostic wording). */
  readonly budget: { readonly expiredLines: readonly ExpiredBudgetLine[] }
  /** A RULEBOOK moved — the recompute genuinely differs from the saved answer. The ONLY
   *  predicate the hero's standing "Some rules changed since your save — this answer uses
   *  today's" echo may ride (the budget re-confirms are calendar prompts on a byte-identical
   *  recompute — a "rules changed" claim there is false). */
  readonly rulesMoved: boolean
  /** Anything worth a line at the re-entry gate — `rulesMoved` OR a budget re-confirm. */
  readonly anyStale: boolean
}

/** Calendar year of an epoch-day (deterministic — Date used as pure math, never a clock).
 *  The day number's own calendar: for the LOCAL-calendar epoch-days `currentEpochDay`
 *  mints, this reads the household's local year; for a UTC day number, the UTC year. */
export function epochDayToCalendarYear(epochDay: number): number {
  return new Date(epochDay * 86_400_000).getUTCFullYear()
}

export function deriveStaleness(scenario: ScenarioV3, todayEpochDay: number): StalenessReport {
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

  // ── controls: the tax clock ─────────────────────────────────────────────────────────
  const currentTax = taxVintageStamp()
  const savedTax = scenario.taxVintageDetail
  const taxMoved =
    savedTax !== undefined &&
    (savedTax.taxYear !== currentTax.taxYear || savedTax.legalBasis !== currentTax.legalBasis)

  // ── controls: the state-tax clock (the state-tax unit) ──────────────────────────────
  // Route-gated to the household's OWN priced state: a stateless / 'elsewhere' / unbuilt-roster
  // household prices no state tax (nothing to stale — isPricedState is false), and an NC vault is
  // compared ONLY against the current NC profile (never PA/FL — per-state via ONE derived
  // stampProfileKey, so a branch that could mis-select a sibling's profile is structurally
  // impossible; the ultramode review's wrong-profile mutant class, 2026-07-15). A pre-unit vault
  // lacks the stamp (absent = not-comparable, quiet). FL's profile is a constitutional $0,
  // constant by construction ⇒ an FL vault never fires. The serialized profile catches a FUTURE
  // pinned rate step the current-year rate misses.
  //
  // KNOWN QUIET LIMITATION (the ultramode review, 3-lens convergence, refuters unanimous P3):
  // this clock keys on the persisted GEOGRAPHY, not the run's own pricing decision — the store
  // cannot call the intake builders (layer law), so the producer's-output predicate (insights
  // 080/081) is unreachable here. A DEGENERATE-OVERLAY priced-state vault ($0 accounts, no
  // income, no premium — its run built NO overlay and priced NO state tax) therefore reads a
  // false "rules changed" note on a rate re-pin. Direction: over-alarm (a re-look steer), never
  // calm-but-wrong; installed base ≈ zero. The sanctioned mechanism when a real installed base
  // exists: persist the run's state-pricing flag at save (the producer's output) and key this
  // clock on it — never a geography re-derivation.
  const savedStateTax = scenario.stateTaxVintage
  const hhState = scenario.retirementState
  let stateTaxMoved = false
  if (savedStateTax !== undefined && hhState !== undefined && isPricedState(hhState)) {
    const key = stateProfileKey(hhState)
    stateTaxMoved = savedStateTax[key] !== stateTaxVintageStamp()[key]
  }

  // ── healthcare: the four clocks (acaVerifiedOn deliberately excluded — see header) ──
  const currentHealth = healthcareVintageStamp()
  const savedHealth = scenario.healthcareVintage
  const movedClocks: HealthcareClock[] = []
  if (savedHealth !== undefined) {
    if (savedHealth.coverageYear !== currentHealth.coverageYear) movedClocks.push('coverage-year')
    if (savedHealth.acaStatus !== currentHealth.acaStatus) movedClocks.push('aca-status')
    if (savedHealth.fplGuidelineYear !== currentHealth.fplGuidelineYear) movedClocks.push('fpl-guideline')
    if (savedHealth.irmaaTopTierFrozenThrough !== currentHealth.irmaaTopTierFrozenThrough) {
      movedClocks.push('irmaa-freeze')
    }
    if (savedHealth.partBStandardMonthly !== currentHealth.partBStandardMonthly) movedClocks.push('part-b')
    // The extras-typical clock (the ask-for-Medicare-extras unit): fires ONLY when (a) the
    // saved stamp CARRIES the extras vintage (a pre-extras-unit vault lacks it — absence is
    // not-comparable, quiet, never coerced to "unchanged"), (b) the vintage moved, AND (c)
    // the vault is actually typical-EXPOSED — some member's fork is not an explicit
    // entered-dollar/affirmed-$0 (an absent field or an 'unanswered'/'typical' entry funds
    // the typical at recompute, so a typical revision genuinely moves THEIR answer; a
    // household of explicit dollars does not care — firing for them is alarm-when-fine).
    if (
      savedHealth.medicareExtrasTypicalVintage !== undefined &&
      savedHealth.medicareExtrasTypicalVintage !== currentHealth.medicareExtrasTypicalVintage &&
      (scenario.medicareExtrasByPerson === undefined ||
        scenario.medicareExtrasByPerson.some((e) => e.kind === 'typical' || e.kind === 'unanswered'))
    ) {
      movedClocks.push('extras-typical')
    }
  }

  const allRetired = scenario.people.every((p) => p.workStatus === 'retired')

  // ── date: the two fixture clocks ─────────────────────────────────────────────────────
  // The contribution clock is route-gated (header): an all-retired household has no
  // accumulation overlay, so its recompute is byte-identical under any CONTRIBUTION_YEAR —
  // firing would be alarm-when-fine at essentially every returning retired household (the
  // limit table bumps annually). The blend clock fires on BOTH routes: the ticker-blend
  // snapshot drives the household stock weight, which every projection reads.
  const currentDate = dateVintageStamp()
  const savedDate = scenario.dateVintage
  const contributionMoved =
    !allRetired && savedDate !== undefined && savedDate.contributionYear !== currentDate.contributionYear
  const blendMoved =
    savedDate !== undefined && savedDate.blendSnapshotAsOf !== currentDate.blendSnapshotAsOf

  // ── budget: expired time-boxed windows (spine route only — Q6) ───────────────────────
  const expiredLines: ExpiredBudgetLine[] = []
  if (allRetired && scenario.budget !== undefined) {
    const elapsedPlanYears = wallYear - scenario.startCalendarYear
    scenario.budget.forEach((line, index) => {
      if (line.endYear !== undefined && elapsedPlanYears > line.endYear) {
        expiredLines.push({
          index,
          category: line.category,
          endYear: line.endYear,
          endCalendarYear: scenario.startCalendarYear + line.endYear,
        })
      }
    })
  }

  // The two-predicate split (header): rulebook drift vs calendar-passage prompts.
  const rulesMoved =
    appDefaultMoved ||
    taxMoved ||
    stateTaxMoved ||
    movedClocks.length > 0 ||
    contributionMoved ||
    blendMoved
  const anyStale = rulesMoved || expiredLines.length > 0

  return {
    elapsed,
    wallYear,
    spine: { appDefaultMoved },
    controls: { taxMoved, stateTaxMoved },
    healthcare: { moved: movedClocks.length > 0, movedClocks },
    date: { contributionMoved, blendMoved },
    budget: { expiredLines },
    rulesMoved,
    anyStale,
  }
}
