import type { GameMap, GameState, SpawnPoint, SpectatingState, DoorId, DoorState } from '../types/state.js';
import { createCountdownTicks } from './timer.js';

export function createGameState(
  map: GameMap,
  spawns: readonly SpawnPoint[],
  doors?: ReadonlyMap<DoorId, DoorState>,
): GameState {
  const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
  if (!hiderSpawn) throw new Error('No hider_spawn found in map data');

  const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn');
  if (!seekerSpawn) throw new Error('No seeker_spawn found in map data');

  const tileCount = map.width * map.height;
  const playerFov = new Uint8Array(tileCount);
  // COUNTDOWN: all tiles visible — FogRenderer treats uniformly (no phase branching)
  playerFov.fill(1);

  return {
    phase: 'playing',
    player: {
      x: hiderSpawn.x,
      y: hiderSpawn.y,
      velocityX: 0,
      velocityY: 0,
      facing: 'down',
    },
    seeker: {
      x: seekerSpawn.x,
      y: seekerSpawn.y,
      facing: 'down',
      facingAngle: Math.PI / 2,  // facing down = +Y = π/2
      fsmState: 'patrol',
    },
    map,
    spawns,
    gameFlow: {
      kind: 'countdown',
      ticksRemaining: createCountdownTicks(),
    },
    seekerFov: new Uint8Array(tileCount),
    playerFov,
    stats: {
      distanceTraveled: 0, seekerDistanceTiles: Infinity,
      playerFootstepAccum: 0, seekerFootstepAccum: 0,
      timeSurvivedS: 0, closeCalls: 0, closestApproachTiles: -1, doorsToggled: 0,
      isInCloseCallZone: false, closeCallZoneEnteredAtMs: 0, closeCallCooldownRemainingMs: 0,
    },
    doors: doors ?? new Map(),
    doorGeneration: 0,
  };
}

export function createSpectatingState(
  map: GameMap,
  spawns: readonly SpawnPoint[],
  doors?: ReadonlyMap<DoorId, DoorState>,
): SpectatingState {
  const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
  if (!hiderSpawn) throw new Error('No hider_spawn found in map data');

  const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn');
  if (!seekerSpawn) throw new Error('No seeker_spawn found in map data');

  const tileCount = map.width * map.height;

  return {
    phase: 'spectating',
    seeker: {
      x: seekerSpawn.x,
      y: seekerSpawn.y,
      facing: 'down',
      facingAngle: Math.PI / 2,
      fsmState: 'patrol',
    },
    hider: {
      x: hiderSpawn.x,
      y: hiderSpawn.y,
      facing: 'down',
      facingAngle: Math.PI / 2,
      fsmState: 'countdown-moving',
    },
    map,
    spawns,
    gameFlow: {
      kind: 'countdown',
      ticksRemaining: createCountdownTicks(),
    },
    seekerFov: new Uint8Array(tileCount),
    hiderFov: new Uint8Array(tileCount),
    doors: doors ?? new Map(),
    doorGeneration: 0,
    stats: { seekerDistanceTiles: Infinity, seekerFootstepAccum: 0, hiderFootstepAccum: 0 },
  };
}
