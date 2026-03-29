import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GameLoop } from '../../../src/engine/GameLoop.js'
import { Simulation } from '../../../src/engine/Simulation.js'
import type { TimerProvider } from '../../../src/engine/types.js'

/** Manual-step timer: stores the callback, caller advances by calling tick() */
function createFakeTimer() {
  let storedCallback: ((timestamp: number) => void) | null = null
  let nextId = 1

  const timer: TimerProvider = {
    requestFrame: (cb) => {
      storedCallback = cb
      return nextId++
    },
    cancelFrame: () => {
      storedCallback = null
    },
  }

  return {
    timer,
    /** Simulate a frame at the given timestamp */
    tick(timestamp: number) {
      const cb = storedCallback
      storedCallback = null
      cb?.(timestamp)
    },
    get hasPendingFrame() {
      return storedCallback !== null
    },
  }
}

describe('GameLoop', () => {
  let sim: Simulation
  let fake: ReturnType<typeof createFakeTimer>
  let loop: GameLoop

  beforeEach(() => {
    sim = new Simulation(10, 10, 'wrap')
    fake = createFakeTimer()
    loop = new GameLoop(fake.timer, sim)
  })

  describe('play/pause', () => {
    it('starts not playing', () => {
      expect(loop.isPlaying()).toBe(false)
    })

    it('play schedules a frame', () => {
      loop.play()
      expect(loop.isPlaying()).toBe(true)
      expect(fake.hasPendingFrame).toBe(true)
    })

    it('pause stops the loop', () => {
      loop.play()
      loop.pause()
      expect(loop.isPlaying()).toBe(false)
    })

    it('double play is a no-op', () => {
      loop.play()
      loop.play() // should not throw
      expect(loop.isPlaying()).toBe(true)
    })
  })

  describe('stepOnce', () => {
    it('advances exactly one generation while paused', () => {
      sim.setCell(1, 0, true)
      sim.setCell(1, 1, true)
      sim.setCell(1, 2, true)

      expect(sim.generation).toBe(0)
      loop.stepOnce()
      expect(sim.generation).toBe(1)
    })

    it('fires onTick callback with stats', () => {
      sim.setCell(1, 0, true)
      sim.setCell(1, 1, true)
      sim.setCell(1, 2, true)

      const tickSpy = vi.fn()
      loop.onTick(tickSpy)
      loop.stepOnce()

      expect(tickSpy).toHaveBeenCalledOnce()
      const [, stats] = tickSpy.mock.calls[0]!
      expect(stats.stepsThisFrame).toBe(1)
    })
  })

  describe('speed control', () => {
    it('at 1 gen/sec, does not step until 1 second elapses', () => {
      loop.setSpeed(1)
      sim.setCell(1, 0, true)
      sim.setCell(1, 1, true)
      sim.setCell(1, 2, true)

      loop.play()
      fake.tick(0)     // first frame — initializes timing, no step
      fake.tick(500)   // 500ms — not enough for 1 gen/sec

      expect(sim.generation).toBe(0)

      fake.tick(1100)  // 1100ms total — should step

      expect(sim.generation).toBe(1)
    })
  })

  describe('onTick callback', () => {
    it('unsubscribe stops callbacks', () => {
      const spy = vi.fn()
      const unsub = loop.onTick(spy)

      loop.stepOnce()
      expect(spy).toHaveBeenCalledOnce()

      unsub()
      loop.stepOnce()
      expect(spy).toHaveBeenCalledOnce() // not called again
    })
  })

  describe('isPlaying', () => {
    it('reflects correct state through play/pause cycle', () => {
      expect(loop.isPlaying()).toBe(false)
      loop.play()
      expect(loop.isPlaying()).toBe(true)
      loop.pause()
      expect(loop.isPlaying()).toBe(false)
    })
  })
})
