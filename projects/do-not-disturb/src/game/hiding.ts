import type { HidingSpotType } from '../types/level';

// Protection values: 1 = safe, 0 = found, 0.5 = 50% chance of being safe
export const HIDING_PROTECTION: Record<HidingSpotType, Record<string, number>> = {
  bed:       { bellhop: 1, housekeeper: 0, guest: 1 },
  closet:    { bellhop: 1, housekeeper: 0, guest: 1 },
  furniture: { bellhop: 0.5, housekeeper: 0.5, guest: 1 },
  vent:      { bellhop: 1, housekeeper: 1, guest: 1 },
  freezer:   { bellhop: 1, housekeeper: 1, guest: 1 },
};

export function isProtectedFrom(spotType: HidingSpotType, monsterId: string): number {
  return HIDING_PROTECTION[spotType][monsterId] ?? 0;
}
