/**
 * The R19 error grammar's two pure decisions (`FieldError.tsx` renders them): the error node's id a field's
 * `aria-describedby` names, and the one message text for a violation. Moved out of `FieldError.tsx` by Act 6's RC0,
 * unchanged.
 */
import { copy, slots, type CatalogMessage } from '@ui/copy'

export const fieldErrorId = (field: string): string =>
  `err-${field.replace(/[^a-zA-Z0-9-]/g, '-')}`

/** The one message-text decision: params ⇒ the slot template, else the catalog string. The W step gate's
 *  two stale-figure messages carry their own params (copy's `CatalogMessage` block; the U11 walk's (ad)). */
export const fieldErrorText = (m: CatalogMessage): string => {
  if (m.params === undefined) return copy[m.messageKey]
  switch (m.messageKey) {
    case 'errWorkingCostStaleBelowQuote':
      return slots.errWorkingCostStaleBelowQuote(m.params.heldFormatted, m.params.quoteFormatted)
    case 'errWorkingCostStaleKeep':
      return slots.errWorkingCostStaleKeep(m.params.keepLabel)
    case 'errOneTimeYearRange':
      return slots.errOneTimeYearRange(m.params.firstYear, m.params.lastYear)
    default:
      return slots[m.messageKey](m.params.limitFormatted)
  }
}
