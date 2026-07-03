// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { App } from '../App'
import { copy } from '../copy'

/**
 * The App entry-router GLUE that neither seam test can reach on its own: the unlock's read-only
 * verdict (Fork C ii) rides `onUnlocked(notice)` → `entry.notice` → the standing ViewOnlyBanner.
 * UnlockScreen.test proves the seam hands UP the right key; ViewOnlyBanner.test proves the banner
 * renders a given key; this proves App WIRES the two ends together (the mutate-check: drop the
 * `notice` from either the onUnlocked handler or the ViewOnlyBanner prop and the read-only case
 * below times out).
 *
 * The session/probe layer is mocked the way the surface tests mock it — the whole flow is driven
 * REAL (probe → unlock screen → type → open), with only `../vaultSession` (probe + the dynamic
 * unlock session) and the lazy children faked. The `virtual:pwa-register/react` SW hook (pulled by
 * UpdateToast at the App root) is stubbed idle so no service worker is touched. IntakeApp is stubbed
 * to a PROPS-ECHO (it renders its readOnly prop) so the router's OTHER read-only consumer — the
 * `readOnly={entry.notice !== null}` derivation — is pinned too, without the engine graph; the
 * forwarding INSIDE IntakeApp (readOnly → deriveResultSave) is IntakeApp.test.tsx's territory.
 */

const unlock = vi.fn()
const probeVault = vi.fn(async () => ({ kind: 'vault' as const }))
vi.mock('../vaultSession', () => ({
  probeVault,
  // The dynamic unlock session — currentModel is only read by the (stubbed) IntakeApp, kept null-safe.
  getVaultSession: () => Promise.resolve({ unlock, currentModel: () => null }),
}))

// The lazy children — stubbed so the App test stays hermetic (no engine/crypto graph, no real SW).
vi.mock('../IntakeApp', () => ({
  default: ({ readOnly = false }: { readOnly?: boolean }) => (
    <div data-read-only={String(readOnly)}>intake stub</div>
  ),
}))
vi.mock('../RecoveryFlow', () => ({ RecoveryFlow: () => null }))
vi.mock('../RestoreFlow', () => ({ RestoreFlow: () => null }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: () => {}, offlineReady: [false, () => {}] }),
}))

afterEach(() => {
  cleanup()
  unlock.mockReset()
  probeVault.mockClear()
})

async function driveToUnlockScreen() {
  render(<App />)
  return screen.findByLabelText(copy.unlockLabel) // waits out the probe hold → unlock screen
}

describe('App — the entry router threads the unlock read-only verdict into the standing banner (Fork C ii)', () => {
  it('a READ-ONLY unlock (a 2nd tab holds the writer) surfaces the view-only banner copy', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: true })
    const field = await driveToUnlockScreen()
    fireEvent.change(field, { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(screen.getByRole('button', { name: copy.unlockButton }))

    // The banner (the ONLY surface that renders this copy) shows the read-only caveat with its lead word.
    const banner = await screen.findByText(copy.unlockReadOnly)
    expect(banner).toBeInTheDocument()
    expect(screen.getByText(copy.unlockReadOnlyLead)).toBeInTheDocument()
    // A read-only OPEN is a success with a caveat — a status, never an alarm.
    expect(screen.queryByRole('alert')).toBeNull()
    // The router's OTHER read-only consumer: the SAME verdict must reach IntakeApp's readOnly
    // prop (kills the `entry.notice !== null` inversion mutant — the banner alone cannot).
    expect(await screen.findByText('intake stub')).toHaveAttribute('data-read-only', 'true')
  })

  it('a WRITABLE unlock leaves the banner EMPTY — the copy is the verdict, not a constant (kills the always-on mutant)', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    const field = await driveToUnlockScreen()
    fireEvent.change(field, { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(screen.getByRole('button', { name: copy.unlockButton }))

    // We DID reach the mounted app (proving the flow ran) — so the absent banner below is meaningful.
    const stub = await screen.findByText('intake stub')
    expect(screen.queryByText(copy.unlockReadOnly)).toBeNull()
    expect(screen.queryByText(copy.unlockReadOnlyLead)).toBeNull()
    expect(stub).toHaveAttribute('data-read-only', 'false')
  })
})
