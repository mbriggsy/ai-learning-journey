/*
 * src/viz/charts/YearAreas.tsx: Comparison's year-by-year charts through the one `Chart` (plan RC8;
 * `stackedAreasOptions.ts`). Each chart is KEYED ON ITS PICTURE (its scale, its values, its words): a new scale builds a
 * fresh chart rather than updating a live one (insight 169), so the two side-by-side stacks always draw on the scale
 * they share.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { pairAreasOptions, stackedAreasOptions, type PairAreasInput, type StackedAreasInput } from './stackedAreasOptions'

function useHeld<T>(key: string, build: () => T): T {
  const held = useRef<{ readonly key: string; readonly value: T } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, value: build() }
  return held.current.value
}

export function PairAreas(props: PairAreasInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.series, input.lattice, input.words, input.height])
  const options = useHeld<Options>(key, () => pairAreasOptions(input))
  return <Chart key={key} options={options} chartId={chartId} className="b9-pair" />
}

export function StackedAreas(props: StackedAreasInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.sources, input.lattice, input.words, input.height])
  const options = useHeld<Options>(key, () => stackedAreasOptions(input))
  return <Chart key={key} options={options} chartId={chartId} className="b9-stack" />
}
