import type { BellhopContext } from './bellhop-context';
import type { NoiseSystem } from '../noise';
import type { NoiseEvent } from '../../types/events';
import { MONSTER } from '../../constants';

export function createBellhopHearing(ctx: BellhopContext, noiseSystem: NoiseSystem) {
  const handler = (event: NoiseEvent) => {
    const propagated = noiseSystem.propagate(event.sourceZoneId, event.level);
    const levelAtBellhop = propagated.get(ctx.currentZone) ?? 0;

    if (levelAtBellhop >= MONSTER.BELLHOP_HEARING_THRESHOLD) {
      if (!ctx.heardNoise || levelAtBellhop > ctx.heardNoise.level) {
        ctx.heardNoise = { ...event, level: levelAtBellhop };
      }
    }
  };

  ctx.emitter.on('NOISE_EMITTED', handler);

  return {
    detach() {
      ctx.emitter.off('NOISE_EMITTED', handler);
    },
  };
}
