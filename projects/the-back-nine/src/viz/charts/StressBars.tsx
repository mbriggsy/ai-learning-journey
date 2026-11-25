/*
 * src/viz/charts/StressBars.tsx: Retirement → Stress Test's bars through the one `Chart` (plan RC11; `stressBarsOptions.ts`).
 * The chart is KEYED ON ITS PICTURE (every bar's count, height and words, the size): a new picture builds a fresh chart
 * rather than updating a live one, so the drawn bars are always the ones the options state (insight 169).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { stressBarsOptions, type StressBarsInput } from './stressBarsOptions'

export function StressBars(props: StressBarsInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.bars, input.axisTitle, input.words, input.height, input.narrow])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: stressBarsOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-stress" />
}
