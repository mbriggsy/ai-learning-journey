/**
 * RaceController — Headless Game State Machine
 *
 * Owns all game-phase logic: countdown, racing, paused, respawning, finished.
 * Lives in src/engine/ with zero renderer/browser imports.
 * The renderer's GameLoop calls step() and reads state.
 * The AI bridge (Phase 4) uses RaceController directly.
 */

import type { TimingState } from './types';

// ─────────────────────────────────────────────────────────
// Game Phase & Race State (moved from src/renderer/GameState.ts)
// ─────────────────────────────────────────────────────────

export enum GamePhase {
  Loading    = 'loading',
  Countdown  = 'countdown',
  Racing     = 'racing',
  Paused     = 'paused',
  Respawning = 'respawning',
  Finished   = 'finished',
}

/** Value indicating unlimited laps (freeplay mode). */
export const FREEPLAY_LAPS = 0;

export interface RaceState {
  phase: GamePhase;
  /** Countdown beat index: 3, 2, 1, 0=GO. -1 when not in countdown. */
  countdownBeat: number;
  /** Ticks remaining until next countdown beat. */
  countdownTicksLeft: number;
  /** Ticks of near-zero velocity for stuck detection (MECH-13). */
  stuckTicks: number;
  /** Ticks remaining in the respawn fade (30 ticks = 0.5s). */
  respawnTicksLeft: number;
  /** Whether this is the very first race start (only first gets countdown). */
  initialLoad: boolean;
  /** Number of laps to race (0 = freeplay/unlimited). */
  targetLaps: number;
}

export function createInitialRaceState(): RaceState {
  return {
    phase: GamePhase.Loading,
    countdownBeat: COUNTDOWN_BEATS,
    countdownTicksLeft: COUNTDOWN_BEAT_TICKS,
    stuckTicks: 0,
    respawnTicksLeft: 0,
    initialLoad: true,
    targetLaps: FREEPLAY_LAPS,
  };
}

// ─────────────────────────────────────────────────────────
// Constants (moved from GameLoop.ts)
// ─────────────────────────────────────────────────────────

/** Ticks per countdown beat (60 = 1 second at 60Hz) */
export const COUNTDOWN_BEAT_TICKS = 60;
/** Number of countdown beats before GO (3-2-1-GO) */
export const COUNTDOWN_BEATS = 3;
/** Speed threshold below which car is considered stuck */
export const STUCK_SPEED_THRESHOLD = 2.0;
/** Ticks of being stuck before triggering respawn (300 = 5 seconds) */
export const STUCK_TIMEOUT_TICKS = 300;
/** Ticks for the respawn fade animation (30 = 0.5 seconds) */
export const RESPAWN_FADE_TICKS = 30;

// ─────────────────────────────────────────────────────────
// Control signals — what the caller wants to do this tick
// ─────────────────────────────────────────────────────────

export interface RaceControlSignals {
  /** True on the first tick of a pause request (debounced by caller) */
  togglePause: boolean;
  /** True on the first tick of a restart request (debounced by caller) */
  restart: boolean;
  /** True on the first tick of a quit-to-menu request (debounced by caller) */
  quitToMenu: boolean;
}

// ─────────────────────────────────────────────────────────
// Step result — action the caller should perform
// ─────────────────────────────────────────────────────────

export enum RaceAction {
  /** No special action — proceed normally */
  None = 'none',
  /** Caller should reset the world without countdown */
  ResetNoCd = 'reset_no_cd',
  /** Car should respawn at last checkpoint (fade complete) */
  Respawn = 'respawn',
  /** Player wants to quit to track select */
  QuitToMenu = 'quit_to_menu',
}

// ─────────────────────────────────────────────────────────
// RaceController — headless game state machine
// ─────────────────────────────────────────────────────────

export class RaceController {
  private _state: RaceState = createInitialRaceState();

  get state(): Readonly<RaceState> { return this._state; }

  /**
   * Advance the state machine by one tick.
   * @param signals - Abstract control inputs (pause, restart) from the caller
   * @param carSpeed - Current car speed for stuck detection
   * @param timing - Current timing state for finish detection
   * @returns RaceAction the caller should perform
   */
  step(signals: RaceControlSignals, carSpeed: number, timing?: TimingState): RaceAction {
    const rs = this._state;

    switch (rs.phase) {
      case GamePhase.Loading:
        return RaceAction.None;

      case GamePhase.Countdown:
        return this.tickCountdown();

      case GamePhase.Racing:
        return this.tickRacing(signals, carSpeed, timing);

      case GamePhase.Paused:
        return this.tickPaused(signals);

      case GamePhase.Respawning:
        return this.tickRespawning();

      case GamePhase.Finished:
        return this.tickFinished(signals);

      default: {
        const _exhaustive: never = rs.phase;
        return RaceAction.None;
      }
    }
  }

  /** Set the target lap count. Persists across reset(). */
  configure(targetLaps: number): void {
    this._state.targetLaps = targetLaps;
  }

  /** Reset the state machine. countdown=true for initial load, false for R-key. */
  reset(countdown: boolean): void {
    const targetLaps = this._state.targetLaps;
    this._state = createInitialRaceState();
    this._state.targetLaps = targetLaps;
    if (countdown) {
      this._state.phase = GamePhase.Countdown;
    } else {
      this._state.phase = GamePhase.Racing;
      this._state.initialLoad = false;
    }
  }

  /** Transition from Loading to Countdown (initial page load). */
  startGame(): void {
    this.reset(true);
  }

  // ─── Phase tick handlers ───────────────────────────────

  private tickCountdown(): RaceAction {
    const rs = this._state;
    rs.countdownTicksLeft--;
    if (rs.countdownTicksLeft <= 0) {
      if (rs.countdownBeat > 0) {
        rs.countdownBeat--;
        rs.countdownTicksLeft = COUNTDOWN_BEAT_TICKS;
      } else {
        rs.phase = GamePhase.Racing;
      }
    }
    return RaceAction.None;
  }

  private tickRacing(signals: RaceControlSignals, carSpeed: number, timing?: TimingState): RaceAction {
    const rs = this._state;

    // Finish detection: race completes when the car crosses the target lap count
    if (
      timing &&
      rs.targetLaps !== FREEPLAY_LAPS &&
      timing.lapComplete &&
      timing.currentLap > rs.targetLaps
    ) {
      rs.phase = GamePhase.Finished;
      return RaceAction.None;
    }

    // Stuck detection (MECH-13)
    if (carSpeed < STUCK_SPEED_THRESHOLD) {
      rs.stuckTicks++;
      if (rs.stuckTicks >= STUCK_TIMEOUT_TICKS) {
        rs.phase = GamePhase.Respawning;
        rs.respawnTicksLeft = RESPAWN_FADE_TICKS;
        rs.stuckTicks = 0;
        return RaceAction.None;
      }
    } else {
      rs.stuckTicks = 0;
    }

    // Restart request (priority over pause)
    if (signals.restart) {
      return RaceAction.ResetNoCd;
    }

    // Pause request
    if (signals.togglePause) {
      rs.phase = GamePhase.Paused;
    }

    return RaceAction.None;
  }

  private tickFinished(signals: RaceControlSignals): RaceAction {
    // Restart (R key)
    if (signals.restart) {
      return RaceAction.ResetNoCd;
    }
    // Quit to menu (Q or ESC)
    if (signals.quitToMenu || signals.togglePause) {
      return RaceAction.QuitToMenu;
    }
    return RaceAction.None;
  }

  private tickPaused(signals: RaceControlSignals): RaceAction {
    const rs = this._state;

    // Quit to menu (highest priority in pause)
    if (signals.quitToMenu) {
      return RaceAction.QuitToMenu;
    }

    // Restart from pause (priority over resume)
    if (signals.restart) {
      return RaceAction.ResetNoCd;
    }

    // Resume on toggle pause
    if (signals.togglePause) {
      rs.phase = GamePhase.Racing;
    }

    return RaceAction.None;
  }

  private tickRespawning(): RaceAction {
    const rs = this._state;
    rs.respawnTicksLeft--;
    if (rs.respawnTicksLeft <= 0) {
      rs.phase = GamePhase.Racing;
      return RaceAction.Respawn;
    }
    return RaceAction.None;
  }
}
