// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react'
import { ConfidenceBandPanel, type BandPanelChrome } from '../ConfidenceBandPanel'
import { LATTICE_POINTS, type BandLabels, type BandSample, type ResolvedBandData } from '../bandData'

// jsdom has no matchMedia — the panel mounts BOTH the inline band and the modal, each reading
// useReducedMotion() → matchMedia; without the stub the render throws. Benign always-false stub.
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
}

const chrome: BandPanelChrome = {
  pull: 'The range, opened',
  enlargeLabel: 'Study the range',
  modalTitle: 'The range, up close',
  closeLabel: 'Close',
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
    outcomeState: 'borderline',
    dollarMax: 1_500_000,
    horizonYears: 30,
    samples,
    yTicks: [{ dollars: 0, label: '$0' }],
    annotations: [],
    callouts: [{ id: 'likely', yearsFromNow: 18, dollars: 760_000, text: 'most likely' }],
  }
}

// The keyboard/assistive-tech enlarge path is the one a color-blind keyboard user depends on, and
// (before this) the panel's own wiring — its real button, the inline-band click, the SAME data to
// both inline band and modal — had zero coverage (the modal test drives its OWN host harness).
describe('ConfidenceBandPanel — the two-path enlarge (the keyboard/AT path is the explicit button)', () => {
  it('PLANTED control: closed at rest — no dialog before any interaction', () => {
    const { queryByRole } = render(<ConfidenceBandPanel data={resolved()} labels={labels} chrome={chrome} />)
    expect(queryByRole('dialog')).toBeNull()
  })

  it('the enlarge trigger is a real, focusable <button> (the keyboard/AT path, never a hue cue)', () => {
    const { getByRole } = render(<ConfidenceBandPanel data={resolved()} labels={labels} chrome={chrome} />)
    const btn = getByRole('button', { name: /study the range/i })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('clicking the button opens the enlarged modal with the SAME band — the non-color median survives', async () => {
    const { getByRole } = render(<ConfidenceBandPanel data={resolved()} labels={labels} chrome={chrome} />)
    fireEvent.click(getByRole('button', { name: /study the range/i }))
    const dialog = await waitFor(() => getByRole('dialog'))
    // the enlarged variant exists ONLY in the modal (the inline band is variant="drawer") — a clean
    // discriminator that the SAME data reached the modal band, median line and all.
    expect(dialog.querySelector('svg[data-variant="enlarged"]')).not.toBeNull()
    expect(dialog.querySelector('.band-median')).not.toBeNull()
  })

  it('clicking the inline band ALSO opens the modal (the mouse path feeds the same open() as the button)', async () => {
    const { container, getByRole, queryByRole } = render(
      <ConfidenceBandPanel data={resolved()} labels={labels} chrome={chrome} />,
    )
    expect(queryByRole('dialog')).toBeNull()
    const band = container.querySelector('.band-svg.is-enlargeable')!
    fireEvent.click(band)
    const dialog = await waitFor(() => getByRole('dialog'))
    expect(dialog.querySelector('svg[data-variant="enlarged"]')).not.toBeNull()
  })
})
