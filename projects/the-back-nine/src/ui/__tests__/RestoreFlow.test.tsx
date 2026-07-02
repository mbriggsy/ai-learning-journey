// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RestoreFlow } from '../RestoreFlow'
import { copy } from '../copy'

/**
 * The restore-from-backup flow (SLICE 2, surface 4 — council Fork A). The session is mocked (the
 * crypto is a dynamic import); these tests own the surface behaviour — the REAL labelled file
 * input, the step machine, the seam-routed failure returns (each failure re-opens the step that
 * can fix it), the UI mirror of the negative-pairing guard (planted-fail: equal credentials never
 * reach `session.restore`), the happy path's restore → auto-unlock → onRestored handoff, and the
 * retry that re-attempts with the held inputs.
 */
const restore = vi.fn()
const unlock = vi.fn()
vi.mock('../vaultSession', () => ({
  getVaultSession: () => Promise.resolve({ restore, unlock }),
}))

afterEach(() => {
  cleanup()
  restore.mockReset()
  unlock.mockReset()
})

// Floor-clearing credentials (proven against the real floor in vaultRoundTrip.test.ts).
const WORD = 'lattice harbor cinder vellum 48 thicket'
const NEW_PASS = 'plinth otter vivid casket 92 lampoon'
const FILE_TEXT = '{"format":"backnine-backup","formatVersion":1}'

const fileInput = () => screen.getByLabelText(copy.restoreFileLabel)
const nextBtn = () => screen.getByRole('button', { name: copy.flowNext })

/** Pick a backup file and wait for its name to render (file.text() is async). */
async function pickFile(text = FILE_TEXT, name = 'backup.json') {
  fireEvent.change(fileInput(), { target: { files: [new File([text], name)] } })
  await screen.findByText(name)
}

/** Drive file → word → set-new. */
async function reachSetNew() {
  await pickFile()
  fireEvent.click(nextBtn())
  await screen.findByText(copy.restoreWordIntro)
  fireEvent.change(screen.getByLabelText(copy.recoverPassphraseLabel), { target: { value: WORD } })
  fireEvent.click(nextBtn())
  await screen.findByRole('heading', { name: copy.recoverNewPassHeading })
}

/** Fill the reused PassphraseStep's two fields and submit. */
function submitNewPassphrase(value: string) {
  fireEvent.change(screen.getByLabelText(copy.passphraseLabel), { target: { value } })
  fireEvent.change(screen.getByLabelText(copy.passphraseConfirmLabel), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: copy.recoverNewPassButton }))
}

describe('RestoreFlow — the file and word steps', () => {
  it('renders a REAL labelled file input (never pointer-only), the honest damaged intro, and no premature error', () => {
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    expect(screen.getByRole('heading', { name: copy.restoreHeading })).toBeInTheDocument()
    expect(screen.getByText(copy.restoreIntro)).toBeInTheDocument()
    const input = fileInput()
    expect(input).toHaveAttribute('type', 'file')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('picking a file shows its name and Next advances to the word step with the standing C(i) line', async () => {
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await pickFile()
    fireEvent.click(nextBtn())
    await screen.findByText(copy.restoreWordIntro)
    expect(screen.getByRole('heading', { name: copy.recoverHeading })).toBeInTheDocument()
    expect(screen.getByText(copy.restoreBothLostNote)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not advance past the file step before a file is picked', () => {
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    fireEvent.click(nextBtn())
    expect(screen.getByRole('heading', { name: copy.restoreHeading })).toBeInTheDocument()
  })

  it('Back from the word step returns to the file step with the picked file intact', async () => {
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await pickFile()
    fireEvent.click(nextBtn())
    await screen.findByText(copy.restoreWordIntro)
    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    expect(screen.getByRole('heading', { name: copy.restoreHeading })).toBeInTheDocument()
    expect(screen.getByText('backup.json')).toBeInTheDocument()
  })
})

describe('RestoreFlow — the one restore call and its seam-routed failures', () => {
  it('PLANTED-FAIL: a new passphrase equal to the recovery word bounces and session.restore is NEVER called', async () => {
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(WORD)
    const bounce = await screen.findByRole('alert')
    expect(bounce.textContent).toBe(copy.recoverEqualsError)
    expect(restore).not.toHaveBeenCalled()
  })

  it('the happy path: restore(fileText, word, checked) → unlock(newPass) → onRestored', async () => {
    restore.mockResolvedValue({ ok: true })
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    const onRestored = vi.fn()
    render(<RestoreFlow onRestored={onRestored} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1))
    expect(restore).toHaveBeenCalledWith(FILE_TEXT, WORD, expect.objectContaining({ value: NEW_PASS }))
    expect(unlock).toHaveBeenCalledWith(NEW_PASS)
  })

  it('a wrong recovery word routes BACK TO THE WORD STEP with the GCM-ambiguous hedge on the field', async () => {
    restore.mockResolvedValue({ ok: false, reason: 'wrong-recovery-passphrase' })
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.restoreWrongCredential)
    const wordField = screen.getByLabelText(copy.recoverPassphraseLabel)
    expect(wordField).toHaveAttribute('aria-invalid', 'true')
    expect(wordField).toHaveAttribute('aria-describedby', alert.id)
    // Forgiven the instant the word is re-edited (calm law).
    fireEvent.change(wordField, { target: { value: `${WORD}x` } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a damaged file routes BACK TO THE FILE STEP steering to another copy; a newer file reads "newer app", never damaged', async () => {
    restore.mockResolvedValue({ ok: false, reason: 'file-damaged' })
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    expect((await screen.findByRole('alert')).textContent).toBe(copy.restoreFileDamaged)
    expect(screen.getByRole('heading', { name: copy.restoreHeading })).toBeInTheDocument()

    cleanup()
    restore.mockReset()
    restore.mockResolvedValue({ ok: false, reason: 'newer-version', got: 9 })
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    expect((await screen.findByRole('alert')).textContent).toBe(copy.unlockNewerVersion)
  })

  it('an operational failure lands on the error panel; Try again RE-ATTEMPTS with the held inputs', async () => {
    restore.mockResolvedValueOnce({ ok: false, reason: 'quota' })
    restore.mockResolvedValueOnce({ ok: true })
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    const onRestored = vi.fn()
    render(<RestoreFlow onRestored={onRestored} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    expect((await screen.findByRole('alert')).textContent).toBe(copy.saveErrorQuota)
    fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1))
    expect(restore).toHaveBeenCalledTimes(2)
  })

  it('a vault-exists TOCTOU refusal gets its own calm copy AND a reload CTA — never a futile Try-again loop', async () => {
    restore.mockResolvedValue({ ok: false, reason: 'vault-exists' })
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    expect((await screen.findByRole('alert')).textContent).toBe(copy.restoreVaultExists)
    // vault-exists is deterministic (a retry re-refuses forever) — the primary action must match
    // the copy's own "Reload the page" instruction, not offer a retry that cannot succeed.
    expect(screen.getByRole('button', { name: copy.restoreRetry })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.exportRetry })).toBeNull()
  })

  it('transient operational arms (quota) keep the Try-again CTA — only vault-exists swaps to reload', async () => {
    restore.mockResolvedValue({ ok: false, reason: 'quota' })
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={vi.fn()} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    expect((await screen.findByRole('alert')).textContent).toBe(copy.saveErrorQuota)
    expect(screen.getByRole('button', { name: copy.exportRetry })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.restoreRetry })).toBeNull()
  })

  it('a committed restore whose auto-unlock refuses falls back to the unlock screen (the vault is healthy)', async () => {
    restore.mockResolvedValue({ ok: true })
    unlock.mockResolvedValue({ ok: false, reason: 'not-locked' })
    const onExitToUnlock = vi.fn()
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={onExitToUnlock} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    await waitFor(() => expect(onExitToUnlock).toHaveBeenCalledTimes(1))
  })

  it('a committed restore whose auto-unlock THROWS also falls back to the unlock screen — NEVER "Saving didn’t finish"', async () => {
    // The restore COMMITTED; a thrown post-commit unlock (rethrown programming error / transient
    // read) must not be misbucketed into the pre-commit catch and mislabel a durable write as
    // unfinished (the calm-but-wrong durability claim — ultramode review 2026-07-02).
    restore.mockResolvedValue({ ok: true })
    unlock.mockRejectedValue(new Error('transient read'))
    const onExitToUnlock = vi.fn()
    render(<RestoreFlow onRestored={vi.fn()} onExitToUnlock={onExitToUnlock} />)
    await reachSetNew()
    submitNewPassphrase(NEW_PASS)
    await waitFor(() => expect(onExitToUnlock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(copy.saveErrorFailed)).toBeNull()
  })
})
