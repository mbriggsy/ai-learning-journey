/**
 * src/ui/screens/retirement/Maps.tsx: Retirement → Cash Flows → Maps, the panel body (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC20; ref 2.16; `rc-cashflow-tax/help-retirement-cash-flows-maps-cash-flows-51.png`, `-01.png`, `-53-later.png`). It
 * draws what `mapsView.ts` returns and works out no figure.
 *
 * THE YEAR SCRUBBER (RightCapital's): a dashed line from the first year to the last, a hollow cap at each end with the
 * year in bold and both ages under it, a map pin on the chosen year. The years after work stops are drawn solid from a
 * tick named "Work stops" (a shape and a word, never a colour; an already-retired household's line is solid end to
 * end), and the readout between the two ends prints the chosen year, both ages and what kind of year it is. It is a
 * slider (Base UI's): the arrow keys move a year, Home and End go to the ends, and its value text names the year and
 * each person with their age. A run of one year (a plan already running out in its first) has nowhere to move: no
 * slider, only that year's label with its "Runs out" mark and the readout.
 *
 * THE MAP: the flow (a Sankey, `@viz/charts/Sankey`, lazily loaded with the other charts) or the tiles (Breakdown: the
 * two totals as header bars over the groups' tiles, each with a 4 px bar in its group's colour and its word and amount,
 * its parts listed under it). Below the laptop tier the tiles always show (a Sankey narrower than the seam prints its
 * names over each other: the RC20 review measured it at 820 and 900 px), said so in one line. A year with no map (the
 * money runs out in it, or a working year whose cost isn't given) prints its words in the map's place. Nothing here
 * moves: a new year swaps the picture.
 */
import { lazy, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { MapPin } from 'lucide-react'
import { cn, useLaptop } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { chartWords } from '../dashboard/snapshotView'
import { ChartSeat } from './Comparisons'
import type { MapGroup, MapsScrubber, MapsView, MapTile } from './mapsView'

const Sankey = lazy(() => import('@viz/charts/Sankey').then((m) => ({ default: m.Sankey })))

/** The flow's height in CSS px at his window (one frame down to the caveat, the plan's RC20 fit decision) and wider. */
export const MAP_HEIGHT = 250
/** The shortest bar: a hairline, so a tiny flow stays seen; bars are to scale and the padding keeps names apart. */
export const MAP_MIN_NODE_PX = 1

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

/** The readout: the chosen year and both ages, then the year's one-path sentence (the future named). Past the phone tier
 *  it sits between the two ends (`'wide'`); on the phone both take their own lines under the ends (`'phone'`). */
function Readout({ heading, keyLine, tier }: { readonly heading: string; readonly keyLine: string | null; readonly tier: 'wide' | 'phone' }) {
  const wide = tier === 'wide'
  return (
    <div className={wide ? 'hidden flex-col items-center gap-0.5 text-center wide:flex' : 'flex flex-col gap-1 wide:hidden'}>
      <p className="text-body font-semibold text-stone-900" {...(wide ? { 'data-maps-year': '' } : { 'data-maps-year-phone': '' })}>
        {heading}
      </p>
      {keyLine !== null ? (
        <p className="text-body text-stone-900" aria-describedby={verdictDescribedBy()} {...(wide ? { 'data-maps-key': '' } : { 'data-maps-key-phone': '' })}>
          {keyLine}
        </p>
      ) : null}
    </div>
  )
}

function YearScrubber({ scrubber, heading, keyLine, onYear }: { readonly scrubber: MapsScrubber; readonly heading: string; readonly keyLine: string | null; readonly onYear: (t: number) => void }) {
  const { years, index } = scrubber
  const first = years[0]
  const last = years.at(-1)
  const span = Math.max(1, years.length - 1)
  const stopPct = scrubber.stopIndex === null ? null : (scrubber.stopIndex / span) * 100
  const pinPct = (index / span) * 100
  const word = useRef<HTMLSpanElement>(null)
  const place = useStopWordPlace(word, stopPct, pinPct)
  if (first === undefined || last === undefined) return null
  // A run of one year (a plan already running out in its first year, every `failing*` seed): there is no year to move
  // to, so no slider (a 0-to-1 range would be inert, the same year at both caps). That year's label, with its "Runs
  // out" mark, and the readout stand in its place (milestone 4's review, M3).
  if (years.length < 2) {
    return (
      <div className="flex w-full flex-col gap-1" data-maps-scrubber="" data-maps-one-year="">
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
          <EndLabel year={first.year} ages={first.ages} mark={scrubber.endMark} align="left" />
          <Readout heading={heading} keyLine={keyLine} tier="wide" />
        </div>
        <Readout heading={heading} keyLine={keyLine} tier="phone" />
      </div>
    )
  }
  // An already-retired household has no working year: its line is solid end to end.
  const allRetired = years.every((y) => !y.working)
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
        <SliderPrimitive.Track className={cn('relative h-0 w-full border-t-2', allRetired ? 'border-solid border-stone-500' : 'border-dashed border-stone-400')} data-maps-track={allRetired ? 'solid' : 'dashed'}>
          {stopPct !== null ? (
            <>
              {/* After work stops: solid from the tick to the end. */}
              <span aria-hidden="true" className="absolute -top-0.5 right-0 h-0.5 bg-stone-500" style={{ left: `${stopPct}%` }} data-maps-retired="" />
              <span aria-hidden="true" className="absolute -top-2 h-3.5 w-0.5 -translate-x-1/2 bg-stone-600" style={{ left: `${stopPct}%` }} data-maps-stop="" />
              <span
                ref={word}
                aria-hidden="true"
                className={cn('absolute -top-6 text-axis whitespace-nowrap text-stone-600', place.side === 'left' ? '-translate-x-full pr-2' : 'pl-2')}
                style={{ left: place.px === null ? `${stopPct}%` : `${place.px}px` }}
                data-maps-stop-word={place.side}
              >
                {scrubber.stopMark}
              </span>
            </>
          ) : null}
          <span aria-hidden="true" className="absolute -top-[7px] -left-1.5 size-3 rounded-full border-2 border-stone-500 bg-bg" />
          <span aria-hidden="true" className="absolute -top-[7px] -right-1.5 size-3 rounded-full border-2 border-stone-500 bg-bg" />
          <SliderPrimitive.Thumb
            getAriaValueText={(_formatted, value) => years[value]?.spoken ?? ''}
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
        <Readout heading={heading} keyLine={keyLine} tier="wide" />
        <EndLabel year={last.year} ages={last.ages} mark={scrubber.endMark} align="right" />
      </div>
      <Readout heading={heading} keyLine={keyLine} tier="phone" />
    </SliderPrimitive.Root>
  )
}

/** Where the "Work stops" word prints above the line, in px along the track (`width`), from the tick (`stopPx`), the
 *  pin's centre (`pinPx`, 12 px each side) and the word's box (`wordPx`, its 8 px gap on the side facing what it stands
 *  beside). In order: right of the tick, unless the pin stands in the word's way or the word would run past the right
 *  edge (a late tick); left of the tick, where the word fits inside the panel and the pin stands wholly left of the word
 *  or wholly right of its text; right of the pin, clear of it, where that fits inside the right edge; left of the pin
 *  (its box ending at the pin's edge) where that fits inside the left edge; and only as the last resort right of the
 *  pin held inside the right edge, where the track has no room for the word clear of the pin. So the word never crosses
 *  either edge of the panel and never touches the pin wherever there is room (milestone 4's review, O12; round 2, R2R2:
 *  a pin left of the tick, the default year included, once forced the clamp, which could draw the word over the pin). */
export function stopWordPlace(width: number, stopPx: number, pinPx: number, wordPx: number): { readonly side: 'right' | 'left' | 'pin'; readonly px: number } {
  const PIN_HALF = 12
  const GAP = 8
  const pinClash = pinPx + PIN_HALF > stopPx && pinPx - PIN_HALF < stopPx + wordPx
  if (!pinClash && stopPx + wordPx <= width) return { side: 'right', px: stopPx }
  const fitsLeft = wordPx <= stopPx && (pinPx + PIN_HALF <= stopPx - wordPx || pinPx - PIN_HALF >= stopPx - GAP)
  if (fitsLeft) return { side: 'left', px: stopPx }
  if (pinPx + PIN_HALF + wordPx <= width) return { side: 'pin', px: pinPx + PIN_HALF }
  if (pinPx - PIN_HALF - wordPx >= 0) return { side: 'left', px: pinPx - PIN_HALF }
  return { side: 'pin', px: Math.max(0, Math.min(Math.max(stopPx, pinPx + PIN_HALF), width - wordPx)) }
}

/** `stopWordPlace`, measured on the page and again on every resize. */
function useStopWordPlace(word: RefObject<HTMLSpanElement | null>, stopPct: number | null, pinPct: number): { readonly side: 'right' | 'left' | 'pin'; readonly px: number | null } {
  const [place, setPlace] = useState<{ side: 'right' | 'left' | 'pin'; px: number | null }>({ side: 'right', px: null })
  useLayoutEffect(() => {
    const el = word.current
    const track = el?.parentElement
    if (el === null || track === null || track === undefined || stopPct === null) return
    const measure = () => {
      const width = track.clientWidth
      const next = stopWordPlace(width, (stopPct / 100) * width, (pinPct / 100) * width, el.offsetWidth)
      setPlace((p) => (p.side === next.side && p.px === next.px ? p : next))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [word, stopPct, pinPct])
  return place
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
  const laptop = useLaptop()
  const { body } = view
  const flow = laptop && view.viewSelect.value === 'flow'
  return (
    <div className="flex min-w-0 flex-col gap-3" data-maps={body.kind === 'map' ? (flow ? 'flow' : 'breakdown') : 'words'}>
      <YearScrubber scrubber={view.scrubber} heading={view.heading} keyLine={body.kind === 'map' ? body.key : null} onYear={onYear} />
      {!laptop && body.kind === 'map' ? (
        <p className="text-label text-stone-600" data-maps-phone-note="">
          {view.phoneNote}
        </p>
      ) : null}
      {body.kind === 'words' ? (
        <div role={body.tone} className="flex items-center py-6 text-body text-stone-900" data-maps-words="">
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
