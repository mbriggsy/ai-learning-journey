/**
 * Config Sync Test — ensures Python and TypeScript AI configs stay in sync.
 *
 * The training pipeline reads python/ai-config.json while the headless env
 * and browser inference use src/ai/ai-config.ts. A mismatch causes subtle
 * bugs (e.g. different episode lengths between training and inference).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_AI_CONFIG } from '../../src/ai/ai-config';

const pythonConfigPath = resolve(__dirname, '../../python/ai-config.json');
const pythonConfig = JSON.parse(readFileSync(pythonConfigPath, 'utf-8'));

describe('AI config sync (Python ↔ TypeScript)', () => {
  it('maxSteps matches between python/ai-config.json and DEFAULT_AI_CONFIG', () => {
    expect(pythonConfig.episode.maxSteps).toBe(DEFAULT_AI_CONFIG.episode.maxSteps);
  });

  it('stillnessTimeoutTicks matches between python/ai-config.json and DEFAULT_AI_CONFIG', () => {
    expect(pythonConfig.episode.stillnessTimeoutTicks).toBe(
      DEFAULT_AI_CONFIG.episode.stillnessTimeoutTicks,
    );
  });

  it('reward weights match between python/ai-config.json and DEFAULT_AI_CONFIG', () => {
    const pyWeights = pythonConfig.weights;
    const tsWeights = DEFAULT_AI_CONFIG.weights;
    expect(pyWeights.progress).toBe(tsWeights.progress);
    expect(pyWeights.wallPenalty).toBe(tsWeights.wallPenalty);
    expect(pyWeights.offTrackPenalty).toBe(tsWeights.offTrackPenalty);
    expect(pyWeights.stillnessPenalty).toBe(tsWeights.stillnessPenalty);
    expect(pyWeights.stillnessSpeedThreshold).toBe(tsWeights.stillnessSpeedThreshold);
  });
});
