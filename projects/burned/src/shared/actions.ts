import type { CardType } from './types'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Empty payloads are intentional for actions with no parameters
type Empty = {}

/** Game actions sent via ClientMessage { type: 'action', payload: ClientAction } */
export type ClientActionMap = {
  'play-card': { cardIds: string[]; targetPlayerId?: string; namedCardType?: CardType }
  'draw-card': Empty
  'nope': { windowGeneration: number }
  'defuse-place': { position: number }
  'favor-give': { cardId: string }
  'future-rearrange': { order: string[] }
  'name-card': { cardType: CardType }
  'cancel-name-card': Empty
}

/** Server-only actions — cannot be constructed by clients */
export type ServerOnlyActionMap = {
  'nope-window-expired': { windowGeneration: number }
  'nope-grace-expired': { windowGeneration: number }
}

/** Host-only actions — issued by the board's host connection, not by
 *  player phones. Server validates the sender owns the host slot before
 *  routing into the engine. Pause/resume of the intercept countdown
 *  lives here: the table calls a hold via a tap on the board so a player
 *  can weigh the intercept decision without the timer running out. */
export type HostOnlyActionMap = {
  'pause-nope-window': { windowGeneration: number }
  'resume-nope-window': { windowGeneration: number }
}

/** Full engine action map — includes start-game (routed as direct ClientMessage, not via action wrapper) */
export type ActionMap = ClientActionMap & ServerOnlyActionMap & HostOnlyActionMap & {
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

/** Server-only action type string union */
type ServerOnlyActionType = keyof ServerOnlyActionMap

/** Host-only action type string union */
type HostOnlyActionType = keyof HostOnlyActionMap

/** Set of server-only action types for runtime checks */
export const SERVER_ONLY_ACTIONS = new Set<ServerOnlyActionType>(['nope-window-expired', 'nope-grace-expired'])

/** Set of host-only action types for runtime checks */
export const HOST_ONLY_ACTIONS = new Set<HostOnlyActionType>(['pause-nope-window', 'resume-nope-window'])
