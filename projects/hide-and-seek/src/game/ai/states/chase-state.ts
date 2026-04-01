import type { FSMState } from '../../../types/fsm.js';
import type { SeekerContext } from '../seeker-fsm.js';
import { clearPath, requestPathTo, moveAlongPath, isPathComplete, checkDoorOnPath } from '../seeker-fsm.js';
import { SEEKER } from '../../../constants.js';

export class ChaseState implements FSMState<SeekerContext> {
  readonly name = 'chase';

  onEnter(ctx: SeekerContext): void {
    clearPath(ctx.ai);
    ctx.ai.menaceTicks = 0;
    ctx.ai.chaseLostTicks = 0;
    ctx.ai.chaseRepathCounter = 0;

    // Request initial path to last known position
    if (ctx.ai.lastKnownHiderPos) {
      requestPathTo(ctx, ctx.ai.lastKnownHiderPos.x, ctx.ai.lastKnownHiderPos.y);
    }
  }

  onUpdate(ctx: SeekerContext, dt: number): void {
    const { ai, config } = ctx;

    // Menace gauge: count continuous chase ticks
    if (config.menaceLimitTicks > 0) {
      ai.menaceTicks++;
      if (ai.menaceTicks >= config.menaceLimitTicks) {
        // Force PATROL — menace limit reached
        ai.menaceCooldownTicks = config.menaceCooldownTicks;
        ctx.render.fsmState = 'patrol';
        return;
      }
    }

    // Process action queue (door opening)
    if (!ctx.actionQueue.isEmpty()) return;

    // Check for closed door on path
    if (checkDoorOnPath(ctx)) return;

    // Follow path
    moveAlongPath(ctx, config.chaseSpeed, dt);

    // Re-path every CHASE_REPATH_TICKS if we have a target
    ai.chaseRepathCounter++;
    if (ai.chaseRepathCounter >= SEEKER.CHASE_REPATH_TICKS && ai.lastKnownHiderPos && !ai.pendingPath) {
      ai.chaseRepathCounter = 0;
      requestPathTo(ctx, ai.lastKnownHiderPos.x, ai.lastKnownHiderPos.y);
    }

    // If path complete and no LOS, wait for chase timeout
    if (isPathComplete(ai) && ai.currentPath.length > 0) {
      clearPath(ai);
    }
  }

  onExit(ctx: SeekerContext): void {
    ctx.ai.menaceTicks = 0;
  }
}
