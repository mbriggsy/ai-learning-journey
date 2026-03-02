import { buildTrack } from '../engine/track';
import { distanceToTrackCenter } from '../engine/track';
import { createWorld, stepWorld } from '../engine/world';
import type { WorldState, TrackControlPoint, Vec2, Input } from '../engine/types';
import {
  GamePhase,
  RaceAction,
  RaceController,
  FREEPLAY_LAPS,
  RESPAWN_FADE_TICKS,
  type RaceControlSignals,
  type RaceState,
} from '../engine/RaceController';
import { getInput, isKeyDown, ZERO_INPUT } from './InputHandler';
import { castRays } from '../ai/raycaster';
import { buildObservation } from '../ai/observations';
import { BrowserAIRunner } from '../ai/browser-ai-runner';
import type { GameMode } from '../types/game-mode';

const FIXED_DT_MS = 1000 / 60;
const DEFAULT_CHECKPOINT_COUNT = 30;

// -- Grace period (vs-ai) ────────────────────────────────────────────────
const GRACE_PERIOD_MS = 5000;
const GRACE_PERIOD_TICKS = Math.round(GRACE_PERIOD_MS / FIXED_DT_MS);

type Racer = 'human' | 'ai';

interface GraceCountdown {
  readonly status: 'countdown';
  readonly leader: Racer;
  ticksLeft: number;
  readonly totalTicks: number;
}

interface GraceResolved {
  readonly status: 'resolved';
  readonly leader: Racer;
  readonly humanTotalTicks: number | null;  // null = DNF
  readonly aiTotalTicks: number | null;     // null = DNF
}

export type VsAiGraceState = GraceCountdown | GraceResolved;

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

  // ── AI mode state ──────────────────────────────────────
  private mode: GameMode = 'solo';
  private aiWorld: WorldState | null = null;
  private prevAiWorld: WorldState | null = null;
  private aiRunner: BrowserAIRunner | null = null;
  private aiAction: [number, number, number] = [0, 0, 0]; // ZERO_INPUT (CP-12 fix)
  private aiInferInFlight = false;       // backpressure guard (CP-7)
  private aiInferSeq = 0;               // sequence guard (CP-7)
  private aiInferErrorLogged = false;    // log-once guard (CP-10)
  private vsAiGrace: VsAiGraceState | null = null;
  /** Callback invoked when player presses Q during pause. */
  onQuitToMenu: (() => void) | null = null;

  constructor(trackPoints: TrackControlPoint[]) {
    this.track = buildTrack(trackPoints, DEFAULT_CHECKPOINT_COUNT);
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
  }

  /** Load a new track and reset the game. */
  loadTrack(points: TrackControlPoint[], targetLaps = FREEPLAY_LAPS, mode: GameMode = 'solo'): void {
    this.mode = mode;
    this.track = buildTrack(points, DEFAULT_CHECKPOINT_COUNT);
    this.currState = createWorld(this.track);
    this.prevState = this.currState;
    this.raceController.configure(targetLaps);
    this.raceController.reset(true);
    this.accumulator = 0;
    this.abortTick = false;

    // Dispose previous AI runner if exists (CP-11 fix — prevents WASM memory leak)
    if (this.aiRunner) {
      this.aiRunner.dispose().catch(() => {});
      this.aiRunner = null;
    }

    if (mode !== 'solo') {
      this.aiWorld = createWorld(this.track);
      this.prevAiWorld = this.aiWorld;
      this.aiRunner = new BrowserAIRunner();
      this.aiAction = [0, 0, 0]; // reset to ZERO_INPUT (CP-12)
      this.aiInferInFlight = false;
      this.aiInferSeq = 0;
      this.aiInferErrorLogged = false;
      // Load model (async — AI sits still using [0,0,0] until loaded)
      this.aiRunner.load('/assets/model.onnx', '/assets/vecnorm_stats.json')
        .catch(err => console.warn('AI model load failed (running without ONNX):', err));
    } else {
      this.aiWorld = null;
      this.prevAiWorld = null;
      this.aiRunner = null;
    }
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
    // Accumulator cap — lower to 50ms in AI modes to limit sub-steps (Performance P0)
    const MAX_ACCUMULATOR = this.mode === 'solo' ? 200 : 50;
    this.accumulator = Math.min(this.accumulator + deltaMS, MAX_ACCUMULATOR);

    // Fire AI inference at start of frame (cached-result pattern with guards)
    // Skip until model is loaded — AI uses [0,0,0] default until ready (FIX-4)
    if (this.aiWorld && this.aiRunner?.loaded && !this.aiInferInFlight) {
      const aiObs = this.buildAiObservation(this.aiWorld);
      const seq = ++this.aiInferSeq;
      this.aiInferInFlight = true;
      this.aiRunner.infer(aiObs).then(action => {
        if (seq === this.aiInferSeq) { // sequence guard — discard stale results (CP-7)
          this.aiAction = action;
        }
        this.aiInferInFlight = false;
      }).catch(err => {
        if (!this.aiInferErrorLogged) {
          console.warn('AI inference error:', err);
          this.aiInferErrorLogged = true; // log once, suppress 60/sec flood (CP-10)
        }
        this.aiInferInFlight = false;
      });
    }

    // Sample input once per frame — key state won't change between sub-steps
    const signals = this.buildSignals();

    while (this.accumulator >= FIXED_DT_MS) {
      if (this.abortTick) break;

      // 1. Save phase before step
      const phaseBefore = this.raceController.state.phase;

      // 2. Step human physics + RaceController
      this.prevState = this.currState;
      this.currState = this.stepGame(signals);

      // 3. Save phase after step
      const phaseAfter = this.raceController.state.phase;

      // 4. Grace period logic (vs-ai only): detect finishes, tick countdown
      this.updateGrace(phaseBefore, phaseAfter, signals);

      // 5. Step AI world (grace-aware gate)
      if (this.shouldStepAi()) {
        this.prevAiWorld = this.aiWorld!;
        const aiInput: Input = {
          steer: this.aiAction[0],
          throttle: this.aiAction[1],
          brake: this.aiAction[2],
        };
        this.aiWorld = stepWorld(this.aiWorld!, aiInput);
      }

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

    // In spectator mode, dispatch AI world state so HUD/effects/sound reflect the AI car
    const prev = this.mode === 'spectator' && this.prevAiWorld ? this.prevAiWorld : this.prevState;
    const curr = this.mode === 'spectator' && this.aiWorld ? this.aiWorld : this.currState;
    for (const cb of this.renderCallbacks) {
      cb(prev, curr, alpha, raceState);
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

  /** Whether the AI world should be stepped this tick (grace-aware). */
  private shouldStepAi(): boolean {
    if (!this.aiWorld) return false;
    const phase = this.raceController.state.phase;
    if (phase === GamePhase.Racing) return true;
    if (this.vsAiGrace?.status === 'countdown') {
      // During grace, step AI only if AI hasn't finished yet
      return this.vsAiGrace.leader !== 'ai';
    }
    return false;
  }

  /**
   * Check for racer-finish transitions and manage the grace period countdown.
   * Called once per sub-step during vs-ai races, inside the accumulator loop.
   */
  private updateGrace(
    phaseBefore: GamePhase,
    phaseAfter: GamePhase,
    signals: RaceControlSignals,
  ): void {
    // Guard: only in vs-ai mode with a real race (not freeplay)
    if (this.mode !== 'vs-ai' || !this.aiWorld) return;
    if (this.raceController.state.targetLaps === FREEPLAY_LAPS) return;

    // Q-to-quit override: during active grace with human still Racing,
    // Q signal is swallowed by RaceController (tickRacing doesn't handle it).
    // Intercept here and quit cleanly.
    if (signals.quitToMenu && this.vsAiGrace?.status === 'countdown') {
      this.abortTick = true;
      this.onQuitToMenu?.();
      return;
    }

    const targetLaps = this.raceController.state.targetLaps;

    // Detect human just finished (Racing → Finished edge)
    const humanJustFinished = phaseBefore === GamePhase.Racing && phaseAfter === GamePhase.Finished;

    // Detect AI just finished (lap count reached target, only fire once)
    const aiLapCount = this.aiWorld.timing.lapTimes.length;
    const aiJustFinished = this.vsAiGrace === null && aiLapCount >= targetLaps;

    // Both finish on the same tick → skip to resolved immediately
    if (humanJustFinished && aiJustFinished) {
      let humanTotal = 0;
      for (let i = 0; i < targetLaps; i++) humanTotal += this.currState.timing.lapTimes[i];
      let aiTotal = 0;
      for (let i = 0; i < targetLaps; i++) aiTotal += this.aiWorld.timing.lapTimes[i];
      this.vsAiGrace = {
        status: 'resolved',
        leader: humanTotal <= aiTotal ? 'human' : 'ai',
        humanTotalTicks: humanTotal,
        aiTotalTicks: aiTotal,
      };
      return;
    }

    // Human finishes first → start grace for AI
    if (humanJustFinished && !this.vsAiGrace) {
      this.vsAiGrace = {
        status: 'countdown',
        leader: 'human',
        ticksLeft: GRACE_PERIOD_TICKS,
        totalTicks: GRACE_PERIOD_TICKS,
      };
      return;
    }

    // AI finishes first → start grace for human
    if (aiJustFinished && !this.vsAiGrace) {
      let aiTotal = 0;
      for (let i = 0; i < targetLaps; i++) aiTotal += this.aiWorld.timing.lapTimes[i];
      this.vsAiGrace = {
        status: 'countdown',
        leader: 'ai',
        ticksLeft: GRACE_PERIOD_TICKS,
        totalTicks: GRACE_PERIOD_TICKS,
      };
      return;
    }

    // Tick the countdown (if active and not paused)
    if (this.vsAiGrace?.status === 'countdown') {
      const isPaused = phaseAfter === GamePhase.Paused;
      if (!isPaused) {
        this.vsAiGrace.ticksLeft--;
      }

      // Check if trailing racer finished during grace
      if (this.vsAiGrace.leader === 'human') {
        // Human led, AI is trailing — check if AI finished
        if (aiLapCount >= targetLaps) {
          let humanTotal = 0;
          for (let i = 0; i < targetLaps; i++) humanTotal += this.currState.timing.lapTimes[i];
          let aiTotal = 0;
          for (let i = 0; i < targetLaps; i++) aiTotal += this.aiWorld.timing.lapTimes[i];
          this.vsAiGrace = {
            status: 'resolved',
            leader: 'human',
            humanTotalTicks: humanTotal,
            aiTotalTicks: aiTotal,
          };
          // Human already finished — force AI to Finished state isn't needed (AI has no RaceController)
          return;
        }
      } else {
        // AI led, human is trailing — check if human just finished
        if (humanJustFinished) {
          let humanTotal = 0;
          for (let i = 0; i < targetLaps; i++) humanTotal += this.currState.timing.lapTimes[i];
          let aiTotal = 0;
          for (let i = 0; i < targetLaps; i++) aiTotal += this.aiWorld.timing.lapTimes[i];
          this.vsAiGrace = {
            status: 'resolved',
            leader: 'ai',
            humanTotalTicks: humanTotal,
            aiTotalTicks: aiTotal,
          };
          return;
        }
      }

      // Check timeout AFTER finish check (prevents false DNF on boundary tick)
      if (this.vsAiGrace.status === 'countdown' && this.vsAiGrace.ticksLeft <= 0) {
        if (this.vsAiGrace.leader === 'human') {
          // AI DNF
          let humanTotal = 0;
          for (let i = 0; i < targetLaps; i++) humanTotal += this.currState.timing.lapTimes[i];
          this.vsAiGrace = {
            status: 'resolved',
            leader: 'human',
            humanTotalTicks: humanTotal,
            aiTotalTicks: null,
          };
        } else {
          // Human DNF — force-finish them
          this.raceController.forceFinish();
          let aiTotal = 0;
          for (let i = 0; i < targetLaps; i++) aiTotal += this.aiWorld.timing.lapTimes[i];
          this.vsAiGrace = {
            status: 'resolved',
            leader: 'ai',
            humanTotalTicks: null,
            aiTotalTicks: aiTotal,
          };
        }
      }
    }
  }

  private stepGame(signals: RaceControlSignals): WorldState {
    // In spectator mode, human car is frozen (ZERO_INPUT) so speed=0 always.
    // Pass Infinity to bypass stuck detection — the AI car drives, not the human.
    const carSpeed = this.mode === 'spectator' ? Infinity : this.currState.car.speed;
    const action = this.raceController.step(signals, carSpeed, this.currState.timing);
    const phase = this.raceController.state.phase;

    // Handle actions from the controller
    switch (action) {
      case RaceAction.ResetNoCd:
        this.resetWorld(true);
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
        // CP-5: In spectator mode, human world steps with ZERO_INPUT
        return stepWorld(this.currState, this.mode === 'spectator' ? ZERO_INPUT : getInput());
      case GamePhase.Finished:
        // Freeze physics — timer stops, car stops immediately
        return this.currState;
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

  // ── AI observation builder (CP-3 fix: 4 args to castRays) ──

  private buildAiObservation(world: WorldState): number[] {
    const rays = castRays(
      world.car.position,
      world.car.heading,
      world.track.innerBoundary,
      world.track.outerBoundary,
    );
    const trackProgress = distanceToTrackCenter(world.car.position, world.track);
    return buildObservation(world, rays, trackProgress);
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

    // CP-6: Reset ALL AI state on restart
    if (this.aiWorld) {
      this.aiWorld = createWorld(this.track);
      this.prevAiWorld = this.aiWorld;
      this.aiAction = [0, 0, 0];
      this.aiInferSeq++; // invalidate any in-flight inference
      this.aiInferInFlight = false;
    }
    // Grace period reset
    this.vsAiGrace = null;
  }

  /** Transition from Loading to Countdown (initial page load). */
  startGame(): void {
    this.resetWorld(true);
  }

  // ── Public accessors ──

  get currentWorldState(): WorldState { return this.currState; }
  get currentRaceState(): RaceState { return this.raceController.state; }
  get trackState() { return this.track; }
  get gameMode(): GameMode { return this.mode; }

  /** Expose AI world for external consumers (WorldRenderer ghost car, celebration comparison). */
  get currentAiWorldState(): WorldState | null { return this.aiWorld; }

  /** Expose previous AI world state for interpolation. */
  get prevAiWorldState(): WorldState | null { return this.prevAiWorld; }

  /** Grace period state for overlay rendering (vs-ai mode only). */
  get vsAiGraceState(): VsAiGraceState | null { return this.vsAiGrace; }
}
