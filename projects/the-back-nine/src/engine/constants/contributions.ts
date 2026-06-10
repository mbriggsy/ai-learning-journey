/**
 * 2026 contribution-limit constants (Track C1 — the accumulation data foundation).
 *
 * These are INTAKE SANITY CEILINGS (R19) + the per-runway-year expansion rule —
 * NEVER a per-year engine formula: the user enters per-account contribution
 * amounts (which already reflect §603 Roth-catch-up routing etc.); the engine adds
 * the employer match (→ pretax). D1's `intakeMap` expansion applies the age-band
 * ceiling PER RUNWAY YEAR (the §109 60–63 super catch-up EXPIRES at 64 — a flat
 * projection of a today-legal super amount would compound legally-impossible
 * contributions through 64+ → overstated balance → falsely-early date, the
 * calm-but-wrong-optimistic sin). The step-down is encoded IN the band data.
 *
 * Every figure read VERBATIM from its primary (IRS Notice 2025-67 / Rev. Proc.
 * 2025-19 / IRC §223(b)(3)(B)) and cross-verified against ≥2 independently-written
 * professional publishers (2026-06-10, the C1 research pass) — still
 * `directionalUntilPinned` until the deliberate P1-exit pin pass (don't flip
 * piecemeal). The spine reads NOTHING from here.
 */
import {
  sourced,
  type CatchUpBand,
  type ConstantEntry,
  type EmployerPlanLimits,
  type IraLimits,
} from './types'

/** The tax year these limits govern (Notice 2025-67 = the 2026 COLA notice). */
export const CONTRIBUTION_YEAR = 2026

/** The 2026 age-50 regular catch-up (IRC §414(v)(2)(B)(i)) — ONE transcription site
 *  (burned/061): both the 50–59 band and the 64+ step-down band ARE this tier (the
 *  §109 super band expiring returns the contributor to the regular tier — a
 *  structural fact, not a numeric coincidence; a COLA bump edits one literal). */
const regularCatchUp2026 = 8_000

/** 2026 employer-plan (401(k)/403(b)) elective-deferral limit + age-banded catch-ups.
 *  Catch-up eligibility keys on the age ATTAINED AS OF DEC 31 of the year (attain 60
 *  mid-year ⇒ the super band applies that whole year; attain 64 mid-year ⇒ INELIGIBLE
 *  for the super band that whole year — back to the age-50 tier; the publishers flag
 *  the turn-64 year as an excess-deferral trap). The 60–63 band REPLACES the age-50
 *  band (in lieu of, never additive: 60–63 total = 24,500 + 11,250, NOT + 8,000 too)
 *  and is an OPTIONAL plan feature — these bands are the MAXIMUM legal ceiling; a
 *  user whose plan lacks the super tier simply enters less (a ceiling, not a default). */
export const employerPlan2026 = sourced<EmployerPlanLimits>(
  {
    electiveDeferral: 24_500,
    catchUpBands: [
      { fromAge: 50, toAge: 59, amount: regularCatchUp2026 },
      {
        fromAge: 60,
        toAge: 63,
        amount: 11_250,
        legalBasis: 'SECURE 2.0 §109; IRC §414(v)(2)(E)',
      },
      { fromAge: 64, toAge: null, amount: regularCatchUp2026 },
    ],
  },
  {
    citation:
      'IRS Notice 2025-67 (n-25-67.pdf, read verbatim: deferral "increased from $23,500 to $24,500"; age-50 catch-up "increased from $7,500 to $8,000"; 60–63 catch-up "remains $11,250") + cross-verified vs Mercer / Milliman / Journal of Accountancy — zero disagreement',
    directionalUntilPinned: true,
    pinTo: 'IRS Notice 2025-67 (irs.gov/pub/irs-drop/n-25-67.pdf)',
    legalBasis: 'IRC §402(g)(1) / §414(v)(2)(B)(i) / §414(v)(2)(E) (SECURE 2.0 §109)',
    note: 'The same $24,500 applies to governmental 457(b) (§457(e)(15)). The $11,250 super amount is its OWN COLA-indexed figure — NEVER derive it as 150% × the current-year catch-up (150% × $8,000 = $12,000 is WRONG for 2026; the statutory base is 150% × the 2024 $7,500, indexed thereafter, and 2026 rounding left it flat). NOT MODELED (routing-only, captured at intake): SECURE 2.0 §603 — from 2026, prior-year FICA wages > $150,000 (the 2026 threshold, same notice) force ALL catch-up dollars to Roth; it changes WHICH bucket, which the user’s entered per-account amounts already reflect.',
  },
)

/** 2026 IRA contribution limit + the age-50 catch-up (traditional + Roth combined).
 *  The catch-up is INDEXED under SECURE 2.0 §108 — 2026 is its FIRST-EVER move off
 *  $1,000 ($1,100); any source still showing $1,000 is pre-2026 stale. */
export const ira2026 = sourced<IraLimits>(
  {
    contributionLimit: 7_500,
    catchUpBands: [
      { fromAge: 50, toAge: null, amount: 1_100, legalBasis: 'SECURE 2.0 §108; IRC §219(b)(5)(B)(ii)' },
    ],
  },
  {
    citation:
      'IRS Notice 2025-67 (n-25-67.pdf, read verbatim: limit "increased from $7,000 to $7,500"; catch-up "increased from $1,000 to $1,100") + cross-verified vs Mercer / Milliman / Journal of Accountancy / Fidelity — zero disagreement',
    directionalUntilPinned: true,
    pinTo: 'IRS Notice 2025-67 (irs.gov/pub/irs-drop/n-25-67.pdf)',
    legalBasis: 'IRC §219(b)(5); SECURE 2.0 §108 (catch-up indexing, effective 2024)',
    note: 'Limit is traditional + Roth COMBINED, per person. 50+ total = $8,600.',
  },
)

/** 2026 §415(c) defined-contribution annual-additions ceiling (employee + employer,
 *  lesser of 100% of compensation or this figure). Catch-up contributions are
 *  EXCLUDED from annual additions — they sit ON TOP, so the effective per-account
 *  employee+employer ceiling for a catch-up-eligible person is this figure PLUS
 *  their applicable band amount (D1’s contribution+match sanity ceiling must add
 *  the band, never cap at the bare $72,000). */
export const annualAdditions415c2026 = sourced(72_000, {
  citation:
    'IRS Notice 2025-67 (n-25-67.pdf, read verbatim: "increased in 2026 from $70,000 to $72,000") + cross-verified vs Mercer / Milliman / Journal of Accountancy — zero disagreement',
  directionalUntilPinned: true,
  pinTo: 'IRS Notice 2025-67 (irs.gov/pub/irs-drop/n-25-67.pdf)',
  legalBasis: 'IRC §415(c)(1)(A)',
})

/** HSA contribution limits + HDHP qualification thresholds (2026). MOVED here from
 *  `health.ts` at C1 (it is a CONTRIBUTION-limit figure family; health keeps the
 *  spend-side HSA rules) — values unchanged, re-verified verbatim 2026-06-10.
 *  PROVENANCE SPLIT: the COLA figures cite Rev. Proc. 2025-19 §2.01; the age-55
 *  catch-up is NOT a Rev. Proc. figure at all — it is statutorily FIXED at $1,000
 *  by IRC §223(b)(3)(B) ("2009 and thereafter: $1,000", no §223(g) COLA
 *  cross-reference) and can only change by act of Congress. */
export const hsa2026 = sourced(
  {
    contributionSelfOnly: 4_400,
    contributionFamily: 8_750,
    hdhpMinDeductible: { selfOnly: 1_700, family: 3_400 },
    maxOutOfPocket: { selfOnly: 8_500, family: 17_000 },
    catchUp55Plus: 1_000,
  },
  {
    citation:
      'IRS Rev. Proc. 2025-19 §2.01 (rp-25-19.pdf, read verbatim: $4,400 / $8,750 / $1,700 / $3,400 / $8,500 / $17,000) + IRC §223(b)(3)(B) statutory table for the fixed $1,000 catch-up (uscode.house.gov — the catch-up appears NOWHERE in the Rev. Proc.) + cross-verified vs SHRM / Mercer / Fidelity / Thomson Reuters — zero disagreement',
    directionalUntilPinned: true,
    pinTo: 'IRS Rev. Proc. 2025-19 (rp-25-19.pdf) + IRC §223(b)(3)(B)',
    note: 'Catch-up (55+) is +$1,000 in EACH spouse’s OWN HSA (cannot stack in one account — Pub 969 verbatim). The §223 HDHP out-of-pocket cap is DISTINCT from the (higher) ACA §1302 MOOP — never conflate. Medicare ENROLLMENT (not mere eligibility) zeroes contribution eligibility, prorated monthly; retroactive Part A (up to 6 months, claiming SS past 65) backdates the cutoff — the retro trap is disclosed at intake (D1), not modeled (plan §6/C2).',
  },
)

/** The account kinds whose catch-up bands differ. */
export type CatchUpAccountKind = 'employerPlan' | 'ira' | 'hsa'

/** The HSA catch-up as a band, DERIVED from `hsa2026` (burned/061 — derive at
 *  execution, never re-type): age 55+, open-ended, statutorily fixed. */
const hsaCatchUpBands = (): readonly CatchUpBand[] => [
  { fromAge: 55, toAge: null, amount: hsa2026.value.catchUp55Plus, legalBasis: 'IRC §223(b)(3)(B) (fixed, not indexed)' },
]

/**
 * The age-band catch-up lookup (C1): the catch-up amount for a contributor’s
 * YEAR-END ATTAINED age + account kind. Returns 0 below the first band. This is the
 * primitive D1’s per-runway-year ceiling expansion reads — the 60–63 super band
 * expiring at 64 is IN the band data, so a runway crossing 64 steps down
 * automatically (never a flat projection of a today-legal amount).
 *
 * The guard gates on the PROPERTY the band lookup needs (insight 020): a year-end
 * attained age is a finite INTEGER in the human range. Finiteness FIRST (insight
 * 010 — a NaN passes every relational guard); integrality next (the bands are
 * integer-contiguous, so a fractional 59.5 would match NO band and `?? 0` would
 * return a silent plausible default — the exact class burned/062 bans); the 120 cap
 * mirrors the ULT/JLLS "120 and over" terminal-bucket precedent and catches the
 * birth-year-passed-as-age units bug (1975 would otherwise resolve to the 64+ tier).
 */
export const catchUpForAge = (age: number, kind: CatchUpAccountKind): number => {
  if (!Number.isFinite(age) || !Number.isInteger(age) || age < 0 || age > 120) {
    throw new Error(
      `[constants] catchUpForAge: age must be a finite INTEGER year-end attained age in [0, 120] (got ${age}) — insights 010/020, no silent default (burned/062)`,
    )
  }
  let bands: readonly CatchUpBand[]
  switch (kind) {
    case 'employerPlan':
      bands = employerPlan2026.value.catchUpBands
      break
    case 'ira':
      bands = ira2026.value.catchUpBands
      break
    case 'hsa':
      bands = hsaCatchUpBands()
      break
    default: {
      // Compile-time exhaustiveness + runtime fail-loud (the sequencing.ts pattern):
      // a future CatchUpAccountKind member fails typecheck HERE, and a runtime stray
      // kind (untyped persisted data / a cast) throws instead of silently pricing as
      // the last branch (burned/062).
      const exhaustive: never = kind
      throw new Error(`[constants] catchUpForAge: unknown account kind ${String(exhaustive)} — no default bands (burned/062)`)
    }
  }
  const band = bands.find((b) => age >= b.fromAge && (b.toAge === null || age <= b.toAge))
  return band?.amount ?? 0
}

/** The full contribution table — also the iteration surface for the shape test. */
export const contributionConstants = {
  employerPlan2026,
  ira2026,
  annualAdditions415c2026,
  hsa2026,
} satisfies Record<string, ConstantEntry>
