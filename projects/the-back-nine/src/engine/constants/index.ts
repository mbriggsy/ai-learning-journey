/**
 * The canonical year-keyed tax/health constants module (cross-cutting contract #6).
 *
 * ONE source of truth. The tax overlay (U2), the healthcare overlay (U3), every
 * test fixture, and the U14 consumed-constants audit all read from HERE — a dated
 * figure is never re-typed elsewhere (burned/057,061,063). The validated MC spine
 * reads NOTHING from this module (it is tax-free), so a constants change can never
 * perturb a Trinity/Bengen golden case.
 *
 * `ALL_CONSTANTS` is the flattened registry the shape test and `consumedConstants.ts`
 * iterate — derived from the structured tables, never hand-listed, so it
 * cannot drift from them (burned/061: derive at execution, never transcribe).
 */
import { taxConstants, TAX_YEAR } from './tax'
import { stateTaxConstants } from './stateTax'
import { healthConstants, COVERAGE_YEAR } from './health'
import { contributionConstants, CONTRIBUTION_YEAR } from './contributions'
import { socialSecurityConstants } from './socialSecurity'
import { solverConstants } from './solver'
import { workingYearsConstants, WORKING_YEARS_VINTAGE } from './workingYears'
import type { ConstantEntry } from './types'
import { BLEND_SNAPSHOT_AS_OF } from '../reference/tickerBlend'
import type { DateVintageV3 } from '@shared/model'

// `export *` re-exports every named export of each module (including TAX_YEAR,
// COVERAGE_YEAR, CONTRIBUTION_YEAR, the tables, and the SS factor lookups) — no
// explicit per-name re-export needed. (Social Security factors are STATUTE, not a
// COLA year — the module carries no year key.)
export * from './types'
export * from './tax'
export * from './stateTax'
export * from './health'
export * from './contributions'
export * from './socialSecurity'
export * from './solver'
export * from './workingYears'

/** Flattened registry: dotted key → entry. Derived from the structured tables. */
export const ALL_CONSTANTS: Readonly<Record<string, ConstantEntry>> = Object.freeze({
  ...Object.fromEntries(Object.entries(taxConstants).map(([k, v]) => [`tax.${k}`, v])),
  ...Object.fromEntries(Object.entries(stateTaxConstants).map(([k, v]) => [`state.${k}`, v])),
  ...Object.fromEntries(Object.entries(healthConstants).map(([k, v]) => [`health.${k}`, v])),
  ...Object.fromEntries(
    Object.entries(contributionConstants).map(([k, v]) => [`contributions.${k}`, v]),
  ),
  ...Object.fromEntries(
    Object.entries(socialSecurityConstants).map(([k, v]) => [`socialSecurity.${k}`, v]),
  ),
  ...Object.fromEntries(Object.entries(solverConstants).map(([k, v]) => [`solver.${k}`, v])),
  ...Object.fromEntries(
    Object.entries(workingYearsConstants).map(([k, v]) => [`workingYears.${k}`, v]),
  ),
})

/** The vintage these constants describe. */
export const CONSTANTS_VINTAGE = Object.freeze({
  taxYear: TAX_YEAR,
  coverageYear: COVERAGE_YEAR,
  contributionYear: CONTRIBUTION_YEAR,
})

/** The CURRENT build's date-surface vintage stamp (P3·U13 — the fuck-off-date clock; the
 *  healthcareVintageStamp mirror, assembled HERE because its two figures span modules:
 *  the contribution-limit table year (constants) and the ticker-blend static-snapshot
 *  as-of (reference — governed by the blend single-source gate, not this registry). The
 *  save path writes it fresh (`scenarioFromDraft`); U13's staleness comparator diffs a
 *  persisted stamp against THIS at unlock. The pay check's U13 adds a third figure, the
 *  working-years table's vintage (payroll tax and the earnings test): a bumpable stamp, not
 *  a year, because the roll tripwire pins `WORKING_YEARS_YEAR` equal to its siblings, so an
 *  in-year correction could never move a year-keyed stamp. It stays OUT of
 *  `CONSTANTS_VINTAGE`, whose three-year shape the tripwire and the scaffold smoke test pin. */
export function dateVintageStamp(): DateVintageV3 {
  return {
    contributionYear: CONTRIBUTION_YEAR,
    blendSnapshotAsOf: BLEND_SNAPSHOT_AS_OF,
    workingYearsVintage: WORKING_YEARS_VINTAGE,
  }
}
