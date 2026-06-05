/**
 * 2026 tax constants (findings §Strand 5). Each figure is `Sourced` with its
 * citation + directional marker; figures the research names but does not value
 * are `Unsourced` sentinels (read → throw, burned/062).
 *
 * NOTE: the validated MC spine reads NOTHING from this module (the spine is
 * tax-free); only the tax overlay (U2) consumes it — so a constants change can
 * never perturb a Trinity/Bengen golden case (the reduce-to-spine invariant).
 */
import {
  sourced,
  unsourced,
  type ConstantEntry,
  type OrdinaryBracket,
  type RmdAgeBand,
} from './types'

export const TAX_YEAR = 2026

/** Legal-basis stamp — OBBBA made the TCJA rate structure PERMANENT, so 2026 is
 *  NOT a sunset reversion. Stamped so a future statutory change reads as a vintage
 *  bump, not silent inflation drift. */
export const legalBasis = sourced('OBBBA — One Big Beautiful Bill Act, signed 2025-07-04', {
  citation: 'findings §Strand 5',
  directionalUntilPinned: false,
  legalBasis: 'OBBBA P.L. 119-21 / H.R.1',
  note: 'Made TCJA brackets (10/12/22/24/32/35/37) + the elevated standard deduction permanent.',
})

/** 2026 ordinary-income brackets — MFJ (taxable income). */
export const ordinaryBracketsMFJ = sourced<readonly OrdinaryBracket[]>(
  [
    { rate: 0.1, upTo: 24_800 },
    { rate: 0.12, upTo: 100_800 },
    { rate: 0.22, upTo: 211_400 },
    { rate: 0.24, upTo: 403_550 },
    { rate: 0.32, upTo: 512_450 },
    { rate: 0.35, upTo: 768_700 },
    { rate: 0.37, upTo: null },
  ],
  {
    citation: 'findings §Strand 5 (Tax Foundation 2026 tables)',
    directionalUntilPinned: true,
    pinTo: 'IRS Revenue Procedure (2026 inflation adjustments)',
  },
)

/** GAP — single ordinary brackets are IN scope but the research gives no dollar
 *  table (only "~half-width of MFJ"). Must be sourced before the MFJ→single
 *  survivor transition (U2) is anything but directional. */
export const ordinaryBracketsSingle = unsourced(
  'IRS Revenue Procedure (2026) — single ordinary-income brackets',
  'Single brackets are ~half-width of MFJ but the exact dollar table was not in the research; load-bearing for the MFJ→single widow(er) penalty.',
)

/** Standard deduction (2026). */
export const standardDeductionMFJ = sourced(32_200, {
  citation: 'findings §Strand 5 (2025 was $31,500, exactly 2× single)',
  directionalUntilPinned: true,
  pinTo: 'IRS Revenue Procedure (2026)',
})

export const standardDeductionSingle = sourced(16_100, {
  citation: 'findings §Strand 5 (≈ half MFJ; "pin exact")',
  directionalUntilPinned: true,
  pinTo: 'IRS Revenue Procedure (2026)',
  note: 'Approximate (≈ half MFJ) — confirm exact.',
})

/** Age-65+ additional standard deduction, per spouse, MFJ (2026). */
export const age65AdditionMFJ = sourced(1_650, {
  citation: 'findings §Strand 5 ("≈ $1,650/spouse MFJ, pin exact")',
  directionalUntilPinned: true,
  pinTo: 'IRS Revenue Procedure (2026)',
})

/** GAP — the single-filer age-65 addition was not given (typically larger than the
 *  MFJ per-person figure). Needed for the survivor (single) years. */
export const age65AdditionSingle = unsourced(
  'IRS Revenue Procedure (2026) — single age-65 additional standard deduction',
  'Not given in the research; typically larger than the MFJ per-person figure; applies in the survivor (single-filing) years.',
)

/**
 * Temporary Senior Bonus Deduction (OBBBA): $6,000 per person age 65+ ($12,000
 * MFJ), on top of the standard deduction, with a MAGI phase-out and a 2028 sunset.
 * LANDMINE: the "fully gone" ceiling depends on HOW MANY spouses are 65+ — a flat
 * "$250k" is the one-spouse case only and overstates tax / understates conversion
 * + IRMAA headroom in the $250k–$350k band.
 */
export const seniorBonus = sourced(
  {
    perPerson65Plus: 6_000,
    phaseOutStart: { single: 75_000, mfj: 150_000 },
    phaseOutRatePerDollar: 0.06,
    fullyGoneAbove: { single: 175_000, mfjOneSpouse65: 250_000, mfjBothSpouses65: 350_000 },
  },
  {
    citation: 'findings §Strand 5; IRS FS-2025-03',
    directionalUntilPinned: true,
    pinTo: 'IRS FS-2025-03 / OBBBA H.R.1',
    legalBasis: 'OBBBA P.L. 119-21 / H.R.1',
    sunsetAfter: 2028,
    note: 'Available tax years 2025–2028 only. Use mfjBothSpouses65=$350k when both are 65+; the flat $250k is the one-spouse case.',
  },
)

/** RMD start age, keyed by birth-year cohort (SECURE 2.0). Never a flat 73. */
export const rmdStartAge = sourced<readonly RmdAgeBand[]>(
  [
    { bornThrough: 1950, age: 72 },
    { bornThrough: 1959, age: 73 },
    { bornThrough: null, age: 75, effectiveFrom: 2033 },
  ],
  {
    citation: 'findings §Strand 5; SECURE 2.0 / IRS Pub 590-B',
    directionalUntilPinned: false,
    legalBasis: 'SECURE 2.0',
    note: 'The 1959 drafting glitch resolves to 73 (current interpretation). First RMD due by April 1 of the year after reaching RMD age. The age-75 step is effective 2033.',
  },
)

/** GAP — the IRS Uniform Lifetime Table divisors (per age) are not in the research,
 *  only named. ALSO must encode the Joint Life & Last Survivor table for a sole-
 *  beneficiary spouse >10 years younger (yields a smaller RMD; flat Uniform
 *  Lifetime overstates forced income for the age-gapped couples this tool models). */
export const uniformLifetimeTableDivisors = unsourced(
  'IRS Pub 590-B — Uniform Lifetime Table (+ Joint Life & Last Survivor Table)',
  'Per-age divisors not given. Encode BOTH tables + the >10yr-younger-sole-spouse switch. RMD is non-convertible (must be distributed as ordinary income first; cannot be satisfied/reduced by a Roth conversion).',
)

/**
 * Social Security provisional-income taxation thresholds. FROZEN since 1983/1993 —
 * NOT inflation-indexed, so NO staleness clock (a frozen constant cannot go stale).
 * Provisional income = AGI excluding SS + tax-exempt interest + 50% of SS benefits.
 * Resolve taxable-SS as a per-year bounded FIXED-POINT (provisional → taxable-SS →
 * tax → gross-up → re-converge); reads zero random draws (CRN-safe).
 */
export const ssProvisionalThresholds = sourced(
  {
    mfj: { fiftyPctOver: 32_000, eightyFivePctOver: 44_000 },
    single: { fiftyPctOver: 25_000, eightyFivePctOver: 34_000 },
  },
  {
    citation: 'findings §Strand 5; IRS Pub 915',
    directionalUntilPinned: false,
    note: 'Thresholds firm-frozen. Exact inclusion follows the Pub 915 worksheet (not a flat bracket multiply) — that worksheet is directional until pinned.',
  },
)

/** GAP — capital-gains / qualified-dividend rate breakpoints (0/15/20%) are IN
 *  scope (stacked on ordinary income) but no dollar figures were given. */
export const capitalGainsBreakpoints = unsourced(
  'IRS Revenue Procedure (2026) — 0/15/20% LTCG / qualified-dividend breakpoints',
  'Cap-gains/QD stacking is IN scope (separate rate schedule stacked on ordinary income); the breakpoint dollars were not in the research.',
)

/** MFJ → single filing transition at the first death (no QSS grace for the
 *  empty-nest couple this tool models). Same boundary as the joint→survivor
 *  two-regime split the spine already models — NOT a new boundary. */
export const mfjToSingleTransition = sourced(
  { deathYearFilesMFJ: true, yearAfterFilesSingle: true, qssGraceWithoutDependentChild: false },
  {
    citation: 'findings §Strand 5; IRS Pub 501',
    directionalUntilPinned: false,
    note: "QSS MFJ-equivalent rates need a dependent child in the home — the empty-nest couple almost never has one. Survivor's same real dollars fall into ~half-width single brackets with ~half the standard deduction.",
  },
)

/** NIIT — OUT but disclosed (neither sequencing nor conversion moves it; it only
 *  blunts a delta, never inverts a ranking). */
export const niit = sourced(
  { rate: 0.038, status: 'OUT-but-disclosed' as const },
  {
    citation: 'findings §Strand 5',
    directionalUntilPinned: false,
    note: 'Disclosed adjacent to the delta as a candidate future lever; never silently dropped.',
  },
)

/** State income tax — OUT but disclosed (a parallel system neither control moves). */
export const stateIncomeTax = sourced(
  { status: 'OUT-but-disclosed' as const },
  {
    citation: 'findings §Strand 5',
    directionalUntilPinned: false,
    note: 'Configurable context; neither sequencing nor conversion moves it.',
  },
)

/** The falsifiable IN/OUT rule that governs the whole module's scope. */
export const inOutRule = sourced(
  'A tax/health effect is IN iff withdrawal sequencing or a Roth conversion can move it.',
  {
    citation: 'findings §Strand 5 banner',
    directionalUntilPinned: false,
    note: 'IN: ordinary brackets, standard deduction, RMDs, SS-taxation, MFJ→single, ACA-PTC (pre-65), IRMAA (post-65), cap-gains/QD stacking, and the lever-sensitive §1014/IRD heir-tax adjustment (leave-more). OUT-but-disclosed: NIIT, state.',
  },
)

/** The full tax table — also the iteration surface for the shape test. */
export const taxConstants = {
  legalBasis,
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  standardDeductionMFJ,
  standardDeductionSingle,
  age65AdditionMFJ,
  age65AdditionSingle,
  seniorBonus,
  rmdStartAge,
  uniformLifetimeTableDivisors,
  ssProvisionalThresholds,
  capitalGainsBreakpoints,
  mfjToSingleTransition,
  niit,
  stateIncomeTax,
  inOutRule,
} satisfies Record<string, ConstantEntry>
