import type { Emitter } from './events';
import type { Position, ZoneId } from '../types/state';
import { BREATH, NOISE, PHONE } from '../constants';

export type BreathSystem = {
  startHolding(playerZone: ZoneId, playerPos: Position): void;
  stopHolding(): void;
  rhythmTap(): void;
  update(dt: number): void;
  readonly isActive: boolean;
  readonly remaining: number;
  readonly isRhythmWindow: boolean;
};

export function createBreathSystem(emitter: Emitter): BreathSystem {
  let active = false;
  let remaining = 0;
  let rhythmWindow = false;
  let rhythmTimer = 0;
  let playerZone: ZoneId = '';
  let playerPos: Position = { x: 0, y: 0 };

  return {
    startHolding(zone: ZoneId, pos: Position) {
      active = true;
      remaining = BREATH.BASE_DURATION_S;
      rhythmTimer = PHONE.RHYTHM_INTERVAL_S;
      rhythmWindow = false;
      playerZone = zone;
      playerPos = pos;
    },

    stopHolding() {
      active = false;
      rhythmWindow = false;
    },

    rhythmTap() {
      if (!active || !rhythmWindow) return;
      remaining += BREATH.RHYTHM_EXTEND_S;
      rhythmWindow = false;
    },

    update(dt: number) {
      if (!active) return;
      remaining -= dt;

      // Rhythm window cycle
      rhythmTimer -= dt;
      if (rhythmTimer <= 0 && !rhythmWindow) {
        rhythmWindow = true;
        rhythmTimer = PHONE.RHYTHM_WINDOW_MS / 1000; // window duration
      }
      if (rhythmWindow) {
        rhythmTimer -= dt;
        if (rhythmTimer <= 0) {
          rhythmWindow = false;
          rhythmTimer = PHONE.RHYTHM_INTERVAL_S;
        }
      }

      if (remaining <= 0) {
        emitter.emit('BREATH_GASP');
        emitter.emit('NOISE_EMITTED', {
          sourceZoneId: playerZone,
          level: NOISE.GASP_LEVEL,
          position: playerPos,
        });
        active = false;
      }
    },

    get isActive() { return active; },
    get remaining() { return remaining; },
    get isRhythmWindow() { return rhythmWindow; },
  };
}
