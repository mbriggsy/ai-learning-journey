/*
 * src/viz/charts/InvestmentCharts.tsx: Investment's donut and Asset Allocation → Detail's diverging bars through the one
 * `Chart` (plan RC12; `donutOptions.ts`). Each is KEYED ON ITS PICTURE (every share and word, the size, the picked part,
 * the scale): a new picture builds a fresh chart rather than updating a live one, so the drawn angles and bar lengths are
 * always the ones the options state (insight 169; the picker switching accounts is exactly that).
 *
 * The donut's centre is HTML over the hole (the ring's font law, plan 4.0): the words arrive from the screen.
 */
import { useRef, type ReactNode } from 'react'
import type { Options } from 'highcharts/highcharts.src'
import { Chart } from './Chart'
import { donutOptions, shiftOptions, type DonutInput, type ShiftInput } from './donutOptions'

export function Donut(props: DonutInput & { readonly chartId: string; readonly className: string; readonly centre: ReactNode; readonly onPick?: (id: string) => void }) {
  const { chartId, className, centre, onPick, ...input } = props
  const key = JSON.stringify([input.parts, input.words, input.size, input.picked, input.pickable])
  // The click reads the newest handler, never the one the chart was built with.
  const pick = useRef(onPick)
  pick.current = onPick
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: donutOptions(input, (id) => pick.current?.(id)) }
  return (
    <div className="relative mx-auto" data-donut={chartId}>
      <Chart key={key} options={held.current.options} chartId={chartId} className={className} />
      {/* The hole's words, centred over the ring (above the credit's 16 px band, `DONUT_CREDIT_PX`); they never take a
          click meant for a slice. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-4 flex flex-col items-center justify-center text-center" data-donut-centre="">
        {centre}
      </div>
    </div>
  )
}

export function MixShift(props: ShiftInput & { readonly chartId: string }) {
  const { chartId, ...input } = props
  const key = JSON.stringify([input.bars, input.axisMax, input.words, input.besideTable])
  const held = useRef<{ readonly key: string; readonly options: Options } | null>(null)
  if (held.current === null || held.current.key !== key) held.current = { key, options: shiftOptions(input) }
  return <Chart key={key} options={held.current.options} chartId={chartId} className="b9-shift" />
}
