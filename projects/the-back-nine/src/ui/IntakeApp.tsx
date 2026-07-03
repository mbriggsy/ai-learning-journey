import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { IntakeFlow } from '@intake/flow'
import { intakeSteps } from '@intake/questions'
import { AnswerStrip } from '@intake/AnswerStrip'
import { missingRequiredFacts } from '@intake/intakeMap'
import { appModel } from './appModel'
import { Result } from './Result'
import { scenarioFromDraft } from './scenarioFromDraft'
import { draftFromScenario } from './draftFromScenario'
import { deriveResultSave, type PersistState } from './resultSave'
import { describeSaveFailure } from './unlockCopy'
import { PendingPanel } from './PendingPanel'
import { copy } from './copy'
import './styles/save.css'

// The ceremony rides its own lazy chunk (it pulls the crypto/zxcvbn graph) — kept off the
// already-lazy intake chunk's first paint; the Save beat only ever appears on the result screen.
const SaveFlow = lazy(() => import('./SaveFlow').then((m) => ({ default: m.SaveFlow })))

/**
 * The intake subtree — the LAZY half of the App split (default export for
 * React.lazy). Everything heavy rides this chunk: the intake components, the
 * param builders, and their engine dependencies (the 161-family ticker table,
 * the constants tables) — keeping the ENTRY chunk (shell + cold start) inside
 * the 300 KiB budget (`verify:bundle`). The chunk is precached (PWA) and
 * warmed during the cold-start read, so Begin never visibly waits.
 *
 * `appModel` (the ONE memoryModel) is created at THIS module's evaluation —
 * still module-level, still outside any render path, still StrictMode-proof
 * (contract #1a); it simply lives in the lazy chunk because its builders do.
 *
 * THE TWO PHASES (D2). During `intake` the quiet provisional AnswerStrip
 * co-exists above the questions (the question stays the hero). The terminal
 * advance fires the FINAL-tier recompute AND flips to `result` — the elevated
 * state-adaptive magic moment (FuckOffDate / ConfidenceStatement). `review`
 * returns to intake with every answer preserved (the draft lives in `appModel`;
 * nothing is persisted — U8 owns Save). Re-entering intake restarts the step
 * sequence at the first question; the data is intact, only the cursor resets.
 */
export default function IntakeApp({
  seed,
  hydrateFromVault = false,
  readOnly = false,
}: {
  seed?: string | null
  /** Decrypt-on-return: after a successful unlock, hydrate the result from the session's decrypted
   *  model instead of starting a fresh intake. App sets this on the post-unlock mount. */
  hydrateFromVault?: boolean
  /** The unlock opened READ-ONLY (a 2nd tab holds the writer — Fork C ii). App's standing View-only
   *  banner is the disclosure; the result surface must derive NO save CTA (a save can't land in this
   *  tab — session.save would refuse), so this is threaded into deriveResultSave. */
  readOnly?: boolean
}) {
  const [phase, setPhase] = useState<'restoring' | 'intake' | 'result' | 'save' | 'restore-failed'>(
    hydrateFromVault ? 'restoring' : 'intake',
  )
  // What is on disk (the edit-and-re-save machine, resultSave.ts). Starts 'unsaved' even on a
  // hydrate mount — the hydrate effect installs the decoded model's normalized scenario, and
  // until then the phase is 'restoring' so no save UI renders from the placeholder state.
  const [persist, setPersist] = useState<PersistState>({ kind: 'unsaved' })
  // DEV-seed provenance for the spend-period disarm: flips ONLY after a seed draft actually
  // APPLIES — `resolveDevSeed` returns null for a bogus `?seed=` key, and that mount is a
  // genuinely-fresh intake that must keep the R19 force-confirm armed (ultramode 2026-07-03).
  // A state flag, not a render-time resolveDevSeed(seed) call: devSeeds must stay behind the
  // dynamic import so it remains dead-code-eliminated from prod.
  const [devSeedApplied, setDevSeedApplied] = useState(false)
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const steps = useMemo(() => intakeSteps(snapshot.draft), [snapshot.draft])
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // The Save beat appears only when the draft is genuinely persistable (an indeterminate answer
  // can reach the result screen — the gate, not the screen, decides saveability).
  const saveReady = useMemo(() => scenarioFromDraft(snapshot.draft), [snapshot.draft])
  const retry = useCallback(() => void appModel.recompute(), [])
  const complete = useCallback(async () => {
    // Reveal the magic moment on the FAST provisional tier, then sharpen to the final IN PLACE —
    // never block the reveal on the final-tier date sweep (16k paths × every candidate year ≈ a
    // multi-second wait on desktop, far longer on a phone: it read as "never gets worked out"). The
    // await ORDER is load-bearing: the provisional must COMMIT (lower epoch) before the final
    // dispatches, or the final's epoch bump cancels the in-flight provisional and we are back to a
    // bare blocking spinner. The result holds the provisional reading while the final computes (no
    // re-blank), then upgrades — the calm "settling into its answer", never a frozen spinner.
    setPhase('result')
    await appModel.recompute('provisional')
    await appModel.recompute('final')
  }, [])
  const review = useCallback(() => setPhase('intake'), [])

  // The PROPER edit-and-re-save (retires the U8-review ② interim sticky-`saved`): a same-session
  // edit re-saves through the writable()-gated `session.save()` UPDATE path — the keys are
  // resident, so there is no ceremony, and `firstSave`'s 'not-locked' dead-end is structurally
  // unreachable (deriveResultSave can never offer the ceremony once a vault exists). The gate
  // reads the store's CURRENT draft, never the render closure (insight 036 — a commit-on-blur
  // edit and this click can share a task). `session.save` is total over typed results and its
  // {ok:true} arm has no post-commit throw window (session.ts:574-593), so the catch below only
  // ever speaks for a save that did NOT land — "didn't finish" stays honest (insight 052).
  const resave = useCallback(async () => {
    const ready = scenarioFromDraft(appModel.getSnapshot().draft)
    if (!ready.ready) return
    setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'saving', scenario: p.scenario }))
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.save(ready.scenario)
      if (result.ok) {
        setPersist({ kind: 'saved', scenario: ready.scenario })
      } else {
        const errorKey = describeSaveFailure(result)
        setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey }))
      }
    } catch {
      setPersist((p) =>
        p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey: 'saveErrorFailed' },
      )
    }
  }, [])

  // DEV-only `?seed=<key>`: apply a COMPLETE fixture to the in-memory appModel and
  // run the SAME terminal-advance path `complete()` runs (apply → result →
  // provisional → final), so the seed lands on the elevated answer exactly like a
  // hand-driven intake. devSeeds.ts is DEV-gated + dynamically imported here, so it
  // is dead-code-eliminated from prod (the `?preview` DCE contract). Mount-only;
  // nothing persists (the seed mutates only appModel — U8 owns Save). "Review my
  // answers" still works: the seeded draft lives in appModel, intact on flip-back.
  useEffect(() => {
    if (!(import.meta.env.DEV && seed != null)) return
    let cancelled = false
    void import('./devSeeds').then(async ({ resolveDevSeed }) => {
      const draft = resolveDevSeed(seed)
      if (draft === null || cancelled) return
      appModel.update(() => draft)
      setDevSeedApplied(true)
      setPhase('result')
      await appModel.recompute('provisional')
      await appModel.recompute('final')
    })
    return () => {
      cancelled = true
    }
  }, [seed])

  // DECRYPT-ON-RETURN: after a successful unlock the session holds the decrypted model. Mirror the
  // `?seed` hydration — whole-draft replace → result → provisional (shows FAST) → final (sharpens in
  // the BACKGROUND), NEVER blocking the reveal on the heavy final sweep (Fork D + the wall-clock
  // measurement: retired final ~2.9s, working ~20s). The 'restoring…' pending covers unlock +
  // provisional; the final lands off the blocking path as a band re-draw. `getVaultSession` is a
  // dynamic import so the crypto graph stays out of the intake chunk's static top-level.
  useEffect(() => {
    if (!hydrateFromVault) return
    let cancelled = false
    void (async () => {
      try {
        const { getVaultSession } = await import('./vaultSession')
        const model = (await getVaultSession()).currentModel()
        if (cancelled) return
        // Unreachable for this app's own vaults (unlock just decoded a 2-person v3 we wrote), but the
        // type admits null / legacy / a non-two-person shape → refuse rather than render a wrong plan.
        if (model === null || model.schemaVersion !== 3) {
          setPhase('restore-failed')
          return
        }
        const hydrated = draftFromScenario(model)
        if (!hydrated.ok) {
          setPhase('restore-failed')
          return
        }
        // The decrypt-on-return session IS saved — without this, the result screen offered the
        // firstSave ceremony against an existing vault ('not-locked' → the lying "Try again"
        // dead-end, found closing U8). Normalize through scenarioFromDraft so the dirty
        // comparison (resultSave.ts) is codec-keyed on BOTH sides; a failed normalization of a
        // just-decoded model is structurally unreachable (the Fork-D round-trip guarantee), so
        // it refuses like the adjacent decode failures — never a silently wrong save state.
        const normalized = scenarioFromDraft(hydrated.draft)
        if (!normalized.ready) {
          setPhase('restore-failed')
          return
        }
        appModel.update(() => hydrated.draft)
        setPersist({ kind: 'saved', scenario: normalized.scenario })
        setPhase('result')
        await appModel.recompute('provisional')
        await appModel.recompute('final')
      } catch {
        if (!cancelled) setPhase('restore-failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrateFromVault])

  if (phase === 'restoring') {
    return (
      <main className="save">
        <PendingPanel status={copy.restoringStatus} />
      </main>
    )
  }

  if (phase === 'restore-failed') {
    return (
      <main className="save">
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1}>
            {copy.unlockHeading}
          </h2>
          <p className="save-step__note" role="alert">
            {copy.unlockGeneric}
          </p>
          <div className="save-actions">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              {copy.restoreRetry}
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (phase === 'save' && saveReady.ready) {
    return (
      <Suspense fallback={null}>
        <SaveFlow
          scenario={saveReady.scenario}
          onCancel={() => setPhase('result')}
          onComplete={() => {
            // Record what the ceremony COMMITTED — the same render-captured scenario passed as
            // its prop (the save phase renders no edit surface, so it cannot have drifted).
            setPersist({ kind: 'saved', scenario: saveReady.scenario })
            setPhase('result')
          }}
        />
      </Suspense>
    )
  }

  if (phase === 'result' || phase === 'save') {
    const view = deriveResultSave(persist, saveReady, readOnly)
    // 'idle'/'pending' = NOTHING has ever resolved (the "Working it out…" window; `pending`
    // never recurs after a first resolve — memoryModel holds the last answer visible). Result
    // withholds its whole actions row there: an affordance we don't want used during the
    // crunch shouldn't exist (Briggsy, 2026-07-02). A compute-error is NOT computing — the
    // actions row (Review = fix the inputs) is that failure's remedy.
    const computing = snapshot.answer.kind === 'idle' || snapshot.answer.kind === 'pending'
    return (
      <Result
        onReview={review}
        computing={computing}
        save={
          view.kind === 'first'
            ? { kind: 'first', onKeep: () => setPhase('save') }
            : view.kind === 'dirty'
              ? { kind: 'dirty', onSave: () => void resave() }
              : view.kind === 'failed'
                ? { ...view, onRetry: () => void resave() }
                : view
        }
      />
    )
  }

  return (
    <IntakeFlow
      steps={steps}
      model={appModel}
      onComplete={complete}
      answerSlot={<AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />}
      // Hydration provenance: a vault-decrypted (or genuinely APPLIED dev-seed) draft
      // answered the spend period before it could ever be saved — Review must not re-nag
      // it. Both signals are mount-lifetime (devSeedApplied never resets), so the flag
      // survives Review re-entries; a bogus `?seed=` key never sets it.
      periodConfirmed={hydrateFromVault || devSeedApplied}
    />
  )
}
