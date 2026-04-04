import type { MovementMode, Velocity } from '../types/state';
import { MOVEMENT } from '../constants';

export type PlayerInput = {
  readonly direction: -1 | 0 | 1;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly jump: boolean;
  readonly slide: boolean;
  readonly interact: boolean;
};

const MODE_SPEEDS: Record<MovementMode, number> = {
  idle: 0,
  walk: MOVEMENT.WALK_SPEED,
  run: MOVEMENT.RUN_SPEED,
  sneak: MOVEMENT.SNEAK_SPEED,
  jump: MOVEMENT.WALK_SPEED,
  slide: MOVEMENT.SLIDE_SPEED,
};

export function resolveMovementMode(
  input: PlayerInput,
  onGround: boolean,
  currentMode: MovementMode,
  slideTimer: number,
): MovementMode {
  // Slide expires after duration
  if (currentMode === 'slide' && slideTimer >= MOVEMENT.SLIDE_DURATION_S) return 'idle';
  // Currently sliding — maintain until expired
  if (currentMode === 'slide') return 'slide';
  // Airborne — stay in jump until grounded
  if (!onGround) return 'jump';
  // Jump request while on ground
  if (input.jump && onGround) return 'jump';
  // Slide entry — only from run
  if (input.slide && currentMode === 'run') return 'slide';
  // No direction = idle
  if (input.direction === 0) return 'idle';
  // Modifiers
  if (input.shift) return 'run';
  if (input.ctrl) return 'sneak';
  return 'walk';
}

export function computeVelocity(mode: MovementMode, direction: number): Velocity {
  return { x: MODE_SPEEDS[mode] * direction, y: 0 };
}
