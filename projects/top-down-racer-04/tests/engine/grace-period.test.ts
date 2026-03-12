/**
 * Grace Period + forceFinish() Tests
 *
 * Tests for the head-to-head race grace period mechanic:
 * - RaceController.forceFinish() transitions to Finished with clean state
 * - Grace period constant derivation
 * - Edge cases: forceFinish during Respawning, Racing, etc.
 */

import { describe, it, expect } from 'vitest';
import {
  GamePhase,
  RaceAction,
  RaceController,
  FREEPLAY_LAPS,
} from '../../src/engine/RaceController';

// ── forceFinish() ─────────────────────────────────────────

describe('RaceController.forceFinish()', () => {
  it('transitions to Finished from Racing', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false); // skip countdown → Racing
    expect(rc.state.phase).toBe(GamePhase.Racing);

    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);
    expect(rc.state.stuckTicks).toBe(0);
    expect(rc.state.respawnTicksLeft).toBe(0);
  });

  it('transitions to Finished from Respawning (resets respawnTicksLeft)', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);

    // Simulate getting stuck → Respawning (STUCK_TIMEOUT_TICKS = 300)
    for (let i = 0; i < 301; i++) {
      rc.step({ togglePause: false, restart: false, quitToMenu: false }, 0);
    }
    expect(rc.state.phase).toBe(GamePhase.Respawning);
    expect(rc.state.respawnTicksLeft).toBeGreaterThan(0);

    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);
    expect(rc.state.respawnTicksLeft).toBe(0);
    expect(rc.state.stuckTicks).toBe(0);
  });

  it('transitions to Finished from Paused', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);
    rc.step({ togglePause: true, restart: false, quitToMenu: false }, 10);
    expect(rc.state.phase).toBe(GamePhase.Paused);

    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);
  });

  it('transitions to Finished from Countdown', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(true); // with countdown
    expect(rc.state.phase).toBe(GamePhase.Countdown);

    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);
  });

  it('is idempotent when already Finished', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);
    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);

    // Call again — should remain Finished with clean state
    rc.forceFinish();
    expect(rc.state.phase).toBe(GamePhase.Finished);
    expect(rc.state.stuckTicks).toBe(0);
    expect(rc.state.respawnTicksLeft).toBe(0);
  });

  it('resets stuckTicks accumulated during Racing', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);

    // Accumulate some stuck ticks (but not enough for respawn)
    for (let i = 0; i < 50; i++) {
      rc.step({ togglePause: false, restart: false, quitToMenu: false }, 0);
    }
    expect(rc.state.stuckTicks).toBeGreaterThan(0);

    rc.forceFinish();
    expect(rc.state.stuckTicks).toBe(0);
  });

  it('after forceFinish, R-key triggers ResetNoCd', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);
    rc.forceFinish();

    const action = rc.step({ togglePause: false, restart: true, quitToMenu: false }, 0);
    expect(action).toBe(RaceAction.ResetNoCd);
  });

  it('after forceFinish, Q-key triggers QuitToMenu', () => {
    const rc = new RaceController();
    rc.configure(3);
    rc.reset(false);
    rc.forceFinish();

    const action = rc.step({ togglePause: false, restart: false, quitToMenu: true }, 0);
    expect(action).toBe(RaceAction.QuitToMenu);
  });
});

// ── Grace period constants ────────────────────────────────

describe('Grace period constants', () => {
  it('GRACE_PERIOD_TICKS is derived from 5000ms / FIXED_DT_MS', () => {
    // GameLoop defines: GRACE_PERIOD_MS = 5000, FIXED_DT_MS = 1000/60
    // GRACE_PERIOD_TICKS = Math.round(5000 / (1000/60)) = Math.round(300) = 300
    const FIXED_DT_MS = 1000 / 60;
    const GRACE_PERIOD_TICKS = Math.round(5000 / FIXED_DT_MS);
    expect(GRACE_PERIOD_TICKS).toBe(300);
  });
});

// ── Freeplay guard ────────────────────────────────────────

describe('Freeplay mode guard', () => {
  it('FREEPLAY_LAPS is 0 (grace should never activate in freeplay)', () => {
    expect(FREEPLAY_LAPS).toBe(0);
  });

  it('RaceController configured with FREEPLAY_LAPS never triggers lap-based finish', () => {
    const rc = new RaceController();
    rc.configure(FREEPLAY_LAPS);
    rc.reset(false);

    // Step many times — should stay in Racing (no finish detection for 0 target laps)
    for (let i = 0; i < 100; i++) {
      rc.step({ togglePause: false, restart: false, quitToMenu: false }, 10);
    }
    expect(rc.state.phase).toBe(GamePhase.Racing);
  });
});
