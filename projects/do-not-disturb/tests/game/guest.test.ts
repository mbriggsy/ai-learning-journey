import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../../src/game/fsm';
import { createGuestContext } from '../../src/game/ai/guest-context';
import { AmbushState, LungeState, ResetState, chooseAmbushSpot } from '../../src/game/ai/guest-states';
import { createEmitter } from '../../src/game/events';
import { MONSTER, WORLD } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

const TILE = WORLD.TILE_SIZE;

const AMBUSH_SPOTS = [
  { x: 50, y: 50 },
  { x: 300, y: 50 },
  { x: 500, y: 50 },
] as const;

function makeSetup(startPos = { x: 50, y: 50 }) {
  const emitter = createEmitter<GameEventMap>();
  const ctx = createGuestContext(startPos, AMBUSH_SPOTS, emitter);
  const fsm = createFSM(AmbushState, ctx);
  ctx.fsm = fsm;
  return { emitter, ctx, fsm };
}

describe('Guest FSM', () => {
  it('starts in Ambush state', () => {
    const { fsm } = makeSetup();
    expect(fsm.currentState).toBe(AmbushState);
  });

  it('is disguised in Ambush state', () => {
    const { ctx } = makeSetup();
    expect(ctx.disguised).toBe(true);
  });

  it('positions at ambush spot on enter', () => {
    const { ctx } = makeSetup({ x: 50, y: 50 });
    expect(ctx.position).toEqual({ x: 50, y: 50 });
  });

  it('Ambush → Lunge when player enters detection range', () => {
    const { ctx, fsm } = makeSetup();
    // Place player just inside detection range (2 tiles = 64px)
    ctx.playerPosition = { x: 50 + (MONSTER.GUEST_DETECT_RANGE_TILES * TILE) - 1, y: 50 };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(LungeState);
  });

  it('Ambush stays when player is outside detection range', () => {
    const { ctx, fsm } = makeSetup();
    // Place player just outside detection range
    ctx.playerPosition = { x: 50 + (MONSTER.GUEST_DETECT_RANGE_TILES * TILE) + 10, y: 50 };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(AmbushState);
  });

  it('disguised clears when leaving Ambush', () => {
    const { ctx, fsm } = makeSetup();
    expect(ctx.disguised).toBe(true);
    ctx.playerPosition = { x: 50 + TILE, y: 50 }; // within 2 tiles
    fsm.update(0.016); // → Lunge
    expect(ctx.disguised).toBe(false);
  });

  it('Lunge emits MONSTER_ALERT', () => {
    const { emitter, ctx, fsm } = makeSetup();
    const fn = vi.fn();
    emitter.on('MONSTER_ALERT', fn);
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016);
    expect(fn).toHaveBeenCalledWith({ monsterId: 'guest', position: { x: 50, y: 50 } });
  });

  it('Lunge moves toward player direction (right)', () => {
    const { ctx, fsm } = makeSetup();
    // Player within detection range, to the right
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    const startX = ctx.position.x;
    fsm.update(0.1); // tick lunge
    expect(ctx.position.x).toBeGreaterThan(startX);
  });

  it('Lunge moves left when player is to the left', () => {
    const { ctx, fsm } = makeSetup({ x: 300, y: 50 });
    // Player within detection range, to the left
    ctx.playerPosition = { x: 300 - TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    const startX = ctx.position.x;
    fsm.update(0.1);
    expect(ctx.position.x).toBeLessThan(startX);
  });

  it('Lunge → catch emits MONSTER_CATCH when reaching player', () => {
    const { emitter, ctx, fsm } = makeSetup();
    const fn = vi.fn();
    emitter.on('MONSTER_CATCH', fn);
    // Place player just inside detection range
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    // Move player to be right at guest position (simulate them standing still)
    ctx.playerPosition = { x: ctx.position.x + MONSTER.CATCH_RADIUS - 1, y: 50 };
    fsm.update(0.016);
    expect(fn).toHaveBeenCalledWith('guest');
  });

  it('Lunge → Reset when max range reached without catch', () => {
    const { ctx, fsm } = makeSetup();
    // Player triggers detection but is far enough to escape
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    // Move player way out of range so no catch
    ctx.playerPosition = { x: 9999, y: 9999 };
    // Advance enough to exceed lunge range (4 tiles = 128px at 400 speed)
    const lungeTime = (MONSTER.GUEST_LUNGE_RANGE_TILES * TILE) / MONSTER.GUEST_LUNGE_SPEED;
    fsm.update(lungeTime + 0.01);
    expect(fsm.currentState).toBe(ResetState);
  });

  it('Reset waits for cooldown before returning to Ambush', () => {
    const { ctx, fsm } = makeSetup();
    // Get to Reset state
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    ctx.playerPosition = { x: 9999, y: 9999 };
    const lungeTime = (MONSTER.GUEST_LUNGE_RANGE_TILES * TILE) / MONSTER.GUEST_LUNGE_SPEED;
    fsm.update(lungeTime + 0.01); // → Reset
    expect(fsm.currentState).toBe(ResetState);

    // Halfway through cooldown — still Reset
    fsm.update(MONSTER.GUEST_RESET_COOLDOWN_S / 2);
    expect(fsm.currentState).toBe(ResetState);

    // Finish cooldown
    fsm.update(MONSTER.GUEST_RESET_COOLDOWN_S / 2 + 0.1);
    expect(fsm.currentState).toBe(AmbushState);
  });

  it('Reset picks new ambush spot before returning to Ambush', () => {
    const { ctx, fsm } = makeSetup();
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    ctx.playerPosition = { x: 9999, y: 9999 };
    const lungeTime = (MONSTER.GUEST_LUNGE_RANGE_TILES * TILE) / MONSTER.GUEST_LUNGE_SPEED;
    fsm.update(lungeTime + 0.01); // → Reset

    const posBeforeReset = { ...ctx.position };
    fsm.update(MONSTER.GUEST_RESET_COOLDOWN_S + 0.1); // → Ambush

    // Should have moved to a new ambush spot (furthest from lunge end position)
    expect(ctx.ambushSpot).not.toEqual(posBeforeReset);
  });

  it('velocity is zero in Ambush and Reset states', () => {
    const { ctx } = makeSetup();
    expect(ctx.velocity).toEqual({ x: 0, y: 0 });
  });

  it('velocity is non-zero during Lunge', () => {
    const { ctx, fsm } = makeSetup();
    ctx.playerPosition = { x: 50 + TILE, y: 50 }; // within detection range
    fsm.update(0.016); // → Lunge
    expect(ctx.velocity.x).not.toBe(0);
  });

  it('velocity resets to zero after Lunge ends', () => {
    const { ctx, fsm } = makeSetup();
    ctx.playerPosition = { x: 50 + TILE, y: 50 };
    fsm.update(0.016); // → Lunge
    ctx.playerPosition = { x: 9999, y: 9999 };
    const lungeTime = (MONSTER.GUEST_LUNGE_RANGE_TILES * TILE) / MONSTER.GUEST_LUNGE_SPEED;
    fsm.update(lungeTime + 0.01); // → Reset
    expect(ctx.velocity).toEqual({ x: 0, y: 0 });
  });

  it('3 concurrent Guest FSMs dont cross-contaminate (insight 005)', () => {
    const emitter = createEmitter<GameEventMap>();
    const ctx1 = createGuestContext({ x: 0, y: 0 }, AMBUSH_SPOTS, emitter);
    const ctx2 = createGuestContext({ x: 300, y: 0 }, AMBUSH_SPOTS, emitter);
    const ctx3 = createGuestContext({ x: 500, y: 0 }, AMBUSH_SPOTS, emitter);

    const fsm1 = createFSM(AmbushState, ctx1); ctx1.fsm = fsm1;
    const fsm2 = createFSM(AmbushState, ctx2); ctx2.fsm = fsm2;
    const fsm3 = createFSM(AmbushState, ctx3); ctx3.fsm = fsm3;

    // Only ctx1 detects player
    ctx1.playerPosition = { x: TILE, y: 0 }; // within 2 tiles of ctx1
    ctx2.playerPosition = { x: 9999, y: 0 }; // far from ctx2
    ctx3.playerPosition = { x: 9999, y: 0 }; // far from ctx3

    fsm1.update(0.016);
    fsm2.update(0.016);
    fsm3.update(0.016);

    expect(fsm1.currentState).toBe(LungeState);
    expect(fsm2.currentState).toBe(AmbushState); // unaffected
    expect(fsm3.currentState).toBe(AmbushState); // unaffected
  });
});

describe('chooseAmbushSpot', () => {
  it('picks furthest spot from current position', () => {
    const spots = [{ x: 100, y: 0 }, { x: 200, y: 0 }, { x: 500, y: 0 }];
    const result = chooseAmbushSpot(spots, { x: 0, y: 0 });
    expect(result).toEqual({ x: 500, y: 0 });
  });

  it('returns current position when no spots available', () => {
    const result = chooseAmbushSpot([], { x: 42, y: 99 });
    expect(result).toEqual({ x: 42, y: 99 });
  });

  it('returns only spot when one available', () => {
    const result = chooseAmbushSpot([{ x: 200, y: 50 }], { x: 0, y: 0 });
    expect(result).toEqual({ x: 200, y: 50 });
  });
});
