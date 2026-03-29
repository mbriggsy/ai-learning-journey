import { describe, it, expect } from 'vitest'
import { step } from '../../../src/engine/Rules.js'
import { AGE_MAX, GHOST_DECAY_GENERATIONS } from '../../../src/constants.js'

/**
 * Helper: create padded buffers for a small grid.
 * Returns { front, back, age, ghost, stride } for a width x height grid.
 */
function makeBuffers(width: number, height: number) {
  const stride = width + 2
  const size = (width + 2) * (height + 2)
  return {
    front: new Uint8Array(size),
    back: new Uint8Array(size),
    age: new Uint8Array(size),
    ghost: new Uint8Array(size),
    stride,
  }
}

/** Set a cell in padded buffer at logical (x, y) */
function setCell(buf: Uint8Array, x: number, y: number, stride: number): void {
  buf[(y + 1) * stride + (x + 1)] = 1
}

/** Get a cell from padded buffer at logical (x, y) */
function getCell(buf: Uint8Array, x: number, y: number, stride: number): number {
  return buf[(y + 1) * stride + (x + 1)]!
}

describe('Rules.step', () => {
  describe('Conway rules', () => {
    it('birth: dead cell with exactly 3 neighbors becomes alive', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      // 3 neighbors around (2, 2)
      setCell(front, 1, 1, stride)
      setCell(front, 2, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(getCell(back, 2, 2, stride)).toBe(1) // born
    })

    it('survival: live cell with 2 neighbors stays alive', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = 5 // existing age
      setCell(front, 1, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(getCell(back, 2, 2, stride)).toBe(1)
    })

    it('survival: live cell with 3 neighbors stays alive', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      setCell(front, 1, 1, stride)
      setCell(front, 2, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(getCell(back, 2, 2, stride)).toBe(1)
    })

    it('underpopulation: live cell with <2 neighbors dies', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      setCell(front, 1, 1, stride) // only 1 neighbor

      step(front, back, age, ghost, 5, 5, stride)

      expect(getCell(back, 2, 2, stride)).toBe(0)
    })

    it('overpopulation: live cell with >3 neighbors dies', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      setCell(front, 1, 1, stride)
      setCell(front, 2, 1, stride)
      setCell(front, 3, 1, stride)
      setCell(front, 1, 2, stride) // 4 neighbors → dies

      step(front, back, age, ghost, 5, 5, stride)

      expect(getCell(back, 2, 2, stride)).toBe(0)
    })
  })

  describe('stats', () => {
    it('counts births and deaths accurately', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      // Vertical blinker at center
      setCell(front, 2, 1, stride)
      setCell(front, 2, 2, stride)
      setCell(front, 2, 3, stride)

      const result = step(front, back, age, ghost, 5, 5, stride)

      // Blinker flips: 2 births (1,2) and (3,2), 2 deaths (2,1) and (2,3), center survives
      expect(result.birthCount).toBe(2)
      expect(result.deathCount).toBe(2)
      expect(result.liveCellCount).toBe(3)
    })
  })

  describe('age tracking', () => {
    it('newborn cell gets age 1', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 1, 1, stride)
      setCell(front, 2, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      // (2,2) was born — age should be 1
      expect(age[(2 + 1) * stride + (2 + 1)]).toBe(1)
    })

    it('surviving cell increments age', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      // Center cell alive with age 5
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = 5
      // Give it exactly 2 neighbors to survive
      setCell(front, 1, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(age[(2 + 1) * stride + (2 + 1)]).toBe(6)
    })

    it('age saturates at AGE_MAX (255)', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = AGE_MAX
      setCell(front, 1, 1, stride)
      setCell(front, 3, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(age[(2 + 1) * stride + (2 + 1)]).toBe(AGE_MAX)
    })

    it('dead cell age is 0', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      // Cell alive then dies (only 1 neighbor = underpopulation)
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = 10
      setCell(front, 1, 1, stride)

      step(front, back, age, ghost, 5, 5, stride)

      expect(age[(2 + 1) * stride + (2 + 1)]).toBe(0)
    })
  })

  describe('ghost tracking', () => {
    it('dead cell with age >= 3 gets GHOST_DECAY_GENERATIONS', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = 5 // lived long enough to qualify
      setCell(front, 1, 1, stride) // only 1 neighbor → dies

      step(front, back, age, ghost, 5, 5, stride)

      expect(ghost[(2 + 1) * stride + (2 + 1)]).toBe(GHOST_DECAY_GENERATIONS)
    })

    it('dead cell with age < 3 does NOT get ghost (oscillation filter)', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      setCell(front, 2, 2, stride)
      age[(2 + 1) * stride + (2 + 1)] = 1 // short-lived — oscillation
      setCell(front, 1, 1, stride) // only 1 neighbor → dies

      step(front, back, age, ghost, 5, 5, stride)

      expect(ghost[(2 + 1) * stride + (2 + 1)]).toBe(0)
    })

    it('ghost decays each generation', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      // Cell already dead, ghost = 2
      ghost[(2 + 1) * stride + (2 + 1)] = 2

      step(front, back, age, ghost, 5, 5, stride)

      expect(ghost[(2 + 1) * stride + (2 + 1)]).toBe(1)
    })

    it('ghost stops at 0', () => {
      const { front, back, age, ghost, stride } = makeBuffers(5, 5)
      ghost[(2 + 1) * stride + (2 + 1)] = 0

      step(front, back, age, ghost, 5, 5, stride)

      expect(ghost[(2 + 1) * stride + (2 + 1)]).toBe(0)
    })
  })
})
