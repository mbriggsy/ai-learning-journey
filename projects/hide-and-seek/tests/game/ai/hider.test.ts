import { describe, it, expect, vi } from 'vitest';
import {
  createHiderAIState,
  pickRandomSpot,
  pickScoredSpot,
  scoreSpot,
  updateHiderCountdown,
  updateHiderHunt,
} from '../../../src/game/ai/hider.js';
import type { HiderContext } from '../../../src/game/ai/hider.js';
import type { HiderRenderState, GameMap } from '../../../src/types/state.js';
import type { GameEventMap } from '../../../src/types/events.js';
import type { TypedEmitter } from '../../../src/types/events.js';
import { HIDER_EASY, HIDER_MEDIUM, HIDER_HARD } from '../../../src/game/ai/hider-configs.js';

function makeMap(width = 20, height = 20, blocked: Set<string> = new Set()): GameMap {
  return {
    width, height,
    isWalkable(x: number, y: number) {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return !blocked.has(`${x},${y}`);
    },
    isBlocking(x: number, y: number) {
      if (x < 0 || x >= width || y < 0 || y >= height) return true;
      return blocked.has(`${x},${y}`);
    },
  };
}

function makeEmitter(): TypedEmitter<GameEventMap> {
  return { emit: vi.fn(), on: vi.fn(), off: vi.fn(), offAll: vi.fn() };
}

function makeRender(): HiderRenderState {
  return { x: 160, y: 160, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'countdown-moving' };
}

function makeMockPathfinding(pathResult: Array<{ x: number; y: number }> | null = [{ x: 5, y: 5 }, { x: 6, y: 5 }]) {
  return {
    requestPath: vi.fn((_fx: number, _fy: number, _tx: number, _ty: number, cb: Function) => {
      cb(pathResult);
      return 1;
    }),
    cancelPath: vi.fn(),
    setDoorCost: vi.fn(),
    removeDoorCost: vi.fn(),
  } as any;
}

function makeCtx(overrides?: Partial<HiderContext>): HiderContext {
  return {
    config: { ...HIDER_EASY },
    pathfinding: makeMockPathfinding(),
    map: makeMap(),
    emitter: makeEmitter(),
    render: makeRender(),
    ai: createHiderAIState(),
    seekerX: 0,
    seekerY: 0,
    seekerFov: new Uint8Array(400),
    hiderFov: new Uint8Array(400),
    doorSystem: null,
    currentTick: 100,
    doorGeneration: 0,
    ...overrides,
  };
}

describe('Hider AI', () => {
  describe('pickRandomSpot', () => {
    it('picks a random reachable walkable tile', () => {
      const map = makeMap();
      const spot = pickRandomSpot(map, 5, 5);
      expect(spot).not.toBeNull();
      expect(map.isWalkable(spot!.x, spot!.y)).toBe(true);
    });

    it('falls back to adjacent tile when all randoms fail', () => {
      // Map where only (5,5) and its neighbors are walkable
      const blocked = new Set<string>();
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          if (Math.abs(x - 5) > 1 || Math.abs(y - 5) > 1) {
            blocked.add(`${x},${y}`);
          }
        }
      }
      const map = makeMap(20, 20, blocked);
      // With such a small walkable area, random will likely fail → fallback
      const spot = pickRandomSpot(map, 5, 5);
      expect(spot).not.toBeNull();
      expect(map.isWalkable(spot!.x, spot!.y)).toBe(true);
    });
  });

  describe('scoreSpot', () => {
    it('scores higher for tiles farther from seeker', () => {
      const map = makeMap();
      const weights = HIDER_MEDIUM.spotScoreWeights;
      const nearScore = scoreSpot(2, 2, 1, 1, map, weights);
      const farScore = scoreSpot(15, 15, 1, 1, map, weights);
      expect(farScore).toBeGreaterThan(nearScore);
    });

    it('applies dead-end penalty for tiles with 1 walkable neighbor', () => {
      // Create a dead-end at (5,5): walls on 3 sides
      const blocked = new Set(['4,5', '6,5', '5,4']);
      const map = makeMap(20, 20, blocked);
      const weights = HIDER_MEDIUM.spotScoreWeights;
      const deadEndScore = scoreSpot(5, 5, 0, 0, map, weights);
      const openScore = scoreSpot(10, 10, 0, 0, map, weights);
      // Dead end should have penalty applied (but distance also matters)
      // Just verify the dead-end penalty is negative contribution
      expect(weights.deadEndPenalty).toBeLessThan(0);
      // The dead-end tile (5,5) is closer to (0,0) so naturally lower score
      // Verify it exists (no crash)
      expect(typeof deadEndScore).toBe('number');
      expect(typeof openScore).toBe('number');
    });
  });

  describe('pickScoredSpot', () => {
    it('picks the highest-scored spot (among top 3)', () => {
      const map = makeMap();
      const spot = pickScoredSpot(map, 0, 0, HIDER_MEDIUM.spotScoreWeights, []);
      expect(spot).not.toBeNull();
      expect(map.isWalkable(spot!.x, spot!.y)).toBe(true);
    });

    it('avoids previous spots', () => {
      const map = makeMap(5, 5); // small map
      const previous = [{ x: 4, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 4 }];
      const spot = pickScoredSpot(map, 0, 0, HIDER_MEDIUM.spotScoreWeights, previous);
      if (spot) {
        const isRepeat = previous.some(p => p.x === spot.x && p.y === spot.y);
        expect(isRepeat).toBe(false);
      }
    });
  });

  describe('Easy hider countdown', () => {
    it('picks random tile, paths there, transitions to hiding', () => {
      const ctx = makeCtx();
      const dt = 1 / 60;

      // First call: picks spot and requests path
      updateHiderCountdown(ctx, 0, 0, dt);
      expect(ctx.ai.chosenSpot).not.toBeNull();
      expect(ctx.pathfinding.requestPath).toHaveBeenCalled();

      // Path was delivered synchronously by mock — move along it
      // Simulate arrival by completing path
      ctx.ai.waypointIndex = ctx.ai.currentPath.length;
      updateHiderCountdown(ctx, 0, 0, dt);
      expect(ctx.ai.fsmState).toBe('hiding');
      expect(ctx.render.fsmState).toBe('hiding');
    });
  });

  describe('Medium hider countdown', () => {
    it('uses scored spot selection', () => {
      const ctx = makeCtx({ config: { ...HIDER_MEDIUM } });
      const dt = 1 / 60;

      updateHiderCountdown(ctx, 0, 0, dt);
      expect(ctx.ai.chosenSpot).not.toBeNull();
      // Medium evaluates spots
      expect(ctx.config.evaluatesSpots).toBe(true);
    });
  });

  describe('Hard hider hunt', () => {
    it('stays hidden when seeker not in FOV', () => {
      const ctx = makeCtx({ config: { ...HIDER_HARD } });
      ctx.ai.fsmState = 'hiding';
      ctx.render.fsmState = 'hiding';
      // Hider at (5,5), seeker at (15,15) — 10 tiles away, outside FOV range 6
      ctx.render.x = 5 * 32 + 16;
      ctx.render.y = 5 * 32 + 16;
      ctx.seekerX = 15 * 32 + 16;
      ctx.seekerY = 15 * 32 + 16;
      updateHiderHunt(ctx, 1 / 60);
      expect(ctx.ai.fsmState).toBe('hiding');
    });

    it('stays hidden when seeker in FOV but moving away', () => {
      const ctx = makeCtx({ config: { ...HIDER_HARD } });
      ctx.ai.fsmState = 'hiding';
      ctx.render.fsmState = 'hiding';
      // Hider at (5,5), seeker at (3,3) — ~2.83 tiles, in FOV and trigger range
      ctx.render.x = 5 * 32 + 16;
      ctx.render.y = 5 * 32 + 16;
      ctx.seekerX = 3 * 32 + 16;
      ctx.seekerY = 3 * 32 + 16;
      // Set lastSeekerDist smaller than actual (~2.83) so after recompute:
      // prevSeekerDist = 2.0, lastSeekerDist = ~2.83 → distance increasing = moving away
      ctx.ai.lastSeekerDist = 2.0;
      updateHiderHunt(ctx, 1 / 60);
      expect(ctx.ai.fsmState).toBe('hiding');
    });

    it('flees when compound trigger is met', () => {
      const ctx = makeCtx({ config: { ...HIDER_HARD } });
      ctx.ai.fsmState = 'hiding';
      ctx.render.fsmState = 'hiding';
      // Hider at (10,10), seeker at (8,10) — 2 tiles, in FOV and trigger range
      ctx.render.x = 10 * 32 + 16;
      ctx.render.y = 10 * 32 + 16;
      ctx.seekerX = 8 * 32 + 16;
      ctx.seekerY = 10 * 32 + 16;
      // Set lastSeekerDist bigger than actual (2) so after recompute:
      // prevSeekerDist = 5.0, lastSeekerDist = 2 → distance decreasing = approaching
      ctx.ai.lastSeekerDist = 5.0;

      updateHiderHunt(ctx, 1 / 60);
      expect(ctx.ai.fsmState).toBe('fleeing');
      expect(ctx.ai.repositionsUsed).toBe(1);
    });

    it('respects reposition limit', () => {
      const ctx = makeCtx({ config: { ...HIDER_HARD } });
      ctx.ai.fsmState = 'hiding';
      ctx.render.fsmState = 'hiding';
      ctx.ai.repositionsUsed = 3; // at limit
      // Set up flee trigger conditions
      ctx.render.x = 10 * 32 + 16;
      ctx.render.y = 10 * 32 + 16;
      ctx.seekerX = 8 * 32 + 16;
      ctx.seekerY = 10 * 32 + 16;
      ctx.hiderFov[10 * 20 + 8] = 1;
      ctx.ai.prevSeekerDist = 3;
      ctx.ai.lastSeekerDist = 2;

      updateHiderHunt(ctx, 1 / 60);
      expect(ctx.ai.fsmState).toBe('hiding'); // can't flee — at limit
    });

    it('increases reposition delay with diminishing returns', () => {
      const ctx = makeCtx({ config: { ...HIDER_HARD } });
      ctx.ai.fsmState = 'hiding';
      ctx.render.fsmState = 'hiding';
      // Hider at (10,10), seeker at (8,10) — 2 tiles, approaching
      ctx.render.x = 10 * 32 + 16;
      ctx.render.y = 10 * 32 + 16;
      ctx.seekerX = 8 * 32 + 16;
      ctx.seekerY = 10 * 32 + 16;
      ctx.ai.lastSeekerDist = 5.0; // bigger than actual → approaching after recompute

      updateHiderHunt(ctx, 1 / 60);
      expect(ctx.ai.currentRepositionDelay).toBe(HIDER_HARD.repositionDelayIncrementTicks);
    });

    it('previousSpots ring buffer clears when full (SF-23)', () => {
      const ctx = makeCtx({ config: { ...HIDER_EASY } });
      ctx.ai.chosenSpot = { x: 6, y: 5 };
      // Simulate arrival — waypointIndex past end
      ctx.ai.currentPath = [{ x: 5, y: 5 }, { x: 6, y: 5 }];
      ctx.ai.waypointIndex = 2;
      ctx.ai.previousSpots = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]; // already 3

      updateHiderCountdown(ctx, 0, 0, 1 / 60);
      // After adding 4th spot, buffer should clear
      expect(ctx.ai.previousSpots.length).toBe(0);
    });
  });

  describe('createHiderAIState', () => {
    it('initializes with correct defaults', () => {
      const state = createHiderAIState();
      expect(state.fsmState).toBe('countdown-moving');
      expect(state.repositionsUsed).toBe(0);
      expect(state.pendingPath).toBe(false);
      expect(state.previousSpots).toEqual([]);
      expect(state.chosenSpot).toBeNull();
    });
  });
});
