/*
 * src/viz/charts/RunOutChart.tsx: Confidence's "Futures run out by this age" chart under the fan (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC7): `runOutOptions.ts`'s options through the one `Chart`.
 *
 * THE SCALE AND THE MARGINS ARE BUILT, NEVER UPDATED (`BalanceBar.tsx`'s rule, docs/landmines.md "UI and product"): a
 * live Highcharts chart handed a new axis top or new plot margins as an update was seen not to hold them, and a run-out
 * chart whose years drift from the fan's above it reads a share against the wrong age. So the chart is keyed on its
 * ceiling and the fan's plot box: either moving builds a fresh chart. The options themselves change only when the
 * picture does, so a re-render with the same picture hands Highcharts the same object.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { runOutCeiling, runOutOptions, type RunOutInput } from './runOutOptions'

export function RunOutChart(props: RunOutInput) {
  const key = JSON.stringify([props.points, props.height, props.box])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  // Keyed on the content only: each year's words (in `points`) carry the ages and the shares, so a labels object
  // rebuilt with the same words never restarts the chart.
  if (held.current === null || held.current.key !== key) held.current = { key, options: runOutOptions(props) }
  const scale = JSON.stringify([runOutCeiling(Math.max(0, ...props.points.map((p) => p.per100))), props.box])
  return <Chart key={scale} options={held.current.options} chartId="runout" className="b9-runout-chart" />
}
