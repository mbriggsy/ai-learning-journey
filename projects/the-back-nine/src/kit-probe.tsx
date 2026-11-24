/*
 * src/kit-probe.tsx: Act 6's stack probe (plan docs/plans/6-rightcapital-ui-plan.md, section 2.3). A second build entry
 * (`kit-probe.html`), so the production `dist/` holds it and no app code path does. It mounts every new library once
 * under the real CSP header: a Base UI Dialog shaped as the right drawer, a Select, a ScrollArea, a Toast and a Slider,
 * all under `CSPProvider disableStyleElements`; a TanStack table with a grouped header; a lucide icon; and a Highcharts
 * chart in styled mode from the shared default, with the accessibility module, the shared `defs` patterns and the
 * credit on. `e2e/csp.spec.ts` drives each one (and `e2e/design-tokens.spec.ts` reads Figtree here). Deleted at RC19,
 * when every piece renders in a real screen a CSP arm visits.
 *
 * Its words are literals local to the probe (never `copy.ts`, which the entry-chunk guard refuses in any entry's first
 * load; plan 2.1 decision 10). Its chart data are throwaway figures.
 */
import './ui/styles/layers.css'
import '@fontsource-variable/figtree/index.css'
import './ui/styles/theme.css'
import './viz/charts/chartTheme.css'
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CSPProvider } from '@base-ui/react/csp-provider'
import { Dialog } from '@base-ui/react/dialog'
import { ScrollArea } from '@base-ui/react/scroll-area'
import { Select } from '@base-ui/react/select'
import { Slider } from '@base-ui/react/slider'
import { Toast } from '@base-ui/react/toast'
import { Chart, Highcharts, type ChartOptions } from '@highcharts/react'
// After the Highcharts master above: the module composes onto the namespace's Chart, Series and Legend, which the
// master fills in when it evaluates (imported first, it reads them undefined and the page dies).
import 'highcharts/es-modules/masters/modules/accessibility.src.js'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { ChevronDown, X } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { installChartDefaults } from '@viz/charts/defaults'
import { applySeriesVars } from '@viz/charts/seriesVars'

/** shadcn's `cn` (clsx + tailwind-merge); the kit's own copy lands in RC2. */
const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

applySeriesVars(document.documentElement.style)
installChartDefaults(Highcharts, window.matchMedia('(prefers-reduced-motion: reduce)').matches)

const portalHost = document.getElementById('rc-portal')

const button = cn(
  'inline-flex h-9 items-center gap-2 rounded-control border border-stone-300 bg-bg px-4 text-body text-stone-900',
  'hover:bg-stone-100',
)
const primary = cn(button, 'border-blue-ink bg-blue-ink text-bg hover:bg-blue-ink')

// ── The drawer (a Base UI Dialog shaped as RightCapital's right-side drawer) ──
function ProbeDrawer() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={primary}>Open the drawer</Dialog.Trigger>
      <Dialog.Portal container={portalHost}>
        <Dialog.Backdrop className="fixed inset-0 bg-stone-900/30 transition-opacity duration-250 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed top-0 right-0 flex h-full w-[min(30rem,100vw)] flex-col bg-bg shadow-drawer',
            'transition-transform duration-250 ease-settle data-ending-style:translate-x-full data-starting-style:translate-x-full',
          )}
        >
          <div className="flex items-center justify-between bg-plum px-6 py-4 text-bg">
            <Dialog.Title className="text-chart-title">Drawer</Dialog.Title>
            <Dialog.Close className="rounded-control p-1" aria-label="Close the drawer">
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="p-6 text-intro text-stone-600">
            A right-side drawer: every fact is edited in one of these.
          </Dialog.Description>
          <div className="mt-auto flex justify-end gap-3 bg-stone-200 px-6 py-4">
            <Dialog.Close className={button}>Cancel</Dialog.Close>
            <Dialog.Close className={primary}>Save</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── A Select ──
const UNITS = [
  { label: 'Ages', value: 'ages' },
  { label: 'Years', value: 'years' },
]

function ProbeSelect() {
  return (
    <Select.Root items={UNITS} defaultValue="ages">
      <Select.Label className="text-label text-stone-600">Axis</Select.Label>
      <Select.Trigger className={cn(button, 'min-w-40 justify-between')}>
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalHost}>
        <Select.Positioner sideOffset={4} className="z-10">
          <Select.Popup className="rounded-control border border-stone-300 bg-bg py-1 shadow-menu">
            <Select.List>
              {UNITS.map(({ label, value }) => (
                <Select.Item
                  key={value}
                  value={value}
                  className="cursor-default px-4 py-2 text-body data-highlighted:bg-stone-100"
                >
                  <Select.ItemText>{label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

// ── A ScrollArea ──
const LINES = Array.from({ length: 24 }, (_, i) => `Line ${i + 1}`)

function ProbeScrollArea() {
  return (
    <ScrollArea.Root className="relative h-32 w-64 border border-stone-300">
      <ScrollArea.Viewport className="h-full" data-probe="scroll-viewport">
        <ScrollArea.Content>
          <ul className="p-3 text-body">
            {LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="m-1 flex w-1.5 justify-center rounded-control bg-stone-200">
        <ScrollArea.Thumb className="w-full rounded-control bg-stone-400" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}

// ── A Toast ──
function ToastButton() {
  const toasts = Toast.useToastManager()
  return (
    <button type="button" className={button} onClick={() => toasts.add({ title: 'Saved', description: 'Your plan is saved on this device.' })}>
      Show a toast
    </button>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="rounded-control border border-stone-300 bg-bg p-4 shadow-menu transition-opacity duration-250 data-ending-style:opacity-0 data-starting-style:opacity-0"
    >
      <Toast.Title className="text-body font-semibold" />
      <Toast.Description className="text-label text-stone-600" />
      <Toast.Close className="mt-2 text-label text-blue-ink underline">Dismiss</Toast.Close>
    </Toast.Root>
  ))
}

// ── A Slider ──
function ProbeSlider() {
  const [value, setValue] = useState(50)
  return (
    <Slider.Root value={value} onValueChange={(v) => setValue(Array.isArray(v) ? (v[0] ?? 0) : v)} className="w-64">
      <Slider.Label className="text-label text-stone-600">Spending change</Slider.Label>
      <Slider.Value className="ml-2 text-label text-stone-900" />
      <Slider.Control className="flex h-6 items-center">
        <Slider.Track className="h-1 w-full rounded-control bg-stone-300">
          <Slider.Indicator className="rounded-control bg-blue" />
          <Slider.Thumb className="size-4 rounded-full border-2 border-bg bg-blue shadow-tooltip" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}

// ── A TanStack table with a grouped header ──
interface ProbeRow {
  readonly year: number
  readonly age: number
  readonly socialSecurity: number
  readonly pension: number
  readonly living: number
  readonly tax: number
}

const ROWS: readonly ProbeRow[] = [
  { year: 2031, age: 66, socialSecurity: 31_000, pension: 9_000, living: 70_000, tax: 6_000 },
  { year: 2032, age: 67, socialSecurity: 31_500, pension: 9_000, living: 71_000, tax: 6_100 },
  { year: 2033, age: 68, socialSecurity: 32_000, pension: 9_000, living: 72_500, tax: 6_300 },
  { year: 2034, age: 69, socialSecurity: 32_500, pension: 9_000, living: 74_000, tax: 6_400 },
]

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, ProbeRow>()
const whole = (n: number): string => n.toLocaleString('en-US')
const columns = helper.columns([
  helper.accessor('year', { header: 'Year' }),
  helper.accessor('age', { header: 'Age' }),
  helper.group({
    id: 'income',
    header: 'Income',
    columns: helper.columns([
      helper.accessor('socialSecurity', { header: 'Social Security', cell: (c) => whole(c.getValue()) }),
      helper.accessor('pension', { header: 'Pension', cell: (c) => whole(c.getValue()) }),
    ]),
  }),
  helper.group({
    id: 'spending',
    header: 'Spending',
    columns: helper.columns([
      helper.accessor('living', { header: 'Living', cell: (c) => whole(c.getValue()) }),
      helper.accessor('tax', { header: 'Tax', cell: (c) => whole(c.getValue()) }),
    ]),
  }),
])

function ProbeTable() {
  const data = useMemo(() => [...ROWS], [])
  const table = useTable({ features, columns, data })
  return (
    <table className="border-t-2 border-plum text-body" data-probe="table">
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th
                key={header.id}
                colSpan={header.colSpan}
                className="border-b border-stone-300 bg-stone-200 px-3 py-2 text-left text-label font-regular text-stone-600"
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="even:bg-stone-50">
            {row.getAllCells().map((cell) => (
              <td key={cell.id} className="px-3 py-2 text-right">
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── A Highcharts chart in styled mode ──
const CHART: ChartOptions = {
  chart: { type: 'column', height: 320 },
  title: { text: 'Probe chart' },
  xAxis: { categories: ['2031', '2032', '2033', '2034'] },
  yAxis: { title: { text: 'Dollars' }, min: 0 },
  plotOptions: { column: { dataLabels: { enabled: true } } },
  accessibility: { description: 'Two throwaway series, one solid and one hatched, over four years.' },
  series: [
    { type: 'column', name: 'Solid series', data: [40, 42, 45, 47] },
    { type: 'column', name: 'Hatched series', className: 'b9-hatch', data: [38, 41, 44, 48] },
  ],
}

function ProbeChart() {
  // The hatch's ink is the hatched series' own colour (slot 1).
  return <Chart options={CHART} containerProps={{ className: '[--b9-pattern-ink:var(--highcharts-color-1)]' }} />
}

function KitProbe() {
  return (
    <CSPProvider disableStyleElements>
      <Toast.Provider>
        <main className="rc-root min-h-screen bg-bg p-panel">
          <h1 className="mb-6 text-page-title text-plum">Kit probe</h1>
          <div className="flex flex-wrap items-start gap-gap">
            <ProbeDrawer />
            <ProbeSelect />
            <ToastButton />
            <ProbeSlider />
          </div>
          <div className="mt-6 flex flex-wrap items-start gap-gap">
            <ProbeScrollArea />
            <ProbeTable />
          </div>
          <div className="mt-6 max-w-[48rem]">
            <ProbeChart />
          </div>
        </main>
        <Toast.Portal container={portalHost}>
          <Toast.Viewport className="fixed right-4 bottom-4 flex w-80 flex-col gap-2">
            <ToastList />
          </Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
    </CSPProvider>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')
createRoot(rootEl).render(
  <StrictMode>
    <KitProbe />
  </StrictMode>,
)
