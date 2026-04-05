import { describe, it, expect, vi } from 'vitest';
import { createElevator } from '../../src/game/elevator';
import { createEmitter } from '../../src/game/events';
import type { GameEventMap } from '../../src/types/events';
import type { ElevatorConfig } from '../../src/types/level';
import { NOISE } from '../../src/constants';

function makeConfig(): ElevatorConfig {
  return {
    stops: [
      { floor: 'lobby', position: { x: 50, y: 50 } },
      { floor: 'floor2', position: { x: 50, y: -150 } },
      { floor: 'floor3', position: { x: 50, y: -350 } },
    ],
    travelTimePerFloorS: 3,
  };
}

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const config = makeConfig();
  const elevator = createElevator(emitter, config);
  return { emitter, elevator };
}

describe('createElevator', () => {
  it('starts at first stop', () => {
    const { elevator } = makeSetup();
    expect(elevator.currentFloor).toBe('lobby');
    expect(elevator.isMoving).toBe(false);
  });

  it('calling to current floor is a no-op', () => {
    const { emitter, elevator } = makeSetup();
    const fn = vi.fn();
    emitter.on('ELEVATOR_CALLED', fn);
    elevator.call('lobby');
    expect(fn).not.toHaveBeenCalled();
    expect(elevator.isMoving).toBe(false);
  });

  it('calling to another floor starts movement', () => {
    const { elevator } = makeSetup();
    elevator.call('floor2');
    expect(elevator.isMoving).toBe(true);
  });

  it('arrives after travel time', () => {
    const { elevator } = makeSetup();
    elevator.call('floor2');
    // 1 floor * 3s/floor = 3s travel time
    elevator.update(2.9);
    expect(elevator.isMoving).toBe(true);
    elevator.update(0.2); // now past 3s
    expect(elevator.isMoving).toBe(false);
    expect(elevator.currentFloor).toBe('floor2');
  });

  it('emits ELEVATOR_ARRIVED on arrival', () => {
    const { emitter, elevator } = makeSetup();
    const fn = vi.fn();
    emitter.on('ELEVATOR_ARRIVED', fn);

    elevator.call('floor2');
    elevator.update(4);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('emits NOISE_EMITTED (DING) on arrival', () => {
    const { emitter, elevator } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);

    elevator.call('floor2');
    elevator.update(4);
    expect(fn).toHaveBeenCalledWith({
      sourceZoneId: 'elevator-floor2',
      level: NOISE.ELEVATOR_DING_LEVEL,
      position: { x: 50, y: -150 },
    });
  });

  it('2-floor travel takes 2x time', () => {
    const { elevator } = makeSetup();
    elevator.call('floor3');
    // 2 floors * 3s = 6s
    elevator.update(5.9);
    expect(elevator.isMoving).toBe(true);
    elevator.update(0.2);
    expect(elevator.isMoving).toBe(false);
    expect(elevator.currentFloor).toBe('floor3');
  });

  it('decoy: call without riding works', () => {
    const { emitter, elevator } = makeSetup();
    const dingFn = vi.fn();
    emitter.on('NOISE_EMITTED', dingFn);

    // Player calls elevator to floor2 but doesn't ride
    elevator.call('floor2');
    elevator.update(4);

    // DING fires at floor2 — Bellhop investigates
    expect(dingFn).toHaveBeenCalled();
    expect(elevator.currentFloor).toBe('floor2');
  });

  it('no update when not moving', () => {
    const { emitter, elevator } = makeSetup();
    const fn = vi.fn();
    emitter.on('ELEVATOR_ARRIVED', fn);
    elevator.update(10);
    expect(fn).not.toHaveBeenCalled();
  });
});
