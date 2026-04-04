import { describe, it, expect } from 'vitest';
import {
  createSquashStretch,
  triggerLandSquash,
  triggerRunStretch,
  updateSquashStretch,
  computeWobbleOffset,
  shouldShowGuestFrame,
  computeMusicBoxVolume,
} from '../../src/game/animation';
import { ANIMATION, AUDIO } from '../../src/constants';

describe('SquashStretch', () => {
  it('starts at neutral scale', () => {
    const s = createSquashStretch();
    expect(s.scaleX).toBe(1);
    expect(s.scaleY).toBe(1);
    expect(s.timer).toBe(0);
  });

  it('land squash sets correct scale', () => {
    const s = createSquashStretch();
    triggerLandSquash(s);
    expect(s.scaleX).toBe(ANIMATION.SQUASH_LAND_SCALE_X);
    expect(s.scaleY).toBe(ANIMATION.SQUASH_LAND_SCALE_Y);
    expect(s.timer).toBe(ANIMATION.SQUASH_DURATION_S);
  });

  it('run stretch sets correct scale', () => {
    const s = createSquashStretch();
    triggerRunStretch(s);
    expect(s.scaleX).toBe(ANIMATION.STRETCH_RUN_SCALE_X);
    // Y should preserve area (inverse of X)
    expect(s.scaleY).toBeCloseTo(1 / ANIMATION.STRETCH_RUN_SCALE_X);
  });

  it('returns to neutral after timer expires', () => {
    const s = createSquashStretch();
    triggerLandSquash(s);
    updateSquashStretch(s, ANIMATION.SQUASH_DURATION_S + 0.01);
    expect(s.scaleX).toBe(1);
    expect(s.scaleY).toBe(1);
    expect(s.timer).toBe(0);
  });

  it('lerps during active squash', () => {
    const s = createSquashStretch();
    triggerLandSquash(s);
    updateSquashStretch(s, ANIMATION.SQUASH_DURATION_S / 2);
    // Should be between initial squash and neutral
    expect(s.scaleY).toBeGreaterThan(ANIMATION.SQUASH_LAND_SCALE_Y);
    expect(s.scaleY).toBeLessThan(1);
  });

  it('update is no-op when no squash active', () => {
    const s = createSquashStretch();
    updateSquashStretch(s, 1);
    expect(s.scaleX).toBe(1);
  });
});

describe('computeWobbleOffset', () => {
  it('returns offsets within max range', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const { dx, dy } = computeWobbleOffset(t, 42);
      const maxPx = ANIMATION.WOBBLE_MAX_OFFSET_PX * ANIMATION.WOBBLE_INTENSITY;
      expect(Math.abs(dx)).toBeLessThanOrEqual(maxPx + 0.001);
      expect(Math.abs(dy)).toBeLessThanOrEqual(maxPx + 0.001);
    }
  });

  it('different seeds produce different offsets', () => {
    const a = computeWobbleOffset(1.0, 1);
    const b = computeWobbleOffset(1.0, 2);
    expect(a.dx).not.toBeCloseTo(b.dx);
  });

  it('varies over time (not constant)', () => {
    const a = computeWobbleOffset(0, 1);
    const b = computeWobbleOffset(0.5, 1);
    // At least one axis should differ
    expect(a.dx !== b.dx || a.dy !== b.dy).toBe(true);
  });
});

describe('shouldShowGuestFrame', () => {
  it('skips every Nth frame', () => {
    const results = Array.from({ length: 6 }, (_, i) => shouldShowGuestFrame(i));
    // With GUEST_FRAME_SKIP = 2: frame 0 skipped, 1 shown, 2 skipped, 3 shown...
    expect(results).toEqual([false, true, false, true, false, true]);
  });
});

describe('computeMusicBoxVolume', () => {
  it('returns min volume when far from danger', () => {
    expect(computeMusicBoxVolume(AUDIO.MUSIC_BOX_DANGER_RANGE + 100)).toBe(AUDIO.MUSIC_BOX_MIN_VOLUME);
  });

  it('returns max volume at zero distance', () => {
    expect(computeMusicBoxVolume(0)).toBe(AUDIO.MUSIC_BOX_MAX_VOLUME);
  });

  it('interpolates between min and max', () => {
    const vol = computeMusicBoxVolume(AUDIO.MUSIC_BOX_DANGER_RANGE / 2);
    expect(vol).toBeGreaterThan(AUDIO.MUSIC_BOX_MIN_VOLUME);
    expect(vol).toBeLessThan(AUDIO.MUSIC_BOX_MAX_VOLUME);
  });

  it('returns exact midpoint at half range', () => {
    const vol = computeMusicBoxVolume(AUDIO.MUSIC_BOX_DANGER_RANGE / 2);
    const expected = (AUDIO.MUSIC_BOX_MIN_VOLUME + AUDIO.MUSIC_BOX_MAX_VOLUME) / 2;
    expect(vol).toBeCloseTo(expected);
  });
});
