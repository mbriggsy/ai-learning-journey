import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { copy, slots, type CopyKey } from '@ui/copy'
import type { SpendEntryPeriod, WorkingYearStateTaxReading } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { CurrencyField, SegmentedControl, formatMoney } from './fields'
import { threeThenMore } from './AnswerStrip'
import { useGestureHold } from './gestureHold'
import { workingYearCostFigure } from './intakeMap'
import { WORKING_COST_ANSWER_FIELD, WORKING_COST_FIELD } from './sanity'
import {
  heldYesBelowQuote,
  workingCostBelowMedical,
  workingYearCostStaleness,
  workingYearCostStaleText,
  workingYearQuote,
  workingYearStateTaxReading,
  writeClearedWorkingYearCost,
  writeConfirmedWorkingYearCost,
  writeEnteredWorkingYearCost,
  writeKeptWorkingYearCost,
  writeWorkingYearCostPeriod,
  type WorkingYearQuote,
} from './workingYearQuote'

/**
 * The pay check's W question (`docs/plans/features/working-year-pay-check-build-spec.md` U8; KTD5,
 * KTD17, KTD18, KTD21) — ONE face for the intake's W step and the assumption panel's W row (the
 * `MedicareExtrasFork` precedent: one face, host-supplied commit seams), so the two input surfaces
 * over the same answer can never disagree.
 *
 * The face, top to bottom: the stale note (KTD21 — `role="note"`, present before any tap, with a
 * "keep" door on a stale entered figure, and on a stale yes whose figure is not below today's quote);
 * the quote in its own slot ABOVE the static legend
 * (KTD17), then the lines it left out (at most three, then "N more"); the help — what to count and
 * what to leave out, two short lists — and its state sentence, by the draft's state-tax reading; the
 * yes / different-figure fork (no option checked on an absent or stale `confirmed`
 * answer); the figure with its period control, reserved in the same slot from the moment the figure
 * option opens (untapped period: month, on every household); the W-below-M note.
 *
 * The stale note is the one part of the face drawn from the W a PRESS found (`gestureHold.ts`, the h2
 * cure): the press that blurs a typed figure commits it, and that must not unmount the note — moving
 * every control below it, or taking its own Keep door away — before the release. The door keeps the
 * figure it names, and answers its unit.
 *
 * What the two hosts do differently is only WHERE a write lands (`host`):
 *  · the walk clears the draft's W when "a different figure" is chosen over a held `confirmed`
 *    answer, and when the typed figure is cleared (Phase B ruling 10 — the gate then holds Continue
 *    until a figure commits, so the screen and the draft never disagree);
 *  · the panel never clears (KTD4: a panel clear keeps the last committed answer) and refuses a bad
 *    figure before it reaches the draft (`commitRefusing`).
 */
/** `'answer'` = yes, a figure, keep or clear (the panel validates it first); `'period'` = a unit
 *  re-base after an explicit period tap (the panel commits it open: the tap itself disarms the period
 *  rule, and the figure was already above $0); `'tapped-answer'` = a figure whose unit the household
 *  has just named — one the host REFUSED on blur, committed again in the unit a period tap just
 *  chose, or a held yes kept through the "Keep $X a year" door (ruling 34) — the panel validates it
 *  counting that tap, so the zero rule still guards and nothing lands unasked. */
export type WorkingCostWriteKind = 'answer' | 'period' | 'tapped-answer'

export interface WorkingCostQuestionProps {
  readonly draft: ScenarioDraft
  readonly host: 'step' | 'panel'
  /** Land a W write through the host's seam; `true` when it reached the draft, `false` when the host
   *  refused it (the panel's `commitRefusing`; the walk always lands it). */
  readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft, kind: WorkingCostWriteKind) => boolean
  /** The unit on screen is answered — the host marks the W period path touched (the one disarm of
   *  `working-cost-period-unconfirmed`). Called on a period tap, by the Keep door that names its unit,
   *  and at mount over an entered W (ruling 38: this face owns when the disarm stands). */
  readonly onPeriodTap: () => void
  /** The unit on screen is NOT answered any more — the host drops the W period path's touched entry.
   *  Called at mount over a draft holding no entered W, and when the draft's W stops being `entered`
   *  with no period tapped on this face (ruling 38). */
  readonly onPeriodReset: () => void
  /** "A different figure" was picked — an answer to the fork, so the walk forgives the gate's alert
   *  until its next Continue (the re-edit law: an error clears the instant its field is re-edited). */
  readonly onPickFigure?: () => void
  /** The first keystroke while the figure shows an error — the host forgives it (re-validated on
   *  blur / Continue). */
  readonly onEditFigure: () => void
  /** The W gate's violation is showing (the walk only — the panel never names `.answer`). */
  readonly answerInvalid?: boolean
  readonly answerErrors?: ReactNode
  /** The figure's own violations (zero, period) are showing. */
  readonly figureInvalid: boolean
  readonly figureErrors?: ReactNode
}

/** The help's two lists (R1), in reading order: what a working year's figure holds, then what the tool
 *  works out itself. Each list sits under its own lead line. */
const HELP_COUNT: readonly CopyKey[] = [
  'workingCostHelpCountSpend',
  'workingCostHelpCountPremiums',
  'workingCostHelpCountMedicare',
  'workingCostHelpCountLocalTax',
  'workingCostHelpCountStateDeduction',
]
const HELP_LEAVE_OUT: readonly CopyKey[] = [
  'workingCostHelpLeaveOutPayrollTax',
  'workingCostHelpLeaveOutIncomeTax',
  'workingCostHelpLeaveOutSavings',
  'workingCostHelpLeaveOutMedicare',
]

function HelpList({ leadKey, items }: { readonly leadKey: CopyKey; readonly items: readonly CopyKey[] }) {
  return (
    <div className="working-cost__help">
      <p className="field-help">{copy[leadKey]}</p>
      <ul className="field-help working-cost__help-list">
        {items.map((key) => (
          <li key={key}>{copy[key]}</li>
        ))}
      </ul>
    </div>
  )
}

/** The help's state sentence, one per reading (KTD18 — draft-keyed, so it agrees with the spend
 *  step's help on every household). Exhaustive over the persisted vocabulary. */
const STATE_HELP: Readonly<Record<WorkingYearStateTaxReading, CopyKey>> = {
  'agi-derived': 'workingCostHelpStateAgiDerived',
  'class-based': 'workingCostHelpStateClassBased',
  none: 'workingCostHelpStateNone',
  unpriced: 'workingCostHelpStateUnpriced',
}

/** The figure's own text input — the period radios share its box. */
const isFigureInput = (t: EventTarget): boolean => t instanceof HTMLInputElement && t.type === 'text'

/** `d` with `w` as its W — `d` itself when it already holds it (so a memo on the result is stable). */
function withWorkingYearCost(d: ScenarioDraft, w: ScenarioDraft['workingYearCost']): ScenarioDraft {
  if (d.workingYearCost === w) return d
  if (w !== undefined) return { ...d, workingYearCost: w }
  const { workingYearCost: _held, ...rest } = d
  return rest
}

function quoteLine(quote: WorkingYearQuote): string {
  const amount = formatMoney(quote.annualReal)
  if (quote.source === 'budget') {
    return quote.medicalReal > 0
      ? slots.workingCostQuoteBudgetMedical(amount, formatMoney(quote.medicalReal))
      : slots.workingCostQuoteBudget(amount)
  }
  return quote.period === 'month'
    ? slots.workingCostQuoteMonthly(formatMoney(quote.annualReal / 12), amount)
    : slots.workingCostQuoteYearly(amount)
}

function leftOutLine(quote: WorkingYearQuote): string | null {
  if (quote.leftOut.length === 0) return null
  const { shown, more } = threeThenMore(quote.leftOut.map((l) => l.label))
  const names = shown.join(', ')
  return more > 0 ? slots.workingCostLeftOutMore(names, more) : slots.workingCostLeftOut(names)
}

export function WorkingCostQuestion({
  draft,
  host,
  onWrite,
  onPeriodTap,
  onPeriodReset,
  onPickFigure,
  onEditFigure,
  answerInvalid = false,
  answerErrors,
  figureInvalid,
  figureErrors,
}: WorkingCostQuestionProps) {
  const w = draft.workingYearCost
  const quote = workingYearQuote(draft)
  const staleness = workingYearCostStaleness(draft)
  const offersYes = quote.annualReal > 0
  const id = useId()
  const staleId = `${id}-stale`
  const quoteId = `${id}-quote`
  const leftId = `${id}-left`
  // A figure the host REFUSED on blur (the panel's period rule — the only refusal a figure above $0
  // can meet), kept on screen so the prompt's own period tap can commit it (B3 of the Phase B review).
  const [heldFigure, setHeldFigure] = useState<number | undefined>(undefined)
  // A blur commits only after a keystroke since focus: a focus that merely passes through the field
  // (a keyboard user tabbing to Continue) is not an answer, so it never re-stamps a stale figure.
  // The Keep door is the explicit keep (refines Phase B ruling 21; the review's hand-verified find).
  const typedSinceFocus = useRef(false)
  // Set by a keep (the door, or a re-tap of the held figure's radio): the one change that may move
  // focus, because the door unmounts under it. Any other stale → fresh edge leaves focus alone.
  const keepTapped = useRef(false)
  // The figure option, held in component state until a figure commits (KTD4: the draft never holds
  // a figure-less `entered`). Opens on a held `entered` answer; a $0 quote has no "yes" to offer, so
  // the figure is the whole question there.
  const [figureOpen, setFigureOpen] = useState(() => w?.kind === 'entered')
  // The figure's unit before any figure commits — untapped, it is MONTH on every household (KTD17:
  // a monthly figure read as yearly is the 12×-low misentry, and the period rule's floor assumes the
  // month view). A held `entered` answer's own unit wins once there is one.
  const [pendingPeriod, setPendingPeriod] = useState<SpendEntryPeriod>(() =>
    w?.kind === 'entered' ? w.entryPeriod : 'month',
  )
  const period = w?.kind === 'entered' ? w.entryPeriod : pendingPeriod
  const showFigure = !offersYes || figureOpen || w?.kind === 'entered'

  // THE PERIOD'S ANSWERED STATE HAS ONE HOME, THIS FACE (ruling 38). The period rule's disarm is the
  // host's touched path, and it may only ever vouch for the unit on screen:
  //  · at mount, an ENTERED W's own unit is answered — that figure cleared the period gate before it
  //    could be committed (the walk's Continue, `discardOnBack`, the panel's `commitRefusing`) — so the
  //    face marks it; over no entered W, a disarm left by an earlier mount is dropped (the unit has
  //    just remounted at month, and a kept disarm would let 84,000 typed there run as a month unasked);
  //  · when the draft's W stops being `entered` (a cleared figure, a "yes") and no period was tapped on
  //    this face, the answered unit went with that figure: the disarm drops and the unit falls back to
  //    the untapped month (KTD17), so the next figure is asked its unit — never run 12× unasked, and
  //    never shown under an untapped "year" (a monthly figure there would run 12× low, unasked).
  // A period TAP on this face stands until the face unmounts: the unit it chose is the one on screen.
  const periodTapped = useRef(false)
  const entered = w?.kind === 'entered'
  const wasEntered = useRef(entered)
  useEffect(() => {
    // Mount only: the draft the face opens over is the witness.
    if (wasEntered.current) onPeriodTap()
    else onPeriodReset()
  }, [])
  useEffect(() => {
    if (wasEntered.current && !entered && !periodTapped.current) {
      onPeriodReset()
      setPendingPeriod('month')
    }
    wasEntered.current = entered
  }, [entered])
  const picked: 'yes' | 'figure' | undefined =
    w?.kind === 'entered' || figureOpen
      ? 'figure'
      : w?.kind === 'confirmed' && staleness === null
        ? 'yes'
        : undefined

  // THE NOTE IS DRAWN FROM THE W THE PRESS SAW (the h2 cure, `gestureHold.ts`). A press that blurs a typed
  // figure commits it, and that un-stales W: were the note to unmount then, everything under it would
  // move up before the release, and the tap would land on something else ("Each month" stays unset, a
  // monthly figure runs 12× low; the note's own Keep door is simply gone). So the note — its words and
  // its door — keeps the press's W until the click has landed. ONLY W is held: the quote and the reading
  // stay live, so a commit from another field under the same press (the panel's spending row, blurred by
  // a tap on the door) re-gates the door at once — a held door must never keep a figure ruling 34 has
  // just withheld. Everything else on the face reads the live draft; the commit lands at the blur.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const heldW = useGestureHold(rootRef, draft.workingYearCost)
  const noteDraft = useMemo(() => withWorkingYearCost(draft, heldW), [draft, heldW])
  const noteW = noteDraft.workingYearCost
  const noteText = workingYearCostStaleText(noteDraft)
  const noteShown = noteW !== undefined && noteText !== null

  // FOCUS NEVER FALLS TO THE PAGE. A "keep" tap clears the stale note and the button inside it
  // unmounts under the focus; land it on the answer that now stands — the checked radio (the fork's,
  // or the period's on a $0 quote). A radio, never the text input: focusing the input would pop the
  // phone keyboard over a question already answered. Keyed to the keep itself: an edit elsewhere that
  // un-stales W (the panel's spending row, retyped back) must never pull focus and scroll down here.
  // Keyed to the note ON SCREEN, never the live staleness: a held note outlives the stale answer, so
  // its door unmounts at the hold's release — after the keep has landed, never with it.
  const wasShown = useRef(noteShown)
  useEffect(() => {
    const lostFocus = document.activeElement === null || document.activeElement === document.body
    if (wasShown.current && !noteShown && keepTapped.current && lostFocus) {
      rootRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
    }
    keepTapped.current = false
    wasShown.current = noteShown
  }, [noteShown])

  const left = leftOutLine(quote)
  const typed = w?.kind === 'entered' ? (w.entryPeriod === 'month' ? w.amountReal / 12 : w.amountReal) : undefined
  // The gate's message sits where the household is answering: at the fork until "a different figure"
  // is picked, then at the figure (and always there on a $0 quote, which has no fork) — never an
  // "answer it above" under a fork already answered. The figure shows exactly then.
  const gateOnFigure = showFigure
  const figureField = gateOnFigure && answerInvalid && !figureInvalid ? WORKING_COST_ANSWER_FIELD : WORKING_COST_FIELD
  const forkDescribedBy = [noteShown ? staleId : null, quoteId, left !== null ? leftId : null]
    .filter((s): s is string => s !== null)
    .join(' ')
  const medical = draft.health.oopMedicalAnnual
  // The stale note's Keep door (rulings 21, 34): an `entered` figure always; a held yes only where its
  // figure is not below today's quote (`heldYesBelowQuote`, the one home the stale sentence's lean
  // reads too) — which includes where no quote is left to answer instead. Read off the note's own
  // draft, like everything the note draws.
  const keepable = noteW !== undefined && !heldYesBelowQuote(noteDraft)

  return (
    <div className="working-cost" ref={rootRef}>
      {noteW !== undefined && noteText !== null && (
        <div className="working-cost__stale" role="note">
          <p className="working-cost__stale-text">
            <svg className="not-saved-icon" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="4.5" r="0.9" fill="currentColor" />
            </svg>
            <span id={staleId}>{noteText}</span>
          </p>
          {/* Both kinds (rulings 21 and 34): without the door, keeping a figure that still holds
              means picking "a different figure" — which clears a `confirmed` answer, unmounting this
              note and the only place the old figure is named — then typing it from memory. A held YES
              gets it only where keeping cannot land below today's quote: a working year almost never
              costs less than what the household spends, so a one-tap keep below it is the rosy side,
              and that answer goes through the fork instead (`keepable`). */}
          {keepable && (
            <button
              type="button"
              className="btn-quiet working-cost__keep"
              onClick={() => {
                keepTapped.current = true
                // A figure the panel refused a moment ago is not the answer that now stands: the input
                // must show the kept figure, never the refused digits beside a run that uses the keep.
                setHeldFigure(undefined)
                // The door keeps the figure it NAMES — the household's last explicit act. Held from its
                // own press, it can outlive the answer it was drawn for: a figure typed (or cleared) and
                // then left by this very press has committed in between, and keeping THAT would turn
                // "Keep $84,000 a year" into $7,000 (measured lost on his laptop and phone before the
                // hold, b9-1). It re-stamps under the reading the draft holds now, as every keep does.
                const named = noteW
                const keep = (d: ScenarioDraft) => writeKeptWorkingYearCost({ ...d, workingYearCost: named })
                // The door names its unit ("a year", "a month"), so a keep answers the period too, for
                // both kinds: the period rule must never ask it back of a figure the door just named —
                // not even where the press's own blur cleared the figure and dropped the unit's disarm
                // (ruling 38) a moment before the click.
                onPeriodTap()
                onWrite(keep, 'tapped-answer')
              }}
            >
              {noteW.kind === 'entered' && noteW.entryPeriod === 'month'
                ? slots.workingCostKeepMonthly(formatMoney(noteW.amountReal / 12))
                : slots.workingCostKeepYearly(formatMoney(workingYearCostFigure(noteW)))}
            </button>
          )}
        </div>
      )}
      {offersYes && (
        <p className="working-cost__quote" id={quoteId}>
          {quoteLine(quote)}
        </p>
      )}
      {offersYes && left !== null && (
        <p className="field-help" id={leftId}>
          {left}
        </p>
      )}
      <HelpList leadKey="workingCostHelpCountLead" items={HELP_COUNT} />
      <HelpList leadKey="workingCostHelpLeaveOutLead" items={HELP_LEAVE_OUT} />
      <p className="field-help">{copy[STATE_HELP[workingYearStateTaxReading(draft)]]}</p>
      {offersYes && (
        <>
          <SegmentedControl<'yes' | 'figure'>
            legendKey="workingCostLegend"
            name="working-cost"
            vertical
            value={picked}
            errorField={WORKING_COST_ANSWER_FIELD}
            invalid={answerInvalid && !gateOnFigure}
            describedByIds={forkDescribedBy}
            // The walk's one Continue-blocking choice says so up front; the panel never gates it.
            required={host === 'step'}
            options={[
              { value: 'yes', labelKey: 'workingCostYes' },
              { value: 'figure', labelKey: 'workingCostDifferent' },
            ]}
            onChange={(v) => {
              if (v === 'yes') {
                setFigureOpen(false)
                setHeldFigure(undefined)
                onWrite(writeConfirmedWorkingYearCost, 'answer')
              } else if (w?.kind === 'entered') {
                // A re-tap on the held figure is an explicit answer (the segmented control's own
                // doctrine): keep it as it stands, under the current reading — and show it, not any
                // digits the panel refused a moment ago.
                keepTapped.current = noteShown
                setHeldFigure(undefined)
                onWrite(writeKeptWorkingYearCost, 'answer')
              } else {
                setFigureOpen(true)
                onPickFigure?.()
                if (host === 'step' && w !== undefined) onWrite(writeClearedWorkingYearCost, 'answer')
              }
            }}
          />
          {!gateOnFigure && answerErrors}
        </>
      )}
      {showFigure && (
        <div
          className="working-cost__figure"
          // The figure's own text input only (the period radios share this box): a keystroke arms the
          // next blur's commit; each focus disarms it again.
          onFocus={(e) => {
            if (isFigureInput(e.target)) typedSinceFocus.current = false
          }}
          onChange={(e) => {
            if (isFigureInput(e.target)) typedSinceFocus.current = true
          }}
        >
          <CurrencyField
            labelKey="workingCostAmountLabel"
            field={figureField}
            value={heldFigure ?? typed}
            invalid={figureInvalid || (gateOnFigure && answerInvalid)}
            onEdit={onEditFigure}
            onCommit={(entered) => {
              if (!typedSinceFocus.current) return
              typedSinceFocus.current = false
              if (entered === undefined) {
                // The walk: the draft never holds a figure-less answer, so a cleared figure clears W
                // and the gate asks again. The panel: a clear keeps the last answer (KTD4).
                setHeldFigure(undefined)
                if (host === 'step' && w?.kind === 'entered') onWrite(writeClearedWorkingYearCost, 'answer')
                return
              }
              const annual = period === 'month' ? entered * 12 : entered
              const landed = onWrite((d) => writeEnteredWorkingYearCost(d, annual, period), 'answer')
              setHeldFigure(!landed && entered > 0 ? entered : undefined)
            }}
          />
          <SegmentedControl<SpendEntryPeriod>
            legendKey="periodLegend"
            name="working-cost-period"
            value={period}
            options={[
              { value: 'month', labelKey: 'periodMonth' },
              { value: 'year', labelKey: 'periodYear' },
            ]}
            onChange={(next) => {
              periodTapped.current = true
              setPendingPeriod(next)
              onPeriodTap()
              if (heldFigure !== undefined) {
                // The tap answers the prompt that refused these digits: commit THEM in the tapped
                // unit — never a re-base of an older figure the draft still holds.
                const held = heldFigure
                const landed = onWrite(
                  (d) => writeEnteredWorkingYearCost(d, next === 'month' ? held * 12 : held, next),
                  'tapped-answer',
                )
                if (landed) setHeldFigure(undefined)
              } else if (w?.kind === 'entered' && next !== w.entryPeriod) {
                onWrite((d) => writeWorkingYearCostPeriod(d, next), 'period')
              }
            }}
          />
          {figureErrors}
          {gateOnFigure && answerErrors}
        </div>
      )}
      {w !== undefined && medical !== undefined && workingCostBelowMedical(draft) && (
        <p className="field-help">
          {slots.workingCostBelowMedical(formatMoney(workingYearCostFigure(w)), formatMoney(medical))}
        </p>
      )}
    </div>
  )
}
