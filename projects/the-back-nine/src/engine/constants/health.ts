/**
 * 2026 income-aware healthcare constants (pre65-healthcare-aca-hsa doc). ACA-PTC
 * (pre-65), IRMAA (post-65), HSA (the 4th bucket). Each figure is `Sourced` with
 * its citation + directional marker.
 *
 * The spine reads NOTHING from here; only the healthcare overlay (U3) consumes it.
 */
import { sourced, type ConstantEntry } from './types'

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

/** ACA applicable-percentage sliding scale (2026 reverted regime). */
export const acaApplicablePercentage = sourced(
  { scaleLowPct: 2.1, scaleHighPct: 9.96, interiorEndpointsPct: [2.1, 4.19, 6.6, 8.44, 9.96] as const },
  {
    citation: 'pre65-healthcare doc; IRS Rev. Proc. 2025-25',
    directionalUntilPinned: true,
    pinTo: 'IRS Rev. Proc. 2025-25 (rp-25-25.pdf)',
    reVerifyEveryBuild: true,
    note: 'Reverted/cliff regime for 2026 (vs 0–8.5% enhanced 2021–2025). Confirm every bracket-edge decimal; sliding by FPL band.',
  },
)

/** 400% FPL subsidy cliff (back for 2026): $1 over → loss of ALL premium tax
 *  credits. Household-of-2 ≈ $84,600 (a rounded approximation, NOT from the HHS
 *  primary). 2026 coverage uses the 2025 HHS poverty guidelines. */
export const aca400FplCliff = sourced(
  { householdOf2Approx: 84_600, fplBasisYear: 2025, note: 'AK/HI higher' },
  {
    citation: 'pre65-healthcare doc (rounded; not the HHS table)',
    directionalUntilPinned: true,
    pinTo: 'HHS 2025 Poverty Guidelines (Federal Register)',
    reVerifyEveryBuild: true,
    note: 'Also need 100% / 138% / 400% FPL thresholds for household-of-2. Coverage-year eligibility uses the prior year’s FPL (2026 coverage → 2025 FPL).',
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

/** IRMAA — income surcharge on Medicare Part B & D. 2-year MAGI lookback; per-
 *  person hard cliffs (a couple pays it ×enrolled count). */
export const irmaa = sourced(
  {
    lagYears: 2,
    firstTier: { single: 109_000, mfj: 218_000 },
    partBSurchargeMonthlyRange: [284.1, 689.9] as const,
    partDSurchargeMonthlyRange: [14.5, 91.0] as const,
    perPerson: true,
    topTierFrozenThrough: 2027,
    rothConversionIsSsa44LifeChangingEvent: false,
  },
  {
    citation: 'pre65-healthcare doc; CMS/SSA',
    directionalUntilPinned: true,
    pinTo: 'CMS IRMAA fact sheet / Federal Register; IRMAA-MAGI per SSA / 1040',
    note: '2026 IRMAA set by 2024 MAGI. Step-function: $1 over → full surcharge for that bracket. First four brackets inflation-indexed; top tier (≥$500k single / ≥$750k MFJ) frozen through 2027, adjusts 2028. A voluntary Roth conversion cannot be appealed away (NOT a life-changing event); retirement/work-stoppage IS.',
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
  aca400FplCliff,
  acaPtc,
  irmaa,
  partB2026,
  partA2026,
  magiDefinitions,
  hsa2026,
  hsaFourthBucketRules,
  obbbaHsa2026,
} satisfies Record<string, ConstantEntry>
