import { describe, expect, it } from 'vitest'
import { BEFORE_CHART_FORMAT, chartWordsOptions } from '../chartA11y'

const WORDS = { title: 'Odds', description: 'Each year’s odds.', credits: 'Drawn with {creditsStr}', end: 'The end.', legend: 'Key', legendItem: 'Show or hide {itemName}' }

describe('chartWordsOptions — no built-in English reaches a screen reader (decision 11, owed from RC3)', () => {
  const o = chartWordsOptions(WORDS)
  const lang = (o.lang as { accessibility: Record<string, unknown> }).accessibility

  it('the chart’s name, credit, end marker and legend words are the composer’s', () => {
    expect(lang.defaultChartTitle).toBe('Odds')
    expect(lang.chartContainerLabel).toBe('Odds')
    expect(lang.svgContainerLabel).toBe('Odds')
    expect(lang.credits).toBe('Drawn with {creditsStr}')
    expect((lang.screenReaderSection as Record<string, string>).endOfChartMarker).toBe('The end.')
    expect((lang.legend as Record<string, string>).legendItem).toBe('Show or hide {itemName}')
  })

  it('every chart-type sentence is silenced, and every series summary is the series’ own name', () => {
    const types = lang.chartTypes as Record<string, string>
    expect(Object.values(types).every((v) => v === '')).toBe(true)
    expect(types.combinationChart).toBe('')
    const summary = (lang.series as { summary: Record<string, string> }).summary
    expect(Object.values(summary).every((v) => v === '{series.name}')).toBe(true)
    expect(summary.columnCombination).toBe('{series.name}')
  })

  it('the before-chart region carries the title and the description only (no type or axis sentence)', () => {
    expect(o.accessibility?.description).toBe('Each year’s odds.')
    expect(BEFORE_CHART_FORMAT).toContain('{chartLongdesc}')
    for (const dropped of ['typeDescription', 'xAxisDescription', 'yAxisDescription', 'viewTableButton']) expect(BEFORE_CHART_FORMAT).not.toContain(dropped)
  })
})
