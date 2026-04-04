import type { SurfaceType, ZoneId } from '../../../src/types/state';
import type { NoiseZone } from '../../../src/game/noise';

export const TEST_ZONES: NoiseZone[] = [
  { id: 'room-1', floor: 1, adjacentZones: [{ targetZoneId: 'hallway', attenuation: 0.7 }] },
  { id: 'hallway', floor: 1, adjacentZones: [
    { targetZoneId: 'room-1', attenuation: 0.7 },
    { targetZoneId: 'room-2', attenuation: 0.7 },
  ]},
  { id: 'room-2', floor: 1, adjacentZones: [{ targetZoneId: 'hallway', attenuation: 0.7 }] },
];

export const TEST_SURFACES: Record<ZoneId, SurfaceType> = {
  'room-1': 'carpet',
  'hallway': 'wood',
  'room-2': 'tile',
};
