import { describe, it, expect } from 'vitest';
import { getNightConfig, NIGHT_CONFIGS } from '../../src/game/night-config';
import { ESCAPE, INVENTORY, MONSTER } from '../../src/constants';

describe('getNightConfig', () => {
  it('night 1 has only bellhop', () => {
    expect(getNightConfig(1).monsters).toEqual(['bellhop']);
  });

  it('night 2 adds housekeeper', () => {
    expect(getNightConfig(2).monsters).toEqual(['bellhop', 'housekeeper']);
  });

  it('night 3 adds guest (full roster)', () => {
    expect(getNightConfig(3).monsters).toEqual(['bellhop', 'housekeeper', 'guest']);
  });

  it('nights 4-5 keep full roster', () => {
    expect(getNightConfig(4).monsters).toEqual(['bellhop', 'housekeeper', 'guest']);
    expect(getNightConfig(5).monsters).toEqual(['bellhop', 'housekeeper', 'guest']);
  });

  it('escape windows get progressively tighter', () => {
    const windows = NIGHT_CONFIGS.map(c => c.escapeWindowDurationS);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]).toBeLessThan(windows[i - 1]!);
    }
  });

  it('night 1 escape window matches constant', () => {
    expect(getNightConfig(1).escapeWindowDurationS).toBe(ESCAPE.WINDOW_DURATION_NIGHT_1_S);
  });

  it('night 5 escape window is tightest (10s)', () => {
    expect(getNightConfig(5).escapeWindowDurationS).toBe(ESCAPE.WINDOW_DURATION_NIGHT_5_S);
  });

  it('nights 1-3 have speed multiplier 1.0', () => {
    expect(getNightConfig(1).speedMultiplier).toBe(1.0);
    expect(getNightConfig(2).speedMultiplier).toBe(1.0);
    expect(getNightConfig(3).speedMultiplier).toBe(1.0);
  });

  it('night 4 has 25% speed increase', () => {
    expect(getNightConfig(4).speedMultiplier).toBe(MONSTER.NIGHT_4_SPEED_MULT);
  });

  it('night 5 also has 25% speed increase', () => {
    expect(getNightConfig(5).speedMultiplier).toBe(MONSTER.NIGHT_4_SPEED_MULT);
  });

  it('nights 1-4 use standard level layout', () => {
    for (let i = 1; i <= 4; i++) {
      expect(getNightConfig(i).levelVariant).toBe('standard');
    }
  });

  it('night 5 uses shuffled level layout', () => {
    expect(getNightConfig(5).levelVariant).toBe('shuffled');
  });

  it('night 1 has throwables but no DND signs or lighter', () => {
    const cfg = getNightConfig(1);
    expect(cfg.itemSpawns.throwables).toBe(8);
    expect(cfg.itemSpawns.dndSigns).toBe(0);
    expect(cfg.itemSpawns.lighterCharges).toBe(0);
  });

  it('night 2 adds DND signs', () => {
    expect(getNightConfig(2).itemSpawns.dndSigns).toBe(INVENTORY.DND_SIGNS_PER_NIGHT);
  });

  it('night 3 adds lighter charges', () => {
    expect(getNightConfig(3).itemSpawns.lighterCharges).toBe(INVENTORY.LIGHTER_CHARGES_PER_NIGHT);
  });

  it('night 4 has extra lighter charge', () => {
    expect(getNightConfig(4).itemSpawns.lighterCharges).toBe(3);
  });

  it('nights 1-2 have no guest ambush spots', () => {
    expect(getNightConfig(1).guestAmbushSpots).toHaveLength(0);
    expect(getNightConfig(2).guestAmbushSpots).toHaveLength(0);
  });

  it('nights 3-5 have guest ambush spots', () => {
    expect(getNightConfig(3).guestAmbushSpots.length).toBeGreaterThan(0);
    expect(getNightConfig(4).guestAmbushSpots.length).toBeGreaterThan(0);
    expect(getNightConfig(5).guestAmbushSpots.length).toBeGreaterThan(0);
  });

  it('every night has phone content', () => {
    for (let i = 1; i <= 5; i++) {
      const cfg = getNightConfig(i);
      expect(cfg.phoneContent.lines.length).toBeGreaterThan(0);
    }
  });

  it('all phone scripts are skippable on retry', () => {
    for (const cfg of NIGHT_CONFIGS) {
      expect(cfg.phoneContent.skipOnRetry).toBe(true);
    }
  });

  it('each night adds monsters cumulatively (never removes)', () => {
    for (let i = 1; i < NIGHT_CONFIGS.length; i++) {
      const prev = NIGHT_CONFIGS[i - 1]!.monsters;
      const curr = NIGHT_CONFIGS[i]!.monsters;
      for (const m of prev) {
        expect(curr).toContain(m);
      }
    }
  });

  it('throws for invalid night number', () => {
    expect(() => getNightConfig(0)).toThrow();
    expect(() => getNightConfig(6)).toThrow();
  });

  it('covers all 5 nights', () => {
    expect(NIGHT_CONFIGS).toHaveLength(5);
  });
});
