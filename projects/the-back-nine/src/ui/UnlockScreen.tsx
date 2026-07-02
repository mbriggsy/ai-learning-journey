/**
 * U8 decrypt-on-return — the Unlock screen (SLICE 2 UI, surface 1). The returning-user's door: the
 * startup probe found an encrypted vault, so this asks for the daily passphrase and opens it.
 *
 * Mirrors the first-Save ceremony's calm step chrome (save.css `save-step`/`save-field`, the ONE
 * polite live region, focus-to-heading, the `aria-pressed` show/hide toggle) — this is the same
 * credential-entry surface, read side. It is a RAW-STRING single field (no confirm, no floor gate —
 * unlock derives whatever is typed; the floor only guards a SET path, kdf.ts), distinct from the
 * reused `PassphraseStep`.
 *
 * CRYPTO STAYS OUT OF THE ENTRY BUNDLE. `vaultSession` statically pulls the crypto/KDF/backup graph;
 * App imports THIS component into the entry chunk, so `getVaultSession` is loaded via a DYNAMIC
 * `import()` inside the unlock handler (mirroring UpdateToast) — the form renders instantly for the
 * returning user, and the crypto chunk (already warmed by the startup probe) loads on submit. Only
 * TYPES cross from `@store/session` here (erased at build), so the static graph is entry-safe.
 *
 * HYDRATION LIVES IN IntakeApp, NOT HERE. On a successful unlock the session's `currentModel()` is
 * populated; this calls `onUnlocked()` and App mounts IntakeApp with `hydrateFromVault`, which reads
 * that model and recomputes (provisional-first → final in the background) — the clean split keeps the
 * appModel/engine graph in the lazy intake chunk. `busy` stays true through the unmount so the
 * "Opening your plan…" message bridges seamlessly into IntakeApp's own restoring state.
 *
 * The read-only-open caveat (a 2nd tab holds the writer — `describeUnlockReadOnly`) and the
 * forgot-passphrase → recovery route are LATER surfaces; `onForgot` is optional so the link renders
 * only once its destination exists (never a dead affordance).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { copy } from './copy'
import './styles/save.css'
import { createAnnouncer, focusHeading, type Announcer } from '@intake/a11y'
import { describeUnlockFailure, type UnlockCopyKey } from './unlockCopy'

export function UnlockScreen({
  onUnlocked,
  onForgot,
}: {
  /** Called once the vault is open (the session's `currentModel()` is populated); App transitions to
   *  IntakeApp with `hydrateFromVault`. */
  readonly onUnlocked: () => void
  /** The forgot-passphrase → recovery route (surface 3). Omitted until built — no dead link. */
  readonly onForgot?: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const passId = useId()
  const errId = useId()
  const [passphrase, setPassphrase] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<UnlockCopyKey | null>(null)

  // The ONE polite live region (mirrors SaveFlow), bound once its node mounts; the stable forwarder
  // lets the handler announce even across the brief mount window.
  const liveRef = useRef<HTMLDivElement | null>(null)
  const realAnnouncer = useRef<Announcer | null>(null)
  useEffect(() => {
    if (liveRef.current) realAnnouncer.current = createAnnouncer(liveRef.current)
  }, [])
  const announcer = useMemo<Announcer>(() => ({ announce: (t) => realAnnouncer.current?.announce(t) }), [])

  // Focus-to-heading on mount (the established pattern; opacity-only fade so .focus() always takes).
  useEffect(() => focusHeading(headingRef.current), [])

  async function handleUnlock() {
    if (busy || passphrase === '') return
    setBusy(true)
    setErrorKey(null)
    announcer.announce(copy.restoringStatus)
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.unlock(passphrase)
      if (result.ok) {
        // Success — hydration + the read-only caveat (surface 6) are IntakeApp's/later's job. Leave
        // `busy` true: the pending state persists through the unmount into IntakeApp's restoring beat.
        onUnlocked()
        return
      }
      const message = describeUnlockFailure(result)
      if (message.kind === 'plain') {
        setErrorKey(message.key)
        announcer.announce(copy[message.key])
      }
      setBusy(false)
    } catch {
      // unlock rethrows non-CipherAuthError programming errors (session.ts) — surface a calm generic
      // rather than crash the entry surface. Never label an internal bug "data damaged" (the scariest
      // calm-but-wrong direction).
      setErrorKey('unlockGeneric')
      announcer.announce(copy.unlockGeneric)
      setBusy(false)
    }
  }

  return (
    <main className="save">
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {busy ? (
        <section className="save-step save-step--pending" aria-busy>
          <p className="save-pending" role="status">
            {copy.restoringStatus}
          </p>
        </section>
      ) : (
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
            {copy.unlockHeading}
          </h2>
          <p className="save-step__intro">{copy.unlockIntro}</p>

          <div className="save-field">
            <label className="save-field__label" htmlFor={passId}>
              {copy.unlockLabel}
            </label>
            <div className="save-field__row">
              <input
                id={passId}
                className="save-field__input"
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                value={passphrase}
                aria-invalid={errorKey !== null}
                aria-describedby={errorKey !== null ? errId : undefined}
                onChange={(e) => {
                  setPassphrase(e.target.value)
                  if (errorKey !== null) setErrorKey(null) // forgive on re-edit (design law)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUnlock()
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
            <button
              type="button"
              className="btn-primary"
              aria-disabled={passphrase === ''}
              onClick={() => void handleUnlock()}
            >
              {copy.unlockButton}
            </button>
            {onForgot && (
              <button type="button" className="btn-quiet" onClick={onForgot}>
                {copy.unlockForgot}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

/**
 * The interim damaged-vault notice (probe `kind: 'damaged'`). The on-disk records are partial or
 * shape-invalid, so there is nothing to unlock — but falling through to ColdStart would DENY the
 * user's data ever existed (dishonest). This states the truth and points at the backup; the actual
 * restore-from-file UI is surface 4 (Fork A), which will replace this with an actionable flow. Uses
 * the same `unlockDataDamaged` copy the unlock failure path shows, so the message never says "gone".
 */
export function VaultDamagedNotice() {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => focusHeading(headingRef.current), [])
  return (
    <main className="save">
      <section className="save-step">
        <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
          {copy.unlockHeading}
        </h2>
        <p className="save-step__note" role="alert">
          {copy.unlockDataDamaged}
        </p>
      </section>
    </main>
  )
}
