import { useReducer, useEffect, useMemo, useCallback } from 'react'
import type { CardInstance } from '@shared/types'
import { validateCombo } from '@shared/combo-validation'
import type { ComboValidation } from '@shared/combo-validation'

// --- State ---

export type CardPlayState =
  | { status: 'idle' }
  | { status: 'selecting'; selectedCardIds: readonly string[]; validation: ComboValidation }

// --- Actions ---

type CardPlayAction =
  | { type: 'toggle-card'; cardId: string; hand: readonly CardInstance[]; maxStaged: number }
  | { type: 'reset' }

function reducer(state: CardPlayState, action: CardPlayAction): CardPlayState {
  switch (action.type) {
    case 'toggle-card': {
      const current = state.status === 'selecting' ? [...state.selectedCardIds] : []
      const idx = current.indexOf(action.cardId)
      if (idx >= 0) {
        current.splice(idx, 1)
      } else {
        // Favor-surrender caps at 1: new tap replaces the previous slot
        // rather than no-op'ing, so players can swap their mind without
        // a double-tap to unstage first.
        if (current.length >= action.maxStaged) {
          if (action.maxStaged === 1) {
            current.length = 0
            current.push(action.cardId)
          } else {
            return state
          }
        } else {
          current.push(action.cardId)
        }
      }

      if (current.length === 0) return { status: 'idle' }

      const selectedCards = current
        .map(id => action.hand.find(c => c.id === id))
        .filter((c): c is CardInstance => c !== undefined)

      if (selectedCards.length !== current.length) {
        // Card no longer in hand
        return { status: 'idle' }
      }

      const validation = validateCombo(selectedCards, action.hand)
      return { status: 'selecting', selectedCardIds: current, validation }
    }

    case 'reset':
      return { status: 'idle' }
  }
}

export function useCardPlay(
  hand: readonly CardInstance[],
  isMyTurn: boolean,
  subPhase: string | null,
  maxStaged: number = 3,
) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' })

  // Auto-reset on turn change or sub-phase change
  useEffect(() => {
    dispatch({ type: 'reset' })
  }, [isMyTurn, subPhase])

  // If the cap tightens underneath us (e.g. favor-pending arrives while the
  // player has 2+ cards staged from a prior selection), clear so we don't
  // carry an illegal selection into the new mode.
  useEffect(() => {
    dispatch({ type: 'reset' })
  }, [maxStaged])

  // Validate selected cards still exist in hand
  const validatedState = useMemo((): CardPlayState => {
    if (state.status !== 'selecting') return state

    const stillInHand = state.selectedCardIds.every(id => hand.some(c => c.id === id))
    if (!stillInHand) return { status: 'idle' }

    return state
  }, [state, hand])

  const toggleCard = useCallback((cardId: string) => {
    dispatch({ type: 'toggle-card', cardId, hand, maxStaged })
  }, [hand, maxStaged])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const selectedIds = useMemo(() => {
    if (validatedState.status !== 'selecting') return new Set<string>()
    return new Set(validatedState.selectedCardIds)
  }, [validatedState])

  return { state: validatedState, selectedIds, toggleCard, reset }
}
