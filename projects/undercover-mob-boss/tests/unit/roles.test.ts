import { describe, it, expect } from 'vitest';
import { distributeRoles, getMembership, populateKnownAllies } from '../../src/server/game/roles';
import { mulberry32 } from '../../src/server/game/rng';
import type { Player } from '../../src/shared/types';

describe('distributeRoles', () => {
  it.each([
    { playerCount: 5, expectedCitizens: 3, expectedSoldiers: 1 },
    { playerCount: 6, expectedCitizens: 4, expectedSoldiers: 1 },
    { playerCount: 7, expectedCitizens: 4, expectedSoldiers: 2 },
    { playerCount: 8, expectedCitizens: 5, expectedSoldiers: 2 },
    { playerCount: 9, expectedCitizens: 5, expectedSoldiers: 3 },
    { playerCount: 10, expectedCitizens: 6, expectedSoldiers: 3 },
  ])(
    '$playerCount players → $expectedCitizens citizens, $expectedSoldiers soldiers, 1 boss',
    ({ playerCount, expectedCitizens, expectedSoldiers }) => {
      const rng = mulberry32(123);
      const roles = distributeRoles(playerCount, rng);

      expect(roles).toHaveLength(playerCount);
      expect(roles.filter((r) => r === 'citizen')).toHaveLength(expectedCitizens);
      expect(roles.filter((r) => r === 'mob-soldier')).toHaveLength(expectedSoldiers);
      expect(roles.filter((r) => r === 'mob-boss')).toHaveLength(1);
    },
  );

  it('throws for invalid player count', () => {
    expect(() => distributeRoles(4)).toThrow('Invalid player count');
    expect(() => distributeRoles(11)).toThrow('Invalid player count');
  });

  it('produces deterministic output with seeded RNG', () => {
    const run1 = distributeRoles(7, mulberry32(999));
    const run2 = distributeRoles(7, mulberry32(999));
    expect(run1).toEqual(run2);
  });
});

describe('getMembership', () => {
  it.each([
    { role: 'citizen' as const, expected: 'citizen' },
    { role: 'mob-soldier' as const, expected: 'mob' },
    { role: 'mob-boss' as const, expected: 'mob' },
  ])('$role → $expected', ({ role, expected }) => {
    expect(getMembership(role)).toBe(expected);
  });
});

describe('populateKnownAllies', () => {
  function makePlayers(count: number): Player[] {
    const rng = mulberry32(42);
    const roles = distributeRoles(count, rng);
    return roles.map((role, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
      role,
      isAlive: true,
      isMayor: i === 0,
      isChief: false,
      wasLastMayor: false,
      wasLastChief: false,
      knownAllies: [],
    }));
  }

  it('5-player game: boss knows soldiers, soldiers know all mob', () => {
    const players = populateKnownAllies(makePlayers(5));
    const boss = players.find((p) => p.role === 'mob-boss')!;
    const soldiers = players.filter((p) => p.role === 'mob-soldier');
    const citizens = players.filter((p) => p.role === 'citizen');

    // Boss knows all soldiers
    expect(boss.knownAllies.sort()).toEqual(soldiers.map((s) => s.id).sort());
    // Each soldier knows boss + other soldiers
    for (const s of soldiers) {
      const expectedAllies = [boss.id, ...soldiers.filter((o) => o.id !== s.id).map((o) => o.id)];
      expect(s.knownAllies.sort()).toEqual(expectedAllies.sort());
    }
    // Citizens know nobody
    for (const c of citizens) {
      expect(c.knownAllies).toEqual([]);
    }
  });

  it('7-player game: boss does NOT know soldiers', () => {
    const players = populateKnownAllies(makePlayers(7));
    const boss = players.find((p) => p.role === 'mob-boss')!;
    const soldiers = players.filter((p) => p.role === 'mob-soldier');

    // Boss does NOT know soldiers in 7+ player game
    expect(boss.knownAllies).toEqual([]);
    // Soldiers still know boss + each other
    for (const s of soldiers) {
      expect(s.knownAllies).toContain(boss.id);
    }
  });

  it('10-player game: boss does NOT know soldiers', () => {
    const players = populateKnownAllies(makePlayers(10));
    const boss = players.find((p) => p.role === 'mob-boss')!;
    expect(boss.knownAllies).toEqual([]);
  });
});
