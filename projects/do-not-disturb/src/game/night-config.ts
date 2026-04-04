import type { Position } from '../types/state';
import { ESCAPE, INVENTORY } from '../constants';

export type NightConfig = {
  readonly night: number;
  readonly monsters: readonly string[];
  readonly escapeWindowDurationS: number;
  readonly itemSpawns: {
    readonly throwables: number;
    readonly dndSigns: number;
    readonly lighterCharges: number;
  };
  readonly guestAmbushSpots: readonly Position[];
};

export const NIGHT_CONFIGS: readonly NightConfig[] = [
  // Night 1: Bellhop only — learn sound
  {
    night: 1,
    monsters: ['bellhop'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_1_S,
    itemSpawns: {
      throwables: 8,
      dndSigns: 0,
      lighterCharges: 0,
    },
    guestAmbushSpots: [],
  },
  // Night 2: + Housekeeper — learn patrols
  {
    night: 2,
    monsters: ['bellhop', 'housekeeper'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_2_S,
    itemSpawns: {
      throwables: 8,
      dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT,
      lighterCharges: 0,
    },
    guestAmbushSpots: [],
  },
  // Night 3: + Guest — full roster, three-axis threat
  {
    night: 3,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_3_S,
    itemSpawns: {
      throwables: 8,
      dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT,
      lighterCharges: INVENTORY.LIGHTER_CHARGES_PER_NIGHT,
    },
    guestAmbushSpots: [
      // Floor 3 — dark corners and chairs
      { x: 320, y: 160 },
      { x: 640, y: 160 },
      // Floor 2 — near closets and bathtubs
      { x: 192, y: 320 },
      { x: 512, y: 320 },
      // Lobby — behind furniture
      { x: 128, y: 480 },
      // Basement — most spots (near pitch black)
      { x: 96, y: 640 },
      { x: 384, y: 640 },
      { x: 576, y: 640 },
    ],
  },
] as const;

export function getNightConfig(night: number): NightConfig {
  const config = NIGHT_CONFIGS[night - 1];
  if (!config) {
    throw new Error(`No config for night ${night}. Valid: 1-${NIGHT_CONFIGS.length}`);
  }
  return config;
}
