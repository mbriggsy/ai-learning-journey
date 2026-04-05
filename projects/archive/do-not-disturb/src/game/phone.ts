import type { Emitter } from './events';
import type { Position, ZoneId } from '../types/state';
import { NOISE, PHONE } from '../constants';

export type PhoneConfig = {
  readonly position: Position;
  readonly zoneId: ZoneId;
};

export type PhoneSystem = {
  startRinging(): void;
  answer(): void;
  update(dt: number): void;
  readonly isRinging: boolean;
  readonly wasAnswered: boolean;
};

export function createPhoneSystem(emitter: Emitter, config: PhoneConfig): PhoneSystem {
  let ringing = false;
  let answered = false;
  let ringTimer = 0;

  return {
    startRinging() {
      if (ringing || answered) return;
      ringing = true;
      ringTimer = PHONE.RING_DURATION_S;
      emitter.emit('PHONE_RING');
      emitter.emit('NOISE_EMITTED', {
        sourceZoneId: config.zoneId,
        level: NOISE.PHONE_RING_LEVEL,
        position: config.position,
      });
    },

    answer() {
      if (!ringing || answered) return;
      ringing = false;
      answered = true;
      emitter.emit('PHONE_ANSWERED');
    },

    update(dt: number) {
      if (!ringing) return;
      ringTimer -= dt;
      if (ringTimer <= 0) {
        ringing = false;
      }
    },

    get isRinging() { return ringing; },
    get wasAnswered() { return answered; },
  };
}
