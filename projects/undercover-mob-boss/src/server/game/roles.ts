import type { Role, Player } from '../../shared/types';
import { shuffle } from './policies';

/**
 * Distribution table — keyed by player count.
 * Each entry: { citizens, soldiers } (mob boss always 1).
 */
const ROLE_DISTRIBUTION: Record<number, { citizens: number; soldiers: number }> = {
  5: { citizens: 3, soldiers: 1 },
  6: { citizens: 4, soldiers: 1 },
  7: { citizens: 4, soldiers: 2 },
  8: { citizens: 5, soldiers: 2 },
  9: { citizens: 5, soldiers: 3 },
  10: { citizens: 6, soldiers: 3 },
};

/**
 * Returns a shuffled array of roles for the given player count.
 * Always exactly 1 mob-boss. Remaining split per distribution table.
 */
export function distributeRoles(
  playerCount: number,
  rng: () => number = Math.random,
): Role[] {
  const dist = ROLE_DISTRIBUTION[playerCount];
  if (!dist) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 5-10.`);
  }

  const roles: Role[] = [
    ...Array<Role>(dist.citizens).fill('citizen'),
    ...Array<Role>(dist.soldiers).fill('mob-soldier'),
    'mob-boss',
  ];

  return shuffle(roles, rng);
}

/**
 * Returns allegiance for investigation purposes.
 * Both mob-soldier and mob-boss return 'mob'.
 */
export function getMembership(role: Role): 'citizen' | 'mob' {
  return role === 'citizen' ? 'citizen' : 'mob';
}

/**
 * Sets `knownAllies` on each player based on role visibility rules:
 * - 5–6 players: mob soldiers know each other + mob boss; mob boss ALSO knows all soldiers
 * - 7–10 players: mob soldiers know each other + mob boss; mob boss does NOT know soldiers
 */
export function populateKnownAllies(players: readonly Player[]): Player[] {
  const playerCount = players.length;
  const mobBoss = players.find((p) => p.role === 'mob-boss')!;
  const mobSoldiers = players.filter((p) => p.role === 'mob-soldier');
  const allMobIds = [mobBoss.id, ...mobSoldiers.map((s) => s.id)];

  return players.map((p) => {
    if (p.role === 'citizen') {
      return { ...p, knownAllies: [] };
    }

    if (p.role === 'mob-soldier') {
      // Soldiers always know other mob members (boss + other soldiers)
      return { ...p, knownAllies: allMobIds.filter((id) => id !== p.id) };
    }

    // Mob boss
    if (playerCount <= 6) {
      // Small game: boss knows all soldiers
      return { ...p, knownAllies: mobSoldiers.map((s) => s.id) };
    }
    // Large game (7–10): boss does NOT know soldiers
    return { ...p, knownAllies: [] };
  });
}
