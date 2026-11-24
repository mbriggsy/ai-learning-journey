/*
 * src/viz/charts/defaults.ts: the one shared Highcharts default (plan 6-rightcapital-ui-plan.md, 2.1 decisions 1, 5, 6,
 * 7 and 8). Every chart inherits it through `installChartDefaults`, called once per entry before the first chart draws.
 *
 * - Styled mode: every fill, stroke and font comes from CSS classes (`highcharts.css` and `chartTheme.css`, both in the
 *   `charts` layer), which is also what keeps Highcharts inside `style-src 'self'`.
 * - No HTML text: `useHTML` stays off for titles, legends, tooltips, axis labels and data labels (an HTML tooltip once
 *   broke `style-src 'self'`, Highcharts issue 7633, and HTML text escapes the chart CSS).
 * - The credit stays on (the Personal Use licence asks for it at all times); `chartTheme.css` sets it small.
 * - Printed values never hide: data labels may overlap, so a value that is a second cue is never dropped silently.
 * - Motion: a short ease-out morph (250 ms), none under `prefers-reduced-motion`; numbers never count up.
 * - Words: none here. Each chart's options builder takes its words, `lang` strings and the accessibility module's
 *   point descriptions from its screen's composer (decision 11), so no built-in sentence bypasses `copy.ts`.
 */
import type { AnimationOptionsObject, Options } from 'highcharts/highcharts.src'
import { RC_SERIES } from '../palette'
import { PATTERN_DEFS } from './patterns'

/** The morph's length in milliseconds (ref 3.7). */
export const CHART_MORPH_MS = 250

/** Ease-out cubic: fast start, settling finish. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

/** The shared options. `reducedMotion` turns every animation off. */
export function chartDefaults(reducedMotion: boolean): Options {
  const animation: boolean | AnimationOptionsObject = reducedMotion
    ? false
    : { duration: CHART_MORPH_MS, easing: easeOutCubic }
  return {
    chart: {
      styledMode: true,
      colorCount: RC_SERIES.length,
      animation,
    },
    defs: PATTERN_DEFS,
    credits: { enabled: true },
    accessibility: { enabled: true },
    title: { useHTML: false },
    subtitle: { useHTML: false },
    caption: { useHTML: false },
    legend: { useHTML: false },
    tooltip: { useHTML: false },
    xAxis: { labels: { useHTML: false } },
    yAxis: { labels: { useHTML: false } },
    plotOptions: {
      series: {
        animation,
        dataLabels: { useHTML: false, allowOverlap: true },
      },
    },
  }
}

/** The one call per entry: `Highcharts.setOptions` with the shared default, read once against the motion setting. */
export function installChartDefaults(
  hc: { setOptions(options: Options): unknown },
  reducedMotion: boolean,
): void {
  hc.setOptions(chartDefaults(reducedMotion))
}
