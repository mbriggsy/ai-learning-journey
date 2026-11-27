/*
 * src/viz/charts/GroupedBars.tsx: `groupedBarsOptions.ts`'s options through the one `Chart` (plan RC8). The options
 * change only when the picture does, and the chart is KEYED ON ITS PICTURE (scale, values, words): a new scale builds a
 * fresh chart whose axis is the one its options state (insight 169, RC4b's balance bars: an update with a new axis
 * maximum was seen not to hold; the cause is unconfirmed, the rebuild holds either way).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { groupedBarsOptions, type GroupedBarsInput } from './groupedBarsOptions'

export function GroupedBars(props: GroupedBarsInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.groups, input.series, input.lattice, input.words, input.height, input.padding, input.sideways === true])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: groupedBarsOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-bar b9-grouped" />
}
