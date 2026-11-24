/** The AssumptionPanel's two pure reads of the draft: the working-year row's methodology arm and the W answer's one
 *  value line. Moved out of `AssumptionPanel.tsx` by Act 6's RC0, unchanged. */
import { copy, slots } from '@ui/copy'
import type { MethodologyArm } from '@ui/assumptionRegistry'
import type { ScenarioDraft } from '@store/memoryModel'
import { carriesWorkingYearCost, isDateRoute, workingYearCostFigure, workingYearCostForRun } from './intakeMap'
import { formatMoney } from './moneyFormat'
import { workingYearCostStaleness, workingYearQuote } from './workingYearQuote'

/** Which arm the working-year row renders for a draft (the pay check's U9). The BUILT run decides
 *  (insight 132): `'priced'` — the run carries W — reads the pay check's arm, `'unpriced'` today's
 *  row (KTD22). Where no run can be built (`'unknown'`) there is no run to read, so it falls back to
 *  what the build WOULD carry: `buildDateInput` lands W exactly when a date-route draft holds an
 *  answer above $0 (`carriesWorkingYearCost`, the one carriage rule), so such a draft reads the pay
 *  check's arm and any other reads today's. */
export function methodologyArmFor(d: ScenarioDraft): MethodologyArm {
  const read = workingYearCostForRun(d)
  if (read === 'priced') return 'workingCost'
  if (read === 'unpriced') return 'default'
  return isDateRoute(d) && carriesWorkingYearCost(d) ? 'workingCost' : 'default'
}

/** The W answer's one value line: unanswered, stale, confirmed (from the spending or the budget), kept, or the
 *  household's own figure. ONE home, read by the panel's W row and the workbench's facts page (Act 5, U8), so
 *  the two never word the same answer two ways. */
export function workingCostValueLine(d: ScenarioDraft): string {
  const w = d.workingYearCost
  if (w === undefined) return copy.assumptionWorkingCostUnanswered
  const figure = formatMoney(workingYearCostFigure(w))
  if (workingYearCostStaleness(d) !== null) return slots.assumptionWorkingCostStale(figure)
  if (w.kind === 'confirmed') {
    // Fresh, so the current quote IS the one confirmed: its source names where the figure came from.
    return workingYearQuote(d).source === 'budget'
      ? slots.assumptionWorkingCostConfirmedBudget(figure)
      : slots.assumptionWorkingCostConfirmed(figure)
  }
  // A yes kept through the stale note's door carries the keep stamp (KTD10): "kept", never "your own figure" —
  // the household never typed it.
  return w.keptOverQuoteReal !== undefined
    ? slots.assumptionWorkingCostKept(figure)
    : slots.assumptionWorkingCostEntered(figure)
}
