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
  type CapitalGainsBreakpoints,
  type ConstantEntry,
  type JointLifeLastSurvivorTable,
  type OrdinaryBracket,
  type RmdAgeBand,
  type UniformLifetimeDivisor,
} from './types'
import { jointLifeLastSurvivorData } from './jointLifeLastSurvivor.data'
import type { TaxVintageV3 } from '@shared/model'

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
    directionalUntilPinned: false,
    pinTo: 'IRS Revenue Procedure (2026 inflation adjustments)',
  },
)

/** 2026 ordinary-income brackets — SINGLE (taxable income). Load-bearing for the
 *  MFJ→single widow(er) penalty (the survivor's same real dollars fall into these
 *  ~half-width brackets). LANDMINE: edges 1–5 are EXACTLY half of the MFJ table, but
 *  the 37% edge ($640,600) is NOT half of MFJ's $768,700 — the 35% single bracket is
 *  much wider than "half of MFJ". Every edge is typed literally; never derive single
 *  by halving MFJ. (MFS shares these lower edges but its 37% edge is $384,350 — also
 *  not this table.) */
export const ordinaryBracketsSingle = sourced<readonly OrdinaryBracket[]>(
  [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: null },
  ],
  {
    citation:
      'IRS Rev. Proc. 2025-32 Table 3 (§1(j)(2)(C)), grounded + adversarially verified against the parsed rp-25-32.pdf + Tax Foundation 2026',
    directionalUntilPinned: false,
    pinTo: 'IRS Revenue Procedure 2025-32 (2026 inflation adjustments) — Table 3, single filers',
    legalBasis: 'OBBBA P.L. 119-21 / H.R.1',
    note: '37% edge $640,600 is NOT ½ of MFJ $768,700 (edges 1–5 are ½); type literally, never halve MFJ.',
  },
)

/** Standard deduction (2026). */
export const standardDeductionMFJ = sourced(32_200, {
  citation: 'findings §Strand 5 (2025 was $31,500, exactly 2× single)',
  directionalUntilPinned: false,
  pinTo: 'IRS Revenue Procedure (2026)',
})

export const standardDeductionSingle = sourced(16_100, {
  citation:
    'IRS Rev. Proc. 2025-32 §.16(1), grounded + adversarially verified against the parsed rp-25-32.pdf + Tax Foundation 2026',
  directionalUntilPinned: false,
  pinTo: 'IRS Revenue Procedure 2025-32 (2026) — §.16(1)',
  note: 'Confirmed exact $16,100 (= ½ MFJ $32,200; 2025 was $15,750). Basic deduction only — the age-65 addition and the senior bonus stack separately.',
})

/** Age-65+ additional standard deduction, per spouse, MFJ (2026). */
export const age65AdditionMFJ = sourced(1_650, {
  citation: 'findings §Strand 5 ("≈ $1,650/spouse MFJ, pin exact")',
  directionalUntilPinned: false,
  pinTo: 'IRS Revenue Procedure (2026)',
})

/** 2026 age-65+ additional standard deduction — SINGLE / Head-of-Household (IRC §63(f)).
 *  Applies in the survivor (single-filing) years. LANDMINE: this is the long-standing
 *  §63(f) age/blindness addition — SEPARATE from and STACKABLE with the OBBBA $6,000
 *  senior bonus (`seniorBonus`); never fold them together. The single figure ($2,050)
 *  is LARGER than the MFJ per-spouse figure ($1,650) — not a 2×/½ relationship, type
 *  both literally. Per-box: a single filer who is 65+ AND blind claims 2 × $2,050. */
export const age65AdditionSingle = sourced(2_050, {
  citation:
    'IRS Rev. Proc. 2025-32 §.16(3) (IRC §63(f)), grounded + adversarially verified against the parsed rp-25-32.pdf + Tax Foundation 2026',
  directionalUntilPinned: false,
  pinTo: 'IRS Revenue Procedure 2025-32 (2026) — §.16(3) / IRC §63(f)',
  note: 'Distinct from the OBBBA $6,000 senior bonus (they stack). Single $2,050 > MFJ per-spouse $1,650. Inflation-indexed (2025 was $2,000).',
})

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
    directionalUntilPinned: false,
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

/**
 * IRS Uniform Lifetime Table (Pub 590-B Table III / Treas. Reg. §1.401(a)(9)-9(c)) —
 * the CURRENT post-2022 table (T.D. 9930, effective for distributions on/after
 * 2022-01-01; the longer-life-expectancy revision). `divisor` is the distribution
 * period: RMD = prior-year-end pre-tax balance ÷ divisor[age in the distribution year].
 *
 * STABLE — mortality-based, NOT inflation-indexed, so 2026 uses the identical table;
 * vintage-stamped to the reg, not a tax year (no annual staleness clock). RMD is
 * NON-CONVERTIBLE: it must be distributed as ordinary income first and cannot be
 * satisfied or reduced by a Roth conversion (a hard legality constraint for U2/U10/U15).
 *
 * LANDMINES: (1) NOT the pre-2022 table (which started at age 70 and had 72 = 25.6) —
 * a ~7% RMD error if confused. (2) Table starts at 72; the 73-start (born 1951–1959)
 * and 75-start (born 1960+, from 2033) cohorts simply never use the earlier rows.
 * (3) Age 120 is the published "120 and over" terminal bucket — clamp any age ≥ 120 to
 * 2.0, never extrapolate. (4) The tail is irregular (113 = 3.1 skips 3.2; 118 = 2.5
 * skips 2.6; 119 = 2.3 skips 2.4) — transcribed exactly, never smoothed.
 */
export const uniformLifetimeTableDivisors = sourced<readonly UniformLifetimeDivisor[]>(
  [
    { age: 72, divisor: 27.4 },
    { age: 73, divisor: 26.5 },
    { age: 74, divisor: 25.5 },
    { age: 75, divisor: 24.6 },
    { age: 76, divisor: 23.7 },
    { age: 77, divisor: 22.9 },
    { age: 78, divisor: 22.0 },
    { age: 79, divisor: 21.1 },
    { age: 80, divisor: 20.2 },
    { age: 81, divisor: 19.4 },
    { age: 82, divisor: 18.5 },
    { age: 83, divisor: 17.7 },
    { age: 84, divisor: 16.8 },
    { age: 85, divisor: 16.0 },
    { age: 86, divisor: 15.2 },
    { age: 87, divisor: 14.4 },
    { age: 88, divisor: 13.7 },
    { age: 89, divisor: 12.9 },
    { age: 90, divisor: 12.2 },
    { age: 91, divisor: 11.5 },
    { age: 92, divisor: 10.8 },
    { age: 93, divisor: 10.1 },
    { age: 94, divisor: 9.5 },
    { age: 95, divisor: 8.9 },
    { age: 96, divisor: 8.4 },
    { age: 97, divisor: 7.8 },
    { age: 98, divisor: 7.3 },
    { age: 99, divisor: 6.8 },
    { age: 100, divisor: 6.4 },
    { age: 101, divisor: 6.0 },
    { age: 102, divisor: 5.6 },
    { age: 103, divisor: 5.2 },
    { age: 104, divisor: 4.9 },
    { age: 105, divisor: 4.6 },
    { age: 106, divisor: 4.3 },
    { age: 107, divisor: 4.1 },
    { age: 108, divisor: 3.9 },
    { age: 109, divisor: 3.7 },
    { age: 110, divisor: 3.5 },
    { age: 111, divisor: 3.4 },
    { age: 112, divisor: 3.3 },
    { age: 113, divisor: 3.1 },
    { age: 114, divisor: 3.0 },
    { age: 115, divisor: 2.9 },
    { age: 116, divisor: 2.8 },
    { age: 117, divisor: 2.7 },
    { age: 118, divisor: 2.5 },
    { age: 119, divisor: 2.3 },
    { age: 120, divisor: 2.0 },
  ],
  {
    citation:
      'IRS Pub 590-B Table III / Treas. Reg. §1.401(a)(9)-9(c), grounded + adversarially verified verbatim against the parsed eCFR 26 CFR 1.401(a)(9)-9(c)',
    directionalUntilPinned: false,
    pinTo: 'IRS Pub 590-B Appendix B Table III (Uniform Lifetime)',
    legalBasis: 'T.D. 9930 (effective 2022-01-01)',
    note: 'Post-2022 table, STABLE (not inflation-indexed). Clamp age ≥ 120 → 2.0. RMD is non-convertible.',
  },
)

/** The Joint Life & Last Survivor Table (Pub 590-B Table II / Treas. Reg.
 *  §1.401(a)(9)-9(d)) — SOURCED (M6b). Used for an owner's lifetime RMD ONLY when the
 *  spouse is the SOLE beneficiary the ENTIRE year AND is MORE THAN 10 years younger
 *  (gap ≥ 11; exactly-10-younger stays on the Uniform Lifetime Table, which already
 *  bakes in a hypothetical 10-yr-younger beneficiary). The grid is SYMMETRIC (cell(a,b)
 *  = cell(b,a)) and RE-ENTERED by both ages every year for the owner's lifetime RMD (NOT
 *  the inherited "subtract-one" method). A LARGER divisor → a SMALLER RMD: using the
 *  Uniform Lifetime Table for a >10yr-younger sole spouse OVERSTATES forced income and
 *  can INVERT a sequencing/conversion ranking (a disclosed-omission flip).
 *
 *  PROVENANCE + VERIFICATION live in the data module header
 *  ({@link ./jointLifeLastSurvivor.data}): transcribed verbatim from the authoritative
 *  eCFR §1.401(a)(9)-9(d) XML (DND/012 — never computed from the engine's own actuarial
 *  formula), cross-verified vs IRS Pub 590-B Table II (2,626/2,627 cells; the lone
 *  (90,76) disagreement resolved to the reg's 14.7), with full symmetry + the
 *  JLLS(age,age-10)==Uniform-Lifetime(age) identity + the documented anchors
 *  (75/64=25.3, 76/60=28.2) all asserted as a golden in `taxOverlay.test.ts`. The
 *  reachable owner-72..120 × younger-spouse rectangle only; ages ≥ 120 clamp (DND/009).
 *  Stays `directionalUntilPinned` with the other tax figures until the P1-exit pin pass
 *  (don't flip piecemeal) — though sourced directly from the legal primary. */
export const jointLifeLastSurvivorTable = sourced<JointLifeLastSurvivorTable>(jointLifeLastSurvivorData, {
  citation:
    'eCFR 26 CFR 1.401(a)(9)-9(d) (authoritative reg, machine-readable GPO XML), cross-verified verbatim vs IRS Pub 590-B Table II',
  directionalUntilPinned: false,
  pinTo: 'IRS Pub 590-B Appendix B Table II (Joint Life & Last Survivor)',
  legalBasis: 'T.D. 9930 (effective 2022-01-01)',
  note: 'Post-2022 table, STABLE (not inflation-indexed). Owner×younger-spouse rectangle (gap ≥ 11). Clamp age ≥ 120. RMD is non-convertible.',
})

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

/** 2026 long-term capital-gains / qualified-dividend rate breakpoints (§1(h)) — the
 *  preferential 0/15/20% schedule, by filing status. Thresholds are TOTAL taxable
 *  income; the gain STACKS on top of ordinary income (fill the ordinary brackets first,
 *  then the gain sits on top), so a couple with large RMDs + SS + conversions can blow
 *  past the 0% ceiling even on a small gain — compute the gain's rate from total taxable
 *  income, never the gain alone. 20% applies above `fifteenRateUpTo`.
 *
 *  LANDMINES: (1) do NOT derive single from MFJ by halving — the 0% single top ($49,450)
 *  IS half MFJ, but the 15% single top ($545,500) is NOT half MFJ ($613,700). (2) On the
 *  first death the survivor flips MFJ→single and the 0% ceiling drops $98,900 → $49,450
 *  (a real lever effect). (3) NIIT (3.8%) is a separate surtax (`niit`), not part of
 *  these edges. (MFS, out of scope, is exactly half MFJ: $49,450 / $306,850.) */
export const capitalGainsBreakpoints = sourced<CapitalGainsBreakpoints>(
  {
    single: { zeroRateUpTo: 49_450, fifteenRateUpTo: 545_500 },
    mfj: { zeroRateUpTo: 98_900, fifteenRateUpTo: 613_700 },
  },
  {
    citation:
      'IRS Rev. Proc. 2025-32 §4.03 (§1(h) maximum capital-gains rate), grounded + adversarially verified against the parsed rp-25-32.pdf + Tax Foundation 2026 Table 6',
    directionalUntilPinned: false,
    pinTo: 'IRS Revenue Procedure 2025-32 (2026) — §4.03 (§1(h))',
    note: 'Total-taxable-income thresholds; gain stacks on ordinary income. Single 15%-top is NOT ½ MFJ. Survivor MFJ→single drops the 0% ceiling $98,900→$49,450.',
  },
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

/** The CURRENT build's tax vintage stamp (P3·U13 — the controls-surface clock; the
 *  healthcareVintageStamp mirror). Keyed on the two things a real statutory/table change
 *  moves: the table year and the legal-basis sentence VERBATIM (any wording change is a
 *  vintage bump — the `acaStatus` precedent). The save path writes it fresh
 *  (`scenarioFromDraft`); U13's staleness comparator diffs a persisted stamp against THIS
 *  at unlock. RMD-age rule + senior-bonus sunset are deliberately NOT here — they are
 *  birth-year/calendar-DERIVED communication notes against the live constants (already
 *  deterministic inside the engine), never stamp-compares. */
export function taxVintageStamp(): TaxVintageV3 {
  return {
    taxYear: TAX_YEAR,
    legalBasis: legalBasis.value,
  }
}

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
  jointLifeLastSurvivorTable,
  ssProvisionalThresholds,
  capitalGainsBreakpoints,
  mfjToSingleTransition,
  niit,
  stateIncomeTax,
  inOutRule,
} satisfies Record<string, ConstantEntry>
