/**
 * U8 recovery-phrase display step. The phrase is a full credential (screenshot/phishing threat
 * model), so it is presented NON-SELECTABLE (a UX defense against shoulder-surfing + accidental
 * clipboard copy — honestly NOT a DOM/crypto control) and print-preferred, with the store-offline
 * instruction. It still exposes the words as ordered, character-reviewable TEXT in the a11y tree
 * (the reader is color-blind, not blind; a11y blocker #1) — the heap-drop happens only after the
 * capture step passes, owned by SaveFlow.
 */
import { useEffect, useRef } from 'react'
import { copy } from './copy'
import { focusHeading } from '@intake/a11y'

export function RecoveryPhraseDisplay({
  phrase,
  onContinue,
}: {
  readonly phrase: readonly string[]
  readonly onContinue: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => focusHeading(headingRef.current), [])

  return (
    <section className="save-step">
      <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
        {copy.phraseHeading}
      </h2>
      <p className="save-step__intro">{copy.phraseIntro}</p>

      {/* user-select:none in CSS — the words stay in the a11y tree, just not casually copyable. */}
      <ol className="save-phrase" aria-label={copy.phraseHeading}>
        {phrase.map((word, i) => (
          <li className="save-phrase__word" key={`${i}-${word}`}>
            {word}
          </li>
        ))}
      </ol>

      <p className="save-step__note">{copy.phraseStoreNote}</p>

      <div className="save-actions">
        <button type="button" className="btn-quiet" onClick={() => window.print()}>
          {copy.phrasePrint}
        </button>
        <button type="button" className="btn-primary" onClick={onContinue}>
          {copy.phraseWroteItDown}
        </button>
      </div>
    </section>
  )
}
