import type { GameMap, GameState, SpawnPoint } from '../types/state.js';
import { SIMULATION, TIMERS } from '../constants.js';

export function createGameState(map: GameMap, spawns: readonly SpawnPoint[]): GameState {
  const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
  if (!hiderSpawn) throw new Error('No hider_spawn found in map data');

  const seekerSpawn = spawns.find(s => s.type === 'seeker_spawn');
  if (!seekerSpawn) throw new Error('No seeker_spawn found in map data');

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
      fsmState: 'patrol',
    },
    map,
    spawns,
    gameFlow: {
      kind: 'countdown',
      ticksRemaining: Math.round(TIMERS.COUNTDOWN_DURATION_S / SIMULATION.FIXED_STEP_S),
    },
    seekerFov: new Uint8Array(map.width * map.height),
  };
}
