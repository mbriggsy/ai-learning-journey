/*
 * src/viz/charts/ClaimCharts.tsx: Retirement → Social Security's charts through the one `Chart` (plan RC9;
 * `claimOptions.ts`). Each chart is KEYED ON ITS PICTURE (its scale, its values, its words): a new scale builds a fresh
 * chart rather than updating a live one (insight 169), so both strategies always draw on the scale they share.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { claimAnnualOptions, claimCumulativeOptions, claimSummaryOptions, type ClaimPairInput, type ClaimSummaryInput } from './claimOptions'

function useHeld<T>(key: string, build: () => T): T {
  const held = useRef<{ readonly key: string; readonly value: T } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, value: build() }
  return held.current.value
}

export function ClaimPair(props: ClaimPairInput & { readonly chartId: string; readonly kind: 'annual' | 'cumulative' }) {
  const { chartId, kind, ...input } = props
  const key = JSON.stringify([kind, input.series, input.lattice, input.words, input.height, input.axisTitle, input.crossing ?? null])
  const options = useHeld<Options>(key, () => (kind === 'annual' ? claimAnnualOptions(input) : claimCumulativeOptions(input)))
  return <Chart key={key} options={options} chartId={chartId} className={kind === 'annual' ? 'b9-bar b9-claims' : 'b9-claims'} />
}

export function ClaimSummaryBars(props: ClaimSummaryInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.bars, input.lattice, input.words, input.height, input.names, input.narrow])
  const options = useHeld<Options>(key, () => claimSummaryOptions(input))
  return <Chart key={key} options={options} chartId={chartId} className={input.narrow ? 'b9-bar b9-claims b9-claims-summary b9-claims-narrow' : 'b9-bar b9-claims b9-claims-summary'} />
}
