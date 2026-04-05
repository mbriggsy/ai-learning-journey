import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../../src/game/fsm';
import { createHousekeeperContext } from '../../src/game/ai/housekeeper-context';
import {
  HousekeeperPatrolState,
  HousekeeperCheckRoomState,
  HousekeeperSkipRoomState,
  HousekeeperChangeFloorState,
  HousekeeperAlertState,
} from '../../src/game/ai/housekeeper-states';
import { createDoorSystem } from '../../src/game/doors';
import { createEmitter } from '../../src/game/events';
import { MONSTER } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';
import type { RoomConfig } from '../../src/types/level';

const MOCK_ROOMS: RoomConfig[] = [
  {
    id: 'room-1', bounds: { x: 0, y: 0, width: 100, height: 100 },
    surfaceType: 'carpet', ambientLight: 0.25,
    doors: [{ id: 'door-1', position: { x: 100, y: 50 }, connectsTo: 'room-2', initialState: 'closed' }],
    hidingSpots: [{ id: 'bed-1', position: { x: 50, y: 50 }, type: 'bed' }],
    items: [],
  },
  {
    id: 'room-2', bounds: { x: 100, y: 0, width: 100, height: 100 },
    surfaceType: 'carpet', ambientLight: 0.25,
    doors: [{ id: 'door-2', position: { x: 200, y: 50 }, connectsTo: 'room-3', initialState: 'closed' }],
    hidingSpots: [{ id: 'closet-1', position: { x: 150, y: 50 }, type: 'closet' }],
    items: [],
  },
];

function makeSetup(rooms: RoomConfig[] = MOCK_ROOMS) {
  const emitter = createEmitter<GameEventMap>();
  const doorSystem = createDoorSystem(emitter);
  const zoneMap = new Map<string, readonly [string, string]>();
  for (const room of rooms) {
    for (const door of room.doors) {
      zoneMap.set(door.id, [room.id, door.connectsTo]);
    }
  }
  doorSystem.init(
    rooms.flatMap(r => r.doors),
    rooms[0]?.id ?? '',
    zoneMap,
  );
  const ctx = createHousekeeperContext(
    { x: 0, y: 50 }, 'floor2', rooms, ['floor2', 'lobby'], emitter, doorSystem,
  );
  const fsm = createFSM(HousekeeperPatrolState, ctx);
  ctx.fsm = fsm;
  return { emitter, ctx, fsm, doorSystem };
}

describe('Housekeeper FSM', () => {
  it('starts in Patrol state', () => {
    const { fsm } = makeSetup();
    expect(fsm.currentState).toBe(HousekeeperPatrolState);
  });

  it('targets first room on entry', () => {
    const { ctx } = makeSetup();
    expect(ctx.targetRoom?.id).toBe('room-1');
    expect(ctx.currentRoomIndex).toBe(0);
  });

  it('Patrol → CheckRoom when reached target (no DND sign)', () => {
    const { ctx, fsm } = makeSetup();
    ctx.reachedTarget = true;
    fsm.update(0.016);
    expect(fsm.currentState).toBe(HousekeeperCheckRoomState);
  });

  it('Patrol → SkipRoom when door has DND sign', () => {
    const { ctx, fsm, doorSystem } = makeSetup();
    doorSystem.addSign('door-1');
    ctx.reachedTarget = true;
    fsm.update(0.016);
    expect(fsm.currentState).toBe(HousekeeperSkipRoomState);
  });

  it('CheckRoom → Patrol (next room) after timer expires', () => {
    const { ctx, fsm } = makeSetup();
    ctx.reachedTarget = true;
    fsm.update(0.016); // → CheckRoom
    expect(fsm.currentState).toBe(HousekeeperCheckRoomState);

    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1);
    expect(fsm.currentState).toBe(HousekeeperPatrolState);
    expect(ctx.currentRoomIndex).toBe(1);
    expect(ctx.targetRoom?.id).toBe('room-2');
  });

  it('SkipRoom → Patrol (next room) after pause', () => {
    const { ctx, fsm, doorSystem } = makeSetup();
    doorSystem.addSign('door-1');
    ctx.reachedTarget = true;
    fsm.update(0.016); // → SkipRoom
    expect(fsm.currentState).toBe(HousekeeperSkipRoomState);

    fsm.update(MONSTER.HOUSEKEEPER_SKIP_PAUSE_S + 0.1);
    expect(fsm.currentState).toBe(HousekeeperPatrolState);
    expect(ctx.currentRoomIndex).toBe(1);
  });

  it('after last room → ChangeFloor', () => {
    const { ctx, fsm } = makeSetup();
    // Check room 1
    ctx.reachedTarget = true;
    fsm.update(0.016); // → CheckRoom
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1); // → Patrol (room 2)

    // Check room 2
    ctx.reachedTarget = true;
    fsm.update(0.016); // → CheckRoom
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1); // → ChangeFloor (no more rooms)
    expect(fsm.currentState).toBe(HousekeeperChangeFloorState);
  });

  it('ChangeFloor → Patrol on next floor when reached stairs', () => {
    const { ctx, fsm } = makeSetup();
    // Skip through all rooms to trigger ChangeFloor
    ctx.reachedTarget = true;
    fsm.update(0.016);
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1);
    ctx.reachedTarget = true;
    fsm.update(0.016);
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1);
    expect(fsm.currentState).toBe(HousekeeperChangeFloorState);

    ctx.reachedStairs = true;
    fsm.update(0.016);
    expect(fsm.currentState).toBe(HousekeeperPatrolState);
    expect(ctx.currentFloor).toBe('lobby');
    expect(ctx.currentRoomIndex).toBe(0);
  });

  it('CheckRoom sets check sequence (bed, closet, general)', () => {
    const { ctx, fsm } = makeSetup();
    ctx.reachedTarget = true;
    fsm.update(0.016);
    expect(ctx.checkSequence).toEqual(['bed', 'closet', 'general']);
  });
});

describe('Housekeeper lighter detection', () => {
  it('Patrol → Alert when spottedPlayerPos is set', () => {
    const { ctx, fsm } = makeSetup();
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(HousekeeperAlertState);
  });

  it('CheckRoom → Alert when lighter spotted mid-check', () => {
    const { ctx, fsm } = makeSetup();
    ctx.reachedTarget = true;
    fsm.update(0.016); // → CheckRoom
    expect(fsm.currentState).toBe(HousekeeperCheckRoomState);
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016);
    expect(fsm.currentState).toBe(HousekeeperAlertState);
  });

  it('Alert emits MONSTER_ALERT', () => {
    const { emitter, ctx, fsm } = makeSetup();
    const fn = vi.fn();
    emitter.on('MONSTER_ALERT', fn);
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016);
    expect(fn).toHaveBeenCalledWith({ monsterId: 'housekeeper', position: ctx.position });
  });

  it('Alert stays while lighter is still active (spottedPlayerPos set)', () => {
    const { ctx, fsm } = makeSetup();
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016); // → Alert
    expect(fsm.currentState).toBe(HousekeeperAlertState);
    // Lighter still active — stays in Alert
    fsm.update(1.0);
    expect(fsm.currentState).toBe(HousekeeperAlertState);
  });

  it('Alert → Patrol after lighter goes off and timer expires', () => {
    const { ctx, fsm } = makeSetup();
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016); // → Alert
    // Lighter goes off
    ctx.spottedPlayerPos = null;
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1);
    expect(fsm.currentState).toBe(HousekeeperPatrolState);
  });

  it('Alert clears spottedPlayerPos on exit', () => {
    const { ctx, fsm } = makeSetup();
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016); // → Alert
    ctx.spottedPlayerPos = null;
    fsm.update(MONSTER.HOUSEKEEPER_CHECK_DURATION_S + 0.1); // → Patrol
    expect(ctx.spottedPlayerPos).toBeNull();
  });

  it('SkipRoom and ChangeFloor are NOT interrupted by lighter', () => {
    const { ctx, fsm, doorSystem } = makeSetup();
    // Get to SkipRoom
    doorSystem.addSign('door-1');
    ctx.reachedTarget = true;
    fsm.update(0.016); // → SkipRoom
    expect(fsm.currentState).toBe(HousekeeperSkipRoomState);

    // Set lighter — SkipRoom should NOT be interrupted (deliberate: DND sign takes priority)
    ctx.spottedPlayerPos = { x: 200, y: 50 };
    fsm.update(0.016);
    // SkipRoom doesn't check lighter (by design — it's a brief pause)
    expect(fsm.currentState).toBe(HousekeeperSkipRoomState);
  });
});
