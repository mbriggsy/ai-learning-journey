import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { IntakeFlow } from '@intake/flow'
import { intakeSteps } from '@intake/questions'
import { AnswerStrip } from '@intake/AnswerStrip'
import { missingRequiredFacts } from '@intake/intakeMap'
import { appModel } from './appModel'
import { Result } from './Result'
import { scenarioFromDraft } from './scenarioFromDraft'

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
export default function IntakeApp({ seed }: { seed?: string | null }) {
  const [phase, setPhase] = useState<'intake' | 'result' | 'save'>('intake')
  const [saved, setSaved] = useState(false)
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
  // Re-entering intake after a Save edits the saved scenario — the "saved" badge no longer holds
  // (the on-screen answer may now differ from what's on disk), so it clears on review.
  const reviewAfterSave = useCallback(() => {
    setSaved(false)
    setPhase('intake')
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
      setPhase('result')
      await appModel.recompute('provisional')
      await appModel.recompute('final')
    })
    return () => {
      cancelled = true
    }
  }, [seed])

  if (phase === 'save' && saveReady.ready) {
    return (
      <Suspense fallback={null}>
        <SaveFlow
          scenario={saveReady.scenario}
          onCancel={() => setPhase('result')}
          onComplete={() => {
            setSaved(true)
            setPhase('result')
          }}
        />
      </Suspense>
    )
  }

  if (phase === 'result' || phase === 'save') {
    return (
      <Result
        onReview={saved ? reviewAfterSave : review}
        onKeep={saveReady.ready && !saved ? () => setPhase('save') : undefined}
        saved={saved}
      />
    )
  }

  return (
    <IntakeFlow
      steps={steps}
      model={appModel}
      onComplete={complete}
      answerSlot={<AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />}
    />
  )
}
