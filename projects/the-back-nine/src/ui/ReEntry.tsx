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
 *
 * Act 6 · RC19: its own page in the first-run stepper's frame (the white bar with the wordmark, the page's title, the
 * content on the stepper's 90rem column). Two halves in reading order, side by side past the laptop seam: what changed
 * (the intro, the elapsed line, the notes) on the left, and on the right the read-back in a card with the decision pair
 * under it and W's door under the pair, so the pair and the door stay in the first frame at his window however many
 * notes an old vault earns (the short tier tightens the card's rows and gaps for the four-bucket read-back, the tallest;
 * `e2e/rc-screens.spec.ts`'s pay check unlock arms read it) (the notes are never trimmed to fit: content outranks layout). The class names the tests and the fit gate
 * read (`reentry`, `reentry-story`, `reentry-notes`, `reentry-confirm`, `reentry-group`, `reentry-row__label`,
 * `reentry-actions`, `reentry-door`) are hooks; the look is the kit's utilities.
 */
import { useEffect, useId, useRef } from 'react'
import { focusHeading } from '@intake/a11y'
import { copy } from './copy'
import { Button, Wordmark } from './kit'
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
    <section className="reentry-group flex flex-col gap-2">
      <h3 className="reentry-group__legend text-body font-semibold text-stone-900">{legend}</h3>
      <dl className="reentry-rows flex flex-col divide-y divide-stone-300 border-y border-stone-300">
        {/* Index keys: the list is composed once and never reorders, and a LABEL key would
            collide on two spouses sharing a name (the benefit rows are person-name-labeled). */}
        {rows.map((r, i) => (
          <div key={i} className="reentry-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 compact:py-1.5">
            <dt className="reentry-row__label min-w-0 text-body text-stone-600">{r.label}</dt>
            <dd className="reentry-row__value text-body font-medium text-stone-900 tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** A gate note's paragraph (the notes' one class, so a test can read a note whole). */
const NOTE = 'reentry-note'
/** The decision pair's buttons: a label wider than the phone wraps and its box grows (the kit never cuts a label). */
const PAIR = 'h-auto min-h-10 w-full shrink whitespace-normal py-2 text-center wide:w-auto'

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
    <div className="rc-root flex w-full flex-1 flex-col bg-bg" data-reentry-page="">
      <header className="w-full border-b border-stone-300 bg-bg">
        <div className="mx-auto flex min-h-12.5 max-w-[90rem] items-center px-4 wide:px-10 compact:min-h-12">
          <Wordmark mark={copy.shellMark} title={copy.appTitle} />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="reentry mx-auto flex w-full max-w-[90rem] flex-col gap-5 px-4 pt-6 pb-10 wide:px-10 wide:pt-10 compact:gap-3 compact:pt-4">
          <h2 className="text-chart-title font-semibold text-stone-900 outline-none wide:text-page-title compact:text-chart-title" tabIndex={-1} ref={headingRef}>
            {copy.reentryHeading}
          </h2>
          {/* Two halves in reading order — what changed since the save, then the read-back it asks about with the decision
              under it. Past the laptop seam they sit side by side so the decision pair stays in the first frame. */}
          <div className="grid grid-cols-1 gap-6 laptop:grid-cols-2 laptop:gap-10">
            <div className="reentry-story flex min-w-0 flex-col gap-4 text-body text-stone-900">
              <p className={NOTE}>{copy[view.introKey]}</p>
              {view.elapsedLine !== null && <p className={NOTE}>{view.elapsedLine}</p>}
              {view.noteLines.length > 0 && (
                <div className="reentry-notes flex flex-col gap-4 border-l-4 border-plum pl-4">
                  {/* Keyed by each note's text (composeReentry pushes each at most once); W's stale line is
                      drawn from its parts as a block (council `wf_22858e04-f7a`), and as its old <p> where it has none. */}
                  {view.noteLines.map((line) =>
                    typeof line === 'string' || isPlainNote(line.parts) ? (
                      <p key={typeof line === 'string' ? line : line.text} className={NOTE}>
                        {typeof line === 'string' ? line : line.parts.opening}
                      </p>
                    ) : (
                      <NotePartsBlock key={line.text} parts={line.parts} className={NOTE} />
                    ),
                  )}
                </div>
              )}
            </div>
            <div className="reentry-confirm flex min-w-0 flex-col gap-5 self-start rounded-card border border-stone-300 bg-bg p-4 wide:p-6 compact:gap-3 compact:p-4">
              <ReadbackGroup legend={copy.reentryBalancesLegend} rows={view.balanceRows} />
              <ReadbackGroup legend={copy.reentryBenefitsLegend} rows={view.benefitRows} />
              <div className="reentry-actions flex flex-col gap-3 wide:flex-row wide:flex-wrap wide:items-center">
                {readOnly ? (
                  <Button variant="primary" className={PAIR} onClick={onAffirm}>
                    {copy.reentryContinueCta}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" className={PAIR} onClick={onAffirm} aria-describedby={door === null ? undefined : `${doorId}-scope`}>
                      {copy.reentryAffirmCta}
                    </Button>
                    <Button variant="neutral" className={PAIR} onClick={onUpdate}>
                      {copy.reentryUpdateCta}
                    </Button>
                  </>
                )}
              </div>
              {/* W's door (council `wf_22858e04-f7a` (2)): the next sibling after the buttons it names, so on the phone it
                  lands right under them and at a wide window it fills the column's room below them. The scope sentence
                  describes the affirm button: it records nothing about W. */}
              {door !== null && (
                <section className="reentry-door flex flex-col gap-1 border-t border-stone-300 pt-4" aria-labelledby={`${doorId}-heading`}>
                  <h3 className="reentry-door__heading text-body font-semibold text-stone-900" id={`${doorId}-heading`}>
                    {door.heading}
                  </h3>
                  <p className="text-body text-stone-600">
                    <span id={`${doorId}-scope`}>{door.scope}</span> {door.route}
                  </p>
                </section>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
