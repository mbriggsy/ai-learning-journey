/**
 * src/ui/screens/investment/Swatch.tsx: a part's key mark beside its words (plan RC12): its series hue AND its pattern,
 * drawn as the chart draws it (`patterns.ts`: a white ground, the ink in the part's hue; solid fills whole), so the
 * table's row, the big figure and the slice carry the same second cue. Decorative (the words beside it name the part).
 *
 * The hue is the chart's own custom property (`--highcharts-color-N`, written once from `palette.ts` through the CSSOM),
 * read by a utility class from the stylesheet: no style attribute, no colour literal here. Each class is written out in
 * full so Tailwind's scanner finds it.
 */
import type { SwatchPattern } from './investmentView'

const FILL: Readonly<Record<number, string>> = {
  0: 'fill-(--highcharts-color-0)',
  1: 'fill-(--highcharts-color-1)',
  2: 'fill-(--highcharts-color-2)',
  3: 'fill-(--highcharts-color-3)',
  4: 'fill-(--highcharts-color-4)',
  6: 'fill-(--highcharts-color-6)',
}
const STROKE: Readonly<Record<number, string>> = {
  0: 'stroke-(--highcharts-color-0)',
  1: 'stroke-(--highcharts-color-1)',
  2: 'stroke-(--highcharts-color-2)',
  3: 'stroke-(--highcharts-color-3)',
  4: 'stroke-(--highcharts-color-4)',
  6: 'stroke-(--highcharts-color-6)',
}

export function Swatch({ colorIndex, pattern, size = 14 }: { readonly colorIndex: number; readonly pattern: SwatchPattern; readonly size?: number }) {
  const fill = FILL[colorIndex] ?? ''
  const stroke = STROKE[colorIndex] ?? ''
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" className="shrink-0" data-swatch={`${colorIndex}-${pattern}`}>
      {pattern === 'solid' ? (
        <rect x="0" y="0" width="12" height="12" rx="2" className={fill} />
      ) : (
        <>
          <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1.5" className={`fill-bg ${stroke}`} strokeWidth="1.5" />
          {pattern === 'dots' ? (
            <g className={fill}>
              <circle cx="4" cy="4" r="1.3" />
              <circle cx="8" cy="8" r="1.3" />
              <circle cx="8" cy="4" r="1.3" />
              <circle cx="4" cy="8" r="1.3" />
            </g>
          ) : (
            <g className={stroke} strokeWidth="1.3" fill="none">
              {pattern === 'hatch' ? <path d="M 1 7 L 7 1 M 1 11 L 11 1 M 5 11 L 11 5" /> : <path d="M 1 4 L 11 4 M 1 8 L 11 8" />}
            </g>
          )}
        </>
      )}
    </svg>
  )
}
