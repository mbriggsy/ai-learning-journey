import type { HiderConfig, PathPoint, HiderSpotScoreWeights } from '../../types/ai.js';
import type { HiderRenderState, HiderFSMState, GameMap } from '../../types/state.js';
import type { GameEventMap } from '../../types/events.js';
import type { TypedEmitter } from '../../types/events.js';
import type { PathfindingInstance } from './pathfinding.js';
import type { DoorSystem } from '../doors.js';
import { pixelToTile, tileToPixelCenter } from '../map.js';
import { smoothPath } from './path-smoothing.js';
import { computeFOV } from '../los.js';

// --- Hider AI internal state ---

export interface HiderAIState {
  currentPath: PathPoint[];
  waypointIndex: number;
  latestRequestId: number;
  pendingPath: boolean;
  repositionsUsed: number;
  currentRepositionDelay: number;
  previousSpots: Array<{ x: number; y: number }>;
  chosenSpot: { x: number; y: number } | null;
  fsmState: HiderFSMState;
  lastSeekerDist: number;
  prevSeekerDist: number;
  lastFovTileX: number;
  lastFovTileY: number;
  lastFovDoorGen: number;
}

export interface HiderContext {
  readonly config: HiderConfig;
  readonly pathfinding: PathfindingInstance;
  readonly map: GameMap;
  readonly emitter: TypedEmitter<GameEventMap>;
  render: HiderRenderState;
  ai: HiderAIState;
  seekerX: number;
  seekerY: number;
  seekerFov: Uint8Array;
  hiderFov: Uint8Array;
  doorSystem: DoorSystem | null;
  currentTick: number;
  doorGeneration: number;
}

export function createHiderAIState(): HiderAIState {
  return {
    currentPath: [],
    waypointIndex: 0,
    latestRequestId: 0,
    pendingPath: false,
    repositionsUsed: 0,
    currentRepositionDelay: 0,
    previousSpots: [],
    chosenSpot: null,
    fsmState: 'countdown-moving',
    lastSeekerDist: Infinity,
    prevSeekerDist: Infinity,
    lastFovTileX: -1,
    lastFovTileY: -1,
    lastFovDoorGen: -1,
  };
}

// --- Path helpers (same pattern as seeker, parameterized for hider) ---

function clearPath(ai: HiderAIState): void {
  ai.currentPath = [];
  ai.waypointIndex = 0;
  ai.pendingPath = false;
}

function requestPathTo(ctx: HiderContext, targetX: number, targetY: number): void {
  const { x: fromX, y: fromY } = pixelToTile(ctx.render.x, ctx.render.y);
  const requestId = ++ctx.ai.latestRequestId;
  ctx.ai.pendingPath = true;

  ctx.pathfinding.requestPath(fromX, fromY, targetX, targetY, (path) => {
    if (requestId !== ctx.ai.latestRequestId) return;
    ctx.ai.pendingPath = false;
    if (path && path.length > 1) {
      ctx.ai.currentPath = smoothPath(path, (x, y) => ctx.map.isBlocking(x, y));
      ctx.ai.waypointIndex = 1;
    }
  });
}

function moveAlongPath(ctx: HiderContext, speed: number, dt: number): void {
  const { ai, render } = ctx;
  if (ai.currentPath.length === 0 || ai.waypointIndex >= ai.currentPath.length) return;

  let remaining = speed * dt;

  while (remaining > 0 && ai.waypointIndex < ai.currentPath.length) {
    const wp = ai.currentPath[ai.waypointIndex];
    if (!wp) break;
    const { x: targetX, y: targetY } = tileToPixelCenter(wp.x, wp.y);
    const dx = targetX - render.x;
    const dy = targetY - render.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= remaining) {
      render.x = targetX;
      render.y = targetY;
      remaining -= dist;
      ai.waypointIndex++;
    } else {
      const ratio = remaining / dist;
      render.x += dx * ratio;
      render.y += dy * ratio;
      remaining = 0;
    }
  }

  // Update facing
  if (ai.waypointIndex < ai.currentPath.length) {
    const wp = ai.currentPath[ai.waypointIndex];
    if (wp) {
      const { x: faceX, y: faceY } = tileToPixelCenter(wp.x, wp.y);
      updateHiderFacing(render, faceX, faceY);
    }
  }
}

function updateHiderFacing(render: HiderRenderState, targetX: number, targetY: number): void {
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
  render.facingAngle = Math.atan2(dy, dx);
}

function isPathComplete(ai: HiderAIState): boolean {
  return ai.currentPath.length === 0 || ai.waypointIndex >= ai.currentPath.length;
}

// --- Spot selection ---

/** Pick a random walkable tile. Retries up to 50 attempts, falls back to adjacent tile from spawn. */
export function pickRandomSpot(map: GameMap, spawnX: number, spawnY: number): { x: number; y: number } | null {
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);
    if (map.isWalkable(x, y)) return { x, y };
  }
  // Fallback: adjacent walkable tile from spawn
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
  for (const [dx, dy] of dirs) {
    if (map.isWalkable(spawnX + dx, spawnY + dy)) {
      return { x: spawnX + dx, y: spawnY + dy };
    }
  }
  return null;
}

/** Score a tile as a hiding spot using weighted criteria. */
export function scoreSpot(
  x: number, y: number,
  seekerSpawnX: number, seekerSpawnY: number,
  map: GameMap,
  weights: HiderSpotScoreWeights,
): number {
  // Distance from seeker spawn (higher = better)
  const distX = x - seekerSpawnX;
  const distY = y - seekerSpawnY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  // Adjacent LOS blockers (higher = more cover)
  let losBlockers = 0;
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
  for (const [dx, dy] of dirs) {
    if (map.isBlocking(x + dx, y + dy)) losBlockers++;
  }

  // Escape routes (walkable cardinal neighbors)
  let escapeRoutes = 0;
  for (const [dx, dy] of dirs) {
    if (map.isWalkable(x + dx, y + dy)) escapeRoutes++;
  }

  // Dead-end penalty (1 walkable neighbor)
  const deadEnd = escapeRoutes <= 1 ? 1 : 0;

  // Path exposure: tiles in straight line toward seeker spawn visible (simplified)
  let pathExposure = 0;
  const stepX = seekerSpawnX > x ? 1 : seekerSpawnX < x ? -1 : 0;
  const stepY = seekerSpawnY > y ? 1 : seekerSpawnY < y ? -1 : 0;
  let cx = x + stepX;
  let cy = y + stepY;
  for (let i = 0; i < 5; i++) {
    if (!map.isWalkable(cx, cy)) break;
    if (!map.isBlocking(cx, cy)) pathExposure++;
    cx += stepX;
    cy += stepY;
  }

  return (
    weights.distance * distance +
    weights.losBlockers * losBlockers +
    weights.escapeRoutes * escapeRoutes +
    weights.deadEndPenalty * deadEnd +
    weights.pathExposure * pathExposure
  );
}

/** Pick the best hiding spot (Medium/Hard). Tiebreak: random among top 3. */
export function pickScoredSpot(
  map: GameMap,
  seekerSpawnX: number, seekerSpawnY: number,
  weights: HiderSpotScoreWeights,
  previousSpots: ReadonlyArray<{ x: number; y: number }>,
): { x: number; y: number } | null {
  const candidates: Array<{ x: number; y: number; score: number }> = [];

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (!map.isWalkable(x, y)) continue;
      // Skip previous spots
      if (previousSpots.some(p => p.x === x && p.y === y)) continue;
      const score = scoreSpot(x, y, seekerSpawnX, seekerSpawnY, map, weights);
      candidates.push({ x, y, score });
    }
  }

  if (candidates.length === 0) return null;

  // Sort descending by score, pick random among top 3
  candidates.sort((a, b) => b.score - a.score);
  const top = Math.min(3, candidates.length);
  const pick = candidates[Math.floor(Math.random() * top)];
  return pick ? { x: pick.x, y: pick.y } : null;
}

// --- Hider FOV (Hard only) ---

function updateHiderFov(ctx: HiderContext): void {
  const tile = pixelToTile(ctx.render.x, ctx.render.y);
  if (
    tile.x === ctx.ai.lastFovTileX &&
    tile.y === ctx.ai.lastFovTileY &&
    ctx.doorGeneration === ctx.ai.lastFovDoorGen
  ) return;

  ctx.ai.lastFovTileX = tile.x;
  ctx.ai.lastFovTileY = tile.y;
  ctx.ai.lastFovDoorGen = ctx.doorGeneration;
  ctx.hiderFov.fill(0);
  computeFOV(
    tile.x, tile.y,
    6, // hider vision range (same as player)
    (x, y) => ctx.map.isBlocking(x, y),
    ctx.hiderFov, ctx.map.width, ctx.map.height,
  );
}

// --- Flee logic (Hard only) ---

function isSeekerInHiderFov(ctx: HiderContext): boolean {
  const seekerTile = pixelToTile(ctx.seekerX, ctx.seekerY);
  const idx = seekerTile.y * ctx.map.width + seekerTile.x;
  return ctx.hiderFov[idx] === 1;
}

function seekerDistToHider(ctx: HiderContext): number {
  // Destructure immediately — pixelToTile returns reused singleton
  const { x: hx, y: hy } = pixelToTile(ctx.render.x, ctx.render.y);
  const { x: sx, y: sy } = pixelToTile(ctx.seekerX, ctx.seekerY);
  const dx = sx - hx;
  const dy = sy - hy;
  return Math.sqrt(dx * dx + dy * dy);
}

function findEscapeDirection(ctx: HiderContext): { x: number; y: number } | null {
  // Destructure immediately — pixelToTile returns reused singleton
  const { x: hx, y: hy } = pixelToTile(ctx.render.x, ctx.render.y);
  const { x: sx, y: sy } = pixelToTile(ctx.seekerX, ctx.seekerY);
  const awayAngle = Math.atan2(hy - sy, hx - sx);

  // Score 4 cardinal directions
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  let bestDir: { x: number; y: number } | null = null;
  let bestScore = -Infinity;

  for (const dir of dirs) {
    // Check if direction is walkable
    if (!ctx.map.isWalkable(hx + dir.dx, hy + dir.dy)) continue;

    const dirAngle = Math.atan2(dir.dy, dir.dx);
    let angleDiff = Math.abs(dirAngle - awayAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    const angleScore = (Math.PI - angleDiff) / Math.PI; // 1.0 = directly away, 0.0 = toward

    // Check for cover within 3 tiles in this direction
    let hasCover = false;
    for (let i = 1; i <= 3; i++) {
      const checkX = hx + dir.dx * i;
      const checkY = hy + dir.dy * i;
      if (ctx.map.isBlocking(checkX, checkY)) {
        hasCover = true;
        break;
      }
      if (!ctx.map.isWalkable(checkX, checkY)) break;
    }

    const score = angleScore * 2 + (hasCover ? 3 : 0);
    if (score > bestScore) {
      bestScore = score;
      // Target: first walkable tile in this direction that has cover nearby
      let targetX = hx + dir.dx;
      let targetY = hy + dir.dy;
      for (let i = 2; i <= 3; i++) {
        const nx = hx + dir.dx * i;
        const ny = hy + dir.dy * i;
        if (!ctx.map.isWalkable(nx, ny)) break;
        targetX = nx;
        targetY = ny;
      }
      bestDir = { x: targetX, y: targetY };
    }
  }

  return bestDir;
}

// --- State transition helper ---

function transitionTo(ctx: HiderContext, newState: HiderFSMState): void {
  const oldState = ctx.ai.fsmState;
  if (oldState === newState) return;
  ctx.ai.fsmState = newState;
  ctx.render.fsmState = newState;
  ctx.emitter.emit('HIDER_STATE_CHANGED', { oldState, newState });
}

// --- Main update function ---

/** Called during countdown phase to pick a spot and move there. */
export function updateHiderCountdown(
  ctx: HiderContext,
  seekerSpawnX: number, seekerSpawnY: number,
  dt: number,
): void {
  const { ai, config } = ctx;

  if (ai.fsmState !== 'countdown-moving') return;

  // Pick a spot if we don't have one
  if (!ai.chosenSpot && !ai.pendingPath) {
    const hiderTile = pixelToTile(ctx.render.x, ctx.render.y);
    let spot: { x: number; y: number } | null;

    if (config.evaluatesSpots) {
      spot = pickScoredSpot(ctx.map, seekerSpawnX, seekerSpawnY, config.spotScoreWeights, ai.previousSpots);
    } else {
      spot = pickRandomSpot(ctx.map, hiderTile.x, hiderTile.y);
    }

    if (spot) {
      ai.chosenSpot = spot;
      requestPathTo(ctx, spot.x, spot.y);
    }
    return;
  }

  // Move along path
  if (!isPathComplete(ai)) {
    moveAlongPath(ctx, config.speed, dt);
  }

  // Arrived at spot
  if (isPathComplete(ai) && ai.chosenSpot && !ai.pendingPath) {
    clearPath(ai);
    // Record this spot in the ring buffer
    ai.previousSpots.push({ ...ai.chosenSpot });
    if (ai.previousSpots.length > 3) {
      ai.previousSpots.length = 0; // SF-23: clear when full
    }
    transitionTo(ctx, 'hiding');
  }
}

/** Called during hunt phase — handles hiding, fleeing, repositioning (Hard only). */
export function updateHiderHunt(ctx: HiderContext, dt: number): void {
  const { ai, config } = ctx;

  // Easy/Medium: stay hidden, do nothing
  if (!config.usesFov) return;

  // Hard hider logic
  updateHiderFov(ctx);

  // Track seeker distance history
  ai.prevSeekerDist = ai.lastSeekerDist;
  ai.lastSeekerDist = seekerDistToHider(ctx);

  switch (ai.fsmState) {
    case 'hiding':
      handleHiding(ctx);
      break;
    case 'fleeing':
      handleFleeing(ctx, dt);
      break;
    case 'repositioning':
      handleRepositioning(ctx);
      break;
    default:
      // countdown-moving during hunt = late arrival, keep moving
      if (!isPathComplete(ai)) {
        moveAlongPath(ctx, config.speed, dt);
      } else {
        transitionTo(ctx, 'hiding');
      }
  }
}

function handleHiding(ctx: HiderContext): void {
  const { ai, config } = ctx;

  // Check compound flee trigger (all must be true)
  if (!isSeekerInHiderFov(ctx)) return;
  if (ai.lastSeekerDist > config.repositionTriggerRange) return;
  if (ai.lastSeekerDist >= ai.prevSeekerDist) return; // moving away = don't flee
  if (ai.repositionsUsed >= config.maxRepositionsPerRound) return;

  const escape = findEscapeDirection(ctx);
  if (!escape) return; // SF-22: no escape = stay hidden (deliberate)

  // Start fleeing
  clearPath(ai);
  requestPathTo(ctx, escape.x, escape.y);
  ai.repositionsUsed++;
  ai.currentRepositionDelay += config.repositionDelayIncrementTicks;
  transitionTo(ctx, 'fleeing');
}

function handleFleeing(ctx: HiderContext, dt: number): void {
  const { ai, config } = ctx;

  if (!isPathComplete(ai)) {
    moveAlongPath(ctx, config.speed, dt);

    // Hard hider: close doors behind when fleeing
    if (config.usesDoors && ctx.doorSystem) {
      const { x: htx, y: hty } = pixelToTile(ctx.render.x, ctx.render.y);
      const door = ctx.doorSystem.getDoorAt(htx, hty);
      if (door && door.isOpen) {
        // Only close if seeker is > 3 tiles behind
        const { x: stx, y: sty } = pixelToTile(ctx.seekerX, ctx.seekerY);
        const dx = stx - htx;
        const dy = sty - hty;
        const seekerDist = Math.sqrt(dx * dx + dy * dy);
        if (seekerDist > 3) {
          const entities = [{ x: ctx.render.x, y: ctx.render.y }];
          if (ctx.doorSystem.canToggleDoor(door, entities, ctx.currentTick)) {
            ctx.doorSystem.toggleDoor(door.id, ctx.currentTick);
            // SF-21: if canToggleDoor returns false, don't assume closed
          }
        }
      }
    }
  } else {
    // Arrived at escape destination — brief pause
    clearPath(ai);
    transitionTo(ctx, 'repositioning');
  }
}

function handleRepositioning(ctx: HiderContext): void {
  const { ai } = ctx;

  // Wait for diminishing-returns delay
  if (ai.currentRepositionDelay > 0) {
    ai.currentRepositionDelay--;
    return;
  }

  // Find a new spot
  const seekerTile = pixelToTile(ctx.seekerX, ctx.seekerY);
  const newSpot = pickScoredSpot(
    ctx.map, seekerTile.x, seekerTile.y,
    ctx.config.spotScoreWeights, ai.previousSpots,
  );

  if (newSpot) {
    ai.chosenSpot = newSpot;
    requestPathTo(ctx, newSpot.x, newSpot.y);
  }

  transitionTo(ctx, 'hiding');
}
