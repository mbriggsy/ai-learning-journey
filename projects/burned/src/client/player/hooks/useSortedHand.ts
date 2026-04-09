import { useMemo } from 'react'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardCategory } from '@shared/card-defs'
import type { CardInstance } from '@shared/types'

const CATEGORY_PRIORITY: Record<CardCategory, number> = {
  operative: 0,
  wild: 1,
  extraction: 2,
  action: 3,
  burned: 4,
}

const OPERATIVE_ORDER: Record<string, number> = {
  'dash-barlowe': 0,
  'vera-khan': 1,
  'sable-ashworth': 2,
  'janet-broadside': 3,
  'neal-proctor': 4,
}

/**
 * Sort a hand so same-of-kind are adjacent — like a human would.
 * Priority: Extraction (lifeline) → Operatives grouped by type → Agent X → Actions alpha.
 */
export function sortHand(hand: readonly CardInstance[]): CardInstance[] {
  return [...hand].sort((a, b) => {
    const defA = CARD_DEF_BY_TYPE[a.type]
    const defB = CARD_DEF_BY_TYPE[b.type]

    // Category priority
    const catDiff = CATEGORY_PRIORITY[defA.category] - CATEGORY_PRIORITY[defB.category]
    if (catDiff !== 0) return catDiff

    // Within operatives: group by type
    if (defA.category === 'operative' && defB.category === 'operative') {
      const opDiff = (OPERATIVE_ORDER[a.type] ?? 99) - (OPERATIVE_ORDER[b.type] ?? 99)
      if (opDiff !== 0) return opDiff
    }

    // Within same category: alphabetical by name
    const nameDiff = defA.name.localeCompare(defB.name)
    if (nameDiff !== 0) return nameDiff

    // Stable tiebreak
    return a.id.localeCompare(b.id)
  })
}

export function useSortedHand(hand: readonly CardInstance[]): CardInstance[] {
  return useMemo(() => sortHand(hand), [hand])
}
