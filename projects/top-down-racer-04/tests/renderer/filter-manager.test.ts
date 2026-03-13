import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pixi-filters subpath imports — use class constructors (not vi.fn)
const mockBloomInstance = { destroy: vi.fn() };
const mockShadowInstance = { destroy: vi.fn() };
const mockGlowInstance = { enabled: true, destroy: vi.fn() };
const mockMotionBlurInstance = { velocity: { x: 0, y: 0 }, destroy: vi.fn() };

vi.mock('pixi-filters/bloom', () => ({
  BloomFilter: class { constructor() { return mockBloomInstance; } },
}));
vi.mock('pixi-filters/drop-shadow', () => ({
  DropShadowFilter: class { constructor() { return mockShadowInstance; } },
}));
vi.mock('pixi-filters/glow', () => ({
  GlowFilter: class { constructor() { return mockGlowInstance; } },
}));
vi.mock('pixi-filters/motion-blur', () => ({
  MotionBlurFilter: class { constructor() { return mockMotionBlurInstance; } },
}));

import { FilterManager } from '../../src/renderer/FilterManager';

function makeContainer() {
  return {
    filters: [] as any[],
    filterArea: undefined as any,
  } as any;
}

describe('FilterManager', () => {
  let fm: FilterManager;

  beforeEach(() => {
    // Reset mock state
    mockMotionBlurInstance.velocity = { x: 0, y: 0 };
    mockGlowInstance.enabled = true;
    fm = new FilterManager();
  });

  describe('attach()', () => {
    it('attaches bloom + motionBlur to worldContainer', () => {
      const world = makeContainer();
      const car = makeContainer();
      fm.attach(world, car, null);

      expect(world.filters).toHaveLength(2);
      expect(world.filters[0]).toBe(mockBloomInstance);
      expect(world.filters[1]).toBe(mockMotionBlurInstance);
    });

    it('attaches shadow to carLayer', () => {
      const world = makeContainer();
      const car = makeContainer();
      fm.attach(world, car, null);
      expect(car.filters).toHaveLength(1);
      expect(car.filters[0]).toBe(mockShadowInstance);
    });

    it('attaches glow to aiCarContainer when provided', () => {
      const world = makeContainer();
      const car = makeContainer();
      const ai = makeContainer();
      fm.attach(world, car, ai);
      expect(ai.filters).toHaveLength(1);
      expect(ai.filters[0]).toBe(mockGlowInstance);
    });

    it('disables glow when aiCarContainer is null', () => {
      const world = makeContainer();
      const car = makeContainer();
      fm.attach(world, car, null);
      expect(mockGlowInstance.enabled).toBe(false);
    });

    it('does not set filterArea (deferred optimization)', () => {
      const world = makeContainer();
      const car = makeContainer();
      fm.attach(world, car, null);
      expect(world.filterArea).toBeUndefined();
    });
  });

  describe('detach()', () => {
    it('clears all filter arrays', () => {
      const world = makeContainer();
      const car = makeContainer();
      const ai = makeContainer();
      fm.attach(world, car, ai);
      fm.detach(world, car, ai);

      expect(world.filters).toHaveLength(0);
      expect(car.filters).toHaveLength(0);
      expect(ai.filters).toHaveLength(0);
      expect(world.filterArea).toBeUndefined();
    });
  });

  describe('updateMotionBlur()', () => {
    it('sets velocity with Y-flip compensation', () => {
      // Use values that stay below the 30px clamp threshold
      fm.updateMotionBlur(5, 3, 2.0);
      // screenVx = 5 * 2 = 10, screenVy = -3 * 2 = -6, mag = sqrt(136) ≈ 11.7 < 30
      expect(mockMotionBlurInstance.velocity.x).toBeCloseTo(10);
      expect(mockMotionBlurInstance.velocity.y).toBeCloseTo(-6);
    });

    it('clamps velocity to max 30px magnitude', () => {
      // vx=100, vy=0, zoom=1 → screenVx=100 → clamped to 30
      fm.updateMotionBlur(100, 0, 1.0);
      expect(mockMotionBlurInstance.velocity.x).toBeCloseTo(30);
      expect(mockMotionBlurInstance.velocity.y).toBeCloseTo(0);
    });

    it('preserves direction when clamping', () => {
      // vx=60, vy=80 → |v|=100 at zoom 1 → scale to 30/100
      fm.updateMotionBlur(60, -80, 1.0);
      const vx = mockMotionBlurInstance.velocity.x;
      const vy = mockMotionBlurInstance.velocity.y;
      const mag = Math.sqrt(vx * vx + vy * vy);
      expect(mag).toBeCloseTo(30, 0);
      // Direction preserved: vx positive, vy positive (negated from -80)
      expect(vx).toBeGreaterThan(0);
      expect(vy).toBeGreaterThan(0);
    });
  });

  describe('pause()', () => {
    it('zeroes motion blur velocity', () => {
      fm.updateMotionBlur(50, 30, 2.0);
      fm.pause();
      expect(mockMotionBlurInstance.velocity.x).toBe(0);
      expect(mockMotionBlurInstance.velocity.y).toBe(0);
    });
  });

  describe('setGlowEnabled()', () => {
    it('toggles glow enabled state', () => {
      fm.setGlowEnabled(false);
      expect(mockGlowInstance.enabled).toBe(false);
      fm.setGlowEnabled(true);
      expect(mockGlowInstance.enabled).toBe(true);
    });
  });

  describe('destroy()', () => {
    it('destroys all filter instances', () => {
      fm.destroy();
      expect(mockBloomInstance.destroy).toHaveBeenCalled();
      expect(mockShadowInstance.destroy).toHaveBeenCalled();
      expect(mockGlowInstance.destroy).toHaveBeenCalled();
      expect(mockMotionBlurInstance.destroy).toHaveBeenCalled();
    });
  });
});
