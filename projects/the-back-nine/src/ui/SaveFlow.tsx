/**
 * U8 first-Save ceremony orchestrator — ONE routed phase (not a forked modal), in the calm
 * step-machine style. Flow (the 2026-06-30 council recovery rework): daily passphrase (the
 * LOCK, typed every time on this device) → recovery word (the KEY — the way back in, and the
 * survivor's door) → `firstSave` (atomic mint + commit of BOTH wraps) → mandatory backup export
 * → complete. BOTH credentials are USER-CHOSEN, so there is no system-minted secret to display
 * or capture — the old phrase-display + positional-capture beats retired with the BIP-39 phrase.
 *
 * The `beforeunload` guard runs ONLY on the export step: the single window where the vault is
 * committed on disk but the off-device backup (the survivor's findable artifact) is not yet
 * saved. The recovery step is pre-commit (nothing on disk), so it needs no guard.
 *
 * Holds the ONE polite live region (back-nine-design: a single announcer, clear-after-announce),
 * mounted once at the top so it never goes stale across step swaps.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { copy } from './copy'
import './styles/save.css'
import { createAnnouncer, focusHeading, type Announcer } from '@intake/a11y'
import { getVaultSession } from './vaultSession'
import { holdUpdateApply } from './updateGate'
import { PassphraseStep } from './PassphraseStep'
import { ExportConfirm } from './ExportConfirm'
import type { ScenarioV3 } from '@shared/model'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

type Step = 'passphrase' | 'recovery' | 'securing' | 'export' | 'complete' | 'error'

type FirstSaveReason =
  | 'not-locked'
  | 'vault-exists'
  | 'open-in-another-tab'
  | 'cancelled'
  | 'quota'
  | 'write-failed'
  | 'recovery-equals-passphrase'
type SaveErrorKey = 'saveErrorQuota' | 'saveErrorBusy' | 'saveErrorFailed'

function firstSaveErrorKey(reason: FirstSaveReason): SaveErrorKey {
  if (reason === 'quota') return 'saveErrorQuota'
  if (reason === 'open-in-another-tab') return 'saveErrorBusy'
  return 'saveErrorFailed'
}

export function SaveFlow({
  scenario,
  onCancel,
  onComplete,
}: {
  readonly scenario: ScenarioV3
  readonly onCancel: () => void
  readonly onComplete: () => void
}) {
  const [step, setStep] = useState<Step>('passphrase')
  const [errorKey, setErrorKey] = useState<SaveErrorKey>('saveErrorFailed')
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  // The daily passphrase, held across the recovery step until firstSave mints both wraps.
  // A ref (not state): it's a transient secret, and changing it must not re-render.
  const dailyRef = useRef<FloorCheckedPassphrase | null>(null)

  // State-adaptive recovery framing: a solo household has no second head for a "shared" word,
  // so it gets the estate-handoff intro; a couple gets the shared-memory framing.
  const solo = scenario.people.length === 1

  // The ONE polite live region, bound once its node mounts; a stable forwarder lets children hold
  // a steady `announcer` prop even before the node exists.
  const liveRef = useRef<HTMLDivElement | null>(null)
  const realAnnouncer = useRef<Announcer | null>(null)
  useEffect(() => {
    if (liveRef.current) realAnnouncer.current = createAnnouncer(liveRef.current)
  }, [])
  const announcer = useMemo<Announcer>(() => ({ announce: (t) => realAnnouncer.current?.announce(t) }), [])

  // Focus-to-heading for the inline steps (securing has no heading; the sub-components own theirs).
  const inlineHeadingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => {
    if (step === 'complete' || step === 'error') focusHeading(inlineHeadingRef.current)
  }, [step])

  // beforeunload guard: only on export — the vault is committed but the off-device backup
  // (the survivor's findable artifact) is not yet saved.
  const guarding = step === 'export'
  useEffect(() => {
    if (!guarding) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [guarding])

  // Fork B: hold the PWA update-apply across securing + export. The write gate alone cannot
  // cover this window — securing's ~1s KDF derive runs BEFORE its write is enqueued (no write
  // in flight to defer on), and export is a pure READ (vault committed, backup not yet saved).
  // An "Update now" reload landing anywhere in commit→export leaves the user without their
  // off-device backup while believing the save finished. Securing is included so the hold is
  // up BEFORE the commit lands — the write-drain→export handoff has no uncovered instant.
  // beforeunload (above) deliberately does NOT stop the intentional reload; this hold is what
  // makes the toast refuse instead. Effect-cleanup release: an unmount can never leak the hold.
  const holdingUpdate = step === 'securing' || step === 'export'
  useEffect(() => {
    if (!holdingUpdate) return
    return holdUpdateApply()
  }, [holdingUpdate])

  function handlePassphrase(checked: FloorCheckedPassphrase) {
    dailyRef.current = checked
    setStep('recovery')
  }

  async function handleRecovery(recovery: FloorCheckedPassphrase) {
    const daily = dailyRef.current
    if (!daily) {
      setStep('passphrase')
      return
    }
    // UI mirror of the backend's negative-pairing guard — instant feedback before the ~1s
    // derive. The authoritative check is in session.firstSave.
    if (recovery.value === daily.value) {
      setRecoveryError(copy.recoveryEqualsError)
      return
    }
    setRecoveryError(null)
    setStep('securing')
    announcer.announce(copy.securingStatus)
    const session = await getVaultSession()
    const result = await session.firstSave(scenario, daily, recovery)
    if (result.ok) {
      setStep('export')
    } else if (result.reason === 'recovery-equals-passphrase') {
      setRecoveryError(copy.recoveryEqualsError)
      setStep('recovery')
    } else {
      setErrorKey(firstSaveErrorKey(result.reason))
      setStep('error')
    }
  }

  function renderStep() {
    switch (step) {
      case 'passphrase':
        return (
          // Distinct key from the recovery step: both render <PassphraseStep> at the same
          // tree position, so without a key React reuses the instance and its internal
          // passphrase/confirm state LEAKS across the step change (the daily passphrase
          // would pre-fill the recovery field). The key forces a fresh remount.
          <PassphraseStep
            key="daily"
            heading={copy.saveHeading}
            intro={copy.saveIntro}
            submitLabel={copy.flowNext}
            onSubmit={handlePassphrase}
            onBack={onCancel}
            announcer={announcer}
          />
        )

      case 'recovery':
        return (
          <PassphraseStep
            key="recovery"
            heading={copy.recoveryHeading}
            intro={solo ? copy.recoveryIntroSolo : copy.recoveryIntro}
            secondaryIntro={copy.recoverySteer}
            fieldLabel={copy.recoveryLabel}
            confirmFieldLabel={copy.recoveryConfirmLabel}
            submitLabel={copy.flowNext}
            onSubmit={(checked) => void handleRecovery(checked)}
            onBack={() => {
              setRecoveryError(null)
              setStep('passphrase')
            }}
            announcer={announcer}
            externalError={recoveryError}
            onFieldEdit={() => setRecoveryError(null)}
          />
        )

      case 'securing':
        return (
          <section className="save-step save-step--pending" aria-busy>
            <p className="save-pending" role="status">
              {copy.securingStatus}
            </p>
          </section>
        )

      case 'export':
        return <ExportConfirm announcer={announcer} onFinish={() => setStep('complete')} />

      case 'complete':
        return (
          <section className="save-step save-step--complete">
            <h2 className="save-step__heading save-done__heading" tabIndex={-1} ref={inlineHeadingRef}>
              <span className="save-done__mark" aria-hidden="true" />
              {copy.savedHeading}
            </h2>
            <p className="save-step__intro">{copy.savedBody}</p>
            <div className="save-actions">
              <button type="button" className="btn-primary" onClick={onComplete}>
                {copy.savedDone}
              </button>
            </div>
          </section>
        )

      case 'error':
        return (
          <section className="save-step">
            <h2 className="save-step__heading" tabIndex={-1} ref={inlineHeadingRef}>
              {copy.saveHeading}
            </h2>
            <p className="save-step__note" role="alert">
              {copy[errorKey]}
            </p>
            <div className="save-actions">
              <button type="button" className="btn-quiet" onClick={onCancel}>
                {copy.flowBack}
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep('passphrase')}>
                {copy.flowNext}
              </button>
            </div>
          </section>
        )
    }
  }

  return (
    <main className="save">
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {renderStep()}
    </main>
  )
}
