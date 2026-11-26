/*
 * src/viz/charts/YearBars.tsx: columns over the plan's years through the one `Chart` (plan RC17;
 * `incomeSourcesOptions.ts`). KEYED ON ITS PICTURE (every part's values, the ticks, the words, the ran-out year): a new
 * picture builds a fresh chart rather than updating a live one, so the drawn columns always stand on the scale the
 * options state (insight 169).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { yearBarsOptions, type YearBarsInput } from './incomeSourcesOptions'

export function YearBars(props: YearBarsInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.sources, input.ticks, input.words, input.height, input.axisTitle, input.axisOffset, input.ranOut, input.legend])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: yearBarsOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-years" />
}
