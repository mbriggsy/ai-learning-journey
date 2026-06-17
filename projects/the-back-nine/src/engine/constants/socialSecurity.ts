/**
 * Social Security benefit constants — the statutory actuarial factors the PIA-driven
 * benefit sub-engine reads (own reduction/credit · the Method C spousal excess ·
 * §202 survivor + RIB-LIM). See `docs/plans/features/social-security.md`.
 *
 * UNLIKE the tax/health/contribution tables these are NOT year-keyed COLA figures —
 * they are STATUTE (42 U.S.C. §402/§416; 20 CFR 404; the POMS section cited per
 * figure), stable until Congress acts. The sub-engine + its intake read from HERE;
 * no factor is re-typed elsewhere (burned/063 single-source).
 *
 * Provenance split (the verify sweep, 2026-06-14 — 12 agents, 6 areas, ALL
 * primary-confirmed, zero refutations; re-derived from scratch by an adversarial
 * checker):
 *  - The reduction/credit FRACTIONS + RIB-LIM + survivor 28.5% + spousal rate +
 *    deemed-filing cutoff were byte-pulled from POMS (HTTP 200) → directionalUntilPinned:false.
 *  - The FRA tables were grounding-confirmed against ssa.gov (the NRA/survivor chart
 *    HTML is Akamai-gated to curl) → directionalUntilPinned:true; a browser pull
 *    upgrades them. The 67-for-1960+ value both household cohorts use is universally
 *    agreed and was re-derived.
 *
 * Citation LANDMINES baked into the strings (do NOT "correct" them back):
 *  - The worker reduction is POMS RS 00615.101 — RS 00615.102 is a DEAD 404.
 *  - Deemed filing is GN 00204.035 — RS 00615.020 is the dual-entitlement AMOUNT math.
 *  - The survivor DRC flow-through is RS 00615.301/.702 — .320's DRC clause is RIB-LIM-internal.
 */
import {
  sourced,
  type ConstantEntry,
  type DeemedFilingCutoff,
  type DelayedRetirementCredit,
  type FraBand,
  type ReductionSchedule,
  type RibLim,
  type SurvivorReduction,
} from './types'

/** Full retirement age (NRA) by birth year, in MONTHS (the 1955–59 band is
 *  fractional — a bare year silently breaks it). 1960+ → 804mo (67y0m), the value
 *  both household cohorts (1969/1972) use. */
export const fullRetirementAge = sourced<readonly FraBand[]>(
  [
    { bornThrough: 1937, fraMonths: 780 }, // 65y0m (1937 and earlier)
    { bornThrough: 1938, fraMonths: 782 }, // 65y2m
    { bornThrough: 1939, fraMonths: 784 },
    { bornThrough: 1940, fraMonths: 786 },
    { bornThrough: 1941, fraMonths: 788 },
    { bornThrough: 1942, fraMonths: 790 }, // 65y10m
    { bornThrough: 1954, fraMonths: 792 }, // 66y0m (1943–1954)
    { bornThrough: 1955, fraMonths: 794 }, // 66y2m
    { bornThrough: 1956, fraMonths: 796 },
    { bornThrough: 1957, fraMonths: 798 },
    { bornThrough: 1958, fraMonths: 800 },
    { bornThrough: 1959, fraMonths: 802 }, // 66y10m
    { bornThrough: null, fraMonths: 804 }, // 67y0m (1960 and later)
  ],
  {
    citation:
      'SSA NRA chart (ssa.gov/oact/ProgData/nra.html) + planner agereduction.html — grounding-confirmed (HTML Akamai-gated to curl); every band edge cross-agreed across sources and re-derived by the verify sweep (2026-06-14); 1960+→67 universally confirmed. The "born Jan 1 → treated as the prior year" rule needs a full DOB the model does not carry (a bounded, disclosed simplification; both household cohorts are interior to their bands).',
    directionalUntilPinned: true,
    pinTo: 'SSA NRA chart ssa.gov/oact/ProgData/nra.html (a browser pull upgrades this to byte-level primary)',
    legalBasis: '42 U.S.C. §416(l) (retirement age)',
  },
)

/** Survivor (widow/er) full retirement age — a SEPARATE schedule from retirement-FRA
 *  (earlier for the 1957–1961 band). Both household cohorts (1962+) resolve to 804mo
 *  (67y0m), coinciding with retirement-FRA there; key it separately so a cohort
 *  change cannot silently alias them. */
export const survivorFullRetirementAge = sourced<readonly FraBand[]>(
  [
    { bornThrough: 1939, fraMonths: 780 }, // 65y0m
    { bornThrough: 1940, fraMonths: 782 },
    { bornThrough: 1941, fraMonths: 784 },
    { bornThrough: 1942, fraMonths: 786 },
    { bornThrough: 1943, fraMonths: 788 },
    { bornThrough: 1944, fraMonths: 790 },
    { bornThrough: 1956, fraMonths: 792 }, // 66y0m (1945–1956)
    { bornThrough: 1957, fraMonths: 794 }, // 66y2m
    { bornThrough: 1958, fraMonths: 796 },
    { bornThrough: 1959, fraMonths: 798 },
    { bornThrough: 1960, fraMonths: 800 },
    { bornThrough: 1961, fraMonths: 802 }, // 66y10m
    { bornThrough: null, fraMonths: 804 }, // 67y0m (1962 and later)
  ],
  {
    citation:
      'SSA survivor-FRA chart (ssa.gov/benefits/survivors/survivorchartred.html) + POMS RS 00615.301B.2 — a SEPARATE schedule from retirement-FRA, earlier for the 1957–1961 band. Grounding-confirmed (HTML Akamai-gated); 1962+→67 (= both household cohorts) is solid; the 1957–1961 graduated bands + lower edges still need a browser pull to byte-pin.',
    directionalUntilPinned: true,
    pinTo: 'SSA survivor-FRA chart / POMS RS 00615.301B.2 (a browser pull byte-pins the 1957–1961 band)',
    legalBasis: '42 U.S.C. §416(l)',
  },
)

/** Worker's own RIB actuarial reduction for claiming before FRA (POMS RS 00615.101).
 *  5/9 of 1%/mo first 36, then 5/12 of 1%/mo — the integer formula (180−n)/180 then
 *  (192−(n−36))/240 yields exactly 0.7000 at 62/FRA67. */
export const workerReduction = sourced<ReductionSchedule>(
  { firstMonths: 36, firstRate: { numerator: 5, denominator: 9 }, laterRate: { numerator: 5, denominator: 12 } },
  {
    citation:
      'POMS RS 00615.101 (byte-pulled HTTP 200, verify sweep 2026-06-14): "reduced by 5/9 of 1% for each of the first 36 months ... plus 5/12 of 1% for each month in excess of 36" — total 20% at 36 months. 5/9 of 1% = 1/180; 5/12 of 1% = 1/240. RS 00615.102 is a DEAD 404 — never cite it. Final benefit dollars dime-round DOWN (a step in the sub-engine, never on the factor).',
    directionalUntilPinned: false,
    pinTo: 'POMS RS 00615.101',
    legalBasis: '42 U.S.C. §402(q); 20 CFR 404.410',
  },
)

/** Spouse-excess actuarial reduction for a spousal benefit claimed before FRA (POMS
 *  RS 00615.201). 25/36 of 1%/mo first 36 (a DIFFERENT first-segment rate than the
 *  worker's 5/9), then 5/12 of 1%/mo — the integer formula (144−n)/144 then
 *  (180−(n−36))/240 yields exactly 0.65 at 62/FRA67. */
export const spouseReduction = sourced<ReductionSchedule>(
  { firstMonths: 36, firstRate: { numerator: 25, denominator: 36 }, laterRate: { numerator: 5, denominator: 12 } },
  {
    citation:
      'POMS RS 00615.201 (byte-pulled HTTP 200): "reduced by 25/36 of 1% for each of the first 36 months ... plus 5/12 of 1% for each month in excess of 36" — total 25% at 36 months. 25/36 of 1% = 1/144. DIFFERS from the worker 5/9 first-segment rate; converges to 5/12 beyond 36. Applies to the spousal EXCESS only (Method C, RS 00615.020) — the own RIB uses the worker schedule off the same month count.',
    directionalUntilPinned: false,
    pinTo: 'POMS RS 00615.201',
    legalBasis: '42 U.S.C. §402(b)/(c); 20 CFR 404.410',
  },
)

/** Delayed retirement credits — claiming the own benefit after FRA (POMS RS
 *  00615.690/.692). 2/3 of 1%/mo = 8%/yr for births 1943+; accrues from FRA through
 *  the month before 70 (36 months at FRA 67 → 1.24× PIA). */
export const delayedRetirementCredit = sourced<DelayedRetirementCredit>(
  { ratePerMonth: { numerator: 2, denominator: 3 }, throughAge: 70, bornFromYear: 1943 },
  {
    citation:
      'POMS RS 00615.692 §D (rate, byte-pulled HTTP 200) + RS 00615.690 §A.2 (window) / §B (the Jan-after-the-year-earned effective date): 2/3 of 1% per increment month = 8%/yr for births 1943+; increment months run from FRA through the month BEFORE age 70 (36 at FRA 67 → +24% → 1.24× PIA). The step-down rates for 1935–1942 are OUT of scope — a pre-1943 birth on the DRC path must FAIL LOUD, never default to 8%.',
    directionalUntilPinned: false,
    pinTo: 'POMS RS 00615.692 / RS 00615.690',
    legalBasis: '42 U.S.C. §402(w)',
  },
)

/** Survivor (widow/er) age reduction (POMS RS 00615.301/.310). 28.5% max at age 60
 *  (→ .715 floor), held constant across cohorts by varying the per-month fraction
 *  (derive from the 60→survivor-FRA span; 19/56 at survivor-FRA 67, NOT the
 *  FRA-65-only 19/40). Disabled survivors (DWB) take the flat 28.5% from 50. */
export const survivorReduction = sourced<SurvivorReduction>(
  { earliestAge: 60, disabledEarliestAge: 50, maxReductionPct: 0.285 },
  {
    citation:
      'POMS RS 00615.301 §B.1 (byte-pulled) + RS 00615.310 (DWB): aged WIB from 60, max reduction 28.5% (→ .715 of the unreduced WIB) held at 28.5% across cohorts by varying the per-month fraction (19/56 at survivor-FRA 67; 19/40 at FRA 65) — DERIVE from the 60→survivor-FRA span, never hardcode 19/40. Disabled (DWB) payable from 50 at the flat 28.5%, no further reduction below 60. The reduction LOCKS at the claim age (no post-claim ramp — plan §6). The deceased\'s DRCs flow through per RS 00615.301/.702 (NOT .320, whose DRC clause is RIB-LIM-internal).',
    directionalUntilPinned: false,
    pinTo: 'POMS RS 00615.301 / RS 00615.310',
    legalBasis: '42 U.S.C. §402(e)/(f)',
  },
)

/** RIB-LIM — the cap on a survivor benefit when the deceased claimed reduced RIB
 *  before death (POMS RS 00615.320): the LARGER of 82.5% of the death PIA or the
 *  deceased's actual reduced benefit. 82.5% is a FLOOR within the cap, not a haircut. */
export const ribLim = sourced<RibLim>(
  { floorPctOfDeathPia: 0.825 },
  {
    citation:
      'POMS RS 00615.320 (byte-pulled HTTP 200): a widow(er) benefit is limited to the LARGER of 82.5% of the NH death PIA or the reduced RIB/DIB the NH would have been entitled to if alive — a "larger-of", 82.5% a FLOOR within the cap, NOT a flat haircut. Printed example: reduced RIB $350 / PIA $374.90 → 0.825×374.90 = $309.29 (dime-floored $309.20) → WIB = max($350, $309.20) = $350.',
    directionalUntilPinned: false,
    pinTo: 'POMS RS 00615.320',
    legalBasis: '42 U.S.C. §402(e)/(f) (RIB-LIM)',
  },
)

/** The spousal benefit rate: 50% of the higher earner's UNREDUCED PIA (POMS RS
 *  00202.020). No DRCs on the spousal piece. */
export const spousalRate = sourced<number>(0.5, {
  citation:
    'POMS RS 00202.020 / RS 00615.201 A.1 (byte-pulled HTTP 200): the unreduced spouse benefit = one-half (50%) of the NH\'s UNREDUCED PIA — never the worker\'s claim-age-adjusted benefit, never DRC-inflated. No delayed-retirement credits accrue to the spousal piece.',
  directionalUntilPinned: false,
  pinTo: 'POMS RS 00202.020',
  legalBasis: '42 U.S.C. §402(b)/(c)',
  reVerifyEveryBuild: true,
  note: 'WATCH: a scored-but-UNENACTED proposal would phase 50%→33% by 2042 (SSA OACT solvency provisions, family.html). Base rate is 50% as of 2026-06-14. A `verify:ss` CI gate to catch enactment at build time is a future hardening (TODO) — for now the reVerifyEveryBuild marker + this note flag the watch.',
})

/** Deemed filing (BBA-2015 §831; POMS GN 00204.035): DOB on/after Jan 2, 1954 ⇒
 *  filing for own-retirement OR spousal deems BOTH (no restricted application). Both
 *  household cohorts (1969/1972) are fully subject. Survivor benefits are EXEMPT. */
export const deemedFilingDobCutoff = sourced<DeemedFilingCutoff>(
  { year: 1954, month: 1, day: 2 },
  {
    citation:
      'POMS GN 00204.035 §B.1.a (byte-pulled HTTP 200): DOB ≥ Jan 2, 1954 ⇒ filing for own retirement OR spousal (AUXSPO) deems a filing for BOTH, at any age — restricted application is eliminated. Both cohorts (1969/1972, turn 62 in 2031/2034) are fully subject ⇒ one claim age per person drives own + spousal jointly. SURVIVOR benefits are EXEMPT (the lone two-stage lever). Cite GN 00204.035 for the RULE — RS 00615.020 is the dual-entitlement AMOUNT math.',
    directionalUntilPinned: false,
    pinTo: 'POMS GN 00204.035',
    legalBasis: 'Bipartisan Budget Act of 2015 §831 (PL 114-74); 42 U.S.C. §402(r); 20 CFR 404.623',
  },
)

/**
 * Full-retirement-age in MONTHS for a birth year, for the retirement OR survivor
 * schedule. Mirrors `catchUpForAge`'s guards (insights 008/010/020; burned/062):
 * finiteness FIRST (a NaN passes every relational guard), integrality, a human-range
 * domain — then the first band whose `bornThrough` covers the year (null = open
 * tail). No silent default.
 *
 * EDGE (bounded, disclosed): the SSA "born Jan 1 → treated as the prior year" rule
 * needs a full DOB the model does not carry, so a Jan-1-born user is mis-bracketed by
 * one year. Both household cohorts (1969/1972) are interior to their bands.
 */
export const fraMonthsForBirthYear = (birthYear: number, kind: 'retirement' | 'survivor'): number => {
  if (!Number.isFinite(birthYear) || !Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2200) {
    throw new Error(
      `[constants] fraMonthsForBirthYear: birthYear must be a finite INTEGER in [1900, 2200] (got ${birthYear}) — insights 010/020, no silent default (burned/062)`,
    )
  }
  const table = kind === 'retirement' ? fullRetirementAge.value : survivorFullRetirementAge.value
  const band = table.find((b) => b.bornThrough === null || birthYear <= b.bornThrough)
  if (!band) {
    throw new Error(
      `[constants] fraMonthsForBirthYear: no ${kind} FRA band for birthYear ${birthYear} — the table must end in a null-terminated open band (burned/062)`,
    )
  }
  return band.fraMonths
}

/** The full Social Security constant table — also the iteration surface for the shape test. */
export const socialSecurityConstants = {
  fullRetirementAge,
  survivorFullRetirementAge,
  workerReduction,
  spouseReduction,
  delayedRetirementCredit,
  survivorReduction,
  ribLim,
  spousalRate,
  deemedFilingDobCutoff,
} satisfies Record<string, ConstantEntry>
