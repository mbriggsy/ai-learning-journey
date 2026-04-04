import type { FSMState } from '../../types/fsm';
import type { BellhopContext } from './bellhop-context';
import { MONSTER } from '../../constants';

export const PatrolState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.alertLevel = 0;
    ctx.heardNoise = null;
  },
  onUpdate(ctx, _dt) {
    if (ctx.heardNoise && ctx.heardNoise.level >= MONSTER.BELLHOP_ALERT_THRESHOLD) {
      ctx.fsm.transition(AlertState);
    }
  },
  onExit(ctx) {
    ctx.heardNoise = null;
  },
};

export const AlertState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.alertLevel = 1;
    ctx.reachedTarget = false;
    ctx.emitter.emit('MONSTER_ALERT', { monsterId: 'bellhop', position: ctx.position });
  },
  onUpdate(ctx, _dt) {
    if (ctx.reachedTarget && !ctx.heardNoise) {
      ctx.fsm.transition(InvestigateState);
    }
    if (ctx.heardNoise && ctx.heardNoise.level >= MONSTER.BELLHOP_ALERT_THRESHOLD) {
      ctx.reachedTarget = false;
      ctx.heardNoise = null;
    }
  },
  onExit(ctx) {
    ctx.heardNoise = null;
  },
};

export const InvestigateState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.investigateTimer = MONSTER.BELLHOP_INVESTIGATE_S;
  },
  onUpdate(ctx, dt) {
    ctx.investigateTimer -= dt;
    if (ctx.heardNoise && ctx.heardNoise.level >= MONSTER.BELLHOP_HEARING_THRESHOLD) {
      ctx.fsm.transition(AlertState);
      return;
    }
    if (ctx.investigateTimer <= 0) {
      ctx.fsm.transition(ConfusedState);
    }
  },
  onExit(ctx) {
    ctx.heardNoise = null;
  },
};

export const ConfusedState: FSMState<BellhopContext> = {
  onEnter(ctx) {
    ctx.confusedTimer = MONSTER.BELLHOP_CONFUSED_S;
  },
  onUpdate(ctx, dt) {
    ctx.confusedTimer -= dt;
    if (ctx.heardNoise && ctx.heardNoise.level >= MONSTER.BELLHOP_HEARING_THRESHOLD) {
      ctx.fsm.transition(AlertState);
      return;
    }
    if (ctx.confusedTimer <= 0) {
      ctx.fsm.transition(PatrolState);
    }
  },
  onExit(ctx) {
    ctx.heardNoise = null;
  },
};
