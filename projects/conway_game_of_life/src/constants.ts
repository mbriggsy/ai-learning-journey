/** Number of generations a dead cell retains its ghost trail */
export const GHOST_DECAY_GENERATIONS = 3

/** Maximum grid dimension (width or height) */
export const MAX_GRID_DIMENSION = 4096

/** Default density for random grid fill */
export const DEFAULT_RANDOM_DENSITY = 0.3

/** Maximum cell age (Uint8 saturation) */
export const AGE_MAX = 255

/** Max-speed mode time budget per frame in ms (leaves ~4ms for renderer) */
export const MAX_SPEED_BUDGET_MS = 12

/** Max steps per frame cap to prevent runaway on tiny grids */
export const MAX_STEPS_PER_FRAME = 100
