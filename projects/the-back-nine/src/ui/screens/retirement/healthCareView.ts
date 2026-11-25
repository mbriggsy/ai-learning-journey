/**
 * src/ui/screens/retirement/healthCareView.ts: Retirement → Health Care, the pure composers (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC10; ref 2.15 corrected by critique 9;
 * `rc-analysis/health-care-cost-analysis__cleanshot-2026-09-22-at-11-35-47-2x.png` and `…-2026-09-21-at-17-07-22-2x.png`).
 *
 * NO STACKED TOTAL. The readout gives one median per part per year (`HealthReadoutYear`), and a sum of medians is not
 * the median of totals; the surcharge's median is $0 in any year fewer than half the futures pay it, so a stack would
 * hide exactly the years its risk is live. Each part is its own small chart, the four on ONE dollar scale and one age
 * axis (small multiples, as RightCapital's summary is), each legend saying "middle cost each year". The lifetime figure
 * beside them is the median of each future's OWN lifetime sum (`TaxAwareDistribution`'s per-path pair, summed per path
 * before the median), never a sum of yearly medians.
 *
 * THE SHIPPED SHEET'S TWO QUOTING GATES HOLD. Only `quotableYears` draw (the living cohort at or above
 * `COHORT_FADE.full`; a median over few living futures is noise), so a later year draws nothing. And only while the
 * futures whose money still pays for the year are at the same bar (`chartableYears`): the readout's medians are over
 * those futures alone, and a median over none is $0, so a plan running out of money would chart a calm $0. The marketplace cliff
 * share is a share of the futures that BUY marketplace cover that year (`HealthReadoutYear.overCliffFraction`): it
 * prints only over a year where at least half the futures buy it (`acaPricedFraction >= 0.5`, the sheet's own gate),
 * through the sheet's count rule (`Math.round(·10)`, nothing under 1, the "more than 9 in 10" ceiling; insight 089: an
 * adverse count, never good-news words), and its key line names the base. Consecutive years with the same count share
 * one bracket and one label, so a run of years reads as one stretch.
 *
 * THE CLOCK (insight 134). Readout row k is the END of sim-year k−1, and its premiums are a flow paid during it: row k
 * sits at calendar start + k − 1, at each person's current age + k − 1, as `healthSheetChrome.ts` dates its figures. A
 * ledger row t is sim-year t itself.
 *
 * EVERY SENTENCE THE SHEET ALREADY WORDS COMES FROM ITS COMPOSERS (`composeHealthSheet`, `composeMedicareExtrasLines`,
 * `composeMedicareExtrasTypicalNote`; the Medicare residual from `composeVerdictMedicareResidual`). The readout is the
 * household's together, never per person (insight 132: who is enrolled is the engine's decision on the wire, never an
 * age read here), so the chart title says "the two of you together".
 *
 * THE WORKING ROUTE has no readout (the date route emits none): the same four charts from the steady market's ledger
 * `premiums`, every title naming that one future, and one stopgap line (plan section 6: the working household's
 * readings at its date). No cliff share prints there: one path has no share.
 */
import { isDepleted, type DepletionYear, type HealthReadout, type HealthReadoutYear, type LedgerYearRow, type TaxAwareDistribution } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import { COHORT_FADE } from '@viz/cohort'
import { healthcarePriced, medicareExtrasDisclosureView, pricedStateForRun } from '@intake/intakeMap'
import type { WhatIfLeverKind } from '@shared/model'
import { copy, slots } from '../../copy'
import { composeHealthSheet, composeMedicareExtrasLines, composeMedicareExtrasTypicalNote, quotableYears, type HealthFact } from '../../healthSheetChrome'
import { composeControlHealthOmissionsNote, composeVerdictMedicareResidual } from '../../stateTaxDisclosure'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import { lifetimeHealthMedianReal, medianOf } from '../../workbench/whatIfRun'
import { tablePerson, type TableMeta } from '../../workbench/tableRun'
import type { CardView, DrawerTarget } from '../profile/profileView'
import { lifespansLine } from '../../workbench/yearTableChrome'
import type { RunRows } from './cashFlowsView'
import { lastIndexOf } from './socialSecurityView'

// ── The parts ───────────────────────────────────────────────────────────────────────────────────────────────────

export type HealthPart = 'aca' | 'medicare' | 'irmaa' | 'extras'

/** The four parts, in the order they draw (the years before Medicare first, then Medicare's three pieces). */
export const HEALTH_PARTS: readonly HealthPart[] = ['aca', 'medicare', 'irmaa', 'extras']

const PART_TITLE: Readonly<Record<HealthPart, string>> = {
  aca: copy.healthPartAca,
  medicare: copy.healthPartMedicare,
  irmaa: copy.healthPartIrmaa,
  extras: copy.healthPartExtras,
}

export interface HealthBar {
  /** The first person's age that year (the x axis). */
  readonly age: number
  readonly year: number
  readonly value: number
  /** The bar's spoken sentence, which the tooltip prints too. */
  readonly point: string
}

/** A stretch of consecutive years whose marketplace cliff count is the same: one bracket, one label. */
export interface CliffRun {
  readonly fromAge: number
  readonly toAge: number
  /** The count words over the bracket ("about 2 of 10"). */
  readonly label: string
  /** The stretch's spoken sentence, naming the base. */
  readonly point: string
}

export interface HealthPartChart {
  readonly id: HealthPart
  readonly title: string
  /** The legend's one item: "Middle cost each year" (or the steady market's words on the working route). */
  readonly legend: string
  readonly bars: readonly HealthBar[]
  /** The marketplace part only, the retired route only. */
  readonly cliff: readonly CliffRun[]
  /** The count's key, printed under the chart inside its own box: present exactly when a bracket draws, so a count is
   *  never read in the first frame without it (its full words stay in the notes). */
  readonly cliffKey?: string
}

/** A group of notes under the charts, headed by the part it speaks for. */
export interface HealthNoteGroup {
  readonly id: HealthPart
  readonly title: string
  /** The sheet's facts for this part, each its eyebrow, its figure and its sentences. */
  readonly facts: readonly HealthFact[]
  /** Plain lines after the facts (the extras block, the cliff key, the dated rules line, a stopgap). */
  readonly lines: readonly string[]
}

export interface HealthChartsView {
  readonly kind: 'charts'
  readonly route: 'retired' | 'working'
  readonly title: string
  readonly description: string
  readonly axisTitle: string
  /** The four parts, in {@link HEALTH_PARTS} order, every one drawn on {@link lattice} and the same age range. */
  readonly parts: readonly HealthPartChart[]
  readonly ages: { readonly first: number; readonly last: number }
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  /** The key-metric column: the lifetime figure and its sentence, then each part's own lifetime figure. */
  readonly hero: string
  readonly heroLine: string
  readonly metricLines: readonly string[]
  readonly notes: readonly HealthNoteGroup[]
  /** The page's own lines, after the groups: the Medicare affirmation and its residual, the typical-extras appendix,
   *  the survivor and omissions notes, the HSA note, and on the working route its stopgap and the steady market's
   *  lifespans. */
  readonly footnotes: readonly string[]
  readonly updating: boolean
  /** The veil's words while {@link updating}: the answer figured again (retired), the steady rows worked out (working). */
  readonly updatingLabel: string
}

export type HealthCareView = HealthChartsView | { readonly kind: 'words'; readonly words: string }

// ── The figures ─────────────────────────────────────────────────────────────────────────────────────────────────

/** One year of the four parts, already dated. */
interface PartYear {
  readonly t: number
  readonly aca: number
  readonly medicare: number
  readonly irmaa: number
  readonly extras: number
}

/**
 * The share of futures whose money still pays for sim-year t. The overlay stops a future at the year its money runs out
 * (`taxOverlay.ts` breaks on depletion before its readout sink records that year), so a future's premiums are in the
 * readout's sim-year t iff its depletion year is never or later than t. The readout's medians are over those futures
 * only, and a median over none is $0 (`buildHealthReadout`), so a year few futures can pay for would chart a calm $0.
 */
export function fundedShare(depletionYears: readonly DepletionYear[], t: number): number {
  if (depletionYears.length === 0) return 0
  return depletionYears.filter((d) => !isDepleted(d) || d > t).length / depletionYears.length
}

/** The years the page charts: the quotable years (the living futures at `COHORT_FADE.full`) where the futures still paying
 *  are at the same bar. Both shares only fall, so this is a clean prefix of the readout. Row k is sim-year k − 1. */
export function chartableYears(readout: HealthReadout, depletionYears: readonly DepletionYear[]): readonly HealthReadoutYear[] {
  return quotableYears(readout).filter((y) => fundedShare(depletionYears, y.yearsFromNow - 1) >= COHORT_FADE.full)
}

/** The readout's charted years as part-years: row k is sim-year k − 1 (insight 134). */
export function readoutYears(years: readonly HealthReadoutYear[]): readonly PartYear[] {
  return years.map((y) => ({
    t: y.yearsFromNow - 1,
    aca: Math.max(0, y.acaNetPremiumP50),
    medicare: Math.max(0, y.medicareBaseP50),
    irmaa: Math.max(0, y.irmaaSurchargeP50),
    extras: Math.max(0, y.medicareExtrasP50),
  }))
}

/** The steady market's ledger rows as part-years, through the last row read (the steady future's second death). The
 *  ledger's `medicare` is the bill with its surcharge, so the base is the bill less the surcharge. */
export function ledgerYears(rows: readonly LedgerYearRow[], last: number): readonly PartYear[] {
  return rows.slice(0, last + 1).map((r) => ({
    t: r.t,
    aca: Math.max(0, r.premiums.acaNet),
    medicare: Math.max(0, r.premiums.medicare - r.premiums.irmaaSurcharge),
    irmaa: Math.max(0, r.premiums.irmaaSurcharge),
    extras: Math.max(0, r.premiums.medicareExtras),
  }))
}

/**
 * The marketplace cliff's stretches: over the quotable years where at least half the futures buy marketplace cover,
 * the count of 10 (`Math.round(overCliffFraction × 10)`, the sheet's own rule), nothing under 1; consecutive years with
 * the same count join one stretch. A year where fewer than half buy cover breaks a stretch and prints nothing. `years`
 * is the charted years (the page passes {@link chartableYears}), so a bracket never stands over an undrawn year.
 */
export function cliffRuns(readout: HealthReadout, firstAge: number, axisTitle: string, years: readonly HealthReadoutYear[] = quotableYears(readout)): readonly CliffRun[] {
  const out: CliffRun[] = []
  let open: { from: number; to: number; ofTen: number; k: number } | null = null
  const close = () => {
    if (open === null) return
    out.push({ fromAge: open.from, toAge: open.to, label: slots.healthCliffLabel(open.ofTen), point: slots.healthCliffPoint(open.from, open.to, axisTitle, open.ofTen) })
    open = null
  }
  for (const y of years) {
    const age = firstAge + y.yearsFromNow - 1
    const ofTen = y.acaPricedFraction >= 0.5 ? Math.round(y.overCliffFraction * 10) : 0
    if (ofTen < 1) {
      close()
      continue
    }
    if (open !== null && open.ofTen === ofTen && open.k === y.yearsFromNow - 1) {
      open.to = age
      open.k = y.yearsFromNow
      continue
    }
    close()
    open = { from: age, to: age, ofTen, k: y.yearsFromNow }
  }
  close()
  return out
}

/** The median of each future's own lifetime health premiums (net marketplace + Medicare, summed per future first), and
 *  each part's own median. Undefined where the run carried no tax-aware surfaces. The total is Analysis' own statistic
 *  (`lifetimeHealthMedianReal`, the subsidy-rules line's plan side), so the two pages cannot split. */
export function lifetimeMedians(ta: TaxAwareDistribution | undefined): { readonly total: number; readonly aca: number; readonly medicare: number } | undefined {
  if (ta === undefined || ta.lifetimeNetPremiumReal.length === 0) return undefined
  const total = lifetimeHealthMedianReal(ta)
  const aca = medianOf(ta.lifetimeNetPremiumReal)
  const medicare = medianOf(ta.lifetimeMedicareCostReal)
  return total === undefined || aca === undefined || medicare === undefined ? undefined : { total, aca, medicare }
}

const capitalize = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))

function partCharts(years: readonly PartYear[], first: { readonly age: number; readonly start: number }, axisTitle: string, steady: boolean, cliff: readonly CliffRun[]): HealthPartChart[] {
  return HEALTH_PARTS.map((id) => ({
    id,
    title: PART_TITLE[id],
    legend: steady ? copy.healthLegendSteady : copy.healthLegendMiddle,
    bars: years.map((y) => {
      const age = first.age + y.t
      const year = first.start + y.t
      // The sentence a bar's hover and screen reader read alone, so it carries the legend's qualifier itself.
      return { age, year, value: y[id], point: slots.healthYearPoint(axisTitle, age, year, PART_TITLE[id], formatDeltaDollar(y[id]), steady) }
    }),
    cliff: id === 'aca' ? cliff : [],
    ...(id === 'aca' && cliff.length > 0 ? { cliffKey: copy.healthCliffCaption } : {}),
  }))
}

// ── The page ────────────────────────────────────────────────────────────────────────────────────────────────────

/** A committed answer, as the page needs it (the store's `ModelAnswer` figured arms). */
export type HealthAnswer =
  | {
      readonly kind: 'headline'
      readonly draft: ScenarioDraft
      readonly readout: HealthReadout | undefined
      readonly taxAware: TaxAwareDistribution | undefined
      /** Each future's depletion year (`Distribution.depletionYears`): which futures' premiums each readout year holds. */
      readonly depletionYears: readonly DepletionYear[]
    }
  | { readonly kind: 'date'; readonly draft: ScenarioDraft }

export interface HealthCareInput {
  readonly answer: HealthAnswer
  /** The plan's steady-market rows (the working route's figures). */
  readonly steady: RunRows
  /** Today, as an epoch-day (the dated rules line's overdue check; this module reads no clock). */
  readonly todayEpochDay: number
  /** Calendar years since the plan was built (the Medicare card's distances count from today). */
  readonly sincePlanBuilt: number
  /** The store is figuring the answer again (`snapshot.refiguring`): the committed answer's charts stay, veiled. */
  readonly refiguring: boolean
}

/** The lines every figured route carries after the part groups. */
function pageFootnotes(draft: ScenarioDraft): string[] {
  const priced = pricedStateForRun(draft)
  const typical = composeMedicareExtrasTypicalNote(medicareExtrasDisclosureView(draft))
  // A household with no marketplace years (everyone 65 or older) gets the Medicare items alone: the marketplace ones speak
  // of a discount, cost-sharing and subsidy top-ups it never buys (the old sheet mounted only where they were priced).
  const marketplace = healthcarePriced(draft)
  return [
    // The affirmation and its residual ship together (the affirmation alone would claim all of Medicare is priced). The
    // residual carries the page's one state clause and the extras' held-flat sentence.
    copy.verdictMedicarePriced,
    composeVerdictMedicareResidual(priced),
    ...(typical !== undefined ? [typical] : []),
    marketplace ? copy.controlHealthSurvivorNote : copy.healthSurvivorNoteMedicare,
    // The residual above names state income tax already (priced or not), so the omissions list drops its state item
    // here: one state clause per page.
    marketplace ? composeControlHealthOmissionsNote(true) : copy.healthOmissionsNoteMedicare,
    ...(draft.enteredAccounts.some((a) => a.kind === 'hsa') ? [copy.controlHealthHsaNote] : []),
  ]
}

/** The extras block (F5's door home): its lead and each person's line, or nothing where no extras are priced. */
function extrasBlock(draft: ScenarioDraft): string[] {
  const lines = composeMedicareExtrasLines(medicareExtrasDisclosureView(draft))
  return lines === null ? [] : [copy.medicareExtrasSheetLead, ...lines]
}

export function healthCareView(input: HealthCareInput): HealthCareView {
  const { answer } = input
  const draft = answer.draft
  const status = composeHealthSheet(answer.kind === 'headline' ? answer.readout : undefined, draft, input.todayEpochDay, pricedStateForRun(draft), input.sincePlanBuilt)
  const acaLines = healthcarePriced(draft) ? [status.statusLine] : []

  if (answer.kind === 'headline') {
    const readout = answer.readout
    if (readout === undefined || quotableYears(readout).length === 0) return { kind: 'words', words: copy.healthNone }
    // Only the years most futures can still pay for: past them the readout's medians run over few futures, then none ($0).
    const charted = chartableYears(readout, answer.depletionYears)
    if (charted.length === 0) return { kind: 'words', words: copy.healthRunsOutWords }
    const years = readoutYears(charted)
    const firstPerson = tablePerson(draft, 0, draft.people[0]?.currentAge ?? 0, draft.people[0]?.currentAge ?? 0)
    const firstAge = firstPerson.currentAge
    const axisTitle = slots.claimsAgeAxis(capitalize(firstPerson.possessive))
    const cliff = cliffRuns(readout, firstAge, axisTitle, charted)
    const parts = partCharts(years, { age: firstAge, start: draft.startCalendarYear }, axisTitle, false, cliff)
    const lattice = niceLattice(Math.max(1, ...parts.flatMap((p) => p.bars.map((b) => b.value))))
    const life = lifetimeMedians(answer.taxAware)
    // Each future's lifetime sums accrue only the years it could pay for (`taxOverlay.ts`), so where any future runs out
    // they stop there: said under the figures (the rosy direction, the steady market's `healthRanOut` twin).
    const ranOut = answer.depletionYears.some(isDepleted) ? [copy.healthLifetimeStopsAtRunOut] : []
    // The funded cut dropped years the living-only gate would chart: say where and why the charts stop (a shorter axis
    // alone reads as premiums stopping, or the plan ending, there).
    const quotable = quotableYears(readout)
    const firstCut = charted.length < quotable.length ? quotable[charted.length] : undefined
    const chartsStop = firstCut !== undefined ? [slots.healthChartsStop(axisTitle, firstAge + firstCut.yearsFromNow - 1)] : []
    const facts = status.facts
    const factsOf = (...ids: HealthFact['id'][]) => facts.filter((f) => ids.includes(f.id))
    const groups: readonly HealthNoteGroup[] = [
      { id: 'aca', title: PART_TITLE.aca, facts: factsOf('coverage', 'discount', 'conversion'), lines: [...(cliff.length > 0 ? [copy.healthCliffKey] : []), ...acaLines] },
      // The extras rows sit directly under the Medicare premium card (Briggsy's ruling, 2026-10-16: the card's carve-out
      // points at "the lines below").
      { id: 'medicare', title: PART_TITLE.medicare, facts: factsOf('medicare'), lines: extrasBlock(draft) },
      { id: 'irmaa', title: PART_TITLE.irmaa, facts: factsOf('step'), lines: [copy.healthIrmaaStopgap] },
    ]
    const notes = groups.filter((g) => g.facts.length > 0 || g.lines.length > 0)
    return {
      kind: 'charts',
      route: 'retired',
      title: copy.healthChartTitle,
      description: copy.healthDescription,
      axisTitle,
      parts,
      ages: { first: firstAge + years[0]!.t, last: firstAge + years.at(-1)!.t },
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      hero: life === undefined ? '' : slots.healthFigure(formatDeltaDollar(life.total)),
      heroLine: life === undefined ? '' : copy.healthHeroLine,
      metricLines:
        life === undefined
          ? chartsStop
          : [slots.healthLifetimeAca(formatDeltaDollar(life.aca)), slots.healthLifetimeMedicare(formatDeltaDollar(life.medicare)), copy.healthLifetimeEachOwn, ...ranOut, ...chartsStop],
      notes,
      footnotes: pageFootnotes(draft),
      // While the store figures the answer again the committed charts stay, veiled and saying so.
      updating: input.refiguring,
      updatingLabel: copy.answerRefiguringCaption,
    }
  }

  // The working route: the steady market's own rows.
  const rows = input.steady
  if (rows.kind === 'withheld') return { kind: 'words', words: rows.words }
  if (rows.kind === 'error') return { kind: 'words', words: copy.healthRowsError }
  if (rows.kind === 'loading') return { kind: 'words', words: copy.healthRowsWaiting }
  return workingView(rows.rows, rows.meta, rows.updating, draft, acaLines)
}

function workingView(rows: readonly LedgerYearRow[], meta: TableMeta, updating: boolean, draft: ScenarioDraft, acaLines: readonly string[]): HealthCareView {
  const last = lastIndexOf(meta, rows)
  const years = ledgerYears(rows, last)
  if (years.length === 0) return { kind: 'words', words: copy.healthNone }
  const first = meta.people[0]!
  const axisTitle = slots.claimsAgeAxis(capitalize(first.possessive))
  const parts = partCharts(years, { age: first.currentAge, start: meta.startCalendarYear }, axisTitle, true, [])
  const lattice = niceLattice(Math.max(1, ...parts.flatMap((p) => p.bars.map((b) => b.value))))
  // One path: its parts add up to its total exactly.
  const sum = (f: (y: PartYear) => number) => years.reduce((a, y) => a + f(y), 0)
  const aca = sum((y) => y.aca)
  const medicare = sum((y) => y.medicare + y.irmaa + y.extras)
  const end = rows[rows.length - 1]
  // The year the money runs out is the run's last row: the premiums after it are not in these rows.
  const ranOut = end !== undefined && end.ranOut ? [slots.healthRanOut(meta.startCalendarYear + end.t)] : []
  const stop = meta.stopYear === undefined ? [] : [meta.route === 'no-date' ? slots.healthNoDate(meta.stopYear) : slots.healthStopsIn(meta.stopYear)]
  // A floor-keyed band (`tableRun.ts` runs the steady rows on the essentials-only pass): less spending after the stop,
  // less income, a bigger discount and a smaller surcharge, so these premiums read lower than the full budget's. Said
  // in the hero and in a note (Snapshot's `snapshotStatFloorTrack`, Cash Flows' `workbenchFloorTrack`, for these rows).
  const floor = meta.track === 'floor'
  const notes: HealthNoteGroup[] = [
    { id: 'aca' as const, title: PART_TITLE.aca, facts: [], lines: [...acaLines] },
    { id: 'medicare' as const, title: PART_TITLE.medicare, facts: [], lines: extrasBlock(draft) },
  ].filter((g) => g.lines.length > 0)
  return {
    kind: 'charts',
    route: 'working',
    title: slots.healthInSteady(copy.healthChartTitle),
    description: copy.healthDescriptionSteady,
    axisTitle,
    parts,
    ages: { first: first.currentAge + years[0]!.t, last: first.currentAge + years.at(-1)!.t },
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    hero: slots.healthFigure(formatDeltaDollar(aca + medicare)),
    heroLine: floor ? copy.healthHeroLineSteadyEssentials : copy.healthHeroLineSteady,
    metricLines: [slots.healthLifetimeAca(formatDeltaDollar(aca)), slots.healthLifetimeMedicare(formatDeltaDollar(medicare))],
    notes,
    footnotes: [copy.healthWorkingStopgap, ...ranOut, lifespansLine(meta.people), ...stop, ...(floor ? [copy.healthFloorTrack] : []), ...pageFootnotes(draft)],
    updating,
    updatingLabel: copy.healthRowsWaiting,
  }
}

// ── Action Items: B9's health inputs ────────────────────────────────────────────────────────────────────────────

export interface HealthTrayFact {
  readonly id: string
  readonly title: string
  /** The rows' words: who (where a person's), what, and the value, as the Profile page prints them. */
  readonly rows: readonly { readonly heading?: string; readonly label: string; readonly value: string }[]
  /** The fact's one door (its Profile drawer, opened over this page), or null on a read-only tab (no door opens there). */
  readonly door: DrawerTarget | null
}

export interface HealthTrayView {
  /** The subsidy rules what-if: the plan's rules and the lever it opens; absent where no marketplace year is priced. */
  readonly aca?: { readonly label: string; readonly value: string; readonly help: string; readonly lever: WhatIfLeverKind }
  readonly facts: readonly HealthTrayFact[]
  readonly factsNote: string
}

/** The health facts the tray shows, by their Profile cards (Act 6 · RC13b: Goals' Health care before Medicare, Expenses'
 *  Out-of-pocket medical, Goals' Medicare), in the walk's order, each as its card prints it. */
const TRAY_FACTS = ['health', 'medical', 'medicare'] as const

/**
 * The Action Items tray, mapped to B9's health inputs (plan RC10): the marketplace subsidy rules are a what-if (the
 * `aca-subsidy` lever, tried on Analysis, where the tray's Apply writes it); the rest are plan facts, shown with their
 * values exactly as the Profile page prints them (`composeFacts`), each opening its own drawer and saying in words that a
 * change there changes the plan. A read-only tab opens no drawer.
 */
export function healthTrayView(cards: readonly CardView[], aca: { readonly planEnhanced: boolean } | undefined, readOnly: boolean): HealthTrayView {
  const facts = TRAY_FACTS.flatMap((id): HealthTrayFact[] => {
    const c = cards.find((x) => x.id === id)
    if (c === undefined) return []
    return [{ id, title: c.name, rows: c.rows, door: readOnly ? null : c.target }]
  })
  return {
    // The plan's rules, and what they mean (the old sheet's help line for the rules in force).
    ...(aca !== undefined
      ? {
          aca: {
            label: copy.workbenchRailAcaTitle,
            value: aca.planEnhanced ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted,
            help: aca.planEnhanced ? copy.leverHealthRegimeEnhancedHelp : copy.leverHealthRegimeRevertedHelp,
            lever: 'aca-subsidy' as const,
          },
        }
      : {}),
    facts,
    factsNote: readOnly ? copy.healthTrayReadOnly : copy.healthTrayFactsNote,
  }
}
