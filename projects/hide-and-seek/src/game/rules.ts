import type { GameFlowState, DetectionResult } from '../types/state.js';
import { createHuntTicks, createSonarPingTicks } from './timer.js';

export function evaluateRules(
  gameFlow: GameFlowState,
  detectionResult: DetectionResult,
): GameFlowState | null {
  switch (gameFlow.kind) {
    case 'countdown': {
      if (gameFlow.ticksRemaining <= 0) {
        return {
          kind: 'hunt',
          ticksRemaining: createHuntTicks(),
          ticksElapsed: 0,
          sonarTicksUntilPing: createSonarPingTicks(),
        };
      }
      return null;
    }
    case 'hunt': {
      // FOUND takes priority over SURVIVED (same-tick edge case)
      if (detectionResult === 'found') {
        return {
          kind: 'found',
          ticksSurvived: gameFlow.ticksElapsed,
        };
      }
      if (gameFlow.ticksRemaining <= 0) {
        return {
          kind: 'survived',
          huntDurationTicks: gameFlow.ticksElapsed,
        };
      }
      return null;
    }
    case 'found':
    case 'survived':
      return null; // terminal — no transitions
  }
}
