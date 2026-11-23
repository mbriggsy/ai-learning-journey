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
import type {
  BudgetLineItem,
  RecommendationGoal,
  CurrentScenario,
  SavedRecommendationEraV3,
  SavedRecommendationV3,
} from '@shared/model'
import {
  STATE_TAX_PROFILES,
  isPricedState,
  stateProfileKey,
  type PricedState,
  type StateTaxProfile,
} from '@engine/constants/stateTax'
import { solverAssumedHeirBracket } from '@engine/constants'
import { medicareExtrasTypical } from '@engine/constants/health'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { FIRST_UNAMBIGUOUS_SAVE_DAY } from '@engine/pricingVersion'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { buildSolveRequest } from '@intake/solveDispatch'
import { confirmedWorkingYearCost, writeEnteredWorkingYearCost } from '@intake/workingYearQuote'
import { workingYearLeftOverLive } from '@intake/intakeMap'
import { writeWorkingYearLeftOver } from '@intake/workingYearLeftOver'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import { deriveSavedRecommendationStatus } from '@store/savedRecommendation'
import { decodeScenario, encodeScenario, validateSavedRecommendation } from '@shared/scenarioCodec'
import { draftFromScenario } from './draftFromScenario'
import { scenarioFromDraft, currentEpochDay } from './scenarioFromDraft'
import { exposureForDraft } from './stalenessExposure'
import { PER_MONTH_DISPLAY_STEP } from './money'

/** A fixed dev CRN seed → the same fan every drive (a reproducible cold-read).
 *  Any uint32 satisfies the engine's integer-seed gate; `ensureSeed` REUSES a
 *  pre-set seed (only mints when absent), so this holds across every recompute. */
const DEV_CRN_SEED = 0xbada55

/**
 * THE FIT GATE'S CALENDAR (the one-frame composites plan, KTD1 + KTD2,
 * `docs/plans/features/one-frame-composites-build-spec.md`). Every seed below is a plan built in
 * `SEED_BUILD_YEAR`. Every fit harness pins the page's clock to `GATE_DAY`, or to the view day a plant
 * declares (`AgedPlant.viewDay`: `RETURN_DAY` for a yearly return), so a frame the gate certifies never
 * moves with the wall clock. Before the pin, from 2027-01-01 every plant would render as a plan built
 * last year, and the saved-record arms' standing line would drop from 707 to 754.5 px with no code
 * change (measured under a pinned page clock, b9-4, 2026-11-20).
 *
 * `devSeeds.test.ts` binds `SEED_BUILD_YEAR` to `GATE_DAY`'s calendar year. The day an engine-pricing
 * ledger row ships in a later year, `GATE_DAY` moves into that year and the binding test goes red:
 * rolling the seeds' build year is then a named job (the register's build-year-roll entry), never a
 * date bump.
 */
export const SEED_BUILD_YEAR = 2026
/** The day a fresh plant is viewed and saved on: the first day a save is unambiguously this build's
 *  (`FIRST_UNAMBIGUOUS_SAVE_DAY`, read, never typed). A LOCAL-calendar epoch-day, `currentEpochDay`'s
 *  unit, so a harness pins it at UTC noon (the same calendar day in every timezone the gate runs in). */
export const GATE_DAY: number = FIRST_UNAMBIGUOUS_SAVE_DAY
/** A yearly return: the same calendar date one year after `GATE_DAY` (a 29 February rolls to 1 March).
 *  Rolled, never counted: a fixed 365 days can land in the same calendar year (2028-01-01 + 365 is
 *  2028-12-31). */
export const RETURN_DAY: number = sameDateNextYear(GATE_DAY)

function sameDateNextYear(epochDay: number): number {
  const d = new Date(epochDay * 86_400_000)
  return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()) / 86_400_000
}

/**
 * THE DESIGN CEILING (Briggsy's ruling, 2026-11-21; the register's composites entry, "RULED by Briggsy
 * 2026-11-21"; the frames-outside plan's KTD3, `docs/plans/features/frames-outside-widest-member-build-spec.md`).
 * His words: "$83 billion a month is nuts, let's name a ceiling - we don't need to solve for extremes like
 * that. If I have the money to spend a million a month, I know it and don't need an app." The one-frame
 * promise is made for a household spending under this much a month, ON THE FIGURE AS SHOWN: `formatPerMonth`
 * rounds a monthly figure to its display step, so the largest figure under the ceiling shows as the ceiling
 * less one step, and an entered figure within half a step of the ceiling already shows as the ceiling, a
 * seven-character figure outside the promise.
 *
 * The app still accepts and computes any larger figure (D7's "use it": dollar entry is never capped); above
 * the ceiling it promises nothing about one frame. Never plant, measure or brief a council at the engine's
 * cap (`ENGINE_MAX_DOLLAR`) instead: the ruling's own NEGATIVE. Only tests and the fit gate read this; no
 * shipping code does. Each widest plant's expected figures are derived from it through the shipped
 * formatter, never typed.
 */
export const SPENDING_CEILING_PER_MONTH = 100_000
/** The name ceiling's one home is `src/shared/nameBounds.ts`: the shipping name field reads it, and a
 *  shipping module must never import this DEV-only file. Re-exported here beside the spending ceiling for
 *  the seeds, their tests and the fit gate. */
export { NAME_CEILING } from '@shared/nameBounds'

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
 * band-crossing seed + its state-off twin is a pilot fixture mint (register Tier 4, 2026-09-30).
 *
 * SS-THRESHOLDS RE-TUNE (2026-09-24, the Social Security-thresholds Tier 0): deflating the frozen
 * NOMINAL §86 thresholds per sim year (they were held flat in real dollars — indexed, rosy) taxed
 * more of this couple's $54k benefit in every later year and moved the household 0.8585 → 0.8425
 * (9/10 on-track → 8/10 BORDERLINE; the NC face 0.8485 → 0.826) — RECORDED before any re-tune, the
 * same precedent. The IRA moved 1.055M → 1.120M: probed +45k / +65k / +85k — +65k restores the twin
 * at 0.8805 (margin 0.03 over the 0.85 edge) and NC at 0.8695 (0.02), healthier than the 0.01 / 0.00
 * margins the pre-fix seeds sat on; the PA and FL faces ride the same IRA and land byte-equal to the
 * twin's survival (0.8805), as their arms require. The health-sheet figures (MAGI, headroom) do not
 * move with the IRA — income is spending − benefit, not portfolio — so the premium-card pins hold.
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
      valueToday: 1_120_000,
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
  startCalendarYear: SEED_BUILD_YEAR,
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
  startCalendarYear: SEED_BUILD_YEAR,
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
 * devSeeds outcome pin is the witness). SS-THRESHOLDS RE-TUNE (2026-09-24): deflating the frozen
 * nominal §86 lines per year moved this couple 0.647 → 0.6275 (borderline-7 → OFF-TRACK-6 with a
 * $1,310/mo trim — RECORDED at the shipped inputs first); the IRA moved 760k → 800k, which lands
 * 0.6815 borderline-7 with a 0.03 margin over the 0.65 edge (the pre-fix seed sat at 0.00).
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
      valueToday: 800_000,
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
  startCalendarYear: SEED_BUILD_YEAR,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * A BORDERLINE still-working couple — the DATE route's analog for the honesty cold-read: a confirmed
 * fuck-off date whose projection band STILL touches $0 in its lower percentiles (the council's point:
 * even an on-track date honestly draws the ruin tail). 58/59 both working, a marginal $800k 401(k)-
 * style Traditional IRA + $140k Roth against a $74k spend, so the crowned date carries a fan whose
 * p10/p25 descend to $0. ⚑ CORRECTED 2026-10-30 (U10's measurement, at `DEV_CRN_SEED`): the crown is the
 * window's EDGE — `window-edge-unconfirmed` at offset 10, quantized lower bound 0.85 at both tiers (p
 * 0.858 provisional / 0.8535 final), floor and lifestyle identical (no budget) — not the "≈ 7 years out,
 * 9 of 10" this line carried, which matched nothing the engine returns with or without W. CAVEAT for the
 * cold-read: the long decumulation horizon gives a p90 plume of about $5.9M (the final tier's peak, year
 * 54) that squashes the ruin tail toward the axis (the parked long-horizon band-scale item) —
 * `borderline` (spine) is the cleaner ruin-tail render. The non-
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
  startCalendarYear: SEED_BUILD_YEAR,
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
  startCalendarYear: SEED_BUILD_YEAR,
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
 * step over the 0.98 over-funded edge). SS-THRESHOLDS RE-TUNE (2026-09-24): the per-year deflation
 * of the frozen nominal §86 lines sank the essentials FLOOR from over-funded to on-track (the full
 * track held borderline-7, margin 0.01 → 0.02) — RECORDED first; the override moved 720k → 760k,
 * which lands full 0.701 borderline-7 (margin 0.05) over an over-funded-9 floor whose xOfTen margin
 * is 0.03 but whose STATE margin is 0.00 — quantized exactly ON the 0.98 over-funded edge (the
 * review's catch; the pre-fix floor sat a full grid step over it). The IRA cannot lift the floor
 * without lifting the full track past 7 (800k → 8/10); a floor-only knob (the essentials lines) is
 * owed if a later change nudges the floor under — recorded, not hidden. The reconciliation invariant holds by construction:
 * annualSpendingReal = Σlines@0 (59,600) + injected M (6,000) = 65,600. All lines
 * lifelong-at-0 (as probed — a window would change the engine evaluation the proof pinned).
 */
const retiredBudget: ScenarioDraft = {
  ...retiredBorderline,
  enteredAccounts: retiredBorderline.enteredAccounts.map((a, i) =>
    i === 0 ? { ...a, valueToday: 760_000 } : a,
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
 * The LIVE surface runs `final` (`IntakeApp.tsx:332`, `Result.tsx:379`/`:305`), so the shipped hero is
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
 * SS-THRESHOLDS RE-TUNE (2026-09-24): deflating the frozen nominal §86 lines per year pushed the
 * provisional floor crown 2 → 3 (exactly the boundary case the warning above names) and the FINAL
 * lifestyle crown from confirmed to `window-edge-unconfirmed` — RECORDED at 900k first. The trad
 * account moved 900k → 925k (probed 915 / 925 / 935 / 950 / 1,000k at provisional; 935k+ crowns the
 * provisional lifestyle at 9 CONFIRMED, killing the hedge-that-withdraws transient this seed also
 * exists to render): at 925k provisional reads floor 2 confirmed / lifestyle 10 unconfirmed and final
 * reads floor 2 / lifestyle 9 confirmed — the pinned shape at both tiers.
 */
const dateSplitSeed: ScenarioDraft = {
  ...stillWorkingBorderline,
  enteredAccounts: [
    { ...stillWorkingBorderline.enteredAccounts[0]!, valueToday: 925_000 },
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
 * couple wanting a much richer retirement (heavy discretionary). The essentials floor crowns while
 * the full lifestyle never clears inside the 10-year window — the hero renders the words + how-close
 * line, the floor line still gives the honest "essentials covered" beat. NOT the R27
 * inversion (floor earlier = the expected ordering; no disclosure note). Reconciled:
 * Σlines@0 (90,000) + M (8,000) = 98,000.
 * ⚑ CORRECTED 2026-10-30 (U10's measurement, at `DEV_CRN_SEED`): the floor crowns at offset 7,
 * `confirmed-date`, at BOTH tiers (quantized lower bound 0.86 provisional / 0.88 final) — not the
 * "offset ≈ 4" the 2026-07-02 probe recorded, which matched nothing the engine returns with or without
 * W; the lifestyle reads `no-date-in-window` at both. With W ($98,000, the budget's year-0 lines plus
 * medical) the crowns hold, and offsets 8–10 fall a few hundredths of a point: the working widow(er)
 * rows the earnings test now withholds turn short (the plan's U10 prediction; the U5 fixture in
 * `workingYearCheckSeeds.test.ts` re-derives one of them by hand).
 *
 * R27 NOTE (the fourth prescribed seed, `dateinvert`, still does NOT exist — but it is now OWED,
 * not unreachable). ⚠️ CORRECTED 2026-08-01: the two sentences that used to head this note said
 * the inversion was "UNREACHABLE in v1" and would "reactivate with U10". Act 3's U10 HAS SHIPPED (the
 * Act 3 unit — not the pay check's U10 of the same number) — the
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
 *
 * THE WORKING-YEAR TAX FLOOR (2026-10-20 — `docs/plans/features/working-year-tax-floor-build-spec.md`
 * U4): this seed is the floor's red-first household — its crowned Y = 5 carries a year-4 $34,000
 * conversion on top of $102,000 of taxable pay ($75,000 + $35,000 − Alex's $8,000 deferral) and $10,000
 * of working-year investment income, charged $180 federal before the floor and $5,880 after (the
 * PREFERENTIAL reading wins: the conversion lifts the $10,000 gain block past the $98,900 0 % edge —
 * `taxOverlay.test.ts`'s floor block). MEASURED at `DEV_CRN_SEED` on the pre-change tree and after,
 * both tiers, both tracks: NO crown and NO non-monotone set moved — floor confirmed-date@0 []; lifestyle
 * confirmed-date@5, nm [0,1,2] provisional and [0,1] final, identical before and after. The lifestyle
 * crown's grade fell one cell at both tiers (quantized lower bound 0.89 → 0.88; final p 0.8892 →
 * 0.8866; provisional 0.8965 → 0.894), offsets 0–4 byte-identical, every later offset a few tenths of a
 * point lower — so NO re-tune (the law above fires only on a lost dip or crown). The crowned candidate's
 * conversion preview: the with-arm 0.8965 → 0.894, the without-arm unmoved at 0.955 (no working-year
 * portfolio income without the conversion), both 9 of 10 on-track — no headline flip.
 * ⚑ CORRECTED at the same measurement: "nm [0,1,2] at BOTH tiers" above was already false at HEAD —
 * the FINAL tier reads [0,1] (the provisional pin in devSeeds.test.ts, the only tier pinned, holds
 * [0,1,2]). Some earlier engine change moved it unrecorded; this floor did not.
 *
 * THE PAY CHECK'S W (2026-10-30, `docs/plans/features/working-year-pay-check-build-spec.md` U10): W is
 * $36,000 — Home + Living; the go-go travel line ENDS, so the quote leaves it out. MEASURED at
 * `DEV_CRN_SEED`, W-absent against W-present, both tiers, both tracks: NO crown, non-monotone set or
 * crowned grade moved (floor confirmed-date@0 []; lifestyle confirmed-date@5, nm [0,1,2] provisional and
 * [0,1] final, the crown's p 0.894 / 0.8866 unchanged). Offsets 0–4 are byte-identical: their work stops
 * before the age-62 claim, so no working year meets the earnings test. Offsets 6–10 RISE — the final
 * lifestyle at 6 from 0.9132 to 0.9241 and at 10 from 0.9623 to 0.9848, the final floor at 10 from 0.9834
 * to 0.9939: while both still work past 62 the test withholds most of the early benefit (excess $25,260
 * for Alex, $5,260 for Sam) and credits those months back after full retirement age, and a withheld
 * benefit is untaxed; without W the run paid the reduced benefit in full and the §7 clamp discarded the
 * working-year surplus it made. The plan's prediction ("the crown moves at most one year earlier") did not
 * happen: the crown is the claim year, which no offset below it can reach. No re-tune (the law above
 * fires only on a lost dip or crown).
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
  startCalendarYear: SEED_BUILD_YEAR,
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
 * model.ts:181), so an all-in-one-bucket household could carry a 'custom' order that never governs
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
  startCalendarYear: SEED_BUILD_YEAR,
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
  startCalendarYear: SEED_BUILD_YEAR,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * P3·U11 follow-up (the post-65 Medicare pricing unit) — the ALL-65+ STILL-WORKING household on
 * the DATE route: the live drive for the disclosure's date-route arm (insight 080). Alex is 66 and
 * still working (deferring Medicare until retirement), Sam is 65 and retired — so no member is
 * pre-65 (the marketplace questions are never asked; `healthcarePriced` reads FALSE, no ACA door),
 * yet `dateSearch.ts:261` forces `healthcareEnabled: true` on every candidate, so Medicare IS priced
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
  startCalendarYear: SEED_BUILD_YEAR,
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
 * seed carrying its own state-off twin — a pilot fixture mint (register Tier 4), not a silent edit.
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

/** "Not sure" on Medicare extras, per person: the answer the intake writes for it
 *  (`src/intake/questions.tsx`'s extras question: `{ kind: 'typical', adoptionVintage }`, the vintage read
 *  from the constant, never typed). A STRIPPED field is a different household, a save from before the
 *  extras question existed, which adds a re-confirm line at the gate. */
const notSureExtras = (people: number): NonNullable<ScenarioDraft['medicareExtrasByPerson']> =>
  Array.from({ length: people }, () => ({ kind: 'typical' as const, adoptionVintage: medicareExtrasTypical.value.vintage }))

/**
 * `?seed=patypical` (the one-frame composites plan's U2, KTD5): `pa` with both people answering "not sure"
 * on Medicare extras, so the typical figure funds them and its residual paragraph runs two lines longer
 * (+41.6 px) than the entered form every other priced seed carries. It is the tallest real Pennsylvania
 * face, and the base of the yearly-return and record plants that put the R13 caveat past 731 px (the
 * register's Tier 0 *The tallest real composites break the one-frame law…*). The answer only: a spread of
 * `pa` that sets `medicareExtrasByPerson` and nothing else.
 */
const paTypicalExtras: ScenarioDraft = { ...paAffirmation, medicareExtrasByPerson: notSureExtras(paAffirmation.people.length) }

/**
 * `?seed=failingtypical` (the one-frame composites plan's U2, KTD5): `failing` (the already-failing household,
 * "Already short") with both people answering "not sure" on Medicare extras. `failing` itself carries no
 * extras answer at all; this seed gives it the intake's typical answer, the base of the already-failing
 * yearly-return plant (its caveat measured at 744.3 px with the typical residual). The answer only.
 */
const failingTypicalExtras: ScenarioDraft = { ...retiredFailing, medicareExtrasByPerson: notSureExtras(retiredFailing.people.length) }

// THE RUNG-3 KEY COUNCIL'S PLANTS (`wf_540221e4-42d`, 2026-11-20; `docs/council-log.md`'s row): four bases whose yearly
// returns ({@link AGED_PLANTS}) put rung 3's key to the test on real engine runs before it lands. Rung 3 borrows
// `--text-sm` for the survivor context only where the shown direction is `rethink`, the staleness echo shows and the
// typical Medicare residual runs; each plant probes one edge of that key. Each names its Medicare-extras form in its key.

/**
 * `?seed=surplustypical`: `surplus` (over-funded, "More than covered") with both people answering "not sure" on
 * Medicare extras. The red team's reassuring ROOM frame: its sized room clause plus the typical residual put the R13
 * caveat below his fold on a FRESH frame (743.1 px, b9-7's temporary plant), with no echo for rungs 2a or 2b to reach,
 * so it is a new stop for its own council (the register's composites entry). The answer only, a spread of `surplus`.
 */
const surplusTypicalExtras: ScenarioDraft = { ...surplusWitness, medicareExtrasByPerson: notSureExtras(surplusWitness.people.length) }

/**
 * `?seed=offtracktypical`: the OFF-TRACK household, the one spine state no other seed reaches. `retired`'s couple at
 * $8,500 a month, both answering "not sure" on Medicare extras: off-track, so its clause is `trim`, sized by the spend
 * lane (the shown direction the key reads is `trim`, never `rethink`). The spend sits mid-band on purpose: found
 * 2026-11-21 through the engine, the same household reads off-track from $7,500 to $10,000 a month, so $8,500 stays
 * clear of borderline above and already-failing below. Pinned as found in `devSeeds.test.ts`.
 */
const offTrackTypicalExtras: ScenarioDraft = {
  ...retiredOnTrack,
  annualSpendingReal: 8_500 * 12,
  medicareExtrasByPerson: notSureExtras(retiredOnTrack.people.length),
}

/**
 * `?seed=pafailingtypical`: `failingtypical` in Pennsylvania, the already-failing household answering "not sure" with
 * Pennsylvania's clause inside its residual, the longest priced one. Its yearly return carries all three of rung 3's
 * terms on the tallest residual the key covers (the typical class follows the extras note alone, never the state). PA
 * exempts this all-65+ household's IRA draw, so the verdict stays already-failing (pinned as found).
 */
const paFailingTypicalExtras: ScenarioDraft = { ...failingTypicalExtras, retirementState: 'PA' }

/**
 * `?seed=failingentered`: `failing` with `retired`'s ENTERED Medicare extras ($220 a month for Alex, Sam's affirmed
 * $0), the form every priced seed spreads. Its yearly return carries `rethink` and the echo but not the typical
 * residual, so rung 3's key must leave its survivor context at body size: the scope's third term, read on a real run
 * (the red team's arithmetic put this frame near 691 px, inside the fold, so it never needs the borrow).
 */
const failingEnteredExtras: ScenarioDraft = { ...retiredFailing, medicareExtrasByPerson: retiredOnTrack.medicareExtrasByPerson }

// THE WIDEST PLANTS (the frames-outside plan's U1, `docs/plans/features/frames-outside-widest-member-build-spec.md`, KTD1
// to KTD4 and KTD12). A class is met only when its WIDEST legal household reads inside his 731 px fold on Windows and on
// CI's ubuntu (R3): a plant reading proves the plant, never the class. "Widest" is measured, never assumed: U1 read every
// member of each closed axis in these households' own frames (Windows, 1440×731 @ 2, b9-3, 2026-11-21; the composites
// record folder's README carries the table) and minted the tallest. Every figure sits inside the design ceiling
// (`SPENDING_CEILING_PER_MONTH`), every plant passes the intake's sanity rules with every rule's fields touched, the engine
// accepts it and it saves: `devSeeds.test.ts` pins each of those, and each plant's direction, as found.

/**
 * `?seed=pasurplustypical` (the Pennsylvania room plant): `surplustypical` (over-funded, "More than covered", both
 * people "not sure" on Medicare extras) in Pennsylvania, at today's figures. Its residual carries Pennsylvania's clause,
 * the longest priced one, so it is `surplustypical` with that clause's extra residual line (+20.8 px, b9-9): the room
 * class at the figures its plants already carry, beside the widest. The state only, a spread of `surplustypical`.
 */
const paSurplusTypicalExtras: ScenarioDraft = { ...surplusTypicalExtras, retirementState: 'PA' }

/** The widest plants' one named person: a real-looking name exactly at the name ceiling (`NAME_CEILING`), title case
 *  (Briggsy's ruling on the plan's A7, 2026-11-21: "a real-looking name", never twenty of the font's widest capital). */
const WIDEST_NAME = 'Christopher Hartwell'

/** Person 0 renamed to {@link WIDEST_NAME} and alone on "not sure"; person 1 affirmed $0. The one-person typical
 *  sentence then names him in the residual, the form U1 read one line taller than the both-people form. */
function widestNameAloneOnTypical(d: ScenarioDraft): Pick<ScenarioDraft, 'people' | 'medicareExtrasByPerson'> {
  const [first, second] = d.people
  return {
    people: [{ ...first, name: WIDEST_NAME }, second],
    medicareExtrasByPerson: [notSureExtras(1)[0]!, { kind: 'none' }],
  }
}

/** One stream per person, paid until that person's death (`survivorPct` 0), so the income step-down at the first death
 *  is the stream itself, six characters (Social Security alone reaches six only with both benefit bases near the `pia-over-ceiling` cap,
 *  each claimed at 70: above about $96,700 a year if born 1960 or later, by 1.24, from about $90,900 if born 1943 to 1954, by 1.32). TAX-FREE (a non-qualified annuity whose whole
 *  payment is return of basis): a retired year's income above spending is dropped while its tax is paid from savings
 *  (the register's Tier 1 *Money coming in beyond what the household spends is thrown away…*), so a taxable stream drains
 *  the portfolio of a household it more than covers, and neither plant below would reach its class. */
const untaxedStreamEach = (annualRealToday: number): ScenarioDraft['incomeStreams'] =>
  ([0, 1] as const).map((ownerIndex) => ({
    ownerIndex,
    annualRealToday,
    startAge: 60,
    colaMode: 'real-flat' as const,
    survivorPct: 0,
    type: 'annuity' as const,
    qualified: false as const,
    exclusionFraction: 1,
  }))

/** The largest annual spend the ceiling holds: the ceiling less one display step, a month, times twelve (shown "99,990"). */
const WIDEST_ANNUAL_SPEND = (SPENDING_CEILING_PER_MONTH - PER_MONTH_DISPLAY_STEP) * 12

/**
 * `?seed=failingwidest` (class B's widest: direction `rethink`, the typical residual). `pafailingtypical`'s couple at
 * the largest spend the ceiling holds, with the members U1 measured tallest:
 *  · Pennsylvania's clause and the ONE-PERSON typical sentence naming a 20-character name: 8 residual lines against the
 *    both-people form's 7 and every other state's 6;
 *  · the RELIEF combination: an essentials budget whose reading differs from the full one, so the essentials card
 *    shows and the survivor card folds. It read 775.7 px against the inline combination's 756.8 (+18.8), so it is this
 *    class's widest. The fold hides the survivor's spending and the step-down, and the rethink clause quotes no figure,
 *    so the closed frame shows none of this household's monthly figures; each still sits inside the ceiling.
 * The essentials card needs an essentials reading that holds while the full spend runs short from the start: $120,000
 * of essentials under two $130,000 tax-free streams, over the base's one IRA raised to $1,000,000 so the floor's
 * Medicare and tax drains never empty it (with taxable streams, or the base's $60,000, the floor reads already-failing
 * too: the dropped-surplus defect above). The full spend draws about $916,000 in year one: already-failing, 0 of 10.
 * Changed from `pafailingtypical`: person 0's name, the extras answers, the spend, the streams, the IRA's balance (its
 * kind and blend kept, so the doors stay the class's own) and the budget.
 */
const failingWidest: ScenarioDraft = {
  ...paFailingTypicalExtras,
  ...widestNameAloneOnTypical(paFailingTypicalExtras),
  enteredAccounts: [{ ...paFailingTypicalExtras.enteredAccounts[0]!, valueToday: 1_000_000 }],
  incomeStreams: untaxedStreamEach(130_000),
  budget: [
    bline('housing', 'Mortgage & taxes', 120_000, 'essentials'),
    bline('travel', 'Travel', WIDEST_ANNUAL_SPEND - 120_000, 'discretionary'),
  ],
  annualSpendingReal: WIDEST_ANNUAL_SPEND,
}

/**
 * `?seed=surpluswidest` (class A's widest: direction `room`, the typical residual). The Pennsylvania room plant's couple
 * at $40,000 a month, with the members U1 measured tallest:
 *  · Pennsylvania's clause and the ONE-PERSON typical sentence naming a 20-character name (8 residual lines);
 *  · the INLINE combination: the survivor card open, its spending basis and step-down at six characters ($30,000 and
 *    $22,830 a month). It read 784.7 px against the relief combination's 775.7;
 *  · the room clause's sized form, three lines, the most of any room form. While the figure is being worked out, the
 *    reserved sentence quotes three times the spend ($120,000, seven characters: `reserveClauseFor`), so $40,000, a
 *    third of the ceiling and over, is what puts the reserve at its widest; every six-character spend reads the same
 *    width (tabular numerals), so it stands for the whole range.
 * Over-funded at that spend because two $250,000 tax-free streams and the base's $3,000,000 IRA carry it. Changed from
 * `pasurplustypical`: person 0's name, the extras answers, the spend and the streams.
 */
const surplusWidest: ScenarioDraft = {
  ...paSurplusTypicalExtras,
  ...widestNameAloneOnTypical(paSurplusTypicalExtras),
  incomeStreams: untaxedStreamEach(250_000),
  annualSpendingReal: 40_000 * 12,
}

/**
 * `?seed=paofftrackone` (the off-track class at its widest closed-axis members, at today's figures; round 2 of the
 * frames-outside build's review, the register's six-character entry's first prescription): `offtracktypical` in
 * Pennsylvania with the one-person typical sentence naming a 20-character name ({@link widestNameAloneOnTypical}), so
 * the residual runs 8 lines against `offtracktypical`'s 6 (derived about 756.9 px at REAL, no leading entry reaching a
 * fresh `trim` frame). Person 1's affirmed $0 drops one person's typical extras, and Pennsylvania taxes neither this
 * all-65+ household's IRA draw nor its Social Security, so it stays off-track: pinned as found in `devSeeds.test.ts`.
 * Changed from `offtracktypical`: the state, person 0's name and the extras answers. Its yearly return:
 * `yearpaofftrackone` ({@link AGED_PLANTS}).
 */
const paOffTrackOne: ScenarioDraft = {
  ...offTrackTypicalExtras,
  retirementState: 'PA',
  ...widestNameAloneOnTypical(offTrackTypicalExtras),
}

// THE REVIEW'S REMAINING DERIVED MEMBERS (b9-1, 2026-11-22). Rounds 1 and 2 of the frames-outside build's review derived
// them by U1's 20.8 px a residual line, never read; the register's composites entry, prescription (4), owes each planted
// and read before the record card's seat council sits. Each is its base with the one-person typical sentence naming a
// 20-character name ({@link widestNameAloneOnTypical}), in Pennsylvania. Every verdict below was read through the real
// engine before it was typed, and is pinned as found in `devSeeds.test.ts`.

/**
 * `?seed=pabudgetone`: `budget` (the relief spine household: an essentials budget over a borderline full spend, so the
 * essentials card shows and the survivor card folds) in Pennsylvania with the one-person name. Still "On the line" over
 * a "More than covered" floor, the direction `on-the-line` and the relief shown, as `budget` (PA taxes neither this
 * all-65+ household's IRA draw nor its Social Security). Derived about 747.8 px at REAL (left-bound by about 170 px).
 * Changed from `budget`: the state, person 0's name and the extras answers (`budget` answers none, which funds the
 * typical figure for both; here person 0 says "not sure" and person 1 affirms $0).
 */
const paBudgetOne: ScenarioDraft = {
  ...retiredBudget,
  retirementState: 'PA',
  ...widestNameAloneOnTypical(retiredBudget),
}

/**
 * `?seed=paone`: `patypical` with the one-person name, the base of `?vault=yearpaone` and `?vault=yearparecone`
 * ({@link AGED_PLANTS}). ⚑ FOUND (b9-1): affirming person 1's extras at $0 lifts this household from "On the line" to
 * "On track" (one person's typical figure less to fund); the direction stays `on-the-line`, so it is still `yearpa`'s
 * class (the frames-outside plan's classes key on the direction and the residual's form, R4 to R6) with a shorter verdict
 * word. The review's derivation ("about 729.0" fresh, "about 746.6" a year on) assumed only the residual moved; the arms
 * read whether the verdict's word moves the frame. Changed from `patypical`: person 0's name and the extras answers.
 */
const paOne: ScenarioDraft = { ...paTypicalExtras, ...widestNameAloneOnTypical(paTypicalExtras) }

/**
 * `?seed=pafailingone`: `pafailingtypical` with the one-person name, the base of `?vault=yearpafailingone`. Still
 * "Already short", its direction `rethink`. Its fresh frame is not a member (B's widest, `failingwidest`, carries this
 * residual with the relief combination and six-character figures), so only its yearly return is printed: derived about
 * 743.3 px on Windows and 764.1 on CI's ubuntu (rung 3's step-down re-wraps there). Changed from `pafailingtypical`:
 * person 0's name and the extras answers.
 */
const paFailingOne: ScenarioDraft = { ...paFailingTypicalExtras, ...widestNameAloneOnTypical(paFailingTypicalExtras) }

/**
 * `?seed=surpluswidestrelief`: A's RELIEF combination, `surpluswidest` with U1's essentials budget ($120,000 a year of
 * essentials under two $250,000 tax-free streams, the rest travel), so the essentials card shows and the survivor card
 * folds. U1 read it closed at 775.7 px against the inline combination's 784.7, which made the inline A's widest. The
 * budget turns the headline "On track" over a "More than covered" floor, the direction still `room` (pinned as found).
 * Planted for the survivor fold a household OPENS (round 3 of the build's review: derived about 908 px opened at REAL,
 * above A's inline 784.7), and as A's sibling combination for the seat's acceptance test. Changed from `surpluswidest`:
 * the budget alone (its lines sum to the spend; no medical figure, so the reconciliation holds).
 */
const surplusWidestRelief: ScenarioDraft = {
  ...surplusWidest,
  budget: [
    bline('housing', 'Mortgage & taxes', 120_000, 'essentials'),
    bline('travel', 'Travel', 40_000 * 12 - 120_000, 'discretionary'),
  ],
}

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
 * THE PRICED PRE-65 WITNESS — `?seed=healthnc` (Card 4, the four-faces Caddie walk 2026-09-11).
 * `retiredHealth` (61/59, ACA-priced, reaches the Healthcare door) in North Carolina, ONE field
 * changed. Every other priced-state seed is all-65+ (`nc`/`pa`/`fl` spread the 66/65 couple;
 * `datenc` spreads the 66/65 still-working couple), so their state clause rides the Medicare
 * residual — and the verdict surfaces render that residual ONLY when no member is pre-65
 * (`showMedicarePricedNote`). This is the one household whose residual is structurally WITHHELD
 * while its run PRICES a state: the verdict's clause must arrive by the standalone note
 * (`composeVerdictStateNote`), the fourth cell of the route × cohort × pricing matrix, and it had
 * no live plant until this seed. The register's prescription named `datenc` for this cell — that
 * was wrong (all-65+), corrected the same day. Engine-proven in devSeeds.test.ts: `pricedStateForRun`
 * reads 'NC', the door predicate holds, the residual predicate reads false, and NC prices strictly
 * more lifetime tax than the state-absent `health` twin (the flat rate on the pretax draw + the
 * brokerage gains). Stateless-base rule N/A: this seed is never doctored into an aged vault.
 */
const healthNcSeed: ScenarioDraft = { ...retiredHealth, retirementState: 'NC' }

/**
 * THE WIDE-GAP MEDICARE WITNESS — `?seed=healthgap` (council wf_9921d7e3-55b, 2026-09-13 late).
 * `healthnc` with ONE field changed: Sam is 40, not 59 (birthYear + retirementAge follow). The
 * enrolled median on the wire is NON-MONOTONIC — it rises when the younger spouse enrolls and falls
 * back when the elder's death crosses the path median — so on this gap the both-enrolled median
 * window is a ONE-year blip (measured: yearsFromNow 25 one enrolled · 26 two · 27 one) and the
 * premium card's era arm fires on it. The council kept the bare first-crossing rule (a persistence
 * floor was vetoed as the rosy direction: the engine PRICED that year) and framed the hero instead —
 * the per-arm eyebrow + the "while you're both on it" frame — so this seed exists to give the
 * residual an eye: the Caddie's rendered read of both Medicare cards on a shape no shipped seed
 * reached. Pinned through the real engine in healthSheetSeedGate.test.ts. Never doctored into a
 * vault; a 40-year-old "retired at 40" is a witness shape, not a plan.
 */
const healthGapSeed: ScenarioDraft = {
  ...healthNcSeed,
  people: [
    healthNcSeed.people[0]!,
    { ...healthNcSeed.people[1]!, birthYear: 1986, currentAge: 40, retirementAge: 40 },
  ],
}

/**
 * THE EARLY-CLAIM WITNESS — `?seed=healthss` (2026-10-15, the register's Tier 0 "The health sheet's
 * conversion tile prices the federal tax at the bare bracket rate — …"). `health` with both members 62
 * (born 1964) and BOTH claiming Social Security at 62, spending $60,000: the only shipped seed whose ACA
 * anchor year draws a benefit (every other pre-65 seed claims at 67), so its conversion tile is the one
 * that prices the benefit taxation a converted dollar triggers. Measured through the real engine
 * (2026-10-15): the anchor's benefit 34,999.20 (two dime-floored 62-claims), AGI 54,669, provisional
 * income in the 85 % phase, the 10 % band — 10 × 1.85 + 9.96 → 28¢ (the bare bracket read 20¢). Pinned
 * in healthSheetSeedGate.test.ts. Never doctored into a demo — it exists to be cold-read.
 */
const healthSsSeed: ScenarioDraft = {
  ...retiredHealth,
  people: [
    { ...retiredHealth.people[0]!, birthYear: 1964, currentAge: 62, retirementAge: 60, socialSecurityClaimAge: 62 },
    { ...retiredHealth.people[1]!, birthYear: 1964, currentAge: 62, retirementAge: 58, socialSecurityClaimAge: 62 },
  ],
  annualSpendingReal: 60_000,
}

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
 * The CEILING crown — the tightest headroom on the odds ladder: `date`'s couple so over-funded that
 * stopping TODAY already clears with a quantized lower bound ≥ 0.95, so the crowned mark sits at rung 10,
 * whose callout anchors at 42 of the 284-unit viewBox. It is the arm that proves the FLOW seat
 * (`OddsLadder` useCrownSeat, 2026-09-06): the callout needs a ~503px figure and the widest this product
 * renders is 496, so the words take the row above the plot on every shipping arm, reading the clamped
 * ceiling proportion ("better than 9 in 10" — never "10 of 10"). Until 2026-09-05 no seed reached the
 * ceiling at all; the chart-text gate walks it on every arm. Balances tuned in real Chromium 2026-09-05.
 */
const atCeilingSeed: ScenarioDraft = {
  ...stillWorking,
  enteredAccounts: [
    { ...stillWorking.enteredAccounts[0]!, valueToday: 2_700_000 },
    { ...stillWorking.enteredAccounts[1]!, valueToday: 600_000 },
  ],
}

/**
 * THE PAY CHECK'S W ON A SEED (`docs/plans/features/working-year-pay-check-build-spec.md` U8, U10's
 * general rule): mint W LAST, on the seed's OWN final draft — the `confirmed` answer the W step's
 * "yes" would store there (its own quote, its own state-tax reading). Applied at the registry entry,
 * never inside a seed const: every date const is spread by another (`datesolo`/`atceiling` from
 * `stillWorking`, `datesplit`/`datemixed` from `stillWorkingBorderline`, `datenc` from
 * `stillWorkingAllMedicare`), and a W in a const literal would ride into its spreads with the WRONG
 * quote — a stale answer no one gave. Fail-loud on a seed with nothing to quote (a $0 quote cannot be
 * confirmed; the codec refuses it), never a silent W-less seed.
 *
 * U10's MEASUREMENT (2026-10-30, `DEV_CRN_SEED`, both tiers, both tracks — every date seed and date
 * plant through the real date search, W-absent at HEAD against W minted by this function, then the
 * edited tree re-run and byte-compared to the minted run): NO crown, NO non-monotone set and NO crowned
 * grade moved on any seed or plant. `date65`, `datenc` and `atceiling` are byte-identical: each crowns
 * at 0, and no working year of theirs runs short at any offset. `date65` and `datenc` meet no earnings
 * test either (the worker claims at full retirement age, and the earliest death the engine draws starts
 * any widow(er) benefit past the survivor's full retirement age). `atceiling` DOES: retired Sam's death
 * at 66, 67 or 68 leaves Alex working with her widow benefit held back ($21,068.40 a year after a death
 * at 66) at the uncrowned offsets 7–10 — but it is over-funded, so the held-back money flips no path
 * there, and its crowned band is offset 0's, where nobody works (the whole-file review's probe,
 * 2026-10-31, every offset). `date`,
 * `dateborder`, `datesplit` and `datestale` move only in band percentiles and a few uncrowned offsets'
 * fourth decimal (a working widow(er)'s benefit is withheld while they work and credited back later).
 * `datemixed`'s offsets 8–10 fall a few hundredths of a point (its working-widow(er) rows turn short).
 * `dip` and `datearrived` RISE at offsets 6–10 (see `dateDipSeed`). Year 0 of the money picture on every
 * W-carrying seed matches a hand derivation from the primaries to the cent, line by line (pay, Social
 * Security paid and held back, payroll, federal and NC tax, deposits, W, the bottom line). The quotes:
 * `date` / `atceiling` / `datesolo` $84,000 · `dateborder` / `datesplit` $74,000 · `datemixed` $98,000 ·
 * `dip` $36,000 (its go-go travel line ends, so the quote leaves it out) · `date65` / `datenc` $78,000.
 */
function withConfirmedW(draft: ScenarioDraft): ScenarioDraft {
  const w = confirmedWorkingYearCost(draft)
  if (w === null) throw new Error('withConfirmedW: the seed quotes $0 — a confirmed W needs a quote above $0')
  return { ...draft, workingYearCost: w }
}

/**
 * THE SHORT WITNESS — `?seed=dateshort` (the pay check's R21): an early claimant working PART-TIME
 * beside a retired spouse, whose working years do not cover what a working year costs. Alex is 63,
 * works part-time for $30,000 and claimed Social Security at 62, so the earnings test holds part of
 * the benefit back (the held-back words inside the picture's Social Security row); Sam is 66, retired
 * and on Medicare (the picture's also-paid-from-savings group). What a year costs, $70,000, is more
 * than pay plus both benefits — so every working year runs SHORT and draws the difference from savings
 * (the picture's "Short" bottom line). Stateless (the unpriced reading), budgetless, yearly spend, so
 * its W is a plain confirmed $70,000. Before the pay check this household's working years drew
 * NOTHING (the §7 clamp assumed pay covered everything) — the rosy hole the check closes.
 */
const dateShortWitness: ScenarioDraft = {
  people: [
    {
      name: 'Alex',
      sex: 'female',
      birthYear: 1963,
      currentAge: 63,
      workStatus: 'working',
      earnedIncomeReal: 30_000,
      pia: 21_600,
      socialSecurityClaimAge: 62,
    },
    {
      name: 'Sam',
      sex: 'male',
      birthYear: 1960,
      currentAge: 66,
      workStatus: 'retired',
      retirementAge: 64,
      earnedIncomeReal: 0,
      pia: 18_000,
      socialSecurityClaimAge: 65,
    },
  ],
  enteredAccounts: [
    { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 700_000, annualContribution: 3_000 },
    { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 250_000 },
  ],
  incomeStreams: [],
  tickerClassifications: {},
  health: {
    // Alex is pre-65 and stops somewhere in the window, so the marketplace quote is required; Sam is
    // 66, so the 2-year IRMAA seed is too. Alex's working-year investment income is the explicit
    // figure the date route needs; retired Sam's is the explicit 0.
    enrolledPremiumMonthlyToday: 900,
    slcspMonthlyToday: 850,
    irmaaMagiSeed: [60_000, 60_000],
    workingYearInvestmentByPerson: [2_000, 0],
  },
  annualSpendingReal: 70_000,
  spendEntryPeriod: 'year',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: SEED_BUILD_YEAR,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'p2-dev-seed',
  seed: DEV_CRN_SEED,
}

/**
 * THE LATER-LEFT-OVER WITNESS — `?seed=datelateleftover` (build 2's KTD14, U15; dark): the household the
 * left-over question is never asked of. `dateshort`'s couple, with Alex's claim moved to 67, her full
 * retirement age, and a year that costs $48,000. Year 0 runs short (the money picture prints "Short $7,695":
 * pay and Sam's benefit fall below what the year costs), so R5 never asks what happens to a left over. From
 * the year she turns 67 (2030, year 4) her own benefit arrives in full, past the earnings test, and every
 * later working year has money left over (about $13,000 a year, measured on the window-top run). Build 2
 * credits none of it, because year 0's printed figure caps every year: the filed D7 item this seed is the
 * witness for. It carries W (minted on its own final draft, `withConfirmedW`) and no left-over answer.
 */
const dateLateLeftOverWitness: ScenarioDraft = {
  ...dateShortWitness,
  people: [{ ...dateShortWitness.people[0]!, socialSecurityClaimAge: 67 }, dateShortWitness.people[1]!],
  annualSpendingReal: 48_000,
}

/**
 * THE STALE-W WITNESS — `?seed=datecoststale` (the pay check's KTD21, R21): `date`'s household after
 * it confirmed W at its $84,000 spending, then lowered that spending to $78,000. Its W no longer
 * matches the quote it confirmed, so the walk's W step opens on the stale note with no answer checked
 * (and holds Continue until it is re-answered), the result wears the standing pay-check line, and the
 * panel's W row opens on its stale face. The engine keeps running on the last figure given, $84,000
 * (R4) — exactly what the line says. The spending moves DOWN on purpose: the line must be seen beside a
 * date its working years decide (measured in real Chromium 2026-10-30: crowned about 7 years out,
 * around 2033). `date` itself crowns 9 years out — a confirmed date one year inside the window's edge
 * (the edge is offset 10, `DATE_OFFSET_WINDOW_TOP`, where the crown reads `window-edge-unconfirmed`) —
 * and a raise costs it the crown; the over-funded `atceiling` crowns today, where no working year exists
 * for W to touch.
 *
 * THE FIRST OF THE "MINT, THEN MOVE" WITNESSES — the exceptions to "mint W last, on the seed's own final
 * draft" (`withConfirmedW`): a stale answer is BY DEFINITION one minted on an earlier draft. So it is
 * minted on `date`'s own draft, and the spending moves AFTER the mint — named here, never a W typed into a
 * literal. Build 2's `datesavedmoved`, `datesavedstale` and `datesavedrisen` (below) are the others. `stillWorking` itself
 * stays W-free: `date` takes its W at the registry like every date seed (U10) — the same $84,000 this
 * witness confirmed, still fresh there because `date`'s spending never moved.
 */
const dateCostStaleWitness: ScenarioDraft = {
  ...withConfirmedW(stillWorking),
  annualSpendingReal: 78_000,
}

/**
 * BUILD 2's "ALL OF IT" ON A SEED (`docs/plans/features/working-year-surplus-build-spec.md` KTD14): the
 * "saved" reply minted through the SHIPPED write (`writeWorkingYearLeftOver`) at the draft's own printed
 * year-0 Left over, exactly what a tap on "All of it" would store there. It needs a W already on the draft
 * (no W, no picture, nothing to answer under), so it always wraps `withConfirmedW`. Fail-loud on a seed the
 * question is never asked of — the write stores nothing there, and an answerless "saved" witness would be a
 * broken fixture that still LOOKS like one (the `withConfirmedW` law).
 */
function withSavedLeftOver(draft: ScenarioDraft): ScenarioDraft {
  const live = workingYearLeftOverLive(draft)
  if (live === null || live < 1) {
    throw new Error('withSavedLeftOver: this seed has no year-0 left over to answer under (R5 never asks it)')
  }
  const saved = writeWorkingYearLeftOver(draft, 'saved', live)
  if (saved.workingYearLeftOver?.kind !== 'saved') throw new Error('withSavedLeftOver: the write stored no "saved" answer')
  return saved
}

/**
 * THE MOVED WITNESS — `?seed=datesavedmoved` (build 2's KTD14, R12): `datesaved`'s household after it said
 * "All of it" at its $16,985, then got a raise to $165,000. W stays fresh (its quote reads the spending,
 * never the pay), so the shown state is "saved, moved": the live year-0 figure is $27,537 (pay 165,000 −
 * payroll 12,622.50 − federal tax 20,840 − deposits 20,000 − W 84,000, hand-derived from the primaries by
 * the build-2 record's `year0check.mts`: a MATCH), the stored one $16,985, and the engine credits at most
 * the smaller each year (R8). The panel seat and the Result name both figures. Minted, then moved: never an
 * answer typed into a literal.
 */
/** `date`'s household with "All of it" stored at its own $16,985 — `?seed=datesaved`, and the base both
 *  "mint, then move" witnesses below start from (minted once). */
const dateSavedWitness: ScenarioDraft = withSavedLeftOver(withConfirmedW(stillWorking))

const dateSavedMovedWitness: ScenarioDraft = {
  ...dateSavedWitness,
  people: [{ ...dateSavedWitness.people[0], earnedIncomeReal: 165_000 }, dateSavedWitness.people[1]],
}

/**
 * THE STALE-W WITNESS WITH A SAVED ANSWER — `?seed=datesavedstale` (build 2's KTD14, R7, R12): `datesaved`'s
 * household that then lowered its spending to $78,000 — `datecoststale` with "All of it" stored at $16,985
 * before the spending moved. W is stale, so the shown state is "waiting on W" (R3's order puts it before the
 * stored answer) and NOTHING left over is carried (R7): its date input is `datecoststale`'s, exactly. A
 * stale W still rides at $84,000, so the live figure is still $16,985 — never "moved".
 */
const dateSavedStaleWitness: ScenarioDraft = {
  ...dateSavedWitness,
  annualSpendingReal: 78_000,
}

/**
 * THE RISEN TWIN — `?seed=datesavedrisen` (build 2's U11, the Caddie record's (p)): `datesaved`'s household
 * that then RAISED its spending to $90,000. W (a yes to $84,000) now sits BELOW today's quote, so its stale
 * line is the one `datesavedstale` can never show: W's sentence, the year-level lean that $84,000 makes any
 * working year the pay doesn't cover look cheaper (`heldYesBelowQuote`; the U11 walk's (ae) replaced the
 * whole-answer "can look better", which U11 measured the wrong way here), then R12's clause that none of the
 * $16,985 a year is added until W is checked, and what a check at $90,000 or more adds at most: year 0's
 * $10,985 left over at the quote (pay 150,000 − payroll tax 11,475 − tax 17,540 − deposits 20,000 − W
 * 90,000; `workingYearCheckAtQuote`'s `capped`) — and the Keep door is withheld (ruling 34). Like `datesavedstale`, the shown state is
 * "waiting on W" and nothing left over is carried (R7): a stale W still rides at $84,000, so the live
 * figure is still $16,985. U11 measured exactly this household (the build-2 record's `u11drafts.mts`
 * RISEN pair: `datesaved` with its spending raised by $6,000): the stale arm crowns no date at the final
 * tier, and its checked twin (W re-answered at $90,000) crowns 9 years out — the credit decides it. It
 * exists so a walk can render the clause after a RISEN quote, which no seed did. The fourth "mint, then
 * move" witness: minted once (`dateSavedWitness`), then moved.
 */
const dateSavedRisenWitness: ScenarioDraft = {
  ...dateSavedWitness,
  annualSpendingReal: 90_000,
}

/**
 * THE RISEN TWIN'S SHORT ARM — `?seed=datesavedrisenshort` (the U11 Caddie walk's (ae), council
 * `wf_fc80029e-d93`): `datesaved`'s household that then raised its spending to $105,000, past year 0's whole
 * left over. A stale W still rides at $84,000, so year 0 still prints $16,985 ("waiting on W") and nothing is
 * carried (R7). A check at today's quote leaves year 0 short: pay 150,000 − payroll tax 11,475 − tax on outside
 * income 17,540 − deposits 20,000 − W 105,000 = −4,015 (`date`'s year-0 sum, hand-derived in
 * `e2e/vertical-fit.spec.ts`'s stale-W block, with W at the quote: W comes off year 0's cash dollar for dollar).
 * So its checked twin carries nothing either, at a higher cost, and W's line says a check adds none of the
 * $16,985 and that this answer can look better than it really is (`workingYearCheckAtQuote`'s `firstShort`).
 * A "mint, then move" witness: minted once (`dateSavedWitness`), then moved.
 */
const dateSavedRisenShortWitness: ScenarioDraft = {
  ...dateSavedWitness,
  annualSpendingReal: 105_000,
}

/**
 * THE RISEN TWIN'S LATER-SHORT ARM — `?seed=datesavedrisenlater` (the U11 Caddie walk's (ae)): the short arm's
 * household whose retired spouse, Sam (60), also receives $10,000 a year of alimony that ends at 62, under an
 * agreement signed after 2018, so it is not taxed to Sam (`IncomeTaxTreatment`'s `executedAfter2018`) and the
 * tax line stays $17,540. A stale W still rides at $84,000 (year 0 prints $26,985: "waiting on W"). At today's
 * $105,000, year 0 has $5,985 left over (the short arm's −4,015 plus the $10,000), so a check adds at most
 * $5,985 a year (`capped`, below the stored $16,985); from 2029, Sam 63 and the alimony ended, each working year
 * comes up $4,015 short at $105,000, the short arm's year again. That first short later year is what W's line
 * names (`laterShort`): a check credits it nothing and draws more there. A "mint, then move" witness: minted
 * once (`dateSavedWitness`), then moved.
 */
const dateSavedRisenLaterWitness: ScenarioDraft = {
  ...dateSavedRisenShortWitness,
  incomeStreams: [
    {
      ownerIndex: 1,
      type: 'alimony',
      executedAfter2018: true,
      annualRealToday: 10_000,
      startAge: 50,
      endAge: 62,
      colaMode: 'real-flat',
      survivorPct: 0,
    },
  ],
}

/**
 * THE RETYPE — `?seed=datesavedtyped`, and as a vault `?vault=datesavedtyped` (U11 walk 6's R1; the Tier 0 entry *A
 * figure typed below today's spending clears W's stale line for good…*): `datesavedrisen`'s household that answered its
 * stale line with "No — I'll enter a different figure" and typed its old $84,000 back in, by the year
 * (`writeEnteredWorkingYearCost`, the W step's and the panel row's own write). A typed figure is never staled on a quote
 * (KTD10), so W is FRESH: year 0 at $84,000 prints $16,985 again, the stored "All of it" reads "saved" and is carried
 * whole, and no stale line speaks. R1's typed-below line does, on the Result and, as a vault, on the gate
 * (`workingYearCostTypedBelowLine`): the answer counts $84,000, below the $90,000 spending; a working year almost always
 * costs at least that $90,000, so it can look better; at the spending year 0 would have $10,985 left over, so the answer
 * there adds at most that in any working year. Then its one run over the whole window, a plain paragraph, in T's twin
 * form (the walk-9 form council's call (2): the cap sentence already said the answer at the spending's $10,985, so the
 * run draws no first beat): this answer adds at most $16,985 a year, so at the spending $6,000 less in your savings in
 * each working year you're both alive; then the survivor part. U11
 * walk 6 measured exactly this draft (`u11-walk6\measure\R1-MEASURE.md`, draft b): about 9 years out at a 0.87 lower
 * bound, where the honest "Yes" at $90,000 crowns the same year on the 0.85 bar with no margin. A "mint, then move"
 * witness: minted once (`dateSavedWitness`), moved, then retyped.
 */
const dateSavedTypedWitness: ScenarioDraft = writeEnteredWorkingYearCost(dateSavedRisenWitness, 84_000, 'year')

/**
 * THE FOUR-BUCKET READ-BACK — `?seed=datesavedfourbuckets`, and as a vault `?vault=datesavedfourbuckets` (council
 * `wf_22858e04-f7a` (6): the gate's route must sit in his first frame with all four bucket rows and both benefit rows):
 * `datesavedrisenlater`'s household that also holds a brokerage account (Alex's, $60,000 on a $45,000 basis) and an HSA
 * (Sam's, $18,000, from his last job). Neither takes a deposit, so the working years' cash is `datesavedrisenlater`'s to
 * the dollar (no deposit moves, and the taxable account's yield never reaches a year's tax base) and its stale line is
 * the same longest line any seed draws; the gate's read-back gains the taxable and HSA rows, so it is the tallest gate
 * a stale W can draw. Before this seed no seed carried four buckets (taxable rode only spine seeds; no seed had an
 * HSA). A "mint, then move" witness: minted once (`dateSavedWitness`), then moved, then given the two accounts.
 */
const dateSavedFourBucketsWitness: ScenarioDraft = {
  ...dateSavedRisenLaterWitness,
  enteredAccounts: [
    ...dateSavedRisenLaterWitness.enteredAccounts,
    { ownerIndex: 0, kind: 'brokerage', ticker: 'VTI', valueToday: 60_000, basis: 45_000 },
    { ownerIndex: 1, kind: 'hsa', ticker: 'VTI', valueToday: 18_000 },
  ],
}

/**
 * THE RETYPE AFTER A MOVE — `?seed=datesavedtypedmoved`, and as a vault `?vault=datesavedtypedmoved` (the walk-6 round
 * review's pair, L3-3 / L1-5 / L2-5): `datesavedrisenlater`'s household that typed its old $84,000 back in, by the year
 * (`writeEnteredWorkingYearCost`). W is FRESH (a typed figure is never staled on a quote, KTD10), and year 0 at $84,000
 * now prints $26,985 (Sam's alimony began after the answer), so the stored "All of it" at $16,985 reads "saved, moved".
 * The one seed where R1's typed-below line and a moved left over speak together, each figure naming what it rests on:
 * on the Result and, with no rules line fired, on the gate (the walk-9 form council's call (1a): one order on both hosts,
 * one note on the gate) the line carries the moved clause ("…At your figure of $84,000 a year, it has $26,985 left over
 * now. …") after its counts sentence and before the lean, then its three runs as an ordered list (the whole-window
 * rebuild: 2026 through 2028, the 2029–2032 run that comes up short at $105,000, 2033 through 2035), each stating this
 * answer's $16,985 beside the answer at the quote; the gate's door scope then names the left over too, and no moved line
 * of its own is drawn. No date within the window: the final tier's top rung reads 0.80,
 * against `datesavedrisenlater`'s 0.74 (b9-5's probe, the retype residual the register's retype entry records). A "mint,
 * then move" witness: minted once (`dateSavedWitness`), moved, given the alimony, then retyped.
 */
const dateSavedTypedMovedWitness: ScenarioDraft = writeEnteredWorkingYearCost(dateSavedRisenLaterWitness, 84_000, 'year')

/**
 * THE PENSION RETYPE — `?seed=datesavedtypedpension`, and as a vault `?vault=datesavedtypedpension` (the whole-window
 * rebuild's five-span witness, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`, walk 8's first added
 * target): `datesavedrisenlater`'s household with Sam's $9,000 a year pension at 64 and 65 (real-flat, no survivor
 * share), its old $84,000 typed back in by the year. The pension lifts 2030 and 2031 above $0 at the $105,000 quote, so
 * the short years there split into two runs, 2029 and 2032, and the typed-below line draws five spans on the gate, the
 * Result and the seat. The stored $16,985 sits below year 0's $26,985, so the answer reads "saved, moved", as on
 * `datesavedtypedmoved`, and its gate draws one note, the typed-below line carrying the moved clause (the walk-9 form
 * council's call (1a)). Built here from the seed it moves, never by importing the test
 * builder (that file imports `DEV_SEEDS`: a cycle, and app code reading a test file); `devSeeds.test.ts` pins it equal
 * to `typedBelowPensionHousehold()`.
 */
const dateSavedTypedPensionWitness: ScenarioDraft = writeEnteredWorkingYearCost(
  {
    ...dateSavedRisenLaterWitness,
    incomeStreams: [
      ...(dateSavedRisenLaterWitness.incomeStreams ?? []),
      { ownerIndex: 1, type: 'pension', annualRealToday: 9_000, startAge: 64, endAge: 65, colaMode: 'real-flat', survivorPct: 0 },
    ],
  },
  84_000,
  'year',
)

/**
 * THE CROWNED RETYPE — `?seed=datesavedtypedcrowned`, and as a vault `?vault=datesavedtypedcrowned` (the whole-window
 * rebuild's crowned witness, walk 8's second added target): `datesavedtypedmoved`'s household with Alex's 401(k) raised
 * to $1,600,000, so the date route crowns a stop inside the window before its 2033–2035 span: 7 years out on both tiers
 * (U3's probe, `u3-crown.out.txt`: the provisional at a 0.85 lower bound on the bar with no margin, the final at 0.86).
 * Savings never enter a working year's cash (no deposit moves, and the accounts' yield never reaches a year's tax base),
 * so both money pictures, and so the spans, are TM's to the dollar: the one seed where a span is named past the
 * headline's date (the line reads no crown, R12). Built here, never by importing the test builder;
 * `devSeeds.test.ts` pins it equal to `typedBelowCrownedHousehold()`.
 */
const dateSavedTypedCrownedWitness: ScenarioDraft = {
  ...dateSavedTypedMovedWitness,
  enteredAccounts: dateSavedTypedMovedWitness.enteredAccounts.map((a, i) => (i === 0 ? { ...a, valueToday: 1_600_000 } : a)),
}

/**
 * THE NEAR-LINE RETYPE — `?seed=datesavedtypednearline`, and as a vault `?vault=datesavedtypednearline` (the tax rider
 * build's household, `docs/plans/features/typed-below-tax-rider-build-spec.md` U1; walk 8 reads its 2033 span by eye and
 * by ear): `datesavedtypedmoved`'s household drawing pre-tax money first, with Alex's working-year investment income
 * raised to $70,000. Medicare reads that figure as working-year income and the pay check charges its tax, so every year
 * through 2032 comes up short at the $105,000 quote, year 0 among them; in 2029–2032 the typed answer's recorded
 * Medicare income sits under the first joint line and the quote's over it, so Sam, on Medicare from 2031, pays the first
 * income surcharge at the quote alone in 2031–2034: the household whose comparisons leave out a real surcharge
 * difference (the rider's "except for any difference between the two answers in income tax and Medicare’s income
 * surcharge", walk 9's flip (i)). Built here, never by importing the test witness (that file imports `DEV_SEEDS`); `devSeeds.test.ts` pins
 * it equal to `TM_NEAR_IRMAA_LINE`.
 */
const dateSavedTypedNearLineWitness: ScenarioDraft = {
  ...dateSavedTypedMovedWitness,
  drawdownPolicy: 'pre-tax-first',
  health: { ...dateSavedTypedMovedWitness.health, workingYearInvestmentByPerson: [70_000, 0] },
}

/**
 * THE ALL-STICKY RETYPE — `?seed=datesavedtypedsticky`, and as a vault `?vault=datesavedtypedsticky` (council
 * `wf_dfb7949b-4a7`'s C on a budget at 100 %, the survivor-path build's AE1; walk 8 reads its closing part): the household
 * of `datesavedrisenlater` on a $105,000 budget, all of it housing (survivor-sticky), less the out-of-pocket medical the
 * compile adds back. Its quote confirmed, "All of it" answered at year 0's own $5,985, then $90,000 typed by the year. A
 * survivor's working year then costs the whole budget, so the closing part's ceiling is the whole $15,000 gap, its costs
 * named whole: "that year’s costs still count in full: your figure of $90,000 a year and your budget’s $105,000 a year." Built here, never
 * by importing the test witness; `devSeeds.test.ts` pins it equal to `councilBudgetHousehold(1)`.
 */
const dateSavedTypedStickyWitness: ScenarioDraft = ((): ScenarioDraft => {
  const c = dateSavedRisenLaterWitness
  const housing: BudgetLineItem = {
    label: 'Housing',
    category: 'housing',
    tier: 'essentials',
    annualAmountReal: Math.round(105_000 - (c.health.oopMedicalAnnual ?? 0)),
    startYear: 0,
  }
  const confirmed = withConfirmedW({ ...c, budget: [housing] })
  return writeEnteredWorkingYearCost(withSavedLeftOver({ ...confirmed, workingYearLeftOver: undefined }), 90_000, 'year')
})()

/** The seed registry — `?seed=<key>` selects one. */
export const DEV_SEEDS = {
  retired: retiredOnTrack,
  date: withConfirmedW(stillWorking),
  borderline: retiredBorderline,
  dateborder: withConfirmedW(stillWorkingBorderline),
  offtracktypical: offTrackTypicalExtras,
  failing: retiredFailing,
  failingtypical: failingTypicalExtras,
  pafailingtypical: paFailingTypicalExtras,
  failingentered: failingEnteredExtras,
  budget: retiredBudget,
  datesplit: withConfirmedW(dateSplitSeed),
  datemixed: withConfirmedW(dateMixedSeed),
  dip: withConfirmedW(dateDipSeed),
  order: customOrderSeed,
  health: retiredHealth,
  date65: withConfirmedW(stillWorkingAllMedicare),
  surplus: surplusWitness,
  surplustypical: surplusTypicalExtras,
  // The frames-outside plan's U1: the Pennsylvania room plant and the two widest plants (B's, A's).
  pasurplustypical: paSurplusTypicalExtras,
  failingwidest: failingWidest,
  surpluswidest: surplusWidest,
  paofftrackone: paOffTrackOne,
  pabudgetone: paBudgetOne,
  paone: paOne,
  pafailingone: paFailingOne,
  surpluswidestrelief: surplusWidestRelief,
  buckets: multiBucketWitness,
  steer: noPretaxSteer,
  nc: ncAffirmation,
  pa: paAffirmation,
  patypical: paTypicalExtras,
  fl: flAffirmation,
  elsewhere: elsewhereAnswered,
  datenc: withConfirmedW(dateNcSeed),
  healthnc: healthNcSeed,
  healthgap: healthGapSeed,
  healthss: healthSsSeed,
  // The pay check (U8 Phase B, U10 the rest): every date seed carries a confirmed W minted on its OWN
  // final draft (`withConfirmedW`), so the W step opens on a fresh yes and the walk completes. `datesolo`
  // is the refusal witness, so its quote reads the DRAFT (`workingYearQuote` never builds a run) and its
  // money picture is the calm `'unknown'` face.
  datesolo: withConfirmedW(dateSoloCoverage),
  atceiling: withConfirmedW(atCeilingSeed),
  dateshort: withConfirmedW(dateShortWitness),
  datecoststale: dateCostStaleWitness,
  // Build 2 (U15, dark): short in year 0, a left over from year 4 — the case the question never asks.
  datelateleftover: withConfirmedW(dateLateLeftOverWitness),
  // Build 2 (the go-live, KTD14): "All of it" stored at the household's own year-0 figure, through the
  // shipped write — the presence witness, the moved witness and the stale-W witness. U11 adds the stale-W
  // witness's RISEN twin (the spending raised past W, so the lean and the clause ride together); (ae) adds its
  // short arm (year 0 short at the quote) and its later-short arm (a later working year short at the quote).
  datesaved: dateSavedWitness,
  datesavedmoved: dateSavedMovedWitness,
  datesavedstale: dateSavedStaleWitness,
  datesavedrisen: dateSavedRisenWitness,
  datesavedrisenshort: dateSavedRisenShortWitness,
  datesavedrisenlater: dateSavedRisenLaterWitness,
  datesavedtyped: dateSavedTypedWitness,
  datesavedfourbuckets: dateSavedFourBucketsWitness,
  datesavedtypedmoved: dateSavedTypedMovedWitness,
  // The whole-window rebuild (walk 8's added targets): the five-span household and the crowned one.
  datesavedtypedpension: dateSavedTypedPensionWitness,
  datesavedtypedcrowned: dateSavedTypedCrownedWitness,
  // The tax rider build's walk-8 twins: the near-line household (a surcharge paid at the quote alone) and C on an
  // all-sticky budget (the closing part's whole-gap form).
  datesavedtypednearline: dateSavedTypedNearLineWitness,
  datesavedtypedsticky: dateSavedTypedStickyWitness,
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
 * Returns the seed's `CurrentScenario` on success (App pre-fills the passphrase + shows the unlock screen)
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
 * engine's priced-state lower bound (`simulate.ts:1097-1100`, the 2026-07-15 ultramode fold whose
 * comment names "an aged dev plant" as the exact anticipated caller) REFUSES it — the recompute
 * demotes to the R19 calm indeterminate and no verdict renders. A priced-state stale plant rides
 * {@link doctorStateStaleVault} (savedAt-only, startCalendarYear + all vintages UNTOUCHED, ONLY the
 * state profile aged). This doctor leaves `stateTaxVintage` untouched (spread through) by design.
 * The rule is ENFORCED by the guard below (the review's fold — its light sibling fail-louds on a
 * mis-wire, so this one does too; prose alone held the asymmetry).
 */
export function doctorStaleVault(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  if (s.retirementState !== undefined && isPricedState(s.retirementState)) {
    throw new Error(
      `doctorStaleVault must never take a priced-state base (got ${s.retirementState}): its -2y ` +
        `startCalendarYear aging precedes the state's earliest rate row, and the engine's ` +
        `priced-state lower bound (simulate.ts:1097) demotes the recompute to the R19 calm ` +
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
  let staleHealthcare = undefined as CurrentScenario['healthcareVintage']
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
 * −2 (→ 2024), and the engine's priced-state lower bound (`simulate.ts:1097-1100`) REFUSES a priced-NC
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
export function doctorStateStaleVault(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  const hhState = s.retirementState
  if (s.stateTaxVintage === undefined || hhState === undefined || !isPricedState(hhState)) {
    throw new Error(
      `doctorStateStaleVault requires a priced-state base with a state-tax stamp; got ${String(hhState)} ` +
        `(a non-priced base can never fire the state-tax clock — a wiring error, never a silent no-op).`,
    )
  }
  return {
    ...s,
    // Never before the engine-pricing ledger's first unambiguous save day: this plant exists to fire the
    // state-tax clock IN ISOLATION, and a save that predates an engine-pricing row would ALSO speak the
    // ledger's method line — a calendar-dependent second note (the ledger's rows ship every few days, so
    // −150 days crosses a moving set of them).
    savedAt: Math.max(todayEpochDay - 150, FIRST_UNAMBIGUOUS_SAVE_DAY),
    stateTaxVintage: { ...s.stateTaxVintage, [stateProfileKey(hhState)]: agedStateProfile(hhState) },
  }
}

/**
 * The pay check's U13 LIGHT doctor — a W-carrying date plan as if saved under the PREVIOUS
 * working-years vintage (payroll tax and the Social Security earnings test,
 * `WORKING_YEARS_VINTAGE`). It moves ONLY two things: `savedAt` back 150 days (the
 * {@link doctorStateStaleVault} shape — never before the engine-pricing ledger's first unambiguous
 * save day, so no ledger method line speaks beside it) and `dateVintage.workingYearsVintage` one
 * vintage back ({@link agedWorkingYearsVintage}). `startCalendarYear`, `retirementState` and every
 * quote input stay untouched, so the plan's W answer stays FRESH (no re-mint) and the working-years
 * clock fires in ISOLATION. Fail-loud on a base that carries no W or no working-years stamp — such a
 * plan never reads the table, so the clock could never fire (a wiring error, never a silent no-op).
 * `?vault=wyclock` rides it, over `date` ({@link AGED_PLANTS}).
 */
export function doctorWorkingYearsStaleVault(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  const stamp = s.dateVintage?.workingYearsVintage
  if (s.workingYearCost === undefined || s.dateVintage === undefined || stamp === undefined) {
    throw new Error(
      'doctorWorkingYearsStaleVault requires a W-carrying date plan with a working-years stamp ' +
        '(a plan without W never reads the table, so the clock could never fire).',
    )
  }
  return {
    ...s,
    savedAt: Math.max(todayEpochDay - 150, FIRST_UNAMBIGUOUS_SAVE_DAY),
    dateVintage: { ...s.dateVintage, workingYearsVintage: agedWorkingYearsVintage(stamp) },
  }
}

/** One working-years vintage back: the stamp's year less one (`working-years-2026a` →
 *  `working-years-2025a`). Throws on a stamp of any other shape — a renamed stamp format must be
 *  taught here, never aged by a guess that could land on the CURRENT stamp and fire nothing. */
export function agedWorkingYearsVintage(stamp: string): string {
  const m = /^(working-years-)(\d{4})([a-z])$/.exec(stamp)
  if (m === null) throw new Error(`agedWorkingYearsVintage: unrecognised working-years stamp "${stamp}"`)
  return `${m[1]}${Number(m[2]) - 1}${m[3]}`
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
 * ≥1 on the engine's priced-state year bound (`simulate.ts:1097-1100`), which is the real constraint
 * the spec's `earliestPricedRateYear` probe was reaching for. `dip` carries no `retirementState`.
 *
 * IT AGES `birthYear` ALONGSIDE `startCalendarYear`, AND THAT IS LOAD-BEARING. `PersonInputs`
 * (`model.ts:99`) documents `currentAge === startCalendarYear − birthYear` as a model invariant, and
 * the engine reads a birth year through TWO paths that must agree: the SS sub-engine's stated
 * `p.birthYear` (FRA / DRC / deemed-filing lookups) and the tax overlay's DERIVED
 * `startCalendarYear − currentAge` (`simulate.ts:413`). Aging the build clock ALONE forks them by
 * the full depth and fabricates a household that is organically impossible — in 2020 this couple
 * would have been 51, not 57. Aging `birthYear` by the same depth restores the invariant exactly,
 * keeps `currentAge` (so the engine sees the SAME household and the crown does not move — MEASURED:
 * floor 0 / lifestyle 5 with and without the birth-year shift, byte-identical; RE-MEASURED 2026-10-30
 * once `dip` carried W (the pay check's U10), both tiers: the whole date-search output is still
 * byte-identical with and without the shift — the earnings test keys on `currentAge + t` and on a full
 * retirement age both birth years share, 67), and describes a real
 * arrived household: born 1963, planned at 57 to stop at offset 5, and that year is now behind them.
 *
 * ⚠️ THIS PLANT LIGHTS **ONE** ARRIVED ARM, NOT TWO. The floor crowns at 0, and `floorLineText`
 * (`FuckOffDate.tsx:286`) SHORT-CIRCUITS offset 0 to the plain `dateFloorCovered` line BEFORE the
 * three-way split — mirroring `heroLead`'s free-today precedence, deliberately ("covered from the
 * plan's own start ⇒ still covered now"). So `dateFloorCoveredPast` does NOT fire here; its live
 * route is and remains `?vault=datestale`, whose floor crown sits strictly inside its window. (An
 * earlier filing claimed "both arms arrived on one plant" — it was read off the crown numbers
 * without opening the renderer.)
 *
 * EXPORTED for the devSeeds battery, like its sibling doctors.
 */
export function doctorArrivedVault(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  if (s.retirementState !== undefined && isPricedState(s.retirementState)) {
    throw new Error(
      `doctorArrivedVault must never take a priced-state base (got ${s.retirementState}): its ` +
        `-${ARRIVED_PLAN_YEARS}y startCalendarYear aging precedes the state's earliest rate row, and ` +
        `the engine's priced-state lower bound (simulate.ts:1097) demotes the recompute to the R19 ` +
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
          `simulate.ts:413's derived startCalendarYear − currentAge) stay forked and nothing says so.`,
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
function recordFingerprintFor(s: CurrentScenario, todayEpochDay: number): string {
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
function withMintedRecord(s: CurrentScenario, mintedAt: number, solverCodeVersion: number, todayEpochDay: number): CurrentScenario {
  const goaled: CurrentScenario = { ...s, chosenGoal: RECORD_GOAL }
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
export function doctorRecordHolds(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
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
 * The era stays FRESH — deliberately. Ageing it here would fire `rules-changed` too, but only by
 * hand-doctoring the stamp snapshot over a save whose own stamps are fresh, a record no build could
 * write, and the two causes above are both produced by real producers. The ONE honest exception is
 * {@link doctorYearlyReturnRecord}: there the scenario's own stamps are aged first, and the era is set
 * to exactly those stamps, the snapshot a build that wrote them would have minted beside them, so the
 * record and its plan agree on the rules they were priced under.
 *
 * Minted ~400 days back, so this plant is ALSO the live route to the card's `Saved in <year>` slot.
 */
export function doctorRecordSuperseded(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  const withRecord = withMintedRecord(s, todayEpochDay - RECORD_AGED_DAYS, SOLVER_CODE_VERSION + 1, todayEpochDay)
  const edited: CurrentScenario = { ...withRecord, annualSpendingReal: withRecord.annualSpendingReal + RECORD_SPEND_EDIT }
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

// ── THE YEARLY RETURN (the one-frame composites plan's U3, KTD3 + KTD4) ─────────────────────────
//
// The face every real household meets from the first New Year after it saves: a plan built and saved
// in one calendar year, opened in the next, under rulebooks that have since moved. The gate's calendar
// (above) pins the page clock, so a yearly return is a PLANT viewed a calendar year after its save
// (`AgedPlant.viewDay` = `RETURN_DAY`), never a start-year doctor: moving `startCalendarYear` back
// forks the derived birth year (the `stale` plant's measured RMD fork) and puts a priced state before
// its first rate row (the engine refuses it, insight 085).

/** How far back a yearly return's save sits before the day it is viewed, before the floor below binds.
 *  400, `RECORD_AGED_DAYS`' rationale: 365 stays inside one calendar year when the view day is a leap
 *  year's 31 December. At `RETURN_DAY` the floor binds, so the save lands on `GATE_DAY` itself. */
const YEARLY_RETURN_GAP_DAYS = 400

/**
 * A YEARLY RETURN: the save one calendar year behind the day it is viewed, under the previous year's
 * federal tax and Medicare rulebooks. It moves exactly three things and nothing else:
 *
 *  · `savedAt` → `max(today − 400, FIRST_UNAMBIGUOUS_SAVE_DAY)`, the `statestale` floor, so no
 *    engine-pricing method line can speak beside the two clocks (a save before a ledger row would add a
 *    calendar-dependent third note);
 *  · `taxVintageDetail.taxYear` − 1, keeping its `legalBasis` (the bracket year moved, the law did not);
 *  · `healthcareVintage.coverageYear` − 1 and `partBStandardMonthly` − 10 (the `doctorStaleVault`
 *    idiom by year arithmetic, never a fixed date, so the clocks fire against whatever the live stamps
 *    become).
 *
 * It keeps `startCalendarYear`, every answer and every other stamp. In particular it does NOT strip the
 * Medicare-extras answer or its vintage, as {@link doctorStaleVault} does for a save from before the
 * extras question existed: a yearly return is a save from after it, so the gate speaks exactly the tax
 * and Medicare lines and no extras re-confirm (derived in `devSeeds.test.ts`, never typed).
 *
 * WHAT IT SHOWS. Viewed at `RETURN_DAY` (the gate's pin): a plan built in `SEED_BUILD_YEAR`, saved on
 * `GATE_DAY` and opened a year later, with the aged band, the aged-balances clause and the staleness
 * echo. The elapsed line speaks too ("about a year ago": 365 days, the line's floor). Viewed by hand on a
 * real date before `GATE_DAY` + 400 days, the floor still binds: the save lands on `GATE_DAY`, so it
 * reads as a recent save in the same year, with the same two clocks firing and no aged band.
 *
 * WHAT IS NOT ORGANIC, said out loud (the blind readers' owner 4): no build of `GATE_DAY` stamped the
 * previous year's rulebooks. A real save from that day, opened a year on, compares the SAME saved stamps
 * against a newer build's: the honest part is the RELATION, the saved stamps one year behind the live
 * ones, which is all the staleness clocks read. Nothing on the frame prints a stamp's year (the stamps
 * reach only the clocks' comparisons), so no face says "2025". A real record from that day would likely
 * also read `solver-changed` a year on; see {@link doctorYearlyReturnRecord}.
 *
 * FAIL LOUD on a base without a tax or healthcare stamp: it could not fire the clocks it exists to fire
 * (a wiring error, never a silent no-op). Every spine seed carries both, since `scenarioFromDraft` stamps
 * them at every save. `?vault=yearpa` and `?vault=yearfailing` ride it ({@link AGED_PLANTS}).
 */
export function doctorYearlyReturn(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  const { taxVintageDetail, healthcareVintage } = s
  if (taxVintageDetail === undefined || healthcareVintage === undefined) {
    throw new Error(
      'doctorYearlyReturn requires a base with both a tax and a healthcare stamp: without them the tax ' +
        'and Medicare clocks it exists to fire can never fire (a wiring error, never a silent no-op).',
    )
  }
  return {
    ...s,
    savedAt: Math.max(todayEpochDay - YEARLY_RETURN_GAP_DAYS, FIRST_UNAMBIGUOUS_SAVE_DAY),
    taxVintageDetail: { ...taxVintageDetail, taxYear: taxVintageDetail.taxYear - 1 },
    healthcareVintage: {
      ...healthcareVintage,
      coverageYear: healthcareVintage.coverageYear - 1,
      partBStandardMonthly: healthcareVintage.partBStandardMonthly - 10,
    },
  }
}

/** The five era-bearing fields of a scenario, as a record's era must carry them: all five present
 *  (`SavedRecommendationEraV3`'s docblock says why the scenario's absent-is-quiet contract does not
 *  transplant to a record, insight 102). Throws rather than `!`-asserting: an era short one stamp pins
 *  that rulebook's clock quiet forever. The `eraOf(s)` idiom (`savedRecommendation.test.ts`). */
function eraOfScenario(s: CurrentScenario): SavedRecommendationEraV3 {
  const { taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage } = s
  if (
    taxVintageDetail === undefined ||
    stateTaxVintage === undefined ||
    healthcareVintage === undefined ||
    dateVintage === undefined
  ) {
    throw new Error('eraOfScenario: scenarioFromDraft stamps all four vintages at every save — this base is not a real save')
  }
  return { appDefaultVersion: s.appDefaultVersion, taxVintageDetail, stateTaxVintage, healthcareVintage, dateVintage }
}

/**
 * A YEARLY RETURN WITH A SAVED RECOMMENDATION (the composites plan's KTD4): {@link doctorYearlyReturn},
 * then a record minted on the doctored save day at this build's solver version, its `era` set to the
 * aged scenario's own five stamps, the snapshot a build that wrote those stamps would have minted beside
 * them. The household's inputs are untouched, so its fingerprint matches; its version is this build's;
 * so the one cause is the rulebooks: the card reads "no longer holds" for `rules-changed` alone.
 *
 * THE ONE HONEST HAND ON THE ERA ({@link doctorRecordSuperseded}'s docblock names it). The mint reads the
 * era off this build's live constants, which is right for a real gesture and would make this record's
 * era FRESH beside an aged plan, a pair no build writes. Setting the era to the plan's own aged stamps
 * makes the record and its plan agree, which is what any real save of a recommendation produces.
 *
 * Owner 4's residual, named: a real record saved in `SEED_BUILD_YEAR` and opened a year on would likely
 * ALSO read `solver-changed`, if the ranking code moved in between. This plant holds the solver version
 * so the cause list is one clause. The standing line sits above the cause list, so the count moves no
 * line the one-frame law protects.
 *
 * PROVEN AT PLANT TIME, never assumed (the {@link doctorRecordSuperseded} law): it derives the status
 * through the real trichotomy (`deriveSavedRecommendationStatus`, the hydrated draft's own exposure and
 * fingerprint) and THROWS unless the causes are exactly `['rules-changed']`, and it re-runs the codec's
 * record validator over the re-dressed record. `?vault=yearrec` and `?vault=yearparec` ride it.
 */
export function doctorYearlyReturnRecord(s: CurrentScenario, todayEpochDay: number): CurrentScenario {
  const aged = doctorYearlyReturn(s, todayEpochDay)
  const savedAt = aged.savedAt
  if (savedAt === undefined) throw new Error('doctorYearlyReturnRecord: the yearly return stamped no save day')
  const minted = withMintedRecord(aged, savedAt, SOLVER_CODE_VERSION, todayEpochDay)
  const fresh = minted.savedRecommendation
  if (fresh === undefined) throw new Error('doctorYearlyReturnRecord: the mint put no record on the plan')
  const record: SavedRecommendationV3 = { ...fresh, era: eraOfScenario(aged) }
  const valid = validateSavedRecommendation(record)
  if (!valid.ok) throw new Error(`doctorYearlyReturnRecord: the codec refuses the re-dressed record: ${valid.detail}`)
  const planted: CurrentScenario = { ...minted, savedRecommendation: record }
  const hydrated = draftFromScenario(planted)
  if (!hydrated.ok) throw new Error(`doctorYearlyReturnRecord: the planted plan does not hydrate: ${hydrated.detail}`)
  const status = deriveSavedRecommendationStatus({
    record,
    scenario: planted,
    freshFingerprint: recordFingerprintFor(planted, todayEpochDay),
    todayEpochDay,
    exposure: exposureForDraft(hydrated.draft),
  })
  if (status.causes.length !== 1 || status.causes[0] !== 'rules-changed') {
    throw new Error(
      `doctorYearlyReturnRecord: the record's causes are [${status.causes.join(', ')}], not exactly ` +
        `[rules-changed]. This plant exists to show the one-cause card a yearly return produces; a ` +
        `second cause, or none, means a doctor or a producer moved. Diagnose it, never loosen this.`,
    )
  }
  return planted
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
 *  the three-way split at `FuckOffDate.tsx:286`). The base must be STATELESS: `datenc` rejects at
 *  any depth ≥1 with "startCalendarYear precedes the priced state rate schedule"
 *  (`simulate.ts:1097-1100`), which is the real bound the S6 spec's `earliestPricedRateYear` probe
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
 *  engine's priced-state year bound). Both doctors share the `(CurrentScenario, todayEpochDay) → CurrentScenario`
 *  shape, so the dispatch is uniform. */
export interface AgedPlant {
  readonly base: DevSeedKey
  readonly doctor: (s: CurrentScenario, todayEpochDay: number) => CurrentScenario
  /** The day every harness views this plant on (the gate's calendar, above): a local-calendar
   *  epoch-day the page clock is pinned to before navigating. Absent means `GATE_DAY`. A yearly
   *  return declares `RETURN_DAY`. Declared HERE, once, so the fit arms and the Caddie walk can never
   *  view one plant on two different days; a harness reads it through `reviewSurface.ts`'s pin, never
   *  re-typing a day per arm. */
  readonly viewDay?: number
}

/** EXPORTED for the devSeeds battery (like the doctors): the pay check's U10 sweep builds EVERY plant
 *  through its own doctor and reads the one W-stale predicate on it — a list re-typed in the test would
 *  drift from this one the day a plant is added. */
export const AGED_PLANTS: Readonly<Partial<Record<string, AgedPlant>>> = {
  stale: { base: 'retired', doctor: doctorStaleVault },
  datestale: { base: 'datesplit', doctor: doctorStaleVault },
  // `statestale` = the NC-priced spine household (`nc`) doctored stale THIS SAME YEAR via the LIGHT
  // doctor (F2 supersession 2026-07-16). Base MUST be a PRICED-state household (NC): the
  // `controls.stateTaxMoved` clock is route-gated to the household's own priced state, so a stateless
  // base could never fire it; NC not FL because FL's constitutional $0 never stales. The full
  // doctorStaleVault's −2y aging (→ 2024) would trip the engine's priced-state year bound
  // (simulate.ts:1097) → R19 indeterminate, so this plant rides `doctorStateStaleVault` (savedAt-only,
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
  // The pay check's U10 — `wyclock`: `date` (W confirmed at its own $84,000 quote) saved under the
  // PREVIOUS working-years vintage through the LIGHT doctor, so the working-years clock fires in
  // ISOLATION on the unlock gate (`stalenessWorkingYears` alone — the `statestale` precedent). `date`
  // because it is the flagship date household and stateless: no state clock can join, and its
  // contribution and blend stamps stay fresh (the doctor touches neither). The doctor moves no engine
  // input, so the affirm lands `?seed=date`'s own reading.
  wyclock: { base: 'date', doctor: doctorWorkingYearsStaleVault },
  // The one-frame composites plan's U3 — the tallest real frames the gate measures (the register's Tier 0
  // *The tallest real composites break the one-frame law…*). The yearly returns declare `RETURN_DAY`, so
  // every harness pins the page clock a calendar year after their save, the face a real household meets
  // from its first New Year after saving; `recpa` declares none and is viewed on `GATE_DAY`.
  //  · `yearpa`: Pennsylvania answering "not sure" on Medicare extras, at its yearly return (the R13
  //    caveat's tallest measured frame on a borderline household).
  //  · `yearfailing`: the already-failing household answering "not sure", at its yearly return.
  //  · `yearrec`: the entered-extras spine household at its yearly return with a saved recommendation
  //    (his likeliest return: one cause on the card, `rules-changed`).
  //  · `recpa`: Pennsylvania "not sure" with a saved recommendation that holds, fresh.
  //  · `yearparec`: Pennsylvania "not sure" at its yearly return with a saved recommendation.
  yearpa: { base: 'patypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearfailing: { base: 'failingtypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearrec: { base: 'retired', doctor: doctorYearlyReturnRecord, viewDay: RETURN_DAY },
  recpa: { base: 'patypical', doctor: doctorRecordHolds },
  yearparec: { base: 'patypical', doctor: doctorYearlyReturnRecord, viewDay: RETURN_DAY },
  // The rung-3 key council's plants (`wf_540221e4-42d`), each a yearly return over its base (above):
  //  · `yearsurplus`: the reassuring ROOM frame ("More than covered", "not sure"), a year on (FIRST in the ruling).
  //  · `yearofftrack`: the off-track TRIM frame ("not sure"), a year on.
  //  · `yearpafailing`: Pennsylvania's already-failing household ("not sure"), a year on.
  //  · `yearfailingentered`: the already-failing household with ENTERED extras, a year on (no typical residual).
  yearsurplus: { base: 'surplustypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearofftrack: { base: 'offtracktypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearpafailing: { base: 'pafailingtypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearfailingentered: { base: 'failingentered', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  // Round 2 of the frames-outside build's review: the derived members the seat council needs read before it sits (the
  // register's composites entry, prescription (4)), each a yearly return over its base (above):
  //  · `yearpaofftrackone`: the off-track class at its widest closed-axis members, a year on (derived about 764.1).
  //  · `yearsurpluswidest`: A's widest a year on, class C at its widest (derived about 802.4).
  //  · `yearfailingwidest`: B's widest a year on, the relief face with the echo (never derived).
  //  · `yearpasurplus`: the Pennsylvania room frame a year on (derived about 781.6; the first ruling's (3) ordered it).
  yearpaofftrackone: { base: 'paofftrackone', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearsurpluswidest: { base: 'surpluswidest', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearfailingwidest: { base: 'failingwidest', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearpasurplus: { base: 'pasurplustypical', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  // b9-1: the review's remaining derived members a year on (the bases' docblocks above carry each reading):
  //  · `yearpaone`: `yearpa` with the one-person name (derived about 746.6; its base reads "On track", not "On the line").
  //  · `yearparecone`: `yearparec` with it (derived about 746.6, its record card's standing line about 808.6).
  //  · `yearpafailingone`: `yearpafailing` with it (derived about 743.3 on Windows, 764.1 on CI's ubuntu).
  yearpaone: { base: 'paone', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  yearparecone: { base: 'paone', doctor: doctorYearlyReturnRecord, viewDay: RETURN_DAY },
  yearpafailingone: { base: 'pafailingone', doctor: doctorYearlyReturn, viewDay: RETURN_DAY },
  // The record card's seat plan's U11 (KTD11) — `recbudget`: the household the recommendation exists for, `budget`'s
  // itemized couple with a saved recommendation that still holds, fresh (the `recpa` shape, viewed on `GATE_DAY`). Every
  // other record plant sits on a household with no budget, so no frame showed the relief line, the survivor fold behind
  // it and the record card together; this one does. Its first readings are the seat plan's variant describe's.
  recbudget: { base: 'budget', doctor: doctorRecordHolds },
}

async function runPlantDevVault(key: string): Promise<PlantResult> {
  const aged = Object.hasOwn(AGED_PLANTS, key) ? AGED_PLANTS[key] : undefined
  const draft = resolveDevSeed(aged?.base ?? key)
  if (draft === null) return 'unknown-seed'
  const built = scenarioFromDraft(draft)
  if (!built.ready) return 'not-ready'
  // A plant is a save by THIS build: `scenarioFromDraft` stamps `savedAt` off the wall clock, which on an
  // engine-pricing ship day IS the ledger's deliberately ambiguous day — the plant would speak the
  // nameless method line on exactly the day a row ships (CI runs that day) and not the next. Stamp it
  // at the first unambiguous day instead; a doctor that AGES the save overrides it (and owns what its
  // older save crosses — `src/engine/pricingVersion.ts`).
  const thisBuildSave: CurrentScenario = {
    ...built.scenario,
    savedAt: Math.max(built.scenario.savedAt ?? FIRST_UNAMBIGUOUS_SAVE_DAY, FIRST_UNAMBIGUOUS_SAVE_DAY),
  }
  // The LOCAL-calendar chain, never a raw UTC epoch-day (the U13 basis catch — a second
  // ad-hoc clock read is exactly the class the 2026-07-09 ultramode unified away; DEV-only
  // here, but the plant feeds cold-reads and its elapsed line must agree with the app's).
  const scenario = aged !== undefined ? aged.doctor(thisBuildSave, currentEpochDay()) : thisBuildSave
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
