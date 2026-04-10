import type { CardInstance, CardType } from './types'
import { CARD_DEF_BY_TYPE } from './card-defs'
import type { CardCategory } from './card-defs'

const COMBO_EXCLUDED: Set<CardCategory> = new Set(['burned', 'extraction'])

export type ComboValidation =
  | { valid: false; reason: 'mismatched-types' | 'invalid-count' | 'contains-extraction' | 'contains-burned' | 'wild-with-non-operative' | 'single-operative' | 'single-intercepted' }
  | { valid: true; playType: PlayType }

export type PlayType =
  | { kind: 'single'; cardType: CardType; requiresTarget: boolean }
  | { kind: 'pair'; matchType: CardType }
  | { kind: 'triple'; matchType: CardType }

const TARGET_CARDS: Set<string> = new Set(['direct-order', 'call-in-a-favor'])

export function validateCombo(
  selectedCards: readonly CardInstance[],
  hand: readonly CardInstance[],
): ComboValidation {
  if (selectedCards.length === 0 || selectedCards.length > 3) {
    return { valid: false, reason: 'invalid-count' }
  }

  // Verify all cards are in hand
  const handIds = new Set(hand.map(c => c.id))
  if (!selectedCards.every(c => handIds.has(c.id))) {
    return { valid: false, reason: 'invalid-count' }
  }

  if (selectedCards.length === 1) {
    const card = selectedCards[0]!
    const def = CARD_DEF_BY_TYPE[card.type]

    // Excluded categories can't be played
    if (def.category === 'burned') return { valid: false, reason: 'contains-burned' }
    if (def.category === 'extraction') return { valid: false, reason: 'contains-extraction' }

    // Operative/wild cards can't be played alone
    if (def.category === 'operative' || def.category === 'wild') {
      return { valid: false, reason: 'single-operative' }
    }

    // Intercepted is instant/interrupt only — played reactively via Intercept button
    if (card.type === 'intercepted') {
      return { valid: false, reason: 'single-intercepted' }
    }

    return {
      valid: true,
      playType: {
        kind: 'single',
        cardType: card.type,
        requiresTarget: TARGET_CARDS.has(card.type),
      },
    }
  }

  // 2 or 3 card combos — check match first so "Cards must match" wins over per-card exclusions
  if (!isValidComboMatch(selectedCards)) {
    return { valid: false, reason: 'mismatched-types' }
  }

  // Determine the match type (first non-wild, or agent-x if all wilds)
  const nonWilds = selectedCards.filter(c => c.type !== 'agent-x')
  const matchType: CardType = nonWilds.length > 0 ? nonWilds[0]!.type : 'agent-x'

  if (selectedCards.length === 2) {
    return { valid: true, playType: { kind: 'pair', matchType } }
  }

  return { valid: true, playType: { kind: 'triple', matchType } }
}

function isValidComboMatch(cards: readonly CardInstance[]): boolean {
  if (cards.some(c => COMBO_EXCLUDED.has(CARD_DEF_BY_TYPE[c.type].category))) return false

  const types = cards.map(c => c.type)
  const nonWildTypes = types.filter(t => t !== 'agent-x')

  // All wilds = valid
  if (nonWildTypes.length === 0) return true

  // All non-wilds must be same type
  const baseType = nonWildTypes[0]!
  if (!nonWildTypes.every(t => t === baseType)) return false

  // Wild can only sub for operative/wild categories
  const hasWildSub = types.some(t => t === 'agent-x')
  if (hasWildSub) {
    const baseDef = CARD_DEF_BY_TYPE[baseType]
    if (baseDef.category !== 'operative' && baseDef.category !== 'wild') return false
  }

  return true
}
