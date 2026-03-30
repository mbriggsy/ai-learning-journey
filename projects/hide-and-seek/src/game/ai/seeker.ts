import type { SeekerRenderState, SeekerFSMState, DetectionResult } from '../../types/state.js';
import type { SeekerConfig, PathPoint } from '../../types/ai.js';
import type { GameMap } from '../../types/state.js';
import type { PathfindingSystem } from './pathfinding.js';
import { pixelToTile, tileToPixelCenter } from '../map.js';
import { DISPLAY, SEEKER } from '../../constants.js';

export interface SeekerAIState {
  currentPath: PathPoint[];
  currentWaypointIndex: number;
  pendingPathId: number | undefined;
  lastKnownHiderPos: { x: number; y: number } | null;
  chaseLostTicks: number;
  patrolPauseTicks: number;
  pendingTransition: { target: SeekerFSMState; ticksRemaining: number } | null;
  lastFovTileX: number;
  lastFovTileY: number;
  chaseRepathCounter: number;
}

export function createSeekerAIState(seekerX: number, seekerY: number): SeekerAIState {
  const tile = pixelToTile(seekerX, seekerY);
  return {
    currentPath: [],
    currentWaypointIndex: 0,
    pendingPathId: undefined,
    lastKnownHiderPos: null,
    chaseLostTicks: 0,
    patrolPauseTicks: 0,
    pendingTransition: null,
    lastFovTileX: tile.x,
    lastFovTileY: tile.y,
    chaseRepathCounter: 0,
  };
}

function pickRandomWalkableTile(map: GameMap): { x: number; y: number } | null {
  // Try up to 50 times to find a walkable tile
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);
    if (map.isWalkable(x, y)) {
      return { x, y };
    }
  }
  return null;
}

function randomPauseTicks(config: SeekerConfig): number {
  const range = config.patrolPauseMaxTicks - config.patrolPauseMinTicks;
  return config.patrolPauseMinTicks + Math.floor(Math.random() * (range + 1));
}

function moveAlongPath(
  render: SeekerRenderState,
  ai: SeekerAIState,
  speed: number,
  dt: number,
): void {
  if (ai.currentPath.length === 0 || ai.currentWaypointIndex >= ai.currentPath.length) return;

  let remaining = speed * dt;

  while (remaining > 0 && ai.currentWaypointIndex < ai.currentPath.length) {
    const wp = ai.currentPath[ai.currentWaypointIndex]!;
    const target = tileToPixelCenter(wp.x, wp.y);
    const dx = target.x - render.x;
    const dy = target.y - render.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= remaining) {
      // Snap to waypoint
      render.x = target.x;
      render.y = target.y;
      remaining -= dist;
      ai.currentWaypointIndex++;
    } else {
      // Move toward waypoint
      const ratio = remaining / dist;
      render.x += dx * ratio;
      render.y += dy * ratio;
      remaining = 0;
    }
  }

  // Update facing based on movement direction toward current/last waypoint
  if (ai.currentWaypointIndex < ai.currentPath.length) {
    const wp = ai.currentPath[ai.currentWaypointIndex]!;
    const target = tileToPixelCenter(wp.x, wp.y);
    updateFacing(render, target.x, target.y);
  }
}

function updateFacing(render: SeekerRenderState, targetX: number, targetY: number): void {
  const dx = targetX - render.x;
  const dy = targetY - render.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 0.001 && ay < 0.001) return;
  if (ax >= ay) {
    render.facing = dx > 0 ? 'right' : 'left';
  } else {
    render.facing = dy > 0 ? 'down' : 'up';
  }
}

function clearPath(ai: SeekerAIState): void {
  ai.currentPath = [];
  ai.currentWaypointIndex = 0;
  ai.pendingPathId = undefined;
}

function transitionTo(render: SeekerRenderState, ai: SeekerAIState, target: SeekerFSMState): void {
  render.fsmState = target;
  clearPath(ai);
  ai.pendingTransition = null;
  ai.chaseLostTicks = 0;
  ai.chaseRepathCounter = 0;
}

export function updateSeekerAI(
  render: SeekerRenderState,
  ai: SeekerAIState,
  config: SeekerConfig,
  detectionResult: DetectionResult,
  hiderPos: { x: number; y: number },
  pathfinding: PathfindingSystem,
  map: GameMap,
  dt: number,
): void {
  // Process pending transition
  if (ai.pendingTransition) {
    ai.pendingTransition.ticksRemaining--;
    if (ai.pendingTransition.target === 'chase' && detectionResult === 'none') {
      // Condition no longer holds — cancel
      ai.pendingTransition = null;
    } else if (ai.pendingTransition.ticksRemaining <= 0) {
      transitionTo(render, ai, ai.pendingTransition.target);
    }
  }

  switch (render.fsmState) {
    case 'patrol':
      tickPatrol(render, ai, config, detectionResult, hiderPos, pathfinding, map, dt);
      break;
    case 'chase':
      tickChase(render, ai, config, detectionResult, hiderPos, pathfinding, map, dt);
      break;
  }
}

function tickPatrol(
  render: SeekerRenderState,
  ai: SeekerAIState,
  config: SeekerConfig,
  detectionResult: DetectionResult,
  _hiderPos: { x: number; y: number },
  pathfinding: PathfindingSystem,
  map: GameMap,
  dt: number,
): void {
  // Check for detection → queue transition to CHASE
  if (detectionResult === 'spotted' || detectionResult === 'found') {
    if (!ai.pendingTransition) {
      ai.pendingTransition = {
        target: 'chase',
        ticksRemaining: config.reactionDelayTicks,
      };
    }
  }

  // Patrol pause
  if (ai.patrolPauseTicks > 0) {
    ai.patrolPauseTicks--;
    return;
  }

  // No path? Pick a random destination
  if (ai.currentPath.length === 0 || ai.currentWaypointIndex >= ai.currentPath.length) {
    if (ai.pendingPathId === undefined) {
      const target = pickRandomWalkableTile(map);
      if (target) {
        const seekerTile = pixelToTile(render.x, render.y);
        ai.pendingPathId = pathfinding.requestPath(
          seekerTile.x, seekerTile.y,
          target.x, target.y,
          (path) => {
            ai.pendingPathId = undefined;
            if (path && path.length > 1) {
              ai.currentPath = path;
              ai.currentWaypointIndex = 1; // Skip start tile
            }
          },
        );
      }
    }
    return;
  }

  // Follow path
  moveAlongPath(render, ai, config.speed, dt);

  // Check if path complete
  if (ai.currentWaypointIndex >= ai.currentPath.length) {
    clearPath(ai);
    ai.patrolPauseTicks = randomPauseTicks(config);
  }
}

function tickChase(
  render: SeekerRenderState,
  ai: SeekerAIState,
  config: SeekerConfig,
  detectionResult: DetectionResult,
  hiderPos: { x: number; y: number },
  pathfinding: PathfindingSystem,
  _map: GameMap,
  dt: number,
): void {
  // Update last known position when hider is visible
  if (detectionResult === 'spotted' || detectionResult === 'found') {
    ai.lastKnownHiderPos = { x: hiderPos.x, y: hiderPos.y };
    ai.chaseLostTicks = 0;
    ai.chaseRepathCounter++;

    // Re-request path every CHASE_REPATH_TICKS while LOS active
    if (ai.chaseRepathCounter >= SEEKER.CHASE_REPATH_TICKS) {
      ai.chaseRepathCounter = 0;
      requestChasePath(render, ai, pathfinding);
    }
  } else {
    // Lost LOS
    ai.chaseLostTicks++;
    if (ai.chaseLostTicks >= config.chaseTimeoutTicks) {
      transitionTo(render, ai, 'patrol');
      return;
    }
  }

  // Request initial chase path
  if (ai.currentPath.length === 0 && ai.lastKnownHiderPos && ai.pendingPathId === undefined) {
    requestChasePath(render, ai, pathfinding);
  }

  // Follow path
  moveAlongPath(render, ai, config.speed, dt);

  // If we reached the last-known-position and still no LOS, keep waiting for timeout
  if (ai.currentWaypointIndex >= ai.currentPath.length && ai.currentPath.length > 0) {
    clearPath(ai);
  }
}

function requestChasePath(
  render: SeekerRenderState,
  ai: SeekerAIState,
  pathfinding: PathfindingSystem,
): void {
  if (!ai.lastKnownHiderPos) return;
  const seekerTile = pixelToTile(render.x, render.y);
  const targetTile = pixelToTile(ai.lastKnownHiderPos.x, ai.lastKnownHiderPos.y);

  if (ai.pendingPathId !== undefined) {
    pathfinding.cancelPath(ai.pendingPathId);
  }

  ai.pendingPathId = pathfinding.requestPath(
    seekerTile.x, seekerTile.y,
    targetTile.x, targetTile.y,
    (path) => {
      ai.pendingPathId = undefined;
      if (path && path.length > 1) {
        ai.currentPath = path;
        ai.currentWaypointIndex = 1; // Skip start tile
      }
    },
  );
}
