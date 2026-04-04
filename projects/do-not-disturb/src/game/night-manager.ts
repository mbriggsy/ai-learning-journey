import type { Emitter } from './events';
import type { NightConfig } from './night-config';
import { getNightConfig } from './night-config';
import { MONSTER, NIGHT_TRANSITION } from '../constants';

export type NightPhase =
  | 'starting'    // transition in, phone ringing
  | 'playing'     // active gameplay
  | 'caught'      // catch animation playing
  | 'transitioning' // between nights
  | 'ending';     // game complete after night 5

export type NightManagerState = {
  readonly currentNight: number;
  readonly phase: NightPhase;
  readonly config: NightConfig;
  readonly retryCount: number;
  readonly timer: number;
  readonly caughtBy: string | null;
};

export type NightManager = {
  start(night: number): void;
  update(dt: number): void;
  onCatch(monsterId: string): void;
  onEscape(): void;
  readonly state: NightManagerState;
  getMonsterSpeed(baseSpeed: number): number;
};

export function createNightManager(emitter: Emitter): NightManager {
  let currentNight = 1;
  let phase: NightPhase = 'starting';
  let config: NightConfig = getNightConfig(1);
  let retryCount = 0;
  let timer = 0;
  let caughtBy: string | null = null;

  function startNight(night: number) {
    currentNight = night;
    config = getNightConfig(night);
    phase = 'starting';
    timer = 0;
    caughtBy = null;
    emitter.emit('NIGHT_START', night);
  }

  return {
    start(night: number) {
      retryCount = 0;
      startNight(night);
    },

    update(dt: number) {
      if (phase === 'caught') {
        timer -= dt;
        if (timer <= 0) {
          // Restart same night
          retryCount++;
          emitter.emit('CATCH_SEQUENCE_END');
          startNight(currentNight);
        }
      }

      if (phase === 'transitioning') {
        timer -= dt;
        if (timer <= 0) {
          emitter.emit('NIGHT_TRANSITION_END', currentNight);
          phase = 'starting';
        }
      }
    },

    onCatch(monsterId: string) {
      if (phase !== 'playing' && phase !== 'starting') return;
      phase = 'caught';
      caughtBy = monsterId;
      const catchDuration =
        monsterId === 'bellhop' ? MONSTER.BELLHOP_CATCH_DURATION_S :
        monsterId === 'housekeeper' ? MONSTER.HOUSEKEEPER_CATCH_DURATION_S :
        MONSTER.GUEST_CATCH_DURATION_S;
      timer = catchDuration;
      emitter.emit('CATCH_SEQUENCE_START', monsterId);
      emitter.emit('NIGHT_END', currentNight, false);
    },

    onEscape() {
      if (phase !== 'playing' && phase !== 'starting') return;
      emitter.emit('NIGHT_END', currentNight, true);

      if (currentNight >= 5) {
        phase = 'ending';
        emitter.emit('GAME_COMPLETE');
      } else {
        const nextNight = currentNight + 1;
        const totalTransition = NIGHT_TRANSITION.FADE_OUT_S
          + NIGHT_TRANSITION.TEXT_HOLD_S
          + NIGHT_TRANSITION.FADE_IN_S;
        timer = totalTransition;
        phase = 'transitioning';
        emitter.emit('NIGHT_TRANSITION_START', currentNight, nextNight);
        currentNight = nextNight;
        config = getNightConfig(nextNight);
        retryCount = 0;
      }
    },

    get state(): NightManagerState {
      return { currentNight, phase, config, retryCount, timer, caughtBy };
    },

    getMonsterSpeed(baseSpeed: number): number {
      return baseSpeed * config.speedMultiplier;
    },
  };
}
