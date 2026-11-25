/**
 * src/ui/screens/tax/Strategies.tsx: Tax → Tax Strategies → Strategies, the panel (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC8; `rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-01.png` the empty state, `-51-later.png` Calculating,
 * `rcsite-tax-planning-identify-top-tax-strategies.png` the ranked list; the Winner card from
 * `diy/pl-optimizer-results.png`). Draws `strategiesView.ts`'s view and decides nothing.
 *
 * A scrolling page: at his window the first frame holds the Winner card (or the empty state with its goal picker and
 * Find). Colour is never the only signal: the winner wears its word and a star, a picked goal a heavier border and
 * weight, a held Find no fill and its reason in words, a ranked figure its printed value, the record's standing its
 * own sentence.
 *
 * THE ANNOUNCEMENTS go through the shell's one polite region (`announce`): the solve starting, a refusal landing (it
 * lands synchronously, never through Calculating), Keep's write starting, and a held Find's reason when pressed. The
 * landing of a kept record is the shell's (the durability event, `RecommendationSaveProp.landed`).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CircleCheck, CircleAlert, LoaderCircle, Star } from 'lucide-react'
import type { RecommendationGoal } from '@shared/model'
import { Button, Select, cn } from '../../kit'
import { GRADE_GLYPH } from '../../glyphs'
import type { GradeSignalState } from '../../recommendationView'
import type { RecordFace, StrategiesAsk, StrategiesList, StrategiesNotice, StrategiesView, StrategyRow, WinnerView } from './strategiesView'

export interface StrategiesPanelProps {
  readonly view: Extract<StrategiesView, { kind: 'solve' }>
  readonly caveat: ReactNode
  readonly onPickGoal: (goal: RecommendationGoal) => void
  readonly onBracket: (rate: number) => void
  readonly onFind: () => void
  readonly onRepick: () => void
  /** Keep's tap (absent where nothing can be kept: no Keep is drawn). */
  readonly onKeep?: () => void
  /** Try it in the plan (absent: no Try is drawn). */
  readonly onTry?: () => void
  readonly announce: (words: string) => void
}

/** The grade's silhouette, decorative: its word beside it carries the grade into the accessibility tree. */
function GradeGlyph({ state }: { readonly state: GradeSignalState }) {
  const glyph = GRADE_GLYPH[state]
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {glyph.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {glyph.dots?.map(([cx, cy], i) => (
        <circle key={`d${i}`} cx={cx} cy={cy} r={1.4} fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

const BOX = 'border border-stone-300 bg-bg p-4 wide:p-6'

function Record({ face }: { readonly face: RecordFace }) {
  return (
    <section className={cn(BOX, 'flex flex-col gap-2')} data-record="" aria-labelledby="tax-record-heading">
      <h3 id="tax-record-heading" className="text-body font-semibold text-stone-900" data-record-heading="">
        {face.heading}
      </h3>
      <p className="flex items-start gap-2 text-body text-stone-900" data-standing={face.standing}>
        {face.standing === 'holds' ? (
          <CircleCheck size={20} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
        ) : (
          <CircleAlert size={20} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
        )}
        <span>{face.lead}</span>
      </p>
      {face.causes.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1 pl-10 text-label text-stone-600" data-record-causes="">
          {face.causes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
      {face.savedIn !== undefined ? (
        <p className="text-label text-stone-600" data-record-saved-in="">
          {face.savedIn}
        </p>
      ) : null}
    </section>
  )
}

function Notice({ notice }: { readonly notice: StrategiesNotice }) {
  return (
    <section role="status" className={cn(BOX, 'flex flex-col gap-2 border-l-4 border-l-plum')} data-notice={notice.kind}>
      {notice.heading !== undefined ? <h3 className="text-body font-semibold text-stone-900">{notice.heading}</h3> : null}
      {notice.lines.map((l) => (
        <p key={l} className="text-body text-stone-900">
          {l}
        </p>
      ))}
    </section>
  )
}

function Ask({ ask, onPickGoal, onBracket, onFind, announce }: { readonly ask: StrategiesAsk } & Pick<StrategiesPanelProps, 'onPickGoal' | 'onBracket' | 'onFind' | 'announce'>) {
  const heldId = useId()
  const legendId = useId()
  const held = ask.find.held
  return (
    <section className="flex flex-col items-center gap-6 px-0 py-6 text-center wide:py-10" data-ask="">
      <p className="max-w-3xl text-chart-title font-semibold text-stone-900" data-ask-sentence="">
        {ask.sentence}
      </p>
      <div className="flex w-full max-w-3xl flex-col gap-4 text-left laptop:flex-row laptop:items-start laptop:gap-6">
        <fieldset className="flex min-w-0 flex-1 flex-col gap-3" aria-labelledby={legendId}>
          <legend id={legendId} className="text-body font-semibold text-stone-900">
            {ask.legend}
          </legend>
          {ask.lead !== undefined ? (
            <p className="text-label text-stone-600" data-goal-lead="">
              {ask.lead}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 wide:flex-row">
            {ask.goals.map((g) => {
              const picked = ask.goal === g.id
              return (
                <label
                  key={g.id}
                  data-goal={g.id}
                  data-picked={picked || undefined}
                  className={cn(
                    'flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-control bg-bg p-3',
                    picked ? 'border-2 border-blue-ink' : 'border border-stone-300 hover:border-stone-600',
                  )}
                >
                  <input
                    type="radio"
                    name="tax-strategy-goal"
                    value={g.id}
                    checked={picked}
                    onChange={() => onPickGoal(g.id)}
                    className="mt-1 size-4 shrink-0 accent-blue-ink"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className={cn('text-body text-stone-900', picked && 'font-semibold')}>{g.label}</span>
                    <span className="text-label text-stone-600">{g.gloss}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        {ask.bracket !== undefined ? (
          <div className="flex flex-col gap-1 laptop:w-64" data-heir-bracket="">
            <Select
              label={ask.bracket.label}
              items={ask.bracket.items}
              value={ask.bracket.value}
              onValueChange={(v) => onBracket(Number(v))}
            />
            <p className="text-label text-stone-600">{ask.bracket.help}</p>
          </div>
        ) : null}
      </div>
      {ask.steer !== undefined ? (
        <p role="status" className="max-w-3xl border-l-4 border-plum bg-stone-100 px-4 py-3 text-left text-body text-stone-900" data-steer={ask.steer.kind}>
          {ask.steer.words}
        </p>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          data-find=""
          aria-disabled={held !== undefined ? true : undefined}
          aria-describedby={held !== undefined ? heldId : undefined}
          onClick={() => {
            if (held !== undefined) {
              announce(held.words)
              return
            }
            onFind()
          }}
          className={cn(
            'inline-flex h-10 cursor-pointer items-center justify-center rounded-control border border-blue-ink px-5 text-body whitespace-nowrap',
            'transition-[scale,background-color] duration-150 ease-settle active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100',
            // A held Find drops its fill: fill presence is a shape cue, never a tint (Card 14a's law).
            held !== undefined ? 'bg-bg text-blue-ink' : 'bg-blue-ink text-bg hover:bg-[color-mix(in_oklab,var(--color-blue-ink)_86%,var(--color-stone-900))]',
          )}
        >
          {ask.find.label}
        </button>
        {held !== undefined ? (
          <span id={heldId} className="text-label text-stone-900" data-find-held={held.kind}>
            {held.words}
          </span>
        ) : null}
        <span className="text-label text-stone-600" data-find-cost="">
          {ask.find.cost}
        </span>
      </div>
    </section>
  )
}

function Row({ row }: { readonly row: StrategyRow }) {
  const shade = row.shade === 0 ? 'bg-blue-ink text-bg' : row.shade === 1 ? 'bg-[color-mix(in_oklab,var(--color-blue)_45%,var(--color-bg))] text-stone-900' : 'bg-[color-mix(in_oklab,var(--color-blue)_18%,var(--color-bg))] text-stone-900'
  return (
    <tr data-row={row.role} className="align-middle">
      <td className={cn('w-40 px-3 py-3 text-center text-body font-semibold tabular-nums wide:w-48', shade)} data-row-value="" data-shade={row.shade}>
        {row.value}
      </td>
      <th scope="row" className="px-3 py-3 text-left font-regular">
        <span className="flex flex-col gap-2">
          <span className="text-body font-semibold text-stone-900" data-row-name="">
            {row.name}
          </span>
          <span className="flex flex-wrap gap-2">
            {row.levers.map((l) => (
              <span key={l} className="rounded-control bg-stone-100 px-2 py-1 text-label text-stone-900">
                {l}
              </span>
            ))}
          </span>
          {row.nearTie !== undefined ? (
            <span className="text-label text-stone-900" data-row-near-tie="">
              {row.nearTie}
            </span>
          ) : null}
        </span>
      </th>
    </tr>
  )
}

function List({ list }: { readonly list: StrategiesList }) {
  return (
    <section className="flex flex-col gap-2" data-ranked-list="">
      <table className="w-full border-separate border-spacing-y-2">
        <caption className="pb-1 text-left text-label text-stone-600">{list.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="bg-stone-200 px-3 py-2 text-center text-label font-semibold text-stone-900">
              {list.valueHeading}
            </th>
            <th scope="col" className="bg-stone-200 px-3 py-2 text-left text-label font-semibold text-stone-900">
              {list.strategyHeading}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((r) => (
            <Row key={r.role} row={r} />
          ))}
        </tbody>
      </table>
      {list.others !== undefined ? (
        <p className="text-label text-stone-600" data-ranked-others="">
          {list.others}
        </p>
      ) : null}
    </section>
  )
}

function Winner({ w, onKeep, onTry }: { readonly w: WinnerView } & Pick<StrategiesPanelProps, 'onKeep' | 'onTry'>) {
  const keepHintId = useId()
  return (
    <section className="relative mt-4 border-2 border-blue-ink bg-bg px-4 pt-8 pb-5 wide:px-8" data-winner={w.mode} aria-labelledby="tax-winner-badge">
      <p
        id="tax-winner-badge"
        className="absolute top-0 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-blue-ink px-4 py-1 text-label font-semibold text-bg"
      >
        <Star size={14} strokeWidth={1.5} aria-hidden="true" fill="currentColor" />
        {w.badge}
      </p>
      <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[1fr_auto] laptop:items-start laptop:gap-10">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[1.75rem] leading-tight font-semibold text-stone-900 tabular-nums wide:text-[2rem]" data-winner-hero="">
                {w.hero}
              </span>
              {w.average !== undefined ? <span className="text-label text-stone-600">{w.average}</span> : null}
            </p>
            <p className="text-label text-stone-600" data-winner-nameplate="">
              {w.nameplate}
            </p>
            {w.skew !== undefined ? (
              <p className="text-label text-stone-900" data-winner-skew="">
                {w.skew}
              </p>
            ) : null}
            {w.qualifier !== undefined ? (
              <p className="text-label text-stone-900" data-winner-qualifier="">
                {w.qualifier}
              </p>
            ) : null}
            <p className="text-label text-stone-600" data-winner-compared="">
              {w.compared}
            </p>
          </div>
          {w.chips.length > 0 ? (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-wrap gap-2" aria-label={w.leversLabel} data-winner-chips="">
                {w.chips.map((c) => (
                  <li key={c} className="rounded-control border border-stone-300 bg-stone-100 px-2 py-1 text-label text-stone-900">
                    {c}
                  </li>
                ))}
              </ul>
              {w.sentence !== undefined ? (
                <p className="text-body text-stone-900" data-winner-sentence="">
                  {w.sentence}
                </p>
              ) : null}
            </div>
          ) : null}
          {w.grade !== undefined || w.notes.length > 0 ? (
            <div className="flex flex-col gap-1" data-winner-grade="">
              {w.grade !== undefined ? (
                <p className="flex items-center gap-2 text-body font-semibold text-stone-900">
                  <GradeGlyph state={w.grade.signal} />
                  {w.grade.word}
                </p>
              ) : null}
              {w.notes.map((n) => (
                <p key={n} className="text-label text-stone-600">
                  {n}
                </p>
              ))}
            </div>
          ) : null}
          {w.withheld !== undefined ? (
            <section className="flex flex-col gap-1 border-l-4 border-plum bg-stone-100 px-3 py-2" data-winner-withheld="">
              <h4 className="text-label font-semibold text-stone-900">{w.withheld.heading}</h4>
              {w.withheld.reasons.map((r) => (
                <p key={r} className="text-label text-stone-900">
                  {r}
                </p>
              ))}
              <p className="text-label text-stone-600">{w.withheld.coupling}</p>
            </section>
          ) : null}
          {w.runnerUp !== undefined ? (
            <details className="text-label text-stone-900" data-winner-runner-up="">
              <summary className="cursor-pointer text-blue-ink underline-offset-4 hover:underline">{w.runnerUp.summary}</summary>
              <p className="pt-2">{w.runnerUp.why}</p>
            </details>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-3 laptop:w-64" data-winner-actions="">
          {w.keep !== undefined && onKeep !== undefined ? (
            <>
              <Button onClick={onKeep} aria-describedby={keepHintId} data-keep="">
                {w.keep.label}
              </Button>
              <p id={keepHintId} className="text-label text-stone-600">
                {w.keep.hint}
              </p>
            </>
          ) : null}
          {w.status !== undefined ? (
            <p className="flex items-start gap-2 text-label font-semibold text-stone-900" data-keep-status={w.status.kind}>
              {w.status.kind === 'saved' ? <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" /> : null}
              {w.status.words}
            </p>
          ) : null}
          {w.refused !== undefined ? (
            <section role="alert" className="flex flex-col gap-1" data-keep-refused="">
              <h4 className="text-label font-semibold text-stone-900">{w.refused.heading}</h4>
              <p className="text-label text-stone-600">{w.refused.body}</p>
            </section>
          ) : null}
          {w.tryIt !== undefined && onTry !== undefined ? (
            <Button variant="secondary" onClick={onTry} data-try="">
              {w.tryIt.label}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function StrategiesPanel({ view, caveat, onPickGoal, onBracket, onFind, onRepick, onKeep, onTry, announce }: StrategiesPanelProps) {
  // The solve starting, and a refusal landing (synchronously, never through Calculating), are spoken once each, on the
  // change; Keep's write starting too. Nothing is spoken on the first render (a page arriving is not a change).
  const calculating = view.calculating !== undefined
  const steer = view.ask?.steer?.words
  const saving = view.winner?.status?.kind === 'saving'
  const prev = useRef({ calculating, steer, saving })
  useEffect(() => {
    const was = prev.current
    prev.current = { calculating, steer, saving }
    if (calculating && !was.calculating && view.calculating !== undefined) announce(view.calculating.sentence)
    if (steer !== undefined && steer !== was.steer) announce(steer)
    if (saving && !was.saving && view.winner?.status !== undefined) announce(view.winner.status.words)
  }, [calculating, steer, saving, view, announce])

  return (
    <div className="flex flex-col gap-6" data-strategies="solve">
      <h2 className="text-center text-chart-title font-regular text-plum">{view.title}</h2>
      {view.record !== undefined && view.winner === undefined ? <Record face={view.record} /> : null}
      {view.notice !== undefined ? <Notice notice={view.notice} /> : null}
      {view.calculating !== undefined ? (
        <section aria-busy="true" className="flex flex-col items-center gap-4 px-4 py-16 text-center" data-calculating="">
          <p className="max-w-2xl text-chart-title font-semibold text-stone-900">{view.calculating.sentence}</p>
          <p className="flex items-center gap-2 text-body text-stone-900">
            <LoaderCircle size={18} strokeWidth={1.5} aria-hidden="true" className="motion-safe:animate-spin" />
            {view.calculating.label}
          </p>
        </section>
      ) : null}
      {view.winner !== undefined ? <Winner w={view.winner} {...(onKeep !== undefined ? { onKeep } : {})} {...(onTry !== undefined ? { onTry } : {})} /> : null}
      {view.winner?.list !== undefined ? <List list={view.winner.list} /> : null}
      {view.record !== undefined && view.winner !== undefined ? <Record face={view.record} /> : null}
      {view.repick !== undefined ? (
        <div className="flex justify-center">
          <Button variant="neutral" size="sm" onClick={onRepick} data-repick="">
            {view.repick.label}
          </Button>
        </div>
      ) : null}
      {view.ask !== undefined ? <Ask ask={view.ask} onPickGoal={onPickGoal} onBracket={onBracket} onFind={onFind} announce={announce} /> : null}
      {view.disclosures.length > 0 ? (
        <ul className="flex flex-col gap-2 text-label text-stone-600" data-disclosures="">
          {view.disclosures.map((d) => (
            <li key={d.id} data-disclosure={d.id}>
              {d.text}
            </li>
          ))}
        </ul>
      ) : null}
      {view.footnotes.length > 0 ? (
        <div className="flex flex-col gap-1" data-footnotes="">
          {view.footnotes.map((n) => (
            <p key={n} className="text-label text-stone-600">
              {n}
            </p>
          ))}
        </div>
      ) : null}
      {caveat}
    </div>
  )
}
