import type { InputState, FacingDirection } from '../types/input.js';
import type { GameMap, PlayerState } from '../types/state.js';
import { tileCoord } from '../types/grid.js';
import { MOVEMENT, COLLISION, DISPLAY } from '../constants.js';

const HALF_HITBOX = COLLISION.PLAYER_HITBOX / 2;
const TILE_SIZE = DISPLAY.TILE_SIZE;

/**
 * Check if an AABB at (cx, cy) with half-extent HALF_HITBOX overlaps any non-walkable tile.
 * Returns true if blocked.
 */
function isBlocked(cx: number, cy: number, map: GameMap): boolean {
  // Compute tile range covered by AABB
  // EPSILON on right/bottom edges prevents false boundary overlaps
  const epsilon = 0.001;
  const left = Math.floor((cx - HALF_HITBOX) / TILE_SIZE);
  const right = Math.floor((cx + HALF_HITBOX - epsilon) / TILE_SIZE);
  const top = Math.floor((cy - HALF_HITBOX) / TILE_SIZE);
  const bottom = Math.floor((cy + HALF_HITBOX - epsilon) / TILE_SIZE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!map.isWalkable(tileCoord(tx, ty))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Clamp position so the hitbox edge is flush against the nearest blocking tile boundary.
 * Resolves along one axis at a time.
 */
function clampAxis(
  current: number,
  candidate: number,
  otherAxis: number,
  axis: 'x' | 'y',
  map: GameMap,
): number {
  if (axis === 'x') {
    if (!isBlocked(candidate, otherAxis, map)) return candidate;
  } else {
    if (!isBlocked(otherAxis, candidate, map)) return candidate;
  }

  // Binary search isn't needed at 2px/tick max displacement.
  // Clamp to the nearest tile boundary.
  const moving = candidate > current ? 1 : -1;
  if (moving > 0) {
    // Moving positive: clamp so right/bottom edge of hitbox aligns to tile boundary
    const edgePixel = candidate + HALF_HITBOX;
    const tileBoundary = Math.floor(edgePixel / TILE_SIZE) * TILE_SIZE;
    return tileBoundary - HALF_HITBOX - 0.001;
  } else {
    // Moving negative: clamp so left/top edge of hitbox aligns to tile boundary
    const edgePixel = candidate - HALF_HITBOX;
    const tileBoundary = (Math.floor(edgePixel / TILE_SIZE) + 1) * TILE_SIZE;
    return tileBoundary + HALF_HITBOX + 0.001;
  }
}

function computeFacing(input: Readonly<InputState>, currentFacing: FacingDirection): FacingDirection {
  const ax = Math.abs(input.moveX);
  const ay = Math.abs(input.moveY);

  // Zero input keeps last facing
  if (ax < 0.001 && ay < 0.001) return currentFacing;

  // Dominant axis, horizontal wins ties
  if (ax >= ay) {
    return input.moveX > 0 ? 'right' : 'left';
  }
  return input.moveY > 0 ? 'down' : 'up';
}

export function updateMovement(
  player: Readonly<PlayerState>,
  map: GameMap,
  input: Readonly<InputState>,
  dt: number,
): PlayerState {
  // Normalize input vector
  let moveX = input.moveX;
  let moveY = input.moveY;
  const mag = Math.sqrt(moveX * moveX + moveY * moveY);
  if (mag > 1) {
    moveX /= mag;
    moveY /= mag;
  }

  const vx = moveX * MOVEMENT.PLAYER_SPEED;
  const vy = moveY * MOVEMENT.PLAYER_SPEED;

  const candidateX = player.x + vx * dt;
  const candidateY = player.y + vy * dt;

  // Separate-axis resolution: try full move, then X only, then Y only
  let resolvedX: number;
  let resolvedY: number;

  if (!isBlocked(candidateX, candidateY, map)) {
    // Full move is clear
    resolvedX = candidateX;
    resolvedY = candidateY;
  } else {
    // Try X alone
    resolvedX = clampAxis(player.x, candidateX, player.y, 'x', map);
    // Try Y with resolved X
    resolvedY = clampAxis(player.y, candidateY, resolvedX, 'y', map);
  }

  return {
    x: resolvedX,
    y: resolvedY,
    velocityX: vx,
    velocityY: vy,
    facing: computeFacing(input, player.facing),
  };
}
