/**
 * P3·U13 — the re-entry balance confirm: the calm gate between a successful unlock and the
 * verdict (council 2026-07-09, wf_a1ef7e25-64d).
 *
 * THE CONFIRM GATES THE REVEAL (adopted red-team constraint (b)): this surface resolves
 * BEFORE the result phase mounts and before any recompute is dispatched — the verdict never
 * renders on unconfirmed balances and then asks (the bait-and-switch). It is UNCONDITIONAL
 * on every return: portfolio drift is undetectable by design (no aggregation, R36), so
 * there is nothing to diff against — the prompt is the whole mechanism.
 *
 * A PROMPT, NEVER AN ATTESTATION (constraint (c)): the affirm records nothing, stamps
 * nothing, and no later surface says "confirmed on DATE" — a reflexive tap must never be
 * laundered into a freshness claim (R19).
 *
 * READ-ONLY (the second-tab arm): the read-back still shows (the disclosure is free), but
 * the update affordance is withheld — `session.save` would refuse the resulting edit, and a
 * dead-end CTA is the lying-remedy shape (U8). The standing View-only banner (App) is the
 * disclosure; the one button here continues to the verdict.
 *
 * The staleness note lines render HERE — at the gate, before the verdict — naming every
 * clock that fired, then the engine-pricing ledger's method line / nameless twin /
 * Medicare-spending re-confirm when they apply (the Q1 disclosure; reentryChrome.ts
 * composes them). The hero carries only the standing one-line echo.
 */
import { useEffect, useId, useRef } from 'react'
import { focusHeading } from '@intake/a11y'
import { copy } from './copy'
import type { ReentryView } from './reentryChrome'
import { isPlainNote } from './noteParts'
import { NotePartsBlock } from './NotePartsBlock'

export interface ReEntryProps {
  readonly view: ReentryView
  readonly readOnly: boolean
  /** Balances affirmed — proceed to the recompute + the verdict. */
  readonly onAffirm: () => void
  /** Something changed — route into the intake walk-through (accounts are edited where
   *  they were entered; the U12 panel precedent). Never offered read-only. */
  readonly onUpdate: () => void
}

function ReadbackGroup({ legend, rows }: { legend: string; rows: ReentryView['balanceRows'] }) {
  if (rows.length === 0) return null
  return (
    <section className="reentry-group">
      <h3 className="reentry-group__legend">{legend}</h3>
      <dl className="reentry-rows">
        {/* Index keys: the list is composed once and never reorders, and a LABEL key would
            collide on two spouses sharing a name (the benefit rows are person-name-labeled). */}
        {rows.map((r, i) => (
          <div key={i} className="reentry-row">
            <dt className="reentry-row__label">{r.label}</dt>
            <dd className="reentry-row__value">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ReEntry({ view, readOnly, onAffirm, onUpdate }: ReEntryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const doorId = useId()
  // W's door rides under the buttons only where the tab can save (the view decides; read-only is the second guard).
  const door = readOnly ? null : view.door
  // The intake focus law: heading-as-focus-target IS the announcement (no live region here).
  useEffect(() => {
    focusHeading(headingRef.current)
  }, [])

  return (
    <main className="save save--reentry">
      <section className="save-step reentry">
        <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
          {copy.reentryHeading}
        </h2>
        {/* Two halves in reading order — what changed since the save, then the read-back it asks
            about with the decision under it. At a wide window they sit side by side (save.css) so
            the decision pair stays in the first frame however many notes an old vault earns; the
            notes are never trimmed to fit (content outranks layout). */}
        <div className="reentry-story">
          <p className="save-step__note">{copy[view.introKey]}</p>
          {view.elapsedLine !== null && <p className="save-step__note">{view.elapsedLine}</p>}
          {view.noteLines.length > 0 && (
            <div className="reentry-notes">
              {/* Keyed by each note's text (composeReentry pushes each at most once); W's stale line is
                  drawn from its parts as a block (council `wf_22858e04-f7a`), and as its old <p> where it has none. */}
              {view.noteLines.map((line) =>
                typeof line === 'string' || isPlainNote(line.parts) ? (
                  <p key={typeof line === 'string' ? line : line.text} className="save-step__note save-field__note--block">
                    {typeof line === 'string' ? line : line.parts.opening}
                  </p>
                ) : (
                  <NotePartsBlock key={line.text} parts={line.parts} className="save-step__note save-field__note--block" />
                ),
              )}
            </div>
          )}
        </div>
        <div className="reentry-confirm">
          <ReadbackGroup legend={copy.reentryBalancesLegend} rows={view.balanceRows} />
          <ReadbackGroup legend={copy.reentryBenefitsLegend} rows={view.benefitRows} />
          <div className="save-actions">
            {readOnly ? (
              <button type="button" className="btn-primary" onClick={onAffirm}>
                {copy.reentryContinueCta}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onAffirm}
                  aria-describedby={door === null ? undefined : `${doorId}-scope`}
                >
                  {copy.reentryAffirmCta}
                </button>
                <button type="button" className="btn-quiet" onClick={onUpdate}>
                  {copy.reentryUpdateCta}
                </button>
              </>
            )}
          </div>
          {/* W's door (council `wf_22858e04-f7a` (2)): the next sibling after the buttons it names, so on the phone it
              lands right under them and at a wide window it fills the column's room below them. The scope sentence
              describes the affirm button: it records nothing about W. */}
          {door !== null && (
            <section className="reentry-door" aria-labelledby={`${doorId}-heading`}>
              <h3 className="reentry-door__heading" id={`${doorId}-heading`}>
                {door.heading}
              </h3>
              <p className="save-step__note save-field__note--block">
                <span id={`${doorId}-scope`}>{door.scope}</span> {door.route}
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}
