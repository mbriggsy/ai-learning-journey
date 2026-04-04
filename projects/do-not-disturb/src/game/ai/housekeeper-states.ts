import type { FSMState } from '../../types/fsm';
import type { HousekeeperContext } from './housekeeper-context';
import { MONSTER } from '../../constants';

export const HousekeeperPatrolState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    ctx.reachedTarget = false;
    if (ctx.currentRoomIndex < ctx.floorRooms.length) {
      ctx.targetRoom = ctx.floorRooms[ctx.currentRoomIndex] ?? null;
    }
  },
  onUpdate(ctx, _dt) {
    if (!ctx.reachedTarget) return;

    // Check if door has DND sign
    const room = ctx.floorRooms[ctx.currentRoomIndex];
    if (room) {
      const doorId = room.doors[0]?.id;
      if (doorId && ctx.doorSystem.hasSign(doorId)) {
        ctx.fsm.transition(HousekeeperSkipRoomState);
        return;
      }
    }

    ctx.fsm.transition(HousekeeperCheckRoomState);
  },
  onExit(ctx) {
    ctx.reachedTarget = false;
  },
};

export const HousekeeperCheckRoomState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    ctx.checkTimer = MONSTER.HOUSEKEEPER_CHECK_DURATION_S;
    ctx.checkSequence = ['bed', 'closet', 'general'];
  },
  onUpdate(ctx, dt) {
    ctx.checkTimer -= dt;

    if (ctx.checkTimer <= 0) {
      advanceToNextRoom(ctx);
    }
  },
  onExit(ctx) {
    ctx.checkSequence = [];
  },
};

export const HousekeeperSkipRoomState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    ctx.skipTimer = MONSTER.HOUSEKEEPER_SKIP_PAUSE_S;
  },
  onUpdate(ctx, dt) {
    ctx.skipTimer -= dt;
    if (ctx.skipTimer <= 0) {
      advanceToNextRoom(ctx);
    }
  },
  onExit(ctx) {},
};

export const HousekeeperChangeFloorState: FSMState<HousekeeperContext> = {
  onEnter(ctx) {
    ctx.reachedStairs = false;
    const currentIdx = ctx.floorOrder.indexOf(ctx.currentFloor);
    const nextIdx = (currentIdx + 1) % ctx.floorOrder.length;
    ctx.targetFloor = ctx.floorOrder[nextIdx] ?? ctx.currentFloor;
  },
  onUpdate(ctx, _dt) {
    if (!ctx.reachedStairs) return;
    ctx.currentFloor = ctx.targetFloor;
    ctx.currentRoomIndex = 0;
    ctx.fsm.transition(HousekeeperPatrolState);
  },
  onExit(ctx) {
    ctx.reachedStairs = false;
  },
};

function advanceToNextRoom(ctx: HousekeeperContext): void {
  ctx.currentRoomIndex++;
  if (ctx.currentRoomIndex >= ctx.floorRooms.length) {
    ctx.fsm.transition(HousekeeperChangeFloorState);
  } else {
    ctx.targetRoom = ctx.floorRooms[ctx.currentRoomIndex] ?? null;
    ctx.fsm.transition(HousekeeperPatrolState);
  }
}
