/**
 * devSeeds — DEV-only intake seeds (reached at `?seed=<key>`). Jump straight to a
 * worded result without hand-driving the ~8 intake screens — the ATC-friendly way
 * to cold-read any band/result change.
 *
 * DCE CONTRACT (exactly like the `?preview` harness): IntakeApp gates the read
 * behind `import.meta.env.DEV` and reaches this module by DYNAMIC import, so the
 * whole file — and every value below — is dead-code-eliminated from the prod
 * bundle (proven by grepping `dist/`). It never ships and never counts against
 * the entry-JS budget.
 *
 * EACH EXPORT IS A COMPLETE `ScenarioDraft`: `missingRequiredFacts` is empty and
 * `validateParams(build…)` ACCEPTS (proven by `devSeeds.test.ts` against the REAL
 * engine validator), so a seed always lands on a CONFIDENT — never indeterminate —
 * answer. The fixed `seed` makes the percentile fan REPRODUCIBLE across drives: a
 * render change shows as a render change, never a fresh random draw.
 *
 * LANDMINE: a `?seed` mutates only the in-memory `appModel` (same as a normal
 * intake) — nothing persists to IndexedDB. The ONE deliberate exception is
 * `plantDevVault` below (reached at `?vault=<key>`), which DOES write an encrypted
 * vault — the dev shortcut for exercising decrypt-on-return without re-driving the
 * intake AND the Save ceremony every time. It is equally DEV-gated + DCE'd.
 */
import type { ScenarioDraft } from '@store/memoryModel'
import type { BudgetLineItem, ScenarioV3 } from '@shared/model'
import {
  STATE_TAX_PROFILES,
  isPricedState,
  stateProfileKey,
  type PricedState,
  type StateTaxProfile,
} from '@engine/constants/stateTax'
import { scenarioFromDraft, currentEpochDay } from './scenarioFromDraft'

/** A fixed dev CRN seed → the same fan every drive (a reproducible cold-read).
 *  Any uint32 satisfies the engine's integer-seed gate; `ensureSeed` REUSES a
 *  pre-set seed (only mints when absent), so this holds across every recompute. */
const DEV_CRN_SEED = 0xbada55

/**
 * The all-retired, on-track couple Briggsy drove live (2026-06-28) — the SPINE
 * route (both `retired` ⇒ the confidence statement + spine band). 66/65, a single
 * $1M Traditional IRA at 60/30/10, both claiming Social Security at 67. At 66/65
 * nobody is pre-65 (no ACA quote required), but both are ≥ 64 (the IRMAA seed IS
 * required) — the draft carries it.
 *
 * EXTRAS (2026-07-11, the ask-for-Medicare-extras unit): the flagship MIXED-PROVENANCE
 * showcase — Alex entered $220/mo, Sam affirmed ~$0 (Medicare Advantage). One entered
 * dollar + one affirmed MA-$0, so the disclosure renders both fork arms. This funds LESS
 * than the typical-both (~$244+$244 since the U14 S0 refresh; ~$203+$203 before) the
 * absent-field engine would fund, so the drift the unit introduced (on-track → borderline
 * 8/10 under typical-both) reverses back to on-track.
 */
const retiredOnTrack: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'male',
      birthYear: 1960,
      currentAge: 66,
      workStatus: 'retired',
      retirementAge: 65,
      earnedIncomeReal: 0,
      pia: 30_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'female',
      birthYear: 1961,
      currentAge: 65,
      workStatus: 'retired',
      retirementAge: 63,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 1_000_000,
      // A no-ticker account requires the per-account manual blend (burned/062 —
      // never a silent default). 60/30/10 stocks/bonds/cash.
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [80_000, 80_000] },
  // The mixed-provenance extras showcase: Alex's entered dollar + Sam's affirmed MA-$0.
  medicareExtrasByPerson: [{ kind: 'entered', monthly: 220 }, { kind: 'none' }],
  annualSpendingReal: 78_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A mixed, still-working household — the DATE route (one `working` ⇒ the
 * fuck-off-date surface). Clones the proven `completeDateDraft` shape
 * (intakeMap.test.ts): 58 working / 60 retired, a 401(k) (with contribution +
 * match) and a Roth IRA, a pre-65 retiree so the ACA quote IS required, and the
 * per-person working-year IRMAA MAGI the date route needs.
 */
const stillWorking: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1968,
      currentAge: 58,
      workStatus: 'working',
      earnedIncomeReal: 150_000,
      pia: 28_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1966,
      currentAge: 60,
      workStatus: 'retired',
      retirementAge: 58,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: '401k',
      ticker: 'VTI',
      valueToday: 900_000,
      annualContribution: 20_000,
      employerMatchAnnual: 8_000,
    },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 200_000 },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 1_100,
    slcspMonthlyToday: 1_000,
    // C3 → B (simplified): only working-year investment income is stored; the pay half derives
    // from earnedIncomeReal at the boundary. Alex's IRMAA-MAGI = $150k earned + $30k investment
    // = $180k; retired Sam contributes 0. Override unchanged → byte-identical seeded outcome.
    workingYearInvestmentByPerson: [30_000, 0],
  },
  annualSpendingReal: 84_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A BORDERLINE already-retired couple — the SPINE route, for the two-pane HONESTY cold-read (D2d):
 * the projection band must draw its $0 depletion-to-ruin tail honestly in the promoted right pane,
 * beside a calm verdict word. 68/70, a single $640k Traditional IRA at 55/35/10 + a $70k Roth, LOW
 * Social Security (PIA 24k/16k) against a ~$71.6k spend, so the SS floor doesn't cover the gap and the
 * downside paths deplete. Lands "borderline, 7 of 10" (engine-probed 2026-07-11 under the extras
 * engine, seed 0xbada55: survival 0.71). Field DELIBERATELY ABSENT — the on-typical disclosure
 * flagship, so it funds the conservative-HIGH typical for both. That typical (~$203/mo/person) sank
 * this couple from borderline-7 to off-track-5, so the IRA moved 640k→760k to restore the NAMED
 * state (the earlier 520k→640k move was the Part-B pricing unit's). Most couples make it, but the
 * band's lower percentiles honestly descend toward $0. Older than `retired` on purpose: the shorter
 * horizon keeps the p90 plume from squashing the ruin tail. SURVIVED the U14 S0 extras refresh
 * ($203→~$244/mo/person, 2026-07-18) with the named state intact — no re-tune needed (the
 * devSeeds outcome pin is the witness).
 */
const retiredBorderline: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1958,
      currentAge: 68,
      workStatus: 'retired',
      retirementAge: 64,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1956,
      currentAge: 70,
      workStatus: 'retired',
      retirementAge: 66,
      earnedIncomeReal: 0,
      pia: 16_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 760_000,
      manualBlend: { kind: 'exact', stockPct: 55, bondPct: 35, cashPct: 10 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 70_000,
      manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [40_000, 40_000] },
  annualSpendingReal: 71_600,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A BORDERLINE still-working couple — the DATE route's analog for the honesty cold-read: a confirmed
 * fuck-off date whose projection band STILL touches $0 in its lower percentiles (the council's point:
 * even an on-track date honestly draws the ruin tail). 58/59 both working, a marginal $800k 401(k)-
 * style Traditional IRA + $140k Roth against a $74k spend, so the crowned date (≈ 7 years out, "9 of
 * 10") carries a fan whose p10/p25 descend to $0. CAVEAT for the cold-read: the long decumulation
 * horizon gives a ~$5.7M p90 plume that squashes the ruin tail toward the axis (the parked
 * long-horizon band-scale item) — `borderline` (spine) is the cleaner ruin-tail render. The non-
 * monotone ACA-cliff "doesn't hold" dip is NOT reachable here: v1's proportional drawdown never
 * straddles the 400%-FPL cliff non-monotonically (16 candidates swept) — it needs Act 3's conversion
 * controls to manufacture, so the live cliff dip stays a parked D2c item.
 */
const stillWorkingBorderline: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1968,
      currentAge: 58,
      workStatus: 'working',
      earnedIncomeReal: 95_000,
      pia: 26_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1967,
      currentAge: 59,
      workStatus: 'working',
      earnedIncomeReal: 85_000,
      pia: 22_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 800_000,
      manualBlend: { kind: 'exact', stockPct: 65, bondPct: 30, cashPct: 5 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 140_000,
      manualBlend: { kind: 'exact', stockPct: 80, bondPct: 15, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 1_300,
    slcspMonthlyToday: 1_150,
    // C3 → B (simplified): only investment income is stored; pay derives from earnedIncomeReal
    // at the boundary. Both work, pure wages — IRMAA-MAGI = earned ($95k, $85k) + investment
    // ($0, $0). Override unchanged → byte-identical seeded outcome.
    workingYearInvestmentByPerson: [0, 0],
  },
  annualSpendingReal: 74_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A DOA already-FAILING household — the SPINE route's grimmest honest reading, built to cold-read the
 * lever-agnostic figure-LESS "rethink" verdict clause (Council 2026-06-29). Both retired and UNDERWATER
 * from year one: a single $60k Traditional IRA against a $96k spend with low Social Security (PIA 16k/8k
 * ⇒ ~$24k/yr), so the SS floor leaves a ~$72k/yr draw on $60k — every market path depletes inside the
 * first year. Lands "already-failing, 0 of 10": survival ≈ 0 AND median depletion ≤ 2yr (selectOutcome
 * State's early-death reservation), so the verdict renders the figure-less rethink clause, never a
 * sufficient-sounding trim. Old + tiny on purpose: NO market path rescues it, so the state is structural
 * (devSeeds.test.ts pins outcomeState='already-failing' against the REAL engine, not just the validator).
 */
const retiredFailing: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1954,
      currentAge: 72,
      workStatus: 'retired',
      retirementAge: 66,
      earnedIncomeReal: 0,
      pia: 16_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1953,
      currentAge: 73,
      workStatus: 'retired',
      retirementAge: 65,
      earnedIncomeReal: 0,
      pia: 8_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 60_000,
      manualBlend: { kind: 'exact', stockPct: 40, bondPct: 40, cashPct: 20 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [20_000, 20_000] },
  annualSpendingReal: 96_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/** One U9b budget line (labels read in the builder sheet — the cold-read wants real rows). */
const bline = (
  category: BudgetLineItem['category'],
  label: string,
  annualAmountReal: number,
  tier: BudgetLineItem['tier'],
): BudgetLineItem => ({ category, label, annualAmountReal, tier, startYear: 0 })

/**
 * The TWO-TIER RELIEF spine household (U9b Q2 — the relief-with-honesty cold-read):
 * `borderline`'s couple carrying an ITEMIZED budget + an OOP-medical figure. Engine-proven
 * (probe 2026-07-11 under the extras engine, seed 0xbada55): full track lands "On the line,
 * 7 of 10" (survival 0.726) while the essentials floor lands over-funded 9-of-10 (0.99) — the
 * widest honest relief spread, so the subordinate "even at just essentials…" line COLD-READS
 * against a scared verdict. Field DELIBERATELY ABSENT (funds the typical for both). The IRA is
 * OVERRIDDEN independently of `borderline` (one knob cannot serve both seeds); the extras
 * typical sank the full track to off-track-6, so the override moved 600k→720k to restore the
 * 7-vs-9 spread with the widest joint margin (full 0.02 from the 8-flip, floor a full grid
 * step over the 0.98 over-funded edge). The reconciliation invariant holds by construction:
 * annualSpendingReal = Σlines@0 (59,600) + injected M (6,000) = 65,600. All lines
 * lifelong-at-0 (as probed — a window would change the engine evaluation the proof pinned).
 */
const retiredBudget: ScenarioDraft = {
  ...retiredBorderline,
  enteredAccounts: retiredBorderline.enteredAccounts.map((a, i) =>
    i === 0 ? { ...a, valueToday: 720_000 } : a,
  ),
  budget: [
    bline('housing', 'Mortgage & taxes', 18_000, 'essentials'),
    bline('utilities', '', 4_800, 'essentials'),
    bline('food', 'Groceries', 9_600, 'essentials'),
    bline('transportation', '', 4_800, 'essentials'),
    bline('other', 'Everything else', 4_400, 'essentials'),
    bline('travel', 'See the kids', 12_000, 'discretionary'),
    bline('gifts', '', 6_000, 'discretionary'),
  ],
  annualSpendingReal: 65_600,
  health: { ...retiredBorderline.health, oopMedicalAnnual: 6_000 },
}

/**
 * The FLOOR<LIFESTYLE date split (U9b Q3 — both tracks dated, floor earlier):
 * `dateborder`'s working couple with a budget whose discretionary share separates the
 * tracks. Engine-proven (probe 2026-07-11 under the extras engine, provisional tier): floor
 * crowns at offset 1, lifestyle at 8 — the hero stays the LIFESTYLE date, the floor rides the
 * subordinate "essentials covered by ~year X" line, no inversion note. Reconciled: Σlines@0
 * (66,000) + M (8,000) = 74,000 (the same full total `dateborder` proved borderline-dated).
 *
 * PRE-65 ⇒ the extras field is DELIBERATELY ABSENT (the intake never asks a household with no
 * member ≥64 — a fork answer from a never-shown step is an impossible household, insight 079).
 * The post-65 extras the absent field funds sank the lifestyle track below the clearing bar
 * (it fell to no-date-in-window), so this seed OVERRIDES its OWN accounts (trad 800k→900k,
 * roth 140k→158k — NOT `stillWorkingBorderline`'s, which `dateborder`/`datemixed` share) to
 * re-crown floor@1 / lifestyle@8. `datestale` (the aged plant) rides these accounts, so the
 * override also keeps its floor crown INSIDE the 2-year window (@1) with the hero beyond (@8).
 */
const dateSplitSeed: ScenarioDraft = {
  ...stillWorkingBorderline,
  enteredAccounts: [
    { ...stillWorkingBorderline.enteredAccounts[0]!, valueToday: 900_000 },
    { ...stillWorkingBorderline.enteredAccounts[1]!, valueToday: 158_000 },
  ],
  budget: [
    bline('housing', 'Mortgage & taxes', 20_000, 'essentials'),
    bline('utilities', '', 4_000, 'essentials'),
    bline('food', 'Groceries', 10_000, 'essentials'),
    bline('transportation', '', 6_000, 'essentials'),
    bline('other', 'Everything else', 6_000, 'essentials'),
    bline('travel', 'Travel', 14_000, 'discretionary'),
    bline('gifts', 'Grandkids', 6_000, 'discretionary'),
  ],
  annualSpendingReal: 74_000,
  health: { ...stillWorkingBorderline.health, oopMedicalAnnual: 8_000 },
}

/**
 * The MIXED date case (U9b Q3 — floor dated, lifestyle NOT within the window): the same
 * couple wanting a much richer retirement (heavy discretionary). Engine-proven (probe
 * 2026-07-02, provisional tier): the essentials floor crowns at offset ≈ 4 while the full
 * lifestyle never clears inside the 10-year window — the hero renders the words + how-close
 * line, the floor line still gives the honest "essentials covered" beat. NOT the R27
 * inversion (floor earlier = the expected ordering; no disclosure note). Reconciled:
 * Σlines@0 (90,000) + M (8,000) = 98,000.
 *
 * R27 NOTE (the fourth prescribed seed, `dateinvert`, deliberately does NOT exist): the
 * floor>lifestyle inversion is UNREACHABLE in v1 — under proportional drawdown the bucket
 * ratios are preserved path-for-path, so ACA-MAGI is the SAME monotone function of total
 * outflow on both tracks, and the inversion needs {floor MAGI < 100% FPL ≤ lifestyle MAGI}
 * with floor outflow ABOVE lifestyle — jointly unsatisfiable. Probed empirically 2026-07-02
 * (11 configs × 11 offsets across trad-share straddle / near-cliff brokerage drift /
 * SS-claimed-bridge families: floor strictly stronger at EVERY offset). The render arm
 * stays fixture-pinned (FuckOffDate.test.tsx + dateSplit.test.ts). REACTIVATION TRIGGER:
 * U10's Roth-conversion lever adds MAGI with zero outflow — the coupling breaks by
 * construction, so a real `dateinvert` seed becomes owed the moment conversions ship
 * (the same trigger family as the parked ACA-cliff ladder dip).
 */
const dateMixedSeed: ScenarioDraft = {
  ...stillWorkingBorderline,
  budget: [
    bline('housing', 'Mortgage & taxes', 24_000, 'essentials'),
    bline('utilities', '', 5_000, 'essentials'),
    bline('food', 'Groceries', 12_000, 'essentials'),
    bline('transportation', '', 6_000, 'essentials'),
    bline('other', 'Everything else', 5_000, 'essentials'),
    bline('travel', 'The good years', 26_000, 'discretionary'),
    bline('gifts', '', 12_000, 'discretionary'),
  ],
  annualSpendingReal: 98_000,
  health: { ...stillWorkingBorderline.health, oopMedicalAnnual: 8_000 },
}

/**
 * THE NON-MONOTONE ACA-CLIFF DIP (U10 — the HARD pre-ship gate's seed; council 2026-06-29).
 * The first REAL engine-produced non-monotone success-vs-date curve, DERIVED (insight 025 —
 * mechanism before fixture; hunt 2026-07-03, 5-agent fan-out after 10 monotone grids):
 *
 * THE BUDGET-COLLISION CHANNEL. Budget line windows are RETIREMENT-ANCHORED (compileBudget
 * indexes offsets from the candidate's work-stop), while the Roth conversion is ABSOLUTE-year
 * — so a go-go-years travel line [stop..stop+3] SLIDES across the fixed conversion window
 * [4..7] as the candidate offset moves. Their overlap is a k-dependent TENT peaking at
 * offsets 3-4: in a collision year the lifestyle track's travel-draw MAGI stacks on the
 * conversion MAGI and crosses the 400%-FPL cliff (full unsubsidized premium ~$50k at slcsp
 * $4,200/mo); a travel-only or conversion-only year stays subsidized (~$7k net). On a
 * household sitting right at the 0.85 bar, the tent punches offsets 3-4 UNDER the bar while
 * 0-2 clear and the SS-claim year (62 = offset 5) forms the durable crown. The FLOOR track
 * (no travel) never collides and stays MONOTONE — the dip is lifestyle-specific by mechanism.
 *
 * ENGINE-PROVEN AT BOTH TIERS (16k final / 2k provisional, seed 0xbada55): lifestyle
 * confirmed-date@5 with nonMonotoneOffsets [0,1,2]; floor confirmed-date@0, no dips — the
 * outcome pin lives in devSeeds.test.ts. A pure conversion/premium channel CANNOT invert the
 * curve (the work-year money gradient dominates ~2:1 — the hunt's structural finding); the
 * dip needs the collision. Note the reconciliation invariant: Σlines@0 = 20k+16k+42k = 78k =
 * annualSpendingReal (no OOP-medical figure on this household).
 *
 * EXTRAS RE-TUNE (2026-07-11): PRE-65 ⇒ the extras field is DELIBERATELY ABSENT (insight 079 —
 * the intake never asks a sub-64 household). The absent-field typical the engine funds post-65
 * added flat cost that sank offsets 0-2 below the clearing bar (nonMonotoneOffsets collapsed to
 * [], the dip lost), so the portfolio moved 567k→644k / 243k→276k — the SMALLEST bump that
 * re-lifts 0,1,2 over the bar at BOTH tiers while offset 3 stays under it (the two-tier
 * intersection is narrow: offset 2 clears at final qL 0.85 with offset 3 held at 0.84; a
 * further ~6k pushes provisional to [0,1,2,3]). Crown@5 and the monotone floor are unmoved.
 *
 * EXTRAS RE-TUNE 2 (2026-07-18, the U14 S0 medicareExtrasTypical refresh $203→~$244/mo/person):
 * the richer absent-field typical sank offset 2 again (nm collapsed to [0,1] — provisional AND
 * final), so the portfolio moved 644k→658k / 276k→282k — probed as the SMALLEST grid bump
 * restoring nm=[0,1,2] + crown@5 + monotone floor at BOTH tiers (the +12k/+5k midpoint still
 * loses offset 2 at final; +18k/+8k overshoots provisional to [0,1,2,3]). Same knife-edge, same
 * mechanism, one constant richer.
 */
const dateDipSeed: ScenarioDraft = {
  people: [
    {
      name: 'Alex', sex: 'female', birthYear: 1969, currentAge: 57,
      workStatus: 'working', earnedIncomeReal: 75_000, pia: 26_000, socialSecurityClaimAge: 62,
    },
    {
      name: 'Sam', sex: 'male', birthYear: 1969, currentAge: 57,
      workStatus: 'working', earnedIncomeReal: 35_000, pia: 20_000, socialSecurityClaimAge: 62,
    },
  ],
  enteredAccounts: [
    { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 658_000, annualContribution: 8_000, employerMatchAnnual: 4_000 },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 282_000 },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 4_200,
    slcspMonthlyToday: 4_200,
    workingYearInvestmentByPerson: [10_000, 0],
  },
  budget: [
    bline('housing', 'Home', 20_000, 'essentials'),
    bline('food', 'Living', 16_000, 'essentials'),
    { category: 'travel', label: 'Go-go years', annualAmountReal: 42_000, tier: 'discretionary', startYear: 0, endYear: 3 },
  ],
  annualSpendingReal: 78_000,
  spendEntryPeriod: 'year',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
  rothConversion: { annualAmountReal: 34_000, startYearOffset: 4, years: 4 },
}

/**
 * THE CUSTOM-DRAWDOWN-ORDER round-trip seed (U10 — the persisted 'custom' policy + `drawdownOrder`).
 * Every other seed rides the `proportional` default; this one is the ONLY seed that drives the
 * 'custom' policy and an explicit bucket order through `plantDevVault`'s scenarioFromDraft → codec
 * encode/decode round-trip — the biconditional (order present iff policy 'custom') has to survive
 * byte-faithfully, and no seed exercised it until now.
 *
 * THREE DISTINCT BUCKETS on purpose: a $725k Traditional IRA (pretax) + a $300k brokerage (taxable,
 * $180k basis) + a $200k Roth. The order is INERT on a single collapsed pool (reduce-to-spine —
 * model.ts:180), so an all-in-one-bucket household could carry a 'custom' order that never governs
 * anything and the round-trip would still "pass" while proving nothing. With the buckets split, the
 * order genuinely picks which bucket funds each year's net withdrawal → different ordinary income →
 * different lifetime tax. The order `['roth', 'pretax', 'taxable']` (Roth-first) is DELIBERATELY not
 * expressible by any named policy (every named order ends at Roth), so a decode that silently decayed
 * it to a named policy would be caught. All-retired (66/67, both past 65 ⇒ no ACA quote, both ≥ 64 ⇒
 * the IRMAA seed IS required) — the SPINE route, so devSeeds.test.ts can runEngine it directly and
 * pin the OUTCOME: it resolves tax-aware, and the same household run `proportional` pays a visibly
 * different lifetime tax (the order is not inert). A dev seed, not a golden — the pin is an
 * INEQUALITY (order ≠ proportional), never a hand-typed dollar the engine could drift under.
 */
const customOrderSeed: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1959,
      currentAge: 67,
      workStatus: 'retired',
      retirementAge: 65,
      earnedIncomeReal: 0,
      pia: 30_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1960,
      currentAge: 66,
      workStatus: 'retired',
      retirementAge: 64,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      // NOT $750k — that exact value is the top IRMAA MFJ MAGI threshold (a canonical
      // dated figure), so the constants single-source gate rejects it inlined here.
      valueToday: 725_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      ownerIndex: 0,
      kind: 'brokerage',
      valueToday: 300_000,
      basis: 180_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 200_000,
      manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: { irmaaMagiSeed: [80_000, 80_000] },
  annualSpendingReal: 96_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'custom',
  drawdownOrder: ['roth', 'pretax', 'taxable'],
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * P3·U11 — the HEALTHCARE cold-read seed: a retired PRE-65 couple (61/59) on the SPINE route,
 * so the headline run emits the per-year healthReadout series and the Healthcare sheet quotes
 * its full empirical picture — the ACA net-cost median, the cliff frequency, the 22¢-class
 * shadow rate, the cliff headroom, then (post-65 years) the Medicare look-back story. An
 * APPLIED conversion keeps the shadow-rate story live, and the marketplace quote pair prices
 * the window (healthcarePriced ⇒ the door shows). Neither member is ≥ 64 ⇒ no IRMAA seed
 * required. Engine-proven in devSeeds.test.ts: the spine resolves AND the readout carries a
 * priced year-0 with a real net premium.
 */
const retiredHealth: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'male',
      birthYear: 1965,
      currentAge: 61,
      workStatus: 'retired',
      retirementAge: 60,
      earnedIncomeReal: 0,
      pia: 28_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'female',
      birthYear: 1967,
      currentAge: 59,
      workStatus: 'retired',
      retirementAge: 58,
      earnedIncomeReal: 0,
      pia: 22_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'brokerage',
      valueToday: 900_000,
      basis: 800_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 35, cashPct: 5 },
    },
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 900_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      ownerIndex: 1,
      kind: 'roth-ira',
      valueToday: 150_000,
      manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 },
    },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    enrolledPremiumMonthlyToday: 1_600,
    slcspMonthlyToday: 1_400,
    oopMedicalAnnual: 4_000,
  },
  rothConversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 4 },
  annualSpendingReal: 78_000,
  spendEntryPeriod: 'year',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * P3·U11 follow-up (the post-65 Medicare pricing unit) — the ALL-65+ STILL-WORKING household on
 * the DATE route: the live drive for the disclosure's date-route arm (insight 080). Alex is 66 and
 * still working (deferring Medicare until retirement), Sam is 65 and retired — so no member is
 * pre-65 (the marketplace questions are never asked; `healthcarePriced` reads FALSE, no ACA door),
 * yet `dateSearch.ts:222` forces `healthcareEnabled: true` on every candidate, so Medicare IS priced
 * on this route. The RETIRED age-predicate (`medicareUnpriced`) called this household "Medicare not
 * priced" over numbers Medicare had already moved — the exact false statement insight 080 names;
 * `showMedicarePricedNote` fixes it, and this seed proves the fix live. Both ≥ 64 ⇒ the IRMAA seed
 * IS required; Alex working ⇒ the working-year investment figure IS required (its explicit-0 sibling
 * for retired Sam). A generous portfolio (1.3M 401(k) + 250k Roth vs 78k spend) so it crowns a
 * confident date — the ladder + floor band render for the fit arm. Engine-proven in devSeeds.test.ts.
 */
const stillWorkingAllMedicare: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'male',
      birthYear: 1960,
      currentAge: 66,
      workStatus: 'working',
      earnedIncomeReal: 120_000,
      pia: 30_000,
      socialSecurityClaimAge: 67,
    },
    {
      name: 'Sam',
      sex: 'female',
      birthYear: 1961,
      currentAge: 65,
      workStatus: 'retired',
      retirementAge: 63,
      earnedIncomeReal: 0,
      pia: 24_000,
      socialSecurityClaimAge: 67,
    },
  ],
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: '401k',
      ticker: 'VTI',
      valueToday: 1_300_000,
      annualContribution: 20_000,
      employerMatchAnnual: 8_000,
    },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 250_000 },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    // No ACA quote pair — no member is pre-65, so the marketplace questions are never asked.
    // Alex still works past 65: the working-year IRMAA-MAGI = the entered salary + this investment
    // figure; retired Sam contributes 0 (the explicit-0, never a silent skip). Both ≥ 64 ⇒ the
    // 2-year IRMAA seed is required.
    irmaaMagiSeed: [90_000, 90_000],
    workingYearInvestmentByPerson: [15_000, 0],
  },
  annualSpendingReal: 78_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

// ---------------------------------------------------------------------------
// The state-tax faces (the state-tax unit; the state-carrying seed increment). Each is a
// `retiredOnTrack` clone (66/65, both retired) carrying ONE `retirementState` — so the state
// clause renders inside the all-65+ `medicarePricedNote` block (ConfidenceStatement) and the
// SPINE overlay prices (or byte-identically no-ops) that state. `pricedStateForRun` reads the
// PRODUCER'S OUTPUT (`buildSpineParams`' overlay), never draft truthiness (insight 081).
// ---------------------------------------------------------------------------

/**
 * THE NC-PRICED AFFIRMATION FLAGSHIP — `retiredOnTrack`'s couple in North Carolina. NC's 3.99%
 * flat tax genuinely BITES: the private-sector Traditional-IRA draw is fully taxed at the flat rate
 * (SS exempt, no age carve-out), AND — because this all-retired household develops a taxable
 * brokerage bucket from reinvested RMD surplus in the RMD years — NC also taxes those realized gains
 * as ordinary income (no LTCG preference). The drag is real enough to PUSH the state-absent twin's
 * on-track (survival 0.8555) DOWN across the on-track band edge to BORDERLINE (survival 0.838) —
 * engine-proven in devSeeds.test.ts, recorded not assumed. This is the seed the priced verdict
 * affirmation + narrowed residual ("… North Carolina …") cold-reads on BOTH mounts; the pin is the
 * lifetime-tax INEQUALITY vs the twin plus the found borderline state (re-tune the knob on drift,
 * never loosen the pin — the standing C3 law).
 */
const ncAffirmation: ScenarioDraft = { ...retiredOnTrack, retirementState: 'NC' }

/**
 * THE PA AFFIRMATION ("usually a small piece") — `retiredOnTrack`'s couple in Pennsylvania. At
 * qualified age (both 65+) PA EXEMPTS the IRA withdrawal AND conversions, and SS is exempt — but PA
 * taxes taxable-account income (`capGains: taxed-ordinary` at 3.07%), and this all-retired household
 * DEVELOPS a taxable brokerage bucket from reinvested RMD surplus, so PA prices a SMALL non-zero
 * state tax on those realized gains. Working memory guessed byte-identity; the engine REFUTES it —
 * devSeeds.test.ts DERIVES the true relation and pins it: PA lifetime tax is slightly ABOVE the twin
 * (the "usually a small piece") yet leaves the verdict UNMOVED (survival identical, still on-track).
 */
const paAffirmation: ScenarioDraft = { ...retiredOnTrack, retirementState: 'PA' }

/**
 * THE FL $0-CONSTITUTIONAL AFFIRMATION — `retiredOnTrack`'s couple in Florida. FL is a sourced
 * constitutional $0 (Fla. Const. Art. VII § 5(a)): every decumulation dollar incurs $0 state tax,
 * so the affirmation "no state income tax — nothing to add" ships as an HONEST fact (FL's presence
 * in PRICED_STATES is exactly what distinguishes it from an unbuilt-state omission). devSeeds.test.ts
 * DERIVES the relation to the twin (a priced $0 profile — the engine takes the priced branch and
 * computes zero) and pins what it finds.
 */
const flAffirmation: ScenarioDraft = { ...retiredOnTrack, retirementState: 'FL' }

/**
 * THE ANSWERED-BUT-UNPRICED FACE — `retiredOnTrack`'s couple who chose "somewhere else". `'elsewhere'`
 * is an EXPLICIT roster member (a persisted fact, distinct from never-asked ABSENT), but it is NOT in
 * PRICED_STATES, so the engine takes the structural `+ 0` no-op branch: the verdict renders the
 * `verdictMedicareResidual` monolith VERBATIM (no state clause) and the run is BYTE-IDENTICAL to the
 * state-absent twin — the reduce-to-spine membership witness (spec S2.5). `pricedStateForRun` reads
 * `undefined` (roster membership, never a truthy string check). The unpriced direction the 2026-07-15
 * bundle never showed the lenses (the cards' noted coverage gap).
 */
const elsewhereAnswered: ScenarioDraft = { ...retiredOnTrack, retirementState: 'elsewhere' }

/**
 * THE DATE-ROUTE NC WITNESS — `stillWorkingAllMedicare` (the all-65+ still-working `date65` shape) in
 * North Carolina. The date route rides its OWN state producer (`dateStatePriced`, off `buildDateInput`'s
 * `params.overlay` — the vector every swept candidate inherits), NOT the spine's `buildSpineParams`
 * (null on this route). Insight 080's lesson: the second producer gets its OWN live witness, so a
 * roster-gate regression that falsely priced (or failed to price) an 'elsewhere' date-route household
 * would surface HERE. devSeeds.test.ts pins the async date-route crown AND `pricedStateForRun === 'NC'`
 * via the date producer.
 */
const dateNcSeed: ScenarioDraft = { ...stillWorkingAllMedicare, retirementState: 'NC' }

/** The seed registry — `?seed=<key>` selects one. */
export const DEV_SEEDS = {
  retired: retiredOnTrack,
  date: stillWorking,
  borderline: retiredBorderline,
  dateborder: stillWorkingBorderline,
  failing: retiredFailing,
  budget: retiredBudget,
  datesplit: dateSplitSeed,
  datemixed: dateMixedSeed,
  dip: dateDipSeed,
  order: customOrderSeed,
  health: retiredHealth,
  date65: stillWorkingAllMedicare,
  nc: ncAffirmation,
  pa: paAffirmation,
  fl: flAffirmation,
  elsewhere: elsewhereAnswered,
  datenc: dateNcSeed,
} satisfies Record<string, ScenarioDraft>

export type DevSeedKey = keyof typeof DEV_SEEDS

/** Resolve a raw `?seed` value to its draft, or null for an unknown key. `Object.hasOwn`, not
 *  `in`: a bare `in` walks the prototype chain, so `?seed=toString`/`constructor`/`hasOwnProperty`
 *  would each resolve to an inherited Object.prototype function cast to ScenarioDraft (ultramode
 *  2026-07-02 nit — DEV-only, but an unsound cast is an unsound cast). */
export function resolveDevSeed(key: string): ScenarioDraft | null {
  return Object.hasOwn(DEV_SEEDS, key) ? DEV_SEEDS[key as DevSeedKey] : null
}

// ---------------------------------------------------------------------------
// `?vault=<key>` — the decrypt-on-return dev shortcut (DEV-only, DCE'd).
// ---------------------------------------------------------------------------

/** The fixed dev credentials a planted vault is minted with — chosen to clear the real passphrase
 *  floor (verified in `vaultRoundTrip.test.ts`), so `plantDevVault` never trips the KDF gate. The
 *  daily passphrase is what `?vault=<key>` PRE-FILLS on the unlock screen (App), so opening a planted
 *  vault is one click — no typing. Distinct daily/recovery (the `firstSave` negative-pairing gate). */
export const DEV_VAULT_PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
export const DEV_VAULT_RECOVERY = 'lattice harbor cinder vellum 48 thicket'

/**
 * DEV-only: plant an encrypted vault from a dev seed with {@link DEV_VAULT_PASSPHRASE}, so the
 * decrypt-on-return flow (probe → UnlockScreen → hydrate) can be exercised WITHOUT re-driving the
 * intake and the Save ceremony. Idempotent — locks + clears any existing vault first, so reloading
 * `?vault=<key>` re-plants cleanly. The crypto/store graph is DYNAMICALLY imported so this module's
 * static top level stays light (and the whole thing is DEV-gated + DCE'd from prod, like the seeds).
 * Returns the seed's `ScenarioV3` on success (App pre-fills the passphrase + shows the unlock screen)
 * or a reason string for the (dev-only) failure log.
 */
type PlantResult = 'ok' | 'unknown-seed' | 'not-ready' | 'floor-fail' | 'write-failed'

// Memoize the in-flight plant per key so React StrictMode's dev double-invoke of the `?vault` effect
// runs the plant exactly ONCE. Two concurrent plants race the session epoch (the second's lock()
// cancels the first's mid-derive firstSave) and the clear→firstSave window → a spurious write-failed.
// A full page reload re-evaluates this module → fresh memo → re-plants cleanly.
let plantInFlight: { readonly key: string; readonly promise: Promise<PlantResult> } | null = null

export function plantDevVault(key: string): Promise<PlantResult> {
  if (plantInFlight && plantInFlight.key === key) return plantInFlight.promise
  const promise = runPlantDevVault(key)
  plantInFlight = { key, promise }
  return promise
}

/**
 * P3·U13 — the AGED-vault doctoring (the household as if saved ~2 years ago under older
 * rulebooks; see {@link AGED_PLANTS} for the keys that ride it). Doctors the freshly-built
 * scenario BEFORE the write — savedAt back ~760 days (the elapsed line reads "about 2 years
 * ago", COHERENT with the -2 plan anchor below: a real save mints both together, so their
 * years must agree or the fixture describes an impossible household — the first Caddie chair
 * pass caught the old -400/-2 mismatch reading "about a year ago" over a 2024 anchor), the
 * tax + healthcare stamps one vintage back (their clocks fire), the blend snapshot one year
 * back (the blend clock — without this, `stalenessBlendSpine`/`stalenessDate` are unreachable
 * live: every save stamps `dateVintage` fresh, so the U13 cold-read batch's blend line would
 * silently never render for anyone's eye), the plan anchor back 2 calendar years (the
 * wall-time framing). The ONLY way to see the re-entry staleness surfaces live today — every
 * organic save is same-day fresh. appDefaultVersion stays CURRENT deliberately: the Q7
 * saved-era map has one era, so that note is v1-inert by design (a fake era in the shipped
 * map would be a lie to render one). EXPORTED for the devSeeds battery — the aged plants'
 * outcome pins drive the doctored scenario through the REAL draft→input→search chain.
 *
 * NEVER wire a PRICED-STATE base to this doctor (the state-tax unit; F2 supersession 2026-07-16):
 * the −2y `startCalendarYear` aging (→ 2024) precedes NC/PA's earliest rate row (2026), and the
 * engine's priced-state lower bound (`simulate.ts:640-643`, the 2026-07-15 ultramode fold whose
 * comment names "an aged dev plant" as the exact anticipated caller) REFUSES it — the recompute
 * demotes to the R19 calm indeterminate and no verdict renders. A priced-state stale plant rides
 * {@link doctorStateStaleVault} (savedAt-only, startCalendarYear + all vintages UNTOUCHED, ONLY the
 * state profile aged). This doctor leaves `stateTaxVintage` untouched (spread through) by design.
 * The rule is ENFORCED by the guard below (the review's fold — its light sibling fail-louds on a
 * mis-wire, so this one does too; prose alone held the asymmetry).
 */
export function doctorStaleVault(s: ScenarioV3, todayEpochDay: number): ScenarioV3 {
  if (s.retirementState !== undefined && isPricedState(s.retirementState)) {
    throw new Error(
      `doctorStaleVault must never take a priced-state base (got ${s.retirementState}): its -2y ` +
        `startCalendarYear aging precedes the state's earliest rate row, and the engine's ` +
        `priced-state lower bound (simulate.ts:640) demotes the recompute to the R19 calm ` +
        `indeterminate — no verdict renders. Use doctorStateStaleVault (the F2 supersession).`,
    )
  }
  // A PRE-EXTRAS-ERA save (insight 079 truthfulness): the ask-for-Medicare-extras unit did not
  // exist ~2 years ago, so the aged model carries NEITHER the per-person fork field NOR the
  // typical's adoption-vintage in its healthcare stamp — both are STRIPPED. An entered fork
  // answer from a never-shipped step, or a vintage minted by an unshipped unit, would describe
  // an impossible household. Absent fork ⇒ the current engine conservatively funds the typical
  // on re-run (honest degradation); absent vintage ⇒ the U13 comparator reads "not-comparable",
  // never "the typical moved" (the extras-typical clock's own absence-means-not-applicable arm).
  const { medicareExtrasByPerson: _strippedExtras, ...preExtras } = s
  let staleHealthcare = undefined as ScenarioV3['healthcareVintage']
  if (s.healthcareVintage !== undefined) {
    const { medicareExtrasTypicalVintage: _strippedVintage, ...hv } = s.healthcareVintage
    staleHealthcare = { ...hv, coverageYear: hv.coverageYear - 1, partBStandardMonthly: hv.partBStandardMonthly - 10 }
  }
  return {
    ...preExtras,
    savedAt: todayEpochDay - 760,
    startCalendarYear: s.startCalendarYear - 2,
    taxVintageDetail: { taxYear: (s.taxVintageDetail?.taxYear ?? 2026) - 1, legalBasis: 'TCJA (the pre-OBBBA dev fixture)' },
    healthcareVintage: staleHealthcare,
    // Year-decrement (never a fixed date): stays one vintage behind whatever the live
    // BLEND_SNAPSHOT_AS_OF becomes, so the clock fires by construction, forever.
    dateVintage:
      s.dateVintage === undefined
        ? undefined
        : {
            ...s.dateVintage,
            blendSnapshotAsOf: `${Number(s.dateVintage.blendSnapshotAsOf.slice(0, 4)) - 1}${s.dateVintage.blendSnapshotAsOf.slice(4)}`,
          },
  }
}

/** A priced state's decumulation profile aged one rate-step back — the dev-fixture idiom (the
 *  `taxVintageDetail` "pre-OBBBA dev fixture" precedent): a plausible OLDER, higher flat rate dated
 *  ~2 calendar years back (NC 3.99%@2026 → 4.49%@2024, the conservative overstating direction),
 *  serialized so the string at `stateProfileKey(state)` diverges from the current stamp and
 *  `controls.stateTaxMoved` fires. This ages the STATE CONSTANT's own schedule inside the persisted
 *  stamp — NOT the household's `startCalendarYear` (untouched by the light doctor), so it never trips
 *  the engine's priced-state year bound. FL (rateSchedule null) has nothing to age (constitutional $0,
 *  never stales) — handed FL, this THROWS rather than silently returning a non-diverging profile
 *  (the ultramode review's 6-lens convergence: FL passes `isPricedState`, so without this the light
 *  doctor's "never a silent no-op" promise had an FL-shaped hole — a plant whose clock can never fire). */
function agedStateProfile(state: PricedState): string {
  const current = STATE_TAX_PROFILES[state]
  const firstStep = current.rateSchedule?.steps[0]
  if (firstStep === undefined) {
    throw new Error(
      `agedStateProfile(${state}): a schedule-less priced state has no rate step to age — its profile ` +
        `can never diverge from the fresh stamp, so an aged plant on this base could never fire the ` +
        `state-tax clock (FL's constitutional $0 never stales). A wiring error, never a silent no-op.`,
    )
  }
  const older: StateTaxProfile = {
    ...current,
    rateSchedule: {
      steps: [{ fromYear: firstStep.fromYear - 2, rate: Math.round((firstStep.rate + 0.005) * 1e4) / 1e4 }],
    },
  }
  return JSON.stringify(older)
}

/**
 * The state-tax unit's LIGHT stale doctor (F2 supersession 2026-07-16) — a PRICED-state household as
 * if saved earlier THIS SAME calendar year under an older state rulebook. It moves ONLY two things:
 * `savedAt` back 150 days (the elapsed line reads "earlier this year") and the household's OWN state
 * profile one rate-step back ({@link agedStateProfile}). Everything else stays FRESH.
 *
 * WHY NOT {@link doctorStaleVault} (the whole reason this exists): that doctor ages `startCalendarYear`
 * −2 (→ 2024), and the engine's priced-state lower bound (`simulate.ts:640-643`) REFUSES a priced-NC
 * household whose year-0 precedes NC's earliest rate row (2026) — the recompute demotes to the R19
 * calm indeterminate and no verdict renders (S2's insight-033 live drive caught exactly this). It was
 * also organically impossible: `retirementState` shipped 2026-07-15, so no genuinely-old save could
 * carry it.
 *
 * THE COHERENCE CONSTRAINT: `savedAt`'s calendar year SHOULD equal `startCalendarYear` (untouched —
 * the two describe the same save moment), and −150 days holds that from a MID-YEAR wall-clock
 * (June–December, where the walks and fit arms run). A Jan–May drive lands `savedAt` in the PRIOR
 * year — harmless, verified: nothing renders the save YEAR (the elapsed line is days-gated and
 * suppressed under a year; every fired note is year-agnostic), and the engine reads only the
 * untouched `startCalendarYear` (the load-bearing half of the constraint) — but the same-year
 * framing itself only holds mid-year; don't tighten copy against it in an H1 drive. The tax /
 * healthcare / date vintages are left FRESH (a same-year save carries same-year vintages) — so the
 * ONLY clock that fires is the state-tax one: the `stalenessStateTax` note renders in ISOLATION
 * (a cleaner face-#4 cold read), and the affirm recompute lands the SAME engine-proven verdict as
 * `?seed=nc` (borderline).
 *
 * EXPORTED for the devSeeds battery (like {@link doctorStaleVault}). Fail-loud if handed a
 * non-priced-state base — the ONLY legitimate caller is a priced-state aged plant (`statestale`).
 */
export function doctorStateStaleVault(s: ScenarioV3, todayEpochDay: number): ScenarioV3 {
  const hhState = s.retirementState
  if (s.stateTaxVintage === undefined || hhState === undefined || !isPricedState(hhState)) {
    throw new Error(
      `doctorStateStaleVault requires a priced-state base with a state-tax stamp; got ${String(hhState)} ` +
        `(a non-priced base can never fire the state-tax clock — a wiring error, never a silent no-op).`,
    )
  }
  return {
    ...s,
    savedAt: todayEpochDay - 150,
    stateTaxVintage: { ...s.stateTaxVintage, [stateProfileKey(hhState)]: agedStateProfile(hhState) },
  }
}

/** The AGED plants: `?vault=<key>` → a doctor over a base seed (each key names BOTH — the state-tax
 *  unit split the one doctor into two, so the dispatch carries the pairing). `stale` =
 *  the retired spine (the U13 staleness batch's original surface); `datestale` = the SPLIT
 *  date household (`datesplit` — floor crowns ≈1, lifestyle ≈8 at design time), the only
 *  live route to the floor's ARRIVED arm (`dateFloorCoveredPast`: elapsed 2 ≥ the floor
 *  offset — "penciled as covered … that's about now") beside a RE-DERIVED aged hero count
 *  (`dateInYearsAnchored` with n = offset − elapsed), plus the date-route gate wording
 *  (`stalenessDate`) no walk had ever rendered. The hero's own arrived arm
 *  (`dateInYearsPast`) needs elapsed ≥ the lifestyle crown (≈8y); savedAt's codec floor is
 *  2020 (~6y back), so it is NOT coherently mintable — it stays unit-pinned, never faked. */
/** One aged plant: the base seed it doctors + WHICH doctor (the state-tax unit split the single
 *  doctor into two — the spine/date stale plants ride the full {@link doctorStaleVault}; a
 *  priced-state stale plant rides the light {@link doctorStateStaleVault}, which never trips the
 *  engine's priced-state year bound). Both doctors share the `(ScenarioV3, todayEpochDay) → ScenarioV3`
 *  shape, so the dispatch is uniform. */
interface AgedPlant {
  readonly base: DevSeedKey
  readonly doctor: (s: ScenarioV3, todayEpochDay: number) => ScenarioV3
}

const AGED_PLANTS: Readonly<Partial<Record<string, AgedPlant>>> = {
  stale: { base: 'retired', doctor: doctorStaleVault },
  datestale: { base: 'datesplit', doctor: doctorStaleVault },
  // `statestale` = the NC-priced spine household (`nc`) doctored stale THIS SAME YEAR via the LIGHT
  // doctor (F2 supersession 2026-07-16). Base MUST be a PRICED-state household (NC): the
  // `controls.stateTaxMoved` clock is route-gated to the household's own priced state, so a stateless
  // base could never fire it; NC not FL because FL's constitutional $0 never stales. The full
  // doctorStaleVault's −2y aging (→ 2024) would trip the engine's priced-state year bound
  // (simulate.ts:640) → R19 indeterminate, so this plant rides `doctorStateStaleVault` (savedAt-only,
  // startCalendarYear + all vintages fresh) → the `stalenessStateTax` gate note fires in ISOLATION.
  statestale: { base: 'nc', doctor: doctorStateStaleVault },
}

async function runPlantDevVault(key: string): Promise<PlantResult> {
  const aged = Object.hasOwn(AGED_PLANTS, key) ? AGED_PLANTS[key] : undefined
  const draft = resolveDevSeed(aged?.base ?? key)
  if (draft === null) return 'unknown-seed'
  const built = scenarioFromDraft(draft)
  if (!built.ready) return 'not-ready'
  // The LOCAL-calendar chain, never a raw UTC epoch-day (the U13 basis catch — a second
  // ad-hoc clock read is exactly the class the 2026-07-09 ultramode unified away; DEV-only
  // here, but the plant feeds cold-reads and its elapsed line must agree with the app's).
  const scenario =
    aged !== undefined ? aged.doctor(built.scenario, currentEpochDay()) : built.scenario
  const [{ getVaultSession }, { checkPassphraseFloor }, { clearVault, openVaultDb }] = await Promise.all([
    import('./vaultSession'),
    import('@crypto/kdf'),
    import('@store/db'),
  ])
  const pass = await checkPassphraseFloor(DEV_VAULT_PASSPHRASE)
  const rec = await checkPassphraseFloor(DEV_VAULT_RECOVERY)
  if (!pass.ok || !rec.ok) return 'floor-fail'
  const session = await getVaultSession()
  await session.lock().catch(() => {}) // ensure 'locked' (drop any resident keys from a prior plant)
  await clearVault(await openVaultDb()) // idempotent replace — a prior planted vault would else block firstSave
  const r = await session.firstSave(scenario, pass.passphrase, rec.passphrase)
  if (!r.ok) return 'write-failed'
  // firstSave leaves the session UNLOCKED. Lock it so the planter leaves a clean ON-DISK vault the
  // unlock screen can re-open — else unlock() sees status 'unlocked' and refuses ('not-locked'),
  // which is exactly the decrypt-on-return path `?vault` exists to exercise.
  await session.lock()
  return 'ok'
}
