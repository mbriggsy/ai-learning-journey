import type { CardType, SubPhase } from './types'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Empty payloads are intentional for actions with no parameters
type Empty = {}

/** Game actions sent via ClientMessage { type: 'action', payload: ClientAction } */
export type ClientActionMap = {
  'play-card': { cardIds: string[]; targetPlayerId?: string; namedCardType?: CardType }
  'draw-card': Empty
  'nope': Empty
  'defuse-place': { position: number }
  'favor-give': { cardId: string }
  'future-rearrange': { order: string[] }
  'select-target': { targetPlayerId: string }
  'name-card': { cardType: CardType }
}

/** Server-only actions — cannot be constructed by clients */
export type ServerOnlyActionMap = {
  'nope-window-expired': { windowGeneration: number }
  'prompt-timeout': { subPhase: SubPhase }
}

/** Full engine action map — includes start-game (routed as direct ClientMessage, not via action wrapper) */
export type ActionMap = ClientActionMap & ServerOnlyActionMap & {
  'start-game': Empty
}

/** Derived discriminated union of all actions */
export type GameAction = { [K in keyof ActionMap]: { type: K } & ActionMap[K] }[keyof ActionMap]

/** What clients send as game actions (with stateVersion for optimistic locking) */
export type ClientGameAction = { [K in keyof ClientActionMap]: { type: K } & ClientActionMap[K] }[keyof ClientActionMap]
export type ClientAction = ClientGameAction & { stateVersion: number }

/** What the engine receives (playerId injected by server) */
export type EngineAction = GameAction & { playerId: string }

/** Action type string union */
export type ActionType = keyof ActionMap

/** Client action type string union (for Zod validation of action wrapper payloads) */
export type ClientActionType = keyof ClientActionMap

/** Server-only action type string union */
export type ServerOnlyActionType = keyof ServerOnlyActionMap

/** Set of server-only action types for runtime checks */
export const SERVER_ONLY_ACTIONS = new Set<ServerOnlyActionType>(['nope-window-expired', 'prompt-timeout'])
