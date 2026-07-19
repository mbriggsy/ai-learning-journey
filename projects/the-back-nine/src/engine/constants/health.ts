/**
 * 2026 income-aware healthcare constants (pre65-healthcare doc). ACA-PTC
 * (pre-65), IRMAA (post-65), HSA (the 4th bucket). Each figure is `Sourced` with
 * its citation + directional marker.
 *
 * The spine reads NOTHING from here; only the healthcare overlay (U3) consumes it.
 */
import {
  sourced,
  type AcaAgeRatingCurve,
  type ConstantEntry,
  type AcaApplicablePercentageTable,
  type FederalPovertyGuidelines,
  type IrmaaSchedule,
  type MedicareCostTrendTable,
} from './types'
import type { HealthcareVintageV3 } from '@shared/model'

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
      'House passed a 3-yr extension 2026-01-08 (230–196); stalled in Senate (a prior attempt, S 3385, failed cloture); NOT enacted as of 2026-07-03; possibly retroactive to 2026 if restored',
    verifiedOn: '2026-07-03',
  },
  {
    citation: 'pre65-healthcare doc',
    directionalUntilPinned: false,
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
    directionalUntilPinned: false,
    pinTo: 'IRS Rev. Proc. 2025-25 §3.01 (irs.gov/pub/irs-drop/rp-25-25.pdf)',
    reVerifyEveryBuild: true,
    note: '2026 REVERTED regime (vs 0–8.5% enhanced 2021–2025). Applicable % is LINEARLY interpolated within each FPL band; the 400% subsidy cliff is BACK (PTC = 0 strictly above 400% FPL). PTC eligibility floor = 100% FPL (below = Medicaid, OUT-but-disclosed, state-dependent). The FPL% denominator for 2026 coverage uses the 2025 HHS guidelines (prior-year).',
  },
)

/** ACA applicable-percentage sliding scale for the ARPA/IRA ENHANCED regime (the 2021–2025
 *  temporary percentages — the SCENARIO TOGGLE, NOT the 2026 base case). Read verbatim from IRC
 *  §36B(b)(3)(A)(iii) (added by ARPA 2021 §9661, extended by IRA 2022 §12001) and cross-verified
 *  against KFF / healthinsurance.org / IRS. Two structural differences from the reverted table:
 *  (1) the percentages are FIXED, not inflation-indexed (clause (ii) "shall not apply"); (2) there
 *  is NO 400% cliff — above 400% FPL the contribution is capped at a flat 8.5% (the open top band,
 *  `fplFractionHigh: null`), so `cliffFplFraction` is null. LEGISLATIVELY GATED (reVerifyEveryBuild):
 *  the 2026 extension is pending and possibly retroactive — this is the regime the engine toggles. */
export const acaApplicablePercentageEnhanced = sourced<AcaApplicablePercentageTable>(
  {
    bands: [
      { fplFractionLow: 0, fplFractionHigh: 1.5, applicablePctLow: 0, applicablePctHigh: 0 },
      { fplFractionLow: 1.5, fplFractionHigh: 2.0, applicablePctLow: 0, applicablePctHigh: 2.0 },
      { fplFractionLow: 2.0, fplFractionHigh: 2.5, applicablePctLow: 2.0, applicablePctHigh: 4.0 },
      { fplFractionLow: 2.5, fplFractionHigh: 3.0, applicablePctLow: 4.0, applicablePctHigh: 6.0 },
      { fplFractionLow: 3.0, fplFractionHigh: 4.0, applicablePctLow: 6.0, applicablePctHigh: 8.5 },
      { fplFractionLow: 4.0, fplFractionHigh: null, applicablePctLow: 8.5, applicablePctHigh: 8.5 },
    ],
    cliffFplFraction: null,
    eligibilityFloorFplFraction: 1.0,
  },
  {
    citation:
      'IRC §36B(b)(3)(A)(iii) (ARPA 2021 §9661, extended by IRA 2022 §12001), read verbatim from Cornell LII (law.cornell.edu/uscode/text/26/36B) + cross-verified vs KFF / healthinsurance.org / IRS (gemini-grounding) — zero disagreement; clause (ii) indexing does NOT apply (fixed statutory percentages)',
    directionalUntilPinned: false,
    pinTo: 'IRC §36B(b)(3)(A)(iii) — the enacted ARPA/IRA statute (+ any 2026 extension notice)',
    reVerifyEveryBuild: true,
    legalBasis: 'ARPA 2021 §9661; IRA 2022 §12001',
    note: 'The 2021–2025 ENHANCED regime — the scenario TOGGLE; the 2026 base case is the reverted/cliff-on `acaApplicablePercentage`. Percentages are FIXED (clause (ii) indexing does NOT apply). NO 400% cliff: the open top band (fplFractionHigh null) caps the contribution at a flat 8.5% above 400% FPL. The pending 2026 extension is possibly retroactive — never hard-code "enhanced forever" NOR "reverted forever".',
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
    directionalUntilPinned: false,
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
    directionalUntilPinned: false,
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
    directionalUntilPinned: false,
    pinTo: 'CMS 2026 IRMAA fact sheet / Federal Register notice; IRMAA-MAGI per SSA / 1040',
    note: '2026 IRMAA set by 2024 MAGI (2-yr lookback). Per person (a couple both enrolled pays ×2). Lower-bound-EXCLUSIVE thresholds ($1 over → full tier). First four thresholds inflation-index annually; the top tier (≥$500k single / ≥$750k MFJ) is frozen through 2027, re-indexes 2028. A voluntary Roth conversion is NOT an SSA-44 life-changing event. MFS uses single thresholds then one step at $391k (OUT — couple model only).',
  },
)

/** 2026 Medicare Part B standard premium + deductible (per person). */
export const partB2026 = sourced(
  { standardPremiumMonthly: 202.9, annualDeductible: 283 },
  {
    citation: 'pre65-healthcare doc; CMS fact sheet 2025-11-14',
    directionalUntilPinned: false,
    pinTo: 'CMS fact sheet (Nov 2025) / Federal Register',
    note: 'Per person — a couple both enrolled pays ~$405.80/mo at the standard rate (before IRMAA).',
  },
)

/**
 * The Medicare-cost-trend constant — SOURCED (the trend sourcing unit, 2026-07-19; council
 * wf_c673339e-257 over the research packet `docs/research/medicare-cost-trend.md`,
 * wf_933cef3b-16b — every figure cross-checker-verified byte-for-byte against the primary PDF).
 * This entry was the first live `Unsourced` sentinel: Part B was priced REAL-FLAT (a disclosed
 * modeling choice, architecture §7.2), which UNDER-penalized late-year IRMAA cliff-crossing —
 * the exact payoff channel of Roth-conversion candidates — so the Act-4 reconciliation ruled it
 * HARD solver-BLOCKING (`medicare-trend-unsourced`) until a sourced trend landed AND was
 * genuinely consumed by the Part-B pricing (insight 074). Both halves land in the trend unit's
 * one atomic change: this table + `buildPartBPricingSchedule` (healthOverlay) +
 * `PART_B_PRICING_MODE: 'trended'` (taxOverlay) + the solver-seam re-wire.
 *
 * Shape (c), the year-keyed primary table (council-ruled, rank-flip-probe-gated): nominal
 * V.E2 premiums verbatim 2027–2035 (2026 lives in `partB2026` — one home per figure), deflated
 * in-engine by the HORIZON-MATCHED near-term CPI (3.2%/yr avg on the near decade — deflating
 * the near-term path by the 2.4% ultimate is the horizon mismatch the packet rules against),
 * then the ultimate real escalator ((1.038/1.024)−1 ≈ +1.37%/yr, derived in the consumer)
 * beyond 2035. Pre-anchor years CLAMP to the anchor (conservative: realized 2024/2025 real
 * premiums sit BELOW the 2026 level — $174.70/$185.00 nominal). The IRMAA Part B surcharges
 * scale with the trended base via the statutory cost-share identity (tier totals =
 * {35/50/65/80/85}% of full cost vs the base's 25% — surcharge ∝ base); Table V.E3 is the
 * DND-009 cross-check for that derivation, NEVER a second stored vector (the hawk-honored
 * disaggregation: Part D surcharges do NOT ride Part B's ratio).
 */
export const medicareCostTrend = sourced<MedicareCostTrendTable>(
  {
    reportEdition: 2026,
    anchorYear: 2026,
    premiums: [
      { calendarYear: 2027, nominalMonthly: 209.5 },
      { calendarYear: 2028, nominalMonthly: 224.5 },
      { calendarYear: 2029, nominalMonthly: 238.5 },
      { calendarYear: 2030, nominalMonthly: 255.5 },
      { calendarYear: 2031, nominalMonthly: 272.1 },
      { calendarYear: 2032, nominalMonthly: 290.2 },
      { calendarYear: 2033, nominalMonthly: 313.6 },
      { calendarYear: 2034, nominalMonthly: 338.5 },
      { calendarYear: 2035, nominalMonthly: 360.6 },
    ],
    partDIrmaa: [
      { calendarYear: 2027, addOnsMonthly: [15.4, 39.7, 64.0, 88.3, 96.4] },
      { calendarYear: 2028, addOnsMonthly: [16.3, 42.1, 67.9, 93.6, 102.2] },
      { calendarYear: 2029, addOnsMonthly: [17.3, 44.6, 71.9, 99.3, 108.4] },
      { calendarYear: 2030, addOnsMonthly: [51.7, 103.4, 155.1, 206.8, 224.0] },
      { calendarYear: 2031, addOnsMonthly: [53.5, 106.9, 160.4, 213.8, 231.6] },
      { calendarYear: 2032, addOnsMonthly: [53.7, 107.4, 161.1, 214.8, 232.7] },
      { calendarYear: 2033, addOnsMonthly: [55.5, 111.0, 166.5, 222.0, 240.5] },
      { calendarYear: 2034, addOnsMonthly: [56.6, 113.2, 169.8, 226.4, 245.3] },
      { calendarYear: 2035, addOnsMonthly: [58.4, 116.7, 175.1, 233.4, 252.9] },
    ],
    cpiNearTermAvg: 0.032,
    cpiUltimate: 0.024,
    ultimateNominalGrowth: 0.038,
    vintage: 'medicare-trend-2026a',
  },
  {
    citation:
      '2026 Medicare Trustees Report (cms.gov, released 2026-06-09; ONE edition, no mixing), verified byte-for-byte against the primary PDF (research wf_933cef3b-16b + the Part D pass, both 2026-07-19): premiums = Table V.E2 p.207 verbatim (2033 is $313.60 in the primary — secondary press printing $313.65 loses); the 2026 anchor $202.90 (finalized) lives in partB2026, identity test-pinned. partDIrmaa = Table V.E4 p.211–212 verbatim per tier (the 2026 anchor row [14.50, 37.50, 60.40, 83.30, 91.00] lives in irmaa.tiers, identity test-pinned to the cent); THE 2030 JUMP IS THE PRIMARY’S OWN DATA — IRA §11201’s 6%/yr base-premium cap covers 2024–2029, and for 2030+ the 20%-of-bid formula governs (report p.148: "the base beneficiary premium will be set at the maximum of a) 6 percent increase from the prior year and b) 20 percent of the national average monthly bid amount and the estimated catastrophic reinsurance"; V.E4 footnote 3 names the faster 2030+ growth). cpiNearTermAvg = Table II.D1 2026–2035 CPI-W average 3.2%; cpiUltimate = §III.B Table III.B12 CPI-W ultimate 2.4%; ultimateNominalGrowth = §III.D ultimate per-beneficiary Part B cost growth 3.8%/yr nominal EXCL. demographics (the report’s "1.7% real" is GDP-deflated, NOT CPI — importing it overstates CPI-real by ~0.35pp; the packet’s named trap).',
    directionalUntilPinned: false,
    pinTo:
      '2026 Medicare Trustees Report Tables V.E2 (p.207) / V.E4 (p.211–212) / II.D1 / III.B12 + §III.D + the §11201 passage (p.148); ANNUAL RE-VERIFY against each new Trustees Report (~June; the medicareTrend.reverify tripwire reds when the 2027 edition is due un-adopted)',
    note:
      'DERIVATION CHOICES (named, insight 022): the near-term deflator applies the 3.2% AVERAGE uniformly per table year (per-year CPI rows are not transcribed; horizon-matched by construction); the ultimate real growth is derived in the consumer ((1+0.038)/(1+0.024)−1 ≈ +1.37%/yr), never stored. 2027’s low nominal V.E2 step (+3.25%) is a policy artifact — never anchor a single year (packet). Real-flat is FALSIFIED in every window: near-term ≈+2.8–3%/yr real over horizon-matched CPI, ultimate ≈+1.4%/yr. PART D IS CONSUMED PER-TIER VERBATIM (never a scalar scale, never derived from the Part D base premium — the per-tier ratios diverge across the 2030 boundary, tier 1 ≈ 3.57× vs tier 5 ≈ 2.46×; primary-source-wins over the council’s guessed tied-to-base mechanism, dated in the build spec); beyond the 2035 table edge the Part D add-ons HOLD their 2035 real level (the printed horizon ends — an unsourced tail is never extrapolated as sourced; the optimistic direction of the hold is disclosed in the residual) while Part B rides its sourced ultimate escalator. Consumers: buildPartBPricingSchedule (healthOverlay) → runTaxAwareDecumulation’s per-year pricing (taxOverlay, PART_B_PRICING_MODE ’trended’); the U14 token’s trend clause reads both halves. The vintage bump fires the U13 staleness clock on pre-trend vaults BY DESIGN.',
  },
)

/** 2026 Medicare Part A purchased premiums + deductible (pin only if the tool
 *  models post-65 Part A spend). */
export const partA2026 = sourced(
  { purchasedPremiumsMonthly: [311, 565] as const, annualDeductible: 1_736 },
  {
    citation: 'pre65-healthcare doc (grounded summary, not primary)',
    directionalUntilPinned: false,
    pinTo: 'CMS 2026 Part A fact sheet',
    note: 'MEDIUM confidence; pin only if modeling post-65 Part A spend.',
  },
)

/** The ask-for-Medicare-extras conservative-HIGH typical (council wf_efc6ece2-675, F2): the
 *  Medigap+Part-D regime path, NEVER a population mean — the bimodal distribution's MA-$0
 *  mass drags a mean down, which understates the Medigap couple (the optimistic sin). Two
 *  components, each carried verbatim from its own primary; the combined figure is DERIVED in
 *  {@link medicareExtrasTypicalMonthly}, never re-typed. `vintage` is the adoption-era string
 *  the intake stamps onto a kind:'typical' fork entry (F2 provenance) — any revision of
 *  either component mints a NEW vintage string alongside the new figures. */
export const medicareExtrasTypical = sourced(
  {
    partDBaseBeneficiaryMonthly: 38.99,
    medigapPlanGNationalAvgMonthly: 205,
    vintage: 'extras-2026b',
  },
  {
    citation:
      'Part D: CMS fact sheet "2026 Medicare Part D Bid Information and Part D Premium Stabilization Demonstration Parameters" (2025-07-28; re-fetched + Medicare.gov LEP-page second-sourced 2026-07-18): "For 2026, the base beneficiary premium will be $38.99." Medigap G: 2026-vintage typical anchor $205/mo at 65 — NO government/actuarial national average exists (CMS/KFF publish none); anchored to the 2026 sourced central band ~$150–$220 (MoneyGeek 2026 age-65 avg ~$220, per-carrier $196–$306; other 2026 cites ~$166–$189) and the prior KFF 2023 book average $164 grown by the Telos Actuarial 2026 filing increases +12–26% across six named carriers (CBS News / KFF Health News; CSG Actuarial corroborates 11.7%/12.7%) → $184–$207. Researched + adversarially second-sourced 2026-07-18 (U14 S0), zero source disagreements.',
    directionalUntilPinned: false,
    pinTo: 'a future official national Medigap Plan G average if one is ever published (none exists today — the 2026 pin is the multi-source anchor above); the Part D component is CMS-primary-pinned',
    note: 'Conservative-HIGH by REGIME CHOICE (the Medigap+PartD path; roughly half of enrollees pay ~$0 extra on Medicare Advantage). $205 sits at the top of the Telos-implied refresh ($164 × 1.26 ≈ $207) and mid-high in the 2026 central band — extras-too-LOW is the optimistic sin for a funded budget, so the anchor errs high, never inflated past the sourced band. Consumed by the intakeMap fork resolution (absent / unanswered / typical arms all FUND this — never a silent $0), the intake fork label, and the assumption-panel seat. Real-flat like Part B. Combined ≈ $244/mo/person. The vintage bump (extras-2026a → extras-2026b) deliberately fires the U13 staleness clock on vaults that adopted the old figure.',
  },
)

/** The one derived combined monthly figure — computed from the entry, never re-typed. */
export function medicareExtrasTypicalMonthly(): number {
  const t = medicareExtrasTypical.value
  return t.partDBaseBeneficiaryMonthly + t.medigapPlanGNationalAvgMonthly
}

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
    directionalUntilPinned: false,
    pinTo: 'IRS Pub 974 / Form 8962 (ACA); SSA / 1040 (IRMAA)',
    note: 'The engine needs two separate MAGI calculators; the full SS benefit effectively counts for ACA but not IRMAA. Confirm the non-taxable-SS add-back wording on Form 8962 (exit gate).',
  },
)

// NOTE: the HSA contribution limits + HDHP thresholds (`hsa2026`) MOVED to
// `contributions.ts` at C1 — they are CONTRIBUTION-limit figures (one canonical home,
// burned/057). This module keeps the SPEND-side HSA rules below.

/** The federal default age-rating curve for ACA individual-market premiums (45 CFR
 *  147.102(d)-(e) — the standard 3:1 adult curve, effective for plan years ≥ 2018).
 *  D1's today's-quote → per-age-schedule escalator consumes it: an entered ACA quote
 *  at the household's current age scales along the curve to price the retired pre-65
 *  window at each age (the C1 entry shape for plan §3b's age-anchored streams).
 *  Age 21 is the reference (1.000); 64 carries the 3.000 cap; 65+ is Medicare
 *  territory (never read). This is the federal DEFAULT — some states rate on their
 *  own curves (AL, DC, MA, MN, MS, OR, UT) and NY/VT community-rate (no age factor):
 *  OUT-but-disclosed, same class as the AK/HI FPL tables. */
export const acaAgeRatingCurve = sourced<AcaAgeRatingCurve>(
  {
    childFactorThrough14: 0.765,
    factors: [
      { age: 15, factor: 0.833 },
      { age: 16, factor: 0.859 },
      { age: 17, factor: 0.885 },
      { age: 18, factor: 0.913 },
      { age: 19, factor: 0.941 },
      { age: 20, factor: 0.970 },
      { age: 21, factor: 1.000 },
      { age: 22, factor: 1.000 },
      { age: 23, factor: 1.000 },
      { age: 24, factor: 1.000 },
      { age: 25, factor: 1.004 },
      { age: 26, factor: 1.024 },
      { age: 27, factor: 1.048 },
      { age: 28, factor: 1.087 },
      { age: 29, factor: 1.119 },
      { age: 30, factor: 1.135 },
      { age: 31, factor: 1.159 },
      { age: 32, factor: 1.183 },
      { age: 33, factor: 1.198 },
      { age: 34, factor: 1.214 },
      { age: 35, factor: 1.222 },
      { age: 36, factor: 1.230 },
      { age: 37, factor: 1.238 },
      { age: 38, factor: 1.246 },
      { age: 39, factor: 1.262 },
      { age: 40, factor: 1.278 },
      { age: 41, factor: 1.302 },
      { age: 42, factor: 1.325 },
      { age: 43, factor: 1.357 },
      { age: 44, factor: 1.397 },
      { age: 45, factor: 1.444 },
      { age: 46, factor: 1.500 },
      { age: 47, factor: 1.563 },
      { age: 48, factor: 1.635 },
      { age: 49, factor: 1.706 },
      { age: 50, factor: 1.786 },
      { age: 51, factor: 1.865 },
      { age: 52, factor: 1.952 },
      { age: 53, factor: 2.040 },
      { age: 54, factor: 2.135 },
      { age: 55, factor: 2.230 },
      { age: 56, factor: 2.333 },
      { age: 57, factor: 2.437 },
      { age: 58, factor: 2.548 },
      { age: 59, factor: 2.603 },
      { age: 60, factor: 2.714 },
      { age: 61, factor: 2.810 },
      { age: 62, factor: 2.873 },
      { age: 63, factor: 2.952 },
      { age: 64, factor: 3.000 },
    ],
  },
  {
    citation:
      'CMS/CCIIO Insurance Standards Bulletin "Guidance Regarding Age Curves and State Reporting" (2016-12-16), Appendix I "Federal default standard age curve" (cms.gov PDF, fetched + parsed 2026-06-10; adult curve traceable to 77 FR 70584 at 70595, child bands to 81 FR 61456 at 61462) — cross-verified CELL-FOR-CELL against an independently-typeset secondary (ValuePenguin/LendingTree age-ratio table), zero disagreement; pdftotext column misalignment caught + realigned, proven by column parity AND the independent secondary',
    directionalUntilPinned: false,
    pinTo: 'CMS CCIIO age-curve guidance Appendix I (45 CFR 147.102) — confirm still the operative default for the coverage year',
    note: 'Factors are premium ratios to the age-21 base (3:1 adult cap, ACA §1201/PHS Act §2701). The 2018-effective curve remains operative (CMS has issued no superseding curve; 2026 state rate filings still apply it). Consumer = D1 quote escalator only — the engine prices off the constructed per-year premium streams, never this curve directly.',
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
    directionalUntilPinned: false,
    pinTo: 'enacted H.R.1 text / IRS implementing notice',
    legalBasis: 'OBBBA H.R.1',
    note: 'Bronze/Catastrophic HSA-compatibility expands WHO can contribute; it does NOT make ACA premiums HSA-payable.',
  },
)

/** The CURRENT build's healthcare vintage stamp (P3·U11 — contract #6's four clocks in one
 *  atomic object; the {@link HealthcareVintageV3} the Save path writes). Each field is copied
 *  from its OWN canonical entry above (per-figure provenance, insight 022 — never re-typed,
 *  never one citation blanketing the family). U13 compares a persisted stamp against THIS at
 *  unlock to name exactly which clock moved. */
export function healthcareVintageStamp(): HealthcareVintageV3 {
  return {
    coverageYear: COVERAGE_YEAR,
    acaStatus: acaEnhancedSubsidyStatus.value.regime2026,
    acaVerifiedOn: acaEnhancedSubsidyStatus.value.verifiedOn,
    fplGuidelineYear: federalPovertyGuidelines.value.guidelineYear,
    irmaaTopTierFrozenThrough: irmaa.value.topTierFrozenThrough,
    partBStandardMonthly: partB2026.value.standardPremiumMonthly,
    medicareExtrasTypicalVintage: medicareExtrasTypical.value.vintage,
    partBTrendVintage: medicareCostTrend.value.vintage,
  }
}

/** The full health table — also the iteration surface for the shape test. */
export const healthConstants = {
  acaEnhancedSubsidyStatus,
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  acaAgeRatingCurve,
  federalPovertyGuidelines,
  acaPtc,
  irmaa,
  partB2026,
  medicareCostTrend,
  partA2026,
  medicareExtrasTypical,
  magiDefinitions,
  hsaFourthBucketRules,
  obbbaHsa2026,
} satisfies Record<string, ConstantEntry>
