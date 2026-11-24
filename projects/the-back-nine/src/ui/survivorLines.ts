/**
 * The survivor card's spending-basis line (`SurvivorReadout.tsx` renders it; its header holds the ruling, Briggsy's
 * sentence of 2026-10-14): "This assumes about $X a month of spending on your own (today: $Y together)." FAIL TO
 * ABSENT (insight 044): no basis, a basis that is not steady, a non-finite figure, or either figure rounding to "$0"
 * renders no line. Moved out of `SurvivorReadout.tsx` by Act 6's RC0, unchanged but for the export, so the line's law
 * outlives the card.
 */
import { slots } from './copy'
import { formatPerMonth } from './money'
import type { SurvivorSpendingBasis } from '@shared/model'

/** The basis line's text, or null when it must not render (absent / not steady / non-finite / either figure "$0"). */
export function spendingBasisLine(basis: SurvivorSpendingBasis | undefined): string | null {
  if (basis === undefined || basis.steady !== true) return null
  const { survivorMonthlyReal, coupleMonthlyReal } = basis
  if (!Number.isFinite(survivorMonthlyReal) || !Number.isFinite(coupleMonthlyReal)) return null
  const survivor = formatPerMonth(survivorMonthlyReal)
  const couple = formatPerMonth(coupleMonthlyReal)
  if (survivor === '0' || couple === '0') return null
  return slots.verdictSurvivorSpendBasis(survivor, couple)
}
