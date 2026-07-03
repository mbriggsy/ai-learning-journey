/**
 * U8 decrypt-on-return — the restore-from-backup flow (SLICE 2 UI, surface 4; council Fork A,
 * 2026-06-30). The damaged-vault door: the on-disk records failed the probe, so the backup file +
 * recovery word are the way back. Flow: labelled `<input type=file>` (a REAL input — never a
 * pointer-only dropzone as the sole path) → recovery word (raw-string) → new passphrase (the
 * reused floor-gated `PassphraseStep`) → ONE `session.restore` call → auto-unlock → hydrate.
 *
 * NO pre-`clearVault`, NO refuse-over-damaged — council-killed: `restoreVault` validates and
 * decrypts BEFORE any write (backup.ts:124-173) and `writeVault` clears in-transaction
 * (db.ts:197), so a bad file / wrong word attempt leaves a still-recoverable damaged vault
 * untouched. A pre-clear here would DESTROY it — the one data-loss path this surface must never
 * reintroduce.
 *
 * FAILURE ROUTING LIVES IN THE SEAM (`describeRestoreFailure`): each failure lands back on the
 * step that can fix it — wrong word re-opens the WORD field, a damaged file re-opens the FILE
 * picker (steering to ANOTHER copy, never "gone"), the negative-pairing bounce lands on set-new.
 * The UI also mirrors the backend's `recovery-equals-passphrase` guard (backup.ts:144) BEFORE the
 * call, the way SaveFlow mirrors firstSave — instant feedback, backend stays the authority.
 *
 * THE SESSION IS NEVER UNLOCKED MID-FLOW. `session.restore` installs no session state, so Back
 * needs no lock() anywhere (unlike RecoveryFlow's bail). After a committed restore this flow
 * holds the new passphrase and re-enters via `session.unlock` — the one unlock path — then App
 * hydrates exactly as a normal return. If that unlock somehow refuses, the vault is healthy on
 * disk: fall back to the unlock screen, where the passphrase the user just set opens it.
 *
 * Crypto stays out of the entry bundle: dynamic `import('./vaultSession')` in the handlers, and
 * the whole flow is `lazy()`-mounted by App (PassphraseStep pulls the zxcvbn floor seam).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { copy } from './copy'
import './styles/save.css'
import { useLiveAnnouncer, focusHeading } from '@intake/a11y'
import { PendingPanel } from './PendingPanel'
import { describeRestoreFailure, describeUnlockReadOnly, type UnlockCopyKey } from './unlockCopy'
import { PassphraseStep } from './PassphraseStep'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

type Step = 'file' | 'word' | 'setNew' | 'restoring' | 'error'

type FileErrorKey = 'restoreFileReadError' | 'restoreFileDamaged' | 'unlockNewerVersion'
type OpErrorKey = 'restoreVaultExists' | 'saveErrorQuota' | 'saveErrorFailed'

export function RestoreFlow({
  onRestored,
  onExitToUnlock,
}: {
  /** The restore committed AND the auto-unlock opened it (`currentModel()` is populated); App
   *  transitions to IntakeApp with `hydrateFromVault`. `notice` is the read-only-open caveat key
   *  (Fork C ii — this auto-unlock is the SAME unlock path as UnlockScreen, so it threads the same
   *  `describeUnlockReadOnly` verdict; insight 020: the second consumer of an invariant gets the
   *  same guard as the first), or null on a normal writable open. */
  readonly onRestored: (notice: UnlockCopyKey | null) => void
  /** The rare post-restore fallback: the vault is healthy on disk but the auto-unlock refused —
   *  the unlock screen finishes the job with the passphrase the user just set. */
  readonly onExitToUnlock: () => void
}) {
  const [step, setStep] = useState<Step>('file')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<FileErrorKey | null>(null)
  const [word, setWord] = useState('')
  const [reveal, setReveal] = useState(false)
  const [wordError, setWordError] = useState<'restoreWrongCredential' | null>(null)
  const [pairError, setPairError] = useState<string | null>(null)
  const [opError, setOpError] = useState<OpErrorKey>('saveErrorFailed')
  // Transient secrets/inputs held across steps for the ONE restore call (+ its retry): refs, not
  // state — changing them must not re-render (the SaveFlow dailyRef pattern).
  const fileTextRef = useRef<string | null>(null)
  const newPassRef = useRef<FloorCheckedPassphrase | null>(null)

  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const fileId = useId()
  const fileErrId = useId()
  const wordId = useId()
  const wordErrId = useId()

  // The ONE polite live region (the SaveFlow pattern) — a stable announcer (callback ref binds late).
  const announcer = useLiveAnnouncer()

  // Focus-to-heading on every panel this flow owns (PassphraseStep owns its own) — including the
  // routed-back-with-error returns, where the fresh heading focus re-orients the user.
  useEffect(() => {
    if (step === 'file' || step === 'word' || step === 'error') focusHeading(headingRef.current)
  }, [step])

  async function handleFilePick(file: File | null) {
    setFileError(null)
    if (!file) return
    try {
      fileTextRef.current = await file.text()
      setFileName(file.name)
    } catch {
      fileTextRef.current = null
      setFileName(null)
      setFileError('restoreFileReadError')
      announcer.announce(copy.restoreFileReadError)
    }
  }

  function handleSetNew(checked: FloorCheckedPassphrase) {
    // UI mirror of the backend's negative-pairing guard (backup.ts:144) — instant feedback before
    // the ~1s derives; the backend arm stays the authority and routes back here if it ever fires.
    if (checked.value === word) {
      setPairError(copy.recoverEqualsError)
      return
    }
    setPairError(null)
    newPassRef.current = checked
    void runRestore()
  }

  async function runRestore() {
    const fileText = fileTextRef.current
    const newPass = newPassRef.current
    if (fileText === null || newPass === null) {
      // Unreachable by construction (the steps gate on these) — an honest calm error, never a crash.
      setOpError('saveErrorFailed')
      setStep('error')
      return
    }
    setStep('restoring')
    announcer.announce(copy.securingStatus)
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.restore(fileText, word, newPass)
      if (result.ok) {
        // COMMITTED ON DISK — past this line no path may read "didn't finish" (a committed durable
        // write mis-reported as unfinished is the calm-but-wrong sin; ultramode review 2026-07-02).
        // Re-enter through the one unlock path; the pending panel bridges (UnlockScreen pattern).
        announcer.announce(copy.restoringStatus)
        try {
          const opened = await session.unlock(newPass.value)
          if (opened.ok) {
            onRestored(describeUnlockReadOnly(opened))
            return
          }
        } catch {
          // A THROWN post-commit unlock (rethrown programming error / transient read) is the same
          // situation as a refused one: the vault is healthy — fall through to the unlock door.
        }
        onExitToUnlock()
        return
      }
      const message = describeRestoreFailure(result)
      switch (message.anchor) {
        case 'file':
          setFileError(message.key)
          announcer.announce(copy[message.key])
          setStep('file')
          return
        case 'word':
          setWordError(message.key)
          announcer.announce(copy[message.key])
          setStep('word')
          return
        case 'setNew':
          // PassphraseStep announces externalError itself; a routed return remounts it fresh.
          setPairError(copy[message.key])
          setStep('setNew')
          return
        case 'operation':
          setOpError(message.key)
          announcer.announce(copy[message.key])
          setStep('error')
          return
        default: {
          // Compile-time exhaustiveness (the house never-default, mirroring the seam's own): a new
          // RestoreMessage anchor fails to compile here until routed. Runtime stays CALM (a
          // retryable panel), never a silent hang on the 'restoring' pending screen.
          const _exhaustive: never = message
          setOpError('saveErrorFailed')
          setStep('error')
          return
        }
      }
    } catch {
      // Pre-commit failures only (the import, session.restore itself): restoreVault rethrows
      // non-CipherAuthError programming errors; the dynamic import can fail offline. A calm
      // operational error with a retry — never a crash, never "damaged".
      setOpError('saveErrorFailed')
      announcer.announce(copy.saveErrorFailed)
      setStep('error')
    }
  }

  return (
    <main className="save">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />

      {step === 'file' && (
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
            {copy.restoreHeading}
          </h2>
          <p className="save-step__intro">{copy.restoreIntro}</p>

          <div className="save-field">
            <label className="save-field__label" htmlFor={fileId}>
              {copy.restoreFileLabel}
            </label>
            {/* A REAL file input (council: labelled, never pointer-only). No `accept` filter — a
                survivor's renamed/re-extensioned export must never be unpickable. */}
            <input
              id={fileId}
              className="save-field__file"
              type="file"
              aria-invalid={fileError !== null}
              aria-describedby={fileError !== null ? fileErrId : undefined}
              onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
            />
            {fileName !== null && fileError === null && <p className="save-step__note">{fileName}</p>}
            {fileError !== null && (
              <p className="save-field__note" id={fileErrId} role="alert">
                {copy[fileError]}
              </p>
            )}
          </div>

          <div className="save-actions">
            <button
              type="button"
              className="btn-primary"
              aria-disabled={fileName === null || fileError !== null}
              onClick={() => {
                if (fileTextRef.current !== null && fileError === null) setStep('word')
              }}
            >
              {copy.flowNext}
            </button>
          </div>
        </section>
      )}

      {step === 'word' && (
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
            {copy.recoverHeading}
          </h2>
          <p className="save-step__intro">{copy.restoreWordIntro}</p>

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
                enterKeyHint="next"
                value={word}
                aria-invalid={wordError !== null}
                aria-describedby={wordError !== null ? wordErrId : undefined}
                onChange={(e) => {
                  setWord(e.target.value)
                  if (wordError !== null) setWordError(null) // forgive on re-edit (design law)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && word !== '') setStep('setNew')
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
            {wordError !== null && (
              <p className="save-field__note" id={wordErrId} role="alert">
                {copy[wordError]}
              </p>
            )}
          </div>

          <div className="save-actions">
            <button type="button" className="btn-quiet" onClick={() => setStep('file')}>
              {copy.flowBack}
            </button>
            <button
              type="button"
              className="btn-primary"
              aria-disabled={word === ''}
              onClick={() => {
                if (word !== '') setStep('setNew')
              }}
            >
              {copy.flowNext}
            </button>
          </div>

          {/* Fork C(i) on the restore surface: standing, never an alert. */}
          <p className="save-step__note">{copy.restoreBothLostNote}</p>
        </section>
      )}

      {step === 'setNew' && (
        <PassphraseStep
          key="restore-new"
          heading={copy.recoverNewPassHeading}
          intro={copy.restoreNewPassIntro}
          submitLabel={copy.recoverNewPassButton}
          onSubmit={handleSetNew}
          onBack={() => {
            setPairError(null)
            setStep('word')
          }}
          announcer={announcer}
          externalError={pairError}
          onFieldEdit={() => setPairError(null)}
        />
      )}

      {step === 'restoring' && <PendingPanel status={copy.securingStatus} />}

      {step === 'error' && (
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
            {copy.restoreHeading}
          </h2>
          <p className="save-step__note" role="alert">
            {copy[opError]}
          </p>
          <div className="save-actions">
            <button type="button" className="btn-quiet" onClick={() => setStep('file')}>
              {copy.flowBack}
            </button>
            {opError === 'restoreVaultExists' ? (
              // vault-exists is NOT transient — a retry deterministically re-refuses (backup.ts:135),
              // so the primary action matches the copy's own instruction: reload (re-probes fresh,
              // and the healthy vault routes to the unlock screen). Ultramode review 2026-07-02.
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                {copy.restoreRetry}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => void runRestore()}>
                {copy.exportRetry}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
