import { describe, it, expect } from 'vitest';
import { updateSeekerAI, createSeekerAIState } from '../../../src/game/ai/seeker.js';
import type { SeekerAIState } from '../../../src/game/ai/seeker.js';
import type { SeekerRenderState, GameMap } from '../../../src/types/state.js';
import type { SeekerConfig, PathPoint } from '../../../src/types/ai.js';
import type { PathfindingSystem } from '../../../src/game/ai/pathfinding.js';
import { ActionQueue } from '../../../src/game/ai/actions.js';

const DT = 1 / 60;

function makeConfig(): SeekerConfig {
  return {
    visionRange: 8,
    reactionDelayTicks: 90,
    chaseTimeoutTicks: 180,
    speed: 138, // 120 * 1.15
    patrolPauseMinTicks: 30,
    patrolPauseMaxTicks: 60,
  };
}

function makeRender(overrides: Partial<SeekerRenderState> = {}): SeekerRenderState {
  return {
    x: 160, y: 160, facing: 'down', fsmState: 'patrol',
    ...overrides,
  };
}

function makeAI(overrides: Partial<SeekerAIState> = {}): SeekerAIState {
  return {
    currentPath: [],
    currentWaypointIndex: 0,
    pendingPathId: undefined,
    lastKnownHiderPos: null,
    chaseLostTicks: 0,
    patrolPauseTicks: 0,
    pendingTransition: null,
    lastFovTileX: 5,
    lastFovTileY: 5,
    chaseRepathCounter: 0,
    actionQueue: new ActionQueue(),
    doorStuckTicks: 0,
    ...overrides,
  };
}

function makeMap(): GameMap {
  return {
    width: 20, height: 20,
    isWalkable() { return true; },
    isBlocking() { return false; },
  };
}

function makeMockPathfinding(): PathfindingSystem {
  return {
    initGrid() {},
    requestPath(_fx: number, _fy: number, _tx: number, _ty: number, cb: (path: PathPoint[] | null) => void) {
      // Immediately provide a simple path
      cb([{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]);
      return 1;
    },
    cancelPath() {},
    calculate() {},
  } as unknown as PathfindingSystem;
}

function makeNoPathPathfinding(): PathfindingSystem {
  return {
    initGrid() {},
    requestPath(_fx: number, _fy: number, _tx: number, _ty: number, cb: (path: PathPoint[] | null) => void) {
      cb(null);
      return 1;
    },
    cancelPath() {},
    calculate() {},
  } as unknown as PathfindingSystem;
}

describe('createSeekerAIState', () => {
  it('creates initial state at given position', () => {
    const ai = createSeekerAIState(160, 160);
    expect(ai.currentPath).toEqual([]);
    expect(ai.pendingPathId).toBeUndefined();
    expect(ai.chaseLostTicks).toBe(0);
    expect(ai.patrolPauseTicks).toBe(0);
    expect(ai.pendingTransition).toBeNull();
  });
});

describe('updateSeekerAI', () => {
  describe('PATROL state', () => {
    it('requests a path when no path and no pause', () => {
      const render = makeRender();
      const ai = makeAI();
      let pathRequested = false;
      const pf = {
        ...makeMockPathfinding(),
        requestPath: (_fx: number, _fy: number, _tx: number, _ty: number, cb: (path: PathPoint[] | null) => void) => {
          pathRequested = true;
          cb([{ x: 5, y: 5 }, { x: 6, y: 5 }]);
          return 1;
        },
      } as unknown as PathfindingSystem;

      updateSeekerAI(render, ai, makeConfig(), 'none', { x: 300, y: 300 }, pf, makeMap(), DT);
      expect(pathRequested).toBe(true);
    });

    it('pauses at destination before requesting new path', () => {
      const render = makeRender();
      const ai = makeAI({ patrolPauseTicks: 30 });

      updateSeekerAI(render, ai, makeConfig(), 'none', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.patrolPauseTicks).toBe(29); // decremented
    });

    it('queues transition to CHASE on spotted detection', () => {
      const render = makeRender();
      const ai = makeAI();

      updateSeekerAI(render, ai, makeConfig(), 'spotted', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.pendingTransition).not.toBeNull();
      expect(ai.pendingTransition!.target).toBe('chase');
      expect(ai.pendingTransition!.ticksRemaining).toBe(90);
    });

    it('transitions to CHASE after reaction delay expires', () => {
      const render = makeRender();
      const ai = makeAI({
        pendingTransition: { target: 'chase', ticksRemaining: 1 },
      });
      const config = makeConfig();

      updateSeekerAI(render, ai, config, 'spotted', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(render.fsmState).toBe('chase');
      expect(ai.pendingTransition).toBeNull();
    });

    it('cancels pending transition when detection goes to none', () => {
      const render = makeRender();
      const ai = makeAI({
        pendingTransition: { target: 'chase', ticksRemaining: 50 },
      });

      updateSeekerAI(render, ai, makeConfig(), 'none', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.pendingTransition).toBeNull();
      expect(render.fsmState).toBe('patrol');
    });
  });

  describe('CHASE state', () => {
    it('updates lastKnownHiderPos when hider visible', () => {
      const render = makeRender({ fsmState: 'chase' });
      const ai = makeAI({ lastKnownHiderPos: { x: 100, y: 100 } });

      updateSeekerAI(render, ai, makeConfig(), 'spotted', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.lastKnownHiderPos).toEqual({ x: 300, y: 300 });
    });

    it('increments chaseLostTicks when no LOS', () => {
      const render = makeRender({ fsmState: 'chase' });
      const ai = makeAI({ lastKnownHiderPos: { x: 300, y: 300 } });

      updateSeekerAI(render, ai, makeConfig(), 'none', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.chaseLostTicks).toBe(1);
    });

    it('transitions to PATROL after chase timeout', () => {
      const render = makeRender({ fsmState: 'chase' });
      const config = makeConfig();
      const ai = makeAI({
        chaseLostTicks: config.chaseTimeoutTicks - 1,
        lastKnownHiderPos: { x: 300, y: 300 },
      });

      updateSeekerAI(render, ai, config, 'none', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(render.fsmState).toBe('patrol');
    });

    it('resets chaseLostTicks when LOS reacquired', () => {
      const render = makeRender({ fsmState: 'chase' });
      const ai = makeAI({
        chaseLostTicks: 100,
        lastKnownHiderPos: { x: 300, y: 300 },
      });

      updateSeekerAI(render, ai, makeConfig(), 'spotted', { x: 300, y: 300 }, makeMockPathfinding(), makeMap(), DT);
      expect(ai.chaseLostTicks).toBe(0);
    });
  });

  describe('empty path guard', () => {
    it('stands still with empty path', () => {
      const render = makeRender({ fsmState: 'chase', x: 160, y: 160 });
      const ai = makeAI({
        currentPath: [],
        lastKnownHiderPos: { x: 300, y: 300 },
      });

      updateSeekerAI(render, ai, makeConfig(), 'spotted', { x: 300, y: 300 }, makeNoPathPathfinding(), makeMap(), DT);
      // Position should not be NaN or wildly different
      expect(Number.isFinite(render.x)).toBe(true);
      expect(Number.isFinite(render.y)).toBe(true);
    });
  });

  describe('transition cleanup', () => {
    it('clears old path on state transition', () => {
      const render = makeRender();
      const oldPath = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
      const ai = makeAI({
        currentPath: oldPath,
        currentWaypointIndex: 1,
        pendingTransition: { target: 'chase', ticksRemaining: 1 },
      });

      // Use no-path pathfinding so CHASE doesn't immediately get a new path
      updateSeekerAI(render, ai, makeConfig(), 'spotted', { x: 300, y: 300 }, makeNoPathPathfinding(), makeMap(), DT);
      expect(render.fsmState).toBe('chase');
      // Old path should be cleared (even if chase requests a new one)
      expect(ai.currentPath).not.toBe(oldPath);
      expect(ai.currentWaypointIndex).toBe(0);
    });
  });
});
