import type { InputState } from '../types/input.js';
import type { GameState, PlayingState, MutablePlayingState, CountdownPhase, HuntPhase } from '../types/state.js';
import type { ReadonlyDeep } from '../types/utility.js';
import type { GameEventMap } from '../types/events.js';
import type { TypedEmitter, TypedListener } from '../types/events.js';
import type { SeekerConfig } from '../types/ai.js';
import { SIMULATION, MOVEMENT, VISION, SEEKER } from '../constants.js';
import { updateMovement } from './movement.js';
import { computeFOV } from './los.js';
import { checkDetection } from './detection.js';
import { evaluateRules } from './rules.js';
import { createTypedEmitter } from './events.js';
import { PathfindingSystem } from './ai/pathfinding.js';
import { updateSeekerAI, createSeekerAIState } from './ai/seeker.js';
import type { SeekerAIState } from './ai/seeker.js';
import { pixelToTile } from './map.js';

function createEasySeekerConfig(): SeekerConfig {
  const step = SIMULATION.FIXED_STEP_S;
  return {
    visionRange: VISION.SEEKER_RANGE,
    reactionDelayTicks: Math.round(SEEKER.REACTION_DELAY_S / step),
    chaseTimeoutTicks: Math.round(SEEKER.CHASE_TIMEOUT_S / step),
    speed: MOVEMENT.PLAYER_SPEED * MOVEMENT.SEEKER_SPEED_MULTIPLIER,
    patrolPauseMinTicks: Math.round(SEEKER.PATROL_PAUSE_MIN_S / step),
    patrolPauseMaxTicks: Math.round(SEEKER.PATROL_PAUSE_MAX_S / step),
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
  private seekerAI: SeekerAIState | null = null;
  private readonly seekerConfig: SeekerConfig;
  private collisionGrid: Uint8Array | null = null;
  private lastPlayerFovTileX: number = -1;
  private lastPlayerFovTileY: number = -1;

  constructor(initialState: GameState) {
    this.state = initialState;
    this.emitter = createTypedEmitter<GameEventMap>();
    this.pathfinding = new PathfindingSystem();
    this.seekerConfig = createEasySeekerConfig();

    if (initialState.phase === 'playing') {
      this.initPlayingSystems(initialState);
    }
  }

  private initPlayingSystems(playing: PlayingState): void {
    this.seekerAI = createSeekerAIState(playing.seeker.x, playing.seeker.y);

    // Build collision grid for pathfinding from the map
    const { width, height } = playing.map;
    this.collisionGrid = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.collisionGrid[y * width + x] = playing.map.isWalkable(x, y) ? 0 : 1;
      }
    }
    this.pathfinding.initGrid(this.collisionGrid, width, height);
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

  private fixedUpdate(dt: number, input: InputState): void {
    if (this.state.phase !== 'playing') return;
    const s = this.state as MutablePlayingState;

    // Terminal guard — no logic after game over
    if (s.gameFlow.kind === 'found' || s.gameFlow.kind === 'survived') return;

    if (s.gameFlow.kind === 'countdown') {
      // 1. Player movement only
      updateMovement(s.player, s.map, input, dt);

      // 2. Decrement countdown timer
      (s.gameFlow as CountdownPhase).ticksRemaining--;

      // 3. Check rules (countdown → hunt transition)
      const next = evaluateRules(s.gameFlow, 'none');
      if (next) {
        s.gameFlow = next;
        // Clear playerFov so HUNT phase recomputes from actual position
        s.playerFov.fill(0);
        this.lastPlayerFovTileX = -1;
        this.lastPlayerFovTileY = -1;
        this.emitter.emit('PHASE_CHANGED', next.kind);
      }
      return;
    }

    // HUNT phase — full dispatch
    // 1. Player movement
    const prevX = s.player.x;
    const prevY = s.player.y;
    updateMovement(s.player, s.map, input, dt);

    // 1b. Distance tracking
    const dx = s.player.x - prevX;
    const dy = s.player.y - prevY;
    if (dx !== 0 || dy !== 0) {
      s.stats.distanceTraveled += Math.hypot(dx, dy);
    }

    // 2. Player FOV (dirty flag: only recompute on tile change)
    const playerTile = pixelToTile(s.player.x, s.player.y);
    if (playerTile.x !== this.lastPlayerFovTileX || playerTile.y !== this.lastPlayerFovTileY) {
      this.lastPlayerFovTileX = playerTile.x;
      this.lastPlayerFovTileY = playerTile.y;
      s.playerFov.fill(0);
      computeFOV(
        playerTile.x, playerTile.y,
        VISION.HIDER_RANGE,
        (x, y) => s.map.isBlocking(x, y),
        s.playerFov, s.map.width, s.map.height,
      );
    }

    // 4. Seeker FOV (dirty flag: only recompute on tile change)
    const seekerTile = pixelToTile(s.seeker.x, s.seeker.y);
    if (this.seekerAI && (seekerTile.x !== this.seekerAI.lastFovTileX || seekerTile.y !== this.seekerAI.lastFovTileY)) {
      this.seekerAI.lastFovTileX = seekerTile.x;
      this.seekerAI.lastFovTileY = seekerTile.y;
      s.seekerFov.fill(0);
      computeFOV(
        seekerTile.x, seekerTile.y,
        this.seekerConfig.visionRange,
        (x, y) => s.map.isBlocking(x, y),
        s.seekerFov, s.map.width, s.map.height,
      );
    }

    // 5. Detection
    const detection = checkDetection(
      s.seeker.x, s.seeker.y,
      s.player.x, s.player.y,
      s.seekerFov, s.map.width,
    );

    // 6. Seeker AI + movement
    if (this.seekerAI) {
      updateSeekerAI(
        s.seeker, this.seekerAI, this.seekerConfig, detection,
        s.player, this.pathfinding, s.map, dt,
      );
    }

    // 7. Timers
    (s.gameFlow as HuntPhase).ticksRemaining--;
    (s.gameFlow as HuntPhase).ticksElapsed++;

    // 8. Rules
    const next = evaluateRules(s.gameFlow, detection);
    if (next) {
      s.gameFlow = next;
      this.emitter.emit('PHASE_CHANGED', next.kind);
    }
  }

  private guardDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta < 0) return 0;
    if (delta > 1000) return 1000;
    return delta;
  }
}
