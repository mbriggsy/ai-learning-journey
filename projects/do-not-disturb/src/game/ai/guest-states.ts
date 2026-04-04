import type { FSMState } from '../../types/fsm';
import type { GuestContext } from './guest-context';
import type { Position } from '../../types/state';
import { MONSTER, WORLD } from '../../constants';

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function directionTo(from: Position, to: Position): number {
  return to.x >= from.x ? 1 : -1;
}

export function chooseAmbushSpot(
  availableSpots: readonly Position[],
  currentPosition: Position,
): Position {
  if (availableSpots.length === 0) return { ...currentPosition };
  if (availableSpots.length === 1) return { ...availableSpots[0]! };

  // Pick the furthest spot from current position (maximizes repositioning)
  let bestSpot = availableSpots[0]!;
  let bestDist = 0;
  for (const spot of availableSpots) {
    const d = distance(spot, currentPosition);
    if (d > bestDist) {
      bestDist = d;
      bestSpot = spot;
    }
  }
  return { ...bestSpot };
}

export const AmbushState: FSMState<GuestContext> = {
  onEnter(ctx) {
    ctx.position = { ...ctx.ambushSpot };
    ctx.velocity = { x: 0, y: 0 };
    ctx.disguised = true;
  },
  onUpdate(ctx, _dt) {
    const dist = distance(ctx.position, ctx.playerPosition);
    if (dist < MONSTER.GUEST_DETECT_RANGE_TILES * WORLD.TILE_SIZE) {
      ctx.fsm.transition(LungeState);
    }
  },
  onExit(ctx) {
    ctx.disguised = false;
  },
};

export const LungeState: FSMState<GuestContext> = {
  onEnter(ctx) {
    ctx.lungeDirection = directionTo(ctx.position, ctx.playerPosition);
    ctx.lungeDistance = 0;
    ctx.velocity = { x: ctx.lungeDirection * MONSTER.GUEST_LUNGE_SPEED, y: 0 };
    ctx.emitter.emit('MONSTER_ALERT', { monsterId: 'guest', position: ctx.position });
  },
  onUpdate(ctx, dt) {
    const step = MONSTER.GUEST_LUNGE_SPEED * dt;
    ctx.position = {
      x: ctx.position.x + ctx.lungeDirection * step,
      y: ctx.position.y,
    };
    ctx.lungeDistance += step;

    // Check catch
    if (distance(ctx.position, ctx.playerPosition) < MONSTER.CATCH_RADIUS) {
      ctx.emitter.emit('MONSTER_CATCH', 'guest');
      return;
    }

    // Limited range
    if (ctx.lungeDistance >= MONSTER.GUEST_LUNGE_RANGE_TILES * WORLD.TILE_SIZE) {
      ctx.fsm.transition(ResetState);
    }
  },
  onExit(ctx) {
    ctx.velocity = { x: 0, y: 0 };
  },
};

export const ResetState: FSMState<GuestContext> = {
  onEnter(ctx) {
    ctx.resetTimer = MONSTER.GUEST_RESET_COOLDOWN_S;
  },
  onUpdate(ctx, dt) {
    ctx.resetTimer -= dt;
    if (ctx.resetTimer <= 0) {
      ctx.ambushSpot = chooseAmbushSpot(ctx.availableSpots, ctx.position);
      ctx.fsm.transition(AmbushState);
    }
  },
  onExit(ctx) {},
};
