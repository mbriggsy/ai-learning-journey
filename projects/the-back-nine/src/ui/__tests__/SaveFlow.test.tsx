// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SaveFlow } from '../SaveFlow'
import { readyToApplyUpdate, type WriteGate } from '../updateGate'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { copy } from '../copy'

/**
 * SaveFlow's Fork B contract: the PWA update-apply gate is HELD across the ceremony's
 * commit→export window (securing + export — securing so the hold is up BEFORE the commit
 * lands; export because it is a pure READ the write gate cannot see), and RELEASED on every
 * exit from that window (complete, error, unmount). The flow is driven REAL — the actual
 * PassphraseStep against the actual zxcvbn floor (the credentials are the proven
 * floor-clearing pair from vaultRoundTrip.test.ts) — with only the session mocked, and the
 * hold is observed through the SAME seam UpdateToast consults (`readyToApplyUpdate`), so a
 * refactor that disconnects SaveFlow from the gate fails HERE, not just in a unit test of
 * the counter. The ceremony's broader behaviour (copy, a11y, export channels) is covered by
 * its seams + the live Playwright pass, deliberately not re-tested here.
 */
const firstSave = vi.fn()
vi.mock('../vaultSession', () => ({
  getVaultSession: () => Promise.resolve({ firstSave }),
  // ExportConfirm (mounted on the export step) reads the committed vault back as a file…
  exportVaultFile: () => Promise.resolve({ ok: true, file: '{"stub":"backup"}' }),
  // …and records the backup sentinel on a confirmed channel (fire-and-forget). Stubbed so a future
  // channel-click test here can't trip on a missing seam member.
  recordBackupMade: () => Promise.resolve(),
}))

afterEach(() => {
  cleanup()
  firstSave.mockReset()
})

// Floor-clearing credentials (proven against the real floor in vaultRoundTrip.test.ts); distinct
// so the negative-pairing pre-check passes.
const DAILY = 'plinth otter vivid casket 92 lampoon'
const WORD = 'lattice harbor cinder vellum 48 thicket'

const idleGate: WriteGate = { isWriteInFlight: () => false, whenNoWriteInFlight: async () => {} }

function scenario() {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be a ready draft')
  return r.scenario
}

/** Fill PassphraseStep's two fields with `value` and submit — the daily and recovery steps
 *  share the component, differing only in field labels. */
function submitPassphraseStep(labels: { field: string; confirm: string }, value: string) {
  fireEvent.change(screen.getByLabelText(labels.field), { target: { value } })
  fireEvent.change(screen.getByLabelText(labels.confirm), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
}

/** The leave-page probe: dispatch the browser's own event, read whether a handler claimed it. */
const wouldWarn = (): boolean => {
  const ev = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(ev)
  return ev.defaultPrevented
}

/** Drive the real ceremony to the point where firstSave has been dispatched (securing). */
async function reachSecuring() {
  submitPassphraseStep({ field: copy.passphraseLabel, confirm: copy.passphraseConfirmLabel }, DAILY)
  await screen.findByRole('heading', { name: copy.recoveryHeading })
  submitPassphraseStep({ field: copy.recoveryLabel, confirm: copy.recoveryConfirmLabel }, WORD)
  await waitFor(() => expect(firstSave).toHaveBeenCalledTimes(1))
}

describe('SaveFlow — the Fork B update-apply hold across commit→export', () => {
  it('holds through securing AND export, and releases on unmount (never a leaked hold)', async () => {
    let commit: (v: unknown) => void = () => {}
    firstSave.mockImplementation(() => new Promise((res) => (commit = res)))
    const onCommitted = vi.fn()
    const { unmount } = render(
      <SaveFlow scenario={scenario()} onCancel={vi.fn()} onCommitted={onCommitted} onComplete={vi.fn()} />,
    )

    // Pre-ceremony baseline: the credential steps hold nothing (a reload there loses only
    // un-committed form input — beforeunload's scope, not the toast's). SaveFlow's OWN leave-page
    // guard is not up here either — pre-commit typing is IntakeApp's guard's window, not this one's.
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
    expect(wouldWarn()).toBe(false)

    await reachSecuring()
    // Securing: the KDF derive runs before its write is enqueued — the hold (not the write
    // signal) is what refuses the gate here.
    expect(await readyToApplyUpdate(idleGate)).toBe(false)

    expect(onCommitted).not.toHaveBeenCalled() // nothing on disk yet — the caller's guard stays armed
    commit({ ok: true })
    await screen.findByRole('heading', { name: copy.exportHeading })
    // The commit is reported AT the commit (before the export step), so the caller's unsaved-work
    // guard disarms exactly when the disk holds the plan — and SaveFlow's own export guard takes over.
    expect(onCommitted).toHaveBeenCalledTimes(1)
    // Export: vault committed, backup not yet saved — the pure-read window stays held, AND the
    // export step's leave-page dialog is armed (the one window this component guards).
    expect(await readyToApplyUpdate(idleGate)).toBe(false)
    // AWAITED, never read straight through: the listener is armed by a PASSIVE effect
    // (unloadGuard.ts:40-48's `useEffect`), which can flush AFTER the heading `findByRole` above
    // resolved on the DOM mutation. The hold read one line up cannot race — it is up since securing.
    await waitFor(() => expect(wouldWarn()).toBe(true))

    unmount()
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
    expect(wouldWarn()).toBe(false) // the listener leaves with the component — never a leaked dialog
  })

  it('releases the hold on the ERROR exit — a failed save must not wedge the update prompt forever', async () => {
    firstSave.mockResolvedValue({ ok: false, reason: 'quota' })
    const onCommitted = vi.fn()
    render(<SaveFlow scenario={scenario()} onCancel={vi.fn()} onCommitted={onCommitted} onComplete={vi.fn()} />)

    await reachSecuring()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.saveErrorQuota)
    expect(onCommitted).not.toHaveBeenCalled() // a refused save never reports a commit
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
  })
})
