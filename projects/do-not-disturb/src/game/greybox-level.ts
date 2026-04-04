import type { LevelConfig, FloorConfig, RoomConfig, DoorConfig, HidingSpotConfig, FloorConnection, ElevatorConfig } from '../types/level';
import type { Position } from '../types/state';

// --- Layout constants ---

const LEVEL_WIDTH = 1920;
const FLOOR_HEIGHT = 240;
const ROOM_WIDTH = 480;
const ROOMS_PER_FLOOR = 4;

// Floor Y positions (top of floor band)
const FLOOR_Y = {
  attic: 0,
  floor3: 240,
  floor2: 480,
  lobby: 720,
  basement: 960,
} as const;

// Ground Y = bottom of floor band - small offset for feet
function groundY(floorId: keyof typeof FLOOR_Y): number {
  return FLOOR_Y[floorId] + FLOOR_HEIGHT - 48;
}

// Room center Y (for nav/spawn)
function roomCenterY(floorId: keyof typeof FLOOR_Y): number {
  return FLOOR_Y[floorId] + FLOOR_HEIGHT / 2;
}

// --- Exported spawn positions ---

export const PLAYER_SPAWN: Position = { x: 200, y: groundY('lobby') };

export const PHONE_POSITION: Position = { x: 120, y: groundY('lobby') };
export const PHONE_ZONE_ID = 'lobby-a';

export const ESCAPE_DOOR_POSITION: Position = { x: 360, y: groundY('lobby') };

// --- Room builders ---

function makeRoom(
  id: string,
  floorId: keyof typeof FLOOR_Y,
  roomIndex: number,
  surfaceType: 'carpet' | 'wood' | 'tile',
  ambientLight: number,
  doors: readonly DoorConfig[],
  hidingSpots: readonly HidingSpotConfig[],
): RoomConfig {
  return {
    id,
    bounds: {
      x: roomIndex * ROOM_WIDTH,
      y: FLOOR_Y[floorId],
      width: ROOM_WIDTH,
      height: FLOOR_HEIGHT,
    },
    surfaceType,
    ambientLight,
    doors: doors,
    hidingSpots: hidingSpots,
    items: [],
  };
}

function makeDoor(
  id: string,
  floorId: keyof typeof FLOOR_Y,
  x: number,
  connectsTo: string,
  initialState: 'open' | 'closed' = 'closed',
): DoorConfig {
  return { id, position: { x, y: groundY(floorId) }, connectsTo, initialState };
}

function makeSpot(
  id: string,
  type: 'bed' | 'closet' | 'furniture' | 'vent' | 'freezer',
  floorId: keyof typeof FLOOR_Y,
  x: number,
): HidingSpotConfig {
  return { id, type, position: { x, y: groundY(floorId) } };
}

// --- Floor definitions ---

function buildAttic(): FloorConfig {
  return {
    id: 'attic',
    number: 5,
    rooms: [
      makeRoom('attic-a', 'attic', 0, 'wood', 0.3, [
        makeDoor('attic-ab', 'attic', 460, 'attic-b'),
      ], [
        makeSpot('attic-vent-a', 'vent', 'attic', 100),
      ]),
      makeRoom('attic-b', 'attic', 1, 'wood', 0.3, [
        makeDoor('attic-ab', 'attic', 480, 'attic-a'),
        makeDoor('attic-bc', 'attic', 940, 'attic-c'),
      ], []),
      makeRoom('attic-c', 'attic', 2, 'wood', 0.25, [
        makeDoor('attic-bc', 'attic', 960, 'attic-b'),
        makeDoor('attic-cd', 'attic', 1420, 'attic-d'),
      ], [
        makeSpot('attic-furn-c', 'furniture', 'attic', 1200),
      ]),
      makeRoom('attic-d', 'attic', 3, 'wood', 0.3, [
        makeDoor('attic-cd', 'attic', 1440, 'attic-c'),
      ], []),
    ],
  };
}

function buildFloor3(): FloorConfig {
  return {
    id: 'floor3',
    number: 4,
    rooms: [
      makeRoom('floor3-a', 'floor3', 0, 'carpet', 0.25, [
        makeDoor('f3-ab', 'floor3', 460, 'floor3-b'),
      ], []),
      makeRoom('floor3-b', 'floor3', 1, 'carpet', 0.25, [
        makeDoor('f3-ab', 'floor3', 480, 'floor3-a'),
        makeDoor('f3-bc', 'floor3', 940, 'floor3-c'),
      ], [
        makeSpot('f3-bed-b', 'bed', 'floor3', 600),
      ]),
      makeRoom('floor3-c', 'floor3', 2, 'carpet', 0.25, [
        makeDoor('f3-bc', 'floor3', 960, 'floor3-b'),
        makeDoor('f3-cd', 'floor3', 1420, 'floor3-d'),
      ], [
        makeSpot('f3-closet-c', 'closet', 'floor3', 1100),
      ]),
      makeRoom('floor3-d', 'floor3', 3, 'carpet', 0.25, [
        makeDoor('f3-cd', 'floor3', 1440, 'floor3-c'),
      ], [
        makeSpot('f3-vent-d', 'vent', 'floor3', 1700),
      ]),
    ],
  };
}

function buildFloor2(): FloorConfig {
  return {
    id: 'floor2',
    number: 3,
    rooms: [
      makeRoom('floor2-a', 'floor2', 0, 'carpet', 0.25, [
        makeDoor('f2-ab', 'floor2', 460, 'floor2-b'),
      ], [
        makeSpot('f2-bed-a', 'bed', 'floor2', 200),
      ]),
      makeRoom('floor2-b', 'floor2', 1, 'carpet', 0.25, [
        makeDoor('f2-ab', 'floor2', 480, 'floor2-a'),
        makeDoor('f2-bc', 'floor2', 940, 'floor2-c'),
      ], [
        makeSpot('f2-closet-b', 'closet', 'floor2', 720),
      ]),
      makeRoom('floor2-c', 'floor2', 2, 'carpet', 0.25, [
        makeDoor('f2-bc', 'floor2', 960, 'floor2-b'),
        makeDoor('f2-cd', 'floor2', 1420, 'floor2-d'),
      ], []),
      makeRoom('floor2-d', 'floor2', 3, 'carpet', 0.25, [
        makeDoor('f2-cd', 'floor2', 1440, 'floor2-c'),
      ], [
        makeSpot('f2-furn-d', 'furniture', 'floor2', 1600),
      ]),
    ],
  };
}

function buildLobby(): FloorConfig {
  return {
    id: 'lobby',
    number: 2,
    rooms: [
      makeRoom('lobby-a', 'lobby', 0, 'tile', 0.5, [
        makeDoor('lobby-ab', 'lobby', 460, 'lobby-b'),
      ], [
        makeSpot('lobby-furn-a', 'furniture', 'lobby', 300),
      ]),
      makeRoom('lobby-b', 'lobby', 1, 'tile', 0.5, [
        makeDoor('lobby-ab', 'lobby', 480, 'lobby-a'),
        makeDoor('lobby-bc', 'lobby', 940, 'lobby-c'),
      ], []),
      makeRoom('lobby-c', 'lobby', 2, 'tile', 0.5, [
        makeDoor('lobby-bc', 'lobby', 960, 'lobby-b'),
        makeDoor('lobby-cd', 'lobby', 1420, 'lobby-d'),
      ], [
        makeSpot('lobby-furn-c', 'furniture', 'lobby', 1200),
      ]),
      makeRoom('lobby-d', 'lobby', 3, 'tile', 0.5, [
        makeDoor('lobby-cd', 'lobby', 1440, 'lobby-c'),
      ], []),
    ],
  };
}

function buildBasement(): FloorConfig {
  return {
    id: 'basement',
    number: 1,
    rooms: [
      makeRoom('basement-a', 'basement', 0, 'tile', 0.05, [
        makeDoor('base-ab', 'basement', 460, 'basement-b'),
      ], []),
      makeRoom('basement-b', 'basement', 1, 'tile', 0.05, [
        makeDoor('base-ab', 'basement', 480, 'basement-a'),
        makeDoor('base-bc', 'basement', 940, 'basement-c'),
      ], [
        makeSpot('base-furn-b', 'furniture', 'basement', 700),
      ]),
      makeRoom('basement-c', 'basement', 2, 'tile', 0.05, [
        makeDoor('base-bc', 'basement', 960, 'basement-b'),
        makeDoor('base-cd', 'basement', 1420, 'basement-d'),
      ], []),
      makeRoom('basement-d', 'basement', 3, 'tile', 0.05, [
        makeDoor('base-cd', 'basement', 1440, 'basement-c'),
      ], [
        makeSpot('base-freezer-d', 'freezer', 'basement', 1700),
      ]),
    ],
  };
}

// --- Connections ---

const STAIR_X = 96;
const STAIR_CONNECTIONS: readonly FloorConnection[] = [
  {
    type: 'stairs',
    fromFloor: 'attic',
    toFloor: 'floor3',
    fromPosition: { x: STAIR_X, y: groundY('attic') },
    toPosition: { x: STAIR_X, y: groundY('floor3') },
    bidirectional: true,
  },
  {
    type: 'stairs',
    fromFloor: 'floor3',
    toFloor: 'floor2',
    fromPosition: { x: STAIR_X, y: groundY('floor3') },
    toPosition: { x: STAIR_X, y: groundY('floor2') },
    bidirectional: true,
  },
  {
    type: 'stairs',
    fromFloor: 'floor2',
    toFloor: 'lobby',
    fromPosition: { x: STAIR_X, y: groundY('floor2') },
    toPosition: { x: STAIR_X, y: groundY('lobby') },
    bidirectional: true,
  },
  {
    type: 'stairs',
    fromFloor: 'lobby',
    toFloor: 'basement',
    fromPosition: { x: STAIR_X, y: groundY('lobby') },
    toPosition: { x: STAIR_X, y: groundY('basement') },
    bidirectional: true,
  },
];

const LAUNDRY_CHUTE: FloorConnection = {
  type: 'laundry-chute',
  fromFloor: 'floor2',
  toFloor: 'basement',
  fromPosition: { x: 800, y: groundY('floor2') },
  toPosition: { x: 800, y: groundY('basement') },
  bidirectional: false,
};

// --- Elevator ---

const ELEVATOR_X = 1800;
const ELEVATOR_CONFIG: ElevatorConfig = {
  stops: [
    { floor: 'basement', position: { x: ELEVATOR_X, y: groundY('basement') } },
    { floor: 'lobby', position: { x: ELEVATOR_X, y: groundY('lobby') } },
    { floor: 'floor2', position: { x: ELEVATOR_X, y: groundY('floor2') } },
    { floor: 'floor3', position: { x: ELEVATOR_X, y: groundY('floor3') } },
    { floor: 'attic', position: { x: ELEVATOR_X, y: groundY('attic') } },
  ],
  travelTimePerFloorS: 3,
};

// --- Export ---

export function getGreyboxLevel(): LevelConfig {
  return {
    floors: [buildAttic(), buildFloor3(), buildFloor2(), buildLobby(), buildBasement()],
    connections: [...STAIR_CONNECTIONS, LAUNDRY_CHUTE],
    elevator: ELEVATOR_CONFIG,
  };
}

// Floor ground Y positions exported for collision
export const FLOOR_GROUNDS: Record<string, number> = {
  attic: groundY('attic'),
  floor3: groundY('floor3'),
  floor2: groundY('floor2'),
  lobby: groundY('lobby'),
  basement: groundY('basement'),
};

// Stair positions for proximity checks
export const STAIR_POSITIONS = STAIR_CONNECTIONS.map(c => ({
  fromFloor: c.fromFloor,
  toFloor: c.toFloor,
  fromPosition: c.fromPosition,
  toPosition: c.toPosition,
}));

// Laundry chute position
export const LAUNDRY_CHUTE_POSITION = {
  fromFloor: LAUNDRY_CHUTE.fromFloor,
  toFloor: LAUNDRY_CHUTE.toFloor,
  fromPosition: LAUNDRY_CHUTE.fromPosition,
  toPosition: LAUNDRY_CHUTE.toPosition,
};

// Elevator position
export const ELEVATOR_POSITIONS = ELEVATOR_CONFIG.stops.map(s => ({
  floor: s.floor,
  position: s.position,
}));

export { LEVEL_WIDTH, FLOOR_HEIGHT };
