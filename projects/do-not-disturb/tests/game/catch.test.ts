import { describe, it, expect } from 'vitest';
import { checkCatch } from '../../src/game/catch';
import type { PlayerState, MonsterState } from '../../src/types/state';
import { MONSTER } from '../../src/constants';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 100, y: 50 },
    velocity: { x: 0, y: 0 },
    movementMode: 'idle',
    facing: 'right',
    hiding: null,
    noiseLevel: 0,
    ...overrides,
  };
}

function makeMonster(overrides: Partial<MonsterState> = {}): MonsterState {
  return {
    id: 'bellhop',
    position: { x: 100, y: 50 },
    fsmState: 'patrol',
    active: true,
    ...overrides,
  };
}

describe('checkCatch', () => {
  it('catches when monster is within radius', () => {
    const player = makePlayer();
    const monster = makeMonster({ position: { x: 100 + MONSTER.CATCH_RADIUS - 1, y: 50 } });
    expect(checkCatch(player, [monster], Math.random)).toBe('bellhop');
  });

  it('no catch when monster is outside radius', () => {
    const player = makePlayer();
    const monster = makeMonster({ position: { x: 100 + MONSTER.CATCH_RADIUS + 10, y: 50 } });
    expect(checkCatch(player, [monster], Math.random)).toBeNull();
  });

  it('inactive monster does not catch', () => {
    const player = makePlayer();
    const monster = makeMonster({ active: false });
    expect(checkCatch(player, [monster], Math.random)).toBeNull();
  });

  it('hiding in vent protects from bellhop (protection = 1)', () => {
    const player = makePlayer({ hiding: { spotId: 'vent', breathRemaining: 5 } });
    const monster = makeMonster();
    expect(checkCatch(player, [monster], Math.random)).toBeNull();
  });

  it('hiding in bed does NOT protect from housekeeper (protection = 0)', () => {
    const player = makePlayer({ hiding: { spotId: 'bed', breathRemaining: 5 } });
    const monster = makeMonster({ id: 'housekeeper' });
    expect(checkCatch(player, [monster], () => 0.99)).toBe('housekeeper');
  });

  it('hiding behind furniture is probabilistic (protection = 0.5)', () => {
    const player = makePlayer({ hiding: { spotId: 'furniture', breathRemaining: 5 } });
    const monster = makeMonster();

    // Random < 0.5 → escape
    expect(checkCatch(player, [monster], () => 0.3)).toBeNull();

    // Random >= 0.5 → caught
    expect(checkCatch(player, [monster], () => 0.7)).toBe('bellhop');
  });

  it('returns first catching monster', () => {
    const player = makePlayer();
    const monsters = [
      makeMonster({ id: 'bellhop', position: { x: 100, y: 50 } }),
      makeMonster({ id: 'housekeeper', position: { x: 100, y: 50 } }),
    ];
    expect(checkCatch(player, monsters, Math.random)).toBe('bellhop');
  });

  it('no monsters = no catch', () => {
    const player = makePlayer();
    expect(checkCatch(player, [], Math.random)).toBeNull();
  });
});
