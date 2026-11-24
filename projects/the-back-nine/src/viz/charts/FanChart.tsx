/*
 * src/viz/charts/FanChart.tsx: the projection fan (plan docs/plans/6-rightcapital-ui-plan.md, RC3; RC7 shows it full
 * size): `fanOptions.ts`'s options through the one `Chart`. Snapshot's card draws it at card size. The figure is named
 * for a screen reader by the accessibility module (the description and one sentence per year, both the composer's).
 *
 * THE OPTIONS CHANGE ONLY WHEN THE PICTURE DOES. The composer rebuilds the fan and its moments as new objects on every
 * recompute (a save-state change, a stat ring landing), and every new options object is a `chart.update`: a fresh
 * morph, and a hover dropped mid-read. So the options are keyed on the fan's CONTENT (its years, the moments, the
 * height) and the labels object (the composer hands the same one while the household's draft and ages stand), and a
 * re-render with the same picture hands Highcharts the same options.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import type { BandFan } from '@shared/model'
import type { XAnnotation } from '../bandData'
import { Chart } from './Chart'
import { fanOptions, type FanLabels } from './fanOptions'

export interface FanChartProps {
  readonly fan: BandFan
  readonly moments: readonly XAnnotation[]
  readonly labels: FanLabels
  readonly height: number
}

export function FanChart({ fan, moments, labels, height }: FanChartProps) {
  const key = JSON.stringify([fan.byYear, moments, height])
  const held = useRef<{ readonly key: string; readonly labels: FanLabels; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key || held.current.labels !== labels) {
    held.current = { key, labels, options: fanOptions({ fan, moments, labels, height }) }
  }
  return <Chart options={held.current.options} chartId="fan" className="b9-fan" />
}
