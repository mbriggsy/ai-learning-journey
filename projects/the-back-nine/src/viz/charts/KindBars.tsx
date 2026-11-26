/*
 * src/viz/charts/KindBars.tsx: Dashboard → Balance Sheet's bars through the one `Chart` (plan RC16; `kindBarsOptions.ts`).
 * The chart is KEYED ON ITS PICTURE (every bar's figure, the ticks, the words, the height): a new picture builds a fresh
 * chart rather than updating a live one, so the drawn bars always stand on the scale the options state (insight 169: a
 * live chart once kept its old scale on update and drew two different balances the same height).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { kindBarsOptions, type KindBarsInput } from './kindBarsOptions'

export function KindBars(props: KindBarsInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.bars, input.ticks, input.words, input.height])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: kindBarsOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-kinds" />
}
