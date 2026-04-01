import type { InputState } from '../types/input.js';
import type { GameState, PlayingState, SpectatingState, MutablePlayingState, MutableSpectatingState, CountdownPhase, HuntPhase } from '../types/state.js';
import type { ReadonlyDeep } from '../types/utility.js';
import type { GameEventMap } from '../types/events.js';
import type { TypedEmitter, TypedListener } from '../types/events.js';
import type { SeekerConfig, HiderConfig, RoomDefinition, HidingSpot } from '../types/ai.js';
import type { Difficulty, GameMode } from '../types/settings.js';
import { SIMULATION, VISION, SEEKER, INTERACTION, TIMERS, DOOR } from '../constants.js';
import { updateMovement } from './movement.js';
import { computeFOV } from './los.js';
import { checkDetection } from './detection.js';
import { evaluateRules } from './rules.js';
import { createTypedEmitter } from './events.js';
import { PathfindingSystem } from './ai/pathfinding.js';
import type { PathfindingInstance } from './ai/pathfinding.js';
import { SeekerFSM, clearPath } from './ai/seeker-fsm.js';
import type { SeekerContext, SeekerAIInternalState } from './ai/seeker-fsm.js';
import { ActionQueue } from './ai/actions.js';
import { SEEKER_CONFIGS } from './ai/seeker-configs.js';
import { HIDER_CONFIGS } from './ai/hider-configs.js';
import { createHiderAIState, updateHiderCountdown, updateHiderHunt } from './ai/hider.js';
import type { HiderContext } from './ai/hider.js';
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
  private seekerPathfinding: PathfindingInstance | null = null;
  private seekerFSM: SeekerFSM | null = null;
  private seekerCtx: SeekerContext | null = null;
  private readonly seekerConfig: SeekerConfig;
  private readonly hiderConfig: HiderConfig | null;
  private hiderPathfinding: PathfindingInstance | null = null;
  private hiderCtx: HiderContext | null = null;
  private readonly mode: GameMode;
  private readonly difficulty: Difficulty;
  private readonly hiderDifficulty: Difficulty;
  private seekerSpawnTileX: number = 0;
  private seekerSpawnTileY: number = 0;
  private collisionGrid: Uint8Array | null = null;
  private lastPlayerFovTileX: number = -1;
  private lastPlayerFovTileY: number = -1;
  private lastPlayerFovDoorGen: number = -1;
  private lastSeekerFovDoorGen: number = -1;
  private doorSystem: DoorSystem | null = null;
  private currentTick: number = 0;
  private rooms: RoomDefinition[] = [];
  private hidingSpots: HidingSpot[] = [];

  constructor(
    initialState: GameState,
    difficulty: Difficulty = 'easy',
    options?: { mode?: GameMode; hiderDifficulty?: Difficulty },
  ) {
    this.state = initialState;
    this.emitter = createTypedEmitter<GameEventMap>();
    this.pathfinding = new PathfindingSystem();
    this.difficulty = difficulty;
    this.hiderDifficulty = options?.hiderDifficulty ?? 'easy';
    this.mode = options?.mode ?? 'player';
    this.seekerConfig = SEEKER_CONFIGS[difficulty];
    this.hiderConfig = this.mode === 'spectator' ? HIDER_CONFIGS[this.hiderDifficulty] : null;

    if (initialState.phase === 'spectating' && this.mode !== 'spectator') {
      throw new Error('SpectatingState requires mode: spectator');
    }

    if (initialState.phase === 'playing') {
      this.initPlayingSystems(initialState);
    } else if (initialState.phase === 'spectating') {
      this.initSpectatingSystems(initialState);
    }
  }

  /** Set rooms and hiding spots (called by scene after map load). */
  setRooms(rooms: RoomDefinition[], hidingSpots: HidingSpot[]): void {
    this.rooms = rooms;
    this.hidingSpots = hidingSpots;
    if (this.seekerCtx) {
      (this.seekerCtx as unknown as { rooms: RoomDefinition[] }).rooms = rooms;
      (this.seekerCtx as unknown as { hidingSpots: HidingSpot[] }).hidingSpots = hidingSpots;
    }
  }

  /** Check if engine is in spectating mode */
  isSpectating(): boolean {
    return this.state.phase === 'spectating';
  }

  /** Set door system after construction (engine's emitter must exist first) */
  setDoorSystem(doorSystem: DoorSystem): void {
    this.doorSystem = doorSystem;

    const isActive = this.state.phase === 'playing' || this.state.phase === 'spectating';
    if (!isActive) return;

    // Sync door state
    const s = this.state as MutablePlayingState | MutableSpectatingState;
    (s as { doors: ReadonlyMap<string, unknown> }).doors = doorSystem.getDoors();

    // Set initial door costs for ALL pathfinding instances
    for (const door of doorSystem.getDoors().values()) {
      if (!door.isOpen) {
        this.pathfinding.setDoorCostAll(door.position.x, door.position.y, DOOR.PATHFINDING_COST);
      }
    }

    // Wire into seeker context
    if (this.seekerCtx) {
      this.seekerCtx.doorSystem = doorSystem;
    }

    // Wire into hider context
    if (this.hiderCtx) {
      this.hiderCtx.doorSystem = doorSystem;
    }

    // Centralized door handler: pathfinding costs + seeker evidence pipeline
    this.emitter.on('DOOR_TOGGLED', (payload) => {
      // Update pathfinding costs for ALL instances (seeker + hider)
      if (payload.isOpen) {
        this.pathfinding.removeDoorCostAll(payload.position.x, payload.position.y);
      } else {
        this.pathfinding.setDoorCostAll(payload.position.x, payload.position.y, DOOR.PATHFINDING_COST);
      }

      // Sync door state on game state
      if (this.doorSystem) {
        const s = this.state as MutablePlayingState | MutableSpectatingState;
        (s as { doors: ReadonlyMap<string, unknown> }).doors = this.doorSystem.getDoors();
        (s as { doorGeneration: number }).doorGeneration = this.doorSystem.getDoorGeneration();
      }

      // Evidence pipeline for seeker AI
      if (this.seekerCtx) {
        this.seekerCtx.ai.pendingDoorEvidence.push({
          id: payload.id,
          position: payload.position,
          isOpen: payload.isOpen,
        });
      }
    });
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
    this.seekerPathfinding = this.pathfinding.createInstance('seeker', this.collisionGrid, width, height);

    // Create FSM + context
    this.seekerFSM = new SeekerFSM();
    const aiState = createSeekerAIInternal(playing.seeker.x, playing.seeker.y, this.seekerConfig, this.difficulty);

    this.seekerCtx = {
      config: this.seekerConfig,
      pathfinding: this.seekerPathfinding,
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

  private initSpectatingSystems(spec: SpectatingState): void {
    const { width, height } = spec.map;
    this.collisionGrid = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.collisionGrid[y * width + x] = spec.map.isWalkable(x, y) ? 0 : 1;
      }
    }

    // Seeker pathfinding instance
    this.seekerPathfinding = this.pathfinding.createInstance('seeker', this.collisionGrid, width, height);

    // Hider pathfinding instance (doors treated as blocked for Easy/Medium, cost 50 for Hard)
    this.hiderPathfinding = this.pathfinding.createInstance('hider', this.collisionGrid, width, height);

    // Seeker FSM + context
    this.seekerFSM = new SeekerFSM();
    const aiState = createSeekerAIInternal(spec.seeker.x, spec.seeker.y, this.seekerConfig, this.difficulty);
    this.seekerCtx = {
      config: this.seekerConfig,
      pathfinding: this.seekerPathfinding,
      map: spec.map,
      rooms: this.rooms,
      hidingSpots: this.hidingSpots,
      emitter: this.emitter,
      render: spec.seeker,
      ai: aiState,
      actionQueue: new ActionQueue(),
      doorSystem: this.doorSystem,
      currentTick: 0,
    };

    // Record seeker spawn for hider scoring
    const seekerSpawn = spec.spawns.find(s => s.type === 'seeker_spawn');
    if (seekerSpawn) {
      const { x: sx, y: sy } = pixelToTile(seekerSpawn.x, seekerSpawn.y);
      this.seekerSpawnTileX = sx;
      this.seekerSpawnTileY = sy;
    }

    // Hider AI context
    if (this.hiderConfig) {
      this.hiderCtx = {
        config: this.hiderConfig,
        pathfinding: this.hiderPathfinding,
        map: spec.map,
        emitter: this.emitter,
        render: spec.hider,
        ai: createHiderAIState(),
        seekerX: spec.seeker.x,
        seekerY: spec.seeker.y,
        seekerFov: spec.seekerFov,
        hiderFov: spec.hiderFov,
        doorSystem: this.doorSystem,
        currentTick: 0,
        doorGeneration: 0,
      };
    }
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
    this.pathfinding.disposeAll();
    this.emitter.offAll();
  }

  /** Canonical fixedUpdate ordering (Phase 5a, 9 steps) */
  private fixedUpdate(dt: number, input: InputState): void {
    if (this.state.phase === 'spectating') {
      this.spectatingFixedUpdate(dt);
      return;
    }
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
      this.updateSeekerWithDetection(detection, s.player.x, s.player.y, dt);
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

  /** Spectating fixedUpdate — both seeker and hider are AI-controlled */
  private spectatingFixedUpdate(dt: number): void {
    if (this.state.phase !== 'spectating') return;
    const s = this.state as MutableSpectatingState;
    this.currentTick++;
    if (this.seekerCtx) this.seekerCtx.currentTick = this.currentTick;
    if (this.hiderCtx) {
      this.hiderCtx.currentTick = this.currentTick;
      this.hiderCtx.seekerX = s.seeker.x;
      this.hiderCtx.seekerY = s.seeker.y;
      this.hiderCtx.doorGeneration = this.doorSystem ? this.doorSystem.getDoorGeneration() : 0;
    }

    // Terminal guard
    if (s.gameFlow.kind === 'found' || s.gameFlow.kind === 'survived') return;

    if (s.gameFlow.kind === 'countdown') {
      // Hider AI picks spot and moves during countdown
      if (this.hiderCtx) {
        updateHiderCountdown(this.hiderCtx, this.seekerSpawnTileX, this.seekerSpawnTileY, dt);
      }
      (s.gameFlow as CountdownPhase).ticksRemaining--;

      const next = evaluateRules(s.gameFlow, 'none');
      if (next) {
        s.gameFlow = next;

        // Hunt started — init Hard seeker evidence
        if (this.seekerCtx && this.difficulty === 'hard' && this.doorSystem) {
          this.seekerCtx.ai.evidenceTracker = new EvidenceTracker(
            this.doorSystem.getDoors(), this.currentTick,
          );
        }

        this.emitter.emit('PHASE_CHANGED', next.kind);
      }
      return;
    }

    // === HUNT PHASE — spectating 9-step ordering ===

    // Step 1: Process pending door evidence
    if (this.seekerCtx) {
      this.processDoorEvidence();
    }

    // Step 2: Hider AI door interactions (Hard hider door closing handled inside updateHiderHunt)

    // Step 3: Map state updates (implicit via DoorSystem)

    // Step 4: Seeker FOV (dirty flag)
    const doorGen = this.doorSystem ? this.doorSystem.getDoorGeneration() : 0;
    const { x: stx, y: sty } = pixelToTile(s.seeker.x, s.seeker.y);
    if (this.seekerCtx && (
      stx !== this.seekerCtx.ai.lastFovTileX ||
      sty !== this.seekerCtx.ai.lastFovTileY ||
      doorGen !== this.lastSeekerFovDoorGen
    )) {
      this.seekerCtx.ai.lastFovTileX = stx;
      this.seekerCtx.ai.lastFovTileY = sty;
      this.lastSeekerFovDoorGen = doorGen;
      s.seekerFov.fill(0);
      computeFOV(stx, sty, this.seekerConfig.visionRange,
        (x, y) => s.map.isBlocking(x, y), s.seekerFov, s.map.width, s.map.height);
    }

    // Step 5: Hider FOV (dirty flag, Hard only — handled inside updateHiderHunt)

    // Step 6: Detection (seeker → hider)
    const detection = checkDetection(
      s.seeker.x, s.seeker.y,
      s.hider.x, s.hider.y,
      s.seekerFov, s.map.width,
      s.seeker.facingAngle,
      this.seekerConfig.visionConeAngle,
    );

    // Step 7: Hider AI update (prey acts before predator)
    if (this.hiderCtx) {
      updateHiderHunt(this.hiderCtx, dt);
    }

    // Step 8: Seeker AI update
    if (this.seekerFSM && this.seekerCtx) {
      this.updateSeekerWithDetection(detection, s.hider.x, s.hider.y, dt);
    }

    // Step 9: Rules evaluation (timers, game over)
    (s.gameFlow as HuntPhase).ticksRemaining--;
    (s.gameFlow as HuntPhase).ticksElapsed++;

    // No sonar in spectator mode

    const next = evaluateRules(s.gameFlow, detection);
    if (next) {
      s.gameFlow = next;
      this.emitter.emit('PHASE_CHANGED', next.kind);
    }
  }

  /** Unified seeker detection + FSM update — works for both playing and spectating */
  private updateSeekerWithDetection(
    detection: 'none' | 'spotted' | 'found',
    targetX: number,
    targetY: number,
    dt: number,
  ): void {
    const fsm = this.seekerFSM!;
    const ctx = this.seekerCtx!;
    const { ai, config } = ctx;

    // Update LKP when target visible
    if (detection === 'spotted' || detection === 'found') {
      const { x: tx, y: ty } = pixelToTile(targetX, targetY);
      ai.lastKnownHiderPos = { x: tx, y: ty };
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
        if (config.cancelChaseOnBriefGlimpse && fsm.getPendingTransition()?.target === 'chase') {
          fsm.cancelPending();
          if (ai.lastKnownHiderPos) {
            SuspiciousState.setStimulus(ai.lastKnownHiderPos.x, ai.lastKnownHiderPos.y);
            fsm.requestTransition('suspicious', 0);
          }
        }

        if (currentState === 'chase') {
          ai.chaseLostTicks++;
          if (ai.chaseLostTicks > config.chaseGraceTicks) {
            if (ai.chaseLostTicks - config.chaseGraceTicks >= config.chaseTimeoutTicks) {
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

    // Process action queue (door opening, wait, etc.)
    if (!ctx.actionQueue.isEmpty() && ctx.doorSystem) {
      this.processActionQueue(ctx, dt);
    } else {
      fsm.update(ctx, dt);
    }

    // Sync render state
    if (ctx.render.fsmState !== fsm.getStateName()) {
      const desired = ctx.render.fsmState;
      ctx.render.fsmState = fsm.getStateName();
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
          // Door cost update handled centrally by DOOR_TOGGLED listener
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

    // Door cost + state sync handled centrally by DOOR_TOGGLED listener
    this.doorSystem.toggleDoor(door.id, this.currentTick);
  }

  private guardDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta < 0) return 0;
    if (delta > 1000) return 1000;
    return delta;
  }
}
