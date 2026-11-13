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
 *    pre-checked), and one line in dollars BELOW the group, chosen by the state (R6). Nothing above the
 *    radios reads the answer.
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
import type { ScenarioDraft } from '@store/memoryModel'
import { LEFT_OVER_WAITING_COPY, copy, slots } from '@ui/copy'
import { SegmentedControl, formatMoney } from './fields'
import { workingYearLeftOverDepositsLive, workingYearLeftOverLive, workingYearLeftOverShownState } from './intakeMap'
import { workingYearLeftOverMoved, workingYearLeftOverWaitingWords, writeWorkingYearLeftOver } from './workingYearLeftOver'
import { LEFT_OVER_FACE, type LeftOverShownState } from './workingYearLeftOverState'

/** The one line in dollars below the group (R6), by shown state. `live` is today's printed year-0 Left
 *  over (formatted); `moved` is the moved core's two figures (formatted) and whether today's ROSE above the
 *  stored one: the stored figure is then the smaller, the one a year adds at most (R8), and the line gives the
 *  household that saves it but not all of today's its own way out; where today's FELL, it is already the one
 *  credited. A state with no group draws no line. */
const LINE: Readonly<
  Record<
    LeftOverShownState,
    ((live: string, moved: { stored: string; live: string; rose: boolean } | null) => string) | null
  >
> = {
  'not-asked': null,
  'waiting-on-w': null,
  absent: (live) => slots.workingLedgerLeftOverAbsentLine(live),
  saved: (live) => slots.workingLedgerLeftOverSavedLine(live),
  // The moved core supplies both figures; it is non-null in exactly this state.
  'saved-moved': (live, moved) =>
    moved === null
      ? slots.workingLedgerLeftOverSavedLine(live)
      : moved.rose
        ? slots.workingLedgerLeftOverRoseLine(moved.stored, moved.live)
        : slots.workingLedgerLeftOverFellLine(moved.stored, moved.live),
  spent: (live) => slots.workingLedgerLeftOverSpentLine(live),
  'not-sure': (live) => slots.workingLedgerLeftOverNotSureLine(live),
}

const OPTIONS = [
  { value: 'saved', labelKey: 'workingLedgerLeftOverSaved' },
  { value: 'spent', labelKey: 'workingLedgerLeftOverSpent' },
  { value: 'not-sure', labelKey: 'workingLedgerLeftOverNotSure' },
] as const

export function WorkingYearLeftOverQuestion({
  draft,
  onWrite,
}: {
  readonly draft: ScenarioDraft
  /** The host's commit seam (the walk's `api.update`, the panel's `commitOpen`). The write runs on the
   *  store's CURRENT draft. */
  readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft) => void
}) {
  const figureId = useId()
  const checkId = useId()
  // Memoized on the drawn draft: each read is one candidate build and the producer (shared through the
  // money picture's own memo on the same draft reference).
  const state = useMemo(() => workingYearLeftOverShownState(draft), [draft])
  const live = useMemo(() => workingYearLeftOverLive(draft), [draft])
  const deposits = useMemo(() => workingYearLeftOverDepositsLive(draft), [draft])
  const moved = useMemo(() => workingYearLeftOverMoved(draft), [draft])
  const face = LEFT_OVER_FACE[state]
  const line = LINE[state]
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
              updating carries nothing either (U11 walk 6's R3, B), no "until" (`workingYearLeftOverWaitingWords`). */}
          <span>{copy[LEFT_OVER_WAITING_COPY[workingYearLeftOverWaitingWords(draft)].seat]}</span>
        </p>
      </div>
    )
  }
  const shown = formatMoney(live)
  // The check sentence states its dollars: the left over, the deposits row it sits on, and their sum, all
  // printed rows of the one picture (a year with no deposits row has its own sentence, nothing to sit on).
  const check =
    deposits === null || deposits <= 0
      ? slots.workingLedgerLeftOverCheckNoDeposits(shown)
      : slots.workingLedgerLeftOverCheck(shown, formatMoney(deposits), formatMoney(live + deposits))
  return (
    <div className="left-over">
      <p className="left-over__figure" id={figureId}>
        {slots.workingLedgerLeftOverFigure(shown)}
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
        options={OPTIONS}
        // "All of it" stores the figure THIS face shows (KTD8); the write re-checks R5's gate on the
        // store's current draft and stores nothing where it no longer holds.
        onChange={(kind) => onWrite((d) => writeWorkingYearLeftOver(d, kind, live))}
        describedByIds={`${figureId} ${checkId}`}
      />
      {line !== null && (
        <p className="field-help left-over__line">
          {line(
            shown,
            moved === null
              ? null
              : {
                  stored: formatMoney(moved.stored),
                  live: formatMoney(moved.live),
                  rose: moved.live > moved.stored,
                },
          )}
        </p>
      )}
    </div>
  )
}
