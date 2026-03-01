---
phase: 04-gymnasium-environment-wrapper
plan: 01
status: complete
started: 2026-03-01
completed: 2026-03-01
---

## Summary

Built the three core AI computation modules — ray casting, observation vector, and reward function — with full TDD coverage.

### Files Created

| File | Purpose | Exports |
|---|---|---|
| `src/ai/ai-config.ts` | Types, constants, default weights | `RAY`, `OBS`, `RewardConfig`, `EpisodeConfig`, `AiConfig`, `DEFAULT_AI_CONFIG` |
| `src/ai/raycaster.ts` | 9-ray cast against track boundary polylines | `raySegmentIntersection`, `castRays` |
| `src/ai/observations.ts` | 14-value normalized observation vector builder | `buildObservation`, `OBSERVATION_SIZE` |
| `src/ai/reward.ts` | Reward computation with per-component breakdown | `computeReward`, `RewardBreakdown` |
| `tests/ai/raycaster.test.ts` | Ray casting unit tests (16 tests) | — |
| `tests/ai/observations.test.ts` | Observation vector unit tests (14 tests) | — |
| `tests/ai/reward.test.ts` | Reward computation unit tests (18 tests) | — |

### Requirements Satisfied

- **AI-02**: 9 rays cast across 180° forward arc return normalized [0,1] distances to boundary walls
- **AI-03**: 14-value observation vector contains all required components (rays + speed + yawRate + steering + lapProgress + centerlineDist)
- **AI-04**: Dense per-tick reward uses continuous arc-length progress (not discrete checkpoint steps)
- **AI-05**: Four-tier penalties (stillness, wall, off-track, backward) computed separately
- **AI-06**: Default penalties smaller in magnitude than typical progress rewards
- **AI-12**: Reward weights loaded from configurable `RewardConfig` (no hardcoding)
- **AI-13**: Each reward component returned individually in `RewardBreakdown` for per-component logging

### Key Design Decisions

1. **Pre-computed ray angle offsets** — module-level `RAY_OFFSETS` array avoids per-tick allocation
2. **`buildObservation` accepts pre-computed `trackProgress`** — avoids redundant `distanceToTrackCenter` calls; caller computes once
3. **`computeReward` accepts `wallContact: boolean`** — avoids post-resolution false negatives; accepts optional `precomputed` arc lengths for performance
4. **Progress wrapping** — modular arithmetic handles lap boundary crossing correctly
5. **`as const satisfies AiConfig`** on `DEFAULT_AI_CONFIG` — matches engine convention and provides literal types
6. **Rebalanced defaults** — speed bonus 0.0, backward penalty 0.0 (redundant with negative progress), wall penalty -0.002, stillness/offTrack -0.001

### Test Coverage

48 total tests across 3 test files, all passing. Covers:
- Ray-segment intersection hit/miss cases (perpendicular, diagonal, parallel, behind, missed)
- Cast rays: normalization, symmetry, nearest-hit selection, heading rotation, max distance capping
- Observation vector: all 14 components, normalization bounds, clamping, edge cases
- Reward: dense progress, lap wrapping, all penalty types, component sum, configurable weights, first-tick edge case, multi-penalty stacking
