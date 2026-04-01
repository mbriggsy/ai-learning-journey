import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine.js';
import { createDoorSystem } from '../../src/game/doors.js';
import type { PlayingState, DoorId } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

const STEP_MS = (1 / 60) * 1000;
const ZERO_INPUT: InputState = { moveX: 0, moveY: 0, interact: false, pause: false };
const INTERACT_INPUT: InputState = { moveX: 0, moveY: 0, interact: true, pause: false };

const MAP_W = 20;
const MAP_H = 20;

function makeOpenMap() {
  return {
    width: MAP_W,
    height: MAP_H,
    isWalkable(x: number, y: number) {
      // Check the collision grid that DoorSystem manages
      return collisionGrid[y * MAP_W + x] === 0;
    },
    isBlocking(x: number, y: number) {
      return losGrid[y * MAP_W + x] === 1;
    },
  };
}

// Module-level grids so map closures can reference them
let collisionGrid: Uint8Array;
let losGrid: Uint8Array;

function makePlayingStateWithDoor(doorTileX: number, doorTileY: number) {
  collisionGrid = new Uint8Array(MAP_W * MAP_H);
  losGrid = new Uint8Array(MAP_W * MAP_H);
  const map = makeOpenMap();

  // Place player near the door (within INTERACTION.DOOR_RANGE = 1.5 tiles)
  const playerTileX = doorTileX;
  const playerTileY = doorTileY - 1;

  const state: PlayingState = {
    phase: 'playing',
    player: {
      x: playerTileX * 32 + 16,
      y: playerTileY * 32 + 16,
      velocityX: 0, velocityY: 0, facing: 'down',
    },
    seeker: { x: 15 * 32 + 16, y: 15 * 32 + 16, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'patrol' },
    map,
    spawns: [
      { x: playerTileX * 32 + 16, y: playerTileY * 32 + 16, type: 'hider_spawn' },
      { x: 15 * 32 + 16, y: 15 * 32 + 16, type: 'seeker_spawn' },
    ],
    gameFlow: { kind: 'countdown', ticksRemaining: 600 },
    seekerFov: new Uint8Array(MAP_W * MAP_H),
    playerFov: new Uint8Array(MAP_W * MAP_H).fill(1),
    stats: { distanceTraveled: 0, seekerDistanceTiles: Infinity, playerFootstepAccum: 0, seekerFootstepAccum: 0, timeSurvivedS: 0, closeCalls: 0, closestApproachTiles: -1, doorsToggled: 0, isInCloseCallZone: false, closeCallZoneEnteredAtMs: 0, closeCallCooldownRemainingMs: 0 },
    doors: new Map(),
    doorGeneration: 0,
  };

  return { state, map };
}

describe('doors + game flow integration', () => {
  it('door interaction works during COUNTDOWN phase', () => {
    const { state } = makePlayingStateWithDoor(5, 5);
    const engine = new GameEngine(state);

    // Create door system
    const doorSystem = createDoorSystem(
      [{ id: 1, name: 'door_1', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, engine.getEmitterInternal(),
    );
    engine.setDoorSystem(doorSystem);

    // Verify door starts closed
    expect(doorSystem.getDoors().get('door_1' as DoorId)!.isOpen).toBe(false);

    // Player presses interact during countdown
    engine.tick(STEP_MS, INTERACT_INPUT);

    // Door should be open now
    expect(doorSystem.getDoors().get('door_1' as DoorId)!.isOpen).toBe(true);
  });

  it('door interaction blocked during FOUND phase', () => {
    const { state } = makePlayingStateWithDoor(5, 5);

    // Put player directly on seeker for instant FOUND
    state.player.x = state.seeker.x;
    state.player.y = state.seeker.y;

    // Start in HUNT phase
    (state as { gameFlow: PlayingState['gameFlow'] }).gameFlow = {
      kind: 'hunt',
      ticksRemaining: 7200,
      ticksElapsed: 0,
      sonarTicksUntilPing: 300,
    };

    const engine = new GameEngine(state);
    const doorSystem = createDoorSystem(
      [{ id: 1, name: 'door_1', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, engine.getEmitterInternal(),
    );
    engine.setDoorSystem(doorSystem);

    // Tick to trigger FOUND
    engine.tick(STEP_MS, ZERO_INPUT);

    // Verify we're in FOUND state
    const s = engine.getState() as PlayingState;
    expect(s.gameFlow.kind).toBe('found');

    // Try to interact — should be blocked
    engine.tick(STEP_MS, INTERACT_INPUT);
    expect(doorSystem.getDoors().get('door_1' as DoorId)!.isOpen).toBe(false);
  });

  it('DOOR_TOGGLED event fires on toggle', () => {
    const { state } = makePlayingStateWithDoor(5, 5);
    const engine = new GameEngine(state);
    const doorSystem = createDoorSystem(
      [{ id: 1, name: 'door_1', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, engine.getEmitterInternal(),
    );
    engine.setDoorSystem(doorSystem);

    const events: Array<{ isOpen: boolean }> = [];
    engine.getEmitter().on('DOOR_TOGGLED', (payload) => events.push({ isOpen: payload.isOpen }));

    engine.tick(STEP_MS, INTERACT_INPUT);
    expect(events).toHaveLength(1);
    expect(events[0]!.isOpen).toBe(true);
  });
});
