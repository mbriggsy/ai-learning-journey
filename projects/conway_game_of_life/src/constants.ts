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

// --- Renderer constants ---

/** Background void black (from spec) */
export const BG_COLOR: readonly [number, number, number] = [0.02, 0.02, 0.03]

/** Cell colors — linear space RGB (from spec) */
export const YOUNG_COLOR: readonly [number, number, number] = [0.310, 0.765, 0.969]   // #4FC3F7
export const MATURE_COLOR: readonly [number, number, number] = [1.000, 0.702, 0.000]  // #FFB300
export const ANCIENT_COLOR: readonly [number, number, number] = [0.808, 0.576, 0.847] // #CE93D8

/** Ghost trail max opacity */
export const GHOST_MAX_OPACITY = 0.15

/** Grid line color */
export const GRID_LINE_COLOR: readonly [number, number, number] = [0.051, 0.106, 0.165] // #0D1B2A

/** Grid lines only visible when cells are this many pixels wide */
export const GRID_LINE_MIN_CELL_SIZE = 4

// --- Particle constants ---

export const MAX_PARTICLES = 4096
export const PARTICLE_STRIDE = 8 // x, y, vx, vy, life, r, g, b
export const PARTICLE_COUNT_MIN = 8
export const PARTICLE_COUNT_MAX = 12
export const PARTICLE_LIFETIME_S = 0.4
