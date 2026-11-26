/**
 * U8 decrypt-on-return — the Unlock screen (SLICE 2 UI, surface 1). The returning-user's door: the
 * startup probe found an encrypted vault, so this asks for the daily passphrase and opens it.
 *
 * Act 6 · RC19: a RightCapital-style login card (`src/ui/kit/VaultCard.tsx`): a centred white card on `--stone-100`, the
 * wordmark, the passphrase field, the blue Open button and the link to the recovery flow. The same calm contracts as the
 * first-Save ceremony (the ONE polite live region, focus-to-heading, the `aria-pressed` show/hide toggle). It is a
 * RAW-STRING single field (no confirm, no floor gate — unlock derives whatever is typed; the floor only guards a SET
 * path, kdf.ts), distinct from the reused `PassphraseStep`. No "restore from a backup file" link here: a restore over a
 * healthy vault is refused by the store (`restoreVault`'s `vault-exists`), so the link would end in a refusal after the
 * file, the word and a new passphrase (insight 054: a remedy that cannot work is never drawn). The restore door lives
 * where it can work: the cold start (a wiped device) and the damaged-vault notice.
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
 * The forgot-passphrase → recovery route is LIVE (App wires `onForgot` → RecoveryFlow); `onForgot`
 * stays optional so a mount without a destination never renders a dead link. The read-only-open
 * caveat (a 2nd tab holds the writer) is threaded through `describeUnlockReadOnly` — the seam owns
 * the decision — and handed up as the notice key App's standing ViewOnlyBanner renders (Fork C ii).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { entryCopy } from './entryCopy'
import { useLiveAnnouncer, focusHeading } from '@intake/a11y'
import { Button } from './kit/Button'
import { FieldNote, PassphraseField, TextLink, VaultCard, VaultHeading, VaultPage, VaultPending } from './kit/VaultCard'
import { describeUnlockFailure, describeUnlockReadOnly, type UnlockCopyKey } from './unlockCopy'

export function UnlockScreen({
  onUnlocked,
  onForgot,
  initialPassphrase,
}: {
  /** Called once the vault is open (the session's `currentModel()` is populated); App transitions to
   *  IntakeApp with `hydrateFromVault`. `notice` is the read-only-open caveat key (Fork C ii) — the
   *  `describeUnlockReadOnly` verdict — or null on a normal writable open. */
  readonly onUnlocked: (notice: UnlockCopyKey | null) => void
  /** The forgot-passphrase → recovery route (surface 3). Omitted until built — no dead link. */
  readonly onForgot?: () => void
  /** DEV-only: pre-fill the field (the `?vault` plant passes the known dev passphrase so opening a
   *  planted vault is one click). Undefined in prod — the field starts empty. */
  readonly initialPassphrase?: string
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const passId = useId()
  const errId = useId()
  const [passphrase, setPassphrase] = useState(initialPassphrase ?? '')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<UnlockCopyKey | null>(null)

  // The ONE polite live region (mirrors SaveFlow) — a stable announcer that speaks even across
  // the brief busy→form remount (useLiveAnnouncer's callback ref binds late; insight 060).
  const announcer = useLiveAnnouncer()

  // Focus-to-heading on mount AND on the busy→form return: a failed attempt unmounts the form into
  // the pending panel (focus falls to <body>), so the remounted form must re-anchor focus or a
  // keyboard/AT user retries from the top of the page (ultramode review 2026-07-02 — RecoveryFlow
  // had this right; this mirrors it).
  useEffect(() => {
    if (!busy) focusHeading(headingRef.current)
  }, [busy])

  async function handleUnlock() {
    if (busy || passphrase === '') return
    setBusy(true)
    setErrorKey(null)
    announcer.announce(entryCopy.restoringStatus)
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.unlock(passphrase)
      if (result.ok) {
        // Success — hydration is IntakeApp's job; the read-only caveat rides up as the seam's
        // verdict (the notice key or null) for App's standing banner (Fork C ii). Leave `busy`
        // true: the pending state persists through the unmount into IntakeApp's restoring beat.
        onUnlocked(describeUnlockReadOnly(result))
        return
      }
      const message = describeUnlockFailure(result)
      if (message.kind === 'plain') {
        setErrorKey(message.key)
        announcer.announce(entryCopy[message.key])
      }
      setBusy(false)
    } catch {
      // unlock rethrows non-CipherAuthError programming errors (session.ts) — surface a calm generic
      // rather than crash the entry surface. Never label an internal bug "data damaged" (the scariest
      // calm-but-wrong direction).
      setErrorKey('unlockGeneric')
      announcer.announce(entryCopy.unlockGeneric)
      setBusy(false)
    }
  }

  return (
    <VaultPage>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <VaultCard wordmark={{ mark: entryCopy.shellMark, title: entryCopy.appTitle }} busy={busy}>
        {busy ? (
          <VaultPending status={entryCopy.restoringStatus} />
        ) : (
          <section className="flex flex-col gap-6" data-unlock="">
            <div className="flex flex-col gap-2">
              <VaultHeading ref={headingRef}>{entryCopy.unlockHeading}</VaultHeading>
              <p className="text-body text-stone-600">{entryCopy.unlockIntro}</p>
            </div>

            <PassphraseField
              id={passId}
              label={entryCopy.unlockLabel}
              value={passphrase}
              onChange={(v) => {
                setPassphrase(v)
                if (errorKey !== null) setErrorKey(null) // forgive on re-edit (design law)
              }}
              autoComplete="current-password"
              reveal={reveal}
              onRevealChange={setReveal}
              showLabel={entryCopy.passphraseShow}
              hideLabel={entryCopy.passphraseHide}
              invalid={errorKey !== null}
              describedBy={errorKey !== null ? errId : undefined}
              enterKeyHint="go"
              onEnter={() => void handleUnlock()}
            >
              {errorKey !== null && <FieldNote id={errId}>{entryCopy[errorKey]}</FieldNote>}
            </PassphraseField>

            <div className="flex flex-col gap-2">
              <Button variant="primary" className="w-full" aria-disabled={passphrase === ''} onClick={() => void handleUnlock()}>
                {entryCopy.unlockButton}
              </Button>
              {onForgot && <TextLink onClick={onForgot}>{entryCopy.unlockForgot}</TextLink>}
            </div>
          </section>
        )}
      </VaultCard>
    </VaultPage>
  )
}

