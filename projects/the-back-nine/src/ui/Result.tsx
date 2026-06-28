/*
 * src/ui/Result.tsx — D2 the landed magic moment (the result screen).
 *
 * On intake completion the quiet provisional AnswerStrip gives way to the ELEVATED state-adaptive
 * lead: the {@link FuckOffDate} hero for a still-working household, the {@link ConfidenceStatement}
 * for an all-retired one ({@link selectElevatedAnswer} owns the routing — the choice is the answer the
 * engine already crowned, never a re-derivation). A calm "review" path returns to the intake with
 * every answer preserved (the draft lives in the one `appModel`; nothing is persisted — U8 owns Save).
 *
 * CALM RENDERING (back-nine-design §3): the figures are STATIC and each surface owns its own
 * @starting-style reveal + reduced-motion fallback; this container adds NO theatrics — it only gives
 * the hero room to breathe and seats the quiet return. The hero heading takes focus once on landing
 * (resolvedFocusKey → the surface's focusSignal), the magic-moment announce.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { AnswerStrip } from '@intake/AnswerStrip'
import { missingRequiredFacts } from '@intake/intakeMap'
import { copy } from './copy'
import { appModel } from './appModel'
import { FuckOffDate } from './FuckOffDate'
import { ConfidenceStatement } from './ConfidenceStatement'
import { selectElevatedAnswer, resolvedFocusKey } from './answerView'
import './styles/result.css'

export function Result({ onReview }: { readonly onReview: () => void }) {
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // Retry re-runs the FINAL tier: the result screen only ever shows the crowned final answer, never a
  // provisional re-blank (a provisional re-fire would mint a higher epoch and supersede the final).
  const retry = useCallback(() => void appModel.recompute('final'), [])

  const elevated = selectElevatedAnswer(snapshot, retry)
  const focusKey = resolvedFocusKey(elevated)

  return (
    <main className="result">
      <div className="result-hero">
        {elevated.kind === 'date' && <FuckOffDate view={elevated.view} focusSignal={focusKey} />}
        {elevated.kind === 'spine' && (
          <ConfidenceStatement view={elevated.view} focusSignal={focusKey} />
        )}
        {elevated.kind === 'fallback' && (
          <AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />
        )}
      </div>
      <div className="result-actions">
        <button type="button" className="btn-quiet" onClick={onReview}>
          {copy.resultReview}
        </button>
      </div>
    </main>
  )
}
