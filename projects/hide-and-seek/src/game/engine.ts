import type { InputState } from '../types/input.js';
import type { GameState, PlayingState, MutablePlayingState, CountdownPhase, HuntPhase, DoorId } from '../types/state.js';
import type { ReadonlyDeep } from '../types/utility.js';
import type { GameEventMap } from '../types/events.js';
import type { TypedEmitter, TypedListener } from '../types/events.js';
import type { SeekerConfig, RoomDefinition, HidingSpot } from '../types/ai.js';
import type { Difficulty } from '../types/settings.js';
import { SIMULATION, VISION, SEEKER, INTERACTION, TIMERS, DOOR } from '../constants.js';
import { updateMovement } from './movement.js';
import { computeFOV } from './los.js';
import { checkDetection } from './detection.js';
import { evaluateRules } from './rules.js';
import { createTypedEmitter } from './events.js';
import { PathfindingSystem } from './ai/pathfinding.js';
import { SeekerFSM, clearPath } from './ai/seeker-fsm.js';
import type { SeekerContext, SeekerAIInternalState } from './ai/seeker-fsm.js';
import { ActionQueue } from './ai/actions.js';
import { SEEKER_CONFIGS } from './ai/seeker-configs.js';
import { RoomTracker } from './ai/room-tracking.js';
import { EvidenceTracker } from './ai/evidence.js';
import { SuspiciousState } from './ai/states/suspicious-state.js';
import { pixelToTile } from './map.js';
import type { DoorSystem } from './doors.js';

function createSeekerAIInternal(seekerX: number, seekerY: number, config: SeekerConfig, difficulty: Difficulty): SeekerAIInternalState {
  const { x: tileX, y: tileY } = pixelToTile(seekerX, seekerY);
  return {
    currentPath: [],
    waypointIndex: 0,
    latestRequestId: 0,
    lastFovTileX: tileX,
    lastFovTileY: tileY,
    lastFovDoorGeneration: -1,
    pendingDoorEvidence: [],
    menaceTicks: 0,
    menaceCooldownTicks: 0,
    lastKnownHiderPos: null,
    chaseLostTicks: 0,
    chaseRepathCounter: 0,
    patrolPauseTicks: 0,
    pendingPath: false,
    roomTracker: (config.patrolStrategy !== 'random') ? new RoomTracker() : null,
    evidenceTracker: null, // set at hunt start for Hard AI
    suspiciousCooldowns: new Map(),
  };
}

export class GameEngine {
  private state: GameState;
  private accumulator: number = 0;
  private paused: boolean = false;
  private justResumed: boolean = false;
  private disposed: boolean = false;
  private readonly emitter: TypedEmitter<GameEventMap>;
  private readonly pathfinding: PathfindingSystem;
  private seekerFSM: SeekerFSM | null = null;
  private seekerCtx: SeekerContext | null = null;
  private readonly seekerConfig: SeekerConfig;
  private readonly difficulty: Difficulty;
  private collisionGrid: Uint8Array | null = null;
  private lastPlayerFovTileX: number = -1;
  private lastPlayerFovTileY: number = -1;
  private lastPlayerFovDoorGen: number = -1;
  private lastSeekerFovDoorGen: number = -1;
  private doorSystem: DoorSystem | null = null;
  private currentTick: number = 0;
  private rooms: RoomDefinition[] = [];
  private hidingSpots: HidingSpot[] = [];

  constructor(initialState: GameState, difficulty: Difficulty = 'easy') {
    this.state = initialState;
    this.emitter = createTypedEmitter<GameEventMap>();
    this.pathfinding = new PathfindingSystem();
    this.difficulty = difficulty;
    this.seekerConfig = SEEKER_CONFIGS[difficulty];

    if (initialState.phase === 'playing') {
      this.initPlayingSystems(initialState);
    }
  }

  /** Set rooms and hiding spots (called by Game scene after map load). */
  setRooms(rooms: RoomDefinition[], hidingSpots: HidingSpot[]): void {
    this.rooms = rooms;
    this.hidingSpots = hidingSpots;
    if (this.seekerCtx) {
      (this.seekerCtx as unknown as { rooms: RoomDefinition[] }).rooms = rooms;
      (this.seekerCtx as unknown as { hidingSpots: HidingSpot[] }).hidingSpots = hidingSpots;
    }
  }

  /** Set door system after construction (engine's emitter must exist first) */
  setDoorSystem(doorSystem: DoorSystem): void {
    this.doorSystem = doorSystem;

    // Sync door state into PlayingState
    if (this.state.phase === 'playing') {
      const s = this.state as MutablePlayingState;
      (s as { doors: ReadonlyMap<string, unknown> }).doors = doorSystem.getDoors();

      // Set initial door costs for pathfinding
      for (const door of doorSystem.getDoors().values()) {
        if (!door.isOpen) {
          this.pathfinding.setDoorCost(door.position.x, door.position.y, DOOR.PATHFINDING_COST);
        }
      }

      // Wire into seeker context
      if (this.seekerCtx) {
        this.seekerCtx.doorSystem = doorSystem;
      }

      // Subscribe to DOOR_TOGGLED for evidence pipeline (record, don't act)
      this.emitter.on('DOOR_TOGGLED', (payload) => {
        if (this.seekerCtx) {
          this.seekerCtx.ai.pendingDoorEvidence.push({
            id: payload.id,
            position: payload.position,
            isOpen: payload.isOpen,
          });
        }
      });
    }
  }

  private initPlayingSystems(playing: PlayingState): void {
    // Build collision grid for pathfinding from the map
    const { width, height } = playing.map;
    this.collisionGrid = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.collisionGrid[y * width + x] = playing.map.isWalkable(x, y) ? 0 : 1;
      }
    }
    this.pathfinding.initGrid(this.collisionGrid, width, height);

    // Create FSM + context
    this.seekerFSM = new SeekerFSM();
    const aiState = createSeekerAIInternal(playing.seeker.x, playing.seeker.y, this.seekerConfig, this.difficulty);

    this.seekerCtx = {
      config: this.seekerConfig,
      pathfinding: this.pathfinding,
      map: playing.map,
      rooms: this.rooms,
      hidingSpots: this.hidingSpots,
      emitter: this.emitter,
      render: playing.seeker,
      ai: aiState,
      actionQueue: new ActionQueue(),
      doorSystem: this.doorSystem,
      currentTick: 0,
    };
  }

  getDoorSystem(): DoorSystem | null {
    return this.doorSystem;
  }

  tick(deltaMs: number, input: InputState): void {
    if (this.disposed || this.paused) return;
    if (this.justResumed) {
      this.justResumed = false;
      this.accumulator = 0;
      return;
    }
    deltaMs = this.guardDelta(deltaMs);
    this.accumulator += deltaMs;

    // Pre-frame: process queued EasyStar paths
    this.pathfinding.calculate();

    const stepMs = SIMULATION.FIXED_STEP_S * 1000;
    let ticks = 0;
    while (this.accumulator >= stepMs && ticks < SIMULATION.MAX_CATCHUP_TICKS) {
      this.fixedUpdate(SIMULATION.FIXED_STEP_S, input);
      this.accumulator -= stepMs;
      ticks++;
    }
    if (ticks === SIMULATION.MAX_CATCHUP_TICKS) {
      this.accumulator = 0;
    }
  }

  getState(): ReadonlyDeep<GameState> {
    return this.state;
  }

  getEmitter(): TypedListener<GameEventMap> {
    return this.emitter;
  }

  /** Full emitter (with emit) — for internal systems like DoorSystem */
  getEmitterInternal(): TypedEmitter<GameEventMap> {
    return this.emitter;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.justResumed = true;
  }

  isPaused(): boolean {
    return this.paused;
  }

  dispose(): void {
    this.disposed = true;
    this.pathfinding.cancelAll();
    this.emitter.offAll();
  }

  /** Canonical fixedUpdate ordering (Phase 5a, 9 steps) */
  private fixedUpdate(dt: number, input: InputState): void {
    if (this.state.phase !== 'playing') return;
    const s = this.state as MutablePlayingState;
    this.currentTick++;
    if (this.seekerCtx) this.seekerCtx.currentTick = this.currentTick;

    // Terminal guard — no logic after game over
    if (s.gameFlow.kind === 'found' || s.gameFlow.kind === 'survived') return;

    // Door interaction — allowed during COUNTDOWN and HUNT
    if (s.gameFlow.kind === 'countdown' || s.gameFlow.kind === 'hunt') {
      this.handleDoorInteraction(s, input);
    }

    if (s.gameFlow.kind === 'countdown') {
      updateMovement(s.player, s.map, input, dt);
      (s.gameFlow as CountdownPhase).ticksRemaining--;

      const next = evaluateRules(s.gameFlow, 'none');
      if (next) {
        s.gameFlow = next;
        s.playerFov.fill(0);
        this.lastPlayerFovTileX = -1;
        this.lastPlayerFovTileY = -1;

        // Hunt started — initialize Hard AI evidence tracker
        if (this.seekerCtx && this.difficulty === 'hard' && this.doorSystem) {
          this.seekerCtx.ai.evidenceTracker = new EvidenceTracker(
            this.doorSystem.getDoors(), this.currentTick,
          );
        }

        this.emitter.emit('PHASE_CHANGED', next.kind);
      }
      return;
    }

    // === HUNT PHASE — canonical 9-step ordering ===

    // Step 1: Process pending door evidence
    if (this.seekerCtx) {
      this.processDoorEvidence();
    }

    // Step 2: Player movement
    const prevX = s.player.x;
    const prevY = s.player.y;
    updateMovement(s.player, s.map, input, dt);

    // Step 2b: Distance tracking
    const dx = s.player.x - prevX;
    const dy = s.player.y - prevY;
    if (dx !== 0 || dy !== 0) {
      s.stats.distanceTraveled += Math.hypot(dx, dy);
    }

    // Step 3: Door interactions (already handled above)

    // Step 4: Map state updates (LOS blocking via DoorSystem — implicit)

    // Step 5: Seeker FOV
    const doorGen = this.doorSystem ? this.doorSystem.getDoorGeneration() : 0;
    const seekerTile = pixelToTile(s.seeker.x, s.seeker.y);
    if (this.seekerCtx && (
      seekerTile.x !== this.seekerCtx.ai.lastFovTileX ||
      seekerTile.y !== this.seekerCtx.ai.lastFovTileY ||
      doorGen !== this.lastSeekerFovDoorGen
    )) {
      this.seekerCtx.ai.lastFovTileX = seekerTile.x;
      this.seekerCtx.ai.lastFovTileY = seekerTile.y;
      this.lastSeekerFovDoorGen = doorGen;
      s.seekerFov.fill(0);
      computeFOV(
        seekerTile.x, seekerTile.y,
        this.seekerConfig.visionRange,
        (x, y) => s.map.isBlocking(x, y),
        s.seekerFov, s.map.width, s.map.height,
      );
    }

    // Step 6: Player FOV
    const playerTile = pixelToTile(s.player.x, s.player.y);
    if (
      playerTile.x !== this.lastPlayerFovTileX ||
      playerTile.y !== this.lastPlayerFovTileY ||
      doorGen !== this.lastPlayerFovDoorGen
    ) {
      this.lastPlayerFovTileX = playerTile.x;
      this.lastPlayerFovTileY = playerTile.y;
      this.lastPlayerFovDoorGen = doorGen;
      s.playerFov.fill(0);
      computeFOV(
        playerTile.x, playerTile.y,
        VISION.HIDER_RANGE,
        (x, y) => s.map.isBlocking(x, y),
        s.playerFov, s.map.width, s.map.height,
      );
    }

    // Step 7: Detection (with vision cone)
    const detection = checkDetection(
      s.seeker.x, s.seeker.y,
      s.player.x, s.player.y,
      s.seekerFov, s.map.width,
      s.seeker.facingAngle,
      this.seekerConfig.visionConeAngle,
    );

    // Step 8: Seeker AI (FSM tick + detection → transition requests)
    if (this.seekerFSM && this.seekerCtx) {
      this.updateSeekerWithDetection(detection, s, dt);
    }

    // Step 9: Rules evaluation (timers, game over)
    (s.gameFlow as HuntPhase).ticksRemaining--;
    (s.gameFlow as HuntPhase).ticksElapsed++;

    // Sonar ping timer
    const hunt = s.gameFlow as HuntPhase;
    hunt.sonarTicksUntilPing--;
    if (hunt.sonarTicksUntilPing <= 0) {
      this.emitter.emit('SONAR_PING_DUE', {
        seekerX: s.seeker.x,
        seekerY: s.seeker.y,
      });
      hunt.sonarTicksUntilPing = Math.round(TIMERS.SONAR_PING_INTERVAL_S / SIMULATION.FIXED_STEP_S);
    }

    const next = evaluateRules(s.gameFlow, detection);
    if (next) {
      s.gameFlow = next;
      this.emitter.emit('PHASE_CHANGED', next.kind);
    }
  }

  /** Process detection results and drive FSM transitions. */
  private updateSeekerWithDetection(
    detection: 'none' | 'spotted' | 'found',
    s: MutablePlayingState,
    dt: number,
  ): void {
    const fsm = this.seekerFSM!;
    const ctx = this.seekerCtx!;
    const { ai, config } = ctx;

    // Update LKP when hider visible
    if (detection === 'spotted' || detection === 'found') {
      const hiderTile = pixelToTile(s.player.x, s.player.y);
      ai.lastKnownHiderPos = { x: hiderTile.x, y: hiderTile.y };
      ai.chaseLostTicks = 0;
    }

    const currentState = fsm.getStateName();

    // Detection → CHASE transition logic
    if (detection === 'spotted' || detection === 'found') {
      if (currentState !== 'chase') {
        fsm.requestTransition('chase', config.reactionDelayTicks);
      }
    } else {
      // No detection — handle brief glimpse and chase timeout
      if (currentState === 'chase' || fsm.getPendingTransition()?.target === 'chase') {
        // Brief glimpse: Easy cancels pending CHASE → SUSPICIOUS
        if (config.cancelChaseOnBriefGlimpse && fsm.getPendingTransition()?.target === 'chase') {
          fsm.cancelPending();
          if (ai.lastKnownHiderPos) {
            SuspiciousState.setStimulus(ai.lastKnownHiderPos.x, ai.lastKnownHiderPos.y);
            fsm.requestTransition('suspicious', 0);
          }
        }

        // Chase timeout
        if (currentState === 'chase') {
          ai.chaseLostTicks++;
          if (ai.chaseLostTicks > config.chaseGraceTicks) {
            // Past grace period — start real timeout countdown
            if (ai.chaseLostTicks - config.chaseGraceTicks >= config.chaseTimeoutTicks) {
              // Transition to SEARCH at LKP
              if (ai.lastKnownHiderPos) {
                fsm.requestTransition('search', 0);
              } else {
                fsm.requestTransition('patrol', 0);
              }
            }
          }
        }
      }
    }

    // Process action queue (door opening, LOOK_AROUND, etc.)
    if (!ctx.actionQueue.isEmpty() && ctx.doorSystem) {
      this.processActionQueue(ctx, dt);
    } else {
      // FSM update
      fsm.update(ctx, dt);
    }

    // Sync render state (FSM may have changed fsmState directly via state.onUpdate)
    // The FSM states set ctx.render.fsmState when they want a transition
    // We detect this and execute through the FSM properly
    if (ctx.render.fsmState !== fsm.getStateName()) {
      const desired = ctx.render.fsmState;
      ctx.render.fsmState = fsm.getStateName(); // revert
      fsm.forceTransition(ctx, desired);
    }
  }

  /** Process action queue items. */
  private processActionQueue(ctx: SeekerContext, dt: number): void {
    const action = ctx.actionQueue.current;
    if (!action) return;

    switch (action.type) {
      case 'OPEN_DOOR':
        if (ctx.doorSystem) {
          ctx.doorSystem.setDoorState(action.doorId, true, ctx.currentTick);
          const door = ctx.doorSystem.getDoors().get(action.doorId);
          if (door) {
            ctx.pathfinding.removeDoorCost(door.position.x, door.position.y);
          }
          // Track self-opened for evidence
          if (ctx.ai.evidenceTracker) {
            ctx.ai.evidenceTracker.recordSelfOpen(action.doorId);
          }
        }
        ctx.actionQueue.shift();
        break;

      case 'WAIT':
        action.ticksRemaining--;
        if (action.ticksRemaining <= 0) ctx.actionQueue.shift();
        break;

      case 'MOVE_TO': {
        const { x: targetX, y: targetY } = pixelToTile(0, 0); // dummy — use tileToPixelCenter
        const moveTarget = { x: action.targetX * 32 + 16, y: action.targetY * 32 + 16 };
        const ddx = moveTarget.x - ctx.render.x;
        const ddy = moveTarget.y - ctx.render.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 2) {
          ctx.actionQueue.shift();
        } else {
          const speed = ctx.config.patrolSpeed * dt;
          const ratio = Math.min(1, speed / dist);
          ctx.render.x += ddx * ratio;
          ctx.render.y += ddy * ratio;
        }
        break;
      }

      case 'REQUEST_PATH': {
        const { x: fromX, y: fromY } = pixelToTile(ctx.render.x, ctx.render.y);
        const reqId = ++ctx.ai.latestRequestId;
        ctx.pathfinding.requestPath(
          fromX, fromY, action.targetX, action.targetY,
          (path) => {
            if (reqId !== ctx.ai.latestRequestId) return;
            if (path && path.length > 1) {
              ctx.ai.currentPath = path;
              ctx.ai.waypointIndex = 1;
            }
          },
        );
        ctx.actionQueue.shift();
        break;
      }

      case 'LOOK_AROUND': {
        action.ticksRemaining--;
        if (action.facingsRemaining.length > 0) {
          const dir = action.facingsRemaining[0];
          if (dir) {
            ctx.render.facing = dir;
            const angleMap = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 } as const;
            ctx.render.facingAngle = angleMap[dir];
          }
          const ticksPerDir = Math.max(1, Math.floor(action.ticksRemaining / action.facingsRemaining.length));
          if (action.ticksRemaining % ticksPerDir === 0 && action.facingsRemaining.length > 1) {
            action.facingsRemaining.shift();
          }
        }
        if (action.ticksRemaining <= 0) ctx.actionQueue.shift();
        break;
      }
    }
  }

  /** Process door evidence queue (Step 1 of fixedUpdate). */
  private processDoorEvidence(): void {
    const ctx = this.seekerCtx!;
    const { ai, config } = ctx;
    const evidence = ai.pendingDoorEvidence;

    for (const ev of evidence) {
      // Check hearing range
      const seekerTile = pixelToTile(ctx.render.x, ctx.render.y);
      const dx = ev.position.x - seekerTile.x;
      const dy = ev.position.y - seekerTile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > config.hearingRange) continue;

      // Skip if self-opened
      if (ai.evidenceTracker?.hasEvidence === undefined) {
        // No evidence tracker or check if seeker opened it
      }

      // Skip if in cooldown for this stimulus type
      const lastCooldown = ai.suspiciousCooldowns.get('door-sound');
      if (lastCooldown !== undefined && this.currentTick - lastCooldown < config.suspiciousCooldownTicks) {
        continue;
      }

      // Skip if in CHASE or SEARCH (record but don't interrupt)
      const currentState = this.seekerFSM!.getStateName();
      if (currentState === 'chase' || currentState === 'search') continue;

      // Trigger SUSPICIOUS transition
      if (currentState === 'patrol') {
        SuspiciousState.setStimulus(ev.position.x, ev.position.y);
        this.seekerFSM!.requestTransition('suspicious', 0);
        ai.suspiciousCooldowns.set('door-sound', this.currentTick);
      }
    }

    // Clear the queue
    ai.pendingDoorEvidence.length = 0;
  }

  private handleDoorInteraction(s: MutablePlayingState, input: InputState): void {
    if (!input.interact || !this.doorSystem) return;

    const playerTile = pixelToTile(s.player.x, s.player.y);
    const door = this.doorSystem.getNearestDoor(playerTile.x, playerTile.y, INTERACTION.DOOR_RANGE);
    if (!door) return;

    const entities = [s.player, s.seeker];
    if (!this.doorSystem.canToggleDoor(door, entities, this.currentTick)) return;

    if (this.doorSystem.toggleDoor(door.id, this.currentTick)) {
      const updated = this.doorSystem.getDoors().get(door.id);
      if (updated) {
        if (updated.isOpen) {
          this.pathfinding.removeDoorCost(updated.position.x, updated.position.y);
        } else {
          this.pathfinding.setDoorCost(updated.position.x, updated.position.y, DOOR.PATHFINDING_COST);
        }
      }

      // Sync door map on PlayingState
      (s as { doors: ReadonlyMap<typeof door.id, typeof door> }).doors = this.doorSystem.getDoors();
      (s as { doorGeneration: number }).doorGeneration = this.doorSystem.getDoorGeneration();
    }
  }

  private guardDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta < 0) return 0;
    if (delta > 1000) return 1000;
    return delta;
  }
}
