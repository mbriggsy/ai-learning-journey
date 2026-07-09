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
 * - The senior-bonus sunset IS derivable and fires below: a save whose priced window
 *   included the 2025–2028 bonus for a 65+ person, viewed after the sunset, reads
 *   differently on recompute — the note names why.
 */
import type { BudgetCategory, ScenarioV3 } from '@shared/model'
import { appDefaultEraFor, CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { dateVintageStamp, seniorBonus } from '@engine/constants'

/** Which healthcare clock moved — the surface names it, never a bare "something changed". */
export type HealthcareClock =
  | 'coverage-year'
  | 'aca-status'
  | 'fpl-guideline'
  | 'irmaa-freeze'
  | 'part-b'

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
  /** The wall-clock UTC year of `todayEpochDay` (derived once — the calendar the budget
   *  windows and the date-answer decay compare against; independent of `savedAt`). */
  readonly wallYear: number
  /** The spine verdict's clock: the app methodology defaults moved since the save AND the
   *  household had taken the saved era's default (the Q7 saved-era rule — immunity keys on
   *  the SAVED era's default, NEVER the current one; an unknown saved era is not-comparable
   *  and stays quiet — an older build cannot describe a future version's delta). */
  readonly spine: { readonly appDefaultMoved: boolean }
  readonly controls: {
    /** The bracket-vintage stamp compare (`taxVintageDetail` vs `taxVintageStamp()`). */
    readonly taxMoved: boolean
    /** A save whose priced window included the 2025–2028 senior bonus for a 65+ person,
     *  now viewed after the sunset (derived — needs `savedAt`; suppressed without it). */
    readonly seniorBonusSunsetCrossed: boolean
  }
  readonly healthcare: {
    readonly moved: boolean
    readonly movedClocks: readonly HealthcareClock[]
  }
  readonly date: {
    readonly contributionMoved: boolean
    readonly blendMoved: boolean
  }
  /** Budget lines whose window has passed by pure calendar advance — ALREADY-RETIRED
   *  (spine-route) households only: their year-0 anchor is the save's `startCalendarYear`.
   *  A date-route household's budget anchors to the FUTURE crowned work-stop year, so no
   *  window can be "past" before work actually stops (Q6 — documented-inert, a dated
   *  supersession of the plan's route-agnostic wording). */
  readonly budget: { readonly expiredLines: readonly ExpiredBudgetLine[] }
  /** Any clock fired — the surface-level "render the staleness note at all" predicate. */
  readonly anyStale: boolean
}

/** UTC calendar year of an epoch-day (deterministic — Date used as pure math, never a clock). */
export function epochDayToUtcYear(epochDay: number): number {
  return new Date(epochDay * 86_400_000).getUTCFullYear()
}

/** The senior-bonus sunset year, fail-loud at import (burned/062 — the meta field is
 *  optional on the TYPE, but this entry without it would silently disarm the crossing
 *  note; a missing year is a build error, never a quiet `undefined` compare). */
const SENIOR_BONUS_SUNSET_AFTER: number = (() => {
  const y = seniorBonus.sunsetAfter
  if (y === undefined) throw new Error('[staleness] seniorBonus.sunsetAfter is missing — the sunset clock cannot arm')
  return y
})()

export function deriveStaleness(scenario: ScenarioV3, todayEpochDay: number): StalenessReport {
  const wallYear = epochDayToUtcYear(todayEpochDay)

  // ── the wall-time anchor ────────────────────────────────────────────────────────────
  const elapsed =
    scenario.savedAt === undefined
      ? null
      : {
          days: Math.max(0, todayEpochDay - scenario.savedAt),
          saveYear: epochDayToUtcYear(scenario.savedAt),
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

  // The senior-bonus sunset crossing: the saved answer priced the 2025–2028 bonus (some
  // person reaches 65 within the bonus window from the plan's own t=0 anchor) AND the save
  // predates the sunset AND today is past it. All three from persisted facts + the injected
  // clock — no stamp needed, but the save-year claim needs `savedAt`.
  const sunsetAfter = SENIOR_BONUS_SUNSET_AFTER
  const anyoneBonusEligible = scenario.people.some(
    (p) => scenario.startCalendarYear + Math.max(0, 65 - p.currentAge) <= sunsetAfter,
  )
  const seniorBonusSunsetCrossed =
    elapsed !== null && anyoneBonusEligible && elapsed.saveYear <= sunsetAfter && wallYear > sunsetAfter

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
  }

  // ── date: the two fixture clocks ─────────────────────────────────────────────────────
  const currentDate = dateVintageStamp()
  const savedDate = scenario.dateVintage
  const contributionMoved =
    savedDate !== undefined && savedDate.contributionYear !== currentDate.contributionYear
  const blendMoved =
    savedDate !== undefined && savedDate.blendSnapshotAsOf !== currentDate.blendSnapshotAsOf

  // ── budget: expired time-boxed windows (spine route only — Q6) ───────────────────────
  const allRetired = scenario.people.every((p) => p.workStatus === 'retired')
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

  const anyStale =
    appDefaultMoved ||
    taxMoved ||
    seniorBonusSunsetCrossed ||
    movedClocks.length > 0 ||
    contributionMoved ||
    blendMoved ||
    expiredLines.length > 0

  return {
    elapsed,
    wallYear,
    spine: { appDefaultMoved },
    controls: { taxMoved, seniorBonusSunsetCrossed },
    healthcare: { moved: movedClocks.length > 0, movedClocks },
    date: { contributionMoved, blendMoved },
    budget: { expiredLines },
    anyStale,
  }
}
