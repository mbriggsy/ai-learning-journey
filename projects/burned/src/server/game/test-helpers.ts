import { createLobbyState, dispatch } from './engine'
import type { PlayingState, LobbyState, DispatchContext, DispatchResult } from './types'
import type { EngineAction } from '@shared/actions'

/** Deterministic PRNG (Park-Miller) for test reproducibility */
export function makeCtx(now = 1000): DispatchContext {
  let seed = 42
  return {
    now,
    random: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 },
    randomInt: (max: number) => { seed = (seed * 16807) % 2147483647; return seed % max },
  }
}

/** Dispatch an action with partial type safety (test convenience).
 *  When the action is a `nope` and the caller didn't specify
 *  `windowGeneration`, auto-inject the current nopeWindow generation —
 *  most tests just want "a valid Nope" and shouldn't have to thread
 *  generation bookkeeping through every call. Tests that need to
 *  exercise the stale-generation rejection path (D-03) can pass an
 *  explicit `windowGeneration` to override. */
export function act(state: PlayingState | LobbyState, action: Partial<EngineAction> & { type: string }, ctx = makeCtx()): DispatchResult {
  let finalAction = action
  if (action.type === 'nope' && !('windowGeneration' in action) && state.phase === 'playing' && state.nopeWindow) {
    finalAction = { ...action, windowGeneration: state.nopeWindow.generation }
  }
  return dispatch(state, finalAction as EngineAction, ctx)
}

/** Start a game with N players */
export function startGameWith(playerCount: number, ctx?: DispatchContext): PlayingState {
  const c = ctx ?? makeCtx()
  let lobby: LobbyState = createLobbyState()
  for (let i = 0; i < playerCount; i++) {
    lobby = {
      ...lobby,
      players: [...lobby.players, { id: `p${i + 1}`, name: `Player ${i + 1}`, color: `#${i}` }],
    }
  }
  const result = dispatch(lobby, { type: 'start-game', playerId: 'p1' } as EngineAction, c)
  if (!result.ok) throw new Error('Failed to start game: ' + result.error)
  return result.state as PlayingState
}

/** Give a specific card to a player */
export function giveCard(state: PlayingState, playerId: string, cardType: string, cardId?: string): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, hand: [...p.hand, { id: cardId ?? `${cardType}-test`, type: cardType as never }] }
        : p,
    ),
  }
}

/** Remove all cards of a type from a player's hand */
export function removeCardType(state: PlayingState, playerId: string, cardType: string): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: p.hand.filter(c => c.type !== cardType) } : p,
    ),
  }
}

/** Build a nope-window-expired action */
export function expireNope(state: PlayingState): Partial<EngineAction> & { type: string } {
  return {
    type: 'nope-window-expired',
    playerId: 'server',
    windowGeneration: state.nopeWindow!.generation,
  }
}

/** Fully resolve a Nope window: expire → grace → resolve */
export function resolveNopeWindow(state: PlayingState, ctx: DispatchContext): DispatchResult {
  const graceResult = act(state, expireNope(state), ctx)
  if (!graceResult.ok) return graceResult
  const graceState = graceResult.state as PlayingState
  return act(graceState, {
    type: 'nope-grace-expired',
    playerId: 'server',
    windowGeneration: graceState.nopeWindow!.generation,
  }, ctx)
}
