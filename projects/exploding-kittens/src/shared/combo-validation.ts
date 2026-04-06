import type { CardInstance, CardType } from './types'
import { CARD_DEF_BY_TYPE } from './card-defs'
import type { CardCategory } from './card-defs'

const COMBO_EXCLUDED: Set<CardCategory> = new Set(['kitten', 'defuse'])

export type ComboValidation =
  | { valid: false; reason: 'mismatched-types' | 'invalid-count' | 'contains-defuse' | 'contains-ek' | 'feral-with-non-cat' | 'single-cat' }
  | { valid: true; playType: PlayType }

export type PlayType =
  | { kind: 'single'; cardType: CardType; requiresTarget: boolean }
  | { kind: 'pair'; matchType: CardType }
  | { kind: 'triple'; matchType: CardType }

const TARGET_CARDS: Set<string> = new Set(['targeted-attack', 'favor'])

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

  // Check for excluded categories
  for (const card of selectedCards) {
    const def = CARD_DEF_BY_TYPE[card.type]
    if (def.category === 'kitten') return { valid: false, reason: 'contains-ek' }
    if (def.category === 'defuse') return { valid: false, reason: 'contains-defuse' }
  }

  if (selectedCards.length === 1) {
    const card = selectedCards[0]!
    const def = CARD_DEF_BY_TYPE[card.type]

    // Cat/wild cards can't be played alone
    if (def.category === 'cat' || def.category === 'wild') {
      return { valid: false, reason: 'single-cat' }
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

  // 2 or 3 card combos
  if (!isValidComboMatch(selectedCards)) {
    return { valid: false, reason: 'mismatched-types' }
  }

  // Determine the match type (first non-feral, or feral-cat if all ferals)
  const nonFerals = selectedCards.filter(c => c.type !== 'feral-cat')
  const matchType: CardType = nonFerals.length > 0 ? nonFerals[0]!.type : 'feral-cat'

  if (selectedCards.length === 2) {
    return { valid: true, playType: { kind: 'pair', matchType } }
  }

  return { valid: true, playType: { kind: 'triple', matchType } }
}

function isValidComboMatch(cards: readonly CardInstance[]): boolean {
  if (cards.some(c => COMBO_EXCLUDED.has(CARD_DEF_BY_TYPE[c.type].category))) return false

  const types = cards.map(c => c.type)
  const nonFeralTypes = types.filter(t => t !== 'feral-cat')

  // All ferals = valid
  if (nonFeralTypes.length === 0) return true

  // All non-ferals must be same type
  const baseType = nonFeralTypes[0]!
  if (!nonFeralTypes.every(t => t === baseType)) return false

  // Feral can only sub for cat/wild categories
  const hasFeralSub = types.some(t => t === 'feral-cat')
  if (hasFeralSub) {
    const baseDef = CARD_DEF_BY_TYPE[baseType]
    if (baseDef.category !== 'cat' && baseDef.category !== 'wild') return false
  }

  return true
}
