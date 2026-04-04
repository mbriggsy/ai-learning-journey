import type { Position } from '../types/state';
import type { PhoneScript } from './phone-scripts';
import { ESCAPE, INVENTORY } from '../constants';
import { PHONE_SCRIPTS } from './phone-scripts';

export type LevelVariant = 'standard' | 'shuffled';

export type NightConfig = {
  readonly night: number;
  readonly monsters: readonly string[];
  readonly escapeWindowDurationS: number;
  readonly speedMultiplier: number;
  readonly levelVariant: LevelVariant;
  readonly itemSpawns: {
    readonly throwables: number;
    readonly dndSigns: number;
    readonly lighterCharges: number;
  };
  readonly guestAmbushSpots: readonly Position[];
  readonly phoneContent: PhoneScript;
};

// Shared ambush spots for nights 3-5 (positions are level-dependent placeholders)
const GUEST_AMBUSH_SPOTS: readonly Position[] = [
  { x: 320, y: 160 }, { x: 640, y: 160 },     // Floor 3
  { x: 192, y: 320 }, { x: 512, y: 320 },     // Floor 2
  { x: 128, y: 480 },                           // Lobby
  { x: 96, y: 640 }, { x: 384, y: 640 }, { x: 576, y: 640 }, // Basement
];

export const NIGHT_CONFIGS: readonly NightConfig[] = [
  {
    night: 1,
    monsters: ['bellhop'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_1_S,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: 0, lighterCharges: 0 },
    guestAmbushSpots: [],
    phoneContent: PHONE_SCRIPTS.NIGHT_1,
  },
  {
    night: 2,
    monsters: ['bellhop', 'housekeeper'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_2_S,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT, lighterCharges: 0 },
    guestAmbushSpots: [],
    phoneContent: PHONE_SCRIPTS.NIGHT_2,
  },
  {
    night: 3,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_3_S,
    speedMultiplier: 1.0,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT, lighterCharges: INVENTORY.LIGHTER_CHARGES_PER_NIGHT },
    guestAmbushSpots: GUEST_AMBUSH_SPOTS,
    phoneContent: PHONE_SCRIPTS.NIGHT_3,
  },
  {
    night: 4,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_4_S,
    speedMultiplier: 1.25,
    levelVariant: 'standard',
    itemSpawns: { throwables: 8, dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT, lighterCharges: 3 },
    guestAmbushSpots: GUEST_AMBUSH_SPOTS,
    phoneContent: PHONE_SCRIPTS.NIGHT_4,
  },
  {
    night: 5,
    monsters: ['bellhop', 'housekeeper', 'guest'],
    escapeWindowDurationS: ESCAPE.WINDOW_DURATION_NIGHT_5_S,
    speedMultiplier: 1.25,
    levelVariant: 'shuffled',
    itemSpawns: { throwables: 8, dndSigns: INVENTORY.DND_SIGNS_PER_NIGHT, lighterCharges: 3 },
    guestAmbushSpots: GUEST_AMBUSH_SPOTS,
    phoneContent: PHONE_SCRIPTS.NIGHT_5,
  },
];

export function getNightConfig(night: number): NightConfig {
  const config = NIGHT_CONFIGS[night - 1];
  if (!config) {
    throw new Error(`No config for night ${night}. Valid: 1-${NIGHT_CONFIGS.length}`);
  }
  return config;
}
