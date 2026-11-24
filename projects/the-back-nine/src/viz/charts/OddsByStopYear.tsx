/*
 * src/viz/charts/OddsByStopYear.tsx: the "Odds by stop year" chart (plan docs/plans/6-rightcapital-ui-plan.md, RC4,
 * critique 3): `oddsByStopYearOptions.ts`'s options through the one `Chart`. Its rows and its labels' column are sized
 * in the reader's root font, and its labels stack onto lines when its own box is narrow; both are read here (the
 * options builder stays pure). The chart waits for its first measurement, so it never draws at one size, then another.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { ODDS_NARROW_REM, oddsByStopYearOptions, type OddsChartInput } from './oddsByStopYearOptions'

/** The root font size in px: the reader's browser default (16 unless they raised it). */
function rootFontPx(): number {
  if (typeof document === 'undefined') return 16
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(px) && px > 0 ? px : 16
}

export function OddsByStopYear(props: Omit<OddsChartInput, 'remPx' | 'narrow'>) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (el === null) return
    setWidth(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined) setWidth(w)
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  const remPx = rootFontPx()
  const narrow = width !== null && width < ODDS_NARROW_REM * remPx
  const key = JSON.stringify([props.series, props.barRung, remPx, narrow])
  const held = useRef<{ readonly key: string; readonly labels: OddsChartInput['labels']; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key || held.current.labels !== props.labels) {
    held.current = { key, labels: props.labels, options: oddsByStopYearOptions({ ...props, remPx, narrow }) }
  }
  return <div ref={box}>{width === null ? null : <Chart options={held.current.options} chartId="odds" className="b9-odds" />}</div>
}
