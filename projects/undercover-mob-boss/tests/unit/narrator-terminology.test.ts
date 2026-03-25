import { describe, it, expect } from 'vitest';
import { NARRATOR_VARIANTS } from '../../scripts/narrator-prompts';

/**
 * Guard against narrator scripts drifting from game engine terminology.
 * These tests run in milliseconds and catch errors BEFORE we burn TTS quota.
 */

// ── Banned terms in spoken script text ──────────────────────────────

const BANNED_TERMS: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  {
    pattern: /\bgood polic/i,
    replacement: '"virtuous policy"',
    reason: 'V2 renamed Good → Virtuous',
  },
  {
    pattern: /\bbad polic/i,
    replacement: '"corrupt policy"',
    reason: 'V2 renamed Bad → Corrupt',
  },
];

describe('narrator terminology', () => {
  for (const { pattern, replacement, reason } of BANNED_TERMS) {
    it(`no script text contains ${pattern.source} (${reason})`, () => {
      const violations = NARRATOR_VARIANTS
        .filter((v) => pattern.test(v.script))
        .map((v) => `${v.triggerId}-${v.variantNum}: "${v.script}"`);

      expect(violations, `Should use ${replacement}. ${reason}`).toEqual([]);
    });
  }
});

// ── Executive power triggers must attribute to Mayor, not Commissioner ─

const MAYOR_POWER_TRIGGERS = ['investigate', 'special-nomination', 'execution', 'policy-peek'];

describe('executive power role attribution', () => {
  it('Mayor powers never attributed to Commissioner in script text', () => {
    const violations = NARRATOR_VARIANTS
      .filter((v) => MAYOR_POWER_TRIGGERS.includes(v.triggerId))
      .filter((v) => /\bCommissioner\b/i.test(v.script))
      .map((v) => `${v.triggerId}-${v.variantNum}: "${v.script}"`);

    expect(
      violations,
      'Executive powers belong to the Mayor, not the Commissioner',
    ).toEqual([]);
  });
});
