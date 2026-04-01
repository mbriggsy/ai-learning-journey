/**
 * Compile-time safe texture keys for all game assets.
 * The Preloader iterates these to load everything — adding a new asset means
 * adding it here. Forgetting = compile error or load-time error, never silent.
 */
export const TEXTURE_KEYS = {
  // Tilesets
  TILESET_INTERIOR: 'tileset-interior',
  FOG_TILE: 'fog-tile',

  // Character atlases
  CHARACTERS: 'characters',

  // UI atlas
  UI: 'ui',
} as const satisfies Record<string, string>;

export type TextureKey = (typeof TEXTURE_KEYS)[keyof typeof TEXTURE_KEYS];

/**
 * Audio keys — kept separate from texture keys but same pattern.
 * Not part of Phase 7 scope (audio loaded in Boot.ts already).
 */
export const AUDIO_KEYS = {
  FOOTSTEP_PLAYER_01: 'footstep_player_01',
  FOOTSTEP_PLAYER_02: 'footstep_player_02',
  FOOTSTEP_PLAYER_03: 'footstep_player_03',
  FOOTSTEP_SEEKER_01: 'footstep_seeker_01',
  FOOTSTEP_SEEKER_02: 'footstep_seeker_02',
  FOOTSTEP_SEEKER_03: 'footstep_seeker_03',
  DOOR_CREAK_01: 'door_creak_01',
  DOOR_CREAK_02: 'door_creak_02',
  DOOR_THUD: 'door_thud',
  COUNTDOWN_TICK: 'countdown_tick',
  STING_FOUND: 'sting_found',
  STING_SURVIVED: 'sting_survived',
  SONAR_PING: 'sonar_ping',
  HUNT_DRONE: 'hunt_drone',
  AMBIENT_DRONE: 'ambient_drone',
  CREAK_01: 'creak_01',
  CREAK_02: 'creak_02',
  CREAK_03: 'creak_03',
  HEARTBEAT: 'heartbeat',
} as const satisfies Record<string, string>;

export type AudioKey = (typeof AUDIO_KEYS)[keyof typeof AUDIO_KEYS];
