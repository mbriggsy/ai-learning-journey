/**
 * The typed-below line's witness households (a test HELPER — no `.test.` in the name): the whole-window rebuild's
 * witness table (`docs/plans/features/typed-below-whole-window-rebuild-spec.md`, High-Level Technical Design), each
 * built through the intake's own writes from the dev seeds. Every per-year engine figure the tests type by hand is in
 * the plan's research record (`~/.claude/projects/C--Users-brigg-ai-learning-journey-projects-the-back-nine/
 * b9-build2-surplus/u11-wholewindow/research/witnesses.md`; the four households it had no table for — B retyped's later
 * years, the even year, the whole household and the crowned one — in `research/wit/u3-probe.out.txt` and
 * `research/wit/u3-crown.out.txt` beside it, each printed by the shipped producer and U2's credit rule).
 *
 * Read by `workingYearLeftOver.test.ts` (the spans) and `src/engine/__tests__/workingYearCredit.test.ts` (the read
 * against the overlay's own credits). The pension and crowned households are the builders commit 3's dev seeds
 * (`datesavedtypedpension`, `datesavedtypedcrowned`) are pinned equal to (U5).
 */
import type { BudgetLineItem } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '@ui/devSeeds'
import { workingYearLeftOverLive } from '../intakeMap'
import { writeWorkingYearLeftOver } from '../workingYearLeftOver'
import { workingYearQuote, writeConfirmedWorkingYearCost, writeEnteredWorkingYearCost } from '../workingYearQuote'

type Stream = NonNullable<ScenarioDraft['incomeStreams']>[number]

/** A figure typed through the W step's own write (`writeEnteredWorkingYearCost`: the state reading re-stamped, so a
 *  household moved to another state reads fresh). */
const typedAt = (d: ScenarioDraft, amountReal: number, entryPeriod: 'year' | 'month' = 'year'): ScenarioDraft =>
  writeEnteredWorkingYearCost(d, amountReal, entryPeriod)

/** "All of it" answered at the money picture's own year-0 figure, through the question's own write (the seeds'
 *  `withSavedLeftOver`). */
function savedAtLive(d: ScenarioDraft): ScenarioDraft {
  const live = workingYearLeftOverLive(d)
  if (live === null || live < 1) throw new Error('[test setup] the witness has no year-0 left over to answer under')
  const saved = writeWorkingYearLeftOver(d, 'saved', live)
  if (saved.workingYearLeftOver?.kind !== 'saved') throw new Error('[test setup] the write stored no "saved" answer')
  return saved
}

/** Sam's $9,000 pension at 64 and 65 (the round review's RF-B B2): it lifts 2030 and 2031 above $0 at $105,000, so the
 *  short years split into two runs, 2029 and 2032. */
const SAM_PENSION_64_65: Stream = {
  ownerIndex: 1,
  type: 'pension',
  annualRealToday: 9_000,
  startAge: 64,
  endAge: 65,
  colaMode: 'real-flat',
  survivorPct: 0,
}

/** THE PENSION HOUSEHOLD (the plan's five-span witness): `datesavedrisenlater` plus Sam's pension at 64–65, typed at
 *  $84,000 by the year. The stored $16,985 sits below year 0's $26,985 there, so it reads "saved, moved", as TM does. */
export function typedBelowPensionHousehold(): ScenarioDraft {
  const c = DEV_SEEDS.datesavedrisenlater
  return typedAt({ ...c, incomeStreams: [...(c.incomeStreams ?? []), SAM_PENSION_64_65] }, 84_000)
}

/** Alex's 401(k) in the crowned household (the probe that picked it: `research/wit/u3-crown.out.txt`). */
export const CROWNED_401K = 1_600_000

/** THE CROWNED HOUSEHOLD (the plan's Assumptions): TM's household (`datesavedtypedmoved`) with Alex's 401(k) raised to
 *  {@link CROWNED_401K}, so the date route crowns a stop inside the window, before the 2033–2035 span. Savings never
 *  enter a working year's cash (no deposit moves, and the accounts' yield never reaches a year's tax base), so both
 *  pictures, and so the spans, are TM's to the dollar. */
export function typedBelowCrownedHousehold(): ScenarioDraft {
  const tm = DEV_SEEDS.datesavedtypedmoved
  const [first, ...rest] = tm.enteredAccounts
  if (first === undefined || first.kind !== '401k') throw new Error('[test setup] TM’s first account is Alex’s 401(k)')
  return { ...tm, enteredAccounts: [{ ...first, valueToday: CROWNED_401K }, ...rest] }
}

/** Sam's $10,000 a year of alimony held flat in DOLLARS (the round review's RF-A drift construction): it shrinks in real
 *  terms every year, so the years the picture does not list print figures of their own. */
const SAM_ALIMONY_NOMINAL: Stream = {
  ownerIndex: 1,
  type: 'alimony',
  executedAfter2018: true,
  annualRealToday: 10_000,
  startAge: 50,
  endAge: 90,
  colaMode: 'nominal-flat',
  survivorPct: 0,
}

/** Every witness the plan's table names, in its order. */
export const TYPED_BELOW_WITNESSES = {
  /** A (`datesavedtyped`): $84,000 typed under $90,000 of spending, stored $16,985. */
  a: DEV_SEEDS.datesavedtyped,
  /** PA: A's household moved to Pennsylvania and typed again (its W reads `class-based`, fresh). */
  pa: typedAt({ ...DEV_SEEDS.datesavedrisen, retirementState: 'PA' }, 84_000),
  /** TM (`datesavedtypedmoved`): $84,000 typed under $105,000, stored $16,985, year 0 $26,985 (moved). */
  tm: DEV_SEEDS.datesavedtypedmoved,
  /** TM at $95,000 of spending: the tie rule's witness. */
  tm95: { ...DEV_SEEDS.datesavedtypedmoved, annualSpendingReal: 95_000 },
  /** The drift household, saved at its own year-0 figure ($26,985), as the research record's table holds it. */
  drift: savedAtLive(typedAt({ ...DEV_SEEDS.datesavedrisen, incomeStreams: [SAM_ALIMONY_NOMINAL] }, 84_000)),
  pension: typedBelowPensionHousehold(),
  /** C at $110,985 of spending: year 0 at the quote is exactly $0, so the answer there credits nothing. */
  c110985: typedAt({ ...DEV_SEEDS.datesavedrisenlater, annualSpendingReal: 110_985 }, 84_000),
  /** B retyped (`datesavedrisenshort` at $84,000): year 0 short at the quote. */
  bRetyped: typedAt(DEV_SEEDS.datesavedrisenshort, 84_000),
  /** C typed at $101,000: the straddle (two short years still short at the typed figure, two left over). */
  c101000: typedAt(DEV_SEEDS.datesavedrisenlater, 101_000),
  /** C typed at $100,985: the 2029–2030 short years print exactly $0 at the typed figure. */
  c100985: typedAt(DEV_SEEDS.datesavedrisenlater, 100_985),
  /** THE WHOLE HOUSEHOLD: `datesavedrisen` (A's household, $90,000) with `datesavedrisenlater`'s alimony, which ends at
   *  62, typed at $84,000. Year 0 at the quote ($20,985) is above the stored $16,985, so the stored figure caps both
   *  answers until the alimony ends, and the lean starts in 2029 with no short year anywhere. */
  whole: typedAt({ ...DEV_SEEDS.datesavedrisen, incomeStreams: DEV_SEEDS.datesavedrisenlater.incomeStreams }, 84_000),
  /** C at $8,749.99 a month: twelve cents a year under the quote, every print the same at both figures. */
  cMonth874999: typedAt(DEV_SEEDS.datesavedrisenlater, 8_749.99 * 12, 'month'),
  /** C at $7,916.67 a month ($95,000.04 a year): the gap $9,999.96. */
  cMonth791667: typedAt(DEV_SEEDS.datesavedrisenlater, 7_916.67 * 12, 'month'),
  /** `?seed=date` with $6,000 a month typed under its $84,000 of spending (the fit gate's coordinate-tap draft). */
  date6000Month: typedAt(DEV_SEEDS.datesaved, 6_000 * 12, 'month'),
  crowned: typedBelowCrownedHousehold(),
} as const satisfies Readonly<Record<string, ScenarioDraft>>

export type TypedBelowWitness = keyof typeof TYPED_BELOW_WITNESSES

// ── THE SURVIVOR-PATH BUILD'S HOUSEHOLDS (`docs/plans/features/typed-below-survivor-path-build-spec.md`, U1). Named exports,
//    never members of TYPED_BELOW_WITNESSES (its sweeps assume a gate-on household with six readings). Every one descends
//    from `stillWorking` (Alex 58, working; Sam 60, retired at 58), through the dev seeds. ──

/** A budget of `total` a year in two essentials lines, `stickyFraction` of it housing (survivor-sticky) and the rest
 *  food (not): the council probes' construction (`council-survivor\clerk-death-allkinds.mts`, `budgetOf`). */
function councilBudget(total: number, stickyFraction: number): BudgetLineItem[] {
  const housing = Math.round(total * stickyFraction)
  return [
    // Each line carries the dev seeds' literal id for its category (schema version 6), so `datesavedtypedsticky` stays
    // equal to `councilBudgetHousehold(1)`.
    ...(stickyFraction > 0 ? [{ id: 'line-housing', label: 'Housing', category: 'housing', tier: 'essentials', annualAmountReal: housing, startYear: 0 } as const] : []),
    ...(stickyFraction < 1 ? [{ id: 'line-food', label: 'Food', category: 'food', tier: 'essentials', annualAmountReal: total - housing, startYear: 0 } as const] : []),
  ]
}

/** THE COUNCIL'S C ON A BUDGET (council `wf_dfb7949b-4a7`; round 2's finding #1): `datesavedrisenlater`'s household on a
 *  $105,000 budget (less its out-of-pocket medical, which the compile injects), `stickyFraction` of it survivor-sticky;
 *  the quote confirmed, "All of it" answered at the picture's live figure, then `typed` entered by the year, the council
 *  probes' own construction. At 100 % the held part covers the quote, so X is the whole gap. */
export function councilBudgetHousehold(stickyFraction: 1 | 0.9 | 0.8, typed: number = 90_000): ScenarioDraft {
  const c = DEV_SEEDS.datesavedrisenlater
  const budgeted: ScenarioDraft = { ...c, budget: councilBudget(105_000 - (c.health.oopMedicalAnnual ?? 0), stickyFraction) }
  const confirmed = writeConfirmedWorkingYearCost(budgeted)
  return typedAt(savedAtLive({ ...confirmed, workingYearLeftOver: undefined }), typed)
}

/** A household recast as an all-sticky budget at its own quote (the council probes' `seedbudget:<name>:1`): the stored
 *  answer and the typed figure kept, the quote's source now the budget. */
function asAllStickyBudget(d: ScenarioDraft): ScenarioDraft {
  const quote = workingYearQuote(d).annualReal
  return { ...d, budget: councilBudget(quote - (d.health.oopMedicalAnnual ?? 0), 1) }
}

/** TM and the pension household recast as all-sticky budgets ($105,000, typed $84,000: X is the whole $21,000 gap). */
export const TM_ALL_STICKY_BUDGET: ScenarioDraft = asAllStickyBudget(TYPED_BELOW_WITNESSES.tm)
export const PENSION_ALL_STICKY_BUDGET: ScenarioDraft = asAllStickyBudget(TYPED_BELOW_WITNESSES.pension)

/** A's household (`datesavedtyped`) with Sam at `age`, retired at it (a retired person's `retirementAge` at or below their
 *  age: left at 58, a Sam of 55–57 would read as still working and open the gate through Alex), `birthYear` kept with the
 *  age. The stored answer is kept; the run carries it in either saved state. */
function aWithSamAt(age: number): ScenarioDraft {
  const a = TYPED_BELOW_WITNESSES.a
  const [alex, sam] = a.people
  return { ...a, people: [alex, { ...sam, currentAge: age, birthYear: a.startCalendarYear! - age, retirementAge: age }] }
}

/** The gate's witnesses (KTD3): which households the engine can draw a working year with one of them dead. */
export const SURVIVOR_GATE_WITNESSES = {
  /** Sam 56: he can die no earlier than 66, past the window's last working year (2035): the gate is off. */
  sam56: aWithSamAt(56),
  /** Sam 57: 66 in 2035, the window's last working year: the gate is on in 2035 only. */
  sam57: aWithSamAt(57),
  /** The younger non-worker: Alex 62 works (she can die from 66, 2030), Sam 55 is retired and cannot die inside the window.
   *  A year where the only worker has died is no working year, so the gate is off. */
  youngerNonWorker: ((): ScenarioDraft => {
    const s = aWithSamAt(55)
    const [alex, sam] = s.people
    return { ...s, people: [{ ...alex, currentAge: 62, birthYear: s.startCalendarYear! - 62 }, sam] }
  })(),
  /** Both working, Alex 58 and Sam 60: either death leaves a living worker, so the gate loops over ordered pairs. */
  bothWorking: ((): ScenarioDraft => {
    const a = TYPED_BELOW_WITNESSES.a
    const [alex, sam] = a.people
    const working: ScenarioDraft = { ...a, people: [alex, { ...sam, workStatus: 'working', retirementAge: undefined, earnedIncomeReal: 40_000 }] }
    return working
  })(),
} as const satisfies Readonly<Record<string, ScenarioDraft>>

// ── THE TAX RIDER BUILD'S HOUSEHOLD (`docs/plans/features/typed-below-tax-rider-build-spec.md`, U1 step 4). A named export,
//    never a member of TYPED_BELOW_WITNESSES. ──

/** Alex's working-year investment income in the near-line household (the probe that picked it:
 *  `b9-build2-surplus/u11-wholewindow/rider-u1/near-line-probe.mts`, its `scan2.out.txt`). */
export const NEAR_LINE_INVESTMENT = 70_000

/** THE NEAR-LINE HOUSEHOLD: TM (`datesavedtypedmoved`) under `pre-tax-first`, with Alex's working-year investment income
 *  raised to {@link NEAR_LINE_INVESTMENT}. Medicare reads that figure as working-year income (`buildDateInput`), and the
 *  pay check charges its tax, so every year through 2032 is short at the quote, year 0 among them (the run at the quote
 *  carries no answer: the read's R5 gate). In 2029–2032 the typed answer's recorded Medicare income sits under the first
 *  joint line that year is compared with and the quote's over it, so Sam, enrolled from 2031, pays the first surcharge at
 *  the quote alone in 2031–2034. Each short year's whole draw at the quote comes from the 401(k), so those figures do
 *  not depend on the path while it lasts. */
export const TM_NEAR_IRMAA_LINE: ScenarioDraft = {
  ...TYPED_BELOW_WITNESSES.tm,
  drawdownPolicy: 'pre-tax-first',
  health: { ...TYPED_BELOW_WITNESSES.tm.health, workingYearInvestmentByPerson: [NEAR_LINE_INVESTMENT, 0] },
}

/** Sam's HSA in the near-line household's HSA twin (the probe: `rider-u1/hsa-probe.mts`, its `hsa.out.txt`): enough to pay
 *  his Medicare base and surcharge through the window's last working year. */
export const NEAR_LINE_HSA = 20_000

/** THE NEAR-LINE HOUSEHOLD WITH AN HSA (the council `wf_33aa98fe-a26`'s blocking run, the tax rider build's U1b): the
 *  near-line household plus an HSA owned by Sam, which pays his Medicare premiums outside the gross-up. At the quote it pays
 *  the surcharge too, so the two answers' `fundingNet`s differ by the shortfall difference alone while their Medicare
 *  differs by the surcharge: what each answer takes from savings is the gross draw plus the HSA's spend. */
export const TM_NEAR_IRMAA_LINE_HSA: ScenarioDraft = {
  ...TM_NEAR_IRMAA_LINE,
  enteredAccounts: [...TM_NEAR_IRMAA_LINE.enteredAccounts, { ownerIndex: 1, kind: 'hsa', ticker: 'VTI', valueToday: NEAR_LINE_HSA }],
}
