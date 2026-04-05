import type { CardType } from './card-defs'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Empty payloads are intentional for actions with no parameters
type Empty = {}

/** What each action type carries */
export type ActionMap = {
  'start-game': Empty
  'play-card': { cardIds: string[]; targetPlayerId?: string; namedCardType?: CardType }
  'draw-card': Empty
  'draw-from-bottom': Empty
  'nope': Empty
  'nope-window-expired': Empty
  'defuse-place': { position: number }
  'favor-give': { cardId: string }
  'future-rearrange': { order: string[] }
  'select-target': { targetPlayerId: string }
  'name-card': { cardType: CardType }
}

/** Derived discriminated union of all actions */
export type GameAction = { [K in keyof ActionMap]: { type: K } & ActionMap[K] }[keyof ActionMap]

/** What clients send (with stateVersion for optimistic locking) */
export type ClientAction = GameAction & { stateVersion: number }

/** What the engine receives (playerId injected by server) */
export type EngineAction = GameAction & { playerId: string }

/** Action type string union */
export type ActionType = keyof ActionMap
