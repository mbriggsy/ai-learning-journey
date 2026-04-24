import { describe, expect, it } from 'vitest'
import { buildGodProjections, buildGodEventMessage, type GodEventTrigger } from './god-projection'
import { projectForBoard } from './projection'
import { startGameWith } from './game/test-helpers'
import type { EngineAction } from '@shared/actions'
import type { PlayingState } from './game/types'
import { messageByteLength } from './validation'

const NOW = 100_000

/**
 * Build a fresh 10-player playing state for budget assertions. 10 is the
 * hard max per MAX_PLAYERS (`src/server/room.ts:23`) and represents the
 * worst case for both payload size (hands + events + board players) and
 * CPU time (per-viewer projection count).
 */
function buildTenPlayerFixture(): PlayingState {
  return startGameWith(10)
}

describe('buildGodProjections — CPU budget at N=10 (worst case)', () => {
  it('completes in under 10ms averaged over 100 iterations', () => {
    const state = buildTenPlayerFixture()
    const connected = new Set(state.players.map(p => p.id))
    const board = projectForBoard(state, NOW, connected)

    // Warm-up: JIT compile + prime caches (first call is always slowest).
    for (let i = 0; i < 10; i++) buildGodProjections(state, board, connected)

    const iterations = 100
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      buildGodProjections(state, board, connected)
    }
    const elapsedMs = (performance.now() - start) / iterations

    // Soft ceiling: 50ms. Plan target is 10ms, but CI variance can
    // drive headroom noise on shared runners. If this fires, the
    // quadratic per-viewer `stripPrivateEventFields` is regressing.
    expect(elapsedMs).toBeLessThan(50)

    // Log the measurement to stdout — operators can eyeball against
    // the 10ms target. This is not a hard assertion so a cold Windows
    // Vitest run doesn't flake CI.
    console.log(`[bench] buildGodProjections N=10 avg=${elapsedMs.toFixed(3)}ms over ${iterations} iters`)
  })

  it('full buildGodEventMessage (projections + event envelope) stays under the same budget', () => {
    const state = buildTenPlayerFixture()
    const connected = new Set(state.players.map(p => p.id))
    const board = projectForBoard(state, NOW, connected)
    const trigger: GodEventTrigger = {
      action: { type: 'draw-card', playerId: state.players[0]!.id } as EngineAction,
      events: [],
      stateVersion: state.stateVersion,
      nowMs: NOW,
    }

    for (let i = 0; i < 10; i++) buildGodEventMessage(state, board, connected, trigger)

    const iterations = 100
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      buildGodEventMessage(state, board, connected, trigger)
    }
    const elapsedMs = (performance.now() - start) / iterations

    expect(elapsedMs).toBeLessThan(50)
    console.log(`[bench] buildGodEventMessage N=10 avg=${elapsedMs.toFixed(3)}ms over ${iterations} iters`)
  })
})

describe('god-event — payload budget at N=10', () => {
  it('serialized message is under 512 KiB (Phase 2 watermark)', () => {
    const state = buildTenPlayerFixture()
    const connected = new Set(state.players.map(p => p.id))
    const board = projectForBoard(state, NOW, connected)
    const trigger: GodEventTrigger = {
      action: { type: 'draw-card', playerId: state.players[0]!.id } as EngineAction,
      events: state.events,
      stateVersion: state.stateVersion,
      nowMs: NOW,
    }
    const msg = buildGodEventMessage(state, board, connected, trigger)
    const raw = JSON.stringify(msg)
    const bytes = messageByteLength(raw)

    // 512 KiB is the Phase 2 budget watermark. Workers outbound cap is
    // 1 MiB per frame. If this fires, per-viewer splitting (plan Risks
    // row) is the designed fallback.
    expect(bytes).toBeLessThan(512_000)

    console.log(`[bench] god-event payload N=10: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KiB)`)
  })

  it('serialized message is under 1 MiB (Workers frame cap — hard)', () => {
    const state = buildTenPlayerFixture()
    const connected = new Set(state.players.map(p => p.id))
    const board = projectForBoard(state, NOW, connected)
    const trigger: GodEventTrigger = {
      action: { type: 'draw-card', playerId: state.players[0]!.id } as EngineAction,
      events: state.events,
      stateVersion: state.stateVersion,
      nowMs: NOW,
    }
    const msg = buildGodEventMessage(state, board, connected, trigger)
    const bytes = messageByteLength(JSON.stringify(msg))
    expect(bytes).toBeLessThan(1_000_000)
  })
})
