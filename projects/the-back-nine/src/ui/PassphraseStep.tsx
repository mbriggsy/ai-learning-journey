/**
 * U8 passphrase-set step — reused by the first-Save ceremony AND the recovery → new-passphrase
 * path (so the floor gate is identical on both set-paths). Dumb wiring over `passphraseStrength.ts`:
 * the floor DECISION + the source-bound numbers live there; this renders the calm, METER-LESS
 * feedback (names which floor is unmet as text — back-nine-design intake law, plan U8 §A11y) and the
 * `aria-disabled` + announced gate-block (never native `disabled` — an AT user must hear WHY the
 * load-bearing security control won't advance).
 *
 * ERROR IDENTIFICATION (WCAG 2.2 SC 3.3.1) — all THREE channels, not just the floor. Announcing an
 * error is half the contract; the other half is naming the field that holds it, so an AT user who
 * tabs back after the announcement still finds the control marked invalid and pointed at its
 * reason. The floor channel always had this; the mismatch channel set `aria-invalid` with no note
 * to point at, and `externalError` set neither (found 2026-08-14 on the first rendered walk of
 * RecoveryFlow — a green suite cannot see an orphaned alert). `externalError` marks the PASSPHRASE
 * field because all three consumers pass a pairing collision about the value being set here
 * (RecoveryFlow/RestoreFlow `pairError`, SaveFlow `recoveryError`) — never the confirm field.
 *
 * Act 6 · RC19: drawn in the kit (`PassphraseField`, `FieldNote`, `Button`), inside the save drawer and the restore and
 * recovery cards. Its strength reading stays the named floor line (which floor is unmet, as text), not a scored bar:
 * `passphraseStrength.ts` returns the floor verdict and no score by design (U8's meter-less law), and this unit changes
 * no logic, so the plan's "strength meter" is that line. Each field keeps its own Show toggle, and the value lives in
 * this step's state exactly as before.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { copy } from './copy'
import { focusHeading } from '@intake/a11y'
import type { Announcer } from '@intake/a11y'
import { evaluatePassphrase, passphrasesMatch, EMPTY_VERDICT, type PassphraseVerdict } from './passphraseStrength'
import { Button } from './kit/Button'
import { FieldNote, PassphraseField, VAULT_ACTIONS, VaultHeading } from './kit/VaultCard'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

/** Join whichever note ids are live, per `aria-describedby`'s space-separated contract; `undefined`
 *  when none is, so the attribute is omitted rather than rendered empty (an empty one points an AT
 *  user at nothing). Both fields can carry two notes at once — the floor and the pairing bounce. */
function describedBy(...ids: readonly (string | null)[]): string | undefined {
  const live = ids.filter((id): id is string => id !== null)
  return live.length > 0 ? live.join(' ') : undefined
}

export function PassphraseStep({
  heading,
  intro,
  secondaryIntro,
  fieldLabel,
  confirmFieldLabel,
  submitLabel,
  onSubmit,
  onBack,
  announcer,
  busy = false,
  externalError = null,
  onFieldEdit,
  tooShortLine = copy.passphraseTooShort,
}: {
  readonly heading: string
  readonly intro: string
  /** An optional second guidance paragraph below the intro (the recovery step uses it for
   *  the anti-biographical steering). */
  readonly secondaryIntro?: string
  /** The field labels — default to the daily-passphrase copy; the recovery step overrides
   *  them so the two reused steps read as distinct credentials, not "didn't I just do this?". */
  readonly fieldLabel?: string
  readonly confirmFieldLabel?: string
  readonly submitLabel: string
  readonly onSubmit: (checked: FloorCheckedPassphrase) => void
  readonly onBack?: () => void
  readonly announcer: Announcer
  readonly busy?: boolean
  /** A parent-controlled error shown below the fields + announced (the recovery step's
   *  "must differ from your daily passphrase" bounce). The parent owns it; `onFieldEdit`
   *  is the signal to clear it. */
  readonly externalError?: string | null
  readonly onFieldEdit?: () => void
  /** The floor's too-short words: the passphrase's by default; the recovery step passes its own, so a field labelled
   *  "Recovery word" is told what the word must be (the floor itself is unchanged). */
  readonly tooShortLine?: string
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const passId = useId()
  const confirmId = useId()
  const noteId = useId()
  const mismatchId = useId()
  const externalErrId = useId()

  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [reveal, setReveal] = useState(false)
  // Per-field reveal (Briggsy's cold-read 2026-07-02): the confirm field gets its OWN row + Show
  // button so both boxes render identically; each toggle governs only its own field.
  const [revealConfirm, setRevealConfirm] = useState(false)
  const [verdict, setVerdict] = useState<PassphraseVerdict>(EMPTY_VERDICT)
  const [showMismatch, setShowMismatch] = useState(false)
  const [checking, setChecking] = useState(false)

  // Focus-to-heading on mount (the established pattern; the step is opacity-faded, never
  // visibility-toggled, so .focus() always takes — ai-journey-stats/006).
  useEffect(() => focusHeading(headingRef.current), [])

  // Announce a parent-supplied error (e.g. recovery == daily) so it's never a silent
  // visual-only block on the security control.
  useEffect(() => {
    if (externalError) announcer.announce(externalError)
  }, [externalError, announcer])

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
      announcer.announce(v.lengthUnmet ? tooShortLine : copy.passphraseTooWeak)
    } else if (!passphrasesMatch(passphrase, confirm)) {
      announcer.announce(copy.passphraseMismatch)
    } else {
      announcer.announce(copy.passphraseBlocked)
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-busy={busy || checking} data-passphrase-step="">
      <div className="flex flex-col gap-2">
        <VaultHeading ref={headingRef}>{heading}</VaultHeading>
        <p className="text-body text-stone-600">{intro}</p>
        {secondaryIntro && <p className="text-body text-stone-600">{secondaryIntro}</p>}
      </div>

      <PassphraseField
        id={passId}
        label={fieldLabel ?? copy.passphraseLabel}
        value={passphrase}
        onChange={(v) => {
          setPassphrase(v)
          onFieldEdit?.()
        }}
        autoComplete="new-password"
        reveal={reveal}
        onRevealChange={setReveal}
        showLabel={copy.passphraseShow}
        hideLabel={copy.passphraseHide}
        invalid={showFloor || externalError !== null}
        describedBy={describedBy(showFloor ? noteId : null, externalError !== null ? externalErrId : null)}
        onBlur={() => void evaluate()}
        disabled={busy}
      >
        {showFloor && <FieldNote id={noteId}>{verdict.lengthUnmet ? tooShortLine : copy.passphraseTooWeak}</FieldNote>}
      </PassphraseField>

      <PassphraseField
        id={confirmId}
        label={confirmFieldLabel ?? copy.passphraseConfirmLabel}
        value={confirm}
        onChange={(v) => {
          setConfirm(v)
          setShowMismatch(false)
          onFieldEdit?.()
        }}
        autoComplete="new-password"
        reveal={revealConfirm}
        onRevealChange={setRevealConfirm}
        showLabel={copy.passphraseShow}
        hideLabel={copy.passphraseHide}
        invalid={showMismatch}
        describedBy={showMismatch ? mismatchId : undefined}
        onBlur={() => setShowMismatch(!passphrasesMatch(passphrase, confirm) && confirm.length > 0)}
        disabled={busy}
      >
        {showMismatch && <FieldNote id={mismatchId}>{copy.passphraseMismatch}</FieldNote>}
      </PassphraseField>

      {externalError && <FieldNote id={externalErrId}>{externalError}</FieldNote>}

      <div className={VAULT_ACTIONS}>
        <Button variant="primary" aria-disabled={!ready || busy} onClick={() => void handleSubmit()}>
          {submitLabel}
        </Button>
        {onBack && (
          <Button variant="neutral" disabled={busy} onClick={onBack}>
            {copy.flowBack}
          </Button>
        )}
      </div>
    </section>
  )
}
