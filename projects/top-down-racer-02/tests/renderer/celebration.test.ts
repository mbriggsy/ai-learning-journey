/**
 * Unit tests for computeOutcome — pure logic, no PixiJS dependency.
 *
 * Outcome rules:
 *   - 'no-ai-best' when AI has no completed lap (null, -1, or 0 ticks)
 *   - 'human-wins' only when humanTicks > 0 AND humanTicks < aiTicks
 *   - 'ai-wins' in all other cases (including ties — player must strictly beat AI)
 */
import { describe, it, expect } from 'vitest';
import { computeOutcome } from '../../src/renderer/CelebrationOverlay';

describe('computeOutcome', () => {
  it("returns 'no-ai-best' when aiTicks is null", () => {
    expect(computeOutcome(500, null)).toBe('no-ai-best');
  });

  it("returns 'no-ai-best' when aiTicks is -1 (sentinel for no lap)", () => {
    expect(computeOutcome(500, -1)).toBe('no-ai-best');
  });

  it("returns 'no-ai-best' when aiTicks is 0 (invalid)", () => {
    expect(computeOutcome(500, 0)).toBe('no-ai-best');
  });

  it("returns 'ai-wins' when human did not complete a lap (humanTicks <= 0)", () => {
    expect(computeOutcome(-1, 500)).toBe('ai-wins');
    expect(computeOutcome(0, 500)).toBe('ai-wins');
  });

  it("returns 'human-wins' when human beat the AI (humanTicks < aiTicks)", () => {
    // Human 400 ticks, AI 500 ticks → human is faster
    expect(computeOutcome(400, 500)).toBe('human-wins');
  });

  it("returns 'ai-wins' when AI beat the human (humanTicks > aiTicks)", () => {
    // Human 600 ticks, AI 500 ticks → AI is faster
    expect(computeOutcome(600, 500)).toBe('ai-wins');
  });

  it("returns 'ai-wins' on a tie (humanTicks === aiTicks)", () => {
    // Tie goes to AI — player must strictly beat
    expect(computeOutcome(500, 500)).toBe('ai-wins');
  });

  it("returns 'human-wins' with small margin (near-win scenario)", () => {
    // Human 499 ticks, AI 500 ticks → human wins by 1 tick
    expect(computeOutcome(499, 500)).toBe('human-wins');
  });

  it("returns 'no-ai-best' when aiTicks is negative (any negative value)", () => {
    expect(computeOutcome(100, -50)).toBe('no-ai-best');
  });
});
