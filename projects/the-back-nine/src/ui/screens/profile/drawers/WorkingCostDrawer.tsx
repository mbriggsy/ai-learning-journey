/**
 * src/ui/screens/profile/drawers/WorkingCostDrawer.tsx: Expenses → Pre-retirement living expenses (Act 6 · RC13b;
 * RightCapital's Pre-retirement Living Expenses card, critique 11): the pay check's W question, then the money picture of
 * the first working year, then build 2's left-over question. After the walk this drawer is the W step's one home and the
 * money-picture step's, opened from its card, from the money picture card on Goals, and from the StaleBanner's standing
 * line on every figured page (the shell's drawer host). Its pure half is `workingCostFields.ts`.
 *
 * THE W FACE is the walk's `WorkingCostQuestion` ported to the kit, the walk's arm (`host="step"`) because Save is the W
 * step's Continue: the same pure words (`workingCostFace.ts`), the same writers over the buffered draft, the same rulings.
 *  - The stale note (KTD21: present before any tap, `role="note"`), with its Keep door where ruling 34 allows it and
 *    Keep's condition above it; the quote ABOVE the static legend (KTD17), the lines it left out, the two help lists and
 *    the state sentence by the draft's reading; the yes / different-figure fork (nothing checked on an absent or stale
 *    `confirmed` answer); the figure with its period (untapped: a month, on every household); the W-below-M and
 *    typed-below notes.
 *  - "A different figure" over a held answer clears W in the buffer (the walk's arm: the gate then asks until a figure
 *    is given, so the screen and the plan never disagree); a cleared figure clears it too.
 *  - RULING 38, THE PERIOD'S ANSWERED STATE HAS ONE HOME, THIS FACE: at mount an entered W's unit is answered (it cleared
 *    the period gate before it could be stored); a period tap answers it until the drawer closes; a W that stops being
 *    `entered` with no tap on this face drops it, and the unit falls back to the untapped month. The drawer's Save reads
 *    it (`workingCostTouches`): a figure at or above the floor typed in the month view and never tapped asks its unit.
 *  - THE GESTURE HOLD (insight 149; `src/intake/gestureHold.ts`, imported as it is, never re-written): a press that blurs
 *    the typed figure commits it (the kit's box commits on blur) and that can un-stale W. The stale note (its words and
 *    its Keep door) is drawn from the W the PRESS saw until one task after that gesture's click, released in the BUBBLE
 *    phase, never capture; the Keep door keeps the figure it NAMES and answers its unit. Below the face, the money picture
 *    and the left-over seat are drawn from the whole buffered draft the press saw, ONE hold over the face and the seat
 *    (build 2's KTD8), so a commit from either never moves the other's controls mid-gesture.
 *  - Focus never falls to the page: a keep that takes the note (and its door) away lands focus on the answer that now
 *    stands, the checked radio, never the text box (it would pop the phone's keyboard).
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { CircleAlert } from 'lucide-react'
import type { SpendEntryPeriod, WorkingYearLeftOverKind } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { epochDayToCalendarYear } from '@store/staleness'
import { useGestureHold } from '@intake/gestureHold'
import { helpLeaveOutItems, STATE_HELP, leftOutLine, quoteLine, ratedQuoteNote, withWorkingYearCost } from '@intake/workingCostFace'
import {
  heldYesBelowQuote,
  stateTaxBelongsInW,
  workingCostBelowMedical,
  workingYearCostKeepLabel,
  workingYearCostStaleness,
  workingYearQuote,
  workingYearStateTaxReading,
  writeClearedWorkingYearCost,
  writeConfirmedWorkingYearCost,
  writeEnteredWorkingYearCost,
  writeKeptWorkingYearCost,
  writeWorkingYearCostPeriod,
} from '@intake/workingYearQuote'
import {
  workingYearCostKeepCondition,
  workingYearCostStaleNote,
  workingYearCostTypedBelowNote,
  workingYearLeftOverAtQuoteLine,
  workingYearLeftOverMoved,
  workingYearLeftOverTypedBelow,
  workingYearLeftOverWaitingSeat,
  writeWorkingYearLeftOver,
} from '@intake/workingYearLeftOver'
import { LEFT_OVER_FACE } from '@intake/workingYearLeftOverState'
import { LEFT_OVER_LINE, LEFT_OVER_OPTIONS, leftOverCheck, leftOverFigureLine, movedWords } from '@intake/leftOverFace'
import { ledgerPicture, ledgerUnknownLines, type LedgerGroup } from '@intake/workingYearLedgerRows'
import {
  workingYearCostFigure,
  workingYearLeftOverDepositsLive,
  workingYearLeftOverLive,
  workingYearLeftOverShownState,
  workingYearLedgerForRun,
} from '@intake/intakeMap'
import { formatMoney } from '@intake/moneyFormat'
import { NotePartsBlock } from '../../../NotePartsBlock'
import { isPlainNote } from '../../../noteParts'
import { planClockAnchor } from '../../../bandAnnotations'
import { currentEpochDay } from '../../../scenarioFromDraft'
import { Button, ChoiceGroup, MoneyInput } from '../../../kit'
import { copy, slots, workingCostHelpCountItems } from '../../../copy'
import { ProfileIcon } from '../profileIcons'
import { openCheck, saveEdit } from './drawerSave'
import type { DrawerBodyProps } from './drawerProps'
import { Fact } from './Fact'
import { ProfileDrawer } from './ProfileDrawer'
import { useDrawerEdit } from './useDrawerBuffer'
import {
  applyWrite,
  buildWorkingCost,
  ownWorkingCostField,
  withWorkingCostForm,
  workingCostFormFrom,
  workingCostTouches,
  type WorkingCostField,
  type WorkingCostForm,
} from './workingCostFields'

const PERIOD_ITEMS = [
  { value: 'month', label: copy.periodMonth },
  { value: 'year', label: copy.periodYear },
] as const satisfies readonly { value: SpendEntryPeriod; label: string }[]

const FORK_ITEMS = [
  { value: 'yes', label: copy.workingCostYes },
  { value: 'figure', label: copy.workingCostDifferent },
] as const satisfies readonly { value: 'yes' | 'figure'; label: string }[]

const LEFT_OVER_ITEMS = LEFT_OVER_OPTIONS.map((o) => ({ value: o.value, label: copy[o.labelKey] }))

/** The walk's note mark, drawn beside a calm note (never an alert). */
function NoteMark() {
  return <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
}

function HelpList({ lead, items }: { readonly lead: string; readonly items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label text-stone-600">{lead}</p>
      <ul className="list-disc pl-5 text-label text-stone-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

interface FaceProps {
  readonly draft: ScenarioDraft
  readonly rootRef: RefObject<HTMLDivElement | null>
  readonly readOnly: boolean
  readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft) => void
  readonly onPeriodTap: () => void
  readonly onPeriodReset: () => void
  /** A fork pick or a unit tap: answering forgives the last Save's refusal (the walk's re-edit forgiveness). */
  readonly onAnswered: () => void
  /** The gate's refusal (an unanswered or stale W) and the figure's own (a $0, an unconfirmed period), from Save. */
  readonly answerError: string | undefined
  readonly figureError: string | undefined
}

/** The W question over the buffered draft (the header). */
function WorkingCostFace({ draft, rootRef, readOnly, onWrite, onPeriodTap, onPeriodReset, onAnswered, answerError, figureError }: FaceProps) {
  const w = draft.workingYearCost
  const quote = workingYearQuote(draft)
  const staleness = workingYearCostStaleness(draft)
  const offersYes = quote.annualReal > 0
  const id = useId()
  const staleId = `${id}-stale`
  const keepConditionId = `${id}-keep-condition`
  const quoteId = `${id}-quote`
  const leftId = `${id}-left`
  const ratedId = `${id}-rated`
  const keepTapped = useRef(false)
  const [figureOpen, setFigureOpen] = useState(() => w?.kind === 'entered')
  const [pendingPeriod, setPendingPeriod] = useState<SpendEntryPeriod>(() => (w?.kind === 'entered' ? w.entryPeriod : 'month'))
  const period = w?.kind === 'entered' ? w.entryPeriod : pendingPeriod
  const showFigure = !offersYes || figureOpen || w?.kind === 'entered'

  // RULING 38 (the header).
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
    w?.kind === 'entered' || figureOpen ? 'figure' : w?.kind === 'confirmed' && staleness === null ? 'yes' : undefined

  // THE NOTE IS DRAWN FROM THE W THE PRESS SAW (the header; only W is held: the quote and the reading stay live).
  const heldW = useGestureHold(rootRef, draft.workingYearCost)
  const noteDraft = useMemo(() => withWorkingYearCost(draft, heldW), [draft, heldW])
  const noteW = noteDraft.workingYearCost
  const noteText = workingYearCostStaleNote(noteDraft)
  const noteShown = noteW !== undefined && noteText !== null

  // FOCUS NEVER FALLS TO THE PAGE (the header), keyed to the keep itself and to the note on screen.
  const wasShown = useRef(noteShown)
  // A layout effect: it runs in the commit that removes the door, before the drawer's focus trap reacts to its focused
  // control going (a microtask that would park focus on the drawer itself, measured in Chromium with a mouse press).
  useLayoutEffect(() => {
    // Lost: anywhere outside this face once the door it was on is gone. The drawer's focus trap catches a focus whose
    // control unmounted and parks it elsewhere in the drawer (its close button), never on the page, so the walk's
    // "fell to the page" check would miss it; the keep itself (`keepTapped`) is what scopes this to the door's own press.
    const active = document.activeElement
    const lostFocus = !(active instanceof Node) || rootRef.current?.contains(active) !== true
    if (wasShown.current && !noteShown && keepTapped.current && lostFocus) {
      rootRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
    }
    keepTapped.current = false
    wasShown.current = noteShown
  }, [noteShown, rootRef])

  const left = leftOutLine(quote)
  // Gap 4's U15: a line in the quote that changes at its own rate is counted at its first-year price (KTD4's stopgap).
  // It reads the budget, which nothing in this drawer edits, so it never moves under a press.
  const rated = ratedQuoteNote(draft)
  const typed = w?.kind === 'entered' ? (w.entryPeriod === 'month' ? w.amountReal / 12 : w.amountReal) : undefined
  // The gate's message sits where the household is answering: at the fork until a figure is asked, then at the figure.
  const gateOnFigure = showFigure
  const forkDescribedBy = [noteShown ? staleId : null, quoteId, left !== null ? leftId : null, rated !== null ? ratedId : null]
    .filter((s): s is string => s !== null)
    .join(' ')
  const medical = draft.health.oopMedicalAnnual
  // Keep (rulings 21, 34): a typed figure always; a held yes, or a figure kept from one, only where its figure is not
  // below today's quote. Read off the note's own draft, like everything the note draws.
  const keepable = noteW !== undefined && !heldYesBelowQuote(noteDraft)
  const keepCondition = keepable ? workingYearCostKeepCondition(noteDraft) : null
  const typedBelowNote = workingYearCostTypedBelowNote(noteDraft)

  return (
    <div className="flex flex-col gap-4" ref={rootRef} data-working-cost-face="">
      {noteW !== undefined && noteText !== null ? (
        <div role="note" className="flex flex-col gap-3 rounded-card border border-stone-300 bg-stone-100 p-4" data-working-cost-note="">
          <p className="flex items-start gap-2 text-body text-stone-900">
            <NoteMark />
            <span id={staleId}>{noteText}</span>
          </p>
          {keepable && keepCondition !== null ? (
            <p className="text-label text-stone-600" id={keepConditionId}>
              {keepCondition}
            </p>
          ) : null}
          {keepable && !readOnly ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                {...(keepCondition !== null ? { 'aria-describedby': keepConditionId } : {})}
                onClick={() => {
                  keepTapped.current = true
                  // The door keeps the figure it NAMES (held from its own press), re-stamped under the reading the
                  // draft holds now, and it answers its unit too.
                  const named = noteW
                  onPeriodTap()
                  onWrite((d) => writeKeptWorkingYearCost({ ...d, workingYearCost: named }))
                }}
              >
                {workingYearCostKeepLabel(noteW)}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {offersYes ? (
        <p className="text-body font-medium text-stone-900 tabular-nums" id={quoteId}>
          {quoteLine(quote)}
        </p>
      ) : null}
      {offersYes && left !== null ? (
        <p className="text-label text-stone-600" id={leftId}>
          {left}
        </p>
      ) : null}
      {offersYes && rated !== null ? (
        <p className="text-label text-stone-600" id={ratedId} data-working-cost-rated="">
          {rated}
        </p>
      ) : null}
      <HelpList lead={copy.workingCostHelpCountLead} items={workingCostHelpCountItems(stateTaxBelongsInW(draft))} />
      <HelpList lead={copy.workingCostHelpLeaveOutLead} items={helpLeaveOutItems()} />
      <p className="text-label text-stone-600">{copy[STATE_HELP[workingYearStateTaxReading(draft)]]}</p>
      {offersYes ? (
        <ChoiceGroup<'yes' | 'figure'>
          legend={slots.workingCostLegendFigure(formatMoney(quote.annualReal))}
          name="working-cost"
          vertical
          items={FORK_ITEMS}
          value={picked}
          disabled={readOnly}
          required
          describedByIds={forkDescribedBy}
          {...(!gateOnFigure && answerError !== undefined ? { error: answerError } : {})}
          onValueChange={(v) => {
            // Answering forgives (the walk's onPickFigure): the gate's message goes until the next Save, and never moves,
            // unasked, to the figure a "different figure" opens.
            onAnswered()
            if (v === 'yes') {
              setFigureOpen(false)
              onWrite(writeConfirmedWorkingYearCost)
            } else if (w?.kind === 'entered') {
              // A re-tap on the held figure keeps it as it stands, under the current reading (focus moves only on a
              // keep that takes the note away).
              keepTapped.current = noteShown && !heldYesBelowQuote(draft)
              onWrite(writeKeptWorkingYearCost)
            } else {
              setFigureOpen(true)
              // The walk's arm: "a different figure" over a held answer clears it, and the gate asks until one is given.
              if (w !== undefined) onWrite(writeClearedWorkingYearCost)
            }
          }}
        />
      ) : null}
      {showFigure ? (
        <div className="flex flex-col gap-4" data-working-cost-figure="">
          <MoneyInput
            label={copy.workingCostAmountLabel}
            value={typed}
            invalidMessage={copy.profileInvalidMoney}
            readOnly={readOnly}
            {...(figureError !== undefined ? { error: figureError } : gateOnFigure && answerError !== undefined ? { error: answerError } : {})}
            onCommit={(v) => {
              if (v === undefined) {
                // A cleared figure clears W (the walk's arm): the plan never holds a figure-less answer.
                if (w?.kind === 'entered') onWrite(writeClearedWorkingYearCost)
                return
              }
              const annual = period === 'month' ? v * 12 : v
              onWrite((d) => writeEnteredWorkingYearCost(d, annual, period))
            }}
          />
          <ChoiceGroup<SpendEntryPeriod>
            legend={copy.periodLegend}
            name="working-cost-period"
            items={PERIOD_ITEMS}
            value={period}
            disabled={readOnly}
            onValueChange={(next) => {
              // Answering the unit forgives its prompt until the next Save (the walk's period tap disarmed it at once).
              onAnswered()
              periodTapped.current = true
              setPendingPeriod(next)
              onPeriodTap()
              if (w?.kind === 'entered' && next !== w.entryPeriod) onWrite((d) => writeWorkingYearCostPeriod(d, next))
            }}
          />
        </div>
      ) : null}
      {w !== undefined && medical !== undefined && workingCostBelowMedical(draft) ? (
        <p className="text-label text-stone-600">{slots.workingCostBelowMedical(formatMoney(workingYearCostFigure(w)), formatMoney(medical))}</p>
      ) : null}
      {typedBelowNote !== null ? <p className="text-label text-stone-600">{typedBelowNote}</p> : null}
    </div>
  )
}

function PictureGroup({ group }: { readonly group: LedgerGroup }) {
  if (group.rows.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-label font-medium text-stone-900">{group.legend}</h4>
      <dl className="flex flex-col gap-2">
        {group.rows.map((r, i) => (
          <div key={i} className={r.emphasis === true ? 'flex flex-col gap-0.5 border-t border-stone-300 pt-2 font-medium' : 'flex flex-col gap-0.5'} data-ledger-row="">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <dt className="text-body text-stone-900">{r.label}</dt>
              <dd className="text-body text-stone-900 tabular-nums" data-ledger-value="">{r.value}</dd>
            </div>
            {(r.details ?? []).map((d, j) => (
              <dd key={j} className="text-label text-stone-600" data-ledger-detail="">
                {d}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  )
}

/** The picture's own face over a composed picture (`ledgerPicture`): its lead, then each group, the savings-tax line
 *  under the savings group. Exported for its unit test, which draws hand-built pictures (Act 6 · RC14 moved the walk's
 *  picture arms here with the walk's `WorkingYearLedger.tsx`). */
export function LedgerPicture({ picture }: { readonly picture: ReturnType<typeof ledgerPicture> }) {
  return (
    <>
      <p className="text-label text-stone-600">{picture.lead}</p>
      <PictureGroup group={picture.comingIn} />
      <PictureGroup group={picture.goingOut} />
      <PictureGroup group={picture.bottom} />
      <PictureGroup group={picture.savings} />
      {picture.savingsTax !== null ? <p className="text-label text-stone-600">{picture.savingsTax}</p> : null}
      <PictureGroup group={picture.later} />
    </>
  )
}

/** The money picture of the shown draft: its groups, the one calm line where none can be drawn, nothing while W is
 *  absent or stale (the panel's own rule: the picture reads a W the household stands by). */
function MoneyPicture({ shown, aged }: { readonly shown: ScenarioDraft; readonly aged: boolean }) {
  const w = shown.workingYearCost
  const stale = useMemo(() => workingYearCostStaleness(shown) !== null, [shown])
  const ledger = useMemo(() => (w !== undefined && !stale ? workingYearLedgerForRun(shown) : null), [shown, w, stale])
  const picture = useMemo(() => (ledger !== null && ledger !== 'unknown' ? ledgerPicture(ledger, shown, aged) : null), [ledger, shown, aged])
  if (ledger === null) return null
  return (
    <section className="flex flex-col gap-4 border-t border-stone-300 pt-6" data-money-picture="">
      <h3 className="text-body font-medium text-stone-900">{copy.profileWorkingPictureHeading}</h3>
      {picture === null ? (
        ledgerUnknownLines(shown).map((line) => (
          <p key={line} className="text-label text-stone-600">
            {line}
          </p>
        ))
      ) : (
        <LedgerPicture picture={picture} />
      )}
    </section>
  )
}

/** Build 2's left-over question over the shown draft (the walk's face, ported): nothing where it is not asked, the calm
 *  waiting line while W is stale, else the figure, the check sentence, the three replies (nothing pre-checked) and the
 *  line below them, then the typed-below runs. "All of it" stores the figure this face shows. */
function LeftOverSeat({ shown, seatRef, readOnly, onWrite }: { readonly shown: ScenarioDraft; readonly seatRef: RefObject<HTMLElement | null>; readonly readOnly: boolean; readonly onWrite: (write: (d: ScenarioDraft) => ScenarioDraft) => void }) {
  const figureId = useId()
  const checkId = useId()
  const state = useMemo(() => workingYearLeftOverShownState(shown), [shown])
  const live = useMemo(() => workingYearLeftOverLive(shown), [shown])
  const deposits = useMemo(() => workingYearLeftOverDepositsLive(shown), [shown])
  const moved = useMemo(() => workingYearLeftOverMoved(shown), [shown])
  const typedBelow = useMemo(() => workingYearLeftOverTypedBelow(shown), [shown])
  // The W face above carries the lean, as the panel's W row does: the sheet's host.
  const atQuote = useMemo(() => workingYearLeftOverAtQuoteLine(shown, 'sheet'), [shown])
  const face = LEFT_OVER_FACE[state]
  const line = LEFT_OVER_LINE[state]
  if (face === 'none' || live === null) return <div ref={(el) => { seatRef.current = el }} />
  return (
    <section ref={seatRef} className="flex flex-col gap-3 border-t border-stone-300 pt-6" data-left-over-seat="">
      <h3 className="text-body font-medium text-stone-900">{copy.profileWorkingLeftOverHeading}</h3>
      {face === 'waiting' ? (
        <p role="note" className="flex items-start gap-2 text-body text-stone-900">
          <NoteMark />
          <span>{workingYearLeftOverWaitingSeat(shown)}</span>
        </p>
      ) : (
        <>
          <p className="text-body font-medium text-stone-900 tabular-nums" id={figureId} data-left-over-figure="">
            {leftOverFigureLine(formatMoney(live), typedBelow)}
          </p>
          <p className="text-label text-stone-600" id={checkId}>
            {leftOverCheck(live, deposits)}
          </p>
          <ChoiceGroup<WorkingYearLeftOverKind>
            legend={copy.workingLedgerLeftOverLegend}
            name="working-year-left-over"
            vertical
            items={LEFT_OVER_ITEMS}
            value={shown.workingYearLeftOver?.kind}
            disabled={readOnly}
            describedByIds={`${figureId} ${checkId}`}
            onValueChange={(kind) => onWrite((d) => writeWorkingYearLeftOver(d, kind, live))}
          />
          {line !== null ? (
            <p className="text-label text-stone-600" data-left-over-line="">
              {line(formatMoney(live), movedWords(moved))}
            </p>
          ) : null}
          {atQuote !== null ? (
            isPlainNote(atQuote) ? (
              <p className="text-label text-stone-600" data-left-over-at-quote="">
                {atQuote.opening}
              </p>
            ) : (
              <NotePartsBlock parts={atQuote} className="text-label text-stone-600" />
            )
          ) : null}
        </>
      )}
    </section>
  )
}

export function WorkingCostDrawer({
  model,
  open,
  readOnly,
  leaveAsk,
  onClose,
  onClosed,
  finalFocus,
  checkAtOpen,
  costOnly = false,
}: DrawerBodyProps & {
  /** Act 6 · RC14: the W question alone, the walk's W step (the first-run stepper's Expenses card). The money picture and
   *  the left-over question read Goals' answers too (the coverage and the quote), so in setup they come last, from the
   *  Goals step's money picture card, which opens the whole drawer (the walk put its picture after every input). */
  readonly costOnly?: boolean
}) {
  const storeDraft = model.getSnapshot().draft
  const [seed] = useState<WorkingCostForm>(() => workingCostFormFrom(storeDraft))
  // Opened at the gate (the stepper's Next): the gate's refusal, the face's own mount rule standing for the period (an
  // entered W's unit was answered before it could be stored; ruling 38).
  const [initial] = useState(() =>
    checkAtOpen === true ? openCheck(storeDraft, ownWorkingCostField, workingCostTouches(storeDraft.workingYearCost?.kind === 'entered')) : undefined,
  )
  const edit = useDrawerEdit<WorkingCostForm, WorkingCostField>(seed, open, initial)
  const { form, check, setCheck } = edit
  const buffered = useMemo(() => withWorkingCostForm(storeDraft, form), [storeDraft, form])
  // Ruling 38's mark, the face's to set and drop (never part of the buffer: answering a unit changes no fact).
  const periodAnswered = useRef(false)
  const faceRef = useRef<HTMLDivElement | null>(null)
  const seatRef = useRef<HTMLElement | null>(null)
  // THE ONE HOLD over the face and the seat (KTD8): the picture and the seat draw the buffered draft the press saw.
  const shown = useGestureHold(faceRef, buffered, seatRef)
  const [aged] = useState(() => planClockAnchor(storeDraft.startCalendarYear, epochDayToCalendarYear(currentEpochDay())).yearsSincePlanBuilt > 0)
  const write = (w: (d: ScenarioDraft) => ScenarioDraft) => {
    const next = applyWrite(model.getSnapshot().draft, edit.read(), w)
    // Answering is re-editing: the gate's and the figure's refusals are forgiven until the next Save.
    edit.patch(next)
    if (check.fields.answer !== undefined || check.fields.figure !== undefined || check.elsewhere.length > 0) setCheck({ fields: {}, elsewhere: [] })
  }
  return (
    <ProfileDrawer
      open={open}
      title={copy.profileWorkingCostName}
      icon={<ProfileIcon icon="working-cost" />}
      readOnly={readOnly}
      isDirty={edit.isDirty}
      onSave={() => {
        const res = saveEdit(model, (d) => buildWorkingCost(d, seed, edit.read()), ownWorkingCostField, workingCostTouches(periodAnswered.current))
        if (!res.saved) setCheck(res.check)
        return res.saved
      }}
      onClose={() => onClose()}
      onClosed={onClosed}
      finalFocus={finalFocus}
      {...(leaveAsk !== undefined ? { leaveAsk } : {})}
      errors={check.elsewhere}
    >
      <Fact stamp="workingYearCost">
        <WorkingCostFace
          draft={buffered}
          rootRef={faceRef}
          readOnly={readOnly}
          onWrite={write}
          onPeriodTap={() => {
            periodAnswered.current = true
          }}
          onPeriodReset={() => {
            periodAnswered.current = false
          }}
          onAnswered={() => {
            if (check.fields.answer !== undefined || check.fields.figure !== undefined || check.elsewhere.length > 0) setCheck({ fields: {}, elsewhere: [] })
          }}
          answerError={check.fields.answer}
          figureError={check.fields.figure}
        />
      </Fact>
      {costOnly ? null : (
        <>
          <MoneyPicture shown={shown} aged={aged} />
          <Fact stamp="workingYearLeftOver">
            <LeftOverSeat shown={shown} seatRef={seatRef} readOnly={readOnly} onWrite={write} />
          </Fact>
        </>
      )}
    </ProfileDrawer>
  )
}
