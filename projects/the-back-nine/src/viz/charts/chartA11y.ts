/*
 * src/viz/charts/chartA11y.ts: Highcharts' own words, supplied by the screen (plan docs/plans/6-rightcapital-ui-plan.md,
 * decision 11; owed from RC3). The accessibility module writes English sentences of its own into every chart's
 * screen-reader region ("Combination chart with 5 data series.", "Chart credits: …", "End of interactive chart.",
 * "Show {itemName}", a series summary such as "Eight in ten futures, series 1 of 5 with 40 data points."). None of
 * those come from `copy.ts`, and the fan's two hidden word series made the count a lie. So every chart's options carry
 * a chart-level `lang` built from the words its composer hands in, and the before-chart region keeps only the chart's
 * own title and description (the type sentence and the axis sentences are dropped, not reworded). Pure: words in,
 * options out; no word is typed here (the `{series.name}` and `{itemName}` placeholders are Highcharts' own tokens).
 */
import type { Options } from 'highcharts/highcharts.src'

/** The words a chart's screen-reader region speaks, built by the screen's composer through `copy.ts`. */
export interface ChartWords {
  /** The chart's name: what a screen reader says the figure is. */
  readonly title: string
  /** The chart's one-sentence description (also `accessibility.description`). */
  readonly description: string
  /** The credit's spoken label (the Personal Use licence keeps the credit on); `{creditsStr}` is the credit's text. */
  readonly credits: string
  /** Said after the chart. */
  readonly end: string
  /** The legend's name. */
  readonly legend: string
  /** Each legend item's spoken action; `{itemName}` is the series' name. */
  readonly legendItem: string
}

/** Every summary key the module reads (its series-type sentences), each spoken as the series' name alone. */
const SUMMARY_KEYS = [
  'default',
  'defaultCombination',
  'line',
  'lineCombination',
  'spline',
  'splineCombination',
  'column',
  'columnCombination',
  'bar',
  'barCombination',
  'pie',
  'pieCombination',
  'scatter',
  'scatterCombination',
  'boxplot',
  'boxplotCombination',
  'bubble',
  'bubbleCombination',
  'map',
  'mapCombination',
  'mapline',
  'maplineCombination',
  'mapbubble',
  'mapbubbleCombination',
] as const

/** The chart-type sentences, all silenced (the before-chart region no longer reads them; this keeps any other reader
 *  of `typeDescription` silent too). */
const CHART_TYPE_KEYS = [
  'emptyChart',
  'mapTypeDescription',
  'unknownMap',
  'combinationChart',
  'defaultSingle',
  'defaultMultiple',
  'splineSingle',
  'splineMultiple',
  'lineSingle',
  'lineMultiple',
  'columnSingle',
  'columnMultiple',
  'barSingle',
  'barMultiple',
  'pieSingle',
  'pieMultiple',
  'scatterSingle',
  'scatterMultiple',
  'boxplotSingle',
  'boxplotMultiple',
  'bubbleSingle',
  'bubbleMultiple',
] as const

const fill = <K extends string>(keys: readonly K[], value: string): Record<K, string> =>
  Object.fromEntries(keys.map((k) => [k, value])) as Record<K, string>

/** The before-chart region: the chart's own title and its description, nothing the module composes itself. */
export const BEFORE_CHART_FORMAT = '<{headingTagName}>{chartTitle}</{headingTagName}><div>{chartLongdesc}</div>'

/**
 * The chart-level `lang` and the accessibility options that keep every spoken sentence the composer's. Spread into a
 * chart's options (`{ ...chartWordsOptions(words), … }`); the caller's own `accessibility` keys merge over these.
 */
export function chartWordsOptions(words: ChartWords): Pick<Options, 'lang' | 'accessibility'> {
  return {
    lang: {
      accessibility: {
        defaultChartTitle: words.title,
        chartContainerLabel: words.title,
        svgContainerLabel: words.title,
        credits: words.credits,
        screenReaderSection: {
          beforeRegionLabel: '',
          afterRegionLabel: '',
          endOfChartMarker: words.end,
        },
        legend: {
          legendLabel: words.legend,
          legendLabelNoTitle: words.legend,
          legendItem: words.legendItem,
        },
        chartTypes: fill(CHART_TYPE_KEYS, ''),
        series: {
          summary: fill(SUMMARY_KEYS, '{series.name}'),
        },
      },
    } as Options['lang'],
    accessibility: {
      description: words.description,
      screenReaderSection: { beforeChartFormat: BEFORE_CHART_FORMAT },
    },
  }
}

/**
 * A household-typed string (a person's name, or words built from one) made safe for a Highcharts text that the chart
 * DRAWS: an axis title, a tooltip, a label. Highcharts 13 parses any drawn text holding `<` as markup even with `useHTML`
 * off and keeps an `<a href>`, so a name typed as a link drew a working off-site link in an axis title; and a bare `&`
 * starts an entity. Escaped, the text prints exactly as typed (Highcharts reads the entities back as their characters).
 * Applied in the options builders where the household's words enter a drawn text, never to the spoken (accessibility)
 * strings, which the module strips of tags and writes as attributes, so an entity there would be read aloud.
 */
export function hcPlain(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
