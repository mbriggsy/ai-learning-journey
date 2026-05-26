import type { GitStats } from '@/types'

type CommitsByDay = GitStats['timeline']['commitsByDay']

/**
 * Calendar-gap-filled daily commit series for the cadence sparkline (Phase 5 Movement 5).
 *
 * `commitsByDay` carries ONLY active days. Plotting just those connected would hide the
 * quiet stretches and read as "continuously active". We fill every calendar day between the
 * first and last commit with its real count (0 on silent days), so the shape is the TRUE
 * rhythm — bursts and valleys both. Uniform 1-day x-spacing falls out for free, which the
 * monotone-cubic path builder relies on. Honest only for projects that clear the cadence
 * gate (isCadenceTrustworthy) — the bulk-import-polluted toys are filtered before we get here.
 */
export function buildSparklineSeries(commitsByDay: CommitsByDay): number[] {
  if (!commitsByDay || commitsByDay.length === 0) return []
  const byDate = new Map(commitsByDay.map((d) => [d.date, d.count]))
  const dates = commitsByDay.map((d) => d.date).sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  if (firstDate === undefined || lastDate === undefined) return []
  const start = dateUTC(firstDate)
  const end = dateUTC(lastDate)
  if (start === null || end === null) return []

  const series: number[] = []
  const DAY = 86_400_000
  for (let t = start; t <= end; t += DAY) {
    const iso = new Date(t).toISOString().slice(0, 10)
    series.push(byDate.get(iso) ?? 0)
  }
  return series
}

/** YYYY-MM-DD → UTC-midnight epoch ms (null on malformed input). */
function dateUTC(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(t) ? null : t
}

export interface SparklinePath {
  /** The line `d` attribute. */
  line: string
  /** The closed area `d` attribute (line + down to baseline + back). */
  area: string
}

/**
 * Build a smooth `<path>` from a uniform series using MONOTONE CUBIC (Fritsch–Carlson)
 * tangents — the honesty lock (Phase 5 / Phase 9): a monotone-cubic interpolant never
 * overshoots a local peak nor dips below a zero-day, unlike Catmull-Rom or a naive cubic.
 * So a quiet day renders at the baseline and a peak never inflates beyond its real value.
 *
 * Coordinates map into [0..width] × [0..height] with y inverted (SVG y-down): the max count
 * sits at `topPad`, a zero day at `height`. `preserveAspectRatio="none"` stretches this to
 * the full-bleed wrapper. Degenerate series (< 2 points, or an all-zero/flat series) render
 * a flat baseline line rather than throwing.
 */
export function buildSparklinePath(values: number[], width: number, height: number, topPad = 2): SparklinePath {
  const n = values.length
  if (n === 0) return { line: '', area: '' }

  const max = Math.max(...values)
  const usableH = height - topPad
  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * width)
  const y = (v: number) => (max <= 0 ? height : height - (v / max) * usableH)
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }))

  const first = pts[0] as { x: number; y: number }
  if (n < 2) {
    const flat = `M0,${round(first.y)} L${width},${round(first.y)}`
    return { line: flat, area: `${flat} L${width},${height} L0,${height} Z` }
  }

  // Secant slopes between consecutive points.
  const slopes = pts.slice(0, -1).map((p, i) => {
    const next = pts[i + 1] as { x: number; y: number }
    return (next.y - p.y) / (next.x - p.x)
  })

  // Fritsch–Carlson monotone tangents: endpoints take the adjacent secant; interior points the
  // average, forced to 0 at a local extremum (sign change) so the curve never overshoots.
  const m = slopes.map((s, i) => {
    if (i === 0) return s
    const prev = slopes[i - 1] as number
    return prev * s <= 0 ? 0 : (prev + s) / 2
  })
  m.push(slopes[slopes.length - 1] as number) // tangent at the final point

  // Clamp tangents into the monotone region (|(α,β)| ≤ 3) — the no-overshoot honesty guarantee.
  for (let i = 0; i < slopes.length; i++) {
    const s = slopes[i] as number
    if (s === 0) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const a = (m[i] as number) / s
      const b = (m[i + 1] as number) / s
      const mag = a * a + b * b
      if (mag > 9) {
        const tau = 3 / Math.sqrt(mag)
        m[i] = tau * a * s
        m[i + 1] = tau * b * s
      }
    }
  }

  // Cubic Hermite → cubic Bézier control points per segment.
  let line = `M${round(first.x)},${round(first.y)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i] as { x: number; y: number }
    const p1 = pts[i + 1] as { x: number; y: number }
    const m0 = m[i] as number
    const m1 = m[i + 1] as number
    const h = p1.x - p0.x
    const c1x = p0.x + h / 3
    const c1y = p0.y + (m0 * h) / 3
    const c2x = p1.x - h / 3
    const c2y = p1.y - (m1 * h) / 3
    line += ` C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p1.x)},${round(p1.y)}`
  }
  const area = `${line} L${round(width)},${round(height)} L0,${round(height)} Z`
  return { line, area }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
