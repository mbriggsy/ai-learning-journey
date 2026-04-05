import type { StepResult } from '../types/simulation.js'
import { AGE_MAX, GHOST_DECAY_GENERATIONS } from '../constants.js'

/**
 * Pure step function — advances one generation.
 *
 * Reads from `front`, writes to `back`. Updates `age` and `ghost` in place.
 * All buffers must be padded: size = (width+2)*(height+2), stride = width+2.
 *
 * For wrap mode, caller must run Grid.copyEdges() before calling this.
 */
export function step(
  front: Uint8Array,
  back: Uint8Array,
  age: Uint8Array,
  ghost: Uint8Array,
  width: number,
  height: number,
  stride: number,
): StepResult {
  let liveCells = 0
  let births = 0
  let deaths = 0

  for (let y = 1; y <= height; y++) {
    const rowBase = y * stride

    for (let x = 1; x <= width; x++) {
      const idx = rowBase + x

      // Inlined 8-neighbor sum — no function call per cell
      const sum =
        front[idx - stride - 1]! + front[idx - stride]! + front[idx - stride + 1]! +
        front[idx - 1]!          +                         front[idx + 1]!          +
        front[idx + stride - 1]! + front[idx + stride]! + front[idx + stride + 1]!

      const old = front[idx]!
      // Conway: born if exactly 3, survive if 2 or 3
      const newState = (sum === 3 || (sum === 2 && old === 1)) ? 1 : 0

      back[idx] = newState

      // Branchless stats
      liveCells += newState
      births += newState & ~old
      deaths += old & ~newState

      // Age/ghost merged into main loop
      if (newState === 1) {
        // Alive: increment age (saturate at AGE_MAX), newborn starts at 1
        age[idx] = old === 1 ? Math.min(age[idx]! + 1, AGE_MAX) : 1
      } else {
        if (old === 1 && age[idx]! >= 3) {
          // Meaningful death (lived 3+ gens): start ghost decay
          // Filters out oscillator flicker (age 1-2)
          ghost[idx] = GHOST_DECAY_GENERATIONS
        } else if (ghost[idx]! > 0) {
          // Already dead, ghost decaying
          ghost[idx] = ghost[idx]! - 1
        }
        // Reset age for dead cells
        age[idx] = 0
      }
    }
  }

  return { liveCellCount: liveCells, birthCount: births, deathCount: deaths }
}
