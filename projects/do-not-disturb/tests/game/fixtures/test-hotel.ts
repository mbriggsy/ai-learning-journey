import type { LevelConfig } from '../../../src/types/level';

// 2-floor test hotel: lobby + floor2
// lobby: room-lobby-a (wood) -- door-1 --> room-lobby-b (tile)
// floor2: room-f2-a (carpet) -- door-2 --> room-f2-b (carpet)
// stairs connect lobby ↔ floor2
// elevator stops at both floors
export function createTestHotel(): LevelConfig {
  return {
    floors: [
      {
        id: 'lobby',
        number: 1,
        rooms: [
          {
            id: 'room-lobby-a',
            bounds: { x: 0, y: 0, width: 200, height: 100 },
            surfaceType: 'wood',
            ambientLight: 0.5,
            doors: [
              { id: 'door-1', position: { x: 200, y: 50 }, connectsTo: 'room-lobby-b', initialState: 'closed' },
            ],
            hidingSpots: [
              { id: 'spot-desk', position: { x: 50, y: 50 }, type: 'furniture' },
            ],
            items: [
              { position: { x: 80, y: 50 }, type: 'throwable' },
            ],
          },
          {
            id: 'room-lobby-b',
            bounds: { x: 200, y: 0, width: 200, height: 100 },
            surfaceType: 'tile',
            ambientLight: 0.5,
            doors: [
              { id: 'door-1', position: { x: 200, y: 50 }, connectsTo: 'room-lobby-a', initialState: 'closed' },
            ],
            hidingSpots: [],
            items: [],
          },
        ],
      },
      {
        id: 'floor2',
        number: 2,
        rooms: [
          {
            id: 'room-f2-a',
            bounds: { x: 0, y: -200, width: 200, height: 100 },
            surfaceType: 'carpet',
            ambientLight: 0.25,
            doors: [
              { id: 'door-2', position: { x: 200, y: -150 }, connectsTo: 'room-f2-b', initialState: 'open' },
            ],
            hidingSpots: [
              { id: 'spot-bed', position: { x: 100, y: -150 }, type: 'bed' },
              { id: 'spot-closet', position: { x: 150, y: -150 }, type: 'closet' },
            ],
            items: [],
          },
          {
            id: 'room-f2-b',
            bounds: { x: 200, y: -200, width: 200, height: 100 },
            surfaceType: 'carpet',
            ambientLight: 0.25,
            doors: [
              { id: 'door-2', position: { x: 200, y: -150 }, connectsTo: 'room-f2-a', initialState: 'open' },
            ],
            hidingSpots: [
              { id: 'spot-vent', position: { x: 350, y: -180 }, type: 'vent' },
            ],
            items: [
              { position: { x: 300, y: -150 }, type: 'dndSign' },
            ],
          },
        ],
      },
    ],
    connections: [
      {
        type: 'stairs',
        fromFloor: 'lobby',
        toFloor: 'floor2',
        fromPosition: { x: 180, y: 50 },
        toPosition: { x: 180, y: -150 },
        bidirectional: true,
      },
    ],
    elevator: {
      stops: [
        { floor: 'lobby', position: { x: 50, y: 50 } },
        { floor: 'floor2', position: { x: 50, y: -150 } },
      ],
      travelTimePerFloorS: 3,
    },
  };
}
