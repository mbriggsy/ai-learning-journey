/*
 * src/viz/charts/BalanceBar.tsx: one half's balance bar on Probability's retired route (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4): `balanceBarOptions.ts`'s options through the one `Chart`. The options
 * change only when the picture does (the figure, the scale, the words), so a re-render with the same picture hands
 * Highcharts the same object (no fresh morph, no dropped hover; `FanChart.tsx`'s rule).
 *
 * THE SHARED SCALE IS BUILT, NEVER UPDATED (RC4b): the two halves read one lattice, and a what-if that lands with a larger
 * median moves it. Handed to a live chart as an update, the new axis maximum and tick positions were seen not to hold
 * (the look instrument's refreshed frame: each bar drawn to its own maximum, the two the same height, the ticks gone but
 * "$0"), which makes the plan's bar look as good as the what-if's. So the chart is keyed on its scale: a new lattice
 * builds a new chart, whose axis is the one the options state.
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { balanceBarOptions, type BalanceBarInput } from './balanceBarOptions'

export function BalanceBar(props: BalanceBarInput) {
  const key = JSON.stringify([props.role, props.median, props.lattice, props.figure, props.sideName, props.point, props.height])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: balanceBarOptions(props) }
  return <Chart key={JSON.stringify(props.lattice)} options={held.current.options} chartId={`bar-${props.role}`} className={`b9-bar b9-bar--${props.role}`} />
}
