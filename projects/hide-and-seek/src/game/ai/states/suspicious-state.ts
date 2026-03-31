import type { FSMState } from '../../../types/fsm.js';
import type { SeekerContext } from '../seeker-fsm.js';
import type { SeekerFSMState } from '../../../types/state.js';
import type { FacingDirection } from '../../../types/input.js';
import { clearPath, requestPathTo, moveAlongPath, isPathComplete, updateFacing } from '../seeker-fsm.js';
import { tileToPixelCenter } from '../../map.js';
import { AI } from '../../../constants.js';

/** Stored per-instance during SUSPICIOUS investigation. */
let stimulusX = 0;
let stimulusY = 0;
let ticksRemaining = 0;
let returnState: SeekerFSMState = 'patrol';
let lookAroundPhase = false;
let lookAroundTicks = 0;
const LOOK_DIRECTIONS: FacingDirection[] = ['up', 'right', 'down', 'left'];
let lookDirIndex = 0;

export class SuspiciousState implements FSMState<SeekerContext> {
  readonly name = 'suspicious';

  onEnter(ctx: SeekerContext): void {
    clearPath(ctx.ai);
    ticksRemaining = ctx.config.suspiciousDurationTicks;
    returnState = ctx.render.fsmState === 'suspicious' ? 'patrol' : ctx.render.fsmState;
    lookAroundPhase = false;
    lookAroundTicks = 0;
    lookDirIndex = 0;

    // Face toward stimulus
    const { x: targetX, y: targetY } = tileToPixelCenter(stimulusX, stimulusY);
    updateFacing(ctx.render, targetX, targetY);

    // Path to stimulus position
    requestPathTo(ctx, stimulusX, stimulusY);
  }

  onUpdate(ctx: SeekerContext, dt: number): void {
    ticksRemaining--;

    // Timer expired
    if (ticksRemaining <= 0) {
      // Check for evidence at location (Hard AI)
      if (ctx.ai.evidenceTracker && ctx.doorSystem) {
        const door = ctx.doorSystem.getDoorAt(stimulusX, stimulusY);
        if (door && ctx.ai.evidenceTracker.hasEvidence(door)) {
          // Evidence found → transition to SEARCH
          ctx.ai.lastKnownHiderPos = { x: stimulusX, y: stimulusY };
          // Request transition through the FSM (will be picked up by engine)
          ctx.render.fsmState = 'search';
          return;
        }
      }
      // Nothing found → return to patrol
      ctx.render.fsmState = returnState === 'suspicious' ? 'patrol' : returnState;
      return;
    }

    // Look around phase: arrived at stimulus location
    if (lookAroundPhase) {
      lookAroundTicks--;
      const ticksPerDir = Math.floor(AI.LOOK_AROUND_DURATION_TICKS / LOOK_DIRECTIONS.length);
      if (lookAroundTicks <= 0 && lookDirIndex < LOOK_DIRECTIONS.length - 1) {
        lookDirIndex++;
        lookAroundTicks = ticksPerDir;
        // Update facing to look direction
        const dir = LOOK_DIRECTIONS[lookDirIndex]!;
        ctx.render.facing = dir;
        // Update continuous angle
        const angleMap: Record<FacingDirection, number> = {
          right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2,
        };
        ctx.render.facingAngle = angleMap[dir];
      }
      return;
    }

    // Moving to stimulus
    if (!isPathComplete(ctx.ai)) {
      moveAlongPath(ctx, ctx.config.patrolSpeed, dt);
    }

    // Arrived at stimulus — start looking around
    if (isPathComplete(ctx.ai) && !ctx.ai.pendingPath) {
      lookAroundPhase = true;
      lookDirIndex = 0;
      const ticksPerDir = Math.floor(AI.LOOK_AROUND_DURATION_TICKS / LOOK_DIRECTIONS.length);
      lookAroundTicks = ticksPerDir;
    }
  }

  onExit(_ctx: SeekerContext): void {
    lookAroundPhase = false;
  }

  /** Set stimulus position before entering state. Called by the FSM owner. */
  static setStimulus(x: number, y: number): void {
    stimulusX = x;
    stimulusY = y;
  }
}
