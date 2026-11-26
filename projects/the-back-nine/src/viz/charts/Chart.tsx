/*
 * src/viz/charts/Chart.tsx: the app's one Highcharts chart component (plan docs/plans/6-rightcapital-ui-plan.md, RC3):
 * the `@highcharts/react` wrapper over the shared default (`defaults.ts`). Every chart in the clone draws through it,
 * so every chart gets styled mode, the patterns' `defs`, the credit, no HTML text, the never-hidden printed values and
 * the motion setting, installed ONCE per page load before the first chart draws.
 *
 * MODULE ORDER IS LOAD-BEARING (docs/landmines.md, UI and product): the accessibility module, highcharts-more and
 * the sankey module (Cash Flows → Maps, RC20) compose onto the namespace the Highcharts master fills in when it
 * evaluates, so each is imported AFTER `@highcharts/react` (imported first, they read the namespace undefined and the
 * page dies). `vite.config.ts` keeps Highcharts out of the dev pre-bundle for the same reason.
 *
 * Words: none here. Each chart's options builder takes its words from its screen's composer (decision 11).
 */
import type { HTMLAttributes } from 'react'
import { Chart as HighchartsChart, Highcharts, type ChartOptions } from '@highcharts/react'
import 'highcharts/es-modules/masters/highcharts-more.src.js'
import 'highcharts/es-modules/masters/modules/sankey.src.js'
import 'highcharts/es-modules/masters/modules/accessibility.src.js'
import { installChartDefaults } from './defaults'
import './chartTheme.css'

const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
installChartDefaults(Highcharts, reducedMotion)

export interface ChartProps {
  readonly options: ChartOptions
  /** Classes on the chart's container (`chartTheme.css` reads custom properties set there, the pattern inks). */
  readonly className?: string
  /** A hook for the e2e audits and the look instrument. */
  readonly chartId?: string
}

export function Chart({ options, className, chartId }: ChartProps) {
  const containerProps = { className, ...(chartId !== undefined ? { 'data-chart': chartId } : {}) } as HTMLAttributes<HTMLDivElement>
  return <HighchartsChart options={options} containerProps={containerProps} />
}
