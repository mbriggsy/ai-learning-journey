import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { IntakeFlow } from '@intake/flow'
import { intakeSteps } from '@intake/questions'
import { AnswerStrip } from '@intake/AnswerStrip'
import { missingRequiredFacts } from '@intake/intakeMap'
import { appModel } from './appModel'
import { Result } from './Result'

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
export default function IntakeApp() {
  const [phase, setPhase] = useState<'intake' | 'result'>('intake')
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const steps = useMemo(() => intakeSteps(snapshot.draft), [snapshot.draft])
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
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

  if (phase === 'result') return <Result onReview={review} />

  return (
    <IntakeFlow
      steps={steps}
      model={appModel}
      onComplete={complete}
      answerSlot={<AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />}
    />
  )
}
