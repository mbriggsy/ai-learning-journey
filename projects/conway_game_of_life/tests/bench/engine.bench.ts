import { bench, describe } from 'vitest'
import { Grid } from '../../src/engine/Grid.js'
import { step } from '../../src/engine/Rules.js'

describe('engine step performance', () => {
  const grid = new Grid(1000, 1000, 'wrap')
  grid.randomize(0.3)

  bench('1000x1000 step (wrap mode)', () => {
    grid.copyEdges()
    step(grid.front, grid.back, grid.age, grid.ghost, 1000, 1000, grid.stride)
    grid.swap()
  }, { time: 2000, iterations: 20, warmupTime: 500 })
})
