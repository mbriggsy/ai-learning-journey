/**
 * src/ui/screens/dashboard/Snapshot.tsx: Dashboard → Snapshot, the home (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC3; ref 2.1; `rc-shell/planoverview-03.png`). Draws `snapshotView.ts`'s view and decides nothing.
 *
 * LAYOUT: a white page, the title, then white 12 px cards in a fixed order (no Add Item, no drag in this act). On a
 * laptop: the ring card and the two stat rings on top, the fan and Invested accounts under them, Recommendations across
 * the foot. Below the 68rem seam it is one column in the DOM's order (ring, stat rings, Invested accounts, fan,
 * Recommendations). A scrolling page: its first frame
 * at his window holds the title, the ring card and the stat rings (the fit decision, plan 4.0), and the R13 caveat sits
 * in the ring card, the answer's own card, named by the reading through `aria-describedby`.
 */
import { lazy, Suspense, type Ref } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button, Card, Caveat, Ring, TickDial } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { copy } from '../../copy'
import type { SnapshotView, StatFigure } from './snapshotView'

/** Where each card's "open" link goes, wired by the shell (absent: no link). */
export interface SnapshotDoors {
  readonly analysis?: { readonly href: string; readonly onOpen: () => void }
  readonly cashFlows?: { readonly href: string; readonly onOpen: () => void }
  readonly facts?: { readonly href: string; readonly onOpen: () => void }
}

export interface SnapshotProps {
  readonly view: SnapshotView
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly doors: SnapshotDoors
  /** The answer page, where a recommendation is found today (the shell's wordmark move). */
  readonly onHome: () => void
  /** Keep this recommendation (present only where the view offers it). */
  readonly onKeep?: () => void
  /** Try it in the plan: the Analysis page with the recommendation (present only where the view offers it). */
  readonly onTry?: () => void
}

const FAN_HEIGHT = 300

// Highcharts rides its own chunk, loaded when a fan first draws: the shell's other pages never pay for it, and a page
// with no fan to draw (a pending answer, a $0 portfolio) never evaluates it.
const FanChart = lazy(() => import('@viz/charts/FanChart').then((m) => ({ default: m.FanChart })))

function OpenLink({ door, words }: { readonly door: { readonly href: string; readonly onOpen: () => void } | undefined; readonly words: string }) {
  if (door === undefined) return null
  return (
    <a
      href={door.href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        door.onOpen()
      }}
      className="inline-flex shrink-0 items-center gap-1 text-label text-blue-ink underline-offset-2 hover:underline"
    >
      {words}
      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}

function Stat({ stat, words }: { readonly stat: StatFigure; readonly words?: string }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-card border border-stone-300 bg-bg p-6 text-center" data-stat="">
      <TickDial value={stat.value ?? ''} caption={stat.short} />
      <p className="text-label text-stone-900">{stat.label}</p>
      {stat.note !== undefined ? <p className="text-label text-stone-600">{stat.note}</p> : null}
      {words !== undefined ? <p className="text-label text-stone-600">{words}</p> : null}
    </section>
  )
}

export function Snapshot({ view, headingRef, doors, onHome, onKeep, onTry }: SnapshotProps) {
  const { ring, stats, invested, fan, rec } = view
  const r = ring.view
  return (
    <div className="rc-root flex w-full flex-1 flex-col bg-bg">
    <div className="mx-auto flex w-full max-w-[90rem] flex-col px-4 py-6 wide:px-10 wide:py-10 compact:py-5" data-screen="snapshot">
      <header className="mb-6 compact:mb-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-page-title text-plum outline-none compact:text-step-title">
          {copy.shellPageSnapshot}
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-6 laptop:grid-cols-2">
        {/* The ring card: the answer's own card, the R13 caveat inside it. */}
        <Card title={ring.title} action={<OpenLink door={doors.analysis} words={copy.snapshotRingOpen} />} className="laptop:col-start-1 laptop:row-start-1" name="ring">
          <div className="flex flex-col items-center gap-4 text-center" data-ring-card="">
            {r.kind === 'reading' || r.kind === 'no-reading' ? (
              <>
                {r.eyebrow !== undefined ? <p className="text-label text-stone-600">{r.eyebrow}</p> : null}
                {r.lead !== undefined ? <p className="text-intro text-stone-900">{r.lead}</p> : null}
                <div role="group" aria-label={ring.title} aria-describedby={verdictDescribedBy()} data-ring-reading="">
                  <Ring
                    value={r.kind === 'reading' ? r.face.arc : undefined}
                    {...(r.kind === 'reading' && r.face.centre !== undefined ? { centre: r.face.centre } : {})}
                    caption={r.kind === 'reading' ? r.face.caption : copy.snapshotRingNoReading}
                  />
                </div>
              </>
            ) : null}
            {r.kind === 'pending' ? <Ring value={undefined} caption={copy.workbenchPinnedWorking} /> : null}
            {r.kind === 'compute-error' ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-body text-stone-900">{copy.answerError}</p>
                <Button variant="secondary" onClick={r.onRetry}>
                  {copy.answerRetry}
                </Button>
              </div>
            ) : null}
            {r.kind === 'fallback' && ring.missing !== undefined ? (
              <div className="flex flex-col gap-2 py-8 text-left">
                <p className="text-body font-semibold text-stone-900">{ring.missing.lead}</p>
                {ring.missing.lines.map((line) => (
                  <p key={line} className="text-label text-stone-600">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {ring.stateClause !== null ? <p className="text-label text-stone-600">{ring.stateClause}</p> : null}
          </div>
          <Caveat lines={view.caveat} />
        </Card>

        {/* The two stat rings, side by side on top of the right column. */}
        <div className="grid grid-cols-1 content-start gap-6 wide:grid-cols-2 laptop:col-start-2 laptop:row-start-1" data-card="stats">
          <Stat stat={stats.rate} {...(stats.kind === 'words' ? { words: stats.words } : {})} />
          <Stat stat={stats.tax} {...(stats.kind === 'words' ? { words: stats.words } : {})} />
          <div className="flex justify-end wide:col-span-2">
            <OpenLink door={doors.cashFlows} words={copy.snapshotStatOpen} />
          </div>
        </div>

        <Card title={invested.title} action={<OpenLink door={doors.facts} words={copy.snapshotInvestedOpen} />} className="laptop:col-start-2 laptop:row-start-2" name="invested">
          <dl className="flex flex-col">
            {invested.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-1.5 text-body text-stone-900">
                <dt>{row.label}</dt>
                <dd className="tabular-nums">{row.value}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-4 border-t border-stone-300 pt-2 text-body font-semibold text-stone-900">
              <dt>{invested.total.label}</dt>
              <dd className="tabular-nums">{invested.total.value}</dd>
            </div>
          </dl>
          <p className="text-label text-stone-600">{invested.asEntered}</p>
          <p className="text-label text-stone-600">{invested.stopgap}</p>
        </Card>

        <Card title={fan.title} action={<OpenLink door={doors.analysis} words={copy.snapshotRingOpen} />} className="laptop:col-start-1 laptop:row-start-2" name="fan">
          {fan.view.kind === 'chart' ? <p className="text-label text-stone-600">{fan.valuesLine}</p> : null}
          {fan.view.kind === 'chart' ? (
            <div className="min-w-0" data-fan="">
              <Suspense fallback={<div className="h-75" aria-hidden="true" />}>
                <FanChart fan={fan.view.fan} moments={fan.view.moments} labels={fan.view.labels} height={FAN_HEIGHT} />
              </Suspense>
            </div>
          ) : (
            <p className="py-8 text-body text-stone-600">{fan.view.words}</p>
          )}
        </Card>

        <Card title={rec.title} className="laptop:col-span-2" name="recommendations">
          <RecBody view={rec.view} onHome={onHome} {...(onKeep !== undefined ? { onKeep } : {})} {...(onTry !== undefined ? { onTry } : {})} />
        </Card>
      </div>
    </div>
    </div>
  )
}

function RecBody({
  view,
  onHome,
  onKeep,
  onTry,
}: {
  readonly view: SnapshotView['rec']['view']
  readonly onHome: () => void
  readonly onKeep?: () => void
  readonly onTry?: () => void
}) {
  switch (view.kind) {
    case 'working-route':
    case 'pending':
    case 'unavailable':
      return <p className="text-body text-stone-900">{view.words}</p>
    case 'none':
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body text-stone-900">{view.words}</p>
          <Button variant="secondary" size="sm" onClick={onHome}>
            {view.findOne}
          </Button>
        </div>
      )
    case 'stale':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold text-stone-900">{view.heading}</p>
          <p className="text-body text-stone-900">{view.body}</p>
        </div>
      )
    case 'held':
      return (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold text-stone-900">{view.heading}</p>
          {view.reasons.map((reason) => (
            <p key={reason} className="text-label text-stone-600">
              {reason}
            </p>
          ))}
        </div>
      )
    case 'recommended':
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body font-semibold text-stone-900">{view.strategy}</p>
          <p className="text-body text-stone-900">{view.hero}</p>
          {view.grade !== undefined ? <p className="text-label text-stone-600">{view.grade}</p> : null}
          {view.status !== undefined ? <p className="text-label font-semibold text-stone-900">{view.status}</p> : null}
          {view.refused !== undefined ? (
            <div role="alert" className="flex flex-col gap-1">
              <p className="text-label font-semibold text-stone-900">{view.refused.heading}</p>
              <p className="text-label text-stone-600">{view.refused.body}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {view.keep !== undefined && onKeep !== undefined ? (
              <Button size="sm" onClick={onKeep}>
                {view.keep.label}
              </Button>
            ) : null}
            {view.tryIt !== undefined && onTry !== undefined ? (
              <Button variant="secondary" size="sm" onClick={onTry}>
                {view.tryIt.label}
              </Button>
            ) : null}
          </div>
        </div>
      )
    case 'record':
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-body font-semibold text-stone-900">{view.heading}</p>
          {view.supersededMark !== undefined ? <p className="text-label font-semibold text-stone-900">{view.supersededMark}</p> : null}
          {view.standing.clauses.map((clause) => (
            <p key={clause} className="text-label text-stone-600">
              {clause}
            </p>
          ))}
          {view.savedIn !== undefined ? <p className="text-label text-stone-600">{view.savedIn}</p> : null}
          {view.tryIt !== undefined && onTry !== undefined ? (
            <Button variant="secondary" size="sm" onClick={onTry}>
              {view.tryIt.label}
            </Button>
          ) : null}
        </div>
      )
  }
}
