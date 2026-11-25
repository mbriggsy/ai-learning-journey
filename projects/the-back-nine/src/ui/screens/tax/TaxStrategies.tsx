/**
 * src/ui/screens/tax/TaxStrategies.tsx: Tax → Tax Strategies, the page (plan docs/plans/6-rightcapital-ui-plan.md, RC8;
 * ref 2.17). The title, the folder tabs (Strategies, Summary, Comparison, Details: the page's own state, held by the
 * shell, never routes), the one panel with the R13 caveat last inside it, named by the page's answer
 * (`verdictDescribedBy`). Calibration waits for map gap 6 (no dead tab).
 *
 * The working route shows the Strategies tab alone, holding one stopgap line: no goal picker, no heirs' bracket, no Find
 * and no Summary, Comparison or Details tab (plan RC8; the solve runs on the all-retired route only).
 */
import type { ReactNode, Ref } from 'react'
import { Caveat, PageFrame } from '../../kit'
import { copy } from '../../copy'
import { StrategiesPanel, type StrategiesPanelProps } from './Strategies'
import type { StrategiesView } from './strategiesView'

export type TaxTab = 'strategies' | 'summary' | 'comparison' | 'details'

const ALL_TABS = [
  { id: 'strategies', label: copy.taxStratTabStrategies },
  { id: 'summary', label: copy.taxStratTabSummary },
  { id: 'comparison', label: copy.taxStratTabComparison },
  { id: 'details', label: copy.taxStratTabDetails },
] as const

const WORKING_TABS = [ALL_TABS[0]] as const

export interface TaxStrategiesProps extends Omit<StrategiesPanelProps, 'view' | 'caveat'> {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly strategies: StrategiesView
  readonly tab: TaxTab
  readonly onTab: (tab: TaxTab) => void
  readonly caveat: readonly string[]
  /** The other tabs' panels, drawn by the shell (each reads its own composer). */
  readonly summary: ReactNode
  readonly comparison: ReactNode
  readonly details: ReactNode
}

export function TaxStrategies({ headingRef, strategies, tab, onTab, caveat, summary, comparison, details, ...panel }: TaxStrategiesProps) {
  const working = strategies.kind === 'working-route'
  const shown: TaxTab = working ? 'strategies' : tab
  const caveatNode = <Caveat lines={caveat} />
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="tax-strategies" data-tax-tab={shown}>
      <PageFrame
        title={copy.shellPageTaxStrategies}
        headingRef={headingRef}
        tabs={{ label: copy.taxStratTabsLabel, items: working ? WORKING_TABS : ALL_TABS, value: shown, onValueChange: onTab }}
        valuesNote={copy.probabilityTodaysDollars}
      >
        {strategies.kind === 'working-route' ? (
          <div className="flex flex-col gap-6" data-strategies="working-route">
            <p className="py-8 text-center text-body text-stone-900" data-working-route="">
              {strategies.words}
            </p>
            {caveatNode}
          </div>
        ) : shown === 'strategies' ? (
          <StrategiesPanel view={strategies} caveat={caveatNode} {...panel} />
        ) : shown === 'summary' ? (
          summary
        ) : shown === 'comparison' ? (
          comparison
        ) : (
          details
        )}
      </PageFrame>
    </div>
  )
}
