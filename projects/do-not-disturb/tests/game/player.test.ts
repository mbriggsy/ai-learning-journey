import { describe, it, expect } from 'vitest';
import { resolveMovementMode, computeVelocity } from '../../src/game/player';
import type { PlayerInput } from '../../src/game/player';
import { MOVEMENT } from '../../src/constants';

const NO_INPUT: PlayerInput = {
  direction: 0,
  shift: false,
  ctrl: false,
  jump: false,
  slide: false,
  interact: false,
};

function input(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return { ...NO_INPUT, ...overrides };
}

describe('resolveMovementMode', () => {
  it('idle when no direction pressed', () => {
    expect(resolveMovementMode(input(), true, 'idle', 0)).toBe('idle');
  });

  it('walk when direction pressed', () => {
    expect(resolveMovementMode(input({ direction: 1 }), true, 'idle', 0)).toBe('walk');
  });

  it('walk left when direction is -1', () => {
    expect(resolveMovementMode(input({ direction: -1 }), true, 'idle', 0)).toBe('walk');
  });

  it('run when shift + direction', () => {
    expect(resolveMovementMode(input({ direction: 1, shift: true }), true, 'idle', 0)).toBe('run');
  });

  it('sneak when ctrl + direction', () => {
    expect(resolveMovementMode(input({ direction: 1, ctrl: true }), true, 'idle', 0)).toBe('sneak');
  });

  it('jump when space pressed on ground', () => {
    expect(resolveMovementMode(input({ jump: true }), true, 'idle', 0)).toBe('jump');
  });

  it('stays in jump while airborne', () => {
    expect(resolveMovementMode(input({ direction: 1 }), false, 'jump', 0)).toBe('jump');
  });

  it('slide only from run', () => {
    expect(resolveMovementMode(input({ slide: true }), true, 'run', 0)).toBe('slide');
  });

  it('slide does NOT activate from walk', () => {
    expect(resolveMovementMode(input({ slide: true, direction: 1 }), true, 'walk', 0)).toBe('walk');
  });

  it('slide maintains while timer < duration', () => {
    expect(resolveMovementMode(input(), true, 'slide', 0.3)).toBe('slide');
  });

  it('slide expires after duration', () => {
    expect(resolveMovementMode(input(), true, 'slide', MOVEMENT.SLIDE_DURATION_S)).toBe('idle');
  });

  it('shift takes priority over ctrl (run > sneak)', () => {
    expect(resolveMovementMode(input({ direction: 1, shift: true, ctrl: true }), true, 'idle', 0)).toBe('run');
  });
});

describe('computeVelocity', () => {
  it('idle returns zero horizontal velocity', () => {
    expect(computeVelocity('idle', 0)).toEqual({ x: 0, y: 0 });
  });

  it('walk right returns walk speed', () => {
    expect(computeVelocity('walk', 1)).toEqual({ x: MOVEMENT.WALK_SPEED, y: 0 });
  });

  it('walk left returns negative walk speed', () => {
    expect(computeVelocity('walk', -1)).toEqual({ x: -MOVEMENT.WALK_SPEED, y: 0 });
  });

  it('run returns run speed', () => {
    expect(computeVelocity('run', 1)).toEqual({ x: MOVEMENT.RUN_SPEED, y: 0 });
  });

  it('sneak returns sneak speed', () => {
    expect(computeVelocity('sneak', 1)).toEqual({ x: MOVEMENT.SNEAK_SPEED, y: 0 });
  });

  it('slide returns slide speed', () => {
    expect(computeVelocity('slide', 1)).toEqual({ x: MOVEMENT.SLIDE_SPEED, y: 0 });
  });

  it('jump maintains horizontal velocity at walk speed', () => {
    expect(computeVelocity('jump', 1)).toEqual({ x: MOVEMENT.WALK_SPEED, y: 0 });
  });
});
