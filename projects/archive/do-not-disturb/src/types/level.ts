import type { SurfaceType, Position, ZoneId, ToolType } from './state';

export type LevelConfig = {
  readonly floors: readonly FloorConfig[];
  readonly connections: readonly FloorConnection[];
  readonly elevator: ElevatorConfig;
};

export type FloorConfig = {
  readonly id: string;
  readonly number: number;
  readonly rooms: readonly RoomConfig[];
};

export type RoomConfig = {
  readonly id: ZoneId;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly surfaceType: SurfaceType;
  readonly ambientLight: number;
  readonly doors: readonly DoorConfig[];
  readonly hidingSpots: readonly HidingSpotConfig[];
  readonly items: readonly ItemSpawnConfig[];
};

export type DoorConfig = {
  readonly id: string;
  readonly position: Position;
  readonly connectsTo: ZoneId;
  readonly initialState: 'open' | 'closed';
};

export type HidingSpotConfig = {
  readonly id: string;
  readonly position: Position;
  readonly type: HidingSpotType;
};

export type HidingSpotType = 'bed' | 'closet' | 'furniture' | 'vent' | 'freezer';

export type ItemSpawnConfig = {
  readonly position: Position;
  readonly type: ToolType;
};

export type FloorConnection = {
  readonly type: 'stairs' | 'laundry-chute';
  readonly fromFloor: string;
  readonly toFloor: string;
  readonly fromPosition: Position;
  readonly toPosition: Position;
  readonly bidirectional: boolean;
};

export type ElevatorConfig = {
  readonly stops: readonly ElevatorStop[];
  readonly travelTimePerFloorS: number;
};

export type ElevatorStop = {
  readonly floor: string;
  readonly position: Position;
};
