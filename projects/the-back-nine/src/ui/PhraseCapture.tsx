/**
 * U8 phrase-CAPTURE step (the council's hidden-then-retype, 2026-06-30). The phrase is dismissed;
 * the user re-types a positional subset from their OWN written copy — forcing transcription, not a
 * tautological re-read. It is an ENGAGEMENT NUDGE, never proof: the copy never says "verified /
 * you're safe", and a "show my words again" hatch re-arms the display. Dumb wiring over the pure
 * `phraseCaptureChallenge.ts` decision (positions + match).
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { copy, slots } from './copy'
import { focusHeading } from '@intake/a11y'
import { selectChallengePositions, matchChallenge } from './phraseCaptureChallenge'

export function PhraseCapture({
  phrase,
  onPass,
  onShowAgain,
}: {
  readonly phrase: readonly string[]
  readonly onPass: () => void
  readonly onShowAgain: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => focusHeading(headingRef.current), [])

  const positions = useMemo(() => selectChallengePositions(phrase), [phrase])
  const fieldPrefix = useId()
  const [answers, setAnswers] = useState<string[]>(() => positions.map(() => ''))
  const [perPosition, setPerPosition] = useState<readonly boolean[] | null>(null)

  function handleSubmit() {
    const result = matchChallenge(phrase, positions, answers)
    if (result.allMatch) {
      onPass()
      return
    }
    setPerPosition(result.perPosition)
  }

  const showMismatch = perPosition !== null && !perPosition.every(Boolean)

  return (
    <section className="save-step">
      <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
        {copy.captureHeading}
      </h2>
      <p className="save-step__intro">{copy.captureIntro}</p>

      <div className="save-capture">
        {positions.map((pos, i) => {
          const id = `${fieldPrefix}-${i}`
          const wrong = perPosition !== null && perPosition[i] === false
          return (
            <div className="save-field" key={pos}>
              <label className="save-field__label" htmlFor={id}>
                {slots.captureWordOrdinal(pos + 1)}
              </label>
              <input
                id={id}
                className="save-field__input"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={answers[i] ?? ''}
                aria-invalid={wrong}
                onChange={(e) => {
                  const next = [...answers]
                  next[i] = e.target.value
                  setAnswers(next)
                  setPerPosition(null)
                }}
              />
            </div>
          )
        })}
      </div>

      {showMismatch && (
        <p className="save-step__note" role="alert">
          {copy.captureMismatch}
        </p>
      )}

      <div className="save-actions">
        <button type="button" className="btn-quiet" onClick={onShowAgain}>
          {copy.captureShowAgain}
        </button>
        <button type="button" className="btn-primary" onClick={handleSubmit}>
          {copy.flowNext}
        </button>
      </div>
    </section>
  )
}
