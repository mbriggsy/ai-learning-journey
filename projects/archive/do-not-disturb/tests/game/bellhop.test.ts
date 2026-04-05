import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../../src/game/fsm';
import { createBellhopContext } from '../../src/game/ai/bellhop-context';
import { PatrolState, AlertState, InvestigateState, ConfusedState } from '../../src/game/ai/bellhop-states';
import { createEmitter } from '../../src/game/events';
import { MONSTER } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const ctx = createBellhopContext({ x: 100, y: 50 }, 'room-a', emitter);
  const fsm = createFSM(PatrolState, ctx);
  ctx.fsm = fsm;
  return { emitter, ctx, fsm };
}

describe('Bellhop FSM', () => {
  it('starts in Patrol state', () => {
    const { fsm } = makeSetup();
    expect(fsm.currentState).toBe(PatrolState);
  });

  it('Patrol → Alert when loud noise heard', () => {
    const { ctx, fsm } = makeSetup();
    ctx.heardNoise = { sourceZoneId: 'room-b', level: MONSTER.BELLHOP_ALERT_THRESHOLD, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(AlertState);
  });

  it('Patrol ignores noise below threshold', () => {
    const { ctx, fsm } = makeSetup();
    ctx.heardNoise = { sourceZoneId: 'room-b', level: MONSTER.BELLHOP_ALERT_THRESHOLD - 0.01, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(PatrolState);
  });

  it('Alert → Investigate when reached target with no new noise', () => {
    const { ctx, fsm } = makeSetup();
    ctx.heardNoise = { sourceZoneId: 'room-b', level: 0.5, position: { x: 200, y: 50 } };
    fsm.update(0.016); // → Alert
    ctx.heardNoise = null;
    ctx.reachedTarget = true;
    fsm.update(0.016); // → Investigate
    expect(fsm.currentState).toBe(InvestigateState);
  });

  it('Investigate → Confused after timer expires', () => {
    const { ctx, fsm } = makeSetup();
    // Patrol → Alert
    ctx.heardNoise = { sourceZoneId: 'room-b', level: 0.5, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    // Alert → Investigate
    ctx.heardNoise = null;
    ctx.reachedTarget = true;
    fsm.update(0.016);
    expect(fsm.currentState).toBe(InvestigateState);
    // Run out investigate timer
    fsm.update(MONSTER.BELLHOP_INVESTIGATE_S + 0.1);
    expect(fsm.currentState).toBe(ConfusedState);
  });

  it('Confused → Patrol after timer expires', () => {
    const { ctx, fsm } = makeSetup();
    // Get to Confused state
    ctx.heardNoise = { sourceZoneId: 'room-b', level: 0.5, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    ctx.heardNoise = null;
    ctx.reachedTarget = true;
    fsm.update(0.016);
    fsm.update(MONSTER.BELLHOP_INVESTIGATE_S + 0.1);
    expect(fsm.currentState).toBe(ConfusedState);
    // Run out confused timer
    fsm.update(MONSTER.BELLHOP_CONFUSED_S + 0.1);
    expect(fsm.currentState).toBe(PatrolState);
  });

  it('Investigate → Alert on new noise', () => {
    const { ctx, fsm } = makeSetup();
    ctx.heardNoise = { sourceZoneId: 'room-b', level: 0.5, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    ctx.heardNoise = null;
    ctx.reachedTarget = true;
    fsm.update(0.016);
    expect(fsm.currentState).toBe(InvestigateState);
    // New noise
    ctx.heardNoise = { sourceZoneId: 'room-c', level: 0.3, position: { x: 300, y: 50 } };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(AlertState);
  });

  it('Alert emits MONSTER_ALERT event', () => {
    const { emitter, ctx, fsm } = makeSetup();
    const fn = vi.fn();
    emitter.on('MONSTER_ALERT', fn);
    ctx.heardNoise = { sourceZoneId: 'room-b', level: 0.5, position: { x: 200, y: 50 } };
    fsm.update(0.016);
    expect(fn).toHaveBeenCalledWith({ monsterId: 'bellhop', position: { x: 100, y: 50 } });
  });

  it('3 concurrent Bellhop FSMs dont cross-contaminate (insight 005)', () => {
    const emitter = createEmitter<GameEventMap>();
    const ctx1 = createBellhopContext({ x: 0, y: 0 }, 'zone-1', emitter);
    const ctx2 = createBellhopContext({ x: 100, y: 0 }, 'zone-2', emitter);
    const ctx3 = createBellhopContext({ x: 200, y: 0 }, 'zone-3', emitter);

    const fsm1 = createFSM(PatrolState, ctx1); ctx1.fsm = fsm1;
    const fsm2 = createFSM(PatrolState, ctx2); ctx2.fsm = fsm2;
    const fsm3 = createFSM(PatrolState, ctx3); ctx3.fsm = fsm3;

    // Only ctx1 hears noise
    ctx1.heardNoise = { sourceZoneId: 'room-a', level: 0.5, position: { x: 50, y: 0 } };
    fsm1.update(0.016);
    fsm2.update(0.016);
    fsm3.update(0.016);

    expect(fsm1.currentState).toBe(AlertState);
    expect(fsm2.currentState).toBe(PatrolState); // unaffected
    expect(fsm3.currentState).toBe(PatrolState); // unaffected
  });
});
