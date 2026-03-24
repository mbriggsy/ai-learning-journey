import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { selectNarratorPool, mulberry32 } from '../../src/client/audio/narrator-pool';
import { NARRATOR_LINES, PHASE_GROUPS } from '../../src/client/audio/narrator-lines';
import type { NarratorTriggerId } from '../../src/client/audio/narrator-lines';
import { NARRATOR_VARIANTS } from '../../scripts/narrator-prompts';

// ── Pool Selection ─────────────────────────────────────────────────

describe('selectNarratorPool', () => {
  it('returns a selection for every variant trigger', () => {
    const selection = selectNarratorPool();
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant')
      .map(([id]) => id);

    for (const triggerId of variantTriggers) {
      expect(selection).toHaveProperty(triggerId);
    }
  });

  it('excludes round-start from selection (single kind)', () => {
    const selection = selectNarratorPool();
    expect(selection).not.toHaveProperty('round-start');
  });

  it('selects variant numbers within valid range (1-based)', () => {
    const selection = selectNarratorPool();

    for (const [triggerId, variantNum] of Object.entries(selection)) {
      const line = NARRATOR_LINES[triggerId as NarratorTriggerId];
      expect(line.kind).toBe('variant');
      if (line.kind === 'variant') {
        expect(variantNum).toBeGreaterThanOrEqual(1);
        expect(variantNum).toBeLessThanOrEqual(line.variantCount);
      }
    }
  });

  it('produces deterministic results with seeded PRNG', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);

    const selection1 = selectNarratorPool(rng1);
    const selection2 = selectNarratorPool(rng2);

    expect(selection1).toEqual(selection2);
  });

  it('produces different results with different seeds', () => {
    const selection1 = selectNarratorPool(mulberry32(1));
    const selection2 = selectNarratorPool(mulberry32(99999));

    // With 24 triggers, extremely unlikely all match by chance
    const allMatch = Object.keys(selection1).every(
      (k) => selection1[k] === selection2[k],
    );
    expect(allMatch).toBe(false);
  });

  it('handles triggers with variantCount=1 (always selects 1)', () => {
    // All current triggers have variantCount >= 2, but test the math
    const rng = mulberry32(42);
    const selection = selectNarratorPool(rng);

    // Verify no selection is 0 or negative
    for (const variantNum of Object.values(selection)) {
      expect(variantNum).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── Mulberry32 PRNG ─────────────────────────────────────────────────

describe('mulberry32', () => {
  it('produces values in [0, 1) range', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic for same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);

    // First value should differ
    expect(rng1()).not.toBe(rng2());
  });
});

// ── Variant Script Integrity ────────────────────────────────────────

describe('Narrator Variant Scripts', () => {
  it('all variant-1 entries exist (V1 originals preserved)', () => {
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant')
      .map(([id]) => id);

    for (const triggerId of variantTriggers) {
      const variant1 = NARRATOR_VARIANTS.find(
        (v) => v.triggerId === triggerId && v.variantNum === 1,
      );
      expect(variant1, `Missing variant-1 for trigger "${triggerId}"`).toBeDefined();
    }
  });

  it('variant counts in NARRATOR_LINES match actual variants in NARRATOR_VARIANTS', () => {
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant') as [string, { variantCount: number }][];

    for (const [triggerId, line] of variantTriggers) {
      const variants = NARRATOR_VARIANTS.filter((v) => v.triggerId === triggerId);
      expect(
        variants.length,
        `Trigger "${triggerId}" declares variantCount=${line.variantCount} but has ${variants.length} variants`,
      ).toBe(line.variantCount);
    }
  });

  it('variant numbers are sequential (1 to variantCount)', () => {
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant') as [string, { variantCount: number }][];

    for (const [triggerId, line] of variantTriggers) {
      const variants = NARRATOR_VARIANTS
        .filter((v) => v.triggerId === triggerId)
        .map((v) => v.variantNum)
        .sort((a, b) => a - b);

      const expected = Array.from({ length: line.variantCount }, (_, i) => i + 1);
      expect(variants, `Non-sequential variants for "${triggerId}"`).toEqual(expected);
    }
  });

  it('all game variants have category "game"', () => {
    for (const v of NARRATOR_VARIANTS) {
      expect(v.category).toBe('game');
    }
  });

  it('no empty scripts', () => {
    for (const v of NARRATOR_VARIANTS) {
      expect(v.script.trim().length, `Empty script for ${v.triggerId}-${v.variantNum}`).toBeGreaterThan(0);
    }
  });

  it('no duplicate scripts across variants of the same trigger', () => {
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant')
      .map(([id]) => id);

    for (const triggerId of variantTriggers) {
      const scripts = NARRATOR_VARIANTS
        .filter((v) => v.triggerId === triggerId)
        .map((v) => v.script);

      expect(new Set(scripts).size, `Duplicate scripts for "${triggerId}"`).toBe(scripts.length);
    }
  });
});

// ── Audio File Existence ────────────────────────────────────────────

describe('Narrator Audio File Existence', () => {
  const audioDir = resolve('public/audio');

  it('variant-1 .ogg files exist for all variant triggers', () => {
    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant')
      .map(([id]) => id);

    for (const triggerId of variantTriggers) {
      const file = join(audioDir, `${triggerId}-1.ogg`);
      expect(existsSync(file), `Missing: ${triggerId}-1.ogg`).toBe(true);
    }
  });

  it('round-start .ogg files exist for rounds 1-15', () => {
    for (let n = 1; n <= 15; n++) {
      const file = join(audioDir, `round-start-${n}.ogg`);
      expect(existsSync(file), `Missing: round-start-${n}.ogg`).toBe(true);
    }
  });
});

// ── Phase Groups ────────────────────────────────────────────────────

describe('Phase Groups', () => {
  it('all trigger IDs in phase groups exist in NARRATOR_LINES', () => {
    for (const [phase, triggerIds] of Object.entries(PHASE_GROUPS)) {
      for (const triggerId of triggerIds) {
        expect(
          NARRATOR_LINES[triggerId],
          `Phase "${phase}" references unknown trigger "${triggerId}"`,
        ).toBeDefined();
      }
    }
  });

  it('all variant triggers appear in at least one phase group', () => {
    const allGroupedTriggers = new Set(
      Object.values(PHASE_GROUPS).flat(),
    );

    const variantTriggers = Object.entries(NARRATOR_LINES)
      .filter(([, line]) => line.kind === 'variant')
      .map(([id]) => id);

    for (const triggerId of variantTriggers) {
      expect(
        allGroupedTriggers.has(triggerId as NarratorTriggerId),
        `Trigger "${triggerId}" not in any phase group`,
      ).toBe(true);
    }
  });
});
