// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { YearTable } from '../YearTable'
import { copy } from '../../copy'
import type { ComposedTable, TableFigure } from '../yearTableChrome'

/**
 * The table's render (workbench plan U7): what a screen reader hears in a box. A sighted reader names a figure by
 * its place under the header's line names; a blank line is silent, so each figure carries its line's name.
 */

afterEach(cleanup)

const fig = (dollars: number): TableFigure => ({ value: dollars, dollars, approx: true, sign: '' })

const TABLE: ComposedTable = {
  columns: [
    {
      id: 'health',
      group: 'out',
      header: copy.workbenchColHealth,
      lineLabels: [copy.workbenchLineMarketplace, copy.workbenchLineMedicare, copy.workbenchLineMedicareExtras],
    },
    { id: 'spending', group: 'out', header: copy.workbenchColSpending, lineLabels: [] },
  ],
  rows: [{ t: 20, year: 2046, ages: [80, 78], cells: [[null, fig(7_568), fig(5_855)], [fig(90_000)]], notes: [] }],
  notes: [],
  sourceKey: [],
  ageLabels: ['Sam', 'Alex'],
}

describe('YearTable — each figure names its line (the U7 review’s PAGE-1)', () => {
  it('a box whose first line is blank gives its later figures their own lines’ names, in hidden text only', () => {
    render(<YearTable state={{ kind: 'ready', table: TABLE, updating: false }} />)
    const [health, spending] = screen.getAllByRole('cell')
    expect(health!.textContent).toContain(`${copy.workbenchLineMedicare}: ~7,568`)
    expect(health!.textContent).toContain(`${copy.workbenchLineMedicareExtras}: ~5,855`)
    expect(health!.textContent).not.toContain(copy.workbenchLineMarketplace)
    // The names are visually hidden: the page looks as it did.
    const hidden = [...health!.querySelectorAll('.sr-only')].map((el) => el.textContent)
    expect(hidden).toEqual([`${copy.workbenchLineMedicare}: `, `${copy.workbenchLineMedicareExtras}: `])
    // A one-figure column's header already names its figure: nothing is added.
    expect(spending!.querySelectorAll('.sr-only')).toHaveLength(0)
    expect(spending!.textContent).toBe('~90,000')
  })
})
