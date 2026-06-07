/**
 * 2026 income-aware healthcare constants (pre65-healthcare-aca-hsa doc). ACA-PTC
 * (pre-65), IRMAA (post-65), HSA (the 4th bucket). Each figure is `Sourced` with
 * its citation + directional marker.
 *
 * The spine reads NOTHING from here; only the healthcare overlay (U3) consumes it.
 */
import {
  sourced,
  type ConstantEntry,
  type AcaApplicablePercentageTable,
  type FederalPovertyGuidelines,
  type IrmaaSchedule,
} from './types'

export const COVERAGE_YEAR = 2026

/**
 * THE load-bearing pre-65 fact. Enhanced ARPA/IRA subsidies EXPIRED 2025-12-31;
 * 2026 reverted to the pre-ARPA cliff regime. A House extension passed 2026-01-08
 * but stalled in the Senate and is NOT enacted as of the verified date — possibly
 * retroactive if restored. This flips the entire pre-65 calculus and can invert
 * which strategy wins, so it is re-verified at EVERY build (the CI
 * aca-last-verified.json gate enforces this) and BLOCKS all pre-65 ACA fixtures.
 */
export const acaEnhancedSubsidyStatus = sourced(
  {
    enhancedExpired: '2025-12-31',
    regime2026: 'reverted to pre-ARPA (400% FPL cliff back; higher contribution %s)',
    pendingExtension:
      'House passed a 3-yr extension 2026-01-08 (230–196); stalled in Senate; NOT enacted as of 2026-06-04; possibly retroactive to 2026 if restored',
    verifiedOn: '2026-06-04',
  },
  {
    citation: 'pre65-healthcare doc',
    directionalUntilPinned: true,
    pinTo: 'enacted statute / IRS notice — re-verify at EVERY build',
    reVerifyEveryBuild: true,
    note: 'Model cliff-on/reverted as the 2026 base; expose enhanced as a scenario toggle; NEVER hard-code "no enhanced subsidies forever."',
  },
)

/** ACA applicable-percentage sliding scale + the PTC eligibility window (2026
 *  reverted / pre-ARPA regime). Each band's applicable % is LINEARLY interpolated;
 *  the 400% subsidy cliff is BACK for 2026. Read verbatim from IRS Rev. Proc.
 *  2025-25 §3.01 and cross-verified against an independent secondary; the only
 *  previously-missing value was the 133%-band lower bound (3.14%). LEGISLATIVELY
 *  GATED (reVerifyEveryBuild) — if the enhanced subsidies are restored, the cliff
 *  disappears and the whole scale changes. */
export const acaApplicablePercentage = sourced<AcaApplicablePercentageTable>(
  {
    bands: [
      { fplFractionLow: 0, fplFractionHigh: 1.33, applicablePctLow: 2.1, applicablePctHigh: 2.1 },
      { fplFractionLow: 1.33, fplFractionHigh: 1.5, applicablePctLow: 3.14, applicablePctHigh: 4.19 },
      { fplFractionLow: 1.5, fplFractionHigh: 2.0, applicablePctLow: 4.19, applicablePctHigh: 6.6 },
      { fplFractionLow: 2.0, fplFractionHigh: 2.5, applicablePctLow: 6.6, applicablePctHigh: 8.44 },
      { fplFractionLow: 2.5, fplFractionHigh: 3.0, applicablePctLow: 8.44, applicablePctHigh: 9.96 },
      { fplFractionLow: 3.0, fplFractionHigh: 4.0, applicablePctLow: 9.96, applicablePctHigh: 9.96 },
    ],
    cliffFplFraction: 4.0,
    eligibilityFloorFplFraction: 1.0,
  },
  {
    citation:
      'IRS Rev. Proc. 2025-25 §3.01 (rp-25-25.pdf, read verbatim cell-by-cell) + secondary cross-verified (currentfederaltaxdevelopments.com; healthinsurance.org) — zero disagreement',
    directionalUntilPinned: true,
    pinTo: 'IRS Rev. Proc. 2025-25 §3.01 (irs.gov/pub/irs-drop/rp-25-25.pdf)',
    reVerifyEveryBuild: true,
    note: '2026 REVERTED regime (vs 0–8.5% enhanced 2021–2025). Applicable % is LINEARLY interpolated within each FPL band; the 400% subsidy cliff is BACK (PTC = 0 strictly above 400% FPL). PTC eligibility floor = 100% FPL (below = Medicaid, OUT-but-disclosed, state-dependent). The FPL% denominator for 2026 coverage uses the 2025 HHS guidelines (prior-year).',
  },
)

/** 2025 HHS Federal Poverty Guidelines (48 contiguous states + DC) — the table ACA
 *  uses for the 2026 COVERAGE year (the prior-year guidelines apply). A household of
 *  N = base + (N − 1) × perAdditionalPerson. The 400% cliff DOLLAR is DERIVED
 *  (4.0 × FPL(householdSize)), never re-typed — e.g. household-of-2 = $21,150 →
 *  cliff $84,600 exactly. Alaska/Hawaii have separate higher tables (OUT-but-disclosed). */
export const federalPovertyGuidelines = sourced<FederalPovertyGuidelines>(
  { guidelineYear: 2025, base: 15_650, perAdditionalPerson: 5_500 },
  {
    citation:
      '2025 HHS Poverty Guidelines, 48 contiguous + DC (ASPE computations table + Federal Register, cross-verified); base + uniform $5,500 increment reconstruct all household sizes exactly',
    directionalUntilPinned: true,
    pinTo: 'HHS 2025 Poverty Guidelines (Federal Register, ~Jan 2025)',
    note: '2025 guidelines drive 2026 ACA coverage-year eligibility (prior-year FPL). household(N) = 15,650 + (N−1)×5,500; household-of-2 = 21,150; 400% = 84,600 (DERIVED, not stored). AK/HI separate higher tables OUT-but-disclosed.',
  },
)

/** ACA-PTC formula + SLCSP handling. SLCSP is a USER INPUT / age-banded
 *  assumption — NOT solved (ZIP/age-specific; the single biggest honesty lever). */
export const acaPtc = sourced(
  {
    formula: 'PTC = benchmark SLCSP premium − (applicable % × MAGI); PTC = 0 if MAGI > 400% FPL (cliff, 2026)',
    slcspIsUserInput: true,
  },
  {
    citation: 'pre65-healthcare doc; IRC §36B',
    directionalUntilPinned: true,
    pinTo: 'IRS Pub 974 / Form 8962 instructions (+ IRC §36B)',
    note: 'SLCSP = second-lowest-cost Silver plan in the rating area; taken in advance as APTC, reconciled on Form 8962. Do NOT synthesize SLCSP — it is OUT-but-disclosed as a level; the engine optimizes around it.',
  },
)

/** IRMAA — the income surcharge on Medicare Part B & D. 2026 surcharges are set by
 *  2024 MAGI (a 2-year lookback). A HARD step-function (per person): $1 over a tier
 *  threshold → that tier's FULL surcharge. The standard Part B premium lives in
 *  `partB2026` (single-sourced); per-tier TOTALS are derived (base + surcharge),
 *  never re-typed. Cross-verified vs CMS + The Finance Buff + an internal cost-share
 *  identity (Part B total = {25/35/50/65/80/85}% × full cost). MFJ thresholds = 2×
 *  single for tiers 1–4; the frozen top tier deliberately breaks it (750k ≠ 2×500k). */
export const irmaa = sourced<IrmaaSchedule>(
  {
    magiLookbackYears: 2,
    tiers: [
      { singleMagiThreshold: 109_000, mfjMagiThreshold: 218_000, partBSurchargeMonthly: 81.2, partDSurchargeMonthly: 14.5 },
      { singleMagiThreshold: 137_000, mfjMagiThreshold: 274_000, partBSurchargeMonthly: 202.9, partDSurchargeMonthly: 37.5 },
      { singleMagiThreshold: 171_000, mfjMagiThreshold: 342_000, partBSurchargeMonthly: 324.6, partDSurchargeMonthly: 60.4 },
      { singleMagiThreshold: 205_000, mfjMagiThreshold: 410_000, partBSurchargeMonthly: 446.3, partDSurchargeMonthly: 83.3 },
      { singleMagiThreshold: 500_000, mfjMagiThreshold: 750_000, partBSurchargeMonthly: 487.0, partDSurchargeMonthly: 91.0 },
    ],
    perPerson: true,
    topTierFrozenThrough: 2027,
    rothConversionIsSsa44LifeChangingEvent: false,
  },
  {
    citation:
      'CMS "2026 Medicare Parts A & B Premiums and Deductibles" fact sheet + the 2026 Part D IRMAA release (Nov 2025), cross-verified vs The Finance Buff (computing from CMS) + an internal cost-share identity — zero disagreement',
    directionalUntilPinned: true,
    pinTo: 'CMS 2026 IRMAA fact sheet / Federal Register notice; IRMAA-MAGI per SSA / 1040',
    note: '2026 IRMAA set by 2024 MAGI (2-yr lookback). Per person (a couple both enrolled pays ×2). Lower-bound-EXCLUSIVE thresholds ($1 over → full tier). First four thresholds inflation-index annually; the top tier (≥$500k single / ≥$750k MFJ) is frozen through 2027, re-indexes 2028. A voluntary Roth conversion is NOT an SSA-44 life-changing event. MFS uses single thresholds then one step at $391k (OUT — couple model only).',
  },
)

/** 2026 Medicare Part B standard premium + deductible (per person). */
export const partB2026 = sourced(
  { standardPremiumMonthly: 202.9, annualDeductible: 283 },
  {
    citation: 'pre65-healthcare doc; CMS fact sheet 2025-11-14',
    directionalUntilPinned: true,
    pinTo: 'CMS fact sheet (Nov 2025) / Federal Register',
    note: 'Per person — a couple both enrolled pays ~$405.80/mo at the standard rate (before IRMAA).',
  },
)

/** 2026 Medicare Part A purchased premiums + deductible (pin only if the tool
 *  models post-65 Part A spend). */
export const partA2026 = sourced(
  { purchasedPremiumsMonthly: [311, 565] as const, annualDeductible: 1_736 },
  {
    citation: 'pre65-healthcare doc (grounded summary, not primary)',
    directionalUntilPinned: true,
    pinTo: 'CMS 2026 Part A fact sheet',
    note: 'MEDIUM confidence; pin only if modeling post-65 Part A spend.',
  },
)

/** TWO distinct MAGI calculators — ACA-MAGI ≠ IRMAA-MAGI (mandatory). */
export const magiDefinitions = sourced(
  {
    acaMagi: 'AGI + tax-exempt (muni) interest + non-taxable portion of Social Security + excluded foreign earned income',
    irmaaMagi: 'AGI + tax-exempt interest (does NOT add back non-taxable Social Security)',
    leverNote:
      'Roth conversion income, traditional withdrawals, cap gains, taxable interest/dividends raise both MAGIs dollar-for-dollar; qualified Roth distributions are MAGI-invisible (the lever); return of basis counts only the gain.',
  },
  {
    citation: 'pre65-healthcare doc',
    // Directional until pinned: a grounded synthesis (not read verbatim) with a live
    // pinTo and a healthcare exit-gate item — matches acaPtc's provenance grade.
    directionalUntilPinned: true,
    pinTo: 'IRS Pub 974 / Form 8962 (ACA); SSA / 1040 (IRMAA)',
    note: 'The engine needs two separate MAGI calculators; the full SS benefit effectively counts for ACA but not IRMAA. Confirm the non-taxable-SS add-back wording on Form 8962 (exit gate).',
  },
)

/** HSA contribution limits + HDHP thresholds (2026). */
export const hsa2026 = sourced(
  {
    contributionSelfOnly: 4_400,
    contributionFamily: 8_750,
    hdhpMinDeductible: { selfOnly: 1_700, family: 3_400 },
    maxOutOfPocket: { selfOnly: 8_500, family: 17_000 },
    catchUp55Plus: 1_000,
  },
  {
    citation: 'pre65-healthcare doc; IRS Rev. Proc. 2025-19',
    directionalUntilPinned: true,
    pinTo: 'IRS Rev. Proc. 2025-19 (rp-25-19.pdf)',
    note: 'Catch-up (55+) is +$1,000 in EACH spouse’s OWN HSA (cannot stack in one account).',
  },
)

/** HSA "4th bucket" rules (eligibility + qualified-premium traps; Pub 969 verbatim). */
export const hsaFourthBucketRules = sourced(
  {
    medicareZeroesContribution: true,
    sixMonthPartARetroactiveLookback: true,
    acaMarketplacePremiumsAreQualified: false,
    qualifiedPremiumExceptions: ['long-term care', 'COBRA', 'while on unemployment comp', 'Medicare & other 65+ coverage except Medigap'],
    penaltyWaivedAt65: true,
    medicarePremiumPrivilegeKeyedToOwnerAge: true,
    magiInvisible: true,
  },
  {
    citation: 'pre65-healthcare doc; IRS Pub 969 (read verbatim 2026-06-04); IRC §223',
    directionalUntilPinned: false,
    pinTo: 'IRS Pub 969 (confirm 2026 edition)',
    note: 'THE TRAP: a pre-65 Marketplace early retiree’s HSA covers OOP tax-free but NOT the monthly premium (unless on unemployment comp or COBRA). After 65 the 20% penalty is waived (behaves like a Traditional IRA). HSA spending counts toward neither ACA-MAGI nor IRMAA-MAGI.',
  },
)

/** OBBBA HSA provisions (2026) — mostly OUT/disclosed. */
export const obbbaHsa2026 = sourced(
  {
    bronzeAndCatastrophicHsaCompatibleFrom: '2026-01-01',
    telehealthPreDeductibleSafeHarborPermanent: true,
    directPrimaryCareFeesEligibleUpTo: { selfOnly: 150, family: 300 },
  },
  {
    citation: 'pre65-healthcare doc (advisory sources; statute not read)',
    directionalUntilPinned: true,
    pinTo: 'enacted H.R.1 text / IRS implementing notice',
    legalBasis: 'OBBBA H.R.1',
    note: 'Bronze/Catastrophic HSA-compatibility expands WHO can contribute; it does NOT make ACA premiums HSA-payable.',
  },
)

/** The full health table — also the iteration surface for the shape test. */
export const healthConstants = {
  acaEnhancedSubsidyStatus,
  acaApplicablePercentage,
  federalPovertyGuidelines,
  acaPtc,
  irmaa,
  partB2026,
  partA2026,
  magiDefinitions,
  hsa2026,
  hsaFourthBucketRules,
  obbbaHsa2026,
} satisfies Record<string, ConstantEntry>
