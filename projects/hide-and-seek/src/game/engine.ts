import type { InputState } from '../types/input.js';
import type { GameState, PlayingState } from '../types/state.js';
import { SIMULATION } from '../constants.js';
import { updateMovement } from './movement.js';

export class GameEngine {
  private state: GameState;
  private accumulator: number = 0;
  private paused: boolean = false;
  private justResumed: boolean = false;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  tick(deltaMs: number, input: InputState): void {
    if (this.paused) return;
    if (this.justResumed) {
      this.justResumed = false;
      this.accumulator = 0;
      return;
    }
    deltaMs = this.guardDelta(deltaMs);
    this.accumulator += deltaMs;

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

  getState(): Readonly<GameState> {
    return this.state;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.justResumed = true;
  }

  private fixedUpdate(dt: number, input: InputState): void {
    if (this.state.phase !== 'playing') return;

    // Dispatch order (Phase 1: only movement populated):
    // 1. input (already sampled per frame)
    // 2. movement
    const playingState = this.state as { -readonly [K in keyof PlayingState]: PlayingState[K] };
    playingState.player = updateMovement(playingState.player, playingState.map, input, dt);
    // 3. AI decisions (Phase 2)
    // 4. detection (Phase 2)
    // 5. timers (Phase 2)
    // 6. rules (Phase 2)
    // 7. events (Phase 2)
  }

  private guardDelta(delta: number): number {
    if (!Number.isFinite(delta) || delta < 0) return 0;
    if (delta > 1000) return 1000;
    return delta;
  }
}
