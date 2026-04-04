import { describe, it, expect, vi } from 'vitest';
import { updateMonsters } from '../../src/game/ai/monster-manager';
import type { ManagedMonster } from '../../src/game/ai/monster-manager';

function makeMockMonster(id: string, active: boolean): ManagedMonster {
  return {
    id,
    active,
    fsm: {
      currentState: { onEnter: () => {}, onUpdate: () => {}, onExit: () => {} },
      transition: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('updateMonsters', () => {
  it('updates all active monsters', () => {
    const m1 = makeMockMonster('bellhop', true);
    const m2 = makeMockMonster('housekeeper', true);
    updateMonsters([m1, m2], 0.016);
    expect(m1.fsm.update).toHaveBeenCalledWith(0.016);
    expect(m2.fsm.update).toHaveBeenCalledWith(0.016);
  });

  it('skips inactive monsters', () => {
    const m1 = makeMockMonster('bellhop', true);
    const m2 = makeMockMonster('guest', false);
    updateMonsters([m1, m2], 0.016);
    expect(m1.fsm.update).toHaveBeenCalledWith(0.016);
    expect(m2.fsm.update).not.toHaveBeenCalled();
  });

  it('handles empty list', () => {
    expect(() => updateMonsters([], 0.016)).not.toThrow();
  });

  it('monsters are independent (no shared state)', () => {
    const m1 = makeMockMonster('bellhop', true);
    const m2 = makeMockMonster('housekeeper', true);
    updateMonsters([m1, m2], 0.016);
    // Each gets its own update call — no shared state
    expect(m1.fsm.update).toHaveBeenCalledTimes(1);
    expect(m2.fsm.update).toHaveBeenCalledTimes(1);
  });
});
