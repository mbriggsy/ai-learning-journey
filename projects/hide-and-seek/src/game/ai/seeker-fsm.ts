import type { FSMState } from '../../types/fsm.js';
import type { SeekerConfig, PathPoint, RoomDefinition, HidingSpot } from '../../types/ai.js';
import type { SeekerRenderState, SeekerFSMState, DoorId, DoorState } from '../../types/state.js';
import type { GameEventMap } from '../../types/events.js';
import type { TypedEmitter } from '../../types/events.js';
import type { PathfindingInstance } from './pathfinding.js';
import type { GameMap } from '../../types/state.js';
import type { DoorSystem } from '../doors.js';
import type { StimulusKind } from '../../types/ai.js';
import { STATE_PRIORITY } from '../../types/ai.js';
import { ActionQueue } from './actions.js';
import { PatrolState } from './states/patrol-state.js';
import { SuspiciousState } from './states/suspicious-state.js';
import { SearchState } from './states/search-state.js';
import { ChaseState } from './states/chase-state.js';
import { RoomTracker } from './room-tracking.js';
import { EvidenceTracker } from './evidence.js';
import { pixelToTile, tileToPixelCenter } from '../map.js';
import { INTERACTION } from '../../constants.js';
import { smoothPath } from './path-smoothing.js';
import { DOOR } from '../../constants.js';

// --- Seeker context (shared with all state classes) ---

export interface SeekerContext {
  readonly config: SeekerConfig;
  readonly pathfinding: PathfindingInstance;
  readonly map: GameMap;
  readonly rooms: readonly RoomDefinition[];
  readonly hidingSpots: readonly HidingSpot[];
  readonly emitter: TypedEmitter<GameEventMap>;
  render: SeekerRenderState;
  ai: SeekerAIInternalState;
  actionQueue: ActionQueue;
  doorSystem: DoorSystem | null;
  currentTick: number;
}

export interface SeekerAIInternalState {
  currentPath: PathPoint[];
  waypointIndex: number;
  latestRequestId: number;
  lastFovTileX: number;
  lastFovTileY: number;
  lastFovDoorGeneration: number;
  pendingDoorEvidence: Array<{ id: DoorId; position: { x: number; y: number }; isOpen: boolean }>;
  menaceTicks: number;
  menaceCooldownTicks: number;
  lastKnownHiderPos: { x: number; y: number } | null;
  chaseLostTicks: number;
  chaseRepathCounter: number;
  patrolPauseTicks: number;
  roomTracker: RoomTracker | null;
  evidenceTracker: EvidenceTracker | null;
  pendingPath: boolean;
  suspiciousCooldowns: Map<StimulusKind, number>;
}

/** Valid FSM transitions. Invalid transitions are logged and ignored. */
const VALID_TRANSITIONS: Record<SeekerFSMState, readonly SeekerFSMState[]> = {
  patrol: ['chase', 'suspicious'],
  suspicious: ['chase', 'search', 'patrol'],
  search: ['chase', 'patrol'],
  chase: ['search', 'patrol'],
} as const;

// --- FSM Runner ---

export class SeekerFSM {
  private currentState: FSMState<SeekerContext>;
  private currentStateName: SeekerFSMState;
  private pendingTransition: { target: SeekerFSMState; ticksRemaining: number } | null = null;
  private readonly states: Record<SeekerFSMState, FSMState<SeekerContext>>;

  constructor() {
    this.states = {
      patrol: new PatrolState(),
      suspicious: new SuspiciousState(),
      search: new SearchState(),
      chase: new ChaseState(),
    };
    this.currentState = this.states.patrol;
    this.currentStateName = 'patrol';
  }

  getStateName(): SeekerFSMState {
    return this.currentStateName;
  }

  getPendingTransition(): { target: SeekerFSMState; ticksRemaining: number } | null {
    return this.pendingTransition;
  }

  /**
   * Request a transition. Higher-priority states overwrite pending lower-priority ones.
   * ticksRemaining = 0 means immediate.
   */
  requestTransition(target: SeekerFSMState, ticksRemaining: number): void {
    // Priority check: higher overwrites pending
    if (this.pendingTransition) {
      if (STATE_PRIORITY[target]! <= STATE_PRIORITY[this.pendingTransition.target]!) {
        return; // pending has equal or higher priority
      }
    }

    // Validate transition is legal
    if (!VALID_TRANSITIONS[this.currentStateName]!.includes(target)) {
      console.error(`SeekerFSM: invalid transition ${this.currentStateName} → ${target}`);
      return;
    }

    this.pendingTransition = { target, ticksRemaining };
  }

  /** Cancel pending transition (e.g., brief glimpse on Easy). */
  cancelPending(): void {
    this.pendingTransition = null;
  }

  /**
   * Main FSM update. Process pending transition, then delegate to current state.
   * Max ONE transition per tick. Try-catch on onUpdate for error boundary.
   */
  update(ctx: SeekerContext, dt: number): void {
    // Terminal guard — no logic after game over
    const flow = ctx.render.fsmState; // stale name for terminal check isn't right
    // We rely on the engine not calling us after game over

    // Menace cooldown: suppress CHASE transitions
    if (ctx.ai.menaceCooldownTicks > 0) {
      ctx.ai.menaceCooldownTicks--;
      if (this.pendingTransition?.target === 'chase') {
        this.pendingTransition = null;
      }
    }

    // Process pending transition
    let transitioned = false;
    if (this.pendingTransition) {
      this.pendingTransition.ticksRemaining--;
      if (this.pendingTransition.ticksRemaining <= 0) {
        transitioned = this.executeTransition(ctx, this.pendingTransition.target);
      }
    }

    // Only run state update if we didn't just transition
    if (!transitioned) {
      try {
        this.currentState.onUpdate(ctx, dt);
      } catch (e) {
        console.error(`SeekerFSM: onUpdate error in ${this.currentStateName}, fallback to PATROL`, e);
        this.executeTransition(ctx, 'patrol');
      }
    }
  }

  /** Force transition (e.g., menace gauge). Bypasses pending. */
  forceTransition(ctx: SeekerContext, target: SeekerFSMState): void {
    this.pendingTransition = null;
    this.executeTransition(ctx, target);
  }

  private executeTransition(ctx: SeekerContext, target: SeekerFSMState): boolean {
    const oldState = this.currentStateName;

    try {
      this.currentState.onExit(ctx);
    } catch (e) {
      console.error(`SeekerFSM: onExit error in ${oldState}`, e);
    }

    this.currentStateName = target;
    this.currentState = this.states[target]!;
    ctx.render.fsmState = target;

    try {
      this.currentState.onEnter(ctx);
    } catch (e) {
      console.error(`SeekerFSM: onEnter error in ${target}, fallback to PATROL`, e);
      this.currentStateName = 'patrol';
      this.currentState = this.states.patrol!;
      ctx.render.fsmState = 'patrol';
      this.currentState.onEnter(ctx);
    }

    this.pendingTransition = null;
    ctx.emitter.emit('SEEKER_STATE_CHANGED', { oldState, newState: this.currentStateName });
    return true;
  }
}

// --- Shared utilities used by state classes ---

export function pickRandomWalkableTile(map: GameMap): { x: number; y: number } | null {
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);
    if (map.isWalkable(x, y)) return { x, y };
  }
  return null;
}

export function clearPath(ai: SeekerAIInternalState): void {
  ai.currentPath = [];
  ai.waypointIndex = 0;
  ai.pendingPath = false;
}

export function requestPathTo(
  ctx: SeekerContext,
  targetX: number,
  targetY: number,
): void {
  const { x: fromX, y: fromY } = pixelToTile(ctx.render.x, ctx.render.y);
  const requestId = ++ctx.ai.latestRequestId;
  // Assumption: pathfinding callback is guaranteed to fire (even on error).
  // If it doesn't, pendingPath stays true and the seeker freezes.
  ctx.ai.pendingPath = true;

  ctx.pathfinding.requestPath(
    fromX, fromY, targetX, targetY,
    (path) => {
      // Supersession guard: ignore stale callbacks
      if (requestId !== ctx.ai.latestRequestId) return;
      ctx.ai.pendingPath = false;
      if (path && path.length > 1) {
        ctx.ai.currentPath = smoothPath(path, (x, y) => ctx.map.isBlocking(x, y));
        ctx.ai.waypointIndex = 1; // skip start tile
      }
    },
  );
}

export function moveAlongPath(
  ctx: SeekerContext,
  speed: number,
  dt: number,
): void {
  const { ai, render } = ctx;
  if (ai.currentPath.length === 0 || ai.waypointIndex >= ai.currentPath.length) return;

  // Per-tick LOS validation: check if next waypoint is still reachable (door changes)
  const nextWp = ai.currentPath[ai.waypointIndex];
  if (nextWp && ctx.map.isBlocking(nextWp.x, nextWp.y)) {
    // Path invalidated by door change — discard and re-request
    clearPath(ai);
    return;
  }

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

  // Update facing based on movement toward current waypoint
  if (ai.waypointIndex < ai.currentPath.length) {
    const wp = ai.currentPath[ai.waypointIndex];
    if (wp) {
      const { x: faceX, y: faceY } = tileToPixelCenter(wp.x, wp.y);
      updateFacing(render, faceX, faceY);
    }
  }
}

export function updateFacing(render: SeekerRenderState, targetX: number, targetY: number): void {
  const dx = targetX - render.x;
  const dy = targetY - render.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 0.001 && ay < 0.001) return;

  // Update discrete facing
  if (ax >= ay) {
    render.facing = dx > 0 ? 'right' : 'left';
  } else {
    render.facing = dy > 0 ? 'down' : 'up';
  }

  // Update continuous facing angle (radians)
  render.facingAngle = Math.atan2(dy, dx);
}

export function isPathComplete(ai: SeekerAIInternalState): boolean {
  return ai.currentPath.length === 0 || ai.waypointIndex >= ai.currentPath.length;
}

export function checkDoorOnPath(ctx: SeekerContext): boolean {
  if (!ctx.doorSystem) return false;
  const { ai, render } = ctx;
  if (ai.waypointIndex >= ai.currentPath.length) return false;
  const wp = ai.currentPath[ai.waypointIndex];
  if (!wp) return false;

  const door = ctx.doorSystem.getDoorAt(wp.x, wp.y);
  if (!door || door.isOpen) return false;

  // Only open door when seeker is within interaction range
  const seekerTile = pixelToTile(render.x, render.y);
  const dx = door.position.x - seekerTile.x;
  const dy = door.position.y - seekerTile.y;
  if (dx * dx + dy * dy > INTERACTION.DOOR_RANGE * INTERACTION.DOOR_RANGE) return false;

  // Closed door on path, seeker is adjacent — push action sequence
  ctx.actionQueue.clear();
  ctx.actionQueue.push(
    { type: 'OPEN_DOOR', doorId: door.id },
    { type: 'WAIT', ticksRemaining: DOOR.OPEN_WAIT_TICKS },
  );

  return true;
}
