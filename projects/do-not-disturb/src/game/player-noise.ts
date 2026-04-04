import type { MovementMode, SurfaceType } from '../types/state';
import { NOISE } from '../constants';

const BASE_LEVELS: Record<MovementMode, number> = {
  idle: 0,
  walk: NOISE.WALK_LEVEL,
  run: NOISE.RUN_LEVEL,
  sneak: NOISE.SNEAK_LEVEL,
  jump: 0,
  slide: NOISE.SLIDE_LEVEL,
};

const SURFACE_MULTIPLIERS: Record<SurfaceType, number> = {
  carpet: NOISE.CARPET_MULT,
  wood: NOISE.WOOD_MULT,
  tile: NOISE.TILE_MULT,
};

export function computeNoise(mode: MovementMode, surfaceType: SurfaceType): number {
  return BASE_LEVELS[mode] * SURFACE_MULTIPLIERS[surfaceType];
}

export function computeLandingNoise(surfaceType: SurfaceType): number {
  return NOISE.JUMP_LAND_LEVEL * SURFACE_MULTIPLIERS[surfaceType];
}
