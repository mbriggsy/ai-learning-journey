import type { PatternDefinition } from './types.js'

export const glider = {
  id: 'glider',
  cinematicName: 'The Wanderer',
  conwayName: 'Glider',
  description: 'The classic. Travels forever.',
  width: 3,
  height: 3,
  cells: [[1,0], [2,1], [0,2], [1,2], [2,2]],
} as const satisfies PatternDefinition

export const gosperGliderGun = {
  id: 'gosper-glider-gun',
  cinematicName: 'The Cannon',
  conwayName: 'Gosper Glider Gun',
  description: 'Fires gliders endlessly.',
  width: 36,
  height: 9,
  cells: [
    [24,0],
    [22,1], [24,1],
    [12,2], [13,2], [20,2], [21,2], [34,2], [35,2],
    [11,3], [15,3], [20,3], [21,3], [34,3], [35,3],
    [0,4], [1,4], [10,4], [16,4], [20,4], [21,4],
    [0,5], [1,5], [10,5], [14,5], [16,5], [17,5], [22,5], [24,5],
    [10,6], [16,6], [24,6],
    [11,7], [15,7],
    [12,8], [13,8],
  ],
} as const satisfies PatternDefinition

export const rPentomino = {
  id: 'r-pentomino',
  cinematicName: 'The Immortal',
  conwayName: 'R-pentomino',
  description: 'Chaotic. Runs for 1,103 generations.',
  width: 3,
  height: 3,
  cells: [[1,0], [2,0], [0,1], [1,1], [1,2]],
} as const satisfies PatternDefinition

export const blinker = {
  id: 'blinker',
  cinematicName: 'The Pulse',
  conwayName: 'Blinker',
  description: 'Simplest oscillator.',
  width: 3,
  height: 1,
  cells: [[0,0], [1,0], [2,0]],
} as const satisfies PatternDefinition

export const beacon = {
  id: 'beacon',
  cinematicName: 'The Beacon',
  conwayName: 'Beacon',
  description: 'Two blocks interacting.',
  width: 4,
  height: 4,
  cells: [[0,0], [1,0], [0,1], [3,2], [2,3], [3,3]],
} as const satisfies PatternDefinition

export const pulsar = {
  id: 'pulsar',
  cinematicName: 'The Pinwheel',
  conwayName: 'Pulsar',
  description: 'Period-3 oscillator. Gorgeous.',
  width: 13,
  height: 13,
  cells: [
    [2,0], [3,0], [4,0], [8,0], [9,0], [10,0],
    [0,2], [5,2], [7,2], [12,2],
    [0,3], [5,3], [7,3], [12,3],
    [0,4], [5,4], [7,4], [12,4],
    [2,5], [3,5], [4,5], [8,5], [9,5], [10,5],
    [2,7], [3,7], [4,7], [8,7], [9,7], [10,7],
    [0,8], [5,8], [7,8], [12,8],
    [0,9], [5,9], [7,9], [12,9],
    [0,10], [5,10], [7,10], [12,10],
    [2,12], [3,12], [4,12], [8,12], [9,12], [10,12],
  ],
} as const satisfies PatternDefinition

export const lwss = {
  id: 'lwss',
  cinematicName: 'The Stampede',
  conwayName: 'LWSS',
  description: 'Lightweight spaceship.',
  width: 5,
  height: 4,
  cells: [[0,0], [3,0], [4,1], [0,2], [4,2], [1,3], [2,3], [3,3], [4,3]],
} as const satisfies PatternDefinition

export const acorn = {
  id: 'acorn',
  cinematicName: 'The Architect',
  conwayName: 'Acorn',
  description: 'Tiny seed. 5,206 generations of growth.',
  width: 7,
  height: 3,
  cells: [[1,0], [3,1], [0,2], [1,2], [4,2], [5,2], [6,2]],
} as const satisfies PatternDefinition

export const empty = {
  id: 'empty',
  cinematicName: 'The Void',
  conwayName: 'Empty',
  description: 'Blank canvas — start from scratch.',
  width: 0,
  height: 0,
  cells: [],
} as const satisfies PatternDefinition

export const PATTERNS: readonly PatternDefinition[] = [
  glider,
  gosperGliderGun,
  rPentomino,
  blinker,
  beacon,
  pulsar,
  lwss,
  acorn,
  empty,
]
