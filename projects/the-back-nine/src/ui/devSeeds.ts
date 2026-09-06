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
import type { BudgetLineItem, RecommendationGoal, ScenarioV3 } from '@shared/model'
import {
  STATE_TAX_PROFILES,
  isPricedState,
  stateProfileKey,
  type PricedState,
  type StateTaxProfile,
} from '@engine/constants/stateTax'
import { solverAssumedHeirBracket } from '@engine/constants'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { buildSolveRequest } from '@intake/solveDispatch'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'
import { draftFromScenario } from './draftFromScenario'
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
 *
 * TREND RE-TUNE (2026-07-19, the Medicare-cost-trend sourcing unit): trended Part B + scaled
 * IRMAA surcharges shaved this household's survival 0.8555 → 0.8185 (on-track → borderline —
 * RECORDED before any re-tune, the pricing-unit precedent). The IRA moved 1.00M → 1.055M: the
 * probed window is NARROW — +40k lands the twin exactly AT the 0.85 edge (band-edge fragile),
 * +60k lifts the NC face over the edge too (killing the nc seed's crossing purpose); +55k
 * restored twin 0.8585 on-track / NC 0.8425 borderline with balanced margins both sides — a state that
 * ENDED when S.L. 2026-41's 2027+ rate cut was pinned into `ncRateSchedule` (2026-08-02): NC now lands
 * ON-TRACK beside its twin, so no priced-state seed crosses the band today. A purpose-built
 * band-crossing seed + its state-off twin is Briggsy's call (register Tier 3).
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
      valueToday: 1_055_000,
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
    // Sam retired at 58 and is 60 — pre-65 while Alex keeps working, so this household is exactly
    // the one the employer-coverage question exists for, and the flagship date route would be
    // REFUSED without an answer. Answered `true` (Alex's plan at work covers them both), which is
    // the premise the window gate silently assumed for every such household before the question
    // shipped — so `?seed=date` keeps its crown and its outcome stays byte-identical.
    // The `false` arm has its own witness: `?seed=datesolo`.
    employerPlanCoversRetiredMember: true,
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
 * tracks. **RE-MEASURED 2026-07-31 through the real date search, BOTH tiers — quote these WITH the
 * tier or you will file the wrong number (this block previously read "floor crowns at offset 1,
 * lifestyle at 8", labelled Engine-proven, and both figures were wrong):**
 *   provisional (2,000 paths) — floor **2** `confirmed-date` · lifestyle **10** `window-edge-unconfirmed`
 *   final       (16,000 paths) — floor **2** `confirmed-date` · lifestyle **9** `confirmed-date`
 * The LIVE surface runs `final` (`IntakeApp.tsx:278`, `Result.tsx:275`/`:289`), so the shipped hero is
 * the 9 — and it is a CONFIRMED date, i.e. the band owes no edge hedge there. The 10 is real but is a
 * provisional-tier reading, and it is `window-edge-unconfirmed`: during entry the hedge RENDERS and
 * then WITHDRAWS when final lands. That transient has never been cold-read.
 * The hero stays the LIFESTYLE date, the floor rides the
 * subordinate "essentials covered by ~year X" line, no inversion note. Reconciled: Σlines@0
 * (66,000) + M (8,000) = 74,000 (the same full total `dateborder` proved borderline-dated).
 *
 * PRE-65 ⇒ the extras field is DELIBERATELY ABSENT (the intake never asks a household with no
 * member ≥64 — a fork answer from a never-shown step is an impossible household, insight 079).
 * The post-65 extras the absent field funds sank the lifestyle track below the clearing bar
 * (it fell to no-date-in-window), so this seed OVERRIDES its OWN accounts (trad 800k→900k,
 * roth 140k→158k — NOT `stillWorkingBorderline`'s, which `dateborder`/`datemixed` share) to
 * re-crown the split. `datestale` (the aged plant) rides these accounts, so the override also keeps
 * its floor crown inside the 2-year elapsed window with the hero beyond it.
 * **⚠️ MEASURED 2026-07-31, and the margin is thinner than the old "@1" suggested: the floor crowns
 * at 2, and `devSeeds.test.ts`'s aged arm asserts `floor.offsetYears <= ELAPSED_PLAN_YEARS` where
 * ELAPSED_PLAN_YEARS is 2. The plant therefore sits EXACTLY ON the boundary, not inside it — any
 * re-tune that pushes the floor to 3 reds that arm and kills `dateFloorCoveredPast`'s only live
 * route.** The override's PURPOSE still holds; only its numbers were wrong.
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
 * R27 NOTE (the fourth prescribed seed, `dateinvert`, still does NOT exist — but it is now OWED,
 * not unreachable). ⚠️ CORRECTED 2026-08-01: the two sentences that used to head this note said
 * the inversion was "UNREACHABLE in v1" and would "reactivate with U10". U10 HAS SHIPPED — the
 * Roth-conversion lever is live (`rothConversion` on the draft, `expandRothConversion` wired in
 * intakeMap), and a roth-first `custom` order seed already exists in this file. Both sentences
 * were describing a world that ended; read as present tense they say the opposite of the truth.
 *
 * WHY IT WAS UNREACHABLE, and why that reasoning EXPIRED: under proportional drawdown the bucket
 * ratios are preserved path-for-path, so ACA-MAGI is the SAME monotone function of total outflow
 * on both tracks, and the inversion needs {floor MAGI < 100% FPL ≤ lifestyle MAGI} with floor
 * outflow ABOVE lifestyle — jointly unsatisfiable. Probed empirically 2026-07-02, PRE-U10 (11
 * configs × 11 offsets across trad-share straddle / near-cliff brokerage drift / SS-claimed-bridge
 * families: floor strictly stronger at EVERY offset) — that probe is a dated pre-U10 record and
 * does not bound the post-U10 world. A conversion adds MAGI with ZERO outflow, so the coupling
 * the impossibility argument rested on is broken by construction.
 *
 * ⚠️ OWED, NOT DERIVED — do not read the above as a recipe. The mechanism (roth-first `custom`
 * order + a small conversion pinning the FLOOR track under 100% FPL while lifestyle stays
 * subsidized) is a HYPOTHESIS; landing it is a dip-class parameter hunt, each probe costing a real
 * date search. Prerequisites are BINDING (`docs/council-log.md`): derive EXTERNALLY (DND 012),
 * engine-verify before any cold read, and extend the CVD probe for a new cue. Filed, never faked.
 * Until it is minted the render arm stays fixture-pinned (FuckOffDate.test.tsx + dateSplit.test.ts).
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
 *
 * TREND RE-TUNE 3 (2026-07-19, the Medicare-cost-trend sourcing unit): trended post-65 Part B
 * (this couple reaches 65 in 2034 — deep in the trended decade) sank the dip again (nm → [] at
 * provisional — RECORDED before re-tune). The portfolio moved 658k→700k / 282k→299k. The hunt's
 * texture: the two-tier intersection is EMPTY along the prior proportional ray (+35/+15 and
 * +40/+17 read [0,1,2] provisional but [0,1] final; +42/+18 reads [0,1,2] final but overshoots
 * provisional to [0,1,2,3]) — the working point came OFF-RAY (+42/+17; +43/+16 also works,
 * same total). Same knife-edge, third constant richer.
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
    { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 700_000, annualContribution: 8_000, employerMatchAnnual: 4_000 },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 299_000 },
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

/**
 * P4·U16 — THE SURPLUS (over-funded) recommend-second witness. `retiredOnTrack`'s 66/65 couple with a
 * $3M Traditional IRA against a $60k/yr spend — so over-funded that the recommended strategy clears the
 * over-funded band on BOTH seed sets (`surplusRegime`), yet the crown is an ACTIVE move (a bracket-fill
 * conversion beats the conventional taxable-first/conv-0), so `noChange` is FALSE — the delta-as-hero
 * surplus render (Q1), NOT the compose state. Stateless + NO `chosenGoal` (like `nc`): the live walk
 * drives the GoalPicker organically to the committed beat; the spine faces read the idle affordance
 * frame unchanged. Engine-proven at the shipped fast test counts in devSeeds.test.ts (surplusRegime
 * true, noChange false, kind 'recommended') — the pin is the seed contract; re-tune the IRA/spend on
 * drift, never loosen it (the standing C3 law). The mutant killer: pinning this seed's `noChange` TRUE
 * goes red (it is structurally false — an over-funded household still has a beneficial conversion).
 */
const surplusWitness: ScenarioDraft = {
  ...retiredOnTrack,
  enteredAccounts: [{ ...retiredOnTrack.enteredAccounts[0]!, valueToday: 3_000_000 }],
  annualSpendingReal: 60_000,
}

/**
 * THE MULTI-BUCKET WITNESS (2026-08-03) — the first seed on which the WITHDRAWAL ORDER MATTERS AT ALL.
 *
 * ⚠️ WHY IT HAD TO EXIST. Every other household here holds effectively ONE drawable bucket:
 * `retiredOnTrack` (and therefore `rec` / `recold` / `surplus`, which spread it) carries a single
 * Traditional IRA, so `taxable-first`, `proportional` and every other policy are the IDENTICAL
 * decumulation and no ordering claim can be observed. `?vault=rec` is worse for this purpose — it
 * plants a HAND-BUILT payload whose arms all carry `headlineStatisticB: 0`, so no solve runs at all.
 * That gap is why the baseline-nameplate defect (the hero measured against the CONVENTIONAL arm while
 * the label said "your plan today") survived every seed, every plant and every walk until it was found
 * by reading `solve.ts`. A defect no fixture can express is a defect nothing can catch.
 *
 * THREE REAL BUCKETS — pre-tax, taxable (with a genuine embedded gain, so ordering has a tax
 * consequence rather than just a label), and Roth — against `retiredOnTrack`'s unchanged 66/65 couple
 * and $78k spend, so it stays a coherent household rather than a contrived one. `drawdownPolicy` is
 * INHERITED as `proportional` — the shipped DEFAULT and deliberately NOT `taxable-first`, because the
 * whole point is a household whose own order differs from the conventional arm. Do not "simplify" it to
 * taxable-first: that collapses the witness back to the blind spot it exists to cover.
 *
 * WHAT IT PINS (devSeeds.test.ts, through the REAL builder + REAL engine): `noActionBaseline.id` is
 * `baseline:proportional:0` — the arm the surface labels "your plan today" IS the household's entered
 * order. Re-anchoring `solve.ts` to `search.conventionalBaseline` reds it.
 *
 * NOT tuned to force a particular CROWN, and that is deliberate: the displayed baseline is the
 * household's own order whatever wins, so this seed carries no regime knob to drift. The C3
 * "re-tune on drift" law therefore does not bite here — if the crown moves, the pin still holds.
 */
const multiBucketWitness: ScenarioDraft = {
  ...retiredOnTrack,
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'traditional-ira',
      valueToday: 700_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      // A real embedded gain ($150k over basis) — without it the taxable bucket is a cash-equivalent
      // and the ordering question loses its tax teeth.
      ownerIndex: 1,
      kind: 'brokerage',
      valueToday: 450_000,
      basis: 300_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      ownerIndex: 0,
      kind: 'roth-ira',
      valueToday: 200_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
  ],
}

/**
 * THE NO-PRETAX STEER WITNESS (the steer-seed increment, 2026-07-23 — the first walkable face of
 * `blocked{no-pretax}`). `retiredOnTrack`'s 66/65 couple whose split savings hold NO pre-tax
 * dollars: Alex's Roth IRA + Sam's brokerage account (basis entered) — a REALISTIC shape (a couple
 * who Roth-converted years ago, or saved outside employer plans). The spine resolves a confident
 * verdict and the recommend-second invite fires (solve idle), but a confirmed goal pick REFUSES at
 * the builder with the TYPED `no-pretax` reason — there is no anchored conversion candidate and no
 * pre-tax draw to sequence — so the surface renders `recommendNoPretaxNote`, the calm named-reason
 * steer, instead of a solve. Engine-proven in devSeeds.test.ts: the built overlay is PRESENT with
 * `buckets.pretax === 0` (pinning the REALISTIC arm, never the degenerate no-overlay one) and the
 * builder returns `'no-pretax'` verbatim. NO `chosenGoal` (the walk drives the GoalPicker
 * organically, like `surplus`/`nc`).
 */
const noPretaxSteer: ScenarioDraft = {
  ...retiredOnTrack,
  enteredAccounts: [
    {
      ownerIndex: 0,
      kind: 'roth-ira',
      valueToday: 480_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
    {
      ownerIndex: 1,
      kind: 'brokerage',
      valueToday: 575_000,
      basis: 460_000,
      manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    },
  ],
}

// ---------------------------------------------------------------------------
// The state-tax faces (the state-tax unit; the state-carrying seed increment). Each is a
// `retiredOnTrack` clone (66/65, both retired) carrying ONE `retirementState` — so the state
// clause renders inside the all-65+ `medicarePricedNote` block (ConfidenceStatement) and the
// SPINE overlay prices (or byte-identically no-ops) that state. `pricedStateForRun` reads the
// PRODUCER'S OUTPUT (`buildSpineParams`' overlay), never draft truthiness (insight 081).
// ---------------------------------------------------------------------------

/**
 * THE NC-PRICED AFFIRMATION FLAGSHIP — `retiredOnTrack`'s couple in North Carolina. NC's flat tax
 * genuinely BITES: the private-sector Traditional-IRA draw is fully taxed at the flat rate
 * (SS exempt, no age carve-out), AND — because this all-retired household develops a taxable
 * brokerage bucket from reinvested RMD surplus in the RMD years — NC also taxes those realized gains
 * as ordinary income (no LTCG preference). This is the seed the priced verdict affirmation +
 * narrowed residual ("… North Carolina …") cold-reads on BOTH mounts; the pin is the lifetime-tax
 * INEQUALITY vs the twin, engine-proven in devSeeds.test.ts, recorded not assumed.
 *
 * ⚠️ THE BAND CROSSING THIS SEED USED TO SHOW IS GONE (2026-08-02) — not a regression. The drag
 * once pushed the twin's on-track (survival 0.8585) DOWN across the edge to BORDERLINE (0.8425);
 * S.L. 2026-41 § 44.1(a) cut NC's 2027+ rate from a held-forward 3.99% to 3.49/3.24/2.99, so the
 * drag no longer reaches the edge and this household lands ON-TRACK. NC still prices strictly more
 * lifetime tax than the twin — only the magnitude moved.
 *
 * The C3 "re-tune the knob on drift" law does NOT apply here: this seed is a PURE spread of
 * `retiredOnTrack` with one field changed, and devSeeds.test.ts uses `DEV_SEEDS.retired` as its
 * twin. Giving it its own accounts to force a crossing would break the same-household-one-
 * difference invariant that makes the comparison honest. A band-crossing state face needs a NEW
 * seed carrying its own state-off twin — Briggsy's call, not a silent fixture edit.
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

/**
 * THE REFUSAL WITNESS for the employer-coverage premise — `?seed=datesolo`.
 *
 * `stillWorking` (Alex 58 working / Sam 60 retired at 58, pre-65) with the ONE field flipped:
 * Sam buys their own coverage rather than riding Alex's plan at work. Everything else is
 * byte-identical, so this seed isolates exactly one variable against `?seed=date`.
 *
 * WHAT IT DRIVES. `missingRequiredFacts` pushes the `unrepresentable` arm ⇒ `buildDateInput`
 * returns null ⇒ the strip renders the CANNOT-PRICE block ("Outside what this version can
 * price… there is nothing here for you to add"), never the "Still needed" block. This is the
 * only live drive of that rendering, and without it the honest-refusal path would ship as an
 * undrivable branch behind a green suite (insight 048).
 *
 * WHY THE REFUSAL IS RIGHT rather than a price we could have guessed: Sam's pre-65 subsidy keys
 * off household MAGI, and `acaMagi` carries NO wage term — so a priced bridge year would invent
 * a phantom near-max subsidy off Alex's invisible $150k salary and understate the cost. The
 * engine already refuses that outright (`simulate.ts`, "rejection beats disclosure") and names
 * this household as the canonical blocked instance. Intake now says so instead of silently
 * pricing Sam at $0.
 */
const dateSoloCoverage: ScenarioDraft = {
  ...stillWorking,
  health: { ...stillWorking.health, employerPlanCoversRetiredMember: false },
}

/**
 * The CEILING crown — the odds ladder's BESIDE-the-dot branch (`OddsLadder` CROWN_SIDE_RUNG): `date`'s
 * couple so over-funded that stopping TODAY already clears with a quantized lower bound ≥ 0.95, so the
 * crowned mark sits at rung 10 and its callout renders beside the dot reading the clamped ceiling
 * proportion ("better than 9 in 10" — never "10 of 10"). Until 2026-09-05 no seed reached that branch
 * and its alignment rule did not exist (council wf_1b45326f-9e8: `.ladder-crown--side`, oddsLadder.css);
 * the chart-text gate walks it on every arm. Balances tuned in real Chromium 2026-09-05.
 */
const atCeilingSeed: ScenarioDraft = {
  ...stillWorking,
  enteredAccounts: [
    { ...stillWorking.enteredAccounts[0]!, valueToday: 2_700_000 },
    { ...stillWorking.enteredAccounts[1]!, valueToday: 600_000 },
  ],
}

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
  surplus: surplusWitness,
  buckets: multiBucketWitness,
  steer: noPretaxSteer,
  nc: ncAffirmation,
  pa: paAffirmation,
  fl: flAffirmation,
  elsewhere: elsewhereAnswered,
  datenc: dateNcSeed,
  datesolo: dateSoloCoverage,
  atceiling: atCeilingSeed,
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
type PlantResult =
  | 'ok'
  | 'unknown-seed'
  | 'not-ready'
  | 'floor-fail'
  | 'write-failed'
  /** A DOCTORED atom did not survive the codec's tolerated-drop channel (today: the saved
   *  recommendation). U17 §S5 — see the guard in `runPlantDevVault`. */
  | 'record-dropped'
  /** A doctored scenario the codec REFUSES outright — a doctor that broke the plan itself. */
  | 'doctored-corrupt'

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
 * back, the plan anchor back 2 calendar years (the wall-time framing). The ONLY way to see the
 * re-entry staleness surfaces live today — every organic save is same-day fresh.
 *
 * THE BLEND AGING IS INERT ON EVERY PLANT THIS DOCTOR SERVES (U17 §S4, insight 087 — swept when
 * the exposure gate landed): the clock still fires, but `blendTableReadForRun` reads FALSE for
 * both bases (`retired` and `datesplit` carry per-account MANUAL blends, never a table ticker),
 * so the household is provably inert under a `BLEND_SNAPSHOT_AS_OF` bump and the reader silences
 * it. The decrement stays — it costs nothing and becomes live the day a plant's base holds a
 * classified ticker, which is also what the nameless aggregate line needs for a cold-read path.
 * appDefaultVersion stays CURRENT deliberately: the Q7
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
 * `?seed=nc` (on-track since the NC rate cut was pinned 2026-08-02; it read borderline at mint).
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

/** How many calendar years back `?vault=datearrived`'s plan was BUILT. It must exceed the base's
 *  lifestyle crown so `offsetHasPassed(crown, yearsSincePlanBuilt)` is true and the hero takes its
 *  ARRIVED arm — `dip` crowns lifestyle at 5, MEASURED through the real date search (the arm below
 *  re-measures it every run, so a crown drift fails HERE rather than at a cold read). 6 is the
 *  smallest depth that clears 5, which keeps the fabricated history as short as the face needs. */
const ARRIVED_PLAN_YEARS = 6

/** How recently `?vault=datearrived` was LAST SAVED. Deliberately RECENT and deliberately not the
 *  build clock: the whole point of this plant is the two-clock split U17 §S0 shipped
 *  (`startCalendarYear` is written once at BUILD and survives every re-save; `savedAt` is the LAST
 *  save). Under a year, so the save-elapsed line suppresses and every vintage stays legitimately
 *  fresh — leaving the BUILD clock as the ONLY aged signal on the frame, which is what makes the
 *  arrived idiom cold-readable in isolation (the `rec`/`recold` plants' same discipline). */
const ARRIVED_SAVED_DAYS_AGO = 30

/**
 * `?vault=datearrived` — THE ARRIVED HOUSEHOLD (U17 §S6): a plan BUILT six years ago whose lifestyle
 * date has since come and gone. It is the only live route to the hero's arrived arm
 * (`dateInYearsPast`, "that year has already come and gone" — the §S2.5 strict three-way split's
 * past member), and the four parked aged-surface tone calls ride it: how hard the elapsed segment is
 * de-emphasised, the premise line's wording, the de-mudded arrived idiom, and the SILENCE where the
 * work-stops marker used to sit (§S2.1 killed a named marker left of Today under the honoured hawk
 * veto — the call is now whether that silence reads honest or missing).
 *
 * WHY `dip` AND NOT `datesplit` (the note above {@link AGED_PLANTS} carries the full measurement):
 * the hero's arrived arm needs `yearsSincePlanBuilt` to EXCEED the lifestyle crown, and `datesplit`
 * crowns at 10. `dip` crowns at 5 and HOLDS there under aging — it does not chase its own tail —
 * so depth 6 clears it. The base must also be STATELESS: a priced-state base rejects at any depth
 * ≥1 on the engine's priced-state year bound (`simulate.ts:640-643`), which is the real constraint
 * the spec's `earliestPricedRateYear` probe was reaching for. `dip` carries no `retirementState`.
 *
 * IT AGES `birthYear` ALONGSIDE `startCalendarYear`, AND THAT IS LOAD-BEARING. `PersonInputs`
 * (`model.ts:98`) documents `currentAge === startCalendarYear − birthYear` as a model invariant, and
 * the engine reads a birth year through TWO paths that must agree: the SS sub-engine's stated
 * `p.birthYear` (FRA / DRC / deemed-filing lookups) and the tax overlay's DERIVED
 * `startCalendarYear − currentAge` (`simulate.ts:1346`). Aging the build clock ALONE forks them by
 * the full depth and fabricates a household that is organically impossible — in 2020 this couple
 * would have been 51, not 57. Aging `birthYear` by the same depth restores the invariant exactly,
 * keeps `currentAge` (so the engine sees the SAME household and the crown does not move — MEASURED:
 * floor 0 / lifestyle 5 with and without the birth-year shift, byte-identical), and describes a real
 * arrived household: born 1963, planned at 57 to stop at offset 5, and that year is now behind them.
 *
 * ⚠️ THIS PLANT LIGHTS **ONE** ARRIVED ARM, NOT TWO. The floor crowns at 0, and `floorLineText`
 * (`FuckOffDate.tsx:197`) SHORT-CIRCUITS offset 0 to the plain `dateFloorCovered` line BEFORE the
 * three-way split — mirroring `heroLead`'s free-today precedence, deliberately ("covered from the
 * plan's own start ⇒ still covered now"). So `dateFloorCoveredPast` does NOT fire here; its live
 * route is and remains `?vault=datestale`, whose floor crown sits strictly inside its window. (An
 * earlier filing claimed "both arms arrived on one plant" — it was read off the crown numbers
 * without opening the renderer.)
 *
 * EXPORTED for the devSeeds battery, like its sibling doctors.
 */
export function doctorArrivedVault(s: ScenarioV3, todayEpochDay: number): ScenarioV3 {
  if (s.retirementState !== undefined && isPricedState(s.retirementState)) {
    throw new Error(
      `doctorArrivedVault must never take a priced-state base (got ${s.retirementState}): its ` +
        `-${ARRIVED_PLAN_YEARS}y startCalendarYear aging precedes the state's earliest rate row, and ` +
        `the engine's priced-state lower bound (simulate.ts:640) demotes the recompute to the R19 ` +
        `calm indeterminate — no verdict renders, and the arrived hero never draws.`,
    )
  }
  // NEVER A SILENT NO-OP (the `agedStateProfile` law), and the reason this doctor ages two fields:
  // if the BASE already violates the model invariant, shifting `birthYear` by the depth would
  // preserve the violation rather than the invariant, and the fork would ride to the engine unseen.
  for (const [i, p] of s.people.entries()) {
    if (p.currentAge !== s.startCalendarYear - p.birthYear) {
      throw new Error(
        `doctorArrivedVault: person ${i} breaks the model invariant currentAge === startCalendarYear ` +
          `− birthYear (${p.currentAge} !== ${s.startCalendarYear} − ${p.birthYear}) BEFORE aging. ` +
          `This doctor shifts both clocks to KEEP that invariant; over a base that already violates ` +
          `it, the engine's two birth-year reads (p.birthYear for the SS FRA lookup vs ` +
          `simulate.ts:1346's derived startCalendarYear − currentAge) stay forked and nothing says so.`,
      )
    }
  }
  return {
    ...s,
    savedAt: todayEpochDay - ARRIVED_SAVED_DAYS_AGO,
    startCalendarYear: s.startCalendarYear - ARRIVED_PLAN_YEARS,
    people: s.people.map((p) => ({ ...p, birthYear: p.birthYear - ARRIVED_PLAN_YEARS })),
  }
}

// ── U17 §S5 — THE RECORD-BEARING PLANTS (`?vault=rec` / `?vault=recold`) ───────────────────────
//
// THE GAP THEY CLOSE: before them, NO `?seed=` or `?vault=` route in this repo carried a saved
// recommendation, so the one piece of new content S5 drops onto a protected IDLE frame — the
// remembered-record card — could be neither cold-read by a human nor measured by `pnpm verify:fit`.
// A vault return is the ONLY live route to it: the card is derived from the DISK
// (`IntakeApp`'s recordCard memo reads `persist.scenario.savedRecommendation`, never the draft),
// and a `?seed=` mount is `{kind:'unsaved'}` forever.
//
// THE RECORD IS MINTED, NEVER TYPED. A hand-written `SavedRecommendationV3` literal proves the
// TYPE and nothing else (DND 012), and it would be wrong in the two places that decide what the
// card SAYS: the `era` snapshot (five stamps, ~15 dated fields — a typed copy pins the record's
// rulebook clocks against a fiction the moment any constant moves) and the `fingerprint` (an
// opaque canon-serialization of the whole solve request — unforgeable by hand, and the trichotomy's
// conjunct 1 reads it). So both come from their REAL producers: the build's four stamp functions
// through `mintSavedRecommendation`, and `buildSolveRequest` → `solverRunFingerprint` over the
// plant's OWN hydrated draft. The mint then runs the SAME `validateSavedRecommendation` the decode
// path runs, so a malformed fixture fails at the plant, loudly, instead of vanishing at unlock.
//
// WHAT IS STILL DEV-AUTHORED, AND WHY IT MUST BE: the RANKING facts (the winning arm's id/policy,
// the grade word, the two verdict flags). Only a real solve can produce those, and a live solve is
// 80–200s (measured — `vertical-fit.spec.ts` records it), so a plant that ran one would never land.
// They are the same tier of dev-authored fact as every household number in this file — and the card
// quotes NONE of them (`savedRecordCardView` reads only `mintedAt`; the standing comes from the
// store's trichotomy), so no fabricated figure can reach a screen through this seam.

/** The goal the planted run ranked for. A saved recommendation only exists for a household that
 *  PICKED one (`buildSolveRequest` refuses 'spine-unready' without it), and `chosenGoal` is a
 *  persisted scenario field — so the plant writes it beside the record, exactly as a real save would. */
const RECORD_GOAL: RecommendationGoal = 'leave-more'

/** How far back `?vault=recold`'s record was minted. Past a calendar-year boundary from ANY drive
 *  day, so the card's `Saved in <year>` slot actually renders (the age clause suppresses inside the
 *  mint's own calendar year rather than fabricating provenance) — and far inside the codec's
 *  epoch-day floor. `mintedAt` is deliberately OLDER than the scenario's fresh `savedAt`: that is
 *  the documented organic case (a re-save re-stamps `savedAt`; the memory keeps its own age). */
const RECORD_AGED_DAYS = 400

/** The edit `?vault=recold`'s household made AFTER the record was minted — +$500/mo of real spend
 *  on a ranking-affecting field. It is what makes the FRESH run identity differ from the record's,
 *  and the doctor PROVES the divergence rather than assuming it. */
const RECORD_SPEND_EDIT = 6_000

/** One displayed arm of the dev fixture's ranking. The mint reads `id` and `policy` and NOTHING
 *  else from an arm, so the sample is left genuinely EMPTY and its scalars zero — an obviously
 *  un-sampled stub, never a plausible-looking fan a reader could mistake for a real distribution
 *  (burned/062's refuse-rather-than-default posture applied to a fixture). */
function devSolveArm(id: string, policy: SolveArm['policy']): SolveArm {
  return {
    id,
    policy,
    conversion: null,
    distributionB: { terminalValuesReal: [], depletionYears: [], survivalFraction: 0 },
    headlineStatisticB: 0,
    survivalB: 0,
  }
}

/** The committed payload the plant mints from — the sequencing switch a `leave-more` household
 *  would keep. `solverCodeVersion` is a PARAMETER because it is the one field the two plants
 *  differ on: conjunct 2 of the re-entry trichotomy compares it to this build's live constant. */
function devRecommendationPayload(solverCodeVersion: number): SolveRecommendation {
  const winner = devSolveArm('grid:taxable-first:0', 'taxable-first')
  const runnerUp = devSolveArm('grid:bracket-fill:0', 'bracket-fill')
  const noActionBaseline = devSolveArm('baseline:proportional:0', 'proportional')
  return {
    kind: 'recommended',
    goal: RECORD_GOAL,
    heirBracket: solverAssumedHeirBracket.value,
    seedA: DEV_CRN_SEED,
    seedB: DEV_CRN_SEED + 1,
    winner,
    runnerUp,
    noActionBaseline,
    rankedIds: [winner.id, runnerUp.id, noActionBaseline.id],
    prunedScores: [],
    noChange: false,
    surplusRegime: false,
    grade: { grade: 'just-do-it', memberMargins: [], demotionFired: false, subTenthCollapse: false },
    gradeStatistic: 'leave-more',
    gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie',
    skewDisclosure: undefined,
    deltaSkew: undefined,
    withheldConversionLevers: [],
    disclosedDirectional: [],
    solverCodeVersion,
  }
}

/** The REAL run identity for a scenario's own household — `buildSolveRequest` over the HYDRATED
 *  draft (the exact production path `appModel.currentDraftFingerprint()` takes at read time), then
 *  the engine's own fingerprint producer. Fails LOUD rather than returning a placeholder: a plant
 *  whose fingerprint could never match is a plant whose card can only ever say "your numbers
 *  changed", which is the broken-gate symptom, not a fixture. */
function recordFingerprintFor(s: ScenarioV3, todayEpochDay: number): string {
  const hydrated = draftFromScenario(s)
  if (!hydrated.ok) throw new Error(`the record plant's base is not a two-person household: ${hydrated.detail}`)
  const request = buildSolveRequest(hydrated.draft, todayEpochDay)
  if (typeof request === 'string') {
    throw new Error(
      `the record plant's base cannot build a solve run (${request}) — a saved recommendation is ` +
        `always a spine-route household with a picked goal and a minted CRN seed.`,
    )
  }
  return solverRunFingerprint(request.base, request.candidates, request.ranking, {
    seedA: request.seedA,
    tieTolerance: request.tieTolerance,
  })
}

/** Put a freshly-minted record on a built scenario. `chosenGoal` lands FIRST — the fingerprint is
 *  computed over the draft that carries it, which is the draft the app hydrates. */
function withMintedRecord(s: ScenarioV3, mintedAt: number, solverCodeVersion: number, todayEpochDay: number): ScenarioV3 {
  const goaled: ScenarioV3 = { ...s, chosenGoal: RECORD_GOAL }
  const minted = mintSavedRecommendation(
    devRecommendationPayload(solverCodeVersion),
    recordFingerprintFor(goaled, todayEpochDay),
    false,
    mintedAt,
  )
  // The mint runs the codec's OWN validator, so this arm is the fixture's fail-loud: a dev record
  // the vault would silently drop never reaches disk.
  if (!minted.ok) throw new Error(`the dev record fixture is invalid — the codec refused it: ${minted.detail}`)
  return { ...goaled, savedRecommendation: minted.record }
}

/**
 * `?vault=rec` — the memory that STILL HOLDS. Every conjunct of the re-entry trichotomy passes: the
 * fingerprint is this very household's, the version is this build's live constant, and the era is
 * the same four stamps `scenarioFromDraft` just wrote — so no rulebook clock can fire against it.
 * Minted TODAY, so the card's age clause suppresses (the minimal `holds` face: heading + standing +
 * the re-open door).
 */
export function doctorRecordHolds(s: ScenarioV3, todayEpochDay: number): ScenarioV3 {
  return withMintedRecord(s, todayEpochDay, SOLVER_CODE_VERSION, todayEpochDay)
}

/**
 * `?vault=recold` — the memory that no longer holds, for TWO reasons at once (insight 101: a card
 * that names one cause when two hold describes its poster child, not the truth — the only live
 * route that proves the clause LIST renders rather than a single line).
 *
 *  · `inputs-changed` — the household raised their spend AFTER the save. The record keeps the
 *    fingerprint of the run it actually described; the fresh one is over the edited draft.
 *  · `solver-changed` — the record was written by a LATER build (`SOLVER_CODE_VERSION + 1`, the
 *    backup-restore / multi-device case `solverCodeVersion.ts` names by hand: the compare is `!==`,
 *    fail-closed in BOTH directions). `− 1` is unavailable: the live constant is 1 and the codec
 *    floors the field at ≥ 1, so an older-build fixture is not currently mintable.
 *
 * The era stays FRESH — deliberately. Ageing it would fire `rules-changed` too, but only by
 * hand-doctoring the one field of this record no hand should touch (the stamp snapshot), and the
 * two causes above are both produced by real producers. The rulebook clause keeps its unit arms.
 *
 * Minted ~400 days back, so this plant is ALSO the live route to the card's `Saved in <year>` slot.
 */
export function doctorRecordSuperseded(s: ScenarioV3, todayEpochDay: number): ScenarioV3 {
  const withRecord = withMintedRecord(s, todayEpochDay - RECORD_AGED_DAYS, SOLVER_CODE_VERSION + 1, todayEpochDay)
  const edited: ScenarioV3 = { ...withRecord, annualSpendingReal: withRecord.annualSpendingReal + RECORD_SPEND_EDIT }
  // NEVER A SILENT NO-OP (the `agedStateProfile` law): if the edit did not actually move the run
  // identity, `inputs-changed` could not fire and this plant would quietly become a one-cause
  // fixture that still LOOKS like the two-cause one. Prove the divergence against the real producer.
  const fresh = recordFingerprintFor(edited, todayEpochDay)
  if (fresh === withRecord.savedRecommendation?.fingerprint) {
    throw new Error(
      `doctorRecordSuperseded: the +${RECORD_SPEND_EDIT} spend edit left the solver-run fingerprint ` +
        `UNCHANGED, so 'inputs-changed' can never fire — this plant would render a one-cause card ` +
        `while claiming to be the two-cause one. Pick a field the run identity actually reads.`,
    )
  }
  return edited
}

/** The AGED plants: `?vault=<key>` → a doctor over a base seed (each key names BOTH — the state-tax
 *  unit split the one doctor into two, so the dispatch carries the pairing). `stale` =
 *  the retired spine (the U13 staleness batch's original surface); `datestale` = the SPLIT
 *  date household (`datesplit` — floor crowns 2, lifestyle 10 provisional / 9 final, MEASURED
 *  2026-07-31; the "≈1 / ≈8 at design time" this line used to carry was stale and matched nothing
 *  the engine returns at either tier), the only
 *  live route to the floor's ARRIVED arm (`dateFloorCoveredPast`: elapsed 2 ≥ the floor
 *  offset — "penciled as covered … that's about now") beside a RE-DERIVED aged hero count
 *  (`dateInYearsAnchored` with n = offset − elapsed). The hero's own arrived arm
 *  (`dateInYearsPast`) needs elapsed > the lifestyle crown, which THIS base cannot reach:
 *  `datesplit` crowns lifestyle at 10 **at the PROVISIONAL tier** (2 for the floor), and the FINAL
 *  tier — the one the live surface runs — reads 9. Either way it never falls below the elapsed
 *  window. **ALWAYS quote a crown from this file WITH ITS TIER**: the bare "10" in this sentence was
 *  read as the shipped value during the 2026-07-31 session and sent a reader hunting a contradiction
 *  against a surface that legitimately renders 9.
 *
 *  ⚠️ CORRECTED 2026-07-27 — the old note generalised that to "NOT coherently mintable", full
 *  stop, off the ≈8y figure for THIS base. That is false as a general claim and it would send the
 *  next builder away from a plant that exists. MEASURED through the real date search (provisional
 *  tier), lifestyle crowns are: `dip` 5 · `date` 9 · `datesplit` 10 · `dateborder` 10 ·
 *  `date65`/`datenc` 0 · `datemixed` no-date-in-window. **`dip` is the arrived base**, and U17 §S6
 *  MINTED the plant on it: `datearrived` below, depth 6, {@link doctorArrivedVault} — which owns
 *  the two corrections this note's first draft got wrong (it ages `birthYear` alongside
 *  `startCalendarYear` to hold the `currentAge === startCalendarYear − birthYear` model invariant,
 *  and it lights ONE arrived arm rather than two, because a floor crown of 0 short-circuits past
 *  the three-way split at `FuckOffDate.tsx:197`). The base must be STATELESS: `datenc` rejects at
 *  any depth ≥1 with "startCalendarYear precedes the priced state rate schedule"
 *  (`simulate.ts:640-643`), which is the real bound the S6 spec's `earliestPricedRateYear` probe
 *  was reaching for — and that probe is VACUOUS on a stateless base (the gate is `isPricedState`-
 *  gated), so the honest constructibility probe is the date search itself, which is what the
 *  `datearrived` engine-acceptance arm runs on every suite.
 *
 *  THE `stalenessDate` CLAIM IS GONE (U17 §S4 sweep, insight 087 — its sibling at the doctor
 *  above was swept in the same change and this one was missed). That line USED to fire off the
 *  blend clock, which {@link doctorStaleVault} does move; the S4 split narrowed it to the
 *  CONTRIBUTION clock alone, and no doctor ages `dateVintage.contributionYear`. So the reworded
 *  contribution sentence has NO cold-read path today — a filed gap, not a silent one: minting one
 *  means a doctor that decrements `contributionYear` on a base seed whose working owner actually
 *  contributes, and it must not disturb the outcome pins those plants carry.
 *
 *  THE CONTRIBUTING SEEDS ARE `date` (stillWorking), `date65` (stillWorkingAllMedicare),
 *  `dip` (dateDipSeed) and `datenc` (dateNcSeed, a pure spread of stillWorkingAllMedicare
 *  overriding only `retirementState`, so it inherits the contributing accounts) — verified by
 *  their accounts' `annualContribution`. The registry key is `dip`, NOT `datedip` (see
 *  {@link DEV_SEEDS}) — a doctor keyed on `datedip` resolves to null and renders nothing, the
 *  same broken-gate symptom the `datesplit` slip below costs. NOT `datesplit`:
 *  `stillWorkingBorderline` carries no `annualContribution`/`employerMatchAnnual`/`hsaEmployerAnnual`
 *  on either account and `dateSplitSeed` overrides only `valueToday`, so `anyContributions` is
 *  false, no `accumulation` reaches the base overlay, and `contributionsPricedForRun` reads false.
 *  A doctor built on THAT plant renders nothing and reads as a broken gate. (An earlier draft of
 *  this note named `datesplit`; a reviewer caught it — a prescription that names the wrong fixture
 *  costs its reader the whole debugging session.) */
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
  // U17 §S5 — the two record-bearing plants, over the retired SPINE spine household (a saved
  // recommendation is always spine-route: `solveDispatch.ts` refuses 'spine-unready' on the date
  // route, so no record can exist for a date household). `rec` = the memory that still holds;
  // `recold` = superseded for TWO causes, with the aged mint year. Neither doctor ages a vintage,
  // so the re-entry gate's own staleness lines stay dark and the record card reads in isolation.
  rec: { base: 'retired', doctor: doctorRecordHolds },
  recold: { base: 'retired', doctor: doctorRecordSuperseded },
  // U17 §S6 — the ARRIVED household: the `dip` date couple whose plan was BUILT 6 years ago, so the
  // lifestyle crown (5) now sits BEHIND the elapsed window and the hero takes `dateInYearsPast`. The
  // base is stateless by requirement (a priced base rejects on the engine's year bound at any depth
  // ≥1). See {@link doctorArrivedVault} for why it ages `birthYear` alongside `startCalendarYear`
  // and why this plant lights ONE arrived arm, not two.
  datearrived: { base: 'dip', doctor: doctorArrivedVault },
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
  // U17 §S5 — A DOCTORED ATOM MUST FAIL AT THE PLANT, NEVER AT THE SCREEN. `scenarioFromDraft` ran
  // ABOVE, BEFORE the doctor, so anything a doctor ADDS has never met the codec. That matters for
  // exactly one field: the saved recommendation is the codec's ONE tolerated non-fatal drop, so an
  // invalid record would be DELETED on the way back in at unlock and the plant would land a
  // record-FREE vault — a fixture that reads as a broken CARD instead of a broken FIXTURE, which
  // costs its reader the whole debugging session. The mint already validates in memory; this
  // round-trip is what covers the values `JSON.stringify` transforms on the way to disk (DND 009).
  // Doctored plants only — an undoctored scenario IS `built.scenario`, already round-tripped.
  if (aged !== undefined) {
    const round = decodeScenario(encodeScenario(scenario))
    if (!round.ok) return 'doctored-corrupt'
    if (round.droppedAtoms.length > 0) return 'record-dropped'
  }
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
