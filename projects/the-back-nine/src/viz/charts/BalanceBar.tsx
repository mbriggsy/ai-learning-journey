/*
 * src/viz/charts/BalanceBar.tsx: one half's balance bar on Probability's retired route (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4): `balanceBarOptions.ts`'s options through the one `Chart`. The options
 * change only when the picture does (the figure, the scale, the words), so a re-render with the same picture hands
 * Highcharts the same object (no fresh morph, no dropped hover; `FanChart.tsx`'s rule).
 */
import { useRef } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { balanceBarOptions, type BalanceBarInput } from './balanceBarOptions'

export function BalanceBar(props: BalanceBarInput) {
  const key = JSON.stringify([props.role, props.median, props.lattice, props.figure, props.sideName, props.point, props.height])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: balanceBarOptions(props) }
  return <Chart options={held.current.options} chartId={`bar-${props.role}`} className={`b9-bar b9-bar--${props.role}`} />
}
