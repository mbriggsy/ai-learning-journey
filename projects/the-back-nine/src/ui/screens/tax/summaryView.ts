/**
 * src/ui/screens/tax/summaryView.ts: Tax → Tax Strategies → Summary, the one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC8; `rc-cashflow-tax/help-tax-tax-strategies-roth-conversion-strategy-51.png`).
 *
 * "Summary of the recommendation": grouped bars, the winner green and solid, your plan today blue and hatched (plan 4.0's
 * colour roles), a value printed on every bar, on the HERO'S OWN STATISTIC (`RecommendedView.bars`, the seed-B
 * `headlineStatisticB` the hero's delta is the difference of), so the bars and the hero never disagree (insight 099).
 * Each bar prints the figure the ranked list prints for that arm (`armFigure`), and the key-metric column carries the
 * hero's own words (`heroWords`).
 *
 * The bars follow `RecommendationView`'s rule for its picture: none in the no-change register (no change, a seed-B
 * display inversion, a delta that formats to $0), where the reassurance stands alone. Pay-less-tax's three parts
 * (income tax, net marketplace premium, Medicare) are NOT drawn as their own groups: each part's mean is printed in the
 * humane dialect, and three rounded parts need not add up to the rounded all-in bar beside them, which would print a
 * sum that doesn't sum. The hero bars alone (the plan's own fallback; the pilot's call, RC8 build).
 *
 * Beside the bars, the Winner card's own qualifying lines (the skew quote, the typical-future qualifier, the shape note)
 * and under them its disclosures, from the same view, so the hero is never reprinted bare (insight 160).
 */
import type { DollarLattice } from '@viz/bandData'
import { niceLattice } from '@viz/bandData'
import { pricedStateForRun, spineInheritedHeld, spineMedicarePriced } from '@intake/intakeMap'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import { recommendationView } from '../../recommendationView'
import { composeVerdictStateNote } from '../../stateTaxDisclosure'
import { armFigure, heroWords, metricWords } from './strategiesView'

export interface SummaryBar {
  readonly name: string
  readonly statistic: number
  /** The printed figure (`~$4,240,000`), the ranked list's for the same arm. */
  readonly figure: string
  /** The same figure in the axis's `mm` dialect, three figures (`~$4.24mm`), for a bar too narrow to print the full one
   *  beside its neighbour's without the two overlapping (the phone, RC8's look). */
  readonly compactFigure: string
  readonly point: string
}

export type SummaryView =
  | { readonly kind: 'waiting'; readonly words: string; readonly action: string }
  | { readonly kind: 'words'; readonly words: string }
  | {
      readonly kind: 'bars'
      readonly title: string
      /** The one group's name: what the statistic counts. */
      readonly category: string
      readonly winner: SummaryBar
      readonly baseline: SummaryBar
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly hero: string
      readonly average?: string
      readonly nameplate: string
      /** The lines that qualify the hero on the Winner card, beside it here too (insight 160: a figure's meaning is set by
       *  what renders beside it): the leave-more skew quote, the typical-future qualifier, the still-directional note. */
      readonly skew?: string
      readonly qualifier?: string
      readonly shapeNote?: string
      readonly description: string
      /** The footnote row: the Winner card's adjacent disclosures, then the state clause where no state-tax disclosure
       *  already speaks (the Strategies tab's own rule). */
      readonly footnotes: readonly string[]
    }

/** Three significant figures in the `mm` / `k` dialect, bare of the `$` (the slot adds `~$`). */
export function compactDollars(dollars: number): string {
  const v = Math.abs(dollars)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}mm`
  if (v >= 100_000) return `${Math.round(v / 1_000)}k`
  return formatDeltaDollar(v)
}

export function summaryView(snapshot: MemoryModelSnapshot): SummaryView {
  const solve = snapshot.solve
  if (solve.kind !== 'committed' || solve.payload.kind !== 'recommended') return { kind: 'waiting', words: copy.taxStratWaiting, action: copy.taxStratToStrategies }
  const healthcarePriced = spineMedicarePriced(snapshot.draft)
  const pricedState = pricedStateForRun(snapshot.draft)
  const view = recommendationView(solve, { pricedState, healthcarePriced, inheritedHeld: spineInheritedHeld(snapshot.draft) })
  if (view.kind !== 'recommended') return { kind: 'waiting', words: copy.taxStratWaiting, action: copy.taxStratToStrategies }
  if (view.bars === undefined) return { kind: 'words', words: view.grade.heroLine }
  const { hero, average } = heroWords(view, healthcarePriced)
  const speaksState = view.disclosures.some((d) => d.id === 'state-tax')
  const stateClause = composeVerdictStateNote(pricedState, false)
  const top = Math.max(view.bars.winner, view.bars.baseline, 0)
  const lattice = niceLattice(top)
  const bar = (name: string, statistic: number): SummaryBar => ({
    name,
    statistic,
    figure: armFigure(statistic),
    compactFigure: slots.taxStratValue(compactDollars(statistic)),
    point: slots.taxStratBarPoint(name, formatDeltaDollar(statistic)),
  })
  return {
    kind: 'bars',
    title: copy.taxStratSummaryTitle,
    category: metricWords(view.goal, healthcarePriced),
    winner: bar(copy.recVizWithLabel, view.bars.winner),
    baseline: bar(copy.recVizWithoutLabel, view.bars.baseline),
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    hero,
    ...(average !== undefined ? { average } : {}),
    nameplate: view.baselineNameplate,
    ...(view.skew !== undefined ? { skew: view.skew.medianQuote } : {}),
    ...(view.grade.deltaQualifier !== undefined ? { qualifier: view.grade.deltaQualifier } : {}),
    ...(view.grade.shapeNote !== undefined ? { shapeNote: view.grade.shapeNote } : {}),
    description: copy.taxStratSummaryDescription,
    footnotes: [...view.disclosures.map((d) => d.text), ...(!speaksState && stateClause !== null ? [stateClause] : [])],
  }
}
