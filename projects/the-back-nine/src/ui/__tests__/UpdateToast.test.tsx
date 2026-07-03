// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpdateToast } from '../UpdateToast'
import { holdUpdateApply } from '../updateGate'
import { copy } from '../copy'

/**
 * UpdateToast's rendering + apply-gate wiring (the twin of ViewOnlyBanner.test — the DECISION lives
 * in updateGate.ts, planted-fail tested there; this covers the component contract). Two seams are
 * mocked: `virtual:pwa-register/react` (the SW hook — the test env can't run a service worker) and
 * `../vaultSession` (the DYNAMIC import inside apply()). The REAL {@link readyToApplyUpdate} +
 * {@link holdUpdateApply} run — so a refactor that disconnects UpdateToast from the gate fails HERE.
 *
 * The contracts: the region is a `role='status'` mounted EMPTY when idle (burned/045 — a live region
 * must exist before it populates or the announce may not fire), renders the reload CTA when an update
 * is ready, applies (skipWaiting + dismiss) when the gate is open, and REFUSES while the Fork B
 * save-ceremony hold is raised (commit→export is a no-reload window) — leaving the prompt up.
 */

// The SW hook's mutable state, shared with the hoisted mock factory. `needRefresh` is toggled per
// test; `setNeedRefresh`/`updateServiceWorker` are spies the component drives on apply.
const h = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
  // The WriteGate the dynamically-imported session exposes — idle by default (no write in flight).
  isWriteInFlight: vi.fn(() => false),
  whenNoWriteInFlight: vi.fn(async () => {}),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [h.needRefresh, h.setNeedRefresh],
    updateServiceWorker: h.updateServiceWorker,
    offlineReady: [false, () => {}],
  }),
}))

vi.mock('../vaultSession', () => ({
  // apply() dynamically imports this and consults it through readyToApplyUpdate (WriteGate shape).
  getVaultSession: () => Promise.resolve({ isWriteInFlight: h.isWriteInFlight, whenNoWriteInFlight: h.whenNoWriteInFlight }),
}))

beforeEach(() => {
  h.needRefresh = false
  h.setNeedRefresh.mockClear()
  h.updateServiceWorker.mockClear()
  h.isWriteInFlight.mockClear() // keeps the () => false implementation
  h.whenNoWriteInFlight.mockClear()
})
afterEach(cleanup)

const reloadBtn = () => screen.getByRole('button', { name: copy.updateReload })

describe('UpdateToast — the update-ready prompt and its apply gate', () => {
  it('renders the live region EMPTY (zero footprint) when no update is ready — mounted, never populated', () => {
    h.needRefresh = false
    render(<UpdateToast />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
  })

  it('when an update is ready it renders the reload CTA + the dismiss control (still a status, never an alert)', () => {
    h.needRefresh = true
    render(<UpdateToast />)
    expect(screen.getByText(copy.updateReady)).toBeInTheDocument()
    expect(reloadBtn()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.updateLater })).toBeInTheDocument()
    // An available update is calm news, never an alarm.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clicking reload applies the waiting SW and dismisses the prompt when the gate is open (no write, no hold)', async () => {
    h.needRefresh = true
    render(<UpdateToast />)
    fireEvent.click(reloadBtn())
    await waitFor(() => expect(h.updateServiceWorker).toHaveBeenCalledWith(true))
    expect(h.setNeedRefresh).toHaveBeenCalledWith(false) // the prompt clears on apply
  })

  it('the Save-ceremony hold (holdUpdateApply) SUPPRESSES apply — the prompt stays up until the hold releases (Fork B)', async () => {
    h.needRefresh = true
    render(<UpdateToast />)
    const release = holdUpdateApply() // commit→export is a no-reload window the write signal can't see
    fireEvent.click(reloadBtn())
    // The apply path RAN (it consulted the write gate) but the open hold made readyToApplyUpdate refuse.
    await waitFor(() => expect(h.isWriteInFlight).toHaveBeenCalled())
    expect(h.updateServiceWorker).not.toHaveBeenCalled()
    expect(h.setNeedRefresh).not.toHaveBeenCalled() // prompt untouched — the user re-clicks after the ceremony
    // Release the hold and re-click: now it applies — proving the HOLD (nothing else) blocked it.
    release()
    fireEvent.click(reloadBtn())
    await waitFor(() => expect(h.updateServiceWorker).toHaveBeenCalledWith(true))
  })
})
