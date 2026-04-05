import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../../src/game/fsm';
import type { FSMState } from '../../src/types/fsm';

type TestContext = {
  log: string[];
  counter: number;
};

function makeState(name: string): FSMState<TestContext> {
  return {
    onEnter: (ctx) => { ctx.log.push(`${name}:enter`); },
    onUpdate: (ctx, dt) => { ctx.log.push(`${name}:update:${dt}`); },
    onExit: (ctx) => { ctx.log.push(`${name}:exit`); },
  };
}

function makeContext(): TestContext {
  return { log: [], counter: 0 };
}

describe('createFSM', () => {
  it('fires onEnter on initial state at creation (insight 008)', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    createFSM(idle, ctx);
    expect(ctx.log).toEqual(['idle:enter']);
  });

  it('transitions fire onExit then onEnter in order', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    const patrol = makeState('patrol');
    const fsm = createFSM(idle, ctx);
    ctx.log = []; // clear initial onEnter

    fsm.transition(patrol);
    expect(ctx.log).toEqual(['idle:exit', 'patrol:enter']);
  });

  it('onUpdate delegates to current state', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    const fsm = createFSM(idle, ctx);
    ctx.log = [];

    fsm.update(0.016);
    expect(ctx.log).toEqual(['idle:update:0.016']);
  });

  it('after transition, update delegates to new state', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    const patrol = makeState('patrol');
    const fsm = createFSM(idle, ctx);
    fsm.transition(patrol);
    ctx.log = [];

    fsm.update(0.016);
    expect(ctx.log).toEqual(['patrol:update:0.016']);
  });

  it('transitioning to same state is a no-op', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    const fsm = createFSM(idle, ctx);
    ctx.log = [];

    fsm.transition(idle);
    expect(ctx.log).toEqual([]);
  });

  it('3 concurrent FSMs with shared states do not cross-contaminate (insight 005)', () => {
    const shared = makeState('shared');

    const ctx1: TestContext = { log: [], counter: 0 };
    const ctx2: TestContext = { log: [], counter: 0 };
    const ctx3: TestContext = { log: [], counter: 0 };

    const fsm1 = createFSM(shared, ctx1);
    const fsm2 = createFSM(shared, ctx2);
    const fsm3 = createFSM(shared, ctx3);

    // Clear initial enters
    ctx1.log = [];
    ctx2.log = [];
    ctx3.log = [];

    // Update only fsm1
    fsm1.update(0.1);
    expect(ctx1.log).toEqual(['shared:update:0.1']);
    expect(ctx2.log).toEqual([]);
    expect(ctx3.log).toEqual([]);

    // Update fsm2 with different dt
    fsm2.update(0.2);
    expect(ctx2.log).toEqual(['shared:update:0.2']);
    expect(ctx1.log).toEqual(['shared:update:0.1']); // unchanged
  });

  it('currentState returns the active state object', () => {
    const ctx = makeContext();
    const idle = makeState('idle');
    const patrol = makeState('patrol');
    const fsm = createFSM(idle, ctx);

    expect(fsm.currentState).toBe(idle);
    fsm.transition(patrol);
    expect(fsm.currentState).toBe(patrol);
  });

  it('context mutations in onEnter are visible to subsequent onUpdate', () => {
    const ctx = makeContext();
    const state: FSMState<TestContext> = {
      onEnter: (c) => { c.counter = 42; },
      onUpdate: (c) => { c.log.push(`counter:${c.counter}`); },
      onExit: () => {},
    };
    const fsm = createFSM(state, ctx);
    fsm.update(0);
    expect(ctx.log).toEqual(['counter:42']);
  });
});
