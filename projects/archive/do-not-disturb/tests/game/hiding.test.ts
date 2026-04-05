import { describe, it, expect } from 'vitest';
import { isProtectedFrom, HIDING_PROTECTION } from '../../src/game/hiding';

describe('hiding protection matrix', () => {
  it('bed protects from bellhop', () => {
    expect(isProtectedFrom('bed', 'bellhop')).toBe(1);
  });

  it('bed does NOT protect from housekeeper', () => {
    expect(isProtectedFrom('bed', 'housekeeper')).toBe(0);
  });

  it('closet does NOT protect from housekeeper', () => {
    expect(isProtectedFrom('closet', 'housekeeper')).toBe(0);
  });

  it('furniture is probabilistic (50%) for bellhop', () => {
    expect(isProtectedFrom('furniture', 'bellhop')).toBe(0.5);
  });

  it('furniture is probabilistic (50%) for housekeeper', () => {
    expect(isProtectedFrom('furniture', 'housekeeper')).toBe(0.5);
  });

  it('vent is safe from ALL monsters', () => {
    expect(isProtectedFrom('vent', 'bellhop')).toBe(1);
    expect(isProtectedFrom('vent', 'housekeeper')).toBe(1);
    expect(isProtectedFrom('vent', 'guest')).toBe(1);
  });

  it('freezer is safe from ALL monsters', () => {
    expect(isProtectedFrom('freezer', 'bellhop')).toBe(1);
    expect(isProtectedFrom('freezer', 'housekeeper')).toBe(1);
    expect(isProtectedFrom('freezer', 'guest')).toBe(1);
  });

  it('unknown monster returns 0 (not protected)', () => {
    expect(isProtectedFrom('bed', 'unknown-monster')).toBe(0);
  });

  it('all 5 spot types are defined', () => {
    expect(Object.keys(HIDING_PROTECTION)).toHaveLength(5);
  });
});
