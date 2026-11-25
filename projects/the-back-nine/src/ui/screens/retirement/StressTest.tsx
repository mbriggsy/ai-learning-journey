/**
 * src/ui/screens/retirement/StressTest.tsx: Retirement → Stress Test, the page (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC11; ref 2.13; `rc-analysis/FRAME_stress-test-full-page-hover-tooltip.png`,
 * `stress-test-action-items__cleanshot-2024-08-06-at-10-48-54-2x.png`, `FRAME_stress-test-loading-after-refresh.png`).
 * Draws `stressView.ts`'s views and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title and intro; one panel with no folder tabs; the chart's title centred, the
 * stop year line under it on a working plan, then the bars across the panel, the stopgap and the notes under them, and
 * the R13 caveat closing the panel. The ACTION ITEMS handle opens the tray: a sentence, a slider and its size per stress
 * (RightCapital's two columns), Edit (which stresses run) and Refresh. Nothing runs until Refresh; a run fades the chart
 * under "Loading…" with its counts kept. The chart rides Highcharts' lazy chunk.
 */
import { lazy, Suspense, useState, type Ref } from 'react'
import { Undo2 } from 'lucide-react'
import type { StressId } from '@intake/stress'
import { Button, Caveat, Checkbox, Drawer, DrawerFields, LoadingVeil, PageFrame, Slider, Tray, useWide } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import type { StressSettings } from '../../workbench/useStress'
import type { StressPageView, StressTrayView } from './stressView'

const StressBars = lazy(() => import('@viz/charts/StressBars').then((m) => ({ default: m.StressBars })))

/** The chart's height in CSS px at his window (the chart, its notes and the caveat hold the first frame) and on the
 *  phone (a scrolling page: the bars stand taller so two-line counts and names stay apart). */
export const STRESS_CHART_HEIGHT = 230
export const STRESS_PHONE_HEIGHT = 320

const TRAY_ID = 'b9-stress-items'

export interface StressTestProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: StressPageView
  /** The tray's view; absent where the page has no bars (no handle then). */
  readonly tray?: StressTrayView
  readonly pending: StressSettings
  readonly onPending: (next: StressSettings) => void
  readonly onRefresh: () => void
  readonly onReset: () => void
  readonly caveat: readonly string[]
  readonly trayOpen: boolean
  readonly onTrayOpen: (open: boolean) => void
}

function Bars({ view }: { readonly view: Extract<StressPageView, { kind: 'bars' }> }) {
  const wide = useWide()
  return (
    <div className="flex flex-col gap-3 compact:gap-2" data-stress="">
      <div className="flex flex-col items-center gap-0.5">
        <h2 className="text-center text-chart-title font-regular text-plum">{view.title}</h2>
        {view.readsAt.map((l) => (
          <p key={l} className="text-center text-label text-stone-600" data-stress-reads-at="">
            {l}
          </p>
        ))}
      </div>
      <LoadingVeil loading={view.loading} label={copy.probabilityLoading}>
        <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-stress-chart="">
          <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
            <Suspense fallback={<div aria-hidden="true" className={wide ? 'h-57' : 'h-80'} />}>
              <StressBars
                chartId="stress"
                bars={view.bars}
                axisTitle={view.axisTitle}
                words={{ ...chartWords(view.title), description: view.description }}
                height={wide ? STRESS_CHART_HEIGHT : STRESS_PHONE_HEIGHT}
                narrow={!wide}
              />
            </Suspense>
          </ChartBoundary>
        </div>
      </LoadingVeil>
      {/* Two columns at his window (a note never splits), so the chart, its notes and the caveat hold one frame. */}
      <div className="laptop:columns-2 laptop:gap-x-10" data-stress-notes="">
        {view.notes.map((l) => (
          <p key={l} className="mb-1 break-inside-avoid text-label text-stone-600" data-stress-note="">
            {l}
          </p>
        ))}
      </div>
    </div>
  )
}

function EditDrawer({ open, onOpenChange, tray, pending, onSave }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly tray: StressTrayView; readonly pending: StressSettings; readonly onSave: (on: StressSettings['on']) => void }) {
  const [draft, setDraft] = useState<StressSettings['on']>(pending.on)
  // Each opening starts from the stresses on now.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(pending.on)
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={copy.stressEditTitle} closeLabel={copy.trayClose} cancelLabel={copy.trayCancel} saveLabel={copy.traySave} onSave={() => onSave(draft)}>
      <div className="flex flex-col gap-6" data-stress-edit="">
        <DrawerFields>
          <fieldset className="flex flex-col gap-2">
            <legend className="pb-2 text-body font-semibold text-stone-900">{copy.stressEditSection}</legend>
            {tray.edit.map((item) => (
              <Checkbox key={item.id} label={item.label} checked={draft[item.id]} onCheckedChange={(c) => setDraft({ ...draft, [item.id]: c })} />
            ))}
          </fieldset>
        </DrawerFields>
        <p className="text-label text-stone-600">{copy.stressEditNote}</p>
      </div>
    </Drawer>
  )
}

/** Each row's size cell is one fixed width (7rem: the widest size either slider prints, "200% higher", with room), so every
 *  slider's track starts and ends at the same place, whatever its size reads (the orchestrator's RC11 look). */
function TrayBody({ tray, pending, onPending }: { readonly tray: StressTrayView; readonly pending: StressSettings; readonly onPending: (next: StressSettings) => void }) {
  const setPct = (id: 'social-security' | 'out-of-pocket', pct: number) => onPending({ ...pending, pct: { ...pending.pct, [id]: pct } })
  return (
    <>
      {tray.rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(0,1fr)_7rem] content-start items-center gap-x-4 gap-y-2 border-b border-stone-300 py-3 wide:grid-cols-[minmax(0,1fr)_9rem_7rem]"
          data-tray-row={row.id}
        >
          <span className="col-span-full min-w-0 break-words text-body text-stone-900 wide:col-span-1">{row.label}</span>
          {'slider' in row ? (
            <Slider label={row.label} value={row.slider.value} min={row.slider.min} max={row.slider.max} step={row.slider.step} onValueChange={(v) => setPct(row.id, v)} className="w-full" />
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="text-right text-body text-stone-900 tabular-nums" data-stress-size="">
            {row.value}
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-1 laptop:col-span-2" data-stress-tray-notes="">
        <p className="text-label text-stone-600">{tray.note}</p>
        {tray.refusals.map((l) => (
          <p key={l} className="text-label text-stone-600" data-stress-refusal="">
            {l}
          </p>
        ))}
      </div>
    </>
  )
}

export function StressTest({ headingRef, view, tray, pending, onPending, onRefresh, onReset, caveat, trayOpen, onTrayOpen }: StressTestProps) {
  const [editOpen, setEditOpen] = useState(false)
  const bars = view.kind === 'bars'
  const footer =
    tray !== undefined ? (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="min-w-0 flex-1 basis-64 text-label text-stone-600" data-tray-words="">
          {tray.pendingDiffers ? copy.trayPending : ''}
        </p>
        <Button variant="quiet" icon={<Undo2 size={18} strokeWidth={1.5} aria-hidden="true" />} onClick={onReset}>
          {copy.trayReset}
        </Button>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          {copy.trayEdit}
        </Button>
        <Button variant="primary" onClick={onRefresh} data-tray-refresh="">
          {copy.trayRefresh}
        </Button>
      </div>
    ) : undefined
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="stress-test">
      <PageFrame
        title={copy.shellPageStressTest}
        headingRef={headingRef}
        intro={copy.stressIntro}
        caveat={<Caveat lines={caveat} />}
        {...(bars && tray !== undefined
          ? {
              handle: { label: copy.trayHandle, open: trayOpen, onOpenChange: onTrayOpen, controls: TRAY_ID },
              tray: (
                <Tray id={TRAY_ID} open={trayOpen} onOpenChange={onTrayOpen} title={copy.trayHandle} closeLabel={copy.trayClose} footer={footer}>
                  <TrayBody tray={tray} pending={pending} onPending={onPending} />
                </Tray>
              ),
            }
          : {})}
      >
        {view.kind === 'words' ? (
          <p className="py-12 text-center text-body text-stone-900" data-stress-page="words">
            {view.words}
          </p>
        ) : (
          <Bars view={view} />
        )}
      </PageFrame>
      {tray !== undefined ? (
        <EditDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          tray={tray}
          pending={pending}
          onSave={(on: Readonly<Record<StressId, boolean>>) => onPending({ ...pending, on })}
        />
      ) : null}
    </div>
  )
}
