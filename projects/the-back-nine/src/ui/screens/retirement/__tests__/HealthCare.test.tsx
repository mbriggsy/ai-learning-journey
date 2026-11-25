// @vitest-environment jsdom
/**
 * Retirement → Health Care's page wiring (plan RC10's Test scenarios): the tray's fact rows open their drawers and the
 * subsidy row runs a what-if (on Analysis, through the lever it names); a read-only tab draws no drawer door; the page
 * with no figure draws no handle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { copy, slots } from '../../../copy'
import { HealthCare } from '../HealthCare'
import type { HealthChartsView, HealthTrayView } from '../healthCareView'

afterEach(cleanup)

const view: HealthChartsView = {
  kind: 'charts',
  route: 'retired',
  title: copy.healthChartTitle,
  description: copy.healthDescription,
  axisTitle: 'Alex’s age',
  parts: [],
  ages: { first: 61, last: 80 },
  lattice: { ceiling: 10_000, step: 2_500, intervals: 4 },
  axisDollar: (d) => `$${d}`,
  hero: '~$330,000',
  heroLine: copy.healthHeroLine,
  metricLines: [],
  notes: [],
  footnotes: [copy.verdictMedicarePriced],
  updating: false,
  updatingLabel: copy.answerRefiguringCaption,
}

const tray = (readOnly: boolean): HealthTrayView => ({
  aca: { label: copy.workbenchRailAcaTitle, value: copy.leverHealthRegimeReverted, help: copy.leverHealthRegimeRevertedHelp, lever: 'aca-subsidy' },
  facts: [
    { id: 'oop-medical', title: 'Out-of-pocket medical', rows: [{ label: copy.oopLabel, value: '$4,000 a year' }], door: readOnly ? null : 'oop-medical' },
    { id: 'medicare-extras', title: 'Medicare extras', rows: [{ heading: 'Alex', label: 'Extras', value: '$240 a month' }], door: readOnly ? null : 'extras-panel' },
  ],
  factsNote: readOnly ? copy.healthTrayReadOnly : copy.healthTrayFactsNote,
})

function renderPage(t: HealthTrayView | undefined, v: HealthChartsView | { kind: 'words'; words: string } = view) {
  const onTryLever = vi.fn()
  const onOpenFact = vi.fn()
  render(
    <HealthCare headingRef={() => {}} view={v} {...(t !== undefined ? { tray: t } : {})} caveat={['c']} trayOpen onTrayOpen={() => {}} onTryLever={onTryLever} onOpenFact={onOpenFact} />,
  )
  return { onTryLever, onOpenFact }
}

describe('HealthCare — the Action Items tray', () => {
  it('the subsidy row runs a what-if through the aca-subsidy lever, with the rules’ meaning beside it', () => {
    const { onTryLever, onOpenFact } = renderPage(tray(false))
    expect(screen.getByText(copy.leverHealthRegimeRevertedHelp)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.healthTrayTryAca }))
    expect(onTryLever).toHaveBeenCalledWith('aca-subsidy')
    expect(onOpenFact).not.toHaveBeenCalled()
  })

  it('each fact row opens its own drawer, and says a change there changes the plan', () => {
    const { onOpenFact } = renderPage(tray(false))
    expect(screen.getByText(copy.healthTrayFactsNote)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsEditName('Out-of-pocket medical') }))
    expect(onOpenFact).toHaveBeenLastCalledWith('oop-medical')
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsEditName('Medicare extras') }))
    expect(onOpenFact).toHaveBeenLastCalledWith('extras-panel')
  })

  it('a read-only tab draws no drawer door (the facts still shown, in words)', () => {
    renderPage(tray(true))
    expect(screen.queryAllByRole('button', { name: new RegExp(`^${copy.workbenchFactsEdit}`) })).toEqual([])
    expect(screen.getByText(copy.healthTrayReadOnly)).toBeInTheDocument()
    expect(screen.getByText('Alex: Extras $240 a month')).toBeInTheDocument()
  })

  it('the page with no figure draws its words and no handle', () => {
    renderPage(undefined, { kind: 'words', words: copy.healthWaiting })
    expect(screen.getByText(copy.healthWaiting)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.trayHandle })).toBeNull()
  })

  it('one folder tab, Cost Analysis, and the R13 caveat inside the panel, mounted under the charts and before the notes', () => {
    renderPage(tray(false))
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([copy.healthTabCost])
    expect(document.querySelectorAll('[data-caveat]')).toHaveLength(1)
    // Mount order only (jsdom draws nothing): charts, column, caveat, then the notes and footnotes.
    const at = (s: string) => document.querySelector(s)!
    const before = (a: string, b: string) => Boolean(at(a).compareDocumentPosition(at(b)) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before('[data-metrics]', '[data-caveat]')).toBe(true)
    expect(before('[data-caveat]', '[data-health-notes]')).toBe(true)
    expect(before('[data-caveat]', '[data-health-footnotes]')).toBe(true)
  })

  it('the words view keeps one caveat, the frame’s own', () => {
    renderPage(undefined, { kind: 'words', words: copy.healthRunsOutWords })
    expect(document.querySelectorAll('[data-caveat]')).toHaveLength(1)
  })
})
