import { copy, slots } from '@ui/copy'
import { dateOddsText } from '@ui/dateOdds'
import { verdictReadingText } from '@ui/verdictSentence'
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
 *  - "X of 10" is the pinned frame; the top of scale reads "better than 9 in 10"
 *    via the composer's ceiling route, `verdictReadingText` — "10 of 10" can
 *    never appear (council 2026-07-18 Q4a: this doc used to promise a ceiling
 *    the render never routed — the strip read "9 of 10" where the hero read the
 *    proportion); the date grade renders its CONSERVATIVE quantized lower bound;
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

/** One kind's block: the lead, the middot-separated fact names, the closing line.
 *  Extracted so the two kinds share the atomic-unit / overflow behaviour exactly and can
 *  never drift apart — only their two strings differ. */
function FactBlock({
  facts,
  leadText,
  tailText,
}: {
  readonly facts: readonly MissingFact[]
  readonly leadText: string
  readonly tailText: string
}) {
  if (facts.length === 0) return null
  const { shown, more } = missingFactNames(facts)
  return (
    <>
      <p className="strip-secondary">
        {leadText}{' '}
        {/* each fact is an ATOMIC unit (nowrap) so a range like "(62–70)" never splits at
            the en-dash; the list wraps BETWEEN facts at the middot separator (CSS ::before). */}
        {shown.map((name) => (
          <span className="strip-fact" key={name}>
            {name}
          </span>
        ))}
        {more > 0 && (
          <span className="strip-fact" key="__more">
            {slots.factsMore(more)}
          </span>
        )}
      </p>
      <p className="strip-tertiary">{tailText}</p>
    </>
  )
}

/** The strip's LEAD over a blocked answer. Keep-going ("takes shape as you go") is only honest
 *  while something the reader can still enter is holding the answer up. When EVERY blocker is
 *  unrepresentable, no amount of entry will finish it, and the keep-going lead becomes a promise
 *  the tool cannot keep — so the lead states the withhold instead. A MIXED household keeps the
 *  keep-going lead: it has real facts left to enter, and the unrepresentable block below says
 *  plainly which part is out of reach. */
/** The names a block of missing facts shows — deduped, the first three, the rest as a count. ONE
 *  producer for every surface that lists missing facts (the strip's FactBlock and the assumptions
 *  panel's aria-modal echo), so the two can never disagree on what "N more" hides. */
export function missingFactNames(facts: readonly MissingFact[]): { readonly shown: readonly string[]; readonly more: number } {
  const names = [...new Set(facts.map((m) => copy[m.labelKey]))]
  const shown = names.slice(0, 3)
  return { shown, more: names.length - shown.length }
}

export function blockedLeadFor(missing: readonly MissingFact[]): string {
  const anyActionable = missing.some((m) => (m.kind ?? 'absent') === 'absent')
  const anyWithheld = missing.some((m) => m.kind === 'unrepresentable')
  return anyWithheld && !anyActionable ? copy.answerWithheldLead : copy.answerIncomplete
}

/** The two blocks are SEPARATE and both render when both are non-empty — a household can be
 *  mid-entry (absent facts) AND carry a shape v1 cannot price at the same time, and collapsing
 *  them would put an answered fact under "Still needed" or an unentered one under "nothing here
 *  for you to add". Absent leads: it is the arm the reader can act on. */
function MissingList({ missing }: { missing: readonly MissingFact[] }) {
  if (missing.length === 0) return null
  return (
    <>
      <FactBlock
        facts={missing.filter((m) => (m.kind ?? 'absent') === 'absent')}
        leadText={copy.answerStillNeeded}
        tailText={copy.answerNoSynthesis}
      />
      <FactBlock
        facts={missing.filter((m) => m.kind === 'unrepresentable')}
        leadText={copy.answerCannotPrice}
        tailText={copy.answerCannotPriceTail}
      />
    </>
  )
}

function DateLine({ track, windowTopYears }: { track: DateTrackOutcome; windowTopYears: number }) {
  if (track.kind === 'no-date-in-window') {
    return <p className="strip-lead">{slots.noDateInWindow(windowTopYears)}</p>
  }
  const odds = dateOddsText(track.grade.quantizedLowerBound)
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
          <p className="strip-lead strip-muted">{blockedLeadFor(missing)}</p>
          <MissingList missing={missing} />
        </>
      )}

      {/* U12 (the F9 demotion): a required fact stopped being validly present AFTER an answer
          had resolved — the same naming grammar as idle (answerView routes this arm here with
          exactly that promise; before this arm existed the demoted state rendered an EMPTY
          strip — a blank hero over a real household, found by the U12·C1 door battery). */}
      {answer.kind === 'inputs-incomplete' && (
        <>
          <p className="strip-lead strip-muted">{blockedLeadFor(missing)}</p>
          <MissingList missing={missing} />
        </>
      )}

      {answer.kind === 'pending' && (
        // strip-thinking: the app-wide breathing "working" gesture (base.css). A sub-second
        // intake tick shows barely a quarter-breath — imperceptible there by design; the full
        // breath reads on the longer decrypt-on-return / completion crunch.
        <p className="strip-lead strip-muted strip-thinking">{copy.answerPending}</p>
      )}

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
            <p className="strip-lead strip-muted">{blockedLeadFor(missing)}</p>
            <MissingList missing={missing} />
          </>
        ) : null /* cancelled: a newer run is already in flight — hold quiet */)}

      {answer.kind === 'headline' &&
        (answer.result.headline.outcomeState === 'indeterminate' ? (
          <>
            <p className="strip-lead strip-muted">{blockedLeadFor(missing)}</p>
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
              {`${OUTCOME_WORDS[answer.result.headline.outcomeState]} — ${verdictReadingText(answer.result.headline.outcomeState, answer.result.headline.xOfTen.value)}`}
            </p>
            <p className="strip-tertiary" data-testid="provisional-tag">
              {copy.answerProvisionalTag}
            </p>
          </>
        ))}
    </aside>
  )
}
