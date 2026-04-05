import type { EscapeWindowPhase, ToolType, ZoneId, Position } from './state';

// --- Event payload types ---

export type NoiseEvent = {
  readonly sourceZoneId: ZoneId;
  readonly level: number; // 0-1 normalized
  readonly position: Position;
};

export type DoorEvent = {
  readonly doorId: string;
  readonly isOpen: boolean;
  readonly position: Position;
};

export type MonsterAlertEvent = {
  readonly monsterId: string;
  readonly position: Position;
};

// --- Event map ---

export type GameEventMap = {
  // Noise
  readonly NOISE_EMITTED: readonly [event: NoiseEvent];

  // World interactions
  readonly DOOR_TOGGLED: readonly [event: DoorEvent];
  readonly ELEVATOR_CALLED: readonly [floor: number];
  readonly ELEVATOR_ARRIVED: readonly [floor: number];
  readonly HIDING_ENTERED: readonly [spotId: string];
  readonly HIDING_EXITED: readonly [spotId: string];
  readonly ZONE_ENTER: readonly [zoneId: ZoneId, previousZoneId: ZoneId | null];

  // Monster
  readonly MONSTER_ALERT: readonly [event: MonsterAlertEvent];
  readonly MONSTER_CATCH: readonly [monsterId: string];
  readonly MONSTER_SPOTTED: readonly [position: Position, monsterId: string];

  // Tools
  readonly TOOL_USED: readonly [toolType: ToolType, position: Position];
  readonly TOOL_PICKED_UP: readonly [toolType: ToolType];

  // Night / escape
  readonly NIGHT_START: readonly [night: number];
  readonly NIGHT_END: readonly [night: number, survived: boolean];
  readonly ESCAPE_WINDOW_WARNING: readonly [];
  readonly ESCAPE_WINDOW_OPEN: readonly [];
  readonly ESCAPE_WINDOW_CLOSED: readonly [];

  // Phone
  readonly PHONE_RING: readonly [];
  readonly PHONE_ANSWERED: readonly [];

  // Breath
  readonly BREATH_GASP: readonly [];

  // Lighter
  readonly LIGHTER_IGNITED: readonly [position: Position];
  readonly LIGHTER_EXTINGUISHED: readonly [];

  // Phone dialogue
  readonly PHONE_LINE_SHOWN: readonly [line: string, index: number];
  readonly PHONE_DIALOGUE_COMPLETE: readonly [];

  // Monologue
  readonly MONOLOGUE_SHOW: readonly [text: string];
  readonly MONOLOGUE_HIDE: readonly [];

  // Night lifecycle
  readonly NIGHT_TRANSITION_START: readonly [fromNight: number, toNight: number];
  readonly NIGHT_TRANSITION_END: readonly [night: number];
  readonly CATCH_SEQUENCE_START: readonly [monsterId: string];
  readonly CATCH_SEQUENCE_END: readonly [];
  readonly GAME_COMPLETE: readonly [];
};
