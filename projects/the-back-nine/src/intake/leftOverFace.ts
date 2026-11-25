/**
 * Build 2's left-over question, its pure words (`WorkingYearLeftOverQuestion.tsx`'s, moved out unchanged by Act 6 · RC13b
 * so the walk's money-picture step and the Profile → Expenses Pre-retirement living expenses drawer read one rule): the
 * three replies, the year-0 figure line, the check sentence, and the one line in dollars below the group (R6), by shown
 * state.
 */
import type { WorkingYearLeftOverKind } from '@shared/model'
import { slots, type CopyKey } from '@ui/copy'
import { formatMoney } from './moneyFormat'
import type { WorkingYearLeftOverMoved } from './workingYearLeftOver'
import type { LeftOverShownState } from './workingYearLeftOverState'

/** The moved core's two figures (formatted), whether today's ROSE above the stored one, and the typed figure today's
 *  rests on, where the core carries one. */
export interface MovedWords {
  readonly stored: string
  readonly live: string
  readonly rose: boolean
  readonly typedBelow: string | null
}

/** The one line in dollars below the group (R6), by shown state. `live` is today's printed year-0 Left
 *  over (formatted); `moved` is the moved core's two figures (formatted), whether today's ROSE above the
 *  stored one — the stored figure is then the smaller, the one a year adds at most (R8), and the line gives the
 *  household that saves it but not all of today's its own way out; where today's FELL, it is already the one
 *  credited — and the typed figure today's rests on, where the core carries one (U11 walk 7's R2: the line then
 *  names it, beside the typed-below spans below it). A state with no group draws no line. */
export const LEFT_OVER_LINE: Readonly<Record<LeftOverShownState, ((live: string, moved: MovedWords | null) => string) | null>> = {
  'not-asked': null,
  'waiting-on-w': null,
  absent: (live) => slots.workingLedgerLeftOverAbsentLine(live),
  saved: (live) => slots.workingLedgerLeftOverSavedLine(live),
  // The moved core supplies both figures; it is non-null in exactly this state.
  'saved-moved': (live, moved) =>
    moved === null
      ? slots.workingLedgerLeftOverSavedLine(live)
      : moved.typedBelow !== null
        ? moved.rose
          ? slots.workingLedgerLeftOverRoseLineAt(moved.typedBelow, moved.stored, moved.live)
          : slots.workingLedgerLeftOverFellLineAt(moved.typedBelow, moved.stored, moved.live)
        : moved.rose
          ? slots.workingLedgerLeftOverRoseLine(moved.stored, moved.live)
          : slots.workingLedgerLeftOverFellLine(moved.stored, moved.live),
  spent: (live) => slots.workingLedgerLeftOverSpentLine(live),
  'not-sure': (live) => slots.workingLedgerLeftOverNotSureLine(live),
}

export const LEFT_OVER_OPTIONS: readonly { readonly value: WorkingYearLeftOverKind; readonly labelKey: CopyKey }[] = [
  { value: 'saved', labelKey: 'workingLedgerLeftOverSaved' },
  { value: 'spent', labelKey: 'workingLedgerLeftOverSpent' },
  { value: 'not-sure', labelKey: 'workingLedgerLeftOverNotSure' },
]

/** The moved core in words (formatted), or null. */
export const movedWords = (moved: WorkingYearLeftOverMoved | null): MovedWords | null =>
  moved === null
    ? null
    : { stored: formatMoney(moved.stored), live: formatMoney(moved.live), rose: moved.live > moved.stored, typedBelow: moved.typedBelow }

/** The year-0 figure line: the typed figure it rests on named where one is (U11 walk 7's R2). */
export const leftOverFigureLine = (shown: string, typedBelow: string | null): string =>
  typedBelow === null ? slots.workingLedgerLeftOverFigure(shown) : slots.workingLedgerLeftOverFigureAt(typedBelow, shown)

/** The check sentence states its dollars: the left over, the deposits row it sits on, and their sum, all printed rows of
 *  the one picture (a year with no deposits row has its own sentence, nothing to sit on). */
export function leftOverCheck(live: number, deposits: number | null): string {
  const shown = formatMoney(live)
  return deposits === null || deposits <= 0
    ? slots.workingLedgerLeftOverCheckNoDeposits(shown)
    : slots.workingLedgerLeftOverCheck(shown, formatMoney(deposits), formatMoney(live + deposits))
}
