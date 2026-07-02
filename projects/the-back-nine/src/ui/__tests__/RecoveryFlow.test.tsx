// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecoveryFlow } from '../RecoveryFlow'
import { copy } from '../copy'

/**
 * The forgot-passphrase recovery flow (SLICE 2, surface 3). The session is mocked (the crypto is a
 * dynamic import inside the handlers); these tests own the surface behaviour — the word-step chrome
 * with the STANDING both-lost line (Fork C(i)), the failure→copy mapping through the shared seam,
 * the mandatory set-new advance, and above all the NEGATIVE-PAIRING GUARD: on this path the UI is
 * the SOLE gate (the session holds only the recovery KEY, not the plaintext — insight 049's
 * documented residual), so its planted-fail test is the honesty-critical one: equal credentials
 * must bounce WITHOUT the re-mint ever being attempted.
 *
 * The set-new step drives the REAL `PassphraseStep` → `evaluatePassphrase` (zxcvbn floor), so the
 * new-passphrase strings must clear the real floor — the two dev-vault credentials are used because
 * `vaultRoundTrip.test.ts` already proves they do.
 */
const recoveryUnlock = vi.fn()
const setNewPassphrase = vi.fn()
const lock = vi.fn()
vi.mock('../vaultSession', () => ({
  getVaultSession: () => Promise.resolve({ recoveryUnlock, setNewPassphrase, lock }),
}))

afterEach(() => {
  cleanup()
  recoveryUnlock.mockReset()
  setNewPassphrase.mockReset()
  lock.mockReset()
})

// Floor-clearing credentials (proven against the real floor in vaultRoundTrip.test.ts).
const WORD = 'lattice harbor cinder vellum 48 thicket'
const NEW_PASS = 'plinth otter vivid casket 92 lampoon'

const wordField = () => screen.getByLabelText(copy.recoverPassphraseLabel)
const openBtn = () => screen.getByRole('button', { name: copy.recoverButton })

/** Drive the word step to a successful recovery unlock and land on set-new. */
async function reachSetNew() {
  recoveryUnlock.mockResolvedValue({ ok: true })
  fireEvent.change(wordField(), { target: { value: WORD } })
  fireEvent.click(openBtn())
  await screen.findByRole('heading', { name: copy.recoverNewPassHeading })
}

/** Fill the reused PassphraseStep's two fields and submit the set-new step. */
function submitNewPassphrase(value: string) {
  fireEvent.change(screen.getByLabelText(copy.passphraseLabel), { target: { value } })
  fireEvent.change(screen.getByLabelText(copy.passphraseConfirmLabel), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: copy.recoverNewPassButton }))
}

describe('RecoveryFlow — the word step', () => {
  it('renders the calm chrome AND the standing both-lost line (always present, never an alert)', () => {
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: copy.recoverHeading })).toBeInTheDocument()
    expect(screen.getByText(copy.recoverIntro)).toBeInTheDocument()
    expect(wordField()).toBeInTheDocument()
    expect(openBtn()).toBeInTheDocument()
    // Fork C(i): the both-lost line is STANDING content on the surface, not conditional error copy.
    const note = screen.getByText(copy.recoverBothLostNote)
    expect(note).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Back exits to the unlock screen WITHOUT locking (nothing was unlocked yet)', () => {
    const onExit = vi.fn()
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(lock).not.toHaveBeenCalled()
  })

  it('does not attempt a recovery unlock on an empty word', () => {
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    fireEvent.click(openBtn())
    expect(recoveryUnlock).not.toHaveBeenCalled()
  })

  it('a wrong recovery word maps through the shared seam to the GCM-ambiguous copy, wired onto the field', async () => {
    recoveryUnlock.mockResolvedValue({ ok: false, reason: 'wrong-recovery-passphrase' })
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    fireEvent.change(wordField(), { target: { value: 'wrong' } })
    fireEvent.click(openBtn())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.unlockWrongCredential) // typo-first, never "corrupt"
    expect(wordField()).toHaveAttribute('aria-invalid', 'true')
    expect(wordField()).toHaveAttribute('aria-describedby', alert.id)
    // Forgiven the instant the field is re-edited (calm law).
    fireEvent.change(wordField(), { target: { value: 'wrong2' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a THROWN recoveryUnlock (programming error / offline chunk miss) surfaces the calm generic — NEVER "damaged"', async () => {
    // The throw bypasses describeUnlockFailure entirely (session rethrows non-CipherAuthError on
    // purpose), so this catch is the SOLE realization of the never-mislabel law on this path —
    // the one honesty arm the seam's own tests cannot cover (ultramode review 2026-07-02).
    recoveryUnlock.mockRejectedValue(new Error('boom'))
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    fireEvent.change(wordField(), { target: { value: WORD } })
    fireEvent.click(openBtn())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.unlockGeneric)
    expect(alert.textContent).not.toBe(copy.unlockDataDamaged)
  })

  it('the recovery-specific open-in-another-tab refusal gets its own calm copy', async () => {
    recoveryUnlock.mockResolvedValue({ ok: false, reason: 'open-in-another-tab' })
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    fireEvent.change(wordField(), { target: { value: WORD } })
    fireEvent.click(openBtn())
    expect((await screen.findByRole('alert')).textContent).toBe(copy.unlockOpenElsewhere)
  })

  it('a successful recovery unlock passes the raw word and advances to the MANDATORY set-new step', async () => {
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    await reachSetNew()
    expect(recoveryUnlock).toHaveBeenCalledWith(WORD)
    expect(screen.getByText(copy.recoverNewPassIntro)).toBeInTheDocument()
  })
})

describe('RecoveryFlow — the set-new step and the negative-pairing gate', () => {
  it('PLANTED-FAIL: a new passphrase equal to the recovery word bounces and the re-mint is NEVER attempted', async () => {
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(WORD) // the word itself clears the floor — only THIS gate can refuse it
    // Query by role: the announcer live region (role=status) echoes the same string, so a text
    // query would match both nodes; the visible bounce is the sole role=alert.
    const bounce = await screen.findByRole('alert')
    expect(bounce.textContent).toBe(copy.recoverEqualsError)
    expect(setNewPassphrase).not.toHaveBeenCalled()
    // The bounce clears on edit (the PassphraseStep onFieldEdit wire).
    fireEvent.change(screen.getByLabelText(copy.passphraseLabel), { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a distinct floor-clearing passphrase re-mints and hands off via onRecovered', async () => {
    setNewPassphrase.mockResolvedValue({ ok: true })
    const onRecovered = vi.fn()
    render(<RecoveryFlow onRecovered={onRecovered} onExit={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    await waitFor(() => expect(onRecovered).toHaveBeenCalledTimes(1))
    expect(setNewPassphrase).toHaveBeenCalledTimes(1)
    expect(setNewPassphrase).toHaveBeenCalledWith(expect.objectContaining({ value: NEW_PASS }))
  })

  it('a re-mint failure shows the calm operational error; Try again returns to set-new', async () => {
    setNewPassphrase.mockResolvedValue({ ok: false, reason: 'quota' })
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.saveErrorQuota)
    fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    expect(screen.getByRole('heading', { name: copy.recoverNewPassHeading })).toBeInTheDocument()
    expect(screen.getByLabelText(copy.passphraseLabel)).toBeInTheDocument()
  })

  it('a cancelled re-mint (a lock landed mid-op) exits silently to the unlock screen', async () => {
    setNewPassphrase.mockResolvedValue({ ok: false, reason: 'cancelled' })
    const onExit = vi.fn()
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={onExit} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('backing out of set-new LOCKS the recovery-unlocked session before exiting (never a silent read-only session)', async () => {
    lock.mockResolvedValue(undefined)
    const onExit = vi.fn()
    render(<RecoveryFlow onRecovered={vi.fn()} onExit={onExit} />)
    await reachSetNew()
    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
    expect(lock).toHaveBeenCalledTimes(1)
  })
})
