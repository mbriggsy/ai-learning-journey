import { copy, slots } from '@ui/copy'
import type { DateTrackOutcome, OutcomeState } from '@shared/model'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import type { MissingFact } from './intakeMap'

/**
 * The provisional answer strip (D1's surface-early gut-check — D2 composes the
 * full state-adaptive magic-moment surface over U6/U7; this strip is its
 * minimal honest precursor and deliberately quiet: the QUESTION stays the hero
 * of every screen).
 *
 * Honesty rules carried here:
 *  - everything renders under the PROVISIONAL tag until the account set is
 *    complete — a date moving earlier is a labeled update, never a delight
 *    tick; an off-track mid-entry reading wears the incompleteness class;
 *  - the input-incomplete placeholder NAMES the missing inputs and why the
 *    tool won't synthesize the ACA quote (R36);
 *  - "X of 10" is the pinned frame; the top of scale reads "more than 9 of 10"
 *    (10 of 10 can never appear); the date grade renders its CONSERVATIVE
 *    quantized lower bound;
 *  - numbers render STATIC (no count-up — the calm law), in tabular figures
 *    (inherited);
 *  - `pending` appears only pre-first-resolve (memoryModel holds the last
 *    answer through later recomputes — the no-flicker contract).
 */

const OUTCOME_WORDS: Readonly<Record<Exclude<OutcomeState, 'indeterminate'>, string>> = {
  'on-track': copy.outcomeOnTrack,
  borderline: copy.outcomeBorderline,
  'off-track': copy.outcomeOffTrack,
  'over-funded': copy.outcomeOverFunded,
  'already-failing': copy.outcomeAlreadyFailing,
}

function MissingList({ missing }: { missing: readonly MissingFact[] }) {
  if (missing.length === 0) return null
  const names = [...new Set(missing.map((m) => copy[m.labelKey]))]
  const shown = names.slice(0, 3)
  return (
    <>
      <p className="strip-secondary">
        {copy.answerStillNeeded} {shown.join(' · ')}
        {names.length > shown.length ? ` (+${names.length - shown.length})` : ''}
      </p>
      <p className="strip-tertiary">{copy.answerNoSynthesis}</p>
    </>
  )
}

function DateLine({ track, windowTopYears }: { track: DateTrackOutcome; windowTopYears: number }) {
  if (track.kind === 'no-date-in-window') {
    return <p className="strip-lead">{slots.noDateInWindow(windowTopYears)}</p>
  }
  const odds = slots.withOdds(slots.xOfTen(Math.round(track.grade.quantizedLowerBound * 10)))
  const lead =
    track.offsetYears === 0 ? copy.dateFreeToday : slots.dateInYears(track.offsetYears)
  return (
    <p className="strip-lead">
      {lead} <span className="strip-odds">{`(${odds})`}</span>
      {track.kind === 'window-edge-unconfirmed' && (
        <span className="strip-secondary">{` — ${copy.dateWindowEdge}`}</span>
      )}
    </p>
  )
}

export function AnswerStrip({
  snapshot,
  missing,
  onRetry,
}: {
  readonly snapshot: MemoryModelSnapshot
  readonly missing: readonly MissingFact[]
  readonly onRetry: () => void
}) {
  const { answer } = snapshot
  // THE TRUST HAZARD GUARD (D1 provisional design): with ZERO accounts entered
  // a spine reading is computed against a $0 portfolio — a NEGATIVE verdict
  // there is structurally misleading and wears the incompleteness-tied class,
  // NEVER the verdict word (positives can only improve as accounts land, so
  // they render normally under the provisional tag).
  const accountsEntered = snapshot.draft.enteredAccounts.length > 0
  const negativeStates: ReadonlySet<OutcomeState> = new Set(['off-track', 'already-failing'])

  return (
    // aria-live: the answer is the product's core output — announce its updates
    // to AT users (the strip-lead text); a STABLE region label that never
    // contradicts the content (D1 review — was the incomplete-only string).
    <aside className="answer-strip" aria-label={copy.answerRegionLabel} aria-live="polite">
      {answer.kind === 'idle' && (
        <>
          <p className="strip-lead strip-muted">{copy.answerIncomplete}</p>
          <MissingList missing={missing} />
        </>
      )}

      {answer.kind === 'pending' && <p className="strip-lead strip-muted">{copy.answerPending}</p>}

      {answer.kind === 'compute-error' && (
        <p className="strip-lead">
          {copy.answerError}{' '}
          <button type="button" className="btn-quiet" onClick={onRetry}>
            {copy.answerRetry}
          </button>
        </p>
      )}

      {answer.kind === 'date' &&
        (answer.outcome.kind === 'dates' ? (
          <>
            {/* v1 degenerate budget: floor ≡ lifestyle — rendered as ONE date. */}
            <DateLine track={answer.outcome.floor} windowTopYears={answer.outcome.windowTopYears} />
            <p className="strip-tertiary" data-testid="provisional-tag">
              {copy.answerProvisionalTag}
            </p>
          </>
        ) : answer.outcome.kind === 'input-failure' ? (
          <>
            <p className="strip-lead strip-muted">{copy.answerIncomplete}</p>
            <MissingList missing={missing} />
          </>
        ) : null /* cancelled: a newer run is already in flight — hold quiet */)}

      {answer.kind === 'headline' &&
        (answer.result.headline.outcomeState === 'indeterminate' ? (
          <>
            <p className="strip-lead strip-muted">{copy.answerIncomplete}</p>
            <MissingList missing={missing} />
          </>
        ) : !accountsEntered && negativeStates.has(answer.result.headline.outcomeState) ? (
          <>
            <p className="strip-lead strip-muted">{copy.answerNotYet}</p>
            <MissingList missing={missing} />
          </>
        ) : (
          <>
            <p className="strip-lead" data-testid="engine-reading">
              {`${OUTCOME_WORDS[answer.result.headline.outcomeState]} — ${slots.xOfTen(answer.result.headline.xOfTen.value)}`}
            </p>
            <p className="strip-tertiary" data-testid="provisional-tag">
              {copy.answerProvisionalTag}
            </p>
          </>
        ))}
    </aside>
  )
}
