import { describe, it, expect } from 'vitest';
import { getNightConfig, NIGHT_CONFIGS } from '../../src/game/night-config';
import { ESCAPE, INVENTORY } from '../../src/constants';

describe('getNightConfig', () => {
  it('night 1 has only bellhop', () => {
    const cfg = getNightConfig(1);
    expect(cfg.monsters).toEqual(['bellhop']);
  });

  it('night 2 adds housekeeper', () => {
    const cfg = getNightConfig(2);
    expect(cfg.monsters).toEqual(['bellhop', 'housekeeper']);
  });

  it('night 3 adds guest (full roster)', () => {
    const cfg = getNightConfig(3);
    expect(cfg.monsters).toEqual(['bellhop', 'housekeeper', 'guest']);
  });

  it('night 1 escape window matches constant', () => {
    expect(getNightConfig(1).escapeWindowDurationS).toBe(ESCAPE.WINDOW_DURATION_NIGHT_1_S);
  });

  it('night 2 escape window matches constant', () => {
    expect(getNightConfig(2).escapeWindowDurationS).toBe(ESCAPE.WINDOW_DURATION_NIGHT_2_S);
  });

  it('night 3 escape window is tighter (15s)', () => {
    expect(getNightConfig(3).escapeWindowDurationS).toBe(ESCAPE.WINDOW_DURATION_NIGHT_3_S);
  });

  it('night 1 has throwables but no DND signs or lighter', () => {
    const cfg = getNightConfig(1);
    expect(cfg.itemSpawns.throwables).toBe(8);
    expect(cfg.itemSpawns.dndSigns).toBe(0);
    expect(cfg.itemSpawns.lighterCharges).toBe(0);
  });

  it('night 2 adds DND signs', () => {
    const cfg = getNightConfig(2);
    expect(cfg.itemSpawns.dndSigns).toBe(INVENTORY.DND_SIGNS_PER_NIGHT);
    expect(cfg.itemSpawns.lighterCharges).toBe(0);
  });

  it('night 3 adds lighter charges', () => {
    const cfg = getNightConfig(3);
    expect(cfg.itemSpawns.lighterCharges).toBe(INVENTORY.LIGHTER_CHARGES_PER_NIGHT);
  });

  it('night 3 has guest ambush spots', () => {
    const cfg = getNightConfig(3);
    expect(cfg.guestAmbushSpots.length).toBeGreaterThan(0);
  });

  it('nights 1-2 have no guest ambush spots', () => {
    expect(getNightConfig(1).guestAmbushSpots).toHaveLength(0);
    expect(getNightConfig(2).guestAmbushSpots).toHaveLength(0);
  });

  it('throws for invalid night number', () => {
    expect(() => getNightConfig(0)).toThrow();
    expect(() => getNightConfig(4)).toThrow();
  });

  it('escape windows get progressively tighter', () => {
    const windows = NIGHT_CONFIGS.map(c => c.escapeWindowDurationS);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]).toBeLessThan(windows[i - 1]!);
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
});
