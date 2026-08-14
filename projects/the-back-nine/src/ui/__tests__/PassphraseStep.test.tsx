// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PassphraseStep } from '../PassphraseStep'
import { copy } from '../copy'
import type { Announcer } from '@intake/a11y'

/**
 * The reused credential-set step — FOUR consumers (RecoveryFlow, RestoreFlow, and SaveFlow's
 * passphrase AND recovery steps), so a defect here lands on every credential ceremony in the
 * product, including the first Save every household hits on day one.
 *
 * WHY THIS FILE EXISTS (2026-08-14). The component had no suite of its own, and the first RENDERED
 * walk of RecoveryFlow found what that absence hid: of its three error channels only the floor one
 * satisfied WCAG 2.2 SC 3.3.1. The mismatch note carried no `id` for its field to point at, and
 * `externalError` — the negative-pairing bounce, the most security-load-bearing message the step
 * can show — marked NEITHER field invalid and was bound to nothing. It was announced, so an AT user
 * heard it once and then tabbed back into a control the app still called valid.
 *
 * Announcing is half the contract; IDENTIFYING the field is the other half. Every arm below asserts
 * both halves, and the first arm is the PLANTED CONTROL: with no error live, nothing is invalid and
 * nothing is described — so the later assertions cannot pass vacuously (burned/070).
 */

const announcer: Announcer = { announce: vi.fn() }

afterEach(() => {
  cleanup()
  vi.mocked(announcer.announce).mockReset()
})

/** Floor-clearing credential (proven against the REAL zxcvbn floor in vaultRoundTrip.test.ts). */
const STRONG = 'plinth otter vivid casket 92 lampoon'
const SUBMIT = 'Save my new passphrase'

function renderStep(externalError: string | null = null) {
  return render(
    <PassphraseStep
      heading="Set a new passphrase"
      intro="Set a new passphrase to use on this device from now on."
      submitLabel={SUBMIT}
      onSubmit={vi.fn()}
      announcer={announcer}
      externalError={externalError}
    />,
  )
}

const passField = () => screen.getByLabelText(copy.passphraseLabel)
const confirmField = () => screen.getByLabelText(copy.passphraseConfirmLabel)

/** Resolve an element's `aria-describedby` to the TEXT of each node it names — a dangling id
 *  surfaces as `MISSING:<id>` rather than silently reading as "no description". */
function describedTexts(el: HTMLElement): readonly string[] {
  const ids = el.getAttribute('aria-describedby')
  if (ids === null) return []
  return ids
    .split(/\s+/)
    .filter((id) => id.length > 0)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? `MISSING:${id}`)
}

describe('PassphraseStep — error identification (WCAG 2.2 SC 3.3.1)', () => {
  it('PLANTED CONTROL: with no error live, neither field is invalid and neither is described', () => {
    renderStep()
    expect(passField()).toHaveAttribute('aria-invalid', 'false')
    expect(confirmField()).toHaveAttribute('aria-invalid', 'false')
    expect(describedTexts(passField())).toEqual([])
    expect(describedTexts(confirmField())).toEqual([])
  })

  it('externalError marks the PASSPHRASE field and points it at the message', () => {
    const bounce = copy.recoverEqualsError
    renderStep(bounce)

    // The field that holds the offending value is the one identified — all three consumers pass a
    // pairing collision about the credential being SET here, never about the confirmation.
    expect(passField()).toHaveAttribute('aria-invalid', 'true')
    expect(describedTexts(passField())).toEqual([bounce])

    // ...and the confirm field is untouched: it is not the field in error.
    expect(confirmField()).toHaveAttribute('aria-invalid', 'false')
    expect(describedTexts(confirmField())).toEqual([])
  })

  it('a mismatch marks the CONFIRM field and points it at its own note', () => {
    renderStep()
    fireEvent.change(passField(), { target: { value: STRONG } })
    fireEvent.change(confirmField(), { target: { value: `${STRONG}x` } })
    fireEvent.blur(confirmField())

    expect(confirmField()).toHaveAttribute('aria-invalid', 'true')
    expect(describedTexts(confirmField())).toEqual([copy.passphraseMismatch])
    expect(passField()).toHaveAttribute('aria-invalid', 'false')
  })

  it('the floor note stays wired to the passphrase field (the channel that was already correct)', async () => {
    renderStep()
    fireEvent.change(passField(), { target: { value: 'abc' } })
    fireEvent.blur(passField())

    // The floor decision is async (the real zxcvbn seam), so wait for the verdict to land.
    await waitFor(() => {
      expect(passField()).toHaveAttribute('aria-invalid', 'true')
    })
    expect(describedTexts(passField())).toEqual([copy.passphraseTooShort])
  })

  it('BOTH notes at once resolve — the floor and the pairing bounce are named together', async () => {
    const bounce = copy.recoverEqualsError
    renderStep(bounce)
    fireEvent.change(passField(), { target: { value: 'abc' } })
    fireEvent.blur(passField())

    await waitFor(() => {
      expect(describedTexts(passField())).toHaveLength(2)
    })
    // Order is the render order (floor first, then the parent's bounce), and both must RESOLVE —
    // a space-joined list with one dangling id reads as described while naming nothing.
    expect(describedTexts(passField())).toEqual([copy.passphraseTooShort, bounce])
  })
})
