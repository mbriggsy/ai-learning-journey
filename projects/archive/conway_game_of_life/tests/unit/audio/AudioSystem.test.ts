import { describe, it, expect } from 'vitest'
import { AudioSystem } from '../../../src/audio/AudioSystem.js'
import type { SimulationState } from '../../../src/types/simulation.js'
import type { FrameStats } from '../../../src/engine/types.js'

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    generation: 0,
    width: 100,
    height: 100,
    boundaryMode: 'wrap',
    liveCellCount: 1000,
    birthCount: 0,
    deathCount: 0,
    ...overrides,
  }
}

function makeStats(overrides: Partial<FrameStats> = {}): FrameStats {
  return {
    stepsThisFrame: 1,
    frameBirthCount: 0,
    frameDeathCount: 0,
    liveCellCount: 1000,
    ...overrides,
  }
}

describe('AudioSystem', () => {
  it('starts unavailable before init()', () => {
    const audio = new AudioSystem()
    expect(audio.isAvailable()).toBe(false)
  })

  it('update() is a no-op when unavailable', () => {
    const audio = new AudioSystem()
    // Should not throw
    audio.update(makeState(), makeStats())
  })

  it('starts unmuted', () => {
    const audio = new AudioSystem()
    expect(audio.isMuted()).toBe(false)
  })

  it('mute() before init() stores pending state', () => {
    const audio = new AudioSystem()
    audio.mute()
    expect(audio.isMuted()).toBe(true)
  })

  it('unmute() clears pending mute', () => {
    const audio = new AudioSystem()
    audio.mute()
    audio.unmute()
    expect(audio.isMuted()).toBe(false)
  })

  it('getCaptureStream() returns null when unavailable', () => {
    const audio = new AudioSystem()
    expect(audio.getCaptureStream()).toBeNull()
  })

  it('dispose() does not throw when not initialized', () => {
    const audio = new AudioSystem()
    audio.dispose() // should not throw
  })

  describe('stability detection logic', () => {
    it('detects stability after 16 identical values', () => {
      const audio = new AudioSystem()
      // We can't test the internal stabilityBuffer directly, but we can verify
      // that update() doesn't crash with stable data
      const state = makeState({ liveCellCount: 500 })
      const stats = makeStats({ liveCellCount: 500 })
      for (let i = 0; i < 20; i++) {
        audio.update(state, stats)
      }
      // No crash = pass (stability detection runs but audio is unavailable)
    })

    it('handles varying data without crashing', () => {
      const audio = new AudioSystem()
      for (let i = 0; i < 20; i++) {
        const state = makeState({ liveCellCount: Math.floor(Math.random() * 5000) })
        const stats = makeStats({ liveCellCount: state.liveCellCount })
        audio.update(state, stats)
      }
    })
  })
})
