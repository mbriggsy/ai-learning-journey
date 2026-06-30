/**
 * U8 passphrase-set step — reused by the first-Save ceremony AND the recovery → new-passphrase
 * path (so the floor gate is identical on both set-paths). Dumb wiring over `passphraseStrength.ts`:
 * the floor DECISION + the source-bound numbers live there; this renders the calm, METER-LESS
 * feedback (names which floor is unmet as text — back-nine-design intake law, plan U8 §A11y) and the
 * `aria-disabled` + announced gate-block (never native `disabled` — an AT user must hear WHY the
 * load-bearing security control won't advance).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { copy } from './copy'
import { focusHeading } from '@intake/a11y'
import type { Announcer } from '@intake/a11y'
import { evaluatePassphrase, passphrasesMatch, EMPTY_VERDICT, type PassphraseVerdict } from './passphraseStrength'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

export function PassphraseStep({
  heading,
  intro,
  submitLabel,
  onSubmit,
  onBack,
  announcer,
  busy = false,
}: {
  readonly heading: string
  readonly intro: string
  readonly submitLabel: string
  readonly onSubmit: (checked: FloorCheckedPassphrase) => void
  readonly onBack?: () => void
  readonly announcer: Announcer
  readonly busy?: boolean
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const passId = useId()
  const confirmId = useId()
  const noteId = useId()

  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [reveal, setReveal] = useState(false)
  const [verdict, setVerdict] = useState<PassphraseVerdict>(EMPTY_VERDICT)
  const [showMismatch, setShowMismatch] = useState(false)
  const [checking, setChecking] = useState(false)

  // Focus-to-heading on mount (the established pattern; the step is opacity-faded, never
  // visibility-toggled, so .focus() always takes — ai-journey-stats/006).
  useEffect(() => focusHeading(headingRef.current), [])

  const matched = passphrasesMatch(passphrase, confirm)
  const ready = verdict.ok && matched
  // Floor feedback shows only after an evaluation has run (blur / attempt) — calm: silent while typing.
  const showFloor = !verdict.ok && (verdict.lengthUnmet || verdict.scoreUnmet)

  async function evaluate(): Promise<PassphraseVerdict> {
    setChecking(true)
    const v = await evaluatePassphrase(passphrase)
    setVerdict(v)
    setChecking(false)
    return v
  }

  async function handleSubmit() {
    if (busy || checking) return
    const v = passphrase === '' ? EMPTY_VERDICT : await evaluate()
    const ok = v.ok && passphrasesMatch(passphrase, confirm)
    setShowMismatch(!passphrasesMatch(passphrase, confirm) && confirm.length > 0)
    if (ok && v.passphrase) {
      onSubmit(v.passphrase)
      return
    }
    // Announce the specific blocking reason (no invisible wall on the security control).
    if (!v.ok && (v.lengthUnmet || v.scoreUnmet)) {
      announcer.announce(v.lengthUnmet ? copy.passphraseTooShort : copy.passphraseTooWeak)
    } else if (!passphrasesMatch(passphrase, confirm)) {
      announcer.announce(copy.passphraseMismatch)
    } else {
      announcer.announce(copy.passphraseBlocked)
    }
  }

  return (
    <section className="save-step" aria-busy={busy || checking}>
      <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
        {heading}
      </h2>
      <p className="save-step__intro">{intro}</p>

      <div className="save-field">
        <label className="save-field__label" htmlFor={passId}>
          {copy.passphraseLabel}
        </label>
        <div className="save-field__row">
          <input
            id={passId}
            className="save-field__input"
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={passphrase}
            aria-invalid={showFloor}
            aria-describedby={showFloor ? noteId : undefined}
            disabled={busy}
            onChange={(e) => setPassphrase(e.target.value)}
            onBlur={() => void evaluate()}
          />
          <button
            type="button"
            className="save-field__reveal"
            aria-pressed={reveal}
            disabled={busy}
            onClick={() => setReveal((r) => !r)}
          >
            {reveal ? copy.passphraseHide : copy.passphraseShow}
          </button>
        </div>
        {showFloor && (
          <p className="save-field__note" id={noteId} role="alert">
            {verdict.lengthUnmet ? copy.passphraseTooShort : copy.passphraseTooWeak}
          </p>
        )}
      </div>

      <div className="save-field">
        <label className="save-field__label" htmlFor={confirmId}>
          {copy.passphraseConfirmLabel}
        </label>
        <input
          id={confirmId}
          className="save-field__input"
          type={reveal ? 'text' : 'password'}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={confirm}
          aria-invalid={showMismatch}
          disabled={busy}
          onChange={(e) => {
            setConfirm(e.target.value)
            setShowMismatch(false)
          }}
          onBlur={() => setShowMismatch(!passphrasesMatch(passphrase, confirm) && confirm.length > 0)}
        />
        {showMismatch && (
          <p className="save-field__note" role="alert">
            {copy.passphraseMismatch}
          </p>
        )}
      </div>

      <div className="save-actions">
        {onBack && (
          <button type="button" className="btn-quiet" disabled={busy} onClick={onBack}>
            {copy.flowBack}
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          aria-disabled={!ready || busy}
          onClick={() => void handleSubmit()}
        >
          {submitLabel}
        </button>
      </div>
    </section>
  )
}
