import { describe, it, expect } from 'vitest';
import { evaluateRules } from '../../src/game/rules.js';
import type { CountdownPhase, HuntPhase, FoundPhase, SurvivedPhase } from '../../src/types/state.js';

describe('evaluateRules', () => {
  describe('countdown phase', () => {
    it('returns null when ticks remain', () => {
      const flow: CountdownPhase = { kind: 'countdown', ticksRemaining: 100 };
      expect(evaluateRules(flow, 'none')).toBe(null);
    });

    it('transitions to hunt when ticks reach 0', () => {
      const flow: CountdownPhase = { kind: 'countdown', ticksRemaining: 0 };
      const next = evaluateRules(flow, 'none');
      expect(next).not.toBe(null);
      if (next === null) return;
      expect(next.kind).toBe('hunt');
      if (next.kind === 'hunt') {
        expect(next.ticksElapsed).toBe(0);
        expect(next.ticksRemaining).toBeGreaterThan(0);
      }
    });

    it('transitions to hunt when ticks go negative', () => {
      const flow: CountdownPhase = { kind: 'countdown', ticksRemaining: -1 };
      const next = evaluateRules(flow, 'none');
      expect(next).not.toBe(null);
      if (next === null) return;
      expect(next.kind).toBe('hunt');
    });

    it('ignores detection during countdown', () => {
      const flow: CountdownPhase = { kind: 'countdown', ticksRemaining: 100 };
      expect(evaluateRules(flow, 'found')).toBe(null);
      expect(evaluateRules(flow, 'spotted')).toBe(null);
    });
  });

  describe('hunt phase', () => {
    it('returns null when ticks remain and no detection', () => {
      const flow: HuntPhase = { kind: 'hunt', ticksRemaining: 100, ticksElapsed: 50, sonarTicksUntilPing: 300 };
      expect(evaluateRules(flow, 'none')).toBe(null);
    });

    it('returns null on spotted (spotted triggers FSM, not game over)', () => {
      const flow: HuntPhase = { kind: 'hunt', ticksRemaining: 100, ticksElapsed: 50, sonarTicksUntilPing: 300 };
      expect(evaluateRules(flow, 'spotted')).toBe(null);
    });

    it('transitions to found on detection result found', () => {
      const flow: HuntPhase = { kind: 'hunt', ticksRemaining: 100, ticksElapsed: 50, sonarTicksUntilPing: 300 };
      const next = evaluateRules(flow, 'found');
      expect(next).not.toBe(null);
      if (next === null) return;
      expect(next.kind).toBe('found');
      if (next.kind === 'found') {
        expect(next.ticksSurvived).toBe(50);
      }
    });

    it('transitions to survived when timer expires', () => {
      const flow: HuntPhase = { kind: 'hunt', ticksRemaining: 0, ticksElapsed: 7200, sonarTicksUntilPing: 300 };
      const next = evaluateRules(flow, 'none');
      expect(next).not.toBe(null);
      if (next === null) return;
      expect(next.kind).toBe('survived');
      if (next.kind === 'survived') {
        expect(next.huntDurationTicks).toBe(7200);
      }
    });

    it('FOUND takes priority over SURVIVED on same tick', () => {
      const flow: HuntPhase = { kind: 'hunt', ticksRemaining: 0, ticksElapsed: 7200, sonarTicksUntilPing: 300 };
      const next = evaluateRules(flow, 'found');
      expect(next!.kind).toBe('found');
    });
  });

  describe('terminal states', () => {
    it('found returns null (no transitions out)', () => {
      const flow: FoundPhase = { kind: 'found', ticksSurvived: 100 };
      expect(evaluateRules(flow, 'none')).toBe(null);
      expect(evaluateRules(flow, 'found')).toBe(null);
    });

    it('survived returns null (no transitions out)', () => {
      const flow: SurvivedPhase = { kind: 'survived', huntDurationTicks: 7200 };
      expect(evaluateRules(flow, 'none')).toBe(null);
      expect(evaluateRules(flow, 'found')).toBe(null);
    });
  });
});
