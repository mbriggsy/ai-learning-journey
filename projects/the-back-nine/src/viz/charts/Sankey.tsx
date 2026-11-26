/*
 * src/viz/charts/Sankey.tsx: one year's money as a Sankey through the one `Chart` (plan RC20; `sankeyOptions.ts`). KEYED
 * ON ITS PICTURE (every node, flow, amount and word, and the height): a new year or a new run builds a fresh chart rather
 * than updating a live one, so the drawn bars always stand for the figures the options state (insight 169).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { sankeyOptions, type SankeyInput } from './sankeyOptions'

export function Sankey(props: SankeyInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.nodes, input.links, input.words, input.height, input.minNodePx])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: sankeyOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-map" />
}
