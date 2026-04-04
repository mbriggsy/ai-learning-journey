import { describe, it, expect, vi } from 'vitest';
import { createDoorSystem } from '../../src/game/doors';
import { createEmitter } from '../../src/game/events';
import type { GameEventMap } from '../../src/types/events';
import { NOISE } from '../../src/constants';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const doors = createDoorSystem(emitter);
  const zoneMap = new Map<string, readonly [string, string]>();
  zoneMap.set('door-1', ['room-a', 'room-b']);
  zoneMap.set('door-2', ['room-b', 'room-c']);

  doors.init(
    [
      { id: 'door-1', position: { x: 100, y: 50 }, connectsTo: 'room-b', initialState: 'closed' },
      { id: 'door-2', position: { x: 200, y: 50 }, connectsTo: 'room-c', initialState: 'open' },
    ],
    'room-a',
    zoneMap,
  );

  return { emitter, doors };
}

describe('createDoorSystem', () => {
  it('initializes doors with correct state', () => {
    const { doors } = makeSetup();
    expect(doors.isOpen('door-1')).toBe(false);
    expect(doors.isOpen('door-2')).toBe(true);
  });

  it('toggle flips door state', () => {
    const { doors } = makeSetup();
    doors.toggle('door-1');
    expect(doors.isOpen('door-1')).toBe(true);
    doors.toggle('door-1');
    expect(doors.isOpen('door-1')).toBe(false);
  });

  it('toggle emits DOOR_TOGGLED event', () => {
    const { emitter, doors } = makeSetup();
    const fn = vi.fn();
    emitter.on('DOOR_TOGGLED', fn);

    doors.toggle('door-1');
    expect(fn).toHaveBeenCalledWith({
      doorId: 'door-1',
      isOpen: true,
      position: { x: 100, y: 50 },
    });
  });

  it('toggle emits NOISE_EMITTED for door creak', () => {
    const { emitter, doors } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);

    doors.toggle('door-1');
    expect(fn).toHaveBeenCalledWith({
      sourceZoneId: 'room-a',
      level: NOISE.DOOR_LEVEL,
      position: { x: 100, y: 50 },
    });
  });

  it('toggle nonexistent door is a no-op', () => {
    const { emitter, doors } = makeSetup();
    const fn = vi.fn();
    emitter.on('DOOR_TOGGLED', fn);
    doors.toggle('nonexistent');
    expect(fn).not.toHaveBeenCalled();
  });

  it('isOpen returns false for unknown door', () => {
    const { doors } = makeSetup();
    expect(doors.isOpen('nonexistent')).toBe(false);
  });
});
