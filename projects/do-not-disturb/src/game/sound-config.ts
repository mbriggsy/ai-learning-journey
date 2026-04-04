import type { SurfaceType, MovementMode } from '../types/state';
import { AUDIO } from '../constants';

export type FootstepConfig = {
  readonly soundKey: string;
  readonly intervalS: number;
};

const SURFACE_SOUNDS: Record<SurfaceType, string> = {
  carpet: 'footstep-carpet',
  wood: 'footstep-wood',
  tile: 'footstep-tile',
};

const MODE_INTERVALS: Partial<Record<MovementMode, number>> = {
  run: AUDIO.FOOTSTEP_INTERVAL_RUN_S,
  walk: AUDIO.FOOTSTEP_INTERVAL_WALK_S,
  sneak: AUDIO.FOOTSTEP_INTERVAL_SNEAK_S,
};

export function getFootstepConfig(
  surface: SurfaceType,
  mode: MovementMode,
): FootstepConfig | null {
  const interval = MODE_INTERVALS[mode];
  if (interval === undefined) return null; // idle, jump, slide don't have footsteps
  return {
    soundKey: SURFACE_SOUNDS[surface],
    intervalS: interval,
  };
}

export type MonsterSoundSet = {
  readonly ambient: string | null; // continuous loop
  readonly alert: string | null;   // played on alert state
  readonly close: string | null;   // played when very near
};

export const MONSTER_SOUNDS: Record<string, MonsterSoundSet> = {
  bellhop: {
    ambient: 'bellhop-hum',
    alert: 'bellhop-bell',
    close: 'bellhop-lantern',
  },
  housekeeper: {
    ambient: 'housekeeper-wheels',
    alert: null,
    close: 'housekeeper-mop',
  },
  guest: {
    ambient: null, // silence IS the tell
    alert: 'guest-rustle',
    close: null,
  },
};

export function getMonsterSounds(monsterId: string): MonsterSoundSet | null {
  return MONSTER_SOUNDS[monsterId] ?? null;
}
