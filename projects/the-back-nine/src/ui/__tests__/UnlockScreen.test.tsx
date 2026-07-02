// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnlockScreen } from '../UnlockScreen'
import { copy } from '../copy'

/**
 * The decrypt-on-return Unlock screen (SLICE 2, surface 1). The crypto is a DYNAMIC import inside the
 * handler, so the whole session is mocked; these tests own the pure surface behaviour — the calm
 * chrome, the show/hide toggle, the honesty-critical failure→copy mapping (via describeUnlockFailure),
 * the non-dangling error association (insight 051 — the unlock field has NO help text, so its
 * aria-describedby is a single id and exact equality is the right assertion), and the success handoff.
 */
const unlock = vi.fn()
vi.mock('../vaultSession', () => ({
  getVaultSession: () => Promise.resolve({ unlock }),
}))

afterEach(() => {
  cleanup()
  unlock.mockReset()
})

const field = () => screen.getByLabelText(copy.unlockLabel)
const openBtn = () => screen.getByRole('button', { name: copy.unlockButton })

describe('UnlockScreen — the returning-user door', () => {
  it('renders the calm chrome: welcome heading, intro, passphrase field, open button', () => {
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    expect(screen.getByRole('heading', { name: copy.unlockHeading })).toBeInTheDocument()
    expect(screen.getByText(copy.unlockIntro)).toBeInTheDocument()
    expect(field()).toBeInTheDocument()
    expect(openBtn()).toBeInTheDocument()
  })

  it('the passphrase is masked by default; the show/hide toggle flips the input type + aria-pressed', () => {
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    expect(field()).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: copy.passphraseShow }))
    expect(field()).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: copy.passphraseHide })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: copy.passphraseHide }))
    expect(field()).toHaveAttribute('type', 'password')
  })

  it('a successful WRITABLE unlock passes the raw passphrase to the session and hands off with NO notice', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: false })
    const onUnlocked = vi.fn()
    render(<UnlockScreen onUnlocked={onUnlocked} />)
    fireEvent.change(field(), { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(openBtn())
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1))
    expect(unlock).toHaveBeenCalledWith('plinth otter vivid casket 92')
    expect(onUnlocked).toHaveBeenCalledWith(null) // writable open — the banner stays empty
  })

  it('a READ-ONLY open (2nd tab holds the writer) is a SUCCESS that hands off the unlockReadOnly notice (Fork C ii)', async () => {
    unlock.mockResolvedValue({ ok: true, readOnly: true })
    const onUnlocked = vi.fn()
    render(<UnlockScreen onUnlocked={onUnlocked} />)
    fireEvent.change(field(), { target: { value: 'plinth otter vivid casket 92' } })
    fireEvent.click(openBtn())
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1))
    // The seam's verdict rides up for App's standing banner — never dropped, never an error.
    expect(onUnlocked).toHaveBeenCalledWith('unlockReadOnly')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a wrong passphrase shows the GCM-ambiguous copy, reachable ON the field (aria-invalid + non-dangling describedby)', async () => {
    unlock.mockResolvedValue({ ok: false, reason: 'wrong-passphrase' })
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.change(field(), { target: { value: 'wrong' } })
    fireEvent.click(openBtn())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.unlockWrongCredential) // typo-first, never "corrupt"
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    // No help text on this field ⇒ describedby is exactly the alert id (a dangling ref would fail here).
    expect(field()).toHaveAttribute('aria-describedby', alert.id)
  })

  it('maps the honesty-critical arms through the seam: data-damaged and newer-version get their OWN calm copy (never conflated)', async () => {
    unlock.mockResolvedValue({ ok: false, reason: 'data-damaged', detail: 'model ciphertext failed authentication' })
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.change(field(), { target: { value: 'x' } })
    fireEvent.click(openBtn())
    expect((await screen.findByRole('alert')).textContent).toBe(copy.unlockDataDamaged)

    cleanup()
    unlock.mockReset()
    unlock.mockResolvedValue({ ok: false, reason: 'newer-version', got: 4 })
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.change(field(), { target: { value: 'x' } })
    fireEvent.click(openBtn())
    expect((await screen.findByRole('alert')).textContent).toBe(copy.unlockNewerVersion)
  })

  it('a THROWN unlock surfaces the calm generic — never "damaged" — and the remounted form regains heading focus', async () => {
    unlock.mockRejectedValue(new Error('boom'))
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.change(field(), { target: { value: 'x' } })
    fireEvent.click(openBtn())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(copy.unlockGeneric)
    // The busy→form return re-anchors focus on the heading (the form unmounted into the pending
    // panel, dropping focus to <body>) — a keyboard retry must not start from the top of the page.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: copy.unlockHeading })),
    )
  })

  it('forgives the error the instant the field is re-edited (calm: silent while typing)', async () => {
    unlock.mockResolvedValue({ ok: false, reason: 'wrong-passphrase' })
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.change(field(), { target: { value: 'wrong' } })
    fireEvent.click(openBtn())
    await screen.findByRole('alert')
    fireEvent.change(field(), { target: { value: 'wrong2' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(field()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the forgot-passphrase route ONLY when its destination exists (never a dead link)', () => {
    const { rerender } = render(<UnlockScreen onUnlocked={vi.fn()} />)
    expect(screen.queryByRole('button', { name: copy.unlockForgot })).toBeNull()
    const onForgot = vi.fn()
    rerender(<UnlockScreen onUnlocked={vi.fn()} onForgot={onForgot} />)
    fireEvent.click(screen.getByRole('button', { name: copy.unlockForgot }))
    expect(onForgot).toHaveBeenCalledTimes(1)
  })

  it('does not attempt an unlock on an empty passphrase', () => {
    render(<UnlockScreen onUnlocked={vi.fn()} />)
    fireEvent.click(openBtn())
    expect(unlock).not.toHaveBeenCalled()
  })
})
