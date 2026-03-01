import { buildTrack } from '../engine/track';
import { createWorld, stepWorld } from '../engine/world';
import type { WorldState, TrackControlPoint, Vec2 } from '../engine/types';
import {
  GamePhase,
  RaceAction,
  RaceController,
  RESPAWN_FADE_TICKS,
  type RaceControlSignals,
  type RaceState,
} from '../engine/RaceController';
import { getInput, isKeyDown, ZERO_INPUT } from './InputHandler';

const FIXED_DT_MS = 1000 / 60;
const DEFAULT_CHECKPOINT_COUNT = 30;

/** Callbacks that other renderers register to receive state updates. */
export type RenderCallback = (
  prev: WorldState,
  curr: WorldState,
  alpha: number,
  race: RaceState,
) => void;

export class GameLoop {
  private track;
  private currState: WorldState;
  private prevState: WorldState;
  private raceController = new RaceController();
  private accumulator = 0;
  private renderCallbacks: RenderCallback[] = [];
  private escapeWasDown = false;
  private rWasDown = false;
  private qWasDown = false;
  private abortTick = false;

  /** Callback invoked when player presses Q during pause. */
  onQuitToMenu: (() => void) | null = null;

  constructor(trackPoints: TrackControlPoint[]) {
    this.track = buildTrack(trackPoints, DEFAULT_CHECKPOINT_COUNT);
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
  }

  /** Load a new track and reset the game. */
  loadTrack(points: TrackControlPoint[]): void {
    this.track = buildTrack(points, DEFAULT_CHECKPOINT_COUNT);
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
    this.raceController.reset(true);
    this.accumulator = 0;
    this.abortTick = false;
  }

  /** Register a callback called every render frame with interpolation alpha. */
  onRender(cb: RenderCallback): void {
    this.renderCallbacks.push(cb);
  }

  /**
   * Main ticker callback. Called every animation frame by PixiJS Ticker.
   * Input is sampled ONCE per frame, not per accumulator sub-step (RI-02).
   */
  tick(deltaMS: number): void {
    this.accumulator = Math.min(this.accumulator + deltaMS, 200);

    // Sample input once per frame — key state won't change between sub-steps
    const signals = this.buildSignals();

    while (this.accumulator >= FIXED_DT_MS) {
      if (this.abortTick) break;
      this.prevState = this.currState;
      this.currState = this.stepGame(signals);
      // Consume one-shot signals after first sub-step
      signals.togglePause = false;
      signals.restart = false;
      signals.quitToMenu = false;
      this.accumulator -= FIXED_DT_MS;
    }

    // RI-01: If quit-to-menu fired, skip render callbacks and reset
    if (this.abortTick) {
      this.abortTick = false;
      this.accumulator = 0;
      return;
    }

    const alpha = this.accumulator / FIXED_DT_MS;
    const raceState = this.raceController.state;
    for (const cb of this.renderCallbacks) {
      cb(this.prevState, this.currState, alpha, raceState);
    }
  }

  private buildSignals(): RaceControlSignals {
    const escapeDown = isKeyDown('Escape');
    const rDown = isKeyDown('KeyR');
    const qDown = isKeyDown('KeyQ');

    const signals: RaceControlSignals = {
      togglePause: escapeDown && !this.escapeWasDown,
      restart: rDown && !this.rWasDown,
      quitToMenu: qDown && !this.qWasDown,
    };

    this.escapeWasDown = escapeDown;
    this.rWasDown = rDown;
    this.qWasDown = qDown;
    return signals;
  }

  private stepGame(signals: RaceControlSignals): WorldState {
    const action = this.raceController.step(signals, this.currState.car.speed);
    const phase = this.raceController.state.phase;

    // Handle actions from the controller
    switch (action) {
      case RaceAction.ResetNoCd:
        this.resetWorld(false);
        return this.currState;
      case RaceAction.Respawn:
        return this.completeRespawn();
      case RaceAction.QuitToMenu:
        this.abortTick = true;
        this.onQuitToMenu?.();
        return this.currState;
      default:
        break;
    }

    // Physics stepping based on phase
    switch (phase) {
      case GamePhase.Racing:
        return stepWorld(this.currState, getInput());
      case GamePhase.Countdown: {
        const next = stepWorld(this.currState, ZERO_INPUT);
        return { ...next, timing: this.currState.timing }; // Don't advance lap timer during countdown
      }
      case GamePhase.Paused:
      case GamePhase.Respawning:
      case GamePhase.Loading:
        return this.currState;
    }
  }

  private completeRespawn(): WorldState {
    const { timing, track } = this.currState;
    const lastIdx = timing.lastCheckpointIndex;
    let respawnPos: Vec2;
    let respawnHeading: number;

    if (lastIdx >= 0 && lastIdx < track.checkpoints.length) {
      const cp = track.checkpoints[lastIdx];
      respawnPos = cp.center;
      respawnHeading = Math.atan2(cp.direction.y, cp.direction.x);
    } else {
      respawnPos = track.startPosition;
      respawnHeading = track.startHeading;
    }

    const freshWorld = createWorld(track);
    const respawned: WorldState = {
      ...freshWorld,
      car: {
        ...freshWorld.car,
        position: respawnPos,
        heading: respawnHeading,
        velocity: { x: 0, y: 0 },
        speed: 0,
        yawRate: 0,
      },
      timing: this.currState.timing,
    };
    this.prevState = respawned;
    return respawned;
  }

  /** Reset the world. countdown=true for initial load, false for R-key. */
  resetWorld(countdown: boolean): void {
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
    this.raceController.reset(countdown);
  }

  /** Transition from Loading to Countdown (initial page load). */
  startGame(): void {
    this.resetWorld(true);
  }

  get currentWorldState(): WorldState { return this.currState; }
  get currentRaceState(): RaceState { return this.raceController.state; }
  get trackState() { return this.track; }
}
