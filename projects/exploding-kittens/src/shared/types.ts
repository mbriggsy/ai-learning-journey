import type { CardType } from './card-defs'
export type { CardType }

/** Individual card instance — unique ID for tracking in hands/deck/discard */
export interface CardInstance {
  readonly id: string
  readonly type: CardType
}

/** Top-level game phases — sub-phases added in Phase 2 */
export type GamePhase = 'lobby' | 'playing' | 'game_over'
