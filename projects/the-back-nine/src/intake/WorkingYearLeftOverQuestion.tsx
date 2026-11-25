/**
 * Build 2's left-over question (`docs/plans/features/working-year-surplus-build-spec.md` R3, R5, R6, R16;
 * KTD8) — ONE face for its two homes, so they never disagree: the walk's money-picture step body, below
 * the whole picture, and the assumptions panel's own seat below the W row. Never inside the shared
 * picture component: the panel's W row holds its whole draft under a press, which is safe only while no
 * control lives above the question in it.
 *
 * What it draws comes from R3's shown state (`workingYearLeftOverShownState`, the one read), through
 * exhaustive `Record`s (insight 147):
 *  · "not asked" — nothing (no picture to ask under, or a year 0 below a printed $1; R5);
 *  · "waiting on W" — one calm line, no radios, so no "saved" is stored against a stale W (R5's panel
 *    face; the walk never gets here, because the W step's gate stops a stale W before this step);
 *  · every other state — the year-0 figure and the check sentence (the group's described-by lines, which
 *    read the picture, never the answer), the radio group (a static legend and static labels, nothing
 *    pre-checked), and one line in dollars BELOW the group, chosen by the state (R6) — then, under a carried
 *    "saved" answer on a fresh typed figure below today's spending, the typed-below line's spans over the whole
 *    working window (U11 walk 7's R2; the whole-window rebuild's KTD6, host 3: one run as a paragraph, two or more as
 *    an ordered list of runs). Nothing above the radios reads the answer: where a typed figure sits below the spending, the
 *    figure names it off W alone.
 *
 * `draft` is the draft the face DRAWS: the walk's live draft; in the panel, the draft the gesture hold
 * drew at a press (`AssumptionPanel`'s `WorkingYearRows`). "All of it" stores the figure drawn here; the
 * write re-checks R5's gate on the store's current draft (`writeWorkingYearLeftOver`). No live region,
 * no alert. In the walk the line below the group changes only where the household just pressed (nothing else
 * on that step commits). In the panel it also redraws on any other row's commit that moves year 0 or the
 * shown state (a W, spending or investment edit): those faces are the household's own edit landing, the W
 * row announces the one edge that matters there (W going stale), and a moved answer reaches the Result and
 * the re-entry gate in words (R12).
 */
import { useId, useMemo } from 'react'
import type { WorkingYearLeftOverKind } from '@shared/model'
import { LEFT_OVER_LINE, LEFT_OVER_OPTIONS, leftOverCheck, leftOverFigureLine, movedWords } from './leftOverFace'
import type { ScenarioDraft } from '@store/memoryModel'
import { NotePartsBlock } from '@ui/NotePartsBlock'
import { isPlainNote } from '@ui/noteParts'
import { SegmentedControl } from './fields'
import { formatMoney } from './moneyFormat'
import { workingYearLeftOverDepositsLive, workingYearLeftOverLive, workingYearLeftOverShownState } from './intakeMap'
import {
  workingYearLeftOverAtQuoteLine,
  workingYearLeftOverMoved,
  workingYearLeftOverTypedBelow,
  workingYearLeftOverWaitingSeat,
  writeWorkingYearLeftOver,
  type TypedBelowSeatHost,
} from './workingYearLeftOver'
import { LEFT_OVER_FACE } from './workingYearLeftOverState'

export function WorkingYearLeftOverQuestion({
  draft,
  onWrite,
  typedBelowHost,
}: {
  readonly draft: ScenarioDraft
  /** The host's commit seam (the walk's `api.update`, the panel's `commitOpen`). The write runs on the
   *  store's CURRENT draft. */
  readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft) => void
  /** Which home draws the seat, so whether the typed-below spans below the radios open on the counts sentence
   *  (`TypedBelowSeatHost`: the panel's W row above carries the lean, the walk's money-picture step has none above).
   *  Required: each home states it, and the seat never guesses its host. */
  readonly typedBelowHost: TypedBelowSeatHost
}) {
  const figureId = useId()
  const checkId = useId()
  // Memoized on the drawn draft: each read is one candidate build and the producer (shared through the
  // money picture's own memo on the same draft reference).
  const state = useMemo(() => workingYearLeftOverShownState(draft), [draft])
  const live = useMemo(() => workingYearLeftOverLive(draft), [draft])
  const deposits = useMemo(() => workingYearLeftOverDepositsLive(draft), [draft])
  const moved = useMemo(() => workingYearLeftOverMoved(draft), [draft])
  // U11 walk 7's R2: the typed figure the figure rests on (read off W alone, so the text above the radios stays the same
  // under every answer, R6), and, under a carried "saved" answer, the typed-below line's spans below them.
  const typedBelow = useMemo(() => workingYearLeftOverTypedBelow(draft), [draft])
  const atQuote = useMemo(() => workingYearLeftOverAtQuoteLine(draft, typedBelowHost), [draft, typedBelowHost])
  const face = LEFT_OVER_FACE[state]
  const line = LEFT_OVER_LINE[state]
  if (face === 'none' || live === null) return null
  if (face === 'waiting') {
    return (
      <div className="left-over__waiting" role="note">
        <p className="left-over__waiting-text">
          <svg className="not-saved-icon" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="4.5" r="0.9" fill="currentColor" />
          </svg>
          {/* In the act's verb, the reader acting (U11 walk 5's (bn); `WORKING_COST_ACT_COPY`): W is stale here — or, where
              updating carries nothing either (U11 walk 6's R3, B), no "until", and where year 0 at the quote comes up
              short, its run in dollars (U11 walk 7's R5; `workingYearLeftOverWaitingSeat`). */}
          <span>{workingYearLeftOverWaitingSeat(draft)}</span>
        </p>
      </div>
    )
  }
  const shown = formatMoney(live)
  // The check sentence (`leftOverCheck`, `leftOverFace.ts`).
  const check = leftOverCheck(live, deposits)
  return (
    <div className="left-over">
      <p className="left-over__figure" id={figureId}>
        {leftOverFigureLine(shown, typedBelow)}
      </p>
      <p className="field-help" id={checkId}>
        {check}
      </p>
      <SegmentedControl<WorkingYearLeftOverKind>
        legendKey="workingLedgerLeftOverLegend"
        name="working-year-left-over"
        vertical
        // Nothing pre-checked: an unanswered question checks no reply (R1) — never a default kind.
        value={draft.workingYearLeftOver?.kind}
        options={LEFT_OVER_OPTIONS}
        // "All of it" stores the figure THIS face shows (KTD8); the write re-checks R5's gate on the
        // store's current draft and stores nothing where it no longer holds.
        onChange={(kind) => onWrite((d) => writeWorkingYearLeftOver(d, kind, live))}
        describedByIds={`${figureId} ${checkId}`}
      />
      {line !== null && (
        <p className="field-help left-over__line">
          {line(shown, movedWords(moved))}
        </p>
      )}
      {/* The typed-below line's runs (U11 walk 7's R2; the whole-window rebuild's KTD6, host 3), after the per-answer
          line: in every working year, what the answer at the household's own spending would add beside this answer's.
          Below the radios because they read the answer (R6); `workingYearLeftOverAtQuoteLine`'s docblock says why never
          above, in the W row. One run is its old paragraph; two or more, the runs' block every host draws (KD7, KD8). */}
      {atQuote !== null &&
        (isPlainNote(atQuote) ? (
          <p className="field-help left-over__at-quote">{atQuote.opening}</p>
        ) : (
          <NotePartsBlock parts={atQuote} className="field-help left-over__at-quote" />
        ))}
    </div>
  )
}
