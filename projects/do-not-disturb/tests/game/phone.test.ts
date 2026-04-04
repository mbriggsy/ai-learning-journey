import { describe, it, expect, vi } from 'vitest';
import { createPhoneSystem } from '../../src/game/phone';
import { createEmitter } from '../../src/game/events';
import { PHONE } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const phone = createPhoneSystem(emitter, { position: { x: 50, y: 50 }, zoneId: 'lobby' });
  return { emitter, phone };
}

describe('createPhoneSystem', () => {
  it('starts not ringing', () => {
    const { phone } = makeSetup();
    expect(phone.isRinging).toBe(false);
  });

  it('startRinging sets ringing state', () => {
    const { phone } = makeSetup();
    phone.startRinging();
    expect(phone.isRinging).toBe(true);
  });

  it('emits PHONE_RING event', () => {
    const { emitter, phone } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_RING', fn);
    phone.startRinging();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('emits NOISE_EMITTED when ringing starts', () => {
    const { emitter, phone } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);
    phone.startRinging();
    expect(fn).toHaveBeenCalled();
  });

  it('answer stops ringing and emits PHONE_ANSWERED', () => {
    const { emitter, phone } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_ANSWERED', fn);
    phone.startRinging();
    phone.answer();
    expect(phone.isRinging).toBe(false);
    expect(phone.wasAnswered).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('answer does nothing if not ringing', () => {
    const { emitter, phone } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_ANSWERED', fn);
    phone.answer();
    expect(fn).not.toHaveBeenCalled();
  });

  it('stops ringing after duration', () => {
    const { phone } = makeSetup();
    phone.startRinging();
    phone.update(PHONE.RING_DURATION_S + 1);
    expect(phone.isRinging).toBe(false);
  });

  it('cannot ring again after answered', () => {
    const { phone } = makeSetup();
    phone.startRinging();
    phone.answer();
    phone.startRinging(); // should be no-op
    expect(phone.isRinging).toBe(false);
  });
});
