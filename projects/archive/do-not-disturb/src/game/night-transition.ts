import { NIGHT_TRANSITION } from '../constants';

export type TransitionPhase = 'fade-out' | 'text' | 'monster-intro' | 'fade-in' | 'done';

export type NightTransition = {
  start(fromNight: number, toNight: number): void;
  update(dt: number): void;
  readonly phase: TransitionPhase;
  readonly progress: number; // 0-1 within current phase
  readonly displayText: string | null;
  readonly isDone: boolean;
};

// Nights that introduce a new monster get an extra intro beat
const MONSTER_INTRO_NIGHTS: Record<number, string> = {
  2: 'What was THAT?',
  3: 'Something else is here...',
};

export function createNightTransition(): NightTransition {
  let phase: TransitionPhase = 'done';
  let timer = 0;
  let phaseDuration = 0;
  let toNight = 0;
  let hasMonsterIntro = false;
  let introText: string | null = null;

  function advancePhase() {
    switch (phase) {
      case 'fade-out':
        phase = 'text';
        phaseDuration = NIGHT_TRANSITION.TEXT_HOLD_S;
        timer = phaseDuration;
        break;
      case 'text':
        if (hasMonsterIntro) {
          phase = 'monster-intro';
          phaseDuration = NIGHT_TRANSITION.MONSTER_INTRO_S;
          timer = phaseDuration;
        } else {
          phase = 'fade-in';
          phaseDuration = NIGHT_TRANSITION.FADE_IN_S;
          timer = phaseDuration;
        }
        break;
      case 'monster-intro':
        phase = 'fade-in';
        phaseDuration = NIGHT_TRANSITION.FADE_IN_S;
        timer = phaseDuration;
        break;
      case 'fade-in':
        phase = 'done';
        timer = 0;
        break;
    }
  }

  return {
    start(fromNight: number, to: number) {
      toNight = to;
      hasMonsterIntro = toNight in MONSTER_INTRO_NIGHTS;
      introText = MONSTER_INTRO_NIGHTS[toNight] ?? null;
      phase = 'fade-out';
      phaseDuration = NIGHT_TRANSITION.FADE_OUT_S;
      timer = phaseDuration;
    },

    update(dt: number) {
      if (phase === 'done') return;
      timer -= dt;
      if (timer <= 0) {
        advancePhase();
      }
    },

    get phase() { return phase; },
    get progress() {
      if (phase === 'done' || phaseDuration === 0) return 1;
      return Math.max(0, 1 - timer / phaseDuration);
    },
    get displayText() {
      if (phase === 'text') return `Night ${toNight}`;
      if (phase === 'monster-intro') return introText;
      return null;
    },
    get isDone() { return phase === 'done'; },
  };
}
