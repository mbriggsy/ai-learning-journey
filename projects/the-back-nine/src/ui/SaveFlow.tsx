/**
 * U8 first-Save ceremony orchestrator — ONE routed phase (not a forked modal), in the calm
 * step-machine style. The as-built ordering (reconciled in the U8 plan): strength-gate →
 * `firstSave` (atomic mint+commit, RETURNS the phrase) → phrase display → mandatory capture →
 * mandatory export → complete. The vault is on disk after `firstSave`, and the recovery phrase is
 * heap-only and never re-derivable (insight 031) — so a `beforeunload` guard runs from the moment
 * the phrase exists until export confirms, and phrase-capture is the immediate hard gate.
 *
 * Holds the ONE polite live region (back-nine-design: a single announcer, clear-after-announce),
 * mounted once at the top so it never goes stale across step swaps.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { copy } from './copy'
import './styles/save.css'
import { createAnnouncer, focusHeading, type Announcer } from '@intake/a11y'
import { getVaultSession } from './vaultSession'
import { PassphraseStep } from './PassphraseStep'
import { RecoveryPhraseDisplay } from './RecoveryPhraseDisplay'
import { PhraseCapture } from './PhraseCapture'
import { ExportConfirm } from './ExportConfirm'
import type { ScenarioV3 } from '@shared/model'
import type { FloorCheckedPassphrase } from '@crypto/kdf'

type Step = 'passphrase' | 'securing' | 'phrase' | 'capture' | 'export' | 'complete' | 'error'

type FirstSaveReason = 'not-locked' | 'vault-exists' | 'open-in-another-tab' | 'cancelled' | 'quota' | 'write-failed'
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
  const [phrase, setPhrase] = useState<readonly string[] | null>(null)
  const [errorKey, setErrorKey] = useState<SaveErrorKey>('saveErrorFailed')

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

  // beforeunload guard: from the moment the vault is committed + the phrase exists (heap-only,
  // unrecoverable) until export confirms. The phrase-capture hard gate minimises this window.
  const guarding = step === 'phrase' || step === 'capture' || step === 'export'
  useEffect(() => {
    if (!guarding) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [guarding])

  async function handlePassphrase(checked: FloorCheckedPassphrase) {
    setStep('securing')
    announcer.announce(copy.securingStatus)
    const session = await getVaultSession()
    const result = await session.firstSave(scenario, checked)
    if (result.ok) {
      setPhrase(result.recoveryPhrase)
      setStep('phrase')
    } else {
      setErrorKey(firstSaveErrorKey(result.reason))
      setStep('error')
    }
  }

  function renderStep() {
    switch (step) {
      case 'passphrase':
        return (
          <PassphraseStep
            heading={copy.saveHeading}
            intro={copy.saveIntro}
            submitLabel={copy.flowNext}
            onSubmit={(checked) => void handlePassphrase(checked)}
            onBack={onCancel}
            announcer={announcer}
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

      case 'phrase':
        return phrase && <RecoveryPhraseDisplay phrase={phrase} onContinue={() => setStep('capture')} />

      case 'capture':
        return (
          phrase && (
            <PhraseCapture phrase={phrase} onPass={() => setStep('export')} onShowAgain={() => setStep('phrase')} />
          )
        )

      case 'export':
        return (
          <ExportConfirm
            announcer={announcer}
            onFinish={() => {
              setPhrase(null) // heap-drop the phrase once captured + backed up
              setStep('complete')
            }}
          />
        )

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
