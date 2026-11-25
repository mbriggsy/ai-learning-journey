/*
 * src/viz/charts/HealthCharts.tsx: one of Retirement → Health Care's small charts through the one `Chart` (plan RC10;
 * `healthPartsOptions.ts`). KEYED ON ITS PICTURE (its scale, its age range, its bars, its words): a new scale builds a
 * fresh chart rather than updating a live one (insight 169), so the four parts always draw on the one scale they share.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { healthPartOptions, type HealthPartInput } from './healthPartsOptions'

export function HealthPartChart(props: HealthPartInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.id, input.bars, input.cliff, input.ages, input.axisOffset, input.lattice, input.words, input.height, input.axisTitle])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: healthPartOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-health" />
}
