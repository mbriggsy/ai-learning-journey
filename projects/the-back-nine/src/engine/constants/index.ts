/**
 * The canonical year-keyed tax/health constants module (cross-cutting contract #6).
 *
 * ONE source of truth. The tax overlay (U2), the healthcare overlay (U3), every
 * test fixture, and the copyGuard allowlist (P2) all read from HERE — a dated
 * figure is never re-typed elsewhere (burned/057,061,063). The validated MC spine
 * reads NOTHING from this module (it is tax-free), so a constants change can never
 * perturb a Trinity/Bengen golden case.
 *
 * `ALL_CONSTANTS` is the flattened registry the shape test and the copyGuard
 * allowlist iterate — derived from the structured tables, never hand-listed, so it
 * cannot drift from them (burned/061: derive at execution, never transcribe).
 */
import { taxConstants, TAX_YEAR } from './tax'
import { healthConstants, COVERAGE_YEAR } from './health'
import type { ConstantEntry } from './types'

// `export *` re-exports every named export of each module (including TAX_YEAR,
// COVERAGE_YEAR, taxConstants, healthConstants) — no explicit per-name re-export needed.
export * from './types'
export * from './tax'
export * from './health'

/** Flattened registry: dotted key → entry. Derived from the structured tables. */
export const ALL_CONSTANTS: Readonly<Record<string, ConstantEntry>> = Object.freeze({
  ...Object.fromEntries(Object.entries(taxConstants).map(([k, v]) => [`tax.${k}`, v])),
  ...Object.fromEntries(Object.entries(healthConstants).map(([k, v]) => [`health.${k}`, v])),
})

/** The vintage these constants describe. */
export const CONSTANTS_VINTAGE = Object.freeze({ taxYear: TAX_YEAR, coverageYear: COVERAGE_YEAR })
