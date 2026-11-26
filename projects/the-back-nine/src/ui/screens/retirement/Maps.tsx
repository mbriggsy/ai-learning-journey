/**
 * src/ui/screens/retirement/Maps.tsx: Retirement → Cash Flows → Maps, the panel body (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC20; ref 2.16; `rc-cashflow-tax/help-retirement-cash-flows-maps-cash-flows-51.png`, `-01.png`, `-53-later.png`). It
 * draws what `mapsView.ts` returns and works out no figure.
 *
 * THE YEAR SCRUBBER (RightCapital's): a dashed line from the first year to the last, a hollow cap at each end with the
 * year in bold and both ages under it, a map pin on the chosen year. The years after work stops are drawn solid from a
 * tick named "Work stops" (a shape and a word, never a colour), and the readout between the two ends prints the chosen
 * year, both ages and what kind of year it is. It is a slider (Base UI's): the arrow keys move a year, Home and End go to
 * the ends, and its value text names the year and both ages.
 *
 * THE MAP: the flow (a Sankey, `@viz/charts/Sankey`, lazily loaded with the other charts) or the tiles (Breakdown: the
 * two totals as header bars over the groups' tiles, each with a 4 px bar in its group's colour and its word and amount,
 * its parts listed under it). On a phone the tiles always show (a Sankey 358 px wide cannot print its names beside its
 * flows; the builder's call, RC20), said so in one line. A year with no map (the money runs out in it, or a working year
 * whose cost isn't given) prints its words in the map's place. Nothing here moves: a new year swaps the picture.
 */
import { lazy } from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { MapPin } from 'lucide-react'
import { cn, useWide } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { chartWords } from '../dashboard/snapshotView'
import { ChartSeat } from './Comparisons'
import type { MapGroup, MapsScrubber, MapsView, MapTile } from './mapsView'

const Sankey = lazy(() => import('@viz/charts/Sankey').then((m) => ({ default: m.Sankey })))

/** The flow's height in CSS px at his window (one frame down to the caveat, the plan's RC20 fit decision) and wider. */
export const MAP_HEIGHT = 250
/** A bar is never drawn shorter than one label line (14 px type, 1.45 leading), so two neighbours' names never meet. */
export const MAP_MIN_NODE_PX = 21

/** Each group's tile: its 4 px bar and its tint (the chart's own colours, `chartTheme.css`; RC_PAIRS rows). */
const TILE: Readonly<Record<MapGroup, string>> = {
  income: 'border-l-green bg-mint',
  distribution: 'border-l-orange bg-sand-tint',
  total: 'border-l-green bg-mint',
  expenses: 'border-l-coral bg-blush',
  taxes: 'border-l-stone-400 bg-stone-100',
  saving: 'border-l-blue bg-blue-tint',
  'not-kept': 'border-l-(--highcharts-color-10) bg-sand-tint',
  // The gap: a dashed bar besides its name (a shape, never a colour alone).
  gap: 'border-dashed border-l-stone-500 bg-bg',
}

function EndLabel({ year, ages, mark, align }: { readonly year: number; readonly ages: string; readonly mark?: string | null; readonly align: 'left' | 'right' }) {
  return (
    <div className={cn('flex flex-col tabular-nums', align === 'right' ? 'items-end text-right' : 'items-start')} data-maps-end={align}>
      <span className="text-body font-semibold text-stone-900">{year}</span>
      <span className="text-label text-stone-600">{ages}</span>
      {mark !== undefined && mark !== null ? <span className="text-label font-semibold text-stone-900">{mark}</span> : null}
    </div>
  )
}

function YearScrubber({ scrubber, heading, keyLine, onYear }: { readonly scrubber: MapsScrubber; readonly heading: string; readonly keyLine: string | null; readonly onYear: (t: number) => void }) {
  const { years, index } = scrubber
  const first = years[0]
  const last = years.at(-1)
  if (first === undefined || last === undefined) return null
  const span = Math.max(1, years.length - 1)
  const stopPct = scrubber.stopIndex === null ? null : (scrubber.stopIndex / span) * 100
  // The stop's word prints above the line beside its tick: to the right, or to the left where the pin stands there.
  const pinPct = (index / span) * 100
  const stopLeft = stopPct !== null && pinPct > stopPct - 1 && pinPct < stopPct + 8
  return (
    <SliderPrimitive.Root
      value={index}
      min={0}
      max={span}
      step={1}
      onValueChange={(v) => {
        const at = years[typeof v === 'number' ? v : (v[0] ?? 0)]
        if (at !== undefined) onYear(at.t)
      }}
      className="flex w-full flex-col gap-1"
      data-maps-scrubber=""
    >
      <SliderPrimitive.Label className="sr-only">{scrubber.label}</SliderPrimitive.Label>
      <SliderPrimitive.Control className="relative flex h-9 w-full cursor-pointer touch-none items-end pb-1.5 select-none">
        <SliderPrimitive.Track className="relative h-0 w-full border-t-2 border-dashed border-stone-400">
          {stopPct !== null ? (
            <>
              {/* After work stops: solid from the tick to the end. */}
              <span aria-hidden="true" className="absolute -top-0.5 right-0 h-0.5 bg-stone-500" style={{ left: `${stopPct}%` }} data-maps-retired="" />
              <span aria-hidden="true" className="absolute -top-2 h-3.5 w-0.5 -translate-x-1/2 bg-stone-600" style={{ left: `${stopPct}%` }} data-maps-stop="" />
              <span
                aria-hidden="true"
                className={cn('absolute -top-6 text-axis whitespace-nowrap text-stone-600', stopLeft ? '-translate-x-full pr-2' : 'pl-2')}
                style={{ left: `${stopPct}%` }}
                data-maps-stop-word=""
              >
                {scrubber.stopMark}
              </span>
            </>
          ) : null}
          <span aria-hidden="true" className="absolute -top-[7px] -left-1.5 size-3 rounded-full border-2 border-stone-500 bg-bg" />
          <span aria-hidden="true" className="absolute -top-[7px] -right-1.5 size-3 rounded-full border-2 border-stone-500 bg-bg" />
          <SliderPrimitive.Thumb
            getAriaValueText={(_formatted, value) => years[value]?.text ?? ''}
            className="relative -top-px flex size-6 items-center justify-center rounded-full outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-ink"
            data-maps-thumb=""
          >
            {/* The pin's tip sits on the line: the icon rides above the thumb's centre. */}
            <MapPin size={24} strokeWidth={2} aria-hidden="true" className="absolute -top-4 fill-blue text-blue-ink" />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
      <div className="relative grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <EndLabel year={first.year} ages={first.ages} align="left" />
        {/* Between the two ends: the chosen year and both ages, then the year's one-path sentence (the future named). On
            the phone both take their own lines under the ends. */}
        <div className="hidden flex-col items-center gap-0.5 text-center wide:flex">
          <p className="text-body font-semibold text-stone-900" data-maps-year="">
            {heading}
          </p>
          {keyLine !== null ? (
            <p className="text-body text-stone-900" aria-describedby={verdictDescribedBy()} data-maps-key="">
              {keyLine}
            </p>
          ) : null}
        </div>
        <EndLabel year={last.year} ages={last.ages} mark={scrubber.endMark} align="right" />
      </div>
      <div className="flex flex-col gap-1 wide:hidden">
        <p className="text-body font-semibold text-stone-900" data-maps-year-phone="">
          {heading}
        </p>
        {keyLine !== null ? (
          <p className="text-body text-stone-900" aria-describedby={verdictDescribedBy()} data-maps-key-phone="">
            {keyLine}
          </p>
        ) : null}
      </div>
    </SliderPrimitive.Root>
  )
}

function Tiles({ side, total, tiles }: { readonly side: 'in' | 'out'; readonly total: string; readonly tiles: readonly MapTile[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={total} data-maps-side={side}>
      <h3 className="bg-stone-200 px-3 py-2 text-center text-body font-semibold text-stone-900 tabular-nums" data-maps-total={side}>
        {total}
      </h3>
      <div className={cn('grid gap-2', side === 'in' ? 'grid-cols-1 wide:grid-cols-2' : 'grid-cols-1 wide:grid-cols-2 laptop:grid-cols-4')}>
        {tiles.map((t) => (
          <div key={t.id} className="flex min-w-0 flex-col gap-1" data-maps-tile={t.id}>
            <div className={cn('border-l-4 px-3 py-2', TILE[t.group])}>
              <p className="text-label font-semibold text-stone-900">{t.name}</p>
              <p className="text-body text-stone-900 tabular-nums">{t.text}</p>
            </div>
            {t.leaves.map((l) => (
              <div key={l.id} className={cn('border-l-4 px-3 py-1.5 opacity-100', TILE[t.group])} data-maps-leaf={l.id}>
                <p className="text-label text-stone-900">{l.name}</p>
                <p className="text-label text-stone-900 tabular-nums">{l.text}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export interface MapsProps {
  readonly view: MapsView
  readonly onYear: (t: number) => void
}

export function Maps({ view, onYear }: MapsProps) {
  const wide = useWide()
  const { body } = view
  const flow = wide && view.viewSelect.value === 'flow'
  return (
    <div className="flex min-w-0 flex-col gap-3" data-maps={body.kind === 'map' ? (flow ? 'flow' : 'breakdown') : 'words'}>
      <YearScrubber scrubber={view.scrubber} heading={view.heading} keyLine={body.kind === 'map' ? body.key : null} onYear={onYear} />
      {!wide && body.kind === 'map' ? (
        <p className="text-label text-stone-600" data-maps-phone-note="">
          {view.phoneNote}
        </p>
      ) : null}
      {body.kind === 'words' ? (
        <div role={body.tone} className="flex min-h-40 items-center border-t-2 border-plum py-6 text-body text-stone-900" data-maps-words="">
          {/* The words stand for the year's map, so they name the R13 caveat as the map would (plan 4.0). */}
          <p aria-describedby={verdictDescribedBy()}>{body.words}</p>
        </div>
      ) : (
        <>
          {flow ? (
            <ChartSeat title={body.title}>
              <Sankey
                chartId="maps-flow"
                nodes={body.nodes.map((n) => ({ id: n.id, name: n.name, amount: n.text, column: n.column, className: `b9-map-${n.group}`, spoken: n.spoken }))}
                links={body.links.map((l) => ({ from: l.from, to: l.to, weight: l.weight, className: `b9-map-${l.group}`, spoken: l.spoken }))}
                words={{ ...chartWords(body.title), description: body.key }}
                height={MAP_HEIGHT}
                minNodePx={MAP_MIN_NODE_PX}
              />
            </ChartSeat>
          ) : (
            <div role="group" aria-label={body.title} aria-describedby={verdictDescribedBy()} className="grid gap-6 laptop:grid-cols-[2fr_4fr]" data-maps-tiles="">
              <Tiles side="in" total={body.totalInWords} tiles={body.inTiles} />
              <Tiles side="out" total={body.totalOutWords} tiles={body.outTiles} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
