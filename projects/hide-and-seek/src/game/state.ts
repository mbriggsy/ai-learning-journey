import type { GameMap, GameState, SpawnPoint } from '../types/state.js';

export function createGameState(map: GameMap, spawns: readonly SpawnPoint[]): GameState {
  const hiderSpawn = spawns.find(s => s.type === 'hider_spawn');
  if (!hiderSpawn) throw new Error('No hider_spawn found in map data');

  return {
    phase: 'playing',
    player: {
      x: hiderSpawn.x,
      y: hiderSpawn.y,
      velocityX: 0,
      velocityY: 0,
      facing: 'down',
    },
    map,
    spawns,
  };
}
