import { SIMULATION } from '../constants';

export type FixedUpdateFn = (dt: number) => void;

export function createEngine(fixedUpdate: FixedUpdateFn) {
  let accumulator = 0;

  return {
    tick(deltaMs: number) {
      const cappedDelta = Math.min(deltaMs, SIMULATION.MAX_DELTA_MS);
      accumulator += cappedDelta;

      let steps = 0;
      while (accumulator >= SIMULATION.FIXED_DT_MS && steps < SIMULATION.MAX_CATCHUP_TICKS) {
        fixedUpdate(SIMULATION.FIXED_DT_S);
        accumulator -= SIMULATION.FIXED_DT_MS;
        steps++;
      }

      if (steps === SIMULATION.MAX_CATCHUP_TICKS) {
        accumulator = 0; // prevent spiral of death
      }

      return steps;
    },

    get accumulator() { return accumulator; },
  };
}
