import type { LevelConfig, FloorConfig, RoomConfig, DoorConfig, HidingSpotConfig, FloorConnection, ElevatorConfig } from '../types/level';
import type { Position } from '../types/state';

// --- Layout constants ---

const LEVEL_WIDTH = 1920;
const FLOOR_HEIGHT = 240;
const ROOM_WIDTH = 480;

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

// --- Key X positions ---

const STAIR_X = 96;
const ELEVATOR_X = 1800;

// Door X positions between room segments
// Room A: 0–460 | door | Room B: 480–940 | door | Room C: 960–1420 | door | Room D: 1440–1900
const DOOR_X = [460, 940, 1420] as const;

// --- Exported spawn positions ---

export const PLAYER_SPAWN: Position = { x: 200, y: groundY('lobby') };

export const PHONE_POSITION: Position = { x: 160, y: groundY('lobby') };
export const PHONE_ZONE_ID = 'lobby-a';

export const ESCAPE_DOOR_POSITION: Position = { x: 500, y: groundY('lobby') };

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
    doors,
    hidingSpots,
    items: [],
  };
}

function makeDoor(
  id: string,
  floorId: keyof typeof FLOOR_Y,
  doorIndex: number,
  connectsTo: string,
  initialState: 'open' | 'closed' = 'closed',
): DoorConfig {
  return { id, position: { x: DOOR_X[doorIndex]!, y: groundY(floorId) }, connectsTo, initialState };
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
// Each floor = 4 room segments (A–D) separated by 3 doors.
// Hiding spots are centered in rooms, well away from doors.
// Room centers: A=230, B=710, C=1190, D=1670

function buildAttic(): FloorConfig {
  return {
    id: 'attic',
    number: 5,
    rooms: [
      makeRoom('attic-a', 'attic', 0, 'wood', 0.3,
        [makeDoor('attic-ab', 'attic', 0, 'attic-b')],
        [makeSpot('attic-vent-a', 'vent', 'attic', 250)],
      ),
      makeRoom('attic-b', 'attic', 1, 'wood', 0.3,
        [makeDoor('attic-ab', 'attic', 0, 'attic-a'), makeDoor('attic-bc', 'attic', 1, 'attic-c')],
        [makeSpot('attic-furn-b', 'furniture', 'attic', 710)],
      ),
      makeRoom('attic-c', 'attic', 2, 'wood', 0.25,
        [makeDoor('attic-bc', 'attic', 1, 'attic-b'), makeDoor('attic-cd', 'attic', 2, 'attic-d')],
        [makeSpot('attic-vent-c', 'vent', 'attic', 1190)],
      ),
      makeRoom('attic-d', 'attic', 3, 'wood', 0.3,
        [makeDoor('attic-cd', 'attic', 2, 'attic-c')],
        [makeSpot('attic-furn-d', 'furniture', 'attic', 1670)],
      ),
    ],
  };
}

function buildFloor3(): FloorConfig {
  return {
    id: 'floor3',
    number: 4,
    rooms: [
      makeRoom('floor3-a', 'floor3', 0, 'carpet', 0.25,
        [makeDoor('f3-ab', 'floor3', 0, 'floor3-b')],
        [makeSpot('f3-bed-a', 'bed', 'floor3', 230)],
      ),
      makeRoom('floor3-b', 'floor3', 1, 'carpet', 0.25,
        [makeDoor('f3-ab', 'floor3', 0, 'floor3-a'), makeDoor('f3-bc', 'floor3', 1, 'floor3-c')],
        [makeSpot('f3-closet-b', 'closet', 'floor3', 710)],
      ),
      makeRoom('floor3-c', 'floor3', 2, 'carpet', 0.25,
        [makeDoor('f3-bc', 'floor3', 1, 'floor3-b'), makeDoor('f3-cd', 'floor3', 2, 'floor3-d')],
        [makeSpot('f3-bed-c', 'bed', 'floor3', 1190)],
      ),
      makeRoom('floor3-d', 'floor3', 3, 'carpet', 0.25,
        [makeDoor('f3-cd', 'floor3', 2, 'floor3-c')],
        [makeSpot('f3-vent-d', 'vent', 'floor3', 1670)],
      ),
    ],
  };
}

function buildFloor2(): FloorConfig {
  return {
    id: 'floor2',
    number: 3,
    rooms: [
      makeRoom('floor2-a', 'floor2', 0, 'carpet', 0.25,
        [makeDoor('f2-ab', 'floor2', 0, 'floor2-b')],
        [makeSpot('f2-bed-a', 'bed', 'floor2', 230)],
      ),
      makeRoom('floor2-b', 'floor2', 1, 'carpet', 0.25,
        [makeDoor('f2-ab', 'floor2', 0, 'floor2-a'), makeDoor('f2-bc', 'floor2', 1, 'floor2-c')],
        [makeSpot('f2-closet-b', 'closet', 'floor2', 710)],
      ),
      makeRoom('floor2-c', 'floor2', 2, 'carpet', 0.25,
        [makeDoor('f2-bc', 'floor2', 1, 'floor2-b'), makeDoor('f2-cd', 'floor2', 2, 'floor2-d')],
        [makeSpot('f2-furn-c', 'furniture', 'floor2', 1190)],
      ),
      makeRoom('floor2-d', 'floor2', 3, 'carpet', 0.25,
        [makeDoor('f2-cd', 'floor2', 2, 'floor2-c')],
        [makeSpot('f2-vent-d', 'vent', 'floor2', 1670)],
      ),
    ],
  };
}

function buildLobby(): FloorConfig {
  // Lobby: open plan, no internal doors. Furniture hiding only (risky — 50% protection).
  return {
    id: 'lobby',
    number: 2,
    rooms: [
      makeRoom('lobby-a', 'lobby', 0, 'tile', 0.5, [], [
        makeSpot('lobby-furn-a', 'furniture', 'lobby', 300),
      ]),
      makeRoom('lobby-b', 'lobby', 1, 'tile', 0.5, [], []),
      makeRoom('lobby-c', 'lobby', 2, 'tile', 0.5, [], [
        makeSpot('lobby-furn-c', 'furniture', 'lobby', 1200),
      ]),
      makeRoom('lobby-d', 'lobby', 3, 'tile', 0.5, [], []),
    ],
  };
}

function buildBasement(): FloorConfig {
  return {
    id: 'basement',
    number: 1,
    rooms: [
      makeRoom('basement-a', 'basement', 0, 'tile', 0.05,
        [makeDoor('base-ab', 'basement', 0, 'basement-b')],
        [makeSpot('base-furn-a', 'furniture', 'basement', 230)],
      ),
      makeRoom('basement-b', 'basement', 1, 'tile', 0.05,
        [makeDoor('base-ab', 'basement', 0, 'basement-a'), makeDoor('base-bc', 'basement', 1, 'basement-c')],
        [],
      ),
      makeRoom('basement-c', 'basement', 2, 'tile', 0.05,
        [makeDoor('base-bc', 'basement', 1, 'basement-b'), makeDoor('base-cd', 'basement', 2, 'basement-d')],
        [makeSpot('base-furn-c', 'furniture', 'basement', 1190)],
      ),
      makeRoom('basement-d', 'basement', 3, 'tile', 0.05,
        [makeDoor('base-cd', 'basement', 2, 'basement-c')],
        [makeSpot('base-freezer-d', 'freezer', 'basement', 1670)],
      ),
    ],
  };
}

// --- Connections ---

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
