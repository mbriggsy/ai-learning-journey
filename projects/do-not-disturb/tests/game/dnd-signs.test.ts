import { describe, it, expect, vi } from 'vitest';
import { placeDndSign } from '../../src/game/tools/dnd-signs';
import { createDoorSystem } from '../../src/game/doors';
import { createEmitter } from '../../src/game/events';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const doorSystem = createDoorSystem(emitter);
  const zoneMap = new Map<string, readonly [string, string]>();
  zoneMap.set('door-1', ['room-a', 'room-b']);
  zoneMap.set('door-2', ['room-b', 'room-c']);
  doorSystem.init(
    [
      { id: 'door-1', position: { x: 100, y: 50 }, connectsTo: 'room-b', initialState: 'closed' },
      { id: 'door-2', position: { x: 200, y: 50 }, connectsTo: 'room-c', initialState: 'closed' },
    ],
    'room-a',
    zoneMap,
  );
  return { emitter, doorSystem };
}

describe('placeDndSign', () => {
  it('places sign on door', () => {
    const { emitter, doorSystem } = makeSetup();
    const result = placeDndSign('door-1', 3, doorSystem, emitter);
    expect(result.used).toBe(true);
    expect(doorSystem.hasSign('door-1')).toBe(true);
  });

  it('does not place when sign count is 0', () => {
    const { emitter, doorSystem } = makeSetup();
    const result = placeDndSign('door-1', 0, doorSystem, emitter);
    expect(result.used).toBe(false);
    expect(doorSystem.hasSign('door-1')).toBe(false);
  });

  it('does not place duplicate sign', () => {
    const { emitter, doorSystem } = makeSetup();
    placeDndSign('door-1', 3, doorSystem, emitter);
    const result = placeDndSign('door-1', 2, doorSystem, emitter);
    expect(result.used).toBe(false);
  });

  it('emits TOOL_USED event', () => {
    const { emitter, doorSystem } = makeSetup();
    const fn = vi.fn();
    emitter.on('TOOL_USED', fn);
    placeDndSign('door-1', 3, doorSystem, emitter);
    expect(fn).toHaveBeenCalledWith('dndSign', { x: 100, y: 50 });
  });

  it('clearSigns removes all signs', () => {
    const { emitter, doorSystem } = makeSetup();
    placeDndSign('door-1', 3, doorSystem, emitter);
    placeDndSign('door-2', 2, doorSystem, emitter);
    expect(doorSystem.hasSign('door-1')).toBe(true);
    expect(doorSystem.hasSign('door-2')).toBe(true);

    doorSystem.clearSigns();
    expect(doorSystem.hasSign('door-1')).toBe(false);
    expect(doorSystem.hasSign('door-2')).toBe(false);
  });
});
