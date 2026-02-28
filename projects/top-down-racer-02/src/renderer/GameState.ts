import type { WorldState } from '../engine/types';
import type { TrackState } from '../engine/types';

export const enum GamePhase {
  Loading    = 'loading',
  Countdown  = 'countdown',
  Racing     = 'racing',
  Paused     = 'paused',
  Respawning = 'respawning',
}

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
}

export function createInitialRaceState(): RaceState {
  return {
    phase: GamePhase.Loading,
    countdownBeat: 3,
    countdownTicksLeft: 60, // 1 second per beat
    stuckTicks: 0,
    respawnTicksLeft: 0,
    initialLoad: true,
  };
}
