/**
 * U8 decrypt-on-return — the forgot-passphrase recovery flow (SLICE 2 UI, surface 3). The way back
 * in when the daily passphrase is lost: recovery word (raw-string single field, mirroring the
 * UnlockScreen anatomy) → `recoveryUnlock` → a MANDATORY new passphrase (the reused floor-gated
 * `PassphraseStep`) → `setNewPassphrase` re-mints the wrap → the app hydrates.
 *
 * SET-NEW IS STRUCTURAL, NOT POLISH. `recoveryUnlock` leaves `passphraseWrapCurrent=false` — the
 * on-disk wrap encodes the forgotten passphrase, so the session refuses writes until the re-mint.
 * There is no path from this flow into the app except through `setNewPassphrase`; backing out
 * LOCKS the session (drops the decrypted model + writer claim) and returns to the unlock screen —
 * an honest bail, never a silently read-only session.
 *
 * THE NEGATIVE-PAIRING GUARD LIVES HERE, AND ONLY HERE (insight 049's documented residual, closed).
 * `firstSave` and `restoreVault` reject `recovery == daily` at the backend, but the in-place
 * `recoveryUnlock → setNewPassphrase` path cannot — after unlock the session holds only the derived
 * recovery KEY, never the plaintext. This flow is the single place both plaintexts exist (the word
 * typed in step 1, the new passphrase from step 2), so its check is the SOLE gate on this path —
 * gate the invariant where the invariant is checkable (insight 020), not on the first consumer.
 *
 * CRYPTO STAYS OUT OF THE ENTRY BUNDLE — twice over. `getVaultSession` is a dynamic import inside
 * the handlers (the UnlockScreen pattern), AND the whole flow is `lazy()`-mounted by App (warmed on
 * the unlock screen), because `PassphraseStep` statically pulls the zxcvbn floor seam that must not
 * ride the entry chunk.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { copy } from './copy'
import './styles/save.css'
import { useLiveAnnouncer, focusHeading } from '@intake/a11y'
import { PendingPanel } from './PendingPanel'
import { describeUnlockFailure, type UnlockCopyKey } from './unlockCopy'
import { PassphraseStep } from './PassphraseStep'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

type Step = 'word' | 'setNew' | 'securing' | 'error'

type RemintErrorKey = 'saveErrorQuota' | 'saveErrorBusy' | 'saveErrorFailed'

/** Map a `setNewPassphrase` failure to the ceremony's calm operational-error copy (the SaveFlow
 *  mapping, minus the arms this flow routes elsewhere — `cancelled` exits silently: a lock landed
 *  mid-op, the session is locked again, and the unlock screen is the only honest destination). */
function remintErrorKey(reason: 'no-session-key' | 'open-in-another-tab' | 'op-in-flight' | 'quota' | 'write-failed'): RemintErrorKey {
  if (reason === 'quota') return 'saveErrorQuota'
  if (reason === 'open-in-another-tab') return 'saveErrorBusy'
  return 'saveErrorFailed'
}

export function RecoveryFlow({
  onRecovered,
  onExit,
}: {
  /** The re-mint committed and the session is unlocked (`currentModel()` is populated by the
   *  recovery decode); App transitions to IntakeApp with `hydrateFromVault`. */
  readonly onRecovered: () => void
  /** Back to the unlock screen. Fired directly from the word step (nothing unlocked yet); the
   *  set-new step routes through {@link handleBail} so the recovery-unlocked session is LOCKED
   *  first (never a silently read-only session left behind). */
  readonly onExit: () => void
}) {
  const [step, setStep] = useState<Step>('word')
  const [word, setWord] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<UnlockCopyKey | null>(null)
  const [pairError, setPairError] = useState<string | null>(null)
  const [remintError, setRemintError] = useState<RemintErrorKey>('saveErrorFailed')
  // The accepted recovery word, held across the set-new step for the negative-pairing check.
  // A ref (not state): a transient secret whose life is this flow — mirrors SaveFlow's dailyRef.
  const wordRef = useRef<string | null>(null)

  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const errPanelHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const wordId = useId()
  const errId = useId()

  // The ONE polite live region (the SaveFlow pattern) — a stable announcer that handlers and the
  // reused PassphraseStep hold across step swaps (useLiveAnnouncer's callback ref binds late).
  const announcer = useLiveAnnouncer()

  // Focus-to-heading for the panels this flow owns (PassphraseStep owns its own on mount).
  useEffect(() => {
    if (step === 'word' && !busy) focusHeading(headingRef.current)
    if (step === 'error') focusHeading(errPanelHeadingRef.current)
  }, [step, busy])

  async function handleWord() {
    if (busy || word === '') return
    setBusy(true)
    setErrorKey(null)
    announcer.announce(copy.restoringStatus)
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.recoveryUnlock(word)
      if (result.ok) {
        wordRef.current = word
        setBusy(false)
        setStep('setNew')
        return
      }
      const message = describeUnlockFailure(result)
      if (message.kind === 'plain') {
        setErrorKey(message.key)
        announcer.announce(copy[message.key])
      }
      setBusy(false)
    } catch {
      // recoveryUnlock rethrows non-CipherAuthError programming errors (session.ts) — calm generic,
      // never "damaged" (the scariest calm-but-wrong mislabel), mirroring UnlockScreen.
      setErrorKey('unlockGeneric')
      announcer.announce(copy.unlockGeneric)
      setBusy(false)
    }
  }

  async function handleSetNew(checked: FloorCheckedPassphrase) {
    // THE negative-pairing gate for this path (see the header): the session cannot compare a
    // derived key to a plaintext, so this equality check — both plaintexts in this flow's scope —
    // is the only enforcement point. Refuse BEFORE the ~1s derive, like SaveFlow's mirror.
    if (checked.value === wordRef.current) {
      setPairError(copy.recoverEqualsError)
      return
    }
    setPairError(null)
    setStep('securing')
    announcer.announce(copy.securingStatus)
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.setNewPassphrase(checked)
      if (result.ok) {
        // Leave the pending panel mounted — it bridges into IntakeApp's restoring beat, the
        // UnlockScreen handoff pattern. The session is 'unlocked' and writable.
        onRecovered()
        return
      }
      if (result.reason === 'cancelled') {
        // A lock landed mid-re-mint (the insight-030 gen check): the session is locked again, so
        // the unlock screen is the only honest destination. Silent, like a cancelled unlock.
        onExit()
        return
      }
      setRemintError(remintErrorKey(result.reason))
      setStep('error')
    } catch {
      // setNewPassphrase maps its own failures to typed results; a throw here is the dynamic
      // import itself failing (offline chunk miss) — the same calm operational error.
      setRemintError('saveErrorFailed')
      setStep('error')
    }
  }

  /** Bail out of a recovery-unlocked session: LOCK (drop the decrypted model + writer claim, back
   *  to the on-disk wrap that still encodes the forgotten passphrase), then hand off to the unlock
   *  screen. Never leaves the structural write-block half-open. */
  async function handleBail() {
    try {
      const { getVaultSession } = await import('./vaultSession')
      await (await getVaultSession()).lock()
    } catch {
      // lock() is best-effort here — a failed lock still exits; the session's own finally drops
      // secrets, and a reload re-runs the probe against the untouched on-disk vault.
    }
    onExit()
  }

  return (
    <main className="save">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />

      {step === 'word' &&
        (busy ? (
          <PendingPanel status={copy.restoringStatus} />
        ) : (
          <section className="save-step">
            <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
              {copy.recoverHeading}
            </h2>
            <p className="save-step__intro">{copy.recoverIntro}</p>

            <div className="save-field">
              <label className="save-field__label" htmlFor={wordId}>
                {copy.recoverPassphraseLabel}
              </label>
              <div className="save-field__row">
                <input
                  id={wordId}
                  className="save-field__input"
                  type={reveal ? 'text' : 'password'}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  value={word}
                  aria-invalid={errorKey !== null}
                  aria-describedby={errorKey !== null ? errId : undefined}
                  onChange={(e) => {
                    setWord(e.target.value)
                    if (errorKey !== null) setErrorKey(null) // forgive on re-edit (design law)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleWord()
                  }}
                />
                <button
                  type="button"
                  className="save-field__reveal"
                  aria-pressed={reveal}
                  onClick={() => setReveal((r) => !r)}
                >
                  {reveal ? copy.passphraseHide : copy.passphraseShow}
                </button>
              </div>
              {errorKey !== null && (
                <p className="save-field__note" id={errId} role="alert">
                  {copy[errorKey]}
                </p>
              )}
            </div>

            <div className="save-actions">
              <button type="button" className="btn-quiet" onClick={onExit}>
                {copy.flowBack}
              </button>
              <button
                type="button"
                className="btn-primary"
                aria-disabled={word === ''}
                onClick={() => void handleWord()}
              >
                {copy.recoverButton}
              </button>
            </div>

            {/* Fork C(i): the STANDING both-credentials-lost line — always present, never an
                alert. No-backdoor truth + the export-file steer + the honest no-lockout note. */}
            <p className="save-step__note">{copy.recoverBothLostNote}</p>
          </section>
        ))}

      {step === 'setNew' && (
        <PassphraseStep
          key="recover-new"
          heading={copy.recoverNewPassHeading}
          intro={copy.recoverNewPassIntro}
          submitLabel={copy.recoverNewPassButton}
          onSubmit={(checked) => void handleSetNew(checked)}
          onBack={() => void handleBail()}
          announcer={announcer}
          externalError={pairError}
          onFieldEdit={() => setPairError(null)}
        />
      )}

      {step === 'securing' && <PendingPanel status={copy.securingStatus} />}

      {step === 'error' && (
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1} ref={errPanelHeadingRef}>
            {copy.recoverNewPassHeading}
          </h2>
          <p className="save-step__note" role="alert">
            {copy[remintError]}
          </p>
          <div className="save-actions">
            <button type="button" className="btn-quiet" onClick={() => void handleBail()}>
              {copy.flowBack}
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep('setNew')}>
              {copy.exportRetry}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
