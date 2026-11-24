/*
 * src/kit-probe.tsx: Act 6's kit probe (plan docs/plans/6-rightcapital-ui-plan.md, sections 2.3 and 3.1). A second build
 * entry (`kit-probe.html`), so the production `dist/` holds it and no app code path does. RC1 mounted each new library
 * once under the real CSP header; from RC2 it renders the KIT (`src/ui/kit`) as a page would use it: the sub-nav, a
 * page frame with folder tabs, a chart title menu, a picker, the ring, a Highcharts chart in styled mode (the shared
 * default, the accessibility module, the `defs` patterns, the credit), the key-metric column with a stat dial and the
 * loading veil, the switch, the caveat line, the ACTION ITEMS handle and its tray; then the rest of the kit: every
 * button, the Add menu with its flyouts, the drawer, an info tooltip, a toast, a scroll area, the data table, the cards,
 * the stale banner and the empty state. `e2e/csp.spec.ts` opens each part that portals or animates under the enforced
 * header, and `e2e/design-tokens.spec.ts` reads Figtree here. Deleted at RC19, when every piece renders in a real
 * screen a CSP arm visits.
 *
 * Its words are literals local to the probe (never `copy.ts`, which the entry-chunk guard refuses in any entry's first
 * load; plan 2.1 decision 10). Every figure on it is a throwaway: no household's numbers.
 */
import './ui/styles/layers.css'
import '@fontsource-variable/figtree/index.css'
import './ui/styles/theme.css'
import './viz/charts/chartTheme.css'
import { StrictMode, useId, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CSPProvider } from '@base-ui/react/csp-provider'
import { Chart, Highcharts, type ChartOptions } from '@highcharts/react'
// After the Highcharts master above: the module composes onto the namespace's Chart, Series and Legend, which the
// master fills in when it evaluates (imported first, it reads them undefined and the page dies).
import 'highcharts/es-modules/masters/modules/accessibility.src.js'
import { Banknote, Landmark, PiggyBank } from 'lucide-react'
import {
  AddMenu,
  Button,
  BUTTON_VARIANTS,
  Card,
  Caveat,
  ChartTitle,
  Checkbox,
  DataTable,
  Drawer,
  DrawerFields,
  EmptyState,
  InfoTip,
  LoadingVeil,
  MoneyInput,
  PageFrame,
  PercentInput,
  ProfileCard,
  Ring,
  ScrollArea,
  Select,
  Slider,
  StaleBanner,
  SubNav,
  Switch,
  TickDial,
  ToastProvider,
  Tray,
  TrayColumn,
  TrayFooter,
  TrayRow,
  TraySection,
  useToast,
  type DataTableColumn,
} from '@ui/kit'
import { installChartDefaults } from '@viz/charts/defaults'
import { applySeriesVars } from '@viz/charts/seriesVars'

applySeriesVars(document.documentElement.style)
installChartDefaults(Highcharts, window.matchMedia('(prefers-reduced-motion: reduce)').matches)

// ── The page's own state, so each control visibly does something ──
type Axis = 'ages' | 'years'
const AXES = [
  { value: 'ages', label: 'Ages' },
  { value: 'years', label: 'Years' },
] as const

type Tab = 'probability' | 'confidence' | 'comparisons'
const TABS = [
  { id: 'probability', label: 'Probability' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'comparisons', label: 'Comparisons' },
] as const

type ChartId = 'savings' | 'income'
const CHARTS = [
  { id: 'savings', label: 'Savings over time' },
  { id: 'income', label: 'Income sources' },
] as const

type Page = 'analysis' | 'stress' | 'social' | 'health' | 'cash'
const PAGES = [
  { id: 'analysis', label: 'Analysis', href: '#analysis' },
  { id: 'stress', label: 'Stress Test', href: '#stress' },
  { id: 'social', label: 'Social Security', href: '#social' },
  { id: 'health', label: 'Health Care', href: '#health' },
  { id: 'cash', label: 'Cash Flows', href: '#cash' },
] as const

type Order = 'pro-rata' | 'taxable-first'
const ORDERS = [
  { value: 'pro-rata', label: 'A share from each' },
  { value: 'taxable-first', label: 'Taxable first' },
] as const

// ── A Highcharts chart in styled mode (RC1's cascade check reads it) ──
const CHART: ChartOptions = {
  chart: { type: 'column', height: 300 },
  title: { text: undefined },
  xAxis: { categories: ['2031', '2032', '2033', '2034'] },
  yAxis: { title: { text: 'Dollars' }, min: 0 },
  plotOptions: { column: { dataLabels: { enabled: true } } },
  accessibility: { description: 'Three throwaway series, one solid, one hatched and one dotted, over four years.' },
  series: [
    { type: 'column', name: 'Solid series', data: [40, 42, 45, 47] },
    { type: 'column', name: 'Hatched series', className: 'b9-hatch', data: [38, 41, 44, 48] },
    // RC3 (owed from RC1): a second patterned series in the same chart, so the cascade arm reads two inks.
    { type: 'column', name: 'Dotted series', className: 'b9-dots', data: [30, 33, 35, 39] },
  ],
}

function ProbeChart() {
  // Each pattern kind's ink is its own series' colour: the hatch slot 1's, the dots slot 2's (chartTheme.css).
  return <Chart options={CHART} containerProps={{ className: '[--b9-ink-hatch:var(--highcharts-color-1)] [--b9-ink-dots:var(--highcharts-color-2)]' }} />
}

// ── The data table: lead Year and Age, two groups, a drill header, a negative ──
interface ProbeRow {
  readonly year: number
  readonly ages: string
  readonly socialSecurity: number
  readonly pension: number
  readonly living: number
  readonly tax: number
}

const ROWS: readonly ProbeRow[] = [
  { year: 2031, ages: '66/64', socialSecurity: 31_000, pension: 9_000, living: 70_000, tax: 6_000 },
  { year: 2032, ages: '67/65', socialSecurity: 31_500, pension: 9_000, living: 71_000, tax: 6_100 },
  { year: 2033, ages: '68/66', socialSecurity: 32_000, pension: 9_000, living: 72_500, tax: 6_300 },
  { year: 2034, ages: '69/67', socialSecurity: 32_500, pension: 9_000, living: 74_000, tax: 6_400 },
]

const TABLE_COLUMNS: readonly DataTableColumn<ProbeRow>[] = [
  { id: 'year', header: 'Year', value: (r) => String(r.year), lead: true },
  { id: 'ages', header: 'Age', value: (r) => r.ages, lead: true },
  {
    id: 'income',
    header: 'Income',
    columns: [
      { id: 'socialSecurity', header: 'Social Security', value: (r) => r.socialSecurity, numeric: true, onDrill: () => {} },
      { id: 'pension', header: 'Pension', value: (r) => r.pension, numeric: true },
    ],
  },
  {
    id: 'spending',
    header: 'Spending',
    columns: [
      { id: 'living', header: 'Living expenses', value: (r) => r.living, numeric: true },
      { id: 'tax', header: 'Income tax', value: (r) => r.tax, numeric: true },
    ],
  },
  { id: 'net', header: 'Net flow', value: (r) => r.socialSecurity + r.pension - r.living - r.tax, numeric: true },
]

function ToastButton() {
  const toast = useToast()
  return (
    <Button variant="neutral" onClick={() => toast.show({ title: 'Saved', description: 'Your plan is saved on this device.' })}>
      Show a toast
    </Button>
  )
}

const LINES = Array.from({ length: 24 }, (_, i) => `Line ${i + 1}`)

function KitProbe() {
  const trayId = useId()
  const tableHeading = useId()
  const [page, setPage] = useState<Page>('analysis')
  const [tab, setTab] = useState<Tab>('probability')
  const [chart, setChart] = useState<ChartId>('savings')
  const [axis, setAxis] = useState<Axis>('ages')
  const [spend, setSpend] = useState(50)
  const [future, setFuture] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stopYear, setStopYear] = useState(2031)
  const [monthly, setMonthly] = useState<number | undefined>(6_500)
  const [growth, setGrowth] = useState<number | undefined>(0.025)
  const [order, setOrder] = useState<Order>('pro-rata')
  const [salary, setSalary] = useState<number | undefined>(80_000)
  const [raise, setRaise] = useState<number | undefined>(0.03)
  const [record, setRecord] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [joint, setJoint] = useState(true)
  const [added, setAdded] = useState('Nothing added yet')

  return (
    <ToastProvider dismissLabel="Dismiss">
      <main className="rc-root min-h-screen bg-bg">
        <SubNav label="Retirement pages" items={PAGES} activeId={page} onSelect={setPage} />
        <PageFrame
          title="Kit probe"
          intro="A throwaway page that wears every part of the kit under the real header."
          headAction={
            <AddMenu
              label="Add"
              items={[
                { id: 'bank', label: 'Bank', onSelect: () => setAdded('Added: Bank') },
                { id: 'investment', label: 'Investment', onSelect: () => setAdded('Added: Investment') },
                {
                  id: 'property',
                  label: 'Property',
                  items: [
                    { id: 'home', label: 'Primary home', onSelect: () => setAdded('Added: Primary home') },
                    { id: 'rental', label: 'Rental property', onSelect: () => setAdded('Added: Rental property') },
                  ],
                },
                {
                  id: 'insurance',
                  label: 'Insurance',
                  items: [
                    { id: 'term', label: 'Term life', onSelect: () => setAdded('Added: Term life') },
                    { id: 'whole', label: 'Whole life', onSelect: () => setAdded('Added: Whole life') },
                  ],
                },
              ]}
            />
          }
          tabs={{ label: 'Analysis views', items: TABS, value: tab, onValueChange: setTab }}
          valuesNote="Values in today's dollars, rounded"
          chartTitle={<ChartTitle items={CHARTS} value={chart} onValueChange={setChart} />}
          pickers={<Select label="Axis" hideLabel items={AXES} value={axis} onValueChange={setAxis} />}
          chart={
            <div className="flex flex-col items-center gap-8 wide:flex-row">
              <Ring value={7} centre="7 of 10" caption="On track" />
              <div className="w-full min-w-0 flex-1">
                <ProbeChart />
              </div>
            </div>
          }
          metrics={
            <>
              <div className="flex flex-col text-metric-words text-plum">
                <span>This plan leaves about</span>
                <LoadingVeil loading={loading} label="Loading…">
                  <span className="text-metric text-stone-900">~$412,000</span>
                </LoadingVeil>
                <span>at the end</span>
              </div>
              <div className="flex justify-center">
                <TickDial value="~4.1%" caption="Withdrawal rate" />
              </div>
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setLoading((l) => !l)}>
                  {loading ? 'Show the figure' : 'Show the loading veil'}
                </Button>
              </div>
            </>
          }
          panelFooter={<Switch label="Future dollars" checked={future} onCheckedChange={setFuture} />}
          caveat={
            <Caveat
              lines={[
                'These are throwaway figures on a test page, not a plan.',
                'Nothing here is advice about any real money.',
              ]}
            />
          }
          handle={{ label: 'Action items', open: trayOpen, onOpenChange: setTrayOpen, controls: trayId }}
          tray={
            <Tray
              id={trayId}
              open={trayOpen}
              onOpenChange={setTrayOpen}
              title="Action items"
              closeLabel="Close the action items"
              footer={
                <TrayFooter
                  reset={{ label: 'Reset', onSelect: () => setMonthly(6_500) }}
                  edit={{ label: 'Edit', onSelect: () => {} }}
                  refresh={{ label: 'Refresh', onSelect: () => {} }}
                />
              }
            >
              <TrayColumn editedLabel="This what-if" comparedLabel="Your plan">
                <TraySection title="Financial goals">
                  <TrayRow
                    label="Stop working in"
                    control={
                      <>
                        <Slider label="Stop working in" value={stopYear} min={2028} max={2036} onValueChange={setStopYear} />
                        <span className="w-14 text-body tabular-nums">{stopYear}</span>
                      </>
                    }
                    compared="2031"
                  />
                </TraySection>
                <TraySection title="Expenses">
                  <TrayRow
                    label="Monthly spending in retirement"
                    control={
                      <MoneyInput
                        label="Monthly spending in retirement"
                        hideLabel
                        value={monthly}
                        onCommit={setMonthly}
                        changed={monthly !== 6_500}
                        invalidMessage="Type a dollar figure, like 6,500."
                        className="w-40"
                      />
                    }
                    compared="$6,500"
                  />
                  <TrayRow
                    label="A new car fund"
                    added="Added in this what-if"
                    control={<MoneyInput label="A new car fund" hideLabel value={20_000} invalidMessage="Type a dollar figure." className="w-40" />}
                    compared="None"
                  />
                </TraySection>
              </TrayColumn>
              <TrayColumn editedLabel="This what-if" comparedLabel="Your plan">
                <TraySection title="Strategies">
                  <TrayRow
                    label="Withdrawal order"
                    control={<Select label="Withdrawal order" hideLabel items={ORDERS} value={order} onValueChange={setOrder} changed={order !== 'pro-rata'} />}
                    compared="A share from each"
                  />
                  <TrayRow
                    label="Yearly growth of spending"
                    control={
                      <PercentInput
                        label="Yearly growth of spending"
                        hideLabel
                        value={growth}
                        onCommit={setGrowth}
                        invalidMessage="Type a percent, like 2.5."
                        className="w-28"
                      />
                    }
                    compared="2.5%"
                  />
                </TraySection>
              </TrayColumn>
            </Tray>
          }
        />

        {/* The rest of the kit, on one more frame. */}
        <section className="mx-auto flex w-full max-w-[90rem] flex-col gap-10 px-4 pb-16 wide:px-10">
          <StaleBanner
            message="Your spending changed after this result was made, on a throwaway date. The figures above are from before."
            action={{ label: 'Refresh', onSelect: () => {} }}
          />

          <div className="flex flex-wrap items-center gap-3">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {`A ${variant} button`}
              </Button>
            ))}
            <Button opensMenu>Add an account</Button>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <Drawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              trigger={<Button>Open the drawer</Button>}
              title="Salary"
              icon={<Banknote strokeWidth={1.5} aria-hidden="true" />}
              closeLabel="Close the drawer"
              previous={{ label: 'The previous record', onSelect: () => setRecord((r) => r - 1) }}
              next={{ label: 'The next record', onSelect: () => setRecord((r) => r + 1) }}
              cancelLabel="Cancel"
              saveLabel="Save"
              onSave={() => {}}
              deleteLabel="Delete"
              onDelete={() => {}}
            >
              <DrawerFields>
                <MoneyInput label="Yearly pay" value={salary} onCommit={setSalary} invalidMessage="Type a dollar figure, like 80,000." />
                <PercentInput label="Yearly raise" value={raise} onCommit={setRaise} invalidMessage="Type a percent, like 3." />
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-body text-stone-900">
                    Pay stops
                    <InfoTip label="About when pay stops" content="The year the last paycheck lands." />
                  </span>
                  <span className="flex h-10 items-center rounded-control border border-stone-300 bg-stone-200 px-3 text-body">2031</span>
                </div>
                <p className="text-body text-stone-600" data-probe="record">{`Record ${record} of 3`}</p>
              </DrawerFields>
            </Drawer>
            <ToastButton />
            <Checkbox label="Held jointly" checked={joint} onCheckedChange={setJoint} />
            <span className="flex items-center gap-1 text-body text-stone-900">
              Annual increase
              <InfoTip label="About the annual increase" content="How much the figure grows each year." />
            </span>
            <p className="text-body text-stone-600" data-probe="added">
              {added}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <div className="w-64">
              <Slider label="Spending change" value={spend} min={0} max={100} onValueChange={setSpend} className="w-64" />
              <p className="text-label text-stone-600">{`Spending change: ${spend}`}</p>
            </div>
            <ScrollArea label="Probe lines" className="h-32 w-64 border border-stone-300">
              <ul className="p-3 text-body">
                {LINES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-3" data-probe="table">
            <h2 id={tableHeading} className="text-chart-title text-plum">
              Summary
            </h2>
            <DataTable
              labelledBy={tableHeading}
              columns={TABLE_COLUMNS}
              rows={ROWS}
              rowKey={(r) => String(r.year)}
              download={{ label: 'Download', onDownload: () => {} }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 laptop:grid-cols-3">
            <Card title="Probability of success">
              <div className="flex justify-center">
                <Ring value={0} centre="0 of 10" caption="Already short" />
              </div>
            </Card>
            <Card title="Withdrawal rate">
              <div className="flex justify-center">
                <TickDial value="~4.1%" caption="In the first retired year" />
              </div>
            </Card>
            <Card title="No reading yet">
              <div className="flex justify-center">
                <Ring value={undefined} caption="Waiting for your accounts" />
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-6">
            <ProfileCard kind="Salary" icon={<Banknote strokeWidth={1.5} />} name="Pat's salary" rows={[{ label: 'Yearly pay', value: '$80,000' }]} onOpen={() => {}} />
            <ProfileCard kind="Salary" icon={<Banknote strokeWidth={1.5} />} name="Sam's salary" rows={[{ label: 'Yearly pay', value: '$60,000' }]} selected onOpen={() => {}} />
            <ProfileCard kind="Pension" icon={<Landmark strokeWidth={1.5} />} name="Sam's pension" rows={[{ label: 'Yearly amount', value: '$9,000' }]} dimmed onOpen={() => {}} />
            <ProfileCard kind="Savings" icon={<PiggyBank strokeWidth={1.5} />} name="Pat's 401(k)" dimmed onOpen={() => {}} />
          </div>

          <section className="border border-stone-300">
            <EmptyState
              sentence="This page waits for one account with a balance before it can figure anything."
              action={{ label: 'Add an account', onSelect: () => {} }}
            />
          </section>
        </section>
      </main>
    </ToastProvider>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')
createRoot(rootEl).render(
  <StrictMode>
    {/* Base UI renders no <style> element under this (its two scrollbar rules live in theme.css); plan 2.1 decision 1. */}
    <CSPProvider disableStyleElements>
      <KitProbe />
    </CSPProvider>
  </StrictMode>,
)
