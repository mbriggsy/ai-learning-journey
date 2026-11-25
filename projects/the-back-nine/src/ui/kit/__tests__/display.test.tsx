// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Caveat } from '../Caveat'
import { DataTable, type DataTableColumn } from '../DataTable'
import { FolderTabs } from '../FolderTabs'
import { Ring, RING_CIRCUMFERENCE } from '../Ring'
import { EmptyState, LoadingVeil } from '../States'
import { SubNav } from '../SubNav'
import { TrayColumn, TrayRow } from '../Tray'
import { IN_FRAME_DISCLAIMER_ID } from '../../disclaimerId'

/**
 * The display parts' contracts (plan 3.1): the table's grouped header and parenthesised negatives, the ring's arc,
 * the two navs marking "you are here" by more than colour, the empty state's one sentence and one button, the loading
 * veil's announced words, and the caveat's text.
 */
afterEach(cleanup)

interface Row {
  readonly year: number
  readonly a: number
  readonly b: number
  readonly net: number
}

describe('DataTable', () => {
  const drill = vi.fn()
  const columns: readonly DataTableColumn<Row>[] = [
    { id: 'year', header: 'Year', value: (r) => String(r.year), lead: true },
    {
      id: 'in',
      header: 'Cash inflows',
      columns: [
        { id: 'a', header: 'Income', value: (r) => r.a, numeric: true, onDrill: drill },
        { id: 'b', header: 'Other', value: (r) => r.b, numeric: true },
      ],
    },
    { id: 'net', header: 'Net flows', value: (r) => r.net, numeric: true },
  ]
  const rows: readonly Row[] = [
    { year: 2031, a: 1234.4, b: 0, net: -1234 },
    { year: 2032, a: 2000, b: 50, net: 10 },
  ]

  function renderTable() {
    return render(
      <>
        <h2 id="t">Summary</h2>
        <DataTable labelledBy="t" columns={columns} rows={rows} rowKey={(r) => String(r.year)} />
      </>,
    )
  }

  it('draws a group-header row over its columns, then the column-header row', () => {
    renderTable()
    const table = screen.getByRole('table', { name: 'Summary' })
    const headRows = within(table).getAllByRole('row').slice(0, 2)
    const group = within(headRows[0]!).getByRole('columnheader', { name: 'Cash inflows' })
    expect(group).toHaveAttribute('colspan', '2')
    expect(within(headRows[1]!).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Year', 'Income', 'Other', 'Net flows'])
  })

  it('prints numbers without $, negatives in parentheses, the lead column sticky', () => {
    renderTable()
    const body = screen.getAllByRole('row').slice(2)
    const first = within(body[0]!).getAllByRole('cell')
    expect(first.map((c) => c.textContent)).toEqual(['2031', '1,234', '0', '(1,234)'])
    expect(first[0]).toHaveClass('sticky', 'left-0')
    expect(first[3]).toHaveClass('text-right')
    expect(screen.getByRole('table').textContent).not.toContain('$')
  })

  it('a drill header is an underlined button that calls its handler', async () => {
    const user = userEvent.setup()
    renderTable()
    const button = screen.getByRole('button', { name: 'Income' })
    expect(button).toHaveClass('underline')
    await user.click(button)
    expect(drill).toHaveBeenCalledTimes(1)
  })

  it('row groups: every row carries its group’s fill, so the sticky year (bg-inherit) is never see-through over scrolled cells', () => {
    interface Run {
      readonly year: number
      readonly run: string
      readonly v: number
    }
    const runs: readonly Run[] = [
      { year: 2031, run: 'Your plan', v: 1 },
      { year: 2031, run: 'Work to 63', v: 2 },
      { year: 2032, run: 'Your plan', v: 3 },
      { year: 2032, run: 'Work to 63', v: 4 },
    ]
    const cols: readonly DataTableColumn<Run>[] = [
      { id: 'year', header: 'Year', value: (r) => String(r.year), lead: true, spanGroup: true },
      { id: 'run', header: 'Plan', value: (r) => r.run, rowHeader: true },
      { id: 'v', header: 'Income tax', value: (r) => r.v, numeric: true },
    ]
    const { container } = render(
      <>
        <h2 id="p">Paired</h2>
        <DataTable labelledBy="p" columns={cols} rows={runs} rowKey={(r) => `${r.year}-${r.run}`} rowGroup={(r) => String(r.year)} />
      </>,
    )
    const fills = [...container.querySelectorAll('tbody tr')].map((tr) => tr.className)
    expect(fills).toEqual(['bg-bg', 'bg-bg', 'bg-stone-50', 'bg-stone-50'])
    const year = container.querySelector('tbody th[scope="rowgroup"]')!
    expect(year).toHaveClass('sticky', 'bg-inherit')
  })

  it('the band gutters are drawn inside the header cells, never as side borders that cut the plum top rule', () => {
    const { container } = renderTable()
    const group = container.querySelector('th[data-group="in"]')!
    expect(group.className).not.toMatch(/border-x/)
    expect(group.className).toMatch(/shadow-\[inset_2px_0_0_var\(--color-bg\),inset_-2px_0_0_var\(--color-bg\)\]/)
  })
})

describe('Ring', () => {
  const arc = (c: HTMLElement) => c.querySelector('[data-ring="arc"]')
  const lengthOf = (c: HTMLElement) => Number(arc(c)!.getAttribute('stroke-dasharray')!.split(' ')[0])

  it('the arc is value/10 of the circumference, from the words given', () => {
    const { container } = render(<Ring value={7} centre="7 of 10" caption="On track" />)
    expect(lengthOf(container)).toBeCloseTo((RING_CIRCUMFERENCE * 7) / 10, 6)
    expect(screen.getByText('7 of 10')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('0 draws an empty arc; past 10 clamps to the full circle', () => {
    const zero = render(<Ring value={0} />)
    expect(lengthOf(zero.container)).toBe(0)
    cleanup()
    const over = render(<Ring value={12} />)
    expect(lengthOf(over.container)).toBeCloseTo(RING_CIRCUMFERENCE, 6)
  })

  it('no value draws no arc at all (the track stays)', () => {
    const { container } = render(<Ring value={undefined} caption="Waiting" />)
    expect(arc(container)).toBeNull()
    expect(container.querySelector('[data-ring="track"]')).not.toBeNull()
  })
})

describe('SubNav and FolderTabs: the active item is marked by more than colour', () => {
  it('SubNav: aria-current and the underline class on the active page only; a plain click calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <SubNav
        label="Retirement pages"
        items={[
          { id: 'analysis', label: 'Analysis', href: '#a' },
          { id: 'cash', label: 'Cash Flows', href: '#c' },
        ]}
        activeId="analysis"
        onSelect={onSelect}
      />,
    )
    const active = screen.getByRole('link', { name: 'Analysis' })
    const other = screen.getByRole('link', { name: 'Cash Flows' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active).toHaveClass('border-blue')
    expect(other).not.toHaveAttribute('aria-current')
    expect(other).not.toHaveClass('border-blue')
    await user.click(other)
    expect(onSelect).toHaveBeenCalledWith('cash')
  })

  it('FolderTabs: aria-selected and the open-edge class on the active tab; a click moves it', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <FolderTabs
        label="Views"
        items={[
          { id: 'p', label: 'Probability' },
          { id: 'c', label: 'Confidence' },
        ]}
        value="p"
        onValueChange={onValueChange}
      >
        <p>Panel body</p>
      </FolderTabs>,
    )
    const active = screen.getByRole('tab', { name: 'Probability' })
    const other = screen.getByRole('tab', { name: 'Confidence' })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(active).toHaveClass('border-b-bg', 'bg-bg')
    expect(other).toHaveAttribute('aria-selected', 'false')
    expect(other).not.toHaveClass('border-b-bg')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel body')
    await user.click(other)
    expect(onValueChange).toHaveBeenCalledWith('c')
  })
})

describe('the page states', () => {
  it('EmptyState: its sentence and exactly one button', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<EmptyState sentence="This page waits for one account." action={{ label: 'Add an account', onSelect }} />)
    expect(screen.getByText('This page waits for one account.')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Add an account' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('LoadingVeil: the status region is there before the words, and holds them only while loading', () => {
    const { rerender } = render(
      <LoadingVeil loading={false} label="Loading…">
        <span>~$412,000</span>
      </LoadingVeil>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('')
    rerender(
      <LoadingVeil loading label="Loading…">
        <span>~$412,000</span>
      </LoadingVeil>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByText('~$412,000')).toBeInTheDocument() // the old figure stays visible under the veil
  })

  it('Caveat: the in-frame id, each line on its own, a space kept between them in the text', () => {
    render(<Caveat lines={['Not advice.', 'Validate it.']} />)
    const caveat = document.getElementById(IN_FRAME_DISCLAIMER_ID)
    expect(caveat).not.toBeNull()
    expect(caveat!.textContent).toBe('Not advice. Validate it.')
    expect(caveat!.querySelectorAll('br')).toHaveLength(1)
  })
})

describe('TrayColumn and TrayRow: a compared figure is read with the plan it is', () => {
  it('each row’s compared figure carries the column’s compared name for a screen reader (hidden from the eye); an empty one carries nothing', () => {
    render(
      <TrayColumn editedLabel="This what-if" comparedLabel="Your plan">
        <TrayRow rowId="spend" label="Total spending" control={<input aria-label="Total spending" />} compared="$70,000" />
        <TrayRow rowId="roth" label="Roth" control={<input aria-label="Roth" />} compared="" />
      </TrayColumn>,
    )
    const cell = (id: string) => document.querySelector(`[data-tray-row="${id}"]`)!.lastElementChild as HTMLElement
    expect(cell('spend').textContent).toBe('Your plan $70,000')
    expect(cell('spend').querySelector('.sr-only')?.textContent?.trim()).toBe('Your plan')
    expect(cell('roth').textContent).toBe('')
  })
})
