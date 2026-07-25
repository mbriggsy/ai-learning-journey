// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { BandEnlargeModal } from '../BandEnlargeModal'
import { LATTICE_POINTS, type BandLabels, type BandSample, type ResolvedBandData } from '../bandData'

// jsdom has no matchMedia (useReducedMotion reads it) — provide a benign stub.
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('band-modal-open')
})

const labels: BandLabels = {
  caption: 'How the futures spread across the years',
  yAxisLabel: 'Portfolio value',
  xAxisLabel: 'Years from now',
  legendMedian: 'Most likely path',
  legendInner: 'Middle half',
  legendOuter: '8 in 10',
  readoutAgesLabel: 'Ages',
  readoutRangeLabel: 'Eight in ten land between',
  readoutRangeJoiner: ' – ',
  readoutMedianLabel: 'Most likely',
  readoutThinNote: 'Too few couples to show a range.',
}

function resolved(): ResolvedBandData {
  const samples: BandSample[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const y = (i / (LATTICE_POINTS - 1)) * 30
    const mid = 900_000 - y * 8_000
    samples.push({ yearsFromNow: y, p10: mid - 200_000, p25: mid - 100_000, p50: mid, p75: mid + 100_000, p90: mid + 200_000 })
  }
  return {
    kind: 'resolved',
    elapsedYears: 0,
    outcomeState: 'borderline',
    dollarMax: 1_500_000,
    horizonYears: 30,
    samples,
    yTicks: [{ dollars: 0, label: '$0' }],
    annotations: [],
    callouts: [],
    tooltipRows: samples.map((s) => ({
      ages: `${Math.round(61 + s.yearsFromNow)} / ${Math.round(59 + s.yearsFromNow)}`,
      low: `$${Math.round(s.p10 / 1000)}k`,
      median: `$${Math.round(s.p50 / 1000)}k`,
      high: `$${Math.round(s.p90 / 1000)}k`,
    })),
  }
}

// A host that owns the open/close state + a trigger button (mirrors the panel), so we can test
// focus restoration to the trigger.
function Host() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Study the range
      </button>
      <BandEnlargeModal
        open={open}
        onClose={() => setOpen(false)}
        data={resolved()}
        labels={labels}
        title="The range, up close"
        closeLabel="Close"
      />
    </div>
  )
}

describe('BandEnlargeModal — the opt-in lightbox (direction B click-to-enlarge)', () => {
  it('is PORTALED to document.body (out of any transform-ancestor — burned/013)', async () => {
    const { getByRole } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    const dialog = await waitFor(() => getByRole('dialog'))
    // the dialog's containing backdrop is a direct child of <body>, not of the host subtree.
    const backdrop = dialog.closest('.band-modal__backdrop')!
    expect(backdrop.parentElement).toBe(document.body)
  })

  it('renders the SAME band enlarged — the non-color signal (median line) survives', async () => {
    const { getByRole, container } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    await waitFor(() => getByRole('dialog'))
    // the median line lives in the portaled body, not the host container.
    expect(container.querySelector('.band-median')).toBeNull() // not in the host subtree
    expect(document.body.querySelector('.band-median')).not.toBeNull() // present, enlarged
    const enlargedSvg = document.body.querySelector('svg[data-variant="enlarged"]')
    expect(enlargedSvg).not.toBeNull()
  })

  it('moves focus into the dialog on open (the close control)', async () => {
    const { getByRole } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    const close = await waitFor(() => getByRole('button', { name: 'Close' }))
    expect(document.activeElement).toBe(close)
  })

  it('Escape closes the modal', async () => {
    const { getByRole, queryByRole } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    const dialog = await waitFor(() => getByRole('dialog'))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('restores focus to the trigger when closed (a11y)', async () => {
    const { getByRole, queryByRole } = render(<Host />)
    const trigger = getByRole('button', { name: 'Study the range' })
    // a real browser focuses a button on click; jsdom's fireEvent.click does not, so focus it
    // first to mirror the real "the trigger owned focus when the modal opened" state.
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = await waitFor(() => getByRole('dialog'))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('locks body scroll while open, releases it on close', async () => {
    const { getByRole, queryByRole } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    await waitFor(() => getByRole('dialog'))
    expect(document.documentElement).toHaveClass('band-modal-open')
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
    expect(document.documentElement).not.toHaveClass('band-modal-open')
  })

  it('a backdrop click dismisses to rest', async () => {
    const { getByRole, queryByRole } = render(<Host />)
    fireEvent.click(getByRole('button', { name: 'Study the range' }))
    const dialog = await waitFor(() => getByRole('dialog'))
    const backdrop = dialog.closest('.band-modal__backdrop')!
    fireEvent.mouseDown(backdrop)
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('PLANTED control: when closed, NO dialog is in the document (the gate isn’t vacuously green)', () => {
    const { queryByRole } = render(<Host />)
    expect(queryByRole('dialog')).toBeNull()
  })
})
