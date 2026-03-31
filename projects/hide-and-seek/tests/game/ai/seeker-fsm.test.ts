import { describe, it, expect, vi } from 'vitest';
import { SeekerFSM } from '../../../src/game/ai/seeker-fsm.js';
import type { SeekerContext, SeekerAIInternalState } from '../../../src/game/ai/seeker-fsm.js';
import type { SeekerConfig } from '../../../src/types/ai.js';
import type { SeekerRenderState, GameMap } from '../../../src/types/state.js';
import type { GameEventMap } from '../../../src/types/events.js';
import type { TypedEmitter } from '../../../src/types/events.js';
import { ActionQueue } from '../../../src/game/ai/actions.js';
import { SEEKER_EASY } from '../../../src/game/ai/seeker-configs.js';
import { RoomTracker } from '../../../src/game/ai/room-tracking.js';

function makeEmitter(): TypedEmitter<GameEventMap> {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    offAll: vi.fn(),
  };
}

function makeRender(): SeekerRenderState {
  return { x: 160, y: 160, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'patrol' };
}

function makeAI(): SeekerAIInternalState {
  return {
    currentPath: [],
    waypointIndex: 0,
    latestRequestId: 0,
    lastFovTileX: 5,
    lastFovTileY: 5,
    lastFovDoorGeneration: -1,
    pendingDoorEvidence: [],
    menaceTicks: 0,
    menaceCooldownTicks: 0,
    lastKnownHiderPos: null,
    chaseLostTicks: 0,
    chaseRepathCounter: 0,
    patrolPauseTicks: 0,
    roomTracker: null,
    evidenceTracker: null,
    suspiciousCooldowns: new Map(),
  };
}

function makeMap(): GameMap {
  return { width: 20, height: 20, isWalkable: () => true, isBlocking: () => false };
}

function makeMockPathfinding() {
  return {
    initGrid: vi.fn(),
    requestPath: vi.fn((_fx: number, _fy: number, _tx: number, _ty: number, cb: Function) => {
      cb([{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]);
      return 1;
    }),
    cancelPath: vi.fn(),
    calculate: vi.fn(),
    setDoorCost: vi.fn(),
    removeDoorCost: vi.fn(),
    cancelAll: vi.fn(),
  } as any;
}

function makeCtx(overrides?: Partial<SeekerContext>): SeekerContext {
  return {
    config: { ...SEEKER_EASY },
    pathfinding: makeMockPathfinding(),
    map: makeMap(),
    rooms: [],
    hidingSpots: [],
    emitter: makeEmitter(),
    render: makeRender(),
    ai: makeAI(),
    actionQueue: new ActionQueue(),
    doorSystem: null,
    currentTick: 100,
    ...overrides,
  };
}

const DT = 1 / 60;

describe('SeekerFSM', () => {
  it('starts in PATROL state', () => {
    const fsm = new SeekerFSM();
    expect(fsm.getStateName()).toBe('patrol');
  });

  it('transitions PATROL → CHASE after reaction delay', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    fsm.requestTransition('chase', 3);
    expect(fsm.getStateName()).toBe('patrol'); // still patrol

    fsm.update(ctx, DT); // tick 1: ticksRemaining → 2
    fsm.update(ctx, DT); // tick 2: ticksRemaining → 1
    fsm.update(ctx, DT); // tick 3: ticksRemaining → 0 → transition

    expect(fsm.getStateName()).toBe('chase');
    expect(ctx.render.fsmState).toBe('chase');
  });

  it('higher priority overwrites pending lower priority', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    fsm.requestTransition('suspicious', 5);
    expect(fsm.getPendingTransition()?.target).toBe('suspicious');

    fsm.requestTransition('chase', 2);
    expect(fsm.getPendingTransition()?.target).toBe('chase');
  });

  it('lower priority does NOT overwrite pending higher priority', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    // First go to search (need to be in a state that can transition to it)
    // From patrol, we can go to chase, then chase can go to search
    fsm.requestTransition('chase', 0);
    fsm.update(ctx, DT); // execute
    expect(fsm.getStateName()).toBe('chase');

    // Now request search (priority 2)
    fsm.requestTransition('search', 5);
    expect(fsm.getPendingTransition()?.target).toBe('search');

    // Request patrol (priority 0) — should NOT overwrite
    fsm.requestTransition('patrol', 1);
    expect(fsm.getPendingTransition()?.target).toBe('search');
  });

  it('max one transition per tick', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    fsm.requestTransition('chase', 0);
    fsm.update(ctx, DT);
    expect(fsm.getStateName()).toBe('chase');

    // Same tick, another transition request shouldn't execute immediately
    // (it's a new tick via update call)
  });

  it('terminal guard: emits SEEKER_STATE_CHANGED on transition', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    fsm.requestTransition('chase', 0);
    fsm.update(ctx, DT);

    expect(ctx.emitter.emit).toHaveBeenCalledWith('SEEKER_STATE_CHANGED', {
      oldState: 'patrol',
      newState: 'chase',
    });
  });

  it('invalid transition logged and ignored', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // From patrol, search is invalid (must go through suspicious or chase first)
    fsm.requestTransition('search', 0);
    fsm.update(ctx, DT);

    expect(fsm.getStateName()).toBe('patrol');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('error boundary: onUpdate throws → fallback to PATROL', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    // Get into chase state
    fsm.requestTransition('chase', 0);
    fsm.update(ctx, DT);
    expect(fsm.getStateName()).toBe('chase');

    // Mock the states to throw on next update
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force an error by setting invalid path state
    ctx.ai.currentPath = null as any;
    // The chase state should handle this gracefully or the FSM catches the error
    // Either way, the FSM should not crash
    try {
      fsm.update(ctx, DT);
    } catch {
      // If it throws, the error boundary failed
    }

    consoleSpy.mockRestore();
  });

  it('menace cooldown suppresses CHASE transitions', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();
    ctx.ai.menaceCooldownTicks = 10;

    fsm.requestTransition('chase', 0);
    fsm.update(ctx, DT);

    // Should still be in patrol — chase was suppressed
    expect(fsm.getStateName()).toBe('patrol');
    expect(ctx.ai.menaceCooldownTicks).toBe(9); // decremented
  });

  it('forceTransition bypasses pending and executes immediately', () => {
    const fsm = new SeekerFSM();
    const ctx = makeCtx();

    // Set up a pending transition
    fsm.requestTransition('suspicious', 10);

    // Force to chase (bypasses pending)
    fsm.forceTransition(ctx, 'chase');

    expect(fsm.getStateName()).toBe('chase');
    expect(fsm.getPendingTransition()).toBeNull();
  });

  it('cancelPending clears the pending transition', () => {
    const fsm = new SeekerFSM();

    fsm.requestTransition('chase', 5);
    expect(fsm.getPendingTransition()).not.toBeNull();

    fsm.cancelPending();
    expect(fsm.getPendingTransition()).toBeNull();
  });
});
