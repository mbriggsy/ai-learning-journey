/*
 * src/viz/charts/seriesVars.ts: the series colours reach the charts through the CSSOM (plan 6-rightcapital-ui-plan.md,
 * 2.1 decision 4). `highcharts.css` paints `.highcharts-color-N` from `--highcharts-color-N` (and `chartTheme.css`
 * adds slots 10 to 12); each entry calls `applySeriesVars(document.documentElement.style)` once at start-up. A property
 * set on the root's own style beats every stylesheet's `:root` rule, so Highcharts' default palette never shows, and a
 * CSSOM write is allowed under `style-src 'self'` where a runtime `<style>` is not. The hexes are typed once, in
 * `palette.ts`.
 */
import { RC_SERIES } from '../palette'

/** The custom property Highcharts' styled mode reads for colour index `i`. */
export const seriesVarName = (i: number): string => `--highcharts-color-${i}`

/** Every `[name, value]` pair the start-up write sets: one per RC_SERIES slot, in order, and nothing else. */
export function seriesVars(): ReadonlyArray<readonly [name: string, value: string]> {
  return RC_SERIES.map((hex, i) => [seriesVarName(i), hex] as const)
}

/** The part of `CSSStyleDeclaration` the write needs (a test passes a recorder). */
export interface StyleTarget {
  setProperty(name: string, value: string): void
}

/** Writes every series colour onto `style` (the root element's, at start-up). */
export function applySeriesVars(style: StyleTarget): void {
  for (const [name, value] of seriesVars()) style.setProperty(name, value)
}
