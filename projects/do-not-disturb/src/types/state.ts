import type { Mutable } from './utility';

// --- Top-level state: discriminated union on phase ---

export type GameState = MenuState | PlayingState | CaughtState | EndingState;

export type MenuState = {
  readonly phase: 'menu';
  readonly highestNight: number;
};

export type PlayingState = {
  readonly phase: 'playing';
  readonly night: NightState;
  readonly player: PlayerState;
  readonly monsters: readonly MonsterState[];
  readonly world: WorldState;
  readonly inventory: InventoryState;
  readonly clock: ClockState;
};

export type CaughtState = {
  readonly phase: 'caught';
  readonly night: number;
  readonly caughtBy: string;
};

export type EndingState = {
  readonly phase: 'ending';
  readonly night: 5;
};

// --- World state ---

export type WorldState = {
  readonly zones: ReadonlyMap<ZoneId, ZoneInfo>;
  readonly doors: readonly DoorState[];
  readonly hidingSpots: readonly HidingSpotState[];
  readonly navGraph: NavGraph;
  readonly elevatorFloor: string;
  readonly elevatorMoving: boolean;
};

export type ZoneInfo = {
  readonly id: ZoneId;
  readonly floor: number;
  readonly surfaceType: SurfaceType;
  readonly ambientLight: number; // 0-1
};

export type DoorState = {
  readonly id: string;
  readonly isOpen: boolean;
  readonly position: Position;
  readonly connectsZones: readonly [ZoneId, ZoneId];
};

export type HidingSpotState = {
  readonly id: string;
  readonly type: HidingSpotType;
  readonly position: Position;
  readonly zoneId: ZoneId;
};

export type HidingSpotType = 'bed' | 'closet' | 'furniture' | 'vent' | 'freezer';

export type SurfaceType = 'carpet' | 'wood' | 'tile';

// --- Sub-states ---

export type NightState = {
  readonly number: number; // 1-5
  readonly escapeWindow: EscapeWindowPhase;
};

export type PlayerState = {
  readonly position: Position;
  readonly velocity: Velocity;
  readonly movementMode: MovementMode;
  readonly facing: 'left' | 'right';
  readonly hiding: HidingState | null;
  readonly noiseLevel: number;
  readonly selectedTool: ToolType | null;
  readonly lighterActive: boolean;
};

export type MonsterState = {
  readonly id: string; // 'bellhop' | 'housekeeper' | 'guest'
  readonly position: Position;
  readonly fsmState: string;
  readonly active: boolean;
};

export type InventoryState = {
  readonly throwables: number;
  readonly dndSigns: number;
  readonly lighterFuel: number; // seconds remaining on current charge
  readonly lighterCharges: number; // unused charges in reserve
};

export type ClockState = {
  readonly elapsedS: number;
  readonly escapeWindowAtS: number;
  readonly escapeWindowDurationS: number;
};

// --- Primitives ---

export type Position = { readonly x: number; readonly y: number };
export type Velocity = { readonly x: number; readonly y: number };
export type MovementMode = 'idle' | 'walk' | 'run' | 'sneak' | 'jump' | 'slide';
export type EscapeWindowPhase = 'waiting' | 'warning' | 'open' | 'closed';
export type ToolType = 'throwable' | 'dndSign' | 'lighter';
export type HidingState = { readonly spotId: string; readonly spotType: string; readonly breathRemaining: number; readonly breathRhythmWindow: boolean };
export type ZoneId = string;

export type CollisionResult = {
  readonly onGround: boolean;
  readonly hitWall: boolean;
  readonly hitCeiling: boolean;
};

// --- Navigation graph ---

export type NavNode = {
  readonly id: string;
  readonly position: Position;
  readonly floor: number;
  readonly type: 'waypoint' | 'stair-top' | 'stair-bottom' | 'elevator-stop' | 'door';
};

export type NavEdge = {
  readonly from: string;
  readonly to: string;
  readonly cost: number;
};

export type NavGraph = {
  readonly nodes: ReadonlyMap<string, NavNode>;
  readonly edges: ReadonlyMap<string, readonly NavEdge[]>;
};

// --- Mutable aliases (engine internals) ---

export type MutablePlayingState = Mutable<PlayingState>;
