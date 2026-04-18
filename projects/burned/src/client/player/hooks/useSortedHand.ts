import { useMemo } from 'react'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardCategory, CardType } from '@shared/card-defs'
import type { CardInstance } from '@shared/types'

const CATEGORY_PRIORITY: Record<CardCategory, number> = {
  operative: 0,
  wild: 1,
  action: 2,
  extraction: 3,  // unused directly — `extraction` pins via TYPE_PIN below
  burned: 4,
}

const OPERATIVE_ORDER: Record<string, number> = {
  'dash-barlowe': 0,
  'vera-khan': 1,
  'sable-ashworth': 2,
  'janet-broadside': 3,
  'neal-proctor': 4,
}

// Type-specific pin priorities — override the category bucket so these two
// cards always sit on the rightmost edge of the hand for panic-reach.
// Extraction is THE lifeline (Burned response); Intercepted is the reactive
// counter. Both need thumb-reach certainty.
const TYPE_PIN_PRIORITY: Record<string, number> = {
  intercepted: 10,  // second-rightmost
  extraction: 11,   // rightmost
}

function bucketFor(type: CardType): number {
  const pin = TYPE_PIN_PRIORITY[type]
  if (pin !== undefined) return pin
  return CATEGORY_PRIORITY[CARD_DEF_BY_TYPE[type].category]
}

/**
 * Sort a hand so same-of-kind are adjacent — like a human would.
 * Left → right: Operatives grouped by type → Agent X → generic Actions →
 * Intercepted (pinned 2nd from right) → Extraction (pinned rightmost).
 */
export function sortHand(hand: readonly CardInstance[]): CardInstance[] {
  return [...hand].sort((a, b) => {
    // Bucket priority (type-pin overrides category)
    const bucketDiff = bucketFor(a.type) - bucketFor(b.type)
    if (bucketDiff !== 0) return bucketDiff

    const defA = CARD_DEF_BY_TYPE[a.type]
    const defB = CARD_DEF_BY_TYPE[b.type]

    // Within operatives: group by canonical operative order
    if (defA.category === 'operative' && defB.category === 'operative') {
      const opDiff = (OPERATIVE_ORDER[a.type] ?? 99) - (OPERATIVE_ORDER[b.type] ?? 99)
      if (opDiff !== 0) return opDiff
    }

    // Within same bucket: alphabetical by display name
    const nameDiff = defA.name.localeCompare(defB.name)
    if (nameDiff !== 0) return nameDiff

    // Stable tiebreak
    return a.id.localeCompare(b.id)
  })
}

export function useSortedHand(hand: readonly CardInstance[]): CardInstance[] {
  return useMemo(() => sortHand(hand), [hand])
}
