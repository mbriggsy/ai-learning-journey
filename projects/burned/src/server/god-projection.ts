/**
 * `buildGodProjections` — builds the per-viewer map attached to every
 * god-event's `projections` field. Pure helper; lives outside `room.ts`
 * per the Workers-entry landmine.
 *
 * The invariant that underpins the whole harness: `god-event.projections[V]`
 * must structurally equal the `PlayerView` that viewer V's concurrent
 * `player-update.payload.state` carries. Unit 6 guarantees this BY
 * CONSTRUCTION — it passes the SAME `state` and the SAME `boardView`
 * instance (already computed once via `projectForBoard`) that the
 * broadcast loop uses to build each `player-update`. The same
 * `projectForPlayer(state, id, boardView)` call produces both outputs.
 *
 * Privacy is inherited from `projectForPlayer` — `augmentNopeWindowForPlayer`
 * at `projection.ts:174` viewer-gates `namedCardType` to stealer+target
 * only; `stripPrivateEventFields` at `projection.ts:217-241` strips
 * per-viewer private event payloads. The god-event carries as much
 * information as the orchestrator could reconstruct by eavesdropping on
 * every socket, no more.
 */

import type { PlayerView, BoardView } from '@shared/protocol'
import type { PlayingState, GameOverState } from './game/types'
import { projectForPlayer } from './projection'

export function buildGodProjections(
  state: PlayingState | GameOverState,
  boardView: BoardView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _connectedPlayerIds: ReadonlySet<string>,
): Record<string, PlayerView> {
  // Iterate `state.players` (NOT `state.players.filter(isAlive)`).
  // Eliminated-but-seated players still receive full PlayerView
  // broadcasts per engine invariant (`projectForPlayer` returns
  // `player?.hand ?? []` for eliminated seats). Disconnected-but-seated
  // players are likewise included — the BoardPlayer entries already
  // carry `isConnected: false` flags via the shared `boardView`.
  //
  // `_connectedPlayerIds` is accepted in the signature for parity with
  // `projectForBoard` (caller passes both) and reserved for future use
  // (e.g. if a future split emitter needs to filter). It is deliberately
  // unused here — changing which players appear in `projections` would
  // break Phase 3 Unit 4's reassembly-complete contract.
  const projections: Record<string, PlayerView> = {}
  for (const p of state.players) {
    projections[p.id] = projectForPlayer(state, p.id, boardView)
  }
  return projections
}
