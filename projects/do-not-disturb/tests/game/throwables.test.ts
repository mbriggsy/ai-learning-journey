import { describe, it, expect, vi } from 'vitest';
import { throwItem } from '../../src/game/tools/throwables';
import { createEmitter } from '../../src/game/events';
import { NOISE, TOOLS } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const zoneAt = () => 'room-b';
  return { emitter, zoneAt };
}

describe('throwItem', () => {
  it('emits noise at impact position', () => {
    const { emitter, zoneAt } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);

    throwItem({ x: 100, y: 50 }, 1, emitter, 1, zoneAt);

    expect(fn).toHaveBeenCalledWith({
      sourceZoneId: 'room-b',
      level: NOISE.THROWABLE_IMPACT_LEVEL,
      position: { x: 100 + TOOLS.THROW_DISTANCE, y: 50 },
    });
  });

  it('emits TOOL_USED event', () => {
    const { emitter, zoneAt } = makeSetup();
    const fn = vi.fn();
    emitter.on('TOOL_USED', fn);

    throwItem({ x: 100, y: 50 }, 1, emitter, 1, zoneAt);
    expect(fn).toHaveBeenCalledWith('throwable', expect.objectContaining({ x: 300 }));
  });

  it('does not throw when count is 0', () => {
    const { emitter, zoneAt } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);

    const result = throwItem({ x: 100, y: 50 }, 1, emitter, 0, zoneAt);
    expect(result.used).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('throws left when direction is -1', () => {
    const { emitter, zoneAt } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);

    throwItem({ x: 300, y: 50 }, -1, emitter, 1, zoneAt);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({
      position: { x: 300 - TOOLS.THROW_DISTANCE, y: 50 },
    }));
  });
});
