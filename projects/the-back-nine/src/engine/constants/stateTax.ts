/**
 * State income-tax constants — the v1 priced roster {NC, PA, FL} (state-tax unit;
 * council wf_cc065e3b-bc1 scope, wf_d04148cb-1e5 build plan, 2026-07-15). A SECOND,
 * parallel income-tax system that folds into the SAME per-year gross-up fixed point as
 * federal tax, priced ONLY for the built roster and byte-identical-OFF for any household
 * outside it. Its own year-keyed module (the healthConstants / contributionConstants /
 * socialSecurityConstants precedent) so ALL_CONSTANTS, the shape test, and the vintage
 * digest pick it up automatically — and so a state-only rate change gets its OWN staleness
 * clock (StateTaxVintageV3, the persistence unit) rather than riding the federal tax stamp.
 *
 * DISCIPLINE (burned/057,061,062,063; insight 022):
 *  - Every figure is `Sourced` with its citation + `directionalUntilPinned` marker; these
 *    are FRESHLY transcribed (2026-07-15) and stay `directional` until the S6 verify:state-tax
 *    re-verify hook confirms them against the codified primary (the ACA legislatively-gated
 *    precedent). A figure the research names-but-doesn't-value would be an `Unsourced` throw,
 *    never a plausible default.
 *  - Per-figure citations are SPLIT statute-vs-DOR (insight 022): the load-bearing statute
 *    section AND the DOR/guide corroboration, so a single dead link never silently unsources it.
 *  - Distinctive figures (12,750 · 0.0399 · 0.0307) live ONLY here (the copyGuard gate).
 *    NC MFJ $25,500 collides with an unrelated SS-taxable figure elsewhere in src, so it is
 *    pinned by a shape-test assertion instead of the substring gate (the collision carve-out
 *    the DISTINCTIVE comment names).
 *
 * The engine (the state overlay unit) reads NO clock/entropy/env here (src/engine purity),
 * zero draws (CRN-safe); its fixtures are DND-012 externally derived (hand-computed from each
 * state DOR worksheet, never from the engine's own state formula).
 */
import {
  sourced,
  type ConstantEntry,
  type StateBaseSystem,
  type StateFlatRateSchedule,
  type StateIncomeTreatment,
  type StateRateStep,
  type StateStandardDeduction,
} from './types'
import type { StateTaxVintageV3 } from '@shared/model'

/**
 * The v1 PRICED roster. A household whose state is in this tuple gets its state income tax
 * PRICED into every headline; every other state (including the explicit `'elsewhere'`) keeps
 * today's OUT-but-disclosed posture VERBATIM. Membership — NOT a truthy string — is what the
 * engine's state branch keys on (a truthy key would CALL the module and compute-then-zero,
 * perturbing the reduce-to-spine float lineage). SC/GA/DE are DEFERRED (verification
 * incomplete / secondary-graded / disputed) and are added here only when primary-pinned.
 */
export const PRICED_STATES = ['NC', 'PA', 'FL'] as const
export type PricedState = (typeof PRICED_STATES)[number]

/** Roster membership as a type guard — the enum-membership gate (never a truthy check). */
export const isPricedState = (code: string): code is PricedState =>
  (PRICED_STATES as readonly string[]).includes(code)

// ---- North Carolina (Briggsy's household; TY2026 primary-pinned) -------------

/**
 * NC flat rate BY YEAR — 3.99% for 2026 AND ALL LATER YEARS (the hawk veto,
 * wf_d04148cb-1e5). THE codified 2027+ cuts (G.S. 105-153.7(a1)) are revenue-TRIGGER-
 * conditional on an FY2025-26 certification that does NOT exist until ~Aug 2026, and the
 * reported July-2026 budget-deal schedule could not be located to primary session law.
 * Holding the higher rate OVERSTATES out-year tax on the RMD/withdrawal stream =
 * conservative; pricing 3.49%/2027 is the optimistic cardinal-sin direction.
 */
export const ncRateSchedule = sourced<StateFlatRateSchedule>(
  { steps: [{ fromYear: 2026, rate: 0.0399 }] },
  {
    citation:
      'N.C.G.S. § 105-153.7 (individual income-tax rate; codified schedule "After 2025 — 3.99%") · trigger provision § 105-153.7(a1) (SL 2023-134), codified statute fetched from ncleg.gov 2026-07-15 · NCDOR tax-rate page (corroboration)',
    directionalUntilPinned: true,
    // The live-flip watch: the Aug-2026 certification / budget-deal re-fetch could pin a lower
    // 2027+ rate at any build. `reVerifyEveryBuild` is the ACA/spousalRate precedent — the
    // verify:state-tax CI gate (scripts/verify-state-tax.ts) hooks this flag's NC record every
    // build. PA (flat since 2004) and FL (constitutional $0) are NOT flagged — annual drift only.
    reVerifyEveryBuild: true,
    pinTo: 'ncleg.gov codified G.S. 105-153.7 + the FY2025-26 revenue certification (~Aug 2026 Office of State Controller)',
    note:
      'NEVER price 3.49%/2027 until the FY2025-26 certification or a primary session law pins it — hawk veto 2026-07-15; holding 3.99% overstates tax = conservative. The codified 2027+ step-downs are revenue-trigger-conditional (a certification that does not yet exist); the reported budget-deal schedule is UNLOCATED at primary (SL 2026-31 / SB 595 is only the IRC-conformity bill and does not touch § 105-153.7). Held forward: a 2027 lookup returns 3.99%. The S6 verify:state-tax re-verify hook carries the Aug-2026 checkpoint in state-tax-nc-last-verified.json; the instant a lower rate pins, add a step and stale saved vaults.',
  },
)

/**
 * NC standard deduction — FIXED dollar figures set by statute, NOT inflation-indexed, and
 * NO additional deduction for age 65+ or blindness (the 2014 flat-tax overhaul eliminated
 * personal exemptions and the old retirement-income deductions). Confirmed unchanged by
 * SL 2026-31. LANDMINE: the MFJ $25,500 is NOT re-typed via the copyGuard gate (it collides
 * with an unrelated SS-taxable figure) — a shape-test assertion pins it; the single $12,750
 * IS gate-guarded.
 */
export const ncStandardDeduction = sourced<StateStandardDeduction>(
  { mfj: 25_500, single: 12_750 },
  {
    citation:
      'N.C.G.S. § 105-153.5(a)(1) (standard-deduction table by filing status; fixed statutory dollars, not indexed) · NCDOR "North Carolina Standard Deduction" page (corroboration); unchanged by SL 2026-31',
    directionalUntilPinned: true,
    pinTo: 'ncleg.gov codified G.S. 105-153.5(a)(1)',
    note:
      'Fixed, NOT inflation-indexed — no COLA. NO age-65+/blindness add-on (contrast the federal §63(f) addition + OBBBA senior bonus, which do NOT flow through because NC starts from AGI and applies its own SD). Survivor transition: on the first death the SD steps $25,500 (MFJ) → $12,750 (single), rate unchanged (insight 014). NOT modeled (lead only, do NOT price): SB 437 "Middle Class Momentum Act" ($26,000/$13,000) sits in Senate Rules committee, not enacted 2026-07-15.',
  },
)

/** NC base system — starts from FEDERAL AGI (§ 105-153.4), then NC's own standard deduction
 *  and § 105-153.5 modifications. NO local/municipal income tax anywhere in NC (single
 *  statewide tax; Chapter 105 grants no local income-tax authority — the key contrast with
 *  PA's EIT). */
export const ncBaseSystem = sourced<StateBaseSystem>('federal-agi-derived', {
  citation:
    'N.C.G.S. § 105-153.4 (NC taxable income begins at federal AGI) · § 105-153.7 (single statewide rate; no Chapter-105 local income-tax enabling authority) · NCDOR (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'ncleg.gov codified G.S. 105-153.4',
  note: 'No local/municipal/county income tax statewide ($0). NC muni add-backs / Treasury subtractions exist (§ 105-153.5(b)(1)/(c)(1)) but are OUT of the modeled base (named, never modeled).',
})

/** NC Social Security — 100% EXEMPT (explicit subtraction; SS never contributes to NC tax at
 *  any income level, so the NC state term rides WITHOUT the ×1.85 federal SS-torpedo). */
export const ncSocialSecurity = sourced<StateIncomeTreatment>('exempt', {
  citation:
    'N.C.G.S. § 105-153.5(b)(3) (subtraction for Title II Social Security + Railroad Retirement benefits) · NCDOR (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'ncleg.gov codified G.S. 105-153.5(b)(3)',
  note: '100% exempt at every income level. This is why the NC state term is additive at the federal-worst corner without the SS-inclusion multiplier (the k-derivation, insights 006/007).',
})

/** NC pre-tax withdrawals / RMDs — FULLY TAXABLE ordinary income at the flat rate. OUT
 *  (named, never modeled, private-sector household never qualifies): the Bailey settlement
 *  govt-plan exemption (5+ yrs creditable service by 8/12/1989) and the 20-yr/medical
 *  military-retirement deduction. */
export const ncRetirementIncome = sourced<StateIncomeTreatment>('taxed-ordinary', {
  citation:
    'N.C.G.S. § 105-153.4 (IRA/401(k) distributions in federal AGI) · § 105-153.5(b) (no subtraction covers private retirement income; the old $4,000/$2,000 deduction repealed eff. TY2014) · NCDOR Bailey page (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'ncleg.gov codified G.S. 105-153.4 / .5(b)',
  note: 'Private-sector IRA/401(k)/pension: 100% taxable at the flat rate. OUT (never modeled — this household never qualifies): Bailey govt-plan carve-out (§ 105-153.5(b)(5), 5+ yrs by 8/12/1989) and military retirement (§ 105-153.5(b)(5a)).',
})

/** NC Roth conversion — the full taxable conversion is taxed as ordinary income at the flat
 *  rate, with NO age condition, NO source condition, NO exclusion (the ranking-relevant term
 *  the broad-brush rejection named). A purely LINEAR cost: rate × taxable conversion — no NC
 *  bracket or phase-out to optimize against. */
export const ncConversionTreatment = sourced<StateIncomeTreatment>('taxed-ordinary', {
  citation:
    'N.C.G.S. § 105-153.4 (federal AGI start) · IRC § 408A(d)(3) (conversion taxable amount is in federal AGI) · § 105-153.5(b) (no subtraction removes it) · NCDOR (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'ncleg.gov codified G.S. 105-153.4 / .5(b) + IRC § 408A(d)(3)',
  note: '100% of the taxable conversion taxed at the flat rate (3.99% in 2026); NO age/source condition. Qualified Roth DISTRIBUTIONS in retirement are excluded from federal AGI → $0 NC tax. The NC-vs-PA conversion DELTA (NC taxes it, PA at qualified age does not) is the mandatory DND-012 fixture.',
})

/** NC taxable-account gains/dividends — taxed as ORDINARY income at the flat rate; the
 *  federal 0/15/20% LTCG preference does NOT carry (the gain is already in AGI and no
 *  subtraction removes it). */
export const ncCapitalGains = sourced<StateIncomeTreatment>('taxed-ordinary', {
  citation:
    'N.C.G.S. § 105-153.4 (gains/dividends already in federal AGI; no preferential-rate schedule) · NCDOR (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'ncleg.gov codified G.S. 105-153.4',
  note: 'Dividends + short- AND long-term gains all taxed at the flat rate — no LTCG preference. OUT (named, never modeled): out-of-state municipal-bond interest add-back (§ 105-153.5(c)(1)) and the US-obligation/NC-muni interest deduction (§ 105-153.5(b)(1)).',
})

// ---- Pennsylvania (Craig's household; primary-pinned) ------------------------

/** PA flat rate — 3.07%, in effect continuously since 2004; NO scheduled statutory change,
 *  NO revenue trigger, NO bracket table (do NOT build a year-keyed ramp; the 2.8% Shapiro
 *  proposal is not law). Held forward from 2026 like the roster's other flat rates. */
export const paRateSchedule = sourced<StateFlatRateSchedule>(
  { steps: [{ fromYear: 2026, rate: 0.0307 }] },
  {
    citation:
      '72 P.S. § 7302 (PA personal income-tax rate 3.07%) · PA DOR PIT Guide rate history ("2004 – Present"), pa.gov fetched 2026-07-15',
    directionalUntilPinned: true,
    pinTo: 'pa.gov PIT Guide rate chapter + 72 P.S. § 7302',
    note: 'Stable since 2004; no scheduled step-down and no revenue trigger (unlike NC/SC/GA). One step, held forward. The 2.8% Shapiro budget proposal was never enacted — excluded.',
  },
)

/** PA standard deduction / personal exemption — NONE ($0 both filing statuses). PA's PIT
 *  Guide lists the federal standard deduction with PA treatment "No provision"; taxable
 *  investment income is taxed from the first dollar (the only offset is Tax Forgiveness, OUT). */
export const paStandardDeduction = sourced<StateStandardDeduction>(
  { mfj: 0, single: 0 },
  {
    citation:
      'PA DOR PIT Guide "Deductions Not Allowed" table (federal standard deduction → "No provision"; no personal exemption), pa.gov fetched 2026-07-15',
    directionalUntilPinned: true,
    pinTo: 'pa.gov PIT Guide (Deductions chapter)',
    note: 'Literal $0 for MFJ AND single — PA has no standard deduction and no personal exemption (the only PA deductions are MSA/HSA/529/529A contributions, none of which a decumulating retiree touches). Low-income relief is Tax Forgiveness (Schedule SP), a step-function credit — OUT (named, never modeled, conservative-direction).',
  },
)

/** PA base system — a stand-alone EIGHT-CLASS system, NOT federal-AGI-derived. The engine
 *  MUST assemble PA's base from its own converged channels (never a rate on the federal
 *  figure): federally-tax-free out-of-state muni interest is PA-TAXABLE, and federally-taxed
 *  retirement income / SS is PA-EXEMPT — divergences that move in OPPOSITE directions. */
export const paBaseSystem = sourced<StateBaseSystem>('class-based', {
  citation:
    '72 P.S. § 7303 (eight enumerated income classes: compensation; interest; dividends; net profits; net gains; rents/royalties; estate/trust; gambling) · PA DOR PIT Guide (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide + 72 P.S. § 7303',
  note: 'NOT AGI-based — no linkage to federal AGI, no federal itemized/standard deductions, no personal exemptions. Do NOT compute PA tax by scaling federal AGI; assemble it from the class-level PA figures. No cross-class loss offset, no capital-loss carryover (second-order for a decumulating retiree).',
})

/** PA Social Security — 100% EXEMPT at every income level (SS is not one of the eight
 *  taxable classes; Railroad Retirement likewise). */
export const paSocialSecurity = sourced<StateIncomeTreatment>('exempt', {
  citation:
    '72 P.S. § 7303 (SS is not an enumerated taxable class) · PA DOR PIT Guide (SS / Railroad Retirement never taxable) · pa.gov fetched 2026-07-15',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide + 72 P.S. § 7303',
  note: '100% exempt at all income levels (contrast federal, which taxes up to 85%). Not counted in Tax Forgiveness eligibility income either.',
})

/** PA qualified-age retirement gate — federal 59½ (an IRA with no plan-specific age uses the
 *  federal retirement age). AT/ABOVE this age a distribution from an eligible PA plan is
 *  exempt; BELOW it, the conservative arm applies (taxed — see the treatments below). */
export const paQualifiedAge = sourced(59.5, {
  citation:
    'PA DOR PIT Guide (eligible-PA-retirement-plan retirement-age gate; IRA default = federal 59½) · 61 Pa. Code § 101.6 (corroboration), pa.gov fetched 2026-07-15',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide (Gross Compensation / retirement-plan distributions)',
  note: 'The age gate on retirement-plan withdrawals AND Roth conversions. At/after 59½ → exempt; before it → the conservative TAXED arm. The date route can reach ages < 59½, so the gate is load-bearing.',
})

/** PA pre-tax withdrawals / RMDs — EXEMPT at qualified age (≥ 59½); TAXED below it (the
 *  conservative cost-recovery arm). Distributions from an eligible PA plan (IRA, 401(a),
 *  SEP, Keogh) are not PA-taxable once the retirement age is met. */
export const paRetirementIncome = sourced<StateIncomeTreatment>('taxed-if-under-qualified-age', {
  citation:
    'PA DOR PIT Guide (Gross Compensation — eligible-PA-retirement-plan distributions exempt at retirement age; early distributions taxable via cost recovery) · 61 Pa. Code § 101.6 (corroboration)',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide (Gross Compensation / retirement-plan distributions)',
  note: 'Post-59½/post-retirement withdrawals: $0 PA tax (uncapped) — the core reason PA decumulation tax is near-zero. Pre-59½: TAXED (the conservative arm; PA has no federal-style early-withdrawal exceptions and taxes early distributions above previously-taxed contributions).',
})

/** PA Roth conversion — $0 at qualified age (≥ 59½), the key PA-specific edge; TAXED below it
 *  (the conservative arm). A conversion by a 59½+ retiree is a distribution from an eligible
 *  PA plan and is NOT PA-taxable regardless of the (large) federally-taxable amount. */
export const paConversionTreatment = sourced<StateIncomeTreatment>('taxed-if-under-qualified-age', {
  citation:
    'PA DOR PIT Guide (eligible-plan distribution rule — a 59½+ conversion is not PA-taxable; Roth IRAs are themselves eligible PA plans) · pa.gov fetched 2026-07-15',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide (Gross Compensation / retirement-plan distributions)',
  note: 'Qualified-age (≥ 59½) conversion: $0 PA tax on the converted amount — PA is one of the few states that does not tax conversions for qualified-age retirees (the recommender treats PA conversion state-cost as ZERO). Under-59½: TAXED (the conservative arm — the primary sentence for the under-59½ conversion exemption could NOT be pinned; the date route can reach those ages).',
})

/** PA taxable-account interest/dividends/gains — taxed at the flat 3.07%, NO LTCG preference
 *  and NO short/long distinction (PA's one "net gains" class). This flat rate on brokerage
 *  income is essentially the ONLY PA tax a retired couple pays. */
export const paCapitalGains = sourced<StateIncomeTreatment>('taxed-ordinary', {
  citation:
    'PA DOR PIT Guide (net-gains / dividends / interest classes all taxed at 3.07%; no preferential LTCG rate, no holding-period distinction) · pa.gov fetched 2026-07-15',
  directionalUntilPinned: true,
  pinTo: 'pa.gov PIT Guide (net gains / dividends / interest)',
  note: 'Interest, dividends, and net gains all at 3.07% — no LTCG preference. OUT (each named, never modeled, conservative-direction): the US/PA-obligation interest exemption, Tax Forgiveness (Schedule SP), local Earned Income Tax (mechanism-confirmed $0 for decumulation income — EIT reaches only earned compensation/net profits), and Philadelphia School Income Tax.',
})

// ---- Florida (a v1 named-maybe carried as the honesty demonstration) ---------

/**
 * FL — a sourced constitutional $0 (Fla. Const. Art. VII § 5(a)): no personal income tax on
 * natural persons, and it is CONSTITUTIONALLY PROHIBITED, not merely absent. A conversion,
 * a withdrawal, SS, and taxable gains all incur $0 FL state tax — the maximally-favorable
 * state for conversion strategy (only federal tax applies). A REAL pinned figure with its own
 * re-verify record — NEVER a silent default (burned/062). FL's presence in PRICED_STATES is
 * exactly what makes "no state income tax — nothing to add" an HONEST affirmation rather than
 * an unbuilt-state omission.
 */
export const flIncomeTax = sourced(0, {
  citation:
    'Fla. Const. Art. VII § 5(a) (no state personal income tax; constitutionally prohibited — changeable only by a 60%-voter amendment, none on the Nov-2026 ballot), verbatim-verified 2026-07-15',
  directionalUntilPinned: true,
  pinTo: 'Fla. Const. Art. VII § 5(a)',
  note: 'Literal $0 for all decumulation income in every year — no rate, no brackets, no standard deduction, no treatment rules. The pinned constitutional $0 is what lets the affirmation "nothing to add for Florida" ship as an honest fact, not a silent unbuilt-state default.',
})

// ---- The engine-facing profile + lookups ------------------------------------

/** One priced state's full decumulation profile — assembled from the sourced entries above
 *  (references `.value`, never re-typing a figure). The state overlay reads this. */
export interface StateTaxProfile {
  readonly baseSystem: StateBaseSystem
  readonly ssTreatment: StateIncomeTreatment
  readonly retirementIncomeTreatment: StateIncomeTreatment
  readonly conversionTreatment: StateIncomeTreatment
  readonly capGainsTreatment: StateIncomeTreatment
  /** `null` for a no-income-tax state (FL). */
  readonly rateSchedule: StateFlatRateSchedule | null
  /** `null` for a no-income-tax state (FL); `{mfj:0,single:0}` for PA (No provision). */
  readonly standardDeduction: StateStandardDeduction | null
  /** The qualified-age gate for retirement/conversion exemption (PA 59½); `null` where none. */
  readonly qualifiedAge: number | null
}

/** The priced roster's engine-facing profiles. Every field reads a sourced `.value` (no
 *  re-typed figure); FL is the no-income-tax profile. */
export const STATE_TAX_PROFILES: Readonly<Record<PricedState, StateTaxProfile>> = Object.freeze({
  NC: {
    baseSystem: ncBaseSystem.value,
    ssTreatment: ncSocialSecurity.value,
    retirementIncomeTreatment: ncRetirementIncome.value,
    conversionTreatment: ncConversionTreatment.value,
    capGainsTreatment: ncCapitalGains.value,
    rateSchedule: ncRateSchedule.value,
    standardDeduction: ncStandardDeduction.value,
    qualifiedAge: null,
  },
  PA: {
    baseSystem: paBaseSystem.value,
    ssTreatment: paSocialSecurity.value,
    retirementIncomeTreatment: paRetirementIncome.value,
    conversionTreatment: paConversionTreatment.value,
    capGainsTreatment: paCapitalGains.value,
    rateSchedule: paRateSchedule.value,
    standardDeduction: paStandardDeduction.value,
    qualifiedAge: paQualifiedAge.value,
  },
  FL: {
    baseSystem: 'no-income-tax',
    ssTreatment: 'none',
    retirementIncomeTreatment: 'none',
    conversionTreatment: 'none',
    capGainsTreatment: 'none',
    rateSchedule: null,
    standardDeduction: null,
    qualifiedAge: null,
  },
})

/**
 * The flat state rate for a tax year — HELD FORWARD: the latest step whose `fromYear` ≤
 * `taxYear` wins. A no-income-tax schedule (`null`) is $0. A query BEFORE the earliest step
 * is fail-loud (never a silent 0 — burned/062); a non-integer year is fail-loud (insight 020).
 * Pure: reads no clock/env. The year is CONSUMED here (insight 074) so a future pinned NC
 * step-down actually prices.
 */
export function flatStateRateForYear(
  schedule: StateFlatRateSchedule | null,
  taxYear: number,
): number {
  if (schedule === null) return 0
  if (!Number.isInteger(taxYear)) {
    throw new Error(`[stateTax] tax year must be an integer, got ${taxYear} (insight 020).`)
  }
  let chosen: StateRateStep | undefined
  for (const step of schedule.steps) {
    if (taxYear >= step.fromYear) chosen = step
  }
  if (chosen === undefined) {
    const earliest = schedule.steps[0]?.fromYear
    throw new Error(
      `[stateTax] no rate step covers tax year ${taxYear}; earliest step is ${earliest}. ` +
        `A query before the earliest step is never a silent 0 (burned/062).`,
    )
  }
  return chosen.rate
}

/** The flat state income-tax rate for a priced state + tax year (the NC hawk-veto posture
 *  means a 2027+ NC query returns 3.99% until a lower rate pins). FL → 0. */
export function stateRateForYear(state: PricedState, taxYear: number): number {
  return flatStateRateForYear(STATE_TAX_PROFILES[state].rateSchedule, taxYear)
}

/** The state standard deduction for a priced state + filing status. PA → $0 (No provision);
 *  FL → $0 (no income tax). NC/PA are fixed (not indexed), so no year is consumed here — a
 *  future indexed state (SC/GA) will need the year threaded. */
export function stateStandardDeductionFor(state: PricedState, filing: 'mfj' | 'single'): number {
  const sd = STATE_TAX_PROFILES[state].standardDeduction
  if (sd === null) return 0
  return filing === 'mfj' ? sd.mfj : sd.single
}

/**
 * The CURRENT build's state-tax vintage stamp (the state-tax unit — the `controls.stateTaxMoved`
 * clock producer; the taxVintageStamp/healthcareVintageStamp mirror). Each field is one
 * v1-PRICED state's COMPLETE decumulation profile, serialized from `STATE_TAX_PROFILES[state]`
 * (source-bound — the profiles reference the sourced `.value`s, so a drifted producer here is a
 * clock that never fires; insight 022). The WHOLE profile, not a current-year rate scalar: the
 * held-forward flat rates mean a FUTURE pinned step (NC's expected 3.49% self-correction) changes
 * an out-year the household still prices while the current-year rate is unchanged — the serialized
 * schedule catches that; a scalar would miss it. The save path writes it fresh
 * (`scenarioFromDraft`); `src/store/staleness.ts` diffs a persisted stamp against THIS at unlock,
 * per-state (the household's own state's field only — an NC change never alarms a PA/FL vault).
 * Deterministic within a build (the dirty-compare / round-trip guard depend on it).
 */
export function stateTaxVintageStamp(): StateTaxVintageV3 {
  return {
    ncProfile: JSON.stringify(STATE_TAX_PROFILES.NC),
    paProfile: JSON.stringify(STATE_TAX_PROFILES.PA),
    flProfile: JSON.stringify(STATE_TAX_PROFILES.FL),
  }
}

/** COMPILE TIE (the ultramode review fold, 2026-07-15 — insight 074's expansion twin): the
 *  persisted `StateTaxVintageV3` must carry exactly one `<state>Profile` field per PRICED
 *  state. Adding SC to PRICED_STATES without growing the stamp — and therefore the staleness
 *  compare — fails tsc HERE, never silently ships a priced state whose rule changes can't
 *  stale a vault. Mutual-extends, the model.ts `_V3FieldsCover` idiom. */
type StampKeys = { [K in PricedState as `${Lowercase<K>}Profile`]: string }
const _stampCoversRoster: StateTaxVintageV3 extends StampKeys ? true : never = true
const _rosterCoversStamp: StampKeys extends StateTaxVintageV3 ? true : never = true
void _stampCoversRoster
void _rosterCoversStamp

/** The stamp field for a priced state — ONE derivation shared by the staleness reader and any
 *  future consumer, so a per-state branch that could mis-select a SIBLING's profile (the
 *  ultramode review's wrong-profile mutant class) is structurally impossible. */
export function stateProfileKey(state: PricedState): keyof StateTaxVintageV3 {
  return `${state.toLowerCase()}Profile` as keyof StateTaxVintageV3
}

/** The earliest year a priced state's rate schedule can price (null = no schedule, FL). The
 *  validateParams lower-bound TWIN of `flatStateRateForYear`'s fail-loud guard (the two-layer
 *  R19 law): a priced household whose startCalendarYear precedes its schedule would otherwise
 *  throw mid-path on every candidate instead of returning the calm indeterminate (the
 *  ultramode review's boundary adversary, 2026-07-15). */
export function earliestPricedRateYear(state: PricedState): number | null {
  const schedule = STATE_TAX_PROFILES[state].rateSchedule
  if (schedule === null) return null
  const first = schedule.steps[0]
  // A priced schedule is non-empty by construction (the shape test walks every entry) — an empty
  // one here is table corruption, never a default (burned/062).
  if (first === undefined) throw new Error(`state ${state} has an empty rate schedule`)
  return first.fromYear
}

/**
 * The state-tax table — the iteration surface for the shape test, the copyGuard, and the
 * vintage digest (registered into ALL_CONSTANTS as `state.*`). Per-figure entries (not one
 * blob per state) so each carries its own split statute-vs-DOR citation (insight 022).
 */
export const stateTaxConstants = {
  ncRateSchedule,
  ncStandardDeduction,
  ncBaseSystem,
  ncSocialSecurity,
  ncRetirementIncome,
  ncConversionTreatment,
  ncCapitalGains,
  paRateSchedule,
  paStandardDeduction,
  paBaseSystem,
  paSocialSecurity,
  paQualifiedAge,
  paRetirementIncome,
  paConversionTreatment,
  paCapitalGains,
  flIncomeTax,
} satisfies Record<string, ConstantEntry>
