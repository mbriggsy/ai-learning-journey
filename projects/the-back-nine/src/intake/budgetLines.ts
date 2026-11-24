/** A budget line's words: its category's label and its display name. Moved out of `BudgetLineItem.tsx` by Act 6's
 *  RC0, unchanged. */
import { copy, type CopyKey } from '@ui/copy'
import type { BudgetCategory, BudgetLineItem as BudgetLine } from '@shared/model'

/** Category → display label (copy-routed; the stored value stays the model enum). */
export const CATEGORY_LABEL_KEYS: Record<BudgetCategory, CopyKey> = {
  housing: 'budgetCatHousing',
  utilities: 'budgetCatUtilities',
  food: 'budgetCatFood',
  transportation: 'budgetCatTransportation',
  travel: 'budgetCatTravel',
  gifts: 'budgetCatGifts',
  other: 'budgetCatOther',
}

/** The line's display name for controls that must speak it (remove button, error context). */
export function lineDisplayName(item: BudgetLine): string {
  return item.label.trim() !== '' ? item.label : copy[CATEGORY_LABEL_KEYS[item.category]]
}
