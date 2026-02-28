import { buildTrack } from '../engine/track';
import { createWorld, stepWorld } from '../engine/world';
import { TRACK_01_CONTROL_POINTS } from '../tracks/track01';
import type { WorldState } from '../engine/types';
import { GamePhase, createInitialRaceState, type RaceState } from './GameState';
import { getInput, ZERO_INPUT, isKeyDown } from './InputHandler';

const FIXED_DT_MS = 1000 / 60;       // 16.667ms
const STUCK_SPEED_THRESHOLD = 2.0;   // units/sec — below this counts as stuck
const STUCK_TIMEOUT_TICKS   = 300;   // 5 seconds x 60Hz
const RESPAWN_FADE_TICKS    = 30;    // 0.5s fade-to-black
const COUNTDOWN_BEAT_TICKS  = 60;    // 1 second per beat (3-2-1-GO)
const COUNTDOWN_BEATS       = 3;     // How many numbered beats before GO

/** Default checkpoint count for track building. */
const DEFAULT_CHECKPOINT_COUNT = 30;

/** Callbacks that other renderers register to receive state updates. */
export type RenderCallback = (
  prev: WorldState,
  curr: WorldState,
  alpha: number,
  race: RaceState,
) => void;

export class GameLoop {
  private track = buildTrack(TRACK_01_CONTROL_POINTS, DEFAULT_CHECKPOINT_COUNT);
  private currState: WorldState;
  private prevState: WorldState;
  private raceState: RaceState = createInitialRaceState();
  private accumulator = 0;
  private renderCallbacks: RenderCallback[] = [];
  private escapeWasDown = false;
  private rWasDown = false;

  constructor() {
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
  }

  /** Register a callback called every render frame with interpolation alpha. */
  onRender(cb: RenderCallback): void {
    this.renderCallbacks.push(cb);
  }

  /**
   * Main ticker callback. Called every animation frame by PixiJS Ticker.
   * deltaMS: real elapsed milliseconds since last frame.
   */
  tick(deltaMS: number): void {
    // Cap accumulator to prevent spiral of death after tab switch
    this.accumulator = Math.min(this.accumulator + deltaMS, 200);

    while (this.accumulator >= FIXED_DT_MS) {
      this.prevState = this.currState;
      this.currState = this.stepGame();
      this.accumulator -= FIXED_DT_MS;
    }

    const alpha = this.accumulator / FIXED_DT_MS;
    for (const cb of this.renderCallbacks) {
      cb(this.prevState, this.currState, alpha, this.raceState);
    }
  }

  /** Advance game state by one tick, respecting GamePhase. */
  private stepGame(): WorldState {
    const rs = this.raceState;

    switch (rs.phase) {
      case GamePhase.Loading:
        // Engine runs but nothing happens until transition to Countdown/Racing
        return this.currState;

      case GamePhase.Countdown:
        this.tickCountdown();
        // Physics steps with zero input — car stays pinned at start
        return stepWorld(this.currState, ZERO_INPUT);

      case GamePhase.Racing:
        this.tickRacing();
        return stepWorld(this.currState, getInput());

      case GamePhase.Paused:
        this.tickPaused();
        return this.currState; // Frozen

      case GamePhase.Respawning:
        this.tickRespawning();
        return this.currState; // Frozen during fade
    }
  }

  private tickCountdown(): void {
    const rs = this.raceState;
    rs.countdownTicksLeft--;
    if (rs.countdownTicksLeft <= 0) {
      if (rs.countdownBeat > 0) {
        // Advance to next beat
        rs.countdownBeat--;
        rs.countdownTicksLeft = COUNTDOWN_BEAT_TICKS;
      } else {
        // GO — transition to Racing
        rs.phase = GamePhase.Racing;
      }
    }
  }

  private tickRacing(): void {
    const rs = this.raceState;
    const speed = this.currState.car.speed;

    // Stuck detection (MECH-13)
    if (speed < STUCK_SPEED_THRESHOLD) {
      rs.stuckTicks++;
      if (rs.stuckTicks >= STUCK_TIMEOUT_TICKS) {
        this.beginRespawn();
        return;
      }
    } else {
      rs.stuckTicks = 0;
    }

    // Instant restart (UX-01): R key resets world, no countdown (debounced)
    const rDown = isKeyDown('KeyR');
    if (rDown && !this.rWasDown) {
      this.resetWorld(false);
      this.rWasDown = rDown;
      return;
    }
    this.rWasDown = rDown;

    // Pause (UX-02): Escape key (debounced — fires once per press)
    const escapeDown = isKeyDown('Escape');
    if (escapeDown && !this.escapeWasDown) {
      rs.phase = GamePhase.Paused;
    }
    this.escapeWasDown = escapeDown;
  }

  private tickPaused(): void {
    const rs = this.raceState;

    // Resume on Escape (debounced — fires once per press)
    const escapeDown = isKeyDown('Escape');
    if (escapeDown && !this.escapeWasDown) {
      rs.phase = GamePhase.Racing;
    }
    this.escapeWasDown = escapeDown;

    // R key from pause also instant restarts (debounced)
    const rDown = isKeyDown('KeyR');
    if (rDown && !this.rWasDown) {
      this.resetWorld(false);
    }
    this.rWasDown = rDown;
  }

  private tickRespawning(): void {
    const rs = this.raceState;
    rs.respawnTicksLeft--;
    if (rs.respawnTicksLeft <= 0) {
      this.completeRespawn();
    }
  }

  private beginRespawn(): void {
    const rs = this.raceState;
    rs.phase = GamePhase.Respawning;
    rs.respawnTicksLeft = RESPAWN_FADE_TICKS;
    rs.stuckTicks = 0;
  }

  private completeRespawn(): void {
    const rs = this.raceState;
    const { timing, track } = this.currState;

    // Determine respawn position: last crossed checkpoint or track start
    const lastIdx = timing.lastCheckpointIndex;
    let respawnPos, respawnHeading: number;
    if (lastIdx >= 0 && lastIdx < track.checkpoints.length) {
      const cp = track.checkpoints[lastIdx];
      respawnPos = cp.center;
      // heading from checkpoint direction (direction is a unit Vec2 in track space)
      respawnHeading = Math.atan2(cp.direction.y, cp.direction.x);
    } else {
      respawnPos = track.startPosition;
      respawnHeading = track.startHeading;
    }

    // Reset car to respawn position using createWorld approach:
    // Rebuild world but preserve timing/lap state
    const freshWorld = createWorld(track);
    this.currState = {
      ...freshWorld,
      car: {
        ...freshWorld.car,
        position: respawnPos,
        heading: respawnHeading,
        velocity: { x: 0, y: 0 },
        speed: 0,
        yawRate: 0,
      },
      timing: this.currState.timing, // Preserve lap progress
    };
    this.prevState = this.currState;
    rs.phase = GamePhase.Racing;
  }

  /** Reset the world. countdown=true for initial load, false for R-key. */
  resetWorld(countdown: boolean): void {
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
    this.raceState = createInitialRaceState();
    if (countdown) {
      this.raceState.phase = GamePhase.Countdown;
    } else {
      // R-key: skip countdown, go straight to Racing
      this.raceState.phase = GamePhase.Racing;
      this.raceState.initialLoad = false;
    }
  }

  /** Transition from Loading to Countdown (initial page load). */
  startGame(): void {
    this.resetWorld(true); // Initial load gets countdown
  }

  get currentWorldState(): WorldState { return this.currState; }
  get currentRaceState(): RaceState { return this.raceState; }
  get trackState() { return this.track; }
}
